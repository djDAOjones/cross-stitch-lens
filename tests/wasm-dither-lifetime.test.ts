/**
 * WASM dither: the Rust handle is released exactly once (WASM-01).
 *
 * The parity suite next door proves the *values*; this proves the
 * *lifetime*, and it does so against a fake module rather than the
 * real crate for two reasons. It runs whether or not the pkg has been
 * built — a lifetime defect should not hide behind a missing Rust
 * toolchain — and a fake is the only way to make a getter throw on
 * demand, which is the case the `finally` exists for.
 *
 * `DitherResult` is a Rust-owned struct: without an explicit `free()`
 * it waits on `FinalizationRegistry`, so under a live preview the wasm
 * heap accumulates a result per frame.
 */

import { describe, expect, it, vi } from 'vitest';

import { wasmDither } from '../src/backends/wasm/dither.ts';
import { ditherStage, type DitherParams } from '../src/core/pipeline/dither.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

type WasmModule = Parameters<typeof wasmDither>[0];

const PALETTE: Palette = {
  name: 'test-rwbk',
  entries: [
    thread('R', 'red', [255, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
    thread('B', 'blue', [0, 0, 255]),
    thread('K', 'black', [0, 0, 0]),
  ],
};

const WIDTH = 2;
const HEIGHT = 2;
const CELLS = WIDTH * HEIGHT;

function input(): PixelBuffer {
  return { width: WIDTH, height: HEIGHT, data: new Uint8ClampedArray(CELLS * 4).fill(128) };
}

function params(overrides: Partial<DitherParams> = {}): DitherParams {
  return { palette: PALETTE, metric: 'rgb', serpentine: true, ...overrides };
}

/**
 * A stand-in for the generated `DitherResult`. `free` is a spy; the
 * getters are real getters so `throwOn` can make one fail the way a
 * detached-memory read would.
 */
function fakeResult(throwOn?: 'pixels' | 'indices') {
  const free = vi.fn();
  const result = {
    free,
    get pixels(): Uint8Array {
      if (throwOn === 'pixels') throw new Error('wasm memory detached');
      return new Uint8Array(CELLS * 4);
    },
    get indices(): Uint16Array {
      if (throwOn === 'indices') throw new Error('wasm memory detached');
      return new Uint16Array(CELLS);
    },
  };
  return { result, free };
}

function moduleReturning(result: unknown, calls: { n: number }): WasmModule {
  return {
    dither_floyd_steinberg: () => {
      calls.n++;
      return result;
    },
  } as unknown as WasmModule;
}

describe('wasm dither handle lifetime', () => {
  it('frees the result exactly once on success', () => {
    const { result, free } = fakeResult();
    const calls = { n: 0 };
    const out = wasmDither(moduleReturning(result, calls))(input(), params());

    expect(calls.n).toBe(1);
    expect(free).toHaveBeenCalledTimes(1);
    expect(out.width).toBe(WIDTH);
    expect(out.indices).toHaveLength(CELLS);
  });

  it('frees the result exactly once when a getter throws', () => {
    for (const failing of ['pixels', 'indices'] as const) {
      const { result, free } = fakeResult(failing);
      const run = wasmDither(moduleReturning(result, { n: 0 }));

      expect(() => run(input(), params())).toThrow('wasm memory detached');
      expect(free).toHaveBeenCalledTimes(1);
    }
  });

  it('frees once per call, not once per module', () => {
    const frees: (() => void)[] = [];
    const mod = {
      dither_floyd_steinberg: () => {
        const { result, free } = fakeResult();
        frees.push(free);
        return result;
      },
    } as unknown as WasmModule;

    const run = wasmDither(mod);
    for (let i = 0; i < 3; i++) run(input(), params());

    expect(frees).toHaveLength(3);
    for (const free of frees) expect(free).toHaveBeenCalledTimes(1);
  });

  it('allocates nothing when the request is delegated to the TS backend', () => {
    // Non-Floyd–Steinberg (or strength ≠ 1) never reaches the crate,
    // so there is no handle to free — and no silent substitution.
    const calls = { n: 0 };
    const { result, free } = fakeResult();
    const mod = moduleReturning(result, calls);
    const ts = vi.spyOn(ditherStage.backends, 'ts');

    wasmDither(mod)(input(), params({ algorithm: 'atkinson' }));

    expect(calls.n).toBe(0);
    expect(free).not.toHaveBeenCalled();
    expect(ts).toHaveBeenCalledTimes(1);
    ts.mockRestore();
  });
});
