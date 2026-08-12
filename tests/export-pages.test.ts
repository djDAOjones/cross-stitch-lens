/**
 * Multi-page planner (M10): half-open bounds, leading-edge overlap,
 * row-major order. The invariants: fresh spans cover the grid exactly
 * once (no gaps, no double-fresh), duplicates exist only inside
 * declared overlap, and impossible settings return a sentence, never
 * a broken plan.
 */

import { describe, expect, it } from 'vitest';
import {
  isPlanError,
  pageRangeLabel,
  planPages,
  sliceBuffer,
  type PagePlan,
} from '../src/export/pages.ts';
import type { PixelBuffer } from '../src/core/types.ts';

function plan(gridW: number, gridH: number, per: number, overlap: number): PagePlan {
  const result = planPages(gridW, gridH, per, overlap);
  if (isPlanError(result)) throw new Error(result.error);
  return result;
}

describe('planPages', () => {
  it('fits an exact multiple with no remainder page', () => {
    const p = plan(200, 100, 50, 0);
    expect(p.pagesAcross).toBe(4);
    expect(p.pagesDown).toBe(2);
    expect(p.pages).toHaveLength(8);
  });

  it('adds a page for a one-stitch overflow', () => {
    expect(plan(201, 100, 50, 0).pagesAcross).toBe(5);
  });

  it('single page when the design fits', () => {
    const p = plan(40, 30, 60, 2);
    expect(p.pages).toHaveLength(1);
    const only = p.pages[0];
    expect(only).toMatchObject({ x0: 0, x1: 40, y0: 0, y1: 30, freshX0: 0, freshY0: 0 });
  });

  it('orders pages row-major with correct positions', () => {
    const p = plan(100, 100, 50, 0);
    expect(p.pages.map((s) => [s.row, s.col])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(p.pages.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it('repeats overlap on leading edges only, never on the first page', () => {
    const p = plan(100, 100, 50, 3);
    const [first, second, thirdRowFirst] = [p.pages[0], p.pages[1], p.pages[2]];
    expect(first).toMatchObject({ x0: 0, freshX0: 0, y0: 0, freshY0: 0 });
    // Second column: leading overlap of 3 before the fresh 50.
    expect(second).toMatchObject({ x0: 47, freshX0: 50, x1: 100 });
    // Second row: same on the y axis.
    expect(thirdRowFirst).toMatchObject({ y0: 47, freshY0: 50, y1: 100 });
  });

  it('covers the grid exactly once with fresh spans (no gaps)', () => {
    const p = plan(173, 91, 40, 4);
    const covered = new Uint8Array(173 * 91);
    for (const s of p.pages) {
      for (let y = s.freshY0; y < s.y1; y++) {
        for (let x = s.freshX0; x < s.x1; x++) {
          covered[y * 173 + x] = (covered[y * 173 + x] ?? 0) + 1;
        }
      }
    }
    expect(covered.every((n) => n === 1)).toBe(true);
  });

  it('reports the largest span as the shared-scale basis', () => {
    const p = plan(101, 60, 50, 5);
    // Middle column spans 5 + 50; the last spans 5 + 1. Row 1 spans
    // only 5 + 10, so the y maximum stays the full first row.
    expect(p.maxSpanX).toBe(55);
    expect(p.maxSpanY).toBe(50);
  });

  it('returns sentences for impossible settings', () => {
    expect(planPages(0, 10, 50, 0)).toHaveProperty('error');
    expect(planPages(10, 10, 0, 0)).toHaveProperty('error');
    expect(planPages(10, 10, 50, -1)).toHaveProperty('error');
    const eaten = planPages(100, 100, 10, 10);
    expect(isPlanError(eaten) && eaten.error).toMatch(/consumes the whole page/);
  });
});

describe('pageRangeLabel', () => {
  it('describes the printed range 1-based inclusive', () => {
    const p = plan(100, 100, 50, 3);
    const second = p.pages[1];
    if (second === undefined) throw new Error('missing page');
    expect(pageRangeLabel(second)).toBe('columns 48–100 · rows 1–50');
  });
});

describe('sliceBuffer', () => {
  function frame(): PixelBuffer {
    const width = 4;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    const indices = new Uint16Array(width * height);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = i; // R channel encodes the cell number
      data[i * 4 + 3] = 255;
      indices[i] = i;
    }
    return { width, height, data, indices };
  }

  it('copies the window with its index sidecar aligned', () => {
    const tile = sliceBuffer(frame(), 1, 3, 1, 3);
    expect(tile.width).toBe(2);
    expect(tile.height).toBe(2);
    // Cells (1,1)=5, (2,1)=6, (1,2)=9, (2,2)=10 in the 4-wide source.
    expect([tile.data[0], tile.data[4], tile.data[8], tile.data[12]]).toEqual([5, 6, 9, 10]);
    expect([...(tile.indices ?? [])]).toEqual([5, 6, 9, 10]);
  });

  it('omits the sidecar when the source has none', () => {
    const bare = frame();
    delete bare.indices;
    expect(sliceBuffer(bare, 0, 2, 0, 2).indices).toBeUndefined();
  });

  it('clamps out-of-range bounds instead of crashing', () => {
    const tile = sliceBuffer(frame(), 2, 99, 2, 99);
    expect(tile.width).toBe(2);
    expect(tile.height).toBe(1);
  });
});
