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
  DropLedger,
  zeroCounters,
  zeroFrameReason,
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

describe('drop ledger', () => {
  /**
   * One measurement window as the harness runs it: a *fresh* pump gate
   * (its count restarts at zero) against the session-long worker
   * client (its count only grows), folded at each 5 s interval and
   * once more when the books close.
   */
  type Step = Partial<CaptureCounters>;

  function runWindow(
    ledger: CaptureCounters,
    tracker: CounterTracker,
    at: { clientTotal: number },
    intervals: Step[],
  ): { pumpDrops: number; clientDrops: number } {
    let pumpTotal = 0;
    const drops = new DropLedger(pumpTotal, at.clientTotal);
    let window = drops.windowTotals;
    for (const step of intervals) {
      for (const [key, delta] of Object.entries(step) as [keyof CaptureCounters, number][]) {
        // The drop fields reach the ledger only through the fold —
        // that separation is the thing under test.
        if (key === 'pumpDrops') pumpTotal += delta;
        else if (key === 'clientDrops') at.clientTotal += delta;
        else ledger[key] += delta;
      }
      window = drops.fold(ledger, pumpTotal, at.clientTotal);
      tracker.snapshot({ ...ledger }, 0);
    }
    return window;
  }

  it('keeps a multi-window sitting conserved (the D134 taint, regressed)', () => {
    // The 2026-08-08 Photoshop sitting: three live windows whose drop
    // counts were *assigned* to the cumulative field, leaving windows 2
    // and 3 short by exactly the earlier windows' drops (49, then 171).
    const ledger = zeroCounters();
    const tracker = new CounterTracker({ ...ledger }, 0);
    const at = { clientTotal: 0 };

    const w1 = runWindow(ledger, tracker, at, [
      { callbacks: 834, grabs: 834, dirtySkips: 644, submitted: 190, results: 141, clientDrops: 49 },
    ]);
    expect(w1.clientDrops).toBe(49);
    expect(conservationViolations(ledger, 0)).toEqual([]);

    const w2 = runWindow(ledger, tracker, at, [
      { callbacks: 768, grabs: 768, dirtySkips: 420, submitted: 348, results: 226, clientDrops: 122 },
    ]);
    // The window reports its own 122; the ledger carries all 171.
    expect(w2.clientDrops).toBe(122);
    expect(ledger.clientDrops).toBe(171);
    expect(conservationViolations(ledger, 0)).toEqual([]);

    const w3 = runWindow(ledger, tracker, at, [
      { callbacks: 323, grabs: 323, dirtySkips: 141, submitted: 182, results: 124, clientDrops: 58 },
    ]);
    expect(w3.clientDrops).toBe(58);
    // The sitting's own arithmetic, from the D134 report.
    expect(ledger.submitted).toBe(720);
    expect(ledger.results).toBe(491);
    expect(ledger.clientDrops).toBe(229);
    expect(conservationViolations(ledger, 0)).toEqual([]);
  });

  it('never emits a negative interval delta across a window boundary', () => {
    // The published symptom: interval 1 of windows 2 and 3 read −22 and
    // −106 because the cumulative field was reset to a window value.
    const ledger = zeroCounters();
    const tracker = new CounterTracker({ ...ledger }, 0);
    const at = { clientTotal: 0 };
    runWindow(ledger, tracker, at, [
      { submitted: 17, results: 11, pumpDrops: 0, clientDrops: 5 },
      { submitted: 173, results: 130, pumpDrops: 0, clientDrops: 44 },
    ]);
    runWindow(ledger, tracker, at, [
      { submitted: 71, results: 43, pumpDrops: 0, clientDrops: 28 },
      { submitted: 277, results: 183, pumpDrops: 0, clientDrops: 94 },
    ]);
    for (const interval of tracker.intervals) {
      expect(interval.deltas.clientDrops).toBeGreaterThanOrEqual(0);
      expect(interval.deltas.pumpDrops).toBeGreaterThanOrEqual(0);
    }
  });

  it('accumulates the per-window pump gate, whose count restarts each window', () => {
    // `pumpDrops` shared the defect latently: the gate is constructed
    // per window, so its raw count is never a cumulative total.
    const ledger = zeroCounters();
    const tracker = new CounterTracker({ ...ledger }, 0);
    const at = { clientTotal: 0 };
    const w1 = runWindow(ledger, tracker, at, [
      { submitted: 10, results: 7, pumpDrops: 3, clientDrops: 3 },
    ]);
    const w2 = runWindow(ledger, tracker, at, [
      { submitted: 10, results: 8, pumpDrops: 4, clientDrops: 2 },
    ]);
    expect(w1.pumpDrops).toBe(3);
    expect(w2.pumpDrops).toBe(4);
    expect(ledger.pumpDrops).toBe(7);
  });

  it('reports zeroed window totals before the first fold', () => {
    expect(new DropLedger(0, 500).windowTotals).toEqual({ pumpDrops: 0, clientDrops: 0 });
  });
});

describe('zero-frame verdict', () => {
  it('is null when any frame was presented — the window is measurable', () => {
    expect(zeroFrameReason(1, 0)).toBeNull();
    expect(zeroFrameReason(120, 8)).toBeNull();
  });

  it('names the wrong surface when paints were confirmed without frames', () => {
    // The 2026-07-23 signature: the source window painted on command,
    // the pump never ticked — the shared surface was not the source.
    const reason = zeroFrameReason(0, 8);
    expect(reason).toMatch(/8 paint\(s\)/);
    expect(reason).toMatch(/not the source window/);
  });

  it('names a static or wrong surface when nothing painted and nothing flowed', () => {
    const reason = zeroFrameReason(0, 0);
    expect(reason).toMatch(/no frames/);
    expect(reason).toMatch(/button 4/);
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
