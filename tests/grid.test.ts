/**
 * Grid-overlay geometry (src/worker/grid.ts). Invariants: lines sit
 * on cell boundaries with both edges present, minor lines never
 * duplicate major ones, and an illegible line class (spacing < 4×
 * thickness) is omitted rather than smeared.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_STYLE,
  gridLines,
  labelGutterPx,
  labelInterval,
  lineClassVisible,
  minorDashPattern,
  snapSpan,
  tickLabels,
  type GridStyle,
} from '../src/worker/grid.ts';

function style(overrides: Partial<GridStyle> = {}): GridStyle {
  return { ...DEFAULT_GRID_STYLE, ...overrides };
}

describe('gridLines', () => {
  it('places a line on every cell boundary including both edges', () => {
    const lines = gridLines(10, style({ majorInterval: 5 }), 10);
    expect(lines.map((l) => l.offset)).toEqual(
      [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    );
  });

  it('classes multiples of the major interval (and edges) as major', () => {
    const lines = gridLines(7, style({ majorInterval: 5 }), 10);
    const majors = lines.filter((l) => l.major).map((l) => l.offset);
    expect(majors).toEqual([0, 50, 70]); // 0 and 70 are edges
  });

  it('never emits a minor line where a major line sits', () => {
    const lines = gridLines(10, style({ majorInterval: 5 }), 10);
    const offsets = lines.map((l) => l.offset);
    expect(new Set(offsets).size).toBe(offsets.length);
  });

  it('honours a minor interval greater than one', () => {
    const lines = gridLines(5, style({ minorInterval: 2, majorInterval: 0 }), 10);
    expect(lines.map((l) => l.offset)).toEqual([0, 20, 40, 50]); // 50 is the edge
  });

  it('emits no major lines when the major interval is zero', () => {
    const lines = gridLines(10, style({ majorInterval: 0 }), 10);
    expect(lines.some((l) => l.major)).toBe(false);
    expect(lines).toHaveLength(11);
  });

  it('drops the minor class when zoomed-out spacing would smear', () => {
    // minor spacing 2 px < 4×1 px; major spacing 20 px stays legible
    const lines = gridLines(100, style({ majorInterval: 10 }), 2);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.major)).toBe(true);
  });

  it('returns nothing when every class is illegible', () => {
    expect(gridLines(200, style(), 0.05)).toEqual([]);
  });

  it('returns nothing when hidden or empty', () => {
    expect(gridLines(10, style({ show: false }), 10)).toEqual([]);
    expect(gridLines(0, style(), 10)).toEqual([]);
  });

  it('tags exactly the two boundary lines as edges', () => {
    const lines = gridLines(10, style({ majorInterval: 5 }), 10);
    expect(lines.filter((l) => l.edge).map((l) => l.offset)).toEqual([0, 100]);
    expect(lines.filter((l) => !l.edge)).toHaveLength(lines.length - 2);
  });
});

describe('minorDashPattern', () => {
  it('uses three thicknesses of dash and gap', () => {
    expect(minorDashPattern(2)).toEqual([6, 6]);
  });

  it('floors at 2 px so a hairline still reads as dashed', () => {
    expect(minorDashPattern(0.5)).toEqual([2, 2]);
  });
});

describe('labelGutterPx', () => {
  const numbered = { ticks: true, majorInterval: 10, tickFontPx: 11 };

  it('returns the floor when numbering is off or has no interval', () => {
    expect(labelGutterPx(200, { ...numbered, ticks: false }, 24)).toBe(24);
    expect(labelGutterPx(200, { ...numbered, majorInterval: 0 }, 24)).toBe(24);
  });

  it('holds a 3-digit label where the fixed 24 px gutter clipped (A17)', () => {
    // tick 5.5 + gap 3.67 + 3 × 0.65 × 11 + 4 ≈ 34.6 → 35
    expect(labelGutterPx(200, numbered, 24)).toBe(35);
  });

  it('grows with the digit count, never below the floor', () => {
    const three = labelGutterPx(999, numbered, 0);
    const four = labelGutterPx(1024, numbered, 0);
    expect(four).toBeGreaterThan(three);
    expect(labelGutterPx(5, { ...numbered, tickFontPx: 4 }, 24)).toBe(24);
  });
});

describe('lineClassVisible', () => {
  it('is true at exactly 4× thickness spacing and false just under', () => {
    expect(lineClassVisible(1, 4, 1)).toBe(true);
    expect(lineClassVisible(1, 3.9, 1)).toBe(false);
  });

  it('is false for a disabled (zero) interval', () => {
    expect(lineClassVisible(0, 100, 1)).toBe(false);
  });
});

describe('labelInterval', () => {
  it('uses the major interval when labels already fit', () => {
    // spacing 10 × 10 px = 100 px ≥ 48 px
    expect(labelInterval(10, 10)).toBe(10);
  });

  it('doubles until neighbouring labels no longer collide', () => {
    // 10 stitches × 1 px = 10 px < 48; ×2 → 20 < 48; ×4 → 40 < 48; ×8 → 80
    expect(labelInterval(10, 1)).toBe(80);
  });

  it('is disabled without a major interval or a positive scale', () => {
    expect(labelInterval(0, 10)).toBe(0);
    expect(labelInterval(10, 0)).toBe(0);
  });
});

describe('tickLabels', () => {
  it('numbers grid boundaries from 1, never labelling the 0 edge', () => {
    const labels = tickLabels(30, 10, 10);
    expect(labels).toEqual([
      { offset: 100, label: '10' },
      { offset: 200, label: '20' },
      { offset: 300, label: '30' },
    ]);
  });

  it('stops at the last boundary inside the design', () => {
    const labels = tickLabels(25, 10, 10);
    expect(labels.map((l) => l.label)).toEqual(['10', '20']);
  });

  it('thins to the collision-free interval when zoomed out', () => {
    // interval thins 10 → 80 at scale 1 (see labelInterval)
    const labels = tickLabels(200, 10, 1);
    expect(labels.map((l) => l.label)).toEqual(['80', '160']);
  });

  it('is empty for a design smaller than the first label', () => {
    expect(tickLabels(5, 10, 10)).toEqual([]);
  });
});

describe('page-tile offsets (M10)', () => {
  it('classifies tile lines by global index, edges always bounding', () => {
    // Tile covering global 45–100 (55 cells): majors land on global
    // multiples of 10 — locals 5, 15, …, 55 — plus the leading edge.
    const lines = gridLines(55, style({ majorInterval: 10 }), 10, 45);
    const majors = lines.filter((l) => l.major).map((l) => l.offset);
    expect(majors).toEqual([0, 50, 150, 250, 350, 450, 550]);
  });

  it('numbers tiles globally, never restarting at 10', () => {
    const labels = tickLabels(50, 10, 10, undefined, 50);
    expect(labels).toEqual([
      { offset: 100, label: '60' },
      { offset: 200, label: '70' },
      { offset: 300, label: '80' },
      { offset: 400, label: '90' },
      { offset: 500, label: '100' },
    ]);
  });

  it('keeps whole-chart behaviour identical at offset zero', () => {
    expect(tickLabels(30, 10, 10, undefined, 0)).toEqual(tickLabels(30, 10, 10));
    expect(gridLines(10, style(), 10, 0)).toEqual(gridLines(10, style(), 10));
  });
});

describe('snapSpan', () => {
  it('snaps to whole pixels centred on the ideal position', () => {
    expect(snapSpan(10, 2)).toEqual({ start: 9, size: 2 });
  });

  it('never collapses below one pixel', () => {
    expect(snapSpan(10, 0.4)).toEqual({ start: 10, size: 1 });
  });
});
