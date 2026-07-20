/**
 * Frame execution: request → stage list → per-stage timed run →
 * response. Pure with respect to its inputs (timing aside), so the
 * worker entry stays a two-line postMessage shell and this logic is
 * testable without a Worker.
 */

import { buildStages, type PipelineConfig } from '../core/pipeline/config.ts';
import type { Backend, PixelBuffer } from '../core/types.ts';
import { routeDither, selectedBackend } from './backend-select.ts';
import { getCandidates, getLut } from './lut-cache.ts';
import type { ProcessRequest, StageTiming, WorkerResponse } from './protocol.ts';

/**
 * Observe each stage's output as the frame runs.
 *
 * Exists for the split compare (M5-PERF-28): under the default
 * 'resize-first' preset the compare half is exactly the pipeline's
 * post-resize buffer, so the router reads it here instead of running a
 * second full-RGB pass over the source. The buffer is safe to read —
 * stages never mutate their input and each allocates its own output —
 * but it must not be retained past the callback, since the next stage
 * may be the last and its output gets transferred.
 */
export type StageObserver = (stage: string, buffer: PixelBuffer) => void;

/**
 * Workload-based backend routing for the stages that have it, or
 * undefined to fall through to the recorded selection.
 *
 * Only dither routes today: it is the one stage with two mature
 * backends whose winner depends on the frame (M5-PERF-27).
 */
function routeFor(stageName: string, config: PipelineConfig): Backend | undefined {
  if (stageName !== 'dither' || config.palette === null) return undefined;
  return routeDither({
    grid: Math.max(config.grid.width, config.grid.height),
    paletteSize: config.palette.entries.length,
    metric: config.metric,
  });
}

/** Run one frame; never throws — failures become error responses. */
export function executeRequest(
  request: ProcessRequest,
  now: () => number = () => performance.now(),
  observe?: StageObserver,
): WorkerResponse {
  try {
    const stages = buildStages(request.config, {
      lut: getLut,
      candidates: getCandidates,
    });
    let buffer: PixelBuffer = {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.pixels),
    };
    const timings: StageTiming[] = [];
    for (const instance of stages) {
      // Explicit instance backend > workload routing > recorded
      // selection > 'ts'; a requested backend that is not registered
      // falls back to the TS reference (architecture.md → "Stage
      // backends"). Routing sits above the recorded selection because
      // it is per-workload: D42's single startup calibration could not
      // see that the dither winner flips on metric (M5-PERF-27).
      const requested: Backend =
        instance.backend ??
        routeFor(instance.stage.name, request.config) ??
        selectedBackend(instance.stage.name) ??
        'ts';
      const fn = instance.stage.backends[requested] ?? instance.stage.backends.ts;
      const used: Backend =
        instance.stage.backends[requested] === undefined ? 'ts' : requested;
      const start = now();
      buffer = fn(buffer, instance.params);
      timings.push({ stage: instance.stage.name, ms: now() - start, backend: used });
      // Observation is outside the timing window: it is the router's
      // bookkeeping, not the stage's cost.
      observe?.(instance.stage.name, buffer);
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
