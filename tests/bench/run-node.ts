/**
 * Node matrix runner: executes the M5-PERF-01 workload matrix under the
 * M5-PERF-02 boundaries and returns M5-PERF-03 report rows.
 *
 * The bias this file exists to remove (M5-PERF-02 lead): the previous
 * benchmark constructed its request — a ~6.5 MB `data.slice()` plus a
 * fresh palette — *inside* the timed closure, so the whole-pipeline row
 * charged preparation to compute. Requests are now built once, outside
 * the clock, and preparation is measured as its own boundary.
 *
 * Per-stage rows come from the executor's own `StageTiming[]`, gathered
 * across the same timed runs, so a stage distribution costs no extra
 * work and is measured in situ rather than in an artificial harness.
 */

import { buildStages } from '../../src/core/pipeline/config.ts';
import { ditherStage } from '../../src/core/pipeline/dither.ts';
import type { Backend } from '../../src/core/types.ts';
import { clearLutCache, getLut } from '../../src/worker/lut-cache.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import type { ProcessRequest } from '../../src/worker/protocol.ts';
import type { BoundaryId } from './boundaries.ts';
import { measure, planFor, type RunPlan } from './harness.ts';
import { measuredRow, skippedRow, type BenchRow } from './report.ts';
import {
  configFor,
  paletteFor,
  sourceBuffer,
  WORKLOADS,
  type Workload,
} from './workloads.ts';

/**
 * A measured performance baseline with a regression guard.
 *
 * D47 replaced the aspirational per-stage table with this shape. The
 * old one asserted numbers nobody had ever hit — every row except
 * preview-render had been red since it was written, and a permanently
 * red budget trains everyone to ignore the gate. A baseline instead
 * says "this is what the code does today, on this runtime, for this
 * workload; shout if it gets materially worse".
 *
 * Each baseline therefore NAMES ITS RUNTIME and its workload id: a
 * millisecond figure without both is the ambiguity M5-PERF-02 exists to
 * remove, and M5B showed the same TS resize runs ~3.5× slower
 * in-browser than in node, so a number that does not say where it was
 * taken is not evidence.
 */
export interface Baseline {
  /** Measured median in ms on {@link runtime}. */
  ms: number;
  /** Where the figure was taken — never omit. */
  runtime: string;
  /** Build id the figure was taken against. */
  taken: string;
  /**
   * Regression trips above `ms × tolerance`. Wide enough to absorb
   * machine noise and JIT variance, tight enough that losing a
   * measured win fails: the M5D wins were 1.3–16×, so 1.35 catches any
   * of them being reverted.
   */
  tolerance: number;
}

/** Node baselines, re-taken 2026-07-20 after the M5D wins landed. */
const NODE = 'node 24.5, Apple M1 Max';
const TAKEN = 'v0.5.0+20260720.89046be';

/**
 * Measured baselines mapped onto specific matrix rows. A baseline
 * belongs to one workload at one boundary — an unattached number is
 * exactly what M5-PERF-02 removed.
 *
 * The product promise — **≥ 4 preview updates/sec at ≤ 300²** — is
 * deliberately NOT here: it is defined at the in-browser preview-update
 * boundary, and node cannot measure it. Asserting a node proxy for it
 * would be green-washing a promise about a different runtime. It is
 * owned by `bench.html` (`docs/browser-measurement.md`) and confirmed
 * live at M5-ACCEPT-03.
 */
