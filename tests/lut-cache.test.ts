/**
 * Worker LUT cache identity and safety (M5-PERF-26, M5-PERF-31 / D46).
 *
 * A LUT stores palette *indices*, so cache identity must be the
 * palette's content in order. The old `name:length:metric` key let two
 * different palettes share one LUT — reproduced below as the actual
 * user-visible failure: a red pixel coming back the wrong colour.
 *
 * The GPU path adds a second hazard: a shader that fails to compile
 * yields a well-formed all-zeros LUT rather than an error, so
 * `ensureLut` sanity-checks anything the GPU returns before caching it
 * in preference to the correct TS build.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLut, LUT_SIZE, lutKey } from '../src/core/color/lut.ts';
import { executeRequest } from '../src/worker/execute.ts';
import { clearLutCache, ensureLut, getLut, lutCacheSize } from '../src/worker/lut-cache.ts';
import { buildLutGpu } from '../src/backends/webgpu/reduce.ts';
import type { Palette, Thread } from '../src/core/types.ts';
import type { ProcessRequest } from '../src/worker/protocol.ts';
import { thread } from './helpers/threads.ts';

vi.mock('../src/backends/webgpu/reduce.ts', () => ({
  buildLutGpu: vi.fn(async () => Promise.resolve(null)),
  mapPaletteGpu: vi.fn(async () => Promise.resolve(null)),
}));

const gpuBuild = vi.mocked(buildLutGpu);

const RED: Thread = thread('R', 'red', [255, 0, 0]);
const BLUE: Thread = thread('B', 'blue', [0, 0, 255]);
const GREEN: Thread = thread('G', 'green', [0, 255, 0]);

/** Same name and entry count, opposite order — the collision case. */
const REDFIRST: Palette = { name: 'two', entries: [RED, BLUE] };
const BLUEFIRST: Palette = { name: 'two', entries: [BLUE, RED] };
/** Same name and count again, but different colours entirely. */
const RECOLOURED: Palette = { name: 'two', entries: [GREEN, BLUE] };

/** One pure-red pixel reduced onto `palette` at a 1×1 grid. */
function reduceOneRedPixel(palette: Palette): [number, number, number] {
  const data = new Uint8ClampedArray([255, 0, 0, 255]);
  const request: ProcessRequest = {
    type: 'process',
    id: 1,
    width: 1,
    height: 1,
    pixels: data.buffer as ArrayBuffer,
    config: {
      preset: 'resize-first',
      grid: { width: 1, height: 1 },
      resizeMode: 'stretch',
      palette,
      metric: 'rgb',
      dither: { algorithm: 'none' },
    },
  };
  const response = executeRequest(request);
  if (response.type !== 'result') throw new Error(`unexpected ${response.type}`);
  const out = new Uint8ClampedArray(response.pixels);
  return [out[0] ?? 0, out[1] ?? 0, out[2] ?? 0];
}

describe('LUT cache keying (M5-PERF-26)', () => {
  beforeEach(() => {
    clearLutCache();
    gpuBuild.mockReset();
    gpuBuild.mockResolvedValue(null);
  });

  it('reduces red to red whichever slot red occupies (regression)', () => {
    // Under the old name:length:metric key the second call reused the
    // first palette's LUT, and index 0 meant a different colour.
    expect(reduceOneRedPixel(REDFIRST)).toEqual([255, 0, 0]);
    expect(reduceOneRedPixel(BLUEFIRST)).toEqual([255, 0, 0]);
  });

  it('gives reordered and recoloured palettes their own LUTs', () => {
    const redFirst = getLut(REDFIRST, 'rgb');
    const blueFirst = getLut(BLUEFIRST, 'rgb');
    const recoloured = getLut(RECOLOURED, 'rgb');
    expect(lutCacheSize()).toBe(3);
    expect(redFirst).not.toBe(blueFirst);
    expect(redFirst).not.toBe(recoloured);
    // Order really is inverted, not merely a different object: the
    // pure-red bin points at whichever slot red occupies.
    const redBin = lutKey(255, 0, 0);
    expect(redFirst[redBin]).toBe(0);
    expect(blueFirst[redBin]).toBe(1);
  });

  it('shares one LUT for identical content under a different name', () => {
    getLut({ name: 'two', entries: [RED, BLUE] }, 'rgb');
    getLut({ name: 'renamed', entries: [RED, BLUE] }, 'rgb');
    expect(lutCacheSize()).toBe(1);
  });

  it('still separates metrics', () => {
    getLut(REDFIRST, 'rgb');
    getLut(REDFIRST, 'lab');
    expect(lutCacheSize()).toBe(2);
  });

  it('bounds cache growth across many distinct palettes', () => {
    for (let i = 0; i < 40; i++) {
      getLut({ name: 'gen', entries: [{ ...RED, rgb: [i * 6, 10, 20] }, BLUE] }, 'rgb');
    }
    expect(lutCacheSize()).toBeLessThanOrEqual(8);
  });
});

describe('ensureLut GPU sanity check (M5-PERF-31 / D46)', () => {
  beforeEach(() => {
    clearLutCache();
    gpuBuild.mockReset();
  });

  it('rejects the all-zeros LUT a failed shader returns', async () => {
    gpuBuild.mockResolvedValue(new Uint16Array(LUT_SIZE));
    const lut = await ensureLut(REDFIRST, 'rgb');
    // The correct LUT maps pure red to index 0 and pure blue to index 1.
    expect(lut).toEqual(buildLut(REDFIRST, 'rgb'));
    expect(lut.some((index) => index !== 0)).toBe(true);
  });

  it('rejects a LUT with an index past the palette', async () => {
    const bogus = new Uint16Array(LUT_SIZE);
    bogus.fill(1);
    bogus[123] = 7; // only two entries exist
    gpuBuild.mockResolvedValue(bogus);
    const lut = await ensureLut(REDFIRST, 'rgb');
    // Compare against a fresh reference build, not the cache — the
    // cache is exactly what must not have taken the bogus LUT.
    expect(lut).toEqual(buildLut(REDFIRST, 'rgb'));
  });

  it('accepts and caches a plausible GPU LUT', async () => {
    const plausible = getLut(REDFIRST, 'rgb').slice();
    clearLutCache();
    gpuBuild.mockResolvedValue(plausible);
    const lut = await ensureLut(REDFIRST, 'rgb');
    expect(lut).toBe(plausible);
    expect(lutCacheSize()).toBe(1);
  });

  it('allows a single-entry palette to map every bin to index 0', async () => {
    const single: Palette = { name: 'one', entries: [RED] };
    gpuBuild.mockResolvedValue(new Uint16Array(LUT_SIZE));
    const lut = await ensureLut(single, 'rgb');
    expect(lut.every((index) => index === 0)).toBe(true);
  });
});
