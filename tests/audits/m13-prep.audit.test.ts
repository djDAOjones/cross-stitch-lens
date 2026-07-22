/**
 * M13-PROF-02 — preparation and cache profile (node half).
 *
 * Characterises the palette-change path component by component: policy
 * resolution, colour-count selection, palette flattening, LUT and
 * candidate-table construction, stage-list build, and the two worker
 * LRU caches under realistic switching patterns — hits proven by the
 * `lutCacheStats` counters (M13-PROF-02: a fast time never proves a
 * hit). Read-only over the shipped engine; the caches are exercised,
 * never re-designed.
 *
 * Browser-only halves — the GPU LUT end-to-end question and whether
 * the selection-source full-RGB export blocks live preview — need the
 * M13-MEAS-02 harness run and are recorded as explicit gaps.
 */

import { describe, expect, it } from 'vitest';

import { palette64, paletteFull } from '../../src/bench/workloads.ts';
import { buildCandidateTable } from '../../src/core/color/candidates.ts';
import { buildLut } from '../../src/core/color/lut.ts';
import { loadDmcPalette, paletteLab, paletteRgb } from '../../src/core/palette.ts';
import { defaultPolicy, type PalettePolicy } from '../../src/core/palette-policy.ts';
import { resolveProjectPalette } from '../../src/core/palette-resolve.ts';
import { buildDistribution, selectThreads } from '../../src/core/palette-selection.ts';
import { resolvePermitted } from '../../src/core/palette-policy.ts';
import { buildStages } from '../../src/core/pipeline/config.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import {
  clearLutCache,
  getCandidates,
  getLut,
  lutCacheStats,
  resetLutCacheStats,
} from '../../src/worker/lut-cache.ts';
import {
  AUDIT,
  AUDIT_TIMEOUT_MS,
  counted,
  publishAudit,
  timed,
  type AuditRow,
} from './audit.ts';

const rows: AuditRow[] = [];
const findings: string[] = [];

const catalogue = loadCatalogue();
const ALL_BRANDS = catalogue.brands.map((b) => b.id);

function policy(overrides: Partial<PalettePolicy> = {}): PalettePolicy {
  return { ...defaultPolicy(), ...overrides };
}

/** Deterministic LCG noise buffer at grid size (selection source). */
function noiseGrid(edge: number): PixelBuffer {
  const data = new Uint8ClampedArray(edge * edge * 4);
  let state = 0xbe7c4;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = i % 4 === 3 ? 255 : state >>> 24;
  }
  return { width: edge, height: edge, data };
}

/** Flat-blocks buffer — few distinct colours, sparse distribution. */
function flatGrid(edge: number): PixelBuffer {
  const data = new Uint8ClampedArray(edge * edge * 4);
  for (let y = 0; y < edge; y++) {
    for (let x = 0; x < edge; x++) {
      const i = (y * edge + x) * 4;
      const cell = Math.floor(y / 32) * 3 + Math.floor(x / 32);
      data[i] = (cell * 53) % 256;
      data[i + 1] = (cell * 97) % 256;
      data[i + 2] = (cell * 151) % 256;
      data[i + 3] = 255;
    }
  }
  return { width: edge, height: edge, data };
}

/** A palette with the same entries in reverse order (identity change). */
function reversed(palette: Palette): Palette {
  return { name: `${palette.name}-reversed`, entries: [...palette.entries].reverse() };
}

