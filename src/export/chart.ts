/**
 * Styled PNG chart export (§14 MVP subset): coloured stitch cells +
 * grid + major lines + row/column numbering. Furniture geometry is
 * shared with the preview overlay (worker/grid.ts — pure, already
 * tested); cells reuse the clean-PNG transforms. Layout maths is pure
 * and tested here; drawing needs a canvas and is verified in the
 * running app.
 *
 * Since M9 the chart has three modes (`ChartMode`): colour cells,
 * black-and-white symbols, and symbols over colour — one geometry
 * model, with glyph paths from the core catalogue rendered per cell
 * via `Path2D`. Symbol modes refuse incomplete assignment rather than
 * repeat or skip a glyph (D160).
 *
 * The chart is a print artefact: paper is always white and labels are
 * always dark, regardless of the app theme — the preview's
 * page-text-colour labels would vanish on chart paper.
 */

import type { ChartMode } from '../core/project.ts';
import { STITCH_ALPHA } from '../core/stats.ts';
import type { SymbolGlyph } from '../core/symbols/glyphs.ts';
import { EMPTY_INDEX, type PixelBuffer } from '../core/types.ts';
import {
  gridLines,
  labelGutterPx,
  minorDashPattern,
  snapSpan,
  tickLabels,
  type GridLine,
  type GridStyleValues,
} from '../worker/grid.ts';
import { flattenBackground, MAX_OUTPUT_SIDE, oversizeMessage, scaleNearest } from './png.ts';

/** Chart paper colour (print target — never themed). */
export const CHART_BACKGROUND = '#ffffff';
/** Label ink on chart paper (never the page text colour). */
export const CHART_TEXT = '#161616';

/** Computed chart geometry, all in output px. */
export interface ChartLayout {
  /** Total canvas size. */
  width: number;
  height: number;
  /** Top-left of the stitch-cell area (labels live in the margin). */
  originX: number;
  originY: number;
}

/**
 * Margin reserved for numbering along the top and left edges. Sized
 * from the label font *and* the widest label the grid can produce
 * (M11 — the fixed 2.5 em margin clipped 4-digit labels); zero when
 * numbering is off (no majors → grid.ts emits no labels).
 */
function labelMargin(style: GridStyleValues, maxStitches: number): number {
  return labelGutterPx(maxStitches, style, 0);
}

/** Padding so boundary lines (centred on the edge) are not clipped. */
function edgePad(style: GridStyleValues): number {
  return Math.ceil(
    Math.max(style.minorThickness, style.majorThickness, style.borderThickness) / 2,
  );
}

/**
 * Lay out a chart of `gridW`×`gridH` stitches at `cellPx` px/stitch.
 * `maxLabelStitch` (M10) is the largest global stitch number the
 * margins must hold — a page tile 55 cells wide can still be
 * numbered into the thousands.
 */
export function chartLayout(
  gridW: number,
  gridH: number,
  style: GridStyleValues,
  cellPx: number,
  maxLabelStitch: number = Math.max(gridW, gridH),
): ChartLayout {
  const pad = edgePad(style);
  const margin = labelMargin(style, maxLabelStitch);
  const originX = pad + margin;
  const originY = pad + margin;
  return {
    width: originX + gridW * cellPx + pad,
    height: originY + gridH * cellPx + pad,
    originX,
    originY,
  };
}

/**
 * Largest cell size whose chart still fits the canvas side limit
 * (≥ 1) — margins included, so the clamp never lies at the boundary.
 */
export function maxCellPx(gridW: number, gridH: number, style: GridStyleValues): number {
  const fixed = edgePad(style) * 2 + labelMargin(style, Math.max(gridW, gridH));
  return Math.max(1, Math.floor((MAX_OUTPUT_SIDE - fixed) / Math.max(gridW, gridH, 1)));
}

/** Download name, e.g. `chart-200x150.png` (size in stitches). */
export function chartFilename(width: number, height: number): string {
  return `chart-${width}x${height}.png`;
}

/**
 * Glyph per palette index for one frame; `undefined` at an index means
 * that thread has no symbol. Symbol modes require full coverage of the
 * *used* indices — {@link symbolCoverageProblem} is the check.
 */
export type ChartSymbols = ReadonlyArray<SymbolGlyph | undefined>;

/** White ink for symbols over dark cells (paper stays CHART_TEXT ink). */
export const SYMBOL_INK_LIGHT = '#ffffff';

