/**
 * Resize stage: map the source image onto the stitch grid
 * (requirements §4). The output buffer is ALWAYS grid-sized; cells
 * the source does not cover are transparent RGBA(0,0,0,0) — the
 * "empty stitch" (D9: alpha below 50% renders as fabric).
 *
 * The TS reference resamples by exact area averaging over the source
 * rect of each output cell, in premultiplied alpha (so transparent
 * source pixels don't bleed colour into edges). Deterministic and
 * pure — the GPU drawImage path from the performance budget arrives
 * later as an accelerated backend behind this same contract.
 */

import type { PixelBuffer, Stage } from '../types.ts';

/** Grid bounds (requirements §4, provisional technical range). */
export const MIN_GRID = 1;
export const MAX_GRID = 1024;

/**
 * How the source maps to the grid (§4 "Stretching, containing or
 * covering", "Cropping or fitting"):
 *
 * - 'stretch' — fill the grid exactly, ignoring aspect ratio.
 * - 'contain' — preserve aspect, whole source visible, letterboxed
 *   with empty cells.
 * - 'cover' — preserve aspect, fill the grid, crop the overflow.
 * - 'fit' — 'contain' that never enlarges (CSS scale-down): a source
 *   smaller than the grid is centred unscaled.
 */
export type ResizeMode = 'stretch' | 'contain' | 'cover' | 'fit';

/** Parameters for {@link resizeStage}; the UI + project-file shape. */
export interface ResizeParams {
  /** Grid width in stitches, integer 1–1024. */
  width: number;
  /** Grid height in stitches, integer 1–1024. */
  height: number;
  mode: ResizeMode;
}

function assertGridDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < MIN_GRID || value > MAX_GRID) {
    throw new RangeError(
      `${name} must be an integer in ${String(MIN_GRID)}–${String(MAX_GRID)}, got ${String(value)}`,
    );
  }
}

/**
 * Area-average the source rect [sx0,sx1)×[sy0,sy1) (float source
 * coordinates) in premultiplied alpha, writing RGBA to `out` at
 * `offset`. The rect is assumed to lie within the source bounds.
 */
function sampleArea(
  src: Uint8ClampedArray,
  srcWidth: number,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
  out: Uint8ClampedArray,
  offset: number,
): void {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let area = 0;

  const yFirst = Math.floor(sy0);
  const yLast = Math.ceil(sy1);
  const xFirst = Math.floor(sx0);
  const xLast = Math.ceil(sx1);

  for (let y = yFirst; y < yLast; y++) {
    const hCov = Math.min(sy1, y + 1) - Math.max(sy0, y);
    if (hCov <= 0) continue;
    for (let x = xFirst; x < xLast; x++) {
      const wCov = Math.min(sx1, x + 1) - Math.max(sx0, x);
      if (wCov <= 0) continue;
      const cov = wCov * hCov;
      const i = (y * srcWidth + x) * 4;
      const alpha = src[i + 3] ?? 0;
      // Premultiply: colour contributes in proportion to coverage×alpha.
      r += (src[i] ?? 0) * alpha * cov;
      g += (src[i + 1] ?? 0) * alpha * cov;
      b += (src[i + 2] ?? 0) * alpha * cov;
      a += alpha * cov;
      area += cov;
    }
  }

  if (area <= 0 || a <= 0) return; // fully transparent — leave empty
  // Unpremultiply; Uint8ClampedArray rounds on store.
  out[offset] = r / a;
  out[offset + 1] = g / a;
  out[offset + 2] = b / a;
  out[offset + 3] = a / area;
}

function resizeTs(input: PixelBuffer, params: ResizeParams): PixelBuffer {
  assertGridDimension(params.width, 'width');
  assertGridDimension(params.height, 'height');
  const gw = params.width;
  const gh = params.height;
  const sw = input.width;
  const sh = input.height;
  const out = new Uint8ClampedArray(gw * gh * 4); // zero-init = empty cells

  // Destination region within the grid and the source rect it shows.
  let destX = 0;
  let destY = 0;
  let destW = gw;
  let destH = gh;
  let srcX0 = 0;
  let srcY0 = 0;
  let srcX1 = sw;
  let srcY1 = sh;

  if (params.mode === 'contain' || params.mode === 'fit') {
    let scale = Math.min(gw / sw, gh / sh);
    if (params.mode === 'fit') scale = Math.min(scale, 1);
    destW = Math.max(1, Math.round(sw * scale));
    destH = Math.max(1, Math.round(sh * scale));
    destX = Math.floor((gw - destW) / 2);
    destY = Math.floor((gh - destH) / 2);
  } else if (params.mode === 'cover') {
    const scale = Math.max(gw / sw, gh / sh);
    const visW = gw / scale;
    const visH = gh / scale;
    srcX0 = (sw - visW) / 2;
    srcY0 = (sh - visH) / 2;
    srcX1 = srcX0 + visW;
    srcY1 = srcY0 + visH;
  }
  // 'stretch' keeps the defaults: full source → full grid.

  const srcW = srcX1 - srcX0;
  const srcH = srcY1 - srcY0;
  for (let dy = 0; dy < destH; dy++) {
    const sy0 = srcY0 + (dy / destH) * srcH;
    const sy1 = srcY0 + ((dy + 1) / destH) * srcH;
    for (let dx = 0; dx < destW; dx++) {
      const sx0 = srcX0 + (dx / destW) * srcW;
      const sx1 = srcX0 + ((dx + 1) / destW) * srcW;
      const offset = ((destY + dy) * gw + (destX + dx)) * 4;
      sampleArea(input.data, sw, sx0, sy0, sx1, sy1, out, offset);
    }
  }

  return { width: gw, height: gh, data: out };
}

/** The resize stage (TS reference; GPU-backed backend post-profile). */
export const resizeStage: Stage<ResizeParams> = {
  name: 'resize',
  backends: { ts: resizeTs },
};
