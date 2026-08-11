/**
 * The M8 dither algorithms (M8-ALG-01, D61): every shipped method —
 * Atkinson, Jarvis, ordered (Bayer 8×8), blue-noise — against the
 * invariants the Floyd–Steinberg suite pins for the original stage:
 * strict palette membership with a correct indices sidecar, bit-exact
 * determinism, transparency preservation, boundary geometry (1-row,
 * 1-column, 1×1), both metrics, non-default strengths, and purity.
 * Plus the M8-specific contracts: methods are pairwise distinct,
 * strength visibly changes output, serpentine only affects diffusion,
 * threshold tiles are well-formed, and default params keep the FS
 * output byte-identical to an explicit-FS call (the migration
 * guarantee riding on `dither.ts` defaults).
 *
 * Since M8-GOLD-02 (D154) the four methods also carry **committed
 * golden fixtures**. The owner approved adding them on 2026-08-09 after
 * judging all five methods at the combined sitting — the best-evidenced
 * moment that decision would get. `tests/golden/**` stays protected:
 * any later regeneration needs its own approval with a stated
 * algorithm reason, never to make a failing test pass.
 */

import { describe, expect, it } from 'vitest';

import { nearestIndex } from '../src/core/color/lut.ts';
import {
  ditherStage,
  THRESHOLD_BASE_AMPLITUDE,
  type DitherAlgorithm,
  type DitherParams,
} from '../src/core/pipeline/dither.ts';
import {
  bayer8,
  bayerTile,
  blueNoise32,
  blueNoiseTile,
} from '../src/core/pipeline/threshold-tiles.ts';
import { EMPTY_INDEX } from '../src/core/types.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';
import { expectBufferMatch, loadGolden } from './helpers/golden.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { stageInstance } from '../src/core/types.ts';

const TEST_PALETTE: Palette = {
  name: 'test-rwbk',
  entries: [
    thread('R', 'red', [255, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
    thread('B', 'blue', [0, 0, 255]),
    thread('K', 'black', [0, 0, 0]),
  ],
};

const BW_PALETTE: Palette = {
  name: 'test-bw',
  entries: [
    thread('K', 'black', [0, 0, 0]),
    thread('W', 'white', [255, 255, 255]),
  ],
};

/** The methods under test (everything but the implicit FS default). */
const ALGORITHMS: DitherAlgorithm[] = [
  'floyd-steinberg',
  'atkinson',
  'jarvis',
  'ordered',
  'blue-noise',
];

const dither = ditherStage.backends.ts;

function params(overrides: Partial<DitherParams> = {}): DitherParams {
  return { palette: TEST_PALETTE, metric: 'rgb', serpentine: true, ...overrides };
}

/** A deterministic gradient with a transparent band and hole. */
function fixture(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = Math.round((255 * x) / Math.max(1, width - 1));
      data[i + 1] = Math.round((255 * y) / Math.max(1, height - 1));
      data[i + 2] = Math.round((255 * (x + y)) / Math.max(1, width + height - 2));
      const inHole = height > 4 && y === Math.floor(height / 2) && x % 5 === 0;
      data[i + 3] = y === 0 || inHole ? 0 : 255;
    }
  }
  return { width, height, data };
}

