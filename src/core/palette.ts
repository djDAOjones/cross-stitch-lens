/**
 * Palette model + the built-in DMC preset.
 *
 * The generated `palettes/dmc.json` (from the owner's thread map via
 * `scripts/build-palette.mjs`) is bundled as data — a build-time JSON
 * import, not I/O, so core purity holds. Do not hand-edit that file.
 */

import dmcData from './palettes/dmc.json';
import { srgbToLab } from './color/convert.ts';
import type { Palette, PaletteEntry } from './types.ts';

/** Shape of one generated dmc.json colour row. */
interface DmcColor {
  code: string;
  name: string;
  hex: string;
  rgb: number[];
  anchor: string | null;
}

/** The built-in DMC palette (533 colours from the owner thread map). */
export function loadDmcPalette(): Palette {
  const colors = (dmcData as { colors: DmcColor[] }).colors;
  const entries: PaletteEntry[] = colors.map((c) => ({
    code: c.code,
    name: c.name,
    hex: c.hex,
    rgb: [c.rgb[0] ?? 0, c.rgb[1] ?? 0, c.rgb[2] ?? 0],
    manufacturer: 'DMC',
  }));
  return { name: 'DMC', entries };
}

/**
 * Palette colours flattened to a typed array [r,g,b, r,g,b, …] for
 * hot loops (no per-pixel object access during matching).
 */
export function paletteRgb(palette: Palette): Uint8ClampedArray {
  const rgb = new Uint8ClampedArray(palette.entries.length * 3);
  palette.entries.forEach((entry, i) => {
    rgb[i * 3] = entry.rgb[0];
    rgb[i * 3 + 1] = entry.rgb[1];
    rgb[i * 3 + 2] = entry.rgb[2];
  });
  return rgb;
}

/**
 * Content fingerprint of a palette: FNV-1a 32-bit over the entry RGB
 * triples **in order**, returned as 8 hex digits with the entry count
 * appended (`"1a2b3c4d-533"`).
 *
 * Order is part of the identity because anything keyed on a palette —
 * the worker's LUT cache above all — stores palette *indices*: two
 * palettes with the same colours in a different order produce
 * different, non-interchangeable results (D46). Name is deliberately
 * excluded: identical colours in identical order are the same palette
 * whatever it is called.
 */
export function paletteFingerprint(palette: Palette): string {
  const rgb = paletteRgb(palette);
  let hash = 0x811c9dc5;
  for (let i = 0; i < rgb.length; i++) {
    hash ^= rgb[i] ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${hex}-${String(palette.entries.length)}`;
}

/**
 * Palette colours converted to Lab [L,a,b, …] (D65, L 0–100).
 * Computed once per palette/metric change, reused across the LUT
 * build and exact matching.
 */
export function paletteLab(palette: Palette): Float32Array {
  const rgb = paletteRgb(palette);
  const lab = new Float32Array(palette.entries.length * 3);
  for (let i = 0; i < palette.entries.length; i++) {
    srgbToLab(rgb[i * 3] ?? 0, rgb[i * 3 + 1] ?? 0, rgb[i * 3 + 2] ?? 0, lab, i * 3);
  }
  return lab;
}
