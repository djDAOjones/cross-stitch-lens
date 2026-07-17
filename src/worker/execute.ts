/**
 * Frame execution: request → stage list → per-stage timed run →
 * response. Pure with respect to its inputs (timing aside), so the
 * worker entry stays a two-line postMessage shell and this logic is
 * testable without a Worker.
 */

import { buildStages } from '../core/pipeline/config.ts';
import type { PixelBuffer } from '../core/types.ts';
import { getLut } from './lut-cache.ts';
import type { ProcessRequest, StageTiming, WorkerResponse } from './protocol.ts';

/** Run one frame; never throws — failures become error responses. */
export function executeRequest(
  request: ProcessRequest,
  now: () => number = () => performance.now(),
): WorkerResponse {
  try {
    const stages = buildStages(request.config, getLut);
    let buffer: PixelBuffer = {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.pixels),
    };
    const timings: StageTiming[] = [];
    for (const instance of stages) {
      const start = now();
      const fn = instance.stage.backends[instance.backend ?? 'ts'] ?? instance.stage.backends.ts;
      buffer = fn(buffer, instance.params);
      timings.push({ stage: instance.stage.name, ms: now() - start });
    }
    return {
      type: 'result',
      id: request.id,
      width: buffer.width,
      height: buffer.height,
      pixels: buffer.data.buffer as ArrayBuffer,
      timings,
    };
  } catch (error) {
    return {
      type: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
