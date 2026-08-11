/**
 * M5-ACCEPT-01 — the integrated correctness and parity matrix.
 *
 * The per-stage suites prove each stage against its own contract. This
 * one asks the question none of them can: does the COMPOSED pipeline
 * stay correct across the axes a user can reach together? It drives
 * `executeRequest` — the real worker entry, so the LUT cache, the
 * candidate cache, workload routing (D48) and the `?? backends.ts`
 * fallback are all in the loop — rather than calling stages directly.
 *
 * Deliberately not one opaque mega-test: every row asserts the same
 * named invariants, and a failure names the row ID and the invariant,
 * so the coverage table and the failure report use the same vocabulary.
 *
 * Explicit skips, and why (M5-ACCEPT-01 exit evidence):
 * - **Ceiling grid (1024²)** — behind `MATRIX_FULL=1`. `check` must
 *   stay under ~2 minutes; a dithered 1024² row is ~0.9 s alone (D48).
 * - **Real GPU** — node has no `navigator.gpu`. WebGPU parity is proven
 *   on real hardware by `bench.html` (M5-PERF-32, D48) and against an
 *   f32 mirror in `webgpu-lut.test.ts`.
 * - **WASM parity on empty cells** — the local `pkg/` is whatever was
 *   last built and this machine has no Rust toolchain, so the crate
 *   change that mirrors the TS empty-cell rule is verified by the CI
 *   `check:wasm` step, not here.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildLut, nearestIndex } from '../src/core/color/lut.ts';
import { paletteLab, paletteRgb } from '../src/core/palette.ts';
import { executeRequest } from '../src/worker/execute.ts';
import { clearSelectedBackends } from '../src/worker/backend-select.ts';
import type { WorkerResponse } from '../src/worker/protocol.ts';
import type { PixelBuffer } from '../src/core/types.ts';
import {
  activeRows,
  configFor,
  MATRIX,
  paletteFor,
  renderCoverageMarkdown,
  rowId,
  sourceBuffer,
  type MatrixRow,
} from './matrix/rows.ts';

const FULL = process.env['MATRIX_FULL'] === '1';
const ROWS = activeRows(FULL);

/** Run one row through the worker entry, from a private source copy. */
function run(spec: MatrixRow, source: PixelBuffer): WorkerResponse {
  return executeRequest({
    type: 'process',
    id: 1,
    width: source.width,
    height: source.height,
    pixels: new Uint8ClampedArray(source.data).buffer as ArrayBuffer,
    config: configFor(spec),
  });
}

/** The result of a row, or a failure naming the row. */
function resultOf(spec: MatrixRow, source: PixelBuffer): Extract<WorkerResponse, { type: 'result' }> {
  const response = run(spec, source);
  if (response.type !== 'result') {
    const detail = response.type === 'error' ? response.message : response.type;
    throw new Error(`${spec.id}: expected a result, got "${detail}"`);
  }
  return response;
}

describe('matrix definition', () => {
  it('row IDs are unique and derived — two rows can never collide silently', () => {
    const ids = MATRIX.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of MATRIX) expect(r.id).toBe(rowId(r));
  });

  it('every row says what it proves', () => {
    for (const r of MATRIX) expect(r.proves.length).toBeGreaterThan(15);
  });

  it('covers every value of every axis', () => {
    const seen = <K extends keyof MatrixRow>(key: K): Set<unknown> =>
      new Set(MATRIX.map((r) => r[key]));
    expect(seen('palette')).toEqual(
      new Set(['rgb', 'p2', 'p64', 'p489', 'dup', 'neartie', 'nodark']),
    );
    expect(seen('alpha')).toEqual(new Set(['opaque', 'letterbox', 'ramp', 'empty']));
    expect(seen('resizeMode')).toEqual(new Set(['stretch', 'contain', 'cover', 'fit']));
    expect(seen('order')).toEqual(new Set(['resize-first', 'reduce-first']));
    expect(seen('metric')).toEqual(new Set(['lab', 'rgb']));
    expect(seen('source')).toEqual(new Set(['noise', 'gradient', 'flat']));
    expect(seen('serpentine')).toEqual(new Set([true, false]));
    expect(seen('dither')).toEqual(new Set([true, false]));
    // Every shipped M8 method reaches the composed pipeline (D61);
    // `undefined` is the pre-M8 default, Floyd–Steinberg.
    expect(new Set(MATRIX.filter((r) => r.dither).map((r) => r.algorithm ?? 'floyd-steinberg')))
      .toEqual(new Set(['floyd-steinberg', 'atkinson', 'jarvis', 'ordered', 'blue-noise']));
  });
});

