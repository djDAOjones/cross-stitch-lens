/**
 * Alternative-dither candidates for the M8-SPIKE-01 evaluation —
 * **prototypes, not shipping code**. Nothing here may be imported from
 * `src/`; the spike's findings decide which of these graduate into the
 * pipeline via M8-ALG-01.
 *
 * Three families are prototyped against the shipped Floyd–Steinberg
 * semantics (transparent-cell skip, serpentine mirroring, exact error
 * arithmetic, indices sidecar):
 *
 * - **Error diffusion** with alternative kernels: Atkinson,
 *   Jarvis–Judice–Ninke, Stucki, Sierra Lite. One generic loop,
 *   kernel as data, so the comparison isolates the kernel itself.
 * - **Ordered (Bayer)** threshold dithering: pointwise, no error
 *   feedback, deterministic per cell — the natural WebGPU shape.
 * - **Blue-noise** threshold dithering: same pointwise application but
 *   through a void-and-cluster threshold tile generated here with a
 *   fixed seed, so provenance is an algorithm + seed, not an asset of
 *   unknown origin.
 */

import { nearestIndex } from '../../../src/core/color/lut.ts';
import type { ColorMetric } from '../../../src/core/color/metrics.ts';
import { paletteLab, paletteRgb } from '../../../src/core/palette.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../../../src/core/types.ts';

/** Parameters shared by every candidate (mirrors `DitherParams`). */
export interface CandidateParams {
  palette: Palette;
  metric: ColorMetric;
  /** Diffusion only: alternate row direction. Ignored by threshold methods. */
  serpentine: boolean;
  /**
   * Diffusion: fraction of the quantisation error diffused (1 = full).
   * Threshold: amplitude scale of the threshold offset (1 = default).
   */
  strength: number;
}

/** Clamp a working value to displayable sRGB range (reference copy). */
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// ---------------------------------------------------------------------
// Error-diffusion kernels as data
// ---------------------------------------------------------------------

/** One diffusion tap: x/y offsets (rightward scan) and its weight numerator. */
export type KernelTap = readonly [dx: number, dy: number, num: number];

/** A named error-diffusion kernel. */
export interface DiffusionKernel {
  name: string;
  /** Weight denominator. Taps may sum below it (Atkinson sheds 2/8). */
  div: number;
  taps: readonly KernelTap[];
}

/** Floyd–Steinberg — the shipped kernel, here as the family baseline. */
export const FLOYD_STEINBERG: DiffusionKernel = {
  name: 'floyd-steinberg',
  div: 16,
  taps: [
    [1, 0, 7],
    [-1, 1, 3],
    [0, 1, 5],
    [1, 1, 1],
  ],
};

/**
 * Atkinson (Apple, 1980s): 6 taps of 1/8 — deliberately sheds 2/8 of
 * the error, which lightens shadows / darkens highlights but produces
 * a sparser, calmer texture.
 */
export const ATKINSON: DiffusionKernel = {
  name: 'atkinson',
  div: 8,
  taps: [
    [1, 0, 1],
    [2, 0, 1],
    [-1, 1, 1],
    [0, 1, 1],
    [1, 1, 1],
    [0, 2, 1],
  ],
};

/** Jarvis–Judice–Ninke (1976): 12 taps over three rows, /48. */
export const JARVIS: DiffusionKernel = {
  name: 'jarvis',
  div: 48,
  taps: [
    [1, 0, 7],
    [2, 0, 5],
    [-2, 1, 3],
    [-1, 1, 5],
    [0, 1, 7],
    [1, 1, 5],
    [2, 1, 3],
    [-2, 2, 1],
    [-1, 2, 3],
    [0, 2, 5],
    [1, 2, 3],
    [2, 2, 1],
  ],
};

/** Stucki (1981): JJN's shape with power-of-two-friendly weights, /42. */
export const STUCKI: DiffusionKernel = {
  name: 'stucki',
  div: 42,
  taps: [
    [1, 0, 8],
    [2, 0, 4],
    [-2, 1, 2],
    [-1, 1, 4],
    [0, 1, 8],
    [1, 1, 4],
    [2, 1, 2],
    [-2, 2, 1],
    [-1, 2, 2],
    [0, 2, 4],
    [1, 2, 2],
    [2, 2, 1],
  ],
};

