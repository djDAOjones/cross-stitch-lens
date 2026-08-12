/**
 * Worker-side preview surface: owns the transferred OffscreenCanvas,
 * the ImageBitmap of the last processed frame, the current view
 * transform, and the grid overlay style. Redraws whenever any of them
 * changes. Pixels stay crisp (no smoothing) — stitches are squares,
 * not blurs. The grid draws above the stitches (§15 default) in
 * device space so line thickness is zoom-independent.
 */

import { EMPTY_INDEX } from '../core/types.ts';
import {
  DEFAULT_GRID_STYLE,
  gridLines,
  minorDashPattern,
  snapSpan,
  tickLabels,
  type GridLine,
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
/** Highlighted palette index (M14-EXT-17), null when off. */
let highlightIndex: number | null = null;
/** The current frame's palette-index sidecar (worker-side copy). */
let frameIndices: Uint16Array | null = null;
let frameIndicesW = 0;
let frameIndicesH = 0;
/** Design-resolution scrim, rebuilt when frame or selection change. */
let highlightMask: OffscreenCanvas | null = null;

/** Scrim alpha over non-matching stitches (0–255). */
export const HIGHLIGHT_SCRIM_ALPHA = 150;

/**
 * The scrim's RGBA pixels, pure (tested in node): a uniform dim over
 * every stitch that is not the selected thread. Matching stitches and
 * fabric (`EMPTY_INDEX`) stay fully transparent — thread colours are
 * content and are never recoloured; absence of scrim IS the
 * highlight, and the fabric was never the thread in question.
 */
export function highlightMaskPixels(
  indices: Uint16Array,
  selected: number,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(indices.length * 4);
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i] ?? EMPTY_INDEX;
    if (index !== EMPTY_INDEX && index !== selected) {
      out[i * 4 + 3] = HIGHLIGHT_SCRIM_ALPHA;
    }
  }
  return out;
}

/** Rebuild the cached mask canvas (null when nothing to draw). */
function rebuildHighlightMask(): void {
  highlightMask = null;
  if (highlightIndex === null || frameIndices === null) return;
  const mask = new OffscreenCanvas(frameIndicesW, frameIndicesH);
  const ctx = mask.getContext('2d');
  if (ctx === null) return;
  ctx.putImageData(
    new ImageData(highlightMaskPixels(frameIndices, highlightIndex), frameIndicesW, frameIndicesH),
    0,
    0,
  );
  highlightMask = mask;
}

/**
 * Draw the highlight scrim over the output (before compare, so the
 * source half stays pristine). Decoration only — any failure is
 * logged by the caller's guard and never disturbs the frame.
 */
