/**
 * Clean PNG export — the pure transforms (§13 MVP subset). The canvas
 * encoder and download trigger are browser-only and verified in the
 * running app; everything that decides pixel values is tested here.
 *
 * Invariants: enlargement is exact k×k block replication (nearest
 * neighbour by construction), flattening composites straight-alpha
 * over an opaque colour, and neither mutates its input.
 */

import { describe, expect, it } from 'vitest';

import {
  encodePngBlob,
  flattenBackground,
  hexToRgb,
  MAX_OUTPUT_SIDE,
  maxScaleFor,
  oversizeMessage,
  pngFilename,
  scaleNearest,
} from '../src/export/png.ts';
import type { PixelBuffer } from '../src/core/types.ts';

/** 2×1 buffer: opaque red left, half-transparent green right. */
function twoPixels(): PixelBuffer {
  return {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128]),
  };
}

describe('scaleNearest', () => {
  it('replicates each stitch as a k×k block', () => {
    const out = scaleNearest(twoPixels(), 2);
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
    const px = (x: number, y: number): number[] =>
      Array.from(out.data.slice((y * out.width + x) * 4, (y * out.width + x) * 4 + 4));
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      expect(px(x, y)).toEqual([255, 0, 0, 255]);
    }
    for (const [x, y] of [
      [2, 0],
      [3, 0],
      [2, 1],
      [3, 1],
    ] as const) {
      expect(px(x, y)).toEqual([0, 255, 0, 128]);
    }
  });

  it('returns a copy at factor 1 and never mutates its input', () => {
    const input = twoPixels();
    const snapshot = Array.from(input.data);
    const out = scaleNearest(input, 1);
    expect(out.data).not.toBe(input.data);
    expect(Array.from(out.data)).toEqual(snapshot);
    scaleNearest(input, 3);
    expect(Array.from(input.data)).toEqual(snapshot);
  });

  it('floors and clamps the factor to at least 1', () => {
    expect(scaleNearest(twoPixels(), 2.9).width).toBe(4);
    expect(scaleNearest(twoPixels(), 0).width).toBe(2);
  });
});

describe('flattenBackground', () => {
  it('composites straight alpha over the opaque background', () => {
    const out = flattenBackground(twoPixels(), '#000000');
    // Opaque pixel unchanged; output always opaque.
    expect(Array.from(out.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    // Half-transparent green over black → green scaled by alpha.
    const g = out.data[5] ?? 0;
    expect(Math.abs(g - Math.round(255 * (128 / 255)))).toBeLessThanOrEqual(1);
    expect(out.data[7]).toBe(255);
  });

  it('replaces fully transparent pixels with the background colour', () => {
    const input: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 0]),
    };
    const out = flattenBackground(input, '#336699');
    expect(Array.from(out.data)).toEqual([0x33, 0x66, 0x99, 255]);
  });

  it('never mutates its input and rejects malformed colours', () => {
    const input = twoPixels();
    const snapshot = Array.from(input.data);
    flattenBackground(input, '#ffffff');
    expect(Array.from(input.data)).toEqual(snapshot);
    expect(() => flattenBackground(input, 'white')).toThrow(/#rrggbb/);
  });
});

describe('hexToRgb', () => {
  it('parses #rrggbb in either case and rejects other shapes', () => {
    expect(hexToRgb('#FF8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(() => hexToRgb('#fff')).toThrow(/#rrggbb/);
    expect(() => hexToRgb('ff8000')).toThrow(/#rrggbb/);
  });
});

describe('maxScaleFor', () => {
  it('keeps the longest output side within the canvas limit', () => {
    expect(maxScaleFor(200, 200)).toBe(81); // 200 × 81 = 16200 ≤ 16384
    expect(maxScaleFor(1024, 512)).toBe(16);
    expect(maxScaleFor(16384, 1)).toBe(1); // never below 1
  });
});

describe('pngFilename', () => {
  it('names by stitch size and marks enlargement only above 1×', () => {
    expect(pngFilename(200, 150, 1)).toBe('design-200x150.png');
    expect(pngFilename(200, 150, 4)).toBe('design-200x150@4x.png');
  });
});

describe('oversize refusal (M13-DEF-02 regression)', () => {
  it('describes the limit and a remedy, and passes sizes inside it', () => {
    expect(oversizeMessage(MAX_OUTPUT_SIDE, MAX_OUTPUT_SIDE)).toBeNull();
    const message = oversizeMessage(MAX_OUTPUT_SIDE + 1, 10);
    expect(message).toMatch(/canvas limit/);
    expect(message).toContain(String(MAX_OUTPUT_SIDE + 1));
    expect(message).toMatch(/reduce/);
  });

  it('encodePngBlob refuses before any canvas exists (node-safe)', async () => {
    // Past the limit the browser silently zeroes the canvas and the
    // encode dies with an unactionable error; the guard must throw the
    // user-facing sentence first — which is also why this rejects in
    // node, where OffscreenCanvas does not exist at all.
    const oversized: PixelBuffer = {
      width: MAX_OUTPUT_SIDE + 1,
      height: 10,
      data: new Uint8ClampedArray(0),
    };
    await expect(encodePngBlob(oversized)).rejects.toThrow(/canvas limit/);
  });
});