/** Sierra Lite (two-row Sierra reduced to 3 taps, /4): the cheap variant. */
export const SIERRA_LITE: DiffusionKernel = {
  name: 'sierra-lite',
  div: 4,
  taps: [
    [1, 0, 2],
    [-1, 1, 1],
    [0, 1, 1],
  ],
};

/** Every kernel the spike compares, in evaluation order. */
export const KERNELS: readonly DiffusionKernel[] = [
  FLOYD_STEINBERG,
  ATKINSON,
  JARVIS,
  STUCKI,
  SIERRA_LITE,
];

/**
 * Generic error diffusion with the kernel as data. Semantics mirror
 * `src/core/pipeline/dither.ts` exactly: fully transparent cells are
 * skipped and diffuse nothing, serpentine mirrors the horizontal tap
 * offsets, matching always uses the exact path, and the palette-index
 * sidecar reports skipped cells as `EMPTY_INDEX`.
 */
export function diffuseWithKernel(
  input: PixelBuffer,
  params: CandidateParams,
  kernel: DiffusionKernel,
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const palLab = params.metric === 'lab' ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);

  const work = new Float32Array(width * height * 3);
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

    for (let x = xStart; x !== xEnd; x += xStep) {
      const oi = (y * width + x) * 4;
      if ((src[oi + 3] ?? 255) === 0) continue;

      const wi = (y * width + x) * 3;
      const r = clamp255(work[wi] ?? 0);
      const g = clamp255(work[wi + 1] ?? 0);
      const b = clamp255(work[wi + 2] ?? 0);

      const entry = nearestIndex(r, g, b, params.metric, palRgb, palLab, labScratch);
      indices[y * width + x] = entry;
      const idx = entry * 3;
      const pr = palRgb[idx] ?? 0;
      const pg = palRgb[idx + 1] ?? 0;
      const pb = palRgb[idx + 2] ?? 0;

      out[oi] = pr;
      out[oi + 1] = pg;
      out[oi + 2] = pb;
      out[oi + 3] = src[oi + 3] ?? 255;

      const errR = (r - pr) * params.strength;
      const errG = (g - pg) * params.strength;
      const errB = (b - pb) * params.strength;

      for (const [dx, dy, num] of kernel.taps) {
        const tx = x + dx * xStep;
        const ty = y + dy;
        if (tx < 0 || tx >= width || ty >= height) continue;
        const ti = (ty * width + tx) * 3;
        const w = num / kernel.div;
        work[ti] = (work[ti] ?? 0) + errR * w;
        work[ti + 1] = (work[ti + 1] ?? 0) + errG * w;
        work[ti + 2] = (work[ti + 2] ?? 0) + errB * w;
      }
    }
  }

  return { width, height, data: out, indices };
}

// ---------------------------------------------------------------------
// Threshold (pointwise) methods: ordered/Bayer and blue-noise
// ---------------------------------------------------------------------

/**
 * A threshold tile: `size × size` values in [0, 1), row-major,
 * tileable. `thresholds[y % size * size + x % size]` is the cell's
 * threshold rank.
 */
export interface ThresholdTile {
  name: string;
  size: number;
  thresholds: Float32Array;
}

/**
 * Bayer matrix of size 2^k via the classic recursive construction,
 * normalised to [0, 1).
 */
export function bayerTile(size: 2 | 4 | 8 | 16): ThresholdTile {
  let m = [[0, 2], [3, 1]];
  let n = 2;
  while (n < size) {
    const next: number[][] = [];
    for (let y = 0; y < n * 2; y++) next.push(new Array<number>(n * 2).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 4 * (m[y]?.[x] ?? 0);
        const row0 = next[y];
        const row1 = next[y + n];
        if (row0 !== undefined) {
          row0[x] = v;
          row0[x + n] = v + 2;
        }
        if (row1 !== undefined) {
          row1[x] = v + 3;
          row1[x + n] = v + 1;
        }
      }
    }
    m = next;
    n *= 2;
  }
  const thresholds = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      thresholds[y * size + x] = ((m[y]?.[x] ?? 0) + 0.5) / (size * size);
  return { name: `bayer-${String(size)}`, size, thresholds };
}

