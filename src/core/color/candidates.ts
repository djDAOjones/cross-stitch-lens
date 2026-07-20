/**
 * Per-bin candidate pruning for exact Lab palette matching.
 *
 * The dither stage cannot use the 15-bit LUT — its error terms need the
 * exact nearest colour for *fractional* working values, and the LUT
 * disagrees with exact matching on 5.9% of sampled sRGB values (D6).
 * But the LUT's bin structure is still usable as an *index*: for each
 * 15-bit bin we precompute the small set of palette entries that could
 * possibly win anywhere inside it, and the per-pixel scan then runs over
 * that set instead of the whole palette.
 *
 * This is an exclusion, not an approximation — the pruned scan returns
 * the identical index to the full scan, including ties. See
 * {@link buildCandidateTable} for the argument. Measured over 138,304
 * adversarial values per palette: 0 mismatches (M5B, M5-PERF-14).
 *
 * Lab only. The bounding-box argument depends on the sRGB→Lab pipeline
 * being monotone per channel; the 'rgb' metric keeps the full scan.
 */

import { srgbToLab } from './convert.ts';
import { lutKey, LUT_SIZE } from './lut.ts';
import { paletteLab } from '../palette.ts';
import type { Palette } from '../types.ts';

/** D65 reference white (2° observer), Y normalised to 1. */
const XN = 0.95047;
const ZN = 1.08883;
/** CIE f(t) linear-segment threshold: (6/29)^3. */
const EPSILON = 216 / 24389;
/** CIE f(t) linear-segment slope term. */
const KAPPA = 24389 / 27;

/** Width of one 15-bit bin in 8-bit channel units. */
const BIN_WIDTH = 8;

/**
 * Per-bin candidate lists, in ascending palette index order.
 *
 * A flat `candidates` array with a `offsets` prefix index rather than
 * 32,768 sub-arrays: one allocation, cache-friendly iteration, and no
 * per-bin object headers (1.3 MB at 64 colours, 2.3 MB at 533).
 */
export interface CandidateTable {
  /** Start offset of bin `k` within `candidates`; length LUT_SIZE + 1. */
  offsets: Int32Array;
  /** Palette indices, ascending within each bin. */
  candidates: Uint16Array;
}

/** One sRGB channel 0–255 → linear 0–1 (IEC 61966-2-1 EOTF). */
function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** CIE 1976 f(t): cube root above ε, linear segment below. */
function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

/**
 * Lab bounding box of a 15-bit bin, as [lMin, lMax, aMin, aMax, bMin,
 * bMax] written into `box`.
 *
 * Soundness: every step from sRGB to (fx, fy, fz) is monotonically
 * increasing in each channel — the sRGB EOTF is monotone, every
 * sRGB→XYZ matrix coefficient is positive, and CIE f(t) is monotone. L
 * therefore ranges between its corner values. `a` and `b` are
 * *differences* of two f terms, so each is bounded by pairing one
 * term's extreme against the other's opposite extreme. That over-states
 * the box (the true image of the bin is a curved solid, not a box) but
 * never under-states it, which is exactly what exactness requires: a
 * conservative enclosure can only keep candidates that cannot win, it
 * can never drop one that can.
 *
 * The bin covers the half-open channel range [8·bin, 8·bin+8) — dither
 * working values are fractional, and `lutKey` truncates — capped at 255
 * by `clamp255` upstream. The closed interval used here is a superset.
 */
function binLabBox(rBin: number, gBin: number, bBin: number, box: Float64Array): void {
  const rLo = rBin * BIN_WIDTH;
  const gLo = gBin * BIN_WIDTH;
  const bLo = bBin * BIN_WIDTH;
  const rHi = Math.min(rLo + BIN_WIDTH, 255);
  const gHi = Math.min(gLo + BIN_WIDTH, 255);
  const bHi = Math.min(bLo + BIN_WIDTH, 255);

  const rlLo = srgbChannelToLinear(rLo);
  const glLo = srgbChannelToLinear(gLo);
  const blLo = srgbChannelToLinear(bLo);
  const rlHi = srgbChannelToLinear(rHi);
  const glHi = srgbChannelToLinear(gHi);
  const blHi = srgbChannelToLinear(bHi);

  const xLo = 0.4124564 * rlLo + 0.3575761 * glLo + 0.1804375 * blLo;
  const xHi = 0.4124564 * rlHi + 0.3575761 * glHi + 0.1804375 * blHi;
  const yLo = 0.2126729 * rlLo + 0.7151522 * glLo + 0.072175 * blLo;
  const yHi = 0.2126729 * rlHi + 0.7151522 * glHi + 0.072175 * blHi;
  const zLo = 0.0193339 * rlLo + 0.119192 * glLo + 0.9503041 * blLo;
  const zHi = 0.0193339 * rlHi + 0.119192 * glHi + 0.9503041 * blHi;

  const fxLo = labF(xLo / XN);
  const fxHi = labF(xHi / XN);
  const fyLo = labF(yLo);
  const fyHi = labF(yHi);
  const fzLo = labF(zLo / ZN);
  const fzHi = labF(zHi / ZN);

  box[0] = 116 * fyLo - 16;
  box[1] = 116 * fyHi - 16;
  box[2] = 500 * (fxLo - fyHi);
  box[3] = 500 * (fxHi - fyLo);
  box[4] = 200 * (fyLo - fzHi);
  box[5] = 200 * (fyHi - fzLo);
}

