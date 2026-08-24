/**
 * The adjust stage (ADJUST-01, CREATIVE-01 slice 2a): the identity
 * contract, the curve and saturation behaviours, alpha conduct,
 * purity, the documented accuracy tolerance of the tabled hot loop,
 * and the two invariants the slice must not break — the LUT
 * fingerprint is untouched by an adjustment, and the presets match
 * structurally.
 */

import { describe, expect, it } from 'vitest';

import { labToSrgb, srgbToLab } from '../src/core/color/convert.ts';
import { applyCurve, identityCurve, type LightnessCurve } from '../src/core/color/curve.ts';
import { buildStages } from '../src/core/pipeline/config.ts';
import {
  adjustFingerprint,
  adjustIsIdentity,
  adjustStage,
  applyAdjust,
  defaultAdjust,
  MAX_SATURATION,
  type AdjustParams,
} from '../src/core/pipeline/adjust.ts';
import {
  ADJUST_PRESETS,
  matchBuiltInAdjust,
  sameAdjust,
} from '../src/core/pipeline/adjust-presets.ts';
import type { Palette, PixelBuffer } from '../src/core/types.ts';
import { thread } from './helpers/threads.ts';

const run = adjustStage.backends.ts;

function curve(
  bottom: [number, number],
  mid: [number, number],
  top: [number, number],
): LightnessCurve {
  return [
    { in: bottom[0], out: bottom[1] },
    { in: mid[0], out: mid[1] },
    { in: top[0], out: top[1] },
  ];
}

/** A deterministic RGBA buffer covering the cube plus the extremes. */
function sweep(count = 4096): PixelBuffer {
  const data = new Uint8ClampedArray(count * 4);
  let seed = 987654321;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i * 4] = seed & 255;
    data[i * 4 + 1] = (seed >>> 8) & 255;
    data[i * 4 + 2] = (seed >>> 16) & 255;
    data[i * 4 + 3] = 255;
  }
  // Pin the corners: black, white and the three primaries.
  const corners = [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ];
  corners.forEach((rgb, k) => {
    data[k * 4] = rgb[0] ?? 0;
    data[k * 4 + 1] = rgb[1] ?? 0;
    data[k * 4 + 2] = rgb[2] ?? 0;
    data[k * 4 + 3] = 255;
  });
  return { width: count, height: 1, data };
}

/** The exact reference: the production converts, one pixel at a time. */
function referenceAdjust(input: PixelBuffer, params: AdjustParams): PixelBuffer {
  const out = new Uint8ClampedArray(input.data.length);
  const lab = new Float32Array(3);
  for (let i = 0; i < input.data.length; i += 4) {
    const alpha = input.data[i + 3] ?? 0;
    out[i + 3] = alpha;
    if (alpha === 0) continue;
    srgbToLab(input.data[i] ?? 0, input.data[i + 1] ?? 0, input.data[i + 2] ?? 0, lab, 0);
    labToSrgb(
      applyCurve(params.curve, lab[0] ?? 0),
      (lab[1] ?? 0) * params.saturation,
      (lab[2] ?? 0) * params.saturation,
      out,
      i,
    );
  }
  return { width: input.width, height: input.height, data: out };
}

