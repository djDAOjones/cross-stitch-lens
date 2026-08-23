/**
 * CREATIVE-01 prototype — the colour ↔ tone weighted metric, and the
 * weighted count-limit selection.
 *
 * The slider t ∈ [0, 1] (0 = colour, 1 = tone) scales the a/b axes by
 * w = 1 − t, so the weighted distance
 *
 *     d² = ΔL² + w²·Δa² + w²·Δb²
 *
 * is plain Euclidean distance in the scaled space (L, w·a, w·b). At
 * t = 0 this is ΔE76 exactly; at t = 1 it is lightness alone — ladder
 * mode's metric. Matching, selection and weighted-space dither all
 * work in the same scaled space (slice-1 decision of record: the
 * metric carries the weight; the count-limit selection uses the same
 * weight as cell matching). A shipped build folds w into the LUT key
 * (D46) and into `selectThreads` itself; the prototype has no LUT —
 * exact scans only — and copies the greedy core below without locks
 * or the minimum-distance rule, which the shipped build keeps.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket.
 */

import { srgbToLab } from '../color/convert.ts';
import { paletteLab } from '../palette.ts';
import type { Palette, Thread } from '../types.ts';

/** a/b axis scale for tone amount `t` (clamped to [0, 1]). */
export function chromaScale(tone: number): number {
  return 1 - Math.min(1, Math.max(0, tone));
}

/** Palette Lab with the a/b axes pre-scaled by `w`. */
export function scaledPaletteLab(palette: Palette, w: number): Float32Array {
  const lab = paletteLab(palette).slice();
  for (let i = 0; i < lab.length; i += 3) {
    lab[i + 1] = (lab[i + 1] ?? 0) * w;
    lab[i + 2] = (lab[i + 2] ?? 0) * w;
  }
  return lab;
}

/**
 * Nearest palette index to a scaled-space query. First minimum wins,
 * matching `nearestIndex`'s tie-break so t = 0 agrees with production
 * matching exactly.
 */
export function nearestScaled(
  ql: number,
  qa: number,
  qb: number,
  palLabScaled: Float32Array,
): number {
  const count = palLabScaled.length / 3;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    const dl = ql - (palLabScaled[i * 3] ?? 0);
    const da = qa - (palLabScaled[i * 3 + 1] ?? 0);
    const db = qb - (palLabScaled[i * 3 + 2] ?? 0);
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** A weighted colour summary, structurally `ColorDistribution`'s core. */
export interface WeightedBins {
  /** Bin representative colours, Lab triples (unscaled). */
  lab: Float32Array;
  /** Stitches represented by each bin. */
  weight: Float32Array;
  /** Number of bins actually used. */
  count: number;
}

/**
 * Greedy forward selection in the scaled space — a prototype copy of
 * `selectThreads`' greedy core: minimise the weighted sum of squared
 * scaled distance from each bin to its nearest chosen thread, ties by
 * earliest index, result in `eligible` order. Deliberately the same
 * objective the mapper minimises, so the selector cannot optimise for
 * something the render then contradicts.
 */
export function selectWeighted(
  eligible: readonly Thread[],
  target: number,
  bins: WeightedBins,
  tone: number,
): Thread[] {
  const n = eligible.length;
  if (target >= n || bins.count === 0) return [...eligible];
  const w = chromaScale(tone);
  const nBins = bins.count;

  const binLab = new Float32Array(nBins * 3);
  for (let b = 0; b < nBins; b++) {
    binLab[b * 3] = bins.lab[b * 3] ?? 0;
    binLab[b * 3 + 1] = (bins.lab[b * 3 + 1] ?? 0) * w;
    binLab[b * 3 + 2] = (bins.lab[b * 3 + 2] ?? 0) * w;
  }

  const threadLab = new Float32Array(n * 3);
  const scratch = new Float32Array(3);
  for (let i = 0; i < n; i++) {
    const rgb = eligible[i]?.rgb ?? [0, 0, 0];
    srgbToLab(rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0, scratch, 0);
    threadLab[i * 3] = scratch[0] ?? 0;
    threadLab[i * 3 + 1] = (scratch[1] ?? 0) * w;
    threadLab[i * 3 + 2] = (scratch[2] ?? 0) * w;
  }

  const dist = new Float32Array(n * nBins);
  for (let i = 0; i < n; i++) {
    for (let b = 0; b < nBins; b++) {
      const dl = (threadLab[i * 3] ?? 0) - (binLab[b * 3] ?? 0);
      const da = (threadLab[i * 3 + 1] ?? 0) - (binLab[b * 3 + 1] ?? 0);
      const db = (threadLab[i * 3 + 2] ?? 0) - (binLab[b * 3 + 2] ?? 0);
      dist[i * nBins + b] = dl * dl + da * da + db * db;
    }
  }

  const bestSoFar = new Float32Array(nBins).fill(Infinity);
  const used = new Uint8Array(n);
  const chosen: number[] = [];
  while (chosen.length < target) {
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < n; i++) {
      if (used[i] === 1) continue;
      let score = 0;
      for (let b = 0; b < nBins; b++) {
        const d = dist[i * nBins + b] ?? Infinity;
        const cur = bestSoFar[b] ?? Infinity;
        score += (bins.weight[b] ?? 0) * (d < cur ? d : cur);
      }
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    used[bestIdx] = 1;
    chosen.push(bestIdx);
    for (let b = 0; b < nBins; b++) {
      const d = dist[bestIdx * nBins + b] ?? Infinity;
      if (d < (bestSoFar[b] ?? Infinity)) bestSoFar[b] = d;
    }
  }

  chosen.sort((a, b) => a - b);
  const picks: Thread[] = [];
  for (const i of chosen) {
    const t = eligible[i];
    if (t !== undefined) picks.push(t);
  }
  return picks;
}
