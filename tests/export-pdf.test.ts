/**
 * PDF chart export: pure layout maths, WinAnsi degradation, and — as
 * pdf-lib is plain JS — an end-to-end build parsed back under Node.
 * Visual print quality is the manual gate (a printed A4 page).
 */

import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import {
  buildChartPdf,
  fitText,
  keyColumnWidth,
  keyLabel,
  keyRowText,
  MM_TO_PT,
  pdfFilename,
  pdfLayout,
  toWinAnsi,
  type KeyEntry,
  type PdfOptions,
} from '../src/export/pdf.ts';
import { glyphById } from '../src/core/symbols/glyphs.ts';

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

describe('key rows with symbols, names, and counts (M9)', () => {
  const dot = glyphById('dot');
  if (dot === undefined) throw new Error('the dot glyph left the catalogue');
  const rich: KeyEntry = {
    hex: '#000000',
    rgb: [0, 0, 0],
    brand: 'DMC',
    reference: '310',
    name: 'Black',
    count: 1234,
    symbol: dot,
  };

  it('says name and count after the KEY-01-disciplined label', () => {
    expect(keyRowText(rich)).toBe('DMC 310 #000000 · Black ×1234');
  });

  it('skips a name that only repeats the label', () => {
    // DMC's reference "White" is named "White": printing it twice is
    // the KEY-01 defect shape (D152), so the name must stay silent.
    expect(
      keyRowText({
        hex: '#fcfbf8',
        rgb: [252, 251, 248],
        brand: 'DMC',
        reference: 'White',
        name: 'White',
        count: 9,
      }),
    ).toBe('DMC White #fcfbf8 ×9');
  });

  it('keeps a plain entry exactly its label', () => {
    const plain: KeyEntry = { hex: '#123456', rgb: [18, 52, 86] };
    expect(keyRowText(plain)).toBe(keyLabel(plain));
  });

  it('widens the key column only when rows carry the extras', () => {
    expect(keyColumnWidth(ENTRIES)).toBe(90);
    expect(keyColumnWidth([rich])).toBe(150);
    // Fewer, wider columns: the layout must follow the same width.
    const manyPlain: KeyEntry[] = Array.from({ length: 40 }, (_, i) => ({
      hex: `#${String(i).padStart(6, '0')}`,
      rgb: [0, 0, 0],
    }));
    const manyRich = manyPlain.map((e) => ({ ...e, count: 5 }));
    const plainCols = new Set(pdfLayout(100, 100, manyPlain, OPTIONS).keyCells.map((c) => c.x));
    const richCols = new Set(pdfLayout(100, 100, manyRich, OPTIONS).keyCells.map((c) => c.x));
    expect(richCols.size).toBeLessThan(plainCols.size);
  });

  it('builds a parseable PDF when rows carry vector glyphs', async () => {
    const bytes = await buildChartPdf(PNG_1PX, 100, 100, [rich], OPTIONS);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe('fitText', () => {
  it('leaves fitting text alone and truncates the rest within width', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont('Helvetica');
    expect(fitText('short', font, 8, 200)).toBe('short');
    const long = 'A very long thread name that cannot possibly fit the key column';
    const fitted = fitText(long, font, 8, 60);
    expect(fitted.endsWith('...')).toBe(true);
    expect(font.widthOfTextAtSize(fitted, 8)).toBeLessThanOrEqual(60);
    expect(fitted.length).toBeLessThan(long.length);
  });
});

describe('key labels (M15-ACCEPT-01, D114)', () => {
  it('labels threads by identity and synthetics by their honest label', () => {
    expect(
      keyLabel({ hex: '#000000', rgb: [0, 0, 0], brand: 'DMC', reference: '310' }),
    ).toBe('DMC 310 #000000');
    // The assembly passes nonThreadLabel() as brand + empty reference
    // for map:/user: entries — the raw namespace never reaches paper.
    expect(
      keyLabel({ hex: '#00ff00', rgb: [0, 255, 0], brand: 'Web-safe Lime', reference: '' }),
    ).toBe('Web-safe Lime #00ff00');
    expect(keyLabel({ hex: '#123456', rgb: [18, 52, 86] })).toBe('#123456');
  });

  // KEY-01 (D152). The case above passes and always did, because
  // "Web-safe Lime" is a *named* colour — the flattering fixture. Most
  // generated colours have no CSS name, so `nonThreadLabel` names them
  // by their hex and the brand already ends in one. Those are the rows
  // an owner actually saw printed twice.
  describe('an unnamed generated colour — the broken majority', () => {
    it('does not print the hex twice', () => {
      expect(
        keyLabel({ hex: '#cccccc', rgb: [204, 204, 204], brand: 'Web-safe #cccccc', reference: '' }),
      ).toBe('Web-safe #cccccc');
    });

    it('holds when the label cases the hex differently', () => {
      expect(
        keyLabel({ hex: '#cccccc', rgb: [204, 204, 204], brand: 'Web-safe #CCCCCC', reference: '' }),
      ).toBe('Web-safe #CCCCCC');
    });

    it('still appends the hex when the label does not already carry it', () => {
      // The suppression must be conditional, not a blanket removal —
      // a named synthetic still needs its hex on the chart.
      expect(
        keyLabel({ hex: '#00ff00', rgb: [0, 255, 0], brand: 'Retro 16 Lime', reference: '' }),
      ).toBe('Retro 16 Lime #00ff00');
    });

    it('leaves a real thread whose reference is not its hex alone', () => {
      expect(
        keyLabel({ hex: '#000000', rgb: [0, 0, 0], brand: 'DMC', reference: '310' }),
      ).toBe('DMC 310 #000000');
    });

    it('never repeats a token in any generated-map row', () => {
      // The acceptance condition as written: no row prints the same
      // token twice. Swept across the shapes the assembly can produce.
      for (const brand of ['Web-safe #cccccc', 'Custom — #ff0000', 'Retro 16 #00ff00']) {
        const hex = `#${brand.slice(-6)}`;
        const label = keyLabel({ hex, rgb: [0, 0, 0], brand, reference: '' });
        const occurrences = label.toLowerCase().split(hex.toLowerCase()).length - 1;
        expect({ label, occurrences }).toEqual({ label, occurrences: 1 });
      }
    });
  });
});
