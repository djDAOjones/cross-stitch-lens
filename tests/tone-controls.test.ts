/**
 * Tone-controls pure halves (TONE-01): share attribution through
 * swaps, cut clamping, curve nudging, and the share label. The DOM
 * half follows the project's rule — logic that matters is extracted
 * and tested pure; no UI snapshots.
 */

import { describe, expect, it } from 'vitest';

import type { ToneCurve } from '../src/core/color/tone.ts';
import type { ThreadSwap } from '../src/core/pipeline/swap.ts';
import {
  clampCut,
  nudgeCurvePoint,
  rungShares,
  shareLabel,
} from '../src/ui/tone-controls.ts';
import { thread } from './helpers/threads.ts';

const IDENTITY: ToneCurve = [
  { in: 0, out: 0 },
  { in: 50, out: 50 },
  { in: 100, out: 100 },
];

describe('rungShares', () => {
  const counts = new Map([
    ['test:a', 60],
    ['test:b', 30],
    ['test:c', 10],
  ]);

  it('reads shares straight off the counts without swaps', () => {
    expect(rungShares(['test:a', 'test:b', 'test:c'], [], counts)).toEqual([
      0.6, 0.3, 0.1,
    ]);
  });

  it('attributes a render-only swap target back to its rung', () => {
    const swaps: ThreadSwap[] = [{ from: 'test:a', to: thread('z', 'Z', [1, 2, 3]) }];
    const swapped = new Map([
      ['test:z', 60],
      ['test:b', 30],
      ['test:c', 10],
    ]);
    expect(rungShares(['test:a', 'test:b', 'test:c'], swaps, swapped)).toEqual([
      0.6, 0.3, 0.1,
    ]);
  });

  it('a merge into another selected colour reads null on both rungs', () => {
    // a's stitches merged into b: neither a's own share nor b's can be
    // separated in the sidecar, so both read null rather than a guess.
    const swaps: ThreadSwap[] = [{ from: 'test:a', to: thread('b', 'B', [9, 9, 9]) }];
    const merged = new Map([
      ['test:b', 90],
      ['test:c', 10],
    ]);
    expect(rungShares(['test:a', 'test:b', 'test:c'], swaps, merged)).toEqual([
      null,
      null,
      0.1,
    ]);
  });

  it('two swaps onto one shared target read null for both sources', () => {
    const z = thread('z', 'Z', [1, 2, 3]);
    const swaps: ThreadSwap[] = [
      { from: 'test:a', to: z },
      { from: 'test:b', to: z },
    ];
    const shared = new Map([
      ['test:z', 90],
      ['test:c', 10],
    ]);
    expect(rungShares(['test:a', 'test:b', 'test:c'], swaps, shared)).toEqual([
      null,
      null,
      0.1,
    ]);
  });
});

describe('clampCut', () => {
  it('keeps a cut ascending between its neighbours, equal legal', () => {
    const cuts = [20, 50, 80];
    expect(clampCut(cuts, 1, 10)).toBe(20);
    expect(clampCut(cuts, 1, 95)).toBe(80);
    expect(clampCut(cuts, 1, 33.333)).toBe(33.3);
    expect(clampCut(cuts, 0, -5)).toBe(0);
    expect(clampCut(cuts, 2, 200)).toBe(100);
  });
});

describe('nudgeCurvePoint', () => {
  it('moves a point on both axes within its neighbours and 0–100', () => {
    const bent = nudgeCurvePoint(IDENTITY, 1, 10, -20);
    expect(bent[1]).toEqual({ in: 60, out: 30 });
    // Inputs stay non-decreasing: the mid cannot cross the top.
    const pushed = nudgeCurvePoint(IDENTITY, 1, 999, 0);
    expect(pushed[1].in).toBe(100);
    const under = nudgeCurvePoint(IDENTITY, 0, 0, -50);
    expect(under[0].out).toBe(0);
  });

  it('returns a fresh curve and leaves the input untouched', () => {
    const before = JSON.stringify(IDENTITY);
    const bent = nudgeCurvePoint(IDENTITY, 2, 0, -1);
    expect(JSON.stringify(IDENTITY)).toBe(before);
    expect(bent[2].out).toBe(99);
  });
});

describe('shareLabel', () => {
  it('rounds to whole percent, keeping one decimal under 1%', () => {
    expect(shareLabel(0.315)).toBe('32%');
    expect(shareLabel(0)).toBe('0%');
    expect(shareLabel(0.004)).toBe('0.4%');
    expect(shareLabel(1)).toBe('100%');
  });
});
