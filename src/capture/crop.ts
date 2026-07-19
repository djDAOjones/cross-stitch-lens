/**
 * Crop-rectangle model (§3, M4): pure geometry for the user-drawn
 * capture region over the live thumbnail — clamping, move, resize by
 * handle, pointer hit-testing, and the stitches readout. All
 * coordinates are source-video pixels; the DOM overlay in main.ts
 * scales them to CSS pixels. Hermetically tested.
 */

/** Axis-aligned crop region in source-video pixels. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The source-video dimensions the rect must stay within. */
export interface Bounds {
  width: number;
  height: number;
}

/** Resize handles: corners and edge midpoints. */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Smallest useful region edge, in source pixels. */
export const MIN_CROP = 16;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/** The whole frame as a rect — the default region for a new session. */
export function fullRect(bounds: Bounds): CropRect {
  return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

/**
 * Snap a rect to integer pixels inside the bounds, enforcing the
 * minimum size (relaxed when the source itself is smaller).
 */
export function clampRect(rect: CropRect, bounds: Bounds, min = MIN_CROP): CropRect {
  const minW = Math.min(min, bounds.width);
  const minH = Math.min(min, bounds.height);
  const width = clamp(Math.round(rect.width), minW, bounds.width);
  const height = clamp(Math.round(rect.height), minH, bounds.height);
  return {
    x: clamp(Math.round(rect.x), 0, bounds.width - width),
    y: clamp(Math.round(rect.y), 0, bounds.height - height),
    width,
    height,
  };
}

/** Translate a rect, keeping it fully inside the bounds. */
export function moveRect(rect: CropRect, dx: number, dy: number, bounds: Bounds): CropRect {
  return {
    ...rect,
    x: clamp(Math.round(rect.x + dx), 0, bounds.width - rect.width),
    y: clamp(Math.round(rect.y + dy), 0, bounds.height - rect.height),
  };
}

/**
 * Drag one handle by (dx, dy). Only the edges the handle owns move;
 * each is clamped to the bounds and to the minimum size against its
 * opposite edge.
 */
export function resizeRect(
  rect: CropRect,
  handle: Handle,
  dx: number,
  dy: number,
  bounds: Bounds,
  min = MIN_CROP,
): CropRect {
  const minW = Math.min(min, bounds.width);
  const minH = Math.min(min, bounds.height);
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (handle.includes('w')) left = clamp(Math.round(left + dx), 0, right - minW);
  if (handle.includes('e')) right = clamp(Math.round(right + dx), left + minW, bounds.width);
  if (handle.includes('n')) top = clamp(Math.round(top + dy), 0, bottom - minH);
  if (handle.includes('s')) bottom = clamp(Math.round(bottom + dy), top + minH, bounds.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** The (x, y) a handle sits at: corners and edge midpoints. */
function handlePoint(rect: CropRect, handle: Handle): { x: number; y: number } {
  const x = handle.includes('w')
    ? rect.x
    : handle.includes('e')
      ? rect.x + rect.width
      : rect.x + rect.width / 2;
  const y = handle.includes('n')
    ? rect.y
    : handle.includes('s')
      ? rect.y + rect.height
      : rect.y + rect.height / 2;
  return { x, y };
}

/**
 * What a pointer at (x, y) grabs: a handle (within `tolerance`), the
 * rect interior ('inside'), or nothing (start drawing a new rect).
 * Handles win over the interior so edges stay grabbable.
 */
export function hitTest(
  rect: CropRect,
  x: number,
  y: number,
  tolerance: number,
): Handle | 'inside' | null {
  let best: Handle | null = null;
  let bestDist = Infinity;
  for (const handle of HANDLES) {
    const p = handlePoint(rect, handle);
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist <= tolerance && dist < bestDist) {
      best = handle;
      bestDist = dist;
    }
  }
  if (best !== null) return best;
  if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
    return 'inside';
  }
  return null;
}

/**
 * The stitch span a region maps to under contain resize: scaled to
 * fit the grid, aspect preserved, at least 1×1 (UI-STANDARDS →
 * "Capture UX": readout in source pixels and resulting stitches).
 */
export function stitchSpan(
  rect: { width: number; height: number },
  grid: { width: number; height: number },
): { width: number; height: number } {
  if (rect.width <= 0 || rect.height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(grid.width / rect.width, grid.height / rect.height);
  return {
    width: clamp(Math.round(rect.width * scale), 1, grid.width),
    height: clamp(Math.round(rect.height * scale), 1, grid.height),
  };
}
