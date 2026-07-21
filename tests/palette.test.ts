/**
 * Palette model over the generated thread catalogue. Mirrors the
 * invariants build-palette.mjs guarantees, so a bad regeneration is
 * caught here too.
 */

import { describe, expect, it } from 'vitest';

import {
  loadDmcPalette,
  paletteFingerprint,
  paletteIdentityFingerprint,
  paletteLab,
  paletteRgb,
} from '../src/core/palette.ts';
import { loadCatalogue, threadsForBrands } from '../src/core/thread-catalogue.ts';
import { thread } from './helpers/threads.ts';

describe('DMC palette', () => {
  const palette = loadDmcPalette();

  it('loads every DMC thread with unique references', () => {
    expect(palette.entries.length).toBe(489);
    const references = new Set(palette.entries.map((e) => e.reference));
    expect(references.size).toBe(palette.entries.length);
  });

  it('has 310 (black) and B5200 (snow white)', () => {
    expect(palette.entries.some((e) => e.reference === '310')).toBe(true);
    expect(palette.entries.some((e) => e.reference === 'B5200')).toBe(true);
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

describe('thread catalogue', () => {
  const catalogue = loadCatalogue();

  it('loads eight brands with every thread id unique', () => {
    expect(catalogue.brands.map((b) => b.id)).toEqual([
      'anchor',
      'ariadna',
      'cosmo',
      'cxc',
      'dmc',
      'finca',
      'madeira',
      'sullivans',
    ]);
    const ids = new Set(catalogue.threads.map((t) => t.id));
    expect(ids.size).toBe(catalogue.threads.length);
    expect(catalogue.byId.size).toBe(catalogue.threads.length);
  });

  it('never merges threads that share a display colour', () => {
    // The load-bearing invariant of the whole M7 identity model: 3,338
    // threads render as only 2,830 distinct colours, so ~500 real,
    // separately-buyable threads would vanish under RGB de-duplication
    // (M7-BRAND-01).
    const colours = new Set(catalogue.threads.map((t) => t.hex));
    expect(catalogue.threads.length).toBe(3338);
    expect(colours.size).toBe(2830);
    expect(colours.size).toBeLessThan(catalogue.threads.length);
  });

  it('strips the redundant brand prefix from a reference', () => {
    // The source CSV writes Anchor/CXC/Sullivans codes as "Anchor 403";
    // the brand is already its own field, so a label built from both
    // would read "Anchor Anchor 403".
    const anchor = threadsForBrands(catalogue, ['anchor']);
    expect(anchor.length).toBeGreaterThan(0);
    expect(anchor.every((t) => !/^anchor /i.test(t.reference))).toBe(true);
    expect(anchor.some((t) => t.reference === '403')).toBe(true);
  });

  it('orders threads by enabled-brand order, then catalogue order', () => {
    const both = threadsForBrands(catalogue, ['dmc', 'anchor']);
    const firstAnchor = both.findIndex((t) => t.brandId === 'anchor');
    const lastDmc = both.map((t) => t.brandId).lastIndexOf('dmc');
    expect(lastDmc).toBeLessThan(firstAnchor);
    // Reversing the request reverses the blocks — order is the user's,
    // and it is the nearest-match tie-break (D46).
    const reversed = threadsForBrands(catalogue, ['anchor', 'dmc']);
    expect(reversed[0]?.brandId).toBe('anchor');
  });

  it('reports every brand as measured, none as mapped', () => {
    // thread-list.csv carries each brand's own colours, unlike the
    // superseded DMC→Anchor cross-reference (D55).
    expect(catalogue.brands.every((b) => b.provenance === 'measured')).toBe(true);
    expect(catalogue.threads.every((t) => t.mappedFrom === null)).toBe(true);
  });
});

describe('palette fingerprints', () => {
  const black = thread('310', 'black', [0, 0, 0], { brandId: 'dmc' });
  /** Same colour, different thread — the case RGB alone cannot see. */
  const otherBlack = thread('403', 'black', [0, 0, 0], { brandId: 'anchor' });
  const white = thread('B5200', 'white', [255, 255, 255], { brandId: 'dmc' });

  it('separates on identity where the colours are identical', () => {
    // The LUT may safely be shared — it stores indices, so identical
    // ordered RGB means identical maths. The labels may NOT be shared,
    // which is exactly what the identity fingerprint catches (D55).
    const a = { name: 'a', entries: [black, white] };
    const b = { name: 'b', entries: [otherBlack, white] };
    expect(paletteFingerprint(a)).toBe(paletteFingerprint(b));
    expect(paletteIdentityFingerprint(a)).not.toBe(paletteIdentityFingerprint(b));
  });

  it('treats a reorder as a different palette under both fingerprints', () => {
    // Order is identity for both, because a LUT stores indices (D46) —
    // reordering is a real edit, not a presentation change.
    const a = { name: 'a', entries: [black, white] };
    const reordered = { name: 'a', entries: [white, black] };
    expect(paletteFingerprint(a)).not.toBe(paletteFingerprint(reordered));
    expect(paletteIdentityFingerprint(a)).not.toBe(paletteIdentityFingerprint(reordered));
  });

  it('ignores the palette name', () => {
    const a = { name: 'one', entries: [black, white] };
    const b = { name: 'two', entries: [black, white] };
    expect(paletteFingerprint(a)).toBe(paletteFingerprint(b));
    expect(paletteIdentityFingerprint(a)).toBe(paletteIdentityFingerprint(b));
  });

  it('carries the entry count, so a prefix cannot collide with the whole', () => {
    expect(paletteFingerprint({ name: 'x', entries: [black] })).toMatch(/-1$/);
    expect(paletteIdentityFingerprint({ name: 'x', entries: [black, white] })).toMatch(/-2$/);
  });
});
