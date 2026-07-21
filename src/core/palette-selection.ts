/**
 * Count-constrained palette selection (M7-COUNT-01) and the auto-fill
 * half of lock / prefer / exclude (M7-MIX-01).
 *
 * This is **constrained quantisation over a fixed catalogue**, not "run
 * the full palette and keep the N most-used colours". The difference
 * matters: the cheap version throws away a colour the design needs and
 * cannot get it back, because by then every stitch has already been
 * snapped to a neighbour. Here the choice is made first, against the
 * source's own colour distribution, and only then does the ordinary
 * reduce/dither stage run against the chosen subset.
 *
 * Every thread considered is a **real permitted thread**, never a
 * representative RGB value a quantiser invented — a colour you cannot
 * buy is not a cross-stitch answer.
 *
 * The whole module is pure and deterministic: no randomness, and every
 * tie broken by permitted-set order.
 */

import { srgbToLab } from './color/convert.ts';
import type { PermittedSet } from './palette-policy.ts';
import { paletteOf } from './palette.ts';
import type { Palette, PixelBuffer, Thread } from './types.ts';

/** Alpha at or above this counts as a stitch (50 % of 255, D9). */
const STITCH_ALPHA = 128;

/** Bits per channel when binning source colours (4 → 4096 bins). */
const BIN_BITS = 4;

/**
 * Bin cap. Selection cost is `bins × eligible × target`, so an
 * unbounded bin count would make a photograph at the 1024 × 1024
 * maximum an order of magnitude slower than a flat graphic for no
 * gain in the answer — beyond a few hundred weighted bins the greedy
 * step stops changing its mind. Bins are kept by descending weight, so
 * what is dropped is always the rarest colour in the design.
 */
const MAX_BINS = 512;

/**
 * How much a preferred thread's cost is discounted during auto-fill.
 *
 * 0.9 means "a preferred thread wins whenever it lands within 10 % of
 * the best residual error" — a real nudge that still cannot drag in a
 * thread that would visibly damage the image. It is a product
 * constant, not a tuning knob: it is named here, its effect is
 * reported in {@link SelectionResult.preferredUsed}, and changing it is
 * a decision-log matter (M7-MIX-01).
 */
export const PREFERENCE_DISCOUNT = 0.9;

/**
 * A weighted summary of the colours actually present in the design,
 * in Lab. Built once per source frame, reused across every candidate.
 */
export interface ColorDistribution {
  /** Bin representative colours, Lab triples: [L, a, b, L, a, b, …]. */
  lab: Float32Array;
  /** Stitches represented by each bin. */
  weight: Float32Array;
  /** Number of bins actually used. */
  count: number;
  /** Non-empty stitches the distribution was built from. */
  stitchCount: number;
  /** Distinct binned colours before the {@link MAX_BINS} cap. */
  distinctBins: number;
}

/**
 * Summarise a **grid-sized** buffer's colours.
 *
 * Resize comes first (D3), so this runs over stitches, not source
 * pixels — one bin's weight is a count of stitches you would actually
 * sew. Empty cells (alpha < 128) are excluded: fabric is not a colour
 * the palette has to cover.
 *
 * Bin representatives are the **mean** of the colours that fell in the
 * bin, not the bin centre, so a design whose colours cluster at one
 * corner of a bin is not pulled towards a colour it does not contain.
 */
export function buildDistribution(buffer: PixelBuffer): ColorDistribution {
  const data = buffer.data;
  const shift = 8 - BIN_BITS;
  const sums = new Map<number, { r: number; g: number; b: number; n: number }>();
  let stitchCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    stitchCount++;
    const key =
      ((r >> shift) << (BIN_BITS * 2)) | ((g >> shift) << BIN_BITS) | (b >> shift);
    const acc = sums.get(key);
    if (acc === undefined) sums.set(key, { r, g, b, n: 1 });
    else {
      acc.r += r;
      acc.g += g;
      acc.b += b;
      acc.n++;
    }
  }

  // Descending weight, then bin key — deterministic under the cap.
  const bins = [...sums.entries()].sort((a, b) => b[1].n - a[1].n || a[0] - b[0]);
  const distinctBins = bins.length;
  const kept = bins.slice(0, MAX_BINS);

  const lab = new Float32Array(kept.length * 3);
  const weight = new Float32Array(kept.length);
  kept.forEach(([, acc], i) => {
    srgbToLab(
      Math.round(acc.r / acc.n),
      Math.round(acc.g / acc.n),
      Math.round(acc.b / acc.n),
      lab,
      i * 3,
    );
    weight[i] = acc.n;
  });

  return { lab, weight, count: kept.length, stitchCount, distinctBins };
}

/** The outcome of a selection run. */
export interface SelectionResult {
  /** The chosen threads, in permitted-set order. */
  threads: Thread[];
  /** How many came from locks. */
  lockedCount: number;
  /** How many the auto-fill chose. */
  autoFilledCount: number;
  /** How many auto-filled threads were on the preferred list. */
  preferredUsed: number;
  /**
   * True when fewer threads were selected than requested because the
   * permitted set ran out — the caller turns this into the explanation.
   */
  shortOfTarget: boolean;
}

