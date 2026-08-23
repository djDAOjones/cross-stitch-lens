/**
 * TONE-01 evidence (AUDIT=1): the shipped tone mode measured on the
 * bench fixtures, per build — the production successor of the
 * CREATIVE-01 prototype audit whose findings the ticket records.
 *
 * What it regenerates:
 * - the error-space table: the shipped dither's hue→lightness leak on
 *   the adversarial hue sweep (the prototype measured 6.9 L* column
 *   spread reusing sRGB error terms against 2.3 in the weighted
 *   space; the shipped stage must stay on the weighted side);
 * - Equalise share exactness undithered and drift dithered, on the
 *   sample card ("exact at any N" means exact up to flat regions —
 *   the readout shows achieved shares, never restated targets);
 * - the three-point curve inverting a lightness mapping;
 * - the weighted count-limit selection discovering a lightness ladder
 *   from the whole catalogue;
 * - the colour-use floor's drop count on the sample card;
 * - a before/after gallery over the sample card for two programmatic
 *   hue-window ladders (evidence only — a shipped ladder profile goes
 *   through the signed-batch process, never this).
 *
 * Assertions are only the ones a broken run would trip (D139);
 * artefacts:
 *   bench-reports/audit-tone-01-<sha>.json
 *   bench-reports/tone-01-gallery-<sha>.html
 */

import { describe, expect, it } from 'vitest';

import { labToSrgb, srgbToLab } from '../../src/core/color/convert.ts';
import {
  equalShares,
  identityCurve,
  ladderOrder,
  lightnessHistogram,
  quantileCuts,
  rungCounts,
  type ToneConfig,
  type ToneCurve,
} from '../../src/core/color/tone.ts';
import {
  builtInProfiles,
  resolveProfileMembership,
  rgbToHsb,
} from '../../src/core/color-profile.ts';
import type { PermittedSet } from '../../src/core/palette-policy.ts';
import { buildDistribution, selectThreads } from '../../src/core/palette-selection.ts';
import { ditherStage, type DitherParams } from '../../src/core/pipeline/dither.ts';
import { reduceStage } from '../../src/core/pipeline/reduce.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer, type Thread } from '../../src/core/types.ts';
import { log } from '../../src/diagnostics/log.ts';
import { sampleBuffer } from '../../src/ui/sample.ts';
import { buildIdentity, writeReport } from '../bench/env-node.ts';
import { encodePng } from '../ui-baseline/source.ts';
import { AUDIT, AUDIT_TIMEOUT_MS, counted, publishAudit, type AuditRow } from './audit.ts';

const runReduce = reduceStage.backends.ts;
const runDither = ditherStage.backends.ts;
const runResize = resizeStage.backends.ts;
if (runReduce === undefined || runDither === undefined || runResize === undefined) {
  throw new Error('ts backends must exist');
}

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

/** Horizontal lightness ramp, neutral. */
function lightnessRamp(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let x = 0; x < width; x++) {
    const v = Math.round((x / (width - 1)) * 255);
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/**
 * Hue window (degrees, may wrap) → a `count`-rung ladder from the
 * catalogue, evenly sampled across its lightness range. Evidence
 * only; the shipped ladders are curated through the signed batch.
 */
function makeLadder(
  threads: readonly Thread[],
  name: string,
  hueLo: number,
  hueHi: number,
  count: number,
): Palette {
  const scratch = new Float32Array(3);
  const inWindow = (hue: number): boolean => {
    const lo = ((hueLo % 360) + 360) % 360;
    const hi = ((hueHi % 360) + 360) % 360;
    return lo <= hi ? hue >= lo && hue <= hi : hue >= lo || hue <= hi;
  };
  const candidates = threads
    .filter((t) => t.status === 'current')
    .map((t) => {
      const [hue, sat, bri] = rgbToHsb(t.rgb);
      srgbToLab(t.rgb[0], t.rgb[1], t.rgb[2], scratch, 0);
      return { thread: t, hue, sat, bri, l: scratch[0] ?? 0 };
    })
    .filter((c) => c.sat >= 20 && c.sat <= 95 && c.bri >= 12 && inWindow(c.hue))
    .sort((a, b) => a.l - b.l || a.thread.id.localeCompare(b.thread.id));
  const rungs: Thread[] = [];
  const seen = new Set<string>();
  if (candidates.length > 0) {
    const last = candidates.length - 1;
    for (let k = 0; k < count; k++) {
      const at = count === 1 ? 0 : Math.round((k * last) / (count - 1));
      const pick = candidates[at];
      if (pick === undefined || seen.has(pick.thread.hex)) continue;
      seen.add(pick.thread.hex);
      rungs.push(pick.thread);
    }
  }
  return { name, entries: rungs };
}

/** Per-column mean L* difference stats between output and source. */
function columnLeak(
  source: PixelBuffer,
  output: PixelBuffer,
): { spread: number; sigma: number; bias: number } {
  const scratch = new Float32Array(3);
  const colMean = (buffer: PixelBuffer, x: number): number => {
    let sum = 0;
    let n = 0;
    for (let y = 0; y < buffer.height; y++) {
      const i = (y * buffer.width + x) * 4;
      srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, scratch, 0);
      sum += scratch[0] ?? 0;
      n++;
    }
    return n === 0 ? 0 : sum / n;
  };
  const deltas: number[] = [];
  for (let x = 0; x < source.width; x++) {
    deltas.push(colMean(output, x) - colMean(source, x));
  }
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const spread = Math.max(...deltas) - Math.min(...deltas);
  const sigma = Math.sqrt(
    deltas.reduce((a, d) => a + (d - mean) * (d - mean), 0) / deltas.length,
  );
  return { spread, sigma, bias: mean };
}

