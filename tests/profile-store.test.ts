/**
 * M15-PERSIST-01: the kind-aware profile store, the generic profile
 * file format, and the My-colours library. The memory store carries
 * the storage contract (the library-records precedent — IndexedDB is
 * exercised in the browser, the contract is pinned here).
 */

import { describe, expect, it } from 'vitest';

import { paletteToProfile } from '../src/core/color-profile.ts';
import {
  parseProfiles,
  parseUserColors,
  serializeProfiles,
  serializeUserColors,
  type ProfileRecord,
} from '../src/library/records.ts';
import { MemoryStore } from '../src/library/store.ts';

function record(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    kind: 'colour',
    id: 'p-1',
    name: 'Mine',
    revision: 1,
    createdFrom: 'new',
    payload: { libraries: ['dmc'], ownedOnly: false, include: [], exclude: [], ranges: [] },
    ...overrides,
  };
}

describe('kind-aware profile store', () => {
  it('round-trips a profile and lists by kind only', async () => {
    const store = new MemoryStore();
    await store.putProfile(record());
    await store.putProfile(record({ kind: 'dither', id: 'd-1', payload: { algorithm: 'none' } }));
    const colour = await store.listProfiles('colour');
    expect(colour).toHaveLength(1);
    expect(colour[0]?.id).toBe('p-1');
    const dither = await store.listProfiles('dither');
    expect(dither).toHaveLength(1);
    expect(dither[0]?.payload).toEqual({ algorithm: 'none' });
  });

  it('two kinds can share an id without colliding', async () => {
    const store = new MemoryStore();
    await store.putProfile(record({ id: 'same' }));
    await store.putProfile(record({ kind: 'dither', id: 'same', payload: {} }));
    await store.deleteProfile('dither', 'same');
    expect(await store.listProfiles('colour')).toHaveLength(1);
    expect(await store.listProfiles('dither')).toHaveLength(0);
  });

  it('rejects builtin ids at the store level — immutability is not UI politeness', async () => {
    const store = new MemoryStore();
    await expect(store.putProfile(record({ id: 'builtin:dmc' }))).rejects.toThrow(
      'read-only',
    );
    expect(await store.listProfiles('colour')).toHaveLength(0);
  });

  it('round-trips the My-colours library', async () => {
    const store = new MemoryStore();
    await store.putUserColor({ id: 'c1', rgb: [220, 20, 60] });
    await store.putUserColor({ id: 'c2', rgb: [0, 128, 255] });
    await store.deleteUserColor('c2');
    const colors = await store.listUserColors();
    expect(colors).toEqual([{ id: 'c1', rgb: [220, 20, 60] }]);
  });
});

describe('generic profile file format', () => {
  it('export → import → export is byte-identical', () => {
    const records = [record({ id: 'b' }), record({ id: 'a' })];
    const first = serializeProfiles('colour', records);
    const parsed = parseProfiles(first);
    const second = serializeProfiles('colour', parsed.profiles);
    expect(second).toBe(first);
    expect(parsed.profileKind).toBe('colour');
  });

  it('is kind-generic: a dither payload travels opaquely', () => {
    const dither = record({
      kind: 'dither',
      id: 'd-1',
      payload: { algorithm: 'atkinson', strength: 0.8, serpentine: true },
    });
    const parsed = parseProfiles(serializeProfiles('dither', [dither]));
    expect(parsed.profiles[0]?.payload).toEqual(dither.payload);
  });

  it('refuses a different file kind with a readable path', () => {
    expect(() => parseProfiles('{"kind":"palettes"}')).toThrow('different kind of file');
  });

  it('never imports a builtin id', () => {
    const json = serializeProfiles('colour', [record()]).replace('"p-1"', '"builtin:dmc"');
    expect(() => parseProfiles(json)).toThrow('read-only');
  });

  it('drops builtin and wrong-kind records on export rather than lying', () => {
    const json = serializeProfiles('colour', [
      record(),
      record({ id: 'builtin:dmc' }),
      record({ kind: 'dither', id: 'd-1' }),
    ]);
    expect(parseProfiles(json).profiles).toHaveLength(1);
  });

  it('round-trips My-colours canonically', () => {
    const first = serializeUserColors([
      { id: 'z', rgb: [1, 2, 3] },
      { id: 'a', rgb: [255, 255, 255] },
    ]);
    const parsed = parseUserColors(first);
    expect(serializeUserColors(parsed.colors)).toBe(first);
    expect(() => parseUserColors('{"kind":"profiles"}')).toThrow('different kind of file');
  });
});

describe('paletteToProfile (the 1:1 conversion)', () => {
  it('preserves id, name, revision and order — order is identity', () => {
    const profile = paletteToProfile({
      id: 'pal-3',
      name: 'Sunset',
      revision: 7,
      threadIds: ['dmc:321', 'dmc:310', 'anchor:403'],
    });
    expect(profile.id).toBe('pal-3');
    expect(profile.name).toBe('Sunset');
    expect(profile.revision).toBe(7);
    expect(profile.builtin).toBe(false);
    expect(profile.createdFrom).toBe('palette:pal-3');
    expect(profile.recipe.include).toEqual(['dmc:321', 'dmc:310', 'anchor:403']);
    expect(profile.recipe.libraries).toEqual([]);
  });
});
