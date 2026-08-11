/**
 * The glyph catalogue's structural invariants (M9, D160 decision 1).
 *
 * The canonical id list is pinned verbatim: assignment persistence
 * keys on ids and walks this order, so an insertion, deletion, or
 * reorder would silently re-symbol saved projects. Appending a new
 * signed batch is the one legal change — extend the pinned list.
 *
 * Geometry is checked as data (grammar, bounds, closure); how the
 * glyphs *look* is the owner's printed-evidence signature, not a unit
 * test.
 */

import { describe, expect, it } from 'vitest';

import {
  glyphById,
  SYMBOL_BATCH_SIZE,
  SYMBOL_GLYPHS,
  SYMBOL_IDS,
} from '../src/core/symbols/glyphs.ts';

/** The canonical order, pinned. Append new batches at the end only. */
const PINNED_IDS = [
  // Batch 1
  'dot',
  'circle',
  'square-fill',
  'square',
  'diamond-fill',
  'diamond',
  'triangle-fill',
  'triangle',
  'plus',
  'cross',
  'star4-fill',
  'bar-h',
  'bar-v',
  'heart-fill',
  'circle-dot',
  'tri-down-fill',
  // Batch 2
  'tri-left-fill',
  'tri-right-fill',
  'tri-down',
  'square-dot',
  'diamond-dot',
  'circle-plus',
  'square-nw',
  'circle-half-left',
  'circle-half-right',
  'circle-half-bottom',
  'slash',
  'backslash',
  'equals',
  'pipes',
  'chevron-up',
  'chevron-down',
  // Batch 3
  'chevron-left',
  'chevron-right',
  'dots-2-h',
  'dots-2-v',
  'dots-3',
  'dots-4',
  'hourglass',
  'bowtie',
  'square-x',
  'circle-x',
  'asterisk',
  'corner-nw',
  'corner-se',
  't-shape',
  'h-shape',
  'u-shape',
  // Batch 4
  'l-shape',
  'z-shape',
  'n-shape',
  'e-shape',
  'y-shape',
  'pentagon-fill',
  'hexagon',
  'arrow-up-fill',
  'arrow-down-fill',
  'diamond-bar',
  'circle-bar',
  'square-bar',
  'steps',
  'bolt',
  'crescent',
  'flag',
];

describe('catalogue shape', () => {
  it('holds exactly 64 glyphs — the colour ceiling — in whole batches', () => {
    expect(SYMBOL_GLYPHS.length).toBe(64);
    expect(SYMBOL_GLYPHS.length % SYMBOL_BATCH_SIZE).toBe(0);
  });

  it('keeps the canonical order pinned (append-only tripwire)', () => {
    expect(SYMBOL_IDS).toEqual(PINNED_IDS);
  });

  it('has unique ids and unique display names', () => {
    expect(new Set(SYMBOL_GLYPHS.map((g) => g.id)).size).toBe(SYMBOL_GLYPHS.length);
    expect(new Set(SYMBOL_GLYPHS.map((g) => g.name)).size).toBe(SYMBOL_GLYPHS.length);
  });

  it('has distinct geometry per glyph', () => {
    expect(new Set(SYMBOL_GLYPHS.map((g) => g.path)).size).toBe(SYMBOL_GLYPHS.length);
  });

  it('looks up by id, and misses honestly', () => {
    expect(glyphById('dot')?.name).toBe('Filled circle');
    expect(glyphById('no-such-glyph')).toBeUndefined();
  });
});

describe('geometry contract (Path2D and pdf-lib parity)', () => {
  it('uses only M/L/C/Z commands — the subset both renderers share', () => {
    for (const glyph of SYMBOL_GLYPHS) {
      const commands = glyph.path.replace(/[0-9.,\s-]/g, '');
      expect(commands, glyph.id).toMatch(/^[MLCZ]+$/);
    }
  });

  it('closes every subpath and opens every path with a move', () => {
    for (const glyph of SYMBOL_GLYPHS) {
      expect(glyph.path.startsWith('M'), glyph.id).toBe(true);
      expect(glyph.path.endsWith('Z'), glyph.id).toBe(true);
      // Every M begins a subpath that a Z closes: equal counts.
      const moves = glyph.path.match(/M/g)?.length ?? 0;
      const closes = glyph.path.match(/Z/g)?.length ?? 0;
      expect(moves, glyph.id).toBe(closes);
    }
  });

  it('stays inside the 0–100 unit box', () => {
    for (const glyph of SYMBOL_GLYPHS) {
      const numbers = glyph.path.match(/-?\d+(?:\.\d+)?/g) ?? [];
      expect(numbers.length, glyph.id).toBeGreaterThan(0);
      for (const value of numbers.map(Number)) {
        expect(value, glyph.id).toBeGreaterThanOrEqual(0);
        expect(value, glyph.id).toBeLessThanOrEqual(100);
      }
    }
  });

  it('keeps every glyph visually centred (bounding box straddles 50)', () => {
    // Every coordinate pair (anchors and Bézier controls) — a glyph
    // whose ink sits wholly in one half of the cell would read as
    // misplaced at print size.
    for (const glyph of SYMBOL_GLYPHS) {
      const pairs = [...glyph.path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
      const xs = pairs.map((m) => Number(m[1]));
      const ys = pairs.map((m) => Number(m[2]));
      if (xs.length === 0) continue;
      expect(Math.min(...xs), glyph.id).toBeLessThan(50);
      expect(Math.max(...xs), glyph.id).toBeGreaterThan(50);
      expect(Math.min(...ys), glyph.id).toBeLessThan(50);
      expect(Math.max(...ys), glyph.id).toBeGreaterThan(50);
    }
  });
});
