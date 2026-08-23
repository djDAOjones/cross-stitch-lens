/**
 * The design history (DUR-01): the store contract (pinned on the memory
 * store, the library-records precedent — IndexedDB is exercised in the
 * browser), the quota model, and the standing line's copy.
 *
 * Invariants at stake: a write never evicts the design being written;
 * eviction is oldest-first within both budgets; the one warned-about
 * case is dropping a design that was never saved as a file; and the
 * pre-DUR-01 sentence survives verbatim exactly where it is still true.
 */

import { describe, expect, it } from 'vitest';

import {
  effectiveBudget,
  HISTORY_BUDGETS,
  historyLine,
  historyUsage,
  MemorySnapshotStore,
  metaOf,
  nearQuota,
  newDesignId,
  nextToEvict,
  planWrite,
  snapshotBytes,
  type DesignSnapshot,
  type HistoryLineState,
  type SnapshotMeta,
} from '../src/library/snapshots.ts';

function design(overrides: Partial<DesignSnapshot> = {}): DesignSnapshot {
  return {
    id: 'd1',
    title: 'Fox',
    createdAt: 1_000,
    updatedAt: 2_000,
    savedAt: null,
    projectJson: '{"schemaVersion":10}',
    source: { bytes: new Uint8Array([1, 2, 3, 4]).buffer, type: 'image/png', name: 'fox.png', entry: 'source.png' },
    ...overrides,
  };
}

function meta(overrides: Partial<SnapshotMeta> = {}): SnapshotMeta {
  return {
    id: 'm',
    title: 'Design',
    createdAt: 0,
    updatedAt: 0,
    savedAt: null,
    bytes: 10,
    hasPicture: true,
    ...overrides,
  };
}

const MB = 1024 * 1024;
const basic = HISTORY_BUDGETS.basic;

describe('MemorySnapshotStore', () => {
  it('round-trips a design and reports itself as non-persistent', async () => {
    const store = new MemorySnapshotStore();
    expect(store.persistent).toBe(false);
    await store.put(design());
    const back = await store.get('d1');
    expect(back?.title).toBe('Fox');
    expect(back?.projectJson).toBe('{"schemaVersion":10}');
    expect(new Uint8Array(back?.source?.bytes ?? new ArrayBuffer(0))).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(await store.get('missing')).toBeNull();
  });

  it('lists newest first, without payloads, with honest byte counts', async () => {
    const store = new MemorySnapshotStore();
    await store.put(design({ id: 'old', updatedAt: 1 }));
    await store.put(design({ id: 'new', updatedAt: 3, source: null }));
    await store.put(design({ id: 'mid', updatedAt: 2 }));
    const rows = await store.list();
    expect(rows.map((r) => r.id)).toEqual(['new', 'mid', 'old']);
    expect(rows[0]?.hasPicture).toBe(false);
    expect(rows[0]?.bytes).toBe('{"schemaVersion":10}'.length);
    expect(rows[1]?.bytes).toBe('{"schemaVersion":10}'.length + 4);
    expect('projectJson' in (rows[0] ?? {})).toBe(false);
  });

  it('replaces by id, deletes, and stamps a save without touching payloads', async () => {
    const store = new MemorySnapshotStore();
    await store.put(design({ title: 'First' }));
    await store.put(design({ title: 'Renamed' }));
    expect(await store.list()).toHaveLength(1);
    await store.markSaved('d1', 5_000);
    const saved = await store.get('d1');
    expect(saved?.savedAt).toBe(5_000);
    expect(saved?.title).toBe('Renamed');
    expect(saved?.source?.name).toBe('fox.png');
    await store.markSaved('nope', 1); // unknown id: a no-op, never a throw
    await store.delete('d1');
    expect(await store.list()).toEqual([]);
  });

  it('copies picture bytes in and out, so a later mutation cannot reach the store', async () => {
    const store = new MemorySnapshotStore();
    const bytes = new Uint8Array([9, 9, 9]);
    await store.put(design({ source: { bytes: bytes.buffer, type: 'image/png', name: 'a', entry: 'source.png' } }));
    bytes[0] = 0;
    const back = await store.get('d1');
    expect(new Uint8Array(back?.source?.bytes ?? new ArrayBuffer(0))[0]).toBe(9);
    new Uint8Array(back?.source?.bytes ?? new ArrayBuffer(0))[1] = 0;
    expect(new Uint8Array((await store.get('d1'))?.source?.bytes ?? new ArrayBuffer(0))[1]).toBe(9);
  });
});

