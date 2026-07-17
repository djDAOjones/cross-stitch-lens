/**
 * Worker-side LUT cache: one LUT per palette+metric, rebuilt only
 * when either changes (architecture.md → "Colour reduction
 * strategy"). Palette identity is keyed by name + entry count — a
 * palette edit must present a new name (user palettes are post-MVP).
 */

import { buildLut } from '../core/color/lut.ts';
import type { ColorMetric } from '../core/color/metrics.ts';
import type { Palette } from '../core/types.ts';

const cache = new Map<string, Uint16Array>();

/** Cache key for a palette+metric pair. */
function keyFor(palette: Palette, metric: ColorMetric): string {
  return `${palette.name}:${String(palette.entries.length)}:${metric}`;
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
