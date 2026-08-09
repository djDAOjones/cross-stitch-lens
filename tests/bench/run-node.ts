/**
 * Node matrix runner: executes the bv2 workload matrix under the
 * boundary contract and returns report rows (M13-MEAS-01; the shape is
 * M5-PERF-01/02/03's, re-baselined for the shipped M7/M8 product).
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

import { buildCandidateTable } from '../../src/core/color/candidates.ts';
import type { Palette } from '../../src/core/types.ts';
import { buildStages } from '../../src/core/pipeline/config.ts';
import { ditherStage } from '../../src/core/pipeline/dither.ts';
import {
  bayerTile,
  BLUE_NOISE_SEED,
  blueNoiseTile,
} from '../../src/core/pipeline/threshold-tiles.ts';
import type { Backend } from '../../src/core/types.ts';
import { clearLutCache, getLut } from '../../src/worker/lut-cache.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import type { ProcessRequest } from '../../src/worker/protocol.ts';
import type { BoundaryId } from '../../src/bench/boundaries.ts';
import { measure, planFor, type RunPlan } from '../../src/bench/harness.ts';
import { measuredRow, skippedRow, type BenchRow } from '../../src/bench/report.ts';
import {
  configFor,
  paletteFor,
  paletteFull,
  sourceBuffer,
  WORKLOADS,
  type Workload,
} from '../../src/bench/workloads.ts';

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

/**
 * Node baselines, re-taken 2026-08-09 on the implementation build
 * (M13-IMPL-02, decision-log D135 → the synthesis' rebinding clause).
 * The 2026-07-22 figures they replace (D64) were green under their
 * ×1.35 guard but predated ~3k churned lines including M13-IMPL-01,
 * so the guard had gone slack against work that had already shipped.
 *
 * Every row moved 1.7–4.3 % *faster* and none by more than that: a
 * uniform environment/JIT drift, not a win in any stage. Nothing here
 * is an IMPL-01 effect — IMPL-01 removed per-frame allocation on the
 * capture path, which no node row observes (D141).
 *
 * Taken on a settled machine, every row's relative spread ≤ 0.07. That
 * matters for `reduce` in particular: an earlier take of this same
 * build, run minutes after a full `check` and `matrix`, put it at
 * 21.1 ms with a spread of 2.32 (one 65 ms sample). The run was not
 * tainted by the validity gate — nothing about it was implausible —
 * it was simply measured on a busy machine. Re-take these on a quiet
 * one; do not widen a tolerance to absorb contention.
 *
 * The bv1→bv2 history, and the +28 % pre-M8 → bv2 Floyd–Steinberg
 * drift that M13-PROF-01 decomposed, stay recorded in
 * docs/performance-evidence.md rather than in this comment.
 */
const NODE = 'node 24.5, Apple M1 Max';
const TAKEN = 'v0.5.0+20260808.08545db';

/**
 * Measured baselines mapped onto specific matrix rows. A baseline
 * belongs to one workload at one boundary — an unattached number is
 * exactly what M5-PERF-02 removed.
 *
 * The product promise — **≥ 4 preview updates/sec at ≤ 300²** — is
 * deliberately NOT here: it is defined at the in-browser preview-update
 * boundary, and node cannot measure it. Asserting a node proxy for it
 * would be green-washing a promise about a different runtime. The
 * explicit 300² rows below are component baselines on the node runtime,
 * not proxies for the promise. It is owned by `bench.html`
 * (`docs/browser-measurement.md`) and the browser harness (M13-MEAS-02).
 */
