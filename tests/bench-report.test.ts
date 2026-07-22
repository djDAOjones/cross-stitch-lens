/**
 * Report schema, statistics and warm-up policy (M5-PERF-03). These run
 * in the normal quality gate: the benchmark itself is noisy and gated
 * behind BENCH=1, but the machinery that decides what a number *means*
 * must be deterministic and always checked.
 */

import { describe, expect, it } from 'vitest';

import { BOUNDARIES, BOUNDARY_VERSION, measurableOn } from './bench/boundaries.ts';
import { measure, measureInterleaved, planFor, type Clock } from './bench/harness.ts';
import {
  assessValidity,
  buildReport,
  CLOCK_DRIFT_TOLERANCE_MS,
  formatReport,
  IMPLAUSIBLE_SAMPLE_MS,
  measuredRow,
  REPORT_SCHEMA_VERSION,
  serialiseReport,
  skippedRow,
  summarise,
  type BuildIdentity,
  type ClockCheck,
  type EnvironmentIdentity,
} from './bench/report.ts';

/** Clock that hands out a fixed script of readings, in order. */
function scriptedClock(readings: number[]): Clock {
  let i = 0;
  return () => readings[i++] ?? 0;
}

const BUILD: BuildIdentity = {
  appVersion: 'v0.6.0',
  buildId: 'v0.6.0+20260719.abc1234',
  gitSha: 'abc1234',
  wasmBuilt: true,
};

const ENV: EnvironmentIdentity = {
  runtime: 'node',
  runtimeVersion: 'v22.0.0',
  os: 'darwin 25.5.0',
  arch: 'arm64',
  cpuModel: 'Apple M-series',
  cpuCount: 10,
  memoryGb: 32,
  ci: false,
  budgetMultiplier: 1,
};

describe('boundary contract', () => {
  it('names a start and end mark for every boundary', () => {
    for (const boundary of Object.values(BOUNDARIES)) {
      expect(boundary.start.length).toBeGreaterThan(10);
      expect(boundary.end.length).toBeGreaterThan(10);
      expect(boundary.surfaces.length).toBeGreaterThan(0);
    }
  });

  it('marks the composite boundaries browser-only', () => {
    expect(measurableOn('pipeline-compute', 'node')).toBe(true);
    expect(measurableOn('preview-update', 'node')).toBe(false);
    expect(measurableOn('interaction', 'node')).toBe(false);
    expect(measurableOn('export', 'node')).toBe(false);
    expect(measurableOn('preview-update', 'browser')).toBe(true);
  });
});

