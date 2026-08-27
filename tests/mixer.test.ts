/**
 * The six-band mixer and the saturation range (ADJUST-02, slice 2b).
 *
 * Two claims carry most of the weight here. The band centres are
 * DERIVED from this project's own `srgbToLab`, not assumed 60° apart —
 * in CIELAB the six sRGB corners are wildly unevenly spaced, and an
 * even-spacing assumption would put the green band's centre in the
 * cyans. And six identity bands must be exactly the identity for
 * every hue, because the adjust hot loop's fast path depends on it:
 * nine shipped presets and every saved profile must render unchanged.
 */

import { describe, expect, it } from 'vitest';

import { srgbToLab } from '../src/core/color/convert.ts';
import {
  BAND_CENTRES,
  BAND_LIMITS,
  BAND_NAMES,
  blendBands,
  fadeBand,
  hueConfidence,
  identityBand,
  identityMixer,
  identityRange,
  LOW_SAT_KNEE,
  mixerHasNoHueShift,
  mixerIsIdentity,
  NOMINAL_CHROMA,
  rangeIsIdentity,
  remapSaturation,
  type MixerBands,
} from '../src/core/color/mixer.ts';

/** The hue angle of an sRGB colour, 0–360, via the project converter. */
function hueOf(r: number, g: number, b: number): number {
  const lab = new Float32Array(3);
  srgbToLab(r, g, b, lab, 0);
  const h = (Math.atan2(lab[2] ?? 0, lab[1] ?? 0) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/** A mixer with one band moved, the rest identity. */
function oneBand(index: number, band: Partial<ReturnType<typeof identityBand>>): MixerBands {
  return identityMixer().map((seed, i) =>
    i === index ? { ...seed, ...band } : seed,
  ) as unknown as MixerBands;
}

describe('band centres', () => {
  it('are the Lab hue angles of the six sRGB corners', () => {
    const corners: [number, number, number][] = [
      [255, 0, 0],
      [255, 255, 0],
      [0, 255, 0],
      [0, 255, 255],
      [0, 0, 255],
      [255, 0, 255],
    ];
    corners.forEach((rgb, i) => {
      expect(BAND_CENTRES[i]).toBeCloseTo(hueOf(...rgb), 4);
    });
  });

  it('are strictly ascending, and there are six of them', () => {
    expect(BAND_CENTRES).toHaveLength(6);
    expect(BAND_NAMES).toHaveLength(6);
    for (let i = 1; i < BAND_CENTRES.length; i++) {
      expect(BAND_CENTRES[i]).toBeGreaterThan(BAND_CENTRES[i - 1] ?? 0);
    }
  });

  it('are NOT evenly spaced — the reason they are derived', () => {
    const gaps = BAND_CENTRES.map((h, i) =>
      i === 0 ? (BAND_CENTRES[0] ?? 0) + 360 - (BAND_CENTRES[5] ?? 0) : h - (BAND_CENTRES[i - 1] ?? 0),
    );
    // If these ever came out near-equal the derivation would be
    // pointless; they do not. Cyan→Blue is ~110°, Blue→Magenta ~22°.
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(60);
  });

  it('puts the nominal chroma at the most chromatic sRGB colour (blue)', () => {
    const lab = new Float32Array(3);
    srgbToLab(0, 0, 255, lab, 0);
    expect(NOMINAL_CHROMA).toBeCloseTo(Math.hypot(lab[1] ?? 0, lab[2] ?? 0), 4);
    expect(NOMINAL_CHROMA).toBeGreaterThan(130);
  });
});

describe('blendBands', () => {
  it('is the identity at every hue when every band is identity', () => {
    const mixer = identityMixer();
    for (let h = 0; h < 360; h += 3) {
      expect(blendBands(mixer, h)).toEqual({ hue: 0, sat: 1, light: 0 });
    }
  });

  it('returns a band exactly at its own centre', () => {
    const mixer = oneBand(2, { sat: 1.8, light: 12, hue: 20 });
    const atGreen = blendBands(mixer, BAND_CENTRES[2] ?? 0);
    expect(atGreen.sat).toBeCloseTo(1.8, 6);
    expect(atGreen.light).toBeCloseTo(12, 6);
    expect(atGreen.hue).toBeCloseTo(20, 6);
  });

  it('leaves the far side of the wheel untouched by one band', () => {
    const mixer = oneBand(0, { sat: 2 }); // Red
    // Cyan is two centres away from Red in both directions.
    expect(blendBands(mixer, BAND_CENTRES[3] ?? 0).sat).toBeCloseTo(1, 6);
  });

  it('weights sum to one — a blend never invents or loses strength', () => {
    // With all six bands set to the same value, any blend of them
    // must return exactly that value, at every hue.
    const mixer = identityMixer().map(() => ({
      hue: 7,
      sat: 1.5,
      light: -3,
    })) as unknown as MixerBands;
    for (let h = 0; h < 360; h += 7) {
      const out = blendBands(mixer, h);
      expect(out.hue).toBeCloseTo(7, 6);
      expect(out.sat).toBeCloseTo(1.5, 6);
      expect(out.light).toBeCloseTo(-3, 6);
    }
  });

  it('is continuous across the 360°/0° wrap', () => {
    const mixer = oneBand(5, { sat: 1.9 }); // Magenta, at ~328°
    const before = blendBands(mixer, 359.999).sat;
    const after = blendBands(mixer, 0.001).sat;
    expect(Math.abs(before - after)).toBeLessThan(1e-3);
  });

  it('varies monotonically between two adjacent centres', () => {
    const mixer = oneBand(0, { sat: 2 }); // Red at 40°
    const from = BAND_CENTRES[0] ?? 0;
    const to = BAND_CENTRES[1] ?? 0;
    let previous = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const value = blendBands(mixer, from + (to - from) * t).sat;
      expect(value).toBeLessThanOrEqual(previous + 1e-9);
      previous = value;
    }
    expect(previous).toBeCloseTo(1, 6);
  });
});

describe('identity predicates', () => {
  it('recognise the untouched mixer and range', () => {
    expect(mixerIsIdentity(identityMixer())).toBe(true);
    expect(mixerIsIdentity(undefined)).toBe(true);
    expect(rangeIsIdentity(identityRange())).toBe(true);
    expect(rangeIsIdentity(undefined)).toBe(true);
  });

  it('notice any one moved control', () => {
    expect(mixerIsIdentity(oneBand(3, { hue: 1 }))).toBe(false);
    expect(mixerIsIdentity(oneBand(3, { sat: 0.99 }))).toBe(false);
    expect(mixerIsIdentity(oneBand(3, { light: -1 }))).toBe(false);
    expect(rangeIsIdentity({ lo: 0.01, hi: 1 })).toBe(false);
    expect(rangeIsIdentity({ lo: 0, hi: 0.99 })).toBe(false);
  });

  it('separate a hue-shifting mixer from one that only scales', () => {
    expect(mixerHasNoHueShift(identityMixer())).toBe(true);
    expect(mixerHasNoHueShift(oneBand(1, { sat: 2, light: 9 }))).toBe(true);
    expect(mixerHasNoHueShift(oneBand(1, { hue: -1 }))).toBe(false);
  });
});

describe('remapSaturation', () => {
  it('is the identity over the full range', () => {
    for (let s = 0; s <= 1.0001; s += 0.05) {
      expect(remapSaturation(s, identityRange())).toBeCloseTo(s, 9);
    }
  });

  it('maps the ends of the nominal scale onto the chosen band', () => {
    const range = { lo: 0.2, hi: 0.8 };
    expect(remapSaturation(1, range)).toBeCloseTo(0.8, 9);
    // The floor is reached asymptotically, not at 0: the roll-off
    // holds near-greys where they are.
    expect(remapSaturation(0.5, range)).toBeCloseTo(0.5, 9);
  });

  it('leaves a fully grey pixel grey however high the floor', () => {
    expect(remapSaturation(0, { lo: 1, hi: 1 })).toBe(0);
  });

  it('rolls the floor in gradually below the knee', () => {
    const range = { lo: 0.5, hi: 1 };
    const justAbove = remapSaturation(LOW_SAT_KNEE * 1.001, range);
    const wellBelow = remapSaturation(LOW_SAT_KNEE * 0.1, range);
    // Well below the knee the lift is a small fraction of what the
    // raw remap would have applied; just above, it is the full remap.
    expect(wellBelow).toBeLessThan(0.1);
    expect(justAbove).toBeGreaterThan(0.5);
  });

  it('never runs backwards as saturation rises', () => {
    for (const range of [{ lo: 0.3, hi: 0.7 }, { lo: 0, hi: 0.4 }, { lo: 0.6, hi: 1 }]) {
      let previous = -Infinity;
      for (let s = 0; s <= 1.0001; s += 0.02) {
        const out = remapSaturation(s, range);
        expect(out).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = out;
      }
    }
  });

  it('compresses towards a single value when the band is a point', () => {
    const flat = { lo: 0.4, hi: 0.4 };
    expect(remapSaturation(1, flat)).toBeCloseTo(0.4, 9);
    expect(remapSaturation(0.5, flat)).toBeCloseTo(0.4, 9);
  });
});

describe('control limits', () => {
  it('are symmetric where the control is a shift, and unit-centred where it scales', () => {
    expect(BAND_LIMITS.hue.min).toBe(-BAND_LIMITS.hue.max);
    expect(BAND_LIMITS.light.min).toBe(-BAND_LIMITS.light.max);
    expect(BAND_LIMITS.sat.min).toBe(0);
    expect(BAND_LIMITS.sat.max).toBeGreaterThan(1);
  });
});


describe('hueConfidence and fadeBand', () => {
  it('is 0 for a neutral, 1 above the knee, and rises in between', () => {
    expect(hueConfidence(0)).toBe(0);
    expect(hueConfidence(LOW_SAT_KNEE)).toBe(1);
    expect(hueConfidence(1)).toBe(1);
    let previous = -1;
    for (let s = 0; s <= LOW_SAT_KNEE; s += LOW_SAT_KNEE / 20) {
      const c = hueConfidence(s);
      expect(c).toBeGreaterThanOrEqual(previous);
      previous = c;
    }
  });

  it('fades a band to exactly the identity at zero confidence', () => {
    const band = { hue: 60, sat: 2, light: 25 };
    expect(fadeBand(band, 0)).toEqual(identityBand());
    expect(fadeBand(band, 1)).toEqual(band);
  });

  it('fades each control towards its own neutral, not towards zero', () => {
    // Saturation's neutral is 1, not 0 — halving the fade must move
    // it halfway to 1, or a half-confident pixel would desaturate.
    const half = fadeBand({ hue: 40, sat: 2, light: 10 }, 0.5);
    expect(half.hue).toBeCloseTo(20, 9);
    expect(half.sat).toBeCloseTo(1.5, 9);
    expect(half.light).toBeCloseTo(5, 9);
  });
});
