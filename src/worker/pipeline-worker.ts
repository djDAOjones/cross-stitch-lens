/**
 * Processing-worker entry point (Vite module worker). A thin shell:
 * message routing lives in router.ts, pipeline logic in execute.ts,
 * preview drawing in preview-surface.ts — all plain modules the test
 * suite exercises directly. This file only owns the worker scope.
 */

import { registerWasmDither } from '../backends/wasm/dither.ts';
import type { WorkerRequest } from './protocol.ts';
import { createRouter, defaultDeps } from './router.ts';

/** Minimal worker-scope surface (avoids juggling TS lib targets). */
interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

// Fire-and-forget: frames arriving before the wasm module is ready
// (or when it is unavailable) run on the ts backend via the
// executor's fallback — registration is additive, never blocking.
// No startup calibration: the dither backend is chosen per frame from
// the workload (M5-PERF-27), which is what D42's single synthetic
// frame could not do.
void registerWasmDither();

const route = createRouter(
  defaultDeps((message, transfer) => {
    scope.postMessage(message, transfer);
  }),
);

scope.onmessage = (event: MessageEvent): void => {
  route(event.data as WorkerRequest);
};
