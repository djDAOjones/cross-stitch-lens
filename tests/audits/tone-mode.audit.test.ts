/**
 * CREATIVE-01 prototype — tone-mode evidence (AUDIT=1).
 *
 * The prototype's central measurement (ticket → "Slice-1 decisions of
 * record"): dither must diffuse error in the weighted space or hue
 * error leaks into lightness. Plus the supporting evidence the
 * sign-off sitting wants: quantile-cut share exactness (undithered)
 * and drift (dithered), the three-point curve inverting a mapping,
 * and the count-limit selection under the same weight as matching.
 *
 * Evidence for a human decision, not a gate (D139): assertions are
 * only the ones a broken run would trip. Artefacts:
 *   bench-reports/creative-01-proto-tone-<sha>.json
 *   bench-reports/creative-01-proto-tone-gallery.html
 *
 * PROTOTYPE on branch creative-01-proto: never merged as production
 * source; the signed build re-derives from the ticket.
 */

import { describe, expect, it } from 'vitest';

import {
  builtInProfiles,
  resolveProfileMembership,
} from '../../src/core/color-profile.ts';
import { labToSrgb, srgbToLab } from '../../src/core/color/convert.ts';
import { log } from '../../src/diagnostics/log.ts';
import type { PermittedSet } from '../../src/core/palette-policy.ts';
import { buildDistribution, selectPalette } from '../../src/core/palette-selection.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import {
  achievedShares,
  equalShares,
  ladderOrder,
  lightnessHistogram,
  naturalCuts,
  quantileCuts,
} from '../../src/core/tone/tone-bands.ts';
import { identityCurve, type ToneCurve } from '../../src/core/tone/tone-curve.ts';
import { selectWeighted } from '../../src/core/tone/tone-metric.ts';
import { toneMap, type ToneDither, type ToneMapParams } from '../../src/core/tone/tone-map.ts';
import { makeLadder } from '../../src/core/tone/proto-ladders.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from '../../src/core/types.ts';
import { sampleBuffer } from '../../src/ui/sample.ts';
import { buildIdentity, writeReport } from '../bench/env-node.ts';
import { AUDIT } from './audit.ts';

const GRID = 300;

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

/**
 * Columns sweep hue 0–360° at nominal constant L* and chroma — the
 * adversarial case for the error-space question: any per-column drift
 * of mean output lightness is hue error read back as tone. Gamut
 * clamping makes the realised L* only near-constant, so measurements
 * compare against the realised source, never the nominal value.
 */
function hueSweepConstL(width: number, height: number, l = 60, c = 30): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let x = 0; x < width; x++) {
    const hue = (x / width) * 2 * Math.PI;
    const a = c * Math.cos(hue);
    const b = c * Math.sin(hue);
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      labToSrgb(l, a, b, data, i);
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Horizontal lightness ramp L* 2–98 at a constant (a, b) tint. */
function lightnessRamp(width: number, height: number, a = 0, b = 0): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let x = 0; x < width; x++) {
    const l = 2 + (x / (width - 1)) * 96;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      labToSrgb(l, a, b, data, i);
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

// ---------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------

/** Mean L* per column over opaque cells. */
function perColumnMeanL(buffer: PixelBuffer): Float64Array {
  const means = new Float64Array(buffer.width);
  const lab = new Float32Array(3);
  for (let x = 0; x < buffer.width; x++) {
    let sum = 0;
    let n = 0;
    for (let y = 0; y < buffer.height; y++) {
      const i = (y * buffer.width + x) * 4;
      if ((buffer.data[i + 3] ?? 255) === 0) continue;
      srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, lab, 0);
      sum += lab[0] ?? 0;
      n++;
    }
    means[x] = n === 0 ? 0 : sum / n;
  }
  return means;
}

/**
 * Hue-leak numbers for the sweep fixture: per-column mean output L*
 * minus the realised source column L*, reported as spread (max − min)
 * and standard deviation across columns. A perfect tone mapping holds
 * every column at the same signed offset; hue leaking into lightness
 * shows up as spread.
 */
function hueLeak(source: PixelBuffer, output: PixelBuffer): { spread: number; sigma: number } {
  const src = perColumnMeanL(source);
  const out = perColumnMeanL(output);
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  const n = Math.min(src.length, out.length);
  const delta = new Float64Array(n);
  for (let x = 0; x < n; x++) {
    const d = (out[x] ?? 0) - (src[x] ?? 0);
    delta[x] = d;
    if (d < min) min = d;
    if (d > max) max = d;
    sum += d;
  }
  const mean = n === 0 ? 0 : sum / n;
  let varSum = 0;
  for (let x = 0; x < n; x++) varSum += ((delta[x] ?? 0) - mean) ** 2;
  return { spread: max - min, sigma: n === 0 ? 0 : Math.sqrt(varSum / n) };
}

