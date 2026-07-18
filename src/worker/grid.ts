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

/** Grid overlay styling. One line colour; per-class thickness (§15). */
export interface GridStyle {
  show: boolean;
  /** Stitches between minor lines (≥ 1). */
  minorInterval: number;
  /** Stitches between major lines; 0 disables major lines. */
  majorInterval: number;
  /** CSS colour shared by minor and major lines. */
  color: string;
  /** Minor line thickness, device px. */
  minorThickness: number;
  /** Major line thickness, device px. */
  majorThickness: number;
  /** Tick marks + row/column numbering on the top/left edges (§16). */
  ticks: boolean;
  /** Numbering font size, device px. */
  tickFontPx: number;
  /** Numbering text colour (main sends the page's text colour). */
  tickColor: string;
}

/** Defaults: classic chart look — every stitch, major every 10. */
export const DEFAULT_GRID_STYLE: GridStyle = {
  show: true,
  minorInterval: 1,
  majorInterval: 10,
  color: '#666666',
  minorThickness: 1,
  majorThickness: 2,
  ticks: true,
  tickFontPx: 11,
  tickColor: '#161616',
};

/** One grid line along an axis, in device px from the image origin. */
export interface GridLine {
  offset: number;
  major: boolean;
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
 * always included so the design reads as bounded. A minor line is
 * dropped where a major line coincides (no double draw). Classes the
 * current `scale` makes illegible (see {@link lineClassVisible}) are
 * omitted entirely.
 */
export function gridLines(
  stitches: number,
  style: GridStyle,
  scale: number,
): GridLine[] {
  if (!style.show || stitches <= 0) return [];
  const minorOn = lineClassVisible(style.minorInterval, scale, style.minorThickness);
  const majorOn =
    style.majorInterval > 0 &&
    lineClassVisible(style.majorInterval, scale, style.majorThickness);
  const lines: GridLine[] = [];
  for (let i = 0; i <= stitches; i++) {
    const edge = i === 0 || i === stitches;
    const major = majorOn && (edge || i % style.majorInterval === 0);
    const minor = minorOn && (edge || i % style.minorInterval === 0);
    if (major) lines.push({ offset: i * scale, major: true });
    else if (minor) lines.push({ offset: i * scale, major: false });
  }
  return lines;
}

/** Minimum device px between numbered ticks before labels thin out. */
export const MIN_LABEL_SPACING = 48;

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
 */
export function tickLabels(
  stitches: number,
  majorInterval: number,
  scale: number,
  minSpacing: number = MIN_LABEL_SPACING,
): TickLabel[] {
  const interval = labelInterval(majorInterval, scale, minSpacing);
  if (interval === 0) return [];
  const labels: TickLabel[] = [];
  for (let i = interval; i <= stitches; i += interval) {
    labels.push({ offset: i * scale, label: String(i) });
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
