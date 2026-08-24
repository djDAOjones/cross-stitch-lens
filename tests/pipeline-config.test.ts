/**
 * Pipeline config → stage list: both §7 order presets, full-RGB mode,
 * dither-replaces-reduce, and LUT injection.
 */

import { describe, expect, it } from 'vitest';

import {
  adjustIsIdentity,
  defaultAdjust,
  type AdjustParams,
} from '../src/core/pipeline/adjust.ts';
import {
  buildStages,
  DEFAULT_DITHER,
  fullRgbVariant,
  type DitherConfig,
  type PipelineConfig,
} from '../src/core/pipeline/config.ts';
import type { DitherParams } from '../src/core/pipeline/dither.ts';
import type { Palette } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    thread('K', 'black', [0, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
  ],
};

const FS: DitherConfig = { ...DEFAULT_DITHER };

function config(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    preset: 'resize-first',
    grid: { width: 8, height: 8 },
    resizeMode: 'stretch',
    palette: PALETTE,
    metric: 'lab',
    dither: { algorithm: 'none' },
    ...overrides,
  };
}

function names(c: PipelineConfig): string[] {
  return buildStages(c).map((s) => s.stage.name);
}

describe('pipeline config builder', () => {
  // The adjust stage is omitted while it is the identity (M5-PERF-25):
  // it is a named slot in the order, not a stage that must run to
  // produce a clone. Since ADJUST-01 its params are real, and it
  // returns by itself — `adjust stage placement` below pins that.
  it('resize-first preset: resize → reduce', () => {
    expect(names(config())).toEqual(['resize', 'reduce']);
  });

  it('reduce-first preset: reduce → resize', () => {
    expect(names(config({ preset: 'reduce-first' }))).toEqual(['reduce', 'resize']);
  });

  it('dither replaces reduce as the quantiser in both presets', () => {
    expect(names(config({ dither: FS }))).toEqual(['resize', 'dither']);
    expect(names(config({ dither: FS, preset: 'reduce-first' }))).toEqual([
      'dither',
      'resize',
    ]);
  });

  it('every M8 algorithm builds the dither stage with its own params', () => {
    const configs: Exclude<DitherConfig, { algorithm: 'none' }>[] = [
      { algorithm: 'atkinson', serpentine: false, strength: 0.5 },
      { algorithm: 'jarvis', serpentine: true, strength: 1 },
      { algorithm: 'ordered', strength: 1.5 },
      { algorithm: 'blue-noise', strength: 1 },
    ];
    for (const dither of configs) {
      const stages = buildStages(config({ dither }));
      expect(stages.map((s) => s.stage.name)).toEqual(['resize', 'dither']);
      const params = stages[1]?.params as DitherParams;
      expect(params.algorithm).toBe(dither.algorithm);
      expect(params.strength).toBe(dither.strength);
      expect(params.serpentine).toBe('serpentine' in dither ? dither.serpentine : false);
    }
  });

  it('full-RGB mode (palette null) runs no colour stage', () => {
    expect(names(config({ palette: null }))).toEqual(['resize']);
    expect(names(config({ palette: null, dither: FS }))).toEqual(['resize']);
  });

  it('every emitted stage allocates its own output — the ownership invariant', () => {
    // Dropping the identity adjust is only safe while nothing can hand
    // back a buffer aliasing its input: the worker retains the request
    // buffer as `lastFrame` for the split compare and transfers the
    // response, so an alias would detach a buffer still in use (M5B).
    for (const c of [
      config(),
      config({ dither: FS }),
      config({ palette: null }),
      config({ preset: 'reduce-first' }),
      config({ adjust: { curve: [{ in: 10, out: 0 }, { in: 50, out: 50 }, { in: 90, out: 100 }], saturation: 0 } }),
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
    const variant = fullRgbVariant(config({ dither: FS, resizeMode: 'contain' }));
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

describe('swap stage placement (ICE-RECOLOUR-01)', () => {
  const RED = thread('R', 'red', [255, 0, 0]);
  const swaps = [{ from: PALETTE.entries[0]?.id ?? '', to: RED }];

  it('follows the quantiser in both presets, for reduce and for dither', () => {
    expect(names(config({ swaps }))).toEqual(['resize', 'reduce', 'swap']);
    expect(names(config({ swaps, dither: FS }))).toEqual(['resize', 'dither', 'swap']);
    // Under reduce-first the swap runs at source resolution too, before
    // the resize that drops the sidecar — as the colour stage does.
    expect(names(config({ swaps, preset: 'reduce-first' }))).toEqual(['reduce', 'swap', 'resize']);
  });

  it('is omitted while it could change nothing — absent, empty, dangling or a self-swap (empty)', () => {
    expect(names(config())).toEqual(['resize', 'reduce']);
    expect(names(config({ swaps: [] }))).toEqual(['resize', 'reduce']);
    expect(names(config({ swaps: [{ from: 'test:nope', to: RED }] }))).toEqual(['resize', 'reduce']);
    const black = PALETTE.entries[0];
    if (black === undefined) throw new Error('fixture');
    expect(names(config({ swaps: [{ from: black.id, to: black }] }))).toEqual(['resize', 'reduce']);
  });

  it('carries the render palette and map as its params', () => {
    const stage = buildStages(config({ swaps })).find((s) => s.stage.name === 'swap');
    const params = stage?.params as { palette: Palette; map: Uint16Array } | undefined;
    expect(params?.palette.entries.map((e) => e.id)).toEqual([...PALETTE.entries.map((e) => e.id), RED.id]);
    expect([...(params?.map ?? [])]).toEqual([2, 1]);
  });

  it('the full-RGB variant drops the swaps with the palette', () => {
    const variant = fullRgbVariant(config({ swaps }));
    expect(variant.swaps).toEqual([]);
    expect(names(variant)).toEqual(['resize']);
  });

  it('allocates its own output like every other stage (the ownership invariant)', () => {
    const stages = buildStages(config({ swaps }));
    const input = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(120) };
    let buffer = input;
    for (const s of stages) {
      const out = (s.stage.backends.ts as (b: typeof input, p: unknown) => typeof input)(buffer, s.params);
      expect(out.data.buffer).not.toBe(buffer.data.buffer);
      buffer = out;
    }
  });
});

describe('adjust stage placement (M5-PERF-25, ADJUST-01)', () => {
  const PUNCH: AdjustParams = {
    curve: [
      { in: 8, out: 0 },
      { in: 50, out: 48 },
      { in: 92, out: 100 },
    ],
    saturation: 1.2,
  };

  it('reports identity for absent and default params, not for real ones', () => {
    expect(adjustIsIdentity(undefined)).toBe(true);
    expect(adjustIsIdentity(defaultAdjust())).toBe(true);
    // Either half alone is enough to wake the stage.
    expect(adjustIsIdentity({ ...defaultAdjust(), saturation: 0.6 })).toBe(false);
    expect(adjustIsIdentity(PUNCH)).toBe(false);
  });

  it('is omitted while it could change nothing, and leads the order once it can', () => {
    // Guards the wiring, not just the predicate: if buildStages ever
    // hard-codes the omission, this catches it.
    expect(names(config())).toEqual(['resize', 'reduce']);
    expect(names(config({ adjust: defaultAdjust() }))).toEqual(['resize', 'reduce']);
    // §7: adjust runs before the resize, in both order presets.
    expect(names(config({ adjust: PUNCH }))).toEqual(['adjust', 'resize', 'reduce']);
    expect(names(config({ adjust: PUNCH, preset: 'reduce-first' }))).toEqual([
      'adjust',
      'reduce',
      'resize',
    ]);
  });

  it('carries its params through to the stage instance', () => {
    const stage = buildStages(config({ adjust: PUNCH })).find((s) => s.stage.name === 'adjust');
    expect(stage?.params).toEqual(PUNCH);
  });

  it('rides the full-RGB variant — the selection source is the adjusted picture', () => {
    // The CREATIVE-01 slice-2 engine note: this twin is what the
    // colour-count selection reads, so dropping the adjustment here
    // would select threads for a picture the design never renders.
    const variant = fullRgbVariant(config({ adjust: PUNCH, dither: FS }));
    expect(variant.adjust).toEqual(PUNCH);
    expect(names(variant)).toEqual(['adjust', 'resize']);
  });

  it('applies without a palette — adjustments change the picture, not the threads', () => {
    expect(names(config({ adjust: PUNCH, palette: null }))).toEqual(['adjust', 'resize']);
  });
});
