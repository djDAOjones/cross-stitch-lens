/**
 * Crop-rectangle model — pure geometry (clamp, move, resize,
 * hit-test, stitch span). The DOM overlay that drives it is verified
 * in the running app.
 */

import { describe, expect, it } from 'vitest';
import {
  clampRect,
  fullRect,
  hitTest,
  MIN_CROP,
  moveRect,
  resizeRect,
  stitchSpan,
  type CropRect,
} from '../src/capture/crop.ts';

const BOUNDS = { width: 800, height: 600 };
const RECT: CropRect = { x: 100, y: 100, width: 200, height: 150 };

describe('fullRect', () => {
  it('covers the whole frame', () => {
    expect(fullRect(BOUNDS)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
});

describe('clampRect', () => {
  it('keeps a valid rect unchanged', () => {
    expect(clampRect(RECT, BOUNDS)).toEqual(RECT);
  });

  it('snaps to integer pixels', () => {
    const out = clampRect({ x: 10.4, y: 10.6, width: 100.5, height: 99.5 }, BOUNDS);
    expect(out).toEqual({ x: 10, y: 11, width: 101, height: 100 });
  });

  it('enforces the minimum size', () => {
    const out = clampRect({ x: 0, y: 0, width: 2, height: 2 }, BOUNDS);
    expect(out.width).toBe(MIN_CROP);
    expect(out.height).toBe(MIN_CROP);
  });

  it('relaxes the minimum when the source is smaller', () => {
    const out = clampRect({ x: 0, y: 0, width: 100, height: 100 }, { width: 8, height: 8 });
    expect(out).toEqual({ x: 0, y: 0, width: 8, height: 8 });
  });

  it('pulls an off-frame rect back inside', () => {
    const out = clampRect({ x: 700, y: 550, width: 200, height: 150 }, BOUNDS);
    expect(out.x + out.width).toBeLessThanOrEqual(BOUNDS.width);
    expect(out.y + out.height).toBeLessThanOrEqual(BOUNDS.height);
    expect(out.width).toBe(200);
    expect(out.height).toBe(150);
  });
});

describe('moveRect', () => {
  it('translates freely inside the bounds', () => {
    expect(moveRect(RECT, 50, -20, BOUNDS)).toEqual({ ...RECT, x: 150, y: 80 });
  });

  it('stops at the edges without shrinking', () => {
    const out = moveRect(RECT, 10_000, 10_000, BOUNDS);
    expect(out).toEqual({ ...RECT, x: 600, y: 450 });
  });
});

describe('resizeRect', () => {
  it('drags the se corner outward', () => {
    expect(resizeRect(RECT, 'se', 40, 30, BOUNDS)).toEqual({
      x: 100,
      y: 100,
      width: 240,
      height: 180,
    });
  });

  it('drags the nw corner, moving origin and size together', () => {
    expect(resizeRect(RECT, 'nw', -50, -50, BOUNDS)).toEqual({
      x: 50,
      y: 50,
      width: 250,
      height: 200,
    });
  });

  it('edge handles move one axis only', () => {
    expect(resizeRect(RECT, 'e', 60, 999, BOUNDS)).toEqual({ ...RECT, width: 260 });
    expect(resizeRect(RECT, 'n', 999, 20, BOUNDS)).toEqual({
      x: 100,
      y: 120,
      width: 200,
      height: 130,
    });
  });

  it('never collapses below the minimum size', () => {
    const out = resizeRect(RECT, 'se', -10_000, -10_000, BOUNDS);
    expect(out.width).toBe(MIN_CROP);
    expect(out.height).toBe(MIN_CROP);
  });

  it('never leaves the bounds', () => {
    const out = resizeRect(RECT, 'se', 10_000, 10_000, BOUNDS);
    expect(out).toEqual({ x: 100, y: 100, width: 700, height: 500 });
  });
});

describe('hitTest', () => {
  it('finds corner and edge handles within tolerance', () => {
    expect(hitTest(RECT, 102, 98, 8)).toBe('nw');
    expect(hitTest(RECT, 300, 175, 8)).toBe('e');
    expect(hitTest(RECT, 200, 252, 8)).toBe('s');
  });

  it('prefers the nearest handle over the interior', () => {
    expect(hitTest(RECT, 295, 245, 12)).toBe('se');
  });

  it('reports the interior and the outside', () => {
    expect(hitTest(RECT, 200, 175, 8)).toBe('inside');
    expect(hitTest(RECT, 10, 10, 8)).toBeNull();
  });
});

describe('stitchSpan', () => {
  it('maps a grid-shaped region to the full grid', () => {
    expect(stitchSpan({ width: 400, height: 400 }, { width: 200, height: 200 })).toEqual({
      width: 200,
      height: 200,
    });
  });

  it('preserves aspect under contain', () => {
    expect(stitchSpan({ width: 400, height: 200 }, { width: 200, height: 200 })).toEqual({
      width: 200,
      height: 100,
    });
  });

  it('never reports zero stitches for a live region', () => {
    expect(stitchSpan({ width: 4000, height: 10 }, { width: 200, height: 200 })).toEqual({
      width: 200,
      height: 1,
    });
  });

  it('reports zero for a degenerate region', () => {
    expect(stitchSpan({ width: 0, height: 0 }, { width: 200, height: 200 })).toEqual({
      width: 0,
      height: 0,
    });
  });
});
