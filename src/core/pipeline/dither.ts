/**
 * Floyd–Steinberg error-diffusion dither against the active palette.
 *
 * Error terms use exact arithmetic in a float working buffer (D6:
 * quantisation shortcuts are for the LUT path; diffusion quality
 * depends on exact errors), so palette matching here always uses the
 * exact path — never the LUT. Deterministic: same input + params →
 * same output, bit-exact; this is the reference future WASM backends
 * must match exactly.
 *
 * Kernel (raster order):        serpentine mirrors the row direction
 *        x    7/16               and the horizontal offsets on
 * 3/16  5/16  1/16               right-to-left rows.
 */

import { nearestIndexPruned, type CandidateTable } from '../color/candidates.ts';
import { nearestIndex } from '../color/lut.ts';
import type { ColorMetric } from '../color/metrics.ts';
import { paletteLab, paletteRgb } from '../palette.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer, type Stage } from '../types.ts';

/** Parameters for {@link ditherStage}; the UI + project-file shape. */
export interface DitherParams {
  palette: Palette;
  /** 'lab' (CIELAB ΔE76) or 'rgb' (Euclidean) — see metrics.ts. */
  metric: ColorMetric;
  /** Alternate row direction (reduces directional worm artefacts). */
  serpentine: boolean;
  /**
   * Seed for stochastic dither variants (conventions.md: randomised
   * algorithms take an explicit seed). Floyd–Steinberg is fully
   * deterministic, so the seed is carried in the params schema but
   * unused until a random/blue-noise variant ships (wish-list §8).
   */
  seed?: number;
  /**
   * Per-bin candidate table for this palette under the 'lab' metric
   * (M5-PERF-22). Purely a performance hint: the pruned scan returns
   * the identical index to the full scan, so output is unchanged
   * whether or not it is supplied. Callers that already hold one may
   * pass it to skip the per-frame rebuild — same contract as
   * `ReduceParams.lut`. Ignored under the 'rgb' metric.
   *
   * Derived data, never persisted: the project file stores the palette,
   * and the table is rebuilt from it on load.
   */
  candidates?: CandidateTable;
}

/**
 * Reusable float working buffer (M5-PERF-25).
 *
 * At 1024² this is 12 MB allocated and thrown away on **every frame** —
 * the largest single allocation in the engine, and the only one M5B
 * found worth reusing. Reuse does not weaken stage purity: the buffer
 * is stage-private scratch that never escapes (the stage's output is a
 * separate `Uint8ClampedArray`), and every element is written from the
 * source before it is read, so no value can survive from one call to
 * the next. Same input + params → same output still holds exactly.
 *
 * Single-threaded by construction: `ditherTs` is synchronous, so no two
 * calls can interleave, and each Worker gets its own module instance.
 */
let workBuffer = new Float32Array(0);

/**
 * A zeroed-length-`n` view of the shared work buffer, growing it when
 * needed. The returned view is exactly `n` long, so stale values past
 * `n` from a previous larger frame are unreachable.
 */
function workBufferFor(n: number): Float32Array {
  if (workBuffer.length < n) workBuffer = new Float32Array(n);
  return workBuffer.subarray(0, n);
}

/**
 * Release the shared work buffer (tests, and any future memory-pressure
 * handler). Purely an allocation concern — output is unaffected.
 */
export function releaseDitherWorkBuffer(): void {
  workBuffer = new Float32Array(0);
}

/** Diffuse `error * weight` into the working buffer at (x, y). */
function diffuse(
  work: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number,
  weight: number,
): void {
  if (x < 0 || x >= width || y >= height) return;
  const i = (y * width + x) * 3;
  work[i] = (work[i] ?? 0) + errR * weight;
  work[i + 1] = (work[i + 1] ?? 0) + errG * weight;
  work[i + 2] = (work[i + 2] ?? 0) + errB * weight;
}

