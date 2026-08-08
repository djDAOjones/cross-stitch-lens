/**
 * Master-image readback (M13-IMPL-01, D135 candidate 2).
 *
 * Transferring the pump's grab buffer instead of copying it is only
 * safe because a detached master image can be refilled. These are the
 * cases that decide whether that is true: the detached read, the
 * refill that cannot deliver, and the still source that must never be
 * refilled at all. Real detachment is produced here with a
 * `structuredClone` transfer, not a fake — the pre-fix code path
 * (reading `held` bare) returns a blank picture for the second test.
 */

import { describe, expect, it } from 'vitest';
import { liveBuffer } from '../src/capture/master-image.ts';
import type { PixelBuffer } from '../src/core/types.ts';

/** A buffer whose bytes are a recognisable ramp, so a swap is visible. */
function buffer(width: number, height: number, seed = 0): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 1) data[i] = (i + seed) % 256;
  return { width, height, data };
}

/** Detach a buffer's bytes exactly as a `postMessage` transfer does. */
function transfer(pixels: PixelBuffer): void {
  structuredClone(pixels.data.buffer, { transfer: [pixels.data.buffer] });
}

describe('liveBuffer', () => {
  it('hands back a still buffer untouched, never consulting a refill', () => {
    const still = buffer(4, 4);
    let refills = 0;
    const seen = liveBuffer(still, () => {
      refills += 1;
      return null;
    });
    expect(seen).toBe(still);
    expect(refills).toBe(0);
  });

  it('refills a detached buffer instead of returning a blank picture', () => {
    const grabbed = buffer(4, 4);
    transfer(grabbed);
    // The defect this guards: geometry survives, pixels do not.
    expect(grabbed.width).toBe(4);
    expect(grabbed.data.length).toBe(0);

    const snapshot = buffer(4, 4);
    const seen = liveBuffer(grabbed, () => snapshot);
    expect(seen).toBe(snapshot);
    expect(seen?.data.length).toBe(64);
  });

  it('reports no source when the refill cannot deliver', () => {
    const grabbed = buffer(2, 2);
    transfer(grabbed);
    expect(liveBuffer(grabbed, () => null)).toBeNull();
    // Session already gone: no refill registered at all.
    expect(liveBuffer(grabbed, null)).toBeNull();
  });

  it('refuses an empty refill rather than passing the blank through', () => {
    const grabbed = buffer(2, 2);
    transfer(grabbed);
    const empty: PixelBuffer = { width: 2, height: 2, data: new Uint8ClampedArray(0) };
    expect(liveBuffer(grabbed, () => empty)).toBeNull();
  });

  it('has no source to read when nothing has been loaded', () => {
    let refills = 0;
    expect(
      liveBuffer(null, () => {
        refills += 1;
        return buffer(2, 2);
      }),
    ).toBeNull();
    expect(refills).toBe(0);
  });

  it('refills again after the refilled buffer is itself transferred', () => {
    const grabbed = buffer(3, 3);
    transfer(grabbed);
    const first = buffer(3, 3, 1);
    const second = buffer(3, 3, 2);
    let call = 0;
    const refill = (): PixelBuffer => (call++ === 0 ? first : second);

    const a = liveBuffer(grabbed, refill);
    expect(a).toBe(first);
    // The caller submitted it, so it detaches; the next read must not
    // hand the same corpse back.
    transfer(first);
    expect(liveBuffer(first, refill)).toBe(second);
  });

  it('passes a zero-area source through as the empty thing it is', () => {
    const nothing: PixelBuffer = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
    // Indistinguishable from detached by length alone, and the refill
    // is the right authority either way.
    expect(liveBuffer(nothing, () => null)).toBeNull();
  });
});
