/**
 * Per-bin candidate pruning (M5-PERF-22) is an *exclusion*, not an
 * approximation: the pruned scan must return the byte-identical result
 * to the full exact scan for every input, ties included. This suite is
 * what makes that claim testable rather than argued.
 *
 * The argument it guards (see `candidates.ts`): for each 15-bit bin, an
 * entry is dropped only when some other entry is provably closer to
 * *every* point in the bin's conservative Lab bounding box. Two ways
 * that could be wrong — an unsound box (drops a possible winner) or a
 * candidate order that breaks the first-minimum tie-break — and both
 * show up as a differing index, so differential testing against the
 * reference matcher is the right shape of test.
 *
 * Adversarial by construction: bin-boundary values, fractional working
 * values (which is what dither actually feeds the matcher — integers
 * alone would never exercise the half-open bin range), near-ties, and
 * duplicate palette colours.
 */
import { describe, expect, it } from 'vitest';
import {
  buildCandidateTable,
  nearestIndexPruned,
} from '../src/core/color/candidates.ts';
import { LUT_SIZE, nearestIndex } from '../src/core/color/lut.ts';
import { deltaE76Sq, euclideanRgbSq } from '../src/core/color/metrics.ts';
import { srgbToLab } from '../src/core/color/convert.ts';
import { loadDmcPalette, paletteLab, paletteRgb } from '../src/core/palette.ts';
import {
  ditherStage,
  releaseDitherWorkBuffer,
  type DitherParams,
} from '../src/core/pipeline/dither.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { stageInstance } from '../src/core/types.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
function paletteOf(rgbs: [number, number, number][], name = 'test'): Palette {
  return {
    name,
    entries: rgbs.map((rgb, i) => ({
      code: `c${String(i)}`,
      name: `c${String(i)}`,
      hex: '#000000',
      rgb,
      manufacturer: 'test',
    })),
  };
}

/** Deterministic LCG — no ambient randomness in the suite. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A spread of palettes that stress different pruning geometries. */
const dmc = loadDmcPalette();

const dmc64 = paletteOf(
  dmc.entries.slice(0, 64).map((e) => [e.rgb[0], e.rgb[1], e.rgb[2]]),
  'dmc-64',
);

