/**
 * Number-field input constraint (the pure half of src/ui/controls.ts):
 * whole numbers inside bounds, safe fallback for garbage — invalid
 * input must never propagate into pipeline or grid state.
 */

import { describe, expect, it } from 'vitest';

import { clampInt } from '../src/ui/controls.ts';

describe('clampInt', () => {
  it('passes in-range whole numbers through', () => {
    expect(clampInt('5', 0, 100, 10)).toBe(5);
  });

  it('floors fractional entries', () => {
    expect(clampInt('7.9', 0, 100, 10)).toBe(7);
  });

  it('clamps to both bounds', () => {
    expect(clampInt('-3', 0, 100, 10)).toBe(0);
    expect(clampInt('999', 0, 100, 10)).toBe(100);
  });

  it('falls back on empty or unparseable input', () => {
    expect(clampInt('', 0, 100, 10)).toBe(10);
    expect(clampInt('abc', 0, 100, 10)).toBe(10);
    expect(clampInt('  ', 0, 100, 10)).toBe(10);
  });
});
