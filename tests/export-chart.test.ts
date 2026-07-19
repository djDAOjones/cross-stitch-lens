/**
 * Chart export — the pure layout maths (§14 MVP subset). The line and
 * label geometry itself is grid.ts, tested in grid.test.ts; here we
 * cover what chart.ts adds: margin/padding layout, the cell-size
 * clamp against the canvas side limit, and the filename. Drawing is
 * browser-only and verified in the running app.
 */

import { describe, expect, it } from 'vitest';

import { chartFilename, chartLayout, maxCellPx } from '../src/export/chart.ts';
import { MAX_OUTPUT_SIDE } from '../src/export/png.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from '../src/worker/grid.ts';

const STYLE: GridStyle = { ...DEFAULT_GRID_STYLE }; // majors every 10, ticks on

describe('chartLayout', () => {
  it('reserves a label margin plus edge padding around the cells', () => {
    const layout = chartLayout(200, 150, STYLE, 10);
    const pad = Math.ceil(STYLE.majorThickness / 2);
    const margin = Math.round(STYLE.tickFontPx * 2.5);
    expect(layout.originX).toBe(pad + margin);
    expect(layout.originY).toBe(pad + margin);
    expect(layout.width).toBe(layout.originX + 200 * 10 + pad);
    expect(layout.height).toBe(layout.originY + 150 * 10 + pad);
  });

  it('drops the label margin when numbering is off or majors are hidden', () => {
    const noTicks = chartLayout(100, 100, { ...STYLE, ticks: false }, 10);
    const noMajors = chartLayout(100, 100, { ...STYLE, majorInterval: 0 }, 10);
    const pad = Math.ceil(STYLE.majorThickness / 2);
    expect(noTicks.originX).toBe(pad);
    expect(noMajors.originX).toBe(pad);
  });
});

describe('maxCellPx', () => {
  it('keeps the full layout inside the canvas side limit', () => {
    const cell = maxCellPx(1024, 1024, STYLE);
    const layout = chartLayout(1024, 1024, STYLE, cell);
    expect(layout.width).toBeLessThanOrEqual(MAX_OUTPUT_SIDE);
    const oneUp = chartLayout(1024, 1024, STYLE, cell + 1);
    expect(oneUp.width).toBeGreaterThan(MAX_OUTPUT_SIDE);
  });

  it('never returns less than 1', () => {
    expect(maxCellPx(MAX_OUTPUT_SIDE * 2, 1, STYLE)).toBe(1);
  });
});

describe('chartFilename', () => {
  it('names by stitch size', () => {
    expect(chartFilename(200, 150)).toBe('chart-200x150.png');
  });
});
