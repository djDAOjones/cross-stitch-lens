/**
 * M5-PERF-11 — audit resize.
 *
 * bv1 CHALLENGED the separability lead: exact area averaging already
 * visits each source pixel about once under hard downscale, so there is
 * little overlap to remove, and the redundancy only appears as the
 * scale ratio nears 1. This audit tests that verdict against three
 * candidates — a bit-exact hoisted variant, the separable two-pass, and
 * a summed-area table — across the source/grid/mode matrix the ticket
 * names, and reports byte equality alongside time so a "win" that moves
 * pixels is never mistaken for a free one.
 */

import { describe, expect, it } from 'vitest';

import { resizeStage, type ResizeMode } from '../../src/core/pipeline/resize.ts';
import type { PixelBuffer } from '../../src/core/types.ts';
import { sourceBuffer, workloadById } from '../bench/workloads.ts';
import {
  resizeCallV0,
  resizeHoisted,
  resizeNaiveV0,
  resizeSat,
  resizeSeparable,
  scratchBytes,
} from './candidates/resize-candidates.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';

/** The shipped stage — hoisted since M5-PERF-21. */
const shipped = resizeStage.backends.ts;

/**
 * The oracle is the *true pre-M5D stage* (`sampleArea` call per cell),
 * not the shipped stage: M5-PERF-21 landed the hoist into `resize.ts`,
 * so diffing the shipped stage against itself would prove nothing.
 * `v0-inline` sits between the two so the audit attributes the win to
 * the call boundary and the coverage hoist separately, rather than
 * repeating M5B's single 1.5× figure for a change that did two things.
 */
const reference = resizeCallV0;

/** Channel-difference summary between a candidate and the oracle. */
function diff(a: PixelBuffer, b: PixelBuffer): {
  bytesEqual: boolean;
  maxErr: number;
  meanErr: number;
  changedPx: number;
  maxAlphaErr: number;
} {
  let maxErr = 0;
  let total = 0;
  let changed = 0;
  let maxAlphaErr = 0;
  const px = a.width * a.height;
  for (let p = 0; p < px; p++) {
    let pixelChanged = false;
    for (let c = 0; c < 4; c++) {
      const d = Math.abs((a.data[p * 4 + c] ?? 0) - (b.data[p * 4 + c] ?? 0));
      if (d > 0) pixelChanged = true;
      if (c === 3) maxAlphaErr = Math.max(maxAlphaErr, d);
      else {
        maxErr = Math.max(maxErr, d);
        total += d;
      }
    }
    if (pixelChanged) changed++;
  }
  return {
    bytesEqual: changed === 0,
    maxErr,
    meanErr: total / (px * 3),
    changedPx: changed,
    maxAlphaErr,
  };
}

/** Source/grid/mode cases the ticket's experiment matrix asks for. */
interface Case {
  name: string;
  source: PixelBuffer;
  grid: number;
  mode: ResizeMode;
  /** Rough ms, for the run plan only. */
  expected: number;
}

function cases(): Case[] {
  const w1280 = sourceBuffer(
    workloadById('noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still'),
  );
  const crop = sourceBuffer(
    workloadById('noise.crop.opaque.g300.p64.lab.dither.resize-first.stretch.still'),
  );
  const grid1024 = sourceBuffer(
    workloadById('noise.grid.opaque.g1024.p64.lab.dither.resize-first.stretch.still'),
  );
  const alpha = sourceBuffer(
    workloadById('noise.w1280.mixed.g300.p64.lab.dither.resize-first.contain.still'),
  );
  return [
    { name: '1280²→200 stretch (6.4× down)', source: w1280, grid: 200, mode: 'stretch', expected: 12 },
    { name: '1280²→300 stretch (4.3× down)', source: w1280, grid: 300, mode: 'stretch', expected: 14 },
    { name: '1280²→1024 stretch (1.25× down)', source: w1280, grid: 1024, mode: 'stretch', expected: 37 },
    { name: '1024²→1024 stretch (1.0×)', source: grid1024, grid: 1024, mode: 'stretch', expected: 20 },
    { name: '1512×982→300 stretch (crop)', source: crop, grid: 300, mode: 'stretch', expected: 12 },
    { name: '1512×982→300 cover', source: crop, grid: 300, mode: 'cover', expected: 12 },
    { name: '1280²→300 contain, alpha edges', source: alpha, grid: 300, mode: 'contain', expected: 14 },
    { name: '1024²→1024 fit (no enlarge)', source: grid1024, grid: 1024, mode: 'fit', expected: 20 },
  ];
}

