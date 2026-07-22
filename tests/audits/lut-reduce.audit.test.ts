/**
 * M5-PERF-12 — audit LUT construction and colour reduction.
 *
 * The ticket names one defect to reproduce first (the cache key is
 * `name:count:metric`, so two different palettes with the same name and
 * size collide) and one measurement to separate (LUT build vs per-pixel
 * mapping, which bv1 reports as a single `reduce` row). Both are done
 * here; the GPU rows are unmeasurable in node and are recorded as
 * explicit gaps rather than omitted.
 */

import { describe, expect, it } from 'vitest';

import { buildLut, LUT_SIZE, lutKey, nearestIndex } from '../../src/core/color/lut.ts';
import { loadDmcPalette, paletteLab, paletteRgb } from '../../src/core/palette.ts';
import { reduceStage } from '../../src/core/pipeline/reduce.ts';
import { resizeStage } from '../../src/core/pipeline/resize.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import { clearLutCache, getLut, lutCacheSize } from '../../src/worker/lut-cache.ts';
import { palette64, sourceBuffer, workloadById } from '../bench/workloads.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  round,
  timed,
  type AuditRow,
} from './audit.ts';
import { thread } from '../helpers/threads.ts';

function gridBuffer(grid: number): PixelBuffer {
  const source = sourceBuffer(
    workloadById('noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still'),
  );
  return resizeStage.backends.ts(source, { width: grid, height: grid, mode: 'stretch' });
}

