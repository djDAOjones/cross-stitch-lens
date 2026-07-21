/**
 * Nearest-equivalent lookup: "I have this DMC thread — what is the
 * closest Anchor one?" (M7-BRAND-01 follow-on).
 *
 * Two sources of truth, layered:
 *
 * 1. **Curated** — a manufacturer or owner-reviewed cross-reference.
 *    Authoritative, because a real equivalence accounts for sheen, dye
 *    lot, and finish, none of which are in an sRGB triple. There is no
 *    curated data yet (`thread-map-proposed.csv` is a header with no
 *    rows), so this layer is currently empty by construction.
 * 2. **Computed** — nearest in CIELAB over the target brand's own
 *    measured colours. Available today for all eight brands.
 *
 * Curated wins where present, computed fills the rest, and every result
 * says which it is. That labelling is the point: a computed match is a
 * *suggestion*, and presenting it with the same authority as a
 * manufacturer's own conversion chart would be a false claim about
 * thread the user is about to buy.
 */

import { srgbToLab } from './color/convert.ts';
import { deltaE76Sq } from './color/metrics.ts';
import type { ThreadCatalogue } from './thread-catalogue.ts';
import type { Thread } from './types.ts';

/** Where an equivalence came from. */
export type EquivalenceSource = 'curated' | 'computed';

/** One suggested equivalent in another brand. */
export interface ThreadEquivalent {
  thread: Thread;
  source: EquivalenceSource;
  /**
   * CIE76 ΔE from the query thread — 0 is identical. Roughly: under
   * ~1 is imperceptible, ~2–3 is a close match, over ~5 is a visible
   * difference. `undefined` for curated entries, where the pairing is
   * an authority's judgement rather than a distance we measured.
   */
  deltaE?: number;
}

/**
 * A curated cross-reference: query thread id → equivalent thread ids.
 *
 * Empty until curated data lands. Kept as an explicit parameter rather
 * than a module global so the ingestion path, whenever it arrives, has
 * one obvious place to plug into and tests can supply their own.
 */
export type CuratedMap = ReadonlyMap<string, readonly string[]>;

/** No curated data — the current state, named rather than implied. */
export const NO_CURATED: CuratedMap = new Map();

/** Lab triples for a thread list, in the same order. */
function labFor(threads: readonly Thread[]): Float32Array {
  const lab = new Float32Array(threads.length * 3);
  threads.forEach((thread, i) => {
    srgbToLab(thread.rgb[0], thread.rgb[1], thread.rgb[2], lab, i * 3);
  });
  return lab;
}

/**
 * Find the nearest threads to `query` within `brandId`.
 *
 * Returns up to `limit` candidates, nearest first, ties broken by
 * catalogue order so repeated calls agree. A thread's equivalents in
 * its *own* brand are a legitimate question (the near-duplicates a
 * palette might collapse), so the query brand is not excluded — but
 * the query thread itself is.
 */
export function nearestEquivalents(
  catalogue: ThreadCatalogue,
  query: Thread,
  brandId: string,
  limit = 3,
  curated: CuratedMap = NO_CURATED,
): ThreadEquivalent[] {
  const curatedIds = curated.get(query.id) ?? [];
  const results: ThreadEquivalent[] = [];
  for (const id of curatedIds) {
    const thread = catalogue.byId.get(id);
    if (thread !== undefined && thread.brandId === brandId) {
      results.push({ thread, source: 'curated' });
    }
  }
  if (results.length >= limit) return results.slice(0, limit);

  const candidates = catalogue.threads.filter(
    (t) => t.brandId === brandId && t.id !== query.id && !curatedIds.includes(t.id),
  );
  const lab = labFor(candidates);
  const queryLab = new Float32Array(3);
  srgbToLab(query.rgb[0], query.rgb[1], query.rgb[2], queryLab, 0);

  const scored = candidates.map((thread, i) => ({
    thread,
    index: i,
    distance: deltaE76Sq(queryLab, 0, lab, i * 3),
  }));
  // Ascending distance, then catalogue order — a total order, so the
  // answer never depends on sort stability.
  scored.sort((a, b) => a.distance - b.distance || a.index - b.index);

  for (const candidate of scored.slice(0, limit - results.length)) {
    results.push({
      thread: candidate.thread,
      source: 'computed',
      deltaE: Math.sqrt(candidate.distance),
    });
  }
  return results;
}

/**
 * A one-line description of an equivalence, for the UI.
 *
 * Computed matches carry their ΔE and the word "closest"; curated ones
 * do not pretend to a number they were not measured with.
 */
export function describeEquivalent(equivalent: ThreadEquivalent, brandName: string): string {
  if (equivalent.source === 'curated') {
    return `${brandName} ${equivalent.thread.reference} ${equivalent.thread.name} — published equivalent`;
  }
  const delta = equivalent.deltaE ?? 0;
  return `${brandName} ${equivalent.thread.reference} ${equivalent.thread.name} — closest by colour (ΔE ${delta.toFixed(1)})`;
}
