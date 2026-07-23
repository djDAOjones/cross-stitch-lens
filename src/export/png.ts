/**
 * Clean PNG export (§13 MVP subset): 1 px/stitch or integer
 * nearest-neighbour enlargement, transparent or solid background.
 *
 * The buffer transforms are pure and hermetically tested; only
 * `encodePngBlob` and `downloadBlob` touch browser APIs. Export
 * buffers come from a full-quality pipeline re-run (never the
 * preview surface), so preview quality cannot leak in (AGENTS.md
 * invariant).
 */

import type { PixelBuffer } from '../core/types.ts';

/**
 * Browsers reject canvases beyond ~16384 px per side; clamping the
 * scale here turns an impossible export into the largest possible one.
 */
export const MAX_OUTPUT_SIDE = 16384;

/** Largest integer scale whose output still fits a canvas (≥ 1). */
export function maxScaleFor(width: number, height: number): number {
  return Math.max(1, Math.floor(MAX_OUTPUT_SIDE / Math.max(width, height, 1)));
}

/**
 * Enlarge by an integer factor, replicating each stitch as a k×k
 * pixel block (nearest neighbour by construction — no resampler
 * involved). Factor 1 returns a copy; the input is never mutated.
 */
export function scaleNearest(buffer: PixelBuffer, factor: number): PixelBuffer {
  const k = Math.max(1, Math.floor(factor));
  const { width, height, data } = buffer;
  const outWidth = width * k;
  const out = new Uint8ClampedArray(outWidth * height * k * 4);
  for (let y = 0; y < height; y++) {
    // Replicate one source row into the first output row of the band,
    // then copy that row down the remaining k−1 rows (row-level
    // copyWithin beats per-pixel writes).
    const bandTop = y * k * outWidth * 4;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      for (let dx = 0; dx < k; dx++) {
        const di = bandTop + (x * k + dx) * 4;
        out[di] = data[si] ?? 0;
        out[di + 1] = data[si + 1] ?? 0;
        out[di + 2] = data[si + 2] ?? 0;
        out[di + 3] = data[si + 3] ?? 0;
      }
    }
    for (let dy = 1; dy < k; dy++) {
      out.copyWithin(bandTop + dy * outWidth * 4, bandTop, bandTop + outWidth * 4);
    }
  }
  return { width: outWidth, height: height * k, data: out };
}

/** Parse `#rrggbb` to 0–255 sRGB [r, g, b]. Throws on other shapes. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (match === null) throw new Error(`not a #rrggbb colour: ${hex}`);
  const value = parseInt(match[1] ?? '0', 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/**
 * Composite over an opaque background colour (straight-alpha "over").
 * Output alpha is always 255; the input is never mutated. Use for the
 * solid-background export; skip entirely for the transparent one.
 */
export function flattenBackground(buffer: PixelBuffer, hex: string): PixelBuffer {
  const [br, bg, bb] = hexToRgb(hex);
  const src = buffer.data;
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = (src[i + 3] ?? 0) / 255;
    out[i] = (src[i] ?? 0) * a + br * (1 - a);
    out[i + 1] = (src[i + 1] ?? 0) * a + bg * (1 - a);
    out[i + 2] = (src[i + 2] ?? 0) * a + bb * (1 - a);
    out[i + 3] = 255;
  }
  return { width: buffer.width, height: buffer.height, data: out };
}

/** Download name: design size in stitches plus the scale, e.g. `design-200x200@4x.png`. */
export function pngFilename(width: number, height: number, scale: number): string {
  const suffix = scale > 1 ? `@${scale}x` : '';
  return `design-${width}x${height}${suffix}.png`;
}

/**
 * The user-facing refusal for an output beyond the canvas limit, or
 * null when the size is fine. The UI clamps its own inputs
 * (`maxCellPx`, the scale picker), but the module boundary must hold
 * on its own: past the limit the browser silently zeroes the canvas
 * and the encode dies with "size of OffscreenCanvas is zero"
 * (M13-DEF-02) — an answer no user can act on.
 */
export function oversizeMessage(width: number, height: number): string | null {
  if (width <= MAX_OUTPUT_SIDE && height <= MAX_OUTPUT_SIDE) return null;
  return (
    `Export too large: ${String(width)} × ${String(height)} px is beyond the ` +
    `${String(MAX_OUTPUT_SIDE)} px canvas limit — reduce the enlargement scale or cell size.`
  );
}

/** Encode a buffer as a PNG blob via OffscreenCanvas (browser-only). */
export async function encodePngBlob(buffer: PixelBuffer): Promise<Blob> {
  const refusal = oversizeMessage(buffer.width, buffer.height);
  if (refusal !== null) throw new Error(refusal);
  const canvas = new OffscreenCanvas(buffer.width, buffer.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2d canvas context unavailable');
  // Cast, don't copy: ImageData insists on a non-shared backing
  // buffer, which every PixelBuffer already has; a defensive copy here
  // would double peak memory on large enlargements.
  const data = buffer.data as Uint8ClampedArray<ArrayBuffer>;
  ctx.putImageData(new ImageData(data, buffer.width, buffer.height), 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

/** Trigger a user-visible download of a blob (browser-only). */
export function downloadBlob(doc: Document, blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
