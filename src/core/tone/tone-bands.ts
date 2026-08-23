/**
 * CREATIVE-01 prototype — tone bands: the lightness histogram, the
 * cuts (natural, Equalise, target shares at source-lightness
 * quantiles) and the band mapping ladder mode runs on.
 *
 * Rungs are the palette's entries ordered by L* ascending (the ladder
 * profiles are curated light→dark, D46 — the ramp control presents
 * them however it likes; the maths wants ascending). Ascending cuts
 * split curved L* into `entries` bands: band k, cuts[k−1] ≤ L < cuts[k],
 * maps to rung k. "Target shares = cuts at source-lightness
 * quantiles" — exact at any N undithered to histogram resolution,
 * near with dither (the drift is one of the audit's measurements).
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket.
 */

import { srgbToLab } from '../color/convert.ts';
import { paletteLab } from '../palette.ts';
import { applyCurve, type ToneCurve } from './tone-curve.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../types.ts';

/** Histogram resolution over L* 0–100. */
export const HIST_BINS = 512;

/** A curved-lightness histogram of a buffer's non-empty cells. */
export interface LightnessHistogram {
  /** Cell counts per bin; bin b covers [b, b+1) × 100/HIST_BINS. */
  counts: Float64Array;
  /** Cells counted (alpha > 0 — the mapper's own skip rule, D9/D49). */
  total: number;
}

/** Build the curved-lightness histogram the quantile cuts read. */
export function lightnessHistogram(
  buffer: PixelBuffer,
  curve: ToneCurve | null = null,
): LightnessHistogram {
  const counts = new Float64Array(HIST_BINS);
  const lab = new Float32Array(3);
  const data = buffer.data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) === 0) continue;
    srgbToLab(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, lab, 0);
    const l = curve === null ? (lab[0] ?? 0) : applyCurve(curve, lab[0] ?? 0);
    const bin = Math.min(HIST_BINS - 1, Math.max(0, Math.floor((l / 100) * HIST_BINS)));
    counts[bin] = (counts[bin] ?? 0) + 1;
    total++;
  }
  return { counts, total };
}

/** Ladder order: palette indices sorted by L* ascending (ties by index). */
export function ladderOrder(palette: Palette): Uint16Array {
  const lab = paletteLab(palette);
  const order = [...Array(palette.entries.length).keys()].sort(
    (a, b) => (lab[a * 3] ?? 0) - (lab[b * 3] ?? 0) || a - b,
  );
  return Uint16Array.from(order);
}

/**
 * Natural cuts: the midpoints between adjacent rung L* values — the
 * cuts pure L-only nearest matching implies, so "natural" is where
 * every ladder starts and Equalise or a dragged handle departs from.
 */
export function naturalCuts(palette: Palette, order: Uint16Array): number[] {
  const lab = paletteLab(palette);
  const cuts: number[] = [];
  for (let k = 0; k + 1 < order.length; k++) {
    const a = lab[(order[k] ?? 0) * 3] ?? 0;
    const b = lab[(order[k + 1] ?? 0) * 3] ?? 0;
    cuts.push((a + b) / 2);
  }
  return cuts;
}

/** Equal target shares for `n` bands (the Equalise button's vector). */
export function equalShares(n: number): number[] {
  return Array.from({ length: n }, () => 1 / n);
}

/**
 * Cuts at the histogram's share quantiles: band k (darkest first)
 * takes `shares[k]` of the cells. A zero share is legal and yields a
 * duplicate cut (an empty band). An empty histogram falls back to
 * even L* spacing so the control stays drawable.
 */
export function quantileCuts(
  hist: LightnessHistogram,
  shares: readonly number[],
): number[] {
  const cuts: number[] = [];
  if (hist.total === 0) {
    for (let k = 1; k < shares.length; k++) cuts.push((100 * k) / shares.length);
    return cuts;
  }
  let acc = 0;
  let bin = 0;
  let cum = 0;
  for (let k = 0; k + 1 < shares.length; k++) {
    acc += (shares[k] ?? 0) * hist.total;
    while (bin < HIST_BINS && cum + (hist.counts[bin] ?? 0) < acc) {
      cum += hist.counts[bin] ?? 0;
      bin++;
    }
    const inBin = hist.counts[bin] ?? 0;
    const frac = inBin > 0 ? (acc - cum) / inBin : 0;
    cuts.push(Math.min(100, ((bin + frac) / HIST_BINS) * 100));
  }
  return cuts;
}

/** Band index for a curved lightness under ascending `cuts`. */
export function bandForL(l: number, cuts: readonly number[]): number {
  let k = 0;
  while (k < cuts.length && l >= (cuts[k] ?? Infinity)) k++;
  return k;
}

/**
 * Achieved share per band (rung order, darkest first) from an indices
 * sidecar — the ramp readout's and the audit's number.
 */
export function achievedShares(
  indices: Uint16Array,
  palette: Palette,
  order: Uint16Array,
): number[] {
  const bandOfIndex = new Int32Array(palette.entries.length).fill(-1);
  for (let band = 0; band < order.length; band++) {
    bandOfIndex[order[band] ?? 0] = band;
  }
  const counts = new Float64Array(order.length);
  let total = 0;
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p] ?? EMPTY_INDEX;
    if (idx === EMPTY_INDEX) continue;
    const band = bandOfIndex[idx] ?? -1;
    if (band < 0) continue;
    counts[band] = (counts[band] ?? 0) + 1;
    total++;
  }
  return [...counts].map((c) => (total === 0 ? 0 : c / total));
}
