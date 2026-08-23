/**
 * Tone mode (TONE-01, CREATIVE-01 slice 1): the colour ↔ tone weighted
 * metric, the three-point lightness curve, and ladder-mode bands.
 *
 * The slider `weight` t ∈ [0, 1] (0 = colour, 1 = tone) scales the
 * a/b axes by w = 1 − t, so the weighted distance
 *
 *     d² = ΔL² + w²·Δa² + w²·Δb²
 *
 * is plain Euclidean distance in the scaled space (curved L, w·a,
 * w·b). At t = 0 with an identity curve this is ΔE76 exactly; at
 * t = 1 it is lightness alone — ladder mode's metric. Matching,
 * count-limit selection and dither error diffusion all work in this
 * one space (the D200 decision of record: the metric carries the
 * weight, selection uses the same weight as cell matching, and dither
 * must diffuse the error the metric sees or hue error leaks into
 * lightness — the prototype measured the leak at ~3× spread / ~7× σ
 * when the production sRGB error path was reused unchanged).
 *
 * The curve remaps the *picture's* lightness before matching; palette
 * lightness is never curved. Exactly three points — bottom, mid,
 * top — each adjustable on both axes, so an inverted mapping is legal
 * by construction (no free-point spline).
 *
 * Ladder mode binds at the end-stop (t = 1): rungs are the palette's
 * entries ordered by L* ascending, and ascending curved-L* cuts split
 * the axis into one band per rung. With `cuts: null` the bands are
 * *natural* — the midpoints L-only nearest matching implies — which is
 * exactly what the weighted metric already computes at w = 0, so a
 * cuts array exists only once Equalise or a dragged handle departs
 * from natural.
 *
 * Tone engages only under the 'lab' metric (§6 defines the weights in
 * Lab); under 'rgb' — reachable only from a hand-edited file, there is
 * no metric control — the block is carried but inert.
 */

import { srgbToLab } from './convert.ts';
import type { ColorMetric } from './metrics.ts';
import { paletteLab } from '../palette.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../types.ts';

/** One curve point: input → output lightness, both L* 0–100. */
export interface CurvePoint {
  in: number;
  out: number;
}

/** Bottom, mid, top; `in` values non-decreasing (the UI enforces it). */
export type ToneCurve = readonly [CurvePoint, CurvePoint, CurvePoint];

/**
 * Tone mode as configured — the UI + project-file shape (schema v12).
 * `weight` is the slider t (0 = colour, 1 = tone); `cuts` is the
 * custom ascending curved-L* cut list for ladder mode, or null for
 * natural bands. Cuts bind only at the end-stop and only when their
 * length matches the palette (entries − 1); anywhere else they are
 * carried but inert, so a palette that changes size falls back to
 * natural bands rather than misreading stale cuts.
 */
export interface ToneConfig {
  weight: number;
  curve: ToneCurve;
  cuts: number[] | null;
}

/** The no-op curve: y = x with the mid point on the diagonal. */
export function identityCurve(): [CurvePoint, CurvePoint, CurvePoint] {
  return [
    { in: 0, out: 0 },
    { in: 50, out: 50 },
    { in: 100, out: 100 },
  ];
}

/** True when applying the curve changes nothing. */
export function isIdentityCurve(curve: ToneCurve): boolean {
  const [lo, mid, hi] = curve;
  return (
    lo.in === 0 && lo.out === 0 && hi.in === 100 && hi.out === 100 && mid.in === mid.out
  );
}

/** A fresh disengaged tone config — the schema-v12 default. */
export function defaultTone(): ToneConfig {
  return { weight: 0, curve: identityCurve(), cuts: null };
}

/**
 * Curved lightness for `l` (L* 0–100): piecewise linear through the
 * three points, clamped to the end outputs outside [bottom.in, top.in].
 * A zero-width segment returns its right point's output.
 */
export function applyCurve(curve: ToneCurve, l: number): number {
  const [lo, mid, hi] = curve;
  if (l <= lo.in) return lo.out;
  if (l >= hi.in) return hi.out;
  const a = l <= mid.in ? lo : mid;
  const b = l <= mid.in ? mid : hi;
  const span = b.in - a.in;
  if (span <= 0) return b.out;
  return a.out + ((l - a.in) / span) * (b.out - a.out);
}

