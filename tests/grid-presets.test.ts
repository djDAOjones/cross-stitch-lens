/**
 * Built-in grid presets (M11). Presets are in-code data, so these
 * tests are their signing: ids stay unique and stable, every value
 * sits inside the schema validator's bounds (a preset the project
 * file would refuse to round-trip is a defect), "Every 10" stays
 * byte-equal to the defaults (the migration-labelling identity), and
 * exact matching never confuses neighbours.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_GRID_VALUES, type GridStyleValues } from '../src/core/grid-style.ts';
import {
  GRID_PRESETS,
  gridPresetById,
  matchGridPreset,
} from '../src/core/grid-presets.ts';

/** The schema bounds for one style block (project.ts validator). */
function expectWithinSchemaBounds(values: GridStyleValues): void {
  expect(values.minorInterval).toBeGreaterThanOrEqual(1);
  expect(values.minorInterval).toBeLessThanOrEqual(1000);
  expect(values.majorInterval).toBeGreaterThanOrEqual(0);
  expect(values.majorInterval).toBeLessThanOrEqual(1000);
  expect(values.color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(values.majorColor).toMatch(/^#[0-9a-f]{6}$/i);
  expect(values.borderColor).toMatch(/^#[0-9a-f]{6}$/i);
  expect(values.minorThickness).toBeGreaterThanOrEqual(1);
  expect(values.minorThickness).toBeLessThanOrEqual(16);
  expect(values.majorThickness).toBeGreaterThanOrEqual(1);
  expect(values.majorThickness).toBeLessThanOrEqual(16);
  expect(values.opacity).toBeGreaterThanOrEqual(0);
  expect(values.opacity).toBeLessThanOrEqual(1);
  expect(values.borderThickness).toBeGreaterThanOrEqual(0);
  expect(values.borderThickness).toBeLessThanOrEqual(16);
  expect(values.tickFontPx).toBeGreaterThanOrEqual(4);
  expect(values.tickFontPx).toBeLessThanOrEqual(96);
}

describe('GRID_PRESETS', () => {
  it('has six presets with unique stable ids', () => {
    expect(GRID_PRESETS.map((p) => p.id)).toEqual([
      'no-grid',
      'fine',
      'every-5',
      'every-10',
      'traditional',
      'high-contrast-print',
    ]);
  });

  it('keeps every half of every preset inside the schema bounds', () => {
    for (const preset of GRID_PRESETS) {
      expectWithinSchemaBounds(preset.screen);
      expectWithinSchemaBounds(preset.print);
    }
  });

  it('keeps "Every 10" byte-equal to the defaults on both halves', () => {
    const preset = gridPresetById('every-10');
    expect(preset?.screen).toEqual(DEFAULT_GRID_VALUES);
    expect(preset?.print).toEqual(DEFAULT_GRID_VALUES);
  });

  it('looks up presets by id and misses unknowns quietly', () => {
    expect(gridPresetById('traditional')?.label).toBe('Traditional');
    expect(gridPresetById('nope')).toBeUndefined();
  });
});

describe('matchGridPreset', () => {
  it('labels untouched defaults as Every 10 (the migration identity)', () => {
    expect(matchGridPreset({ ...DEFAULT_GRID_VALUES }, { ...DEFAULT_GRID_VALUES })).toBe(
      'every-10',
    );
  });

  it('matches every preset against its own halves', () => {
    for (const preset of GRID_PRESETS) {
      expect(matchGridPreset({ ...preset.screen }, { ...preset.print })).toBe(preset.id);
    }
  });

  it('returns null when either half drifts by one field', () => {
    const preset = gridPresetById('traditional');
    if (preset === undefined) throw new Error('preset missing');
    expect(matchGridPreset({ ...preset.screen, opacity: 0.9 }, { ...preset.print })).toBeNull();
    expect(
      matchGridPreset({ ...preset.screen }, { ...preset.print, tickFontPx: 20 }),
    ).toBeNull();
  });
});
