/**
 * Palette dithering against the active palette — two deterministic
 * families behind one stage (M8-ALG-01, D61):
 *
 * - **Error diffusion** (Floyd–Steinberg, Atkinson, Jarvis–Judice–
 *   Ninke): kernels as data over one scan loop. Error terms use exact
 *   arithmetic in a float working buffer (D6: quantisation shortcuts
 *   are for the LUT path; diffusion quality depends on exact errors),
 *   so palette matching here always uses the exact path — never the
 *   LUT. Serpentine mirrors the row direction and the horizontal
 *   kernel offsets on right-to-left rows.
 * - **Threshold** (ordered/Bayer 8×8, blue-noise 32×32): a signed,
 *   tile-driven offset added to every channel before an exact match.
 *   Pointwise — no error feedback — so flat and near-palette content
 *   is left almost untouched and no directional artefacts exist.
 *
 * Deterministic: same input + params → same output, bit-exact; this is
 * the reference any accelerated backend must match exactly. With the
 * default params (`floyd-steinberg`, strength 1) the output is
 * byte-identical to the pre-M8 stage — the golden suite pins that.
 *
 * Floyd–Steinberg kernel (raster order):
 *        x    7/16
 * 3/16  5/16  1/16
 */

import { nearestIndexPruned, type CandidateTable } from '../color/candidates.ts';
import { nearestIndex } from '../color/lut.ts';
import type { ColorMetric } from '../color/metrics.ts';
import {
  createToneMatcher,
  toneEngaged,
  toneNearestScaled,
  toneQuery,
  type ToneConfig,
  type ToneMatcher,
} from '../color/tone.ts';
import { paletteLab, paletteRgb } from '../palette.ts';
import { bayer8, blueNoise32, type ThresholdTile } from './threshold-tiles.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer, type Stage } from '../types.ts';

/** Diffusion methods shipped by M8 (D61). */
export type DiffusionAlgorithm = 'floyd-steinberg' | 'atkinson' | 'jarvis';

/** Threshold methods shipped by M8 (D61). */
export type ThresholdAlgorithm = 'ordered' | 'blue-noise';

/** Every dithering method the stage can run. */
export type DitherAlgorithm = DiffusionAlgorithm | ThresholdAlgorithm;

/**
 * Default threshold amplitude in 8-bit channel units at `strength: 1`.
 * Ordered dithering against a non-uniform thread palette has no exact
 * per-cell quantisation step to scale by; a fixed base amplitude near
 * the typical inter-thread spacing keeps the method deterministic and
 * palette-independent, with `strength` (0–2) scaling it linearly —
 * tiny palettes need more than 1 to bridge their wider gaps (D61).
 */
export const THRESHOLD_BASE_AMPLITUDE = 48;

/** Parameters for {@link ditherStage}; the UI + project-file shape. */
export interface DitherParams {
  palette: Palette;
  /** 'lab' (CIELAB ΔE76) or 'rgb' (Euclidean) — see metrics.ts. */
  metric: ColorMetric;
  /**
   * Method to run. Optional with a 'floyd-steinberg' default so every
   * pre-M8 caller (and the wasm adapter contract) keeps its exact
   * meaning; the config layer always sets it explicitly.
   */
  algorithm?: DitherAlgorithm;
  /**
   * Diffusion: fraction of the quantisation error diffused, 0–1.
   * Threshold: scale over {@link THRESHOLD_BASE_AMPLITUDE}, 0–2.
   * Default 1 — at which Floyd–Steinberg is byte-identical to the
   * pre-M8 stage (`e * 1 === e` exactly in IEEE 754).
   */
  strength?: number;
  /**
   * Alternate row direction (reduces directional worm artefacts).
   * Meaningful for diffusion algorithms only; threshold methods have
   * no scan direction and ignore it.
   */
  serpentine: boolean;
  /**
   * Seed for stochastic dither variants (conventions.md: randomised
   * algorithms take an explicit seed). Every shipped method is fully
   * deterministic — the blue-noise tile is fixed data — so the seed is
   * carried in the params schema but unused (D61: nothing stochastic
   * ships).
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
  /**
   * Tone mode (TONE-01). When engaged, the whole stage moves into the
   * tone space (curved L, w·a, w·b): matching runs there AND the error
   * diffuses there — the D200 build must. The prototype measured what
   * reusing this stage's sRGB error terms under a weighted match does:
   * hue error read back as lightness, 6.9 vs 2.3 L* column spread on
   * the hue-sweep fixture. The `candidates` table is a plain-Lab
   * structure and is ignored when tone is engaged. Absent or
   * disengaged, the stage is byte-identical to its pre-TONE-01 self.
   */
  tone?: ToneConfig;
}

