/**
 * The Colour panel's pure model (the tested half of
 * src/ui/palette-panel.ts). DOM rendering is verified in the running
 * app; what is asserted here is the logic a user can get wrong by
 * clicking — above all that the three per-thread rules stay disjoint,
 * so "locked and excluded" is never something the UI can create.
 */

import { describe, expect, it } from 'vitest';

import { defaultPolicy, type PalettePolicy } from '../src/core/palette-policy.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';
import {
  buildPaletteEntryRows,
  buildThreadRows,
  bulkOwnershipTargets,
  conflictsFingerprint,
  countSummary,
  editorFingerprint,
  filteredThreads,
  moveEntry,
  matchesSearch,
  roleOf,
  sourceFingerprint,
  sourceFromValue,
  sourceOptions,
  sourceValue,
  threadLabel,
  threadsFingerprint,
  withRole,
  type PalettePanelState,
} from '../src/ui/palette-panel.ts';
import type { LibraryPalette } from '../src/library/records.ts';
import { thread } from './helpers/threads.ts';

const catalogue = loadCatalogue();

function state(overrides: Partial<PalettePanelState> = {}): PalettePanelState {
  return {
    policy: defaultPolicy(),
    paletteMode: true,
    conflicts: [],
    eligibleCount: 489,
    owned: new Set(),
    library: [],
    selectedIds: new Set(),
    libraryPersistent: true,
    deletedPalette: null,
    ...overrides,
  };
}

describe('threadLabel', () => {
  it('reads brand, reference, then name', () => {
    const t = thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' });
    expect(threadLabel(t, catalogue.brands)).toBe('DMC 310 Black');
  });

  it('falls back to the raw brand id for an unknown brand', () => {
    const t = thread('1', 'x', [0, 0, 0], { brandId: 'mystery' });
    expect(threadLabel(t, catalogue.brands)).toBe('mystery 1 x');
  });
});

describe('per-thread roles stay disjoint', () => {
  it('reads the role back out of a policy', () => {
    const policy: PalettePolicy = {
      ...defaultPolicy(),
      locked: ['a'],
      preferred: ['b'],
      excluded: ['c'],
    };
    expect(roleOf(policy, 'a')).toBe('locked');
    expect(roleOf(policy, 'b')).toBe('preferred');
    expect(roleOf(policy, 'c')).toBe('excluded');
    expect(roleOf(policy, 'd')).toBe('none');
  });

  it('setting one role clears the other two', () => {
    // The contradiction the resolver has to report is one a FILE can
    // contain, not one the UI can produce (M7-MIX-01).
    let policy = withRole(defaultPolicy(), 'x', 'locked');
    expect(policy.locked).toEqual(['x']);
    policy = withRole(policy, 'x', 'excluded');
    expect(policy.locked).toEqual([]);
    expect(policy.excluded).toEqual(['x']);
    policy = withRole(policy, 'x', 'preferred');
    expect(policy.excluded).toEqual([]);
    expect(policy.preferred).toEqual(['x']);
    policy = withRole(policy, 'x', 'none');
    expect(policy.locked).toEqual([]);
    expect(policy.preferred).toEqual([]);
    expect(policy.excluded).toEqual([]);
  });

  it('leaves the rules on other threads alone', () => {
    const start: PalettePolicy = { ...defaultPolicy(), locked: ['a', 'b'] };
    expect(withRole(start, 'a', 'none').locked).toEqual(['b']);
  });

  it('never mutates the policy it was given', () => {
    const start = defaultPolicy();
    withRole(start, 'x', 'locked');
    expect(start.locked).toEqual([]);
  });
});

