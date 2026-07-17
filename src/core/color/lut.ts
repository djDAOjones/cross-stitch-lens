/**
 * LUT-based palette matching: 15-bit quantised RGB (32,768 bins) →
 * nearest palette index. Built once per palette/metric change; the
 * per-pixel cost of reduction then collapses to an array lookup
 * (architecture.md → "Colour reduction strategy").
 */

import { srgbToLab } from './convert.ts';
import { deltaE76Sq, euclideanRgbSq, type ColorMetric } from './metrics.ts';
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
    for (let i = 0; i < count; i++) {
      const d = deltaE76Sq(labScratch, 0, palLab, i * 3);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      const d = euclideanRgbSq(
        r,
        g,
        b,
        palRgb[i * 3] ?? 0,
        palRgb[i * 3 + 1] ?? 0,
        palRgb[i * 3 + 2] ?? 0,
      );
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
