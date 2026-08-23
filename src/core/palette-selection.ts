/**
 * Count-constrained palette selection (M7-COUNT-01) with guaranteed
 * Must-use seats and a minimum perceptual distance rule
 * (M15-CORE-03).
 *
 * This is **constrained quantisation over a fixed catalogue**, not "run
 * the full palette and keep the N most-used colours". The difference
 * matters: the cheap version throws away a colour the design needs and
 * cannot get it back, because by then every stitch has already been
 * snapped to a neighbour. Here the choice is made first, against the
 * source's own colour distribution, and only then does the ordinary
 * reduce/dither stage run against the chosen subset.
 *
 * Every thread considered is a **real permitted thread**, never a
 * representative RGB value a quantiser invented — a colour you cannot
 * buy is not a cross-stitch answer.
 *
 * The prefer rule retired at M15-CORE-03 (D114): its taste half is
 * profile membership, its steering half was a weak lock. Locks are the
 * design's Must-use seats — guaranteed, never displaced, exempt from
 * the distance rule (a hard promise beats a spacing preference).
 *
 * The whole module is pure and deterministic: no randomness, and every
 * tie broken by permitted-set order.
 */

import { srgbToLab } from './color/convert.ts';
import {
  applyCurve,
  chromaScale,
  isIdentityCurve,
  toneEngaged,
  type ToneConfig,
} from './color/tone.ts';
import type { PermittedSet } from './palette-policy.ts';
import { paletteOf } from './palette.ts';
import type { Palette, PixelBuffer, Thread } from './types.ts';

/** Alpha at or above this counts as a stitch (50 % of 255, D9). */
const STITCH_ALPHA = 128;

/** Bits per channel when binning source colours (4 → 4096 bins). */
const BIN_BITS = 4;

/**
 * Bin cap. Selection cost is `bins × eligible × target`, so an
 * unbounded bin count would make a photograph at the 1024 × 1024
 * maximum an order of magnitude slower than a flat graphic for no
 * gain in the answer — beyond a few hundred weighted bins the greedy
 * step stops changing its mind. Bins are kept by descending weight, so
 * what is dropped is always the rarest colour in the design.
 */
const MAX_BINS = 512;

/**
 * A weighted summary of the colours actually present in the design,
 * in Lab. Built once per source frame, reused across every candidate.
 */
export interface ColorDistribution {
  /** Bin representative colours, Lab triples: [L, a, b, L, a, b, …]. */
  lab: Float32Array;
  /** Stitches represented by each bin. */
  weight: Float32Array;
  /** Number of bins actually used. */
  count: number;
  /** Non-empty stitches the distribution was built from. */
  stitchCount: number;
  /** Distinct binned colours before the {@link MAX_BINS} cap. */
  distinctBins: number;
}

/**
 * Summarise a **grid-sized** buffer's colours.
 *
 * Resize comes first (D3), so this runs over stitches, not source
 * pixels — one bin's weight is a count of stitches you would actually
 * sew. Empty cells (alpha < 128) are excluded: fabric is not a colour
 * the palette has to cover.
 *
 * Bin representatives are the **mean** of the colours that fell in the
 * bin, not the bin centre, so a design whose colours cluster at one
 * corner of a bin is not pulled towards a colour it does not contain.
 */
export function buildDistribution(buffer: PixelBuffer): ColorDistribution {
  const data = buffer.data;
  const shift = 8 - BIN_BITS;
  const sums = new Map<number, { r: number; g: number; b: number; n: number }>();
  let stitchCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    stitchCount++;
    const key =
      ((r >> shift) << (BIN_BITS * 2)) | ((g >> shift) << BIN_BITS) | (b >> shift);
    const acc = sums.get(key);
    if (acc === undefined) sums.set(key, { r, g, b, n: 1 });
    else {
      acc.r += r;
      acc.g += g;
      acc.b += b;
      acc.n++;
    }
  }

  // Descending weight, then bin key — deterministic under the cap.
  const bins = [...sums.entries()].sort((a, b) => b[1].n - a[1].n || a[0] - b[0]);
  const distinctBins = bins.length;
  const kept = bins.slice(0, MAX_BINS);

  const lab = new Float32Array(kept.length * 3);
  const weight = new Float32Array(kept.length);
  kept.forEach(([, acc], i) => {
    srgbToLab(
      Math.round(acc.r / acc.n),
      Math.round(acc.g / acc.n),
      Math.round(acc.b / acc.n),
      lab,
      i * 3,
    );
    weight[i] = acc.n;
  });

  return { lab, weight, count: kept.length, stitchCount, distinctBins };
}

