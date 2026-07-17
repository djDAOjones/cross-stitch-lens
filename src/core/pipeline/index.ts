/**
 * Minimal pipeline executor (M0). Real stages (resize, reduce, dither)
 * arrive in M1; this establishes the contract the golden harness and
 * later backends build on: pure stages, explicit backend selection,
 * TS reference always present.
 */

import type { Backend, PixelBuffer, StageInstance } from '../types.ts';

/** Return a deep copy of a buffer (stages never mutate their input). */
export function clonePixelBuffer(buffer: PixelBuffer): PixelBuffer {
  return {
    width: buffer.width,
    height: buffer.height,
    data: new Uint8ClampedArray(buffer.data),
  };
}

/**
 * Run the configured stages in order over `input`.
 *
 * Backend resolution: an instance's requested backend when that
 * implementation exists, else the mandatory 'ts' reference — the
 * automatic-fallback rule (architecture.md → "Stage backends").
 */
export function runPipeline(
  input: PixelBuffer,
  stages: readonly StageInstance[],
): PixelBuffer {
  let current = input;
  for (const instance of stages) {
    const requested: Backend = instance.backend ?? 'ts';
    const fn = instance.stage.backends[requested] ?? instance.stage.backends.ts;
    current = fn(current, instance.params);
  }
  // Zero stages still yields a fresh buffer: callers may always treat
  // the result as theirs to transfer or mutate.
  return current === input ? clonePixelBuffer(input) : current;
}
