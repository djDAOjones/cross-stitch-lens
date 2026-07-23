/**
 * Chart export — the pure layout maths (§14 MVP subset). The line and
 * label geometry itself is grid.ts, tested in grid.test.ts; here we
 * cover what chart.ts adds: margin/padding layout, the cell-size
 * clamp against the canvas side limit, and the filename. Drawing is
 * browser-only and verified in the running app.
 */

import { describe, expect, it } from 'vitest';

import { chartFilename, chartLayout, encodeChartPng, maxCellPx } from '../src/export/chart.ts';
import { MAX_OUTPUT_SIDE } from '../src/export/png.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from '../src/worker/grid.ts';
import type { PixelBuffer } from '../src/core/types.ts';

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

describe('oversize refusal (M13-DEF-02 regression)', () => {
  it('refuses an over-limit chart with the largest workable cell named', async () => {
    // Reproduces the M13-PROF-05 finding: 1024² at cell 16 passes the
    // 16,384 px canvas edge; the browser then silently zeroes the
    // canvas and convertToBlob fails with "size is zero". The guard
    // must refuse first, before the canvas exists (node-safe), and
    // tell the user the cell size that would fit.
    const frame: PixelBuffer = {
      width: 1024,
      height: 1024,
      data: new Uint8ClampedArray(0),
    };
    const tooBig = maxCellPx(1024, 1024, STYLE) + 1;
    const attempt = encodeChartPng(frame, STYLE, tooBig);
    await expect(attempt).rejects.toThrow(/canvas limit/);
    await attempt.catch((error: unknown) => {
      expect(String(error)).toContain(String(maxCellPx(1024, 1024, STYLE)));
    });
  });
});
