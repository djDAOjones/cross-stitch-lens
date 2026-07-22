/**
 * Worker-side executor logic, tested hermetically (no real Worker —
 * the worker entry is a two-line shell over these modules; the real
 * browser exercise lands with M2's preview UI):
 *
 * - executeRequest: end-to-end frame processing, per-stage timings,
 *   error-as-response (a bad frame must not kill the worker).
 * - LUT cache: one build per palette+metric.
 * - Coalescer: latest-wins, no queue.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { Coalescer } from '../src/worker/coalesce.ts';
import { executeRequest } from '../src/worker/execute.ts';
import { clearLutCache, getLut, lutCacheSize } from '../src/worker/lut-cache.ts';
import type { PipelineConfig } from '../src/core/pipeline/config.ts';
import type { ProcessRequest } from '../src/worker/protocol.ts';
import type { Palette } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    thread('K', 'black', [0, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
  ],
};

function request(configOverrides: Partial<PipelineConfig> = {}): ProcessRequest {
  const width = 4;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = i * 16;
    data.set([v, v, v, 255], i * 4);
  }
  return {
    type: 'process',
    id: 7,
    width,
    height,
    pixels: data.buffer as ArrayBuffer,
    config: {
      preset: 'resize-first',
      grid: { width: 2, height: 2 },
      resizeMode: 'stretch',
      palette: PALETTE,
      metric: 'rgb',
      dither: { algorithm: 'none' },
      ...configOverrides,
    },
  };
}

describe('executeRequest', () => {
  beforeEach(clearLutCache);

  it('processes a frame end-to-end with per-stage timings', () => {
    const response = executeRequest(request());
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    expect(response.id).toBe(7);
    expect(response.width).toBe(2);
    expect(response.height).toBe(2);
    const out = new Uint8ClampedArray(response.pixels);
    expect(out.length).toBe(2 * 2 * 4);
    // Palette membership: every pixel black or white.
    for (let i = 0; i < out.length; i += 4) {
      expect([0, 255]).toContain(out[i]);
      expect(out[i]).toBe(out[i + 1]);
      expect(out[i]).toBe(out[i + 2]);
    }
    // No 'adjust' row: the identity hook is omitted from the stage list
    // (M5-PERF-25), so it neither costs a clone nor reports a timing.
    expect(response.timings.map((t) => t.stage)).toEqual(['resize', 'reduce']);
    for (const t of response.timings) expect(t.ms).toBeGreaterThanOrEqual(0);
  });

  it('returns an error response instead of throwing (worker survives)', () => {
    const bad = request();
    bad.config.grid.width = 4096; // out of range → RangeError in resize
    const response = executeRequest(bad);
    expect(response.type).toBe('error');
    if (response.type !== 'error') return;
    expect(response.id).toBe(7);
    expect(response.message).toMatch(/1–1024/);
  });

  it('builds the LUT once per palette+metric via the cache', () => {
    expect(lutCacheSize()).toBe(0);
    executeRequest(request());
    expect(lutCacheSize()).toBe(1);
    executeRequest(request());
    expect(lutCacheSize()).toBe(1);
    executeRequest(request({ metric: 'lab' }));
    expect(lutCacheSize()).toBe(2);
    const a = getLut(PALETTE, 'rgb');
    const b = getLut(PALETTE, 'rgb');
    expect(a).toBe(b);
  });
});

describe('Coalescer (latest-wins)', () => {
  it('starts immediately when idle and queues at most one frame', () => {
    const c = new Coalescer<number>();
    expect(c.submit(1)).toBe(1); // idle → start now
    expect(c.submit(2)).toBeNull(); // busy → pend
    expect(c.submit(3)).toBeNull(); // displaces 2
    expect(c.droppedCount).toBe(1);
    expect(c.complete()).toBe(3); // latest wins
    expect(c.complete()).toBeNull(); // now idle
    expect(c.isBusy).toBe(false);
    expect(c.submit(4)).toBe(4);
  });
});
