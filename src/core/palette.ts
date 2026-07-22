/**
 * Palette model + palette construction from the thread catalogue.
 *
 * A palette is an ordered set of catalogue threads. Building one is
 * pure list work; *choosing* which threads belong in it is the policy
 * layer's job (`palette-policy.ts`, `palette-selection.ts`).
 */

import { srgbToLab } from './color/convert.ts';
import { loadCatalogue, threadsForBrands } from './thread-catalogue.ts';
import type { Palette, Thread } from './types.ts';

/**
 * The built-in DMC palette (the catalogue's 489 DMC threads) — the
 * default single-brand palette and the one every pre-M7 project
 * file names.
 */
export function loadDmcPalette(): Palette {
  return { name: 'DMC', entries: threadsForBrands(loadCatalogue(), ['dmc']) };
}

/** A palette over an explicit ordered thread list. */
export function paletteOf(name: string, entries: readonly Thread[]): Palette {
  return { name, entries: [...entries] };
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

/** FNV-1a 32-bit, seeded so the two fingerprints below can share it. */
function fnv1a(hash: number, byte: number): number {
  return Math.imul(hash ^ byte, 0x01000193);
}

/**
 * **Colour** fingerprint of a palette: FNV-1a 32-bit over the entry RGB
 * triples **in order**, returned as 8 hex digits with the entry count
 * appended (`"1a2b3c4d-533"`).
 *
 * Order is part of the identity because anything keyed on this — the
 * worker's LUT cache above all — stores palette *indices*: two palettes
 * with the same colours in a different order produce different,
 * non-interchangeable results (D46).
 *
 * Thread identity is deliberately **excluded**, and that is safe
 * precisely because a LUT holds indices rather than references: index
 * `i` means "entry `i` of whichever palette you apply this with", so
 * two palettes that agree on ordered RGB can share derived colour maths
 * without either one ever being labelled with the other's threads
 * (M7-BRAND-02). For anything that carries identity across time — a
 * project's palette snapshot — use {@link paletteIdentityFingerprint}.
 */
export function paletteFingerprint(palette: Palette): string {
  const rgb = paletteRgb(palette);
  let hash = 0x811c9dc5;
  for (let i = 0; i < rgb.length; i++) hash = fnv1a(hash, rgb[i] ?? 0);
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${hex}-${String(palette.entries.length)}`;
}

/**
 * **Identity** fingerprint: FNV-1a over the entry thread ids in order.
 *
 * This is what detects library drift — a saved project against an
 * edited library palette — where two entries sharing an RGB but not a
 * reference must compare unequal (M7-PAL-01).
 */
export function paletteIdentityFingerprint(palette: Palette): string {
  let hash = 0x811c9dc5;
  for (const entry of palette.entries) {
    for (let i = 0; i < entry.id.length; i++) {
      hash = fnv1a(hash, entry.id.charCodeAt(i) & 255);
    }
    hash = fnv1a(hash, 0x1f);
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
