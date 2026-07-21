/**
 * Library file formats and the storage adapter (M7-INV-01, M7-PAL-01).
 *
 * Import/export is the safety contract for library data, not a
 * convenience: browser storage can be cleared without warning, so a
 * file the user holds must round-trip exactly, refuse malformed input
 * with a useful message, and never silently drop a record it does not
 * recognise.
 */

import { describe, expect, it } from 'vitest';

import {
  LIBRARY_SCHEMA_VERSION,
  MAX_LIBRARY_ENTRIES,
  mergeOwned,
  parseInventory,
  parsePalettes,
  serializeInventory,
  serializePalettes,
  withFreshId,
  type LibraryPalette,
} from '../src/library/records.ts';
import { MemoryStore } from '../src/library/store.ts';

function palette(overrides: Partial<LibraryPalette> = {}): LibraryPalette {
  return {
    id: 'pal-1',
    name: 'Mine',
    revision: 1,
    createdFrom: 'brands',
    threadIds: ['dmc:310', 'anchor:403'],
    ...overrides,
  };
}

describe('inventory files', () => {
  it('round-trips byte-identically', () => {
    const text = serializeInventory(new Set(['dmc:310', 'anchor:403']), 'thread-list');
    const again = serializeInventory(new Set(parseInventory(text).owned), 'thread-list');
    expect(again).toBe(text);
  });

  it('canonicalises order, so the same set always serialises the same', () => {
    const a = serializeInventory(new Set(['dmc:310', 'anchor:403']), 'x');
    const b = serializeInventory(new Set(['anchor:403', 'dmc:310']), 'x');
    expect(a).toBe(b);
    expect(a.endsWith('\n')).toBe(true);
  });

  it('de-duplicates ids', () => {
    const text = serializeInventory(new Set(['dmc:310']), 'x');
    expect(parseInventory(text).owned).toEqual(['dmc:310']);
  });

  it('rejects a file of the wrong kind by name', () => {
    const palettes = serializePalettes([palette()]);
    expect(() => parseInventory(palettes)).toThrow(/inventory\.kind/);
  });

  it('rejects malformed JSON and malformed entries with a path', () => {
    expect(() => parseInventory('{')).toThrow(/not valid JSON/);
    expect(() =>
      parseInventory(JSON.stringify({ schemaVersion: 1, kind: 'inventory', owned: [42] })),
    ).toThrow(/inventory\.owned\[0\]/);
  });

  it('refuses a file from a newer app rather than misreading it', () => {
    const text = JSON.stringify({
      schemaVersion: LIBRARY_SCHEMA_VERSION + 1,
      kind: 'inventory',
      owned: [],
    });
    expect(() => parseInventory(text)).toThrow(/newer version/);
  });

  it('caps the list before walking it', () => {
    const owned = Array.from({ length: MAX_LIBRARY_ENTRIES + 1 }, (_, i) => `t:${String(i)}`);
    const text = JSON.stringify({ schemaVersion: 1, kind: 'inventory', owned });
    expect(() => parseInventory(text)).toThrow(/at most/);
  });

  it('keeps unknown references — a catalogue change deletes nothing', () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      kind: 'inventory',
      owned: ['brand-that-left:99'],
    });
    expect(parseInventory(text).owned).toEqual(['brand-that-left:99']);
  });
});

describe('mergeOwned', () => {
  it('is additive — an import never removes a thread', () => {
    const merged = mergeOwned(new Set(['dmc:310']), ['anchor:403']);
    expect([...merged].sort()).toEqual(['anchor:403', 'dmc:310']);
  });

  it('is idempotent', () => {
    const once = mergeOwned(new Set(['dmc:310']), ['dmc:310']);
    expect([...once]).toEqual(['dmc:310']);
  });
});

