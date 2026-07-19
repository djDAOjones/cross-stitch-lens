/**
 * Dirty-frame detection (§22, M4): hash a 64×64 downsample of the
 * crop region and skip processing when it matches the previous frame
 * (architecture.md → "Worker & scheduling"). The sample readback is
 * 16 KB regardless of source size, so idle frames cost ~nothing. The
 * hash and signature are pure and hermetically tested; the sampler
 * needs a browser and is verified in the running app.
 */

import type { CropRect } from './crop.ts';

/** Downsample edge length in pixels. */
export const DIRTY_SAMPLE = 64;

/** FNV-1a 32-bit over raw bytes — cheap, deterministic, good enough
 *  for change detection (a collision only delays one update). */
export function hashPixels(data: ArrayLike<number>): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i] ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Identity of a sampled frame: pixel hash plus the region it was
 * sampled from, so moving or resizing the crop always reads as a
 * change even over static content.
 */
export function frameSignature(hash: number, region: CropRect | null): string {
  if (region === null) return `${String(hash)}:full`;
  return `${String(hash)}:${String(region.x)},${String(region.y)},${String(region.width)},${String(region.height)}`;
}

// One reusable sampling surface — per-frame allocation would defeat
// the point of a cheap idle path.
let sampleCanvas: OffscreenCanvas | null = null;
let sampleCtx: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Downsample the video (or a region of it) to DIRTY_SAMPLE² pixels
 * and return the raw RGBA bytes for hashing. Browser-only.
 */
export function sampleVideo(video: HTMLVideoElement, region?: CropRect): Uint8ClampedArray {
  if (video.videoWidth === 0) throw new Error('no frame available yet');
  if (sampleCanvas === null || sampleCtx === null) {
    sampleCanvas = new OffscreenCanvas(DIRTY_SAMPLE, DIRTY_SAMPLE);
    sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (sampleCtx === null) throw new Error('2d canvas context unavailable');
  }
  const src = region ?? { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
  sampleCtx.drawImage(
    video,
    src.x,
    src.y,
    src.width,
    src.height,
    0,
    0,
    DIRTY_SAMPLE,
    DIRTY_SAMPLE,
  );
  return sampleCtx.getImageData(0, 0, DIRTY_SAMPLE, DIRTY_SAMPLE).data;
}
