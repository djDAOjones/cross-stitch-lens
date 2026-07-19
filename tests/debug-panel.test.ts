/**
 * Profiling timing window (the pure half of src/ui/debug-panel.ts):
 * rolling last/median/max aggregation, the whole-frame total row, the
 * window cap, and the reset on a stage-list change. DOM rendering is
 * verified in the running app.
 */

import { describe, expect, it } from 'vitest';

import { formatMs, TimingWindow, WINDOW_SIZE } from '../src/ui/debug-panel.ts';

describe('formatMs', () => {
  it('formats to two decimals', () => {
    expect(formatMs(0)).toBe('0.00');
    expect(formatMs(3.14159)).toBe('3.14');
    expect(formatMs(120)).toBe('120.00');
  });
});

describe('TimingWindow', () => {
  it('is empty before the first frame', () => {
    const w = new TimingWindow();
    expect(w.frameCount).toBe(0);
    expect(w.rows()).toEqual([]);
    expect(w.totalRow()).toBeNull();
  });

  it('aggregates last, median and max per stage in pipeline order', () => {
    const w = new TimingWindow();
    w.record([
      { stage: 'resize', ms: 2 },
      { stage: 'reduce', ms: 10 },
    ]);
    w.record([
      { stage: 'resize', ms: 4 },
      { stage: 'reduce', ms: 6 },
    ]);
    w.record([
      { stage: 'resize', ms: 3 },
      { stage: 'reduce', ms: 8 },
    ]);
    expect(w.rows()).toEqual([
      { stage: 'resize', last: 3, median: 3, max: 4 },
      { stage: 'reduce', last: 8, median: 8, max: 10 },
    ]);
  });

  it('totals the whole frame, not per stage', () => {
    const w = new TimingWindow();
    w.record([
      { stage: 'resize', ms: 2 },
      { stage: 'reduce', ms: 10 },
    ]);
    w.record([
      { stage: 'resize', ms: 4 },
      { stage: 'reduce', ms: 6 },
    ]);
    expect(w.totalRow()).toEqual({ stage: 'Total', last: 10, median: 11, max: 12 });
  });

  it('uses the mean of the middle pair for an even window', () => {
    const w = new TimingWindow();
    w.record([{ stage: 'resize', ms: 1 }]);
    w.record([{ stage: 'resize', ms: 5 }]);
    expect(w.rows()[0]?.median).toBe(3);
  });

  it('caps the window and drops the oldest samples', () => {
    const w = new TimingWindow(3);
    for (const ms of [100, 1, 2, 3]) w.record([{ stage: 'resize', ms }]);
    expect(w.frameCount).toBe(3);
    expect(w.rows()[0]).toEqual({ stage: 'resize', last: 3, median: 2, max: 3 });
  });

  it('resets when the stage list changes', () => {
    const w = new TimingWindow();
    w.record([
      { stage: 'reduce', ms: 10 },
      { stage: 'resize', ms: 2 },
    ]);
    w.record([
      { stage: 'resize', ms: 4 },
      { stage: 'reduce', ms: 6 },
    ]);
    expect(w.frameCount).toBe(1);
    expect(w.rows()).toEqual([
      { stage: 'resize', last: 4, median: 4, max: 4 },
      { stage: 'reduce', last: 6, median: 6, max: 6 },
    ]);
  });

  it('defaults the capacity to WINDOW_SIZE frames', () => {
    const w = new TimingWindow();
    for (let i = 0; i < WINDOW_SIZE + 5; i++) w.record([{ stage: 'resize', ms: i }]);
    expect(w.frameCount).toBe(WINDOW_SIZE);
    expect(w.rows()[0]?.max).toBe(WINDOW_SIZE + 4);
  });
});