describe('snapshotBytes / metaOf / newDesignId', () => {
  it('counts the document and the picture', () => {
    expect(snapshotBytes(design())).toBe('{"schemaVersion":10}'.length + 4);
    expect(snapshotBytes(design({ source: null }))).toBe('{"schemaVersion":10}'.length);
    expect(metaOf(design())).toEqual({
      id: 'd1',
      title: 'Fox',
      createdAt: 1_000,
      updatedAt: 2_000,
      savedAt: null,
      bytes: '{"schemaVersion":10}'.length + 4,
      hasPicture: true,
    });
  });

  it('mints distinct, non-empty ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newDesignId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.length).toBeGreaterThan(8);
  });
});

describe('planWrite (eviction)', () => {
  const full = Array.from({ length: 10 }, (_, i) =>
    meta({ id: `d${String(i)}`, updatedAt: i * 100, bytes: 1 * MB, savedAt: i % 2 === 0 ? 1 : null }),
  );

  it('evicts nothing while both budgets hold', () => {
    const plan = planWrite(full.slice(0, 5), { id: 'new', bytes: 1 * MB }, basic);
    expect(plan).toEqual({ evict: [], dropsUnsaved: false, overBudget: false });
  });

  it('evicts the oldest to make room for one more design', () => {
    const plan = planWrite(full, { id: 'new', bytes: 1 * MB }, basic);
    expect(plan.evict.map((m) => m.id)).toEqual(['d0']);
    // d0 was saved as a file, so this is the quiet case.
    expect(plan.dropsUnsaved).toBe(false);
  });

  it('flags an eviction that drops a design never saved as a file', () => {
    const oldestUnsaved = full.map((m, i) => (i === 0 ? { ...m, savedAt: null } : m));
    const plan = planWrite(oldestUnsaved, { id: 'new', bytes: 1 * MB }, basic);
    expect(plan.evict.map((m) => m.id)).toEqual(['d0']);
    expect(plan.dropsUnsaved).toBe(true);
  });

  it('never evicts the design being written — an update is not an arrival', () => {
    const plan = planWrite(full, { id: 'd0', bytes: 1 * MB }, basic);
    expect(plan.evict).toEqual([]);
  });

  it('evicts by bytes, oldest first, as many as it takes', () => {
    const big = [
      meta({ id: 'a', updatedAt: 1, bytes: 60 * MB }),
      meta({ id: 'b', updatedAt: 2, bytes: 60 * MB, savedAt: 9 }),
      meta({ id: 'c', updatedAt: 3, bytes: 20 * MB }),
    ];
    const plan = planWrite(big, { id: 'new', bytes: 80 * MB }, basic);
    // 220 MB → drop a (160) → drop b (100): fits under 150.
    expect(plan.evict.map((m) => m.id)).toEqual(['a', 'b']);
    expect(plan.dropsUnsaved).toBe(true);
    expect(plan.overBudget).toBe(false);
  });

  it('keeps an over-budget design anyway and says so', () => {
    const plan = planWrite(full.slice(0, 2), { id: 'huge', bytes: 200 * MB }, basic);
    expect(plan.evict.map((m) => m.id)).toEqual(['d0', 'd1']);
    expect(plan.overBudget).toBe(true);
  });

  it('the persisted tier holds more', () => {
    const plan = planWrite(full, { id: 'new', bytes: 1 * MB }, HISTORY_BUDGETS.persisted);
    expect(plan.evict).toEqual([]);
  });
});