export const BUDGETS: ReadonlyMap<string, Baseline> = new Map([
  // Resize 1280² → 1024² grid. Was an aspirational 5 ms; no bit-exact
  // CPU path reaches it (M5B), and the hoist got it to ~24 ms (D47).
  [
    'noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|stage|resize',
    { ms: 24.4, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Palette reduce via LUT at 1024²/64 — memory-bound per-pixel
  // mapping; the old 10 ms row was never met.
  [
    'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still|stage|reduce',
    { ms: 12.4, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Floyd–Steinberg at 1024²/64, lab. The old 15 ms row assumed the
  // wasm backend; routing now sends lab to TS (M5-PERF-27), and the
  // bit-exact wins took this from ~858 ms to ~232 ms.
  [
    'noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|stage|dither',
    { ms: 231.9, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Whole pipeline at the 1024² ceiling — an export/finishing grid,
  // stated plainly as such (D47), not a live-editing grid.
  [
    'noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|pipeline-compute|pipeline',
    { ms: 256.3, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Whole pipeline at the typical 200² grid.
  [
    'noise.w1280.opaque.g200.p64.lab.dither.resize-first.stretch.still|pipeline-compute|pipeline',
    { ms: 17.0, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
]);

/**
 * Regression ceiling for a row after the environment multiplier, or
 * null when the row carries no baseline. This is `baseline × tolerance`
 * — the point at which a change is called a regression — not a target.
 */
function budgetFor(
  workloadId: string,
  boundary: BoundaryId,
  label: string,
  multiplier: number,
): number | null {
  const base = BUDGETS.get(`${workloadId}|${boundary}|${label}`);
  return base === undefined ? null : base.ms * base.tolerance * multiplier;
}

/**
 * Rough cost estimate used only to choose a run plan — never reported.
 * Scales with output pixels and, for colour work, palette size.
 */
function expectedMs(workload: Workload): number {
  const cells = workload.grid * workload.grid;
  const paletteSize =
    workload.palette === 'p533' ? 533 : workload.palette === 'p64' ? 64 : 1;
  const perCell = workload.dither ? paletteSize * 4e-7 : paletteSize * 2e-8;
  return (cells * perCell) / 1000 + cells * 2e-5;
}

/** Run plan for a workload; live rows get a longer steady state. */
function planForWorkload(workload: Workload): RunPlan {
  const plan = planFor(expectedMs(workload));
  if (workload.path !== 'live') return plan;
  return { warmup: plan.warmup + 2, runs: plan.runs + 3 };
}

/** Options a matrix run needs from its host. */
export interface MatrixOptions {
  /** Budget tolerance for this environment (1 locally, 3 under CI). */
  budgetMultiplier: number;
}

/** Measure one workload at every boundary node can observe. */
function runWorkload(workload: Workload, options: MatrixOptions): BenchRow[] {
  const rows: BenchRow[] = [];
  const config = configFor(workload);
  const source = sourceBuffer(workload);
  const plan = planForWorkload(workload);

  // --- prepare (warm cache) -------------------------------------------
  // Palette derivation plus stage-list construction, with the LUT
  // already cached. This is the number to subtract from a
  // pipeline-compute median to see the executor's construction cost.
  const preparePlan = planFor(1);
  buildStages(config, { lut: getLut }); // ensure the LUT cache is warm first
  rows.push(
    measuredRow({
      workloadId: workload.id,
      boundary: 'prepare',
      label: 'stage-list',
      cache: 'warm',
      warmupRuns: preparePlan.warmup,
      samples: measure(
        () => {
          paletteFor(workload);
          buildStages(config, { lut: getLut });
        },
        preparePlan,
      ),
    }),
  );

  // --- pipeline-compute + per-stage -----------------------------------
  // One request object, built once and reused: stages are pure and the
  // executor only creates a view over the pixel buffer, so reuse is
  // safe and keeps the 6.5 MB copy out of the timed region.
  const request: ProcessRequest = {
    type: 'process',
    id: 1,
    width: source.width,
    height: source.height,
    pixels: source.data.buffer as ArrayBuffer,
    config,
  };
  const stageSamples = new Map<string, { ms: number[]; backend: Backend }>();
  const samples = measure(() => {
    const response = executeRequest(request);
    if (response.type !== 'result') {
      const detail = response.type === 'error' ? response.message : response.type;
      throw new Error(`workload ${workload.id} failed: ${detail}`);
    }
    for (const timing of response.timings) {
      const series = stageSamples.get(timing.stage) ?? {
        ms: [],
        backend: timing.backend,
      };
      series.ms.push(timing.ms);
      series.backend = timing.backend;
      stageSamples.set(timing.stage, series);
    }
  }, plan);

  const outputBytes = workload.grid * workload.grid * 4;
  rows.push(
    measuredRow({
      workloadId: workload.id,
      boundary: 'pipeline-compute',
      label: 'pipeline',
      cache: 'warm',
      warmupRuns: plan.warmup,
      samples,
      budgetMs: budgetFor(
        workload.id,
        'pipeline-compute',
        'pipeline',
        options.budgetMultiplier,
      ),
      allocations: [
        { label: 'source buffer', bytes: source.data.byteLength },
        { label: 'adjust clone (identity)', bytes: source.data.byteLength },
        { label: 'grid output', bytes: outputBytes },
      ],
    }),
  );

  for (const [stage, series] of stageSamples) {
    rows.push(
      measuredRow({
        workloadId: workload.id,
        boundary: 'stage',
        label: stage,
        backend: series.backend,
        cache: 'warm',
        warmupRuns: plan.warmup,
        samples: series.ms,
        budgetMs: budgetFor(workload.id, 'stage', stage, options.budgetMultiplier),
      }),
    );
  }
  return rows;
}

/**
 * Cold-cache LUT build cost, measured once per palette+metric rather
 * than per workload (the LUT does not depend on the grid). Reported as
 * its own row: budgets bind to warm steady state, so a cache miss must
 * never be averaged into — or hidden behind — a warm median.
 */
function coldPrepareRows(): BenchRow[] {
  const seen = new Set<string>();
  const rows: BenchRow[] = [];
  for (const workload of WORKLOADS) {
    const palette = paletteFor(workload);
    if (palette === null || workload.dither) continue;
    const key = `${palette.name}:${workload.metric}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      measuredRow({
        workloadId: workload.id,
        boundary: 'prepare',
        label: `lut-build (${key})`,
        cache: 'cold',
        warmupRuns: 0,
        samples: measure(
          () => {
            clearLutCache();
            getLut(palette, workload.metric);
          },
          { warmup: 0, runs: 3 },
        ),
      }),
    );
  }
  clearLutCache();
  return rows;
}

/**
 * Boundaries node physically cannot observe. They appear in every
 * report as explicit gaps — a missing measurement must never read as a
 * zero, and the matrix must show where it is blind.
 */
function browserOnlyRows(): BenchRow[] {
  const live =
    WORKLOADS.find((w) => w.path === 'live')?.id ?? WORKLOADS[0]?.id ?? 'unknown';
  const reason =
    'browser-only boundary — run the rehearsal in docs/measurement-contract.md';
  return (['preview-update', 'interaction', 'export'] as const).map((boundary) =>
    skippedRow({
      workloadId: live,
      boundary,
      label: boundary,
      status: 'unsupported',
      reason,
    }),
  );
}

/** Run the whole matrix. Rows come back in measurement order. */
export function runMatrix(options: MatrixOptions): BenchRow[] {
  const rows: BenchRow[] = [...coldPrepareRows()];
  for (const workload of WORKLOADS) rows.push(...runWorkload(workload, options));
  rows.push(...browserOnlyRows());
  return rows;
}

/** Whether an accelerated dither backend is registered for this run. */
export function ditherBackendAvailable(): boolean {
  return ditherStage.backends.wasm !== undefined;
}
