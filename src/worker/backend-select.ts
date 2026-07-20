/**
 * Automatic per-stage backend selection (architecture.md → "Stage
 * backends": automatic by default, profiled). Feature-detect is the
 * registration itself — a backend absent from a stage's map is never
 * picked, and the executor's `?? backends.ts` fallback holds even if a
 * stale selection points at a backend that has gone.
 *
 * Selection is **per-workload routing**, not a startup profile:
 * {@link routeDither} decides from the frame's own metric, grid and
 * palette size (M5-PERF-27, superseding D42's one-shot calibration).
 * A manual override can still be recorded via
 * {@link setSelectedBackend}; it applies where routing has no opinion.
 *
 * WebGPU is not selected here: its kernels are async (LUT build is
 * auto-selected GPU-first inside lut-cache.ts; the mapping kernel
 * stays unrouted until the executor grows an async path — D41).
 */

import type { ColorMetric } from '../core/color/metrics.ts';
import type { Backend } from '../core/types.ts';

/** Selected backend per stage name; empty = everything runs 'ts'. */
const selected = new Map<string, Backend>();

/** The workload facts dither routing depends on. */
export interface DitherWorkload {
  /** Larger grid dimension in stitches. */
  grid: number;
  paletteSize: number;
  metric: ColorMetric;
}

/**
 * Route one dither call by workload (M5-PERF-27), replacing D42's
 * one-shot calibration.
 *
 * D42 timed a single synthetic 96²/533 lab frame at worker startup and
 * applied that winner to every frame thereafter. M5B showed the margin
 * varying 2.1–5.4× across workloads and predicted the winner would flip
 * once the bit-exact TS wins landed. It did, and not gradually — the
 * decision is now categorical:
 *
 * - **lab → ts.** The TS path carries per-bin candidate pruning
 *   (M5-PERF-22); Rust keeps the full scan, and its `libm` `pow`/`cbrt`
 *   — chosen for bit-exact parity with V8 (D39) — are software routines
 *   where V8 uses builtins. Measured 225 ms vs 418 ms at 1024²/64.
 * - **rgb → wasm.** Neither side prunes (the exclusion proof is
 *   Lab-specific) and there is no conversion, so the tight Rust loop
 *   wins outright. Measured 126 ms vs 297 ms at 1024²/64.
 *
 * Grid and palette size are carried in {@link DitherWorkload} because
 * they are what a threshold would key on, and the audit sweeps them —
 * but no threshold over them is applied: across 96²–1024² and 64–533
 * colours the metric decided every case. Adding a size cutoff the
 * evidence does not show would be inventing a rule.
 *
 * The TS reference stays the fallback everywhere: an unregistered wasm
 * backend falls through to `backends.ts` in the executor.
 */
export function routeDither(workload: DitherWorkload): Backend {
  return workload.metric === 'rgb' ? 'wasm' : 'ts';
}

/** A recorded manual override for a stage, if one is set. */
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
