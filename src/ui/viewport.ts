/**
 * Pure viewport mathematics for the preview: fit-to-window,
 * cursor-anchored zoom, and pan clamping. All values are in device
 * pixels; `scale` is device pixels per stitch. The worker receives
 * the finished transform and applies it blindly — this module is the
 * single source of viewport truth and is hermetically tested.
 */

/** A view transform: drawImage runs at (tx, ty) scaled by `scale`. */
export interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Zoom bounds in **CSS** px per stitch: 5% – 6400% of 1:1. The unit
 * the schema persists (`MIN_PREVIEW_CSS_PX` / `MAX_PREVIEW_CSS_PX` in
 * `core/project.ts` carry the same numbers; `tests/viewport.test.ts`
 * pins the equality). Every clamp here multiplies by the display's
 * device-pixel ratio, so the bound a user meets is the same on a 1×
 * and a 2× display — before FIT-01 the clamp was in device px, and a
 * collapsed preview on a 2× display fitted at 0.025 CSS px while the
 * zoom ceiling halved.
 */
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 64;

/** Image must stay visible by at least this many device px per axis. */
const VISIBLE_MARGIN = 32;

/**
 * Which axis a fit satisfies. 'space' letterboxes the whole design;
 * 'width' and 'height' fill that one axis and let the other overflow,
 * which is what a tall companion window wants when the design is far
 * from the window's own proportions.
 */
export type FitAxis = 'space' | 'width' | 'height';

/**
 * Scale-and-centre `img` inside `view`. `margin` reserves device px on
 * every edge — room for the tick numbering drawn outside the design —
 * and only affects the scale: centring is symmetric, so the offsets
 * fall out unchanged. All three axes reserve the same margin, so
 * switching between them cannot make the numbering jump.
 *
 * A single-axis fit can put content off-screen on the other axis by
 * design; `clampPan` keeps it reachable rather than re-centring.
 */
export function fitView(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
  margin = 0,
  axis: FitAxis = 'space',
  dpr = 1,
): ViewState {
  const availW = Math.max(1, viewW - 2 * margin);
  const availH = Math.max(1, viewH - 2 * margin);
  const byWidth = availW / imgW;
  const byHeight = availH / imgH;
  const scale = clampScale(
    axis === 'width' ? byWidth : axis === 'height' ? byHeight : Math.min(byWidth, byHeight),
    dpr,
  );
  return {
    scale,
    tx: (viewW - imgW * scale) / 2,
    ty: (viewH - imgH * scale) / 2,
  };
}

/**
 * The host height that hugs the fitted design (M14-FIX-03): fit the
 * width, follow the design's aspect, clamp to the posture's floor and
 * cap. Every unit is the caller's (CSS px here). Deliberately a
 * function of host *width* and design shape only — never of the host
 * height it produces — so the ResizeObserver fixed point is immediate
 * and the geometry cannot feed itself (the M14-FIX-06 rule: nothing
 * scroll- or self-dependent in layout height).
 */
export function hugHeight(
  imgW: number,
  imgH: number,
  hostW: number,
  margin: number,
  minH: number,
  maxH: number,
): number {
  if (imgW <= 0 || imgH <= 0) return minH;
  const availW = Math.max(1, hostW - 2 * margin);
  const wanted = (imgH * availW) / imgW + 2 * margin;
  return Math.round(Math.min(Math.max(wanted, minH), maxH));
}

/**
 * Centre `img` at an explicit scale — the manual/restored-zoom path.
 * Shares fitView's centring so a saved manual scale reopens framed the
 * same way a fit does.
 */
export function scaledView(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
  scale: number,
  dpr = 1,
): ViewState {
  const clamped = clampScale(scale, dpr);
  return {
    scale: clamped,
    tx: (viewW - imgW * clamped) / 2,
    ty: (viewH - imgH * clamped) / 2,
  };
}

/**
 * Clamp a device-px-per-stitch scale into the zoom bounds, which are
 * CSS px per stitch — hence the ratio.
 */
export function clampScale(scale: number, dpr = 1): number {
  return Math.min(MAX_SCALE * dpr, Math.max(MIN_SCALE * dpr, scale));
}

/**
 * Zoom by `factor` keeping the content under the anchor point
 * (ax, ay) stationary — the wheel-zoom contract.
 */
export function zoomAt(
  view: ViewState,
  factor: number,
  ax: number,
  ay: number,
  dpr = 1,
): ViewState {
  const scale = clampScale(view.scale * factor, dpr);
  const ratio = scale / view.scale;
  return {
    scale,
    tx: ax - (ax - view.tx) * ratio,
    ty: ay - (ay - view.ty) * ratio,
  };
}

/** Translate the view by (dx, dy) device px. */
export function panBy(view: ViewState, dx: number, dy: number): ViewState {
  return { ...view, tx: view.tx + dx, ty: view.ty + dy };
}

/** What a wheel event may do to the view (M14-EXT-27). */
export type WheelIntent = 'none' | 'zoom' | 'pan';

/**
 * The engaged-only wheel contract (M14-EXT-27): unengaged, every
 * wheel input belongs to the page — the M14-EXT-10 promise verbatim;
 * engaged, ctrl-wheel (how macOS trackpad pinch arrives in
 * Chromium/Firefox) zooms and a plain wheel pans. Pure so the
 * unfocused-inert half is a regression test, not a hope.
 */
export function wheelIntent(engaged: boolean, ctrlKey: boolean): WheelIntent {
  if (!engaged) return 'none';
  return ctrlKey ? 'zoom' : 'pan';
}

/** How hard a pinch delta zooms; e^(−Δy·k) keeps it symmetric. */
const PINCH_ZOOM_SENSITIVITY = 0.01;

/**
 * Zoom factor for one ctrl-wheel pinch delta. Exponential so equal
 * finger travel in and out cancels exactly (factor(d)·factor(−d)=1),
 * which a linear mapping cannot promise.
 */
export function pinchZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * PINCH_ZOOM_SENSITIVITY);
}

/**
 * Keep the image from being panned fully out of sight: at least
 * {@link VISIBLE_MARGIN} device px of it must remain inside the view
 * on each axis (or the whole image when it is smaller than that).
 */
export function clampPan(
  view: ViewState,
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
): ViewState {
  const w = imgW * view.scale;
  const h = imgH * view.scale;
  const marginX = Math.min(VISIBLE_MARGIN, w);
  const marginY = Math.min(VISIBLE_MARGIN, h);
  return {
    scale: view.scale,
    tx: Math.min(viewW - marginX, Math.max(marginX - w, view.tx)),
    ty: Math.min(viewH - marginY, Math.max(marginY - h, view.ty)),
  };
}
