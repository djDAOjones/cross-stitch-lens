/**
 * Single-page PDF chart (§18 MVP subset): A4/Letter, portrait or
 * landscape, margins, design title, and a thread key (swatch + code +
 * hex). The chart itself is the styled chart raster (chart.ts) embedded
 * at print resolution — one furniture implementation everywhere — while
 * title and key are native PDF vector text.
 *
 * Layout is pure and tested; PDF assembly (`buildChartPdf`) is plain
 * pdf-lib and also runs under Node, so tests can parse the output.
 * Only the caller touches the DOM. PDF coordinates are bottom-up;
 * the layout works in that space directly.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** 72 pt per inch / 25.4 mm per inch. */
export const MM_TO_PT = 72 / 25.4;

/** Portrait page sizes, pt. */
const PAGE_PT = { a4: [595.28, 841.89], letter: [612, 792] } as const;

const TITLE_PT = 14;
/** Gap between title baseline and the chart area, pt. */
const TITLE_GAP = 10;
/** Key row height (swatch + leading), pt. */
const KEY_ENTRY_H = 12;
const KEY_SWATCH = 8;
const KEY_TEXT_PT = 8;
/** Key column width — fits "310 #000000" at 8 pt with breathing room. */
const KEY_COL_W = 90;
/** Gap between the key block and the chart above it, pt. */
const KEY_GAP = 8;
/** The key may take at most this share of the content height. */
const KEY_MAX_SHARE = 0.4;

/** One thread-key entry (a used colour). */
export interface KeyEntry {
  hex: string;
  rgb: [number, number, number];
  /**
   * Brand and reference of the thread, when the design was identified.
   * Both, or neither: a chart key that says "310" without saying whose
   * 310 sends the stitcher to the wrong shelf (M7-BRAND-02).
   */
  brand?: string;
  reference?: string;
}

/**
 * One key line: "DMC 310 #000000", or the entry's own honest label
 * for non-thread colours ("Web-safe Lime #00ff00" — the assembly
 * passes the provenance label as `brand` with an empty reference,
 * D114/M15-ACCEPT-01), or bare hex when nothing identified it.
 * Whitespace is normalised so an empty part never leaves a gap.
 */
export function keyLabel(entry: KeyEntry): string {
  if (entry.reference === undefined) return entry.hex;
  const head = `${entry.brand ?? ''} ${entry.reference}`.replace(/\s+/g, ' ').trim();
  // A generated colour with no CSS name is *named by its hex*, so its
  // brand already ends in one: `nonThreadLabel` builds "Web-safe
  // #cccccc" (color-sources.ts), and appending the hex again printed
  // rows like "Web-safe #cccccc #cccccc" (KEY-01, D152). Real threads
  // are untouched — "DMC 310" never contains its own hex, so
  // "DMC 310 #000000" still reads correctly.
  if (head.toLowerCase().includes(entry.hex.toLowerCase())) return head;
  return `${head} ${entry.hex}`.trim();
}

export interface PdfOptions {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  /** Page margin, mm. */
  marginMm: number;
  /** Design title; empty string = no title block. */
  title: string;
}

/** A positioned key entry (swatch bottom-left corner, pt). */
export interface KeyCell {
  x: number;
  y: number;
  entry: KeyEntry;
}

/** Computed page geometry, pt, bottom-up (PDF space). */
export interface PdfLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  /** Title baseline; absent when the title is empty. */
  titleY?: number;
  /** Chart image box, aspect-preserving, centred in the free area. */
  chart: { x: number; y: number; width: number; height: number };
  keyCells: KeyCell[];
  /** Entries that did not fit the key's height cap. */
  keyOmitted: number;
  /** Top edge of the key block (where an omission note sits). */
  keyTop: number;
}

/**
 * Lay out one chart page. `chartPxW/H` are the chart raster's pixel
 * dimensions — only their ratio matters here. Throws when the margins
 * leave no room for the chart (surfaced to the status line).
 */
