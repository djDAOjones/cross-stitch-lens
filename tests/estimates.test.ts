/**
 * Fabric sizing and thread estimation (M12): hand-calculated cases,
 * the per-colour skein round-up invariant (colours cannot share a
 * skein), and the disclosure sentence carrying every assumption.
 */

import { describe, expect, it } from 'vitest';
import {
  centreStitch,
  DEFAULT_ESTIMATES,
  estimateAssumptions,
  physicalSize,
  threadEstimate,
  totalEstimate,
  type EstimateSettings,
} from '../src/core/estimates.ts';

describe('physicalSize', () => {
  it('converts stitches to inches and centimetres at the fabric count', () => {
    const size = physicalSize(200, 140, { fabricCount: 14, marginCm: 5 });
    expect(size.widthIn).toBeCloseTo(14.2857, 3);
    expect(size.heightIn).toBeCloseTo(10, 6);
    expect(size.widthCm).toBeCloseTo(36.2857, 3);
    expect(size.heightCm).toBeCloseTo(25.4, 6);
  });

  it('adds the finishing margin on every side of the cut', () => {
    const size = physicalSize(140, 140, { fabricCount: 14, marginCm: 5 });
    expect(size.cutWidthCm).toBeCloseTo(25.4 + 10, 6);
    expect(size.cutHeightCm).toBeCloseTo(35.4, 6);
  });

  it('a higher count makes the same design physically smaller', () => {
    const at14 = physicalSize(200, 200, { fabricCount: 14, marginCm: 0 });
    const at18 = physicalSize(200, 200, { fabricCount: 18, marginCm: 0 });
    expect(at18.widthCm).toBeLessThan(at14.widthCm);
  });
});

describe('centreStitch', () => {
  it('names the centre stitch, 1-based, toward the origin when even', () => {
    expect(centreStitch(200, 200)).toEqual({ x: 100, y: 100 });
    expect(centreStitch(5, 3)).toEqual({ x: 3, y: 2 });
    expect(centreStitch(1, 1)).toEqual({ x: 1, y: 1 });
  });
});

describe('threadEstimate', () => {
  it('matches the hand-calculated default model for 100 stitches', () => {
    // pitch 2.54/14 cm; front 2√2·pitch; ×1.2 routing; ×1.1 waste;
    // two of six strands purchased.
    const one = threadEstimate(100, DEFAULT_ESTIMATES);
    expect(one.metres).toBeCloseTo(0.22579, 4);
    expect(one.skeins).toBe(1);
  });

  it('is zero for zero stitches — an unused colour buys nothing', () => {
    expect(threadEstimate(0, DEFAULT_ESTIMATES)).toEqual({ metres: 0, skeins: 0 });
  });

  it('any stitched colour needs at least one skein', () => {
    expect(threadEstimate(1, DEFAULT_ESTIMATES).skeins).toBe(1);
  });

  it('rounds skeins up at the boundary', () => {
    // Bare model (no routing/waste, all six strands) on 2.54-count:
    // pitch 1 cm, front 2√2 cm per stitch → 100 stitches ≈ 2.828 m.
    const bare: EstimateSettings = {
      fabricCount: 2.54,
      marginCm: 0,
      strands: 6,
      routingFactor: 1,
      wasteShare: 0,
      skeinMetres: 2.9,
    };
    expect(threadEstimate(100, bare).skeins).toBe(1);
    expect(threadEstimate(100, { ...bare, skeinMetres: 2.7 }).skeins).toBe(2);
  });

  it('more working strands purchase proportionally more floss', () => {
    const two = threadEstimate(1000, DEFAULT_ESTIMATES);
    const three = threadEstimate(1000, { ...DEFAULT_ESTIMATES, strands: 3 });
    expect(three.metres / two.metres).toBeCloseTo(1.5, 6);
  });
});

describe('totalEstimate', () => {
  it('sums per-colour round-ups — colours cannot share a skein', () => {
    // One dense colour and one single stitch: metres barely move,
    // skeins still count both colours.
    const total = totalEstimate([100, 1], DEFAULT_ESTIMATES);
    expect(total.skeins).toBe(2);
    expect(total.metres).toBeCloseTo(0.22579 + 0.0022579, 4);
  });

  it('is zero for an empty design', () => {
    expect(totalEstimate([], DEFAULT_ESTIMATES)).toEqual({ metres: 0, skeins: 0 });
  });
});

describe('estimateAssumptions', () => {
  it('discloses every model assumption in words', () => {
    const sentence = estimateAssumptions(DEFAULT_ESTIMATES);
    expect(sentence).toContain('14-count');
    expect(sentence).toContain('×1.2');
    expect(sentence).toContain('10% waste');
    expect(sentence).toContain('2 of 6 strands');
    expect(sentence).toContain('8 m skeins');
    expect(sentence).toContain("don't promise");
  });
});