function drawHighlight(ctx: OffscreenCanvasRenderingContext2D, v: View): void {
  if (highlightMask === null) return;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(v.scale, 0, 0, v.scale, v.tx, v.ty);
  ctx.drawImage(highlightMask, 0, 0);
}

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
  const xs = gridLines(img.width, grid, v.scale);
  const ys = gridLines(img.height, grid, v.scale);
  // The border ignores line-class legibility: two lines per axis can
  // never smear, so a bordered design stays bounded at any zoom.
  const borderOn = grid.show && img.width > 0 && grid.borderThickness > 0;
  if (xs.length === 0 && ys.length === 0 && !borderOn) return;
  const w = Math.round(img.width * v.scale);
  const h = Math.round(img.height * v.scale);
  const top = Math.round(v.ty);
  const left = Math.round(v.tx);
  // An active border owns the boundary — edge lines drop from their
  // class pass rather than double-drawing underneath it.
  const classOf = (lines: GridLine[], major: boolean) =>
    lines.filter((l) => l.major === major && !(borderOn && l.edge));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Opacity applies to line paint only; the numbering (drawTicks)
  // stays fully opaque so coordinates survive a faded grid.
  ctx.globalAlpha = Math.min(1, Math.max(0, grid.opacity));
  if (grid.minorDash) {
    // Dashed minors: one batched stroke per redraw — per-segment
    // fillRects would cost tens of thousands of calls per frame.
    const path = new Path2D();
    for (const line of classOf(xs, false)) {
      const span = snapSpan(v.tx + line.offset, grid.minorThickness);
      const x = span.start + span.size / 2;
      path.moveTo(x, top);
      path.lineTo(x, top + h);
    }
    for (const line of classOf(ys, false)) {
      const span = snapSpan(v.ty + line.offset, grid.minorThickness);
      const y = span.start + span.size / 2;
      path.moveTo(left, y);
      path.lineTo(left + w, y);
    }
    ctx.strokeStyle = grid.color;
    ctx.lineWidth = Math.max(1, Math.round(grid.minorThickness));
    ctx.setLineDash(minorDashPattern(grid.minorThickness));
    ctx.stroke(path);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = grid.color;
    for (const line of classOf(xs, false)) {
      const span = snapSpan(v.tx + line.offset, grid.minorThickness);
      ctx.fillRect(span.start, top, span.size, h);
    }
    for (const line of classOf(ys, false)) {
      const span = snapSpan(v.ty + line.offset, grid.minorThickness);
      ctx.fillRect(left, span.start, w, span.size);
    }
  }
  // Majors above minors so a distinct major colour reads at crossings.
  ctx.fillStyle = grid.majorColor;
  for (const line of classOf(xs, true)) {
    const span = snapSpan(v.tx + line.offset, grid.majorThickness);
    ctx.fillRect(span.start, top, span.size, h);
  }
  for (const line of classOf(ys, true)) {
    const span = snapSpan(v.ty + line.offset, grid.majorThickness);
    ctx.fillRect(left, span.start, w, span.size);
  }
  if (borderOn) {
    ctx.fillStyle = grid.borderColor;
    const x0 = snapSpan(v.tx, grid.borderThickness);
    const x1 = snapSpan(v.tx + w, grid.borderThickness);
    const y0 = snapSpan(v.ty, grid.borderThickness);
    const y1 = snapSpan(v.ty + h, grid.borderThickness);
    const frameH = y1.start + y1.size - y0.start;
    const frameW = x1.start + x1.size - x0.start;
    ctx.fillRect(x0.start, y0.start, x0.size, frameH);
    ctx.fillRect(x1.start, y0.start, x1.size, frameH);
    ctx.fillRect(x0.start, y0.start, frameW, y0.size);
    ctx.fillRect(x0.start, y1.start, frameW, y1.size);
  }
  ctx.globalAlpha = 1;
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
  // Highlight under compare: the scrim dims the reduced output, and
  // the source half then covers it on the left — the two decorations
  // compose without either lying about the other's side.
  try {
    drawHighlight(ctx, view);
  } catch {
    // Decoration isolation (the router rule): a failed highlight
    // never takes the frame down — drop it and draw on.
    highlightMask = null;
    highlightIndex = null;
  }
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

/** Select the highlighted palette index (null clears) and redraw. */
export function setHighlight(index: number | null): void {
  highlightIndex = index;
  try {
    rebuildHighlightMask();
  } catch {
    highlightMask = null;
    highlightIndex = null;
  }
  draw();
}

/**
 * Adopt the current frame's index sidecar (a worker-side copy taken
 * before the response transfer detaches the buffer). Dimensions ride
 * along so the mask always matches the bitmap it dims.
 */
export function setHighlightFrame(indices: Uint16Array | null, width: number, height: number): void {
  frameIndices = indices;
  frameIndicesW = width;
  frameIndicesH = height;
  try {
    rebuildHighlightMask();
  } catch {
    highlightMask = null;
  }
  // No draw() here: the caller replaces the bitmap right after, and
  // that draw picks the fresh mask up.
}

/** Resize the surface backing store (device px). */
export function resizeSurface(width: number, height: number): void {
  if (canvas === null) return;
  canvas.width = width;
  canvas.height = height;
  draw();
}
