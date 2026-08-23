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
import {
  createToneMatcher,
  toneEngaged,
  toneNearest,
  type ToneConfig,
} from '../color/tone.ts';
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
  /**
   * Tone mode (TONE-01): when engaged, matching runs in the tone
   * space (curved L, w·a, w·b). A caller-supplied `lut` must have
   * been built for the same tone config — the worker's cache keys on
   * `toneFingerprint` (D46) to guarantee it. Absent or disengaged,
   * this stage is byte-identical to its pre-TONE-01 self.
   */
  tone?: ToneConfig;
}

/**
 * Map `input` to palette colours per `params`; returns a new buffer
 * carrying the palette-index sidecar.
 *
 * The sidecar is free here — the index is what the loop already
 * computes — and it is the only way a downstream consumer can name the
 * thread that was chosen once two brands can hold the same RGB
 * (M7-BRAND-01).
 */
function reduceTs(input: PixelBuffer, params: ReduceParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height);
  const palRgb = paletteRgb(params.palette);
  const usesLab = params.metric === 'lab';

  const tone = toneEngaged(params.metric, params.tone) ? params.tone : undefined;

  if (params.path === 'lut') {
    const lut = params.lut ?? buildLut(params.palette, params.metric, tone);
    for (let i = 0, cell = 0; i < src.length; i += 4, cell++) {
      const entry = lut[lutKey(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0)] ?? 0;
      indices[cell] = entry;
      const idx = entry * 3;
      out[i] = palRgb[idx] ?? 0;
      out[i + 1] = palRgb[idx + 1] ?? 0;
      out[i + 2] = palRgb[idx + 2] ?? 0;
      out[i + 3] = src[i + 3] ?? 255;
    }
  } else if (tone !== undefined) {
    // Tone-space exact matching: the full scan over the scaled
    // palette (or the ladder's band lookup). The pruning table is a
    // plain-Lab structure, so it does not apply here.
    const matcher = createToneMatcher(params.palette, tone);
    const labScratch = new Float32Array(3);
    for (let i = 0, cell = 0; i < src.length; i += 4, cell++) {
      const entry = toneNearest(
        matcher,
        src[i] ?? 0,
        src[i + 1] ?? 0,
        src[i + 2] ?? 0,
        labScratch,
      );
      indices[cell] = entry;
      const idx = entry * 3;
      out[i] = palRgb[idx] ?? 0;
      out[i + 1] = palRgb[idx + 1] ?? 0;
      out[i + 2] = palRgb[idx + 2] ?? 0;
      out[i + 3] = src[i + 3] ?? 255;
    }
  } else {
    const palLab = usesLab ? paletteLab(params.palette) : new Float32Array(0);
    const labScratch = new Float32Array(3);
    for (let i = 0, cell = 0; i < src.length; i += 4, cell++) {
      const entry = nearestIndex(
        src[i] ?? 0,
        src[i + 1] ?? 0,
        src[i + 2] ?? 0,
        params.metric,
        palRgb,
        palLab,
        labScratch,
      );
      indices[cell] = entry;
      const idx = entry * 3;
      out[i] = palRgb[idx] ?? 0;
      out[i + 1] = palRgb[idx + 1] ?? 0;
      out[i + 2] = palRgb[idx + 2] ?? 0;
      out[i + 3] = src[i + 3] ?? 255;
    }
  }
  return { width, height, data: out, indices };
}

/** The reduce stage (TS reference; WASM/WebGPU arrive post-profile). */
export const reduceStage: Stage<ReduceParams> = {
  name: 'reduce',
  backends: { ts: reduceTs },
};
