/**
 * Performance benchmark: runs the M5-PERF-01 workload matrix under the
 * M5-PERF-02 boundary contract and emits an M5-PERF-03 report.
 *
 * Gated behind BENCH=1 (`npm run bench`) so the quality gate stays
 * fast — in a plain `vitest run` these suites skip visibly. Budgets
 * stretch ×3 under CI=true (shared-runner noise).
 *
 * The matrix runs once in `beforeAll` and the JSON report is written
 * before any assertion, so a missed budget still leaves full evidence
 * on disk — D43's rule: record the signal, never green-wash it. The
 * budget assertions then read rows out of that single run rather than
 * re-timing anything.
 *
 * Boundaries node cannot observe (preview-update, interaction, export)
 * appear in the report as explicit `unsupported` rows; they are
 * measured by the browser rehearsal in `docs/measurement-contract.md`.
 */

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { registerWasmDither } from '../src/backends/wasm/dither.ts';
import { log } from '../src/diagnostics/log.ts';
import { setSelectedBackend } from '../src/worker/backend-select.ts';
import { BOUNDARY_VERSION } from '../src/bench/boundaries.ts';
import {
  buildIdentity,
  environmentIdentity,
  WASM_BYTES_PATH,
  writeReport,
} from './bench/env-node.ts';
import {
  assessValidity,
  buildReport,
  formatReport,
  serialiseReport,
  type BenchReport,
  type BenchRow,
} from '../src/bench/report.ts';
import { BUDGETS, runMatrix } from './bench/run-node.ts';

const BENCH = process.env['BENCH'] === '1';
/** CI runners are slow and noisy; stretch every budget ×3 there. */
const MULT = process.env['CI'] ? 3 : 1;

/** The matrix at 1024²/533 takes minutes; give the hook room. */
const MATRIX_TIMEOUT_MS = 900_000;

let report: BenchReport | null = null;

/** Find the single row a budget key names, failing loudly if absent. */
function rowFor(key: string): BenchRow {
  const [workloadId, boundary, label] = key.split('|');
  const found = report?.rows.find(
    (row) =>
      row.workloadId === workloadId && row.boundary === boundary && row.label === label,
  );
  if (found === undefined) throw new Error(`no report row for budget key: ${key}`);
  return found;
}

describe.skipIf(!BENCH)('performance budgets (BENCH=1)', () => {
  beforeAll(async () => {
    const build = buildIdentity();
    if (build.wasmBuilt) {
      const registered = await registerWasmDither(readFileSync(WASM_BYTES_PATH));
      if (registered) setSelectedBackend('dither', 'wasm');
    } else {
      log.warn('bench', 'wasm pkg not built — dither rows measure the ts reference');
    }

    // Both clocks bracket the run: wall time advances through a sleep
    // while the monotonic clock may not, so their disagreement is the
    // interruption detector (M13-MEAS-01).
    const wallStartMs = Date.now();
    const monoStartMs = performance.now();
    const rows = runMatrix({ budgetMultiplier: MULT });
    const validity = assessValidity(rows, {
      wallStartMs,
      wallEndMs: Date.now(),
      monoStartMs,
      monoEndMs: performance.now(),
    });
    report = buildReport(
      {
        boundaryVersion: BOUNDARY_VERSION,
        startedAt: new Date().toISOString(),
        build,
        environment: environmentIdentity(MULT),
        validity,
      },
      rows,
    );
    const path = writeReport(
      `bench-${build.buildId.replaceAll('+', '_')}.json`,
      serialiseReport(report),
    );
    log.info('bench', formatReport(report));
    log.info('bench', `report written: ${path}`);
  }, MATRIX_TIMEOUT_MS);

  it('produced a complete report', () => {
    expect(report).not.toBeNull();
    expect(report?.boundaryVersion).toBe(BOUNDARY_VERSION);
    // Every row is either measured or carries a reason — never a
    // silent zero (M5-PERF-03 acceptance).
    for (const row of report?.rows ?? []) {
      if (row.status === 'measured') expect(row.summary).not.toBeNull();
      else expect(row.reason).toBeTruthy();
    }
  });

  /**
   * A tainted run is not evidence (M13-MEAS-01): an interrupted or
   * stalled run must fail loudly with its findings rather than publish
   * a clean-looking median. The report — samples included — is already
   * on disk, so nothing is lost; re-run in a controlled session.
   */
  it('run is untainted — interruption and stall detection', () => {
    expect(report?.validity.findings ?? ['no report produced']).toEqual([]);
    expect(report?.validity.tainted).toBe(false);
  });

  it.each([...BUDGETS.keys()])('no regression against baseline: %s', (key) => {
    const row = rowFor(key);
    const baseline = BUDGETS.get(key);
    expect(row.status).toBe('measured');
    expect(baseline).toBeDefined();
    if (baseline === undefined) return;
    const median = row.summary?.median ?? Infinity;
    // The ceiling is baseline × tolerance (× the CI multiplier). The
    // message carries the runtime and the build the baseline came from,
    // because a failure here is meaningless without knowing what it is
    // being compared to (D47).
    expect(
      median,
      `${key}\n  measured ${median.toFixed(2)} ms\n  baseline ${baseline.ms.toFixed(2)} ms ` +
        `(${baseline.runtime}, ${baseline.taken})\n  ceiling  ${(row.budgetMs ?? 0).toFixed(2)} ms ` +
        `(tolerance ×${String(baseline.tolerance)}${MULT === 1 ? '' : `, CI ×${String(MULT)}`})`,
    ).toBeLessThanOrEqual(row.budgetMs ?? 0);
  });

  /**
   * A baseline that has drifted far BELOW its recorded value is not a
   * pass — it means the recorded figure is stale and the guard has gone
   * slack, so the next real regression has room to hide. D47 asked for
   * regression guards, and a guard nobody re-baselines stops guarding.
   */
  it.each([...BUDGETS.keys()])('baseline is not stale: %s', (key) => {
    const row = rowFor(key);
    const baseline = BUDGETS.get(key);
    if (baseline === undefined || row.status !== 'measured') return;
    const median = row.summary?.median ?? 0;
    // Only meaningful locally: the CI multiplier makes "much faster
    // than baseline" the normal case there.
    if (MULT !== 1) return;
    expect(
      median,
      `${key} is ${(baseline.ms / Math.max(median, 1e-9)).toFixed(2)}× faster than its ` +
        `recorded baseline (${baseline.ms.toFixed(2)} ms, ${baseline.runtime}). ` +
        `That is good news — re-record the baseline so the guard stays tight.`,
    ).toBeGreaterThan(baseline.ms / 2);
  });
});

describe.runIf(!BENCH)('performance budgets (skipped)', () => {
  it('gated behind BENCH=1 — run via npm run bench', () => {
    expect(BENCH).toBe(false);
  });
});
