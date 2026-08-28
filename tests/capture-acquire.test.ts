/**
 * Capture acquisition stops the stream on every failure path
 * (STATE-02).
 *
 * The moment `getDisplayMedia` resolves, the user IS sharing, and the
 * app holds the only handle that can end it. Two `await`s followed
 * that resolve with no cleanup around them: a rejecting `video.play()`
 * left the share running, and `whenReady` waited on a `loadeddata`
 * that might never fire, so `startCapture` never returned at all and
 * the user was sharing with nothing able to stop it.
 *
 * Driven against fakes for `navigator.mediaDevices` and
 * `document.createElement('video')`, because the assertion is about
 * track lifetime, not pixels — and because a real browser cannot be
 * made to fail these ways on demand.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { READY_TIMEOUT_MS, startCapture } from '../src/capture/session.ts';

interface FakeTrack {
  kind: string;
  label: string;
  stops: number;
  stop(): void;
  addEventListener(type: string, handler: () => void): void;
}

function fakeTrack(kind: string, label = 'Some Window'): FakeTrack {
  return {
    kind,
    label,
    stops: 0,
    stop() {
      this.stops += 1;
    },
    addEventListener() {
      /* the ended listener is not what these assert */
    },
  };
}

function fakeStream(tracks: FakeTrack[]): { tracks: FakeTrack[] } & Record<string, unknown> {
  return {
    tracks,
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  };
}

interface VideoBehaviour {
  /** How `play()` settles. */
  play: 'resolve' | 'reject';
  /** Whether `loadeddata` ever fires. */
  everReady: boolean;
}

/** Install fake `navigator` + `document` for one test. */
function install(stream: ReturnType<typeof fakeStream>, behaviour: VideoBehaviour): void {
  const video = {
    muted: false,
    srcObject: null as unknown,
    readyState: 0,
    videoWidth: 0,
    play: () =>
      behaviour.play === 'reject'
        ? Promise.reject(new Error('play blocked'))
        : Promise.resolve(),
    addEventListener(type: string, handler: () => void) {
      if (type === 'loadeddata' && behaviour.everReady) setTimeout(handler, 0);
    },
    removeEventListener() {
      /* the timeout path removes its listener; nothing to record */
    },
    remove() {
      /* unused here */
    },
  };
  vi.stubGlobal('navigator', {
    mediaDevices: { getDisplayMedia: () => Promise.resolve(stream) },
  });
  vi.stubGlobal('document', { createElement: () => video });
  vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
  // The session builds a grab surface on construction; these tests
  // never draw, so a bare stand-in is enough.
  vi.stubGlobal('OffscreenCanvas', function OffscreenCanvasStub(): void {
    /* never instantiated on these paths */
  });
}

describe('startCapture cleanup on failure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops the stream when the stream carries no video track', async () => {
    const stream = fakeStream([fakeTrack('audio')]);
    install(stream, { play: 'resolve', everReady: true });
    await expect(startCapture()).rejects.toThrow('no video track');
    expect(stream.tracks.every((t) => t.stops === 1)).toBe(true);
  });

  it('stops the stream when play() rejects — the share must not survive', async () => {
    const stream = fakeStream([fakeTrack('video')]);
    install(stream, { play: 'reject', everReady: true });
    await expect(startCapture()).rejects.toThrow('play blocked');
    expect(stream.tracks[0]?.stops).toBe(1);
  });

  it('stops the stream when the shared surface never produces a frame', async () => {
    const stream = fakeStream([fakeTrack('video')]);
    install(stream, { play: 'resolve', everReady: false });
    const attempt = startCapture();
    const assertion = expect(attempt).rejects.toThrow('no frames');
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS + 1);
    await assertion;
    expect(stream.tracks[0]?.stops).toBe(1);
  });

  it('stops each track exactly once, never twice', async () => {
    // Double-stopping is harmless in the browser but signals two
    // cleanup paths racing, which is what this slice removes.
    const stream = fakeStream([fakeTrack('video'), fakeTrack('audio')]);
    install(stream, { play: 'reject', everReady: true });
    await expect(startCapture()).rejects.toThrow();
    for (const track of stream.tracks) expect(track.stops).toBe(1);
  });

  it('does not hang: the unready path settles within the timeout', async () => {
    const stream = fakeStream([fakeTrack('video')]);
    install(stream, { play: 'resolve', everReady: false });
    let settled = false;
    const attempt = startCapture().catch(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS - 1);
    expect(settled).toBe(false); // still waiting, correctly
    await vi.advanceTimersByTimeAsync(2);
    await attempt;
    expect(settled).toBe(true);
  });
});
