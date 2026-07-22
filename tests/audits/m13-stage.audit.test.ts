/**
 * M13-PROF-01 — stage profile: resize, reduce, every dither family
 * (node half).
 *
 * Ranks shipped stage costs at 300² and 1024² under the bv2 vocabulary
 * and decomposes the leader (dither) into isolated component
 * measurements: sRGB→Lab conversion, exact vs pruned candidate scan,
 * work-buffer initialisation, and the diffusion-vs-pointwise delta.
 * Component sums are explanatory only — the measured stage boundary
 * stays authoritative (the D48 lesson: change/measure one factor at a
 * time, never credit a compound saving to the interesting half).
 *
 * The browser half — the same stages through the production Worker on
 * the same bytes, giving per-stage node↔browser ratios — needs the
 * M13-MEAS-02 harness run and is recorded here as an explicit gap,
 * never a node-derived guess.
 *
 * Read-only over the shipped engine: no candidates, no engine edits.
 */

import { describe, expect, it } from 'vitest';

import { summarise } from '../../src/bench/report.ts';
import {
  configFor,
  ditherToken,
  paletteFor,
  sourceBuffer,
  workloadById,
  WORKLOADS,
  type Workload,
} from '../../src/bench/workloads.ts';
import { buildCandidateTable } from '../../src/core/color/candidates.ts';
import { srgbToLab } from '../../src/core/color/convert.ts';
import { nearestIndex } from '../../src/core/color/lut.ts';
import { nearestIndexPruned } from '../../src/core/color/candidates.ts';
import { paletteLab, paletteRgb } from '../../src/core/palette.ts';
import type { DitherConfig } from '../../src/core/pipeline/config.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import type { StageTiming } from '../../src/worker/protocol.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

const rows: AuditRow[] = [];
const findings: string[] = [];

/** Median per stage over the timed runs of one workload config. */
function stageMedians(workload: Workload, runs = 5): Map<string, number> {
  const source = sourceBuffer(workload);
  const config = configFor(workload);
  const request = {
    type: 'process' as const,
    id: 1,
    width: source.width,
    height: source.height,
    pixels: source.data.buffer as ArrayBuffer,
    config,
  };
  const series = new Map<string, number[]>();
  // One warm-up run, then timed runs; the executor reports per-stage
  // wall time itself (StageTiming), so this is measured in situ.
  for (let i = 0; i < runs + 1; i++) {
    const response = executeRequest(request);
    if (response.type !== 'result') throw new Error(`workload failed: ${workload.id}`);
    if (i === 0) continue;
    for (const timing of response.timings as StageTiming[]) {
      const list = series.get(`${timing.stage} (${timing.backend})`) ?? [];
      list.push(timing.ms);
      series.set(`${timing.stage} (${timing.backend})`, list);
    }
  }
  const medians = new Map<string, number>();
  for (const [stage, samples] of series) {
    medians.set(stage, summarise(samples)?.median ?? Number.NaN);
  }
  return medians;
}

