/**
 * M5-PERF-13 (conversion) and M5-PERF-14 (search) — decompose dither.
 *
 * bv1 established the split from the outside: `metric: lab` costs
 * 424.5 ms against `metric: rgb` 125.1 ms at 1024²/64, so conversion is
 * ~70% of dither; and cost grows ~1.44 ms per palette entry, so the scan
 * is ~22% at 64 colours but dominant at 533. This audit measures the
 * inside: each sub-operation of sRGB→Lab timed separately over values
 * captured from the real diffusion loop, and a *provably exact* candidate
 * pruning table whose winner and tie behaviour are verified against the
 * reference rather than assumed.
 */

import { describe, expect, it } from 'vitest';

import { srgbToLab } from '../../src/core/color/convert.ts';
import { paletteLab, paletteRgb, loadDmcPalette } from '../../src/core/palette.ts';
import { ditherStage, type DitherParams } from '../../src/core/pipeline/dither.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import { palette64, sourceBuffer, workloadById } from '../bench/workloads.ts';
import {
  buildCandidateTable,
  captureWorkValues,
  ditherHoistedScan,
  ditherPruned,
  ditherRoundedLab,
  linearTable,
  nearestIndexPruned,
  nearestIndexReference,
  srgbToLabRounded,
  type CandidateTable,
} from './candidates/dither-candidates.ts';
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

const reference = ditherStage.backends.ts;

/** A grid-sized buffer, i.e. what dither actually sees in the pipeline. */
function gridBuffer(grid: number): PixelBuffer {
  const source = sourceBuffer(
    workloadById('noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still'),
  );
  return resizeStage.backends.ts(source, { width: grid, height: grid, mode: 'stretch' });
}

function params(palette: Palette): DitherParams {
  return { palette, metric: 'lab', serpentine: true };
}

/** Byte-level agreement between two dither outputs. */
function outputDiff(a: PixelBuffer, b: PixelBuffer): {
  identical: boolean;
  changedPx: number;
  firstDivergence: number;
  maxChannelDelta: number;
} {
  let changed = 0;
  let first = -1;
  let maxDelta = 0;
  const px = a.width * a.height;
  for (let p = 0; p < px; p++) {
    let differs = false;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs((a.data[p * 4 + c] ?? 0) - (b.data[p * 4 + c] ?? 0));
      if (d > 0) differs = true;
      maxDelta = Math.max(maxDelta, d);
    }
    if (differs) {
      changed++;
      if (first < 0) first = p;
    }
  }
  return { identical: changed === 0, changedPx: changed, firstDivergence: first, maxChannelDelta: maxDelta };
}

