/**
 * Viewport mathematics: fit-to-window geometry, cursor-anchored zoom
 * (the point under the cursor must not move), scale clamping, and
 * pan visibility clamping. All hand-derivable exact cases.
 */

import { describe, expect, it } from 'vitest';

import {
  clampPan,
  clampScale,
  fitView,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  zoomAt,
} from '../src/ui/viewport.ts';

describe('fitView', () => {
  it('letterboxes and centres a wide image in a square view', () => {
    // 200×100 into 800×800: scale 4, image 800×400, centred vertically.
    const view = fitView(200, 100, 800, 800);
    expect(view.scale).toBe(4);
    expect(view.tx).toBe(0);
    expect(view.ty).toBe(200);
  });

  it('respects the zoom ceiling for tiny images in huge views', () => {
    const view = fitView(2, 2, 10000, 10000);
    expect(view.scale).toBe(MAX_SCALE);
  });

  it('reserves the margin via scale while staying centred', () => {
    // 100×100 into 800×800 with 40px margin: scale (800−80)/100 = 7.2,
    // image 720×720, still centred in the full view.
    const view = fitView(100, 100, 800, 800, 40);
    expect(view.scale).toBe(7.2);
    expect(view.tx).toBe(40);
    expect(view.ty).toBe(40);
  });
});

describe('zoomAt', () => {
  it('keeps the anchor point stationary', () => {
    // Content point under the anchor before must be under it after.
    const before = { scale: 2, tx: 100, ty: 50 };
    const anchor = { x: 300, y: 250 };
    const contentX = (anchor.x - before.tx) / before.scale;
    const contentY = (anchor.y - before.ty) / before.scale;
    const after = zoomAt(before, 1.5, anchor.x, anchor.y);
    expect(contentX * after.scale + after.tx).toBeCloseTo(anchor.x, 10);
    expect(contentY * after.scale + after.ty).toBeCloseTo(anchor.y, 10);
    expect(after.scale).toBe(3);
  });

  it('clamps to the scale bounds and stays anchored at the clamp', () => {
    const view = { scale: 60, tx: 0, ty: 0 };
    const zoomed = zoomAt(view, 10, 0, 0);
    expect(zoomed.scale).toBe(MAX_SCALE);
    const shrunk = zoomAt({ scale: 0.06, tx: 0, ty: 0 }, 0.01, 0, 0);
    expect(shrunk.scale).toBe(MIN_SCALE);
  });
});

describe('clampScale', () => {
  it('passes values inside the bounds through unchanged', () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(MIN_SCALE)).toBe(MIN_SCALE);
    expect(clampScale(MAX_SCALE)).toBe(MAX_SCALE);
  });
});

describe('panBy / clampPan', () => {
  it('translates and preserves scale', () => {
    expect(panBy({ scale: 2, tx: 5, ty: 5 }, -3, 7)).toEqual({
      scale: 2,
      tx: 2,
      ty: 12,
    });
  });

  it('keeps at least the visible margin of the image in view', () => {
    // 100×100 image at scale 1 in a 500×500 view: panning far right
    // clamps so 32px of image remain visible at the view's left edge?
    // No — tx max is viewW - margin (image's left edge 32px before the
    // view's right edge); tx min is margin - imageW.
    const view = { scale: 1, tx: 9999, ty: -9999 };
    const clamped = clampPan(view, 100, 100, 500, 500);
    expect(clamped.tx).toBe(500 - 32);
    expect(clamped.ty).toBe(32 - 100);
  });

  it('never demands more visibility than the image has', () => {
    // A 10×10 image at scale 1 is smaller than the 32px margin: the
    // clamp degrades to "fully inside touching the edge".
    const clamped = clampPan({ scale: 1, tx: 9999, ty: 9999 }, 10, 10, 500, 500);
    expect(clamped.tx).toBe(490);
    expect(clamped.ty).toBe(490);
  });

  it('leaves an in-bounds view untouched', () => {
    const view = { scale: 2, tx: 100, ty: 100 };
    expect(clampPan(view, 100, 100, 500, 500)).toEqual(view);
  });
});
