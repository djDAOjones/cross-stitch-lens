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

import { executeRequest } from './execute.ts';
import {
  resizeSurface,
  setFrame,
  setGridStyle,
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
    case 'process': {
      const response = executeRequest(request);
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
