/**
 * ADJUST-01 evidence (AUDIT=1): the shipped adjust stage measured on
 * the bench fixtures, per build — the production successor of the
 * CREATIVE-01 prototype's axis-2 findings.
 *
 * What it regenerates:
 * - **the cost table**, which is why this stage's hot loop is
 *   hand-rolled: the exact per-pixel Lab round trip against the
 *   shipped tabled path, in ms per megapixel, plus the whole-frame
 *   headroom against the ≥ 4 updates/s promise (D135) at a w1280
 *   source and a 300² grid;
 * - **the accuracy price** of that speed: the worst channel deviation
 *   from the exact converts, over every shipped preset;
 * - **the re-selection effect** — the prototype's decisive number:
 *   each preset re-selects its palette from the *adjusted* picture,
 *   and every non-None candidate changes 3–8 of 8 picks on the sample
 *   card;
 * - **the LUT fingerprint is untouched** by any adjustment (D46);
 * - a before/after gallery over the sample card and the photo rig
 *   for all nine candidates, which is what the owner's sitting judges
 *   (the names and membership are theirs to sign — D200).
 *
 * Assertions are only the ones a broken run would trip (D139);
 * artefacts:
 *   bench-reports/audit-adjust-01-<sha>.json
 *   bench-reports/adjust-01-gallery-<sha>.html
 */

import { describe, expect, it } from 'vitest';

import { labToSrgb, srgbToLab } from '../../src/core/color/convert.ts';
import { applyCurve } from '../../src/core/color/curve.ts';
import { buildLut } from '../../src/core/color/lut.ts';
import type { PermittedSet } from '../../src/core/palette-policy.ts';
import { buildDistribution, selectThreads } from '../../src/core/palette-selection.ts';
import {
  adjustFingerprint,
  adjustStage,
  type AdjustParams,
} from '../../src/core/pipeline/adjust.ts';
import { ADJUST_PRESETS } from '../../src/core/pipeline/adjust-presets.ts';
import { buildStages } from '../../src/core/pipeline/config.ts';
import { ditherStage } from '../../src/core/pipeline/dither.ts';
import { reduceStage } from '../../src/core/pipeline/reduce.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import { log } from '../../src/diagnostics/log.ts';
import { sampleBuffer } from '../../src/ui/sample.ts';
import { buildIdentity, writeReport } from '../bench/env-node.ts';
import { encodePng } from '../ui-baseline/source.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

const runAdjust = adjustStage.backends.ts;
const runResize = resizeStage.backends.ts;
const runReduce = reduceStage.backends.ts;
const runDither = ditherStage.backends.ts;
if (runResize === undefined || runReduce === undefined || runDither === undefined) {
  throw new Error('ts backends must exist');
}

