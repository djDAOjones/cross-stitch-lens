/**
 * Message protocol between the main thread and the processing worker.
 * Pixel data crosses as transferred ArrayBuffers — never structured-
 * clone copies (AGENTS.md → "Communication pattern").
 */

import type { PipelineConfig } from '../core/pipeline/config.ts';
import type { Backend } from '../core/types.ts';
import type { GridStyle } from './grid.ts';

/**
 * Harness-only per-stage backend force (M13-PROF-03): stage name →
 * backend to run, overriding routing and any recorded selection. It
 * rides on the *request*, never on `PipelineConfig`, precisely so it
 * cannot reach a project file or persist anywhere. A forced backend
 * that is not registered falls back to the TS reference exactly like
 * any other unavailable backend, and the result's `StageTiming.backend`
 * reports what actually ran. The app never sets this; only the browser
 * measurement harness does.
 */
export type BackendForce = Partial<Record<string, Backend>>;

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
  /** Harness-only backend force; absent in all app traffic. */
  force?: BackendForce;
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
 * Main → worker: highlight one thread's stitches on the preview
 * (M14-EXT-17). A Compare-class decoration of the surface draw —
 * deliberately not a `PipelineConfig` field, so by construction it
 * cannot reach processing, exports, or a project file.
 */
export interface HighlightRequest {
  type: 'highlight';
  /** Palette index to highlight, or null to clear. */
  index: number | null;
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
  /** Harness-only backend force; absent in all app traffic. */
  force?: BackendForce;
}

export type WorkerRequest =
  | ProcessRequest
  | CanvasRequest
  | ViewRequest
  | SurfaceResizeRequest
  | GridStyleRequest
  | CompareRequest
  | HighlightRequest
  | ExportRequest;

/** Per-stage wall-clock timing (diagnostics / debug panel). */
export interface StageTiming {
  stage: string;
  ms: number;
  /** The backend that actually ran (after selection + fallback). */
  backend: Backend;
}

/**
 * Worker-side phase marks for one processed frame (M13-MEAS-02).
 *
 * All values are **absolute monotonic milliseconds**
 * (`performance.timeOrigin + performance.now()`), because the Window
 * and the Worker have different time origins and a raw `now()` from
 * one context means nothing in the other. `drawDoneAt` is the
 * measurement contract's preview-update end mark — the preview
 * surface draw returning inside the worker; everything the main
 * thread observes afterwards is transfer and DOM work, reported as a
 * separate diagnostic phase, never folded into preview-update.
 */
export interface FrameMarks {
  /** The process request reached the worker's router. */
  receivedAt: number;
  /** Pipeline compute finished (all stages returned). */
  computeDoneAt: number;
  /** ImageBitmap for the preview snapshot was ready. */
  bitmapDoneAt: number;
  /** The preview surface draw returned (the contract's end mark). */
  drawDoneAt: number;
}

/**
 * Worker → main: one processed frame (pixels transferred back).
 *
 * `indices` is the palette-index sidecar (`Uint16Array` bytes), also
 * transferred. It is `null` whenever the final stage did not produce
 * one — full-RGB mode, or `reduce-first`, where the resize after the
 * colour stage leaves the output off-palette (D49). Absent means
 * "cannot be identified", never "identify it yourself from the RGB".
 */
export interface ProcessResult {
  type: 'result';
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  indices: ArrayBuffer | null;
  timings: StageTiming[];
  /**
   * Absolute-clock phase marks (M13-MEAS-02). Optional and additive:
   * absent when the preview snapshot failed (the frame still returns —
   * D46's gate-release invariant outranks measurement).
   */
  marks?: FrameMarks;
}

/** Worker → main: one export re-run (pixels transferred back). */
export interface ExportResult {
  type: 'export-result';
  id: number;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  indices: ArrayBuffer | null;
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
