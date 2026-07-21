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
  buildThreadRows,
  countSummary,
  matchesSearch,
  roleOf,
  sourceFromValue,
  sourceOptions,
  sourceValue,
  threadLabel,
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
    selectedCount: 489,
    usedCount: null,
    awaitingSource: false,
    owned: new Set(),
    library: [],
    selectedIds: new Set(),
    libraryPersistent: true,
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
    expect(countSummary(state({ paletteMode: false }))).toBe('Full RGB — no thread palette.');
  });

  it('reports permitted and palette size with no limit', () => {
    expect(countSummary(state({ eligibleCount: 489, selectedCount: 489 }))).toBe(
      '489 permitted · 489 in palette.',
    );
  });

  it('reports selected against requested when a limit is in force', () => {
    // "Selected" and "requested" are always both shown: asking for 20
    // and getting 17 is normal, and only NOT a fault if the app says so
    // (M7-COUNT-01).
    const summary = countSummary(
      state({
        policy: { ...defaultPolicy(), count: { mode: 'max', n: 20 } },
        eligibleCount: 489,
        selectedCount: 17,
      }),
    );
    expect(summary).toBe('489 permitted · 17 selected of 20 requested.');
  });

  it('says a limit is pending rather than violated before the first frame', () => {
    // "82 selected of 20 requested" reads as a broken limit; the limit
    // simply has not been applied yet, because selection needs the
    // design's own colours.
    const summary = countSummary(
      state({
        policy: { ...defaultPolicy(), count: { mode: 'max', n: 20 } },
        eligibleCount: 82,
        selectedCount: 82,
        awaitingSource: true,
      }),
    );
    expect(summary).toBe('82 permitted · 20 requested — chosen once an image is loaded.');
  });

  it('adds the used count once a frame has run', () => {
    const summary = countSummary(
      state({
        policy: { ...defaultPolicy(), count: { mode: 'exact', n: 20 } },
        selectedCount: 20,
        usedCount: 18,
      }),
    );
    expect(summary).toContain('20 selected of 20 requested');
    expect(summary).toContain('18 used in the design');
  });
});
