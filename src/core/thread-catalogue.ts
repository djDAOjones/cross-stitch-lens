/**
 * The thread catalogue: brands, threads, and their stable identities
 * (M7-BRAND-01).
 *
 * The generated `palettes/catalogue.json` is bundled as data — a
 * build-time JSON import, not I/O, so core purity holds. Do not
 * hand-edit it; re-run `scripts/build-palette.mjs`.
 *
 * The point of this module is that **display colour is not identity**.
 * Two threads can render identical RGB and still be different things a
 * stitcher buys — most obviously an Anchor record mapped from a DMC one,
 * which shares its colour by construction. Everything downstream keys on
 * `Thread.id` (`brandId:reference`) and only ever treats RGB as a
 * rendering value.
 */

import catalogueData from './palettes/catalogue.json';
import type { Provenance, Thread } from './types.ts';

/** A thread manufacturer. Metadata is held once, per brand. */
export interface Brand {
  /** Stable lowercase id, e.g. `"dmc"`. */
  id: string;
  /** Display name, e.g. `"DMC"`. */
  name: string;
  provenance: Provenance;
  /** User-facing sentence explaining the provenance limitation. */
  note: string;
}

/** Brands plus their threads, indexed for lookup by identity. */
export interface ThreadCatalogue {
  brands: Brand[];
  /** Catalogue order: all of brand 1, then all of brand 2, … */
  threads: Thread[];
  /** `Thread.id` → thread. */
  byId: Map<string, Thread>;
}

/** Shape of one generated catalogue.json thread row. */
interface RawThread {
  id: string;
  brandId: string;
  reference: string;
  name: string;
  hex: string;
  rgb: number[];
  provenance: string;
  mappedFrom: string | null;
}

/** Shape of the generated catalogue.json document. */
interface RawCatalogue {
  brands: { id: string; name: string; provenance: string; note: string }[];
  threads: RawThread[];
}

/** Compose the durable thread key from its two parts. */
export function threadId(brandId: string, reference: string): string {
  return `${brandId}:${reference}`;
}

let cached: ThreadCatalogue | null = null;

/**
 * The built-in two-brand catalogue (DMC measured, Anchor mapped).
 *
 * Memoised: the parse is pure and the result is treated as immutable,
 * so rebuilding it per call would only cost ~1000 object allocations
 * every time a policy is resolved.
 */
export function loadCatalogue(): ThreadCatalogue {
  if (cached !== null) return cached;
  const raw = catalogueData as unknown as RawCatalogue;
  const threads: Thread[] = raw.threads.map((t) => ({
    id: t.id,
    brandId: t.brandId,
    reference: t.reference,
    name: t.name,
    hex: t.hex,
    rgb: [t.rgb[0] ?? 0, t.rgb[1] ?? 0, t.rgb[2] ?? 0],
    provenance: t.provenance === 'mapped' ? 'mapped' : 'measured',
    // The owner map carries no retirement data; everything it lists is
    // treated as current. Retired records enter only via a user's own
    // saved palette or inventory referencing a thread this catalogue no
    // longer has (see `unresolvedThread`).
    status: 'current',
    mappedFrom: t.mappedFrom,
  }));
  const brands: Brand[] = raw.brands.map((b) => ({
    id: b.id,
    name: b.name,
    provenance: b.provenance === 'mapped' ? 'mapped' : 'measured',
    note: b.note,
  }));
  cached = {
    brands,
    threads,
    byId: new Map(threads.map((t) => [t.id, t])),
  };
  return cached;
}

/**
 * A placeholder for a thread id the catalogue no longer knows — a
 * palette or inventory record that survived a catalogue change.
 *
 * User data is never silently dropped (M7-INV-01/M7-PAL-01): the record
 * stays visible as `unresolved`, carrying whatever last-known display
 * data was saved with it, and is excluded from conversion until the
 * user explicitly permits or substitutes it.
 */
export function unresolvedThread(
  id: string,
  snapshot?: { name?: string; hex?: string; rgb?: [number, number, number] },
): Thread {
  const colon = id.indexOf(':');
  const brandId = colon === -1 ? 'unknown' : id.slice(0, colon);
  const reference = colon === -1 ? id : id.slice(colon + 1);
  return {
    id,
    brandId,
    reference,
    name: snapshot?.name ?? reference,
    hex: snapshot?.hex ?? '#000000',
    rgb: snapshot?.rgb ?? [0, 0, 0],
    provenance: 'mapped',
    status: 'unresolved',
    mappedFrom: null,
  };
}

/** Look up a brand by id, or `undefined` if this build has no such brand. */
export function findBrand(
  catalogue: ThreadCatalogue,
  brandId: string,
): Brand | undefined {
  return catalogue.brands.find((b) => b.id === brandId);
}

/**
 * Threads of the enabled brands in **deterministic union order**:
 * enabled-brand order first, catalogue order within each brand, and no
 * RGB de-duplication (M7-BRAND-02). Order matters beyond presentation —
 * it is the nearest-match tie-break and it is baked into every LUT.
 *
 * Unknown brand ids contribute nothing rather than throwing: a project
 * saved against a catalogue this build does not have must still open.
 */
export function threadsForBrands(
  catalogue: ThreadCatalogue,
  brandIds: readonly string[],
): Thread[] {
  const out: Thread[] = [];
  for (const brandId of brandIds) {
    for (const thread of catalogue.threads) {
      if (thread.brandId === brandId) out.push(thread);
    }
  }
  return out;
}
