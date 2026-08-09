/**
 * Automated-run validation invariants (M13-MEAS-03): the launcher must
 * refuse to bless a tainted, hidden, or incomplete report — an invalid
 * run exits non-zero rather than becoming quotable evidence.
 */

import { describe, expect, it } from 'vitest';

import {
  BROWSER_TARGETS,
  CADENCE_TARGET,
  EXPECTED_EDIT_CLASSES,
  EXPECTED_TRACE_WINDOWS,
  validateCaptureReport,
  validateMemReport,
  validatePickerCaptureReport,
  validateTraceReport,
} from '../scripts/bench-auto-validate.mjs';

const BASE = 'capture.g300.p64.lab.fs-s100-serp';
const BASE_200 = 'capture.g200.p64.lab.fs-s100-serp';

interface FakeRow {
  workloadId: string;
  boundary: string;
  label: string;
  status: string;
  reason?: string;
  summary: { median: number; count: number } | null;
  meta?: Record<string, unknown>;
}

function measured(workloadId: string, boundary: string, label = workloadId): FakeRow {
  return { workloadId, boundary, label, status: 'measured', summary: { median: 50, count: 10 } };
}

/** Cadence counters a driven base window carries when the promise held. */
function cadenceMeta(): Record<string, unknown> {
  return {
    'updates/sec over window': CADENCE_TARGET.updatesPerSec,
    'rvfc missed callbacks': 0,
    'window pump drops': 0,
    'window client drops': 0,
  };
}

/**
 * A driven base window at its recorded baseline median — the shape the
 * product targets bind to (M13-IMPL-02).
 */
function targetRow(workloadId: string): FakeRow {
  const target = BROWSER_TARGETS.get(`${workloadId}|preview-update`);
  if (target === undefined) throw new Error(`no target for ${workloadId}`);
  return {
    workloadId,
    boundary: 'preview-update',
    label: 'preview-update (live capture)',
    status: 'measured',
    summary: { median: target.ms, count: 120 },
    meta: cadenceMeta(),
  };
}

function envRow(visibility = 'visible'): FakeRow {
  return {
    workloadId: 'env',
    boundary: 'prepare',
    label: 'environment',
    status: 'measured',
    summary: { median: 0, count: 1 },
    meta: { visibility },
  };
}

function validCaptureReport(): { validity: { tainted: boolean; findings: string[] }; rows: FakeRow[] } {
  return {
    validity: { tainted: false, findings: [] },
    rows: [
      envRow(),
      targetRow(BASE),
      targetRow(BASE_200),
      measured(BASE, 'interaction'),
      ...EXPECTED_EDIT_CLASSES.map((editClass: string) =>
        measured(`${BASE}.edit-${editClass}`, 'preview-update'),
      ),
    ],
  };
}

function validMemReport(): { validity: { tainted: boolean; findings: string[] }; rows: FakeRow[] } {
  return {
    validity: { tainted: false, findings: [] },
    rows: [
      envRow(),
      {
        workloadId: 'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
        boundary: 'prepare',
        label: 'retained-heap plateau (fixed sequence)',
        status: 'measured',
        summary: { median: 0, count: 1 },
        meta: { 'heap after forced GC MiB': 96.2, verdict: 'lazy major GC — …' },
      },
      {
        workloadId: 'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
        boundary: 'export',
        label: 'export isolation re-proof (idle / pump / draft / rapid ×2)',
        status: 'measured',
        summary: { median: 0, count: 1 },
        meta: { verdict: 'EXACT everywhere' },
      },
    ],
  };
}

describe('capture report validation', () => {
  it('passes a complete, visible, untainted report (happy path)', () => {
    expect(validateCaptureReport(validCaptureReport())).toEqual([]);
  });

  it('fails a tainted report and carries the findings (error)', () => {
    const report = validCaptureReport();
    report.validity = { tainted: true, findings: ['page was hidden during the live window'] };
    const failures = validateCaptureReport(report);
    expect(failures.some((f: string) => f.includes('tainted'))).toBe(true);
    expect(failures.some((f: string) => f.includes('hidden'))).toBe(true);
  });

  it('fails when the env row saw a hidden page (permission/gating)', () => {
    const report = validCaptureReport();
    report.rows[0] = envRow('hidden');
    expect(
      validateCaptureReport(report).some((f: string) => f.includes('not visible')),
    ).toBe(true);
  });

  it('fails a not-measured capture leg and names its reason (error)', () => {
    const report = validCaptureReport();
    const live300 = report.rows[1];
    if (live300 === undefined) throw new Error('fixture broken');
    report.rows[1] = { ...live300, status: 'not-measured', reason: 'declined', summary: null };
    expect(
      validateCaptureReport(report).some(
        (f: string) => f.includes('live window 300²') && f.includes('declined'),
      ),
    ).toBe(true);
  });

  it('fails when an edit-class window is missing (boundary)', () => {
    const report = validCaptureReport();
    report.rows = report.rows.filter((row) => !row.workloadId.endsWith('.edit-hands-off'));
    expect(
      validateCaptureReport(report).some((f: string) => f.includes('hands-off')),
    ).toBe(true);
  });

  it('rejects a non-report without throwing (boundary)', () => {
    expect(validateCaptureReport(null)[0]).toContain('not a bv2 report');
    expect(validateCaptureReport({ rows: 'nope' })[0]).toContain('not a bv2 report');
  });
});

