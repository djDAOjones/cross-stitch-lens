/**
 * Workload-matrix invariants (bv2 — M13-MEAS-01 exit evidence; the
 * shape is M5-PERF-01's). These run in the normal quality gate — the
 * matrix is the thing every later performance claim is measured
 * against, so an accidentally dropped axis must fail loudly rather
 * than quietly narrow the evidence base.
 */

import { describe, expect, it } from 'vitest';

import type { DitherConfig } from '../src/core/pipeline/config.ts';
import {
  configFor,
  CORE_GRIDS,
  ditherToken,
  FS_DEFAULT,
  M8_METHOD_DEFAULTS,
  METHOD_BLOCK_GRIDS,
  NO_DITHER,
  paletteFor,
  paletteFull,
  sourceBuffer,
  sourceDimensions,
  workloadById,
  workloadId,
  WORKLOADS,
  type Workload,
} from '../src/bench/workloads.ts';

/** Distinct values of one axis across the whole matrix. */
function axis<K extends keyof Workload>(key: K): Set<Workload[K]> {
  return new Set(WORKLOADS.map((w) => w[key]));
}

describe('dither ID token', () => {
  it('names the method and every cost-relevant setting', () => {
    expect(ditherToken(NO_DITHER)).toBe('nodither');
    expect(ditherToken(FS_DEFAULT)).toBe('fs-s100-serp');
    expect(
      ditherToken({ algorithm: 'floyd-steinberg', serpentine: false, strength: 0.5 }),
    ).toBe('fs-s050-raster');
    expect(ditherToken({ algorithm: 'ordered', strength: 1.5 })).toBe('ordered-s150');
    expect(ditherToken({ algorithm: 'blue-noise', strength: 1 })).toBe('bluenoise-s100');
  });

  it('never injects the dot field separator', () => {
    const configs: DitherConfig[] = [
      NO_DITHER,
      FS_DEFAULT,
      ...M8_METHOD_DEFAULTS,
      { algorithm: 'floyd-steinberg', serpentine: true, strength: 0.25 },
      { algorithm: 'ordered', strength: 1.75 },
    ];
    for (const config of configs) expect(ditherToken(config)).not.toContain('.');
  });

  it('gives two executable configs distinct tokens', () => {
    const tokens = [
      NO_DITHER,
      FS_DEFAULT,
      { algorithm: 'floyd-steinberg', serpentine: false, strength: 1 },
      { algorithm: 'floyd-steinberg', serpentine: true, strength: 0.5 },
      ...M8_METHOD_DEFAULTS,
      { algorithm: 'ordered', strength: 1.5 },
    ].map((config) => ditherToken(config as DitherConfig));
    expect(new Set(tokens).size).toBe(tokens.length);
  });
});

