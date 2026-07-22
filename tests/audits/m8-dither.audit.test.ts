/**
 * M8-SPIKE-01 — alternative-dither evaluation (AUDIT=1).
 *
 * The spike question: which dither methods are materially different and
 * useful for cross-stitch output, and which controls does each
 * genuinely need? This audit produces the evidence: per-candidate
 * quality metrics on representative content, stitch-oriented structure
 * counts, timing at the benchmark boundaries, and an HTML gallery of
 * identical side-by-side crops for owner judgement.
 *
 * Nothing here changes production behaviour; candidates live in
 * `candidates/m8-dither-candidates.ts` and are prototypes by contract.
 *
 * Metric notes:
 * - **pixel ΔE76** (output vs source, per opaque pixel) measures added
 *   high-frequency noise — dithered outputs are *expected* to score
 *   worse than no-dither here.
 * - **tone ΔE76** (4×4 box-averaged output vs source) measures what
 *   dithering exists to buy: local average colour fidelity. Lower is
 *   better, and no-dither should lose badly on gradients.
 * - **isolated %** counts cells whose 4-neighbours all hold a different
 *   palette index — single stitches of a colour are the stitchability
 *   cost of a noisy method.
 */

import { describe, expect, it } from 'vitest';

import { srgbToLab } from '../../src/core/color/convert.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
import { ditherStage, type DitherParams } from '../../src/core/pipeline/dither.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../../src/core/types.ts';
import { writeReport } from '../bench/env-node.ts';
import { palette64 } from '../../src/bench/workloads.ts';
import {
  allCandidates,
  bayerTile,
  blueNoiseTile,
  type Candidate,
  type CandidateParams,
} from './candidates/m8-dither-candidates.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

// ---------------------------------------------------------------------
// Spike fixtures — representative content classes at grid size
// ---------------------------------------------------------------------

/** Deterministic LCG channel stream (reference copy from workloads). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state >>> 24;
  };
}

type FixtureFill = (x: number, y: number, w: number, h: number) => [number, number, number, number];

function fixture(size: number, fill: FixtureFill): PixelBuffer {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = fill(x, y, size, size);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { width: size, height: size, data };
}

/** Smooth two-axis gradient — the content dithering is judged on. */
function gradientFixture(size: number): PixelBuffer {
  return fixture(size, (x, y, w, h) => [
    Math.round((255 * x) / (w - 1)),
    Math.round((255 * y) / (h - 1)),
    Math.round((255 * (x + y)) / (w + h - 2)),
    255,
  ]);
}

/** Overlapping soft radial blobs in skin/earth tones — organic content. */
function organicFixture(size: number): PixelBuffer {
  const blobs: readonly [number, number, number, [number, number, number]][] = [
    [0.3, 0.35, 0.45, [224, 172, 138]],
    [0.7, 0.3, 0.35, [188, 121, 88]],
    [0.5, 0.75, 0.5, [148, 98, 66]],
    [0.15, 0.8, 0.3, [244, 214, 186]],
  ];
  return fixture(size, (x, y, w, h) => {
    let r = 92;
    let g = 62;
    let b = 48;
    for (const [cx, cy, radius, [br, bg, bb]] of blobs) {
      const dx = x / w - cx;
      const dy = y / h - cy;
      const t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / radius);
      const s = t * t * (3 - 2 * t);
      r += (br - r) * s;
      g += (bg - g) * s;
      b += (bb - b) * s;
    }
    return [Math.round(r), Math.round(g), Math.round(b), 255];
  });
}

/** Flat geometric shapes with hard edges — graphic/logo content. */
function flatArtFixture(size: number): PixelBuffer {
  return fixture(size, (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;
    if ((nx - 0.3) ** 2 + (ny - 0.3) ** 2 < 0.04) return [220, 38, 38, 255];
    if (nx > 0.55 && nx < 0.9 && ny > 0.15 && ny < 0.5) return [37, 99, 235, 255];
    if (ny > 0.6 && nx + ny > 1.2) return [22, 163, 74, 255];
    if (ny > 0.7 && nx < 0.4) return [250, 204, 21, 255];
    return [245, 245, 240, 255];
  });
}