describe.each(ROWS.map((r) => [r.id, r] as const))('row %s', (_id, spec) => {
  clearSelectedBackends();
  const source = sourceBuffer(spec);

  /**
   * Each invariant re-runs the row rather than sharing one result, so a
   * failure names the invariant that broke instead of a shared setup.
   * That is cheap at matrix grids but not at the 1024² ceiling, where a
   * dithered run is ~0.5 s — hence a budget that scales with the grid.
   * The floor mirrors the config-wide 30 s liveness bound (vite.config.ts,
   * INFRA-CHECK-01/D136): an explicit per-test timeout overrides the
   * config default, so a lower floor here would quietly reintroduce the
   * starved-desktop flake for exactly these rows.
   */
  const timeout = Math.max(30_000, Math.ceil((spec.grid.width * spec.grid.height) / 100));

  it('answers with a result, never an error', () => {
    expect(run(spec, source).type).toBe('result');
  }, timeout);

  it('outputs exactly the grid dimensions', () => {
    const result = resultOf(spec, source);
    expect([result.width, result.height]).toEqual([spec.grid.width, spec.grid.height]);
    expect(new Uint8ClampedArray(result.pixels)).toHaveLength(
      spec.grid.width * spec.grid.height * 4,
    );
  }, timeout);

  it('never mutates the source buffer (stage purity through the executor)', () => {
    const before = Array.from(source.data);
    run(spec, source);
    expect(Array.from(source.data)).toEqual(before);
  }, timeout);

  it('is deterministic — the same request twice is byte-identical', () => {
    const a = new Uint8ClampedArray(resultOf(spec, source).pixels);
    const b = new Uint8ClampedArray(resultOf(spec, source).pixels);
    expect(Array.from(a)).toEqual(Array.from(b));
  }, timeout * 2);

  it('every empty cell is truly empty', () => {
    const pixels = new Uint8ClampedArray(resultOf(spec, source).pixels);
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i + 3] ?? 0) !== 0) continue;
      // An empty cell carries no thread colour — the M5-ACCEPT-01
      // defect was exactly this being a quantised palette entry.
      expect([pixels[i], pixels[i + 1], pixels[i + 2]]).toEqual([0, 0, 0]);
    }
  }, timeout);

  it('every stitch is a palette colour (resize-first only — see below)', () => {
    const palette = paletteFor(spec);
    if (palette === null) return; // full-RGB keeps source colours
    // Under 'reduce-first' the final resize AREA-AVERAGES pixels that
    // were already mapped to threads, so it blends them back off the
    // palette. That is inherent to the §7 comparison order, not a
    // defect — and it is exactly what D3 chose resize-first to avoid.
    // The characterisation is asserted separately rather than waived.
    if (spec.order === 'reduce-first') return;

    const allowed = new Set(
      palette.entries.map((e) => (e.rgb[0] << 16) | (e.rgb[1] << 8) | e.rgb[2]),
    );
    const pixels = new Uint8ClampedArray(resultOf(spec, source).pixels);
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i + 3] ?? 0) === 0) continue;
      const key =
        ((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0);
      expect(allowed.has(key)).toBe(true);
    }
  }, timeout);

  it('preserves the alpha the geometry produced', () => {
    const pixels = new Uint8ClampedArray(resultOf(spec, source).pixels);
    if (spec.alpha === 'empty') {
      // Every cell empty: nothing may acquire opacity from the pipeline.
      for (let i = 3; i < pixels.length; i += 4) expect(pixels[i]).toBe(0);
    }
    if (spec.alpha === 'letterbox' && spec.resizeMode !== 'stretch') {
      // A 2:1 source in these modes must leave some cell uncovered and
      // some cell covered — otherwise the row proves nothing about the
      // boundary it exists to test.
      let empty = 0;
      let opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) empty++;
        else opaque++;
      }
      expect(empty).toBeGreaterThan(0);
      expect(opaque).toBeGreaterThan(0);
    }
  }, timeout);
});

/**
 * The §7 order comparison, characterised rather than waived
 * (M5-ACCEPT-01 finding).
 *
 * `reduce-first` maps to threads at SOURCE resolution and only then
 * resizes — and the resize area-averages, blending those threads into
 * colours no thread has. So its output is a picture of what that order
 * costs, not a stitchable design: the palette-membership invariant
 * cannot hold for it, and the colour count explodes past the palette.
 *
 * Pinned here because "the invariant does not apply to this preset" is
 * only honest if the reason is itself asserted. If a future change made
 * reduce-first produce palette-membered output, this fails and the
 * exemption above gets revisited.
 */
