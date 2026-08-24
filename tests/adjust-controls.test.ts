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
      curve: [
        { in: 8, out: 0 },
        { in: 50, out: 48 },
        { in: 92, out: 100 },
      ],
      saturation: 1.2,
    };
    expect(asAdjustParams(structuredClone(params))).toEqual(params);
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