describe.skipIf(!AUDIT)('M13-PROF-02 — preparation and cache profile (node half)', () => {
  it(
    'times policy resolution across realistic policies',
    () => {
      const source300 = noiseGrid(300);
      const cases: [string, PalettePolicy, PixelBuffer | undefined][] = [
        ['dmc, no count', policy(), undefined],
        ['dmc, max 30', policy({ count: { mode: 'max', n: 30 } }), source300],
        ['dmc, exact 30', policy({ count: { mode: 'exact', n: 30 } }), source300],
        [
          'dmc, owned-only (4 threads)',
          policy({ ownedOnly: true, count: { mode: 'max', n: 30 } }),
          source300,
        ],
        [
          'dmc, locks+exclusions, max 30',
          policy({
            count: { mode: 'max', n: 30 },
            locked: ['dmc:310', 'dmc:666'],
            excluded: ['dmc:321', 'dmc:498'],
          }),
          source300,
        ],
        ['all 8 brands, no count', policy({ brands: [...ALL_BRANDS] }), undefined],
        [
          'all 8 brands, max 30',
          policy({ brands: [...ALL_BRANDS], count: { mode: 'max', n: 30 } }),
          source300,
        ],
      ];
      const owned = new Set(['dmc:310', 'dmc:666', 'dmc:321', 'dmc:498']);
      for (const [label, pol, source] of cases) {
        rows.push(
          timed(
            `resolve: ${label}`,
            () =>
              resolveProjectPalette({
                policy: pol,
                inputs: { catalogue, owned },
                ...(source === undefined ? {} : { source }),
                name: 'audit',
              }),
            label.includes('all 8') ? 50 : 10,
          ),
        );
      }
    },
    AUDIT_TIMEOUT_MS,
  );

  it(
    'times distribution and selection by grid size and content',
    () => {
      for (const [label, buffer] of [
        ['noise 200²', noiseGrid(200)],
        ['noise 300²', noiseGrid(300)],
        ['noise 1024²', noiseGrid(1024)],
        ['flat 300²', flatGrid(300)],
      ] as const) {
        rows.push(
          timed(`buildDistribution: ${label}`, () => buildDistribution(buffer), 20, {
            bins: buildDistribution(buffer).count,
          }),
        );
      }
      const permittedDmc = resolvePermitted(policy(), { catalogue });
      const permittedAll = resolvePermitted(policy({ brands: [...ALL_BRANDS] }), {
        catalogue,
      });
      const dist300 = buildDistribution(noiseGrid(300));
      rows.push(
        timed(
          'selectThreads: 30 from 489 (dmc), noise 300²',
          () => selectThreads(permittedDmc, 30, dist300),
          50,
        ),
        timed(
          'selectThreads: 30 from 3338 (all brands), noise 300²',
          () => selectThreads(permittedAll, 30, dist300),
          400,
        ),
      );
    },
    AUDIT_TIMEOUT_MS,
  );

  it(
    'times flattening and construction per palette size',
    () => {
      const palettes: [string, Palette][] = [
        ['p64', palette64()],
        ['p489', loadDmcPalette()],
        ['pfull (3,338)', paletteFull()],
      ];
      for (const [label, palette] of palettes) {
        rows.push(
          timed(`paletteRgb: ${label}`, () => paletteRgb(palette), 1, {
            'bytes/call': palette.entries.length * 3,
            note: 'allocated per stage call today',
          }),
          timed(`paletteLab: ${label}`, () => paletteLab(palette), 5, {
            'bytes/call': palette.entries.length * 3 * 4,
            note: 'derived per stage call today',
          }),
          timed(`buildLut (ts): ${label}`, () => buildLut(palette, 'lab'), 250, {
            'output KiB': 64,
          }),
          timed(`buildCandidateTable: ${label}`, () => buildCandidateTable(palette), 3500, {
            'output entries': buildCandidateTable(palette).candidates.length,
          }),
        );
        const config = {
          preset: 'resize-first' as const,
          grid: { width: 300, height: 300 },
          resizeMode: 'stretch' as const,
          palette,
          metric: 'lab' as const,
          dither: { algorithm: 'none' as const },
        };
        rows.push(
          timed(`buildStages (warm lut): ${label}`, () => buildStages(config, { lut: getLut }), 1),
        );
      }
    },
    AUDIT_TIMEOUT_MS,
  );

  it(
    'proves cache behaviour with counters, not timings',
    () => {
      const a = palette64();
      const b = loadDmcPalette();
      const c = reversed(a);

      // A→B→A toggling: the return to A must be a counted hit.
      clearLutCache();
      resetLutCacheStats();
      getLut(a, 'lab');
      getLut(b, 'lab');
      getLut(a, 'lab');
      let stats = lutCacheStats();
      rows.push(
        counted('LUT A→B→A toggle', {
          hits: stats.lut.hits,
          misses: stats.lut.misses,
          evictions: stats.lut.evictions,
          verdict: stats.lut.hits === 1 && stats.lut.misses === 2 ? 'HIT PROVEN' : 'UNEXPECTED',
        }),
      );
      expect(stats.lut.hits).toBe(1);
      expect(stats.lut.misses).toBe(2);

      // Candidate cache cap is 2: A→B→C evicts A, and returning to A
      // rebuilds — the churn cost the cap size implies.
      clearLutCache();
      resetLutCacheStats();
      getCandidates(a);
      getCandidates(b);
      getCandidates(c);
      getCandidates(a);
      stats = lutCacheStats();
      rows.push(
        counted('candidates A→B→C→A churn past cap 2', {
          hits: stats.candidates.hits,
          misses: stats.candidates.misses,
          evictions: stats.candidates.evictions,
          verdict:
            stats.candidates.misses === 4 && stats.candidates.evictions >= 2
              ? 'CHURN CONFIRMED — cap 2 rebuilds on 3-palette cycles'
              : 'UNEXPECTED',
        }),
      );
      expect(stats.candidates.misses).toBe(4);

      // Metric switch: lab and rgb are distinct LUT keys by design.
      clearLutCache();
      resetLutCacheStats();
      getLut(a, 'lab');
      getLut(a, 'rgb');
      getLut(a, 'lab');
      stats = lutCacheStats();
      expect(stats.lut.misses).toBe(2);
      expect(stats.lut.hits).toBe(1);
      rows.push(
        counted('LUT metric switch lab→rgb→lab', {
          hits: stats.lut.hits,
          misses: stats.lut.misses,
          verdict: 'metric is part of the key; both survive',
        }),
      );

      // Reorder: same colours, different order → different fingerprint,
      // never shared (indices would mean the wrong threads).
      clearLutCache();
      resetLutCacheStats();
      getLut(a, 'lab');
      getLut(c, 'lab');
      stats = lutCacheStats();
      expect(stats.lut.misses).toBe(2);
      rows.push(
        counted('LUT reordered palette', {
          misses: stats.lut.misses,
          verdict: 'order is identity — reorder is a rebuild, by design (D46)',
        }),
      );

      // Name-only change: content fingerprint keying shares the entry.
      clearLutCache();
      resetLutCacheStats();
      getLut(a, 'lab');
      getLut({ name: 'renamed', entries: a.entries }, 'lab');
      stats = lutCacheStats();
      expect(stats.lut.hits).toBe(1);
      rows.push(
        counted('LUT renamed palette (same content)', {
          hits: stats.lut.hits,
          verdict: 'content-keyed — a rename never rebuilds',
        }),
      );
      clearLutCache();
    },
    AUDIT_TIMEOUT_MS,
  );

  it('publishes the artefact with the browser gaps stated', () => {
    findings.push(
      'GPU LUT end-to-end (device/pipeline, upload, dispatch, readback) is not ' +
        'measurable in node — M13-MEAS-02 harness run required (unsupported here).',
      'whether ensureSelectionSource()\u2019s full-RGB export blocks or races live ' +
        'preview is a browser/Worker question — M13-PROF-04 territory with the ' +
        'harness counters.',
      'candidate-table cap 2 rebuilds on any 3-palette cycle; whether real ' +
        'switching patterns reach that is a synthesis question, not a fact this ' +
        'audit can settle from node.',
    );
    publishAudit({
      ticket: 'M13-PROF-02',
      question: 'what a palette change costs, component by component, and what the caches actually do',
      rows,
      findings,
    });
    expect(rows.length).toBeGreaterThan(10);
  });
});

describe.runIf(!AUDIT)('M13-PROF-02 prep audit (skipped)', () => {
  it('gated behind AUDIT=1 — run via npm run audit', () => {
    expect(AUDIT).toBe(false);
  });
});
