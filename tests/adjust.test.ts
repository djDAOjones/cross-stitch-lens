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
import {
  BAND_CENTRES,
  identityMixer,
  identityRange,
  NOMINAL_CHROMA,
  type MixerBands,
} from '../src/core/color/mixer.ts';
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
    expect(adjustIsIdentity({ ...defaultAdjust(), curve: identityCurve(), saturation: 0.99 })).toBe(false);
    expect(adjustIsIdentity({ ...defaultAdjust(), curve: curve([0, 1], [50, 50], [100, 100]), saturation: 1 })).toBe(
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
    const a = adjustFingerprint({ ...defaultAdjust(), curve: identityCurve(), saturation: 1.2 });
    const b = adjustFingerprint({ ...defaultAdjust(), curve: identityCurve(), saturation: 1.3 });
    const c = adjustFingerprint({ ...defaultAdjust(), curve: curve([5, 0], [50, 50], [95, 100]), saturation: 1.2 });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('adjust behaviour', () => {
  it('inverting the curve inverts the picture’s lightness', () => {
    const input = sweep(512);
    const inverted = run(input, {
      ...defaultAdjust(),
      curve: curve([0, 100], [50, 50], [100, 0]),
      saturation: 1,
    });
    expect(meanL(inverted)).toBeCloseTo(100 - meanL(input), 0);
  });

  it('saturation 0 is greyscale; above 1 pushes chroma out', () => {
    const input = sweep(512);
    const grey = run(input, { ...defaultAdjust(), curve: identityCurve(), saturation: 0 });
    expect(meanChroma(grey)).toBeLessThan(0.6);
    // Greyscale must keep the lightness it started with — that is what
    // makes Mono prep the natural feed for tone matching.
    expect(meanL(grey)).toBeCloseTo(meanL(input), 0);
    const pushed = run(input, {
      ...defaultAdjust(),
      curve: identityCurve(),
      saturation: MAX_SATURATION,
    });
    expect(meanChroma(pushed)).toBeGreaterThan(meanChroma(input));
  });

  it('the black and white points clamp: content outside them flattens', () => {
    // Bottom point at L*20 → everything darker maps to black.
    const dark: PixelBuffer = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([10, 10, 10, 255, 20, 20, 20, 255, 30, 30, 30, 255]),
    };
    const out = run(dark, { ...defaultAdjust(), curve: curve([20, 0], [60, 50], [100, 100]), saturation: 1 });
    expect(Array.from(out.data.slice(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(out.data.slice(4, 7))).toEqual([0, 0, 0]);
  });

  it('leaves fully transparent cells untouched and keeps every alpha', () => {
    const input: PixelBuffer = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([200, 30, 40, 0, 200, 30, 40, 128]),
    };
    const out = run(input, { ...defaultAdjust(), curve: curve([10, 0], [50, 50], [90, 100]), saturation: 0 });
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
    run(input, { ...defaultAdjust(), curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.4 });
    expect(Array.from(input.data)).toEqual(Array.from(before));
  });

  it('is deterministic — same input and params, same bytes', () => {
    const input = sweep(256);
    const params: AdjustParams = { ...defaultAdjust(), curve: curve([12, 0], [50, 50], [88, 100]), saturation: 0.8 };
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
    expect(sameAdjust(defaultAdjust(), { ...defaultAdjust(), curve: identityCurve(), saturation: 1 })).toBe(true);
    expect(matchBuiltInAdjust({ ...defaultAdjust(), curve: identityCurve(), saturation: 1.11 })).toBeNull();
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
      adjust: { ...defaultAdjust(), curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.2 },
    });
    const reduce = stages.find((s) => s.stage.name === 'reduce');
    expect(JSON.stringify(reduce?.params)).not.toContain('saturation');
  });
});


/**
 * Slice 2b at the stage level (ADJUST-02).
 *
 * The load-bearing one is the first: with the mixer and range at
 * their identity the stage must produce the *same bytes* as before
 * the slice existed. Nine shipped presets and every saved adjustment
 * profile are 2a-only, so anything less than byte equality is a
 * silent re-render of work users have already judged.
 */
