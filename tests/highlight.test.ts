/**
 * Thread-highlight mask (M14-EXT-17): the pure half of the preview
 * decoration. The invariants that matter: matching stitches and
 * fabric stay fully transparent (thread colours are content, never
 * recoloured — absence of scrim IS the highlight), every other stitch
 * gets exactly the uniform scrim, and the mask is RGBA-sized to its
 * index buffer. The DOM/OffscreenCanvas half is verified live.
 */

import { describe, expect, it } from 'vitest';

import { EMPTY_INDEX } from '../src/core/types.ts';
import {
  HIGHLIGHT_SCRIM_ALPHA,
  highlightMaskPixels,
} from '../src/worker/preview-surface.ts';

describe('highlightMaskPixels', () => {
  it('dims every stitch that is not the selected thread', () => {
    const indices = new Uint16Array([0, 1, 2, 1]);
    const mask = highlightMaskPixels(indices, 1);
    expect(mask.length).toBe(16);
    const alphas = [3, 7, 11, 15].map((i) => mask[i]);
    expect(alphas).toEqual([HIGHLIGHT_SCRIM_ALPHA, 0, HIGHLIGHT_SCRIM_ALPHA, 0]);
  });

  it('leaves fabric untouched — empty cells were never the thread', () => {
    const indices = new Uint16Array([EMPTY_INDEX, 5, EMPTY_INDEX]);
    const mask = highlightMaskPixels(indices, 0);
    expect(mask[3]).toBe(0);
    expect(mask[7]).toBe(HIGHLIGHT_SCRIM_ALPHA);
    expect(mask[11]).toBe(0);
  });

  it('writes no colour, only alpha — a scrim, not a recolour', () => {
    const indices = new Uint16Array([2, 3]);
    const mask = highlightMaskPixels(indices, 3);
    for (const channel of [0, 1, 2, 4, 5, 6]) expect(mask[channel]).toBe(0);
  });

  it('matches the stats count for a known fixture', () => {
    // 6 stitches of thread 4, 3 of thread 9, 1 fabric: selecting 4
    // must leave exactly 6 cells unscrimmed among the stitches.
    const indices = new Uint16Array([4, 9, 4, 4, EMPTY_INDEX, 9, 4, 4, 9, 4]);
    const mask = highlightMaskPixels(indices, 4);
    let clearStitches = 0;
    let scrimmed = 0;
    for (let i = 0; i < indices.length; i++) {
      const alpha = mask[i * 4 + 3];
      const index = indices[i] ?? EMPTY_INDEX;
      if (index === EMPTY_INDEX) continue;
      if (alpha === 0) clearStitches += 1;
      else scrimmed += 1;
    }
    expect(clearStitches).toBe(6);
    expect(scrimmed).toBe(3);
  });
});
