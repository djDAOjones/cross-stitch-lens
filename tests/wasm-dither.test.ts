/**
 * WASM dither backend: registration through the real adapter, then
 * bit-exact parity vs the TS reference (AGENTS.md: deterministic
 * stages must match exactly, tolerance 0) — the committed golden
 * fixture, both metrics, both scan modes, the full 533-colour DMC
 * palette under CIELAB (the libm-parity bet, decision-log D39), and
 * alpha passthrough. Skips (visibly) when the pkg has not been built;
 * the gate runs check:wasm before check:test so a toolchain-equipped
 * machine and CI always execute it.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { registerWasmDither } from '../src/backends/wasm/dither.ts';
import { loadDmcPalette } from '../src/core/palette.ts';
import { ditherStage, type DitherParams } from '../src/core/pipeline/dither.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { stageInstance } from '../src/core/types.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import { expectBufferMatch, loadGolden } from './helpers/golden.ts';

const WASM_BYTES_PATH = fileURLToPath(
  new URL('../crates/stitch-engine/pkg/stitch_engine_bg.wasm', import.meta.url),
);
const PKG_BUILT = existsSync(WASM_BYTES_PATH);

const TEST_PALETTE: Palette = {
  name: 'test-rwbk',
  entries: [
    { code: 'R', name: 'red', hex: '#ff0000', rgb: [255, 0, 0], manufacturer: 'test' },
    { code: 'W', name: 'white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
    { code: 'B', name: 'blue', hex: '#0000ff', rgb: [0, 0, 255], manufacturer: 'test' },
    { code: 'K', name: 'black', hex: '#000000', rgb: [0, 0, 0], manufacturer: 'test' },
  ],
};

function params(overrides: Partial<DitherParams> = {}): DitherParams {
  return { palette: TEST_PALETTE, metric: 'rgb', serpentine: true, ...overrides };
}

/** Deterministic pseudo-random RGBA buffer (LCG — no Math.random). */
function noiseBuffer(width: number, height: number, seed: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  let state = seed >>> 0;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = i % 4 === 3 ? 255 : state >>> 24;
  }
  return { width, height, data };
}

/** Run the dither stage on the named backend. */
function dither(input: PixelBuffer, p: DitherParams, backend: 'ts' | 'wasm'): PixelBuffer {
  return runPipeline(input, [stageInstance(ditherStage, p, backend)]);
}

describe.skipIf(!PKG_BUILT)('WASM dither backend (bit-exact vs TS)', () => {
  beforeAll(async () => {
    const registered = await registerWasmDither(readFileSync(WASM_BYTES_PATH));
    expect(registered).toBe(true);
  });

  it('registers as ditherStage.backends.wasm', () => {
    expect(ditherStage.backends.wasm).toBeDefined();
  });

  it('matches the committed golden fixture bit-exactly', () => {
    const input = loadGolden('dither-8x8.input');
    const output = dither(input, params(), 'wasm');
    expectBufferMatch(output, loadGolden('dither-8x8.expected'), 0);
  });

  it('matches TS on both metrics and both scan modes (8x8 golden input)', () => {
    const input = loadGolden('dither-8x8.input');
    for (const metric of ['rgb', 'lab'] as const) {
      for (const serpentine of [true, false]) {
        const p = params({ metric, serpentine });
        expectBufferMatch(dither(input, p, 'wasm'), dither(input, p, 'ts'), 0);
      }
    }
  });

  it('matches TS on 64x64 noise vs the full DMC palette under CIELAB', () => {
    const input = noiseBuffer(64, 64, 0xc0ffee);
    const p = params({ palette: loadDmcPalette(), metric: 'lab' });
    expectBufferMatch(dither(input, p, 'wasm'), dither(input, p, 'ts'), 0);
  });

  it('matches TS on 64x64 noise vs the full DMC palette under RGB', () => {
    const input = noiseBuffer(64, 64, 0x5eed);
    const p = params({ palette: loadDmcPalette(), metric: 'rgb', serpentine: false });
    expectBufferMatch(dither(input, p, 'wasm'), dither(input, p, 'ts'), 0);
  });

  it('passes alpha through and never mutates its input', () => {
    const input = loadGolden('dither-8x8.input');
    input.data[3] = 129;
    const before = Array.from(input.data);
    const output = dither(input, params(), 'wasm');
    expect(Array.from(input.data)).toEqual(before);
    for (let i = 3; i < input.data.length; i += 4) {
      expect(output.data[i]).toBe(input.data[i]);
    }
  });
});

describe.runIf(!PKG_BUILT)('WASM dither backend (pkg not built)', () => {
  it('skipped parity suite — run `npm run build:wasm` to enable', () => {
    expect(PKG_BUILT).toBe(false);
  });
});