describe.skipIf(!AUDIT)('M5-PERF-13/14 dither audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];
  let table64: CandidateTable | null = null;
  let table533: CandidateTable | null = null;

  it('M5-PERF-13: decomposes sRGB→Lab over captured work values', () => {
    // Values from the real loop at 300²: fractional, spatially
    // correlated, and biased by the palette — not uniform random RGB.
    const grid = gridBuffer(300);
    const captured = captureWorkValues(grid, params(palette64()));
    const n = captured.length / 3;
    const lab = new Float32Array(3);
    const table = linearTable();

    // Baseline: touch every triple, do no colour maths. Everything
    // below is reported net of this so the loop overhead is not
    // attributed to the conversion.
    const baseline = timed(
      'loop baseline (read + clamp only)',
      () => {
        let acc = 0;
        for (let i = 0; i < n; i++) acc += (captured[i * 3] ?? 0) + (captured[i * 3 + 1] ?? 0);
        return acc;
      },
      2,
      { samples: n },
    );
    const base = baseline.summary?.median ?? 0;

    const full = timed(
      'full srgbToLab (3 pow + matrix + 3 cbrt)',
      () => {
        for (let i = 0; i < n; i++)
          srgbToLab(captured[i * 3] ?? 0, captured[i * 3 + 1] ?? 0, captured[i * 3 + 2] ?? 0, lab, 0);
      },
      12,
      { samples: n },
    );
    const powsOnly = timed(
      'transfer functions only (3 × Math.pow)',
      () => {
        let acc = 0;
        for (let i = 0; i < n; i++) {
          for (let c = 0; c < 3; c++) {
            const v = (captured[i * 3 + c] ?? 0) / 255;
            acc += v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          }
        }
        return acc;
      },
      10,
      { samples: n },
    );
    const cbrtOnly = timed(
      'labF only (3 × Math.cbrt on plausible XYZ)',
      () => {
        let acc = 0;
        for (let i = 0; i < n; i++) {
          for (let c = 0; c < 3; c++) {
            const t = (captured[i * 3 + c] ?? 0) / 255;
            acc += t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
          }
        }
        return acc;
      },
      6,
      { samples: n },
    );
    const tableOnly = timed(
      'candidate B transfer: round + 256-entry table',
      () => {
        let acc = 0;
        for (let i = 0; i < n; i++)
          for (let c = 0; c < 3; c++) acc += table[Math.round(captured[i * 3 + c] ?? 0)] ?? 0;
        return acc;
      },
      2,
      { samples: n },
    );
    const roundedFull = timed(
      'candidate B full conversion (table + matrix + 3 cbrt)',
      () => {
        for (let i = 0; i < n; i++)
          srgbToLabRounded(
            captured[i * 3] ?? 0,
            captured[i * 3 + 1] ?? 0,
            captured[i * 3 + 2] ?? 0,
            table,
            lab,
          );
      },
      8,
      { samples: n },
    );
    rows.push(baseline, full, powsOnly, cbrtOnly, tableOnly, roundedFull);

    const fullMs = (full.summary?.median ?? 0) - base;
    const powMs = (powsOnly.summary?.median ?? 0) - base;
    const cbrtMs = (cbrtOnly.summary?.median ?? 0) - base;
    const tableMs = (tableOnly.summary?.median ?? 0) - base;
    rows.push(
      counted('conversion decomposition (net of baseline, 300² = 90k px)', {
        'full conversion ms': round(fullMs, 3),
        'pow term ms': round(powMs, 3),
        'pow share %': round((100 * powMs) / fullMs, 1),
        'cbrt term ms': round(cbrtMs, 3),
        'cbrt share %': round((100 * cbrtMs) / fullMs, 1),
        'table replacement ms': round(tableMs, 3),
        'pow→table saving ms': round(powMs - tableMs, 3),
      }),
    );
    findings.push(
      `Inside sRGB→Lab the three \`Math.pow\` transfer functions are ${String(round((100 * powMs) / fullMs, 0))}% of ` +
        `conversion cost and the three \`Math.cbrt\` calls ${String(round((100 * cbrtMs) / fullMs, 0))}%. A 256-entry ` +
        `table replaces the pow term at ${String(round((100 * tableMs) / Math.max(powMs, 1e-9), 0))}% of its cost — but only ` +
        `after rounding the match input, so it is NOT exact-preserving. The cbrt term ` +
        `survives every table candidate and puts a floor under any Lab-metric dither.`,
      `METHOD CAVEAT — this isolated loop overstates conversion cost in situ. It predicts ` +
        `~${String(round(((full.summary?.median ?? 0) - base) * (1024 * 1024) / n, 0))} ms per 1024² frame, but the per-backend test below shows switching ` +
        `metric lab→rgb moves the hoisted TS dither by ~0%. In the fused loop V8 keeps the ` +
        `Lab triple in registers, elides the Float32Array scratch round-trip this benchmark ` +
        `forces, and overlaps transcendental latency with the scan's memory traffic. Quote ` +
        `the in-situ number, not this one, when sizing a conversion candidate.`,
    );
    expect(fullMs).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-13: propagates candidate B through error diffusion', () => {
    for (const [name, grid, palette] of [
      ['300²/64', 300, palette64()],
      ['200²/64', 200, palette64()],
    ] as const) {
      const buffer = gridBuffer(grid);
      const oracle = reference(buffer, params(palette));
      const candidate = ditherRoundedLab(buffer, params(palette));
      const d = outputDiff(oracle, candidate);
      const refRow = timed(`Exact dither — ${name}`, () => reference(buffer, params(palette)), 40);
      const candRow = timed(
        `candidate B dither — ${name}`,
        () => ditherRoundedLab(buffer, params(palette)),
        30,
      );
      candRow.notes['speedup'] = round(
        (refRow.summary?.median ?? 1) / (candRow.summary?.median ?? 1),
        2,
      );
      candRow.notes['changed px %'] = round((100 * d.changedPx) / (grid * grid), 2);
      candRow.notes['first divergence px'] = d.firstDivergence;
      candRow.notes['max channel Δ'] = d.maxChannelDelta;
      rows.push(refRow, candRow);
    }
    findings.push(
      'Candidate B is a Balanced-mode candidate, not a quality-neutral one: rounding the ' +
        'match input flips a small number of early winners and error diffusion then spreads ' +
        'the difference across a large fraction of the frame. The changed-pixel percentage ' +
        'above is the honest figure M5-ACCEPT-02 must judge visually — aggregate ΔE would ' +
        'understate it.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-14: builds and proves the exact candidate table', () => {
    for (const [name, palette] of [
      ['p64', palette64()],
      ['p533', loadDmcPalette()],
    ] as const) {
      const table = buildCandidateTable(palette);
      if (name === 'p64') table64 = table;
      else table533 = table;

      let total = 0;
      let max = 0;
      const counts: number[] = [];
      for (let k = 0; k < 32768; k++) {
        const c = (table.offsets[k + 1] ?? 0) - (table.offsets[k] ?? 0);
        counts.push(c);
        total += c;
        max = Math.max(max, c);
      }
      counts.sort((a, b) => a - b);
      const entries = palette.entries.length;
      rows.push(
        counted(`candidate table — ${name}`, {
          'palette entries': entries,
          'build ms': round(table.buildMs, 1),
          'table KB': round(table.bytes / 1024, 0),
          'mean candidates': round(total / 32768, 2),
          'median candidates': counts[16384] ?? 0,
          'p95 candidates': counts[Math.floor(0.95 * 32768)] ?? 0,
          'max candidates': max,
          'scan reduction ×': round(entries / (total / 32768), 1),
        }),
      );

      // Exactness: over a large adversarial sample of *fractional*
      // values — bin corners, bin centres and captured work values —
      // the pruned matcher must return the identical index, not merely
      // an equidistant one.
      const palRgb = paletteRgb(palette);
      const palLab = paletteLab(palette);
      const scratch = new Float32Array(3);
      let checked = 0;
      let mismatches = 0;
      const probe = (r: number, g: number, b: number): void => {
        checked++;
        const want = nearestIndexReference(r, g, b, 'lab', palRgb, palLab, scratch);
        const got = nearestIndexPruned(r, g, b, palLab, scratch, table);
        if (want !== got) mismatches++;
      };
      for (let rb = 0; rb < 32; rb++)
        for (let gb = 0; gb < 32; gb++)
          for (let bb = 0; bb < 32; bb++) {
            probe(rb * 8, gb * 8, bb * 8);
            probe(Math.min(rb * 8 + 7.999, 255), Math.min(gb * 8 + 7.999, 255), Math.min(bb * 8 + 7.999, 255));
            probe(rb * 8 + 3.5, gb * 8 + 3.5, bb * 8 + 3.5);
          }
      const captured = captureWorkValues(gridBuffer(200), params(palette));
      for (let i = 0; i < captured.length / 3; i++)
        probe(captured[i * 3] ?? 0, captured[i * 3 + 1] ?? 0, captured[i * 3 + 2] ?? 0);

      rows.push(
        counted(`pruning exactness — ${name}`, {
          'values checked': checked,
          mismatches,
          verdict: mismatches === 0 ? 'EXACT' : 'NOT EXACT',
        }),
      );
      expect(mismatches).toBe(0);
    }
  }, AUDIT_TIMEOUT_MS);

  it('M5-PERF-14: measures pruned dither end to end', () => {
    const table64Local = table64;
    const table533Local = table533;
    expect(table64Local).not.toBeNull();
    expect(table533Local).not.toBeNull();
    if (table64Local === null || table533Local === null) return;

    for (const [name, grid, palette, table, expected] of [
      ['1024²/64', 1024, palette64(), table64Local, 900] as const,
      ['300²/64', 300, palette64(), table64Local, 70] as const,
      ['300²/533', 300, loadDmcPalette(), table533Local, 400] as const,
    ]) {
      const buffer = gridBuffer(grid);
      const oracle = reference(buffer, params(palette));
      const hoistedOut = ditherHoistedScan(buffer, params(palette));
      const pruned = ditherPruned(buffer, params(palette), table);
      const hoistedDiff = outputDiff(oracle, hoistedOut);
      const prunedDiff = outputDiff(oracle, pruned);

      const refRow = timed(`Exact dither (ts) — ${name}`, () => reference(buffer, params(palette)), expected);
      const hoistedRow = timed(
        `+ hoisted scan reads — ${name}`,
        () => ditherHoistedScan(buffer, params(palette)),
        expected * 0.7,
      );
      const prunedRow = timed(
        `+ hoisted + pruned — ${name}`,
        () => ditherPruned(buffer, params(palette), table),
        expected * 0.5,
      );
      const refMs = refRow.summary?.median ?? 1;
      const hoistedMs = hoistedRow.summary?.median ?? 1;
      const prunedMs = prunedRow.summary?.median ?? 1;
      hoistedRow.notes['speedup vs ref'] = round(refMs / hoistedMs, 2);
      hoistedRow.notes['bit-exact'] = hoistedDiff.identical ? 'yes' : 'no';
      prunedRow.notes['speedup vs ref'] = round(refMs / prunedMs, 2);
      prunedRow.notes['speedup vs hoisted'] = round(hoistedMs / prunedMs, 2);
      prunedRow.notes['bit-exact'] = prunedDiff.identical ? 'yes' : 'no';
      rows.push(refRow, hoistedRow, prunedRow);
      rows.push(
        counted(`attribution — ${name}`, {
          'reference ms': round(refMs, 1),
          'saved by hoist ms': round(refMs - hoistedMs, 1),
          'saved by pruning ms': round(hoistedMs - prunedMs, 1),
          'hoist share of total saving %': round(
            (100 * (refMs - hoistedMs)) / Math.max(refMs - prunedMs, 1e-9),
            0,
          ),
        }),
      );
      expect(hoistedDiff.identical).toBe(true);
      expect(prunedDiff.identical).toBe(true);
    }
    findings.push(
      'Two independent bit-exact wins live in the matcher, and they must not be conflated. ' +
        '(1) The reference re-reads the query Lab out of the `Float32Array` scratch on every ' +
        'palette iteration via `deltaE76Sq(labScratch, 0, …)`; hoisting those three reads out ' +
        'of the scan loop is a pure loop-invariant fix with no algorithmic change. (2) Per-bin ' +
        'candidate pruning then cuts the surviving scan. Both are byte-identical to the ' +
        'reference on every workload measured, so neither needs a tolerance decision or a ' +
        'golden regeneration. The attribution rows above give each its own contribution.',
      'The pruning table build is a per-palette one-off and belongs in the LUT cache beside ' +
        'the reduce LUT, not on the frame path — its build cost is the same order as the ' +
        'existing cold LUT build and would otherwise be charged to the first frame.',
    );
  }, AUDIT_TIMEOUT_MS);

  it('re-tests the bv1 "conversion is ~70% of dither" verdict per backend', async () => {
    // bv1 inferred "the sRGB→Lab transfer functions are ~70% of dither
    // cost" from (lab − rgb)/lab measured on the WASM backend. That
    // ratio is a property of the backend, not of the algorithm: the
    // Rust port uses `libm` — software fdlibm routines — precisely to
    // stay bit-exact with V8 (D39), while V8's own Math.pow/Math.cbrt
    // are optimised builtins. Measuring both backends separates the two.
    const backend = await useProductionBackends();
    const wasm = ditherStage.backends.wasm;
    const buffer = gridBuffer(1024);
    const p64 = palette64();
    const lab: DitherParams = { palette: p64, metric: 'lab', serpentine: true };
    const rgb: DitherParams = { palette: p64, metric: 'rgb', serpentine: true };

    const labRef = timed('ts dither, lab — 1024²/64', () => reference(buffer, lab), 850);
    const rgbRef = timed('ts dither, rgb — 1024²/64', () => reference(buffer, rgb), 700);
    const labHoisted = timed(
      'ts hoisted, lab — 1024²/64',
      () => ditherHoistedScan(buffer, lab),
      300,
    );
    const rgbHoisted = timed(
      'ts hoisted, rgb — 1024²/64',
      () => ditherHoistedScan(buffer, rgb),
      280,
    );
    rows.push(labRef, rgbRef, labHoisted, rgbHoisted);

    const tsShare =
      (100 * ((labHoisted.summary?.median ?? 0) - (rgbHoisted.summary?.median ?? 0))) /
      Math.max(labHoisted.summary?.median ?? 1, 1e-9);

    if (wasm === undefined) {
      rows.push(counted('wasm dither', { status: 'pkg not built — skipped', backend }));
      findings.push(
        'The wasm backend was unavailable for this run, so the per-backend conversion ' +
          'comparison is incomplete. Re-run with `npm run build:wasm` before quoting it.',
      );
      return;
    }

    const labWasm = timed('wasm dither, lab — 1024²/64', () => wasm(buffer, lab), 430);
    const rgbWasm = timed('wasm dither, rgb — 1024²/64', () => wasm(buffer, rgb), 130);
    rows.push(labWasm, rgbWasm);
    const wasmShare =
      (100 * ((labWasm.summary?.median ?? 0) - (rgbWasm.summary?.median ?? 0))) /
      Math.max(labWasm.summary?.median ?? 1, 1e-9);

    rows.push(
      counted('conversion share of dither, per backend', {
        'wasm (lab−rgb)/lab %': round(wasmShare, 1),
        'ts as-shipped %': round(
          (100 * ((labRef.summary?.median ?? 0) - (rgbRef.summary?.median ?? 0))) /
            Math.max(labRef.summary?.median ?? 1, 1e-9),
          1,
        ),
        'ts hoisted %': round(tsShare, 1),
      }),
      counted('backend ranking at 1024²/64, lab', {
        'wasm ms': round(labWasm.summary?.median ?? 0, 1),
        'ts as-shipped ms': round(labRef.summary?.median ?? 0, 1),
        'ts hoisted ms': round(labHoisted.summary?.median ?? 0, 1),
        'ts hoisted+pruned ms': round(
          rows.find((r) => r.label.startsWith('+ hoisted + pruned — 1024²/64'))?.summary
            ?.median ?? 0,
          1,
        ),
      }),
    );

    findings.push(
      `SCOPED bv1's "conversion is ~70% of dither". That ratio holds on the WASM backend ` +
        `(${String(round(wasmShare, 0))}% here) and is a consequence of D39's parity choice: the Rust port calls ` +
        `\`libm::pow\`/\`libm::cbrt\` — software routines — to stay bit-exact with V8. On the TS ` +
        `reference the same conversion is only ${String(round(tsShare, 0))}% once the scan reads are hoisted, ` +
        `because V8 lowers Math.pow/Math.cbrt to optimised builtins. "Dither is ` +
        `conversion-bound" is therefore a WASM statement, not an algorithm statement, and ` +
        `M5C must not plan a shared conversion strategy from it.`,
      'Consequence for backend selection (D42): with both bit-exact fixes applied the TS ' +
        'reference lands close to — and on this machine may beat — the wasm backend at ' +
        '1024²/64, because wasm carries the libm penalty the TS path does not. The one-shot ' +
        '96² calibration cannot see this. M5-PERF-15/23 should re-derive the routing after ' +
        'M5-PERF-22 lands, not before, and the calibration workload needs to be ' +
        'representative of the ceiling grid.',
    );
    expect(labHoisted.summary?.median ?? 0).toBeLessThan(labRef.summary?.median ?? 0);
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-13-14',
      question: 'How does dither cost split between conversion and search, and what is exact?',
      rows,
      findings,
    });
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-13/14 dither audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