describe('candidate pruning — exactness against the full scan', () => {
  /**
   * The corpus the M5B audit used, regenerated here: every bin corner
   * and centre, plus fractional offsets that land inside the half-open
   * [8k, 8k+8) range a bin actually covers. 138k+ values per palette.
   */
  function adversarialValues(): number[][] {
    const out: number[][] = [];

    const rand = lcg(0xc0ffee);
    // Bin corners and interiors along the diagonal and off it.
    for (let bin = 0; bin < 32; bin++) {
      const lo = bin * 8;
      for (const off of [0, 0.5, 3.999, 4, 7.5, 7.999]) {
        const v = Math.min(lo + off, 255);
        out.push([v, v, v]);
        out.push([v, 255 - v, v / 2]);
        out.push([255 - v, v, 255 - v / 2]);
      }
    }
    // Every one of the 32,768 bins, sampled at its low corner and near
    // its open upper edge — the two places an unsound bounding box is
    // most likely to be caught.
    for (let key = 0; key < LUT_SIZE; key++) {
      const r = (key >> 10) * 8;

      const g = ((key >> 5) & 31) * 8;

      const b = (key & 31) * 8;
      out.push([r, g, b]);
      out.push([
        Math.min(r + 7.999, 255),
        Math.min(g + 4.25, 255),
        Math.min(b + 7.999, 255),
      ]);
    }
    // Random fractional values across the cube.
    for (let i = 0; i < 72000; i++) {
      out.push([rand() * 255, rand() * 255, rand() * 255]);
    }
    return out;
  }

  const corpus = adversarialValues();

  it('covers a large adversarial corpus (sanity on the corpus itself)', () => {
    expect(corpus.length).toBeGreaterThan(138_000);
  });

  for (const [label, palette] of [
    ['64-colour DMC slice', dmc64],
    ['533-colour DMC', dmc],
    // Duplicate colours make ties reachable: the reference keeps the
    // FIRST minimum, so a table that reordered candidates would differ.
    [
      'duplicates',
      paletteOf([
        [10, 20, 30],
        [200, 50, 50],
        [10, 20, 30],
        [200, 50, 50],
      ]),
    ],
    // Near-ties: two entries a hair apart straddling many bin boxes.
    [
      'near-ties',
      paletteOf([
        [128, 128, 128],
        [129, 128, 128],
        [0, 0, 0],
        [255, 255, 255],
      ]),
    ],
    ['single entry', paletteOf([[77, 88, 99]])],
  ] as const) {
    it(`returns the identical index to the full scan — ${label}`, () => {
      const table = buildCandidateTable(palette);

      const palRgb = paletteRgb(palette);

      const palLab = paletteLab(palette);

      const scratchA = new Float32Array(3);

      const scratchB = new Float32Array(3);
      let mismatches = 0;
      let firstBad = '';
      for (const [r, g, b] of corpus) {
        const expected = nearestIndex(
          r ?? 0,
          g ?? 0,
          b ?? 0,
          'lab',
          palRgb,
          palLab,
          scratchA,
        );

        const actual = nearestIndexPruned(
          r ?? 0,
          g ?? 0,
          b ?? 0,
          palLab,
          scratchB,
          table,
        );
        if (expected !== actual) {
          mismatches++;
          if (firstBad === '')
            firstBad = `(${String(r)},${String(g)},${String(b)}) expected ${String(
              expected,
            )} got ${String(actual)}`;
        }
      }
      expect(`${String(mismatches)} ${firstBad}`).toBe('0 ');
    });
  }

  it('keeps every bin non-empty and in ascending palette order', () => {
    const table = buildCandidateTable(dmc64);
    let empty = 0;
    let unordered = 0;
    for (let key = 0; key < LUT_SIZE; key++) {
      const from = table.offsets[key] ?? 0;

      const to = table.offsets[key + 1] ?? 0;
      if (to <= from) empty++;
      for (let k = from + 1; k < to; k++) {
        if ((table.candidates[k] ?? 0) <= (table.candidates[k - 1] ?? 0))
          unordered++;
      }
    }
    // A bin with no candidates would silently return index 0; ascending
    // order is what makes the first-minimum tie-break identical.
    expect({ empty, unordered }).toEqual({ empty: 0, unordered: 0 });
  });

  it('is deterministic — same palette builds the same table', () => {
    const a = buildCandidateTable(dmc64);

    const b = buildCandidateTable(dmc64);
    expect(Array.from(a.offsets)).toEqual(Array.from(b.offsets));
    expect(Array.from(a.candidates)).toEqual(Array.from(b.candidates));
  });

  it('prunes enough to be worth having', () => {
    // Not a timing assertion — a structural one. If the table stopped
    // pruning (an over-wide box, say) it would still be *correct* and
    // the exactness tests above would still pass, so the win needs its
    // own guard.
    const mean64 = buildCandidateTable(dmc64).candidates.length / LUT_SIZE;

    const mean533 = buildCandidateTable(dmc).candidates.length / LUT_SIZE;
    expect(mean64).toBeLessThan(64 / 2);
    expect(mean533).toBeLessThan(533 / 5);
  });
});

describe('candidate pruning — dither output is unchanged', () => {
  function params(overrides: Partial<DitherParams> = {}): DitherParams {
    return { palette: dmc64, metric: 'lab', serpentine: true, ...overrides };
  }

  function run(input: PixelBuffer, p: DitherParams): PixelBuffer {
    return runPipeline(input, [stageInstance(ditherStage, p)]);
  }

  /** Gradient + noise + hard edges + alpha, deterministically. */
  function mixedSource(
    width: number,
    height: number,
    seed: number,
  ): PixelBuffer {
    const rand = lcg(seed);

    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        const hardEdge = x > width / 2 ? 255 : 0;
        data[i] = (x / Math.max(1, width - 1)) * 255;
        data[i + 1] = rand() * 255;
        data[i + 2] = hardEdge;
        data[i + 3] = y % 7 === 0 ? 0 : y % 5 === 0 ? 128 : 255;
      }
    }
    return { width, height, data };
  }

  for (const [label, palette] of [
    ['64 colours', dmc64],
    ['533 colours', dmc],
  ] as const) {
    for (const serpentine of [true, false]) {
      it(`byte-identical with and without the table — ${label}, serpentine=${String(
        serpentine,
      )}`, () => {
        const source = mixedSource(37, 29, 0xbeef);

        const table = buildCandidateTable(palette);

        const plain = run(source, params({ palette, serpentine }));

        const pruned = run(
          source,
          params({ palette, serpentine, candidates: table }),
        );
        expect(Array.from(pruned.data)).toEqual(Array.from(plain.data));
      });
    }
  }

  it('byte-identical at the 1x1 boundary', () => {
    const source: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([9, 200, 30, 255]),
    };

    const table = buildCandidateTable(dmc64);
    expect(Array.from(run(source, params({ candidates: table })).data)).toEqual(
      Array.from(run(source, params()).data),
    );
  });

  it('ignores the table under the rgb metric (pruning is Lab-only)', () => {
    const source = mixedSource(16, 16, 0x1234);

    const table = buildCandidateTable(dmc64);

    const plain = run(source, params({ metric: 'rgb' }));

    const withTable = run(source, params({ metric: 'rgb', candidates: table }));
    expect(Array.from(withTable.data)).toEqual(Array.from(plain.data));
  });

  it('does not mutate its input', () => {
    const source = mixedSource(12, 12, 0x999);

    const before = Array.from(source.data);
    run(source, params({ candidates: buildCandidateTable(dmc64) }));
    expect(Array.from(source.data)).toEqual(before);
  });

  it('leaves alpha untouched', () => {
    const source = mixedSource(20, 20, 0x555);

    const out = run(source, params({ candidates: buildCandidateTable(dmc64) }));
    for (let p = 0; p < 20 * 20; p++) {
      expect(out.data[p * 4 + 3]).toBe(source.data[p * 4 + 3]);
    }
  });
});

