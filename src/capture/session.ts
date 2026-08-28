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
import { reusableSurface } from './surface.ts';

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
  /**
   * Re-read the *last grabbed* frame from the retained surface, with
   * no new `drawImage` — a byte-identical second copy of whatever
   * {@link grabFrame} last returned (M13-IMPL-01, D135 candidate 2).
   *
   * This is what lets the live pump transfer its grab buffer straight
   * to the worker instead of copying it first: the frame is not lost
   * when its buffer detaches, it is still sitting on the surface, and
   * the copy is paid only if something actually asks for the master
   * image. Null before the first grab and after {@link stop}.
   *
   * The surface holds the *latest* grab, so under a running pump a
   * snapshot may be newer than the frame whose buffer detached — the
   * same race the master image already had against the pump replacing
   * it. While frozen, nothing draws, so the snapshot is exact.
   */
  snapshot(): PixelBuffer | null;
  /** Stop sharing and release the stream. Idempotent. */
  stop(): void;
  /**
   * Free the retained frame pixels (STATE-02). Idempotent.
   *
   * The pairing to {@link snapshot}'s deliberate survival of
   * {@link stop}: the surface must outlive the stream just long
   * enough for the app to rescue the last frame into a still, and not
   * one moment longer. Call it once that rescue has been taken;
   * `snapshot()` reads null afterwards.
   */
  releaseFrames(): void;
  /** Called once if sharing ends outside the app (browser stop UI). */
  onEnded(callback: () => void): void;
}

/**
 * How long to wait for a shared stream to produce decodable data
 * before giving up. Generous — a capture normally reaches
 * `loadeddata` in well under a second — but bounded, which is the
 * point (STATE-02).
 */
export const READY_TIMEOUT_MS = 10_000;

/**
 * Resolve once the video element has decodable frame data, or reject
 * once {@link READY_TIMEOUT_MS} has passed.
 *
 * The timeout is not defensive padding. Sharing has already begun by
 * the time this is awaited, so a `loadeddata` that never fires used to
 * leave the promise pending for ever — meaning `startCapture` never
 * returned, the caller never got a session, and the user was left
 * sharing their screen with nothing in the app able to stop it. A
 * rejection is recoverable; a hang is not.
 */
async function whenReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('loadeddata', onReady);
      reject(new Error('the shared stream produced no frames'));
    }, READY_TIMEOUT_MS);
    function onReady(): void {
      clearTimeout(timer);
      resolve();
    }
    video.addEventListener('loadeddata', onReady, { once: true });
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
  // picker (Chromium 107+). `displaySurface: 'monitor'` asks the
  // picker to open on the entire-screen tab (M14-EXT-19, the owner's
  // preferred flow) — a hint, not a guarantee: the picker stays
  // user-owned, and a browser that ignores it degrades to its own
  // default with no error. A full-screen share can still include the
  // app's window — no web API excludes one window from a monitor
  // capture; the expectation copy stays honest about that.
  // Unknown members are ignored by browsers that predate them.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'monitor' },
    audio: false,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
  } as DisplayMediaStreamOptions);
  // From here on the user IS sharing. Every failure path below must
  // stop the stream before it throws (STATE-02): the app is the only
  // thing holding a handle to it, so an early return that skips the
  // cleanup leaves the share running with nothing able to end it, and
  // the browser's own indicator saying so. Previously only the
  // no-video-track branch cleaned up, while the two awaits after it
  // did not.
  const stopStream = (): void => {
    for (const t of stream.getTracks()) t.stop();
  };

  const track = stream.getVideoTracks()[0];
  if (track === undefined) {
    stopStream();
    throw new Error('the shared stream has no video track');
  }

  // A muted video element decodes the stream for frame grabs; the
  // caller may mount it in the document as the live thumbnail.
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  try {
    await video.play();
    await whenReady(video);
  } catch (error) {
    stopStream();
    video.srcObject = null;
    throw error;
  }

  let stopped = false;
  // One canvas for the whole session (M13-IMPL-01, D135 candidate 1),
  // resized only when the crop changes. The retained surface is also
  // what makes {@link CaptureSession.snapshot} exact: it still holds
  // the last grabbed frame's pixels after that frame's buffer has been
  // transferred away.
  const surface = reusableSurface(
    (width, height) => new OffscreenCanvas(width, height),
    (canvas) => canvas.getContext('2d', { willReadFrequently: true }),
  );
  return {
    label: displayLabel(track.label),
    video,
    async grabFrame(region?: CropRect): Promise<PixelBuffer> {
      if (stopped) throw new Error('capture has stopped');
      if (video.videoWidth === 0) throw new Error('no frame available yet');
      const bounds = { width: video.videoWidth, height: video.videoHeight };
      const src = region === undefined ? { x: 0, y: 0, ...bounds } : clampRect(region, bounds);
      const { canvas, ctx } = surface.acquire(src.width, src.height);
      // A reused surface still holds the previous frame, and the
      // default 'source-over' would *blend* the new one onto it. That
      // is a no-op only for a fully opaque source — true of capture
      // video today, but the byte-equality claim must not rest on it.
      // 'copy' replaces the destination outright, which is exactly
      // what a fresh canvas gave, and costs nothing extra: the
      // destination rect is the whole surface either way.
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(video, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { width: image.width, height: image.height, data: image.data };
    },
    snapshot(): PixelBuffer | null {
      // Deliberately survives `stop()`: the surface is an ordinary
      // canvas, not part of the stream, and the app's one chance to
      // rescue the last live frame into a still is *after* sharing
      // has ended (see main.ts → endCaptureUi).
      const held = surface.current();
      if (held === null) return null;
      const { canvas, ctx } = held;
      if (canvas.width === 0 || canvas.height === 0) return null;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { width: image.width, height: image.height, data: image.data };
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      stopStream();
      video.srcObject = null;
    },
    releaseFrames(): void {
      surface.release();
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