/** Deterministic LCG in [0, 1) — the tile generator's only randomness. */
function lcg01(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Void-and-cluster blue-noise tile (Ulichney 1993), toroidal Gaussian
 * energy, fixed seed — same seed, same bytes, on any machine. O(n⁴) in
 * the tile edge, so keep tiles ≤ 64; generation is a build-time cost,
 * never a per-frame one.
 */
export function blueNoiseTile(size: number, seed = 0x5eed): ThresholdTile {
  const n = size * size;
  const sigma = 1.5;
  const twoSigmaSq = 2 * sigma * sigma;

  // Precompute the toroidal Gaussian kernel once.
  const kernel = new Float32Array(n);
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const wx = Math.min(dx, size - dx);
      const wy = Math.min(dy, size - dy);
      kernel[dy * size + dx] = Math.exp(-(wx * wx + wy * wy) / twoSigmaSq);
    }
  }
  const energyAt = (energy: Float32Array, x: number, y: number, sign: number): void => {
    for (let ty = 0; ty < size; ty++) {
      const dy = (ty - y + size) % size;
      for (let tx = 0; tx < size; tx++) {
        const dx = (tx - x + size) % size;
        const i = ty * size + tx;
        energy[i] = (energy[i] ?? 0) + sign * (kernel[dy * size + dx] ?? 0);
      }
    }
  };

  // Initial pattern: 10% of cells on, placed by seeded LCG.
  const on = new Uint8Array(n);
  const rand = lcg01(seed);
  let count = 0;
  const target = Math.max(1, Math.floor(n / 10));
  while (count < target) {
    const i = Math.floor(rand() * n);
    if (on[i] === 0) {
      on[i] = 1;
      count++;
    }
  }
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++)
    if (on[i] === 1) energyAt(energy, i % size, Math.floor(i / size), 1);

  // Phase 0: relax the initial pattern — repeatedly move the tightest
  // cluster point into the largest void until they coincide.
  for (let guard = 0; guard < n; guard++) {
    let cluster = -1;
    let clusterE = -Infinity;
    let voidCell = -1;
    let voidE = Infinity;
    for (let i = 0; i < n; i++) {
      const e = energy[i] ?? 0;
      if (on[i] === 1 && e > clusterE) {
        clusterE = e;
        cluster = i;
      }
      if (on[i] === 0 && e < voidE) {
        voidE = e;
        voidCell = i;
      }
    }
    if (cluster < 0 || voidCell < 0) break;
    on[cluster] = 0;
    energyAt(energy, cluster % size, Math.floor(cluster / size), -1);
    // If removing the cluster point makes its own site the largest void,
    // the pattern is settled.
    let newVoid = -1;
    let newVoidE = Infinity;
    for (let i = 0; i < n; i++) {
      if (on[i] === 0 && (energy[i] ?? 0) < newVoidE) {
        newVoidE = energy[i] ?? 0;
        newVoid = i;
      }
    }
    if (newVoid === cluster) {
      on[cluster] = 1;
      energyAt(energy, cluster % size, Math.floor(cluster / size), 1);
      break;
    }
    on[newVoid] = 1;
    energyAt(energy, newVoid % size, Math.floor(newVoid / size), 1);
  }

  const rank = new Int32Array(n).fill(-1);

  // Phase 1: rank the initial points by removing the tightest cluster.
  const phase1 = new Uint8Array(on);
  const e1 = new Float32Array(energy);
  let ones = 0;
  for (let i = 0; i < n; i++) if (phase1[i] === 1) ones++;
  for (let r = ones - 1; r >= 0; r--) {
    let cluster = -1;
    let clusterE = -Infinity;
    for (let i = 0; i < n; i++) {
      if (phase1[i] === 1 && (e1[i] ?? 0) > clusterE) {
        clusterE = e1[i] ?? 0;
        cluster = i;
      }
    }
    if (cluster < 0) break;
    phase1[cluster] = 0;
    energyAt(e1, cluster % size, Math.floor(cluster / size), -1);
    rank[cluster] = r;
  }

  // Phase 2: rank the remaining cells by filling the largest void.
  const phase2 = new Uint8Array(on);
  const e2 = new Float32Array(energy);
  for (let r = ones; r < n; r++) {
    let voidCell = -1;
    let voidE = Infinity;
    for (let i = 0; i < n; i++) {
      if (phase2[i] === 0 && (e2[i] ?? 0) < voidE) {
        voidE = e2[i] ?? 0;
        voidCell = i;
      }
    }
    if (voidCell < 0) break;
    phase2[voidCell] = 1;
    energyAt(e2, voidCell % size, Math.floor(voidCell / size), 1);
    rank[voidCell] = r;
  }

  const thresholds = new Float32Array(n);
  for (let i = 0; i < n; i++) thresholds[i] = ((rank[i] ?? 0) + 0.5) / n;
  return { name: `blue-noise-${String(size)}`, size, thresholds };
}

