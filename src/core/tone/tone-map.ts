/**
 * CREATIVE-01 prototype — the tone mapper: weighted matching, ladder
 * mode over cuts, and the two dither error spaces under measurement.
 *
 * The central prototype question (ticket → "Slice-1 decisions of
 * record"): dither must diffuse error in the weighted space or hue
 * error leaks into lightness. Three variants:
 *
 * - 'none'           hard mapping, no error feedback.
 * - 'srgb-error'     production-shaped: match in the weighted space
 *                    but diffuse the full sRGB error — what shipping
 *                    the weight into today's dither stage otherwise
 *                    unchanged would do.
 * - 'weighted-error' work and diffuse in the scaled space (curved L,
 *                    w·a, w·b): the error the metric sees is the error
 *                    diffused; at t = 1 only lightness error feeds
 *                    back.
 *
 * Floyd–Steinberg only — the kernel question is orthogonal to the
 * error-space question and M8 already answered it. Alpha-0 cells skip
 * exactly as production dither does (D9/D49): no error crosses an
 * empty-stitch boundary. Matching reads clamped values while the work
 * buffer stays unclamped, mirroring `diffuseTs`.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket.
 */

import { srgbToLab } from '../color/convert.ts';
import { paletteLab, paletteRgb } from '../palette.ts';
import { bandForL } from './tone-bands.ts';
import { applyCurve, isIdentityCurve, type ToneCurve } from './tone-curve.ts';
import { chromaScale, nearestScaled, scaledPaletteLab } from './tone-metric.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../types.ts';

/** The dither variants under measurement. */
export type ToneDither = 'none' | 'srgb-error' | 'weighted-error';

/** Parameters for {@link toneMap}. */
export interface ToneMapParams {
  palette: Palette;
  /** The slider: 0 = colour (ΔE76 exactly), 1 = tone (L* alone). */
  tone: number;
  /** Picture-lightness curve; null/identity = untouched. */
  curve?: ToneCurve | null;
  /**
   * Ladder mode when non-null: ascending curved-L* cuts, length
   * `order.length − 1`; band k maps to rung `order[k]`.
   */
  cuts?: readonly number[] | null;
  /** Rung order for ladder mode (from `ladderOrder`); ignored without cuts. */
  order?: Uint16Array | null;
  dither: ToneDither;
  serpentine: boolean;
  /** Diffused-error fraction, 0–1; default 1. */
  strength?: number;
}

/** Floyd–Steinberg taps for a rightward scan: [dx, dy, weight]. */
const FS_TAPS: readonly (readonly [number, number, number])[] = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
];

