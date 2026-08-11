/**
 * Thread-key assembly for the export artefacts.
 *
 * Extracted from `main.ts` at EXPORT-01 (D153) so the artefact suite can
 * drive the **real** assembly rather than a copy of it. A test that
 * reimplements the thing it is testing proves only that two copies
 * agree, which is the same failure mode that let KEY-01 ship: a green
 * unit test over a fixture the production path never produces.
 *
 * Pure and DOM-free, so it runs under Node beside `buildChartPdf`.
 */

import { computeStats } from '../core/stats.ts';
import { nonThreadLabel } from '../core/color-sources.ts';
import type { Palette, PixelBuffer } from '../core/types.ts';
import type { KeyEntry } from './pdf.ts';

/** Brand id → display name, for the key's manufacturer column. */
export type BrandNames = ReadonlyMap<string, string>;

/**
 * Build the chart/PDF thread key for a finished frame.
 *
 * Full-RGB mode (`palette === null`) has no key: there is nothing to
 * buy, so the export says nothing rather than inventing references.
 *
 * Non-thread entries keep provenance-honest labels (D114) — a row with
 * nothing to buy says so ("Web-safe Lime", "Custom — Crimson") and
 * never shows a raw namespace id. Real threads carry brand **and**
 * reference together: a key that says "310" without saying whose sends
 * the stitcher to the wrong shelf (M7-BRAND-02).
 */
export function buildKeyEntries(
  frame: PixelBuffer,
  palette: Palette | null,
  brandNames: BrandNames,
): KeyEntry[] {
  if (palette === null) return [];
  return computeStats(frame, palette).perColor.map((c) => {
    if (c.thread === undefined) return { hex: c.hex, rgb: c.rgb };
    const synthetic = nonThreadLabel(c.thread);
    if (synthetic !== null) {
      return { hex: c.hex, rgb: c.rgb, brand: synthetic, reference: '' };
    }
    return {
      hex: c.hex,
      rgb: c.rgb,
      brand: brandNames.get(c.thread.brandId) ?? c.thread.brandId,
      reference: c.thread.reference,
    };
  });
}
