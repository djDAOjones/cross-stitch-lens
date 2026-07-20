/**
 * Worker message routing, separated from the Worker entry so it can be
 * driven directly by the test suite (`pipeline-worker.ts` is a shell
 * that wires `self` to this module).
 *
 * **The response invariant:** every `process` and `export` request
 * posts exactly one response — a result or an error — no matter what
 * fails. The main-thread client releases its latest-wins gate only in
 * `handleResponse`, so a request that silently produces nothing wedges
 * live preview permanently: every later frame is dropped and nothing
 * recovers it (D46). Both entry paths are async and both can reject
 * (`ensureLut` on WebGPU device loss, `createImageBitmap` on a bad
 * frame), which is why the async work is funnelled through
 * `respondOnce` rather than a floating `void (async () => …)()`.
 */

import { fullRgbVariant, type PipelineConfig } from '../core/pipeline/config.ts';
import { log } from '../diagnostics/log.ts';
import { executeRequest } from './execute.ts';
import { ensureLut } from './lut-cache.ts';
import {
  resizeSurface,
  setCompare,
  setFrame,
  setGridStyle,
  setSourceFrame,
  setSurface,
  setView,
} from './preview-surface.ts';
import type { ProcessRequest, WorkerRequest, WorkerResponse } from './protocol.ts';

/** The worker-scope calls the router needs, injectable for tests. */
export interface RouterDeps {
  post(message: unknown, transfer?: Transferable[]): void;
  /** Fill the LUT cache before a frame that needs one (GPU-first). */
  ensureLutFor(config: PipelineConfig): Promise<void>;
  execute(request: ProcessRequest): WorkerResponse;
  toBitmap(image: ImageData): Promise<ImageBitmap>;
}

/**
 * Fill the LUT cache (GPU-first) before a frame that needs one — a
 * non-dithered palette reduction. Cache hits resolve immediately;
 * misses run once per palette+metric change. The executor's sync
 * getLut remains the safety net if this is skipped.
 */
export async function ensureLutFor(config: PipelineConfig): Promise<void> {
  if (config.palette === null || config.dither) return;
  await ensureLut(config.palette, config.metric);
}

/** Production wiring: real cache, executor, and bitmap encoder. */
export function defaultDeps(
  post: (message: unknown, transfer?: Transferable[]) => void,
): RouterDeps {
  return {
    post,
    ensureLutFor,
    execute: executeRequest,
    toBitmap: (image) => createImageBitmap(image),
  };
}

/** Wrap a result's pixels in an ImageData for the preview snapshot. */
function toImageData(response: Extract<WorkerResponse, { type: 'result' }>): ImageData {
  return new ImageData(
    new Uint8ClampedArray(response.pixels),
    response.width,
    response.height,
  );
}

/** Route one request; never throws, always answers process/export. */
export function createRouter(deps: RouterDeps): (request: WorkerRequest) => void {
  /**
   * Last source frame, kept for the split compare: stages are pure, so
   * the request buffer survives processing and a late compare-enable
   * can build its full-RGB bitmap without a main-thread round-trip.
   */
  let lastFrame: {
    width: number;
    height: number;
    pixels: ArrayBuffer;
    config: PipelineConfig;
  } | null = null;
  let compareEnabled = false;

  /** Run the full-RGB twin of the last frame and hand it to the surface. */
  function refreshSourceFrame(): void {
    if (lastFrame === null) return;
    const response = deps.execute({
      type: 'process',
      id: -1,
      width: lastFrame.width,
      height: lastFrame.height,
      pixels: lastFrame.pixels,
      config: fullRgbVariant(lastFrame.config),
    });
    if (response.type !== 'result') return;
    // Compare is decoration: a failure here must not disturb the frame
    // response, so it is logged and dropped rather than propagated.
    deps.toBitmap(toImageData(response)).then(setSourceFrame, (error: unknown) => {
      log.warn('worker', 'compare bitmap failed', { message: describe(error) });
    });
  }

  /**
   * Run `work`, guaranteeing exactly one response for `id`: whatever
   * `work` posts, or an error response if it throws or rejects.
   */
  function respondOnce(id: number, work: () => Promise<void>): void {
    void work().catch((error: unknown) => {
      const message = describe(error);
      log.error('worker', 'request failed — releasing the frame gate', { id, message });
      deps.post({ type: 'error', id, message }, []);
    });
  }

  async function runExport(request: Extract<WorkerRequest, { type: 'export' }>): Promise<void> {
    await deps.ensureLutFor(request.config);
    const response = deps.execute({
      type: 'process',
      id: request.id,
      width: request.width,
      height: request.height,
      pixels: request.pixels,
      config: request.config,
    });
    if (response.type === 'result') {
      deps.post(
        {
          type: 'export-result',
          id: response.id,
          width: response.width,
          height: response.height,
          pixels: response.pixels,
        },
        [response.pixels],
      );
    } else {
      deps.post(response, []);
    }
  }

  async function runProcess(request: ProcessRequest): Promise<void> {
    lastFrame = {
      width: request.width,
      height: request.height,
      pixels: request.pixels,
      config: request.config,
    };
    await deps.ensureLutFor(request.config);
    const response = deps.execute(request);
    if (compareEnabled) refreshSourceFrame();
    if (response.type !== 'result') {
      deps.post(response, []);
      return;
    }
    // The preview snapshot must exist before the transfer detaches the
    // buffer — but a failed snapshot only costs the preview redraw, so
    // the pixels still go back and the gate still releases.
    try {
      setFrame(await deps.toBitmap(toImageData(response)));
    } catch (error) {
      log.warn('worker', 'preview bitmap failed — frame still returned', {
        message: describe(error),
      });
    }
    deps.post(response, [response.pixels]);
  }

  return (request: WorkerRequest): void => {
    switch (request.type) {
      case 'canvas':
        setSurface(request.canvas);
        break;
      case 'view':
        setView({ scale: request.scale, tx: request.tx, ty: request.ty });
        break;
      case 'resize':
        resizeSurface(request.width, request.height);
        break;
      case 'grid':
        setGridStyle(request.style);
        break;
      case 'compare': {
        const enabling = request.enabled && !compareEnabled;
        compareEnabled = request.enabled;
        setCompare(request.enabled, request.position);
        if (enabling) refreshSourceFrame();
        break;
      }
      case 'export':
        // Full-quality re-run for an export: no preview draw, no
        // lastFrame update — the result goes straight back by id.
        respondOnce(request.id, () => runExport(request));
        break;
      case 'process':
        respondOnce(request.id, () => runProcess(request));
        break;
    }
  };
}

/** Error → message, for log data and error responses. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
