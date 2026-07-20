/**
 * Worker routing response invariant (M5-PERF-29 / D46).
 *
 * The main-thread client releases its latest-wins gate only when a
 * response arrives, so a request that produces nothing wedges live
 * preview permanently. Both async entry paths could previously do
 * exactly that: `ensureLutFor` rejecting (WebGPU device loss) and
 * `createImageBitmap` rejecting — both sat inside a floating
 * `void (async () => …)()` with no catch, and the `postMessage` for a
 * processed frame was *inside* the bitmap callback.
 *
 * Each test drives one rejection and asserts (a) a response is posted
 * and (b) a Coalescer fed that response goes idle — the gate release
 * the live pump depends on.
 */

import { describe, expect, it, vi } from 'vitest';

import { Coalescer } from '../src/worker/coalesce.ts';
import { createRouter, type RouterDeps } from '../src/worker/router.ts';
import type { PipelineConfig } from '../src/core/pipeline/config.ts';
import type {
  ExportRequest,
  ProcessRequest,
  WorkerResponse,
} from '../src/worker/protocol.ts';

/**
 * Minimal ImageData for the node test environment (workers have the
 * real one). Without it the preview-snapshot path would throw and
 * every test would pass through the failure branch — proving nothing
 * about the happy path.
 */
class TestImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}
globalThis.ImageData ??= TestImageData as unknown as typeof ImageData;

const CONFIG: PipelineConfig = {
  preset: 'resize-first',
  grid: { width: 2, height: 2 },
  resizeMode: 'stretch',
  palette: null,
  metric: 'rgb',
  dither: false,
  serpentine: true,
};

function processRequest(id = 3): ProcessRequest {
  const data = new Uint8ClampedArray(4 * 4 * 4).fill(128);
  return {
    type: 'process',
    id,
    width: 4,
    height: 4,
    pixels: data.buffer as ArrayBuffer,
    config: CONFIG,
  };
}

function exportRequest(id = 9): ExportRequest {
  const data = new Uint8ClampedArray(4 * 4 * 4).fill(64);
  return {
    type: 'export',
    id,
    width: 4,
    height: 4,
    pixels: data.buffer as ArrayBuffer,
    config: CONFIG,
  };
}

/** A result response with a detachable pixel buffer. */
function result(id: number): WorkerResponse {
  return {
    type: 'result',
    id,
    width: 2,
    height: 2,
    pixels: new Uint8ClampedArray(2 * 2 * 4).buffer,
    timings: [],
  };
}

/** Router under test plus the responses it posted. */
function harness(overrides: Partial<RouterDeps> = {}): {
  route: (request: ProcessRequest | ExportRequest) => void;
  posted: WorkerResponse[];
  snapshots: ImageData[];
} {
  const posted: WorkerResponse[] = [];
  const snapshots: ImageData[] = [];
  const deps: RouterDeps = {
    post: (message) => posted.push(message as WorkerResponse),
    ensureLutFor: () => Promise.resolve(),
    execute: (request) => result(request.id),
    toBitmap: (image) => {
      snapshots.push(image);
      return Promise.resolve({ width: 2, height: 2, close: () => undefined } as ImageBitmap);
    },
    ...overrides,
  };
  return { route: createRouter(deps), posted, snapshots };
}

/** The client's gate: one frame in flight, released by a response. */
function gateReleasedBy(responses: WorkerResponse[]): boolean {
  const coalescer = new Coalescer<number>();
  coalescer.submit(1); // in flight
  for (let i = 0; i < responses.length; i++) coalescer.complete();
  return !coalescer.isBusy;
}

describe('worker router response invariant', () => {
  it('answers a normal frame with a result, snapshotting the preview first', async () => {
    const { route, posted, snapshots } = harness();
    route(processRequest());
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]?.type).toBe('result');
    // The snapshot is taken before the transfer detaches the pixels.
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.width).toBe(2);
    expect(gateReleasedBy(posted)).toBe(true);
  });

  it('answers when ensureLutFor rejects (WebGPU device loss)', async () => {
    const { route, posted } = harness({
      ensureLutFor: () => Promise.reject(new Error('device lost')),
    });
    route(processRequest(11));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ type: 'error', id: 11, message: 'device lost' });
    expect(gateReleasedBy(posted)).toBe(true);
  });

  it('still returns the frame when the preview bitmap rejects', async () => {
    const { route, posted } = harness({
      toBitmap: () => Promise.reject(new Error('bitmap failed')),
    });
    route(processRequest(12));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    // A failed snapshot costs the preview redraw, not the frame: the
    // pixels must still reach the client so the UI keeps updating.
    expect(posted[0]).toMatchObject({ type: 'result', id: 12 });
    expect(gateReleasedBy(posted)).toBe(true);
  });

  it('answers when the executor reports an error', async () => {
    const { route, posted } = harness({
      execute: (request) => ({ type: 'error', id: request.id, message: 'bad frame' }),
    });
    route(processRequest(13));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ type: 'error', id: 13 });
    expect(gateReleasedBy(posted)).toBe(true);
  });

  it('answers exactly once per request', async () => {
    const { route, posted } = harness();
    route(processRequest(21));
    route(exportRequest(22));
    await vi.waitFor(() => expect(posted).toHaveLength(2));
    // Both are answered; order between them is not an invariant (an
    // export has one less await), and the client matches exports by id.
    expect([...posted.map((r) => r.id)].sort((a, b) => a - b)).toEqual([21, 22]);
  });

  it('answers an export whose LUT fill rejects', async () => {
    const { route, posted } = harness({
      ensureLutFor: () => Promise.reject(new Error('device lost')),
    });
    route(exportRequest(31));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    // The client rejects the pending export promise on this response;
    // without it the export hangs for ever.
    expect(posted[0]).toMatchObject({ type: 'error', id: 31 });
  });

  it('answers even when a dependency throws synchronously', async () => {
    const { route, posted } = harness({
      execute: () => {
        throw new Error('unexpected');
      },
    });
    route(processRequest(41));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ type: 'error', id: 41, message: 'unexpected' });
  });
});
