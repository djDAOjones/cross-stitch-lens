/**
 * Design stats (§11 subset): hand-built buffers with known counts,
 * plus the invariants — cells partition into stitches + empty,
 * per-colour counts sum to the stitch count, percentages sum to 100,
 * deterministic sort, palette references attached, purity.
 */

import { describe, expect, it } from 'vitest';

import { computeStats } from '../src/core/stats.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const PALETTE: Palette = {
  name: 'test-rwb',
  entries: [
    thread('666', 'bright red', [255, 0, 0]),
    thread('B5200', 'snow white', [255, 255, 255]),
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

  it('names no thread without the palette-index sidecar', () => {
    // A buffer with no sidecar cannot say which thread a stitch is —
    // matching by RGB would be a guess, and the wrong one wherever two
    // brands share a colour. Colours are still counted (M7-BRAND-01).
    expect(stats.identified).toBe(false);
    expect(stats.perColor.every((c) => c.thread === undefined)).toBe(true);
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

describe('computeStats with a palette-index sidecar', () => {
  /**
   * Two threads, one display colour — the case that has no answer in
   * the pixels. Only the sidecar can tell them apart, and a stitcher
   * buying thread needs them told apart.
   */
  const CROSS_BRAND: Palette = {
    name: 'cross-brand',
    entries: [
      thread('310', 'black', [0, 0, 0], { brandId: 'dmc' }),
      thread('403', 'black', [0, 0, 0], { brandId: 'anchor', provenance: 'mapped' }),
    ],
  };

  /** 4 cells, all rendering #000000: two DMC, one Anchor, one empty. */
  function identified(): PixelBuffer {
    const data = new Uint8ClampedArray(4 * 4);
    for (let i = 0; i < 3; i++) data.set([0, 0, 0, 255], i * 4);
    data.set([0, 0, 0, 0], 12);
    return {
      width: 4,
      height: 1,
      data,
      indices: new Uint16Array([0, 0, 1, EMPTY_INDEX]),
    };
  }

  const stats = computeStats(identified(), CROSS_BRAND);

  it('keeps same-RGB threads as separate rows', () => {
    expect(stats.identified).toBe(true);
    expect(stats.colorCount).toBe(2);
    expect(stats.perColor.map((c) => [c.thread?.id, c.count])).toEqual([
      ['dmc:310', 2],
      ['anchor:403', 1],
    ]);
  });

  it('excludes cells the sidecar marks empty', () => {
    expect(stats.stitchCount).toBe(3);
    expect(stats.emptyCount).toBe(1);
  });

  it('counts by RGB — collapsing the two — when the sidecar is absent', () => {
    const source = identified();
    const plain = computeStats(
      { width: source.width, height: source.height, data: source.data },
      CROSS_BRAND,
    );
    expect(plain.identified).toBe(false);
    expect(plain.colorCount).toBe(1);
  });
});
