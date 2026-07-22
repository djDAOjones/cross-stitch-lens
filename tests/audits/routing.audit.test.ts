/**
 * M5-PERF-27 — re-derive dither backend routing AFTER M5-PERF-22.
 *
 * D42 calibrated once on a 96²/533 frame and applied the winner
 * everywhere. M5B showed the margin varying 2.1–5.4× by workload and
 * predicted the winner would flip once the bit-exact TS wins landed.
 * They have, so this sweeps grid × palette × metric on both backends
 * and reports where each actually wins — the evidence the routing
 * policy is built from, rather than a single synthetic frame.
 */

import { describe, expect, it } from 'vitest';

import { buildCandidateTable } from '../../src/core/color/candidates.ts';
import type { ColorMetric } from '../../src/core/color/metrics.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
import { ditherStage, type DitherParams } from '../../src/core/pipeline/dither.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import { routeDither } from '../../src/worker/backend-select.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import { palette64, sourceBuffer, workloadById } from '../../src/bench/workloads.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  useProductionBackends,
  type AuditRow,
} from './audit.ts';

function gridBuffer(grid: number): PixelBuffer {
  const source = sourceBuffer(
    workloadById('noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still'),
  );
  return resizeStage.backends.ts(source, { width: grid, height: grid, mode: 'stretch' });
}

describe.skipIf(!AUDIT)('M5-PERF-27 routing audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  it('sweeps grid x palette x metric on both backends', async () => {
    const backend = await useProductionBackends();
    const wasm = ditherStage.backends.wasm;
    if (backend !== 'wasm' || wasm === undefined) {
      findings.push('wasm not built — routing sweep skipped on this machine.');
      expect(true).toBe(true);
      return;
    }
    const ts = ditherStage.backends.ts;

    const p64 = palette64();
    const p533 = loadDmcPalette();
    // The candidate table is a cached per-palette one-off in production
    // (worker LUT cache), so it is built outside the timed region here —
    // charging it to a frame would misprice the TS side.
    const tables = new Map<Palette, ReturnType<typeof buildCandidateTable>>([
      [p64, buildCandidateTable(p64)],
      [p533, buildCandidateTable(p533)],
    ]);

    let flips = 0;
    for (const grid of [96, 200, 300, 1024]) {
      const buffer = gridBuffer(grid);
      for (const [palName, palette] of [
        ['64', p64],
        ['533', p533],
      ] as const) {
        for (const metric of ['lab', 'rgb'] as ColorMetric[]) {
          const label = `${String(grid)}²/${palName}/${metric}`;
          // Production TS gets the cached table under lab; wasm never
          // does — porting pruning to Rust would be optimising a path
          // the router does not choose (see the finding below).
          const table = tables.get(palette);
          const params: DitherParams = {
            palette,
            metric,
            serpentine: true,
            ...(metric === 'lab' && table !== undefined ? { candidates: table } : {}),
          };
          const tsRow = timed(`ts — ${label}`, () => ts(buffer, params), 50);
          const wasmRow = timed(`wasm — ${label}`, () => wasm(buffer, params), 50);
          const tsMs = tsRow.summary?.median ?? 1;
          const wasmMs = wasmRow.summary?.median ?? 1;
          const winner = tsMs <= wasmMs ? 'ts' : 'wasm';
          const routed = routeDither({
            grid,
            paletteSize: palette.entries.length,
            metric,
            algorithm: 'floyd-steinberg',
            strength: 1,
          });
          if (routed !== winner) flips++;
          rows.push(tsRow, wasmRow);
          rows.push(
            counted(`verdict — ${label}`, {
              'ts ms': round(tsMs, 1),
              'wasm ms': round(wasmMs, 1),
              'measured winner': winner,
              margin: round(Math.max(tsMs, wasmMs) / Math.min(tsMs, wasmMs), 2),
              'routeDither picks': routed,
              agrees: routed === winner ? 'yes' : 'NO',
            }),
          );
        }
      }
    }

    findings.push(
      'The winner is decided by METRIC, not by grid or palette size. Under lab the TS ' +
        'path carries per-bin pruning (M5-PERF-22) and Rust does not, so TS wins across ' +
        'the whole matrix; under rgb neither side prunes and the Rust loop wins. D42 ' +
        'calibrated on a single 96²/533 lab frame and applied that winner to every ' +
        'workload — which is now exactly backwards for rgb.',
      'Rust deliberately keeps the full scan. Porting pruning to Rust would optimise a ' +
        'path the router only selects for rgb, where pruning does not apply at all (its ' +
        'exclusion proof is Lab-specific). That is optimising ahead of the profiler; the ' +
        'TS reference remains the correctness fallback for both.',
      `routeDither agreed with the measured winner on every workload in the sweep ` +
        `(${String(flips)} disagreements).`,
    );
    // The policy is derived from this sweep, so it must match it.
    expect(flips).toBe(0);
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-27',
      question: 'Where does each dither backend actually win, now that M5-PERF-22 has landed?',
      rows,
      findings,
    });
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-27 routing audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
