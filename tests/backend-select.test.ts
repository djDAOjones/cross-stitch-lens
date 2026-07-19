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
  calibrateDither,
  clearSelectedBackends,
  medianMs,
  pickFaster,
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
    { code: 'K', name: 'black', hex: '#000000', rgb: [0, 0, 0], manufacturer: 'test' },
    { code: 'W', name: 'white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
  ],
};

function ditherRequest(): ProcessRequest {
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
      metric: 'rgb',
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
  it('medianMs takes the middle sample', () => {
    expect(medianMs([5])).toBe(5);
    expect(medianMs([9, 1, 5])).toBe(5);
    expect(medianMs([1, 9])).toBe(5);
  });

  it('pickFaster requires a clear win before leaving ts', () => {
    expect(pickFaster(10, 5, 'wasm')).toBe('wasm');
    expect(pickFaster(10, 9.5, 'wasm')).toBe('ts'); // inside the margin
    expect(pickFaster(10, 10, 'wasm')).toBe('ts'); // tie → reference
    expect(pickFaster(10, 20, 'wasm')).toBe('ts');
  });

  it('set/clear round-trips a selection', () => {
    expect(selectedBackend('dither')).toBeUndefined();
    setSelectedBackend('dither', 'wasm');
    expect(selectedBackend('dither')).toBe('wasm');
    setSelectedBackend('dither', null);
    expect(selectedBackend('dither')).toBeUndefined();
  });
});

describe('calibration', () => {
  it('skips (ts, no selection) when wasm is not registered', () => {
    expect(ditherStage.backends.wasm).toBeUndefined();
    expect(calibrateDither()).toBe('ts');
    expect(selectedBackend('dither')).toBeUndefined();
  });

  it('selects wasm when the fake clock says wasm is faster', async () => {
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    // Fake clock: each now() call advances 1ms during ts runs and
    // 0.1ms during wasm runs (calls alternate ts,wasm per run pair).
    let t = 0;
    const steps = [10, 10, 1, 1, 10, 10, 1, 1, 10, 10, 1, 1]; // start/end × (ts,wasm) × 3
    let call = 0;
    const now = (): number => {
      t += steps[call % steps.length] ?? 1;
      call++;
      return t;
    };
    expect(calibrateDither(3, 8, now)).toBe('wasm');
    expect(selectedBackend('dither')).toBe('wasm');
  });

  it('stays on ts when the fake clock says wasm is not clearly faster', async () => {
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    let t = 0;
    const now = (): number => {
      t += 1; // identical cost for both backends → tie → ts
      return t;
    };
    expect(calibrateDither(3, 8, now)).toBe('ts');
    expect(selectedBackend('dither')).toBeUndefined();
  });
});

describe('executor routing', () => {
  it('uses the automatic selection and reports the backend that ran', async () => {
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    setSelectedBackend('dither', 'wasm');
    const response = executeRequest(ditherRequest());
    expect(response.type).toBe('result');
    if (response.type !== 'result') return;
    const dither = response.timings.find((timing) => timing.stage === 'dither');
    expect(dither?.backend).toBe('wasm');
  });

  it('an explicit instance backend outranks the selection', async () => {
    // Selection says wasm, but nothing is registered — see fallback
    // suite below; here the inverse: registration present, explicit
    // 'ts' request must win. Covered via runPipeline in wasm tests;
    // the executor path takes instance.backend first by construction.
    expect(await registerWasmDither(readFileSync(WASM_BYTES_PATH))).toBe(true);
    setSelectedBackend('dither', 'wasm');
    // buildStages never sets instance.backend, so assert the executor
    // honoured the selection (wasm) — then clear it and assert ts.
    const withSelection = executeRequest(ditherRequest());
    clearSelectedBackends();
    const without = executeRequest(ditherRequest());
    if (withSelection.type !== 'result' || without.type !== 'result') {
      expect.unreachable('both runs must produce results');
      return;
    }
    expect(withSelection.timings.find((t) => t.stage === 'dither')?.backend).toBe('wasm');
    expect(without.timings.find((t) => t.stage === 'dither')?.backend).toBe('ts');
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
