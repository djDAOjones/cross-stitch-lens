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
import { executeRequest } from '../src/worker/execute.ts';
import { fullRgbVariant } from '../src/core/pipeline/config.ts';
import type { Palette } from '../src/core/types.ts';
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

  /**
   * The tests hand these back as stand-in ImageBitmaps, and the preview
   * surface closes the bitmap it is replacing. Without this the
   * replacement path throws — which Vitest reports as an unhandled
   * error rather than a failure, so it would quietly erode the suite.
   */
  close(): void {
    /* no-op: nothing to release in the fake */
  }
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

const PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    {
      code: 'K',
      name: 'black',
      hex: '#000000',
      rgb: [0, 0, 0],
      manufacturer: 'test',
    },
    {
      code: 'W',
      name: 'white',
      hex: '#ffffff',
      rgb: [255, 255, 255],
      manufacturer: 'test',
    },
  ],
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
      return Promise.resolve({
        width: 2,
        height: 2,
        close: () => undefined,
      } as ImageBitmap);
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
    expect(posted[0]).toMatchObject({
      type: 'error',
      id: 11,
      message: 'device lost',
    });
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
      execute: (request) => ({
        type: 'error',
        id: request.id,
        message: 'bad frame',
      }),
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
    expect([...posted.map((r) => r.id)].sort((a, b) => a - b)).toEqual([
      21, 22,
    ]);
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
    expect(posted[0]).toMatchObject({
      type: 'error',
      id: 41,
      message: 'unexpected',
    });
  });
});

/**
 * Split compare must show the full-RGB source at grid scale, aligned
 * cell-for-cell with the reduced output. M5-PERF-28 stopped computing
 * that with a second full pipeline pass per frame; these pin the two
 * things that could break as a result — the donated buffer being the
 * wrong buffer, and the fallback path being skipped when it is needed.
 */
describe('split compare recomputation (M5-PERF-28)', () => {
  /** Router deps that count executions and capture posted compare frames. */
  function harness(overrides: Partial<RouterDeps> = {}): {
    deps: RouterDeps;
    executions: ProcessRequest[];
    bitmaps: { width: number; height: number; data: Uint8ClampedArray }[];
  } {
    const executions: ProcessRequest[] = [];
    const bitmaps: {
      width: number;
      height: number;
      data: Uint8ClampedArray;
    }[] = [];
    const deps: RouterDeps = {
      post: () => undefined,
      ensureLutFor: () => Promise.resolve(),
      execute: (request, observe) => {
        executions.push(request);
        return executeRequest(request, () => 0, observe);
      },
      toBitmap: (image) => {
        bitmaps.push({
          width: image.width,
          height: image.height,
          data: new Uint8ClampedArray(image.data),
        });
        return Promise.resolve(image as unknown as ImageBitmap);
      },
      ...overrides,
    };
    return { deps, executions, bitmaps };
  }

  /** A source whose resize result is not uniform, so alignment is testable. */
  function gradientRequest(id: number, config: PipelineConfig): ProcessRequest {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < 16; i++) {
      data[i * 4] = i * 16;
      data[i * 4 + 1] = 255 - i * 16;
      data[i * 4 + 2] = 40;
      data[i * 4 + 3] = 255;
    }
    return {
      type: 'process',
      id,
      width: 4,
      height: 4,
      pixels: data.buffer as ArrayBuffer,
      config,
    };
  }

  it('runs ONE pipeline per frame under resize-first, not two', async () => {
    const { deps, executions } = harness();
    const route = createRouter(deps);
    route({ type: 'compare', enabled: true, position: 0.5 });
    await Promise.resolve();
    executions.length = 0;

    route(gradientRequest(1, CONFIG));
    await new Promise((r) => setTimeout(r, 0));

    // Before M5-PERF-28 this was 2: the frame, then a full-RGB twin
    // over the whole source.
    expect(executions.length).toBe(1);
  });

  it('the donated compare half equals a dedicated full-RGB pass, byte for byte', async () => {
    const config: PipelineConfig = {
      ...CONFIG,
      palette: PALETTE,
      dither: false,
      metric: 'rgb',
    };
    const { deps, bitmaps } = harness();
    const route = createRouter(deps);
    route({ type: 'compare', enabled: true, position: 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    bitmaps.length = 0;

    route(gradientRequest(2, config));
    await new Promise((r) => setTimeout(r, 0));

    // The oracle: what the old code computed — a full pipeline run of
    // the full-RGB twin over the same source.
    const oracle = executeRequest(
      gradientRequest(3, fullRgbVariant(config)),
      () => 0,
    );
    expect(oracle.type).toBe('result');
    if (oracle.type !== 'result') return;
    const expected = Array.from(new Uint8ClampedArray(oracle.pixels)).join();

    // Two bitmaps per frame: the compare half and the preview snapshot.
    // Assert by content, not by position, so the test cannot silently
    // pass on the wrong one if the publish order changes.
    expect(bitmaps.length).toBe(2);
    const matches = bitmaps.filter(
      (b) =>
        b.width === oracle.width &&
        b.height === oracle.height &&
        Array.from(b.data).join() === expected,
    );
    expect(matches.length).toBe(1);

    // The other must be the reduced output — genuinely different.
    // Without this, a pipeline that returned the source twice would
    // still satisfy the check above.
    expect(bitmaps.filter((b) => Array.from(b.data).join() !== expected).length).toBe(1);
  });

  it('falls back to a dedicated pass under reduce-first', async () => {
    const config: PipelineConfig = {
      ...CONFIG,
      preset: 'reduce-first',
      palette: PALETTE,
      metric: 'rgb',
    };
    const { deps, executions } = harness();
    const route = createRouter(deps);
    route({ type: 'compare', enabled: true, position: 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    executions.length = 0;

    route(gradientRequest(4, config));
    await new Promise((r) => setTimeout(r, 0));

    // Under reduce-first the resize runs AFTER the colour stage, so no
    // intermediate is the full-RGB grid — the twin pass is required.
    expect(executions.length).toBe(2);
    expect(executions[1]?.config.palette).toBeNull();
  });

  it('does no pipeline work when only the split position moves', async () => {
    const { deps, executions } = harness();
    const route = createRouter(deps);
    route(gradientRequest(5, CONFIG));
    await new Promise((r) => setTimeout(r, 0));
    route({ type: 'compare', enabled: true, position: 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    executions.length = 0;

    // Dragging the divider re-enters the compare case on every move.
    for (const position of [0.4, 0.3, 0.2, 0.6]) {
      route({ type: 'compare', enabled: true, position });
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(executions.length).toBe(0);
  });

  it('does no compare work at all while compare is off', async () => {
    const { deps, executions, bitmaps } = harness();
    const route = createRouter(deps);
    route(gradientRequest(6, CONFIG));
    await new Promise((r) => setTimeout(r, 0));
    expect(executions.length).toBe(1);
    // Only the preview snapshot bitmap, never a compare one.
    expect(bitmaps.length).toBe(1);
  });
});
