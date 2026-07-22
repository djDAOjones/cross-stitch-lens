/**
 * Frame pump (§22, M4): drives live capture by announcing new video
 * frames via `requestVideoFrameCallback` and gating expensive frame
 * grabs to latest-wins — at most one grab/process in flight, the
 * newest frame waits, older waiting frames are dropped. The gate is a
 * pure state machine (hermetically tested); the subscription needs a
 * browser and is verified in the running app.
 */

/**
 * Latest-wins gate for a single in-flight grab. Mirrors the worker
 * `Coalescer` policy, payload-free: the "pending item" is always
 * "the newest video frame", so only the flag is kept.
 */
export class PumpGate {
  private busy = false;
  private pending = false;
  private dropped = 0;

  /** A new video frame arrived. True = start a grab now. */
  frameArrived(): boolean {
    if (!this.busy) {
      this.busy = true;
      return true;
    }
    if (this.pending) this.dropped++;
    this.pending = true;
    return false;
  }

  /** The in-flight grab's processing finished. True = grab again. */
  grabDone(): boolean {
    if (this.pending) {
      this.pending = false;
      return true;
    }
    this.busy = false;
    return false;
  }

  /** Abandon any pending frame and go idle (pump stopping). */
  reset(): void {
    this.busy = false;
    this.pending = false;
  }

  /** Frames dropped while one was already waiting (diagnostics). */
  get droppedCount(): number {
    return this.dropped;
  }

  /** Whether a grab is currently in flight. */
  get isBusy(): boolean {
    return this.busy;
  }
}

/**
 * Subscribe to the video's frame ticks, calling `onFrame` once per
 * presented frame. Uses `requestVideoFrameCallback` where available
 * (ticks only on genuinely new frames), falling back to
 * `requestAnimationFrame`. Returns a stop function; stopping is
 * idempotent.
 *
 * `onFrame` receives the rvfc metadata where the browser provides it
 * (`presentedFrames` exposes missed callbacks; `presentationTime` /
 * `expectedDisplayTime` characterise capture cadence — M13-MEAS-02).
 * Under the rAF fallback it is `undefined` — an unsupported reading is
 * reported as absent, never zero. Purely observational: the pump's
 * policy does not read it.
 */
export function startFramePump(
  video: HTMLVideoElement,
  onFrame: (metadata?: VideoFrameCallbackMetadata) => void,
): () => void {
  let stopped = false;
  if (typeof video.requestVideoFrameCallback === 'function') {
    const tick = (_now: number, metadata: VideoFrameCallbackMetadata): void => {
      if (stopped) return;
      onFrame(metadata);
      video.requestVideoFrameCallback(tick);
    };
    video.requestVideoFrameCallback(tick);
  } else {
    const tick = (): void => {
      if (stopped) return;
      onFrame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return () => {
    stopped = true;
  };
}