export function pdfLayout(
  chartPxW: number,
  chartPxH: number,
  entries: KeyEntry[],
  options: PdfOptions,
): PdfLayout {
  const base = PAGE_PT[options.pageSize];
  const landscape = options.orientation === 'landscape';
  const pageWidth = landscape ? base[1] : base[0];
  const pageHeight = landscape ? base[0] : base[1];
  const margin = options.marginMm * MM_TO_PT;
  const contentX = margin;
  const contentW = pageWidth - 2 * margin;

  let top = pageHeight - margin;
  let titleY: number | undefined;
  if (options.title !== '') {
    titleY = top - TITLE_PT;
    top = titleY - TITLE_GAP;
  }

  const contentH = top - margin;
  const columns = Math.max(1, Math.floor(contentW / KEY_COL_W));
  const maxRows = Math.max(1, Math.floor((contentH * KEY_MAX_SHARE) / KEY_ENTRY_H));
  const shown = entries.slice(0, columns * maxRows);
  const keyOmitted = entries.length - shown.length;
  const rows = Math.ceil(shown.length / columns);
  const keyHeight = shown.length > 0 ? rows * KEY_ENTRY_H : 0;
  const keyTop = margin + keyHeight;
  const keyCells: KeyCell[] = shown.map((entry, i) => ({
    x: contentX + (i % columns) * KEY_COL_W,
    y: keyTop - (Math.floor(i / columns) + 1) * KEY_ENTRY_H,
    entry,
  }));

  const chartBottom = keyHeight > 0 ? keyTop + KEY_GAP : margin;
  const boxW = contentW;
  const boxH = top - chartBottom;
  if (boxW <= 0 || boxH <= 0) throw new Error('margins leave no room for the chart');
  const scale = Math.min(boxW / chartPxW, boxH / chartPxH);
  const width = chartPxW * scale;
  const height = chartPxH * scale;

  return {
    pageWidth,
    pageHeight,
    margin,
    ...(titleY === undefined ? {} : { titleY }),
    chart: {
      x: contentX + (boxW - width) / 2,
      y: chartBottom + (boxH - height) / 2,
      width,
      height,
    },
    keyCells,
    keyOmitted,
    keyTop,
  };
}

/**
 * Standard PDF fonts are WinAnsi-only; replace anything outside
 * Latin-1 so a title with emoji degrades instead of throwing.
 */
export function toWinAnsi(text: string): string {
  return text.replace(/[^\x20-\xff]/gu, '?');
}

/** Download name, e.g. `chart-200x150.pdf` (size in stitches). */
export function pdfFilename(width: number, height: number): string {
  return `chart-${width}x${height}.pdf`;
}

/** Chart ink colour (matches chart.ts CHART_TEXT, #161616). */
const INK = rgb(0x16 / 255, 0x16 / 255, 0x16 / 255);

/**
 * Assemble the one-page PDF: embedded chart raster + vector title and
 * thread key. `chartPng` must come from a full-quality pipeline re-run
 * (the chart.ts encoder), never the preview surface.
 */
export async function buildChartPdf(
  chartPng: Uint8Array,
  chartPxW: number,
  chartPxH: number,
  entries: KeyEntry[],
  options: PdfOptions,
): Promise<Uint8Array> {
  const layout = pdfLayout(chartPxW, chartPxH, entries, options);
  const doc = await PDFDocument.create();
  const page = doc.addPage([layout.pageWidth, layout.pageHeight]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  if (layout.titleY !== undefined) {
    page.drawText(toWinAnsi(options.title), {
      x: layout.margin,
      y: layout.titleY,
      size: TITLE_PT,
      font: bold,
      color: INK,
    });
  }

  const image = await doc.embedPng(chartPng);
  page.drawImage(image, layout.chart);

  for (const cell of layout.keyCells) {
    const [r, g, b] = cell.entry.rgb;
    page.drawRectangle({
      x: cell.x,
      y: cell.y,
      width: KEY_SWATCH,
      height: KEY_SWATCH,
      color: rgb(r / 255, g / 255, b / 255),
      borderColor: INK,
      borderWidth: 0.5,
    });
    page.drawText(toWinAnsi(keyLabel(cell.entry)), {
      x: cell.x + KEY_SWATCH + 4,
      y: cell.y + 1,
      size: KEY_TEXT_PT,
      font,
      color: INK,
    });
  }
  if (layout.keyOmitted > 0) {
    page.drawText(`+ ${layout.keyOmitted} more colours`, {
      x: layout.margin,
      y: layout.keyTop + 2,
      size: KEY_TEXT_PT,
      font,
      color: INK,
    });
  }

  return doc.save();
}
