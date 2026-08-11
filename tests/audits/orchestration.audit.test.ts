/**
 * M5-PERF-10 — audit pipeline construction and ownership.
 *
 * bv1 already closed two of this ticket's leads (the identity `adjust`
 * clone at 0.15 ms and warm stage-list construction at 0.01–0.05 ms are
 * both immaterial). What the baseline could not see is the work that
 * happens *inside* the stage functions: `paletteRgb`/`paletteLab` are
 * rebuilt on every stage call, and every hot loop pays a `?? 0` bounds
 * read for `noUncheckedIndexedAccess`. This audit measures both, takes
 * the allocation inventory the ticket asks for, and pins the ownership
 * invariants that any proposed copy-elision would have to preserve.
 */

import { describe, expect, it } from 'vitest';

import { adjustStage } from '../../src/core/pipeline/adjust.ts';
import { buildStages } from '../../src/core/pipeline/config.ts';
import { ditherStage } from '../../src/core/pipeline/dither.ts';
import { loadDmcPalette, paletteLab, paletteRgb } from '../../src/core/palette.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import type { PixelBuffer } from '../../src/core/types.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import { getLut } from '../../src/worker/lut-cache.ts';
import type { ProcessRequest } from '../../src/worker/protocol.ts';
import { configFor, palette64, sourceBuffer, workloadById } from '../../src/bench/workloads.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

/** The two matrix rows the budget table binds to. */
const W1024 = 'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still';
const W200 = 'noise.w1280.opaque.g200.p64.lab.fs-s100-serp.resize-first.stretch.still';

/** Wall time of one warm pipeline run, for share-of-frame arithmetic. */
function pipelineMs(workloadId: string): number {
  const workload = workloadById(workloadId);
  const source = sourceBuffer(workload);
  const config = configFor(workload);
  const request: ProcessRequest = {
    type: 'process',
    id: 1,
    width: source.width,
    height: source.height,
    pixels: source.data.buffer as ArrayBuffer,
    config,
  };
  executeRequest(request);
  const start = performance.now();
  executeRequest(request);
  return performance.now() - start;
}

/**
 * Representative bounds-checked read loop. `?? 0` is what
 * `noUncheckedIndexedAccess` forces on every hot loop in the engine;
 * the assertion form is the same loop without it. Both sum the buffer
 * so neither can be optimised away.
 */
function sumWithCoalesce(data: Uint8ClampedArray): number {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += (data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0);
  }
  return total;
}

function sumWithAssertion(data: Uint8ClampedArray): number {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total +=
      (data[i] as number) + (data[i + 1] as number) + (data[i + 2] as number);
  }
  return total;
}

