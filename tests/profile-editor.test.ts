/**
 * M15-UI-02/03/04: the editor's pure halves — browse row model, hex
 * parsing, readout fingerprints (the EXT-43 no-rebuild contract at
 * the model level), the grid divisors and the slot loader's
 * absent-vs-broken distinction. DOM conduct is verified in the
 * running app per the house convention.
 */

import { describe, expect, it, vi } from 'vitest';

import { userColor } from '../src/core/color-sources.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';
import {
  browseRowsFor,
  browseUniverse,
  entryLabel,
  fullSpanRule,
  parseHexQuery,
  readoutFingerprint,
} from '../src/ui/profile-editor-colour.ts';
import {
  dividedGrid,
  fetchSlot,
  GRID_DIVISORS,
  PHOTO_SLOTS,
} from '../src/ui/profile-editor-preview.ts';

const catalogue = loadCatalogue();

describe('parseHexQuery', () => {
  it('accepts six hex digits with or without the hash', () => {
    expect(parseHexQuery('#cc0033')).toEqual([204, 0, 51]);
    expect(parseHexQuery('CC0033')).toEqual([204, 0, 51]);
    expect(parseHexQuery(' #cc0033 ')).toEqual([204, 0, 51]);
  });

  it('rejects anything else', () => {
    expect(parseHexQuery('#fff')).toBeNull();
    expect(parseHexQuery('cc003')).toBeNull();
    expect(parseHexQuery('red')).toBeNull();
    expect(parseHexQuery('')).toBeNull();
  });
});

describe('browse universe and rows', () => {
  it('spans threads, maps and custom colours when unscoped', () => {
    const custom = userColor('c1', [1, 2, 3]);
    const universe = browseUniverse(catalogue, [custom], null);
    expect(universe.length).toBe(catalogue.threads.length + 310 + 1);
    expect(universe.some((e) => e.id === 'user:c1')).toBe(true);
  });

  it('scopes to one brand, one map, or the custom set', () => {
    expect(browseUniverse(catalogue, [], 'dmc').every((e) => e.brandId === 'dmc')).toBe(true);
    expect(browseUniverse(catalogue, [], 'map:bw')).toHaveLength(2);
    const custom = userColor('c1', [1, 2, 3]);
    expect(browseUniverse(catalogue, [custom], 'user')).toHaveLength(1);
  });

  it('caps rows and reports the true total', () => {
    const { rows, total } = browseRowsFor(catalogue, [], null, '');
    expect(rows).toHaveLength(60);
    expect(total).toBeGreaterThan(3000);
  });

  it('searches labels case-insensitively and hex exactly', () => {
    const byName = browseRowsFor(catalogue, [], null, 'parrot green');
    expect(byName.total).toBeGreaterThan(0);
    const byHex = browseRowsFor(catalogue, [], 'map:websafe', '#cc0033');
    expect(byHex.total).toBe(1);
    expect(byHex.rows[0]?.label).toBe('Web-safe #cc0033');
  });

  it('labels threads by manufacturer and synthetics by provenance', () => {
    const thread = catalogue.byId.get('dmc:310');
    expect(thread).toBeDefined();
    if (thread !== undefined) expect(entryLabel(thread, catalogue)).toBe('DMC 310 Black');
    expect(entryLabel(userColor('c1', [220, 20, 60]), catalogue)).toBe('Custom — Crimson');
  });
});

describe('readout no-rebuild fingerprints (the EXT-43 contract)', () => {
  it('is stable for the same resolved order and moves when it moves', () => {
    const entries = browseUniverse(catalogue, [], 'map:bw');
    expect(readoutFingerprint(entries)).toBe(readoutFingerprint([...entries]));
    expect(readoutFingerprint(entries)).not.toBe(
      readoutFingerprint([...entries].reverse()),
    );
  });

  it('starts range editing from a full-span no-op rule', () => {
    const rule = fullSpanRule();
    expect(rule.hue).toEqual([0, 360]);
    expect(rule.saturation).toEqual([0, 100]);
    expect(rule.brightness).toEqual([0, 100]);
  });
});

describe('preview rig geometry and slots', () => {
  it('divides the grid with a readable floor', () => {
    expect(GRID_DIVISORS).toEqual([1, 4, 16]);
    expect(dividedGrid({ width: 200, height: 160 }, 4)).toEqual({ width: 50, height: 40 });
    expect(dividedGrid({ width: 200, height: 160 }, 16)).toEqual({ width: 13, height: 10 });
    expect(dividedGrid({ width: 40, height: 40 }, 16)).toEqual({ width: 8, height: 8 });
  });

  it('names the six photo slots for the profile-demo folder', () => {
    // The file names are a contract with `public/profile-demo/`, not a
    // label: the loader fetches these exact strings, so a renamed or
    // re-encoded image silently becomes an "Image offline" slot. The
    // extension is part of it — five of the six are JPEGs.
    expect(PHOTO_SLOTS.map((s) => s.file)).toEqual([
      'landscape-1.jpg',
      'landscape-2.jpg',
      'portrait.jpg',
      'graphic.jpg',
      'stained-glass.jpg',
      'text.png',
    ]);
    expect(new Set(PHOTO_SLOTS.map((s) => s.id)).size).toBe(PHOTO_SLOTS.length);
  });

  it('treats a non-image answer as an absent slot, not a broken one', async () => {
    // Vite's dev server answers missing files with index.html; the
    // content-type guard is what keeps the offline state honest.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['<html>'], { type: 'text/html' })),
      })) as unknown as typeof fetch;
    try {
      const result = await fetchSlot('landscape.png', () =>
        Promise.reject(new Error('decode must not be reached')),
      );
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('treats a failed fetch as absent rather than throwing', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    try {
      expect(await fetchSlot('portrait.png', () => Promise.reject(new Error('no')))).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fetches the slot under the deploy base path, not the domain root', async () => {
    // GitHub Pages serves a project site under /<repo>/ (D172). A
    // root-absolute URL leaves the site and 404s, which the loader
    // would report as an honest-looking "Image offline" — so the
    // base is pinned here under a non-root value.
    vi.stubEnv('BASE_URL', '/pattern-mapper/');
    const originalFetch = globalThis.fetch;
    const requested: string[] = [];
    globalThis.fetch = ((input: string) => {
      requested.push(input);
      return Promise.reject(new Error('offline'));
    }) as unknown as typeof fetch;
    try {
      await fetchSlot('landscape-1.jpg', () => Promise.reject(new Error('no')));
      expect(requested).toEqual(['/pattern-mapper/profile-demo/landscape-1.jpg']);
    } finally {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
    }
  });
});