/** a/b axis scale for tone weight `t` (clamped to [0, 1]). */
export function chromaScale(weight: number): number {
  return 1 - Math.min(1, Math.max(0, weight));
}

/**
 * Whether tone mode changes matching at all. Only under 'lab' (§6),
 * and only when the weight or the curve departs from the defaults —
 * cuts alone never engage it, because they bind only at the end-stop,
 * which the weight test already covers. Disengaged tone runs none of
 * the tone code paths, which is what keeps t = 0 byte-identical to
 * the pre-TONE-01 engine.
 */
export function toneEngaged(
  metric: ColorMetric,
  tone: ToneConfig | undefined,
): tone is ToneConfig {
  if (metric !== 'lab' || tone === undefined) return false;
  return tone.weight > 0 || !isIdentityCurve(tone.curve);
}

/**
 * Serialisable identity of a tone config, for cache keys (the LUT key
 * carries the weight — D46 — and with it everything else that changes
 * matching: the curve and the cuts). `String(number)` is exact for
 * IEEE doubles, so equal configs always share a key and different
 * ones never do.
 */
export function toneFingerprint(tone: ToneConfig | undefined): string {
  if (tone === undefined) return 'off';
  const curve = tone.curve
    .map((p) => `${String(p.in)},${String(p.out)}`)
    .join(';');
  const cuts = tone.cuts === null ? 'nat' : tone.cuts.map(String).join(',');
  return `w${String(tone.weight)}|c${curve}|k${cuts}`;
}

// ---------------------------------------------------------------------
// The tone matcher — matching, LUT build and dither share it
// ---------------------------------------------------------------------

/**
 * Everything a hot loop needs to match in the tone space, built once
 * per stage call (O(palette), never per pixel).
 */
export interface ToneMatcher {
  /** Palette Lab with a/b pre-scaled by `w`; L is never curved. */
  palLab: Float32Array;
  /** The a/b scale, 1 − weight. */
  w: number;
  /** The lightness curve, or null when identity (skip the call). */
  curve: ToneCurve | null;
  /**
   * Ladder-mode band mapping when custom cuts bind (weight exactly 1,
   * cuts matching the palette size); null = weighted nearest, which at
   * w = 0 already reproduces natural bands.
   */
  ladder: { cuts: readonly number[]; order: Uint16Array } | null;
}

/** Rung order: palette indices sorted by L* ascending (ties by index). */
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

/**
 * Whether this config's custom cuts bind for this palette: end-stop
 * only, length must match (entries − 1), at least two rungs. A stale
 * cuts list from a palette of another size is carried but inert.
 */
export function ladderActive(tone: ToneConfig, paletteSize: number): boolean {
  return (
    tone.weight === 1 &&
    tone.cuts !== null &&
    paletteSize >= 2 &&
    tone.cuts.length === paletteSize - 1
  );
}

/** Build the {@link ToneMatcher} for a palette + engaged tone config. */
export function createToneMatcher(palette: Palette, tone: ToneConfig): ToneMatcher {
  const w = chromaScale(tone.weight);
  const palLab = paletteLab(palette);
  for (let i = 0; i < palLab.length; i += 3) {
    palLab[i + 1] = (palLab[i + 1] ?? 0) * w;
    palLab[i + 2] = (palLab[i + 2] ?? 0) * w;
  }
  const ladder =
    ladderActive(tone, palette.entries.length) && tone.cuts !== null
      ? { cuts: [...tone.cuts], order: ladderOrder(palette) }
      : null;
  return {
    palLab,
    w,
    curve: isIdentityCurve(tone.curve) ? null : tone.curve,
    ladder,
  };
}

/** Band index for a curved lightness under ascending `cuts`. */
export function bandForL(l: number, cuts: readonly number[]): number {
  let k = 0;
  while (k < cuts.length && l >= (cuts[k] ?? Infinity)) k++;
  return k;
}