/** Mean signed L* difference (output − source) over opaque cells. */
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

/** Total-variation distance between target and achieved shares. */
function shareDrift(target: readonly number[], achieved: readonly number[]): number {
  let sum = 0;
  for (let k = 0; k < target.length; k++) {
    sum += Math.abs((target[k] ?? 0) - (achieved[k] ?? 0));
  }
  return sum / 2;
}

/** Non-empty cell count of an indices sidecar. */
function stitched(indices: Uint16Array | undefined): number {
  if (indices === undefined) return 0;
  let n = 0;
  for (let p = 0; p < indices.length; p++) {
    if ((indices[p] ?? EMPTY_INDEX) !== EMPTY_INDEX) n++;
  }
  return n;
}

// ---------------------------------------------------------------------
// Gallery (the M8-SPIKE-01 canvas/base64 pattern)
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
<html lang="en"><head><meta charset="utf-8"><title>CREATIVE-01 tone-mode gallery</title>
<style>
body{font:14px/1.4 system-ui;background:#161616;color:#f4f4f4;margin:2rem}
.row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:2rem}
figure{margin:0}figcaption{text-align:center;padding-top:4px;font-size:12px;max-width:240px}
canvas{image-rendering:pixelated;width:240px;height:240px;background:#333}
h2{font-weight:400;border-bottom:1px solid #555;padding-bottom:4px}
</style></head><body>
<h1>CREATIVE-01 — tone-mode prototype, before/afters</h1>
<p>Rendered at 240×240 CSS px with nearest-neighbour scaling. Generated
by tests/audits/tone-mode.audit.test.ts (AUDIT=1). Prototype evidence,
branch creative-01-proto — not a shipped rendering.</p>
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

describe.skipIf(!AUDIT)('CREATIVE-01 tone-mode prototype evidence (AUDIT=1)', () => {
  it('measures the error spaces, shares, curve and weighted selection', () => {
    const catalogue = loadCatalogue();
    const profiles = builtInProfiles(catalogue);
    const ladderFromProfile = (id: string): Palette => {
      const profile = profiles.find((p) => p.id === id);
      if (profile === undefined) throw new Error(`missing built-in profile ${id}`);
      const resolved = resolveProfileMembership(profile.recipe, { catalogue });
      return { name: profile.name, entries: resolved.entries };
    };
    const ladders: Palette[] = [
      ladderFromProfile('builtin:delft-blue'),
      ladderFromProfile('builtin:ukiyo-e'),
      makeLadder(catalogue.threads, 'Proto sepia (25–55°)', 25, 55, 6),
      makeLadder(catalogue.threads, 'Proto rose (320–355°)', 320, 355, 6),
    ];
    const delft = ladders[0];
    if (delft === undefined) throw new Error('no ladders');

    const run = (
      source: PixelBuffer,
      palette: Palette,
      tone: number,
      dither: ToneDither,
      opts: { cuts?: readonly number[] | null; curve?: ToneCurve | null } = {},
    ): PixelBuffer => {
      const order = ladderOrder(palette);
      const params: ToneMapParams = {
        palette,
        tone,
        dither,
        serpentine: true,
        cuts: opts.cuts ?? null,
        order: opts.cuts === undefined || opts.cuts === null ? null : order,
        curve: opts.curve ?? null,
      };
      return toneMap(source, params);
    };

    // -- A. The error-space measurement (hue sweep at constant L*) ----
    const sweep = hueSweepConstL(256, 256);
    const sweepCuts = naturalCuts(delft, ladderOrder(delft));
    const errorSpace = (['none', 'srgb-error', 'weighted-error'] as const).map((dither) => {
      const out = run(sweep, delft, 1, dither, { cuts: sweepCuts });
      const leak = hueLeak(sweep, out);
      return {
        dither,
        tone: 1,
        columnSpreadL: leak.spread,
        columnSigmaL: leak.sigma,
        meanBiasL: luminanceBias(sweep, out),
      };
    });
    const errorSpaceHalf = (['srgb-error', 'weighted-error'] as const).map((dither) => {
      const out = run(sweep, delft, 0.5, dither);
      const leak = hueLeak(sweep, out);
      return {
        dither,
        tone: 0.5,
        columnSpreadL: leak.spread,
        columnSigmaL: leak.sigma,
        meanBiasL: luminanceBias(sweep, out),
      };
    });

    // -- B. Share exactness and drift (Equalise on the sample card) ---
    const sample = sampleBuffer();
    const grid = resizeStage.backends.ts(sample, {
      width: GRID,
      height: GRID,
      mode: 'contain',
    });
    const shares = ladders.map((palette) => {
      const order = ladderOrder(palette);
      const target = equalShares(palette.entries.length);
      const hist = lightnessHistogram(grid);
      const cuts = quantileCuts(hist, target);
      const byDither = (['none', 'weighted-error', 'srgb-error'] as const).map((dither) => {
        const out = run(grid, palette, 1, dither, { cuts });
        const achieved = achievedShares(out.indices ?? new Uint16Array(0), palette, order);
        return { dither, drift: shareDrift(target, achieved), achieved };
      });
      return { ladder: palette.name, rungs: palette.entries.length, byDither };
    });

    // -- C. The curve inverts a mapping ------------------------------
    const ramp = lightnessRamp(256, 64);
    const inverted: ToneCurve = [
      { in: 0, out: 100 },
      { in: 50, out: 50 },
      { in: 100, out: 0 },
    ];
    const rampCuts = naturalCuts(delft, ladderOrder(delft));
    const straight = run(ramp, delft, 1, 'none', { cuts: rampCuts, curve: identityCurve() });
    const flipped = run(ramp, delft, 1, 'none', { cuts: rampCuts, curve: inverted });
    const half = Math.floor(ramp.width / 2);
    const meanL = (buffer: PixelBuffer, from: number, to: number): number => {
      const cols = perColumnMeanL(buffer);
      let sum = 0;
      for (let x = from; x < to; x++) sum += cols[x] ?? 0;
      return sum / (to - from);
    };
    const curveEvidence = {
      straightLeftMeanL: meanL(straight, 0, half),
      straightRightMeanL: meanL(straight, half, ramp.width),
      invertedLeftMeanL: meanL(flipped, 0, half),
      invertedRightMeanL: meanL(flipped, half, ramp.width),
    };

    // -- D. Count-limit selection under the weight -------------------
    const eligible = catalogue.threads.filter((t) => t.status === 'current');
    const distribution = buildDistribution(grid);
    const labOf = (rgb: readonly [number, number, number]): [number, number, number] => {
      const lab = new Float32Array(3);
      srgbToLab(rgb[0], rgb[1], rgb[2], lab, 0);
      return [
        Math.round((lab[0] ?? 0) * 10) / 10,
        Math.round((lab[1] ?? 0) * 10) / 10,
        Math.round((lab[2] ?? 0) * 10) / 10,
      ];
    };
    const selection = [0, 0.5, 1].map((tone) => ({
      tone,
      picks: selectWeighted(eligible, 8, distribution, tone).map((t) => ({
        ref: `${t.brandId} ${t.reference}`,
        hex: t.hex,
        lab: labOf(t.rgb),
      })),
    }));

    // The t = 0 copy must agree with production selection (no locks,
    // no distance rule): same threads or the prototype measures a
    // different objective than the app ships.
    const permitted: PermittedSet = {
      eligible,
      locks: [],
      preferred: new Set<string>(),
      unresolved: [],
      conflicts: [],
      ok: true,
    };
    const production = selectPalette(permitted, 8, distribution, 'audit').palette.entries.map(
      (t) => t.id,
    );
    const copyAtZero = selectWeighted(eligible, 8, distribution, 0).map((t) => t.id);
    expect(copyAtZero).toEqual(production);

    // -- Gallery ------------------------------------------------------
    const sections: { title: string; cells: GalleryCell[] }[] = [];
    for (const palette of ladders) {
      const order = ladderOrder(palette);
      const natural = naturalCuts(palette, order);
      const equalised = quantileCuts(lightnessHistogram(grid), equalShares(palette.entries.length));
      sections.push({
        title: `${palette.name} — ${String(palette.entries.length)} rungs, sample card`,
        cells: [
          { label: 'source', buffer: grid },
          { label: 't=0 colour (ΔE76)', buffer: run(grid, palette, 0, 'weighted-error') },
          { label: 't=0.5 weighted', buffer: run(grid, palette, 0.5, 'weighted-error') },
          { label: 't=1 natural cuts, hard', buffer: run(grid, palette, 1, 'none', { cuts: natural }) },
          {
            label: 't=1 natural cuts, weighted dither',
            buffer: run(grid, palette, 1, 'weighted-error', { cuts: natural }),
          },
          {
            label: 't=1 Equalise, weighted dither',
            buffer: run(grid, palette, 1, 'weighted-error', { cuts: equalised }),
          },
        ],
      });
    }
    sections.push({
      title: 'Error space — hue sweep at constant L*, Delft blue, t=1 natural cuts',
      cells: [
        { label: 'source (constant L*)', buffer: sweep },
        { label: 'none (hard cuts)', buffer: run(sweep, delft, 1, 'none', { cuts: sweepCuts }) },
        {
          label: 'srgb-error (production-shaped)',
          buffer: run(sweep, delft, 1, 'srgb-error', { cuts: sweepCuts }),
        },
        {
          label: 'weighted-error (scaled space)',
          buffer: run(sweep, delft, 1, 'weighted-error', { cuts: sweepCuts }),
        },
      ],
    });
    const dmcAtTone = (tone: number): PixelBuffer => {
      const picks = selectWeighted(eligible, 8, distribution, tone);
      return run(grid, { name: `DMC 8 @ t=${String(tone)}`, entries: picks }, tone, 'weighted-error');
    };
    sections.push({
      title: 'Weighted selection — DMC catalogue, limit 8, sample card',
      cells: [
        { label: 'source', buffer: grid },
        { label: 't=0 picks + t=0 match', buffer: dmcAtTone(0) },
        { label: 't=0.5 picks + match', buffer: dmcAtTone(0.5) },
        { label: 't=1 picks + t=1 match', buffer: dmcAtTone(1) },
      ],
    });

    // -- Artefacts ----------------------------------------------------
    const report = {
      schemaVersion: 1,
      startedAt: new Date().toISOString(),
      build: buildIdentity(),
      grid: GRID,
      ladders: ladders.map((p) => ({
        name: p.name,
        rungs: p.entries.map((t) => ({ ref: `${t.brandId} ${t.reference}`, hex: t.hex })),
      })),
      errorSpace: [...errorSpace, ...errorSpaceHalf],
      shares,
      curve: curveEvidence,
      selection,
    };
    const jsonPath = writeReport(
      `creative-01-proto-tone-${buildIdentity().gitSha}.json`,
      `${JSON.stringify(report, null, 2)}\n`,
    );
    const htmlPath = writeReport('creative-01-proto-tone-gallery.html', galleryHtml(sections));

    log.info(
      'audit',
      [
        '',
        'CREATIVE-01 tone-mode evidence',
        ...[...errorSpace, ...errorSpaceHalf].map(
          (r) =>
            `  error-space t=${String(r.tone)} ${r.dither.padEnd(14)} ` +
            `column spread ${r.columnSpreadL.toFixed(2)} L*, σ ${r.columnSigmaL.toFixed(2)}, ` +
            `bias ${r.meanBiasL.toFixed(2)}`,
        ),
        ...shares.map(
          (s) =>
            `  shares ${s.ladder}: ` +
            s.byDither.map((d) => `${d.dither} drift ${(d.drift * 100).toFixed(1)}%`).join(', '),
        ),
        `  curve: straight L ${curveEvidence.straightLeftMeanL.toFixed(1)}→${curveEvidence.straightRightMeanL.toFixed(1)}, ` +
          `inverted L ${curveEvidence.invertedLeftMeanL.toFixed(1)}→${curveEvidence.invertedRightMeanL.toFixed(1)}`,
        ...selection.map(
          (s) =>
            `  selection t=${String(s.tone)}: ${s.picks.map((p) => `${p.ref} (L ${String(p.lab[0])})`).join(', ')}`,
        ),
        `  artefacts: ${jsonPath} ; ${htmlPath}`,
      ].join('\n'),
    );

    // -- Broken-run guards -------------------------------------------
    for (const r of [...errorSpace, ...errorSpaceHalf]) {
      expect(Number.isFinite(r.columnSpreadL)).toBe(true);
    }
    for (const s of shares) {
      for (const d of s.byDither) {
        const total = d.achieved.reduce((sum, v) => sum + v, 0);
        expect(total, `${s.ladder}/${d.dither} shares`).toBeCloseTo(1, 5);
      }
      // "Exact at any N" holds up to ties: a flat region shares one
      // L*, so a cut cannot split it and the whole region lands on one
      // side. The sample card's flat swatches bound undithered
      // exactness near 2–3 % here; a genuinely broken mapping is an
      // order of magnitude out.
      const undithered = s.byDither.find((d) => d.dither === 'none');
      expect(
        undithered?.drift ?? 1,
        `${s.ladder} undithered Equalise drift`,
      ).toBeLessThan(0.05);
    }
    // An inverted curve must actually invert the ramp.
    expect(curveEvidence.straightLeftMeanL).toBeLessThan(curveEvidence.straightRightMeanL);
    expect(curveEvidence.invertedLeftMeanL).toBeGreaterThan(curveEvidence.invertedRightMeanL);
    // Every render stitched every cell (fixtures are fully opaque).
    const anyOut = run(grid, delft, 1, 'weighted-error', { cuts: naturalCuts(delft, ladderOrder(delft)) });
    expect(stitched(anyOut.indices)).toBe(GRID * GRID);
  });
});

describe.runIf(!AUDIT)('CREATIVE-01 tone-mode prototype evidence (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