/** Mean Lab lightness of the opaque cells. */
function meanL(buffer: PixelBuffer): number {
  const lab = new Float32Array(3);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < buffer.data.length; i += 4) {
    if ((buffer.data[i + 3] ?? 0) === 0) continue;
    srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, lab, 0);
    sum += lab[0] ?? 0;
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** Mean Lab chroma of the opaque cells. */
function meanChroma(buffer: PixelBuffer): number {
  const lab = new Float32Array(3);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < buffer.data.length; i += 4) {
    if ((buffer.data[i + 3] ?? 0) === 0) continue;
    srgbToLab(buffer.data[i] ?? 0, buffer.data[i + 1] ?? 0, buffer.data[i + 2] ?? 0, lab, 0);
    sum += Math.hypot(lab[1] ?? 0, lab[2] ?? 0);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

describe('adjust identity', () => {
  it('is the identity at the default, and not once either half moves', () => {
    expect(adjustIsIdentity(undefined)).toBe(true);
    expect(adjustIsIdentity(defaultAdjust())).toBe(true);
    expect(adjustIsIdentity({ curve: identityCurve(), saturation: 0.99 })).toBe(false);
    expect(adjustIsIdentity({ curve: curve([0, 1], [50, 50], [100, 100]), saturation: 1 })).toBe(
      false,
    );
  });

  it('returns an untouched copy at the default — never an alias', () => {
    const input = sweep(64);
    const before = Uint8ClampedArray.from(input.data);
    const out = run(input, defaultAdjust());
    expect(out.data).not.toBe(input.data);
    expect(out.data.buffer).not.toBe(input.data.buffer);
    expect(Array.from(out.data)).toEqual(Array.from(before));
  });

  it('fingerprints the identity as off, and distinguishes everything else', () => {
    expect(adjustFingerprint(undefined)).toBe('off');
    expect(adjustFingerprint(defaultAdjust())).toBe('off');
    const a = adjustFingerprint({ curve: identityCurve(), saturation: 1.2 });
    const b = adjustFingerprint({ curve: identityCurve(), saturation: 1.3 });
    const c = adjustFingerprint({ curve: curve([5, 0], [50, 50], [95, 100]), saturation: 1.2 });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('adjust behaviour', () => {
  it('inverting the curve inverts the picture’s lightness', () => {
    const input = sweep(512);
    const inverted = run(input, {
      curve: curve([0, 100], [50, 50], [100, 0]),
      saturation: 1,
    });
    expect(meanL(inverted)).toBeCloseTo(100 - meanL(input), 0);
  });

  it('saturation 0 is greyscale; above 1 pushes chroma out', () => {
    const input = sweep(512);
    const grey = run(input, { curve: identityCurve(), saturation: 0 });
    expect(meanChroma(grey)).toBeLessThan(0.6);
    // Greyscale must keep the lightness it started with — that is what
    // makes Mono prep the natural feed for tone matching.
    expect(meanL(grey)).toBeCloseTo(meanL(input), 0);
    const pushed = run(input, { curve: identityCurve(), saturation: MAX_SATURATION });
    expect(meanChroma(pushed)).toBeGreaterThan(meanChroma(input));
  });

  it('the black and white points clamp: content outside them flattens', () => {
    // Bottom point at L*20 → everything darker maps to black.
    const dark: PixelBuffer = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([10, 10, 10, 255, 20, 20, 20, 255, 30, 30, 30, 255]),
    };
    const out = run(dark, { curve: curve([20, 0], [60, 50], [100, 100]), saturation: 1 });
    expect(Array.from(out.data.slice(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(out.data.slice(4, 7))).toEqual([0, 0, 0]);
  });

  it('leaves fully transparent cells untouched and keeps every alpha', () => {
    const input: PixelBuffer = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([200, 30, 40, 0, 200, 30, 40, 128]),
    };
    const out = run(input, { curve: curve([10, 0], [50, 50], [90, 100]), saturation: 0 });
    // The transparent cell keeps its bytes *and* its alpha: giving a
    // phantom colour a curved lightness is what D9/D49 forbids.
    expect(Array.from(out.data.slice(0, 4))).toEqual([200, 30, 40, 0]);
    expect(out.data[7]).toBe(128);
    // The semi-transparent one is a real colour and is adjusted.
    expect(out.data[4]).not.toBe(200);
  });

  it('never mutates its input (purity)', () => {
    const input = sweep(128);
    const before = Uint8ClampedArray.from(input.data);
    run(input, { curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.4 });
    expect(Array.from(input.data)).toEqual(Array.from(before));
  });

  it('is deterministic — same input and params, same bytes', () => {
    const input = sweep(256);
    const params: AdjustParams = { curve: curve([12, 0], [50, 50], [88, 100]), saturation: 0.8 };
    expect(Array.from(run(input, params).data)).toEqual(Array.from(run(input, params).data));
  });
});

describe('adjust accuracy (the documented tolerance)', () => {
  // The hot loop tables the two transcendental steps to hold the
  // ≥ 4 updates/s promise at source resolution (D135) — ~183 ms/MP
  // exact against ~55 ms/MP tabled. The price is bounded here, in the
  // conventions.md sense of a documented per-test tolerance.
  it('is within 1 sRGB level per channel of the exact converts', () => {
    const input = sweep(8192);
    for (const preset of ADJUST_PRESETS) {
      const mine = run(input, preset.params);
      const exact = referenceAdjust(input, preset.params);
      let worst = 0;
      for (let i = 0; i < mine.data.length; i++) {
        worst = Math.max(worst, Math.abs((mine.data[i] ?? 0) - (exact.data[i] ?? 0)));
      }
      expect(worst, `preset ${preset.id}`).toBeLessThanOrEqual(1);
    }
  });

  it('is exact for the identity — the no-op costs no precision', () => {
    const input = sweep(1024);
    expect(Array.from(applyAdjust(input, defaultAdjust()).data)).toEqual(Array.from(input.data));
  });
});

describe('adjust presets', () => {
  it('ships None plus eight candidates, ids unique and stable', () => {
    expect(ADJUST_PRESETS).toHaveLength(9);
    expect(new Set(ADJUST_PRESETS.map((p) => p.id)).size).toBe(9);
    expect(ADJUST_PRESETS[0]?.id).toBe('none');
    expect(adjustIsIdentity(ADJUST_PRESETS[0]?.params)).toBe(true);
    for (const preset of ADJUST_PRESETS) {
      expect(preset.basis.length).toBeGreaterThan(0);
      expect(preset.params.saturation).toBeLessThanOrEqual(MAX_SATURATION);
      const [lo, mid, hi] = preset.params.curve;
      expect(lo.in).toBeLessThanOrEqual(mid.in);
      expect(mid.in).toBeLessThanOrEqual(hi.in);
    }
  });

  it('matches structurally, and reports null for anything unnamed', () => {
    for (const preset of ADJUST_PRESETS) {
      expect(matchBuiltInAdjust(structuredClone(preset.params))).toBe(`builtin:${preset.id}`);
    }
    expect(sameAdjust(defaultAdjust(), { curve: identityCurve(), saturation: 1 })).toBe(true);
    expect(matchBuiltInAdjust({ curve: identityCurve(), saturation: 1.11 })).toBeNull();
  });

  it('every non-None candidate actually changes the picture', () => {
    const input = sweep(512);
    for (const preset of ADJUST_PRESETS.slice(1)) {
      const out = run(input, preset.params);
      expect(Array.from(out.data), preset.id).not.toEqual(Array.from(input.data));
    }
  });
});

describe('the LUT fingerprint is untouched by an adjustment (D46)', () => {
  // The slice's stated done-when: adjustments change what the
  // quantiser sees, never which threads it may choose — so nothing
  // about them may reach the LUT's identity. This asserts it at the
  // seam the worker actually uses: the injected provider.
  const PALETTE: Palette = {
    name: 'test-bw',
    entries: [thread('K', 'black', [0, 0, 0]), thread('W', 'white', [255, 255, 255])],
  };

  function lutCallsFor(adjust?: AdjustParams): unknown[][] {
    const calls: unknown[][] = [];
    buildStages(
      {
        preset: 'resize-first',
        grid: { width: 8, height: 8 },
        resizeMode: 'stretch',
        palette: PALETTE,
        metric: 'lab',
        dither: { algorithm: 'none' },
        ...(adjust === undefined ? {} : { adjust }),
      },
      {
        lut: (palette, metric, tone) => {
          calls.push([palette.name, metric, tone]);
          return new Uint16Array(32768);
        },
      },
    );
    return calls;
  }

  it('asks the LUT provider for exactly the same key with and without one', () => {
    const plain = lutCallsFor();
    for (const preset of ADJUST_PRESETS) {
      expect(lutCallsFor(preset.params), preset.id).toEqual(plain);
    }
  });

  it('keeps the adjustment out of the reduce stage params entirely', () => {
    const stages = buildStages({
      preset: 'resize-first',
      grid: { width: 8, height: 8 },
      resizeMode: 'stretch',
      palette: PALETTE,
      metric: 'lab',
      dither: { algorithm: 'none' },
      adjust: { curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.2 },
    });
    const reduce = stages.find((s) => s.stage.name === 'reduce');
    expect(JSON.stringify(reduce?.params)).not.toContain('saturation');
  });
});
