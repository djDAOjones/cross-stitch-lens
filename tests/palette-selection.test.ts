/**
 * Count-constrained selection and auto-fill (M7-COUNT-01, M7-MIX-01).
 *
 * The canonical case the milestone names is "lock 5, request 15 →
 * exactly ten auto-filled". Around it: the selection must be a subset
 * of the permitted set, deterministic across runs, never silently over
 * the limit, and honest when it comes up short.
 */

import { describe, expect, it } from 'vitest';

import {
  defaultPolicy,
  resolvePermitted,
  type PalettePolicy,
} from '../src/core/palette-policy.ts';
import { resolveProjectPalette } from '../src/core/palette-resolve.ts';
import { buildDistribution, selectThreads } from '../src/core/palette-selection.ts';
import { srgbToLab } from '../src/core/color/convert.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';
import type { PixelBuffer } from '../src/core/types.ts';

const catalogue = loadCatalogue();

function policy(overrides: Partial<PalettePolicy> = {}): PalettePolicy {
  return { ...defaultPolicy(), ...overrides };
}

/**
 * A 16×16 gradient with a transparent band — enough distinct colours to
 * make a 15-colour request meaningful, plus empty cells to prove they
 * are excluded.
 */
function gradient(): PixelBuffer {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (y === 0) continue; // transparent row: alpha stays 0
      data[i] = (x * 16) & 255;
      data[i + 1] = (y * 16) & 255;
      data[i + 2] = ((x + y) * 8) & 255;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

describe('buildDistribution', () => {
  const distribution = buildDistribution(gradient());

  it('counts only non-empty stitches', () => {
    // 16×16 with one fully transparent row.
    expect(distribution.stitchCount).toBe(16 * 15);
  });

  it('weights sum to the stitch count', () => {
    const total = [...distribution.weight].reduce((a, b) => a + b, 0);
    expect(total).toBe(distribution.stitchCount);
  });

  it('is deterministic', () => {
    const again = buildDistribution(gradient());
    expect([...again.weight]).toEqual([...distribution.weight]);
    expect([...again.lab]).toEqual([...distribution.lab]);
  });

  it('reports an all-empty design as an empty distribution', () => {
    const empty = buildDistribution({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray(8),
    });
    expect(empty.count).toBe(0);
    expect(empty.stitchCount).toBe(0);
  });
});

describe('selectThreads', () => {
  const distribution = buildDistribution(gradient());
  const permitted = resolvePermitted(policy(), { catalogue });

  it('selects exactly the requested number from the permitted set', () => {
    const result = selectThreads(permitted, 15, distribution);
    expect(result.threads).toHaveLength(15);
    const permittedIds = new Set(permitted.eligible.map((t) => t.id));
    expect(result.threads.every((t) => permittedIds.has(t.id))).toBe(true);
  });

  it('is deterministic — same policy and image, same palette', () => {
    const a = selectThreads(permitted, 12, distribution);
    const b = selectThreads(permitted, 12, distribution);
    expect(a.threads.map((t) => t.id)).toEqual(b.threads.map((t) => t.id));
  });

  it('emits threads in permitted-set order, not discovery order', () => {
    const result = selectThreads(permitted, 10, distribution);
    const order = permitted.eligible.map((t) => t.id);
    const positions = result.threads.map((t) => order.indexOf(t.id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('locks 5 and auto-fills 10 for a request of 15', () => {
    // The milestone's canonical worked example (M7-MIX-01).
    const locks = permitted.eligible.slice(0, 5).map((t) => t.id);
    const withLocks = resolvePermitted(policy({ locked: locks }), { catalogue });
    const result = selectThreads(withLocks, 15, distribution);
    expect(result.lockedCount).toBe(5);
    expect(result.autoFilledCount).toBe(10);
    expect(result.threads).toHaveLength(15);
    // Every lock survives, whatever the image contains.
    for (const id of locks) expect(result.threads.some((t) => t.id === id)).toBe(true);
  });

  it('keeps every lock when locks exceed the requested count', () => {
    const locks = permitted.eligible.slice(0, 8).map((t) => t.id);
    const withLocks = resolvePermitted(policy({ locked: locks }), { catalogue });
    const result = selectThreads(withLocks, 3, distribution);
    // A lock is a promise: honour all eight and let the caller explain
    // the overshoot, rather than quietly dropping five.
    expect(result.threads).toHaveLength(8);
    expect(result.lockedCount).toBe(8);
  });

  it('returns the whole permitted set when the target exceeds it', () => {
    const small = resolvePermitted(
      policy({ ownedOnly: true }),
      { catalogue, owned: new Set(['dmc:310', 'dmc:666']) },
    );
    const result = selectThreads(small, 10, distribution);
    expect(result.threads).toHaveLength(2);
    expect(result.shortOfTarget).toBe(true);
  });

  it('spaces auto-filled threads by the minimum distance (M15-CORE-03)', () => {
    // ΔE between every chosen pair must clear the rule when no locks
    // are involved. 12 is a strong demand against a photographic
    // distribution — strong enough that spacing visibly binds.
    const result = selectThreads(permitted, 12, distribution, 12);
    const lab = new Float32Array(result.threads.length * 3);
    result.threads.forEach((t, i) => {
      srgbToLab(t.rgb[0], t.rgb[1], t.rgb[2], lab, i * 3);
    });
    for (let a = 0; a < result.threads.length; a++) {
      for (let b = a + 1; b < result.threads.length; b++) {
        const dl = (lab[a * 3] ?? 0) - (lab[b * 3] ?? 0);
        const da = (lab[a * 3 + 1] ?? 0) - (lab[b * 3 + 1] ?? 0);
        const db = (lab[a * 3 + 2] ?? 0) - (lab[b * 3 + 2] ?? 0);
        expect(Math.sqrt(dl * dl + da * da + db * db)).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it('reports distanceLimited when spacing is what stops the fill', () => {
    // An absurd distance over a rich permitted set: threads remain,
    // none fit — the flag must name the distance, not the catalogue.
    const result = selectThreads(permitted, 12, distribution, 150);
    expect(result.threads.length).toBeLessThan(12);
    expect(result.shortOfTarget).toBe(true);
    expect(result.distanceLimited).toBe(true);
  });

  it('keeps Must-use seats even when they violate the distance', () => {
    // Two near-identical greys locked: both stay — a hard promise
    // beats a spacing preference — and auto-fill still spaces itself.
    const locked = resolvePermitted(
      policy({ locked: ['dmc:762', 'dmc:415'] }),
      { catalogue },
    );
    const result = selectThreads(locked, 8, distribution, 20);
    const ids = result.threads.map((t) => t.id);
    expect(ids).toContain('dmc:762');
    expect(ids).toContain('dmc:415');
    expect(result.lockedCount).toBe(2);
  });

  it('applies the distance even when the target exceeds the eligible set', () => {
    // The take-everything shortcut must not bypass the rule.
    const small = resolvePermitted(
      policy({ ownedOnly: true }),
      { catalogue, owned: new Set(['dmc:762', 'dmc:415', 'dmc:310']) },
    );
    const spaced = selectThreads(small, 10, distribution, 20);
    // 762 and 415 are near-identical greys: only one clears the rule.
    expect(spaced.threads.length).toBeLessThan(3);
    expect(spaced.distanceLimited).toBe(true);
  });

  it('selection stays deterministic with the distance rule active', () => {
    const a = selectThreads(permitted, 10, distribution, 15);
    const b = selectThreads(permitted, 10, distribution, 15);
    expect(a.threads.map((t) => t.id)).toEqual(b.threads.map((t) => t.id));
  });
});

describe('resolveProjectPalette applies the count limit last', () => {
  const source = gradient();

  it('never exceeds a maximum', () => {
    const resolved = resolveProjectPalette({
      policy: policy({ count: { mode: 'max', n: 8 } }),
      inputs: { catalogue },
      source,
      name: 'test',
    });
    expect(resolved.palette.entries).toHaveLength(8);
    expect(resolved.selectedCount).toBe(8);
    expect(resolved.eligibleCount).toBe(489);
  });

  it('cannot reach a thread the brand or exclusion rules ruled out', () => {
    // The M7-ACCEPT-01 headline invariant: the limit selects FROM the
    // permitted set, so it can never widen one.
    const owned = new Set(['dmc:310', 'dmc:666', 'dmc:321', 'dmc:498']);
    const resolved = resolveProjectPalette({
      policy: policy({ ownedOnly: true, count: { mode: 'max', n: 50 } }),
      inputs: { catalogue, owned },
      source,
      name: 'test',
    });
    expect(resolved.palette.entries.every((t) => owned.has(t.id))).toBe(true);
  });

  it('explains a request larger than the permitted set', () => {
    const resolved = resolveProjectPalette({
      policy: policy({
        ownedOnly: true,
        count: { mode: 'exact', n: 20 },
      }),
      inputs: { catalogue, owned: new Set(['dmc:310', 'dmc:666']) },
      source,
      name: 'test',
    });
    expect(resolved.selectedCount).toBe(2);
    const conflict = resolved.conflicts.find((c) => c.kind === 'count-exceeds-eligible');
    expect(conflict?.message).toContain('only 2 threads are permitted');
    // Singular reads as English, not as a template with a number in it.
    const single = resolveProjectPalette({
      policy: policy({ ownedOnly: true, count: { mode: 'exact', n: 5 } }),
      inputs: { catalogue, owned: new Set(['dmc:310']) },
      source,
      name: 'test',
    });
    expect(
      single.conflicts.find((c) => c.kind === 'count-exceeds-eligible')?.message,
    ).toContain('only 1 thread is permitted, so it is being used');
  });

  it('explains locks that exceed the requested count', () => {
    const locks = ['dmc:310', 'dmc:666', 'dmc:321'];
    const resolved = resolveProjectPalette({
      policy: policy({ locked: locks, count: { mode: 'max', n: 2 } }),
      inputs: { catalogue },
      source,
      name: 'test',
    });
    const conflict = resolved.conflicts.find((c) => c.kind === 'locks-exceed-count');
    expect(conflict?.message).toContain('Every lock is being kept');
    expect(resolved.palette.entries).toHaveLength(3);
  });

  it('resolves to the full permitted set before any frame has run', () => {
    // No source yet: the pipeline has not run either, so there is
    // nothing to be over-supplied relative to.
    const resolved = resolveProjectPalette({
      policy: policy({ count: { mode: 'max', n: 8 } }),
      inputs: { catalogue },
      name: 'test',
    });
    expect(resolved.selectedCount).toBe(489);
  });

  it('carries a resolution failure through as an empty, not-ok palette', () => {
    const resolved = resolveProjectPalette({
      policy: policy({ brands: [] }),
      inputs: { catalogue },
      source,
      name: 'test',
    });
    expect(resolved.ok).toBe(false);
    expect(resolved.palette.entries).toEqual([]);
    expect(resolved.conflicts.some((c) => c.severity === 'error')).toBe(true);
  });

  it('explains a distance-capped palette with both dials named', () => {
    // Count and distance in genuine conflict: the sentence must give
    // the user both ways out (M15-CORE-03).
    const resolved = resolveProjectPalette({
      policy: policy({ count: { mode: 'max', n: 12 }, minDistance: 150 }),
      inputs: { catalogue },
      source,
      name: 'test',
    });
    expect(resolved.ok).toBe(true);
    const conflict = resolved.conflicts.find((c) => c.kind === 'distance-limits-count');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toContain('minimum distance of 150');
    expect(conflict?.message).toContain('Lower the distance or the colour count');
  });
});

describe('tone-space selection and the colour-use floor (TONE-01)', () => {
  const permitted = resolvePermitted(policy(), { catalogue });
  const distribution = buildDistribution(gradient());

  it('a disengaged tone option changes nothing — same picks, same order', () => {
    const plain = selectThreads(permitted, 12, distribution);
    const viaOptions = selectThreads(permitted, 12, distribution, 0, {
      tone: { weight: 0, curve: [{ in: 0, out: 0 }, { in: 50, out: 50 }, { in: 100, out: 100 }], cuts: null },
      floor: { on: false, minStitches: 100 },
    });
    expect(viaOptions.threads.map((t) => t.id)).toEqual(plain.threads.map((t) => t.id));
    expect(viaOptions.floorDropped).toBe(0);
  });

  it('at the tone end-stop the picks ladder in lightness', () => {
    // Weight 1: the objective is lightness coverage alone, so the
    // eight picks must span a wide L* range even though the gradient
    // is colourful.
    const selection = selectThreads(permitted, 8, distribution, 0, {
      tone: { weight: 1, curve: [{ in: 0, out: 0 }, { in: 50, out: 50 }, { in: 100, out: 100 }], cuts: null },
    });
    expect(selection.threads.length).toBe(8);
    const scratch = new Float32Array(3);
    const ls = selection.threads.map((t) => {
      srgbToLab(t.rgb[0], t.rgb[1], t.rgb[2], scratch, 0);
      return scratch[0] ?? 0;
    });
    expect(Math.max(...ls) - Math.min(...ls)).toBeGreaterThan(50);
  });

  it('the floor drops under-earners after the count and says how many', () => {
    // A floor higher than any colour can earn among 240 stitches split
    // 12 ways must drop colours; the palette only shrinks and never
    // empties.
    const generous = selectThreads(permitted, 12, distribution, 0, {
      floor: { on: true, minStitches: 60 },
    });
    const baseline = selectThreads(permitted, 12, distribution);
    expect(generous.floorDropped).toBeGreaterThan(0);
    expect(generous.threads.length).toBe(baseline.threads.length - generous.floorDropped);
    expect(generous.threads.length).toBeGreaterThanOrEqual(1);
    // Every survivor was in the unfloored selection: the floor only
    // removes, never substitutes.
    const before = new Set(baseline.threads.map((t) => t.id));
    for (const t of generous.threads) expect(before.has(t.id)).toBe(true);
  });

  it('an absurd floor keeps the last colour rather than emptying the palette', () => {
    const floored = selectThreads(permitted, 6, distribution, 0, {
      floor: { on: true, minStitches: 1_000_000 },
    });
    expect(floored.threads.length).toBe(1);
    expect(floored.floorDropped).toBe(5);
  });

  it('Must-use seats are exempt from the floor', () => {
    const withLock = resolvePermitted(
      policy({ locked: [permitted.eligible[0]?.id ?? ''] }),
      { catalogue },
    );
    const floored = selectThreads(withLock, 6, distribution, 0, {
      floor: { on: true, minStitches: 1_000_000 },
    });
    // The seat survives any floor; every droppable colour went.
    expect(floored.threads.some((t) => t.id === withLock.locks[0]?.id)).toBe(true);
    expect(floored.threads.length).toBe(1);
  });

  it('the floor cascade is deterministic', () => {
    const a = selectThreads(permitted, 10, distribution, 0, {
      floor: { on: true, minStitches: 30 },
    });
    const b = selectThreads(permitted, 10, distribution, 0, {
      floor: { on: true, minStitches: 30 },
    });
    expect(a.threads.map((t) => t.id)).toEqual(b.threads.map((t) => t.id));
  });
});