/** The outcome of a selection run. */
export interface SelectionResult {
  /** The chosen threads, in permitted-set order. */
  threads: Thread[];
  /** How many came from locks (the Must-use seats). */
  lockedCount: number;
  /** How many the auto-fill chose. */
  autoFilledCount: number;
  /**
   * True when fewer threads were selected than requested because the
   * permitted set ran out — the caller turns this into the explanation.
   */
  shortOfTarget: boolean;
  /**
   * True when the minimum-distance rule is what stopped the fill
   * short: eligible threads remained, but every one sat closer than
   * the rule allows to a thread already chosen (M15-CORE-03). The
   * caller owns the sentence.
   */
  distanceLimited: boolean;
  /**
   * Colours the colour-use floor dropped after the count (TONE-01):
   * "count up to N, then drop the under-earners". 0 when the floor is
   * off or nothing fell below it. The caller owns the sentence.
   */
  floorDropped: number;
}

/**
 * The colour-use floor (TONE-01, D200): drop chosen colours that earn
 * fewer than `minStitches` stitches of the design. Off by default;
 * Must-use seats are exempt; ending below the requested count is
 * accepted — the palette only shrinks, never widens.
 */
export interface FloorRule {
  on: boolean;
  /** Absolute stitches a colour must earn to keep its place. */
  minStitches: number;
}

/** Optional selection behaviours (TONE-01); absent = pre-TONE-01. */
export interface SelectionOptions {
  /**
   * Tone mode: when engaged, the greedy objective moves into the tone
   * space (curved L, w·a, w·b) — deliberately the same space cell
   * matching uses (the D200 decision of record), so the selector
   * cannot optimise for something the render then contradicts.
   * Distribution lightness is curved; thread lightness never is.
   */
  tone?: ToneConfig | undefined;
  /** The colour-use floor, applied after the count. */
  floor?: FloorRule | undefined;
}

/** Squared tone-space distance between two flat-array Lab triples. */
function toneDistSq(
  a: Float32Array,
  ai: number,
  b: Float32Array,
  bi: number,
): number {
  const dl = (a[ai] ?? 0) - (b[bi] ?? 0);
  const da = (a[ai + 1] ?? 0) - (b[bi + 1] ?? 0);
  const db = (a[ai + 2] ?? 0) - (b[bi + 2] ?? 0);
  return dl * dl + da * da + db * db;
}

/**
 * Thread Lab triples in the tone space (a/b scaled by w; L never
 * curved). With no engaged tone this is plain Lab — the identity
 * multiplication is skipped entirely so the pre-TONE-01 float path is
 * untouched.
 */
function threadToneLab(threads: readonly Thread[], tone: ToneConfig | undefined): Float32Array {
  const lab = new Float32Array(threads.length * 3);
  for (let t = 0; t < threads.length; t++) {
    const rgb = threads[t]?.rgb ?? [0, 0, 0];
    srgbToLab(rgb[0], rgb[1], rgb[2], lab, t * 3);
  }
  if (tone !== undefined) {
    const w = chromaScale(tone.weight);
    for (let t = 0; t < threads.length; t++) {
      lab[t * 3 + 1] = (lab[t * 3 + 1] ?? 0) * w;
      lab[t * 3 + 2] = (lab[t * 3 + 2] ?? 0) * w;
    }
  }
  return lab;
}

