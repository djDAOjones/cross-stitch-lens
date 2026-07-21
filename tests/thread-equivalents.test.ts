/**
 * Nearest-equivalent lookup across brands.
 *
 * The behaviour that matters is the labelling: a computed match is a
 * suggestion from colour distance alone, and must never be presented
 * with the authority of a published conversion. Curated data wins where
 * it exists; there is none yet, so the computed path is what ships.
 */

import { describe, expect, it } from 'vitest';

import { loadCatalogue } from '../src/core/thread-catalogue.ts';
import {
  describeEquivalent,
  nearestEquivalents,
  NO_CURATED,
} from '../src/core/thread-equivalents.ts';

const catalogue = loadCatalogue();

/** DMC 310 — black, and present in every build. */
const BLACK = catalogue.byId.get('dmc:310');

describe('nearestEquivalents', () => {
  it('finds threads in the requested brand only', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const matches = nearestEquivalents(catalogue, BLACK, 'anchor');
    expect(matches.length).toBe(3);
    expect(matches.every((m) => m.thread.brandId === 'anchor')).toBe(true);
  });

  it('labels every computed match as computed, with a distance', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const matches = nearestEquivalents(catalogue, BLACK, 'anchor');
    for (const match of matches) {
      expect(match.source).toBe('computed');
      expect(match.deltaE).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns nearest first', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const deltas = nearestEquivalents(catalogue, BLACK, 'anchor', 5).map(
      (m) => m.deltaE ?? 0,
    );
    expect(deltas).toEqual([...deltas].sort((a, b) => a - b));
  });

  it('picks the other brand’s black for a black thread', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const [best] = nearestEquivalents(catalogue, BLACK, 'anchor', 1);
    // The computed answer is the right thread — Anchor 403 "Black".
    expect(best?.thread.reference).toBe('403');
    expect(best?.thread.name).toBe('Black');
    // But it is NOT a zero-distance match: the source records DMC 310
    // as #0c0c0c and Anchor 403 as #000000, so the measured ΔE is ~3.3.
    // That gap is the argument for curated cross-references — two
    // threads a manufacturer calls equivalent can still differ in the
    // data by more than colour distance alone would suggest.
    expect(best?.deltaE ?? 0).toBeGreaterThan(1);
    expect(best?.deltaE ?? 99).toBeLessThan(5);
  });

  it('never returns the query thread itself', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const matches = nearestEquivalents(catalogue, BLACK, 'dmc', 5);
    expect(matches.every((m) => m.thread.id !== BLACK.id)).toBe(true);
  });

  it('is deterministic', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const a = nearestEquivalents(catalogue, BLACK, 'cosmo', 4).map((m) => m.thread.id);
    const b = nearestEquivalents(catalogue, BLACK, 'cosmo', 4).map((m) => m.thread.id);
    expect(a).toEqual(b);
  });

  it('returns nothing for a brand this build does not have', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    expect(nearestEquivalents(catalogue, BLACK, 'nosuchbrand')).toEqual([]);
  });

  it('prefers curated data and marks it as such', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const curated = new Map([['dmc:310', ['anchor:1']]]);
    const [first] = nearestEquivalents(catalogue, BLACK, 'anchor', 3, curated);
    expect(first?.source).toBe('curated');
    expect(first?.thread.id).toBe('anchor:1');
    // A curated pairing is an authority's judgement, not a distance we
    // measured, so it carries no ΔE.
    expect(first?.deltaE).toBeUndefined();
  });

  it('fills the remaining slots with computed matches after curated ones', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const curated = new Map([['dmc:310', ['anchor:1']]]);
    const matches = nearestEquivalents(catalogue, BLACK, 'anchor', 3, curated);
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.source)).toEqual(['curated', 'computed', 'computed']);
    // A curated entry is not offered twice.
    expect(matches.filter((m) => m.thread.id === 'anchor:1')).toHaveLength(1);
  });

  it('ships with no curated data yet', () => {
    expect(NO_CURATED.size).toBe(0);
  });
});

describe('describeEquivalent', () => {
  it('distinguishes a published equivalent from a colour match in words', () => {
    expect(BLACK).toBeDefined();
    if (BLACK === undefined) return;
    const computed = nearestEquivalents(catalogue, BLACK, 'anchor', 1)[0];
    expect(computed).toBeDefined();
    if (computed === undefined) return;
    expect(describeEquivalent(computed, 'Anchor')).toContain('closest by colour');
    expect(describeEquivalent({ ...computed, source: 'curated' }, 'Anchor')).toContain(
      'published equivalent',
    );
  });
});
