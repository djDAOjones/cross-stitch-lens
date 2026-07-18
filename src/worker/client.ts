/**
 * Main-thread client for the processing worker. Owns the Worker, the
 * latest-wins coalescing policy (only the newest frame waits while
 * one is processing), and buffer transfer. Main thread does capture +
 * UI only; all pixel work happens in the worker.
 */

import { log } from '../diagnostics/log.ts';
import type { PipelineConfig } from '../core/pipeline/config.ts';
import type { PixelBuffer } from '../core/types.ts';
import { Coalescer } from './coalesce.ts';
import type { GridStyle } from './grid.ts';
import type { ProcessRequest, StageTiming, WorkerResponse } from './protocol.ts';

/** A processed frame delivered to the UI. */
export interface FrameResult {
  buffer: PixelBuffer;
  timings: StageTiming[];
}

interface Job {
  buffer: PixelBuffer;
  config: PipelineConfig;
}

/** Wraps the pipeline worker behind a latest-wins submit API. */
export class PipelineClient {
  private readonly worker: Worker;
  private readonly coalescer = new Coalescer<Job>();
  private nextId = 0;
  private onResult: ((frame: FrameResult) => void) | null = null;

  constructor() {
    this.worker = new Worker(new URL('./pipeline-worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent) => {
      this.handleResponse(event.data as WorkerResponse);
    };
  }

  /** Register the sink for processed frames (latest frame only). */
  setOnResult(callback: (frame: FrameResult) => void): void {
    this.onResult = callback;
  }

  /**
   * Hand the preview canvas to the worker (one-way: the main thread
   * can no longer draw on it). Call once, before the first frame.
   */
  attachCanvas(canvas: HTMLCanvasElement): void {
    const offscreen = canvas.transferControlToOffscreen();
    this.worker.postMessage({ type: 'canvas', canvas: offscreen }, [offscreen]);
  }

  /** Apply a view transform (device px per stitch + offsets). */
  setView(scale: number, tx: number, ty: number): void {
    this.worker.postMessage({ type: 'view', scale, tx, ty });
  }

  /** Resize the preview backing store (device px). */
  resizeSurface(width: number, height: number): void {
    this.worker.postMessage({ type: 'resize', width, height });
  }

  /** Restyle the grid overlay (thicknesses already in device px). */
  setGridStyle(style: GridStyle): void {
    this.worker.postMessage({ type: 'grid', style });
  }

  /**
   * Submit a frame. If the worker is busy the frame waits as the
   * single pending slot; superseded frames are dropped silently
   * (latest-wins — there is no queue).
   */
  submit(buffer: PixelBuffer, config: PipelineConfig): void {
    const startNow = this.coalescer.submit({ buffer, config });
    if (startNow) this.post(startNow);
  }

  /** Frames dropped by coalescing (diagnostics). */
  get droppedFrames(): number {
    return this.coalescer.droppedCount;
  }

  private post(job: Job): void {
    const request: ProcessRequest = {
      type: 'process',
      id: this.nextId++,
      width: job.buffer.width,
      height: job.buffer.height,
      pixels: job.buffer.data.buffer as ArrayBuffer,
      config: job.config,
    };
    this.worker.postMessage(request, [request.pixels]);
  }

  private handleResponse(response: WorkerResponse): void {
    if (response.type === 'error') {
      log.error('worker', 'frame failed', { message: response.message });
    } else if (this.onResult) {
      this.onResult({
        buffer: {
          width: response.width,
          height: response.height,
          data: new Uint8ClampedArray(response.pixels),
        },
        timings: response.timings,
      });
    }
    const next = this.coalescer.complete();
    if (next) this.post(next);
  }
}
