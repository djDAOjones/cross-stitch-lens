/**
 * Image-import filtering: the pure half of the import path (decode
 * needs browser APIs and is verified in the running app).
 */

import { describe, expect, it } from 'vitest';

import { imageFiles } from '../src/ui/import.ts';

function fakeList(types: string[]): ArrayLike<{ type: string }> {
  const list: Record<number, { type: string }> & { length: number } = {
    length: types.length,
  };
  types.forEach((type, i) => (list[i] = { type }));
  return list;
}

describe('imageFiles filter', () => {
  it('keeps image/* entries and preserves order', () => {
    const files = imageFiles(
      fakeList(['image/png', 'text/plain', 'image/jpeg', 'application/pdf']),
    );
    expect(files.map((f) => f.type)).toEqual(['image/png', 'image/jpeg']);
  });

  it('returns empty for an empty or imageless list', () => {
    expect(imageFiles(fakeList([]))).toEqual([]);
    expect(imageFiles(fakeList(['text/html', 'application/zip']))).toEqual([]);
  });

  it('handles sparse array-likes defensively', () => {
    const sparse: ArrayLike<{ type: string }> = { length: 2, 0: { type: 'image/gif' } };
    expect(imageFiles(sparse).map((f) => f.type)).toEqual(['image/gif']);
  });
});
