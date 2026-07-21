#!/usr/bin/env node
// @ts-check

/**
 * build-palette.mjs — derive the thread catalogue the engine ships from
 * the owner-supplied thread list.
 *
 * Source (owner data, do not hand-edit):
 *   src/core/palettes/thread-list.csv   (columns: brand,code,name,hex)
 * Output (generated, do not hand-edit — re-run this script):
 *   src/core/palettes/catalogue.json    the multi-brand thread catalogue
 *
 * Supersedes `dmc-anchor-map.csv` (decision-log D10/D55): that file was a
 * DMC→Anchor *cross-reference*, so its Anchor colours were mapped DMC
 * values rather than Anchor measurements. `thread-list.csv` carries each
 * brand's own colours, so every record here is `provenance: "measured"`.
 * The `mapped` provenance stays in the model for the cross-reference
 * data (`thread-map-proposed.csv`) when it arrives.
 *
 * Rules:
 *  - Identity is `brandId:reference`, and threads are NEVER merged on
 *    colour. 3,338 threads share only 2,830 distinct hex values, so
 *    de-duplicating by RGB would silently delete ~500 real, buyable
 *    threads.
 *  - Three brands repeat their own name inside the code column
 *    ("Anchor 403"); the brand is already its own field, so the prefix
 *    is stripped — otherwise every label reads "Anchor Anchor 403".
 *  - Rows without a valid #rrggbb hex are skipped and counted.
 *  - Names are kept verbatim (owner data; typos are not fixed).
 *
 * Deterministic: no timestamps, stable ordering (brands alphabetically
 * by id, threads in source order within a brand), so re-running on an
 * unchanged CSV yields an identical file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', 'src', 'core', 'palettes');
const SRC = resolve(DIR, 'thread-list.csv');
const OUT = resolve(DIR, 'catalogue.json');

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Convert a `#rrggbb` string to an `[r, g, b]` triple (0-255).
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Stable lowercase brand id from its display name.
 * @param {string} name
 */
function brandId(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Drop a redundant leading brand name from a catalogue reference.
 * "Anchor 403" → "403"; "3808" is left alone.
 * @param {string} code
 * @param {string} brand
 */
function normaliseReference(code, brand) {
  const prefix = `${brand.trim().toLowerCase()} `;
  const trimmed = code.trim();
  return trimmed.toLowerCase().startsWith(prefix)
    ? trimmed.slice(prefix.length).trim()
    : trimmed;
}

function main() {
  const raw = readFileSync(SRC, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  const [header, ...rows] = lines;
  if (!/^brand,code,name,hex/i.test(header)) {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  /** @type {Map<string, {id: string, name: string}>} */
  const brands = new Map();
  /** @type {{id: string, brandId: string, reference: string, name: string, hex: string, rgb: [number, number, number], provenance: string, mappedFrom: null}[]} */
  const threads = [];
  const seen = new Set();
  let skipped = 0;
  let duplicates = 0;

  for (const line of rows) {
    const parts = line.split(',');
    const brand = parts[0]?.trim();
    const code = parts[1]?.trim();
    // Name is taken as the remainder so a future comma in a name does
    // not silently shift the hex column into it.
    const name = parts.slice(2, -1).join(',').trim();
    const hex = parts[parts.length - 1]?.trim().toLowerCase();
    if (!brand || !code || !hex || !HEX_RE.test(hex)) {
      skipped++;
      continue;
    }
    const id = brandId(brand);
    const reference = normaliseReference(code, brand);
    const threadKey = `${id}:${reference}`;
    if (seen.has(threadKey)) {
      duplicates++;
      continue;
    }
    seen.add(threadKey);
    if (!brands.has(id)) brands.set(id, { id, name: brand.trim() });
    threads.push({
      id: threadKey,
      brandId: id,
      reference,
      name,
      hex,
      rgb: toRgb(hex),
      provenance: 'measured',
      mappedFrom: null,
    });
  }

  // Brands alphabetically by id; threads grouped by brand in source
  // order. Source order is meaningful here — the list arrives sorted by
  // colour — and palette order is the nearest-match tie-break, so it is
  // preserved rather than re-sorted.
  const brandList = [...brands.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const ordered = brandList.flatMap(({ id }) => threads.filter((t) => t.brandId === id));

  const catalogue = {
    schemaVersion: 2,
    source: 'src/core/palettes/thread-list.csv',
    generatedBy: 'scripts/build-palette.mjs',
    brands: brandList.map(({ id, name }) => ({
      id,
      name,
      provenance: 'measured',
      note: `Colours and names as supplied for ${name}.`,
    })),
    counts: {
      rows: rows.length,
      skipped,
      duplicates,
      brands: brandList.length,
      threads: ordered.length,
      distinctColours: new Set(ordered.map((t) => t.hex)).size,
    },
    threads: ordered,
  };

  writeFileSync(OUT, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(
    `build-palette: ${ordered.length} threads across ${brandList.length} brands ` +
      `(${catalogue.counts.distinctColours} distinct colours, ${skipped} skipped, ` +
      `${duplicates} duplicate references)`,
  );
}

main();
