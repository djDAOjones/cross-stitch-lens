/**
 * PDF chart export: pure layout maths, WinAnsi degradation, and — as
 * pdf-lib is plain JS — an end-to-end build parsed back under Node.
 * Visual print quality is the manual gate (a printed A4 page).
 */

import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  buildChartPdf,
  MM_TO_PT,
  pdfFilename,
  pdfLayout,
  toWinAnsi,
  type KeyEntry,
  type PdfOptions,
} from '../src/export/pdf.ts';

const OPTIONS: PdfOptions = {
  pageSize: 'a4',
  orientation: 'portrait',
  marginMm: 15,
  title: 'Test design',
};

const ENTRIES: KeyEntry[] = [
  { hex: '#000000', rgb: [0, 0, 0], brand: 'DMC', reference: '310' },
  { hex: '#ffffff', rgb: [255, 255, 255] },
];

/** Smallest valid PNG: 1×1 opaque black (pre-encoded). */
const PNG_1PX = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQAB' +
      'h6FO1AAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);

describe('pdfLayout', () => {
  it('sizes pages per format and swaps for landscape', () => {
    const portrait = pdfLayout(100, 100, [], OPTIONS);
    expect([portrait.pageWidth, portrait.pageHeight]).toEqual([595.28, 841.89]);
    const landscape = pdfLayout(100, 100, [], { ...OPTIONS, orientation: 'landscape' });
    expect([landscape.pageWidth, landscape.pageHeight]).toEqual([841.89, 595.28]);
    const letter = pdfLayout(100, 100, [], { ...OPTIONS, pageSize: 'letter' });
    expect([letter.pageWidth, letter.pageHeight]).toEqual([612, 792]);
  });

  it('keeps the chart inside the margins and preserves aspect', () => {
    const layout = pdfLayout(2030, 1030, ENTRIES, OPTIONS);
    const margin = 15 * MM_TO_PT;
    expect(layout.chart.x).toBeGreaterThanOrEqual(margin);
    expect(layout.chart.y).toBeGreaterThanOrEqual(margin);
    expect(layout.chart.x + layout.chart.width).toBeLessThanOrEqual(layout.pageWidth - margin);
    expect(layout.chart.width / layout.chart.height).toBeCloseTo(2030 / 1030, 5);
  });

  it('reserves title space only when a title is set', () => {
    // A tall (height-constrained) chart, so freed title space shows
    // up as chart height; a square chart would be width-constrained.
    const withTitle = pdfLayout(100, 300, [], OPTIONS);
    const without = pdfLayout(100, 300, [], { ...OPTIONS, title: '' });
    expect(withTitle.titleY).toBeDefined();
    expect(without.titleY).toBeUndefined();
    expect(without.chart.height).toBeGreaterThan(withTitle.chart.height);
  });

  it('wraps key entries into columns and caps the key height', () => {
    const many: KeyEntry[] = Array.from({ length: 500 }, (_, i) => ({
      hex: `#${String(i).padStart(6, '0')}`,
      rgb: [0, 0, 0],
    }));
    const layout = pdfLayout(100, 100, many, OPTIONS);
    expect(layout.keyCells.length).toBeLessThan(500);
    expect(layout.keyOmitted).toBe(500 - layout.keyCells.length);
    const xs = new Set(layout.keyCells.map((c) => c.x));
    expect(xs.size).toBeGreaterThan(1); // multiple columns in use
    for (const cell of layout.keyCells) {
      expect(cell.y).toBeGreaterThanOrEqual(15 * MM_TO_PT - KEYCELL_EPS);
    }
  });

  it('throws when margins leave no room', () => {
    expect(() => pdfLayout(100, 100, [], { ...OPTIONS, marginMm: 40, title: 'x' })).not.toThrow();
    expect(() =>
      pdfLayout(100, 100, [], { ...OPTIONS, pageSize: 'letter', marginMm: 40 * 4 }),
    ).toThrow(/no room/);
  });
});

const KEYCELL_EPS = 1e-6;

describe('toWinAnsi', () => {
  it('passes Latin-1 through and degrades the rest', () => {
    expect(toWinAnsi('Café 310 #000000')).toBe('Café 310 #000000');
    expect(toWinAnsi('stitch 🧵')).toBe('stitch ?');
  });
});

describe('buildChartPdf', () => {
  it('produces a parseable one-page PDF at the laid-out size', async () => {
    const bytes = await buildChartPdf(PNG_1PX, 100, 100, ENTRIES, OPTIONS);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });

  it('degrades a non-Latin title instead of failing', async () => {
    const bytes = await buildChartPdf(PNG_1PX, 100, 100, [], { ...OPTIONS, title: 'Fox 🦊' });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});

describe('pdfFilename', () => {
  it('names by stitch size', () => {
    expect(pdfFilename(200, 150)).toBe('chart-200x150.pdf');
  });
});
