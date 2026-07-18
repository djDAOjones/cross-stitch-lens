/**
 * Design stats (§11 subset): hand-built buffers with known counts,
 * plus the invariants — cells partition into stitches + empty,
 * per-colour counts sum to the stitch count, percentages sum to 100,
 * deterministic sort, palette references attached, purity.
 */

import { describe, expect, it } from 'vitest';

import { computeStats } from '../src/core/stats.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';

const PALETTE: Palette = {
  name: 'test-rwb',
  entries: [
    { code: '666', name: 'bright red', hex: '#ff0000', rgb: [255, 0, 0], manufacturer: 'test' },
    { code: 'B5200', name: 'snow white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
  ],
};

/** 4×2: 4 red, 2 white, 1 blue, 1 empty (alpha 60 < 128). */
function sample(): PixelBuffer {
  const data = new Uint8ClampedArray(8 * 4);
  const put = (i: number, rgba: number[]) => data.set(rgba, i * 4);
  put(0, [255, 0, 0, 255]);
  put(1, [255, 0, 0, 255]);
  put(2, [255, 0, 0, 255]);
  put(3, [255, 0, 0, 200]);
  put(4, [255, 255, 255, 255]);
  put(5, [255, 255, 255, 128]); // exactly 50% → counts as stitch
  put(6, [0, 0, 255, 255]);
  put(7, [9, 9, 9, 60]); // below 50% → empty, colour ignored
  return { width: 4, height: 2, data };
}

describe('computeStats', () => {
  const stats = computeStats(sample(), PALETTE);

  it('partitions cells into stitches and empty (alpha 50% rule)', () => {
    expect(stats.totalCells).toBe(8);
    expect(stats.stitchCount).toBe(7);
    expect(stats.emptyCount).toBe(1);
    expect(stats.stitchCount + stats.emptyCount).toBe(stats.totalCells);
  });

  it('counts distinct colours among stitches only', () => {
    expect(stats.colorCount).toBe(3); // red, white, blue — not the empty cell's colour
  });

  it('per-colour counts sum to the stitch count; percents sum to 100', () => {
    const countSum = stats.perColor.reduce((s, c) => s + c.count, 0);
    const pctSum = stats.perColor.reduce((s, c) => s + c.percent, 0);
    expect(countSum).toBe(stats.stitchCount);
    expect(pctSum).toBeCloseTo(100, 6);
  });

  it('sorts by count descending with exact values', () => {
    expect(stats.perColor.map((c) => [c.hex, c.count])).toEqual([
      ['#ff0000', 4],
      ['#ffffff', 2],
      ['#0000ff', 1],
    ]);
    expect(stats.perColor[0]?.percent).toBeCloseTo(400 / 7, 6);
  });

  it('attaches thread references for palette colours only', () => {
    expect(stats.perColor[0]?.code).toBe('666');
    expect(stats.perColor[1]?.name).toBe('snow white');
    expect(stats.perColor[2]?.code).toBeUndefined(); // blue not in palette
  });

  it('handles the all-empty design without dividing by zero', () => {
    const empty = computeStats({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([5, 5, 5, 0, 6, 6, 6, 10]),
    });
    expect(empty.stitchCount).toBe(0);
    expect(empty.colorCount).toBe(0);
    expect(empty.perColor).toEqual([]);
    expect(empty.emptyCount).toBe(2);
  });

  it('never mutates its input', () => {
    const buffer = sample();
    const before = Array.from(buffer.data);
    computeStats(buffer, PALETTE);
    expect(Array.from(buffer.data)).toEqual(before);
  });
});
