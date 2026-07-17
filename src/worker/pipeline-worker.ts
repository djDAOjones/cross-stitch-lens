/**
 * Processing-worker entry point (Vite module worker). A thin shell:
 * all logic lives in execute.ts / lut-cache.ts, which the test suite
 * exercises directly — this file only moves messages and transfers
 * buffers.
 */

import { executeRequest } from './execute.ts';
import type { ProcessRequest } from './protocol.ts';

/** Minimal worker-scope surface (avoids juggling TS lib targets). */
interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent): void => {
  const request = event.data as ProcessRequest;
  if (request.type !== 'process') return;
  const response = executeRequest(request);
  scope.postMessage(
    response,
    response.type === 'result' ? [response.pixels] : [],
  );
};