/** WCAG relative luminance of an sRGB channel value (0–255). */
function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of the CHART_TEXT ink (#161616), precomputed. */
const INK_LUMINANCE = 0.00802;

/**
 * Ink for a symbol drawn over a colour cell: chart ink or white,
 * whichever contrasts more against the cell (WCAG contrast ratio, so
 * "more" means the same thing print standards mean by it).
 */
export function symbolInk(r: number, g: number, b: number): string {
  const l =
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
  const againstDark = (l + 0.05) / (INK_LUMINANCE + 0.05);
  const againstLight = 1.05 / (l + 0.05);
  return againstLight > againstDark ? SYMBOL_INK_LIGHT : CHART_TEXT;
}

/**
 * Why this frame cannot render a symbol chart, or `null` when it can.
 *
 * Pure and Node-testable — the canvas encoder calls it as its module
 * boundary guard (the M13-DEF-02 pattern), and the app layer calls it
 * first to refuse with a status line instead of a thrown error.
 * Refusal is the contract: a symbol chart never silently repeats a
 * glyph or leaves a used colour blank (D160).
 */
export function symbolCoverageProblem(
  frame: PixelBuffer,
  symbols: ChartSymbols,
): string | null {
  const indices = frame.indices;
  if (indices === undefined) {
    return 'This output carries no thread identities to symbolise. Symbols need the palette applied (and the standard processing order).';
  }
  const bare = new Set<number>();
  const data = frame.data;
  for (let i = 0, cell = 0; i < data.length; i += 4, cell++) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    const index = indices[cell] ?? EMPTY_INDEX;
    if (index === EMPTY_INDEX) continue;
    if (symbols[index] === undefined) bare.add(index);
  }
  if (bare.size === 0) return null;
  return `${String(bare.size)} colour(s) in this design have no symbol — the set ran out. Reduce the colour count or export the colour chart.`;
}

