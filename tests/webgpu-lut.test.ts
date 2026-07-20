/**
 * WebGPU colour-reduction tolerance suite (decision-log D41).
 *
 * Node has no GPU, so the automated tolerance check runs against the
 * f32 mirror of the WGSL arithmetic (tests/helpers/lut-f32.ts): any
 * divergence from the f64 TS LUT must be rare and confined to
 * near-ties — bins where the two candidate palette entries sit at
 * almost identical distance, so either thread is a valid pick. The
 * real-GPU suite at the bottom runs the same assertions through
 * WebGPU itself wherever `navigator.gpu` exists (a browser test
 * context); in node it skips visibly.
 */

import { describe, expect, it } from 'vitest';

import { buildLutGpu, mapPaletteGpu } from '../src/backends/webgpu/reduce.ts';
import { isWebGpuAvailable } from '../src/backends/webgpu/device.ts';
import { LUT_BINDINGS, lutBuildShader, MAP_SHADER } from '../src/backends/webgpu/wgsl.ts';
import { binToChannel, buildLut, LUT_SIZE } from '../src/core/color/lut.ts';
import type { ColorMetric } from '../src/core/color/metrics.ts';
import { deltaE76Sq, euclideanRgbSq } from '../src/core/color/metrics.ts';
import { srgbToLab } from '../src/core/color/convert.ts';
import { loadDmcPalette, paletteLab, paletteRgb } from '../src/core/palette.ts';
import type { Palette } from '../src/core/types.ts';
import { mirrorPalette, nearestBinF32 } from './helpers/lut-f32.ts';
import { reservedIdentifiers } from './helpers/wgsl-reserved.ts';

/** Divergence budget: at most this share of bins may disagree. */
const MAX_MISMATCH_RATE = 0.01;
/**
 * Near-tie bound: where a pick disagrees, the chosen entry's true
 * (f64) distance may exceed the reference pick's by at most this
 * relative margin — i.e. the two threads were visually equivalent.
 */
const NEAR_TIE_MARGIN = 0.005;

const TEST_PALETTE: Palette = {
  name: 'test-rwbk',
  entries: [
    { code: 'R', name: 'red', hex: '#ff0000', rgb: [255, 0, 0], manufacturer: 'test' },
    { code: 'W', name: 'white', hex: '#ffffff', rgb: [255, 255, 255], manufacturer: 'test' },
    { code: 'B', name: 'blue', hex: '#0000ff', rgb: [0, 0, 255], manufacturer: 'test' },
    { code: 'K', name: 'black', hex: '#000000', rgb: [0, 0, 0], manufacturer: 'test' },
  ],
};

/** f64 squared distance from a bin's representative to one entry. */
function binDistSq(key: number, index: number, metric: ColorMetric, palette: Palette): number {
  const r = binToChannel((key >> 10) & 31);
  const g = binToChannel((key >> 5) & 31);
  const b = binToChannel(key & 31);
  if (metric === 'lab') {
    const target = new Float32Array(3);
    srgbToLab(r, g, b, target, 0);
    return deltaE76Sq(target, 0, paletteLab(palette), index * 3);
  }
  const palRgb = paletteRgb(palette);
  return euclideanRgbSq(
    r,
    g,
    b,
    palRgb[index * 3] ?? 0,
    palRgb[index * 3 + 1] ?? 0,
    palRgb[index * 3 + 2] ?? 0,
  );
}

/**
 * Compare a candidate LUT against the TS reference over `bins`:
 * assert the mismatch budget and the near-tie property of every
 * disagreement.
 */
function assertTolerance(
  bins: readonly number[],
  pick: (key: number) => number,
  metric: ColorMetric,
  palette: Palette,
): { mismatches: number } {
  const reference = buildLut(palette, metric);
  let mismatches = 0;
  for (const key of bins) {
    const got = pick(key);
    const want = reference[key] ?? 0;
    if (got === want) continue;
    mismatches++;
    const gotDist = binDistSq(key, got, metric, palette);
    const wantDist = binDistSq(key, want, metric, palette);
    expect(gotDist, `bin ${String(key)}: pick ${String(got)} vs ${String(want)}`).toBeLessThanOrEqual(
      wantDist * (1 + NEAR_TIE_MARGIN),
    );
  }
  expect(mismatches / bins.length).toBeLessThanOrEqual(MAX_MISMATCH_RATE);
  return { mismatches };
}

const ALL_BINS = Array.from({ length: LUT_SIZE }, (_, k) => k);

/** Deterministic sample of bins (LCG) for the large-palette cases. */
function sampledBins(count: number, seed: number): number[] {
  const bins: number[] = [];
  let state = seed >>> 0;
  for (let i = 0; i < count; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    bins.push(state % LUT_SIZE);
  }
  return bins;
}

