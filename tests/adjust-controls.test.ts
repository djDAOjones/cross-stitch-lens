/**
 * The adjustment kind's pure halves (ADJUST-01): the stored-payload
 * guard, the saturation percentage conversion, and the shared curve
 * primitive's identity across its two owners. DOM conduct is verified
 * in the running app per the house convention.
 */

import { describe, expect, it } from 'vitest';

import {
  applyCurve as curveApply,
  identityCurve as curveIdentity,
  isIdentityCurve as curveIsIdentity,
} from '../src/core/color/curve.ts';
import { applyCurve, identityCurve, isIdentityCurve } from '../src/core/color/tone.ts';
import { MAX_SATURATION, defaultAdjust } from '../src/core/pipeline/adjust.ts';
import { BAND_LIMITS, identityMixer, identityRange } from '../src/core/color/mixer.ts';
import {
  asAdjustParams,
  percentToSaturation,
  saturationToPercent,
} from '../src/ui/profile-editor-adjust.ts';
import { nudgeCurvePoint } from '../src/ui/curve-control.ts';

describe('asAdjustParams (stored payloads are untrusted)', () => {
  it('falls back to the identity for anything unreadable (error)', () => {
    expect(asAdjustParams(null)).toEqual(defaultAdjust());
    expect(asAdjustParams('nope')).toEqual(defaultAdjust());
    expect(asAdjustParams({})).toEqual(defaultAdjust());
    expect(asAdjustParams({ curve: 'bent', saturation: 'lots' })).toEqual(defaultAdjust());
  });

  it('keeps the readable half of a partial payload (empty/partial)', () => {
    const partial = asAdjustParams({ saturation: 0.5 });
    expect(partial.saturation).toBe(0.5);
    expect(isIdentityCurve(partial.curve)).toBe(true);

    const oneEnd = asAdjustParams({ curve: [{ in: 10, out: 0 }] });
    expect(oneEnd.curve[0]).toEqual({ in: 10, out: 0 });
    expect(oneEnd.curve[2]).toEqual({ in: 100, out: 100 });
  });

  it('clamps values into range and straightens crossed inputs (boundary)', () => {
    const wild = asAdjustParams({
      curve: [
        { in: -40, out: 400 },
        { in: 5, out: 50 },
        { in: 2, out: 100 },
      ],
      saturation: 99,
    });
    expect(wild.curve[0]).toEqual({ in: 0, out: 100 });
    // The mid and top inputs may not fall below the point before them.
    expect(wild.curve[1].in).toBeGreaterThanOrEqual(wild.curve[0].in);
    expect(wild.curve[2].in).toBeGreaterThanOrEqual(wild.curve[1].in);
    expect(wild.saturation).toBe(MAX_SATURATION);
    expect(asAdjustParams({ saturation: -3 }).saturation).toBe(0);
  });

  it('round-trips a well-formed payload unchanged (happy path)', () => {
    const params = {
      ...defaultAdjust(),
      curve: [
        { in: 8, out: 0 },
        { in: 50, out: 48 },
        { in: 92, out: 100 },
      ],
      saturation: 1.2,
    };
    expect(asAdjustParams(structuredClone(params))).toEqual(params);
  });

  it('round-trips the slice-2b halves too (schema v14)', () => {
    const params = {
      ...defaultAdjust(),
      mixer: [
        { hue: -20, sat: 1.4, light: 6 },
        { hue: 0, sat: 1, light: 0 },
        { hue: 15, sat: 0.5, light: -10 },
        { hue: 0, sat: 1, light: 0 },
        { hue: 0, sat: 1, light: 0 },
        { hue: 60, sat: 2, light: 25 },
      ],
      range: { lo: 0.2, hi: 0.9 },
    };
    expect(asAdjustParams(structuredClone(params))).toEqual(params);
  });

  it('fills a short or absent mixer from the identity, by position', () => {
    // Position IS the band, so a two-entry array must become bands 1
    // and 2 plus four identities — never shifted or spread.
    const short = asAdjustParams({ mixer: [{ hue: 10, sat: 1, light: 0 }] });
    expect(short.mixer).toHaveLength(6);
    expect(short.mixer[0]).toEqual({ hue: 10, sat: 1, light: 0 });
    expect(short.mixer.slice(1)).toEqual(identityMixer().slice(1));
    expect(asAdjustParams({}).mixer).toEqual(identityMixer());
  });

  it('clamps wild band values and straightens a crossed range', () => {
    const wild = asAdjustParams({
      mixer: [{ hue: 999, sat: -5, light: 900 }],
      range: { lo: 0.8, hi: 0.2 },
    });
    expect(wild.mixer[0]).toEqual({
      hue: BAND_LIMITS.hue.max,
      sat: BAND_LIMITS.sat.min,
      light: BAND_LIMITS.light.max,
    });
    // The editor straightens where the schema refuses: a library
    // record must always render.
    expect(wild.range).toEqual({ lo: 0.2, hi: 0.8 });
    expect(asAdjustParams({ range: 'nonsense' }).range).toEqual(identityRange());
  });
});

describe('saturation as a percentage', () => {
  it('shows 100 % for untouched and round-trips the slider steps', () => {
    expect(saturationToPercent(1)).toBe(100);
    expect(saturationToPercent(0)).toBe(0);
    expect(saturationToPercent(MAX_SATURATION)).toBe(200);
    for (let percent = 0; percent <= 200; percent += 5) {
      expect(saturationToPercent(percentToSaturation(percent))).toBe(percent);
    }
  });
});

describe('the curve primitive is one implementation, two owners', () => {
  // ADJUST-01's curve and TONE-01's are deliberately not folded, but
  // they must never drift apart in their maths — tone re-exports the
  // shared primitive rather than keeping a copy.
  it('tone re-exports exactly the shared functions', () => {
    expect(applyCurve).toBe(curveApply);
    expect(identityCurve).toBe(curveIdentity);
    expect(isIdentityCurve).toBe(curveIsIdentity);
  });

  it('nudges stay inside the axes and keep inputs ordered', () => {
    const bent = nudgeCurvePoint(curveIdentity(), 1, 200, 200);
    expect(bent[1].in).toBeLessThanOrEqual(bent[2].in);
    expect(bent[1].out).toBe(100);
    const under = nudgeCurvePoint(curveIdentity(), 0, -50, -50);
    expect(under[0]).toEqual({ in: 0, out: 0 });
  });
});
