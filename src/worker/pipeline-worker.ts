/**
 * Processing-worker entry point (Vite module worker). A thin shell:
 * pipeline logic lives in execute.ts, preview drawing in
 * preview-surface.ts — both plain modules the test suite exercises
 * directly. This file only routes messages and transfers buffers.
 *
 * On each processed frame the worker snapshots an ImageBitmap for
 * the preview surface BEFORE transferring the pixels back (the
 * transfer detaches the buffer), so view changes redraw without
 * reprocessing.
 */

import { registerWasmDither } from '../backends/wasm/dither.ts';
import { fullRgbVariant, type PipelineConfig } from '../core/pipeline/config.ts';
import { executeRequest } from './execute.ts';
import {
  resizeSurface,
  setCompare,
  setFrame,
  setGridStyle,
  setSourceFrame,
  setSurface,
  setView,
} from './preview-surface.ts';
import type { WorkerRequest } from './protocol.ts';

/** Minimal worker-scope surface (avoids juggling TS lib targets). */
interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

// Fire-and-forget: frames arriving before the wasm module is ready
// (or when it is unavailable) run on the ts backend via the
// executor's fallback — registration is additive, never blocking.
void registerWasmDither();

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
  const response = executeRequest({
    type: 'process',
    id: -1,
    width: lastFrame.width,
    height: lastFrame.height,
    pixels: lastFrame.pixels,
    config: fullRgbVariant(lastFrame.config),
  });
  if (response.type !== 'result') return;
  const image = new ImageData(
    new Uint8ClampedArray(response.pixels),
    response.width,
    response.height,
  );
  void createImageBitmap(image).then(setSourceFrame);
}

scope.onmessage = (event: MessageEvent): void => {
  const request = event.data as WorkerRequest;
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
    case 'export': {
      // Full-quality re-run for an export: no preview draw, no
      // lastFrame update — the result goes straight back by id.
      const response = executeRequest({
        type: 'process',
        id: request.id,
        width: request.width,
        height: request.height,
        pixels: request.pixels,
        config: request.config,
      });
      if (response.type === 'result') {
        scope.postMessage(
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
        scope.postMessage(response, []);
      }
      break;
    }
    case 'process': {
      lastFrame = {
        width: request.width,
        height: request.height,
        pixels: request.pixels,
        config: request.config,
      };
      const response = executeRequest(request);
      if (compareEnabled) refreshSourceFrame();
      if (response.type === 'result') {
        const image = new ImageData(
          new Uint8ClampedArray(response.pixels),
          response.width,
          response.height,
        );
        void createImageBitmap(image).then((bitmap) => {
          setFrame(bitmap);
          // Transfer AFTER the bitmap snapshot exists.
          scope.postMessage(response, [response.pixels]);
        });
      } else {
        scope.postMessage(response, []);
      }
      break;
    }
  }
};
