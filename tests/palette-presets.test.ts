/**
 * Built-in colour-scheme presets (M7-PRESET-01).
 *
 * Presets are algorithmic and labelled as such, so what is testable is
 * *semantics*, not taste: every resolved reference must be real and
 * belong to an enabled brand, disabling a brand must visibly shrink the
 * preset rather than silently re-enable it, and the rule must be stable
 * enough that a saved id keeps meaning the same thing.
 */

import { describe, expect, it } from 'vitest';

import {
  findPreset,
  PRESETS,
  PRESET_SCHEMA_VERSION,
  resolvePreset,
  rgbToLch,
} from '../src/core/palette-presets.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';

const catalogue = loadCatalogue();

describe('rgbToLch', () => {
  it('puts greys at zero chroma and maps the lightness poles', () => {
    expect(rgbToLch(128, 128, 128).c).toBeLessThan(0.5);
    expect(rgbToLch(255, 255, 255).l).toBeCloseTo(100, 1);
    expect(rgbToLch(0, 0, 0).l).toBeCloseTo(0, 1);
  });

  it('returns hue in 0–360 for every quadrant', () => {
    for (const rgb of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ] as [number, number, number][]) {
      const { h } = rgbToLch(rgb[0], rgb[1], rgb[2]);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });
});

describe('preset definitions', () => {
  it('every preset has a stable id, a name, and a stated rule', () => {
    expect(PRESETS.length).toBeGreaterThan(0);
    const ids = new Set(PRESETS.map((p) => p.id));
    expect(ids.size).toBe(PRESETS.length);
    for (const preset of PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      // The rule is user-facing copy: a preset that cannot say how it
      // chose is a preset claiming curation it does not have.
      expect(preset.rule.length).toBeGreaterThan(10);
    }
    expect(PRESET_SCHEMA_VERSION).toBe(1);
  });

  it('finds a preset by id and misses cleanly', () => {
    expect(findPreset('neutral')?.name).toBe('Neutrals');
    expect(findPreset('nope')).toBeUndefined();
  });
});

describe('resolvePreset', () => {
  it('resolves only to real threads of the enabled brands', () => {
    for (const preset of PRESETS) {
      const resolved = resolvePreset(preset, catalogue, ['dmc'], 'strict');
      expect(resolved.threadIds.length).toBeGreaterThan(0);
      for (const id of resolved.threadIds) {
        const thread = catalogue.byId.get(id);
        expect(thread).toBeDefined();
        expect(thread?.brandId).toBe('dmc');
      }
    }
  });

  it('is deterministic and follows catalogue order', () => {
    const preset = findPreset('pastel');
    expect(preset).toBeDefined();
    if (preset === undefined) return;
    const a = resolvePreset(preset, catalogue, ['dmc'], 'strict');
    const b = resolvePreset(preset, catalogue, ['dmc'], 'strict');
    expect(a.threadIds).toEqual(b.threadIds);
    const order = catalogue.threads.map((t) => t.id);
    const positions = a.threadIds.map((id) => order.indexOf(id));
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
  });

  it('shrinks visibly when a brand is disabled, never re-enabling it', () => {
    const preset = findPreset('neutral');
    expect(preset).toBeDefined();
    if (preset === undefined) return;
    const both = resolvePreset(preset, catalogue, ['dmc', 'anchor'], 'strict');
    const dmcOnly = resolvePreset(preset, catalogue, ['dmc'], 'strict');
    expect(dmcOnly.threadIds.length).toBeLessThan(both.threadIds.length);
    expect(dmcOnly.threadIds.every((id) => id.startsWith('dmc:'))).toBe(true);
  });

  it('resolves to nothing when no brand is enabled', () => {
    const preset = findPreset('deep');
    expect(preset).toBeDefined();
    if (preset === undefined) return;
    expect(resolvePreset(preset, catalogue, [], 'strict').threadIds).toEqual([]);
  });

  it('carries the application mode through unchanged', () => {
    const preset = findPreset('earth');
    expect(preset).toBeDefined();
    if (preset === undefined) return;
    expect(resolvePreset(preset, catalogue, ['dmc'], 'prefer').mode).toBe('prefer');
    expect(resolvePreset(preset, catalogue, ['dmc'], 'strict').mode).toBe('strict');
  });

  it('picks sets that match their stated rule', () => {
    const neutral = findPreset('neutral');
    const deepShades = findPreset('deep');
    expect(neutral).toBeDefined();
    expect(deepShades).toBeDefined();
    if (neutral === undefined || deepShades === undefined) return;

    for (const id of resolvePreset(neutral, catalogue, ['dmc'], 'strict').threadIds) {
      const rgb = catalogue.byId.get(id)?.rgb ?? [0, 0, 0];
      expect(rgbToLch(rgb[0], rgb[1], rgb[2]).c).toBeLessThanOrEqual(8);
    }
    for (const id of resolvePreset(deepShades, catalogue, ['dmc'], 'strict').threadIds) {
      const rgb = catalogue.byId.get(id)?.rgb ?? [0, 0, 0];
      expect(rgbToLch(rgb[0], rgb[1], rgb[2]).l).toBeLessThanOrEqual(35);
    }
  });
});
