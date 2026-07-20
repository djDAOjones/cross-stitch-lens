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

/**
 * Longest a genuinely-changed source may stay invisible, in ms.
 *
 * The 64×64 downsample averages ~362 source pixels per sample cell at
 * a realistic Retina crop, so an edit whose contribution rounds away
 * inside its cell produces a byte-identical sample and an identical
 * hash. Measured misses: a 1 px full-contrast edit, a 1 px Δ8 edit, a
 * 4×4 Δ8 edit. **No hash precision fixes this** — the information is
 * destroyed by the averaging, before the hash sees it — and sampling
 * finely enough to guarantee detection costs the full readback the
 * skip exists to avoid.
 *
 * So the gate bounds the damage instead: an unchanged-looking source
 * is re-processed anyway once this interval elapses, turning "a small
 * stroke never appears" into "it appears within 2 s". Idle cost is one
 * pipeline run per interval (≈ 58 ms at 200²), against a 16 KB
 * readback plus a 0.03 ms hash on every other tick.
 */
export const DIRTY_MAX_STALE_MS = 2000;

/**
 * Decides whether a sampled frame is worth processing: yes when the
 * signature changed, and yes anyway once `maxStaleMs` has passed since
 * the last processed frame. Pure state machine — the sampler that
 * feeds it needs a browser, this does not.
 */
export class DirtyGate {
  private lastSignature: string | null = null;
  private lastProcessedAt: number | null = null;
  private skipped = 0;
  private forced = 0;

  constructor(private readonly maxStaleMs: number = DIRTY_MAX_STALE_MS) {}

  /**
   * True = process this frame. `now` is a wall-clock ms reading
   * (`Date.now()` / `performance.now()`), injected so the policy stays
   * testable.
   */
  shouldProcess(signature: string, now: number): boolean {
    const changed = signature !== this.lastSignature;
    const stale =
      this.lastProcessedAt === null || now - this.lastProcessedAt >= this.maxStaleMs;
    if (!changed && !stale) {
      this.skipped++;
      return false;
    }
    if (!changed) this.forced++;
    this.markProcessed(signature, now);
    return true;
  }

  /** Record a frame processed outside the gate (a manual grab). */
  markProcessed(signature: string, now: number): void {
    this.lastSignature = signature;
    this.lastProcessedAt = now;
  }

  /**
   * Forget the last frame so the next tick always processes — used when
   * the *output* would differ for identical input (a draft-quality
   * switch), and when a session ends.
   */
  reset(): void {
    this.lastSignature = null;
    this.lastProcessedAt = null;
  }

  /** Frames skipped as unchanged (diagnostics). */
  get skippedCount(): number {
    return this.skipped;
  }

  /** Frames processed only because the source went stale (diagnostics). */
  get forcedCount(): number {
    return this.forced;
  }
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
