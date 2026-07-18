/**
 * Message protocol between the main thread and the processing worker.
 * Pixel data crosses as transferred ArrayBuffers — never structured-
 * clone copies (AGENTS.md → "Communication pattern").
 */

import type { PipelineConfig } from '../core/pipeline/config.ts';

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

export type WorkerRequest =
  | ProcessRequest
  | CanvasRequest
  | ViewRequest
  | SurfaceResizeRequest;

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

/** Worker → main: a frame failed; the worker stays alive. */
export interface ProcessError {
  type: 'error';
  id: number;
  message: string;
}

export type WorkerResponse = ProcessResult | ProcessError;
