/**
 * The four resolutions, kept apart on purpose (M6 terminology
 * contract). Pattern, capture, preview, and export scale are
 * independent quantities that a single "resolution" or "scale" field
 * would silently fuse:
 *
 * | Quantity   | Unit                   | Answers                        |
 * | ---------- | ---------------------- | ------------------------------ |
 * | pattern    | stitches               | how big is the design?         |
 * | capture    | source pixels          | which pixels feed the pipeline?|
 * | preview    | CSS px per stitch      | how big does it look on screen?|
 * | export     | output px per stitch   | how big is the exported file?  |
 *
 * Every field name carries its unit, and the update helpers below
 * return a model that shares the three untouched slices *by
 * reference* — so "changing one leaves the other three untouched" is
 * an identity check, not a deep comparison that could pass on a copy.
 *
 * Ownership: `pattern`, `preview`, and `export` are owned here and
 * consumed by `PipelineConfig.grid`, the preview controller, and the
 * exporters respectively. `capture` is a read-only projection of the
 * `CropRect` in `src/capture/crop.ts`, which owns crop geometry
 * including its position.
 */

import { MAX_GRID, MIN_GRID } from '../core/pipeline/resize.ts';
import {
  MAX_PREVIEW_CSS_PX,
  MIN_PREVIEW_CSS_PX,
  type PreviewFitMode,
  type ProjectPreview,
} from '../core/project.ts';

export { MAX_PREVIEW_CSS_PX, MIN_PREVIEW_CSS_PX, type PreviewFitMode };

/** Pattern resolution — the stitch grid; the design's own size. */
export interface PatternResolution {
  widthStitches: number;
  heightStitches: number;
}

/** Capture resolution — the source-pixel rectangle feeding the grid. */
export interface CaptureResolution {
  widthPx: number;
  heightPx: number;
}

/**
 * Preview scale — screen size only. DPR-neutral: CSS px per stitch.
 * This *is* the persisted shape (`ProjectPreview`), aliased rather
 * than redeclared so the schema and the live model cannot drift.
 */
export type PreviewScale = ProjectPreview;

/** Export scale — output pixels per stitch, per exporter. */
export interface ExportScale {
  /** Clean-PNG enlargement (integer nearest-neighbour). */
  cleanPxPerStitch: number;
  /** Styled-chart cell size. */
  chartCellPx: number;
}

/** The four quantities together. Only ever updated via `with*` below. */
export interface ScaleModel {
  pattern: PatternResolution;
  capture: CaptureResolution;
  preview: PreviewScale;
  export: ExportScale;
}

/** Pattern side bounds in stitches (shared with the resize stage). */
export const MIN_PATTERN_SIDE = MIN_GRID;
export const MAX_PATTERN_SIDE = MAX_GRID;

/** Starting model: a 200 × 200 pattern, fit to the space available. */
export function defaultScales(): ScaleModel {
  return {
    pattern: { widthStitches: 200, heightStitches: 200 },
    capture: { widthPx: 0, heightPx: 0 },
    preview: { mode: 'space', cssPxPerStitch: 1 },
    export: { cleanPxPerStitch: 1, chartCellPx: 10 },
  };
}

/**
 * Replace the pattern resolution. Note what this does *not* do: it
 * chooses no capture size, no preview scale, and no export scale on
 * the user's behalf. Changing the pattern legitimately changes the
 * output stitch count — that is the point — but the other three
 * quantities are returned unchanged, by reference.
 */
export function withPattern(model: ScaleModel, pattern: PatternResolution): ScaleModel {
  return { ...model, pattern };
}

/** Replace the capture projection; pattern/preview/export untouched. */
export function withCapture(model: ScaleModel, capture: CaptureResolution): ScaleModel {
  return { ...model, capture };
}

/** Replace the preview scale; a view-only change, never a pipeline run. */
export function withPreview(model: ScaleModel, preview: PreviewScale): ScaleModel {
  return { ...model, preview };
}

/** Replace the export scale; changes no on-screen pixel until export. */
export function withExport(model: ScaleModel, exportScale: ExportScale): ScaleModel {
  return { ...model, export: exportScale };
}

/** Pattern aspect ratio (width ÷ height); the capture lock's target. */
export function patternAspect(pattern: PatternResolution): number {
  return pattern.widthStitches / pattern.heightStitches;
}

/**
 * Preview scale as a percentage of 1:1, for display. 100 % is one CSS
 * pixel per stitch — deliberately not one *device* pixel, so the
 * number means the same thing on a Retina display as on a 1× one.
 */
export function previewPercent(preview: PreviewScale): number {
  return Math.round(preview.cssPxPerStitch * 100);
}

/** CSS px per stitch → device px per stitch (the viewport's unit). */
export function toDevicePxPerStitch(cssPxPerStitch: number, dpr: number): number {
  return cssPxPerStitch * dpr;
}

/** Device px per stitch → CSS px per stitch (the persisted unit). */
export function toCssPxPerStitch(devicePxPerStitch: number, dpr: number): number {
  return devicePxPerStitch / dpr;
}

/**
 * Visible label text, in one place so the four quantities cannot drift
 * into synonyms (UI-STANDARDS → "Consistency": no synonyms for
 * existing concepts). Labels stay 1–3 words; the unit rides in the
 * helper line, where it prevents error without bloating the label.
 */
export const SCALE_LABELS = {
  // "Design width/height" (M14-EXT-04, owner pick at D88): user
  // language matching the Design section; "canvas" rejected for the
  // fabric (M12) and preview-surface collisions.
  patternWidth: 'Design width',
  patternHeight: 'Design height',
  patternHelper: 'Stitches across the design',
  patternHeightHelper: 'Stitches down the design',
  captureRegion: 'Capture region',
  previewScale: 'Preview scale',
  exportScale: 'Export scale',
  exportHelper: 'Pixels per stitch in the clean PNG',
  chartCell: 'Chart cell size',
  chartHelper: 'Pixels per stitch in the chart',
} as const;

/** `200 × 150 stitches` — the pattern readout. */
export function patternSummary(pattern: PatternResolution): string {
  return `${String(pattern.widthStitches)} × ${String(pattern.heightStitches)} stitches`;
}

/**
 * `Capture region 800 × 600 px → 200 × 150 stitches` — both units in
 * one line so the two are never mistaken for each other
 * (UI-STANDARDS → "Capture UX": source pixels *and* stitches).
 */
export function captureSummary(model: ScaleModel): string {
  const { widthPx, heightPx } = model.capture;
  return `${SCALE_LABELS.captureRegion} ${String(widthPx)} × ${String(heightPx)} px → ${patternSummary(model.pattern)}`;
}

/** `Preview scale 250%` — screen size only, never pattern size. */
export function previewSummary(preview: PreviewScale): string {
  return `${SCALE_LABELS.previewScale} ${String(previewPercent(preview))}%`;
}
