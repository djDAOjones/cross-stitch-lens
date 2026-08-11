/**
 * Dither candidates for the M5-PERF-13/14 audits — **prototypes, not
 * shipping code**. Nothing here may be imported from `src/`.
 *
 * Two independent axes are prototyped, because bv1 showed they are
 * different sizes of problem: the sRGB→Lab conversion (~70% of dither
 * cost at 64 colours) and the nearest-colour scan (~1.44 ms per palette
 * entry, so the dominant term only at 489).
 */

import { srgbToLab } from '../../../src/core/color/convert.ts';
import { lutKey } from '../../../src/core/color/lut.ts';
import { deltaE76Sq, type ColorMetric } from '../../../src/core/color/metrics.ts';
import { paletteLab, paletteRgb } from '../../../src/core/palette.ts';
import type { DitherParams } from '../../../src/core/pipeline/dither.ts';
import type { Palette, PixelBuffer } from '../../../src/core/types.ts';

/** Clamp a working value to displayable sRGB range (reference copy). */
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Run the reference dither loop but record every clamped working value
 * it matches. M5-PERF-13 insists the conversion micro-benchmarks use
 * *evolving* values from the real loop, not uniform random RGB: error
 * diffusion makes the inputs fractional and spatially correlated, and a
 * uniform sample would flatter a cache- or table-based candidate.
 */
export function captureWorkValues(
  input: PixelBuffer,
  params: DitherParams,
): Float64Array {
  const { width, height } = input;
  const src = input.data;
  const palRgb = paletteRgb(params.palette);
  const palLab =
    params.metric === 'lab' ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);
  const captured = new Float64Array(width * height * 3);
  let out = 0;

  const work = new Float32Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    work[p * 3] = src[p * 4] ?? 0;
    work[p * 3 + 1] = src[p * 4 + 1] ?? 0;
    work[p * 3 + 2] = src[p * 4 + 2] ?? 0;
  }
  const diffuse = (x: number, y: number, er: number, eg: number, eb: number, w: number): void => {
    if (x < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    work[i] = (work[i] ?? 0) + er * w;
    work[i + 1] = (work[i + 1] ?? 0) + eg * w;
    work[i + 2] = (work[i + 2] ?? 0) + eb * w;
  };

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    const ahead = xStep;
    for (let x = xStart; x !== xEnd; x += xStep) {
      const wi = (y * width + x) * 3;
      const r = clamp255(work[wi] ?? 0);
      const g = clamp255(work[wi + 1] ?? 0);
      const b = clamp255(work[wi + 2] ?? 0);
      captured[out++] = r;
      captured[out++] = g;
      captured[out++] = b;

      const idx = nearestIndexReference(r, g, b, params.metric, palRgb, palLab, labScratch) * 3;
      const pr = palRgb[idx] ?? 0;
      const pg = palRgb[idx + 1] ?? 0;
      const pb = palRgb[idx + 2] ?? 0;
      const errR = r - pr;
      const errG = g - pg;
      const errB = b - pb;
      diffuse(x + ahead, y, errR, errG, errB, 7 / 16);
      diffuse(x - ahead, y + 1, errR, errG, errB, 3 / 16);
      diffuse(x, y + 1, errR, errG, errB, 5 / 16);
      diffuse(x + ahead, y + 1, errR, errG, errB, 1 / 16);
    }
  }
  return captured;
}

/**
 * The **pre-M5D** matcher, verbatim: the query Lab is re-read out of
 * the `Float32Array` scratch on every palette iteration, because the
 * distance came from `deltaE76Sq(labScratch, 0, palLab, i * 3)`.
 *
 * M5-PERF-22 landed the hoist into `src/core/color/lut.ts`, so the
 * shipped matcher is no longer the baseline it was measured against.
 * This is that baseline, kept so the audit's "before" stays real and
 * the hoist cannot be silently reverted.
 */
