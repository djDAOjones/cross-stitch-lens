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

/** Zoom bounds in device px per stitch: 5% – 6400% of 1:1. */
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 64;

/** Image must stay visible by at least this many device px per axis. */
const VISIBLE_MARGIN = 32;

/** Scale-and-centre `img` inside `view` (letterboxed, never cropped). */
export function fitView(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
): ViewState {
  const scale = clampScale(Math.min(viewW / imgW, viewH / imgH));
  return {
    scale,
    tx: (viewW - imgW * scale) / 2,
    ty: (viewH - imgH * scale) / 2,
  };
}

/** Clamp a scale into the zoom bounds. */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
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
): ViewState {
  const scale = clampScale(view.scale * factor);
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