/** One diffusion tap: x/y offsets (rightward scan) and its weight. */
type KernelTap = readonly [dx: number, dy: number, weight: number];

/**
 * Diffusion kernels as data. Tap order preserves the pre-M8 unrolled
 * Floyd–Steinberg sequence; weights are exact IEEE dyadic-rational
 * quotients evaluated once at module load. Atkinson's taps sum to 6/8
 * by design — it sheds a quarter of the error, trading tonal accuracy
 * at the extremes for a sparser, calmer texture (D61).
 */
const KERNELS: Record<DiffusionAlgorithm, readonly KernelTap[]> = {
  'floyd-steinberg': [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16],
  ],
  atkinson: [
    [1, 0, 1 / 8],
    [2, 0, 1 / 8],
    [-1, 1, 1 / 8],
    [0, 1, 1 / 8],
    [1, 1, 1 / 8],
    [0, 2, 1 / 8],
  ],
  jarvis: [
    [1, 0, 7 / 48],
    [2, 0, 5 / 48],
    [-2, 1, 3 / 48],
    [-1, 1, 5 / 48],
    [0, 1, 7 / 48],
    [1, 1, 5 / 48],
    [2, 1, 3 / 48],
    [-2, 2, 1 / 48],
    [-1, 2, 3 / 48],
    [0, 2, 5 / 48],
    [1, 2, 3 / 48],
    [2, 2, 1 / 48],
  ],
};

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

/** Clamp a working value to displayable sRGB range. */
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * A kernel flattened into parallel typed arrays, one per scan
 * direction, so the per-pixel tap loop reads typed-array slots instead
 * of destructuring tuple objects. The tuple form of {@link KERNELS} is
 * the readable source of truth; this is its hot-loop shape, computed
 * once per algorithm at first use. Without it the generic loop cost
 * 2.3× the pre-M8 unrolled Floyd–Steinberg on the benchmark's 1024²
 * budget row (M8-ALG-01); with it the row is back inside tolerance.
 */
interface FlatKernel {
  count: number;
  /** Horizontal offsets for a rightward scan, and their mirror. */
  dxRight: Int32Array;
  dxLeft: Int32Array;
  dy: Int32Array;
  weight: Float64Array;
}

const flatKernels = new Map<DiffusionAlgorithm, FlatKernel>();

function flatKernel(algorithm: DiffusionAlgorithm): FlatKernel {
  const cached = flatKernels.get(algorithm);
  if (cached !== undefined) return cached;
  const taps = KERNELS[algorithm];
  const flat: FlatKernel = {
    count: taps.length,
    dxRight: new Int32Array(taps.map(([dx]) => dx)),
    dxLeft: new Int32Array(taps.map(([dx]) => -dx)),
    dy: new Int32Array(taps.map(([, dy]) => dy)),
    weight: new Float64Array(taps.map(([, , w]) => w)),
  };
  flatKernels.set(algorithm, flat);
  return flat;
}

/** The error-diffusion family: one scan loop, kernel as data. */
function diffuseTs(
  input: PixelBuffer,
  params: DitherParams,
  kernel: FlatKernel,
  strength: number,
): PixelBuffer {
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

  const tapCount = kernel.count;
  const tapDy = kernel.dy;
  const tapWeight = kernel.weight;

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    // Horizontal kernel offsets mirror with the scan direction.
    const tapDx = rightward ? kernel.dxRight : kernel.dxLeft;

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

      // Strength scales the diffused error; at the default 1 the
      // multiplication is an exact IEEE identity, preserving pre-M8
      // Floyd–Steinberg output byte-for-byte.
      const errR = (r - pr) * strength;
      const errG = (g - pg) * strength;
      const errB = (b - pb) * strength;

      for (let t = 0; t < tapCount; t++) {
        const tx = x + (tapDx[t] ?? 0);
        const ty = y + (tapDy[t] ?? 0);
        if (tx < 0 || tx >= width || ty >= height) continue;
        const weight = tapWeight[t] ?? 0;
        const ti = (ty * width + tx) * 3;
        work[ti] = (work[ti] ?? 0) + errR * weight;
        work[ti + 1] = (work[ti + 1] ?? 0) + errG * weight;
        work[ti + 2] = (work[ti + 2] ?? 0) + errB * weight;
      }
    }
  }

  return { width, height, data: out, indices };
}

/**
 * The threshold family: add a signed tile offset to every channel,
 * then match exactly. Each cell depends only on its own value and
 * coordinates — no error feedback — so the empty-stitch rule needs no
 * boundary handling: a skipped cell influences nothing.
 */