/** Squared ΔE76 between two Lab triples held in flat arrays. */
function distSq(
  a: Float32Array,
  ai: number,
  b: Float32Array,
  bi: number,
): number {
  const dl = (a[ai] ?? 0) - (b[bi] ?? 0);
  const da = (a[ai + 1] ?? 0) - (b[bi + 1] ?? 0);
  const db = (a[ai + 2] ?? 0) - (b[bi + 2] ?? 0);
  return dl * dl + da * da + db * db;
}

/**
 * Choose up to `target` threads from `permitted.eligible` that best
 * cover `distribution`.
 *
 * Greedy forward selection against the weighted sum of squared ΔE from
 * each bin to its nearest chosen thread — deliberately the same
 * perceptual objective the mapper itself minimises, so the selector
 * cannot be optimising for something the render then contradicts.
 *
 * Locks seed the selection and are never displaced, even when the
 * source contains nothing near them: a locked thread is a hard promise
 * (M7-MIX-01). Auto-fill then supplies `target - locks` more.
 *
 * The greedy result is not a global optimum, and is not claimed to be —
 * a fast deterministic answer whose limits are stated beats an
 * exhaustive search nobody can wait for during live editing.
 */
export function selectThreads(
  permitted: PermittedSet,
  target: number,
  distribution: ColorDistribution,
): SelectionResult {
  const eligible = permitted.eligible;
  const locks = permitted.locks;

  // Locks alone can meet or exceed the target: honour every lock and
  // let the caller explain the overshoot rather than dropping one.
  if (target <= locks.length || eligible.length === 0) {
    return {
      threads: [...locks],
      lockedCount: locks.length,
      autoFilledCount: 0,
      preferredUsed: 0,
      shortOfTarget: false,
    };
  }
  if (target >= eligible.length) {
    return {
      threads: [...eligible],
      lockedCount: locks.length,
      autoFilledCount: eligible.length - locks.length,
      preferredUsed: [...permitted.preferred].length,
      shortOfTarget: target > eligible.length,
    };
  }

  const bins = distribution.count;
  const nEligible = eligible.length;

  // One distance matrix, built once: after this the greedy loop is
  // pure arithmetic over Float32Arrays, which is what keeps a 20-of-
  // 1007 selection in the tens of milliseconds rather than seconds.
  const threadLab = new Float32Array(nEligible * 3);
  for (let t = 0; t < nEligible; t++) {
    const rgb = eligible[t]?.rgb ?? [0, 0, 0];
    srgbToLab(rgb[0], rgb[1], rgb[2], threadLab, t * 3);
  }
  const dist = new Float32Array(nEligible * bins);
  for (let t = 0; t < nEligible; t++) {
    for (let b = 0; b < bins; b++) {
      dist[t * bins + b] = distSq(threadLab, t * 3, distribution.lab, b * 3);
    }
  }

  const chosen = new Uint8Array(nEligible);
  const best = new Float32Array(bins).fill(Number.POSITIVE_INFINITY);
  const indexById = new Map(eligible.map((t, i) => [t.id, i]));

  const applyThread = (t: number): void => {
    chosen[t] = 1;
    const base = t * bins;
    for (let b = 0; b < bins; b++) {
      const d = dist[base + b] ?? 0;
      if (d < (best[b] ?? Number.POSITIVE_INFINITY)) best[b] = d;
    }
  };

  for (const lock of locks) {
    const t = indexById.get(lock.id);
    if (t !== undefined) applyThread(t);
  }

  const preferredIndex = new Set<number>();
  for (const id of permitted.preferred) {
    const t = indexById.get(id);
    if (t !== undefined) preferredIndex.add(t);
  }

  let preferredUsed = 0;
  let autoFilled = 0;
  const wanted = target - locks.length;
  for (let pick = 0; pick < wanted; pick++) {
    let bestThread = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let t = 0; t < nEligible; t++) {
      if (chosen[t] === 1) continue;
      const base = t * bins;
      let cost = 0;
      for (let b = 0; b < bins; b++) {
        const current = best[b] ?? Number.POSITIVE_INFINITY;
        const d = dist[base + b] ?? 0;
        cost += (distribution.weight[b] ?? 0) * (d < current ? d : current);
      }
      if (preferredIndex.has(t)) cost *= PREFERENCE_DISCOUNT;
      // Strict `<` keeps the earliest permitted-set index on a tie, so
      // the same policy and image always give the same palette.
      if (cost < bestCost) {
        bestCost = cost;
        bestThread = t;
      }
    }
    if (bestThread === -1) break;
    if (preferredIndex.has(bestThread)) preferredUsed++;
    applyThread(bestThread);
    autoFilled++;
  }

  // Emit in permitted-set order, not selection order: palette order is
  // the nearest-match tie-break, so it must not depend on the sequence
  // the greedy loop happened to discover threads in.
  const threads = eligible.filter((_, i) => chosen[i] === 1);
  return {
    threads,
    lockedCount: locks.length,
    autoFilledCount: autoFilled,
    preferredUsed,
    shortOfTarget: threads.length < target,
  };
}

/** A selection turned into a palette, with its counts for the UI. */
export interface SelectedPalette {
  palette: Palette;
  selection: SelectionResult;
}

/** Wrap {@link selectThreads} into a named palette. */
export function selectPalette(
  permitted: PermittedSet,
  target: number,
  distribution: ColorDistribution,
  name: string,
): SelectedPalette {
  const selection = selectThreads(permitted, target, distribution);
  return { palette: paletteOf(name, selection.threads), selection };
}