describe('inlined metric copies in nearestIndex match metrics.ts', () => {
  /**
   * `nearestIndex` inlines both distance metrics to keep the query out
   * of a Float32Array across the palette loop (M5-PERF-22). That leaves
   * two statements of each metric in the tree, so this pins them
   * together: if `metrics.ts` changes and `lut.ts` does not, matching
   * silently diverges from the documented metric.
   */
  it('agrees with deltaE76Sq and euclideanRgbSq on the winning index', () => {
    const palette = dmc64;

    const palRgb = paletteRgb(palette);

    const palLab = paletteLab(palette);

    const scratch = new Float32Array(3);

    const query = new Float32Array(3);

    const rand = lcg(0xabcdef);
    for (let n = 0; n < 3000; n++) {
      const r = rand() * 255;

      const g = rand() * 255;

      const b = rand() * 255;
      for (const metric of ['lab', 'rgb'] as const) {
        let best = 0;
        let bestDist = Infinity;
        if (metric === 'lab') srgbToLab(r, g, b, query, 0);
        for (let i = 0; i < palette.entries.length; i++) {
          const d =
            metric === 'lab'
              ? deltaE76Sq(query, 0, palLab, i * 3)
              : euclideanRgbSq(
                  r,
                  g,
                  b,
                  palRgb[i * 3] ?? 0,
                  palRgb[i * 3 + 1] ?? 0,
                  palRgb[i * 3 + 2] ?? 0,
                );
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        expect(nearestIndex(r, g, b, metric, palRgb, palLab, scratch)).toBe(
          best,
        );
      }
    }
  });
});

describe('shared f32 work buffer is unobservable (M5-PERF-25)', () => {
  function run(
    input: PixelBuffer,
    overrides: Partial<DitherParams> = {},
  ): PixelBuffer {
    return runPipeline(input, [
      stageInstance(ditherStage, {
        palette: dmc64,
        metric: 'lab',
        serpentine: true,
        ...overrides,
      }),
    ]);
  }

  function field(width: number, height: number, level: number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = level;
      data[i * 4 + 1] = level;
      data[i * 4 + 2] = level;
      data[i * 4 + 3] = 255;
    }
    return { width, height, data };
  }

  /**
   * The failure mode reuse could introduce: a large frame leaves values
   * in the buffer, then a smaller frame reads them instead of its own.
   * Running big→small and comparing against the same small frame run on
   * a fresh buffer is what catches it — a small→small repeat would not.
   */
  it('a large frame cannot contaminate a following smaller one', () => {
    releaseDitherWorkBuffer();
    const small = field(9, 7, 200);
    const clean = run(small);

    releaseDitherWorkBuffer();
    run(field(64, 64, 30)); // dirty the buffer with very different values
    const afterLarge = run(small);

    expect(Array.from(afterLarge.data)).toEqual(Array.from(clean.data));
  });

  it('repeated runs are identical, with and without pruning', () => {
    releaseDitherWorkBuffer();
    const source = field(23, 19, 137);
    const table = buildCandidateTable(dmc64);
    const a = run(source);
    const b = run(source);
    const c = run(source, { candidates: table });
    expect(Array.from(b.data)).toEqual(Array.from(a.data));
    expect(Array.from(c.data)).toEqual(Array.from(a.data));
  });

  it('growing then shrinking the grid stays correct in both directions', () => {
    releaseDitherWorkBuffer();
    const sizes = [4, 40, 12, 61, 8];
    const expected = sizes.map((n) => {
      releaseDitherWorkBuffer();
      return Array.from(run(field(n, n, 90 + n)).data);
    });
    releaseDitherWorkBuffer();
    sizes.forEach((n, i) => {
      expect(Array.from(run(field(n, n, 90 + n)).data)).toEqual(expected[i]);
    });
  });
});