/** Clamp a working value to displayable sRGB range. */
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function ditherTs(input: PixelBuffer, params: DitherParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  // Pre-filled with the empty sentinel so the cells the loop below
  // skips are reported as fabric rather than as palette entry 0
  // (M7-BRAND-01).
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const usesLab = params.metric === 'lab';
  const palLab = usesLab ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);
  // Pruning is a Lab-only structure (its exclusion proof rests on the
  // sRGB→Lab pipeline being monotone per channel), and it is optional
  // everywhere: without a table the full exact scan runs and produces
  // the same bytes.
  const table = usesLab ? (params.candidates ?? null) : null;

  // Float working copy of the RGB channels; alpha never diffuses. Every
  // element is written here before any is read, which is what makes
  // reusing the buffer across calls unobservable.
  const work = workBufferFor(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    work[p * 3] = src[p * 4] ?? 0;
    work[p * 3 + 1] = src[p * 4 + 1] ?? 0;
    work[p * 3 + 2] = src[p * 4 + 2] ?? 0;
  }

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    // Horizontal kernel offsets mirror with the scan direction.
    const ahead = xStep;

    for (let x = xStart; x !== xEnd; x += xStep) {
      const oi = (y * width + x) * 4;
      // A fully transparent cell is the "empty stitch" (D9) and carries
      // no colour: resize writes literal RGBA(0,0,0,0) for every grid
      // cell the source does not cover. Quantising it anyway matched
      // (0,0,0) to the nearest thread and diffused THAT error into the
      // real stitches beside it — so a `contain`/`fit` letterbox band
      // wrecked the dither of the artwork it framed. With a palette
      // holding no near-black the error is the full distance to the
      // darkest thread: 220-grey against a 200/255 palette dithered to
      // solid 200 across the whole visible area, mean level 200 instead
      // of 220, no dithering at all. Skipping the cell leaves it
      // transparent and stops error crossing the boundary in either
      // direction, so regions separated by empty cells dither
      // independently — which is what a gap in the artwork means.
      //
      // Deliberately `=== 0`, not the D9 `< 128` fabric threshold:
      // alpha 0 provably carries no colour, whereas a semi-transparent
      // cell has a real one, and whether it should take part is a
      // creative question (wish-list) rather than this defect.
      if ((src[oi + 3] ?? 255) === 0) continue; // out stays RGBA(0,0,0,0)

      const wi = (y * width + x) * 3;
      const r = clamp255(work[wi] ?? 0);
      const g = clamp255(work[wi + 1] ?? 0);
      const b = clamp255(work[wi + 2] ?? 0);

      const entry =
        table === null
          ? nearestIndex(r, g, b, params.metric, palRgb, palLab, labScratch)
          : nearestIndexPruned(r, g, b, palLab, labScratch, table);
      indices[y * width + x] = entry;
      const idx = entry * 3;
      const pr = palRgb[idx] ?? 0;
      const pg = palRgb[idx + 1] ?? 0;
      const pb = palRgb[idx + 2] ?? 0;

      out[oi] = pr;
      out[oi + 1] = pg;
      out[oi + 2] = pb;
      out[oi + 3] = src[oi + 3] ?? 255;

      const errR = r - pr;
      const errG = g - pg;
      const errB = b - pb;

      diffuse(work, width, height, x + ahead, y, errR, errG, errB, 7 / 16);
      diffuse(work, width, height, x - ahead, y + 1, errR, errG, errB, 3 / 16);
      diffuse(work, width, height, x, y + 1, errR, errG, errB, 5 / 16);
      diffuse(work, width, height, x + ahead, y + 1, errR, errG, errB, 1 / 16);
    }
  }

  return { width, height, data: out, indices };
}

/** The Floyd–Steinberg dither stage (TS reference; WASM post-profile). */
export const ditherStage: Stage<DitherParams> = {
  name: 'dither',
  backends: { ts: ditherTs },
};
