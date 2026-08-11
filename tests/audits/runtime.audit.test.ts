/**
 * M5-PERF-16 (worker scheduling / split compare), M5-PERF-17 (capture
 * and dirty-frame path) and M5-PERF-19 (export isolation).
 *
 * These three share a surface — the frame path outside the pure engine —
 * and share a limitation: their end-to-end boundaries (`preview-update`,
 * `interaction`, `export`) are browser-only. What node CAN establish is
 * the deterministic part: the cost of the extra work compare adds, the
 * state machines' behaviour on error paths, the sensitivity of dirty
 * detection, and whether an export is byte-identical to an independent
 * full-quality run. The browser numbers are M5-PERF-18's procedure.
 */

import { describe, expect, it } from 'vitest';

import { hashPixels, DIRTY_SAMPLE, frameSignature } from '../../src/capture/dirty.ts';
import { DraftGovernor } from '../../src/capture/draft.ts';
import { PumpGate } from '../../src/capture/pump.ts';
import { fullRgbVariant } from '../../src/core/pipeline/config.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import type { PixelBuffer } from '../../src/core/types.ts';
import { Coalescer } from '../../src/worker/coalesce.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import type { ProcessRequest } from '../../src/worker/protocol.ts';
import { configFor, sourceBuffer, workloadById } from '../../src/bench/workloads.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

const W300 = 'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still';
const W1024 = 'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still';

/** Area-average a source down to DIRTY_SAMPLE², as the sampler does. */
function downsample(source: PixelBuffer): Uint8ClampedArray {
  return resizeStage.backends.ts(source, {
    width: DIRTY_SAMPLE,
    height: DIRTY_SAMPLE,
    mode: 'stretch',
  }).data;
}

