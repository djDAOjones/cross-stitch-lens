/**
 * Worker-side LUT cache: one LUT per palette+metric, rebuilt only
 * when either changes (architecture.md → "Colour reduction
 * strategy"). Palette identity is keyed by name + entry count — a
 * palette edit must present a new name (user palettes are post-MVP).
 *
 * Two fill paths share the cache: `ensureLut` (async, GPU-first — the
 * worker awaits it before a frame that needs a LUT) and `getLut`
 * (sync TS build on miss — the executor's safety net). A GPU-built
 * LUT may differ from the TS build on near-ties (documented tolerance,
 * decision-log D41).
 */

import { buildLutGpu } from '../backends/webgpu/reduce.ts';
import { buildLut } from '../core/color/lut.ts';
import type { ColorMetric } from '../core/color/metrics.ts';
import type { Palette } from '../core/types.ts';
import { log } from '../diagnostics/log.ts';

const cache = new Map<string, Uint16Array>();

/** Cache key for a palette+metric pair. */
function keyFor(palette: Palette, metric: ColorMetric): string {
  return `${palette.name}:${String(palette.entries.length)}:${metric}`;
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
  const hit = cache.get(key);
  if (hit) return hit;
  const gpuLut = await buildLutGpu(palette, metric);
  if (gpuLut !== null) {
    log.info('webgpu', 'LUT built on gpu', { key });
    cache.set(key, gpuLut);
    return gpuLut;
  }
  return getLut(palette, metric);
}

/** Get (building on miss) the LUT for a palette+metric. */
export function getLut(palette: Palette, metric: ColorMetric): Uint16Array {
  const key = keyFor(palette, metric);
  const hit = cache.get(key);
  if (hit) return hit;
  const lut = buildLut(palette, metric);
  cache.set(key, lut);
  return lut;
}

/** Number of cached LUTs (diagnostics: LUT rebuild count). */
export function lutCacheSize(): number {
  return cache.size;
}

/** Drop all cached LUTs (tests; palette-editing flows later). */
export function clearLutCache(): void {
  cache.clear();
}