/** High-frequency detail: fine sine interference over a checker. */
function detailFixture(size: number): PixelBuffer {
  return fixture(size, (x, y) => {
    const s = Math.sin(x * 0.9) * Math.sin(y * 0.7) * 0.5 + 0.5;
    const checker = (Math.floor(x / 2) + Math.floor(y / 2)) % 2;
    const v = Math.round(60 + 140 * s + 40 * checker);
    return [v, Math.round(v * 0.8 + 20), Math.round(255 - v * 0.6), 255];
  });
}

/** Noise — worst case, no structure to hide in (seeded, reproducible). */
function noiseFixture(size: number): PixelBuffer {
  const next = lcg(0xbe7c4);
  return fixture(size, () => [next(), next(), next(), 255]);
}

/** A gradient behind a transparent letterbox band and a hole. */
function alphaFixture(size: number): PixelBuffer {
  return fixture(size, (x, y, w, h) => {
    const band = Math.floor(h / 6);
    if (y < band || y >= h - band) return [0, 0, 0, 0];
    if ((x / w - 0.5) ** 2 + (y / h - 0.5) ** 2 < 0.02) return [0, 0, 0, 0];
    return [
      Math.round((255 * x) / (w - 1)),
      Math.round(128 + 80 * Math.sin((y / h) * Math.PI)),
      Math.round((255 * (w - x)) / w),
      255,
    ];
  });
}

/** Colours a small offset off the palette entries — near-palette content. */
function nearPaletteFixture(size: number, palette: Palette): PixelBuffer {
  const entries = palette.entries;
  return fixture(size, (x, y, w, h) => {
    const cell = Math.floor((y / h) * 4) * 4 + Math.floor((x / w) * 4);
    const thread = entries[cell % entries.length];
    const [r, g, b] = thread?.rgb ?? [128, 128, 128];
    const off = ((x + y) % 3) * 6 - 6;
    return [
      Math.max(0, Math.min(255, r + off)),
      Math.max(0, Math.min(255, g + off)),
      Math.max(0, Math.min(255, b + off)),
      255,
    ];
  });
}

interface Fixture {
  name: string;
  buffer: PixelBuffer;
}

function spikeFixtures(grid: number, palette: Palette): Fixture[] {
  return [
    { name: 'gradient', buffer: gradientFixture(grid) },
    { name: 'organic', buffer: organicFixture(grid) },
    { name: 'flat-art', buffer: flatArtFixture(grid) },
    { name: 'detail', buffer: detailFixture(grid) },
    { name: 'noise', buffer: noiseFixture(grid) },
    { name: 'alpha', buffer: alphaFixture(grid) },
    { name: 'near-palette', buffer: nearPaletteFixture(grid, palette) },
  ];
}

// ---------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------