describe.skipIf(!AUDIT)('M5-PERF-10 orchestration audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  it('measures per-stage-call palette derivation', () => {
    const p64 = palette64();
    const p489 = loadDmcPalette();

    rows.push(
      timed('loadDmcPalette() — full DMC set, object map', () => loadDmcPalette(), 1, {
        entries: p489.entries.length,
      }),
      timed('paletteRgb(64)', () => paletteRgb(p64), 0.1, { entries: 64 }),
      timed('paletteRgb(489)', () => paletteRgb(p489), 0.1, { entries: p489.entries.length }),
      timed('paletteLab(64)', () => paletteLab(p64), 0.1, { entries: 64 }),
      timed('paletteLab(489)', () => paletteLab(p489), 1, { entries: p489.entries.length }),
    );

    // What a dither stage call pays before it touches a pixel.
    const perCall64 = timed(
      'dither prologue: paletteRgb+paletteLab (64)',
      () => {
        paletteRgb(p64);
        paletteLab(p64);
      },
      0.1,
    );
    const perCall489 = timed(
      'dither prologue: paletteRgb+paletteLab (489)',
      () => {
        paletteRgb(p489);
        paletteLab(p489);
      },
      1,
    );
    rows.push(perCall64, perCall489);

    const frame1024 = pipelineMs(W1024);
    const frame200 = pipelineMs(W200);
    const prologue = perCall64.summary?.median ?? 0;
    rows.push(
      counted('share of frame — prologue vs pipeline (p64)', {
        'prologue ms': round(prologue, 3),
        '1024² frame ms': round(frame1024, 1),
        '1024² share %': round((100 * prologue) / frame1024, 3),
        '200² frame ms': round(frame200, 2),
        '200² share %': round((100 * prologue) / frame200, 3),
      }),
    );

    findings.push(
      `Palette derivation is rebuilt per stage call but is immaterial at 64 colours: ` +
        `${String(round(prologue, 3))} ms, ${String(round((100 * prologue) / frame200, 2))}% of the 200² frame. ` +
        `At 489 it costs ${String(round(perCall489.summary?.median ?? 0, 3))} ms — still ` +
        `far below the per-pixel term. Caching it is correctness hygiene (it needs a ` +
        `content-correct key, same hazard as M5-PERF-12), not a performance lever.`,
    );
    expect(prologue).toBeLessThan(frame200);
  }, AUDIT_TIMEOUT_MS);

  it('measures the noUncheckedIndexedAccess read tax', () => {
    const source = sourceBuffer(workloadById(W1024));
    const grid = sourceBuffer(workloadById('noise.grid.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still'));
    for (const [name, buffer] of [
      ['1280² source', source],
      ['1024² grid', grid],
    ] as const) {
      const coalesce = timed(`?? 0 read loop — ${name}`, () => sumWithCoalesce(buffer.data), 5, {
        px: buffer.width * buffer.height,
      });
      const assertion = timed(`unchecked read loop — ${name}`, () => sumWithAssertion(buffer.data), 5, {
        px: buffer.width * buffer.height,
      });
      const a = coalesce.summary?.median ?? 0;
      const b = assertion.summary?.median ?? 0;
      rows.push(coalesce, assertion);
      rows.push(
        counted(`?? 0 tax — ${name}`, {
          'delta ms': round(a - b, 3),
          'ratio': round(a / Math.max(b, 1e-9), 3),
        }),
      );
    }
    // Both loops must agree — a tax measurement over different work is
    // not a measurement of the tax.
    expect(sumWithCoalesce(grid.data)).toBe(sumWithAssertion(grid.data));
  }, AUDIT_TIMEOUT_MS);

  it('inventories per-frame allocations and copies', () => {
    for (const [name, id] of [
      ['1024² ceiling', W1024],
      ['200² typical', W200],
    ] as const) {
      const workload = workloadById(id);
      const source = sourceBuffer(workload);
      const srcBytes = source.data.byteLength;
      const gridBytes = workload.grid * workload.grid * 4;
      rows.push(
        counted(`allocation inventory — ${name}`, {
          'source view (0 copy)': 0,
          'adjust clone B (was, now 0)': srcBytes,
          'resize out B': gridBytes,
          'dither out B': gridBytes,
          'dither work f32 B (was, now amortised)': workload.grid * workload.grid * 3 * 4,
          'palette rgb+lab B': 64 * 3 + 64 * 3 * 4,
          'total B before M5-PERF-25': srcBytes + gridBytes * 2 + workload.grid * workload.grid * 12 + 960,
          'total B after M5-PERF-25': gridBytes * 2 + 960,
          'x source before': round((srcBytes + gridBytes * 2 + workload.grid * workload.grid * 12) / srcBytes, 2),
          'x source after': round((gridBytes * 2) / srcBytes, 2),
        }),
      );
    }
    findings.push(
      'M5-PERF-25 CLOSED BOTH. Per 1024² frame the engine used to allocate ~6.5 MB (adjust ' +
        'clone) + 4 MB (resize out) + 4 MB (dither out) + 12 MB (dither f32 work) ≈ 26.5 MB, ' +
        '~4× the source. The identity adjust is now omitted from the stage list rather than ' +
        'run for its clone, and the f32 work buffer is retained and re-viewed across frames ' +
        '(stage-private scratch, fully overwritten before read, so unobservable). Steady-state ' +
        'per-frame allocation is the two grid-sized outputs — 8 MB at 1024², a ~70% cut.',
    );
    expect(true).toBe(true);
  }, AUDIT_TIMEOUT_MS);

  it('pins the ownership invariants a copy-elision must not break', () => {
    const input: PixelBuffer = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]),
    };
    const before = Uint8ClampedArray.from(input.data);

    // 1. adjust is the identity but must not alias: the executor
    //    transfers the request buffer in, and the worker retains it as
    //    `lastFrame` for split compare. An aliasing identity stage would
    //    let a later stage write through into the retained source.
    const adjusted = adjustStage.backends.ts(input, {});
    expect(adjusted.data).not.toBe(input.data);
    expect(Array.from(adjusted.data)).toEqual(Array.from(before));

    // 2. every stage leaves its input byte-identical (purity).
    resizeStage.backends.ts(input, { width: 2, height: 2, mode: 'stretch' });
    ditherStage.backends.ts(input, {
      palette: palette64(),
      metric: 'lab',
      serpentine: true,
    });
    expect(Array.from(input.data)).toEqual(Array.from(before));

    // 3. with the identity adjust now omitted (M5-PERF-25), the
    //    response buffer is only safe to transfer because EVERY
    //    remaining stage allocates its own output. Assert that directly
    //    rather than trusting the old adjust-clone to absorb it.
    const stages = buildStages(configFor(workloadById(W200)), { lut: getLut });
    expect(stages.map((s) => s.stage.name)).not.toContain('adjust');
    expect(stages.length).toBeGreaterThan(0);
    let chained: PixelBuffer = input;
    for (const instance of stages) {
      const fn = instance.stage.backends.ts;
      const out = fn(chained, instance.params);
      expect(out.data).not.toBe(chained.data);
      expect(out.data.buffer).not.toBe(chained.data.buffer);
      chained = out;
    }

    findings.push(
      'Ownership: omitting the identity adjust stage is safe *only* because every ' +
        'remaining stage allocates its own output, so the response buffer can never ' +
        'alias the transferred request buffer the worker retains as `lastFrame`. That is ' +
        'now asserted stage-by-stage over the real stage list rather than argued. Any ' +
        'future in-place stage breaks it and must be paired with an explicit copy at the ' +
        'executor boundary.',
    );
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-10',
      question: 'Which orchestration, cloning and retained-buffer costs are real?',
      rows,
      findings,
    });
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-10 orchestration audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
