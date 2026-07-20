/**
 * Automatic backend selection (src/worker/backend-select.ts): the
 * pick-faster policy with its hysteresis margin, calibration against
 * a fake clock, executor routing, and — the backlog's acceptance
 * clause — the TS fallback with BOTH accelerated backends disabled:
 * no wasm registration (fresh module state) and no WebGPU (node has
 * no navigator.gpu), including a stale selection pointing at a
 * backend that has gone.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { registerWasmDither } from '../src/backends/wasm/dither.ts';
import { isWebGpuAvailable } from '../src/backends/webgpu/device.ts';
import { buildLut } from '../src/core/color/lut.ts';
import { ditherStage } from '../src/core/pipeline/dither.ts';
import type { Palette } from '../src/core/types.ts';
import {
  clearSelectedBackends,
  routeDither,
  selectedBackend,
  setSelectedBackend,
} from '../src/worker/backend-select.ts';
import { executeRequest } from '../src/worker/execute.ts';
import { clearLutCache, ensureLut } from '../src/worker/lut-cache.ts';
import type { ProcessRequest } from '../src/worker/protocol.ts';

const WASM_BYTES_PATH = fileURLToPath(
  new URL('../crates/stitch-engine/pkg/stitch_engine_bg.wasm', import.meta.url),
);

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

function ditherRequest(metric: 'rgb' | 'lab' = 'rgb'): ProcessRequest {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = (i * 7) % 256;
    data.set([v, v, v, 255], i * 4);
  }
  return {
    type: 'process',
    id: 1,
    width,
    height,
    pixels: data.buffer as ArrayBuffer,
    config: {
      preset: 'resize-first',
      grid: { width: 8, height: 8 },
      resizeMode: 'stretch',
      palette: PALETTE,
      metric,
      dither: true,
      serpentine: true,
    },
  };
}

afterEach(() => {
  clearSelectedBackends();
  delete ditherStage.backends.wasm;
});

describe('selection policy', () => {
  it('set/clear round-trips a selection', () => {
    expect(selectedBackend('dither')).toBeUndefined();
    setSelectedBackend('dither', 'wasm');
    expect(selectedBackend('dither')).toBe('wasm');
    setSelectedBackend('dither', null);
    expect(selectedBackend('dither')).toBeUndefined();
  });
});

describe('workload routing (M5-PERF-27)', () => {
  /**
   * The policy is derived from the sweep in
   * `tests/audits/routing.audit.test.ts`: under lab the TS path carries
   * per-bin pruning that Rust does not, and under rgb the Rust loop
   * wins. Measured on every combination of 96²–1024² and 64/533
   * colours, the metric decided all sixteen.
   */
  it('routes lab to ts and rgb to wasm, at every grid and palette size', () => {
    for (const grid of [96, 200, 300, 1024]) {
      for (const paletteSize of [2, 64, 533]) {
        expect(routeDither({ grid, paletteSize, metric: 'lab' })).toBe('ts');
        expect(routeDither({ grid, paletteSize, metric: 'rgb' })).toBe('wasm');
      }
    }
  });

  it('is a pure function of the workload — no startup state to go stale', () => {
    // D42's failing mode: one calibration at startup, applied forever.
    // Routing cannot drift because it holds nothing.
    const workload = { grid: 300, paletteSize: 64, metric: 'lab' as const };
    const first = routeDither(workload);
    clearSelectedBackends();
    setSelectedBackend('dither', 'wasm');
    expect(routeDither(workload)).toBe(first);
  });
});

describe('executor routing', () => {
  it('routes an rgb frame to wasm and reports the backend that ran', async () => {
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    const response = executeRequest(ditherRequest('rgb'));
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    expect(response.timings.find((t) => t.stage === 'dither')?.backend).toBe(
      'wasm',
    );
  });

  it('routes a lab frame to ts even when a selection says wasm', async () => {
    // The D42 failure this replaces: a recorded selection applied to a
    // workload it was never measured on. Routing outranks it.
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    setSelectedBackend('dither', 'wasm');
    const response = executeRequest(ditherRequest('lab'));
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    expect(response.timings.find((t) => t.stage === 'dither')?.backend).toBe(
      'ts',
    );
  });

  it('falls back to ts when the routed backend is not registered', () => {
    // rgb routes to wasm, but nothing is registered in node.
    expect(ditherStage.backends.wasm).toBeUndefined();
    const response = executeRequest(ditherRequest('rgb'));
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    expect(response.timings.find((t) => t.stage === 'dither')?.backend).toBe(
      'ts',
    );
  });
});

describe('TS fallback with both accelerated backends disabled', () => {
  it('node has no WebGPU and no wasm is registered here', () => {
    expect(isWebGpuAvailable()).toBe(false);
    expect(ditherStage.backends.wasm).toBeUndefined();
  });

  it('a stale wasm selection still runs (and reports) ts', () => {
    setSelectedBackend('dither', 'wasm'); // stale: nothing registered
    const response = executeRequest(ditherRequest());
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    const dither = response.timings.find((timing) => timing.stage === 'dither');
    expect(dither?.backend).toBe('ts');
    // And the output is real: every pixel quantised to the palette.
    const out = new Uint8ClampedArray(response.pixels);
    for (let i = 0; i < out.length; i += 4) {
      expect([0, 255]).toContain(out[i]);
    }
  });

  it('ensureLut without WebGPU resolves the TS-built LUT', async () => {
    clearLutCache();
    const lut = await ensureLut(PALETTE, 'rgb');
    expect(Array.from(lut)).toEqual(Array.from(buildLut(PALETTE, 'rgb')));
  });
});
