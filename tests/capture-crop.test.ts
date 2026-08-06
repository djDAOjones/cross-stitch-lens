/**
 * Crop-rectangle model — pure geometry (clamp, move, resize,
 * hit-test) plus the M6 aspect lock that ties the capture region to
 * the pattern's proportions. The DOM overlay that drives it is
 * verified in the running app.
 *
 * `stitchSpan` was removed with the lock (M6-CAPRES-01): it answered
 * "what stitch span does this region map to under contain?", and
 * under the lock the answer is always the pattern itself. Its four
 * cases are subsumed by `keeps the pattern's stitch count whatever
 * the region size` below.
 */

import { describe, expect, it } from 'vitest';
import {
  aspectErrorPx,
  aspectMatches,
  clampRect,
  constrainRect,
  deriveClamped,
  deriveGridSize,
  fullAspectRect,
  fullRect,
  hitTest,
  MIN_CROP,
  moveRect,
  oppositeAnchor,
  resizeRect,
  type CropRect,
  type Handle,
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

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const SQUARE = { width: 200, height: 200 };
const WIDE = { width: 200, height: 150 };
const TALL = { width: 60, height: 240 };
const AWKWARD = { width: 199, height: 101 }; // coprime: no exact snap at most sizes

/** Every rect the model can produce must be legal, whatever produced it. */
function expectInside(rect: CropRect, bounds = BOUNDS): void {
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.width);
  expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.height);
  expect(Number.isInteger(rect.x)).toBe(true);
  expect(Number.isInteger(rect.y)).toBe(true);
  expect(Number.isInteger(rect.width)).toBe(true);
  expect(Number.isInteger(rect.height)).toBe(true);
}

describe('oppositeAnchor', () => {
  it('pivots each handle about its opposite', () => {
    expect(oppositeAnchor('se')).toBe('nw');
    expect(oppositeAnchor('nw')).toBe('se');
    expect(oppositeAnchor('n')).toBe('s');
    expect(oppositeAnchor('e')).toBe('w');
    expect(oppositeAnchor('sw')).toBe('ne');
  });
});

