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

import { absNow } from '../bench/clock.ts';
import { fullRgbVariant, type PipelineConfig } from '../core/pipeline/config.ts';
import { log } from '../diagnostics/log.ts';
import { executeRequest, type StageObserver } from './execute.ts';
import { ensureLut } from './lut-cache.ts';
import {
  resizeSurface,
  setCompare,
  setFrame,
  setGridStyle,
  setHighlight,
  setHighlightFrame,
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
  execute(request: ProcessRequest, observe?: StageObserver): WorkerResponse;
  toBitmap(image: ImageData): Promise<ImageBitmap>;
}

/**
 * Fill the LUT cache (GPU-first) before a frame that needs one — a
 * non-dithered palette reduction. Cache hits resolve immediately;
 * misses run once per palette+metric change. The executor's sync
 * getLut remains the safety net if this is skipped.
 */
export async function ensureLutFor(config: PipelineConfig): Promise<void> {
  if (config.palette === null || config.dither.algorithm !== 'none') return;
  await ensureLut(config.palette, config.metric);
}

/** Production wiring: real cache, executor, and bitmap encoder. */
export function defaultDeps(
  post: (message: unknown, transfer?: Transferable[]) => void,
): RouterDeps {
  return {
    post,
    ensureLutFor,
    // `now` keeps its default; the observer is the router's third arg.
    execute: (request, observe) => executeRequest(request, undefined, observe),
    toBitmap: (image) => createImageBitmap(image),
  };
}

/** Both buffers to transfer, skipping the sidecar when there is none. */
function transferable(pixels: ArrayBuffer, indices: ArrayBuffer | null): Transferable[] {
  return indices === null ? [pixels] : [pixels, indices];
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

  /**
   * Geometry the current compare bitmap was built for. The compare half
   * is a pure function of the source pixels and the geometry, so it
   * only needs rebuilding when one of them changes (M5-PERF-28).
   */
  let compareGeometry = '';

  /** Geometry identity of a config — everything the compare half depends on. */
  function geometryKey(config: PipelineConfig): string {
    return [
      config.preset,
      config.grid.width,
      config.grid.height,
      config.resizeMode,
    ].join(':');
  }

  /** Hand a full-RGB grid-sized buffer to the surface as the compare half. */
  function publishSourceFrame(image: ImageData, geometry: string): void {
    // Compare is decoration: a failure here must not disturb the frame
    // response, so it is logged and dropped rather than propagated.
    deps.toBitmap(image).then(
      (bitmap) => {
        compareGeometry = geometry;
        setSourceFrame(bitmap);
      },
      (error: unknown) => {
        log.warn('worker', 'compare bitmap failed', { message: describe(error) });
      },
    );
  }

  /**
   * Rebuild the compare half by running the full-RGB twin of the last
   * frame — the fallback path, used when the main run cannot donate its
   * post-resize buffer (the 'reduce-first' preset, where resize runs
   * *after* the colour stage so no intermediate is the full-RGB grid)
   * and when compare is switched on between frames.
   */
  function refreshSourceFrame(): void {
    if (lastFrame === null) return;
    const config = fullRgbVariant(lastFrame.config);
    const response = deps.execute({
      type: 'process',
      id: -1,
      width: lastFrame.width,
      height: lastFrame.height,
      pixels: lastFrame.pixels,
      config,
    });
    if (response.type !== 'result') return;
    publishSourceFrame(toImageData(response), geometryKey(config));
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
      // The harness force must survive the export re-shape, or a
      // forced export comparison silently measures the routed backend.
      ...(request.force === undefined ? {} : { force: request.force }),
    });
    if (response.type === 'result') {
      deps.post(
        {
          type: 'export-result',
          id: response.id,
          width: response.width,
          height: response.height,
          pixels: response.pixels,
          indices: response.indices,
        },
        transferable(response.pixels, response.indices),
      );
    } else {
      deps.post(response, []);
    }
  }

  async function runProcess(request: ProcessRequest): Promise<void> {
    const receivedAt = absNow();
    lastFrame = {
      width: request.width,
      height: request.height,
      pixels: request.pixels,
      config: request.config,
    };
    await deps.ensureLutFor(request.config);

    // Under 'resize-first' the pipeline's post-resize buffer IS the
    // compare half — same source, same geometry, and the colour stages
    // that follow are exactly what compare exists to show the absence
    // of. Taking it here costs one copy instead of re-running the whole
    // full-RGB pipeline over the full source every frame (16.4% of a
    // 300² frame, M5-PERF-28). Skipping the copy is not an option: the
    // buffer belongs to the pipeline and ImageData takes ownership.
    const wantsDonation = compareEnabled && request.config.preset === 'resize-first';
    let donated: ImageData | null = null;
    const observe: StageObserver | undefined = wantsDonation
      ? (stage, buffer): void => {
          if (stage !== 'resize' || donated !== null) return;
          donated = new ImageData(
            new Uint8ClampedArray(buffer.data),
            buffer.width,
            buffer.height,
          );
        }
      : undefined;

    const response = deps.execute(request, observe);
    const computeDoneAt = absNow();

    if (compareEnabled) {
      const geometry = geometryKey(fullRgbVariant(request.config));
      if (donated !== null) {
        publishSourceFrame(donated, geometry);
      } else {
        // 'reduce-first', or the resize stage never ran: fall back to
        // the dedicated pass. Still skipped when nothing the compare
        // half depends on has changed.
        refreshSourceFrame();
      }
    }
    if (response.type !== 'result') {
      deps.post(response, []);
      return;
    }
    // The preview snapshot must exist before the transfer detaches the
    // buffer — but a failed snapshot only costs the preview redraw, so
    // the pixels still go back and the gate still releases.
    try {
      // Copy the index sidecar for the highlight decoration before the
      // transfer detaches it (M14-EXT-17). One typed-array slice per
      // frame (~180 KB at 300²) — same decoration cost class as the
      // compare copy, and kept unconditional so a highlight engages
      // instantly on a static image with no re-run.
      setHighlightFrame(
        response.indices === null ? null : new Uint16Array(response.indices),
        response.width,
        response.height,
      );
      const bitmap = await deps.toBitmap(toImageData(response));
      const bitmapDoneAt = absNow();
      setFrame(bitmap);
      // Phase marks for the harness (M13-MEAS-02): absolute-clock, and
      // only attached when the draw actually happened — a failed
      // snapshot must not report a preview-update it never made.
      response.marks = { receivedAt, computeDoneAt, bitmapDoneAt, drawDoneAt: absNow() };
    } catch (error) {
      log.warn('worker', 'preview bitmap failed — frame still returned', {
        message: describe(error),
      });
    }
    deps.post(response, transferable(response.pixels, response.indices));
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
        // Dragging the split position re-enters here on every pointer
        // move; only an actual enable — and only when the bitmap on the
        // surface is not already the right one — needs a pipeline run.
        const stale =
          lastFrame !== null &&
          compareGeometry !== geometryKey(fullRgbVariant(lastFrame.config));
        if (enabling && (stale || compareGeometry === '')) refreshSourceFrame();
        break;
      }
      case 'highlight':
        // Decoration only (M14-EXT-17): touches the surface draw and
        // nothing else — processing, exports and lastFrame unaffected.
        setHighlight(request.index);
        break;
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