/** Achieved share per rung of an indices sidecar (darkest first). */
function achievedByRung(indices: Uint16Array, palette: Palette): number[] {
  const order = ladderOrder(palette);
  const rungOfIndex = new Int32Array(palette.entries.length).fill(-1);
  order.forEach((entry, rung) => {
    rungOfIndex[entry] = rung;
  });
  const { counts, total } = rungCounts(indices, rungOfIndex, order.length);
  return [...counts].map((c) => (total === 0 ? 0 : c / total));
}

/** Mean output L* over one horizontal half of a buffer. */
function halfMeanL(buffer: PixelBuffer, half: 'left' | 'right'): number {
  const scratch = new Float32Array(3);
  const from = half === 'left' ? 0 : Math.floor(buffer.width / 2);
  const to = half === 'left' ? Math.floor(buffer.width / 2) : buffer.width;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < buffer.height; y++) {
    for (let x = from; x < to; x++) {
      const i = (y * buffer.width + x) * 4;
      srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, scratch, 0);
      sum += scratch[0] ?? 0;
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function toneAt(weight: number, cuts: number[] | null = null, curve?: ToneCurve): ToneConfig {
  return { weight, curve: curve ?? identityCurve(), cuts };
}

/** Buffer → PNG data URI for the gallery. */
function dataUri(buffer: PixelBuffer): string {
  return `data:image/png;base64,${Buffer.from(encodePng(buffer)).toString('base64')}`;
}

describe.runIf(AUDIT)('TONE-01 tone-mode evidence', () => {
  it(
    'measures the shipped tone paths and writes the artefacts',
    () => {
      const catalogue = loadCatalogue();
      // The real curated ladder (M15's signed built-in, the D46
      // gradient) — the same fixture the prototype measured, so the
      // shipped numbers land beside the prototype's.
      const delftProfile = builtInProfiles(catalogue).find((p) => p.id === 'builtin:delft-blue');
      const delftMembers =
        delftProfile === undefined
          ? []
          : resolveProfileMembership(delftProfile.recipe, { catalogue }).entries;
      const delft: Palette = { name: 'Delft blue', entries: [...delftMembers] };
      const ember = makeLadder(catalogue.threads, 'Warm window 10–50', 10, 50, 5);
      expect(delft.entries.length).toBeGreaterThanOrEqual(4);
      expect(ember.entries.length).toBeGreaterThanOrEqual(4);
      const rows: AuditRow[] = [];
      const findings: string[] = [];

      // --- A. The error space through the shipped dither ------------
      const sweep = hueSweepConstL(256, 256);
      const undithered = runReduce(sweep, {
        palette: delft,
        metric: 'lab',
        path: 'exact',
        tone: toneAt(1),
      });
      const leakNone = columnLeak(sweep, undithered);
      rows.push(
        counted('hue sweep, t=1, no dither', {
          spreadL: leakNone.spread.toFixed(2),
          sigma: leakNone.sigma.toFixed(2),
          bias: leakNone.bias.toFixed(2),
        }),
      );
      const ditherBase: Omit<DitherParams, 'algorithm'> = {
        palette: delft,
        metric: 'lab',
        strength: 1,
        serpentine: true,
        tone: toneAt(1),
      };
      const fs = runDither(sweep, { ...ditherBase, algorithm: 'floyd-steinberg' });
      const leakFs = columnLeak(sweep, fs);
      rows.push(
        counted('hue sweep, t=1, floyd-steinberg (weighted space)', {
          spreadL: leakFs.spread.toFixed(2),
          sigma: leakFs.sigma.toFixed(2),
          bias: leakFs.bias.toFixed(2),
        }),
      );
      const ordered = runDither(sweep, { ...ditherBase, algorithm: 'ordered' });
      const leakOrdered = columnLeak(sweep, ordered);
      rows.push(
        counted('hue sweep, t=1, ordered (L-offset tile)', {
          spreadL: leakOrdered.spread.toFixed(2),
          sigma: leakOrdered.sigma.toFixed(2),
          bias: leakOrdered.bias.toFixed(2),
        }),
      );
      findings.push(
        `Weighted-space diffusion holds tone on the hue sweep: spread ${leakFs.spread.toFixed(2)} L*, σ ${leakFs.sigma.toFixed(2)}, bias ${leakFs.bias.toFixed(2)} (the prototype measured ~6.9 L* spread reusing sRGB error terms).`,
        `The threshold family (L-offset tile, the stated working assumption) sits between hard cuts and diffusion: spread ${leakOrdered.spread.toFixed(2)} L*, bias ${leakOrdered.bias.toFixed(2)} — published for the sitting, not asserted.`,
      );

      // --- B. Equalise share exactness on the sample card ------------
      const card = runResize(sampleBuffer(), { width: 200, height: 200, mode: 'contain' });
      const hist = lightnessHistogram(card);
      const cuts = quantileCuts(hist, equalShares(delft.entries.length));
      const target = 1 / delft.entries.length;
      const exact = runReduce(card, {
        palette: delft,
        metric: 'lab',
        path: 'exact',
        tone: toneAt(1, cuts),
      });
      const sharesExact = achievedByRung(exact.indices ?? new Uint16Array(0), delft);
      const drift = (shares: number[]): number =>
        shares.reduce((a, s) => a + Math.abs(s - target), 0) / 2;
      const driftExact = drift(sharesExact);
      rows.push(
        counted('sample card, Equalise, no dither', {
          shares: sharesExact.map((s) => (s * 100).toFixed(1)).join('/'),
          tvDrift: `${(driftExact * 100).toFixed(1)}%`,
        }),
      );
      const fsCard = runDither(card, {
        palette: delft,
        metric: 'lab',
        algorithm: 'floyd-steinberg',
        strength: 1,
        serpentine: true,
        tone: toneAt(1, cuts),
      });
      const sharesFs = achievedByRung(fsCard.indices ?? new Uint16Array(0), delft);
      const driftFs = drift(sharesFs);
      rows.push(
        counted('sample card, Equalise, floyd-steinberg', {
          shares: sharesFs.map((s) => (s * 100).toFixed(1)).join('/'),
          tvDrift: `${(driftFs * 100).toFixed(1)}%`,
        }),
      );
      findings.push(
        `Equalise lands ${(driftExact * 100).toFixed(1)}% total-variation drift undithered (bounded by flat regions) and ${(driftFs * 100).toFixed(1)}% under Floyd–Steinberg — the ramp readout shows achieved shares, never targets.`,
      );

      // --- C. The curve inverts a lightness mapping -------------------
      const ramp = lightnessRamp(200, 40);
      const straight = runReduce(ramp, {
        palette: delft,
        metric: 'lab',
        path: 'exact',
        tone: toneAt(1),
      });
      const inverted = runReduce(ramp, {
        palette: delft,
        metric: 'lab',
        path: 'exact',
        tone: toneAt(1, null, [
          { in: 0, out: 100 },
          { in: 50, out: 50 },
          { in: 100, out: 0 },
        ]),
      });
      const straightLeft = halfMeanL(straight, 'left');
      const straightRight = halfMeanL(straight, 'right');
      const invertedLeft = halfMeanL(inverted, 'left');
      const invertedRight = halfMeanL(inverted, 'right');
      rows.push(
        counted('lightness ramp, identity vs inverted curve', {
          straight: `${straightLeft.toFixed(0)}→${straightRight.toFixed(0)}`,
          inverted: `${invertedLeft.toFixed(0)}→${invertedRight.toFixed(0)}`,
        }),
      );

      // --- D. Weighted selection discovers a ladder -------------------
      const permitted: PermittedSet = {
        eligible: catalogue.threads.filter((t) => t.status === 'current'),
        locks: [],
        preferred: new Set<string>(),
        unresolved: [],
        conflicts: [],
        ok: true,
      };
      const distribution = buildDistribution(card);
      const picks = selectThreads(permitted, 8, distribution, 0, { tone: toneAt(1) });
      const scratch = new Float32Array(3);
      const pickL = picks.threads.map((t) => {
        srgbToLab(t.rgb[0], t.rgb[1], t.rgb[2], scratch, 0);
        return scratch[0] ?? 0;
      });
      const lSpan = Math.max(...pickL) - Math.min(...pickL);
      rows.push(
        counted('whole catalogue, limit 8, t=1', {
          picks: picks.threads.map((t) => t.id).join(' '),
          lSpan: lSpan.toFixed(1),
        }),
      );
      findings.push(
        `Weighted selection over the whole catalogue at limit 8 spans L* ${Math.min(...pickL).toFixed(0)}–${Math.max(...pickL).toFixed(0)} — a lightness ladder from the metric alone.`,
      );

      // --- E. The colour-use floor ------------------------------------
      // 40k stitches over 12 colours averages ~3.3k each; a 3k floor
      // genuinely bites on the sample card's flat regions.
      const floored = selectThreads(permitted, 12, distribution, 0, {
        floor: { on: true, minStitches: 3000 },
      });
      rows.push(
        counted('floor 3000 stitches after limit 12 (sample card, 40k stitches)', {
          kept: floored.threads.length,
          dropped: floored.floorDropped,
        }),
      );

      // --- F. Gallery ---------------------------------------------------
      const gallery: string[] = [
        '<!doctype html><meta charset="utf-8"><title>TONE-01 gallery</title>',
        '<style>body{font:14px system-ui;margin:1rem;background:#222;color:#eee}figure{display:inline-block;margin:.4rem}img{width:192px;height:192px;image-rendering:pixelated}figcaption{font-size:.75rem;max-width:192px}</style>',
        `<h1>TONE-01 — before/after over the sample card (build ${buildIdentity().gitSha})</h1>`,
        '<p>Programmatic hue-window ladders, evidence only; shipped ladder profiles go through the signed batch (M15-GALLERY-01).</p>',
      ];
      const cardSmall = runResize(sampleBuffer(), { width: 128, height: 128, mode: 'contain' });
      for (const ladder of [delft, ember]) {
        gallery.push(`<h2>${ladder.name} — ${String(ladder.entries.length)} rungs</h2>`);
        const cells: [string, PixelBuffer][] = [
          [
            'colour match (t=0)',
            runReduce(cardSmall, { palette: ladder, metric: 'lab', path: 'exact' }),
          ],
          [
            'tone, natural bands (t=1)',
            runReduce(cardSmall, {
              palette: ladder,
              metric: 'lab',
              path: 'exact',
              tone: toneAt(1),
            }),
          ],
          [
            'tone, Equalise (t=1)',
            runReduce(cardSmall, {
              palette: ladder,
              metric: 'lab',
              path: 'exact',
              tone: toneAt(
                1,
                quantileCuts(lightnessHistogram(cardSmall), equalShares(ladder.entries.length)),
              ),
            }),
          ],
          [
            'tone + floyd–steinberg (t=1)',
            runDither(cardSmall, {
              palette: ladder,
              metric: 'lab',
              algorithm: 'floyd-steinberg',
              strength: 1,
              serpentine: true,
              tone: toneAt(1),
            }),
          ],
        ];
        for (const [label, buffer] of cells) {
          gallery.push(
            `<figure><img alt="${ladder.name} — ${label}" src="${dataUri(buffer)}"><figcaption>${label}</figcaption></figure>`,
          );
        }
      }
      const galleryPath = writeReport(
        `tone-01-gallery-${buildIdentity().gitSha}.html`,
        gallery.join('\n'),
      );
      log.info('audit', `gallery written: ${galleryPath}`);

      publishAudit({
        ticket: 'TONE-01',
        question:
          'Does the shipped tone mode hold lightness under dither, land Equalise shares, invert cleanly, and ladder its selection?',
        rows,
        findings,
      });

      // Broken-run tripwires only (D139): the evidence is for humans.
      expect(leakFs.spread).toBeLessThan(4);
      expect(Math.abs(leakFs.bias)).toBeLessThan(1);
      expect(leakNone.spread).toBeLessThan(2);
      expect(driftExact).toBeLessThan(0.06);
      expect(straightLeft).toBeLessThan(straightRight);
      expect(invertedLeft).toBeGreaterThan(invertedRight);
      expect(lSpan).toBeGreaterThan(60);
      expect(floored.threads.length).toBeGreaterThanOrEqual(1);
      const stitched = (indices: Uint16Array | undefined): number => {
        if (indices === undefined) return 0;
        let n = 0;
        for (const index of indices) if (index !== EMPTY_INDEX) n++;
        return n;
      };
      expect(stitched(exact.indices)).toBe(200 * 200);
    },
    AUDIT_TIMEOUT_MS,
  );
});

describe.runIf(!AUDIT)('TONE-01 tone-mode evidence (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
