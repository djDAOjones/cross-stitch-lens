/**
 * Hello-world pipeline test — the M0 acceptance test. Proves the
 * golden harness (fixture load/compare), the pipeline executor, and
 * the stage-purity invariants end-to-end on the identity stage.
 */

import { describe, expect, it } from 'vitest';

import { identityStage } from '../src/core/pipeline/identity.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { stageInstance } from '../src/core/types.ts';
import { expectBufferMatch, loadGolden } from './helpers/golden.ts';

describe('hello-world pipeline (identity stage)', () => {
  it('matches the golden fixture exactly (tolerance 0)', () => {
    const input = loadGolden('hello-4x4.input');
    const output = runPipeline(input, [stageInstance(identityStage, {})]);
    expectBufferMatch(output, loadGolden('hello-4x4.expected'), 0);
  });

  it('never mutates or returns its input buffer (stage purity)', () => {
    const input = loadGolden('hello-4x4.input');
    const before = Array.from(input.data);

    const output = runPipeline(input, [stageInstance(identityStage, {})]);

    expect(output.data).not.toBe(input.data);
    expect(Array.from(input.data)).toEqual(before);
  });

  it('yields a caller-owned copy even with zero stages', () => {
    const input = loadGolden('hello-4x4.input');
    const output = runPipeline(input, []);
    expect(output.data).not.toBe(input.data);
    expectBufferMatch(output, input, 0);
  });

  it('falls back to the ts reference when a backend is unavailable', () => {
    const input = loadGolden('hello-4x4.input');
    const output = runPipeline(input, [
      stageInstance(identityStage, {}, 'wasm'),
    ]);
    expectBufferMatch(output, loadGolden('hello-4x4.expected'), 0);
  });
});