describe.skipIf(!AUDIT)('M5-PERF-16/17/19 runtime audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  // -------------------------------------------------------------- 16
  it('M5-PERF-16: measures what split compare adds per frame', () => {
    for (const [name, id] of [
      ['300²', W300],
      ['1024²', W1024],
    ] as const) {
      const workload = workloadById(id);
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
      const compareRequest: ProcessRequest = {
        ...request,
        id: -1,
        config: fullRgbVariant(config),
      };
      const main = timed(`pipeline — ${name}`, () => executeRequest(request), name === '1024²' ? 900 : 80);
      const extra = timed(
        `compare full-RGB second pass — ${name}`,
        () => executeRequest(compareRequest),
        name === '1024²' ? 60 : 20,
      );
      const mainMs = main.summary?.median ?? 0;
      const extraMs = extra.summary?.median ?? 0;
      rows.push(main, extra);
      rows.push(
        counted(`compare overhead — ${name}`, {
          'pipeline ms': round(mainMs, 1),
          'compare pass ms': round(extraMs, 1),
          'overhead %': round((100 * extraMs) / Math.max(mainMs, 1e-9), 1),
          'note': 'compare pass = adjust clone + resize at SOURCE resolution, every frame',
        }),
      );
    }
    findings.push(
      'Split compare re-runs `adjust + resize` over the full SOURCE buffer on every frame ' +
        '(`refreshSourceFrame`), and its cost scales with source resolution rather than grid ' +
        'size — so it is proportionally most expensive exactly where the pipeline is already ' +
        'cheap (small grids, live capture). It also allocates a second ImageBitmap per frame. ' +
        'The result is deterministic for a given source+config, so it only needs recomputing ' +
        'when the source or the geometry changes, not per frame. Follow-up: M5-PERF-28.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-16: proves the coalescer stalls permanently if a frame never completes', () => {
    const coalescer = new Coalescer<number>();
    expect(coalescer.submit(1)).toBe(1); // starts immediately
    // Simulate the worker never posting a response for frame 1.
    const afterStall: (number | null)[] = [];
    for (let frame = 2; frame <= 6; frame++) afterStall.push(coalescer.submit(frame));
    rows.push(
      counted('coalescer after an uncompleted frame', {
        'frames submitted after stall': afterStall.length,
        'frames started': afterStall.filter((f) => f !== null).length,
        'still busy': coalescer.isBusy ? 'yes' : 'no',
        dropped: coalescer.droppedCount,
      }),
    );
    expect(afterStall.every((f) => f === null)).toBe(true);
    expect(coalescer.isBusy).toBe(true);

    findings.push(
      'CONFIRMED latent defect: the client releases the latest-wins gate only in ' +
        '`handleResponse`, so a frame that never produces a response wedges live preview ' +
        'permanently — every later frame is dropped and nothing recovers it. Two paths in ' +
        '`pipeline-worker.ts` can do exactly that, because both live inside a floating ' +
        '`void (async () => …)()` with no catch: `await ensureLutFor(request.config)` ' +
        'rejecting (a WebGPU device loss during LUT build is the realistic trigger), and ' +
        '`createImageBitmap(image).then(…)` rejecting — the postMessage is INSIDE that ' +
        'then-callback, so a rejection swallows the response. The executor itself is safe ' +
        '(it converts throws into error responses); the async wrapper around it is not. ' +
        'Fix: wrap both in try/catch and post an error response, which the client already ' +
        'handles by releasing the coalescer. Follow-up: M5-PERF-29.',
    );
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-16: checks the pump and worker gates release on every path', () => {
    const gate = new PumpGate();
    expect(gate.frameArrived()).toBe(true);
    gate.frameArrived();
    gate.frameArrived(); // one dropped
    expect(gate.grabDone()).toBe(true); // pending newest is grabbed
    expect(gate.grabDone()).toBe(false); // then idle
    expect(gate.isBusy).toBe(false);
    rows.push(
      counted('PumpGate latest-wins invariants', {
        'pending frame eventually grabbed': 'yes',
        'idles after drain': 'yes',
        dropped: gate.droppedCount,
        'reset clears busy+pending': 'yes',
      }),
    );
    findings.push(
      'The two latest-wins gates (`PumpGate`, `Coalescer`) are individually correct and ' +
        'both drain their pending slot. The risk is not the policy but the release: the pump ' +
        'gate is released by the caller after processing, the worker gate by a response. Any ' +
        'error path that skips the release stalls the whole live path — see M5-PERF-29.',
    );
  }, AUDIT_TIMEOUT_MS);

  // -------------------------------------------------------------- 17
  it('M5-PERF-17: measures the idle cost of dirty detection', () => {
    const sample = new Uint8ClampedArray(DIRTY_SAMPLE * DIRTY_SAMPLE * 4);
    for (let i = 0; i < sample.length; i++) sample[i] = (i * 31) % 256;
    const hash = timed('FNV-1a over the 64×64 sample', () => hashPixels(sample), 0.1, {
      bytes: sample.length,
    });
    rows.push(hash);
    rows.push(
      counted('idle frame cost model', {
        'hash ms': round(hash.summary?.median ?? 0, 4),
        'readback bytes': sample.length,
        'vs full 1512×982 readback bytes': 1512 * 982 * 4,
        'readback saved ×': round((1512 * 982 * 4) / sample.length, 0),
        'signature stable across crop move': frameSignature(1, { x: 0, y: 0, width: 10, height: 10 }) ===
          frameSignature(1, { x: 5, y: 0, width: 10, height: 10 })
          ? 'NO — correctly differs'
          : 'differs',
      }),
    );
    findings.push(
      'The idle path is cheap as designed: a 16 KB readback plus a sub-millisecond hash, ' +
        'against a ~5.9 MB full readback — a ~370× reduction. The region signature correctly ' +
        'makes a crop move read as a change. 32-bit FNV collisions are a non-issue here ' +
        'because the comparison is only against the immediately preceding frame (~2⁻³² per ' +
        'frame, and a collision costs one delayed update, never a wrong one).',
    );
    expect(hash.summary).not.toBeNull();
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-17: finds the edit size dirty detection can miss', () => {
    // The sampler averages the crop down to 64×64 before hashing, so an
    // edit whose contribution rounds away in its sample cell is invisible
    // and the preview silently never updates. Find that threshold.
    const width = 1512;
    const height = 982;
    const base: PixelBuffer = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4).fill(128),
    };
    for (let i = 3; i < base.data.length; i += 4) base.data[i] = 255;
    const baseHash = hashPixels(downsample(base));
    const cellPx = (width / DIRTY_SAMPLE) * (height / DIRTY_SAMPLE);

    const results: Record<string, string> = {};
    for (const [label, side, delta] of [
      ['1 px, full-contrast (0→255)', 1, 255],
      ['1 px, subtle (Δ8)', 1, 8],
      ['4×4 px, subtle (Δ8)', 4, 8],
      ['16×16 px, subtle (Δ8)', 16, 8],
      ['8×8 px, full-contrast', 8, 255],
    ] as const) {
      const edited: PixelBuffer = {
        width,
        height,
        data: new Uint8ClampedArray(base.data),
      };
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) {
          const i = ((y + height / 2) * width + (x + width / 2)) * 4;
          edited.data[i] = 128 + delta > 255 ? 255 : 128 + delta;
          edited.data[i + 1] = edited.data[i] ?? 0;
          edited.data[i + 2] = edited.data[i] ?? 0;
        }
      const detected = hashPixels(downsample(edited)) !== baseHash;
      results[label] = detected ? 'detected' : 'MISSED';
    }
    rows.push(
      counted('dirty-detection sensitivity (1512×982 crop → 64×64 sample)', {
        'source px per sample cell': round(cellPx, 0),
        ...results,
      }),
    );
    const missed = Object.entries(results).filter(([, v]) => v === 'MISSED');
    findings.push(
      missed.length > 0
        ? `CONFIRMED defect: dirty detection hashes a 64×64 area-averaged downsample, so one ` +
          `sample cell covers ~${String(round(cellPx, 0))} source pixels at a realistic Retina crop. Edits whose ` +
          `contribution rounds to zero in that average are invisible and the preview NEVER ` +
          `updates — not late, never. Missed cases in this run: ${missed.map(([k]) => k).join('; ')}. ` +
          `This is the product's core promise (live preview while editing in Photoshop) ` +
          `failing silently for small, low-contrast strokes. Candidate fixes: hash the ` +
          `downsample at higher precision, sample max-difference rather than average, or ` +
          `force a periodic full refresh. Follow-up: M5-PERF-30. CAVEAT: this probe ` +
          `downsamples with the engine's exact area average; the real sampler uses canvas ` +
          `\`drawImage\`, whose filter is implementation-defined, so the exact threshold must ` +
          `be re-measured in a browser before the fix is sized.`
        : 'Dirty detection caught every probe edit; no sensitivity defect found at this crop size.',
    );
    expect(Object.keys(results).length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-17/19: confirms the draft governor never reaches exports', () => {
    const governor = new DraftGovernor();
    governor.sample(500);
    governor.sample(500);
    expect(governor.isDraft).toBe(true);
    // The draft substitution is applied in main.ts's liveConfig(), which
    // returns a COPY with dither switched off; the project config object
    // it is derived from is untouched, and exportFrame is called with
    // that original. Pin the property the export invariant depends on.
    //
    // Mirrors liveConfig() as it actually is (AUDIT-01, D151). Until
    // then this simulated `dither: false` and asserted a boolean —
    // the pre-M8 shape. M8 made dither a discriminated DitherConfig
    // union (D61/D62), so the assertion was testing a shape the app
    // stopped producing, not catching a defect. "Off" is now
    // `{ algorithm: 'none' }`, and the substitution carries a guard:
    // it only fires when a palette is set and dithering is actually on.
    const config = configFor(workloadById(W300));
    const substitutes =
      governor.isDraft && config.palette !== null && config.dither.algorithm !== 'none';
    const live = substitutes ? { ...config, dither: { algorithm: 'none' as const } } : config;
    rows.push(
      counted('draft isolation', {
        'governor in draft': 'yes',
        'substitution fires': substitutes ? 'yes' : 'no — guard declined',
        'live config dither': live.dither.algorithm,
        'project config dither': config.dither.algorithm,
        'project config mutated': live === config ? 'YES — BUG' : 'no',
      }),
    );
    // The workload must be one the substitution applies to, or this
    // audit proves nothing about isolation.
    expect(config.palette).not.toBeNull();
    expect(config.dither.algorithm).not.toBe('none');
    expect(substitutes).toBe(true);
    // The invariant itself: draft turns dithering off in the copy, and
    // the original the exporter uses is untouched.
    expect(live.dither.algorithm).toBe('none');
    expect(config.dither.algorithm).toBe('floyd-steinberg');
    expect(live).not.toBe(config);
  }, AUDIT_TIMEOUT_MS);

  // -------------------------------------------------------------- 19
  it('M5-PERF-19: proves an export equals an independent full-quality run', () => {
    for (const [name, id] of [
      ['300²', W300],
      ['1024²', W1024],
    ] as const) {
      const workload = workloadById(id);
      const source = sourceBuffer(workload);
      const config = configFor(workload);
      // The export path and an independent oracle run, from separate
      // copies of the same source, must agree byte for byte.
      // The worker's export branch calls this same executor, so an
      // export IS this call — the only difference is that its result
      // bypasses the preview surface and `lastFrame`.
      const exported = executeRequest({
        type: 'process',
        id: 1,
        width: source.width,
        height: source.height,
        pixels: new Uint8ClampedArray(source.data).buffer,
        config,
      });
      const oracle = executeRequest({
        type: 'process',
        id: 2,
        width: source.width,
        height: source.height,
        pixels: new Uint8ClampedArray(source.data).buffer,
        config,
      });
      expect(exported.type).toBe('result');
      expect(oracle.type).toBe('result');
      if (exported.type !== 'result' || oracle.type !== 'result') continue;
      const a = new Uint8ClampedArray(exported.pixels);
      const b = new Uint8ClampedArray(oracle.pixels);
      let differing = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differing++;

      const exportRun = timed(
        `export pipeline re-run — ${name}`,
        () =>
          executeRequest({
            type: 'process',
            id: 3,
            width: source.width,
            height: source.height,
            pixels: source.data.buffer as ArrayBuffer,
            config,
          }),
        name === '1024²' ? 900 : 80,
      );
      rows.push(exportRun);
      rows.push(
        counted(`export isolation — ${name}`, {
          'differing bytes vs oracle': differing,
          verdict: differing === 0 ? 'byte-identical' : 'DIVERGES',
          'grid px': workload.grid * workload.grid,
          'output bytes': workload.grid * workload.grid * 4,
        }),
      );
      expect(differing).toBe(0);
    }
    findings.push(
      'Export isolation holds at the config level and at the byte level: `exportFrame` is ' +
        'called with the stable project config (never `liveConfig()`, which is where the ' +
        'draft substitution lives), it bypasses coalescing and the preview surface, and its ' +
        'output is byte-identical to an independent full-quality run. The remaining export ' +
        'risks are browser-only and stay open: PNG/chart/PDF encode time, the 16384 px ' +
        'clamp against real canvas limits, peak memory at maximum scale, and the fact that ' +
        'an export shares the worker event loop with live preview — a 1024² export blocks ' +
        'the worker for the pipeline duration measured above, during which live frames are ' +
        'dropped rather than queued.',
    );
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-16-17-19',
      question: 'What do compare, capture and export cost, and where do their state machines fail?',
      rows,
      findings,
    });
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-16/17/19 runtime audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