describe('palette source select', () => {
  const library: LibraryPalette[] = [
    { id: 'p1', name: 'Mine', revision: 1, createdFrom: 'brands', threadIds: [] },
  ];

  it('offers brands, every preset, and every saved palette', () => {
    const options = sourceOptions(library).map(([value]) => value);
    expect(options[0]).toBe('brands');
    expect(options).toContain('preset:pastel');
    expect(options).toContain('library:p1');
  });

  it('round-trips a source through its select value', () => {
    for (const source of [
      { kind: 'brands' } as const,
      { kind: 'library', paletteId: 'p1' } as const,
      { kind: 'preset', presetId: 'pastel', mode: 'strict' } as const,
    ]) {
      const policy: PalettePolicy = { ...defaultPolicy(), source };
      expect(sourceFromValue(sourceValue(policy), policy)).toEqual(source);
    }
  });

  it('keeps the chosen preset mode when switching between presets', () => {
    const policy: PalettePolicy = {
      ...defaultPolicy(),
      source: { kind: 'preset', presetId: 'pastel', mode: 'prefer' },
    };
    expect(sourceFromValue('preset:earth', policy)).toEqual({
      kind: 'preset',
      presetId: 'earth',
      mode: 'prefer',
    });
  });

  it('defaults a new preset to strict', () => {
    expect(sourceFromValue('preset:earth', defaultPolicy())).toEqual({
      kind: 'preset',
      presetId: 'earth',
      mode: 'strict',
    });
  });
});

describe('buildThreadRows', () => {
  it('shows only threads from enabled brands', () => {
    const { rows } = buildThreadRows(catalogue, state(), '');
    expect(rows.every((r) => r.thread.brandId === 'dmc')).toBe(true);
  });

  it('caps the list and reports the true total', () => {
    const { rows, total } = buildThreadRows(catalogue, state(), '', 10);
    expect(rows).toHaveLength(10);
    expect(total).toBe(489);
  });

  it('filters by brand, reference or name, case-insensitively', () => {
    const { rows, total } = buildThreadRows(catalogue, state(), 'TURQUOISE');
    expect(total).toBeGreaterThan(0);
    expect(rows.every((r) => r.label.toLowerCase().includes('turquoise'))).toBe(true);
  });

  it('marks owned, ruled and selected threads', () => {
    const { rows } = buildThreadRows(
      catalogue,
      state({
        owned: new Set(['dmc:310']),
        selectedIds: new Set(['dmc:310']),
        policy: { ...defaultPolicy(), locked: ['dmc:310'] },
      }),
      '310',
    );
    const row = rows.find((r) => r.thread.id === 'dmc:310');
    expect(row?.owned).toBe(true);
    expect(row?.selected).toBe(true);
    expect(row?.role).toBe('locked');
  });
});

describe('matchesSearch', () => {
  const row = {
    thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }),
    label: 'DMC 310 Black',
    owned: false,
    role: 'none' as const,
    selected: false,
  };

  it('matches everything on an empty or whitespace query', () => {
    expect(matchesSearch(row, '')).toBe(true);
    expect(matchesSearch(row, '   ')).toBe(true);
  });

  it('matches on any part of the label', () => {
    expect(matchesSearch(row, 'dmc')).toBe(true);
    expect(matchesSearch(row, '310')).toBe(true);
    expect(matchesSearch(row, 'blac')).toBe(true);
    expect(matchesSearch(row, 'green')).toBe(false);
  });
});

describe('countSummary', () => {
  it('says so plainly in full-RGB mode', () => {
    expect(countSummary(state({ paletteMode: false }))).toBe('Unlimited colours — no thread palette.');
  });

  it('reports availability alone — Stats owns the other figures (M14-EXT-42)', () => {
    // The selected/requested/used copies this line once carried were
    // the third copy of Stats' numbers (EXT-21). Availability is the
    // one figure with no other home.
    expect(countSummary(state({ eligibleCount: 489 }))).toBe('489 threads available.');
    expect(countSummary(state({ eligibleCount: 1 }))).toBe('1 thread available.');
  });

  it('defaults to a limit of eight (M14-EXT-13, D98)', () => {
    // The fresh-session default is at-most-8 — a stitchable first
    // result, never silent (Stats carries the limit line).
    expect(defaultPolicy().count).toEqual({ mode: 'max', n: 8 });
  });
});