/**
 * Default threshold amplitude in 8-bit channel units at `strength: 1`.
 * Ordered dithering against a *non-uniform* palette has no exact
 * per-cell quantisation step to scale by; a fixed amplitude around the
 * typical inter-thread spacing keeps the method deterministic and
 * palette-independent, and `strength` scales it linearly.
 */
export const THRESHOLD_AMPLITUDE = 48;

/**
 * Pointwise threshold dither: add a signed, tile-driven offset to every
 * channel, then match exactly. No error feedback — each cell depends
 * only on its own value and coordinates, which is what makes the family
 * embarrassingly parallel (WebGPU-shaped) and immune to worm artefacts.
 */
export function thresholdDither(
  input: PixelBuffer,
  params: CandidateParams,
  tile: ThresholdTile,
): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const palLab = params.metric === 'lab' ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);
  const amplitude = THRESHOLD_AMPLITUDE * params.strength;

  for (let y = 0; y < height; y++) {
    const rowBase = (y % tile.size) * tile.size;
    for (let x = 0; x < width; x++) {
      const oi = (y * width + x) * 4;
      if ((src[oi + 3] ?? 255) === 0) continue;

      const t = ((tile.thresholds[rowBase + (x % tile.size)] ?? 0.5) - 0.5) * amplitude;
      const r = clamp255((src[oi] ?? 0) + t);
      const g = clamp255((src[oi + 1] ?? 0) + t);
      const b = clamp255((src[oi + 2] ?? 0) + t);

      const entry = nearestIndex(r, g, b, params.metric, palRgb, palLab, labScratch);
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

/** Plain nearest-colour reduction — the mandatory no-dither control. */
export function noDither(input: PixelBuffer, params: CandidateParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const indices = new Uint16Array(width * height).fill(EMPTY_INDEX);
  const palRgb = paletteRgb(params.palette);
  const palLab = params.metric === 'lab' ? paletteLab(params.palette) : new Float32Array(0);
  const labScratch = new Float32Array(3);

  for (let p = 0; p < width * height; p++) {
    const oi = p * 4;
    if ((src[oi + 3] ?? 255) === 0) continue;
    const entry = nearestIndex(
      src[oi] ?? 0,
      src[oi + 1] ?? 0,
      src[oi + 2] ?? 0,
      params.metric,
      palRgb,
      palLab,
      labScratch,
    );
    indices[p] = entry;
    const idx = entry * 3;
    out[oi] = palRgb[idx] ?? 0;
    out[oi + 1] = palRgb[idx + 1] ?? 0;
    out[oi + 2] = palRgb[idx + 2] ?? 0;
    out[oi + 3] = src[oi + 3] ?? 255;
  }
  return { width, height, data: out, indices };
}

// ---------------------------------------------------------------------
// Candidate registry
// ---------------------------------------------------------------------

/** One evaluable candidate: a name and a pure run function. */
export interface Candidate {
  name: string;
  family: 'control' | 'diffusion' | 'ordered' | 'blue-noise';
  run: (input: PixelBuffer, params: CandidateParams) => PixelBuffer;
}

/** Every candidate the spike evaluates, in report order. */
export function allCandidates(): Candidate[] {
  const bayer4 = bayerTile(4);
  const bayer8 = bayerTile(8);
  const blue = blueNoiseTile(32);
  return [
    { name: 'none', family: 'control', run: noDither },
    ...KERNELS.map(
      (kernel): Candidate => ({
        name: kernel.name,
        family: 'diffusion',
        run: (input, params) => diffuseWithKernel(input, params, kernel),
      }),
    ),
    {
      name: bayer4.name,
      family: 'ordered',
      run: (input, params) => thresholdDither(input, params, bayer4),
    },
    {
      name: bayer8.name,
      family: 'ordered',
      run: (input, params) => thresholdDither(input, params, bayer8),
    },
    {
      name: blue.name,
      family: 'blue-noise',
      run: (input, params) => thresholdDither(input, params, blue),
    },
  ];
}
