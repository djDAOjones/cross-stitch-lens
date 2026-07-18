/**
 * Minimal preview render: one engine pixel per canvas pixel, scaled
 * up losslessly by CSS `image-rendering: pixelated` (the M2 preview
 * replaces this with the OffscreenCanvas zoom/pan surface). Thread
 * colours are content, not UI: no filters, no opacity (UI-STANDARDS
 * → "Colour fidelity").
 */

import type { PixelBuffer } from '../core/types.ts';

/** Draw `buffer` 1:1 into `canvas` (resizes the canvas to match). */
export function renderPixelBuffer(
  canvas: HTMLCanvasElement,
  buffer: PixelBuffer,
): void {
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height),
    0,
    0,
  );
}
