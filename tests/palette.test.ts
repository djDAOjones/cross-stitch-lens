/**
 * Palette model over the generated DMC data (owner thread map).
 * Mirrors the invariants build-palette.mjs guarantees, so a bad
 * regeneration is caught here too.
 */

import { describe, expect, it } from 'vitest';

import { loadDmcPalette, paletteLab, paletteRgb } from '../src/core/palette.ts';

describe('DMC palette', () => {
  const palette = loadDmcPalette();

  it('loads all 533 colours with unique codes', () => {
    expect(palette.entries.length).toBe(533);
    const codes = new Set(palette.entries.map((e) => e.code));
    expect(codes.size).toBe(palette.entries.length);
  });

  it('has the anchor colours White and 310 (black)', () => {
    expect(palette.entries.some((e) => e.code === 'White')).toBe(true);
    expect(palette.entries.some((e) => e.code === '310')).toBe(true);
  });

  it('hex and rgb agree for every entry', () => {
    for (const entry of palette.entries) {
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(parseInt(entry.hex.slice(1, 3), 16)).toBe(entry.rgb[0]);
      expect(parseInt(entry.hex.slice(3, 5), 16)).toBe(entry.rgb[1]);
      expect(parseInt(entry.hex.slice(5, 7), 16)).toBe(entry.rgb[2]);
    }
  });

  it('flattens to aligned typed arrays (rgb and Lab)', () => {
    const rgb = paletteRgb(palette);
    const lab = paletteLab(palette);
    expect(rgb.length).toBe(palette.entries.length * 3);
    expect(lab.length).toBe(palette.entries.length * 3);
    // Spot-check alignment: entry 0's rgb round-trips.
    expect(rgb[0]).toBe(palette.entries[0]?.rgb[0]);
    // L* is in range for every entry.
    for (let i = 0; i < palette.entries.length; i++) {
      expect(lab[i * 3] ?? NaN).toBeGreaterThanOrEqual(0);
      expect(lab[i * 3] ?? NaN).toBeLessThanOrEqual(100);
    }
  });
});