export const BUDGETS: ReadonlyMap<string, Baseline> = new Map([
  // Resize 1280² → 1024² grid. Was an aspirational 5 ms; no bit-exact
  // CPU path reaches it (M5B), and the hoist got it to ~24 ms (D47).
  [
    'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still|stage|resize',
    { ms: 23.9, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Palette reduce via LUT at 1024²/64 — memory-bound per-pixel
  // mapping; the old 10 ms row was never met.
  [
    'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still|stage|reduce',
    { ms: 12.9, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Floyd–Steinberg at 1024²/64, lab. Routing sends lab to TS
  // categorically (D69/D135) — this row measures the reference, and
  // the wasm backend it does not reach is the `rgb` route's.
  [
    'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still|stage|dither',
    { ms: 287.5, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Whole pipeline at the 1024² ceiling — an export/finishing grid,
  // stated plainly as such (D47). The brief's "≤ 100 ms at 1024²"
  // line was retired at synthesis (D135): what binds here is this
  // honest published median under its regression guard, not a target.
  [
    'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still|pipeline-compute|pipeline',
    { ms: 311.2, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Whole pipeline at the typical 200² grid.
  [
    'noise.w1280.opaque.g200.p64.lab.fs-s100-serp.resize-first.stretch.still|pipeline-compute|pipeline',
    { ms: 19.0, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // Whole pipeline at 300² — the grid the product promise binds at,
  // as a node component baseline (new in bv2; M13-MEAS-01).
  [
    'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still|pipeline-compute|pipeline',
    { ms: 35.9, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  // The four M8 methods at 1024²/p64 (new in bv2): each shipped
  // method carries its own regression guard, so none can regress
  // silently behind the FS row. All run the TS reference — the Rust
  // crate implements only FS at strength 1 (D62).
  [
    'noise.w1280.opaque.g1024.p64.lab.atkinson-s100-serp.resize-first.stretch.still|stage|dither',
    { ms: 326.6, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  [
    'noise.w1280.opaque.g1024.p64.lab.jarvis-s100-serp.resize-first.stretch.still|stage|dither',
    { ms: 320.0, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  [
    'noise.w1280.opaque.g1024.p64.lab.ordered-s100.resize-first.stretch.still|stage|dither',
    { ms: 284.6, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
  ],
  [
    'noise.w1280.opaque.g1024.p64.lab.bluenoise-s100.resize-first.stretch.still|stage|dither',
    { ms: 284.9, runtime: NODE, taken: TAKEN, tolerance: 1.35 },
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
    workload.palette === 'p489' ? 489 : workload.palette === 'p64' ? 64 : 1;
  const perCell =
    workload.dither.algorithm !== 'none' ? paletteSize * 4e-7 : paletteSize * 2e-8;
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
      // The identity-adjust clone bv1 listed here was removed from
      // built pipelines by D48; listing it was stale evidence.
      allocations: [
        { label: 'source buffer', bytes: source.data.byteLength },
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
 * Pseudo-ID for a preparation-stress row whose palette is deliberately
 * not a pipeline workload (the full catalogue union). The `prep.`
 * prefix cannot collide with matrix IDs — every real ID starts with a
 * source class — and the grammar is documented in
 * `docs/measurement-contract.md`.
 */
function prepId(palette: string, metric: string): string {
  return `prep.${palette}.${metric}`;
}

/**
 * Cold-cache preparation costs (M13-MEAS-01): LUT builds, candidate-
 * table builds and threshold-tile generation, each measured once per
 * distinct input rather than per workload (none depends on the grid).
 * Reported as their own rows: budgets bind to warm steady state, so a
 * cache miss must never be averaged into — or hidden behind — a warm
 * median. bv1 published only the LUT builds; the candidate table is
 * 20–35× a LUT's size and the M8 tiles never appeared at all.
 */
function coldPrepareRows(): BenchRow[] {
  const rows: BenchRow[] = [];
  const coldPlan = { warmup: 0, runs: 3 };

  // LUT builds: one per palette+metric pair the matrix reaches through
  // the LUT path, attached to a real workload ID.
  const seenLut = new Set<string>();
  for (const workload of WORKLOADS) {
    const palette = paletteFor(workload);
    if (palette === null || workload.dither.algorithm !== 'none') continue;
    const key = `${palette.name}:${workload.metric}`;
    if (seenLut.has(key)) continue;
    seenLut.add(key);
    rows.push(
      measuredRow({
        workloadId: workload.id,
        boundary: 'prepare',
        label: `lut-build (${key})`,
        cache: 'cold',
        warmupRuns: 0,
        samples: measure(() => {
          clearLutCache();
          getLut(palette, workload.metric);
        }, coldPlan),
      }),
    );
  }

  // Candidate-table builds (lab-only pruning structure): one per
  // distinct palette the dithered lab rows use.
  const seenCandidates = new Set<string>();
  for (const workload of WORKLOADS) {
    const palette = paletteFor(workload);
    if (palette === null) continue;
    if (workload.dither.algorithm === 'none' || workload.metric !== 'lab') continue;
    if (seenCandidates.has(palette.name)) continue;
    seenCandidates.add(palette.name);
    rows.push(
      measuredRow({
        workloadId: workload.id,
        boundary: 'prepare',
        label: `candidate-table (${palette.name})`,
        cache: 'cold',
        warmupRuns: 0,
        samples: measure(() => buildCandidateTable(palette), coldPlan),
      }),
    );
  }

  // Full-catalogue preparation stress (3,338 threads, eight brands):
  // the worst palette a user can construct, measured for preparation
  // only — it is deliberately not a pipeline workload (see workloads.ts).
  const full: Palette = paletteFull();
  rows.push(
    measuredRow({
      workloadId: prepId('pfull', 'lab'),
      boundary: 'prepare',
      label: `lut-build (${full.name}:lab)`,
      cache: 'cold',
      warmupRuns: 0,
      samples: measure(() => {
        clearLutCache();
        getLut(full, 'lab');
      }, coldPlan),
    }),
    measuredRow({
      workloadId: prepId('pfull', 'lab'),
      boundary: 'prepare',
      label: `candidate-table (${full.name})`,
      cache: 'cold',
      warmupRuns: 0,
      samples: measure(() => buildCandidateTable(full), coldPlan),
    }),
  );

  // M8 threshold-tile first use: the pure builders, so the cost is
  // measured without reaching into the module-level memo. Attached to
  // the 300² method rows that consume each tile.
  const orderedRow = WORKLOADS.find(
    (w) => w.dither.algorithm === 'ordered' && w.grid === 300,
  );
  const blueNoiseRow = WORKLOADS.find(
    (w) => w.dither.algorithm === 'blue-noise' && w.grid === 300,
  );
  if (orderedRow !== undefined) {
    rows.push(
      measuredRow({
        workloadId: orderedRow.id,
        boundary: 'prepare',
        label: 'threshold-tile (bayer 8×8)',
        cache: 'cold',
        warmupRuns: 0,
        samples: measure(() => bayerTile(8), coldPlan),
      }),
    );
  }
  if (blueNoiseRow !== undefined) {
    rows.push(
      measuredRow({
        workloadId: blueNoiseRow.id,
        boundary: 'prepare',
        label: `threshold-tile (blue-noise 32×32, seed 0x${BLUE_NOISE_SEED.toString(16)})`,
        cache: 'cold',
        warmupRuns: 0,
        samples: measure(() => blueNoiseTile(32, BLUE_NOISE_SEED), coldPlan),
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
