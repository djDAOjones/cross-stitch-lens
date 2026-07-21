/**
 * Crop-rectangle model (§3, M4): pure geometry for the user-drawn
 * capture region over the live thumbnail — clamping, move, resize by
 * handle, and pointer hit-testing. All coordinates are source-video
 * pixels; the DOM overlay in main.ts scales them to CSS pixels.
 * Hermetically tested.
 *
 * From M6 the region's aspect ratio is locked to the pattern grid
 * (M6-CAPRES-01): the capture rectangle chooses *which* source pixels
 * feed the pipeline, never *how many* stitches come out. Every
 * mutation route — new session, draw, handle drag, keyboard resize,
 * source resize, pattern change — passes through
 * {@link constrainRect}, so there is no path that can leave the
 * aspect. Sizes stay independent: two differently sized regions with
 * the same pattern produce the same grid.
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

/** The pattern grid a region's aspect is locked to, in stitches. */
export interface PatternGrid {
  width: number;
  height: number;
}

/**
 * The point a constrained resize pivots about — always the *opposite*
 * handle, so the edge or corner the user is not dragging stays put.
 * 'center' is the reframe case (a pattern-aspect change), where no
 * handle is in play.
 */
export type Anchor = Handle | 'center';

/** The anchor a handle drag pivots about: its opposite. */
export function oppositeAnchor(handle: Handle): Anchor {
  const flip: Record<string, string> = { n: 's', s: 'n', e: 'w', w: 'e' };
  return [...handle].map((c) => flip[c] ?? c).join('') as Anchor;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x === 0 ? 1 : x;
}

/**
 * Force `rect` to the pattern's aspect ratio, pivoting about
 * `anchor`, staying integer-aligned, at least `min` per side, and
 * wholly inside `bounds`.
 *
 * Two rules make this predictable rather than surprising:
 *
 * - **The anchor never moves.** When a drag would push the region past
 *   the source edge it shrinks on the constrained axis; the whole
 *   selection is never silently translated instead.
 * - **The dragged axis leads.** An edge handle drives its own axis and
 *   the other follows (dragging east must widen, not refuse to);
 *   corner handles and reframes fit inside the requested box, so they
 *   shrink one dimension rather than grow past what was asked for.
 *
 * Sizes snap to a whole multiple of the pattern's reduced ratio where
 * one fits, which makes the ratio exact rather than merely within a
 * pixel — worth doing because the `contain` resize letterboxes any
 * residual mismatch into a visibly empty row or column at small
 * region sizes.
 */
export function constrainRect(
  rect: CropRect,
  bounds: Bounds,
  grid: PatternGrid,
  anchor: Anchor = 'center',
  min = MIN_CROP,
): CropRect {
  const gw = grid.width;
  const gh = grid.height;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  // Handles are spelled from their compass letters, so membership is a
  // substring test — but 'center' contains both 'e' and 'n', which
  // would silently make every reframe a north-east anchor. Exclude it
  // explicitly rather than rely on the letters not colliding.
  const isCenter = anchor === 'center';
  const holdsWest = !isCenter && anchor.includes('w');
  const holdsEast = !isCenter && anchor.includes('e');
  const holdsNorth = !isCenter && anchor.includes('n');
  const holdsSouth = !isCenter && anchor.includes('s');

  // Room the anchor leaves: an unheld axis is centred, so it can only
  // grow to twice its shorter side.
  const availW = holdsWest
    ? bounds.width - rect.x
    : holdsEast
      ? x1
      : 2 * Math.min(cx, bounds.width - cx);
  const availH = holdsNorth
    ? bounds.height - rect.y
    : holdsSouth
      ? y1
      : 2 * Math.min(cy, bounds.height - cy);

  // Scale is source px per stitch. Edge handles lead with their own
  // axis; corners and reframes fit inside the requested box.
  const lead =
    anchor === 'e' || anchor === 'w'
      ? rect.width / gw
      : anchor === 'n' || anchor === 's'
        ? rect.height / gh
        : Math.min(rect.width / gw, rect.height / gh);

  const maxScale = Math.min(availW / gw, availH / gh, bounds.width / gw, bounds.height / gh);
  // The minimum yields to the source: a frame smaller than MIN_CROP is
  // still better than one that does not fit (matching clampRect).
  const minScale = Math.min(Math.max(min / gw, min / gh), maxScale);
  const scale = Math.min(Math.max(lead, minScale), maxScale);

  // Exact-ratio snap: gw:gh reduced, then the whole multiple nearest
  // the wanted scale. Falls through when not even one multiple fits.
  const g = gcd(gw, gh);
  const rw = gw / g;
  const rh = gh / g;
  const kMax = Math.min(
    Math.floor(availW / rw),
    Math.floor(availH / rh),
    Math.floor(bounds.width / rw),
    Math.floor(bounds.height / rh),
  );
  let width: number;
  let height: number;
  if (kMax >= 1) {
    // Ceil the floor so the snap cannot round *below* MIN_CROP; kMax
    // still wins when the source cannot afford the minimum at all.
    const kMin = Math.min(Math.max(1, Math.ceil(minScale * g - 1e-9)), kMax);
    const k = Math.min(Math.max(Math.round(scale * g), kMin), kMax);
    width = k * rw;
    height = k * rh;
  } else {
    width = Math.max(1, Math.min(bounds.width, Math.round(gw * scale)));
    height = Math.max(1, Math.min(bounds.height, Math.round(gh * scale)));
  }

  const rawX = holdsWest ? rect.x : holdsEast ? x1 - width : cx - width / 2;
  const rawY = holdsNorth ? rect.y : holdsSouth ? y1 - height : cy - height / 2;
  return {
    x: clamp(Math.round(rawX), 0, bounds.width - width),
    y: clamp(Math.round(rawY), 0, bounds.height - height),
    width,
    height,
  };
}

/**
 * The largest region with the pattern's aspect that fits the source,
 * centred — the default selection for a new session, replacing the
 * unconstrained {@link fullRect}.
 */
export function fullAspectRect(bounds: Bounds, grid: PatternGrid, min = MIN_CROP): CropRect {
  return constrainRect(fullRect(bounds), bounds, grid, 'center', min);
}

/**
 * How far `rect` is from the pattern's aspect, in source pixels — the
 * smaller of the two single-axis errors, because a rect built by
 * rounding one axis from the other is exact on the axis that led.
 * Integer pixels mean the ratio can only ever be approximate, so this
 * is the tolerance the invariant is stated in, never a float compare.
 */
export function aspectErrorPx(rect: CropRect, grid: PatternGrid): number {
  const wantHeight = (rect.width * grid.height) / grid.width;
  const wantWidth = (rect.height * grid.width) / grid.height;
  return Math.min(Math.abs(rect.height - wantHeight), Math.abs(rect.width - wantWidth));
}

/** Whether `rect` holds the pattern's aspect within `tolerance` px. */
export function aspectMatches(rect: CropRect, grid: PatternGrid, tolerance = 1): boolean {
  return aspectErrorPx(rect, grid) <= tolerance;
}
