/**
 * Capture-counter ledger invariants (M13-MEAS-02). The browser harness
 * itself needs a browser; the ledger that decides what its counters
 * mean is pure and always checked in the gate.
 */

import { describe, expect, it } from 'vitest';

import {
  conservationViolations,
  countersMeta,
  CounterTracker,
  zeroCounters,
  type CaptureCounters,
} from '../src/bench/counters.ts';

function counters(partial: Partial<CaptureCounters>): CaptureCounters {
  return { ...zeroCounters(), ...partial };
}

describe('counter tracker', () => {
  it('reports interval deltas, never lifetime totals', () => {
    const tracker = new CounterTracker(counters({ callbacks: 10, grabs: 10 }), 1000);
    const a = tracker.snapshot(counters({ callbacks: 25, grabs: 20, gateSuppressed: 5 }), 6000);
    expect(a.index).toBe(1);
    expect(a.elapsedMs).toBe(5000);
    expect(a.deltas.callbacks).toBe(15);
    expect(a.deltas.grabs).toBe(10);
    expect(a.deltas.gateSuppressed).toBe(5);

    const b = tracker.snapshot(counters({ callbacks: 30, grabs: 25, gateSuppressed: 5 }), 11000);
    expect(b.deltas.callbacks).toBe(5);
    expect(b.deltas.gateSuppressed).toBe(0);
    expect(tracker.intervals).toHaveLength(2);
  });
});

describe('conservation checks', () => {
  it('passes a consistent reading', () => {
    const c = counters({
      callbacks: 100,
      gateSuppressed: 40,
      grabs: 60,
      dirtySkips: 30,
      submitted: 30,
      forcedRefreshes: 3,
      results: 28,
      errors: 1,
      clientDrops: 0,
    });
    expect(conservationViolations(c, 1)).toEqual([]);
  });

  it('flags an announced frame that vanished', () => {
    const c = counters({ callbacks: 10, gateSuppressed: 2, grabs: 7 });
    const violations = conservationViolations(c, 0);
    expect(violations.join(' ')).toMatch(/callbacks \(10\)/);
  });

  it('flags a submission that was never answered', () => {
    const c = counters({
      callbacks: 5,
      grabs: 5,
      submitted: 5,
      results: 3,
      errors: 0,
      clientDrops: 0,
    });
    // Two submissions unaccounted for even allowing one in flight —
    // the D46 wedge shape this check exists to expose.
    const violations = conservationViolations(c, 1);
    expect(violations.join(' ')).toMatch(/submitted \(5\)/);
  });

  it('flags forced refreshes exceeding submissions', () => {
    const c = counters({ callbacks: 2, grabs: 2, submitted: 2, forcedRefreshes: 3, results: 2 });
    expect(conservationViolations(c, 0).join(' ')).toMatch(/forced refreshes/);
  });
});

describe('counters meta', () => {
  it('flattens every counter with the given prefix', () => {
    const meta = countersMeta(counters({ callbacks: 4, results: 2 }), 'counter ');
    expect(meta['counter callbacks']).toBe(4);
    expect(meta['counter results']).toBe(2);
    expect(Object.keys(meta)).toHaveLength(Object.keys(zeroCounters()).length);
  });
});
