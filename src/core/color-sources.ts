/**
 * Non-thread colour sources (M15-CORE-01, D114): the six generated
 * colour maps, the `map:` / `user:` identity namespaces, and the
 * embedded CSS colour-name table.
 *
 * Entries are Thread-shaped records — the D55/D56 identity rule
 * applied to non-threads: identity is the id string, RGB is display
 * data, and nothing merges two entries because their colours match.
 * They are never mixed into the thread catalogue; composition happens
 * at profile resolution (M15-CORE-02).
 *
 * Identity grammar:
 * - Map entry ids read `map:<mapId>:<code>` (`brandId` is
 *   `map:<mapId>`, `reference` is the code — hex for computed maps, a
 *   stable name where the map defines one).
 * - User colours read `user:<id>`.
 * - Both prefixes are reserved: a real brand id can never begin a
 *   synthetic id, which {@link isSyntheticId} and the catalogue guard
 *   test pin.
 *
 * Everything here is pure and deterministic — same call, same table,
 * always (engine-purity rules apply; no I/O, no randomness).
 */

import type { Thread } from './types.ts';

/** Reserved identity prefixes that can never be brand ids. */
export const RESERVED_NAMESPACES = ['map', 'user'] as const;

/** True for any synthetic (non-thread) identity. */
export function isSyntheticId(id: string): boolean {
  return id.startsWith('map:') || id.startsWith('user:');
}

/** The six v1 maps (D114 — 4-bit/channel deliberately skipped). */
export const COLOR_MAP_IDS = ['bw', 'grey4', 'rgb1', 'retro16', 'rgb2', 'websafe'] as const;

export type ColorMapId = (typeof COLOR_MAP_IDS)[number];

/** A generated colour map: an ordered set of Thread-shaped entries. */
export interface ColorMap {
  id: ColorMapId;
  /** Display name, e.g. `"Web-safe"`. */
  name: string;
  entries: Thread[];
}

