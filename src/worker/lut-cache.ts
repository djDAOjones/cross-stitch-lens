/**
 * Worker-side LUT cache: one LUT per palette+metric, rebuilt only
 * when either changes (architecture.md → "Colour reduction
 * strategy").
 *
 * Palette identity is the **content fingerprint** of its entries in
 * order, never its name: a LUT stores palette *indices*, so two
 * palettes that differ only in colour or in order are not
 * interchangeable — sharing one LUT between them renders the wrong
 * colours (D46). The key carries a schema version so a change to the
 * LUT's meaning invalidates old entries rather than reusing them.
 *
 * Two fill paths share the cache: `ensureLut` (async, GPU-first — the
 * worker awaits it before a frame that needs a LUT) and `getLut`
 * (sync TS build on miss — the executor's safety net). A GPU-built
 * LUT may differ from the TS build on near-ties (documented tolerance,
 * decision-log D41) but must otherwise be a plausible LUT; `ensureLut`
 * checks that before caching it.
 */

import { buildLutGpu } from '../backends/webgpu/reduce.ts';
import { buildCandidateTable, type CandidateTable } from '../core/color/candidates.ts';
import { buildLut, LUT_SIZE } from '../core/color/lut.ts';
import type { ColorMetric } from '../core/color/metrics.ts';
import { paletteFingerprint } from '../core/palette.ts';
import type { Palette } from '../core/types.ts';
import { log } from '../diagnostics/log.ts';

/**
 * Bumped when the LUT's meaning changes (bin layout, metric
 * semantics), so stale entries can never be served across a change.
 */
const LUT_SCHEMA_VERSION = 1;

/**
 * Cache ceiling. Each LUT is 64 KB; live editing only ever cycles
 * between a handful of palettes, and user-defined palettes (post-MVP)
 * must not be able to grow this without bound.
 */
const MAX_ENTRIES = 8;

/** Insertion-ordered, so the oldest key is the first Map key (LRU). */
const cache = new Map<string, Uint16Array>();

/**
 * Hit/miss/eviction counters per cache (M13-PROF-02): a cache hit must
 * be provable by counters, never inferred from a fast time. Pure
 * diagnostics — nothing reads them on the frame path.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

const lutStats: CacheStats = { hits: 0, misses: 0, evictions: 0 };
const candidateStats: CacheStats = { hits: 0, misses: 0, evictions: 0 };

/** Snapshot of both caches' counters (copies — safe to hold). */
export function lutCacheStats(): { lut: CacheStats; candidates: CacheStats } {
  return { lut: { ...lutStats }, candidates: { ...candidateStats } };
}

/** Zero the counters (audits; never touches the cached entries). */
export function resetLutCacheStats(): void {
  lutStats.hits = 0;
  lutStats.misses = 0;
  lutStats.evictions = 0;
  candidateStats.hits = 0;
  candidateStats.misses = 0;
  candidateStats.evictions = 0;
}

/** Cache key for a palette+metric pair: content, not name. */
function keyFor(palette: Palette, metric: ColorMetric): string {
  return `v${String(LUT_SCHEMA_VERSION)}:${paletteFingerprint(palette)}:${metric}`;
}

/** Store a LUT, evicting the least recently used entry past the cap. */
function store(key: string, lut: Uint16Array): void {
  cache.delete(key);
  cache.set(key, lut);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (oldest.done === true) break;
    cache.delete(oldest.value);
    lutStats.evictions++;
  }
}