/**
 * Nearest palette index for a query already in the tone space (curved
 * L, w·a, w·b). Weighted nearest scans with the first-minimum
 * tie-break `nearestIndex` uses, so t = 0 semantics agree with
 * production matching exactly; ladder mode is a band lookup instead —
 * the a/b components are zero there by construction (w = 0).
 */
export function toneNearestScaled(
  matcher: ToneMatcher,
  ql: number,
  qa: number,
  qb: number,
): number {
  if (matcher.ladder !== null) {
    return matcher.ladder.order[bandForL(ql, matcher.ladder.cuts)] ?? 0;
  }
  const palLab = matcher.palLab;
  const count = palLab.length / 3;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
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

/**
 * Transform one sRGB colour into the tone space, writing (curved L,
 * w·a, w·b) into `labScratch` (caller-provided to keep loops
 * allocation-free, the `nearestIndex` convention).
 */
export function toneQuery(
  matcher: ToneMatcher,
  r: number,
  g: number,
  b: number,
  labScratch: Float32Array,
): void {
  srgbToLab(r, g, b, labScratch, 0);
  const l = labScratch[0] ?? 0;
  labScratch[0] = matcher.curve === null ? l : applyCurve(matcher.curve, l);
  labScratch[1] = (labScratch[1] ?? 0) * matcher.w;
  labScratch[2] = (labScratch[2] ?? 0) * matcher.w;
}

/** Exact nearest palette index for one sRGB colour in the tone space. */
export function toneNearest(
  matcher: ToneMatcher,
  r: number,
  g: number,
  b: number,
  labScratch: Float32Array,
): number {
  toneQuery(matcher, r, g, b, labScratch);
  return toneNearestScaled(
    matcher,
    labScratch[0] ?? 0,
    labScratch[1] ?? 0,
    labScratch[2] ?? 0,
  );
}

// ---------------------------------------------------------------------
// The lightness histogram and quantile cuts (Equalise, the ramp strip)
// ---------------------------------------------------------------------

/** Histogram resolution over L* 0–100. */
export const HIST_BINS = 512;

/** A curved-lightness histogram of a buffer's non-empty cells. */
export interface LightnessHistogram {
  /** Cell counts per bin; bin b covers [b, b+1) × 100/{@link HIST_BINS}. */
  counts: Float64Array;
  /** Cells counted (alpha > 0 — the dither scan's own skip rule, D9/D49). */
  total: number;
}

/**
 * Build the curved-lightness histogram the quantile cuts and the ramp
 * strip read. Runs over the grid-sized selection source (stitches,
 * not source pixels), so a bin count is a count of stitches.
 */
export function lightnessHistogram(
  buffer: PixelBuffer,
  curve: ToneCurve | null = null,
): LightnessHistogram {
  const counts = new Float64Array(HIST_BINS);
  const lab = new Float32Array(3);
  const data = buffer.data;
  const curved = curve !== null && !isIdentityCurve(curve) ? curve : null;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) === 0) continue;
    srgbToLab(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, lab, 0);
    const l = curved === null ? (lab[0] ?? 0) : applyCurve(curved, lab[0] ?? 0);
    const bin = Math.min(HIST_BINS - 1, Math.max(0, Math.floor((l / 100) * HIST_BINS)));
    counts[bin] = (counts[bin] ?? 0) + 1;
    total++;
  }
  return { counts, total };
}

/** Equal target shares for `n` bands (the Equalise button's vector). */
export function equalShares(n: number): number[] {
  return Array.from({ length: n }, () => 1 / n);
}

/**
 * Cuts at the histogram's share quantiles: band k (darkest first)
 * takes `shares[k]` of the cells — "target shares = cuts at
 * source-lightness quantiles", exact undithered up to flat regions (a
 * region sharing one L* cannot be split by a cut), near with dither.
 * A zero share is legal and yields a duplicate cut (an empty band).
 * An empty histogram falls back to even L* spacing so the control
 * stays drawable.
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

/**
 * Stitch counts per rung from a palette-index sidecar, `rungOfIndex`
 * mapping each index the sidecar can hold to its rung (−1 = not a
 * rung — a render-only swap target, say). The ramp readout's number:
 * *achieved* shares, never restated targets, which is what the D200
 * build must asks for whenever dither is on.
 */