describe.skipIf(!AUDIT)('M13-PROF-01 — stage profile (node half)', () => {
  it(
    'ranks every shipped stage at 300² and 1024², p64 and p489',
    () => {
      // The matrix only carries the M8 methods at p64; the audit adds
      // the p489 method rows so palette-size scaling is measured per
      // family, not extrapolated from Floyd–Steinberg.
      const dithers: DitherConfig[] = [
        { algorithm: 'none' },
        { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
        { algorithm: 'atkinson', serpentine: true, strength: 1 },
        { algorithm: 'jarvis', serpentine: true, strength: 1 },
        { algorithm: 'ordered', strength: 1 },
        { algorithm: 'blue-noise', strength: 1 },
      ];
      const ranking: { key: string; stage: string; median: number }[] = [];
      for (const grid of [300, 1024]) {
        for (const palette of ['p64', 'p489'] as const) {
          for (const dither of dithers) {
            const base = workloadById(
              `noise.w1280.opaque.g${String(grid)}.${palette}.lab.` +
                `${ditherToken({ algorithm: 'none' })}.resize-first.stretch.still`,
            );
            const workload: Workload = { ...base, dither, id: 'audit-row' };
            const key = `g${String(grid)}/${palette}/${ditherToken(dither)}`;
            for (const [stage, median] of stageMedians(workload)) {
              ranking.push({ key, stage, median });
            }
          }
        }
      }
      ranking.sort((a, b) => b.median - a.median);
      for (const entry of ranking) {
        rows.push(
          counted(`stage ${entry.stage} · ${entry.key}`, {
            'median ms': round(entry.median, 2),
            rank: ranking.indexOf(entry) + 1,
          }),
        );
      }
      const leader = ranking[0];
      expect(leader).toBeDefined();
      if (leader !== undefined) {
        findings.push(
          `stage ranking leader: ${leader.stage} at ${leader.key} ` +
            `(${round(leader.median, 1)} ms median)`,
        );
      }
    },
    AUDIT_TIMEOUT_MS,
  );

  it(
    'isolates resize by source geometry',
    () => {
      // Resize cost follows the SOURCE, not the grid — measured per
      // source class so a 1280² figure is never quoted for a crop.
      for (const id of [
        'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
        'noise.crop.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
        'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still',
        'noise.grid.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still',
      ]) {
        const workload = workloadById(id);
        const source = sourceBuffer(workload);
        rows.push(
          timed(
            `resize ${workload.sourceSize} → g${String(workload.grid)}`,
            () =>
              resizeStage.backends.ts(source, {
                width: workload.grid,
                height: workload.grid,
                mode: 'stretch',
              }),
            30,
            { source: `${String(source.width)}×${String(source.height)}` },
          ),
        );
      }
    },
    AUDIT_TIMEOUT_MS,
  );

  it(
    'decomposes the dither leader into isolated components',
    () => {
      // All components run over the same resized 300² grid buffer the
      // dither stage sees, so per-cell figures are comparable.
      const workload = workloadById(
        'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
      );
      const source = sourceBuffer(workload);
      const grid = resizeStage.backends.ts(source, { width: 300, height: 300, mode: 'stretch' });
      const cells = 300 * 300;
      const scratch = new Float32Array(3);

      for (const paletteAxis of ['p64', 'p489'] as const) {
        const palette = paletteFor({ ...workload, palette: paletteAxis });
        if (palette === null) continue;
        const rgb = paletteRgb(palette);
        const lab = paletteLab(palette);
        const table = buildCandidateTable(palette);

        rows.push(
          timed(
            `component: sRGB→Lab conversion, ${String(cells)} cells`,
            () => {
              for (let i = 0; i < cells; i++) {
                srgbToLab(
                  grid.data[i * 4] ?? 0,
                  grid.data[i * 4 + 1] ?? 0,
                  grid.data[i * 4 + 2] ?? 0,
                  scratch,
                  0,
                );
              }
            },
            5,
            { palette: paletteAxis },
          ),
          timed(
            `component: exact full scan, ${paletteAxis}`,
            () => {
              for (let i = 0; i < cells; i++) {
                nearestIndex(
                  grid.data[i * 4] ?? 0,
                  grid.data[i * 4 + 1] ?? 0,
                  grid.data[i * 4 + 2] ?? 0,
                  'lab',
                  rgb,
                  lab,
                  scratch,
                );
              }
            },
            paletteAxis === 'p489' ? 100 : 20,
            { palette: paletteAxis },
          ),
          timed(
            `component: pruned scan, ${paletteAxis}`,
            () => {
              for (let i = 0; i < cells; i++) {
                nearestIndexPruned(
                  grid.data[i * 4] ?? 0,
                  grid.data[i * 4 + 1] ?? 0,
                  grid.data[i * 4 + 2] ?? 0,
                  lab,
                  scratch,
                  table,
                );
              }
            },
            paletteAxis === 'p489' ? 40 : 10,
            { palette: paletteAxis },
          ),
        );
      }
      rows.push(
        timed(
          'component: work-buffer init (Float64Array, 3 ch × cells)',
          () => new Float64Array(cells * 3),
          1,
        ),
      );
      findings.push(
        'diffusion-vs-pointwise delta: compare the fs-s100-serp and ordered-s100 ' +
          'stage rows above — both match exactly per cell, so the difference is ' +
          'kernel propagation + the serpentine scan, isolated without a candidate.',
      );
    },
    AUDIT_TIMEOUT_MS,
  );

  it('publishes the artefact with the browser gap stated', () => {
    findings.push(
      'browser half not measured here: per-stage node↔browser ratios need the ' +
        'M13-MEAS-02 harness run (owner gesture) — a single browser multiplier ' +
        'must never be assumed (M5 measured resize ~3.5× vs dither ~1.1×).',
    );
    // Sanity: the audit measured every shipped dither family.
    const families = new Set(
      WORKLOADS.map((w) => w.dither.algorithm).filter((a) => a !== 'none'),
    );
    expect(families.size).toBe(5);
    publishAudit({
      ticket: 'M13-PROF-01',
      question: 'which stage dominates, per grid/palette/method, and why',
      rows,
      findings,
    });
  });
});

describe.runIf(!AUDIT)('M13-PROF-01 stage audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
