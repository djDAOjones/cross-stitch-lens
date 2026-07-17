/**
 * Reduce stage: golden fixture + the invariants that matter — every
 * output pixel is a palette colour, palette-coloured input is a fixed
 * point, LUT and exact paths agree on bin-representative colours, and
 * alpha passes through.
 *
 * The 2x2 golden fixture is hand-derived: four near-primary pixels
 * against a {red, white, blue... black} test palette whose nearest
 * matches are unambiguous under both metrics, so the expected output
 * is verifiable by inspection.
 */

import { describe, expect, it } from 'vitest';

import { binToChannel, buildLut, LUT_SIZE, lutKey } from '../src/core/color/lut.ts';
import { loadDmcPalette } from '../src/core/palette.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { reduceStage, type ReduceParams } from '../src/core/pipeline/reduce.ts';
import { stageInstance } from '../src/core/types.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import { expectBufferMatch, loadGolden } from './helpers/golden.ts';

/** Small unambiguous palette for hand-derivable fixtures. */
const TEST_PALETTE: Palette = {
  name: 'test-rwbk',
  entries: [
    { code: 'R', name: 'red', hex: '#ff0000', rgb: [255, 0, 0], manufacturer: 'test' },
    { code: 'W', name: 'white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
    { code: 'B', name: 'blue', hex: '#0000ff', rgb: [0, 0, 255], manufacturer: 'test' },
    { code: 'K', name: 'black', hex: '#000000', rgb: [0, 0, 0], manufacturer: 'test' },
  ],
};

function reduceParams(overrides: Partial<ReduceParams> = {}): ReduceParams {
  return { palette: TEST_PALETTE, metric: 'lab', path: 'exact', ...overrides };
}

function paletteColorSet(palette: Palette): Set<string> {
  return new Set(palette.entries.map((e) => e.rgb.join(',')));
}

describe('reduce stage', () => {
  it('matches the hand-derived golden fixture on both paths and metrics (tolerance 0)', () => {
    const input = loadGolden('reduce-2x2.input');
    const expected = loadGolden('reduce-2x2.expected');
    for (const path of ['lut', 'exact'] as const) {
      for (const metric of ['rgb', 'lab'] as const) {
        const output = runPipeline(input, [
          stageInstance(reduceStage, reduceParams({ path, metric })),
        ]);
        expectBufferMatch(output, expected, 0);
      }
    }
  });

  it('every output pixel is a palette colour (DMC, 8x8 gradient)', () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = (i * 37) % 256;
      data[i * 4 + 1] = (i * 101) % 256;
      data[i * 4 + 2] = (i * 197) % 256;
      data[i * 4 + 3] = 255;
    }
    const input: PixelBuffer = { width, height, data };
    const dmc = loadDmcPalette();
    const allowed = paletteColorSet(dmc);

    const output = runPipeline(input, [
      stageInstance(reduceStage, reduceParams({ palette: dmc, path: 'lut' })),
    ]);
    for (let i = 0; i < output.data.length; i += 4) {
      const key = `${String(output.data[i])},${String(output.data[i + 1])},${String(output.data[i + 2])}`;
      expect(allowed.has(key), `pixel ${String(i / 4)} → ${key}`).toBe(true);
    }
  });

  it('palette-coloured input is a fixed point (exact path)', () => {
    const entries = TEST_PALETTE.entries;
    const data = new Uint8ClampedArray(entries.length * 4);
    entries.forEach((e, i) => {
      data[i * 4] = e.rgb[0];
      data[i * 4 + 1] = e.rgb[1];
      data[i * 4 + 2] = e.rgb[2];
      data[i * 4 + 3] = 255;
    });
    const input: PixelBuffer = { width: entries.length, height: 1, data };
    const output = runPipeline(input, [stageInstance(reduceStage, reduceParams())]);
    expectBufferMatch(output, input, 0);
  });

  it('LUT agrees with exact matching on every bin-representative colour', () => {
    // On bin centers quantisation is lossless, so the two paths must
    // agree exactly; sample every 7th bin to keep the test fast.
    const lut = buildLut(TEST_PALETTE, 'lab');
    const input: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4),
    };
    for (let key = 0; key < LUT_SIZE; key += 7) {
      const r = binToChannel(key >> 10);
      const g = binToChannel((key >> 5) & 31);
      const b = binToChannel(key & 31);
      input.data[0] = r;
      input.data[1] = g;
      input.data[2] = b;
      input.data[3] = 255;
      const viaExact = runPipeline(input, [
        stageInstance(reduceStage, reduceParams()),
      ]);
      const viaLut = runPipeline(input, [
        stageInstance(reduceStage, reduceParams({ path: 'lut', lut })),
      ]);
      expect(lutKey(r, g, b)).toBe(key);
      expectBufferMatch(viaLut, viaExact, 0);
    }
  });

  it('passes alpha through untouched', () => {
    const input = loadGolden('reduce-2x2.input');
    const output = runPipeline(input, [stageInstance(reduceStage, reduceParams())]);
    for (let i = 3; i < input.data.length; i += 4) {
      expect(output.data[i]).toBe(input.data[i]);
    }
  });

  it('never mutates its input (stage purity)', () => {
    const input = loadGolden('reduce-2x2.input');
    const before = Array.from(input.data);
    runPipeline(input, [stageInstance(reduceStage, reduceParams())]);
    expect(Array.from(input.data)).toEqual(before);
  });
});
