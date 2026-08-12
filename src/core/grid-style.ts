/**
 * Grid furniture style values (§15–§16 subset) — the persisted shape,
 * shared verbatim by the screen (preview overlay) and print (chart /
 * PDF raster) halves of the M11 model. The single definition is the
 * single source of truth for UI controls and the project-file schema
 * (conventions.md); the worker's `GridStyle` extends it with the
 * runtime-only tick text colour.
 *
 * Units are deliberately relative to the consumer: thicknesses and
 * the number font are CSS px on screen (DPR-scaled at send time) and
 * chart-raster px in print. Physical print sizing is M16's question,
 * not encoded here.
 */

/** Grid/tick styling values as persisted (screen or print half). */
export interface GridStyleValues {
  show: boolean;
  /** Stitches between minor lines (≥ 1). */
  minorInterval: number;
  /** Stitches between major lines; 0 disables major lines. */
  majorInterval: number;
  /** `#rrggbb` minor line colour. */
  color: string;
  /** `#rrggbb` major line colour (may equal `color`). */
  majorColor: string;
  /** Minor line thickness, px. */
  minorThickness: number;
  /** Major line thickness, px. */
  majorThickness: number;
  /** Line paint opacity (0–1); numbering stays fully opaque. */
  opacity: number;
  /** Dashed minor lines (major and border stay solid). */
  minorDash: boolean;
  /** Outer border thickness, px; 0 leaves edges to their line class. */
  borderThickness: number;
  /** `#rrggbb` outer border colour. */
  borderColor: string;
  /** Tick marks + row/column numbering on the top/left edges (§16). */
  ticks: boolean;
  /** Numbering font size, px. */
  tickFontPx: number;
}

/**
 * Defaults: the classic chart look — every stitch, major every 10 —
 * exactly the pre-v7 appearance. The new fields' defaults are the
 * appearance-preserving identities (full opacity, solid lines, no
 * border, major sharing the minor colour), which is what the v6 → v7
 * migration relies on to keep old projects looking unchanged.
 */
export const DEFAULT_GRID_VALUES: GridStyleValues = {
  show: true,
  minorInterval: 1,
  majorInterval: 10,
  color: '#666666',
  majorColor: '#666666',
  minorThickness: 1,
  majorThickness: 2,
  opacity: 1,
  minorDash: false,
  borderThickness: 0,
  borderColor: '#666666',
  ticks: true,
  tickFontPx: 11,
};
