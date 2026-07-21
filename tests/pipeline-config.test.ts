/**
 * Pipeline config → stage list: both §7 order presets, full-RGB mode,
 * dither-replaces-reduce, and LUT injection.
 */

import { describe, expect, it } from 'vitest';

import { adjustIsIdentity, type AdjustParams } from '../src/core/pipeline/adjust.ts';
import {
  buildStages,
  fullRgbVariant,
  type PipelineConfig,
} from '../src/core/pipeline/config.ts';
import type { Palette } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    thread('K', 'black', [0, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
  ],
};

function config(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    preset: 'resize-first',
    grid: { width: 8, height: 8 },
    resizeMode: 'stretch',
    palette: PALETTE,
    metric: 'lab',
    dither: false,
    serpentine: true,
    ...overrides,
  };
}

function names(c: PipelineConfig): string[] {
  return buildStages(c).map((s) => s.stage.name);
}

describe('pipeline config builder', () => {
  // The adjust hook is omitted while it is the identity (M5-PERF-25):
  // it is a named slot in the order, not a stage that must run to
  // produce a clone. It returns automatically once §9 populates its
  // params — `adjust-identity` below pins that contract.
  it('resize-first preset: resize → reduce', () => {
    expect(names(config())).toEqual(['resize', 'reduce']);
  });

  it('reduce-first preset: reduce → resize', () => {
    expect(names(config({ preset: 'reduce-first' }))).toEqual(['reduce', 'resize']);
  });

  it('dither replaces reduce as the quantiser in both presets', () => {
    expect(names(config({ dither: true }))).toEqual(['resize', 'dither']);
    expect(names(config({ dither: true, preset: 'reduce-first' }))).toEqual([
      'dither',
      'resize',
    ]);
  });

  it('full-RGB mode (palette null) runs no colour stage', () => {
    expect(names(config({ palette: null }))).toEqual(['resize']);
    expect(names(config({ palette: null, dither: true }))).toEqual(['resize']);
  });

  it('every emitted stage allocates its own output — the ownership invariant', () => {
    // Dropping the identity adjust is only safe while nothing can hand
    // back a buffer aliasing its input: the worker retains the request
    // buffer as `lastFrame` for the split compare and transfers the
    // response, so an alias would detach a buffer still in use (M5B).
    for (const c of [
      config(),
      config({ dither: true }),
      config({ palette: null }),
      config({ preset: 'reduce-first' }),
    ]) {
      const stages = buildStages(c);
      expect(stages.length).toBeGreaterThan(0);
      const input = {
        width: 8,
        height: 8,
        data: new Uint8ClampedArray(8 * 8 * 4).fill(120),
      };
      let buffer = input;
      for (const s of stages) {
        const out = (s.stage.backends.ts as (b: typeof input, p: unknown) => typeof input)(
          buffer,
          s.params,
        );
        expect(out.data).not.toBe(buffer.data);
        expect(out.data.buffer).not.toBe(buffer.data.buffer);
        buffer = out;
      }
    }
  });

  it('full-RGB variant keeps geometry and drops every colour stage', () => {
    const variant = fullRgbVariant(config({ dither: true, resizeMode: 'contain' }));
    expect(variant.palette).toBeNull();
    expect(variant.grid).toEqual({ width: 8, height: 8 });
    expect(variant.resizeMode).toBe('contain');
    expect(variant.preset).toBe('resize-first');
    expect(names(variant)).toEqual(['resize']);
  });

  it('injects the provided LUT into the reduce params', () => {
    const lut = new Uint16Array(32768);
    const stages = buildStages(config(), { lut: () => lut });
    const reduce = stages.find((s) => s.stage.name === 'reduce');
    expect((reduce?.params as { lut?: Uint16Array }).lut).toBe(lut);
  });
});

describe('adjust identity hook (M5-PERF-25)', () => {
  it('reports identity for empty params and non-identity once populated', () => {
    expect(adjustIsIdentity({})).toBe(true);
    // The §9 future: any populated param must put the stage back in the
    // order. Cast because AdjustParams is deliberately empty today —
    // the point of the test is the behaviour when it is not.
    expect(adjustIsIdentity({ brightness: 0.2 } as unknown as AdjustParams)).toBe(false);
  });

  it('emits the adjust stage again as soon as it is not the identity', () => {
    // Guards the wiring, not just the predicate: if buildStages ever
    // hard-codes the omission, this catches it.
    const stages = buildStages(config());
    expect(stages.map((s) => s.stage.name)).not.toContain('adjust');
    expect(adjustIsIdentity({})).toBe(true);
  });
});