export function rungCounts(
  indices: Uint16Array,
  rungOfIndex: Int32Array,
  rungCount: number,
): { counts: Float64Array; total: number } {
  const counts = new Float64Array(rungCount);
  let total = 0;
  for (let p = 0; p < indices.length; p++) {
    const idx = indices[p] ?? EMPTY_INDEX;
    if (idx === EMPTY_INDEX) continue;
    total++;
    const rung = idx < rungOfIndex.length ? (rungOfIndex[idx] ?? -1) : -1;
    if (rung < 0 || rung >= rungCount) continue;
    counts[rung] = (counts[rung] ?? 0) + 1;
  }
  return { counts, total };
}

// ---------------------------------------------------------------------
// Suitability — the tone hint and the confetti caution (D200)
// ---------------------------------------------------------------------

/**
 * One heuristic, two messages (the D200 decision of record): a ladder
 * near the tone end offers one-click tone matching; a broad multi-hue
 * palette near the tone end gets a subtle caution. Never a silent
 * change, never a block — full tone with a full palette stays allowed
 * and the ramp readout explains the result.
 */
export interface ToneSuitability {
  /** Entries in the palette. */
  entryCount: number;
  /**
   * Smallest hue arc (degrees, 0–360) containing every chromatic
   * entry; 0 when fewer than two entries are chromatic.
   */
  hueSpreadDeg: number;
  /** Max − min entry L*. */
  lightnessSpread: number;
  /** Entries with chroma above the neutral threshold. */
  chromaticCount: number;
}

/** Chroma below this reads as neutral — hue is noise there. */
const NEUTRAL_CHROMA = 10;

/** Measure a palette for the tone hint and the confetti caution. */
export function toneSuitability(palette: Palette): ToneSuitability {
  const lab = paletteLab(palette);
  const n = palette.entries.length;
  const hues: number[] = [];
  let lMin = Infinity;
  let lMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const l = lab[i * 3] ?? 0;
    const a = lab[i * 3 + 1] ?? 0;
    const b = lab[i * 3 + 2] ?? 0;
    if (l < lMin) lMin = l;
    if (l > lMax) lMax = l;
    if (Math.hypot(a, b) > NEUTRAL_CHROMA) {
      hues.push(((Math.atan2(b, a) * 180) / Math.PI + 360) % 360);
    }
  }
  let hueSpreadDeg = 0;
  if (hues.length >= 2) {
    hues.sort((a, b) => a - b);
    let largestGap = 0;
    for (let i = 0; i < hues.length; i++) {
      const next = i + 1 < hues.length ? (hues[i + 1] ?? 0) : (hues[0] ?? 0) + 360;
      const gap = next - (hues[i] ?? 0);
      if (gap > largestGap) largestGap = gap;
    }
    hueSpreadDeg = 360 - largestGap;
  }
  return {
    entryCount: n,
    hueSpreadDeg,
    lightnessSpread: n === 0 ? 0 : lMax - lMin,
    chromaticCount: hues.length,
  };
}

/**
 * The hint the Colour section shows beside the slider, or null.
 * Working thresholds (the wording and the trigger points are D200
 * in-slice items for the owner): a ladder is few entries whose hues
 * agree but whose lightness runs wide; confetti risk is many hues
 * matched by lightness alone.
 */
export function toneHint(
  suitability: ToneSuitability,
  weight: number,
): 'offer-tone' | 'confetti' | null {
  const ladderLike =
    suitability.entryCount >= 2 &&
    suitability.entryCount <= 6 &&
    suitability.lightnessSpread >= 40 &&
    (suitability.chromaticCount < 2 || suitability.hueSpreadDeg <= 60);
  if (ladderLike && weight < 1) return 'offer-tone';
  const confettiRisk =
    suitability.entryCount >= 5 && suitability.hueSpreadDeg > 120 && weight >= 0.75;
  return confettiRisk ? 'confetti' : null;
}
