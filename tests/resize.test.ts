/**
 * Resize stage: hand-derivable golden cases + invariants — output is
 * always grid-sized, each mode's geometry (letterbox, crop, unscaled
 * centring), exact area averages on constructed inputs, premultiplied
 * edges, bounds validation, purity.
 *
 * The area averages here are exact fractions, so expected values are
 * computed by inspection rather than committed fixtures — every case
 * is small enough to verify by hand.
 */

import { describe, expect, it } from 'vitest';

import { resizeStage, type ResizeParams } from '../src/core/pipeline/resize.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { stageInstance } from '../src/core/types.ts';
import type { PixelBuffer } from '../src/core/types.ts';
import { expectBufferMatch, loadGolden } from './helpers/golden.ts';

function solid(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, data };
}

function px(buffer: PixelBuffer, x: number, y: number): number[] {
  const i = (y * buffer.width + x) * 4;
  return Array.from(buffer.data.slice(i, i + 4));
}

function resize(input: PixelBuffer, params: ResizeParams): PixelBuffer {
  return runPipeline(input, [stageInstance(resizeStage, params)]);
}

describe('resize stage', () => {
  it('matches the committed golden fixture bit-exactly (tolerance 0)', () => {
    const input = loadGolden('resize-9x5-contain-4x4.input');
    const output = resize(input, { width: 4, height: 4, mode: 'contain' });
    expectBufferMatch(output, loadGolden('resize-9x5-contain-4x4.expected'), 0);
  });

  it('always outputs grid dimensions, whatever the mode', () => {
    const input = solid(7, 3, [10, 20, 30, 255]);
    for (const mode of ['stretch', 'contain', 'cover', 'fit'] as const) {
      const out = resize(input, { width: 5, height: 9, mode });
      expect(out.width).toBe(5);
      expect(out.height).toBe(9);
      expect(out.data.length).toBe(5 * 9 * 4);
    }
  });

  it('stretch of a solid image is solid (any grid)', () => {
    const out = resize(solid(3, 5, [200, 100, 50, 255]), {
      width: 8,
      height: 2,
      mode: 'stretch',
    });
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        expect(px(out, x, y)).toEqual([200, 100, 50, 255]);
      }
    }
  });

  it('downscales a 2x2 checkerboard to exactly mid-gray (area average)', () => {
    const input = solid(2, 2, [0, 0, 0, 255]);
    input.data.set([255, 255, 255, 255], 0); // (0,0)
    input.data.set([255, 255, 255, 255], 12); // (1,1)
    const out = resize(input, { width: 1, height: 1, mode: 'stretch' });
    // (255+0+0+255)/4 = 127.5 → clamped-array round-half-even → 128.
    expect(px(out, 0, 0)).toEqual([128, 128, 128, 255]);
  });

  it('contain letterboxes a 2:1 source in a square grid with empty rows', () => {
    const out = resize(solid(8, 4, [50, 60, 70, 255]), {
      width: 4,
      height: 4,
      mode: 'contain',
    });
    // Scaled to 4x2, centred: row 0 and 3 empty, rows 1–2 solid.
    for (let x = 0; x < 4; x++) {
      expect(px(out, x, 0)).toEqual([0, 0, 0, 0]);
      expect(px(out, x, 1)).toEqual([50, 60, 70, 255]);
      expect(px(out, x, 2)).toEqual([50, 60, 70, 255]);
      expect(px(out, x, 3)).toEqual([0, 0, 0, 0]);
    }
  });

  it('cover crops symmetrically: horizontal halves survive, no empty cells', () => {
    // Left half red, right half blue, 8x4 → cover 4x4 shows the
    // central 4x4 of the source: columns 2–5 = one red, one blue pair
    // per output column after 1:1 vertical scale... scale = max(4/8,
    // 4/4) = 1, visible source x ∈ [2,6): cols 2,3 red; 4,5 blue.
    const input = solid(8, 4, [255, 0, 0, 255]);
    for (let y = 0; y < 4; y++) {
      for (let x = 4; x < 8; x++) input.data.set([0, 0, 255, 255], (y * 8 + x) * 4);
    }
    const out = resize(input, { width: 4, height: 4, mode: 'cover' });
    for (let y = 0; y < 4; y++) {
      expect(px(out, 0, y)).toEqual([255, 0, 0, 255]);
      expect(px(out, 1, y)).toEqual([255, 0, 0, 255]);
      expect(px(out, 2, y)).toEqual([0, 0, 255, 255]);
      expect(px(out, 3, y)).toEqual([0, 0, 255, 255]);
    }
  });

  it('fit never enlarges: a small source is centred unscaled', () => {
    const out = resize(solid(2, 2, [90, 91, 92, 255]), {
      width: 6,
      height: 4,
      mode: 'fit',
    });
    // 2x2 centred in 6x4: occupied cells x∈{2,3}, y∈{1,2}.
    let opaque = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        const inside = x >= 2 && x <= 3 && y >= 1 && y <= 2;
        expect(px(out, x, y)).toEqual(inside ? [90, 91, 92, 255] : [0, 0, 0, 0]);
        if (inside) opaque++;
      }
    }
    expect(opaque).toBe(4);
  });

  it('fit downscales like contain when the source is larger', () => {
    const big = solid(8, 8, [1, 2, 3, 255]);
    const viaFit = resize(big, { width: 4, height: 4, mode: 'fit' });
    const viaContain = resize(big, { width: 4, height: 4, mode: 'contain' });
    expect(Array.from(viaFit.data)).toEqual(Array.from(viaContain.data));
  });

  it('averages colour in premultiplied alpha (transparent pixels do not bleed)', () => {
    // One opaque red + one fully transparent GREEN pixel → the colour
    // must stay pure red; straight averaging would drag it green.
    const input = solid(2, 1, [255, 0, 0, 255]);
    input.data.set([0, 255, 0, 0], 4);
    const out = resize(input, { width: 1, height: 1, mode: 'stretch' });
    expect(px(out, 0, 0)).toEqual([255, 0, 0, 128]);
  });

  it('rejects out-of-range grid dimensions', () => {
    const input = solid(2, 2, [0, 0, 0, 255]);
    for (const bad of [0, 1025, 2.5, -1, NaN]) {
      expect(() =>
        resize(input, { width: bad, height: 4, mode: 'stretch' }),
      ).toThrow(RangeError);
      expect(() =>
        resize(input, { width: 4, height: bad, mode: 'stretch' }),
      ).toThrow(RangeError);
    }
    // Bounds themselves are valid.
    expect(() => resize(input, { width: 1, height: 1024, mode: 'stretch' })).not.toThrow();
  });

  it('is deterministic and never mutates its input', () => {
    const input = solid(5, 4, [9, 8, 7, 200]);
    input.data.set([120, 130, 140, 90], 20);
    const before = Array.from(input.data);
    const a = resize(input, { width: 3, height: 3, mode: 'cover' });
    const b = resize(input, { width: 3, height: 3, mode: 'cover' });
    expect(Array.from(input.data)).toEqual(before);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    expect(a.data).not.toBe(input.data);
  });
});
