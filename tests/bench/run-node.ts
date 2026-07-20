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
 * The architecture.md budget table, mapped onto specific matrix rows.
 * A budget belongs to one workload at one boundary — an unattached
 * budget number is exactly the ambiguity M5-PERF-02 exists to remove.
 * Values are pre-multiplier milliseconds.
 */
export const BUDGETS: ReadonlyMap<string, number> = new Map([
  // Resize 1280² → 1024² grid.
  ['noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|stage|resize', 5],
  // Palette reduce via LUT at 1024²/64.
  [
    'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still|stage|reduce',
    10,
  ],
  // Floyd–Steinberg at 1024²/64 on the accelerated backend.
  [
    'noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|stage|dither',
    15,
  ],
  // Whole pipeline at the 1024² ceiling and at the typical 200² grid.
  [
    'noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still|pipeline-compute|pipeline',
    100,
  ],
  [
    'noise.w1280.opaque.g200.p64.lab.dither.resize-first.stretch.still|pipeline-compute|pipeline',
    10,
  ],
]);

/** Budget for a row after the environment multiplier, or null. */
function budgetFor(
  workloadId: string,
  boundary: BoundaryId,
  label: string,
  multiplier: number,
): number | null {
  const base = BUDGETS.get(`${workloadId}|${boundary}|${label}`);
  return base === undefined ? null : base * multiplier;
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
