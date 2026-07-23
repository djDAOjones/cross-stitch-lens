/**
 * Styled PNG chart export (§14 MVP subset): coloured stitch cells +
 * grid + major lines + row/column numbering. Furniture geometry is
 * shared with the preview overlay (worker/grid.ts — pure, already
 * tested); cells reuse the clean-PNG transforms. Layout maths is pure
 * and tested here; drawing needs a canvas and is verified in the
 * running app.
 *
 * The chart is a print artefact: paper is always white and labels are
 * always dark, regardless of the app theme — the preview's
 * page-text-colour labels would vanish on chart paper.
 */

import type { PixelBuffer } from '../core/types.ts';
import { gridLines, snapSpan, tickLabels, type GridStyle } from '../worker/grid.ts';
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
 * from the label font so bigger text gets more room; zero when
 * numbering is off (no majors → grid.ts emits no labels).
 */
function labelMargin(style: GridStyle): number {
  return style.ticks && style.majorInterval > 0 ? Math.round(style.tickFontPx * 2.5) : 0;
}

/** Padding so boundary lines (centred on the edge) are not clipped. */
function edgePad(style: GridStyle): number {
  return Math.ceil(Math.max(style.minorThickness, style.majorThickness) / 2);
}

/** Lay out a chart of `gridW`×`gridH` stitches at `cellPx` px/stitch. */
export function chartLayout(
  gridW: number,
  gridH: number,
  style: GridStyle,
  cellPx: number,
): ChartLayout {
  const pad = edgePad(style);
  const originX = pad + labelMargin(style);
  const originY = pad + labelMargin(style);
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
export function maxCellPx(gridW: number, gridH: number, style: GridStyle): number {
  const fixed = edgePad(style) * 2 + labelMargin(style);
  return Math.max(1, Math.floor((MAX_OUTPUT_SIDE - fixed) / Math.max(gridW, gridH, 1)));
}

/** Download name, e.g. `chart-200x150.png` (size in stitches). */
export function chartFilename(width: number, height: number): string {
  return `chart-${width}x${height}.png`;
}

/**
 * Render the chart and encode it as a PNG blob (browser-only). The
 * frame must be a full-quality pipeline re-run (client.exportFrame),
 * never the preview surface.
 */
export async function encodeChartPng(
  frame: PixelBuffer,
  style: GridStyle,
  cellPx: number,
): Promise<Blob> {
  const layout = chartLayout(frame.width, frame.height, style, cellPx);
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
  const canvas = new OffscreenCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('2d canvas context unavailable');

  ctx.fillStyle = CHART_BACKGROUND;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Stitch cells: enlarge then flatten, so empty stitches read as
  // paper rather than punching transparent holes through it.
  const cells = flattenBackground(scaleNearest(frame, cellPx), CHART_BACKGROUND);
  const data = cells.data as Uint8ClampedArray<ArrayBuffer>;
  ctx.putImageData(new ImageData(data, cells.width, cells.height), layout.originX, layout.originY);

  // Grid lines, reusing the preview's geometry at scale = cellPx.
  // Style thicknesses are CSS px, which is exactly the chart's unit.
  const cellsW = frame.width * cellPx;
  const cellsH = frame.height * cellPx;
  ctx.fillStyle = style.color;
  for (const line of gridLines(frame.width, style, cellPx)) {
    const span = snapSpan(
      layout.originX + line.offset,
      line.major ? style.majorThickness : style.minorThickness,
    );
    ctx.fillRect(span.start, layout.originY, span.size, cellsH);
  }
  for (const line of gridLines(frame.height, style, cellPx)) {
    const span = snapSpan(
      layout.originY + line.offset,
      line.major ? style.majorThickness : style.minorThickness,
    );
    ctx.fillRect(layout.originX, span.start, cellsW, span.size);
  }

  // Row/column numbering in the margins (origin 1, §16).
  if (style.ticks) {
    ctx.fillStyle = CHART_TEXT;
    ctx.font = `${style.tickFontPx}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const tick of tickLabels(frame.width, style.majorInterval, cellPx)) {
      ctx.fillText(tick.label, layout.originX + tick.offset, layout.originY - 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const tick of tickLabels(frame.height, style.majorInterval, cellPx)) {
      ctx.fillText(tick.label, layout.originX - 4, layout.originY + tick.offset);
    }
  }

  return canvas.convertToBlob({ type: 'image/png' });
}