/** Distribution Lab triples in the tone space (L curved, a/b scaled). */
function distributionToneLab(
  distribution: ColorDistribution,
  tone: ToneConfig | undefined,
): Float32Array {
  if (tone === undefined) return distribution.lab;
  const w = chromaScale(tone.weight);
  const curve = isIdentityCurve(tone.curve) ? null : tone.curve;
  const lab = new Float32Array(distribution.count * 3);
  for (let b = 0; b < distribution.count; b++) {
    const l = distribution.lab[b * 3] ?? 0;
    lab[b * 3] = curve === null ? l : applyCurve(curve, l);
    lab[b * 3 + 1] = (distribution.lab[b * 3 + 1] ?? 0) * w;
    lab[b * 3 + 2] = (distribution.lab[b * 3 + 2] ?? 0) * w;
  }
  return lab;
}

/**
 * Apply the colour-use floor to a chosen thread list: assign every
 * distribution bin to its nearest chosen thread in the tone space
 * (first minimum on ties, the mapper's own tie-break), sum the
 * stitches each thread earns, and drop the worst under-earner — one
 * at a time, because removing a colour hands its stitches to a
 * neighbour and can lift another colour over the floor. Converges in
 * at most `threads` rounds; the palette only shrinks.
 *
 * Locks (Must-use seats) are exempt, and the last remaining colour is
 * never dropped — a floor is a tidy-up rule, not a way to empty the
 * design. Counts come from the capped bin summary, so a design with
 * more distinct colours than bins under-counts its rarest colours by
 * the dropped bins — the floor then errs towards dropping, which is
 * the rule's own direction.
 */
