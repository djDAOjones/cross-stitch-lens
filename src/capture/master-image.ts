/**
 * Master-image readback rule (M13-IMPL-01, D135 candidate 2).
 *
 * The live pump transfers its grab buffer straight to the worker
 * instead of copying it first, which means the app's retained master
 * image can be *detached*: a `Uint8ClampedArray` whose length has gone
 * to 0 while the `PixelBuffer`'s `width`/`height` stay truthful. A
 * consumer that read it bare would get a correctly-sized, entirely
 * blank picture — the worst kind of wrong, because nothing throws.
 *
 * This is the one rule that decides what a consumer actually sees. It
 * lives here, pure, because the failure modes are exactly the ones a
 * 3,000-line UI module cannot demonstrate: a detached buffer, a refill
 * that cannot deliver, and a refill that delivers something empty.
 */

import type { PixelBuffer } from '../core/types.ts';

/**
 * The buffer a consumer should use, refilling a detached one first.
 *
 * @param held The retained master image, or null when there is no source.
 * @param refill How to re-read the same frame (the capture session's
 *   retained grab surface); null for still sources, whose buffers are
 *   never transferred and so can never detach.
 * @returns A buffer with readable pixels, or null when there is no
 *   usable source — never a detached or empty one.
 */
export function liveBuffer(
  held: PixelBuffer | null,
  refill: (() => PixelBuffer | null) | null,
): PixelBuffer | null {
  if (held === null) return null;
  // Length is the only honest detachment signal: a transferred array
  // keeps its identity and its type, and loses only its bytes.
  if (held.data.length > 0) return held;
  const refilled = refill?.() ?? null;
  if (refilled === null || refilled.data.length === 0) return null;
  return refilled;
}
