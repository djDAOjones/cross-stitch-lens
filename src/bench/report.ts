/**
 * Benchmark report schema and statistics (M5-PERF-03).
 *
 * One machine-readable schema shared by the node and browser reporters,
 * so a run is comparable across builds and machines rather than being a
 * console median someone wrote down. Pure — the environment and build
 * facts are injected (see `env-node.ts`), which keeps this module
 * testable and usable from a Worker.
 *
 * Two rules the schema exists to enforce:
 * - a measurement that could not be taken is `unsupported` or
 *   `not-measured`, never zero;
 * - raw samples are preserved, so a later run compares distributions
 *   rather than two isolated medians.
 */

import type { Backend } from '../core/types.ts';
import type { BoundaryId, CacheState } from './boundaries.ts';

/** Bump when the report shape changes incompatibly. */
export const REPORT_SCHEMA_VERSION = 1;

/** Distribution summary over the timed samples of one row. */
export interface Summary {
  count: number;
  min: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  mean: number;
  /** Population standard deviation, in ms. */
  stdDev: number;
  /** Spread as (max - min) / median; a quick noise smell test. */
  relativeSpread: number;
}

/** Why a row carries no samples. */
export type RowStatus = 'measured' | 'unsupported' | 'not-measured';

/** A known, countable allocation — numeric evidence, not a GC guess. */
export interface AllocationNote {
  label: string;
  bytes: number;
}

/** One measured row: a workload observed at one boundary. */
export interface BenchRow {
  workloadId: string;
  boundary: BoundaryId;
  /** Human label, e.g. the stage name for a `stage` row. */
  label: string;
  /** The backend that actually ran, or 'n/a' for non-stage rows. */
  backend: Backend | 'n/a';
  cache: CacheState;
  status: RowStatus;
  /** Present when status is not 'measured'. */
  reason?: string;
  /** Warm-up runs executed and discarded before timing. */
  warmupRuns: number;
  /** Raw timed samples in ms, in execution order. */
  samples: number[];
  /** Null unless status is 'measured'. */
  summary: Summary | null;
  /** The architecture.md budget for this row, or null if unbudgeted. */
  budgetMs: number | null;
  /** Null when there is no budget or no measurement. */
  withinBudget: boolean | null;
  allocations?: AllocationNote[];
  /**
   * Row-level context that is not a timing: capture counters, track
   * settings, phase decompositions (bv2 browser rows — M13-MEAS-02).
   * Additive; absent from node rows.
   */
  meta?: Record<string, string | number | boolean>;
}

/** Build identity — which code produced these numbers. */
export interface BuildIdentity {
  appVersion: string;
  buildId: string;
  gitSha: string;
  /** Whether the wasm pkg was built and available to this run. */
  wasmBuilt: boolean;
}

/** Machine and runtime facts — why these numbers may differ elsewhere. */
export interface EnvironmentIdentity {
  runtime: 'node' | 'browser';
  runtimeVersion: string;
  os: string;
  arch: string;
  cpuModel: string;
  cpuCount: number;
  memoryGb: number;
  /** True under CI, where budgets carry a tolerance multiplier. */
  ci: boolean;
  /** Budget multiplier applied to this run (1 locally, 3 under CI). */
  budgetMultiplier: number;
}

/**
 * Run-validity verdict (M13-MEAS-01). A research run at e703ed4 carried
 * a single ~5.8-million-ms sample — sleep, suspension or a stall, never
 * established — and the honest response is to mark the whole run
 * tainted, not to delete the sample or publish the remaining median as
 * clean evidence. Samples are always preserved; this flag tells a
 * reader the run must be re-taken in a controlled session.
 */
export interface RunValidity {
  tainted: boolean;
  /** Human-readable findings; empty when the run is clean. */
  findings: string[];
}

/** Clock readings around a whole run, for interruption detection. */
export interface ClockCheck {
  /** `Date.now()` at run start and end — advances through a sleep. */
  wallStartMs: number;
  wallEndMs: number;
  /** Monotonic clock at run start and end — may pause through a sleep. */
  monoStartMs: number;
  monoEndMs: number;
}

/**
 * A single sample above this is implausible for any matrix row (the
 * slowest legitimate rows are seconds, not minutes) and taints the run.
 */
export const IMPLAUSIBLE_SAMPLE_MS = 120_000;

