/**
 * Pipeline config → stage list: both §7 order presets, full-RGB mode,
 * dither-replaces-reduce, and LUT injection.
 */

import { describe, expect, it } from 'vitest';

import {
  buildStages,
  fullRgbVariant,
  type PipelineConfig,
} from '../src/core/pipeline/config.ts';
import type { Palette } from '../src/core/types.ts';

const PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    { code: 'K', name: 'black', hex: '#000000', rgb: [0, 0, 0], manufacturer: 'test' },
    { code: 'W', name: 'white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
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
  it('resize-first preset: adjust → resize → reduce', () => {
    expect(names(config())).toEqual(['adjust', 'resize', 'reduce']);
  });

  it('reduce-first preset: adjust → reduce → resize', () => {
    expect(names(config({ preset: 'reduce-first' }))).toEqual([
      'adjust',
      'reduce',
      'resize',
    ]);
  });

  it('dither replaces reduce as the quantiser in both presets', () => {
    expect(names(config({ dither: true }))).toEqual(['adjust', 'resize', 'dither']);
    expect(names(config({ dither: true, preset: 'reduce-first' }))).toEqual([
      'adjust',
      'dither',
      'resize',
    ]);
  });

  it('full-RGB mode (palette null) runs no colour stage', () => {
    expect(names(config({ palette: null }))).toEqual(['adjust', 'resize']);
    expect(names(config({ palette: null, dither: true }))).toEqual([
      'adjust',
      'resize',
    ]);
  });

  it('full-RGB variant keeps geometry and drops every colour stage', () => {
    const variant = fullRgbVariant(config({ dither: true, resizeMode: 'contain' }));
    expect(variant.palette).toBeNull();
    expect(variant.grid).toEqual({ width: 8, height: 8 });
    expect(variant.resizeMode).toBe('contain');
    expect(variant.preset).toBe('resize-first');
    expect(names(variant)).toEqual(['adjust', 'resize']);
  });

  it('injects the provided LUT into the reduce params', () => {
    const lut = new Uint16Array(32768);
    const stages = buildStages(config(), () => lut);
    const reduce = stages.find((s) => s.stage.name === 'reduce');
    expect((reduce?.params as { lut?: Uint16Array }).lut).toBe(lut);
  });
});