/** Read a LUT and mark it most recently used. */
function touch(key: string): Uint16Array | undefined {
  const hit = cache.get(key);
  if (hit === undefined) {
    lutStats.misses++;
    return undefined;
  }
  lutStats.hits++;
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

/**
 * Reject a GPU LUT that cannot be a nearest-colour mapping: an index
 * past the palette, or a single index covering all 32,768 bins for a
 * multi-entry palette. Both are what a silently-failed kernel returns
 * (a zero-filled buffer reads back as a well-formed all-zeros LUT),
 * and the cost is one linear scan per palette change — cheap insurance
 * against a failure mode the user sees as a solid-colour design.
 */
function isPlausibleLut(lut: Uint16Array, paletteSize: number): boolean {
  if (lut.length !== LUT_SIZE) return false;
  const first = lut[0] ?? 0;
  let distinct = false;
  for (let i = 0; i < lut.length; i++) {
    const index = lut[i] ?? 0;
    if (index >= paletteSize) return false;
    if (index !== first) distinct = true;
  }
  return paletteSize === 1 || distinct;
}

/**
 * Ensure the LUT for a palette+metric is cached, building on the GPU
 * where available (32,768 bins × palette size — the expensive part of
 * a palette/metric change) and falling back to the sync TS build.
 */
export async function ensureLut(
  palette: Palette,
  metric: ColorMetric,
): Promise<Uint16Array> {
  const key = keyFor(palette, metric);
  const hit = touch(key);
  if (hit) return hit;
  const gpuLut = await buildLutGpu(palette, metric);
  if (gpuLut !== null) {
    if (isPlausibleLut(gpuLut, palette.entries.length)) {
      log.info('webgpu', 'LUT built on gpu', { key });
      store(key, gpuLut);
      return gpuLut;
    }
    log.error('webgpu', 'gpu LUT failed the sanity check — falling back to ts', { key });
  }
  return getLut(palette, metric);
}

/** Get (building on miss) the LUT for a palette+metric. */
export function getLut(palette: Palette, metric: ColorMetric): Uint16Array {
  const key = keyFor(palette, metric);
  const hit = touch(key);
  if (hit) return hit;
  const lut = buildLut(palette, metric);
  store(key, lut);
  return lut;
}

/** Number of cached LUTs (diagnostics: LUT rebuild count). */
export function lutCacheSize(): number {
  return cache.size;
}

/**
 * Candidate tables, keyed the same way as LUTs but without the metric:
 * pruning exists only for 'lab' (M5-PERF-22). Kept in a separate map so
 * the two structures evict independently — a table is ~20–35× the size
 * of a LUT, so a shared cap would be wrong for both.
 */
const candidateCache = new Map<string, CandidateTable>();

/**
 * Lower cap than the LUT cache: 1.3 MB (64 colours) to 2.3 MB (533),
 * against a LUT's 64 KB. Live editing cycles between a couple of
 * palettes, so two is enough to avoid a rebuild when toggling.
 */
const MAX_CANDIDATE_ENTRIES = 2;

/**
 * Get (building on miss) the Lab candidate table for a palette.
 *
 * The build is O(32,768 × palette size) — the same order as a LUT
 * build, and far too slow for the frame path, which is the whole reason
 * it is cached here rather than derived inside the dither stage.
 */
export function getCandidates(palette: Palette): CandidateTable {
  const key = keyFor(palette, 'lab');
  const hit = candidateCache.get(key);
  if (hit) {
    candidateStats.hits++;
    candidateCache.delete(key);
    candidateCache.set(key, hit);
    return hit;
  }
  candidateStats.misses++;
  const table = buildCandidateTable(palette);
  candidateCache.set(key, table);
  while (candidateCache.size > MAX_CANDIDATE_ENTRIES) {
    const oldest = candidateCache.keys().next();
    if (oldest.done === true) break;
    candidateCache.delete(oldest.value);
    candidateStats.evictions++;
  }
  log.info('lut-cache', 'candidate table built', {
    key,
    entries: table.candidates.length,
  });
  return table;
}

/** Number of cached candidate tables (diagnostics). */
export function candidateCacheSize(): number {
  return candidateCache.size;
}

/** Drop all cached LUTs and candidate tables (tests; palette editing). */
export function clearLutCache(): void {
  cache.clear();
  candidateCache.clear();
}
