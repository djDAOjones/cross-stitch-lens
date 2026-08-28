/**
 * Worker settlement (STATE-04, the D212 convention).
 *
 * `PipelineClient` used to wire `onmessage` and nothing else. A worker
 * that threw fatally therefore took every pending operation with it,
 * silently: an export promise is settled only from the response
 * handler, so it never settled at all — the button waited for ever
 * with no message — and the coalescer gate never reopened, so the
 * preview stopped too.
 *
 * Every operation must now reach exactly one terminal state, and the
 * app must say plainly when it cannot recover. It cannot: the preview
 * canvas reached the worker through `transferControlToOffscreen`,
 * which is one-way, so a replacement worker cannot be handed it.
 * Honest refusal is the design, not a shortcut.
 *
 * Driven against a fake Worker, because a real one cannot be made to
 * die on demand.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DITHER, type PipelineConfig } from '../src/core/pipeline/config.ts';
import { defaultTone } from '../src/core/color/tone.ts';
import type { PixelBuffer } from '../src/core/types.ts';

interface FakeWorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message: string }) => void) | null;
  onmessageerror: (() => void) | null;
  posted: unknown[];
  terminated: number;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}

let workers: FakeWorkerLike[] = [];

class FakeWorker implements FakeWorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminated = 0;
  constructor() {
    workers.push(this);
  }
  postMessage(message: unknown): void {
    this.posted.push(message);
  }
  terminate(): void {
    this.terminated += 1;
  }
}

function config(): PipelineConfig {
  return {
    preset: 'resize-first',
    grid: { width: 8, height: 8 },
    resizeMode: 'contain',
    palette: null,
    metric: 'rgb',
    dither: { ...DEFAULT_DITHER },
    tone: defaultTone(),
  };
}

function buffer(): PixelBuffer {
  return { width: 2, height: 2, data: new Uint8ClampedArray(16) };
}

/** The client, imported after `Worker` is stubbed. */
async function newClient(): Promise<{
  client: InstanceType<Awaited<typeof import('../src/worker/client.ts')>['PipelineClient']>;
  worker: FakeWorkerLike;
}> {
  const { PipelineClient } = await import('../src/worker/client.ts');
  const client = new PipelineClient();
  const worker = workers[workers.length - 1];
  if (worker === undefined) throw new Error('no fake worker was constructed');
  return { client, worker };
}

describe('worker settlement', () => {
  beforeEach(() => {
    workers = [];
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a pending export when the worker errors, rather than hanging', async () => {
    const { client, worker } = await newClient();
    const pending = client.exportFrame(buffer(), config());
    worker.onerror?.({ message: 'boom' });
    await expect(pending).rejects.toThrow('boom');
  });

  it('rejects a pending export on messageerror too', async () => {
    const { client, worker } = await newClient();
    const pending = client.exportFrame(buffer(), config());
    worker.onmessageerror?.();
    await expect(pending).rejects.toThrow('could not be read');
  });

  it('rejects every pending export, not just the first', async () => {
    const { client, worker } = await newClient();
    const a = client.exportFrame(buffer(), config());
    const b = client.exportFrame(buffer(), config());
    const c = client.exportFrame(buffer(), config());
    worker.onerror?.({ message: 'boom' });
    const settled = await Promise.allSettled([a, b, c]);
    expect(settled.map((s) => s.status)).toEqual(['rejected', 'rejected', 'rejected']);
  });

  it('settles exactly once — a second failure changes nothing', async () => {
    const { client, worker } = await newClient();
    const fatals: string[] = [];
    client.setOnFatal((reason) => fatals.push(reason));
    const pending = client.exportFrame(buffer(), config());
    worker.onerror?.({ message: 'first' });
    worker.onerror?.({ message: 'second' });
    worker.onmessageerror?.();
    await expect(pending).rejects.toThrow('first');
    expect(fatals).toEqual(['first']);
    expect(worker.terminated).toBe(1);
  });

  it('tells the host once, with a reason fit to show a user', async () => {
    const { client, worker } = await newClient();
    let told: string | null = null;
    client.setOnFatal((reason) => {
      told = reason;
    });
    worker.onerror?.({ message: '' }); // browsers can report an empty message
    expect(told).toBe('the image worker stopped');
  });

  it('fails a later export fast instead of queueing it against a dead worker', async () => {
    const { client, worker } = await newClient();
    worker.onerror?.({ message: 'boom' });
    await expect(client.exportFrame(buffer(), config())).rejects.toThrow('has stopped');
    expect(client.isDead).toBe(true);
  });

  it('drops later frame submissions silently rather than growing a queue', async () => {
    const { client, worker } = await newClient();
    worker.onerror?.({ message: 'boom' });
    const before = worker.posted.length;
    client.submit(buffer(), config());
    client.submit(buffer(), config());
    expect(worker.posted.length).toBe(before);
  });

  it('forgets the in-flight frame, so a late response cannot deliver one', async () => {
    const { client, worker } = await newClient();
    const frames: unknown[] = [];
    client.setOnResult((frame) => frames.push(frame));
    client.submit(buffer(), config());
    expect(worker.posted).toHaveLength(1);

    worker.onerror?.({ message: 'boom' });

    // A response arriving after the worker was declared dead — a
    // message already in flight when it died. It must not be
    // delivered as a frame: its bookkeeping is gone, and the config
    // it would be read against went with it.
    worker.onmessage?.({
      data: {
        type: 'result',
        id: 0,
        width: 2,
        height: 2,
        pixels: new ArrayBuffer(16),
        indices: null,
        timings: [],
      },
    });
    expect(frames).toEqual([]);
  });

  it('still settles a normal export error without killing the worker', async () => {
    const { client, worker } = await newClient();
    const pending = client.exportFrame(buffer(), config());
    // A per-request failure the worker reports itself — recoverable.
    worker.onmessage?.({ data: { type: 'error', id: 0, message: 'palette empty' } });
    await expect(pending).rejects.toThrow('palette empty');
    expect(client.isDead).toBe(false);
    expect(worker.terminated).toBe(0);
  });
});

describe('the coalescer gate', () => {
  it('reopens on reset, so work that never completes cannot shut it', async () => {
    const { Coalescer } = await import('../src/worker/coalesce.ts');
    const gate = new Coalescer<string>();
    expect(gate.submit('a')).toBe('a'); // starts, gate busy
    expect(gate.submit('b')).toBeNull(); // waits
    gate.reset();
    expect(gate.isBusy).toBe(false);
    // The pending item is abandoned, not replayed.
    expect(gate.submit('c')).toBe('c');
  });
});