/** Paint one glyph per stitch cell (symbol modes), after the grid. */
function drawSymbols(
  ctx: OffscreenCanvasRenderingContext2D,
  frame: PixelBuffer,
  layout: ChartLayout,
  cellPx: number,
  mode: ChartMode,
  symbols: ChartSymbols,
): void {
  const indices = frame.indices;
  if (indices === undefined) return; // guarded upstream
  const paths = new Map<string, Path2D>();
  const data = frame.data;
  const scale = cellPx / 100;
  for (let i = 0, cell = 0; i < data.length; i += 4, cell++) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    const index = indices[cell] ?? EMPTY_INDEX;
    if (index === EMPTY_INDEX) continue;
    const glyph = symbols[index];
    if (glyph === undefined) continue; // guarded upstream
    let path = paths.get(glyph.id);
    if (path === undefined) {
      path = new Path2D(glyph.path);
      paths.set(glyph.id, path);
    }
    const x = cell % frame.width;
    const y = (cell - x) / frame.width;
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      layout.originX + x * cellPx,
      layout.originY + y * cellPx,
    );
    ctx.fillStyle =
      mode === 'symbols'
        ? CHART_TEXT
        : symbolInk(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
    ctx.fill(path);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Render the chart and encode it as a PNG blob (browser-only). The
 * frame must be a full-quality pipeline re-run (client.exportFrame),
 * never the preview surface. Symbol modes additionally need the
 * per-palette-index glyph table and refuse incomplete coverage.
 */
export async function encodeChartPng(
  frame: PixelBuffer,
  style: GridStyleValues,
  cellPx: number,
  mode: ChartMode = 'color',
  symbols: ChartSymbols = [],
  /**
   * Global stitch origin when `frame` is a page tile (M10): grid
   * classification and numbering use global coordinates so tiles
   * agree at their joins. `{0,0}` — the default — is a whole chart.
   */
  origin: { x: number; y: number } = { x: 0, y: 0 },
): Promise<Blob> {
  const layout = chartLayout(
    frame.width,
    frame.height,
    style,
    cellPx,
    Math.max(origin.x + frame.width, origin.y + frame.height),
  );
  // Module-boundary guard (M13-DEF-02): the UI clamps via maxCellPx,
  // but a direct caller past the limit would otherwise get a silently
  // zeroed canvas and an unactionable browser error.
  const refusal = oversizeMessage(layout.width, layout.height);
  if (refusal !== null) {
    throw new Error(
      `${refusal} The largest cell for this grid is ` +
        `${String(maxCellPx(frame.width, frame.height, style))} px.`,
    );
  }
  // Same boundary discipline for symbols: the app refuses first with a
  // status line; a direct caller must not get a partial symbol chart.
  if (mode !== 'color') {
    const problem = symbolCoverageProblem(frame, symbols);
    if (problem !== null) throw new Error(problem);
  }
  const canvas = new OffscreenCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2d canvas context unavailable');

  ctx.fillStyle = CHART_BACKGROUND;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (mode !== 'symbols') {
    // Stitch cells: enlarge then flatten, so empty stitches read as
    // paper rather than punching transparent holes through it. The
    // black-and-white mode leaves cells as paper — its ink is glyphs.
    const cells = flattenBackground(scaleNearest(frame, cellPx), CHART_BACKGROUND);
    const data = cells.data as Uint8ClampedArray<ArrayBuffer>;
    ctx.putImageData(
      new ImageData(data, cells.width, cells.height),
      layout.originX,
      layout.originY,
    );
  }

  // Grid lines, reusing the preview's geometry at scale = cellPx.
  // Style thicknesses are raster px — since M11 the chart receives
  // the persisted *print* style, no longer the on-screen one. The
  // passes mirror preview-surface.ts: dashed-or-solid minors, then
  // majors, then the border owning the boundary; line paint honours
  // the style opacity while numbering and symbols stay opaque.
  const cellsW = frame.width * cellPx;
  const cellsH = frame.height * cellPx;
  const xs = gridLines(frame.width, style, cellPx, origin.x);
  const ys = gridLines(frame.height, style, cellPx, origin.y);
  const borderOn = style.show && style.borderThickness > 0;
  const classOf = (lines: GridLine[], major: boolean) =>
    lines.filter((l) => l.major === major && !(borderOn && l.edge));
  ctx.globalAlpha = Math.min(1, Math.max(0, style.opacity));
  if (style.minorDash) {
    const path = new Path2D();
    for (const line of classOf(xs, false)) {
      const span = snapSpan(layout.originX + line.offset, style.minorThickness);
      const x = span.start + span.size / 2;
      path.moveTo(x, layout.originY);
      path.lineTo(x, layout.originY + cellsH);
    }
    for (const line of classOf(ys, false)) {
      const span = snapSpan(layout.originY + line.offset, style.minorThickness);
      const y = span.start + span.size / 2;
      path.moveTo(layout.originX, y);
      path.lineTo(layout.originX + cellsW, y);
    }
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, Math.round(style.minorThickness));
    ctx.setLineDash(minorDashPattern(style.minorThickness));
    ctx.stroke(path);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = style.color;
    for (const line of classOf(xs, false)) {
      const span = snapSpan(layout.originX + line.offset, style.minorThickness);
      ctx.fillRect(span.start, layout.originY, span.size, cellsH);
    }
    for (const line of classOf(ys, false)) {
      const span = snapSpan(layout.originY + line.offset, style.minorThickness);
      ctx.fillRect(layout.originX, span.start, cellsW, span.size);
    }
  }
  ctx.fillStyle = style.majorColor;
  for (const line of classOf(xs, true)) {
    const span = snapSpan(layout.originX + line.offset, style.majorThickness);
    ctx.fillRect(span.start, layout.originY, span.size, cellsH);
  }
  for (const line of classOf(ys, true)) {
    const span = snapSpan(layout.originY + line.offset, style.majorThickness);
    ctx.fillRect(layout.originX, span.start, cellsW, span.size);
  }
  if (borderOn) {
    ctx.fillStyle = style.borderColor;
    const x0 = snapSpan(layout.originX, style.borderThickness);
    const x1 = snapSpan(layout.originX + cellsW, style.borderThickness);
    const y0 = snapSpan(layout.originY, style.borderThickness);
    const y1 = snapSpan(layout.originY + cellsH, style.borderThickness);
    const frameH = y1.start + y1.size - y0.start;
    const frameW = x1.start + x1.size - x0.start;
    ctx.fillRect(x0.start, y0.start, x0.size, frameH);
    ctx.fillRect(x1.start, y0.start, x1.size, frameH);
    ctx.fillRect(x0.start, y0.start, frameW, y0.size);
    ctx.fillRect(x0.start, y1.start, frameW, y1.size);
  }
  ctx.globalAlpha = 1;

  // Row/column numbering in the margins (origin 1, §16; global on
  // tiles, M10).
  if (style.ticks) {
    ctx.fillStyle = CHART_TEXT;
    ctx.font = `${style.tickFontPx}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const tick of tickLabels(frame.width, style.majorInterval, cellPx, undefined, origin.x)) {
      ctx.fillText(tick.label, layout.originX + tick.offset, layout.originY - 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const tick of tickLabels(frame.height, style.majorInterval, cellPx, undefined, origin.y)) {
      ctx.fillText(tick.label, layout.originX - 4, layout.originY + tick.offset);
    }
  }

  // Symbols draw last: they are the content, so grid lines must not
  // cut through them.
  if (mode !== 'color') drawSymbols(ctx, frame, layout, cellPx, mode, symbols);

  return canvas.convertToBlob({ type: 'image/png' });
}
