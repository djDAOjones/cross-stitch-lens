/**
 * The colour-limit slider's log scale (ICE-LIMIT-01, D188): floor 2,
 * ceiling 512, midpoint exactly 16, monotone, and a round trip that
 * lands every whole count on a position that maps back to itself.
 */

import { describe, expect, it } from 'vitest';

import { COUNT_SCALE, countToSlider, sliderToCount } from '../src/ui/colour-section.ts';

describe('count slider scale', () => {
  it('pins the signed anchors: 2 at the floor, 16 at the midpoint, 512 at the ceiling', () => {
    expect(sliderToCount(0)).toBe(2);
    expect(sliderToCount(COUNT_SCALE.steps / 2)).toBe(16);
    expect(sliderToCount(COUNT_SCALE.steps)).toBe(512);
    expect(countToSlider(2)).toBe(0);
    expect(countToSlider(16)).toBe(COUNT_SCALE.steps / 2);
    expect(countToSlider(512)).toBe(COUNT_SCALE.steps);
  });

  it('is logarithmic on each half: quarter points land on geometric means', () => {
    // 2 → 16 over the first half: √(2·16) ≈ 5.66 at a quarter.
    expect(sliderToCount(COUNT_SCALE.steps / 4)).toBe(6);
    // 16 → 512 over the second half: √(16·512) ≈ 90.5 at three quarters.
    expect(sliderToCount((COUNT_SCALE.steps * 3) / 4)).toBe(91);
  });

  it('never decreases as the handle moves right', () => {
    let last = 0;
    for (let p = 0; p <= COUNT_SCALE.steps; p++) {
      const n = sliderToCount(p);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  it('round-trips every whole count where counts are one position apart, and within a step above', () => {
    for (let n = COUNT_SCALE.floor; n <= 40; n++) {
      expect(sliderToCount(countToSlider(n))).toBe(n);
    }
    // Above that the slider is the coarse handle (the number input is
    // the exact one): one position is ≈ 2.3 % of the count.
    for (let n = 41; n <= COUNT_SCALE.ceiling; n++) {
      const back = sliderToCount(countToSlider(n));
      expect(Math.abs(back - n) / n).toBeLessThanOrEqual(0.0235);
    }
  });

  it('clamps counts and positions outside the scale, so a loaded n of 1 still shows', () => {
    expect(countToSlider(1)).toBe(0);
    expect(countToSlider(1024)).toBe(COUNT_SCALE.steps);
    expect(sliderToCount(-5)).toBe(2);
    expect(sliderToCount(COUNT_SCALE.steps + 5)).toBe(512);
  });
});