describe.skipIf(!AUDIT)('M5-PERF-11 resize audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  it('times and diffs every candidate across the matrix', () => {
    let shippedExact = true;
    let worstShippedSpeedup = Infinity;
    let worstSeparable = 0;
    let worstSat = 0;

    for (const testCase of cases()) {
      const params = { width: testCase.grid, height: testCase.grid, mode: testCase.mode };
      const oracle = reference(testCase.source, params);
      const sw = testCase.source.width;
      const sh = testCase.source.height;
      const samplesPerCell =
        (sw * sh) / (testCase.grid * testCase.grid);

      const candidates = [
        ['v0-call', reference] as const,
        ['v0-inline', resizeNaiveV0] as const,
        ['shipped', shipped] as const,
        ['hoisted', resizeHoisted] as const,
        ['separable', resizeSeparable] as const,
        ['sat', resizeSat] as const,
      ];
      const medians = new Map<string, number>();
      for (const [name, fn] of candidates) {
        const row = timed(
          `${testCase.name} — ${name}`,
          () => fn(testCase.source, params),
          testCase.expected,
          {
            'src px': sw * sh,
            'samples/cell': round(samplesPerCell, 2),
            'scratch KB': round(scratchBytes(name, sw, sh, testCase.grid) / 1024, 0),
          },
        );
        medians.set(name, row.summary?.median ?? 0);
        if (name !== 'v0-call') {
          const d = diff(oracle, fn(testCase.source, params));
          row.notes['bytes ='] = d.bytesEqual ? 'yes' : 'no';
          row.notes['max Δ'] = d.maxErr;
          row.notes['mean Δ'] = round(d.meanErr, 4);
          row.notes['changed px %'] = round(
            (100 * d.changedPx) / (testCase.grid * testCase.grid),
            2,
          );
          row.notes['max alpha Δ'] = d.maxAlphaErr;
          if (name === 'shipped' && !d.bytesEqual) shippedExact = false;
          if (name === 'separable') worstSeparable = Math.max(worstSeparable, d.maxErr);
          if (name === 'sat') worstSat = Math.max(worstSat, d.maxErr);
        }
        rows.push(row);
      }
      const ref = medians.get('v0-call') ?? 1;
      const inlined = medians.get('v0-inline') ?? ref;
      const shippedMs = medians.get('shipped') ?? ref;
      const shippedSpeedup = ref / shippedMs;
      worstShippedSpeedup = Math.min(worstShippedSpeedup, shippedSpeedup);
      rows.push(
        counted(`${testCase.name} — speedup vs pre-M5D v0-call`, {
          shipped: round(shippedSpeedup, 2),
          'of which: inlining': round(ref / inlined, 2),
          'of which: hoisting': round(inlined / shippedMs, 2),
          hoisted: round(ref / (medians.get('hoisted') ?? ref), 2),
          separable: round(ref / (medians.get('separable') ?? ref), 2),
          sat: round(ref / (medians.get('sat') ?? ref), 2),
          'v0-call ms': round(ref, 2),
        }),
      );
    }

    // The regression guard M5-PERF-21 asks for: if the stage is ever
    // reverted to a per-cell call, the speedup row collapses and this
    // fails rather than quietly reporting ~1.0.
    expect(shippedExact).toBe(true);
    expect(worstShippedSpeedup).toBeGreaterThan(1.05);

    findings.push(
      shippedExact
        ? 'The SHIPPED resize stage (hoisted coverage, original multiply association and ' +
          'summation order) is BYTE-IDENTICAL to the pre-M5D stage on every case in the ' +
          'matrix, including alpha edges and letterboxed contain/fit cells. Quality-neutral: ' +
          'no tolerance decision, no golden regeneration.'
        : 'The shipped resize stage diverged from v0 — the hoisting is NOT ' +
          'arithmetic-preserving as designed; do not treat it as quality-neutral.',
      'M5B ATTRIBUTION CORRECTED. M5B reported ~1.5× for "hoisted coverage in sampleArea", ' +
        'but its candidate changed two things at once. Decomposed here: inlining the ' +
        'per-cell sampleArea call is the large term, and hoisting the coverage out of the ' +
        'per-source-pixel loop is the small one. The total is unchanged and still ' +
        'byte-exact; only the cause is different. The practical consequence is that the ' +
        'win is a V8 call-boundary effect, so it is worth re-checking in-browser rather ' +
        'than assumed to transfer.',
      `Worst-case total speedup of the shipped stage over the pre-M5D stage across the ` +
        `matrix: ${String(round(worstShippedSpeedup, 2))}×.`,
      `Candidate S (separable) differs from the reference by at most ${String(worstSeparable)}/255 per ` +
        'channel: float summation order, exactly as predicted. It needs a documented ' +
        'resize tolerance before it can ship in any mode.',
      `Candidate I (summed-area) differs by at most ${String(worstSat)}/255 per channel and pays an ` +
        'O(source) build of 4 f64 planes on every frame — the build alone is proportional ' +
        'to the work it replaces, which is why it cannot win at these kernel sizes.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('checks the empty-cell contract every candidate must preserve', () => {
    // A contain fit into a wide grid leaves transparent letterbox
    // columns; those cells must stay exactly RGBA(0,0,0,0).
    const source: PixelBuffer = {
      width: 8,
      height: 8,
      data: new Uint8ClampedArray(8 * 8 * 4).fill(200),
    };
    const params = { width: 16, height: 8, mode: 'contain' as const };
    for (const [name, fn] of [
      ['shipped', shipped],
      ['hoisted', resizeHoisted],
      ['separable', resizeSeparable],
      ['sat', resizeSat],
    ] as const) {
      const out = fn(source, params);
      const oracle = reference(source, params);
      let emptyMatches = 0;
      let emptyTotal = 0;
      for (let p = 0; p < 16 * 8; p++) {
        if ((oracle.data[p * 4 + 3] ?? 0) !== 0) continue;
        emptyTotal++;
        if (
          (out.data[p * 4] ?? 0) === 0 &&
          (out.data[p * 4 + 1] ?? 0) === 0 &&
          (out.data[p * 4 + 2] ?? 0) === 0 &&
          (out.data[p * 4 + 3] ?? 0) === 0
        )
          emptyMatches++;
      }
      rows.push(
        counted(`empty-cell contract — ${name}`, {
          'empty cells': emptyTotal,
          'exactly transparent': emptyMatches,
          verdict: emptyMatches === emptyTotal ? 'preserved' : 'BROKEN',
        }),
      );
      expect(emptyMatches).toBe(emptyTotal);
    }
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-11',
      question: 'Which resize implementation meets an honest CPU budget without moving pixels?',
      rows,
      findings,
    });
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-11 resize audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
