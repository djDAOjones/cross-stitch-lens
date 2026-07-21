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
import {
  buildDistribution,
  PREFERENCE_DISCOUNT,
  selectThreads,
} from '../src/core/palette-selection.ts';
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

  it('gives preferred threads an advantage without guaranteeing them', () => {
    const preferred = permitted.eligible.slice(200, 260).map((t) => t.id);
    const withPrefs = resolvePermitted(
      policy({ source: { kind: 'preset', presetId: 'p', mode: 'prefer' } }),
      { catalogue, preset: { name: 'P', threadIds: preferred, mode: 'prefer' } },
    );
    const plain = selectThreads(permitted, 12, distribution);
    const nudged = selectThreads(withPrefs, 12, distribution);
    const preferredSet = new Set(preferred);
    const plainHits = plain.threads.filter((t) => preferredSet.has(t.id)).length;
    const nudgedHits = nudged.threads.filter((t) => preferredSet.has(t.id)).length;
    expect(nudgedHits).toBeGreaterThanOrEqual(plainHits);
    expect(nudged.preferredUsed).toBe(nudgedHits);
    // A discount, not an override: the constant is a stated product
    // decision, and a preference cannot take the whole palette.
    expect(PREFERENCE_DISCOUNT).toBeLessThan(1);
    expect(nudgedHits).toBeLessThan(12);
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
});