/** Mean ΔE76 between two buffers over opaque pixels. */
function meanDeltaE(a: PixelBuffer, b: PixelBuffer): number {
  const labA = new Float32Array(3);
  const labB = new Float32Array(3);
  let sum = 0;
  let n = 0;
  const px = a.width * a.height;
  for (let p = 0; p < px; p++) {
    const i = p * 4;
    if ((a.data[i + 3] ?? 255) === 0 || (b.data[i + 3] ?? 255) === 0) continue;
    srgbToLab(a.data[i] ?? 0, a.data[i + 1] ?? 0, a.data[i + 2] ?? 0, labA, 0);
    srgbToLab(b.data[i] ?? 0, b.data[i + 1] ?? 0, b.data[i + 2] ?? 0, labB, 0);
    const dl = (labA[0] ?? 0) - (labB[0] ?? 0);
    const da = (labA[1] ?? 0) - (labB[1] ?? 0);
    const db = (labA[2] ?? 0) - (labB[2] ?? 0);
    sum += Math.sqrt(dl * dl + da * da + db * db);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** Mean signed L* difference (output − source) — tonal bias direction. */
function luminanceBias(source: PixelBuffer, output: PixelBuffer): number {
  const labA = new Float32Array(3);
  const labB = new Float32Array(3);
  let sum = 0;
  let n = 0;
  const px = source.width * source.height;
  for (let p = 0; p < px; p++) {
    const i = p * 4;
    if ((source.data[i + 3] ?? 255) === 0) continue;
    srgbToLab(source.data[i] ?? 0, source.data[i + 1] ?? 0, source.data[i + 2] ?? 0, labA, 0);
    srgbToLab(output.data[i] ?? 0, output.data[i + 1] ?? 0, output.data[i + 2] ?? 0, labB, 0);
    sum += (labB[0] ?? 0) - (labA[0] ?? 0);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** 4×4 box-average a buffer (opaque-weighted), for tone comparison. */
function boxAverage(buffer: PixelBuffer): PixelBuffer {
  const bw = Math.floor(buffer.width / 4);
  const bh = Math.floor(buffer.height / 4);
  const data = new Uint8ClampedArray(bw * bh * 4);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = by * 4; y < by * 4 + 4; y++) {
        for (let x = bx * 4; x < bx * 4 + 4; x++) {
          const i = (y * buffer.width + x) * 4;
          if ((buffer.data[i + 3] ?? 255) === 0) continue;
          r += buffer.data[i] ?? 0;
          g += buffer.data[i + 1] ?? 0;
          b += buffer.data[i + 2] ?? 0;
          n++;
        }
      }
      const o = (by * bw + bx) * 4;
      data[o] = n === 0 ? 0 : Math.round(r / n);
      data[o + 1] = n === 0 ? 0 : Math.round(g / n);
      data[o + 2] = n === 0 ? 0 : Math.round(b / n);
      data[o + 3] = n === 0 ? 0 : 255;
    }
  }
  return { width: bw, height: bh, data };
}

/** Tone fidelity: ΔE76 between 4×4 box averages of source and output. */
function toneDeltaE(source: PixelBuffer, output: PixelBuffer): number {
  return meanDeltaE(boxAverage(source), boxAverage(output));
}

/** % of stitched cells whose 4-neighbours all hold a different index. */
function isolatedStitchPct(output: PixelBuffer): number {
  const indices = output.indices;
  if (indices === undefined) return 0;
  const { width, height } = output;
  let isolated = 0;
  let stitched = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = indices[y * width + x] ?? EMPTY_INDEX;
      if (idx === EMPTY_INDEX) continue;
      stitched++;
      const same = (nx: number, ny: number): boolean =>
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        (indices[ny * width + nx] ?? EMPTY_INDEX) === idx;
      if (!same(x - 1, y) && !same(x + 1, y) && !same(x, y - 1) && !same(x, y + 1)) isolated++;
    }
  }
  return stitched === 0 ? 0 : (100 * isolated) / stitched;
}

/** % of pixels that differ between two outputs (distinctness proxy). */
function changedPct(a: PixelBuffer, b: PixelBuffer): number {
  const px = a.width * a.height;
  let changed = 0;
  for (let p = 0; p < px; p++) {
    const i = p * 4;
    if (
      (a.data[i] ?? 0) !== (b.data[i] ?? 0) ||
      (a.data[i + 1] ?? 0) !== (b.data[i + 1] ?? 0) ||
      (a.data[i + 2] ?? 0) !== (b.data[i + 2] ?? 0)
    )
      changed++;
  }
  return (100 * changed) / px;
}

/** Every opaque output pixel must be a palette colour; empty stays empty. */
function membershipHolds(output: PixelBuffer, palette: Palette): boolean {
  const rgbSet = new Set(palette.entries.map((t) => t.rgb.join(',')));
  const px = output.width * output.height;
  for (let p = 0; p < px; p++) {
    const i = p * 4;
    const alpha = output.data[i + 3] ?? 0;
    const idx = output.indices?.[p] ?? EMPTY_INDEX;
    if (alpha === 0) {
      if (idx !== EMPTY_INDEX) return false;
      continue;
    }
    const key = `${String(output.data[i] ?? 0)},${String(output.data[i + 1] ?? 0)},${String(output.data[i + 2] ?? 0)}`;
    if (!rgbSet.has(key)) return false;
    const thread = palette.entries[idx];
    if (thread === undefined || thread.rgb.join(',') !== key) return false;
  }
  return true;
}