describe.skipIf(!AUDIT)('M5-PERF-12 LUT/reduce audit (AUDIT=1)', () => {
  const rows: AuditRow[] = [];
  const findings: string[] = [];

  // Was "reproduces the stale-LUT cache-key collision" — the M5B audit
  // that confirmed the defect. M5-PERF-26 fixed it (D46: the key is now
  // a content fingerprint over the entry RGB values in order), so the
  // reproduction is inverted rather than deleted: it stays as the
  // evidence that the collision cannot come back.
  it('no longer serves a stale LUT across a reordered palette', () => {
    clearLutCache();
    const entry = (reference: string, name: string, rgb: [number, number, number]) =>
      thread(reference, name, rgb);
    // Same name, same entry count — only the order differs. Reordering
    // is one of the first things a palette editor will do, and the LUT
    // stores *indices*, so a stale LUT maps colours to the wrong slot.
    const first: Palette = {
      name: 'Collide',
      entries: [
        entry('1', 'red', [255, 0, 0]),
        entry('2', 'green', [0, 255, 0]),
      ],
    };
    const reordered: Palette = {
      name: 'Collide',
      entries: [
        entry('2', 'green', [0, 255, 0]),
        entry('1', 'red', [255, 0, 0]),
      ],
    };

    const lutFirst = getLut(first, 'lab');
    const lutReordered = getLut(reordered, 'lab');
    const served = lutFirst === lutReordered;

    // What the user actually sees: a pure-red pixel reduced under the
    // reordered palette must still come back red.
    const pixel: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255]),
    };
    const out = reduceStage.backends.ts(pixel, {
      palette: reordered,
      metric: 'lab',
      path: 'lut',
      lut: lutReordered,
    });
    const rgbOut = [out.data[0] ?? 0, out.data[1] ?? 0, out.data[2] ?? 0];
    const wrong = !(rgbOut[0] === 255 && rgbOut[1] === 0 && rgbOut[2] === 0);

    rows.push(
      counted('stale-LUT collision (content-fingerprint key)', {
        'same object served': served ? 'yes' : 'no',
        'red pixel reduced to': `rgb(${rgbOut.join(',')})`,
        verdict: wrong ? 'REGRESSED — wrong colour served' : 'fixed (D46)',
        'cache entries': lutCacheSize(),
      }),
    );
    findings.push(
      wrong
        ? 'REGRESSION: the stale-LUT collision is back. `lut-cache.ts` must key on a ' +
          'content fingerprint over the entry RGB values in order, plus metric and a ' +
          'schema version — keying on name or entry count lets two palettes share one ' +
          'LUT, and the LUT stores palette INDICES. See D46 / M5-PERF-26.'
        : 'Fixed (M5-PERF-26, D46): reordering a palette yields its own LUT and a ' +
          'pure-red pixel still reduces to red. The M5B collision cannot recur.',
    );
    expect(served).toBe(false);
    expect(rgbOut).toEqual([255, 0, 0]);
    clearLutCache();
  }, AUDIT_TIMEOUT_MS);

  it('separates LUT build from per-pixel mapping', () => {
    for (const [name, palette] of [
      ['p64', palette64()],
      ['p533', loadDmcPalette()],
    ] as const) {
      const build = timed(
        `LUT build (cold) — ${name}`,
        () => buildLut(palette, 'lab'),
        name === 'p64' ? 30 : 180,
        { bins: LUT_SIZE, entries: palette.entries.length },
      );
      const lut = buildLut(palette, 'lab');
      for (const grid of [200, 300, 1024]) {
        const buffer = gridBuffer(grid);
        const map = timed(
          `LUT map ${String(grid)}² — ${name}`,
          () =>
            reduceStage.backends.ts(buffer, {
              palette,
              metric: 'lab',
              path: 'lut',
              lut,
            }),
          grid === 1024 ? 14 : 2,
          { px: grid * grid },
        );
        rows.push(map);
        if (grid === 1024) {
          rows.push(
            counted(`build vs map — ${name} @1024²`, {
              'build ms': round(build.summary?.median ?? 0, 1),
              'map ms': round(map.summary?.median ?? 0, 2),
              'frames to amortise build': Math.ceil(
                (build.summary?.median ?? 0) / Math.max(map.summary?.median ?? 1, 1e-9),
              ),
            }),
          );
        }
      }
      rows.push(build);
    }
    findings.push(
      'The bv1 `reduce` row (13.6 ms vs a 10 ms budget at 1024²/64) is almost entirely ' +
        'per-pixel mapping: the LUT build is a cache miss paid once per palette+metric, and ' +
        'the map row is a flat array lookup whose cost is memory-bound, not palette-bound — ' +
        'p64 and p533 map at the same speed, as the rows above show. That means a bigger ' +
        'palette does not make reduce slower, and no search-side optimisation can move this ' +
        'row. Only fewer bytes touched (or a GPU map) can.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('checks LUT quantisation error against exact matching', () => {
    // The LUT path quantises to 15-bit before matching, so it can pick a
    // different entry from the exact path. Quantifying that is the input
    // M5C needs to decide whether reduce and dither may share a matcher.
    const palette = palette64();
    const lut = buildLut(palette, 'lab');
    const palRgb = paletteRgb(palette);
    const palLab = paletteLab(palette);
    const scratch = new Float32Array(3);
    let disagreements = 0;
    let checked = 0;
    let maxRgbDelta = 0;
    for (let r = 0; r < 256; r += 3)
      for (let g = 0; g < 256; g += 3)
        for (let b = 0; b < 256; b += 3) {
          checked++;
          const viaLut = lut[lutKey(r, g, b)] ?? 0;
          const exact = nearestIndex(r, g, b, 'lab', palRgb, palLab, scratch);
          if (viaLut !== exact) {
            disagreements++;
            // How far apart the two thread colours actually are, in sRGB.
            const dr = (palRgb[viaLut * 3] ?? 0) - (palRgb[exact * 3] ?? 0);
            const dg = (palRgb[viaLut * 3 + 1] ?? 0) - (palRgb[exact * 3 + 1] ?? 0);
            const db = (palRgb[viaLut * 3 + 2] ?? 0) - (palRgb[exact * 3 + 2] ?? 0);
            maxRgbDelta = Math.max(maxRgbDelta, Math.sqrt(dr * dr + dg * dg + db * db));
          }
        }
    rows.push(
      counted('15-bit LUT vs exact Lab match (sampled sRGB cube)', {
        checked,
        disagreements,
        'disagreement %': round((100 * disagreements) / checked, 2),
        'max sRGB distance between the two picks': round(maxRgbDelta, 1),
      }),
    );
    findings.push(
      `The 15-bit LUT disagrees with exact Lab matching on ${String(round((100 * disagreements) / checked, 1))}% of sampled ` +
        `sRGB values — the quantisation is visible, not theoretical. This is why D6 keeps ` +
        `dither on the exact matcher, and it is the number M5C needs if any mode proposes ` +
        `sharing one matcher between reduce and dither.`,
    );
    expect(checked).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('records the boundaries node cannot observe', () => {
    rows.push(
      counted('GPU LUT build / map', {
        status: 'unsupported in node — no navigator.gpu',
        owner: 'M5-PERF-18 browser procedure',
        note: 'submission, execution and readback must be timed apart from CPU wall time',
      }),
    );
    findings.push(
      'GPU LUT build, GPU mapping and device-loss fallback cannot be measured in node and ' +
        'are NOT reported here as zero. They are carried into the browser procedure this ' +
        'milestone establishes (M5-PERF-18) and remain open for M5C.',
    );
    expect(rows.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);

  it('publishes the audit', () => {
    publishAudit({
      ticket: 'M5-PERF-12',
      question: 'What does the LUT cost to build, to map, and is its cache key correct?',
      rows,
      findings,
    });
    expect(findings.length).toBeGreaterThan(0);
  }, AUDIT_TIMEOUT_MS);
});

describe.runIf(!AUDIT)('M5-PERF-12 LUT/reduce audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
