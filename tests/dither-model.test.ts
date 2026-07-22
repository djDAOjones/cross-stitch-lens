/**
 * Dither-control model (the pure half of the M8-CTRL-01 UI): the
 * algorithm → control-family mapping that decides which controls
 * exist, per-family strength semantics, preset definitions and their
 * evidence discipline, custom-state detection, and the per-method
 * session memory. DOM mounting is verified in the running app
 * (convention: UI logic that matters is extracted and tested pure).
 */

import { describe, expect, it } from 'vitest';

import type { DitherConfig } from '../src/core/pipeline/config.ts';
import {
  ALGORITHM_OPTIONS,
  configForChoice,
  CUSTOM_PRESET,
  DITHER_PRESETS,
  familyOf,
  percentToStrength,
  presetConfig,
  presetFor,
  remember,
  sameDither,
  strengthBounds,
  strengthToPercent,
  type DitherMemory,
} from '../src/ui/dither-model.ts';

describe('control families (D61 control surface)', () => {
  it('maps every selector choice to the family that owns its controls', () => {
    expect(familyOf('none')).toBe('none');
    expect(familyOf('floyd-steinberg')).toBe('diffusion');
    expect(familyOf('atkinson')).toBe('diffusion');
    expect(familyOf('jarvis')).toBe('diffusion');
    expect(familyOf('ordered')).toBe('threshold');
    expect(familyOf('blue-noise')).toBe('threshold');
  });

  it('offers exactly the committed set, none first', () => {
    expect(ALGORITHM_OPTIONS.map(([id]) => id)).toEqual([
      'none',
      'floyd-steinberg',
      'atkinson',
      'jarvis',
      'ordered',
      'blue-noise',
    ]);
  });

  it('gives each family its own strength range and meaning', () => {
    const diffusion = strengthBounds('diffusion');
    const threshold = strengthBounds('threshold');
    expect(diffusion.max).toBe(100);
    expect(threshold.max).toBe(200);
    expect(diffusion.helper).not.toBe(threshold.helper);
  });

  it('round-trips strength through the percentage control', () => {
    for (const strength of [0, 0.5, 0.6, 1, 1.75, 2]) {
      expect(percentToStrength(strengthToPercent(strength))).toBeCloseTo(strength, 10);
    }
  });
});

describe('presets (M8-CTRL-01 preset contract)', () => {
  it('every preset resolves to a config the schema accepts', () => {
    for (const preset of DITHER_PRESETS) {
      const config = preset.config;
      if (config.algorithm === 'none') continue;
      if ('serpentine' in config) {
        expect(config.strength).toBeGreaterThanOrEqual(0);
        expect(config.strength).toBeLessThanOrEqual(1);
      } else {
        expect(config.strength).toBeGreaterThanOrEqual(0);
        expect(config.strength).toBeLessThanOrEqual(2);
      }
    }
  });

  it('every preset carries its evidence line — no invented labels', () => {
    for (const preset of DITHER_PRESETS) {
      expect(preset.basis.length, preset.id).toBeGreaterThan(10);
    }
  });

  it('preset ids are unique and none of them is "custom"', () => {
    const ids = DITHER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(CUSTOM_PRESET);
  });

  it('applying a preset then reading it back lands on the same preset', () => {
    for (const preset of DITHER_PRESETS) {
      const applied = presetConfig(preset.id);
      expect(applied).not.toBeNull();
      expect(presetFor(applied as DitherConfig)).toBe(preset.id);
    }
  });

  it('an edit after a preset lands the selector on Custom', () => {
    const balanced = presetConfig('balanced');
    expect(balanced).not.toBeNull();
    if (balanced === null || balanced.algorithm === 'none') throw new Error('unexpected');
    expect(presetFor({ ...balanced, strength: 0.9 })).toBe(CUSTOM_PRESET);
  });

  it('unknown preset ids resolve to null, never to a different method', () => {
    expect(presetConfig('smooth-gradient')).toBeNull();
    expect(presetConfig(CUSTOM_PRESET)).toBeNull();
  });

  it('presets return copies — applying one twice cannot alias state', () => {
    const a = presetConfig('subtle');
    const b = presetConfig('subtle');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('sameDither', () => {
  it('compares the union structurally, per family', () => {
    expect(sameDither({ algorithm: 'none' }, { algorithm: 'none' })).toBe(true);
    expect(
      sameDither(
        { algorithm: 'atkinson', serpentine: true, strength: 1 },
        { algorithm: 'atkinson', serpentine: true, strength: 1 },
      ),
    ).toBe(true);
    expect(
      sameDither(
        { algorithm: 'atkinson', serpentine: true, strength: 1 },
        { algorithm: 'atkinson', serpentine: false, strength: 1 },
      ),
    ).toBe(false);
    expect(
      sameDither({ algorithm: 'ordered', strength: 1 }, { algorithm: 'ordered', strength: 1.5 }),
    ).toBe(false);
    expect(
      sameDither({ algorithm: 'ordered', strength: 1 }, { algorithm: 'blue-noise', strength: 1 }),
    ).toBe(false);
  });
});

describe('per-method session memory', () => {
  it('remembers each method independently and restores it on reselect', () => {
    let memory: DitherMemory = {};
    memory = remember(memory, { algorithm: 'atkinson', serpentine: false, strength: 0.3 });
    memory = remember(memory, { algorithm: 'ordered', strength: 1.5 });
    expect(configForChoice('atkinson', memory)).toEqual({
      algorithm: 'atkinson',
      serpentine: false,
      strength: 0.3,
    });
    expect(configForChoice('ordered', memory)).toEqual({ algorithm: 'ordered', strength: 1.5 });
  });

  it('never remembers the none state', () => {
    const memory = remember({}, { algorithm: 'none' });
    expect(Object.keys(memory)).toEqual([]);
  });

  it('falls back to full-strength defaults for a method never used', () => {
    expect(configForChoice('jarvis', {})).toEqual({
      algorithm: 'jarvis',
      serpentine: true,
      strength: 1,
    });
    expect(configForChoice('blue-noise', {})).toEqual({
      algorithm: 'blue-noise',
      strength: 1,
    });
    expect(configForChoice('none', {})).toEqual({ algorithm: 'none' });
  });

  it('returns copies, so editing the active config cannot rewrite memory', () => {
    const stored: DitherConfig = { algorithm: 'jarvis', serpentine: true, strength: 0.8 };
    const memory = remember({}, stored);
    const restored = configForChoice('jarvis', memory);
    expect(restored).toEqual(stored);
    expect(restored).not.toBe(stored);
  });
});
