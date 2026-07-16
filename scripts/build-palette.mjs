#!/usr/bin/env node
// @ts-check

/**
 * build-palette.mjs — derive the thread palette JSON the engine ships
 * from the owner-supplied DMC/Anchor lookup CSV.
 *
 * Source (owner data, do not hand-edit):
 *   src/core/palettes/dmc-anchor-map.csv  (columns: DMC,Anchor,Hex,Description)
 * Output (generated, do not hand-edit — re-run this script):
 *   src/core/palettes/dmc.json
 *
 * Rules (see decision-log D10):
 *  - One entry per unique DMC code; first occurrence wins (the CSV is a
 *    DMC<->Anchor map, so each DMC repeats once per Anchor equivalent).
 *  - Rows without a valid #rrggbb hex are skipped (a few Color
 *    Variations / metallic rows carry text in the hex column).
 *  - Anchor "NA" becomes null.
 *  - Descriptions are kept verbatim (owner data; typos are not fixed).
 *
 * Deterministic: no timestamps and stable ordering, so re-running on an
 * unchanged CSV yields an identical file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', 'src', 'core', 'palettes');
const SRC = resolve(DIR, 'dmc-anchor-map.csv');
const OUT = resolve(DIR, 'dmc.json');

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

function main() {
  const raw = readFileSync(SRC, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
  const [header, ...rows] = lines;
  if (!/^DMC,Anchor,Hex,Description/i.test(header)) {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const seen = new Set();
  const colors = [];
  let skipped = 0;
  for (const line of rows) {
    const parts = line.split(',');
    const code = parts[0]?.trim();
    const anchor = parts[1]?.trim();
    const hex = parts[2]?.trim().toLowerCase();
    const name = parts.slice(3).join(',').trim();
    if (!code || !hex || !HEX_RE.test(hex)) {
      skipped++;
      continue;
    }
    if (seen.has(code)) continue;
    seen.add(code);
    colors.push({
      code,
      name,
      hex,
      rgb: toRgb(hex),
      anchor: anchor && anchor.toUpperCase() !== 'NA' ? anchor : null,
    });
  }

  const palette = {
    schemaVersion: 1,
    id: 'dmc',
    name: 'DMC (owner thread map)',
    source: 'src/core/palettes/dmc-anchor-map.csv',
    generatedBy: 'scripts/build-palette.mjs',
    counts: {
      rows: rows.length,
      colors: colors.length,
      skipped,
      duplicates: rows.length - skipped - colors.length,
    },
    colors,
  };

  writeFileSync(OUT, `${JSON.stringify(palette, null, 2)}\n`);
  console.log(
    `build-palette: ${colors.length} colours from ${rows.length} rows ` +
      `(${skipped} skipped, ${palette.counts.duplicates} duplicate DMC codes)`,
  );
}

main();
