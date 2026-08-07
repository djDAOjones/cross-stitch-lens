/**
 * M15-CORE-01: the generated colour maps, the synthetic identity
 * namespaces, and exact-match colour naming. These pin identity,
 * count and ordering — a map's entry order is part of its identity
 * (D46: ordered tables are what LUT keys fingerprint), so a changed
 * generator must fail here, never drift silently.
 */

import { describe, expect, it } from 'vitest';

import {
  allColorMaps,
  COLOR_MAP_IDS,
  colorName,
  colorNameCount,
  generateColorMap,
  isSyntheticId,
  nonThreadLabel,
  userColor,
} from '../src/core/color-sources.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';

describe('generated colour maps', () => {
  it('generates deterministically — same call, same table', () => {
    for (const id of COLOR_MAP_IDS) {
      expect(generateColorMap(id)).toEqual(generateColorMap(id));
    }
  });

  it('pins the entry counts (D114 v1 set)', () => {
    const counts = Object.fromEntries(allColorMaps().map((m) => [m.id, m.entries.length]));
    expect(counts).toEqual({ bw: 2, grey4: 4, rgb1: 8, retro16: 16, rgb2: 64, websafe: 216 });
  });

  it('gives every entry a unique id across all maps', () => {
    const ids = allColorMaps().flatMap((m) => m.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pins the identity grammar: map:<mapId>:<code>', () => {
    for (const map of allColorMaps()) {
      for (const entry of map.entries) {
        expect(entry.brandId).toBe(`map:${map.id}`);
        expect(entry.id).toBe(`${entry.brandId}:${entry.reference}`);
        expect(isSyntheticId(entry.id)).toBe(true);
      }
    }
  });

  it('pins ordering: R-major ascending for the computed maps', () => {
    const websafe = generateColorMap('websafe').entries;
    expect(websafe[0]?.reference).toBe('000000');
    expect(websafe.at(-1)?.reference).toBe('FFFFFF');
    // R-major: the second entry moves the blue channel first.
    expect(websafe[1]?.rgb).toEqual([0, 0, 51]);
    const rgb2 = generateColorMap('rgb2').entries;
    expect(rgb2[0]?.rgb).toEqual([0, 0, 0]);
    expect(rgb2[1]?.rgb).toEqual([0, 0, 85]);
    expect(rgb2.at(-1)?.rgb).toEqual([255, 255, 255]);
  });

  it('pins channel values to each map’s levels', () => {
    const websafeLevels = new Set([0, 51, 102, 153, 204, 255]);
    for (const entry of generateColorMap('websafe').entries) {
      for (const channel of entry.rgb) expect(websafeLevels.has(channel)).toBe(true);
    }
    const rgb2Levels = new Set([0, 85, 170, 255]);
    for (const entry of generateColorMap('rgb2').entries) {
      for (const channel of entry.rgb) expect(rgb2Levels.has(channel)).toBe(true);
    }
  });

  it('pins the retro16 set: the VGA order, every value exactly named', () => {
    const entries = generateColorMap('retro16').entries;
    expect(entries[0]?.reference).toBe('black');
    expect(entries.at(-1)?.reference).toBe('white');
    // Every classic value has an exact CSS name by construction —
    // no retro entry ever displays as bare hex.
    for (const entry of entries) expect(entry.name.startsWith('#')).toBe(false);
  });
});

describe('exact-match colour naming', () => {
  it('answers the lime/green case exactly (v1 rule: never a guess)', () => {
    expect(colorName('#00ff00')).toBe('Lime');
    expect(colorName('#008000')).toBe('Green');
    expect(colorName('#00fe00')).toBeNull();
  });

  it('matches case-insensitively and misses to null', () => {
    expect(colorName('#FFFF00')).toBe('Yellow');
    expect(colorName('#123456')).toBeNull();
  });

  it('carries roughly the standard table size', () => {
    // The CSS named list is ~148 names; alias pairs (aqua/cyan,
    // gray/grey…) collapse to one display name per value.
    expect(colorNameCount()).toBeGreaterThanOrEqual(135);
  });

  it('names entries by exact match or leaves hex standing', () => {
    const rgb1 = generateColorMap('rgb1').entries;
    const green = rgb1.find((e) => e.reference === 'green');
    expect(green?.name).toBe('Lime');
    const grey = generateColorMap('grey4').entries.find((e) => e.reference === '555555');
    expect(grey?.name).toBe('#555555');
  });
});

describe('provenance-honest labels', () => {
  it('labels map entries with the map name', () => {
    const websafe = generateColorMap('websafe').entries;
    const plain = websafe.find((e) => e.reference === 'CC0033');
    expect(plain).toBeDefined();
    if (plain !== undefined) expect(nonThreadLabel(plain)).toBe('Web-safe #cc0033');
    const lime = generateColorMap('retro16').entries.find((e) => e.reference === 'lime');
    if (lime !== undefined) expect(nonThreadLabel(lime)).toBe('Retro 16 Lime');
  });

  it('labels user colours as Custom, named or hex', () => {
    expect(nonThreadLabel(userColor('abc', [220, 20, 60]))).toBe('Custom — Crimson');
    expect(nonThreadLabel(userColor('xyz', [18, 52, 86]))).toBe('Custom — #123456');
  });

  it('returns null for a real thread — manufacturer identity stands', () => {
    const thread = loadCatalogue().threads[0];
    expect(thread).toBeDefined();
    if (thread !== undefined) expect(nonThreadLabel(thread)).toBeNull();
  });
});

describe('reserved namespaces', () => {
  it('user colours carry the user: identity', () => {
    const custom = userColor('abc123', [1, 2, 3]);
    expect(custom.id).toBe('user:abc123');
    expect(custom.brandId).toBe('user');
    expect(isSyntheticId(custom.id)).toBe(true);
  });

  it('no catalogue brand or thread can collide with the namespaces', () => {
    const catalogue = loadCatalogue();
    for (const brand of catalogue.brands) {
      // A brand id containing ':' would break the id grammar; the
      // reserved words guard the synthetic prefixes themselves.
      expect(brand.id.includes(':')).toBe(false);
      expect(brand.id).not.toBe('map');
      expect(brand.id).not.toBe('user');
    }
    for (const thread of catalogue.threads) {
      expect(isSyntheticId(thread.id)).toBe(false);
    }
  });
});
