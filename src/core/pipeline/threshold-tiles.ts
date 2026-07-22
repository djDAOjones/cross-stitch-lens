/**
 * Threshold tiles for the pointwise dither family (M8-ALG-01).
 *
 * A tile is `size × size` threshold ranks in [0, 1), row-major and
 * toroidal: cell (x, y) reads `thresholds[(y % size) * size + (x % size)]`.
 * Both tiles are pure deterministic data — same bytes on every machine,
 * every run — which is what lets threshold dithering stay bit-exact
 * across backends and sessions. Nothing stochastic ships (D61): the
 * "noise" in blue-noise is a fixed, seeded generation, not runtime
 * randomness.
 */

/** A tileable threshold matrix; values in [0, 1), row-major. */
export interface ThresholdTile {
  /** Edge length in cells. */
  size: number;
  /** `size * size` ranks; `(rank + 0.5) / (size * size)` normalisation. */
  thresholds: Float32Array;
}

/**
 * Bayer matrix of edge 2^k via the classic recursive construction
 * (Bayer 1973), normalised to [0, 1). The shipped ordered method uses
 * the 8×8 (64-level) matrix: M8-SPIKE-01 measured 4×4 and 8×8 as
 * indistinguishable at stitch scale, so matrix size is fixed data, not
 * a control (D61).
 */
export function bayerTile(size: 2 | 4 | 8 | 16): ThresholdTile {
  let m = [
    [0, 2],
    [3, 1],
  ];
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
  return { size, thresholds };
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
 * Blue-noise threshold tile via void-and-cluster (Ulichney 1993) with
 * a toroidal Gaussian energy (σ = 1.5) and a fixed LCG seed. Provenance
 * is therefore an algorithm plus a seed — reviewable and regenerable —
 * rather than an imported asset. Generation is O(size⁴); at the shipped
 * 32×32 that is ~1 M kernel adds, a one-off well under a frame budget,
 * memoised by {@link blueNoise32}.
 */
export function blueNoiseTile(size: number, seed: number): ThresholdTile {
  const n = size * size;
  const sigma = 1.5;
  const twoSigmaSq = 2 * sigma * sigma;

  const kernel = new Float32Array(n);
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const wx = Math.min(dx, size - dx);
      const wy = Math.min(dy, size - dy);
      kernel[dy * size + dx] = Math.exp(-(wx * wx + wy * wy) / twoSigmaSq);
    }
  }
  const splat = (energy: Float32Array, x: number, y: number, sign: number): void => {
    for (let ty = 0; ty < size; ty++) {
      const dy = (ty - y + size) % size;
      for (let tx = 0; tx < size; tx++) {
        const dx = (tx - x + size) % size;
        const i = ty * size + tx;
        energy[i] = (energy[i] ?? 0) + sign * (kernel[dy * size + dx] ?? 0);
      }
    }
  };

  // Initial pattern: 10% of cells on, placed by the seeded LCG.
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
  for (let i = 0; i < n; i++) if (on[i] === 1) splat(energy, i % size, Math.floor(i / size), 1);

  // Relax: move the tightest cluster into the largest void until the
  // removal site is itself the largest void (the pattern is settled).
  for (let guard = 0; guard < n; guard++) {
    let cluster = -1;
    let clusterE = -Infinity;
    for (let i = 0; i < n; i++) {
      if (on[i] === 1 && (energy[i] ?? 0) > clusterE) {
        clusterE = energy[i] ?? 0;
        cluster = i;
      }
    }
    if (cluster < 0) break;
    on[cluster] = 0;
    splat(energy, cluster % size, Math.floor(cluster / size), -1);
    let voidCell = -1;
    let voidE = Infinity;
    for (let i = 0; i < n; i++) {
      if (on[i] === 0 && (energy[i] ?? 0) < voidE) {
        voidE = energy[i] ?? 0;
        voidCell = i;
      }
    }
    if (voidCell === cluster || voidCell < 0) {
      on[cluster] = 1;
      splat(energy, cluster % size, Math.floor(cluster / size), 1);
      break;
    }
    on[voidCell] = 1;
    splat(energy, voidCell % size, Math.floor(voidCell / size), 1);
  }

  const rank = new Int32Array(n).fill(-1);

  // Phase 1: rank the initial points by repeatedly removing the
  // tightest cluster, assigning ranks downward.
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
    splat(e1, cluster % size, Math.floor(cluster / size), -1);
    rank[cluster] = r;
  }

  // Phase 2: rank the remaining cells by repeatedly filling the
  // largest void, assigning ranks upward.
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
    splat(e2, voidCell % size, Math.floor(voidCell / size), 1);
    rank[voidCell] = r;
  }

  const thresholds = new Float32Array(n);
  for (let i = 0; i < n; i++) thresholds[i] = ((rank[i] ?? 0) + 0.5) / n;
  return { size, thresholds };
}

/** The shipped blue-noise seed. Changing it changes rendered output. */
export const BLUE_NOISE_SEED = 0x5eed;

let bayer8Cache: ThresholdTile | null = null;
let blueNoiseCache: ThresholdTile | null = null;

/** The shipped ordered tile (Bayer 8×8), memoised. */
export function bayer8(): ThresholdTile {
  bayer8Cache ??= bayerTile(8);
  return bayer8Cache;
}

/** The shipped blue-noise tile (32×32, seed {@link BLUE_NOISE_SEED}), memoised. */
export function blueNoise32(): ThresholdTile {
  blueNoiseCache ??= blueNoiseTile(32, BLUE_NOISE_SEED);
  return blueNoiseCache;
}