/**
 * Wall-vs-monotonic disagreement above this means the environment was
 * interrupted (sleep/suspension) during the run.
 */
export const CLOCK_DRIFT_TOLERANCE_MS = 5_000;

/** Max/median ratio above which a slow row's worst sample is suspect. */
const SUSPECT_SPREAD_RATIO = 20;

/** A suspect worst sample must also be absolutely slow to matter. */
const SUSPECT_SAMPLE_MS = 5_000;

/**
 * Assess a run's validity: environmental interruption (the two clocks
 * disagree), implausible single samples, and stall-shaped outliers.
 * Pure over its inputs so the rules are testable without a real run.
 */
export function assessValidity(
  rows: readonly BenchRow[],
  clock: ClockCheck,
): RunValidity {
  const findings: string[] = [];
  const wall = clock.wallEndMs - clock.wallStartMs;
  const mono = clock.monoEndMs - clock.monoStartMs;
  const drift = Math.abs(wall - mono);
  if (drift > CLOCK_DRIFT_TOLERANCE_MS) {
    findings.push(
      `environment interruption: wall clock and monotonic clock disagree by ` +
        `${(drift / 1000).toFixed(1)} s over the run (sleep or suspension?)`,
    );
  }
  for (const row of rows) {
    if (row.status !== 'measured' || row.summary === null) continue;
    const key = `${row.boundary}/${row.label} [${row.workloadId}]`;
    if (row.summary.max > IMPLAUSIBLE_SAMPLE_MS) {
      findings.push(
        `${key}: worst sample ${row.summary.max.toFixed(0)} ms exceeds the ` +
          `${String(IMPLAUSIBLE_SAMPLE_MS)} ms plausibility ceiling`,
      );
    } else if (
      row.summary.max > SUSPECT_SAMPLE_MS &&
      row.summary.max / Math.max(row.summary.median, 1e-9) > SUSPECT_SPREAD_RATIO
    ) {
      findings.push(
        `${key}: worst sample ${row.summary.max.toFixed(0)} ms is ` +
          `${(row.summary.max / Math.max(row.summary.median, 1e-9)).toFixed(0)}× its ` +
          `median — possible stall or machine contention`,
      );
    }
  }
  return { tainted: findings.length > 0, findings };
}

/** A complete run: schema + contract + identity + validity + every row. */
export interface BenchReport {
  schemaVersion: number;
  boundaryVersion: string;
  startedAt: string;
  build: BuildIdentity;
  environment: EnvironmentIdentity;
  /** Additive in bv2; absent from bv1-era reports (schema still 1). */
  validity: RunValidity;
  rows: BenchRow[];
}

/** Sorted copy of the samples (ascending). */
function sorted(samples: readonly number[]): number[] {
  return [...samples].sort((a, b) => a - b);
}

/**
 * Nearest-rank percentile over already-sorted values: the smallest
 * value at or below which at least `fraction` of samples fall. Chosen
 * over interpolation because it always returns a value that was
 * actually observed.
 */
function percentile(ascending: readonly number[], fraction: number): number {
  if (ascending.length === 0) return 0;
  const rank = Math.max(1, Math.ceil(fraction * ascending.length));
  return ascending[Math.min(rank, ascending.length) - 1] ?? 0;
}

/** Median (mean of the middle pair when the count is even). */
function medianOf(ascending: readonly number[]): number {
  if (ascending.length === 0) return 0;
  const mid = Math.floor(ascending.length / 2);
  if (ascending.length % 2 === 1) return ascending[mid] ?? 0;
  return ((ascending[mid - 1] ?? 0) + (ascending[mid] ?? 0)) / 2;
}

/** Summarise raw samples; null for an empty set (never a zeroed row). */
export function summarise(samples: readonly number[]): Summary | null {
  if (samples.length === 0) return null;
  const asc = sorted(samples);
  const count = asc.length;
  const min = asc[0] ?? 0;
  const max = asc[count - 1] ?? 0;
  const median = medianOf(asc);
  const mean = asc.reduce((sum, v) => sum + v, 0) / count;
  const variance = asc.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count;
  return {
    count,
    min,
    median,
    p90: percentile(asc, 0.9),
    p95: percentile(asc, 0.95),
    max,
    mean,
    stdDev: Math.sqrt(variance),
    relativeSpread: median === 0 ? 0 : (max - min) / median,
  };
}

