/**
 * The built-in adjustment presets (ADJUST-01, CREATIVE-01 slice 2a) —
 * the third profile kind's read-only starter set, and the structural
 * matching that keeps a design honest about which one it is on.
 *
 * The nine are the CREATIVE-01 prototype's candidates, carried over
 * with their basis lines (the "Why:" the editor shows, the D61/D116
 * pattern). Each is one three-point curve plus one saturation factor,
 * because that is the whole of slice 2a.
 *
 * **Signed 2026-08-24 (D203)** — membership and names as they stand,
 * on the gallery's before/afters. Ids are identity and never change
 * with a label, and matching is structural (`sameAdjust`), so a later
 * rename cannot orphan a saved reference.
 *
 * Pure data + pure comparison; no UI in here.
 */

import type { LightnessCurve } from '../color/curve.ts';
import { identityCurve } from '../color/curve.ts';
import type { AdjustParams } from './adjust.ts';
import { defaultAdjust } from './adjust.ts';

export interface AdjustPreset {
  id: string;
  label: string;
  params: AdjustParams;
  /** The one line of why this preset exists (the editor's "Why:"). */
  basis: string;
}

/** Terse three-point curve literal: bottom, mid, top as [in, out]. */
function curve(
  bottom: [number, number],
  mid: [number, number],
  top: [number, number],
): LightnessCurve {
  return [
    { in: bottom[0], out: bottom[1] },
    { in: mid[0], out: mid[1] },
    { in: top[0], out: top[1] },
  ];
}

/**
 * A preset's params from its 2a half. Every shipped preset is a curve
 * and a saturation; the slice-2b fields (mixer, range) stay at their
 * identity, spelled once here rather than six words per preset.
 */
function params(curve: LightnessCurve, saturation: number): AdjustParams {
  return { ...defaultAdjust(), curve, saturation };
}

/** The shipped presets, in display order. */
export const ADJUST_PRESETS: readonly AdjustPreset[] = [
  {
    id: 'none',
    label: 'None',
    params: params(identityCurve(), 1),
    basis: 'the mandatory comparison state',
  },
  {
    id: 'contrast',
    label: 'Contrast stretch',
    params: params(curve([12, 0], [50, 50], [88, 100]), 1),
    basis: 'pins the darkest content to black and the lightest to white before reduction',
  },
  {
    id: 'punch',
    label: 'Punch',
    params: params(curve([8, 0], [50, 48], [92, 100]), 1.2),
    basis: 'a mild stretch plus saturation: flat photos stop selecting grey threads',
  },
  {
    id: 'faded',
    label: 'Faded',
    params: params(curve([0, 14], [50, 55], [100, 90]), 0.8),
    basis: 'lifted black, capped white, softened colour — the washed print look',
  },
  {
    id: 'high-key',
    label: 'High key',
    params: params(curve([0, 6], [42, 62], [100, 100]), 0.95),
    basis: 'mids pushed light so pale palettes carry the picture',
  },
  {
    id: 'low-key',
    label: 'Low key',
    params: params(curve([0, 0], [58, 40], [100, 94]), 1.05),
    basis: 'mids pulled dark for moody ladders and deep palettes',
  },
  {
    id: 'muted',
    label: 'Muted',
    params: params(identityCurve(), 0.6),
    basis: 'colour pulled toward neutral so tone carries more of the design',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    params: params(curve([4, 0], [50, 52], [96, 100]), 1.4),
    basis: 'saturation pushed hard: hue-family palettes get something to bite on',
  },
  {
    id: 'mono-prep',
    label: 'Mono prep',
    params: params(curve([10, 0], [50, 50], [90, 100]), 0),
    basis: 'greyscale plus a stretch — the natural feed for tone matching and ladders',
  },
];

/**
 * Structural equality over every field: the six curve numbers, the
 * saturation, the six bands and the range (schema v14).
 *
 * The 2b fields must be compared, not assumed identity — this is what
 * decides whether an edited profile still IS a built-in, and a mixer
 * the user has moved is emphatically a different profile even when
 * the curve is untouched.
 */
export function sameAdjust(a: AdjustParams, b: AdjustParams): boolean {
  if (a.saturation !== b.saturation) return false;
  for (let i = 0; i < 3; i++) {
    const p = a.curve[i];
    const q = b.curve[i];
    if (p === undefined || q === undefined) return false;
    if (p.in !== q.in || p.out !== q.out) return false;
  }
  if (a.range.lo !== b.range.lo || a.range.hi !== b.range.hi) return false;
  for (let i = 0; i < a.mixer.length; i++) {
    const p = a.mixer[i];
    const q = b.mixer[i];
    if (p === undefined || q === undefined) return false;
    if (p.hue !== q.hue || p.sat !== q.sat || p.light !== q.light) return false;
  }
  return true;
}

/**
 * The built-in adjustment profile matching these params structurally,
 * or null — the honest unnamed state, never silently adopted (D116).
 */
export function matchBuiltInAdjust(params: AdjustParams): string | null {
  const hit = ADJUST_PRESETS.find((p) => sameAdjust(p.params, params));
  return hit === undefined ? null : `builtin:${hit.id}`;
}