function byteIdentical(a: PixelBuffer, b: PixelBuffer): boolean {
  if (a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false;
  return true;
}

// ---------------------------------------------------------------------
// Gallery — side-by-side crops as a self-contained HTML artefact
// ---------------------------------------------------------------------

function toBase64(bytes: Uint8ClampedArray): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

interface GalleryCell {
  label: string;
  buffer: PixelBuffer;
}

function galleryHtml(sections: { title: string; cells: GalleryCell[] }[]): string {
  const blocks = sections
    .map((section) => {
      const cells = section.cells
        .map(
          (cell) =>
            `<figure><canvas data-w="${String(cell.buffer.width)}" data-h="${String(cell.buffer.height)}" data-px="${toBase64(cell.buffer.data)}"></canvas><figcaption>${cell.label}</figcaption></figure>`,
        )
        .join('\n');
      return `<h2>${section.title}</h2>\n<div class="row">${cells}</div>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>M8-SPIKE-01 dither gallery</title>
<style>
body{font:14px/1.4 system-ui;background:#161616;color:#f4f4f4;margin:2rem}
.row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:2rem}
figure{margin:0}figcaption{text-align:center;padding-top:4px;font-size:12px}
canvas{image-rendering:pixelated;width:240px;height:240px;background:#333}
h2{font-weight:400;border-bottom:1px solid #555;padding-bottom:4px}
</style></head><body>
<h1>M8-SPIKE-01 — dither candidates, identical crops</h1>
<p>Rendered at 240×240 CSS px with nearest-neighbour scaling. Same source,
grid, palette (64 DMC threads sampled across the range), Lab metric
throughout. Generated by tests/audits/m8-dither.audit.test.ts.</p>
${blocks}
<script>
for (const c of document.querySelectorAll('canvas')) {
  const w = +c.dataset.w, h = +c.dataset.h;
  c.width = w; c.height = h;
  const raw = atob(c.dataset.px);
  const px = new Uint8ClampedArray(raw.length);
  for (let i = 0; i < raw.length; i++) px[i] = raw.charCodeAt(i);
  c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
}
</script></body></html>
`;
}

// ---------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------

/**
 * A palette of `n` threads sampled evenly across the full DMC range.
 * The bench `palette64()` is the *first* 64 catalogue entries — a
 * colour-family chunk whose poor gamut coverage drowns quality metrics
 * in systematic palette error (L* bias ≈ −16 on every candidate in the
 * first run). Quality comparisons need a palette that plausibly spans
 * the content; timing rows keep the bench palette for comparability.
 */
function paletteSpread(n: number): Palette {
  const dmc = loadDmcPalette();
  const entries = [];
  for (let i = 0; i < n; i++)
    entries.push(dmc.entries[Math.floor((i * dmc.entries.length) / n)]);
  return {
    name: `dmc-${String(n)}-spread-spike`,
    entries: entries.filter((t): t is NonNullable<typeof t> => t !== undefined),
  };
}

function params(palette: Palette, strength = 1): CandidateParams {
  return { palette, metric: 'lab', serpentine: true, strength };
}

describe.skipIf(!AUDIT)('M8-SPIKE-01 dither evaluation (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];
  const candidates = allCandidates();
  const GRID = 300;

  it('cross-checks the prototype Floyd–Steinberg against the shipped stage', () => {
    const pal = palette64();
    const source = gradientFixture(GRID);
    const proto = candidates.find((c) => c.name === 'floyd-steinberg');
    expect(proto).toBeDefined();
    const mine = (proto as Candidate).run(source, params(pal));
    const ditherParams: DitherParams = { palette: pal, metric: 'lab', serpentine: true };
    const shipped = ditherStage.backends.ts(source, ditherParams);
    expect(byteIdentical(mine, shipped)).toBe(true);
    rows.push(
      counted('prototype FS vs shipped stage (gradient 300², p64, lab)', {
        verdict: 'byte-identical — the generic kernel loop reproduces production semantics',
      }),
    );
  }, AUDIT_TIMEOUT_MS);

  it('verifies determinism, membership and alpha handling for every candidate', () => {
    const pal = palette64();
    const alpha = alphaFixture(120);
    for (const candidate of candidates) {
      const a = candidate.run(alpha, params(pal));
      const b = candidate.run(alpha, params(pal));
      expect(byteIdentical(a, b), `${candidate.name} deterministic`).toBe(true);
      expect(membershipHolds(a, pal), `${candidate.name} membership`).toBe(true);
      // Transparent cells stay untouched RGBA(0,0,0,0).
      for (let p = 0; p < a.width * a.height; p++) {
        const i = p * 4;
        if ((alpha.data[i + 3] ?? 255) === 0) {
          expect(a.data[i + 3] ?? 0).toBe(0);
          expect(a.indices?.[p] ?? EMPTY_INDEX).toBe(EMPTY_INDEX);
        }
      }
    }
    rows.push(
      counted('invariants (all candidates, alpha fixture 120², p64)', {
        candidates: candidates.length,
        verdict: 'deterministic, palette-member, transparency-preserving',
      }),
    );
  }, AUDIT_TIMEOUT_MS);

  it('measures quality and stitch structure per candidate × fixture', () => {
    const pal = paletteSpread(64);
    const fixtures = spikeFixtures(GRID, pal);
    const fs = candidates.find((c) => c.name === 'floyd-steinberg') as Candidate;

    for (const fx of fixtures) {
      const fsOut = fs.run(fx.buffer, params(pal));
      for (const candidate of candidates) {
        const out = candidate.run(fx.buffer, params(pal));
        rows.push(
          counted(`${candidate.name} · ${fx.name}`, {
            family: candidate.family,
            'pixel ΔE': round(meanDeltaE(fx.buffer, out), 2),
            'tone ΔE (4×4)': round(toneDeltaE(fx.buffer, out), 2),
            'L* bias': round(luminanceBias(fx.buffer, out), 2),
            'isolated %': round(isolatedStitchPct(out), 2),
            'vs FS %px': candidate.name === 'floyd-steinberg' ? 0 : round(changedPct(fsOut, out), 1),
          }),
        );
      }
    }
  }, AUDIT_TIMEOUT_MS);

  it('measures strength response and the tiny-palette regime', () => {
    const pal8 = paletteSpread(8);
    const grad = gradientFixture(GRID);
    for (const candidate of candidates) {
      if (candidate.family === 'control') {
        const out = candidate.run(grad, params(pal8));
        rows.push(
          counted(`${candidate.name} · gradient · p8 (banding reference)`, {
            family: candidate.family,
            'tone ΔE (4×4)': round(toneDeltaE(grad, out), 2),
            'L* bias': round(luminanceBias(grad, out), 2),
            'isolated %': round(isolatedStitchPct(out), 2),
          }),
        );
        continue;
      }
      for (const strength of [0.5, 1]) {
        const out = candidate.run(grad, params(pal8, strength));
        rows.push(
          counted(`${candidate.name} · gradient · p8 · strength ${String(strength)}`, {
            family: candidate.family,
            'tone ΔE (4×4)': round(toneDeltaE(grad, out), 2),
            'L* bias': round(luminanceBias(grad, out), 2),
            'isolated %': round(isolatedStitchPct(out), 2),
          }),
        );
      }
    }
  }, AUDIT_TIMEOUT_MS);

  it('times every candidate at the benchmark boundaries', () => {
    const pal = palette64();
    const pal533 = loadDmcPalette();
    const noise = noiseFixture(GRID);
    for (const candidate of candidates) {
      rows.push(
        timed(
          `time ${candidate.name} · noise 300² · p64 · lab`,
          () => candidate.run(noise, params(pal)),
          15,
          { family: candidate.family },
        ),
      );
      rows.push(
        timed(
          `time ${candidate.name} · noise 300² · p533 · lab`,
          () => candidate.run(noise, params(pal533)),
          40,
          { family: candidate.family },
        ),
      );
    }
  }, AUDIT_TIMEOUT_MS);

  it('writes the side-by-side gallery for owner judgement', () => {
    const pal = paletteSpread(64);
    const GALLERY_GRID = 120;
    const fixtures = spikeFixtures(GALLERY_GRID, pal);
    const sections = fixtures.map((fx) => ({
      title: fx.name,
      cells: [
        { label: 'original', buffer: fx.buffer },
        ...candidates.map((candidate) => ({
          label: candidate.name,
          buffer: candidate.run(fx.buffer, params(pal)),
        })),
      ],
    }));
    // Threshold-tile inspection row: the raw tiles as greyscale.
    const tileCells: GalleryCell[] = [bayerTile(4), bayerTile(8), blueNoiseTile(32)].map(
      (tile) => {
        const data = new Uint8ClampedArray(tile.size * tile.size * 4);
        for (let i = 0; i < tile.size * tile.size; i++) {
          const v = Math.round((tile.thresholds[i] ?? 0) * 255);
          data[i * 4] = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
          data[i * 4 + 3] = 255;
        }
        return { label: tile.name, buffer: { width: tile.size, height: tile.size, data } };
      },
    );
    sections.push({ title: 'threshold tiles (greyscale ranks)', cells: tileCells });
    const path = writeReport('m8-spike-01-gallery.html', galleryHtml(sections));
    rows.push(counted('gallery artefact', { path }));
    expect(path.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit report', () => {
    findings.push(
      'Diffusion beats every alternative on tone fidelity for smooth content ' +
        '(organic: FS 1.45 / Jarvis 1.75 / Atkinson 2.67 vs none 8.05 tone ΔE), but ' +
        'costs isolated stitches (FS 36–50% on smooth fixtures). Atkinson is the calm ' +
        'outlier: roughly a third of FS isolation at a small tone cost, with its ' +
        'documented lightening bias visible only at strength 1 on dark content.',
      'Jarvis is the only large kernel worth keeping: Stucki tracks FS/Jarvis within ' +
        'noise on every quality metric while sharing their isolation cost, and ' +
        'Sierra Lite tracks FS within 0.1 tone ΔE everywhere — both are redundant.',
      'Bayer 4 and Bayer 8 are indistinguishable at stitch scale (identical metrics ' +
        'to 2 d.p., near-identical pixels): one ordered method suffices and matrix ' +
        'size does not earn a control. Blue-noise shares ordered pointwise costs but ' +
        'halves-to-quarters its isolated stitches (gradient 9.2% vs 24.4%) with no ' +
        'periodic texture — both families leave flat/near-palette content almost ' +
        'untouched, which diffusion cannot do (near-palette: ordered damages it, ' +
        '~15% px changed vs FS 0.45%; keep threshold methods for graphic content).',
      'Cost is not a differentiator: every candidate lands within ~10–20% of the ' +
        'no-dither reduce loop at 300² (25.8–34.1 ms p64, ~101–113 ms p533 in node); ' +
        'the palette scan dominates. No backend work is justified by this evidence; ' +
        'ordered/blue-noise are pointwise and WebGPU-shaped if a profile ever asks.',
      'Strength is a real control for both families: diffusion strength (fraction of ' +
        'error diffused) at 0.5 cuts isolation sharply (Atkinson 10.6→6.3, FS ' +
        '29.5→24.6 on p8 gradient) and *improves* tiny-palette tone (FS 27.9→23.9); ' +
        'threshold strength (amplitude scale over ±48/255) trades banding against ' +
        'noise. Serpentine stays diffusion-only; phase/seed earns no exposure — the ' +
        'blue-noise tile is fixed, generated (void-and-cluster, seed 0x5eed).',
      'Recommended committed set: none, floyd-steinberg, atkinson, jarvis, ' +
        'ordered (Bayer 8×8), blue-noise (32×32 fixed tile). Cut: stucki, ' +
        'sierra-lite, bayer-4. Decision recorded in the M8-SPIKE-01 decision-log ' +
        'entry with this artefact and the HTML gallery as evidence.',
    );
    const path = publishAudit({
      ticket: 'M8-SPIKE-01',
      question:
        'Which dither methods are materially different and useful for cross-stitch output, and which controls does each need?',
      rows,
      findings,
    });
    expect(path.length).toBeGreaterThan(0);
  });
});
