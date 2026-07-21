/**
 * Thread fixtures (M7-BRAND-01).
 *
 * A `Thread` carries identity as well as colour, so test palettes are
 * built through {@link thread} rather than as object literals — one
 * place to change when the record grows, and every fixture gets a
 * distinct `brandId:reference` id for free.
 */

import type { Palette, Thread } from '../../src/core/types.ts';

/** A test thread. `reference` is the identity; the rest is display. */
export function thread(
  reference: string,
  name: string,
  rgb: [number, number, number],
  overrides: Partial<Thread> = {},
): Thread {
  const hex = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  const brandId = overrides.brandId ?? 'test';
  return {
    id: `${brandId}:${reference}`,
    brandId,
    reference,
    name,
    hex,
    rgb,
    provenance: 'measured',
    status: 'current',
    mappedFrom: null,
    ...overrides,
  };
}

/** A named palette over the given threads, in order. */
export function palette(name: string, entries: Thread[]): Palette {
  return { name, entries };
}