describe('every M8 algorithm holds the stage invariants', () => {
  for (const algorithm of ALGORITHMS) {
    describe(algorithm, () => {
      it('is deterministic and pure (input untouched, fresh output)', () => {
        const input = fixture(16, 12);
        const before = Array.from(input.data);
        const a = dither(input, params({ algorithm }));
        const b = dither(input, params({ algorithm }));
        expect(Array.from(input.data)).toEqual(before);
        expect(a.data).not.toBe(input.data);
        expect(Array.from(a.data)).toEqual(Array.from(b.data));
        expect(Array.from(a.indices ?? [])).toEqual(Array.from(b.indices ?? []));
      });

      it('maps every opaque pixel to a palette colour with a truthful index', () => {
        for (const metric of ['rgb', 'lab'] as const) {
          const out = dither(fixture(16, 12), params({ algorithm, metric }));
          expect(out.indices).toBeDefined();
          for (let p = 0; p < out.width * out.height; p++) {
            const i = p * 4;
            const idx = out.indices?.[p] ?? EMPTY_INDEX;
            if ((out.data[i + 3] ?? 0) === 0) {
              expect(idx).toBe(EMPTY_INDEX);
              expect(out.data[i]).toBe(0);
              continue;
            }
            const entry = TEST_PALETTE.entries[idx];
            expect(entry).toBeDefined();
            expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(entry?.rgb);
          }
        }
      });

      it('survives boundary geometry: 1×1, one row, one column', () => {
        for (const [w, h] of [
          [1, 1],
          [8, 1],
          [1, 8],
        ] as const) {
          const out = dither(fixture(w, h), params({ algorithm }));
          expect(out.width).toBe(w);
          expect(out.height).toBe(h);
        }
      });

      it('handles a fully transparent input without touching a pixel', () => {
        const input = fixture(6, 1); // row 0 is the transparent band
        const out = dither(input, params({ algorithm }));
        for (let i = 0; i < out.data.length; i++) expect(out.data[i]).toBe(0);
        for (let p = 0; p < 6; p++) expect(out.indices?.[p]).toBe(EMPTY_INDEX);
      });

      it('quantises correctly against a tiny palette at a damped strength', () => {
        const out = dither(
          fixture(12, 12),
          params({ algorithm, palette: BW_PALETTE, strength: 0.5 }),
        );
        for (let p = 0; p < out.width * out.height; p++) {
          const i = p * 4;
          if ((out.data[i + 3] ?? 0) === 0) continue;
          expect([0, 255]).toContain(out.data[i]);
          expect(out.data[i]).toBe(out.data[i + 1]);
          expect(out.data[i]).toBe(out.data[i + 2]);
        }
      });
    });
  }
});

describe('the algorithms are materially different (D61 committed set)', () => {
  it('no two methods produce the same pixels on a gradient', () => {
    const input = fixture(24, 24);
    const rendered = ALGORITHMS.map((algorithm) =>
      dither(input, params({ algorithm })).data.join(','),
    );
    expect(new Set(rendered).size).toBe(ALGORITHMS.length);
  });

  it('strength visibly changes every method that carries it', () => {
    const input = fixture(24, 24);
    for (const algorithm of ALGORITHMS) {
      const full = dither(input, params({ algorithm, strength: 1 }));
      const half = dither(input, params({ algorithm, strength: 0.5 }));
      expect(full.data.join(','), algorithm).not.toBe(half.data.join(','));
    }
  });

  it('strength 0 threshold equals the exact nearest match per cell', () => {
    // Amplitude 0 adds no offset: ordered at strength 0 must agree
    // with the exact nearest match for every opaque cell.
    const input = fixture(12, 12);
    const out = dither(input, params({ algorithm: 'ordered', strength: 0 }));
    const palRgb = new Uint8ClampedArray(TEST_PALETTE.entries.flatMap((t) => t.rgb));
    const scratch = new Float32Array(3);
    for (let p = 0; p < out.width * out.height; p++) {
      const i = p * 4;
      if ((input.data[i + 3] ?? 0) === 0) continue;
      const expected = nearestIndex(
        input.data[i] ?? 0,
        input.data[i + 1] ?? 0,
        input.data[i + 2] ?? 0,
        'rgb',
        palRgb,
        new Float32Array(0),
        scratch,
      );
      expect(out.indices?.[p]).toBe(expected);
    }
  });

  it('serpentine changes diffusion output and leaves threshold output alone', () => {
    const input = fixture(24, 24);
    for (const algorithm of ['floyd-steinberg', 'atkinson', 'jarvis'] as const) {
      const serp = dither(input, params({ algorithm, serpentine: true }));
      const raster = dither(input, params({ algorithm, serpentine: false }));
      expect(serp.data.join(','), algorithm).not.toBe(raster.data.join(','));
    }
    for (const algorithm of ['ordered', 'blue-noise'] as const) {
      const serp = dither(input, params({ algorithm, serpentine: true }));
      const raster = dither(input, params({ algorithm, serpentine: false }));
      expect(serp.data.join(','), algorithm).toBe(raster.data.join(','));
    }
  });

  it('defaults mean Floyd–Steinberg at full strength — the migration guarantee', () => {
    const input = fixture(16, 16);
    const implicit = dither(input, params());
    const explicit = dither(
      input,
      params({ algorithm: 'floyd-steinberg', strength: 1 }),
    );
    expect(Array.from(implicit.data)).toEqual(Array.from(explicit.data));
  });
});