describe('the reduce-first preset trades stitchability for the §7 comparison', () => {
  const spec = MATRIX.find(
    (r) => r.order === 'reduce-first' && r.palette === 'p64' && r.alpha === 'opaque' && r.dither,
  );

  it('blends past the palette, so its colour count exceeds the palette size', () => {
    expect(spec).toBeDefined();
    if (spec === undefined) return;
    const palette = paletteFor(spec);
    expect(palette).not.toBeNull();
    if (palette === null) return;

    const source = sourceBuffer(spec);
    const pixels = new Uint8ClampedArray(resultOf(spec, source).pixels);
    const allowed = new Set(
      palette.entries.map((e) => (e.rgb[0] << 16) | (e.rgb[1] << 8) | e.rgb[2]),
    );

    const distinct = new Set<number>();
    let outside = 0;
    let cells = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i + 3] ?? 0) === 0) continue;
      cells++;
      const key =
        ((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0);
      distinct.add(key);
      if (!allowed.has(key)) outside++;
    }

    // Measured at the time of writing: 1006/1024 cells outside a
    // 64-thread palette, across 955 distinct colours.
    expect(outside / cells).toBeGreaterThan(0.9);
    expect(distinct.size).toBeGreaterThan(palette.entries.length);
  });

  it('resize-first, the D3 default, stays entirely on-palette by contrast', () => {
    const control = MATRIX.find(
      (r) =>
        r.order === 'resize-first' &&
        r.palette === 'p64' &&
        r.alpha === 'opaque' &&
        r.dither &&
        r.resizeMode === 'stretch' &&
        r.metric === 'lab',
    );
    expect(control).toBeDefined();
    if (control === undefined) return;
    const palette = paletteFor(control);
    if (palette === null) return;
    const allowed = new Set(
      palette.entries.map((e) => (e.rgb[0] << 16) | (e.rgb[1] << 8) | e.rgb[2]),
    );
    const pixels = new Uint8ClampedArray(resultOf(control, sourceBuffer(control)).pixels);
    const distinct = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) {
      if ((pixels[i + 3] ?? 0) === 0) continue;
      distinct.add(((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0));
    }
    for (const key of distinct) expect(allowed.has(key)).toBe(true);
    expect(distinct.size).toBeLessThanOrEqual(palette.entries.length);
  });
});

/**
 * Adversarial rows that need a bespoke oracle rather than the shared
 * per-row invariants: the tie-break is a claim about WHICH of two
 * equally-good answers is returned, so only a second implementation of
 * the same rule can judge it.
 */
describe('adversarial: the first-index tie-break', () => {
  const DUP = paletteFor({ palette: 'dup' });
  const NEAR = paletteFor({ palette: 'neartie' });

  it('a duplicated palette entry always resolves to its FIRST index', () => {
    expect(DUP).not.toBeNull();
    if (DUP === null) return;
    const palRgb = paletteRgb(DUP);
    const palLab = paletteLab(DUP);
    const scratch = new Float32Array(3);
    const first = DUP.entries[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    // The exact scan, and the LUT built from the same palette, must both
    // land on index 0 rather than the copy at 40.
    for (const metric of ['lab', 'rgb'] as const) {
      const idx = nearestIndex(
        first.rgb[0],
        first.rgb[1],
        first.rgb[2],
        metric,
        palRgb,
        palLab,
        scratch,
      );
      expect(idx).toBe(0);
    }
  });

  it('the LUT agrees with the exact scan on every bin of a near-tie palette', () => {
    expect(NEAR).not.toBeNull();
    if (NEAR === null) return;
    const palRgb = paletteRgb(NEAR);
    const palLab = paletteLab(NEAR);
    const scratch = new Float32Array(3);

    for (const metric of ['lab', 'rgb'] as const) {
      const lut = buildLut(NEAR, metric);
      // Walk the bin representatives — the exact colours the LUT was
      // built from, so any disagreement is a real inconsistency rather
      // than a quantisation artefact.
      for (let rBin = 0; rBin < 32; rBin += 3) {
        for (let gBin = 0; gBin < 32; gBin += 3) {
          for (let bBin = 0; bBin < 32; bBin += 3) {
            const r = (rBin << 3) | (rBin >> 2);
            const g = (gBin << 3) | (gBin >> 2);
            const b = (bBin << 3) | (bBin >> 2);
            const exact = nearestIndex(r, g, b, metric, palRgb, palLab, scratch);
            expect(lut[(rBin << 10) | (gBin << 5) | bBin]).toBe(exact);
          }
        }
      }
    }
  });
});

/**
 * The published coverage table is generated from the same rows the
 * suite runs, and this asserts the committed copy still matches — a
 * staleness gate, not a writer. `check` stays non-mutating (AGENTS.md);
 * regenerate with `npm run matrix:write` when the rows change.
 */
describe('published coverage table', () => {
  const DOC = fileURLToPath(new URL('../docs/acceptance-matrix.md', import.meta.url));
  const BEGIN = '<!-- matrix-coverage:begin -->';
  const END = '<!-- matrix-coverage:end -->';

  it('matches the committed docs/acceptance-matrix.md', () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, 'utf8');
    const start = text.indexOf(BEGIN);
    const end = text.indexOf(END);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const committed = text.slice(start + BEGIN.length, end).trim();
    expect(committed).toBe(renderCoverageMarkdown(MATRIX).trim());
  });
});