describe('usage, nearQuota, nextToEvict, effectiveBudget', () => {
  it('sums usage and flags the last slot or 80 % of the bytes', () => {
    const nine = Array.from({ length: 9 }, (_, i) => meta({ id: String(i), bytes: 1 * MB }));
    expect(historyUsage(nine)).toEqual({ designs: 9, bytes: 9 * MB });
    expect(nearQuota(nine, basic)).toBe(false);
    expect(nearQuota([...nine, meta({ id: 'ten', bytes: 1 * MB })], basic)).toBe(true);
    expect(nearQuota([meta({ id: 'fat', bytes: 120 * MB })], basic)).toBe(true);
    expect(nearQuota([meta({ id: 'ok', bytes: 119 * MB })], basic)).toBe(false);
  });

  it('names the oldest as next to go only when the history is full', () => {
    const nine = Array.from({ length: 9 }, (_, i) => meta({ id: String(i), updatedAt: i }));
    expect(nextToEvict(nine, basic)).toBeNull();
    const ten = [...nine, meta({ id: 'ten', updatedAt: 99 })];
    expect(nextToEvict(ten, basic)?.id).toBe('0');
  });

  it('caps the tier at half the browser’s free space plus what is already held', () => {
    expect(effectiveBudget(basic, null, 0)).toEqual(basic);
    expect(effectiveBudget(basic, { quota: 1_000 * MB, usage: 100 * MB }, 0)).toEqual(basic);
    const small = effectiveBudget(basic, { quota: 100 * MB, usage: 40 * MB }, 10 * MB);
    expect(small.maxDesigns).toBe(10);
    expect(small.maxBytes).toBe(30 * MB + 10 * MB);
    expect(effectiveBudget(basic, { quota: 10 * MB, usage: 50 * MB }, 0).maxBytes).toBe(0);
  });
});

describe('historyLine (the Project section copy)', () => {
  const base: HistoryLineState = {
    available: true,
    usage: { designs: 3, bytes: 12 * MB },
    budget: basic,
    current: 'kept',
    savedName: null,
    changedSinceSave: false,
    nextToDrop: null,
  };

  it('keeps the old sentence verbatim where it is still true', () => {
    expect(historyLine({ ...base, available: false })).toContain(
      'Nothing is kept unless you save your project',
    );
  });

  it('names each standing of the current design', () => {
    expect(historyLine({ ...base, current: 'none' })).toBe(
      'Your design is kept in this browser as you work. Save a file to keep it anywhere else.',
    );
    expect(historyLine(base)).toBe("Kept in this browser's history (3 of 10) — not saved as a file.");
    expect(historyLine({ ...base, current: 'restored' })).toBe(
      "Restored from this browser's history (3 of 10) — not saved as a file.",
    );
    expect(historyLine({ ...base, current: 'saved', savedName: 'Fox-200x200.pmproj' })).toBe(
      'Saved as Fox-200x200.pmproj. History: 3 of 10.',
    );
    expect(
      historyLine({ ...base, current: 'saved', savedName: 'Fox-200x200.pmproj', changedSinceSave: true }),
    ).toBe('Saved as Fox-200x200.pmproj — changes since are kept in this browser only.');
  });

  it('warns before a never-saved design is dropped, and quietly when it was saved', () => {
    const unsaved = meta({ id: 'o', title: 'Old fox', savedAt: null });
    expect(historyLine({ ...base, nextToDrop: unsaved })).toContain(
      'History is full — the next picture drops “Old fox”, which was never saved as a file.',
    );
    expect(historyLine({ ...base, nextToDrop: { ...unsaved, savedAt: 1 } })).toContain(
      'drops the oldest design (it was saved as a file)',
    );
  });

  it('says when the bytes are nearly used up', () => {
    expect(historyLine({ ...base, usage: { designs: 3, bytes: 142 * MB } })).toContain(
      'History is nearly full (142 of 150 MB).',
    );
  });
});
