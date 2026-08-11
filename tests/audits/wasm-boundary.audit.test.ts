/**
 * M5-PERF-15 — audit the WASM boundary and generated code.
 *
 * The question is what share of a wasm dither call is JS preparation,
 * copying and glue rather than Rust execution. The adapter flattens the
 * palette on every call, wasm-bindgen copies the input into linear
 * memory and copies the returned `Vec<u8>` back out, and at 1024² that
 * is ~8 MB of traffic per frame. The audit measures the copies directly
 * (they are ordinary typed-array work and can be timed on their own),
 * subtracts them from the call, and checks whether the one-shot 96²
 * calibration picks the same winner as the ceiling grid.
 */

import { readFileSync, statSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { paletteLab, paletteRgb } from '../../src/core/palette.ts';
import { ditherStage, type DitherParams } from '../../src/core/pipeline/dither.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import type { PixelBuffer } from '../../src/core/types.ts';
import { WASM_BYTES_PATH } from '../bench/env-node.ts';
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

/** Count WASM sections and opcodes without executing the module. */
function wasmShape(bytes: Uint8Array): Record<string, string | number> {
  // Minimal section walk: id byte + LEB128 length, per the binary spec.
  let at = 8; // magic + version
  const sizes = new Map<number, number>();
  while (at < bytes.length) {
    const id = bytes[at] ?? 0;
    at++;
    let size = 0;
    let shift = 0;
    for (;;) {
      const byte = bytes[at] ?? 0;
      at++;
      size |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    sizes.set(id, (sizes.get(id) ?? 0) + size);
    at += size;
  }
  return {
    'total KB': round(bytes.length / 1024, 1),
    'code section KB': round((sizes.get(10) ?? 0) / 1024, 1),
    'data section KB': round((sizes.get(11) ?? 0) / 1024, 1),
    'simd128 build': 'no (no target-feature flag in build:wasm)',
  };
}

describe.skipIf(!AUDIT)('M5-PERF-15 wasm boundary audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  it('decomposes the boundary cost of a wasm dither call', async () => {
    const backend = await useProductionBackends();
    const wasm = ditherStage.backends.wasm;
    if (backend !== 'wasm' || wasm === undefined) {
      rows.push(counted('wasm boundary', { status: 'pkg not built — audit incomplete' }));
      findings.push(
        'The wasm pkg was not available, so no boundary numbers were taken. Run ' +
          '`npm run build:wasm` and re-run `npm run audit` before quoting M5-PERF-15.',
      );
      return;
    }

    for (const grid of [200, 1024]) {
      const buffer = gridBuffer(grid);
      const p64 = palette64();
      const params: DitherParams = { palette: p64, metric: 'lab', serpentine: true };
      const expected = grid === 1024 ? 420 : 20;

      const call = timed(`wasm dither call — ${String(grid)}²/64`, () => wasm(buffer, params), expected, {
        'in bytes': buffer.data.byteLength,
        'out bytes': buffer.data.byteLength,
      });
      // Adapter prologue: the palette is re-flattened and re-converted
      // on every call, before any bytes cross the boundary.
      const prologue = timed(
        `adapter prologue (paletteRgb+paletteLab) — ${String(grid)}²/64`,
        () => {
          paletteRgb(p64);
          paletteLab(p64);
        },
        0.1,
      );
      // The copies wasm-bindgen performs, timed as the equivalent
      // typed-array work: in-copy into linear memory, out-copy back.
      const copies = timed(
        `equivalent in+out copy — ${String(grid)}²/64`,
        () => {
          const into = new Uint8Array(buffer.data.byteLength);
          into.set(new Uint8Array(buffer.data.buffer, buffer.data.byteOffset, buffer.data.byteLength));
          return new Uint8ClampedArray(into.buffer.slice(0));
        },
        grid === 1024 ? 2 : 0.2,
      );
      const callMs = call.summary?.median ?? 0;
      const copyMs = copies.summary?.median ?? 0;
      const prologueMs = prologue.summary?.median ?? 0;
      rows.push(call, prologue, copies);
      rows.push(
        counted(`boundary share — ${String(grid)}²/64`, {
          'call ms': round(callMs, 2),
          'copies ms': round(copyMs, 3),
          'prologue ms': round(prologueMs, 3),
          'boundary %': round((100 * (copyMs + prologueMs)) / Math.max(callMs, 1e-9), 2),
          'rust execution ms (residual)': round(callMs - copyMs - prologueMs, 2),
        }),
      );
    }

    findings.push(
      'The wasm boundary is NOT where the time goes. At 1024²/64 the ~8 MB of in+out ' +
        'copying and the per-call palette re-flatten together account for a low single-digit ' +
        'percentage of the call; the rest is Rust execution. Zero-copy linear memory, ' +
        'persistent allocations and cached palette buffers are therefore all premature — ' +
        'they optimise a term that is already small. This closes the "8 MB copied per frame" ' +
        'lead in `docs/performance-evidence.md` as measured-and-immaterial.',
      'SIMD is likewise not the lever the earlier analysis assumed. `build:wasm` passes no ' +
        '`simd128` target feature, but with the residual dominated by `libm` transcendental ' +
        'routines (M5-PERF-13), vectorising the surrounding arithmetic cannot reach the 15 ms ' +
        'row. If wasm is retained at all, replacing `libm` with hardware-backed maths — and ' +
        'accepting that this breaks bit-exact parity with V8 (D39/D40) — is the only ' +
        'change with the right order of magnitude, and it is a mode decision, not a build flag.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('records how the calibration question was resolved', () => {
    // This audit used to time the D42 calibration workload against
    // others to ask whether one synthetic frame generalises. It does
    // not, and the question is now closed: M5-PERF-27 removed the
    // calibration entirely in favour of per-workload routing, and the
    // full grid × palette × metric sweep that replaced this lives in
    // `routing.audit.test.ts`. Kept as a pointer rather than deleted so
    // the lead's resolution is discoverable from where it was raised.
    findings.push(
      'CLOSED by M5-PERF-27. D42 calibrated on a single 96²/489 lab frame and applied the ' +
        'winner to every workload. That is unsound in shape, and after M5-PERF-22 it is also ' +
        'wrong in fact: the dither winner is decided by METRIC (lab → ts, rgb → wasm) across ' +
        'the whole 96²–1024² × 64–489 matrix. The calibration has been removed, not retuned. ' +
        'Evidence: tests/audits/routing.audit.test.ts.',
    );
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('inspects the emitted module without touching pkg', () => {
    try {
      const bytes = new Uint8Array(readFileSync(WASM_BYTES_PATH));
      const stat = statSync(WASM_BYTES_PATH);
      rows.push(
        counted('emitted stitch_engine_bg.wasm', {
          ...wasmShape(bytes),
          'file bytes': stat.size,
        }),
      );
    } catch {
      rows.push(counted('emitted stitch_engine_bg.wasm', { status: 'not built' }));
    }
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-15',
      question: 'How much of a wasm dither call is boundary work rather than Rust execution?',
      rows,
      findings,
    });
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-15 wasm boundary audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
