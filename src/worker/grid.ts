/**
 * Pure grid-overlay geometry for the preview (requirements §15
 * subset). Computes where grid lines fall and when a line class is
 * legible enough to draw; the drawing itself happens in
 * preview-surface.ts, which applies these results blindly — same
 * split as the viewport maths (D19), so the logic is hermetically
 * testable.
 *
 * Units: `scale` is device px per stitch; thicknesses are device px
 * (the main thread pre-multiplies CSS px by devicePixelRatio, as it
 * does for the view transform).
 */

import { DEFAULT_GRID_VALUES, type GridStyleValues } from '../core/grid-style.ts';

export { DEFAULT_GRID_VALUES, type GridStyleValues } from '../core/grid-style.ts';

/**
 * Grid overlay styling as the worker consumes it: the persisted
 * values plus the theme-derived tick text colour, which is runtime
 * state (main sends the page's text colour) and never persisted.
 */
export interface GridStyle extends GridStyleValues {
  /** Numbering text colour (main sends the page's text colour). */
  tickColor: string;
}

/** Defaults: classic chart look — every stitch, major every 10. */
export const DEFAULT_GRID_STYLE: GridStyle = {
  ...DEFAULT_GRID_VALUES,
  tickColor: '#161616',
};

/** One grid line along an axis, in device px from the image origin. */
export interface GridLine {
  offset: number;
  major: boolean;
  /** True for the two outer boundary lines (offset 0 and the far edge). */
  edge: boolean;
}

/**
 * A line class is drawn only when its spacing leaves visibly more
 * cell than ink — under 4× the line thickness the grid would smear
 * into a solid wash at low zoom, so it auto-hides instead.
 */
export function lineClassVisible(
  interval: number,
  scale: number,
  thickness: number,
): boolean {
  return interval > 0 && interval * scale >= 4 * thickness;
}

/**
 * Grid line offsets along one axis of `stitches` cells. Lines sit on
 * cell boundaries at multiples of each interval; both outer edges are
 * always included so the design (or the page tile, M10) reads as
 * bounded. A minor line is dropped where a major line coincides (no
 * double draw). Classes the current `scale` makes illegible (see
 * {@link lineClassVisible}) are omitted entirely. Edge lines carry
 * the `edge` tag so a renderer with an active outer border (M11) can
 * draw the border instead.
 *
 * `startStitch` (M10) is the axis's global origin when the drawn run
 * is a page tile: interval classification uses the **global** index,
 * so a major-every-10 line lands on global multiples of 10 on every
 * page and tiles agree at their joins.
 */
export function gridLines(
  stitches: number,
  style: GridStyleValues,
  scale: number,
  startStitch = 0,
): GridLine[] {
  if (!style.show || stitches <= 0) return [];
  const minorOn = lineClassVisible(style.minorInterval, scale, style.minorThickness);
  const majorOn =
    style.majorInterval > 0 &&
    lineClassVisible(style.majorInterval, scale, style.majorThickness);
  const lines: GridLine[] = [];
  for (let i = 0; i <= stitches; i++) {
    const edge = i === 0 || i === stitches;
    const global = startStitch + i;
    const major = majorOn && (edge || global % style.majorInterval === 0);
    const minor = minorOn && (edge || global % style.minorInterval === 0);
    if (major) lines.push({ offset: i * scale, major: true, edge });
    else if (minor) lines.push({ offset: i * scale, major: false, edge });
  }
  return lines;
}

/**
 * Dash pattern for dashed minor lines: equal dash and gap, three line
 * thicknesses each (floored at 2 px so a 1 px line still reads as
 * dashed rather than dotted noise). Majors and the border stay solid
 * — structure must survive the texture.
 */
export function minorDashPattern(thickness: number): [number, number] {
  const segment = Math.max(2, Math.round(3 * thickness));
  return [segment, segment];
}

/** Minimum device px between numbered ticks before labels thin out. */
export const MIN_LABEL_SPACING = 48;

/**
 * Margin that comfortably holds the row/column numbering: tick mark
 * (font/2) + gap (font/3) + the widest label at ~0.65 em per digit +
 * breathing room, floored at `minimum`. Replaces the fixed 24 px
 * gutter that clipped 3-digit labels (ui-audit A17): the preview
 * passes its old floor, the chart passes 0 so an unnumbered chart
 * keeps no margin. Units follow `tickFontPx` (CSS px on screen,
 * raster px in print).
 */
export function labelGutterPx(
  maxStitches: number,
  style: Pick<GridStyleValues, 'ticks' | 'majorInterval' | 'tickFontPx'>,
  minimum: number,
): number {
  if (!style.ticks || style.majorInterval <= 0) return minimum;
  const digits = String(Math.max(1, maxStitches)).length;
  const computed = Math.round(
    style.tickFontPx / 2 + style.tickFontPx / 3 + digits * 0.65 * style.tickFontPx + 4,
  );
  return Math.max(minimum, computed);
}

/** One numbered tick along an axis, device px from the image origin. */
export interface TickLabel {
  offset: number;
  label: string;
}

/**
 * The stitch interval at which numbered ticks are drawn: the major
 * grid interval, doubled until neighbouring labels sit at least
 * `minSpacing` device px apart (so zoomed-out numbering thins instead
 * of colliding). 0 means no labels (no major interval, or no zoom at
 * which a first label fits).
 */
export function labelInterval(
  majorInterval: number,
  scale: number,
  minSpacing: number = MIN_LABEL_SPACING,
): number {
  if (majorInterval <= 0 || scale <= 0) return 0;
  let interval = majorInterval;
  while (interval * scale < minSpacing) interval *= 2;
  return interval;
}

/**
 * Numbered ticks for one axis of `stitches` cells, on grid boundaries
 * at the (possibly thinned) label interval. Numbering counts whole
 * stitches with origin at 1 (§16): the boundary after stitch 10 reads
 * "10"; the 0 edge is never labelled.
 *
 * `startStitch` (M10) is the global origin of a page tile: labels
 * carry **global** stitch numbers at global interval multiples,
 * positioned locally — page 2 of a 50-wide tiling reads 60, 70, …,
 * never a fresh 10, 20.
 */
export function tickLabels(
  stitches: number,
  majorInterval: number,
  scale: number,
  minSpacing: number = MIN_LABEL_SPACING,
  startStitch = 0,
): TickLabel[] {
  const interval = labelInterval(majorInterval, scale, minSpacing);
  if (interval === 0) return [];
  const labels: TickLabel[] = [];
  const firstGlobal = Math.ceil((startStitch + 1) / interval) * interval;
  for (let g = firstGlobal; g <= startStitch + stitches; g += interval) {
    labels.push({ offset: (g - startStitch) * scale, label: String(g) });
  }
  return labels;
}

/** A device-px-snapped span for a line of `thickness` centred at `center`. */
export interface LineSpan {
  start: number;
  size: number;
}

/**
 * Snap a line to whole device pixels so it renders crisp: integer
 * start, integer size ≥ 1, centred on the ideal position.
 */
export function snapSpan(center: number, thickness: number): LineSpan {
  const size = Math.max(1, Math.round(thickness));
  return { start: Math.round(center - size / 2), size };
}
