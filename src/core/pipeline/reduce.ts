/**
 * Reduce stage: map every pixel to its nearest thread colour in the
 * active palette. Two paths share one contract:
 *
 * - LUT path (default): 15-bit quantised lookup — fast, used for
 *   preview and plain reduction.
 * - Exact path: full-precision nearest-neighbour per pixel — used
 *   when exactness matters (the dither stage's error terms, exports
 *   at full quality).
 *
 * Alpha passes through untouched; palette matching is RGB-only.
 */

import { buildLut, lutKey, nearestIndex } from '../color/lut.ts';
import type { ColorMetric } from '../color/metrics.ts';
import { paletteLab, paletteRgb } from '../palette.ts';
import type { Palette, PixelBuffer, Stage } from '../types.ts';

/** Parameters for {@link reduceStage}; the UI + project-file shape. */
export interface ReduceParams {
  palette: Palette;
  /** 'lab' (CIELAB ΔE76, default UX choice) or 'rgb' (Euclidean). */
  metric: ColorMetric;
  /**
   * 'lut' quantises to 15-bit before matching; 'exact' matches at
   * full precision. Callers that already hold a LUT for this
   * palette+metric may pass it to skip the rebuild.
   */
  path: 'lut' | 'exact';
  lut?: Uint16Array;
}

/** Map `input` to palette colours per `params`; returns a new buffer. */
function reduceTs(input: PixelBuffer, params: ReduceParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const palRgb = paletteRgb(params.palette);
  const usesLab = params.metric === 'lab';

  if (params.path === 'lut') {
    const lut = params.lut ?? buildLut(params.palette, params.metric);
    for (let i = 0; i < src.length; i += 4) {
      const idx =
        (lut[lutKey(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0)] ?? 0) * 3;
      out[i] = palRgb[idx] ?? 0;
      out[i + 1] = palRgb[idx + 1] ?? 0;
      out[i + 2] = palRgb[idx + 2] ?? 0;
      out[i + 3] = src[i + 3] ?? 255;
    }
  } else {
    const palLab = usesLab ? paletteLab(params.palette) : new Float32Array(0);
    const labScratch = new Float32Array(3);
    for (let i = 0; i < src.length; i += 4) {
      const idx =
        nearestIndex(
          src[i] ?? 0,
          src[i + 1] ?? 0,
          src[i + 2] ?? 0,
          params.metric,
          palRgb,
          palLab,
          labScratch,
        ) * 3;
      out[i] = palRgb[idx] ?? 0;
      out[i + 1] = palRgb[idx + 1] ?? 0;
      out[i + 2] = palRgb[idx + 2] ?? 0;
      out[i + 3] = src[i + 3] ?? 255;
    }
  }
  return { width, height, data: out };
}

/** The reduce stage (TS reference; WASM/WebGPU arrive post-profile). */
export const reduceStage: Stage<ReduceParams> = {
  name: 'reduce',
  backends: { ts: reduceTs },
};
