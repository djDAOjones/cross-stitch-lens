/**
 * Commanded edit classes for the controlled capture source
 * (M13-MEAS-03) — repeatable approximations of the six Part-B editing
 * patterns the rehearsal sheet exercises against Photoshop: 1 px
 * marks, a slow continuous stroke, a large fill, a transform drag,
 * rapid scattered edits, and hands-off idling.
 *
 * These are **controlled-source numbers only** — they are never
 * presented as Photoshop capture behaviour, which is exactly why the
 * human Part B exists. The value of the approximation is the shape of
 * the repaint, not its content: how much of the surface changes per
 * command, and at what cadence, is what the dirty-frame downsample
 * responds to.
 *
 * Everything here is pure geometry over an explicit seed (the command
 * sequence number), so a commanded run is repeatable — the same seq
 * always yields the same marks (conventions: explicit seeds for any
 * randomness). The DOM drawing itself lives in `bench-source.ts`;
 * keeping the geometry here keeps it hermetically testable.
 */

/** The six Part-B edit classes, named as the rehearsal sheet names them. */
export type EditClass =
  | 'pixel-marks'
  | 'slow-stroke'
  | 'large-fill'
  | 'transform'
  | 'rapid-scatter'
  | 'hands-off';

/** All classes, in the order the automated windows run them. */
export const EDIT_CLASSES: readonly EditClass[] = [
  'hands-off',
  'pixel-marks',
  'slow-stroke',
  'large-fill',
  'transform',
  'rapid-scatter',
];

/**
 * Command cadence per class, in ms between `change` commands. The
 * cadences approximate the human action each class stands in for:
 * pencil taps at the product-promise 4/sec, a continuous stroke at
 * 10/sec, deliberate fills at 1/sec, a transform drag at 2/sec, rapid
 * scatter at ~7/sec. `hands-off` commands an ambient 1 px blink at
 * 2/sec — the stand-in for an idle app's own repaints (cursor blink),
 * without which a perfectly static window presents no frames at all
 * and there is nothing to measure (the 2026-07-23 zero-frame lesson).
 */
export function driveIntervalMs(editClass: EditClass): number {
  switch (editClass) {
    case 'pixel-marks':
      return 250;
    case 'slow-stroke':
      return 100;
    case 'large-fill':
      return 1000;
    case 'transform':
      return 500;
    case 'rapid-scatter':
      return 150;
    case 'hands-off':
      return 500;
  }
}

/** One paintable mark: an axis-aligned rectangle in CSS px. */
export interface RectOp {
  x: number;
  y: number;
  w: number;
  h: number;
  /** CSS colour. */
  fill: string;
}

/** One paintable stroke segment in CSS px. */
export interface SegmentOp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** CSS colour. */
  stroke: string;
  width: number;
}

/**
 * The draw instruction for one command: `clear` repaints the whole
 * surface with `background` before the ops run (whole-surface classes);
 * accumulating classes leave prior marks in place, like edits on a
 * real canvas.
 */
export interface EditOps {
  clear: boolean;
  background: string;
  rects: RectOp[];
  segments: SegmentOp[];
}

/** The controlled source's base background (matches its legacy look). */
export const SOURCE_BACKGROUND = '#161616';

/**
 * Small deterministic PRNG (mulberry32 construction) — good enough
 * for mark placement, explicit-seeded per the engine conventions.
 * Returns floats in [0, 1).
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Saturated hue for a sequence step — same family as the legacy
 * full-bleed change, so captured samples read as unmistakably ours. */
function hueFor(seq: number): string {
  return `hsl(${String((seq * 137) % 360)} 90% 45%)`;
}

/**
 * Pure geometry for one commanded change of `editClass` at command
 * `seq` on a `width` × `height` CSS-px surface. The source page draws
 * exactly these ops; tests assert determinism and bounds without a
 * DOM.
 *
 * Class shapes:
 *
 * - `pixel-marks` — one 2 px dot on a slow orbit: far below the 64×64
 *   dirty downsample's sensitivity, so these windows measure the
 *   detection floor (forced refresh at most every 2 s).
 * - `slow-stroke` — a 6 px-wide segment extending a continuous
 *   wandering path; accumulates until detection sees it.
 * - `large-fill` — a rectangle covering roughly a third of the
 *   surface in a fresh hue.
 * - `transform` — the whole surface repaints with a translated,
 *   seq-dependent scene (three bars), approximating a transform drag.
 * - `rapid-scatter` — twelve 6 px dots at seeded positions.
 * - `hands-off` — a 3 px blink dot toggling in the top-left corner:
 *   ambient repaint only, everything else static.
 */
export function editOpsFor(
  editClass: EditClass,
  seq: number,
  width: number,
  height: number,
): EditOps {
  const ops: EditOps = { clear: false, background: SOURCE_BACKGROUND, rects: [], segments: [] };
  const random = seededRandom(seq * 2654435761);
  switch (editClass) {
    case 'pixel-marks': {
      const angle = seq * 0.35;
      ops.rects.push({
        x: width / 2 + Math.cos(angle) * width * 0.3,
        y: height / 2 + Math.sin(angle) * height * 0.3,
        w: 2,
        h: 2,
        fill: '#ffffff',
      });
      return ops;
    }
    case 'slow-stroke': {
      const point = (n: number): { x: number; y: number } => ({
        x: width * (0.5 + 0.42 * Math.sin(n * 0.11) * Math.cos(n * 0.023)),
        y: height * (0.5 + 0.42 * Math.sin(n * 0.07 + 1.3)),
      });
      const from = point(seq);
      const to = point(seq + 1);
      ops.segments.push({
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        stroke: hueFor(seq),
        width: 6,
      });
      return ops;
    }
    case 'large-fill': {
      const w = width * (0.45 + random() * 0.2);
      const h = height * (0.45 + random() * 0.2);
      ops.rects.push({
        x: random() * (width - w),
        y: random() * (height - h),
        w,
        h,
        fill: hueFor(seq),
      });
      return ops;
    }
    case 'transform': {
      ops.clear = true;
      const shift = (seq % 40) / 40;
      for (let i = 0; i < 3; i++) {
        ops.rects.push({
          x: width * ((shift + i * 0.33) % 1) - width * 0.15,
          y: height * 0.15 + i * height * 0.25,
          w: width * 0.3,
          h: height * 0.18,
          fill: hueFor(seq + i * 7),
        });
      }
      return ops;
    }
    case 'rapid-scatter': {
      for (let i = 0; i < 12; i++) {
        ops.rects.push({
          x: random() * (width - 6),
          y: random() * (height - 6),
          w: 6,
          h: 6,
          fill: hueFor(seq + i),
        });
      }
      return ops;
    }
    case 'hands-off': {
      ops.rects.push({
        x: 8,
        y: 8,
        w: 3,
        h: 3,
        fill: seq % 2 === 0 ? '#ffffff' : SOURCE_BACKGROUND,
      });
      return ops;
    }
  }
}
