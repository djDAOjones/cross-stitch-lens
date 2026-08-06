/**
 * Screen/window capture session (§3, M4): wraps `getDisplayMedia`
 * behind a small session object — start, one-shot frame grab, stop,
 * and external-end notification. Capture stays on the main thread
 * (architecture: "Main thread: capture + UI only"). The error and
 * label mapping is pure and hermetically tested; the session itself
 * needs browser APIs and is verified in the running app.
 */

import type { PixelBuffer } from '../core/types.ts';
import { clampRect, type CropRect } from './crop.ts';

/**
 * Map a `getDisplayMedia` failure to a human-readable status message
 * (UI-STANDARDS: errors say what happened and what to do next).
 * Declining the browser prompt is a normal outcome, not a fault.
 */
export function captureErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Screen capture was declined — nothing was shared. Start capture again to retry.';
      case 'NotFoundError':
        return 'No screen or window was available to capture.';
      case 'NotSupportedError':
        return 'Screen capture is not supported in this browser.';
      default:
        return `Screen capture failed (${error.message}).`;
    }
  }
  return `Screen capture failed (${String(error)}).`;
}

/**
 * Human-friendly name for the shared surface. Track labels are often
 * internal identifiers — `web-contents-media-stream://5`, base64-ish
 * tokens, `screen:1:0` — rather than names. The filter is allow-list
 * shaped (M14-IMPL-04, audit A7): a label is shown only when it looks
 * like something a human named; anything else falls back to the
 * generic phrase, because status copy must never print a machine
 * token as if it meant something.
 */
export function displayLabel(trackLabel: string): string {
  const label = trackLabel.trim();
  if (label === '' || label.length > 60) return 'the shared screen';
  // Deny the known machine shapes outright.
  if (label.includes('://') || label.includes('=')) return 'the shared screen';
  // Human names have word structure: a space, or a short single word
  // without long unbroken alphanumeric runs (tokens read as one run).
  if (!label.includes(' ') && /[A-Za-z0-9+/_-]{16,}/.test(label)) {
    return 'the shared screen';
  }
  return label;
}

/** A live capture session. Obtain via {@link startCapture}. */
export interface CaptureSession {
  /** Human-friendly name of the shared surface. */
  readonly label: string;
  /** The live decoding element — usable as an on-page thumbnail. */
  readonly video: HTMLVideoElement;
  /**
   * Grab the current frame (or a region of it, clamped to the frame)
   * as a PixelBuffer (RGBA sRGB).
   */
  grabFrame(region?: CropRect): Promise<PixelBuffer>;
  /** Stop sharing and release the stream. Idempotent. */
  stop(): void;
  /** Called once if sharing ends outside the app (browser stop UI). */
  onEnded(callback: () => void): void;
}

/** Resolve once the video element has decodable frame data. */
async function whenReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve) => {
    video.addEventListener('loadeddata', () => resolve(), { once: true });
  });
}

/**
 * Ask the user to share a screen or window and return a live session.
 * Must be called from a user gesture (UI-STANDARDS: the permission
 * prompt is user-initiated, never on load). Throws the raw
 * `getDisplayMedia` error — map it with {@link captureErrorMessage}.
 */
export async function startCapture(): Promise<CaptureSession> {
  // Keep the app out of its own capture where the platform allows
  // (M14-FIX-02): `selfBrowserSurface` removes this tab from the
  // picker (Chromium 107+); the surface hints steer the picker
  // toward window shares. A full-screen share can still include the
  // app's window — no web API excludes one window from a monitor
  // capture; the expectation copy nudges window-sharing for that.
  // Unknown members are ignored by browsers that predate them.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
  } as DisplayMediaStreamOptions);
  const track = stream.getVideoTracks()[0];
  if (track === undefined) {
    for (const t of stream.getTracks()) t.stop();
    throw new Error('the shared stream has no video track');
  }

  // A muted video element decodes the stream for frame grabs; the
  // caller may mount it in the document as the live thumbnail.
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  await video.play();
  await whenReady(video);

  let stopped = false;
  return {
    label: displayLabel(track.label),
    video,
    async grabFrame(region?: CropRect): Promise<PixelBuffer> {
      if (stopped) throw new Error('capture has stopped');
      if (video.videoWidth === 0) throw new Error('no frame available yet');
      const bounds = { width: video.videoWidth, height: video.videoHeight };
      const src = region === undefined ? { x: 0, y: 0, ...bounds } : clampRect(region, bounds);
      const canvas = new OffscreenCanvas(src.width, src.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx === null) throw new Error('2d canvas context unavailable');
      ctx.drawImage(video, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { width: image.width, height: image.height, data: image.data };
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      for (const t of stream.getTracks()) t.stop();
      video.srcObject = null;
    },
    onEnded(callback: () => void): void {
      track.addEventListener('ended', () => {
        stopped = true;
        video.srcObject = null;
        callback();
      });
    },
  };
}
