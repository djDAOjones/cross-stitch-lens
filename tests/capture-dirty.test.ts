/**
 * Dirty-frame detection — pure half (hash + signature). The 64×64
 * video sampler is browser-only and verified in the running app.
 */

import { describe, expect, it } from 'vitest';
import {
  DIRTY_MAX_STALE_MS,
  DirtyGate,
  frameSignature,
  hashPixels,
} from '../src/capture/dirty.ts';

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

/**
 * M5-PERF-30: the 64×64 downsample averages ~362 source pixels per
 * cell, so a small edit can produce a byte-identical sample — the
 * preview then never updated at all. The gate cannot recover the lost
 * signal, so it bounds the staleness instead.
 */
describe('DirtyGate', () => {
  it('processes a changed source immediately', () => {
    const gate = new DirtyGate();
    expect(gate.shouldProcess('a', 1000)).toBe(true);
    expect(gate.shouldProcess('b', 1010)).toBe(true);
    expect(gate.skippedCount).toBe(0);
    expect(gate.forcedCount).toBe(0);
  });

  it('skips an unchanged source inside the staleness window', () => {
    const gate = new DirtyGate();
    gate.shouldProcess('a', 1000);
    expect(gate.shouldProcess('a', 1500)).toBe(false);
    expect(gate.shouldProcess('a', 1000 + DIRTY_MAX_STALE_MS - 1)).toBe(false);
    expect(gate.skippedCount).toBe(2);
  });

  it('forces a refresh once the source has looked unchanged too long', () => {
    const gate = new DirtyGate();
    gate.shouldProcess('a', 1000);
    expect(gate.shouldProcess('a', 1000 + DIRTY_MAX_STALE_MS)).toBe(true);
    expect(gate.forcedCount).toBe(1);
    // The forced pass restarts the window, so it cannot fire every tick.
    expect(gate.shouldProcess('a', 1000 + DIRTY_MAX_STALE_MS + 1)).toBe(false);
  });

  it('never leaves an invisible edit invisible for longer than the window', () => {
    // The failing case from the audit: an edit small enough that the
    // downsample hashes identically. Ticking at 60 fps, the preview
    // must still refresh within the window.
    const window = 500;
    const tick = 16;
    const gate = new DirtyGate(window);
    gate.shouldProcess('unchanged-looking', 0);
    let lastProcessed = 0;
    let worstGap = 0;
    for (let t = tick; t <= 5000; t += tick) {
      if (gate.shouldProcess('unchanged-looking', t)) {
        worstGap = Math.max(worstGap, t - lastProcessed);
        lastProcessed = t;
      }
    }
    expect(gate.forcedCount).toBeGreaterThan(0);
    // The bound that matters: never invisible for longer than one
    // window plus the tick it lands on.
    expect(worstGap).toBeLessThanOrEqual(window + tick);
  });

  it('honours a custom window', () => {
    const gate = new DirtyGate(100);
    gate.shouldProcess('a', 0);
    expect(gate.shouldProcess('a', 50)).toBe(false);
    expect(gate.shouldProcess('a', 100)).toBe(true);
  });

  it('always processes the first frame of a session', () => {
    const gate = new DirtyGate();
    expect(gate.shouldProcess('a', 5_000_000)).toBe(true);
  });

  it('processes the next frame after a reset even if unchanged', () => {
    // Draft-quality switches reset the gate: identical input, different
    // output, so the frame must be re-run.
    const gate = new DirtyGate();
    gate.shouldProcess('a', 1000);
    gate.reset();
    expect(gate.shouldProcess('a', 1001)).toBe(true);
  });

  it('does not re-process content a manual grab already handled', () => {
    const gate = new DirtyGate();
    gate.markProcessed('a', 1000);
    expect(gate.shouldProcess('a', 1010)).toBe(false);
  });
});
