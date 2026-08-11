/**
 * EXPORT-01 — assert the exported ARTEFACTS, not just the helpers.
 *
 * The unit layer already covers `export-png`, `export-chart` and
 * `export-pdf`, and it is not the gap: one of those tests covers the
 * exact function that produced KEY-01's wrong output and passed, because
 * its fixture was a hand-made flattering case. What was missing is a
 * level up — take a real pipeline output, push it through the real
 * export assembly, and assert properties of the bytes that come out.
 *
 * This is `tests/acceptance-matrix.test.ts`'s pattern extended to
 * exports, not a second mechanism: the frame comes from `executeRequest`
 * (the real worker entry, so LUT cache, candidate cache and routing are
 * all in the loop) and the key comes from `buildKeyEntries` (the real
 * assembly `main.ts` calls).
 *
 * What it deliberately does NOT do: judge appearance. Whether a dither
 * looks right or a profile's name predicts its look stays human. This
 * replaces the *structural* half of an acceptance sitting's export leg
 * — the win is a shorter sitting, not no sitting.
 *
 * Node has no `OffscreenCanvas`, so the two canvas encoders
 * (`encodePngBlob`, `encodeChartPng`) cannot run here. Their inputs are
 * pure and are asserted directly; the PDF assembly is plain pdf-lib and
 * runs whole, which is why the PDF gets byte-level treatment.
 */

import { deflateSync, inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildChartPdf, keyLabel, MM_TO_PT, type KeyEntry } from '../src/export/pdf.ts';
import { buildKeyEntries } from '../src/export/key-entries.ts';
import { chartLayout, maxCellPx } from '../src/export/chart.ts';
import { MAX_OUTPUT_SIDE, oversizeMessage, scaleNearest } from '../src/export/png.ts';
import { executeRequest } from '../src/worker/execute.ts';
import { DEFAULT_GRID_STYLE } from '../src/worker/grid.ts';
import { loadDmcPalette } from '../src/core/palette.ts';
import { generateColorMap } from '../src/core/color-sources.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import type { WorkerResponse } from '../src/worker/protocol.ts';

const GRID = 24;
const PALETTE = loadDmcPalette();