describe('workload matrix', () => {
  it('gives every workload a unique id', () => {
    const ids = WORKLOADS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('derives ids deterministically from the axes', () => {
    for (const workload of WORKLOADS) {
      const spec = { ...workload } as Partial<Workload>;
      delete spec.id;
      expect(workloadId(spec as Omit<Workload, 'id'>)).toBe(workload.id);
    }
  });

  it('resolves a workload by id and rejects an unknown one', () => {
    const first = WORKLOADS[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(workloadById(first.id)).toBe(first);
    expect(() => workloadById('not.a.workload')).toThrow(/unknown workload id/);
  });

  it('covers the mandatory grid × palette × FS/no-dither cross-product', () => {
    for (const grid of CORE_GRIDS) {
      for (const palette of ['p64', 'p489'] as const) {
        for (const dither of [NO_DITHER, FS_DEFAULT]) {
          const match = WORKLOADS.filter(
            (w) =>
              w.grid === grid &&
              w.palette === palette &&
              ditherToken(w.dither) === ditherToken(dither) &&
              w.source === 'noise' &&
              w.sourceSize === 'w1280' &&
              w.alpha === 'opaque' &&
              w.metric === 'lab' &&
              w.order === 'resize-first' &&
              w.resizeMode === 'stretch' &&
              w.path === 'still',
          );
          expect(
            match.length,
            `${String(grid)}/${palette}/${ditherToken(dither)}`,
          ).toBe(1);
        }
      }
    }
  });

  it('covers every shipped M8 method at the promise and ceiling grids', () => {
    for (const grid of METHOD_BLOCK_GRIDS) {
      for (const dither of M8_METHOD_DEFAULTS) {
        const match = WORKLOADS.filter(
          (w) =>
            w.grid === grid &&
            w.palette === 'p64' &&
            ditherToken(w.dither) === ditherToken(dither) &&
            w.source === 'noise' &&
            w.sourceSize === 'w1280' &&
            w.metric === 'lab' &&
            w.path === 'still',
        );
        expect(match.length, `${String(grid)}/${ditherToken(dither)}`).toBe(1);
      }
    }
  });

  it('carries targeted non-default strength and scan-direction rows', () => {
    const tokens = new Set(WORKLOADS.map((w) => ditherToken(w.dither)));
    expect(tokens).toContain('fs-s050-serp');
    expect(tokens).toContain('fs-s100-raster');
    expect(tokens).toContain('ordered-s150');
  });

  it('has an explicit 300² regression row for the product workload', () => {
    // A node component baseline for the grid the product promise binds
    // at — not a proxy for the in-browser ≥ 4 updates/sec promise.
    const row = workloadById(
      'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
    );
    expect(row.grid).toBe(300);
  });

  it('covers every required axis value at least once', () => {
    expect(axis('grid')).toEqual(new Set(CORE_GRIDS));
    expect(axis('palette')).toEqual(new Set(['p64', 'p489', 'rgb']));
    expect(axis('metric')).toEqual(new Set(['lab', 'rgb']));
    const algorithms = new Set(WORKLOADS.map((w) => w.dither.algorithm));
    expect(algorithms).toEqual(
      new Set(['none', 'floyd-steinberg', 'atkinson', 'jarvis', 'ordered', 'blue-noise']),
    );
    expect(axis('order')).toEqual(new Set(['resize-first', 'reduce-first']));
    expect(axis('resizeMode')).toEqual(new Set(['stretch', 'contain', 'cover', 'fit']));
    expect(axis('alpha')).toEqual(new Set(['opaque', 'mixed']));
    expect(axis('source')).toEqual(new Set(['noise', 'gradient', 'flat']));
    expect(axis('sourceSize')).toEqual(new Set(['grid', 'w1280', 'crop']));
    expect(axis('path')).toEqual(new Set(['still', 'live']));
  });

  it('documents why each non-core row exists', () => {
    const core = WORKLOADS.filter((w) => w.note === undefined);
    expect(core).toHaveLength(CORE_GRIDS.length * 2 * 2);
    for (const workload of WORKLOADS.filter((w) => w.note !== undefined)) {
      expect(workload.note?.length ?? 0).toBeGreaterThan(10);
    }
  });
});

describe('workload sources', () => {
  it('sizes the source independently of the grid', () => {
    expect(sourceDimensions('grid', 300)).toEqual({ width: 300, height: 300 });
    expect(sourceDimensions('w1280', 300)).toEqual({ width: 1280, height: 1280 });
    expect(sourceDimensions('crop', 300)).toEqual({ width: 1512, height: 982 });
  });

  it('generates byte-identical pixels for the same workload', () => {
    const workload = WORKLOADS.find((w) => w.grid === 200);
    expect(workload).toBeDefined();
    if (workload === undefined) return;
    const a = sourceBuffer(workload);
    const b = sourceBuffer(workload);
    expect(a.width).toBe(b.width);
    expect(a.data.length).toBe(a.width * a.height * 4);
    expect(Array.from(a.data.slice(0, 4096))).toEqual(Array.from(b.data.slice(0, 4096)));
  });

  it('makes mixed-alpha sources actually transparent at the edge', () => {
    const mixed = WORKLOADS.find((w) => w.alpha === 'mixed');
    expect(mixed).toBeDefined();
    if (mixed === undefined) return;
    const buffer = sourceBuffer(mixed);
    expect(buffer.data[3]).toBe(0);
    const centre =
      (Math.floor(buffer.height / 2) * buffer.width + Math.floor(buffer.width / 2)) * 4;
    expect(buffer.data[centre + 3]).toBe(255);
  });

  it('keeps opaque sources fully opaque', () => {
    const opaque = WORKLOADS.find((w) => w.alpha === 'opaque');
    expect(opaque).toBeDefined();
    if (opaque === undefined) return;
    const buffer = sourceBuffer(opaque);
    for (let i = 3; i < 4000; i += 4) expect(buffer.data[i]).toBe(255);
  });
});

describe('workload configs', () => {
  it('maps the palette axis to the palette it claims (p489 is honest)', () => {
    for (const workload of WORKLOADS) {
      const palette = paletteFor(workload);
      if (workload.palette === 'rgb') expect(palette).toBeNull();
      else expect(palette?.entries.length).toBe(workload.palette === 'p64' ? 64 : 489);
    }
  });

  it('provides the full-catalogue preparation stress palette', () => {
    // Preparation-only (see workloads.ts): the eight-brand union, never
    // a pipeline row.
    const full = paletteFull();
    expect(full.entries.length).toBe(3338);
    expect(new Set(full.entries.map((t) => t.id)).size).toBe(3338);
  });

  it('never dithers in full-RGB mode', () => {
    for (const workload of WORKLOADS) {
      const config = configFor(workload);
      if (workload.palette === 'rgb') {
        expect(config.palette).toBeNull();
        expect(config.dither).toEqual({ algorithm: 'none' });
      }
      expect(config.grid).toEqual({ width: workload.grid, height: workload.grid });
      expect(config.preset).toBe(workload.order);
    }
  });

  it('passes the workload dither config through to the pipeline', () => {
    for (const workload of WORKLOADS) {
      if (workload.palette === 'rgb') continue;
      expect(configFor(workload).dither).toEqual(workload.dither);
    }
  });
});
