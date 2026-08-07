/**
 * Part-A′ cross-check arithmetic (M13-MEAS-03): the comparison must
 * hard-guard the same-build rule, surface a tainted manual run, and
 * report each canonical row side by side without inventing numbers.
 */

import { describe, expect, it } from 'vitest';

import { compareReports } from '../scripts/bench-cross-check.mjs';

const BASE = 'capture.g300.p64.lab.fs-s100-serp';

function report(buildId: string, medianMs: number, tainted = false) {
  const row = (workloadId: string, boundary: string, extraMeta: Record<string, number> = {}) => ({
    workloadId,
    boundary,
    status: 'measured',
    summary: { median: medianMs, count: 100 },
    meta: extraMeta,
  });
  return {
    build: { buildId },
    validity: { tainted, findings: [] },
    rows: [
      row(BASE, 'preview-update', { 'updates/sec over window': 4.0 }),
      row('capture.g200.p64.lab.fs-s100-serp', 'preview-update', {
        'updates/sec over window': 4.0,
      }),
      row(BASE, 'interaction', { 'changes missed': 3 }),
    ],
  };
}

describe('compareReports', () => {
  it('compares each canonical row with a median ratio (happy path)', () => {
    const result = compareReports(report('b1', 44), report('b1', 40));
    expect(result.sameBuild).toBe(true);
    expect(result.manualTainted).toBe(false);
    expect(result.rows).toHaveLength(3);
    const live = result.rows[0];
    if (live === undefined) throw new Error('fixture broken');
    expect(live.manual?.medianMs).toBe(44);
    expect(live.automated?.medianMs).toBe(40);
    expect(live.ratio).toBeCloseTo(1.1, 5);
    expect(live.manual?.updatesPerSec).toBe(4.0);
    expect(result.rows[2]?.manual?.misses).toBe(3);
  });

  it('flags different builds — the comparison is meaningless (permission/gating)', () => {
    expect(compareReports(report('b1', 44), report('b2', 40)).sameBuild).toBe(false);
  });

  it('flags a tainted manual report (error)', () => {
    expect(compareReports(report('b1', 44, true), report('b1', 40)).manualTainted).toBe(true);
  });

  it('reports a missing or unmeasured row instead of inventing one (boundary)', () => {
    const automated = report('b1', 40);
    const manual = report('b1', 44);
    manual.rows = manual.rows.slice(0, 1);
    const result = compareReports(manual, automated);
    expect(result.rows[1]?.manual).toBeNull();
    expect(result.rows[1]?.ratio).toBeNull();
  });
});
