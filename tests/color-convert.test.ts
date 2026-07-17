/**
 * Golden tests for the colour conversions, pinned against published
 * sRGB → Lab (D65/2°) reference values. Tolerance 0.1 per component:
 * the published values are quoted to 2–3 dp and small sRGB-matrix
 * variants differ in the last digit.
 */

import { describe, expect, it } from 'vitest';

import {
  labToSrgb,
  linearChannelToSrgb,
  srgbChannelToLinear,
  srgbToLab,
} from '../src/core/color/convert.ts';

/** Published sRGB → Lab D65 reference points (CIE 1976, 2° observer). */
const REFERENCE: { rgb: [number, number, number]; lab: [number, number, number] }[] = [
  { rgb: [255, 255, 255], lab: [100, 0, 0] },
  { rgb: [0, 0, 0], lab: [0, 0, 0] },
  { rgb: [255, 0, 0], lab: [53.233, 80.109, 67.22] },
  { rgb: [0, 255, 0], lab: [87.737, -86.185, 83.181] },
  { rgb: [0, 0, 255], lab: [32.303, 79.197, -107.864] },
  { rgb: [255, 255, 0], lab: [97.138, -21.556, 94.482] },
  { rgb: [0, 255, 255], lab: [91.117, -48.08, -14.138] },
  { rgb: [255, 0, 255], lab: [60.32, 98.254, -60.843] },
];

const LAB_TOLERANCE = 0.1;

describe('sRGB ↔ Lab conversions', () => {
  it('matches published reference values (tolerance 0.1)', () => {
    const lab = new Float32Array(3);
    for (const { rgb, lab: expected } of REFERENCE) {
      srgbToLab(rgb[0], rgb[1], rgb[2], lab, 0);
      for (let c = 0; c < 3; c++) {
        expect(
          Math.abs((lab[c] ?? NaN) - (expected[c] ?? NaN)),
          `Lab[${String(c)}] of rgb(${rgb.join(',')})`,
        ).toBeLessThanOrEqual(LAB_TOLERANCE);
      }
    }
  });

  it('sRGB → Lab → sRGB round-trips within 1/255 per channel', () => {
    const lab = new Float32Array(3);
    const back = new Uint8ClampedArray(3);
    // Sample the cube corners and a spread of interior colours.
    const samples = [0, 51, 102, 153, 204, 255];
    for (const r of samples) {
      for (const g of samples) {
        for (const b of samples) {
          srgbToLab(r, g, b, lab, 0);
          labToSrgb(lab[0] ?? 0, lab[1] ?? 0, lab[2] ?? 0, back, 0);
          expect(Math.abs((back[0] ?? 0) - r)).toBeLessThanOrEqual(1);
          expect(Math.abs((back[1] ?? 0) - g)).toBeLessThanOrEqual(1);
          expect(Math.abs((back[2] ?? 0) - b)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('transfer curve round-trips and pins its segment boundary', () => {
    for (let v = 0; v <= 255; v++) {
      expect(
        Math.abs(linearChannelToSrgb(srgbChannelToLinear(v)) - v),
      ).toBeLessThanOrEqual(1e-6);
    }
    // Below the 0.04045 knee the curve is linear: c/12.92.
    expect(srgbChannelToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 10);
  });

  it('grayscale L* is monotonic with input level', () => {
    const lab = new Float32Array(3);
    let prev = -1;
    for (let v = 0; v <= 255; v++) {
      srgbToLab(v, v, v, lab, 0);
      expect(lab[0] ?? NaN).toBeGreaterThan(prev);
      // Neutral input stays neutral: a* and b* ≈ 0.
      expect(Math.abs(lab[1] ?? NaN)).toBeLessThan(0.01);
      expect(Math.abs(lab[2] ?? NaN)).toBeLessThan(0.01);
      prev = lab[0] ?? NaN;
    }
  });
});