function thresholdTs(
  input: PixelBuffer,
  params: DitherParams,
  tile: ThresholdTile,
  strength: number,
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const usesLab = params.metric === 'lab';
  const palLab = usesLab ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);
  const table = usesLab ? (params.candidates ?? null) : null;
  const amplitude = THRESHOLD_BASE_AMPLITUDE * strength;

  for (let y = 0; y < height; y++) {
    const rowBase = (y % tile.size) * tile.size;
    for (let x = 0; x < width; x++) {
      const oi = (y * width + x) * 4;
      // Same empty-stitch contract as diffusion (D9/D49).
      if ((src[oi + 3] ?? 255) === 0) continue;

      const t = ((tile.thresholds[rowBase + (x % tile.size)] ?? 0.5) - 0.5) * amplitude;
      const r = clamp255((src[oi] ?? 0) + t);
      const g = clamp255((src[oi + 1] ?? 0) + t);
      const b = clamp255((src[oi + 2] ?? 0) + t);

      const entry =
        table === null
          ? nearestIndex(r, g, b, params.metric, palRgb, palLab, labScratch)
          : nearestIndexPruned(r, g, b, palLab, labScratch, table);
      indices[y * width + x] = entry;
      const idx = entry * 3;
      out[oi] = palRgb[idx] ?? 0;
      out[oi + 1] = palRgb[idx + 1] ?? 0;
      out[oi + 2] = palRgb[idx + 2] ?? 0;
      out[oi + 3] = src[oi + 3] ?? 255;
    }
  }

  return { width, height, data: out, indices };
}

/**
 * The error-diffusion family in the tone space (TONE-01): the working
 * buffer holds (curved L, w·a, w·b) per cell, matching runs over the
 * scaled palette (or the ladder's bands), and the diffused error is
 * the difference *in that space* — at the end-stop (w = 0) only
 * lightness error feeds back, which is what stops hue error leaking
 * into tone (the prototype's central measurement). The kernel-as-data
 * loop, serpentine mirroring, empty-stitch skip (D9/D49) and the
 * shared work buffer all carry over from {@link diffuseTs} unchanged;
 * the curve applies once to each source value, never to a diffused
 * perturbation, and palette L is never curved.
 *
 * Clamps mirror the sRGB path's `clamp255`: L to [0, 100], a/b to
 * ±128·w — the working values the matcher reads stay inside the space
 * the palette occupies while the buffer itself keeps the unclamped
 * running error, exactly as the sRGB path does.
 */
function diffuseToneTs(
  input: PixelBuffer,
  params: DitherParams,
  kernel: FlatKernel,
  strength: number,
  tone: ToneConfig,
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const matcher = createToneMatcher(params.palette, tone);
  const palLab = matcher.palLab;
  const labScratch = new Float32Array(3);
  const abClamp = 128 * matcher.w;

  // Tone-space working copy: every element written before any is
  // read, so reusing the shared buffer stays unobservable (M5-PERF-25).
  const work = workBufferFor(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    toneQuery(
      matcher,
      src[p * 4] ?? 0,
      src[p * 4 + 1] ?? 0,
      src[p * 4 + 2] ?? 0,
      labScratch,
    );
    work[p * 3] = labScratch[0] ?? 0;
    work[p * 3 + 1] = labScratch[1] ?? 0;
    work[p * 3 + 2] = labScratch[2] ?? 0;
  }

  const tapCount = kernel.count;
  const tapDy = kernel.dy;
  const tapWeight = kernel.weight;

  for (let y = 0; y < height; y++) {
    const rightward = !params.serpentine || y % 2 === 0;
    const xStart = rightward ? 0 : width - 1;
    const xEnd = rightward ? width : -1;
    const xStep = rightward ? 1 : -1;
    const tapDx = rightward ? kernel.dxRight : kernel.dxLeft;

    for (let x = xStart; x !== xEnd; x += xStep) {
      const oi = (y * width + x) * 4;
      // Same empty-stitch contract as the sRGB path (D9/D49): no error
      // crosses an empty-cell boundary in either direction.
      if ((src[oi + 3] ?? 255) === 0) continue;

      const wi = (y * width + x) * 3;
      const rawL = work[wi] ?? 0;
      const rawA = work[wi + 1] ?? 0;
      const rawB = work[wi + 2] ?? 0;
      const ql = rawL < 0 ? 0 : rawL > 100 ? 100 : rawL;
      const qa = rawA < -abClamp ? -abClamp : rawA > abClamp ? abClamp : rawA;
      const qb = rawB < -abClamp ? -abClamp : rawB > abClamp ? abClamp : rawB;

      const entry = toneNearestScaled(matcher, ql, qa, qb);
      indices[y * width + x] = entry;
      const idx = entry * 3;
      out[oi] = palRgb[idx] ?? 0;
      out[oi + 1] = palRgb[idx + 1] ?? 0;
      out[oi + 2] = palRgb[idx + 2] ?? 0;
      out[oi + 3] = src[oi + 3] ?? 255;

      const errL = (ql - (palLab[idx] ?? 0)) * strength;
      const errA = (qa - (palLab[idx + 1] ?? 0)) * strength;
      const errB = (qb - (palLab[idx + 2] ?? 0)) * strength;

      for (let t = 0; t < tapCount; t++) {
        const tx = x + (tapDx[t] ?? 0);
        const ty = y + (tapDy[t] ?? 0);
        if (tx < 0 || tx >= width || ty >= height) continue;
        const weight = tapWeight[t] ?? 0;
        const ti = (ty * width + tx) * 3;
        work[ti] = (work[ti] ?? 0) + errL * weight;
        work[ti + 1] = (work[ti + 1] ?? 0) + errA * weight;
        work[ti + 2] = (work[ti + 2] ?? 0) + errB * weight;
      }
    }
  }

  return { width, height, data: out, indices };
}