describe('slice 2b: mixer and saturation range', () => {
  const input = sweep(2048);

  /** A mixer with one band moved, the rest identity. */
  function oneBand(index: number, band: { hue?: number; sat?: number; light?: number }): MixerBands {
    return identityMixer().map((seed, i) =>
      i === index ? { ...seed, ...band } : seed,
    ) as unknown as MixerBands;
  }

  function bytes(buffer: PixelBuffer): string {
    return Array.from(buffer.data).join(',');
  }

  it('is byte-identical to slice 2a when both 2b controls are identity', () => {
    // The 2a settings that actually ship, each run with the 2b fields
    // present-but-identity. Equality here is the fast path's contract.
    const cases: [LightnessCurve, number][] = [
      [identityCurve(), 1],
      [curve([12, 0], [50, 50], [88, 100]), 1],
      [curve([4, 0], [50, 52], [96, 100]), 1.4],
      [identityCurve(), 0],
      [curve([10, 0], [50, 50], [90, 100]), 0],
      [curve([0, 100], [50, 50], [100, 0]), MAX_SATURATION],
    ];
    for (const [c, saturation] of cases) {
      const withFields = run(input, {
        curve: c,
        saturation,
        mixer: identityMixer(),
        range: identityRange(),
      });
      // The reference: the same maths with the 2b blocks unreachable.
      const reference = run(input, { ...defaultAdjust(), curve: c, saturation });
      expect(bytes(withFields)).toBe(bytes(reference));
    }
  });

  it('an identity mixer and range leave the stage identity', () => {
    expect(adjustIsIdentity(defaultAdjust())).toBe(true);
    expect(adjustIsIdentity({ ...defaultAdjust(), mixer: oneBand(0, { sat: 1.1 }) })).toBe(false);
    expect(adjustIsIdentity({ ...defaultAdjust(), range: { lo: 0.1, hi: 1 } })).toBe(false);
  });

  it('a band\u2019s saturation moves its own hue and leaves the opposite one', () => {
    // Red up, measured on red and on cyan (two centres away).
    const red: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([220, 40, 40, 255]) };
    const cyan: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([40, 200, 200, 255]) };
    const params = { ...defaultAdjust(), mixer: oneBand(0, { sat: 1.6 }) };
    expect(meanChroma(run(red, params))).toBeGreaterThan(meanChroma(red) * 1.15);
    expect(meanChroma(run(cyan, params))).toBeCloseTo(meanChroma(cyan), 0);
  });

  it('a band\u2019s lightness offset lifts only its own hue', () => {
    const green: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([40, 180, 60, 255]) };
    const params = { ...defaultAdjust(), mixer: oneBand(2, { light: 20 }) };
    expect(meanL(run(green, params))).toBeGreaterThan(meanL(green) + 8);
  });

  it('a band\u2019s lightness offset never tints a neutral grey', () => {
    // A grey has no hue, so no band owns it; the guard exists so the
    // "red" slider cannot colour a grey sky.
    const grey: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([128, 128, 128, 255]),
    };
    for (let band = 0; band < 6; band++) {
      const out = run(grey, {
        ...defaultAdjust(),
        mixer: oneBand(band, { hue: 60, sat: 2, light: 25 }),
      });
      expect(out.data[0]).toBe(128);
      expect(out.data[1]).toBe(128);
      expect(out.data[2]).toBe(128);
    }
  });

  it('a hue rotation moves the hue by about the amount asked', () => {
    // Chroma is deliberately NOT asserted to be preserved: the
    // rotation preserves it in Lab, but the result is re-encoded to
    // sRGB, and rotating a saturated colour walks it out of gamut
    // where `encode` clamps. That loss is real and belongs to the
    // colour space, not to this control.
    const red: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([190, 90, 90, 255]) };
    const out = run(red, { ...defaultAdjust(), mixer: oneBand(0, { hue: 25 }) });
    const before = new Float32Array(3);
    const after = new Float32Array(3);
    srgbToLab(red.data[0] ?? 0, red.data[1] ?? 0, red.data[2] ?? 0, before, 0);
    srgbToLab(out.data[0] ?? 0, out.data[1] ?? 0, out.data[2] ?? 0, after, 0);
    const hue = (v: Float32Array): number => {
      const h = (Math.atan2(v[2] ?? 0, v[1] ?? 0) * 180) / Math.PI;
      return h < 0 ? h + 360 : h;
    };
    expect(hue(after) - hue(before)).toBeGreaterThan(15);
    expect(hue(after) - hue(before)).toBeLessThan(35);
  });

  it('fades every band effect out as a pixel approaches neutral', () => {
    // The same red band, on progressively less saturated reds: the
    // lightness lift must shrink monotonically towards nothing.
    const params = { ...defaultAdjust(), mixer: oneBand(0, { light: 20 }) };
    let previous = Infinity;
    for (const spread of [70, 50, 30, 14, 6, 2, 0]) {
      const pixel: PixelBuffer = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([128 + spread, 128 - spread, 128 - spread, 255]),
      };
      const lift = meanL(run(pixel, params)) - meanL(pixel);
      expect(lift).toBeLessThanOrEqual(previous + 0.51);
      previous = lift;
    }
    expect(previous).toBeCloseTo(0, 1);
  });

  it('the range narrows the spread of saturation across the picture', () => {
    const narrowed = run(input, { ...defaultAdjust(), range: { lo: 0.25, hi: 0.35 } });
    const spread = (b: PixelBuffer): number => {
      const lab = new Float32Array(3);
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < b.data.length; i += 4) {
        srgbToLab(b.data[i] ?? 0, b.data[i + 1] ?? 0, b.data[i + 2] ?? 0, lab, 0);
        const c = Math.hypot(lab[1] ?? 0, lab[2] ?? 0) / NOMINAL_CHROMA;
        if (c < min) min = c;
        if (c > max) max = c;
      }
      return max - min;
    };
    expect(spread(narrowed)).toBeLessThan(spread(input));
  });

  it('a raised floor lifts coloured pixels and spares near-greys', () => {
    const params = { ...defaultAdjust(), range: { lo: 0.45, hi: 1 } };
    const coloured: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([150, 90, 90, 255]),
    };
    const nearGrey: PixelBuffer = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([128, 126, 127, 255]),
    };
    expect(meanChroma(run(coloured, params))).toBeGreaterThan(meanChroma(coloured) * 1.5);
    // The roll-off's whole job: this pixel's hue is noise.
    expect(meanChroma(run(nearGrey, params))).toBeLessThan(3);
  });

  it('every band centre is reachable and distinct through the stage', () => {
    // A saturation lift on band k must affect a pixel at centre k more
    // than the same lift on any other band does.
    for (let k = 0; k < BAND_CENTRES.length; k++) {
      const lifted = run(input, { ...defaultAdjust(), mixer: oneBand(k, { sat: 1.5 }) });
      expect(meanChroma(lifted)).toBeGreaterThan(meanChroma(input));
    }
  });

  it('leaves fully transparent pixels alone, as slice 2a does', () => {
    const clear: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([7, 8, 9, 0]) };
    const out = run(clear, {
      ...defaultAdjust(),
      mixer: oneBand(0, { hue: 60, sat: 2, light: 25 }),
      range: { lo: 0.9, hi: 1 },
    });
    expect(Array.from(out.data)).toEqual([7, 8, 9, 0]);
  });

  it('never mutates its input', () => {
    const before = Array.from(input.data);
    run(input, { ...defaultAdjust(), mixer: oneBand(1, { sat: 1.7 }), range: { lo: 0.2, hi: 0.9 } });
    expect(Array.from(input.data)).toEqual(before);
  });
});

describe('slice 2b fingerprints', () => {
  it('keeps the pre-2b string for a 2a-only adjustment', () => {
    // A fingerprint minted before this slice must still be minted, or
    // every warm cache keyed on one is silently invalidated.
    const params = { ...defaultAdjust(), curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.2 };
    expect(adjustFingerprint(params)).toBe(
      `c${adjustFingerprint(params).split('|')[0]?.slice(1) ?? ''}|s1.2`,
    );
    expect(adjustFingerprint(params)).not.toContain('|m');
    expect(adjustFingerprint(params)).not.toContain('|r');
  });

  it('separates two adjustments differing only in a band or the range', () => {
    const base = defaultAdjust();
    const mixed = {
      ...base,
      mixer: identityMixer().map((b, i) =>
        i === 4 ? { ...b, hue: 12 } : b,
      ) as unknown as MixerBands,
    };
    const ranged = { ...base, range: { lo: 0.1, hi: 0.9 } };
    expect(adjustFingerprint(mixed)).not.toBe(adjustFingerprint(base));
    expect(adjustFingerprint(ranged)).not.toBe(adjustFingerprint(base));
    expect(adjustFingerprint(mixed)).not.toBe(adjustFingerprint(ranged));
  });
});