/** Inputs a measured row needs beyond its samples. */
export interface RowInput {
  workloadId: string;
  boundary: BoundaryId;
  label: string;
  backend?: Backend | 'n/a';
  cache?: CacheState;
  warmupRuns: number;
  samples: number[];
  budgetMs?: number | null;
  allocations?: AllocationNote[];
  meta?: Record<string, string | number | boolean>;
}

/**
 * Build a measured row, deriving the summary and the budget verdict.
 * `budgetMs` is the already-multiplied budget for this environment.
 */
export function measuredRow(input: RowInput): BenchRow {
  const summary = summarise(input.samples);
  const budgetMs = input.budgetMs ?? null;
  return {
    workloadId: input.workloadId,
    boundary: input.boundary,
    label: input.label,
    backend: input.backend ?? 'n/a',
    cache: input.cache ?? 'n/a',
    status: summary === null ? 'not-measured' : 'measured',
    ...(summary === null ? { reason: 'no samples collected' } : {}),
    warmupRuns: input.warmupRuns,
    samples: input.samples,
    summary,
    budgetMs,
    withinBudget: summary === null || budgetMs === null ? null : summary.median <= budgetMs,
    ...(input.allocations === undefined ? {} : { allocations: input.allocations }),
    ...(input.meta === undefined ? {} : { meta: input.meta }),
  };
}

/**
 * Build a row for a measurement this surface cannot take — a
 * browser-only boundary under node, or an unregistered backend. The
 * row still appears so the matrix shows its own gaps.
 */
export function skippedRow(
  input: Pick<RowInput, 'workloadId' | 'boundary' | 'label'> & {
    status: Exclude<RowStatus, 'measured'>;
    reason: string;
    backend?: Backend | 'n/a';
    budgetMs?: number | null;
    meta?: Record<string, string | number | boolean>;
  },
): BenchRow {
  return {
    workloadId: input.workloadId,
    boundary: input.boundary,
    label: input.label,
    backend: input.backend ?? 'n/a',
    cache: 'n/a',
    status: input.status,
    reason: input.reason,
    warmupRuns: 0,
    samples: [],
    summary: null,
    budgetMs: input.budgetMs ?? null,
    withinBudget: null,
    ...(input.meta === undefined ? {} : { meta: input.meta }),
  };
}

/** Assemble a report. Rows keep the order they were measured in. */
export function buildReport(
  meta: {
    boundaryVersion: string;
    startedAt: string;
    build: BuildIdentity;
    environment: EnvironmentIdentity;
    validity: RunValidity;
  },
  rows: BenchRow[],
): BenchReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    boundaryVersion: meta.boundaryVersion,
    startedAt: meta.startedAt,
    build: meta.build,
    environment: meta.environment,
    validity: meta.validity,
    rows,
  };
}

/** Canonical JSON serialisation (stable key order, 2-space indent). */
export function serialiseReport(report: BenchReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** Round to 2 decimals for human-readable output. */
function ms(value: number): string {
  return value.toFixed(2);
}

/**
 * Compact human summary of a run — one line per row, budget verdict
 * included. This is what a maintainer reads; the JSON is what a later
 * run diffs against.
 */
export function formatReport(report: BenchReport): string {
  const lines = [
    `bench ${report.build.buildId} · ${report.boundaryVersion} · ` +
      `${report.environment.cpuModel} · ${report.environment.runtime} ` +
      `${report.environment.runtimeVersion}`,
  ];
  if (report.validity.tainted) {
    lines.push(`  TAINTED RUN — not evidence; re-run in a controlled session:`);
    for (const finding of report.validity.findings) lines.push(`    - ${finding}`);
  }
  for (const row of report.rows) {
    const head = `${row.boundary}/${row.label} [${row.workloadId}]`;
    if (row.summary === null) {
      lines.push(`  ${head}: ${row.status} — ${row.reason ?? 'no reason given'}`);
      continue;
    }
    const budget =
      row.budgetMs === null
        ? ''
        : ` vs ${ms(row.budgetMs)} budget ${row.withinBudget === true ? 'OK' : 'MISS'}`;
    lines.push(
      `  ${head}: median ${ms(row.summary.median)} ms ` +
        `(p95 ${ms(row.summary.p95)}, n=${String(row.summary.count)}, ` +
        `spread ${(row.summary.relativeSpread * 100).toFixed(0)}%)${budget}`,
    );
  }
  return lines.join('\n');
}