describe('threshold tiles', () => {
  it('bayer tiles hold each rank exactly once, normalised to [0, 1)', () => {
    for (const size of [2, 4, 8] as const) {
      const tile = bayerTile(size);
      const ranks = Array.from(tile.thresholds)
        .map((t) => Math.round(t * size * size - 0.5))
        .sort((a, b) => a - b);
      expect(ranks).toEqual(Array.from({ length: size * size }, (_, i) => i));
    }
  });

  it('the blue-noise tile is a permutation of ranks and reproducible', () => {
    const tile = blueNoiseTile(16, 0x5eed);
    const again = blueNoiseTile(16, 0x5eed);
    expect(Array.from(tile.thresholds)).toEqual(Array.from(again.thresholds));
    const ranks = Array.from(tile.thresholds)
      .map((t) => Math.round(t * 256 - 0.5))
      .sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 256 }, (_, i) => i));
  });

  it('a different seed produces a different tile (the seed is load-bearing)', () => {
    const a = blueNoiseTile(16, 0x5eed);
    const b = blueNoiseTile(16, 0xbeef);
    expect(Array.from(a.thresholds)).not.toEqual(Array.from(b.thresholds));
  });

  it('the shipped tiles are memoised and sized as documented', () => {
    expect(bayer8()).toBe(bayer8());
    expect(bayer8().size).toBe(8);
    expect(blueNoise32()).toBe(blueNoise32());
    expect(blueNoise32().size).toBe(32);
    expect(THRESHOLD_BASE_AMPLITUDE).toBe(48);
  });
});

describe('committed golden fixtures (M8-GOLD-02, D154)', () => {
  // Owner-approved 2026-08-09 after judging all five methods at the
  // combined sitting. These pin today's signed-off output so a future
  // WASM or WebGPU backend cannot drift silently — the reason the
  // Floyd–Steinberg golden has existed since M1.
  //
  // Source: an 8×8 crop of `public/profile-demo/landscape-1.jpg` taken
  // 1:1 at (320, 768), committed as a JSON pixel buffer in the existing
  // house style rather than as the JPEG. Two reasons, both from the
  // owner's own reasoning at the sitting: a golden fixture must stay
  // diffable when it fails (a 2048² expected buffer is four million
  // pixels of unreadable diff), and JPEG decoding varies across
  // platforms and library versions, which would break bit-exactness for
  // reasons that have nothing to do with the dither maths.
  //
  // The crop was chosen by scanning the image for the 8×8 window with
  // the widest channel spread: all 64 pixels distinct, ranging 6–255.
  // A flat patch would have pinned almost nothing.
  const GOLDEN: DitherAlgorithm[] = ['atkinson', 'jarvis', 'ordered', 'blue-noise'];

  for (const algorithm of GOLDEN) {
    it(`${algorithm} matches its golden fixture bit-exactly (tolerance 0)`, () => {
      const input = loadGolden('m8-crop-8x8.input');
      const output = runPipeline(input, [
        stageInstance(ditherStage, params({ algorithm, strength: 1 } as Partial<DitherParams>)),
      ]);
      expectBufferMatch(output, loadGolden(`m8-${algorithm}-8x8.expected`), 0);
    });
  }

  it('the four fixtures are pairwise distinct', () => {
    // A fixture set where two methods agree would pin nothing about
    // either of them.
    const buffers = GOLDEN.map((a) => loadGolden(`m8-${a}-8x8.expected`));
    for (let i = 0; i < buffers.length; i++) {
      for (let j = i + 1; j < buffers.length; j++) {
        const a = buffers[i]?.data ?? new Uint8ClampedArray();
        const b = buffers[j]?.data ?? new Uint8ClampedArray();
        let differing = 0;
        for (let k = 0; k < a.length; k += 4) {
          if (a[k] !== b[k] || a[k + 1] !== b[k + 1] || a[k + 2] !== b[k + 2]) differing++;
        }
        expect({
          pair: `${String(GOLDEN[i])} vs ${String(GOLDEN[j])}`,
          differing: differing > 0,
        }).toEqual({ pair: `${String(GOLDEN[i])} vs ${String(GOLDEN[j])}`, differing: true });
      }
    }
  });

  it('every fixture pixel is a palette colour', () => {
    const allowed = new Set(TEST_PALETTE.entries.map((e) => e.rgb.join(',')));
    for (const algorithm of GOLDEN) {
      const { data } = loadGolden(`m8-${algorithm}-8x8.expected`);
      for (let i = 0; i < data.length; i += 4) {
        const key = `${String(data[i])},${String(data[i + 1])},${String(data[i + 2])}`;
        expect({ algorithm, key, member: allowed.has(key) }).toEqual({
          algorithm,
          key,
          member: true,
        });
      }
    }
  });
});
