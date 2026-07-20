/**
 * LUT-based palette matching: 15-bit quantised RGB (32,768 bins) →
 * nearest palette index. Built once per palette/metric change; the
 * per-pixel cost of reduction then collapses to an array lookup
 * (architecture.md → "Colour reduction strategy").
 */

import { srgbToLab } from './convert.ts';
import type { ColorMetric } from './metrics.ts';
import { paletteLab, paletteRgb } from '../palette.ts';
import type { Palette } from '../types.ts';

/** Number of 15-bit RGB bins (2^15). */
export const LUT_SIZE = 32768;

/** 8-bit channel → 5-bit bin index. */
export function quantizeChannel(channel: number): number {
  return channel >> 3;
}

/**
 * 5-bit bin index → representative 8-bit channel via bit replication
 * ((v << 3) | (v >> 2)): hits both 0 and 255 exactly, so pure black
 * and white map to themselves.
 */
export function binToChannel(bin: number): number {
  return (bin << 3) | (bin >> 2);
}

/** Pack three 8-bit channels into a 15-bit LUT key. */
export function lutKey(r: number, g: number, b: number): number {
  return (quantizeChannel(r) << 10) | (quantizeChannel(g) << 5) | quantizeChannel(b);
}

/**
 * Exact nearest palette index for one sRGB colour (no quantisation).
 * `labScratch` is caller-provided to keep loops allocation-free.
 *
 * The two distance expressions below are deliberately inlined copies of
 * `deltaE76Sq` / `euclideanRgbSq` in `metrics.ts`, which remains the
 * canonical statement of each metric. Calling them here reintroduced
 * the loop-invariant scratch read this function exists to avoid, so
 * `tests/color-convert.test.ts` asserts the inlined forms agree with
 * the metric functions exactly — if they ever drift, that test fails.
 */
export function nearestIndex(
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
    // Query Lab hoisted into locals (M5-PERF-22). `deltaE76Sq(labScratch,
    // 0, …)` re-read the same three Float32Array slots on every palette
    // iteration — loop-invariant work that V8 cannot hoist itself,
    // because it cannot prove the callee does not alias the array. At
    // 533 colours that is 1,599 redundant typed-array reads per pixel,
    // and it was the term M5B's palette-size model could not see.
    // The widening f32→f64 on read is identical either way, so the
    // comparison sequence — and therefore the first-minimum tie-break —
    // is unchanged.
    const ql = labScratch[0] ?? 0;
    const qa = labScratch[1] ?? 0;
    const qb = labScratch[2] ?? 0;
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

/**
 * Build the full 15-bit LUT for a palette + metric: LUT[key] = index
 * of the nearest palette entry to the bin's representative colour.
 * O(32768 × palette size); runs in the worker in production.
 */
export function buildLut(palette: Palette, metric: ColorMetric): Uint16Array {
  const palRgb = paletteRgb(palette);
  const palLab = metric === 'lab' ? paletteLab(palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);
  const lut = new Uint16Array(LUT_SIZE);
  for (let rBin = 0; rBin < 32; rBin++) {
    const r = binToChannel(rBin);
    for (let gBin = 0; gBin < 32; gBin++) {
      const g = binToChannel(gBin);
      for (let bBin = 0; bBin < 32; bBin++) {
        const key = (rBin << 10) | (gBin << 5) | bBin;
        lut[key] = nearestIndex(
          r,
          g,
          binToChannel(bBin),
          metric,
          palRgb,
          palLab,
          labScratch,
        );
      }
    }
  }
  return lut;
}
