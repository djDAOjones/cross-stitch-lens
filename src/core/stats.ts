/**
 * Design statistics (§11 subset): counts computed from an OUTPUT
 * buffer (post-reduction), so each distinct RGB is a thread colour.
 *
 * Empty stitches: alpha below 50% (< 128 of 255) renders as fabric
 * and is excluded from colour counts (D9). Physical dimensions,
 * thread length and skein estimates are post-MVP (§11 remainder).
 */

import type { Palette, PixelBuffer } from './types.ts';

/** Usage of one colour within a design. */
export interface ColorUsage {
  rgb: [number, number, number];
  /** Lowercase #rrggbb. */
  hex: string;
  /** Stitches in this colour. */
  count: number;
  /** Share of NON-EMPTY stitches, 0–100. */
  percent: number;
  /** Thread reference when the colour is in the active palette. */
  code?: string;
  name?: string;
}

/** The §11 subset, computed in one pass. */
export interface DesignStats {
  width: number;
  height: number;
  /** width × height. */
  totalCells: number;
  /** Non-empty stitches (alpha ≥ 128). */
  stitchCount: number;
  /** Empty cells (alpha < 128) — render as fabric. */
  emptyCount: number;
  /** Distinct colours among non-empty stitches. */
  colorCount: number;
  /** Sorted by count, descending; ties by hex for determinism. */
  perColor: ColorUsage[];
}

/** Alpha at or above this counts as a stitch (50% of 255, D9). */
const STITCH_ALPHA = 128;

function toHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Compute stats for an output buffer. Pass the active palette to
 * attach thread references (code/name) to matching colours; colours
 * outside the palette (full-RGB mode) simply carry no reference.
 */
export function computeStats(
  buffer: PixelBuffer,
  palette?: Palette,
): DesignStats {
  const counts = new Map<number, number>();
  const data = buffer.data;
  let stitchCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    stitchCount++;
    const key =
      ((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const refByKey = new Map<number, { code: string; name: string }>();
  if (palette) {
    for (const entry of palette.entries) {
      const key = (entry.rgb[0] << 16) | (entry.rgb[1] << 8) | entry.rgb[2];
      if (!refByKey.has(key)) {
        refByKey.set(key, { code: entry.code, name: entry.name });
      }
    }
  }

  const perColor: ColorUsage[] = [...counts.entries()].map(([key, count]) => {
    const rgb: [number, number, number] = [
      (key >> 16) & 255,
      (key >> 8) & 255,
      key & 255,
    ];
    const ref = refByKey.get(key);
    return {
      rgb,
      hex: toHex(rgb[0], rgb[1], rgb[2]),
      count,
      percent: stitchCount === 0 ? 0 : (count / stitchCount) * 100,
      ...(ref ?? {}),
    };
  });
  perColor.sort((a, b) => b.count - a.count || (a.hex < b.hex ? -1 : 1));

  const totalCells = buffer.width * buffer.height;
  return {
    width: buffer.width,
    height: buffer.height,
    totalCells,
    stitchCount,
    emptyCount: totalCells - stitchCount,
    colorCount: counts.size,
    perColor,
  };
}
