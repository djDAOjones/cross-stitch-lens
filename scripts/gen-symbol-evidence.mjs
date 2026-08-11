/**
 * Print-evidence sheet for the M9 symbol glyphs (`npm run
 * symbols:evidence`).
 *
 * The glyph batches are signed on printed evidence (D160, the
 * D139/D146 gallery process), judged at print size — so this renders
 * every glyph as a *vector* through the same pdf-lib `drawSvgPath`
 * consumer the chart key uses: what the owner signs is what the PDF
 * artefact draws. Per batch page: each glyph at review size with its
 * catalogue position, id, and name, plus true-print-size repeats
 * (3.5 mm and 2.5 mm cells — the realistic chart range), and a
 * signature line. A final page shows all 64 at print size in
 * canonical order, which is where mutual distinctness is judged.
 *
 * Output goes to `bench-reports/` — machine-local evidence output,
 * kept out of the repo like every other report (the signature record
 * lives in the decision log, not as a committed binary).
 *
 * Node ≥ 23.6 strips the types from the .ts import natively; the
 * glyph module is dependency-free on purpose.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { SYMBOL_BATCH_SIZE, SYMBOL_GLYPHS } from '../src/core/symbols/glyphs.ts';

const MM = 72 / 25.4;
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 15 * MM;
const INK = rgb(0x16 / 255, 0x16 / 255, 0x16 / 255);

/** Review size plus the two realistic print cell sizes, in pt. */
const REVIEW_PT = 10 * MM;
const PRINT_PT = [3.5 * MM, 2.5 * MM];

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'bench-reports');
const outPath = join(outDir, 'm9-symbol-evidence.pdf');

/** Draw one glyph with its box's top-left at (x, topY), side `pt`. */
function drawGlyph(page, glyph, x, topY, pt) {
  page.drawSvgPath(glyph.path, { x, y: topY, scale: pt / 100, color: INK });
}

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);

const batches = SYMBOL_GLYPHS.length / SYMBOL_BATCH_SIZE;
for (let b = 0; b < batches; b++) {
  const page = doc.addPage([A4.width, A4.height]);
  const glyphs = SYMBOL_GLYPHS.slice(b * SYMBOL_BATCH_SIZE, (b + 1) * SYMBOL_BATCH_SIZE);
  page.drawText(
    `Pattern Mapper — M9 symbol glyphs, batch ${String(b + 1)} of ${String(batches)} (draft for signature)`,
    { x: MARGIN, y: A4.height - MARGIN - 12, size: 12, font: bold, color: INK },
  );
  page.drawText(
    'Judge at print size: the small repeats are 3.5 mm and 2.5 mm chart cells. Ids and order are permanent once signed.',
    { x: MARGIN, y: A4.height - MARGIN - 26, size: 8, font, color: INK },
  );

  const cols = 2;
  const rows = SYMBOL_BATCH_SIZE / cols;
  const cellW = (A4.width - 2 * MARGIN) / cols;
  const top = A4.height - MARGIN - 44;
  const cellH = (top - MARGIN - 30) / rows;
  glyphs.forEach((glyph, i) => {
    const cx = MARGIN + (i % cols) * cellW;
    const cy = top - Math.floor(i / cols) * cellH;
    drawGlyph(page, glyph, cx, cy, REVIEW_PT);
    let px = cx + REVIEW_PT + 6;
    for (const pt of PRINT_PT) {
      drawGlyph(page, glyph, px, cy - (REVIEW_PT - pt) / 2, pt);
      px += pt + 6;
    }
    const index = b * SYMBOL_BATCH_SIZE + i + 1;
    page.drawText(`${String(index)}. ${glyph.name}`, {
      x: px + 4,
      y: cy - REVIEW_PT / 2 + 2,
      size: 9,
      font: bold,
      color: INK,
    });
    page.drawText(`id: ${glyph.id}`, {
      x: px + 4,
      y: cy - REVIEW_PT / 2 - 9,
      size: 7,
      font,
      color: INK,
    });
  });

  page.drawText('Signed: ______________________    Date: ____________', {
    x: MARGIN,
    y: MARGIN,
    size: 10,
    font,
    color: INK,
  });
}

// The distinctness page: every glyph at print size, canonical order.
const page = doc.addPage([A4.width, A4.height]);
page.drawText('All glyphs at 3.5 mm, canonical order — the mutual-distinctness check', {
  x: MARGIN,
  y: A4.height - MARGIN - 12,
  size: 12,
  font: bold,
  color: INK,
});
const pt = PRINT_PT[0];
const gap = pt * 1.6;
const perRow = Math.floor((A4.width - 2 * MARGIN) / gap);
SYMBOL_GLYPHS.forEach((glyph, i) => {
  const x = MARGIN + (i % perRow) * gap;
  const y = A4.height - MARGIN - 40 - Math.floor(i / perRow) * gap;
  drawGlyph(page, glyph, x, y, pt);
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, await doc.save());
console.log(`wrote ${outPath} (${String(SYMBOL_GLYPHS.length)} glyphs, ${String(batches)} batch pages + 1 distinctness page)`);