export function nearestIndexPreM5D(
  r: number,
  g: number,
  b: number,
  palLab: Float32Array,
  labScratch: Float32Array,
): number {
  const count = palLab.length / 3;
  let best = 0;
  let bestDist = Infinity;
  srgbToLab(r, g, b, labScratch, 0);
  for (let i = 0; i < count; i++) {
    // Verbatim pre-M5D: a cross-module call per palette entry, which
    // re-reads the three scratch slots inside the callee.
    const d = deltaE76Sq(labScratch, 0, palLab, i * 3);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Matcher with the distance inlined but the scratch still re-read per
 * iteration — the middle point that separates "inlining the metric
 * call" from "hoisting the loop-invariant read".
 */
export function nearestIndexUnhoisted(
  r: number,
  g: number,
  b: number,
  palLab: Float32Array,
  labScratch: Float32Array,
): number {
  const count = palLab.length / 3;
  let best = 0;
  let bestDist = Infinity;
  srgbToLab(r, g, b, labScratch, 0);
  for (let i = 0; i < count; i++) {
    const dl = (labScratch[0] ?? 0) - (palLab[i * 3] ?? 0);
    const da = (labScratch[1] ?? 0) - (palLab[i * 3 + 1] ?? 0);
    const db = (labScratch[2] ?? 0) - (palLab[i * 3 + 2] ?? 0);
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Full dither using the verbatim pre-M5D matcher — the audit's "before". */
export function ditherPreM5D(input: PixelBuffer, params: DitherParams): PixelBuffer {
  return ditherWith(input, params, null, 'preM5D');
}

/** Full dither with the metric inlined but the scratch read unhoisted. */
export function ditherUnhoisted(input: PixelBuffer, params: DitherParams): PixelBuffer {
  return ditherWith(input, params, null, 'unhoisted');
}

/** Local copy of the oracle matcher (keeps the audit self-contained). */
export function nearestIndexReference(
  r: number,
  g: number,
  b: number,
  metric: ColorMetric,
  palRgb: Uint8ClampedArray,
  palLab: Float32Array,
  labScratch: Float32Array,
): number {
  const count = palRgb.length / 3;
  let best = 0;
  let bestDist = Infinity;
  if (metric === 'lab') {
    srgbToLab(r, g, b, labScratch, 0);
    const l = labScratch[0] ?? 0;
    const a = labScratch[1] ?? 0;
    const bb = labScratch[2] ?? 0;
    for (let i = 0; i < count; i++) {
      const dl = l - (palLab[i * 3] ?? 0);
      const da = a - (palLab[i * 3 + 1] ?? 0);
      const db = bb - (palLab[i * 3 + 2] ?? 0);
      const d = dl * dl + da * da + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      const dr = r - (palRgb[i * 3] ?? 0);
      const dg = g - (palRgb[i * 3 + 1] ?? 0);
      const db = b - (palRgb[i * 3 + 2] ?? 0);
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------
// M5-PERF-14 — provably exact per-bin candidate pruning
// ---------------------------------------------------------------------

/** Per-bin candidate lists, in palette index order. */
export interface CandidateTable {
  /** Start offset of bin `k` within `candidates`. */
  offsets: Int32Array;
  /** Palette indices, ascending within each bin. */
  candidates: Uint16Array;
  /** Bytes held by the table. */
  bytes: number;
  /** Build wall time in ms. */
  buildMs: number;
}

const XN = 0.95047;
const ZN = 1.08883;
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

/**
 * Lab bounding box of a 15-bit bin.
 *
 * The enclosure is sound because every step from sRGB to (fx, fy, fz)
 * is monotonically increasing in each channel: the sRGB EOTF is
 * monotone, every sRGB→XYZ matrix coefficient is positive, and CIE f(t)
 * is monotone. L therefore ranges between its corner values, while a
 * and b — being *differences* of two f terms — are bounded by pairing
 * each term's extreme against the other's opposite extreme. That is
 * conservative, never wrong, which is what exactness requires.
 */
function binLabBox(rBin: number, gBin: number, bBin: number): Float64Array {
  // A bin holds real (fractional) work values in [8·bin, 8·bin+8),
  // capped at 255 by clamp255.
  const rLo = rBin * 8;
  const gLo = gBin * 8;
  const bLo = bBin * 8;
  const rHi = Math.min(rBin * 8 + 8, 255);
  const gHi = Math.min(gBin * 8 + 8, 255);
  const bHi = Math.min(bBin * 8 + 8, 255);

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

  const box = new Float64Array(6);
  box[0] = 116 * fyLo - 16;
  box[1] = 116 * fyHi - 16;
  box[2] = 500 * (fxLo - fyHi);
  box[3] = 500 * (fxHi - fyLo);
  box[4] = 200 * (fyLo - fzHi);
  box[5] = 200 * (fyHi - fzLo);
  return box;
}

/** Squared distance from a point to the nearest face of a box. */
function minDistSq(box: Float64Array, l: number, a: number, b: number): number {
  const dl = l < (box[0] ?? 0) ? (box[0] ?? 0) - l : l > (box[1] ?? 0) ? l - (box[1] ?? 0) : 0;
  const da = a < (box[2] ?? 0) ? (box[2] ?? 0) - a : a > (box[3] ?? 0) ? a - (box[3] ?? 0) : 0;
  const db = b < (box[4] ?? 0) ? (box[4] ?? 0) - b : b > (box[5] ?? 0) ? b - (box[5] ?? 0) : 0;
  return dl * dl + da * da + db * db;
}

/** Squared distance from a point to the *farthest* corner of a box. */
function maxDistSq(box: Float64Array, l: number, a: number, b: number): number {
  const dl = Math.max(Math.abs(l - (box[0] ?? 0)), Math.abs(l - (box[1] ?? 0)));
  const da = Math.max(Math.abs(a - (box[2] ?? 0)), Math.abs(a - (box[3] ?? 0)));
  const db = Math.max(Math.abs(b - (box[4] ?? 0)), Math.abs(b - (box[5] ?? 0)));
  return dl * dl + da * da + db * db;
}

/**
 * Build the exact candidate table for a palette in Lab.
 *
 * For each bin, R = min over entries of maxDist²(entry, box). Any entry
 * whose minDist²(entry, box) exceeds R is strictly farther than that
 * witness for *every* value in the bin, so it can neither win nor tie —
 * dropping it preserves the reference's strict-`<` first-minimum
 * semantics exactly. Candidates stay in ascending palette index order,
 * which is what makes the tie-break identical rather than merely equal
 * in distance.
 */
export function buildCandidateTable(palette: Palette): CandidateTable {
  const start = performance.now();
  const palLab = paletteLab(palette);
  const count = palette.entries.length;
  const offsets = new Int32Array(32768 + 1);
  const lists: number[][] = new Array<number[]>(32768);

  for (let rBin = 0; rBin < 32; rBin++) {
    for (let gBin = 0; gBin < 32; gBin++) {
      for (let bBin = 0; bBin < 32; bBin++) {
        const key = (rBin << 10) | (gBin << 5) | bBin;
        const box = binLabBox(rBin, gBin, bBin);
        let radius = Infinity;
        for (let i = 0; i < count; i++) {
          const d = maxDistSq(
            box,
            palLab[i * 3] ?? 0,
            palLab[i * 3 + 1] ?? 0,
            palLab[i * 3 + 2] ?? 0,
          );
          if (d < radius) radius = d;
        }
        const list: number[] = [];
        for (let i = 0; i < count; i++) {
          const d = minDistSq(
            box,
            palLab[i * 3] ?? 0,
            palLab[i * 3 + 1] ?? 0,
            palLab[i * 3 + 2] ?? 0,
          );
          if (d <= radius) list.push(i);
        }
        lists[key] = list;
      }
    }
  }

  let total = 0;
  for (let k = 0; k < 32768; k++) {
    offsets[k] = total;
    total += (lists[k] ?? []).length;
  }
  offsets[32768] = total;
  const candidates = new Uint16Array(total);
  let at = 0;
  for (let k = 0; k < 32768; k++) for (const i of lists[k] ?? []) candidates[at++] = i;

  return {
    offsets,
    candidates,
    bytes: offsets.byteLength + candidates.byteLength,
    buildMs: performance.now() - start,
  };
}

/** Exact nearest index restricted to a bin's candidate list. */
export function nearestIndexPruned(
  r: number,
  g: number,
  b: number,
  palLab: Float32Array,
  labScratch: Float32Array,
  table: CandidateTable,
): number {
  srgbToLab(r, g, b, labScratch, 0);
  const l = labScratch[0] ?? 0;
  const a = labScratch[1] ?? 0;
  const bb = labScratch[2] ?? 0;
  const key = lutKey(r, g, b);
  const from = table.offsets[key] ?? 0;
  const to = table.offsets[key + 1] ?? 0;
  let best = 0;
  let bestDist = Infinity;
  for (let k = from; k < to; k++) {
    const i = table.candidates[k] ?? 0;
    const dl = l - (palLab[i * 3] ?? 0);
    const da = a - (palLab[i * 3 + 1] ?? 0);
    const db = bb - (palLab[i * 3 + 2] ?? 0);
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Control for the pruning measurement: the reference scan over the FULL
 * palette, but with the query Lab hoisted into locals instead of being
 * re-read from the `Float32Array` scratch on every palette iteration
 * (which is what `deltaE76Sq(labScratch, 0, …)` does today).
 *
 * Without this control the pruning speedup is unattributable — it would
 * bundle a scan-structure win with a plain loop-invariant hoist, and
 * M5-PERF-14 explicitly requires the two be reported apart.
 */
export function ditherHoistedScan(input: PixelBuffer, params: DitherParams): PixelBuffer {
  return ditherWith(input, params, null);
}

/** Full dither using the pruned matcher; otherwise the reference loop. */
export function ditherPruned(
  input: PixelBuffer,
  params: DitherParams,
  table: CandidateTable,
): PixelBuffer {
  return ditherWith(input, params, table);
}

/**
 * Shared loop; `variant` selects the matcher and a table overrides it
 * with the pruned scan. One loop body for every variant, so a timing
 * difference is the matcher and nothing else.
 */
type ScanVariant = 'hoisted' | 'unhoisted' | 'preM5D';

function ditherWith(
  input: PixelBuffer,
  params: DitherParams,
  table: CandidateTable | null,
  variant: ScanVariant = 'hoisted',
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const palRgb = paletteRgb(params.palette);
  const palLab = paletteLab(params.palette);
  const labScratch = new Float32Array(3);
  const work = new Float32Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    work[p * 3] = src[p * 4] ?? 0;
    work[p * 3 + 1] = src[p * 4 + 1] ?? 0;
    work[p * 3 + 2] = src[p * 4 + 2] ?? 0;
  }
  const diffuse = (x: number, y: number, er: number, eg: number, eb: number, w: number): void => {
    if (x < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    work[i] = (work[i] ?? 0) + er * w;
    work[i + 1] = (work[i + 1] ?? 0) + eg * w;
    work[i + 2] = (work[i + 2] ?? 0) + eb * w;
  };

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    const ahead = xStep;
    for (let x = xStart; x !== xEnd; x += xStep) {
      const wi = (y * width + x) * 3;
      const r = clamp255(work[wi] ?? 0);
      const g = clamp255(work[wi + 1] ?? 0);
      const b = clamp255(work[wi + 2] ?? 0);
      const idx =
        (table !== null
          ? nearestIndexPruned(r, g, b, palLab, labScratch, table)
          : variant === 'preM5D'
            ? nearestIndexPreM5D(r, g, b, palLab, labScratch)
            : variant === 'unhoisted'
              ? nearestIndexUnhoisted(r, g, b, palLab, labScratch)
              : nearestIndexReference(r, g, b, 'lab', palRgb, palLab, labScratch)) * 3;
      const pr = palRgb[idx] ?? 0;
      const pg = palRgb[idx + 1] ?? 0;
      const pb = palRgb[idx + 2] ?? 0;
      const oi = (y * width + x) * 4;
      out[oi] = pr;
      out[oi + 1] = pg;
      out[oi + 2] = pb;
      out[oi + 3] = src[oi + 3] ?? 255;
      const errR = r - pr;
      const errG = g - pg;
      const errB = b - pb;
      diffuse(x + ahead, y, errR, errG, errB, 7 / 16);
      diffuse(x - ahead, y + 1, errR, errG, errB, 3 / 16);
      diffuse(x, y + 1, errR, errG, errB, 5 / 16);
      diffuse(x + ahead, y + 1, errR, errG, errB, 1 / 16);
    }
  }
  return { width, height, data: out };
}

// ---------------------------------------------------------------------
// M5-PERF-13 — conversion candidates
// ---------------------------------------------------------------------

/** 256-entry channel→linear table (candidate B's enabling structure). */
export function linearTable(): Float64Array {
  const table = new Float64Array(256);
  for (let i = 0; i < 256; i++) table[i] = srgbChannelToLinear(i);
  return table;
}

/**
 * Candidate B — round the work value to an integer channel, then take
 * the transfer function from a 256-entry table. Kills all three `pow`
 * calls; the three `cbrt` calls remain. **Not** exact: rounding the
 * matching input by up to ½ LSB changes which palette entry wins for
 * some pixels, and error diffusion then propagates that change.
 */
export function srgbToLabRounded(
  r: number,
  g: number,
  b: number,
  table: Float64Array,
  out: Float32Array,
): void {
  const rl = table[Math.round(r)] ?? 0;
  const gl = table[Math.round(g)] ?? 0;
  const bl = table[Math.round(b)] ?? 0;
  const x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
  const z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl;
  out[0] = 116 * labF(y) - 16;
  out[1] = 500 * (labF(x / XN) - labF(y));
  out[2] = 200 * (labF(y) - labF(z / ZN));
}

/** Candidate B's full dither, for propagation measurement. */
export function ditherRoundedLab(input: PixelBuffer, params: DitherParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const palRgb = paletteRgb(params.palette);
  const palLab = paletteLab(params.palette);
  const table = linearTable();
  const lab = new Float32Array(3);
  const count = palRgb.length / 3;
  const work = new Float32Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    work[p * 3] = src[p * 4] ?? 0;
    work[p * 3 + 1] = src[p * 4 + 1] ?? 0;
    work[p * 3 + 2] = src[p * 4 + 2] ?? 0;
  }
  const diffuse = (x: number, y: number, er: number, eg: number, eb: number, w: number): void => {
    if (x < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    work[i] = (work[i] ?? 0) + er * w;
    work[i + 1] = (work[i + 1] ?? 0) + eg * w;
    work[i + 2] = (work[i + 2] ?? 0) + eb * w;
  };

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    const ahead = xStep;
    for (let x = xStart; x !== xEnd; x += xStep) {
      const wi = (y * width + x) * 3;
      const r = clamp255(work[wi] ?? 0);
      const g = clamp255(work[wi + 1] ?? 0);
      const b = clamp255(work[wi + 2] ?? 0);
      srgbToLabRounded(r, g, b, table, lab);
      const l0 = lab[0] ?? 0;
      const a0 = lab[1] ?? 0;
      const b0 = lab[2] ?? 0;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < count; i++) {
        const dl = l0 - (palLab[i * 3] ?? 0);
        const da = a0 - (palLab[i * 3 + 1] ?? 0);
        const db = b0 - (palLab[i * 3 + 2] ?? 0);
        const d = dl * dl + da * da + db * db;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      const idx = best * 3;
      const pr = palRgb[idx] ?? 0;
      const pg = palRgb[idx + 1] ?? 0;
      const pb = palRgb[idx + 2] ?? 0;
      const oi = (y * width + x) * 4;
      out[oi] = pr;
      out[oi + 1] = pg;
      out[oi + 2] = pb;
      out[oi + 3] = src[oi + 3] ?? 255;
      const errR = r - pr;
      const errG = g - pg;
      const errB = b - pb;
      diffuse(x + ahead, y, errR, errG, errB, 7 / 16);
      diffuse(x - ahead, y + 1, errR, errG, errB, 3 / 16);
      diffuse(x, y + 1, errR, errG, errB, 5 / 16);
      diffuse(x + ahead, y + 1, errR, errG, errB, 1 / 16);
    }
  }
  return { width, height, data: out };
}