/** `#rrggbb` (lowercase, house style) from 0–255 channels. */
function hexOf(r: number, g: number, b: number): string {
  const part = (v: number): string => v.toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Uppercase no-hash hex code, the computed-map reference form. */
function codeOf(r: number, g: number, b: number): string {
  return hexOf(r, g, b).slice(1).toUpperCase();
}

/** Build one Thread-shaped map entry. Name = exact CSS match or hex. */
function mapEntry(
  mapId: ColorMapId,
  code: string,
  rgb: [number, number, number],
): Thread {
  const hex = hexOf(rgb[0], rgb[1], rgb[2]);
  return {
    id: `map:${mapId}:${code}`,
    brandId: `map:${mapId}`,
    reference: code,
    // Exact-match naming only (the lime/green rule): a map colour
    // with no exact CSS name displays as its hex, never a guess.
    name: colorName(hex) ?? hex,
    hex,
    rgb,
    // Generated values are definitional — nothing was sampled.
    provenance: 'measured',
    status: 'current',
    mappedFrom: null,
  };
}

/**
 * Generate one map. Deterministic: entry order is part of the map's
 * identity (D46 — ordered tables are what LUT keys fingerprint).
 */
export function generateColorMap(id: ColorMapId): ColorMap {
  switch (id) {
    case 'bw':
      return {
        id,
        name: 'Black & white',
        entries: [mapEntry(id, 'black', [0, 0, 0]), mapEntry(id, 'white', [255, 255, 255])],
      };
    case 'grey4': {
      // Four even greys, dark → light; computed, so hex codes.
      const levels = [0, 85, 170, 255];
      return {
        id,
        name: 'Greys',
        entries: levels.map((v) => mapEntry(id, codeOf(v, v, v), [v, v, v])),
      };
    }
    case 'rgb1': {
      // The eight 1-bit corners. Codes are the traditional corner
      // names (stable identity); display names resolve by exact CSS
      // match, so #00ff00 shows "Lime" while its code stays "green".
      const corners: [string, [number, number, number]][] = [
        ['black', [0, 0, 0]],
        ['red', [255, 0, 0]],
        ['green', [0, 255, 0]],
        ['blue', [0, 0, 255]],
        ['cyan', [0, 255, 255]],
        ['magenta', [255, 0, 255]],
        ['yellow', [255, 255, 0]],
        ['white', [255, 255, 255]],
      ];
      return {
        id,
        name: '1-bit RGB',
        entries: corners.map(([code, rgb]) => mapEntry(id, code, rgb)),
      };
    }
    case 'retro16': {
      // The classic 16 — the HTML4/VGA named set, in VGA index order
      // (0–15). Every value has an exact CSS name by construction.
      const classic: [string, [number, number, number]][] = [
        ['black', [0, 0, 0]],
        ['navy', [0, 0, 128]],
        ['green', [0, 128, 0]],
        ['teal', [0, 128, 128]],
        ['maroon', [128, 0, 0]],
        ['purple', [128, 0, 128]],
        ['olive', [128, 128, 0]],
        ['silver', [192, 192, 192]],
        ['gray', [128, 128, 128]],
        ['blue', [0, 0, 255]],
        ['lime', [0, 255, 0]],
        ['aqua', [0, 255, 255]],
        ['red', [255, 0, 0]],
        ['fuchsia', [255, 0, 255]],
        ['yellow', [255, 255, 0]],
        ['white', [255, 255, 255]],
      ];
      return {
        id,
        name: 'Retro 16',
        entries: classic.map(([code, rgb]) => mapEntry(id, code, rgb)),
      };
    }
    case 'rgb2': {
      // 2 bits per channel: 4 levels ³ = 64, R-major ascending.
      const levels = [0, 85, 170, 255];
      const entries: Thread[] = [];
      for (const r of levels) {
        for (const g of levels) {
          for (const b of levels) {
            entries.push(mapEntry(id, codeOf(r, g, b), [r, g, b]));
          }
        }
      }
      return { id, name: '2-bit RGB', entries };
    }
    case 'websafe': {
      // The 216 web-safe values: 6 levels ³, R-major ascending.
      const levels = [0, 51, 102, 153, 204, 255];
      const entries: Thread[] = [];
      for (const r of levels) {
        for (const g of levels) {
          for (const b of levels) {
            entries.push(mapEntry(id, codeOf(r, g, b), [r, g, b]));
          }
        }
      }
      return { id, name: 'Web-safe', entries };
    }
  }
}

/** All six maps, generated in the canonical order. */
export function allColorMaps(): ColorMap[] {
  return COLOR_MAP_IDS.map((id) => generateColorMap(id));
}

/**
 * Build a user colour as a Thread-shaped record (`user:<id>`). The
 * caller owns id generation and persistence (M15-PERSIST-01) — core
 * only shapes the record and names it honestly.
 */
export function userColor(id: string, rgb: [number, number, number]): Thread {
  const hex = hexOf(rgb[0], rgb[1], rgb[2]);
  return {
    id: `user:${id}`,
    brandId: 'user',
    reference: id,
    name: colorName(hex) ?? hex,
    hex,
    rgb,
    provenance: 'measured',
    status: 'current',
    mappedFrom: null,
  };
}

/**
 * Provenance-honest display label for a synthetic entry, or null for
 * a real thread (threads keep manufacturer identity — D55). Usable by
 * lists and export keys: "Web-safe #cc0033", "Retro 16 Lime",
 * "Custom — Crimson".
 */
export function nonThreadLabel(entry: Pick<Thread, 'id' | 'brandId' | 'name'>): string | null {
  if (entry.brandId === 'user') return `Custom — ${entry.name}`;
  if (entry.brandId.startsWith('map:')) {
    const mapId = entry.brandId.slice('map:'.length);
    const map = COLOR_MAP_IDS.find((id) => id === mapId);
    const mapName = map === undefined ? mapId : generateColorMap(map).name;
    return `${mapName} ${entry.name}`;
  }
  return null;
}

/**
 * The CSS/X11 named colours (Level 4 list), keyed by hex. Public
 * standard data embedded as a code constant (D114 — not owner data,
 * not a protected file, no dependency). Where the standard defines
 * alias pairs for one value (aqua/cyan, fuchsia/magenta, the
 * gray/grey pairs), one display name is kept: cyan and magenta win,
 * and grey is spelt UK-style — display copy follows the app's UK
 * English; identity codes elsewhere keep the CSS spelling.
 */
const CSS_COLOR_NAMES = new Map<string, string>([
  ['#f0f8ff', 'Alice blue'],
  ['#faebd7', 'Antique white'],
  ['#7fffd4', 'Aquamarine'],
  ['#f0ffff', 'Azure'],
  ['#f5f5dc', 'Beige'],
  ['#ffe4c4', 'Bisque'],
  ['#000000', 'Black'],
  ['#ffebcd', 'Blanched almond'],
  ['#0000ff', 'Blue'],
  ['#8a2be2', 'Blue violet'],
  ['#a52a2a', 'Brown'],
  ['#deb887', 'Burlywood'],
  ['#5f9ea0', 'Cadet blue'],
  ['#7fff00', 'Chartreuse'],
  ['#d2691e', 'Chocolate'],
  ['#ff7f50', 'Coral'],
  ['#6495ed', 'Cornflower blue'],
  ['#fff8dc', 'Cornsilk'],
  ['#dc143c', 'Crimson'],
  ['#00ffff', 'Cyan'],
  ['#00008b', 'Dark blue'],
  ['#008b8b', 'Dark cyan'],
  ['#b8860b', 'Dark goldenrod'],
  ['#a9a9a9', 'Dark grey'],
  ['#006400', 'Dark green'],
  ['#bdb76b', 'Dark khaki'],
  ['#8b008b', 'Dark magenta'],
  ['#556b2f', 'Dark olive green'],
  ['#ff8c00', 'Dark orange'],
  ['#9932cc', 'Dark orchid'],
  ['#8b0000', 'Dark red'],
  ['#e9967a', 'Dark salmon'],
  ['#8fbc8f', 'Dark sea green'],
  ['#483d8b', 'Dark slate blue'],
  ['#2f4f4f', 'Dark slate grey'],
  ['#00ced1', 'Dark turquoise'],
  ['#9400d3', 'Dark violet'],
  ['#ff1493', 'Deep pink'],
  ['#00bfff', 'Deep sky blue'],
  ['#696969', 'Dim grey'],
  ['#1e90ff', 'Dodger blue'],
  ['#b22222', 'Firebrick'],
  ['#fffaf0', 'Floral white'],
  ['#228b22', 'Forest green'],
  ['#dcdcdc', 'Gainsboro'],
  ['#f8f8ff', 'Ghost white'],
  ['#ffd700', 'Gold'],
  ['#daa520', 'Goldenrod'],
  ['#808080', 'Grey'],
  ['#008000', 'Green'],
  ['#adff2f', 'Green yellow'],
  ['#f0fff0', 'Honeydew'],
  ['#ff69b4', 'Hot pink'],
  ['#cd5c5c', 'Indian red'],
  ['#4b0082', 'Indigo'],
  ['#fffff0', 'Ivory'],
  ['#f0e68c', 'Khaki'],
  ['#e6e6fa', 'Lavender'],
  ['#fff0f5', 'Lavender blush'],
  ['#7cfc00', 'Lawn green'],
  ['#fffacd', 'Lemon chiffon'],
  ['#add8e6', 'Light blue'],
  ['#f08080', 'Light coral'],
  ['#e0ffff', 'Light cyan'],
  ['#fafad2', 'Light goldenrod yellow'],
  ['#d3d3d3', 'Light grey'],
  ['#90ee90', 'Light green'],
  ['#ffb6c1', 'Light pink'],
  ['#ffa07a', 'Light salmon'],
  ['#20b2aa', 'Light sea green'],
  ['#87cefa', 'Light sky blue'],
  ['#778899', 'Light slate grey'],
  ['#b0c4de', 'Light steel blue'],
  ['#ffffe0', 'Light yellow'],
  ['#00ff00', 'Lime'],
  ['#32cd32', 'Lime green'],
  ['#faf0e6', 'Linen'],
  ['#ff00ff', 'Magenta'],
  ['#800000', 'Maroon'],
  ['#66cdaa', 'Medium aquamarine'],
  ['#0000cd', 'Medium blue'],
  ['#ba55d3', 'Medium orchid'],
  ['#9370db', 'Medium purple'],
  ['#3cb371', 'Medium sea green'],
  ['#7b68ee', 'Medium slate blue'],
  ['#00fa9a', 'Medium spring green'],
  ['#48d1cc', 'Medium turquoise'],
  ['#c71585', 'Medium violet red'],
  ['#191970', 'Midnight blue'],
  ['#f5fffa', 'Mint cream'],
  ['#ffe4e1', 'Misty rose'],
  ['#ffe4b5', 'Moccasin'],
  ['#ffdead', 'Navajo white'],
  ['#000080', 'Navy'],
  ['#fdf5e6', 'Old lace'],
  ['#808000', 'Olive'],
  ['#6b8e23', 'Olive drab'],
  ['#ffa500', 'Orange'],
  ['#ff4500', 'Orange red'],
  ['#da70d6', 'Orchid'],
  ['#eee8aa', 'Pale goldenrod'],
  ['#98fb98', 'Pale green'],
  ['#afeeee', 'Pale turquoise'],
  ['#db7093', 'Pale violet red'],
  ['#ffefd5', 'Papaya whip'],
  ['#ffdab9', 'Peach puff'],
  ['#cd853f', 'Peru'],
  ['#ffc0cb', 'Pink'],
  ['#dda0dd', 'Plum'],
  ['#b0e0e6', 'Powder blue'],
  ['#800080', 'Purple'],
  ['#663399', 'Rebecca purple'],
  ['#ff0000', 'Red'],
  ['#bc8f8f', 'Rosy brown'],
  ['#4169e1', 'Royal blue'],
  ['#8b4513', 'Saddle brown'],
  ['#fa8072', 'Salmon'],
  ['#f4a460', 'Sandy brown'],
  ['#2e8b57', 'Sea green'],
  ['#fff5ee', 'Seashell'],
  ['#a0522d', 'Sienna'],
  ['#c0c0c0', 'Silver'],
  ['#87ceeb', 'Sky blue'],
  ['#6a5acd', 'Slate blue'],
  ['#708090', 'Slate grey'],
  ['#fffafa', 'Snow'],
  ['#00ff7f', 'Spring green'],
  ['#4682b4', 'Steel blue'],
  ['#d2b48c', 'Tan'],
  ['#008080', 'Teal'],
  ['#d8bfd8', 'Thistle'],
  ['#ff6347', 'Tomato'],
  ['#40e0d0', 'Turquoise'],
  ['#ee82ee', 'Violet'],
  ['#f5deb3', 'Wheat'],
  ['#ffffff', 'White'],
  ['#f5f5f5', 'White smoke'],
  ['#ffff00', 'Yellow'],
  ['#9acd32', 'Yellow green'],
]);

/**
 * Exact-match colour name (`#rrggbb`, case-insensitive) or null.
 * Never nearest-guess (v1 rule): CSS "Green" is #008000, so #00ff00
 * answers "Lime" and #00fe00 answers null.
 */
export function colorName(hex: string): string | null {
  return CSS_COLOR_NAMES.get(hex.toLowerCase()) ?? null;
}

/** Number of named entries — exposed for the table's own tests. */
export function colorNameCount(): number {
  return CSS_COLOR_NAMES.size;
}
