/**
 * Automated-run validation invariants (M13-MEAS-03): the launcher must
 * refuse to bless a tainted, hidden, or incomplete report — an invalid
 * run exits non-zero rather than becoming quotable evidence.
 */

import { describe, expect, it } from 'vitest';

import {
  EXPECTED_EDIT_CLASSES,
  validateCaptureReport,
  validateMemReport,
} from '../scripts/bench-auto-validate.mjs';

const BASE = 'capture.g300.p64.lab.fs-s100-serp';

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
      measured(BASE, 'preview-update'),
      measured('capture.g200.p64.lab.fs-s100-serp', 'preview-update'),
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