/** Squared distance from a point to the nearest face of a box. */
function minDistSq(box: Float64Array, l: number, a: number, b: number): number {
  const lLo = box[0] ?? 0;
  const lHi = box[1] ?? 0;
  const aLo = box[2] ?? 0;
  const aHi = box[3] ?? 0;
  const bLo = box[4] ?? 0;
  const bHi = box[5] ?? 0;
  const dl = l < lLo ? lLo - l : l > lHi ? l - lHi : 0;
  const da = a < aLo ? aLo - a : a > aHi ? a - aHi : 0;
  const db = b < bLo ? bLo - b : b > bHi ? b - bHi : 0;
  return dl * dl + da * da + db * db;
}

/** Squared distance from a point to the farthest corner of a box. */
function maxDistSq(box: Float64Array, l: number, a: number, b: number): number {
  const dl = Math.max(Math.abs(l - (box[0] ?? 0)), Math.abs(l - (box[1] ?? 0)));
  const da = Math.max(Math.abs(a - (box[2] ?? 0)), Math.abs(a - (box[3] ?? 0)));
  const db = Math.max(Math.abs(b - (box[4] ?? 0)), Math.abs(b - (box[5] ?? 0)));
  return dl * dl + da * da + db * db;
}

/**
 * Build the exact candidate table for a palette under the Lab metric.
 *
 * For each bin: let R = min over palette entries of maxDist²(entry,
 * box) — the distance to the closest *witness*, i.e. an entry that is
 * within R of every point in the bin. Any entry whose minDist²(entry,
 * box) is strictly greater than R is farther than that witness for
 * every value in the bin, so it can neither win nor tie, and dropping
 * it cannot change the result. Entries at exactly R are kept, which is
 * what preserves the reference's strict-`<` first-minimum tie-break:
 * candidates stay in ascending palette index order, so the pruned scan
 * meets equal-distance entries in the same order the full scan does and
 * keeps the same one.
 *
 * O(32,768 × palette size) — the same order as a LUT build, and like
 * the LUT it is a per-palette one-off that belongs in the worker cache,
 * never in the frame path.
 *
 * Deterministic and allocation-bounded: same palette → same table.
 */
export function buildCandidateTable(palette: Palette): CandidateTable {
  const palLab = paletteLab(palette);
  const count = palette.entries.length;
  const offsets = new Int32Array(LUT_SIZE + 1);
  const box = new Float64Array(6);

  // One pass over the bins, appending into a doubling buffer: counting
  // first would mean running both distance scans twice, and the final
  // size is not predictable from the palette size alone (it depends on
  // how the entries are distributed in Lab). Peak memory is at worst 2×
  // the final table, which is ~4.6 MB at 533 colours.
  let capacity = LUT_SIZE * 4;
  let candidates = new Uint16Array(capacity);
  let at = 0;

  for (let key = 0; key < LUT_SIZE; key++) {
    offsets[key] = at;
    binLabBox(key >> 10, (key >> 5) & 31, key & 31, box);

    // The witness radius: the smallest "farthest corner" distance over
    // the palette. Some entry is within this distance of every point in
    // the bin, so nothing strictly beyond it can ever win here.
    let radius = Infinity;
    for (let i = 0; i < count; i++) {
      const d = maxDistSq(box, palLab[i * 3] ?? 0, palLab[i * 3 + 1] ?? 0, palLab[i * 3 + 2] ?? 0);
      if (d < radius) radius = d;
    }

    for (let i = 0; i < count; i++) {
      const d = minDistSq(box, palLab[i * 3] ?? 0, palLab[i * 3 + 1] ?? 0, palLab[i * 3 + 2] ?? 0);
      if (d > radius) continue;
      if (at === capacity) {
        capacity *= 2;
        const grown = new Uint16Array(capacity);
        grown.set(candidates);
        candidates = grown;
      }
      candidates[at++] = i;
    }
  }
  offsets[LUT_SIZE] = at;

  return { offsets, candidates: candidates.subarray(0, at) };
}

/**
 * Exact nearest palette index under Lab, scanning only the candidates
 * for the query's bin. Returns the same index as `nearestIndex(…,
 * 'lab', …)` for every input, by the argument in
 * {@link buildCandidateTable}.
 *
 * Channels are 0–255 sRGB and may be fractional (dither working
 * values). `labScratch` is caller-provided to keep the loop
 * allocation-free.
 */
export function nearestIndexPruned(
  r: number,
  g: number,
  b: number,
  palLab: Float32Array,
  labScratch: Float32Array,
  table: CandidateTable,
): number {
  srgbToLab(r, g, b, labScratch, 0);
  const ql = labScratch[0] ?? 0;
  const qa = labScratch[1] ?? 0;
  const qb = labScratch[2] ?? 0;
  const key = lutKey(r, g, b);
  const from = table.offsets[key] ?? 0;
  const to = table.offsets[key + 1] ?? 0;
  let best = 0;
  let bestDist = Infinity;
  for (let k = from; k < to; k++) {
    const i = table.candidates[k] ?? 0;
    const dl = ql - (palLab[i * 3] ?? 0);
    const da = qa - (palLab[i * 3 + 1] ?? 0);
    const db = qb - (palLab[i * 3 + 2] ?? 0);
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
