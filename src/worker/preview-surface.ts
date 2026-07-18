/**
 * Worker-side preview surface: owns the transferred OffscreenCanvas,
 * the ImageBitmap of the last processed frame, the current view
 * transform, and the grid overlay style. Redraws whenever any of them
 * changes. Pixels stay crisp (no smoothing) — stitches are squares,
 * not blurs. The grid draws above the stitches (§15 default) in
 * device space so line thickness is zoom-independent.
 */

import {
  DEFAULT_GRID_STYLE,
  gridLines,
  snapSpan,
  tickLabels,
  type GridStyle,
} from './grid.ts';

interface View {
  scale: number;
  tx: number;
  ty: number;
}

let canvas: OffscreenCanvas | null = null;
let bitmap: ImageBitmap | null = null;
let view: View | null = null;
let grid: GridStyle = DEFAULT_GRID_STYLE;
let sourceBitmap: ImageBitmap | null = null;
let compareOn = false;
/** Split position as a fraction of the design width (0–1). */
let comparePos = 0.5;

/**
 * Split compare (§10): the full-RGB source bitmap covers the left
 * `comparePos` fraction of the design; a divider line in the tick
 * text colour marks the seam. Both bitmaps share grid dimensions, so
 * one transform serves both. Drawn as a source-rect drawImage rather
 * than a clip: ctx.clip() on the transferred OffscreenCanvas stalled
 * Chromium's compositor (page rAF stopped until compare was
 * disabled), so no clipping in this path.
 */
function drawCompare(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  v: View,
): void {
  if (sourceBitmap === null) return;
  const srcW = comparePos * sourceBitmap.width;
  if (srcW <= 0) return;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(v.scale, 0, 0, v.scale, v.tx, v.ty);
  ctx.drawImage(
    sourceBitmap,
    0,
    0,
    srcW,
    sourceBitmap.height,
    0,
    0,
    srcW,
    sourceBitmap.height,
  );
}

function drawDivider(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  v: View,
): void {
  const w = img.width * v.scale;
  const h = img.height * v.scale;
  const span = snapSpan(v.tx + comparePos * w, Math.max(2, grid.majorThickness));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = grid.tickColor;
  ctx.fillRect(span.start, Math.round(v.ty), span.size, Math.round(h));
}

function drawGrid(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  v: View,
): void {
  const lines = [
    { axis: 'x' as const, all: gridLines(img.width, grid, v.scale) },
    { axis: 'y' as const, all: gridLines(img.height, grid, v.scale) },
  ];
  if (lines.every((l) => l.all.length === 0)) return;
  const w = img.width * v.scale;
  const h = img.height * v.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = grid.color;
  for (const { axis, all } of lines) {
    for (const line of all) {
      const thickness = line.major ? grid.majorThickness : grid.minorThickness;
      const origin = axis === 'x' ? v.tx : v.ty;
      const span = snapSpan(origin + line.offset, thickness);
      if (axis === 'x') ctx.fillRect(span.start, Math.round(v.ty), span.size, Math.round(h));
      else ctx.fillRect(Math.round(v.tx), span.start, Math.round(w), span.size);
    }
  }
}

function drawTicks(
  ctx: OffscreenCanvasRenderingContext2D,
  img: ImageBitmap,
  v: View,
): void {
  const cols = tickLabels(img.width, grid.majorInterval, v.scale);
  const rows = tickLabels(img.height, grid.majorInterval, v.scale);
  if (cols.length === 0 && rows.length === 0) return;
  const tickLen = Math.round(grid.tickFontPx / 2);
  const gap = Math.round(grid.tickFontPx / 3);
  const top = Math.round(v.ty);
  const left = Math.round(v.tx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${String(grid.tickFontPx)}px system-ui, sans-serif`;
  for (const { offset, label } of cols) {
    const span = snapSpan(v.tx + offset, grid.minorThickness);
    ctx.fillStyle = grid.color;
    ctx.fillRect(span.start, top - tickLen, span.size, tickLen);
    ctx.fillStyle = grid.tickColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, v.tx + offset, top - tickLen - gap);
  }
  for (const { offset, label } of rows) {
    const span = snapSpan(v.ty + offset, grid.minorThickness);
    ctx.fillStyle = grid.color;
    ctx.fillRect(left - tickLen, span.start, tickLen, span.size);
    ctx.fillStyle = grid.tickColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, left - tickLen - gap, v.ty + offset);
  }
}

function draw(): void {
  if (canvas === null) return;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bitmap === null || view === null) return;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  ctx.drawImage(bitmap, 0, 0);
  if (compareOn) drawCompare(ctx, bitmap, view);
  drawGrid(ctx, bitmap, view);
  if (grid.show && grid.ticks) drawTicks(ctx, bitmap, view);
  if (compareOn && sourceBitmap !== null) drawDivider(ctx, bitmap, view);
}

/** Adopt the transferred surface. */
export function setSurface(surface: OffscreenCanvas): void {
  canvas = surface;
  draw();
}

/** Replace the frame bitmap (closes the previous one). */
export function setFrame(next: ImageBitmap): void {
  bitmap?.close();
  bitmap = next;
  draw();
}

/** Apply a view transform from the main thread. */
export function setView(next: View): void {
  view = next;
  draw();
}

/** Restyle the grid overlay and redraw. */
export function setGridStyle(next: GridStyle): void {
  grid = next;
  draw();
}

/** Replace the full-RGB source bitmap (closes the previous one). */
export function setSourceFrame(next: ImageBitmap | null): void {
  sourceBitmap?.close();
  sourceBitmap = next;
  draw();
}

/** Toggle/position the split compare and redraw. */
export function setCompare(enabled: boolean, position: number): void {
  compareOn = enabled;
  comparePos = Math.min(1, Math.max(0, position));
  draw();
}

/** Resize the surface backing store (device px). */
export function resizeSurface(width: number, height: number): void {
  if (canvas === null) return;
  canvas.width = width;
  canvas.height = height;
  draw();
}
