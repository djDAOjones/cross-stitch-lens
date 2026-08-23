/**
 * The swap stage and its render palette (ICE-RECOLOUR-01, D182):
 * remap, merge, no-chain, empty cells, dangling rules, purity, and the
 * "omit when inert" contract the config builder relies on.
 */

import { describe, expect, it } from 'vitest';

import { renderPalette, swapStage, type ThreadSwap } from '../src/core/pipeline/swap.ts';
import { EMPTY_INDEX, type PixelBuffer } from '../src/core/types.ts';
import { palette, thread } from './helpers/threads.ts';

const K = thread('K', 'black', [0, 0, 0]);
const W = thread('W', 'white', [255, 255, 255]);
const R = thread('R', 'red', [255, 0, 0]);
const G = thread('G', 'green', [0, 255, 0]);
const SELECTED = palette('kw', [K, W]);

/** A 2×2 frame already quantised to `indices`, painted from SELECTED. */
function frame(indices: number[]): PixelBuffer {
  const data = new Uint8ClampedArray(indices.length * 4);
  indices.forEach((index, cell) => {
    const rgb = index === EMPTY_INDEX ? [9, 9, 9] : (SELECTED.entries[index]?.rgb ?? [0, 0, 0]);
    data.set([rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0, index === EMPTY_INDEX ? 0 : 255], cell * 4);
  });
  return { width: 2, height: 2, data, indices: new Uint16Array(indices) };
}

function run(buffer: PixelBuffer, swaps: ThreadSwap[]): PixelBuffer {
  return swapStage.backends.ts(buffer, renderPalette(SELECTED, swaps));
}

describe('renderPalette', () => {
  it('appends a render-only target after the selected entries, indices unchanged (happy path)', () => {
    const render = renderPalette(SELECTED, [{ from: K.id, to: R }]);
    expect(render.palette.entries.map((e) => e.id)).toEqual([K.id, W.id, R.id]);
    expect([...render.map]).toEqual([2, 1]);
    expect(render.active).toBe(true);
  });

  it('a target already selected is a merge — maps to its index, nothing appended', () => {
    const render = renderPalette(SELECTED, [{ from: K.id, to: W }]);
    expect(render.palette.entries.map((e) => e.id)).toEqual([K.id, W.id]);
    expect([...render.map]).toEqual([1, 1]);
    expect(render.active).toBe(true);
  });

  it('two swaps onto one thread share a single appended entry', () => {
    const render = renderPalette(SELECTED, [
      { from: K.id, to: R },
      { from: W.id, to: R },
    ]);
    expect(render.palette.entries.map((e) => e.id)).toEqual([K.id, W.id, R.id]);
    expect([...render.map]).toEqual([2, 2]);
  });

  it('is inert — not active — with no swaps, only dangling swaps, or a self-swap (empty/boundary)', () => {
    expect(renderPalette(SELECTED, []).active).toBe(false);
    const dangling = renderPalette(SELECTED, [{ from: R.id, to: G }]);
    expect(dangling.active).toBe(false);
    expect(dangling.palette.entries.map((e) => e.id)).toEqual([K.id, W.id]);
    expect(renderPalette(SELECTED, [{ from: K.id, to: K }]).active).toBe(false);
  });

  it('never chains: a swap from an appended target is ignored (boundary)', () => {
    // X → Y then Y → Z, where Y was not selected: Y is render-only, so
    // it cannot be a `from`; K's cells stitch R, not G.
    const render = renderPalette(SELECTED, [
      { from: K.id, to: R },
      { from: R.id, to: G },
    ]);
    expect([...render.map]).toEqual([2, 1]);
    expect(render.palette.entries.map((e) => e.id)).toEqual([K.id, W.id, R.id]);
  });

  it('a later rule for the same entry wins — re-target semantics', () => {
    const render = renderPalette(SELECTED, [
      { from: K.id, to: R },
      { from: K.id, to: G },
    ]);
    expect(render.map[0]).toBe(render.palette.entries.findIndex((e) => e.id === G.id));
  });

  it('does not mutate the selected palette', () => {
    const before = SELECTED.entries.map((e) => e.id);
    renderPalette(SELECTED, [{ from: K.id, to: R }]);
    expect(SELECTED.entries.map((e) => e.id)).toEqual(before);
  });
});

describe('swap stage', () => {
  it('rewrites the sidecar through the map and repaints the RGB (happy path)', () => {
    const input = frame([0, 1, 0, 1]);
    const out = run(input, [{ from: K.id, to: R }]);
    expect([...(out.indices ?? [])]).toEqual([2, 1, 2, 1]);
    expect([...out.data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...out.data.subarray(4, 8)]).toEqual([255, 255, 255, 255]);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
  });

  it('merges into a selected entry — the cells take that entry’s index and colour', () => {
    const out = run(frame([0, 1, 0, 1]), [{ from: K.id, to: W }]);
    expect([...(out.indices ?? [])]).toEqual([1, 1, 1, 1]);
    expect([...out.data.subarray(0, 3)]).toEqual([255, 255, 255]);
  });

  it('leaves empty cells empty — index and alpha untouched (boundary)', () => {
    const out = run(frame([0, EMPTY_INDEX, 0, 1]), [{ from: K.id, to: R }]);
    expect(out.indices?.[1]).toBe(EMPTY_INDEX);
    expect(out.data[4 * 1 + 3]).toBe(0);
    expect([...out.data.subarray(4, 7)]).toEqual([9, 9, 9]);
  });

  it('a dangling swap changes nothing but still returns a fresh buffer (empty)', () => {
    const input = frame([0, 1, 0, 1]);
    const out = run(input, [{ from: R.id, to: G }]);
    expect([...(out.indices ?? [])]).toEqual([0, 1, 0, 1]);
    expect([...out.data]).toEqual([...input.data]);
    expect(out.data).not.toBe(input.data);
    expect(out.indices).not.toBe(input.indices);
  });

  it('passes a buffer without a sidecar through as a copy (boundary)', () => {
    const input = frame([0, 1, 0, 1]);
    delete input.indices;
    const out = run(input, [{ from: K.id, to: R }]);
    expect(out.indices).toBeUndefined();
    expect([...out.data]).toEqual([...input.data]);
    expect(out.data).not.toBe(input.data);
  });

  it('is pure: the input buffer and sidecar are never mutated', () => {
    const input = frame([0, 1, 0, 1]);
    const data = [...input.data];
    const indices = [...(input.indices ?? [])];
    run(input, [{ from: K.id, to: R }]);
    expect([...input.data]).toEqual(data);
    expect([...(input.indices ?? [])]).toEqual(indices);
  });
});