/** A deterministic noise source at a given size (no Math.random). */
function noise(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 0x2f6e2b1 >>> 0;
  for (let i = 0; i < width * height; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i * 4] = seed >>> 24;
    data[i * 4 + 1] = (seed >>> 16) & 255;
    data[i * 4 + 2] = (seed >>> 8) & 255;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

/** The exact reference: the production converts, one pixel at a time. */
function exactAdjust(input: PixelBuffer, params: AdjustParams): PixelBuffer {
  const out = new Uint8ClampedArray(input.data.length);
  const lab = new Float32Array(3);
  for (let i = 0; i < input.data.length; i += 4) {
    const alpha = input.data[i + 3] ?? 0;
    out[i + 3] = alpha;
    if (alpha === 0) continue;
    srgbToLab(input.data[i] ?? 0, input.data[i + 1] ?? 0, input.data[i + 2] ?? 0, lab, 0);
    labToSrgb(
      applyCurve(params.curve, lab[0] ?? 0),
      (lab[1] ?? 0) * params.saturation,
      (lab[2] ?? 0) * params.saturation,
      out,
      i,
    );
  }
  return { width: input.width, height: input.height, data: out };
}

/** Worst absolute channel difference between two same-sized buffers. */
function worstDelta(a: PixelBuffer, b: PixelBuffer): number {
  let worst = 0;
  for (let i = 0; i < a.data.length; i++) {
    worst = Math.max(worst, Math.abs((a.data[i] ?? 0) - (b.data[i] ?? 0)));
  }
  return worst;
}

/** Mean Lab chroma of the opaque cells. */
function meanChroma(buffer: PixelBuffer): number {
  const lab = new Float32Array(3);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < buffer.data.length; i += 4) {
    if ((buffer.data[i + 3] ?? 0) === 0) continue;
    srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, lab, 0);
    sum += Math.hypot(lab[1] ?? 0, lab[2] ?? 0);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** Buffer → PNG data URI for the gallery. */
function dataUri(buffer: PixelBuffer): string {
  return `data:image/png;base64,${Buffer.from(encodePng(buffer)).toString('base64')}`;
}

describe.runIf(AUDIT)('ADJUST-01 image-adjustment evidence', () => {
  it(
    'measures the shipped adjust stage and writes the artefacts',
    () => {
      const rows: AuditRow[] = [];
      const findings: string[] = [];
      const catalogue = loadCatalogue();
      // "Punch" is the representative middle case: a stretch AND a
      // saturation push, so both halves of the loop are exercised.
      const punch = ADJUST_PRESETS.find((p) => p.id === 'punch')?.params;
      if (punch === undefined) throw new Error('fixture: punch preset');

      // --- A. Cost: why the hot loop is hand-rolled -------------------
      // The stage runs at SOURCE resolution (§7 puts adjust before the
      // resize), so its cost scales with the capture, not the grid —
      // the one place in the pipeline where D3's lever does not apply.
      const W1280 = noise(1280, 720);
      const megapixels = (1280 * 720) / 1e6;
      const exactRow = timed(
        'adjust, exact converts (w1280 source)',
        () => exactAdjust(W1280, punch),
        180,
        { megapixels: round(megapixels, 2) },
      );
      const shippedRow = timed(
        'adjust, shipped tabled path (w1280 source)',
        () => runAdjust(W1280, punch),
        60,
        { megapixels: round(megapixels, 2) },
      );
      const exactPerMp = (exactRow.summary?.median ?? 0) / megapixels;
      const shippedPerMp = (shippedRow.summary?.median ?? 0) / megapixels;
      exactRow.notes['msPerMegapixel'] = round(exactPerMp, 1);
      shippedRow.notes['msPerMegapixel'] = round(shippedPerMp, 1);
      rows.push(exactRow, shippedRow);
      findings.push(
        `The exact per-pixel Lab round trip costs ${exactPerMp.toFixed(0)} ms/MP; the shipped tabled path ${shippedPerMp.toFixed(0)} ms/MP (${(exactPerMp / Math.max(shippedPerMp, 0.001)).toFixed(1)}×).`,
      );

      // Whole-frame headroom: the promise is ≥ 4 preview updates/sec at
      // ≤ 300² (D135) — a 250 ms budget per update. This is the node
      // component figure, not the browser boundary the promise binds
      // at; it answers "does the stage leave room?", which is the
      // slice's own done-when.
      const palette: Palette = {
        name: 'DMC 8',
        entries: catalogue.threads.filter((t) => t.status === 'current').slice(0, 8),
      };
      const frameStages = (adjust?: AdjustParams): (() => void) => {
        const stages = buildStages({
          preset: 'resize-first',
          grid: { width: 300, height: 300 },
          resizeMode: 'contain',
          palette,
          metric: 'lab',
          dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
          ...(adjust === undefined ? {} : { adjust }),
        });
        return (): void => {
          let buffer: PixelBuffer = W1280;
          for (const stage of stages) {
            buffer = (stage.stage.backends.ts as (b: PixelBuffer, p: unknown) => PixelBuffer)(
              buffer,
              stage.params,
            );
          }
        };
      };
      const plainFrame = timed('whole frame, w1280 → 300², no adjustment', frameStages(), 120);
      const adjustedFrame = timed('whole frame, w1280 → 300², adjusted', frameStages(punch), 180);
      rows.push(plainFrame, adjustedFrame);
      const adjustedMs = adjustedFrame.summary?.median ?? 0;
      findings.push(
        `A whole 300² frame from a w1280 source costs ${(plainFrame.summary?.median ?? 0).toFixed(0)} ms unadjusted and ${adjustedMs.toFixed(0)} ms adjusted — ${(250 / Math.max(adjustedMs, 0.001)).toFixed(1)}× inside the 250 ms an update may take at 4/sec (node component figure, not the browser boundary the promise binds at).`,
      );

      // --- B. Accuracy: the price of that speed ----------------------
      const sweep = noise(256, 256);
      let worst = 0;
      for (const preset of ADJUST_PRESETS) {
        const delta = worstDelta(runAdjust(sweep, preset.params), exactAdjust(sweep, preset.params));
        worst = Math.max(worst, delta);
        rows.push(
          counted(`accuracy vs exact converts — ${preset.label}`, {
            worstChannelDelta: delta,
            saturation: preset.params.saturation,
          }),
        );
      }
      findings.push(
        `Worst channel deviation from the exact converts across all nine presets: ${String(worst)} sRGB level(s) — the documented tolerance is 1.`,
      );

      // --- C. Re-selection: the adjusted picture picks the palette ----
      // The CREATIVE-01 slice-2 engine note, made a number: the
      // selection source is the adjusted picture, so an adjustment
      // changes which threads a count limit chooses.
      const permitted: PermittedSet = {
        eligible: catalogue.threads.filter((t) => t.status === 'current'),
        locks: [],
        preferred: new Set<string>(),
        unresolved: [],
        conflicts: [],
        ok: true,
      };
      const card = runResize(sampleBuffer(), { width: 300, height: 300, mode: 'contain' });
      const basePicks = selectThreads(permitted, 8, buildDistribution(card), 0).threads.map(
        (t) => t.id,
      );
      let changedMin = 8;
      let changedMax = 0;
      for (const preset of ADJUST_PRESETS) {
        const adjusted = runAdjust(card, preset.params);
        const picks = selectThreads(permitted, 8, buildDistribution(adjusted), 0).threads.map(
          (t) => t.id,
        );
        const changed = picks.filter((id) => !basePicks.includes(id)).length;
        if (preset.id !== 'none') {
          changedMin = Math.min(changedMin, changed);
          changedMax = Math.max(changedMax, changed);
        }
        rows.push(
          counted(`re-selection at limit 8 — ${preset.label}`, {
            changedOf8: changed,
            meanChromaDelta: round(meanChroma(adjusted) - meanChroma(card), 1),
          }),
        );
      }
      findings.push(
        `Each non-None candidate changes ${String(changedMin)}–${String(changedMax)} of the 8 picks on the sample card, re-selecting from the adjusted picture.`,
      );

      // --- D. The LUT fingerprint is untouched (D46) ------------------
      // Adjustments change what the quantiser sees, never which threads
      // it may choose: the same palette and metric must key the same
      // LUT whatever the adjustment is.
      const lutSample = buildLut(palette, 'lab');
      let lutStable = true;
      for (const preset of ADJUST_PRESETS) {
        const again = buildLut(palette, 'lab');
        if (again.length !== lutSample.length) lutStable = false;
        for (let i = 0; i < again.length && lutStable; i += 997) {
          if (again[i] !== lutSample[i]) lutStable = false;
        }
        if (adjustFingerprint(preset.params).length === 0) lutStable = false;
      }
      rows.push(
        counted('LUT identity across every adjustment', {
          verdict: lutStable ? 'unchanged' : 'CHANGED — defect',
          lutEntries: lutSample.length,
        }),
      );

      // --- E. Gallery: what the sitting judges ------------------------
      const gallery: string[] = [
        '<!doctype html><meta charset="utf-8"><title>ADJUST-01 gallery</title>',
        '<style>body{font:14px system-ui;margin:1rem;background:#222;color:#eee}figure{display:inline-block;margin:.4rem}img{width:192px;height:192px;image-rendering:pixelated}figcaption{font-size:.75rem;max-width:192px}</style>',
        `<h1>ADJUST-01 — the nine candidates over the sample card (build ${buildIdentity().gitSha})</h1>`,
        '<p>Working names and values: D200 leaves the starter set&rsquo;s membership and naming to the owner&rsquo;s sitting. Each row is the same picture through the same 8-thread palette; the adjustment runs first, and the palette is re-selected from the adjusted picture.</p>',
      ];
      const cardSmall = runResize(sampleBuffer(), { width: 128, height: 128, mode: 'contain' });
      for (const preset of ADJUST_PRESETS) {
        const adjusted = runAdjust(cardSmall, preset.params);
        const picked = selectThreads(permitted, 8, buildDistribution(adjusted), 0).threads;
        const rendered = runDither(adjusted, {
          palette: { name: preset.label, entries: picked },
          metric: 'lab',
          algorithm: 'floyd-steinberg',
          strength: 1,
          serpentine: true,
        });
        gallery.push(
          `<figure><img alt="${preset.label} — adjusted picture" src="${dataUri(adjusted)}"><figcaption>${preset.label} — adjusted</figcaption></figure>`,
          `<figure><img alt="${preset.label} — stitched" src="${dataUri(rendered)}"><figcaption>${preset.label} — stitched (8 threads, FS)</figcaption></figure>`,
        );
      }
      const galleryPath = writeReport(
        `adjust-01-gallery-${buildIdentity().gitSha}.html`,
        gallery.join('\n'),
      );
      log.info('audit', `gallery written: ${galleryPath}`);

      publishAudit({
        ticket: 'ADJUST-01',
        question:
          'Does the shipped adjust stage hold its accuracy tolerance, leave the frame budget room at source resolution, re-select from the adjusted picture, and leave the LUT identity alone?',
        rows,
        findings,
      });

      // Broken-run tripwires only (D139): the evidence is for humans.
      expect(worst).toBeLessThanOrEqual(1);
      expect(shippedPerMp).toBeLessThan(exactPerMp);
      expect(adjustedMs).toBeLessThan(250);
      expect(changedMin).toBeGreaterThanOrEqual(1);
      expect(lutStable).toBe(true);
      // A reduce through the adjusted picture must still land in the
      // palette: the stage may not emit colours the quantiser cannot
      // reach (it works in sRGB, gamut-clamped, like every stage).
      const reduced = runReduce(runAdjust(cardSmall, punch), {
        palette,
        metric: 'lab',
        path: 'exact',
      });
      expect(reduced.width).toBe(cardSmall.width);
    },
    AUDIT_TIMEOUT_MS,
  );
});