function clampRange(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Map a buffer through the tone metric; indices sidecar included. */
export function toneMap(input: PixelBuffer, params: ToneMapParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);

  const w = chromaScale(params.tone);
  const strength = params.strength ?? 1;
  const curve =
    params.curve !== undefined && params.curve !== null && !isIdentityCurve(params.curve)
      ? params.curve
      : null;
  const cuts = params.cuts ?? null;
  const order = params.order ?? null;

  const palRgb = paletteRgb(params.palette);
  const palLabScaled = scaledPaletteLab(params.palette, w);
  const palLab = paletteLab(params.palette);
  const scratch = new Float32Array(3);
  const aClamp = 128 * w;

  const match = (l: number, a: number, b: number): number =>
    cuts !== null && order !== null
      ? (order[bandForL(l, cuts)] ?? 0)
      : nearestScaled(l, a, b, palLabScaled);

  if (params.dither === 'srgb-error') {
    // Production-shaped: float sRGB working copy, full-colour error.
    const work = new Float32Array(width * height * 3);
    for (let p = 0; p < width * height; p++) {
      work[p * 3] = src[p * 4] ?? 0;
      work[p * 3 + 1] = src[p * 4 + 1] ?? 0;
      work[p * 3 + 2] = src[p * 4 + 2] ?? 0;
    }
    for (let y = 0; y < height; y++) {
      const rightward = !params.serpentine || y % 2 === 0;
      const xStart = rightward ? 0 : width - 1;
      const xEnd = rightward ? width : -1;
      const xStep = rightward ? 1 : -1;
      for (let x = xStart; x !== xEnd; x += xStep) {
        const oi = (y * width + x) * 4;
        if ((src[oi + 3] ?? 255) === 0) continue;
        const wi = (y * width + x) * 3;
        const r = clampRange(work[wi] ?? 0, 0, 255);
        const g = clampRange(work[wi + 1] ?? 0, 0, 255);
        const b = clampRange(work[wi + 2] ?? 0, 0, 255);
        srgbToLab(r, g, b, scratch, 0);
        const ql = curve === null ? (scratch[0] ?? 0) : applyCurve(curve, scratch[0] ?? 0);
        const entry = match(ql, (scratch[1] ?? 0) * w, (scratch[2] ?? 0) * w);
        indices[y * width + x] = entry;
        const pr = palRgb[entry * 3] ?? 0;
        const pg = palRgb[entry * 3 + 1] ?? 0;
        const pb = palRgb[entry * 3 + 2] ?? 0;
        out[oi] = pr;
        out[oi + 1] = pg;
        out[oi + 2] = pb;
        out[oi + 3] = src[oi + 3] ?? 255;
        const errR = (r - pr) * strength;
        const errG = (g - pg) * strength;
        const errB = (b - pb) * strength;
        for (const [dx, dy, tw] of FS_TAPS) {
          const tx = x + (rightward ? dx : -dx);
          const ty = y + dy;
          if (tx < 0 || tx >= width || ty >= height) continue;
          const ti = (ty * width + tx) * 3;
          work[ti] = (work[ti] ?? 0) + errR * tw;
          work[ti + 1] = (work[ti + 1] ?? 0) + errG * tw;
          work[ti + 2] = (work[ti + 2] ?? 0) + errB * tw;
        }
      }
    }
    return { width, height, data: out, indices };
  }

  // Scaled-Lab path: 'none' and 'weighted-error'. The work buffer
  // holds (curved L, w·a, w·b), so diffusion — when on — happens in
  // exactly the space the metric measures.
  const diffuse = params.dither === 'weighted-error';
  const work = new Float32Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    srgbToLab(src[p * 4] ?? 0, src[p * 4 + 1] ?? 0, src[p * 4 + 2] ?? 0, scratch, 0);
    const l = scratch[0] ?? 0;
    work[p * 3] = curve === null ? l : applyCurve(curve, l);
    work[p * 3 + 1] = (scratch[1] ?? 0) * w;
    work[p * 3 + 2] = (scratch[2] ?? 0) * w;
  }
  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    for (let x = xStart; x !== xEnd; x += xStep) {
      const oi = (y * width + x) * 4;
      if ((src[oi + 3] ?? 255) === 0) continue;
      const wi = (y * width + x) * 3;
      const ql = clampRange(work[wi] ?? 0, 0, 100);
      const qa = clampRange(work[wi + 1] ?? 0, -aClamp, aClamp);
      const qb = clampRange(work[wi + 2] ?? 0, -aClamp, aClamp);
      const entry = match(ql, qa, qb);
      indices[y * width + x] = entry;
      out[oi] = palRgb[entry * 3] ?? 0;
      out[oi + 1] = palRgb[entry * 3 + 1] ?? 0;
      out[oi + 2] = palRgb[entry * 3 + 2] ?? 0;
      out[oi + 3] = src[oi + 3] ?? 255;
      if (!diffuse) continue;
      // Palette L is never curved; the error is measured in the same
      // curved-scaled space the query lives in.
      const errL = (ql - (palLab[entry * 3] ?? 0)) * strength;
      const errA = (qa - (palLab[entry * 3 + 1] ?? 0) * w) * strength;
      const errB = (qb - (palLab[entry * 3 + 2] ?? 0) * w) * strength;
      for (const [dx, dy, tw] of FS_TAPS) {
        const tx = x + (rightward ? dx : -dx);
        const ty = y + dy;
        if (tx < 0 || tx >= width || ty >= height) continue;
        const ti = (ty * width + tx) * 3;
        work[ti] = (work[ti] ?? 0) + errL * tw;
        work[ti + 1] = (work[ti + 1] ?? 0) + errA * tw;
        work[ti + 2] = (work[ti + 2] ?? 0) + errB * tw;
      }
    }
  }
  return { width, height, data: out, indices };
}
