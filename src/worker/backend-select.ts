/**
 * Automatic per-stage backend selection (architecture.md → "Stage
 * backends": automatic by default, profiled). Feature-detect is the
 * registration itself — a backend absent from a stage's map is never
 * picked, and the executor's `?? backends.ts` fallback holds even if a
 * stale selection points at a backend that has gone. Profiling is a
 * one-shot calibration off the frame path: run the stage on a
 * synthetic buffer per candidate, compare medians, and require a
 * clear win (hysteresis margin) before leaving the TS reference.
 *
 * WebGPU is not selected here: its kernels are async (LUT build is
 * auto-selected GPU-first inside lut-cache.ts; the mapping kernel
 * stays unrouted until the executor grows an async path — D41).
 */

import { loadDmcPalette } from '../core/palette.ts';
import { ditherStage, type DitherParams } from '../core/pipeline/dither.ts';
import type { Backend, PixelBuffer } from '../core/types.ts';
import { log } from '../diagnostics/log.ts';

/** Selected backend per stage name; empty = everything runs 'ts'. */
const selected = new Map<string, Backend>();

/** The automatic pick for a stage, if calibration chose one. */
export function selectedBackend(stageName: string): Backend | undefined {
  return selected.get(stageName);
}

/** Set (or with null, clear) a stage's selection. Exported for tests. */
export function setSelectedBackend(stageName: string, backend: Backend | null): void {
  if (backend === null) selected.delete(stageName);
  else selected.set(stageName, backend);
}

/** Clear all selections (tests). */
export function clearSelectedBackends(): void {
  selected.clear();
}

/** Median of a non-empty sample array. */
export function medianMs(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Selection policy: leave the TS reference unless the candidate is
 * faster by the hysteresis margin — JIT noise and near-ties must not
 * flap the pipeline off ground truth.
 */
export function pickFaster(
  tsMedian: number,
  candidateMedian: number,
  candidate: Backend,
  margin = 0.9,
): Backend {
  return candidateMedian < tsMedian * margin ? candidate : 'ts';
}

/** Deterministic synthetic frame for calibration (LCG noise). */
function calibrationBuffer(size: number): PixelBuffer {
  const data = new Uint8ClampedArray(size * size * 4);
  let state = 0xca11b8;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = i % 4 === 3 ? 255 : state >>> 24;
  }
  return { width: size, height: size, data };
}

/**
 * One-shot dither calibration: time ts vs wasm on a synthetic frame
 * against the real DMC palette (the representative workload), pick
 * per {@link pickFaster}, and record the selection. No-op ('ts', no
 * selection recorded) when the wasm backend is not registered.
 * Never throws; runs off the frame path at worker startup.
 */
export function calibrateDither(
  runs = 3,
  size = 96,
  now: () => number = () => performance.now(),
): Backend {
  const wasm = ditherStage.backends.wasm;
  if (wasm === undefined) {
    log.info('backend', 'dither calibration skipped — wasm not registered');
    return 'ts';
  }
  try {
    const params: DitherParams = {
      palette: loadDmcPalette(),
      metric: 'lab',
      serpentine: true,
    };
    const input = calibrationBuffer(size);
    const samples: Record<'ts' | 'wasm', number[]> = { ts: [], wasm: [] };
    // Alternate runs so JIT warmup and GC pauses spread across both.
    for (let run = 0; run < runs; run++) {
      for (const [name, fn] of [
        ['ts', ditherStage.backends.ts],
        ['wasm', wasm],
      ] as const) {
        const start = now();
        fn(input, params);
        samples[name].push(now() - start);
      }
    }
    const tsMedian = medianMs(samples.ts);
    const wasmMedian = medianMs(samples.wasm);
    const winner = pickFaster(tsMedian, wasmMedian, 'wasm');
    setSelectedBackend('dither', winner === 'ts' ? null : winner);
    log.info('backend', `dither auto-selected: ${winner}`, {
      tsMedianMs: Math.round(tsMedian * 100) / 100,
      wasmMedianMs: Math.round(wasmMedian * 100) / 100,
    });
    return winner;
  } catch (error) {
    setSelectedBackend('dither', null);
    log.error('backend', 'dither calibration failed — staying on ts', {
      message: error instanceof Error ? error.message : String(error),
    });
    return 'ts';
  }
}