describe('moveEntry', () => {
  it('moves an item up and down', () => {
    expect(moveEntry(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveEntry(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the ends rather than wrapping', () => {
    // Wrapping would silently send the first entry to the bottom of a
    // palette the user was only nudging.
    expect(moveEntry(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveEntry(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('ignores an out-of-range index', () => {
    expect(moveEntry(['a', 'b'], 5, -1)).toEqual(['a', 'b']);
    expect(moveEntry(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
  });

  it('never mutates its input', () => {
    const start = ['a', 'b', 'c'];
    moveEntry(start, 0, 1);
    expect(start).toEqual(['a', 'b', 'c']);
  });

  it('preserves length and membership', () => {
    const moved = moveEntry(['a', 'b', 'c', 'd'], 3, -1);
    expect(moved).toHaveLength(4);
    expect([...moved].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('bulkOwnershipTargets', () => {
  it('spans the whole filter, not just the rendered page', () => {
    // The table caps at 60 rows; a bulk action that only touched those
    // would silently do less than its label says.
    const ids = bulkOwnershipTargets(catalogue, state(), '', true);
    expect(ids).toHaveLength(489);
    expect(buildThreadRows(catalogue, state(), '').rows.length).toBeLessThan(ids.length);
  });

  it('counts only threads whose state would actually change', () => {
    const owned = new Set(['dmc:310', 'dmc:666']);
    const toOwn = bulkOwnershipTargets(catalogue, state({ owned }), '', true);
    expect(toOwn).toHaveLength(487);
    expect(toOwn).not.toContain('dmc:310');
  });

  it('is bounded by the search, so a narrow filter cannot mark everything', () => {
    const ids = bulkOwnershipTargets(catalogue, state(), 'turquoise', true);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThan(489);
  });

  it('is bounded by the enabled brands', () => {
    const ids = bulkOwnershipTargets(
      catalogue,
      state({ policy: { ...defaultPolicy(), brands: ['dmc'] } }),
      '',
      true,
    );
    expect(ids.every((id) => id.startsWith('dmc:'))).toBe(true);
  });

  it('returns nothing to un-own when nothing is owned', () => {
    expect(bulkOwnershipTargets(catalogue, state(), '', false)).toEqual([]);
  });
});

describe('filteredThreads', () => {
  it('returns every match, uncapped', () => {
    expect(filteredThreads(catalogue, state(), '')).toHaveLength(489);
  });
});

describe('buildPaletteEntryRows', () => {
  const palette: LibraryPalette = {
    id: 'p1',
    name: 'Mine',
    revision: 3,
    createdFrom: 'brands',
    threadIds: ['dmc:310', 'anchor:403'],
  };

  it('lists entries in palette order with readable labels', () => {
    const rows = buildPaletteEntryRows(palette, catalogue);
    expect(rows.map((r) => r.id)).toEqual(['dmc:310', 'anchor:403']);
    expect(rows[0]?.label).toContain('DMC 310');
    expect(rows[0]?.unresolved).toBe(false);
  });

  it('keeps an entry the catalogue no longer has, and says so', () => {
    // The slot has to survive: a thread dropped by a catalogue release
    // must stay visible and movable, not silently vanish from a palette
    // the user built (M7-PAL-01).
    const rows = buildPaletteEntryRows(
      { ...palette, threadIds: ['dmc:310', 'gone:999'] },
      catalogue,
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]?.unresolved).toBe(true);
    expect(rows[1]?.label).toContain('not in this catalogue');
  });

  it('handles an empty palette', () => {
    expect(buildPaletteEntryRows({ ...palette, threadIds: [] }, catalogue)).toEqual([]);
  });
});

describe('rebuild fingerprints (M14-EXT-43)', () => {
  // The regression this pins: update() runs on every processed frame
  // during live capture, and rebuilding a region under an open native
  // select popup snaps it shut before a choice can be made. A region
  // may rebuild only when its *structure* changed — never for a
  // value-only change, and never for an identical state.
  const palette: LibraryPalette = {
    id: 'pal-1',
    name: 'Mine',
    revision: 3,
    createdFrom: 'brands',
    threadIds: ['dmc:310', 'anchor:403'],
  };

  it('an unchanged state produces identical fingerprints everywhere', () => {
    const a = state();
    const b = state();
    expect(sourceFingerprint(b)).toBe(sourceFingerprint(a));
    expect(editorFingerprint(b)).toBe(editorFingerprint(a));
    expect(conflictsFingerprint(b.conflicts)).toBe(conflictsFingerprint(a.conflicts));
    const rowsA = buildThreadRows(catalogue, a, '');
    const rowsB = buildThreadRows(catalogue, b, '');
    expect(threadsFingerprint(rowsB.rows)).toBe(threadsFingerprint(rowsA.rows));
  });

  it('frame-level changes are value-level: counts, usage, roles, ownership', () => {
    const a = state();
    // What a processed frame can move: used counts, chosen threads,
    // per-thread roles, ownership. None of it may force a rebuild.
    const b = state({
      owned: new Set(['dmc:310']),
      policy: {
        ...defaultPolicy(),
        locked: ['dmc:310'],
        count: { mode: 'max', n: 12 },
      },
      selectedIds: new Set(['dmc:310']),
    });
    expect(sourceFingerprint(b)).toBe(sourceFingerprint(a));
    expect(editorFingerprint(b)).toBe(editorFingerprint(a));
    const rowsA = buildThreadRows(catalogue, a, '');
    const rowsB = buildThreadRows(catalogue, b, '');
    expect(threadsFingerprint(rowsB.rows)).toBe(threadsFingerprint(rowsA.rows));
  });

  it('the selected source value is deliberately not structure', () => {
    // Arrowing through the closed select fires a change per step; a
    // rebuild then would drop focus mid-gesture. Only the option list
    // and the preset-mode reveal are structural.
    const brandsA = state();
    const withLibrary = state({ library: [palette] });
    const chosen = state({
      library: [palette],
      policy: { ...defaultPolicy(), source: { kind: 'library', paletteId: 'pal-1' } },
    });
    expect(sourceFingerprint(chosen)).toBe(sourceFingerprint(withLibrary));
    expect(sourceFingerprint(withLibrary)).not.toBe(sourceFingerprint(brandsA));
  });

  it('structural changes are seen: library list, preset reveal, conflicts, editor', () => {
    const base = state();
    expect(sourceFingerprint(state({ library: [palette] }))).not.toBe(sourceFingerprint(base));
    expect(
      sourceFingerprint(
        state({
          policy: {
            ...defaultPolicy(),
            source: { kind: 'preset', presetId: 'pastel', mode: 'strict' },
          },
        }),
      ),
    ).not.toBe(sourceFingerprint(base));
    expect(
      conflictsFingerprint([
        {
          kind: 'no-brands-enabled',
          severity: 'error',
          ids: [],
          message: 'No thread brand is enabled.',
        },
      ]),
    ).not.toBe(conflictsFingerprint([]));
    const editing = state({
      library: [palette],
      policy: { ...defaultPolicy(), source: { kind: 'library', paletteId: 'pal-1' } },
    });
    const reordered = state({
      library: [{ ...palette, revision: 4, threadIds: ['anchor:403', 'dmc:310'] }],
      policy: { ...defaultPolicy(), source: { kind: 'library', paletteId: 'pal-1' } },
    });
    expect(editorFingerprint(editing)).not.toBe(editorFingerprint(reordered));
    expect(editorFingerprint(base)).toBe('none');
  });

  it('a narrowed row set changes the thread fingerprint', () => {
    const a = state();
    const all = buildThreadRows(catalogue, a, '');
    const narrowed = buildThreadRows(catalogue, a, '310');
    expect(threadsFingerprint(narrowed.rows)).not.toBe(threadsFingerprint(all.rows));
  });
});