/**
 * Product targets on the driven capture leg (M13-IMPL-02, signed at
 * D135). These are the only rows in the project that assert the product
 * promise rather than guard a component against regression, so the
 * tests below care as much about what may *not* bind as about the
 * arithmetic.
 */
describe('capture-leg product targets', () => {
  it('passes rows sitting exactly at their baseline (happy path)', () => {
    expect(validateCaptureReport(validCaptureReport())).toEqual([]);
  });

  it('passes a row inside the ×1.35 guard but fails one past it (boundary)', () => {
    const target = BROWSER_TARGETS.get(`${BASE}|preview-update`);
    if (target === undefined) throw new Error('fixture broken');

    const inside = validCaptureReport();
    inside.rows[1] = {
      ...targetRow(BASE),
      summary: { median: target.ms * target.tolerance - 0.01, count: 120 },
    };
    expect(validateCaptureReport(inside)).toEqual([]);

    const outside = validCaptureReport();
    outside.rows[1] = {
      ...targetRow(BASE),
      summary: { median: target.ms * target.tolerance + 0.01, count: 120 },
    };
    expect(
      validateCaptureReport(outside).some(
        (f: string) => f.startsWith('target:') && f.includes('exceeds'),
      ),
    ).toBe(true);
  });

  it('fails a median over 2× faster than baseline as a slack guard (staleness)', () => {
    const target = BROWSER_TARGETS.get(`${BASE}|preview-update`);
    if (target === undefined) throw new Error('fixture broken');
    const report = validCaptureReport();
    report.rows[1] = {
      ...targetRow(BASE),
      summary: { median: target.ms / 3, count: 120 },
    };
    expect(
      validateCaptureReport(report).some((f: string) => f.includes('guard has gone slack')),
    ).toBe(true);
  });

  it('fails when the sustained rate drops below the promise (error)', () => {
    const report = validCaptureReport();
    report.rows[1] = {
      ...targetRow(BASE),
      meta: { ...cadenceMeta(), 'updates/sec over window': 3 },
    };
    expect(
      validateCaptureReport(report).some(
        (f: string) => f.includes('3 updates/sec') && f.includes('below the promised'),
      ),
    ).toBe(true);
  });

  it.each(['rvfc missed callbacks', 'window pump drops', 'window client drops'])(
    'fails a fast median that dropped frames: %s (regression — the promise is misses, not latency)',
    (counter) => {
      const report = validCaptureReport();
      report.rows[1] = {
        ...targetRow(BASE),
        summary: { median: 1, count: 120 },
        meta: { ...cadenceMeta(), [counter]: 2 },
      };
      expect(
        validateCaptureReport(report).some(
          (f: string) => f.includes(counter) && f.includes('the cadence missed'),
        ),
      ).toBe(true);
    },
  );

  it('fails an absent counter rather than reading it as zero (error)', () => {
    const report = validCaptureReport();
    const meta = cadenceMeta();
    delete meta['rvfc missed callbacks'];
    report.rows[1] = { ...targetRow(BASE), meta };
    expect(
      validateCaptureReport(report).some((f: string) =>
        f.includes("has no 'rvfc missed callbacks' count"),
      ),
    ).toBe(true);
  });

  it('fails an unsupported rvfc reading, which is a string not a count (error)', () => {
    const report = validCaptureReport();
    report.rows[1] = {
      ...targetRow(BASE),
      meta: { ...cadenceMeta(), 'rvfc missed callbacks': 'unsupported' },
    };
    expect(
      validateCaptureReport(report).some((f: string) =>
        f.includes("has no 'rvfc missed callbacks' count"),
      ),
    ).toBe(true);
  });

  it('binds only driven base capture rows — the bv2 amendment (permission/gating)', () => {
    for (const key of BROWSER_TARGETS.keys()) {
      expect(key).toMatch(/^capture\./);
      expect(key).not.toContain('.edit-');
    }
  });

  it('leaves interaction published, not bound (D135)', () => {
    expect([...BROWSER_TARGETS.keys()].some((k: string) => k.endsWith('|interaction'))).toBe(
      false,
    );
    // A wild interaction median must not fail the leg.
    const report = validCaptureReport();
    report.rows[3] = { ...measured(BASE, 'interaction'), summary: { median: 4000, count: 5 } };
    expect(validateCaptureReport(report)).toEqual([]);
  });
});