describe('WGSL shader sources', () => {
  it('bake the metric variants and entry points', () => {
    expect(lutBuildShader('lab')).toContain('srgb_to_lab');
    expect(lutBuildShader('lab')).toContain('build_lut');
    expect(lutBuildShader('rgb')).not.toContain('let probe = srgb_to_lab');
    expect(MAP_SHADER).toContain('map_palette');
  });

  // Regression for D46: `let target = …` made every LUT-build module
  // fail to compile, and WebGPU's async error reporting meant nothing
  // threw — the zero-filled result buffer was cached as a valid LUT and
  // every non-dithered design rendered a single flat colour. A GPU-free
  // scan catches this whole class before it can ship again.
  it('use no WGSL reserved words as identifiers', () => {
    const shaders: [string, string][] = [
      ['lutBuildShader(lab)', lutBuildShader('lab')],
      ['lutBuildShader(rgb)', lutBuildShader('rgb')],
      ['MAP_SHADER', MAP_SHADER],
    ];
    for (const [name, code] of shaders) {
      expect(reservedIdentifiers(code), `${name} uses reserved WGSL words`).toEqual([]);
    }
  });

  // Second defect, found only by running on a real GPU once the shader
  // compiled (D46): `layout: 'auto'` derives the bind group layout from
  // the bindings a shader actually *uses*, so a declared-but-unread
  // buffer is absent from the layout and binding it fails validation.
  // These two checks make the shader/bind-group contract static.
  it('declare exactly the bindings the dispatch binds', () => {
    for (const metric of ['lab', 'rgb'] as const) {
      const declared = [...lutBuildShader(metric).matchAll(/@binding\((\d+)\)/g)]
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
      const bound = [
        LUT_BINDINGS.palette[metric],
        LUT_BINDINGS.lut,
        LUT_BINDINGS.count,
      ].sort((a, b) => a - b);
      expect(declared, `lutBuildShader(${metric})`).toEqual(bound);
    }
  });

  it('reference every buffer they declare', () => {
    const sources = [
      lutBuildShader('lab'),
      lutBuildShader('rgb'),
      MAP_SHADER,
    ];
    for (const code of sources) {
      for (const [, name] of code.matchAll(/@binding\(\d+\)\s+var<[^>]*>\s*(\w+)/g)) {
        const uses = code.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0;
        expect(uses, `${name} is declared but never read`).toBeGreaterThan(1);
      }
    }
  });

  it('the scans actually catch both shipped defects', () => {
    expect(reservedIdentifiers('let target = vec3f(r, g, b);')).toEqual(['target']);
    // The unused-binding shape that failed validation: declared, never read.
    const stale = `
@group(0) @binding(0) var<storage, read> pal_rgb: array<f32>;
@group(0) @binding(1) var<storage, read> pal_lab: array<f32>;
fn f() { let x = pal_lab[0]; }`;
    const unused = [...stale.matchAll(/@binding\(\d+\)\s+var<[^>]*>\s*(\w+)/g)]
      .map(([, name]) => name)
      .filter((name) => (stale.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0) <= 1);
    expect(unused).toEqual(['pal_rgb']);
    // Prose in comments must not trip it ("as", "of", "use" are reserved).
    expect(reservedIdentifiers('// same constants as convert.ts, use of it\nlet ok = 1;')).toEqual(
      [],
    );
  });
});

describe('f32 mirror tolerance vs the f64 TS LUT', () => {
  it('4-colour palette, every bin, both metrics', () => {
    for (const metric of ['rgb', 'lab'] as const) {
      const { palRgb, palLab } = mirrorPalette(TEST_PALETTE);
      assertTolerance(
        ALL_BINS,
        (key) => nearestBinF32(key, metric, palRgb, palLab),
        metric,
        TEST_PALETTE,
      );
    }
  });

  it('full DMC palette, 4096 sampled bins, CIELAB', () => {
    const dmc = loadDmcPalette();
    const { palRgb, palLab } = mirrorPalette(dmc);
    assertTolerance(
      sampledBins(4096, 0xd41),
      (key) => nearestBinF32(key, 'lab', palRgb, palLab),
      'lab',
      dmc,
    );
  });

  it('full DMC palette, 4096 sampled bins, RGB', () => {
    const dmc = loadDmcPalette();
    const { palRgb, palLab } = mirrorPalette(dmc);
    assertTolerance(
      sampledBins(4096, 0x5eed),
      (key) => nearestBinF32(key, 'rgb', palRgb, palLab),
      'rgb',
      dmc,
    );
  });
});

describe.skipIf(!isWebGpuAvailable())('real GPU (needs navigator.gpu)', () => {
  it('GPU LUT stays within the near-tie tolerance (DMC, CIELAB)', async () => {
    const dmc = loadDmcPalette();
    const lut = await buildLutGpu(dmc, 'lab');
    expect(lut).not.toBeNull();
    if (lut === null) return;
    assertTolerance(ALL_BINS, (key) => lut[key] ?? 0, 'lab', dmc);
  });

  it('GPU palette mapping is bit-exact given the same LUT', async () => {
    const dmc = loadDmcPalette();
    const lut = buildLut(dmc, 'lab');
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    let state = 0xbeef;
    for (let i = 0; i < data.length; i++) {
      state = (state * 1664525 + 1013904223) >>> 0;
      data[i] = i % 4 === 3 ? 255 : state >>> 24;
    }
    const input = { width, height, data };
    const gpu = await mapPaletteGpu(input, dmc, lut);
    expect(gpu).not.toBeNull();
    if (gpu === null) return;
    // CPU mapping through the same LUT (the TS reduce LUT path).
    const palRgb = paletteRgb(dmc);
    for (let i = 0; i < data.length; i += 4) {
      const key =
        (((data[i] ?? 0) >> 3) << 10) | (((data[i + 1] ?? 0) >> 3) << 5) | ((data[i + 2] ?? 0) >> 3);
      const idx = (lut[key] ?? 0) * 3;
      expect(gpu.data[i]).toBe(palRgb[idx] ?? 0);
      expect(gpu.data[i + 1]).toBe(palRgb[idx + 1] ?? 0);
      expect(gpu.data[i + 2]).toBe(palRgb[idx + 2] ?? 0);
      expect(gpu.data[i + 3]).toBe(data[i + 3]);
    }
  });
});

describe.runIf(!isWebGpuAvailable())('real GPU (unavailable here)', () => {
  it('skipped GPU suite — runs where navigator.gpu exists (browser)', () => {
    expect(isWebGpuAvailable()).toBe(false);
  });
});
