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
import type { DitherAlgorithm } from '../core/pipeline/dither.ts';
import type { Backend } from '../core/types.ts';

/** Selected backend per stage name; empty = everything runs 'ts'. */
const selected = new Map<string, Backend>();

/** The workload facts dither routing depends on. */
export interface DitherWorkload {
  /** Larger grid dimension in stitches. */
  grid: number;
  paletteSize: number;
  metric: ColorMetric;
  /** Method to run — the crate implements Floyd–Steinberg only (M8). */
  algorithm: DitherAlgorithm;
  /** Error/amplitude scale; the crate implements only the exact 1. */
  strength: number;
  /**
   * Tone mode engaged (TONE-01): the error diffuses in the tone
   * space, which the crate does not implement — a weighted frame
   * routes 'ts' unconditionally. Defensive here: tone engages only
   * under 'lab', which already routes 'ts', but the rule must not
   * depend on that coincidence. Optional; absent means disengaged
   * (the pre-TONE-01 workloads).
   */
  toneEngaged?: boolean;
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
 *
 * M8-ALG-01: the crate implements exactly Floyd–Steinberg at strength
 * 1, so every other algorithm — and any damped strength — routes 'ts'
 * unconditionally. Backend fallback may substitute a backend for the
 * *same* algorithm, never a different dither method; the wasm adapter
 * enforces the same guard defensively for manual overrides.
 */
export function routeDither(workload: DitherWorkload): Backend {
  if (workload.toneEngaged === true) return 'ts';
  if (!wasmDitherImplements(workload.algorithm, workload.strength)) return 'ts';
  return workload.metric === 'rgb' ? 'wasm' : 'ts';
}

/**
 * The dither configs the Rust crate actually implements: exactly
 * Floyd–Steinberg at strength 1 (M8-ALG-01). The single source of
 * this capability fact — routing consults it, and the executor clamps
 * a forced/recorded 'wasm' through it so `StageTiming.backend` can
 * only ever name code that ran (M13-DEF-01); the adapter's internal
 * delegation remains as unreachable defence in depth.
 */
export function wasmDitherImplements(algorithm: DitherAlgorithm, strength: number): boolean {
  return algorithm === 'floyd-steinberg' && strength === 1;
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
