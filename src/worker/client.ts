/**
 * Main-thread client for the processing worker. Owns the Worker, the
 * latest-wins coalescing policy (only the newest frame waits while
 * one is processing), and buffer transfer. Main thread does capture +
 * UI only; all pixel work happens in the worker.
 */

import { log } from '../diagnostics/log.ts';
import type { PipelineConfig } from '../core/pipeline/config.ts';
import { requestSnapshot, type RequestSnapshot } from '../core/pipeline/snapshot.ts';
import type { PixelBuffer } from '../core/types.ts';
import { Coalescer } from './coalesce.ts';
import type { GridStyle } from './grid.ts';
import { absNow } from '../bench/clock.ts';
import type {
  BackendForce,
  ExportRequest,
  FrameMarks,
  ProcessRequest,
  StageTiming,
  WorkerResponse,
} from './protocol.ts';

/** A processed frame delivered to the UI. */
export interface FrameResult {
  buffer: PixelBuffer;
  timings: StageTiming[];
  /**
   * The config this frame actually ran with. Readers of the sidecar
   * must interpret it against *this* palette, not whatever the live
   * config holds by the time the frame lands — one frame after any
   * palette change the two differ, and stats read against the wrong
   * palette under-reported the design (COUNT-01's "colours: 2" against
   * a 489-entry render; a must-fix for ICE-RECOLOUR-01, D197).
   *
   * This used to be the live config **object**, so the promise above
   * was not kept: handing back a reference to state the app mutates
   * means a reader sees whatever is current, which is the very thing
   * COUNT-01 was about. It is now a snapshot taken at submission
   * (STATE-03).
   */
  config: PipelineConfig;
}

/**
 * Measurement hook (M13-MEAS-02): observes when a job actually starts
 * (posted to the worker — not when a frame merely replaces the pending
 * one) and when its response arrives, in absolute monotonic ms so the
 * spans line up with the worker's {@link FrameMarks}. Purely additive:
 * the app never sets one; only the browser harness does.
 */
export interface JobObserver {
  jobStarted(id: number, atAbsMs: number): void;
  jobSettled(
    id: number,
    atAbsMs: number,
    outcome: 'result' | 'error',
    marks?: FrameMarks,
  ): void;
}

interface Job {
  buffer: PixelBuffer;
  config: PipelineConfig;
  /** Taken at submit, before the job can wait behind another. */
  snapshot: RequestSnapshot;
  /** Harness-only backend force (M13-PROF-03); app traffic never sets it. */
  force?: BackendForce;
}

/** Rebuild a PixelBuffer from a transferred response, sidecar included. */
function toBuffer(
  width: number,
  height: number,
  pixels: ArrayBuffer,
  indices: ArrayBuffer | null,
): PixelBuffer {
  const buffer: PixelBuffer = {
    width,
    height,
    data: new Uint8ClampedArray(pixels),
  };
  if (indices !== null) buffer.indices = new Uint16Array(indices);
  return buffer;
}

/** Wraps the pipeline worker behind a latest-wins submit API. */
export class PipelineClient {
  private readonly worker: Worker;
  private readonly coalescer = new Coalescer<Job>();
  private nextId = 0;
  private onResult: ((frame: FrameResult) => void) | null = null;
  private observer: JobObserver | null = null;
  /**
   * The preview job the worker is running, keyed by request id. The
   * coalescer allows one in flight, so this never holds more than one
   * entry; a map rather than a field so an export response (its own
   * id space, never in here) can never be mistaken for it.
   */
  private readonly inFlight = new Map<number, RequestSnapshot>();
  /** Export runs awaiting their result, keyed by request id. */
  private readonly pendingExports = new Map<
    number,
    { resolve: (buffer: PixelBuffer) => void; reject: (error: Error) => void }
  >();

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

  /** Register the measurement observer (harness only; additive). */
  setObserver(observer: JobObserver | null): void {
    this.observer = observer;
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

  /** Toggle/position the source-vs-output split (0–1 of design width). */
  setCompare(enabled: boolean, position: number): void {
    this.worker.postMessage({ type: 'compare', enabled, position });
  }

  /** Highlight one palette index on the preview; null clears (M14-EXT-17). */
  setHighlight(index: number | null): void {
    this.worker.postMessage({ type: 'highlight', index });
  }

  /**
   * Submit a frame. If the worker is busy the frame waits as the
   * single pending slot; superseded frames are dropped silently
   * (latest-wins — there is no queue).
   */
  submit(buffer: PixelBuffer, config: PipelineConfig, force?: BackendForce): void {
    // Snapshot here, not in `post`: a coalesced frame can sit in the
    // pending slot while the user keeps moving controls, so the
    // config that reaches `post` may already be a later one than the
    // caller submitted (STATE-03).
    const startNow = this.coalescer.submit({
      buffer,
      config,
      snapshot: requestSnapshot(config),
      ...(force === undefined ? {} : { force }),
    });
    if (startNow) this.post(startNow);
  }

  /**
   * Re-run the pipeline for an export and resolve with the output
   * buffer. Bypasses coalescing (every export is answered) and the
   * preview surface — full quality by construction (AGENTS.md
   * invariant). The caller's buffer is transferred, so pass a copy.
   */
  exportFrame(
    buffer: PixelBuffer,
    config: PipelineConfig,
    force?: BackendForce,
  ): Promise<PixelBuffer> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingExports.set(id, { resolve, reject });
      const request: ExportRequest = {
        type: 'export',
        id,
        width: buffer.width,
        height: buffer.height,
        pixels: buffer.data.buffer as ArrayBuffer,
        config,
        ...(force === undefined ? {} : { force }),
      };
      this.worker.postMessage(request, [request.pixels]);
    });
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
      ...(job.force === undefined ? {} : { force: job.force }),
    };
    this.inFlight.set(request.id, job.snapshot);
    this.observer?.jobStarted(request.id, absNow());
    this.worker.postMessage(request, [request.pixels]);
  }

  private handleResponse(response: WorkerResponse): void {
    // Export responses are one-to-one by id and never touch the
    // coalescer — it only tracks preview jobs.
    if (response.type === 'export-result') {
      const pending = this.pendingExports.get(response.id);
      this.pendingExports.delete(response.id);
      pending?.resolve(toBuffer(response.width, response.height, response.pixels, response.indices));
      return;
    }
    if (response.type === 'error' && this.pendingExports.has(response.id)) {
      const pending = this.pendingExports.get(response.id);
      this.pendingExports.delete(response.id);
      log.error('worker', 'export failed', { message: response.message });
      pending?.reject(new Error(response.message));
      return;
    }
    const snapshot = this.inFlight.get(response.id);
    this.inFlight.delete(response.id);
    if (response.type === 'error') {
      log.error('worker', 'frame failed', { message: response.message });
      this.observer?.jobSettled(response.id, absNow(), 'error');
    } else if (snapshot !== undefined) {
      this.observer?.jobSettled(response.id, absNow(), 'result', response.marks);
      this.onResult?.({
        buffer: toBuffer(response.width, response.height, response.pixels, response.indices),
        timings: response.timings,
        config: snapshot.config,
      });
    }
    const next = this.coalescer.complete();
    if (next) this.post(next);
  }
}