describe('summarise', () => {
  it('returns null for an empty sample set rather than a zeroed row', () => {
    expect(summarise([])).toBeNull();
  });

  it('computes nearest-rank percentiles over observed values', () => {
    const summary = summarise([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(summary?.count).toBe(10);
    expect(summary?.min).toBe(1);
    expect(summary?.max).toBe(10);
    expect(summary?.median).toBe(5.5);
    expect(summary?.p90).toBe(9);
    expect(summary?.p95).toBe(10);
    expect(summary?.mean).toBe(5.5);
  });

  it('takes the middle value for an odd count', () => {
    expect(summarise([3, 1, 2])?.median).toBe(2);
  });

  it('reports spread and deviation so a noisy row is visible', () => {
    const tight = summarise([10, 10, 10]);
    expect(tight?.stdDev).toBe(0);
    expect(tight?.relativeSpread).toBe(0);
    const noisy = summarise([5, 10, 25]);
    expect(noisy?.relativeSpread).toBe(2);
    expect(noisy?.stdDev ?? 0).toBeGreaterThan(0);
  });
});

describe('report rows', () => {
  it('marks a budgeted row against its median', () => {
    const within = measuredRow({
      workloadId: 'w',
      boundary: 'stage',
      label: 'resize',
      backend: 'ts',
      cache: 'warm',
      warmupRuns: 2,
      samples: [4, 4.5, 5],
      budgetMs: 5,
    });
    expect(within.status).toBe('measured');
    expect(within.withinBudget).toBe(true);

    const over = measuredRow({
      workloadId: 'w',
      boundary: 'stage',
      label: 'resize',
      warmupRuns: 2,
      samples: [30, 36, 40],
      budgetMs: 5,
    });
    expect(over.withinBudget).toBe(false);
  });

  it('leaves the verdict null when there is no budget', () => {
    const row = measuredRow({
      workloadId: 'w',
      boundary: 'stage',
      label: 'dither',
      warmupRuns: 1,
      samples: [12],
    });
    expect(row.budgetMs).toBeNull();
    expect(row.withinBudget).toBeNull();
  });

  it('never reports an unmeasured row as zero', () => {
    const empty = measuredRow({
      workloadId: 'w',
      boundary: 'stage',
      label: 'reduce',
      warmupRuns: 0,
      samples: [],
      budgetMs: 10,
    });
    expect(empty.status).toBe('not-measured');
    expect(empty.summary).toBeNull();
    expect(empty.withinBudget).toBeNull();
    expect(empty.reason).toBeTruthy();

    const skipped = skippedRow({
      workloadId: 'w',
      boundary: 'preview-update',
      label: 'preview-update',
      status: 'unsupported',
      reason: 'browser-only boundary',
    });
    expect(skipped.samples).toEqual([]);
    expect(skipped.summary).toBeNull();
    expect(skipped.reason).toBe('browser-only boundary');
  });

  it('keeps countable allocation evidence on the row', () => {
    const row = measuredRow({
      workloadId: 'w',
      boundary: 'pipeline-compute',
      label: 'pipeline',
      warmupRuns: 1,
      samples: [1],
      allocations: [{ label: 'source buffer', bytes: 6553600 }],
    });
    expect(row.allocations?.[0]?.bytes).toBe(6553600);
  });
});

describe('run validity (M13-MEAS-01)', () => {
  /** A clock pair that agrees: no interruption. */
  const CLEAN_CLOCK: ClockCheck = {
    wallStartMs: 1_000_000,
    wallEndMs: 1_060_000,
    monoStartMs: 500_000,
    monoEndMs: 560_000,
  };

  function cleanRow(samples: number[]) {
    return measuredRow({
      workloadId: 'w',
      boundary: 'stage',
      label: 'dither',
      warmupRuns: 1,
      samples,
    });
  }

  it('passes a clean run', () => {
    const validity = assessValidity([cleanRow([10, 11, 12])], CLEAN_CLOCK);
    expect(validity.tainted).toBe(false);
    expect(validity.findings).toEqual([]);
  });

  it('taints a run when the wall and monotonic clocks disagree', () => {
    const validity = assessValidity([cleanRow([10, 11, 12])], {
      ...CLEAN_CLOCK,
      // The wall clock advanced through a sleep the monotonic clock
      // never saw — the e703ed4 failure shape.
      wallEndMs: CLEAN_CLOCK.wallEndMs + CLOCK_DRIFT_TOLERANCE_MS + 60_000,
    });
    expect(validity.tainted).toBe(true);
    expect(validity.findings.join(' ')).toMatch(/interruption/);
  });

  it('taints a run carrying an implausible sample, keeping the sample', () => {
    const row = cleanRow([12, IMPLAUSIBLE_SAMPLE_MS + 1, 11]);
    const validity = assessValidity([row], CLEAN_CLOCK);
    expect(validity.tainted).toBe(true);
    expect(validity.findings.join(' ')).toMatch(/plausibility ceiling/);
    // The evidence is marked, never deleted.
    expect(row.samples).toContain(IMPLAUSIBLE_SAMPLE_MS + 1);
  });

  it('flags a stall-shaped outlier on a slow row', () => {
    const validity = assessValidity([cleanRow([300, 310, 9_000])], CLEAN_CLOCK);
    expect(validity.tainted).toBe(true);
    expect(validity.findings.join(' ')).toMatch(/stall or machine contention/);
  });

  it('ignores wide spread on fast rows (JIT noise, not a stall)', () => {
    const validity = assessValidity([cleanRow([0.2, 0.3, 30])], CLEAN_CLOCK);
    expect(validity.tainted).toBe(false);
  });

  it('ignores unmeasured rows', () => {
    const skipped = skippedRow({
      workloadId: 'w',
      boundary: 'preview-update',
      label: 'preview-update',
      status: 'unsupported',
      reason: 'browser-only boundary',
    });
    expect(assessValidity([skipped], CLEAN_CLOCK).tainted).toBe(false);
  });
});

describe('report assembly', () => {
  const report = buildReport(
    {
      boundaryVersion: BOUNDARY_VERSION,
      startedAt: '2026-07-19T12:00:00.000Z',
      build: BUILD,
      environment: ENV,
      validity: { tainted: false, findings: [] },
    },
    [
      measuredRow({
        workloadId: 'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still',
        boundary: 'stage',
        label: 'resize',
        backend: 'ts',
        cache: 'warm',
        warmupRuns: 2,
        samples: [35, 36, 37],
        budgetMs: 5,
      }),
      skippedRow({
        workloadId: 'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.live',
        boundary: 'interaction',
        label: 'interaction',
        status: 'unsupported',
        reason: 'browser-only boundary',
      }),
    ],
  );

  it('stamps schema, contract, build and environment identity', () => {
    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.boundaryVersion).toBe(BOUNDARY_VERSION);
    expect(report.build.gitSha).toBe('abc1234');
    expect(report.environment.budgetMultiplier).toBe(1);
  });

  it('round-trips through canonical JSON with raw samples intact', () => {
    const parsed = JSON.parse(serialiseReport(report)) as typeof report;
    expect(parsed.rows[0]?.samples).toEqual([35, 36, 37]);
    expect(parsed.rows[1]?.status).toBe('unsupported');
    expect(serialiseReport(report).endsWith('\n')).toBe(true);
  });

  it('formats a MISS and an unsupported row honestly', () => {
    const text = formatReport(report);
    expect(text).toContain('MISS');
    expect(text).toContain('unsupported');
    expect(text).toContain(BUILD.buildId);
    expect(text).not.toContain('TAINTED');
  });

  it('announces a tainted run at the top of the summary', () => {
    const tainted = buildReport(
      {
        boundaryVersion: BOUNDARY_VERSION,
        startedAt: '2026-07-19T12:00:00.000Z',
        build: BUILD,
        environment: ENV,
        validity: { tainted: true, findings: ['environment interruption: …'] },
      },
      [],
    );
    const text = formatReport(tainted);
    expect(text).toContain('TAINTED RUN');
    expect(text).toContain('environment interruption');
  });
});

describe('harness', () => {
  it('scales the run plan to the expected cost', () => {
    expect(planFor(1)).toEqual({ warmup: 2, runs: 7 });
    expect(planFor(100)).toEqual({ warmup: 2, runs: 5 });
    expect(planFor(500)).toEqual({ warmup: 1, runs: 3 });
  });

  it('discards warm-up runs from the samples', () => {
    let calls = 0;
    // Two warm-ups are untimed; each timed run reads the clock twice.
    const clock = scriptedClock([0, 10, 0, 20, 0, 30]);
    const samples = measure(
      () => {
        calls++;
      },
      { warmup: 2, runs: 3 },
      clock,
    );
    expect(calls).toBe(5);
    expect(samples).toEqual([10, 20, 30]);
  });

  it('interleaves candidates round-robin so drift hits both', () => {
    const order: string[] = [];
    let tick = 0;
    const clock: Clock = () => tick++;
    const samples = measureInterleaved(
      [
        ['ts', () => order.push('ts')],
        ['wasm', () => order.push('wasm')],
      ],
      { warmup: 1, runs: 2 },
      clock,
    );
    expect(order).toEqual(['ts', 'wasm', 'ts', 'wasm', 'ts', 'wasm']);
    expect(samples.get('ts')).toHaveLength(2);
    expect(samples.get('wasm')).toHaveLength(2);
  });
});