describe('picker report validation (the A′ cross-check leg)', () => {
  it('passes the canonical rows without requiring edit classes (happy path)', () => {
    const report = validCaptureReport();
    report.rows = report.rows.filter((row) => !row.workloadId.includes('.edit-'));
    expect(validatePickerCaptureReport(report)).toEqual([]);
  });

  it('still fails a missing canonical row (boundary)', () => {
    const report = validCaptureReport();
    report.rows = report.rows.filter((row) => row.boundary !== 'interaction');
    expect(
      validatePickerCaptureReport(report).some((f: string) => f.includes('interaction')),
    ).toBe(true);
  });
});

function bucket(count = 1): { count: number; totalMs: number; maxMs: number } {
  return { count, totalMs: count * 3, maxMs: count > 0 ? 3 : 0 };
}

function validTraceReport(): Record<string, unknown> {
  return {
    dataLoss: false,
    trace: {
      renderer: { pid: 1, tid: 10 },
      unpairedMarks: [],
      windows: EXPECTED_TRACE_WINDOWS.map((key: string) => {
        const [workloadId, boundary] = key.split('|');
        return {
          workloadId,
          boundary,
          durationMs: 30_000,
          gc: { minor: bucket(5), major: bucket(1), incrementalMarking: bucket(8) },
        };
      }),
      wholeLeg: {
        durationMs: 240_000,
        gc: { minor: bucket(40), major: bucket(6), incrementalMarking: bucket(60) },
      },
    },
    pageReport: validCaptureReport(),
  };
}

describe('trace report validation (M13-MEAS-04)', () => {
  it('passes a complete merged report (happy path)', () => {
    expect(validateTraceReport(validTraceReport())).toEqual([]);
  });

  it('rejects a non-report without throwing (boundary)', () => {
    expect(validateTraceReport(null)[0]).toContain('no embedded pageReport');
    expect(validateTraceReport({ trace: {} })[0]).toContain('no embedded pageReport');
  });

  it('fails when the embedded page report is tainted, prefixed as the page half (error)', () => {
    const report = validTraceReport();
    (report.pageReport as { validity: unknown }).validity = {
      tainted: true,
      findings: ['page was hidden during the live window'],
    };
    const failures = validateTraceReport(report);
    expect(failures.some((f: string) => f.startsWith('page: ') && f.includes('tainted'))).toBe(true);
  });

  it('fails on trace-buffer data loss (error)', () => {
    const report = validTraceReport();
    report.dataLoss = true;
    expect(
      validateTraceReport(report).some((f: string) => f.includes('data loss')),
    ).toBe(true);
  });

  it('fails when a window never paired (boundary)', () => {
    const report = validTraceReport();
    const trace = report.trace as { windows: { boundary: string }[] };
    trace.windows = trace.windows.filter((w) => w.boundary !== 'interaction');
    expect(
      validateTraceReport(report).some(
        (f: string) => f.includes('interaction') && f.includes('missing'),
      ),
    ).toBe(true);
  });

  it('fails on unpaired marks and on zero GC across the leg (error)', () => {
    const report = validTraceReport();
    const trace = report.trace as {
      unpairedMarks: string[];
      wholeLeg: { gc: Record<string, { count: number }> };
    };
    trace.unpairedMarks = ['x|preview-update (start with no end)'];
    trace.wholeLeg.gc = { minor: bucket(0), major: bucket(0), incrementalMarking: bucket(0) };
    const failures = validateTraceReport(report);
    expect(failures.some((f: string) => f.includes('unpaired'))).toBe(true);
    expect(failures.some((f: string) => f.includes('zero GC'))).toBe(true);
  });

  it('fails when the renderer was never identified (error)', () => {
    const report = validTraceReport();
    (report.trace as { renderer: unknown }).renderer = null;
    expect(
      validateTraceReport(report).some((f: string) => f.includes('never identified')),
    ).toBe(true);
  });
});

describe('mem report validation', () => {
  it('passes a complete mem report (happy path)', () => {
    expect(validateMemReport(validMemReport())).toEqual([]);
  });

  it('fails without a numeric forced-GC reading (error)', () => {
    const report = validMemReport();
    const plateau = report.rows[1];
    if (plateau === undefined) throw new Error('fixture broken');
    plateau.meta = {
      'heap after forced GC MiB': 'unavailable — launch Chrome with --js-flags=--expose-gc',
    };
    expect(
      validateMemReport(report).some((f: string) => f.includes('--expose-gc')),
    ).toBe(true);
  });

  it('fails when export isolation was violated (regression: the AGENTS invariant)', () => {
    const report = validMemReport();
    const isolation = report.rows[2];
    if (isolation === undefined) throw new Error('fixture broken');
    isolation.meta = { verdict: 'VIOLATED' };
    expect(
      validateMemReport(report).some((f: string) => f.includes('isolation')),
    ).toBe(true);
  });
});