describe('palette library files', () => {
  it('round-trips byte-identically and sorts by id', () => {
    const text = serializePalettes([palette({ id: 'b' }), palette({ id: 'a' })]);
    expect(serializePalettes(parsePalettes(text).palettes)).toBe(text);
    expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"b"'));
  });

  it('coalesces a thread repeated inside one palette, and reports it', () => {
    // One thread twice in one ordered set is meaningless — index 5 and
    // index 40 would both be DMC 310.
    const text = JSON.stringify({
      schemaVersion: 1,
      kind: 'palettes',
      palettes: [{ ...palette(), threadIds: ['dmc:310', 'dmc:310', 'anchor:403'] }],
    });
    const result = parsePalettes(text);
    expect(result.palettes[0]?.threadIds).toEqual(['dmc:310', 'anchor:403']);
    expect(result.coalesced).toBe(1);
  });

  it('keeps two different threads that share a colour', () => {
    // Distinct identities are valid even at identical RGB — the whole
    // point of the M7 identity model.
    const text = serializePalettes([
      palette({ threadIds: ['dmc:310', 'anchor:403'] }),
    ]);
    expect(parsePalettes(text).palettes[0]?.threadIds).toEqual(['dmc:310', 'anchor:403']);
  });

  it('rejects corrupt input with a path-named error', () => {
    expect(() => parsePalettes('nope')).toThrow(/not valid JSON/);
    // Each failure names the exact field, so a hand-edited file can be
    // fixed rather than guessed at.
    expect(() =>
      parsePalettes(
        JSON.stringify({
          schemaVersion: 1,
          kind: 'palettes',
          palettes: [{ id: '', name: 'x', threadIds: [] }],
        }),
      ),
    ).toThrow(/palettes\.palettes\[0\]\.id/);
    expect(() =>
      parsePalettes(
        JSON.stringify({ schemaVersion: 1, kind: 'palettes', palettes: [{ id: 'a' }] }),
      ),
    ).toThrow(/palettes\.palettes\[0\]\.threadIds/);
  });
});

describe('withFreshId', () => {
  it('leaves a non-colliding palette alone', () => {
    const p = palette();
    expect(withFreshId(p, new Set())).toBe(p);
  });

  it('renames rather than overwriting an existing palette', () => {
    // Losing a palette to an id clash is not recoverable; having two
    // is a five-second cleanup.
    const renamed = withFreshId(palette({ id: 'pal-1' }), new Set(['pal-1']));
    expect(renamed.id).toBe('pal-1-2');
    expect(renamed.name).toBe('Mine (imported)');
  });

  it('keeps looking until it finds a free id', () => {
    const renamed = withFreshId(palette({ id: 'p' }), new Set(['p', 'p-2', 'p-3']));
    expect(renamed.id).toBe('p-4');
  });
});

describe('MemoryStore', () => {
  it('round-trips the owned set and reports itself as non-persistent', async () => {
    const store = new MemoryStore();
    expect(store.persistent).toBe(false);
    await store.saveOwned(new Set(['dmc:310']));
    expect([...(await store.loadOwned())]).toEqual(['dmc:310']);
  });

  it('starts empty', async () => {
    expect((await new MemoryStore().loadOwned()).size).toBe(0);
    expect(await new MemoryStore().listPalettes()).toEqual([]);
  });

  it('stores, replaces and deletes palettes by id', async () => {
    const store = new MemoryStore();
    await store.putPalette(palette({ id: 'a', name: 'First' }));
    await store.putPalette(palette({ id: 'a', name: 'Renamed' }));
    expect(await store.listPalettes()).toHaveLength(1);
    expect((await store.listPalettes())[0]?.name).toBe('Renamed');
    await store.deletePalette('a');
    expect(await store.listPalettes()).toEqual([]);
  });

  it('copies thread lists in, so a later mutation cannot reach the store', async () => {
    const store = new MemoryStore();
    const p = palette({ threadIds: ['dmc:310'] });
    await store.putPalette(p);
    p.threadIds.push('anchor:403');
    expect((await store.listPalettes())[0]?.threadIds).toEqual(['dmc:310']);
  });
});
