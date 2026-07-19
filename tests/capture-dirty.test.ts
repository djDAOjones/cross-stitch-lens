/**
 * Dirty-frame detection — pure half (hash + signature). The 64×64
 * video sampler is browser-only and verified in the running app.
 */

import { describe, expect, it } from 'vitest';
import { frameSignature, hashPixels } from '../src/capture/dirty.ts';

describe('hashPixels', () => {
  it('is deterministic', () => {
    const data = [1, 2, 3, 250, 251, 252];
    expect(hashPixels(data)).toBe(hashPixels([...data]));
  });

  it('changes when any byte changes', () => {
    const base = new Uint8ClampedArray(64 * 64 * 4);
    const tweaked = new Uint8ClampedArray(base);
    tweaked[4000] = 1;
    expect(hashPixels(tweaked)).not.toBe(hashPixels(base));
  });

  it('distinguishes order', () => {
    expect(hashPixels([1, 2])).not.toBe(hashPixels([2, 1]));
  });

  it('returns an unsigned 32-bit value', () => {
    const hash = hashPixels(new Uint8ClampedArray(16).fill(255));
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('handles empty input', () => {
    expect(hashPixels([])).toBe(0x811c9dc5);
  });
});

describe('frameSignature', () => {
  const region = { x: 10, y: 20, width: 300, height: 200 };

  it('encodes the region so a moved crop reads as a change', () => {
    const moved = { ...region, x: 11 };
    expect(frameSignature(123, region)).not.toBe(frameSignature(123, moved));
  });

  it('encodes a resized crop as a change', () => {
    const resized = { ...region, width: 301 };
    expect(frameSignature(123, region)).not.toBe(frameSignature(123, resized));
  });

  it('distinguishes full-frame from a same-hash region', () => {
    expect(frameSignature(123, null)).not.toBe(frameSignature(123, region));
  });

  it('is stable for identical inputs', () => {
    expect(frameSignature(456, region)).toBe(frameSignature(456, { ...region }));
    expect(frameSignature(456, null)).toBe(frameSignature(456, null));
  });
});