/**
 * Threshold base amplitude translated into L* units. The sRGB path
 * adds one signed offset to all three channels, which is in effect a
 * lightness perturbation; the tone-space analogue perturbs curved L
 * alone, scaled by 100/255 so `strength` means the same visual
 * magnitude in both spaces. (The prototype measured diffusion only —
 * the kernel question is orthogonal, D200 — so this scaling is the
 * stated working assumption for the threshold family.)
 */
const THRESHOLD_TONE_SCALE = 100 / 255;

/**
 * The threshold family in the tone space: offset curved L by the tile,
 * match over the scaled palette (or bands). Pointwise, no feedback —
 * the empty-stitch rule needs no boundary handling.
 */
function thresholdToneTs(
  input: PixelBuffer,
  params: DitherParams,
  tile: ThresholdTile,
  strength: number,
  tone: ToneConfig,
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const matcher: ToneMatcher = createToneMatcher(params.palette, tone);
  const labScratch = new Float32Array(3);
  const amplitude = THRESHOLD_BASE_AMPLITUDE * strength * THRESHOLD_TONE_SCALE;

  for (let y = 0; y < height; y++) {
    const rowBase = (y % tile.size) * tile.size;
    for (let x = 0; x < width; x++) {
      const oi = (y * width + x) * 4;
      if ((src[oi + 3] ?? 255) === 0) continue;

      toneQuery(matcher, src[oi] ?? 0, src[oi + 1] ?? 0, src[oi + 2] ?? 0, labScratch);
      const t = ((tile.thresholds[rowBase + (x % tile.size)] ?? 0.5) - 0.5) * amplitude;
      const shifted = (labScratch[0] ?? 0) + t;
      const ql = shifted < 0 ? 0 : shifted > 100 ? 100 : shifted;

      const entry = toneNearestScaled(matcher, ql, labScratch[1] ?? 0, labScratch[2] ?? 0);
      indices[y * width + x] = entry;
      const idx = entry * 3;
      out[oi] = palRgb[idx] ?? 0;
      out[oi + 1] = palRgb[idx + 1] ?? 0;
      out[oi + 2] = palRgb[idx + 2] ?? 0;
      out[oi + 3] = src[oi + 3] ?? 255;
    }
  }

  return { width, height, data: out, indices };
}

function ditherTs(input: PixelBuffer, params: DitherParams): PixelBuffer {
  const algorithm = params.algorithm ?? 'floyd-steinberg';
  const strength = params.strength ?? 1;
  const tone = toneEngaged(params.metric, params.tone) ? params.tone : undefined;
  if (tone !== undefined) {
    if (algorithm === 'ordered') {
      return thresholdToneTs(input, params, bayer8(), strength, tone);
    }
    if (algorithm === 'blue-noise') {
      return thresholdToneTs(input, params, blueNoise32(), strength, tone);
    }
    return diffuseToneTs(input, params, flatKernel(algorithm), strength, tone);
  }
  if (algorithm === 'ordered') return thresholdTs(input, params, bayer8(), strength);
  if (algorithm === 'blue-noise') return thresholdTs(input, params, blueNoise32(), strength);
  return diffuseTs(input, params, flatKernel(algorithm), strength);
}

/** The dither stage (TS reference; WASM covers Floyd–Steinberg only). */
export const ditherStage: Stage<DitherParams> = {
  name: 'dither',
  backends: { ts: ditherTs },
};