export function applyColourFloor(
  threads: readonly Thread[],
  locks: readonly Thread[],
  distribution: ColorDistribution,
  minStitches: number,
  tone?: ToneConfig,
): { threads: Thread[]; dropped: number } {
  if (distribution.count === 0 || threads.length === 0) {
    return { threads: [...threads], dropped: 0 };
  }
  const lockIds = new Set(locks.map((t) => t.id));
  const engaged = tone !== undefined && toneEngaged('lab', tone) ? tone : undefined;
  const distLab = distributionToneLab(distribution, engaged);
  let survivors = [...threads];
  let dropped = 0;

  for (;;) {
    const lab = threadToneLab(survivors, engaged);
    const earned = new Float64Array(survivors.length);
    for (let b = 0; b < distribution.count; b++) {
      let best = 0;
      let bestDist = Infinity;
      for (let t = 0; t < survivors.length; t++) {
        const d = toneDistSq(lab, t * 3, distLab, b * 3);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      earned[best] = (earned[best] ?? 0) + (distribution.weight[b] ?? 0);
    }
    // The worst under-earner among droppable threads; ties keep the
    // earlier permitted-set index (drop the later one), so the same
    // inputs always drop the same colour.
    let worst = -1;
    for (let t = 0; t < survivors.length; t++) {
      const id = survivors[t]?.id ?? '';
      if (lockIds.has(id)) continue;
      if ((earned[t] ?? 0) >= minStitches) continue;
      if (worst === -1 || (earned[t] ?? 0) <= (earned[worst] ?? 0)) worst = t;
    }
    if (worst === -1 || survivors.length <= 1) break;
    survivors = survivors.filter((_, t) => t !== worst);
    dropped++;
  }
  return { threads: survivors, dropped };
}

/** Squared ΔE76 between two Lab triples held in flat arrays. */
function distSq(
  a: Float32Array,
  ai: number,
  b: Float32Array,
  bi: number,
): number {
  const dl = (a[ai] ?? 0) - (b[bi] ?? 0);
  const da = (a[ai + 1] ?? 0) - (b[bi + 1] ?? 0);
  const db = (a[ai + 2] ?? 0) - (b[bi + 2] ?? 0);
  return dl * dl + da * da + db * db;
}

/**
 * Choose up to `target` threads from `permitted.eligible` that best
 * cover `distribution`.
 *
 * Greedy forward selection against the weighted sum of squared ΔE from
 * each bin to its nearest chosen thread — deliberately the same
 * perceptual objective the mapper itself minimises, so the selector
 * cannot be optimising for something the render then contradicts.
 *
 * Locks seed the selection and are never displaced, even when the
 * source contains nothing near them: a locked thread is a hard promise
 * (M7-MIX-01) — the design's Must-use seats. Auto-fill then supplies
 * `target - locks` more.
 *
 * `minDistance` (ΔE76, 0 = off) demands every auto-filled thread sit
 * at least that far from every thread already chosen. Locks are
 * exempt — a hard promise beats a spacing preference — and when the
 * rule is what stops the fill short, {@link
 * SelectionResult.distanceLimited} says so.
 *
 * The greedy result is not a global optimum, and is not claimed to be —
 * a fast deterministic answer whose limits are stated beats an
 * exhaustive search nobody can wait for during live editing.
 *
 * `options.tone` (TONE-01) moves the whole objective into the tone
 * space; `options.floor` drops under-earning colours after the fill.
 * Both absent leaves every code path — and every float — exactly as
 * it was, which is what keeps t = 0 selections identical to
 * pre-TONE-01 ones.
 */
export function selectThreads(
  permitted: PermittedSet,
  target: number,
  distribution: ColorDistribution,
  minDistance = 0,
  options: SelectionOptions = {},
): SelectionResult {
  const eligible = permitted.eligible;
  const locks = permitted.locks;
  const tone =
    options.tone !== undefined && toneEngaged('lab', options.tone)
      ? options.tone
      : undefined;
  const floor =
    options.floor !== undefined && options.floor.on && options.floor.minStitches > 0
      ? options.floor
      : undefined;

  /** Floor pass + result assembly shared by every return path. */
  const finish = (
    threads: Thread[],
    autoFilledCount: number,
    shortOfTarget: boolean,
    distanceLimited: boolean,
  ): SelectionResult => {
    let kept = threads;
    let floorDropped = 0;
    if (floor !== undefined) {
      const floored = applyColourFloor(
        threads,
        locks,
        distribution,
        floor.minStitches,
        tone,
      );
      kept = floored.threads;
      floorDropped = floored.dropped;
    }
    return {
      threads: kept,
      lockedCount: locks.length,
      autoFilledCount,
      shortOfTarget,
      distanceLimited,
      floorDropped,
    };
  };

  // Locks alone can meet or exceed the target: honour every lock and
  // let the caller explain the overshoot rather than dropping one.
  if (target <= locks.length || eligible.length === 0) {
    return finish([...locks], 0, false, false);
  }
  // The take-everything shortcut only holds without a distance rule:
  // with one, even an over-generous target must space its picks.
  if (target >= eligible.length && minDistance <= 0) {
    return finish(
      [...eligible],
      eligible.length - locks.length,
      target > eligible.length,
      false,
    );
  }

  const bins = distribution.count;
  const nEligible = eligible.length;

  // One distance matrix, built once: after this the greedy loop is
  // pure arithmetic over Float32Arrays, which is what keeps a 20-of-
  // 1007 selection in the tens of milliseconds rather than seconds.
  // Under an engaged tone both sides of the matrix are transformed
  // into the tone space first (thread lightness is never curved).
  const threadLab = threadToneLab(eligible, tone);
  const distLab = tone === undefined ? distribution.lab : distributionToneLab(distribution, tone);
  const dist = new Float32Array(nEligible * bins);
  for (let t = 0; t < nEligible; t++) {
    for (let b = 0; b < bins; b++) {
      dist[t * bins + b] = distSq(threadLab, t * 3, distLab, b * 3);
    }
  }

  const chosen = new Uint8Array(nEligible);
  const best = new Float32Array(bins).fill(Number.POSITIVE_INFINITY);
  const indexById = new Map(eligible.map((t, i) => [t.id, i]));
  // Chosen-thread Lab triples, for the distance rule. Locks join it
  // too: an auto-filled pick must clear every seat, hard or chosen.
  // The rule measures PLAIN Lab even under tone (its promise is
  // perceptual spacing of the threads you buy — ΔE76 — and at the
  // tone end-stop the scaled space would call two same-lightness hues
  // "distance 0" and block the fill for no perceptual reason).
  const spacingLab = tone === undefined ? threadLab : threadToneLab(eligible, undefined);
  const chosenLab: number[] = [];

  const applyThread = (t: number): void => {
    chosen[t] = 1;
    chosenLab.push(
      spacingLab[t * 3] ?? 0,
      spacingLab[t * 3 + 1] ?? 0,
      spacingLab[t * 3 + 2] ?? 0,
    );
    const base = t * bins;
    for (let b = 0; b < bins; b++) {
      const d = dist[base + b] ?? 0;
      if (d < (best[b] ?? Number.POSITIVE_INFINITY)) best[b] = d;
    }
  };

  for (const lock of locks) {
    const t = indexById.get(lock.id);
    if (t !== undefined) applyThread(t);
  }

  const minDistSq = minDistance > 0 ? minDistance * minDistance : 0;
  const clearsDistance = (t: number): boolean => {
    if (minDistSq <= 0) return true;
    const tl = spacingLab[t * 3] ?? 0;
    const ta = spacingLab[t * 3 + 1] ?? 0;
    const tb = spacingLab[t * 3 + 2] ?? 0;
    for (let c = 0; c < chosenLab.length; c += 3) {
      const dl = tl - (chosenLab[c] ?? 0);
      const da = ta - (chosenLab[c + 1] ?? 0);
      const db = tb - (chosenLab[c + 2] ?? 0);
      if (dl * dl + da * da + db * db < minDistSq) return false;
    }
    return true;
  };

  let autoFilled = 0;
  let distanceLimited = false;
  const wanted = target - locks.length;
  for (let pick = 0; pick < wanted; pick++) {
    let bestThread = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    let skippedForDistance = false;
    for (let t = 0; t < nEligible; t++) {
      if (chosen[t] === 1) continue;
      if (!clearsDistance(t)) {
        skippedForDistance = true;
        continue;
      }
      const base = t * bins;
      let cost = 0;
      for (let b = 0; b < bins; b++) {
        const current = best[b] ?? Number.POSITIVE_INFINITY;
        const d = dist[base + b] ?? 0;
        cost += (distribution.weight[b] ?? 0) * (d < current ? d : current);
      }
      // Strict `<` keeps the earliest permitted-set index on a tie, so
      // the same policy and image always give the same palette.
      if (cost < bestCost) {
        bestCost = cost;
        bestThread = t;
      }
    }
    if (bestThread === -1) {
      // Eligible threads remained but none cleared the rule: the
      // distance, not the catalogue, is what capped the palette.
      distanceLimited = skippedForDistance;
      break;
    }
    applyThread(bestThread);
    autoFilled++;
  }

  // Emit in permitted-set order, not selection order: palette order is
  // the nearest-match tie-break, so it must not depend on the sequence
  // the greedy loop happened to discover threads in.
  const threads = eligible.filter((_, i) => chosen[i] === 1);
  return finish(threads, autoFilled, threads.length < target, distanceLimited);
}

/** A selection turned into a palette, with its counts for the UI. */
export interface SelectedPalette {
  palette: Palette;
  selection: SelectionResult;
}

/** Wrap {@link selectThreads} into a named palette. */
export function selectPalette(
  permitted: PermittedSet,
  target: number,
  distribution: ColorDistribution,
  name: string,
  minDistance = 0,
  options: SelectionOptions = {},
): SelectedPalette {
  const selection = selectThreads(permitted, target, distribution, minDistance, options);
  return { palette: paletteOf(name, selection.threads), selection };
}
