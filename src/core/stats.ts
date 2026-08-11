/**
 * Design statistics (§11 subset), computed from an OUTPUT buffer
 * (post-reduction).
 *
 * Counting keys on the palette-index sidecar when the buffer carries
 * one, and falls back to RGB otherwise. That distinction is the whole
 * of M7-BRAND-01 at this layer: once two brands can hold the same
 * display colour, "which thread is this stitch?" has no answer in the
 * pixels. With a sidecar the answer is the one the mapper actually
 * chose; without one (full-RGB mode, or `reduce-first`, where the
 * resize after the colour stage puts the output off-palette anyway —
 * D49) each distinct RGB is reported as an unnamed colour.
 *
 * Empty stitches: alpha below 50 % (< 128 of 255) renders as fabric
 * and is excluded from colour counts (D9). Physical dimensions,
 * thread length and skein estimates are post-MVP (§11 remainder).
 */

import { EMPTY_INDEX, type Palette, type PixelBuffer, type Thread } from './types.ts';

/** Usage of one colour within a design. */
export interface ColorUsage {
  rgb: [number, number, number];
  /** Lowercase #rrggbb. */
  hex: string;
  /** Stitches in this colour. */
  count: number;
  /** Share of NON-EMPTY stitches, 0–100. */
  percent: number;
  /** The thread, when the buffer identified one. */
  thread?: Thread;
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
  /**
   * True when counts came from the palette-index sidecar, so each row
   * names the thread the mapper chose rather than one that happens to
   * share its RGB.
   */
  identified: boolean;
}

/**
 * Alpha at or above this counts as a stitch (50% of 255, D9). Exported
 * so the chart's symbol pass keeps the same stitch/fabric boundary as
 * the counts it must agree with.
 */
export const STITCH_ALPHA = 128;

function toHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Descending count; hex then thread id for a total, stable order. */
function byUsage(a: ColorUsage, b: ColorUsage): number {
  if (b.count !== a.count) return b.count - a.count;
  if (a.hex !== b.hex) return a.hex < b.hex ? -1 : 1;
  return (a.thread?.id ?? '') < (b.thread?.id ?? '') ? -1 : 1;
}

/**
 * Count by palette index. Two entries sharing an RGB stay two rows,
 * because they are two threads to buy — the case RGB counting cannot
 * represent at all.
 */
function statsByIndex(
  buffer: PixelBuffer,
  indices: Uint16Array,
  palette: Palette,
): { perColor: ColorUsage[]; stitchCount: number } {
  const data = buffer.data;
  const counts = new Map<number, number>();
  let stitchCount = 0;
  for (let i = 0, cell = 0; i < data.length; i += 4, cell++) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    const entry = indices[cell] ?? EMPTY_INDEX;
    if (entry === EMPTY_INDEX) continue;
    stitchCount++;
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  const perColor: ColorUsage[] = [];
  for (const [entry, count] of counts) {
    const thread = palette.entries[entry];
    if (thread === undefined) continue;
    perColor.push({
      rgb: thread.rgb,
      hex: thread.hex,
      count,
      percent: stitchCount === 0 ? 0 : (count / stitchCount) * 100,
      thread,
    });
  }
  perColor.sort(byUsage);
  return { perColor, stitchCount };
}

/** Count by distinct output RGB — the pre-M7 behaviour, unchanged. */
function statsByColor(buffer: PixelBuffer): {
  perColor: ColorUsage[];
  stitchCount: number;
} {
  const data = buffer.data;
  const counts = new Map<number, number>();
  let stitchCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) < STITCH_ALPHA) continue;
    stitchCount++;
    const key =
      ((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const perColor: ColorUsage[] = [...counts.entries()].map(([key, count]) => {
    const rgb: [number, number, number] = [
      (key >> 16) & 255,
      (key >> 8) & 255,
      key & 255,
    ];
    return {
      rgb,
      hex: toHex(rgb[0], rgb[1], rgb[2]),
      count,
      percent: stitchCount === 0 ? 0 : (count / stitchCount) * 100,
    };
  });
  perColor.sort(byUsage);
  return { perColor, stitchCount };
}

/**
 * Compute stats for an output buffer.
 *
 * Pass the palette the buffer was reduced against to get thread
 * references. Without a palette — or without the sidecar — colours are
 * still counted, they just carry no reference.
 */
export function computeStats(buffer: PixelBuffer, palette?: Palette): DesignStats {
  const indices = buffer.indices;
  const identified = indices !== undefined && palette !== undefined;
  const { perColor, stitchCount } = identified
    ? statsByIndex(buffer, indices, palette)
    : statsByColor(buffer);

  const totalCells = buffer.width * buffer.height;
  return {
    width: buffer.width,
    height: buffer.height,
    totalCells,
    stitchCount,
    emptyCount: totalCells - stitchCount,
    colorCount: perColor.length,
    perColor,
    identified,
  };
}
