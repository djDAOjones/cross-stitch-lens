/**
 * Image import (§3): file picker, drag-drop, and clipboard paste all
 * funnel to the same decode path. The file-list filtering is pure and
 * hermetically tested; decoding needs browser APIs and is verified in
 * the running app.
 */

import type { PixelBuffer } from '../core/types.ts';

/** The subset of File the filter needs (testable with plain fakes). */
interface FileLike {
  type: string;
}

/**
 * Keep only image files from a FileList/DataTransfer.files-shaped
 * list. Both drop events and paste events expose their payload this
 * way, so one filter serves all three import routes.
 */
export function imageFiles<T extends FileLike>(files: ArrayLike<T>): T[] {
  const result: T[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && file.type.startsWith('image/')) result.push(file);
  }
  return result;
}

/**
 * Decode an image blob to a PixelBuffer (RGBA, 0–255 sRGB) via
 * createImageBitmap + OffscreenCanvas. Browser-only; throws on
 * undecodable input (callers surface the error to the user).
 */
export async function decodeImageBlob(blob: Blob): Promise<PixelBuffer> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) throw new Error('2d canvas context unavailable');
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: image.width, height: image.height, data: image.data };
  } finally {
    bitmap.close();
  }
}
