/**
 * Message protocol between the main thread and the processing worker.
 * Pixel data crosses as transferred ArrayBuffers — never structured-
 * clone copies (AGENTS.md → "Communication pattern").
 */

import type { PipelineConfig } from '../core/pipeline/config.ts';
import type { GridStyle } from './grid.ts';

/** Main → worker: process one frame under a config. */
export interface ProcessRequest {
  type: 'process';
  /** Client-assigned sequence id, echoed in the result. */
  id: number;
  width: number;
  height: number;
  /** RGBA bytes (transferred). */
  pixels: ArrayBuffer;
  config: PipelineConfig;
}

/** Main → worker: adopt this preview surface (transferred once). */
export interface CanvasRequest {
  type: 'canvas';
  canvas: OffscreenCanvas;
}

/** Main → worker: apply a view transform and redraw the last frame. */
export interface ViewRequest {
  type: 'view';
  /** Device px per stitch. */
  scale: number;
  tx: number;
  ty: number;
}

/** Main → worker: the preview surface changed size (device px). */
export interface SurfaceResizeRequest {
  type: 'resize';
  width: number;
  height: number;
}

/** Main → worker: restyle the grid overlay (thicknesses in device px). */
export interface GridStyleRequest {
  type: 'grid';
  style: GridStyle;
}

/** Main → worker: toggle/position the source-vs-output split (§10). */
export interface CompareRequest {
  type: 'compare';
  enabled: boolean;
  /** Split position as a fraction of the design width (0–1). */
  position: number;
}

/**
 * Main → worker: re-run the pipeline for an export. Same shape as a
 * process request, but the result bypasses the preview surface and
 * coalescing entirely — exports always re-run at full quality
 * (AGENTS.md invariant) and are answered one-to-one by id.
 */
export interface ExportRequest {
  type: 'export';
  /** Client-assigned id; the export result echoes it. */
  id: number;
  width: number;
  height: number;
  /** RGBA bytes (transferred). */
  pixels: ArrayBuffer;
  config: PipelineConfig;
}

export type WorkerRequest =
  | ProcessRequest
  | CanvasRequest
  | ViewRequest
  | SurfaceResizeRequest
  | GridStyleRequest
  | CompareRequest
  | ExportRequest;

/** Per-stage wall-clock timing (diagnostics / future debug panel). */
export interface StageTiming {
  stage: string;
  ms: number;
}

/** Worker → main: one processed frame (pixels transferred back). */
export interface ProcessResult {
  type: 'result';
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  timings: StageTiming[];
}

/** Worker → main: one export re-run (pixels transferred back). */
export interface ExportResult {
  type: 'export-result';
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
}

/**
 * Worker → main: a frame failed; the worker stays alive. Serves both
 * preview and export runs — the client routes by whether the id has a
 * pending export.
 */
export interface ProcessError {
  type: 'error';
  id: number;
  message: string;
}

export type WorkerResponse = ProcessResult | ExportResult | ProcessError;