describe('fullAspectRect', () => {
  it('takes the largest centred region with the pattern aspect', () => {
    // 800×600 source, 4:3 pattern — the whole frame already fits.
    expect(fullAspectRect(BOUNDS, WIDE)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('letterboxes a square pattern inside a wide source', () => {
    const rect = fullAspectRect(BOUNDS, SQUARE);
    expect(rect).toEqual({ x: 100, y: 0, width: 600, height: 600 });
    expect(aspectMatches(rect, SQUARE)).toBe(true);
  });

  it('pillarboxes a tall pattern inside a wide source', () => {
    const rect = fullAspectRect(BOUNDS, TALL);
    expect(rect.height).toBe(600);
    expect(rect.width).toBe(150);
    expect(aspectMatches(rect, TALL)).toBe(true);
    expectInside(rect);
  });
});

describe('constrainRect holds the pattern aspect', () => {
  for (const grid of [SQUARE, WIDE, TALL, AWKWARD]) {
    const label = `${String(grid.width)}×${String(grid.height)}`;

    it(`holds it for every handle — ${label}`, () => {
      for (const handle of HANDLES) {
        for (const [dx, dy] of [
          [60, 40],
          [-60, -40],
          [200, -200],
          [-5, 7],
        ] as const) {
          const dragged = resizeRect(RECT, handle, dx, dy, BOUNDS);
          const out = constrainRect(dragged, BOUNDS, grid, oppositeAnchor(handle));
          expect(aspectMatches(out, grid)).toBe(true);
          expectInside(out);
        }
      }
    });

    it(`holds it when dragged hard against every edge — ${label}`, () => {
      for (const handle of HANDLES) {
        const out = constrainRect(
          resizeRect(RECT, handle, 10_000, 10_000, BOUNDS),
          BOUNDS,
          grid,
          oppositeAnchor(handle),
        );
        expect(aspectMatches(out, grid)).toBe(true);
        expectInside(out);
      }
    });

    it(`holds it under repeated drags — ${label}`, () => {
      // Rounding must not accumulate: 40 successive constrained resizes
      // have 40 chances to drift a pixel each time.
      let rect = fullAspectRect(BOUNDS, grid);
      for (let i = 0; i < 40; i++) {
        const handle = HANDLES[i % HANDLES.length] ?? 'se';
        rect = constrainRect(
          resizeRect(rect, handle, i % 2 === 0 ? 13 : -11, i % 3 === 0 ? -7 : 9, BOUNDS),
          BOUNDS,
          grid,
          oppositeAnchor(handle),
        );
        expect(aspectMatches(rect, grid)).toBe(true);
        expectInside(rect);
      }
    });

    it(`holds it on a source smaller than the minimum — ${label}`, () => {
      const tiny = { width: 9, height: 7 };
      const out = constrainRect(fullRect(tiny), tiny, grid, 'center');
      expectInside(out, tiny);
      expect(out.width).toBeGreaterThanOrEqual(1);
      expect(out.height).toBeGreaterThanOrEqual(1);
    });
  }

  it('snaps to an exact ratio when a whole multiple fits', () => {
    // 4:3 reduced — a region of 4k × 3k has *zero* aspect error, which
    // matters because `contain` letterboxes any residue into a visibly
    // empty row or column at small region sizes.
    const out = constrainRect(
      { x: 0, y: 0, width: 401, height: 297 },
      BOUNDS,
      WIDE,
      'nw',
    );
    expect(out.width % 4).toBe(0);
    expect(out.height % 3).toBe(0);
    expect(aspectErrorPx(out, WIDE)).toBe(0);
  });

  it('stays within a pixel when no whole multiple fits', () => {
    const out = constrainRect({ x: 0, y: 0, width: 120, height: 90 }, BOUNDS, AWKWARD, 'nw');
    expect(aspectErrorPx(out, AWKWARD)).toBeLessThanOrEqual(1);
  });
});

describe('constrainRect anchoring', () => {
  it('keeps the opposite corner fixed for a corner drag', () => {
    const out = constrainRect(
      resizeRect(RECT, 'se', 80, 10, BOUNDS),
      BOUNDS,
      SQUARE,
      oppositeAnchor('se'),
    );
    expect(out.x).toBe(RECT.x);
    expect(out.y).toBe(RECT.y);
  });

  it('keeps the opposite edge fixed and centres the free axis', () => {
    const out = constrainRect(
      resizeRect(RECT, 'e', 100, 0, BOUNDS),
      BOUNDS,
      SQUARE,
      oppositeAnchor('e'),
    );
    expect(out.x).toBe(RECT.x);
    // The east drag led, so the width is what was asked for.
    expect(out.width).toBe(300);
    // …and the height followed, about the original vertical centre.
    expect(out.height).toBe(300);
    expect(out.y + out.height / 2).toBe(RECT.y + RECT.height / 2);
  });

  it('shrinks rather than sliding when the anchor runs out of room', () => {
    // Anchor the west edge near the right-hand limit: growing east must
    // shrink the region, never translate the whole selection left.
    const nearEdge: CropRect = { x: 700, y: 100, width: 60, height: 60 };
    const out = constrainRect(
      resizeRect(nearEdge, 'e', 500, 0, BOUNDS),
      BOUNDS,
      SQUARE,
      'w',
    );
    expect(out.x).toBe(700);
    expect(out.width).toBeLessThanOrEqual(100);
    expectInside(out);
  });

  it('reframes about the centre when the pattern aspect changes', () => {
    const before: CropRect = { x: 200, y: 150, width: 400, height: 300 };
    const after = constrainRect(before, BOUNDS, TALL, 'center');
    // Half a pixel is the most integer alignment can preserve: an
    // odd-width region cannot sit exactly on a half-integer centre.
    expect(Math.abs(after.x + after.width / 2 - (before.x + before.width / 2))).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(after.y + after.height / 2 - (before.y + before.height / 2)),
    ).toBeLessThanOrEqual(0.5);
    // "As much selected area as possible": one dimension is kept whole.
    expect(Math.max(after.width / before.width, after.height / before.height)).toBeCloseTo(1, 1);
    expect(aspectMatches(after, TALL)).toBe(true);
  });
});

describe('the capture region never changes the stitch count', () => {
  it('keeps the pattern the same whatever the region size', () => {
    // The whole point of the lock (M6-CAPRES-01): two regions of very
    // different sizes, same pattern, therefore same grid dimensions.
    const small = constrainRect({ x: 0, y: 0, width: 80, height: 60 }, BOUNDS, WIDE, 'nw');
    const large = constrainRect({ x: 0, y: 0, width: 780, height: 585 }, BOUNDS, WIDE, 'nw');
    expect(small).not.toEqual(large);
    for (const rect of [small, large]) {
      expect(aspectMatches(rect, WIDE)).toBe(true);
      // Both map onto the same grid because the grid is what defines it.
      expect(Math.round((rect.width * WIDE.height) / rect.height)).toBe(WIDE.width);
    }
  });
});

describe('aspectErrorPx', () => {
  it('is zero for an exactly proportional region', () => {
    expect(aspectErrorPx({ x: 0, y: 0, width: 400, height: 300 }, WIDE)).toBe(0);
  });

  it('grows with the mismatch', () => {
    const near = aspectErrorPx({ x: 0, y: 0, width: 400, height: 301 }, WIDE);
    const far = aspectErrorPx({ x: 0, y: 0, width: 400, height: 340 }, WIDE);
    expect(near).toBeLessThan(far);
    expect(near).toBeLessThanOrEqual(1);
  });
});

describe('deriveGridSize (M14-EXT-20 — the unlocked half)', () => {
  // The independence invariant still splits on the lock: locked, the
  // region chooses WHICH pixels, never how many stitches (the
  // constrainRect suites above); unlocked, the region's size writes
  // BOTH design dimensions through one source-px-per-stitch scale —
  // one direction, stitches always square. Supersedes the D101
  // height-only derive.
  const MAX = 1024;

  it('derives both dimensions from the region at the scale', () => {
    // 780 × 570 at 4 px per stitch → 195 × round(570/4) = 143.
    expect(deriveGridSize(4, { x: 0, y: 0, width: 780, height: 570 }, MAX)).toEqual({
      width: 195,
      height: 143,
    });
  });

  it('is a fixed point when the region already derives the grid', () => {
    // A region built as grid × scale round-trips exactly.
    expect(deriveGridSize(3, { x: 5, y: 9, width: 600, height: 450 }, MAX)).toEqual({
      width: 200,
      height: 150,
    });
  });

  it('region position never matters, only size', () => {
    const a = deriveGridSize(2.5, { x: 0, y: 0, width: 500, height: 320 }, MAX);
    const b = deriveGridSize(2.5, { x: 250, y: 199, width: 500, height: 320 }, MAX);
    expect(a).toEqual(b);
  });

  it('a fractional scale still yields integer stitches', () => {
    const out = deriveGridSize(5.4, { x: 0, y: 0, width: 1080, height: 700 }, MAX);
    expect(out).toEqual({ width: 200, height: 130 });
    expect(Number.isInteger(out.width)).toBe(true);
    expect(Number.isInteger(out.height)).toBe(true);
  });

  it('clamps each side to [1, maxSide] and deriveClamped reports it', () => {
    expect(deriveGridSize(10, { x: 0, y: 0, width: 4000, height: 1 }, MAX)).toEqual({
      width: 400,
      height: 1,
    });
    expect(deriveGridSize(1, { x: 0, y: 0, width: 10, height: 20_000 }, MAX)).toEqual({
      width: 10,
      height: MAX,
    });
    expect(deriveClamped(1, { x: 0, y: 0, width: 10, height: 20_000 }, MAX)).toBe(true);
    expect(deriveClamped(4, { x: 0, y: 0, width: 780, height: 570 }, MAX)).toBe(false);
  });

  it('reaches a fixed point with constrainRect — derive, lock, derive again', () => {
    // The unlocked flow: free rect → derive size → locking constrains
    // the region to the derived grid's aspect → a second derive at the
    // re-synced scale changes nothing. This is the no-feedback-loop
    // guarantee the implementation leans on.
    const free: CropRect = { x: 40, y: 25, width: 780, height: 570 };
    const grid = deriveGridSize(4, free, MAX);
    const reframed = constrainRect(free, BOUNDS, grid, 'center');
    expect(aspectMatches(reframed, grid)).toBe(true);
    // Locking re-syncs the scale from the constrained region.
    const resynced = reframed.width / grid.width;
    expect(deriveGridSize(resynced, reframed, MAX)).toEqual(grid);
  });

  it('slider path is a fixed point too — same region, new scale, derive twice', () => {
    const rect: CropRect = { x: 0, y: 0, width: 900, height: 600 };
    const first = deriveGridSize(2, rect, MAX);
    expect(first).toEqual({ width: 450, height: 300 });
    // Deriving again at the same scale changes nothing.
    expect(deriveGridSize(2, rect, MAX)).toEqual(first);
  });

  it('locked half unchanged: constrained rects still ignore region size', () => {
    // Two differently sized locked regions, same grid → same stitch
    // count (the D52 invariant the unlocked mode deliberately splits).
    const grid = { width: 200, height: 150 };
    const small = constrainRect({ x: 0, y: 0, width: 200, height: 150 }, BOUNDS, grid, 'center');
    const large = constrainRect({ x: 0, y: 0, width: 600, height: 450 }, BOUNDS, grid, 'center');
    expect(aspectMatches(small, grid)).toBe(true);
    expect(aspectMatches(large, grid)).toBe(true);
    expect(small.width).not.toBe(large.width);
  });

  it('degenerate scales fall back to 1 px per stitch', () => {
    expect(deriveGridSize(0, { x: 0, y: 0, width: 100, height: 50 }, MAX)).toEqual({
      width: 100,
      height: 50,
    });
    expect(deriveGridSize(Number.NaN, { x: 0, y: 0, width: 100, height: 50 }, MAX)).toEqual({
      width: 100,
      height: 50,
    });
  });
});