/** A deterministic source with real colour variety. No ambient randomness. */
function source(width = 96, height = 72): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = 0x2026_0811 >>> 0;
  for (let i = 0; i < width * height; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    data[i * 4] = (s >>> 16) & 0xff;
    data[i * 4 + 1] = (s >>> 8) & 0xff;
    data[i * 4 + 2] = s & 0xff;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

/**
 * A generated colour map as a palette. Its entries are named by their
 * hex, which is the shape KEY-01 broke on — and the shape a DMC
 * palette never produces, so the realistic path has to include it or
 * this suite repeats the flattering-fixture mistake it exists to catch.
 */
const WEBSAFE: Palette = (() => {
  const map = generateColorMap('websafe');
  return { name: map.name, entries: map.entries };
})();

/** The real worker entry — same route the app's export takes. */
function pipelineFrame(palette: Palette = PALETTE): PixelBuffer {
  const src = source();
  const response: WorkerResponse = executeRequest({
    type: 'process',
    id: 1,
    width: src.width,
    height: src.height,
    pixels: new Uint8ClampedArray(src.data).buffer as ArrayBuffer,
    config: {
      preset: 'resize-first',
      grid: { width: GRID, height: GRID },
      resizeMode: 'stretch',
      metric: 'lab',
      palette,
      dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
    },
  });
  if (response.type !== 'result') throw new Error(`pipeline failed: ${JSON.stringify(response)}`);
  return {
    width: response.width,
    height: response.height,
    data: new Uint8ClampedArray(response.pixels),
    ...(response.indices === undefined || response.indices === null
      ? {}
      : { indices: new Uint16Array(response.indices) }),
  };
}

// ---------------------------------------------------------------- PNG
// Test-only PNG encoder (node's built-in zlib — not a new dependency).
// It exists solely to hand pdf-lib the bytes a browser's
// `encodeChartPng` would, so the PDF assembly can be exercised whole.
// Nothing about the app's own encoding is asserted through it.

function crc32(bytes: Uint8Array): number {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = (table[(crc ^ b) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

/** Encode RGBA as a valid 8-bit PNG. */
function encodePngBytes(buffer: PixelBuffer): Uint8Array {
  const { width: w, height: h } = buffer;
  const stride = w * 4;
  const raw = Buffer.alloc(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0; // filter: none
    Buffer.from(buffer.data.buffer, y * stride, stride).copy(raw, y * (1 + stride) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- PDF

/** Every text run drawn into the PDF, in order. */
function pdfTextRuns(bytes: Uint8Array): string[] {
  const buf = Buffer.from(bytes);
  const latin = buf.toString('latin1');
  const runs: string[] = [];
  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) continue;
    const raw = buf.subarray(start, end);
    let text: string;
    try {
      text = inflateSync(raw).toString('latin1');
    } catch {
      text = raw.toString('latin1');
    }
    // pdf-lib writes text as hex strings; literal strings are handled
    // too so this does not silently return nothing if that changes.
    for (const m of text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
      runs.push(Buffer.from(m[1] ?? '', 'hex').toString('latin1'));
    }
    for (const m of text.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) {
      runs.push(m[1] ?? '');
    }
  }
  return runs;
}

/** The `w h re` rectangle the chart image is drawn into, in points. */
function pdfImageBox(bytes: Uint8Array): { width: number; height: number } | null {
  const buf = Buffer.from(bytes);
  const latin = buf.toString('latin1');
  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin)) !== null) {
    const start = match.index + match[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) continue;
    let text: string;
    try {
      text = inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch {
      continue;
    }
    // drawImage emits a scale matrix: `w 0 0 h x y cm` before `/Img Do`.
    const cm = /([\d.]+) 0 0 ([\d.]+) [-\d.]+ [-\d.]+ cm\s*\/[^\s]+ Do/.exec(text);
    if (cm !== null) {
      return { width: Number(cm[1]), height: Number(cm[2]) };
    }
  }
  return null;
}

const FRAME = pipelineFrame();
const STYLE = { ...DEFAULT_GRID_STYLE };

describe('the frame the exporters receive', () => {
  it('is the grid exactly — the clean PNG is 1 stitch = 1 px', () => {
    // The clean PNG encoder writes the frame verbatim, so the frame's
    // dimensions ARE the artefact's dimensions.
    expect({ width: FRAME.width, height: FRAME.height }).toEqual({
      width: GRID,
      height: GRID,
    });
    expect(FRAME.data.length).toBe(GRID * GRID * 4);
  });

  it('carries the palette-index sidecar so the key can name threads', () => {
    expect(FRAME.indices).toBeDefined();
    expect(FRAME.indices?.length).toBe(GRID * GRID);
  });
});

describe('the enlarged PNG is an exact integer multiple', () => {
  for (const factor of [2, 3, 7]) {
    it(`scales ×${String(factor)} with no resampling`, () => {
      const enlarged = scaleNearest(FRAME, factor);
      expect({ w: enlarged.width, h: enlarged.height }).toEqual({
        w: GRID * factor,
        h: GRID * factor,
      });

      // Every output pixel must be a verbatim copy of its source pixel.
      // An interpolating resampler would blend across cell edges, and
      // a stitch chart that blends is not a stitch chart.
      let wrong = 0;
      let firstBad = '';
      for (let y = 0; y < enlarged.height && wrong === 0; y++) {
        for (let x = 0; x < enlarged.width; x++) {
          const src = ((y / factor) | 0) * GRID + ((x / factor) | 0);
          const dst = y * enlarged.width + x;
          for (let c = 0; c < 4; c++) {
            if (enlarged.data[dst * 4 + c] !== FRAME.data[src * 4 + c]) {
              wrong++;
              firstBad = `(${String(x)},${String(y)}) channel ${String(c)}`;
              break;
            }
          }
          if (wrong > 0) break;
        }
      }
      expect(`${String(wrong)} ${firstBad}`).toBe('0 ');
    });
  }

  it('invents no colour that was not in the frame', () => {
    // The property-level restatement of "no resampling": a blend would
    // produce values the palette never chose.
    const seen = new Set<number>();
    for (let i = 0; i < FRAME.data.length; i += 4) {
      seen.add(
        ((FRAME.data[i] ?? 0) << 16) | ((FRAME.data[i + 1] ?? 0) << 8) | (FRAME.data[i + 2] ?? 0),
      );
    }
    const enlarged = scaleNearest(FRAME, 5);
    const after = new Set<number>();
    for (let i = 0; i < enlarged.data.length; i += 4) {
      after.add(
        ((enlarged.data[i] ?? 0) << 16) |
          ((enlarged.data[i + 1] ?? 0) << 8) |
          (enlarged.data[i + 2] ?? 0),
      );
    }
    expect([...after].sort((a, b) => a - b)).toEqual([...seen].sort((a, b) => a - b));
  });

  it('refuses an enlargement past the canvas limit rather than silently zeroing', () => {
    expect(oversizeMessage(MAX_OUTPUT_SIDE + 1, 10)).toContain('Export too large');
    expect(oversizeMessage(GRID, GRID)).toBeNull();
  });
});

describe('the chart raster reserves its furniture', () => {
  it('is larger than the bare cells, because grid and numbering need room', () => {
    const cell = 12;
    const layout = chartLayout(FRAME.width, FRAME.height, STYLE, cell);
    expect(layout.width).toBeGreaterThan(FRAME.width * cell);
    expect(layout.height).toBeGreaterThan(FRAME.height * cell);
  });

  it('grows with the cell size in both axes', () => {
    const small = chartLayout(FRAME.width, FRAME.height, STYLE, 8);
    const large = chartLayout(FRAME.width, FRAME.height, STYLE, 16);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('keeps its own maximum cell inside the canvas limit', () => {
    const cell = maxCellPx(FRAME.width, FRAME.height, STYLE);
    const layout = chartLayout(FRAME.width, FRAME.height, STYLE, cell);
    expect(oversizeMessage(layout.width, layout.height)).toBeNull();
  });
});

describe('the PDF artefact', () => {
  const CELL = 8;
  const chartL = chartLayout(FRAME.width, FRAME.height, STYLE, CELL);
  // Stand-in for the browser's chart raster: same dimensions the real
  // encoder would produce, so the embedded image's geometry is real.
  const chartPng = encodePngBytes({
    width: chartL.width,
    height: chartL.height,
    data: new Uint8ClampedArray(chartL.width * chartL.height * 4).fill(255),
  });
  const entries = buildKeyEntries(FRAME, PALETTE, new Map([['dmc', 'DMC']]));

  async function build(overrides: Partial<Parameters<typeof buildChartPdf>[4]> = {}) {
    return buildChartPdf(chartPng, chartL.width, chartL.height, entries, {
      pageSize: 'a4',
      orientation: 'portrait',
      marginMm: 12,
      title: 'Artefact test',
      ...overrides,
    });
  }

  it('produces a real, single-page PDF', async () => {
    const bytes = await build();
    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
    // Parsed, not string-matched: pdf-lib compresses the object
    // structure, so `/Type /Page` is not in the plaintext. One page is
    // the contract until M10 lands pagination.
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('uses the requested page box, in points', async () => {
    const a4 = await PDFDocument.load(await build({ pageSize: 'a4' }));
    const a4Size = a4.getPage(0).getSize();
    expect(a4Size.width).toBeCloseTo(595.28, 1);
    expect(a4Size.height).toBeCloseTo(841.89, 1);

    const letter = await PDFDocument.load(await build({ pageSize: 'letter' }));
    const letterSize = letter.getPage(0).getSize();
    expect(letterSize.width).toBeCloseTo(612, 1);
    expect(letterSize.height).toBeCloseTo(792, 1);
  });

  it('swaps the page box in landscape', async () => {
    const doc = await PDFDocument.load(await build({ orientation: 'landscape' }));
    const size = doc.getPage(0).getSize();
    expect(size.width).toBeGreaterThan(size.height);
    expect(size.width).toBeCloseTo(841.89, 1);
  });

  it('draws the chart with its aspect ratio preserved', async () => {
    const box = pdfImageBox(await build());
    expect(box).not.toBeNull();
    const drawn = (box?.width ?? 0) / (box?.height ?? 1);
    const sourceAspect = chartL.width / chartL.height;
    // A squashed chart is a wrong chart: stitches must stay square.
    expect(Math.abs(drawn - sourceAspect)).toBeLessThan(0.01);
  });

  it('fits the chart inside the printable area', async () => {
    const marginPt = 12 * MM_TO_PT;
    const box = pdfImageBox(await build());
    expect(box?.width).toBeLessThanOrEqual(595.28 - marginPt * 2 + 0.5);
  });

  it('writes the title into the document', async () => {
    const runs = pdfTextRuns(await build({ title: 'Artefact test' }));
    expect(runs).toContain('Artefact test');
  });

  it('writes key rows, and every row is well-formed', async () => {
    const runs = pdfTextRuns(await build());
    const keyRows = runs.filter((r) => r !== 'Artefact test' && !r.startsWith('+ '));
    expect(keyRows.length).toBeGreaterThan(0);
    for (const row of keyRows) {
      // A row names a colour: it must carry exactly one hex, and no
      // token twice. This is the assertion KEY-01 needed and the whole
      // reason this suite exists.
      const hexes = row.match(/#[0-9a-fA-F]{6}/g) ?? [];
      expect({ row, hexes: hexes.length }).toEqual({ row, hexes: 1 });
      const tokens = row.split(' ').filter((t) => t.length > 0);
      const unique = new Set(tokens.map((t) => t.toLowerCase()));
      expect({ row, repeated: tokens.length - unique.size }).toEqual({ row, repeated: 0 });
    }
  });

  it('names the brand beside the reference on every real-thread row', async () => {
    const runs = pdfTextRuns(await build());
    const threadRows = runs.filter((r) => r.startsWith('DMC '));
    expect(threadRows.length).toBeGreaterThan(0);
    for (const row of threadRows) {
      // "310" without saying whose 310 sends the stitcher to the wrong
      // shelf (M7-BRAND-02). Since M9 a row may go on to name the
      // thread and always ends in its stitch count.
      expect(row).toMatch(/^DMC \S+ #[0-9a-f]{6}( · .+)? ×\d+$/);
    }
  });

  it('quantifies every row: the key ends in a stitch count (M9)', async () => {
    const runs = pdfTextRuns(await build());
    const keyRows = runs.filter((r) => r !== 'Artefact test' && !r.startsWith('+ '));
    expect(keyRows.length).toBeGreaterThan(0);
    for (const row of keyRows) expect(row).toMatch(/ ×\d+$/);
  });

  it('fails the way KEY-01 failed, if it ever regresses', async () => {
    // A direct guard on the assembly, independent of which colours this
    // frame happens to select: an unnamed generated colour must not
    // print its hex twice once it reaches paper.
    const unnamed: KeyEntry[] = [
      { hex: '#cccccc', rgb: [204, 204, 204], brand: 'Web-safe #cccccc', reference: '' },
    ];
    const bytes = await buildChartPdf(chartPng, chartL.width, chartL.height, unnamed, {
      pageSize: 'a4',
      orientation: 'portrait',
      marginMm: 12,
      title: '',
    });
    const row = pdfTextRuns(bytes).find((r) => r.includes('cccccc'));
    expect(row).toBe(keyLabel(unnamed[0] as KeyEntry));
    expect((row?.match(/#cccccc/g) ?? []).length).toBe(1);
  });

  it('has no key at all in full-RGB mode', () => {
    // Nothing to buy, so the export says nothing rather than inventing
    // references.
    expect(buildKeyEntries(FRAME, null, new Map())).toEqual([]);
  });

  // The realistic path over a GENERATED palette. A DMC palette yields
  // only real threads ("DMC 310 #000000"), which never had the KEY-01
  // defect — so without this block the suite's own realistic case is
  // the flattering one, which is the exact failure it was written to
  // stop. Every entry here is named by its hex.
  describe('over a generated colour map, where the names are hexes', () => {
    const frame = pipelineFrame(WEBSAFE);
    const generated = buildKeyEntries(frame, WEBSAFE, new Map());

    it('produces key rows that are all synthetic', () => {
      expect(generated.length).toBeGreaterThan(0);
      // No manufacturer identity: nothing here is buyable.
      expect(generated.every((e) => e.reference === '')).toBe(true);
    });

    it('prints each row once, with exactly one hex, on paper', async () => {
      const bytes = await buildChartPdf(chartPng, chartL.width, chartL.height, generated, {
        pageSize: 'a4',
        orientation: 'portrait',
        marginMm: 12,
        title: '',
      });
      const rows = pdfTextRuns(bytes).filter((r) => !r.startsWith('+ '));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const hexes = row.match(/#[0-9a-fA-F]{6}/g) ?? [];
        expect({ row, hexes: hexes.length }).toEqual({ row, hexes: 1 });
      }
    });
  });
});
