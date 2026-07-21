/**
 * Palette policy resolution (M7-BRAND-02, M7-INV-01, M7-MIX-01).
 *
 * The invariant under everything here: a resolved palette can only ever
 * be a SUBSET of the enabled brands, and every way of ending up with
 * nothing is an explained conflict rather than a throw, an empty
 * silence, or a silent fallback to "all threads".
 */

import { describe, expect, it } from 'vitest';

import {
  defaultPolicy,
  duplicateDisplayColours,
  resolvePermitted,
  type PalettePolicy,
  type PolicyInputs,
} from '../src/core/palette-policy.ts';
import { loadCatalogue, type ThreadCatalogue } from '../src/core/thread-catalogue.ts';
import { thread } from './helpers/threads.ts';

const catalogue: ThreadCatalogue = loadCatalogue();

function policy(overrides: Partial<PalettePolicy> = {}): PalettePolicy {
  return { ...defaultPolicy(), ...overrides };
}

function inputs(overrides: Partial<PolicyInputs> = {}): PolicyInputs {
  return { catalogue, ...overrides };
}

/** Ids of any conflict of the given kind. */
function kinds(conflicts: { kind: string }[]): string[] {
  return conflicts.map((c) => c.kind);
}

describe('brands are the permitted universe', () => {
  it('permits exactly the enabled brands, and nothing else', () => {
    const result = resolvePermitted(policy({ brands: ['dmc'] }), inputs());
    expect(result.ok).toBe(true);
    expect(result.eligible.length).toBe(489);
    expect(result.eligible.every((t) => t.brandId === 'dmc')).toBe(true);
  });

  it('unions two brands in the user-chosen order, without merging on colour', () => {
    const result = resolvePermitted(policy({ brands: ['dmc', 'anchor'] }), inputs());
    const brands = new Set(result.eligible.map((t) => t.brandId));
    expect(brands).toEqual(new Set(['dmc', 'anchor']));
    // Colours overlap heavily across brands; the count must still be
    // the sum, because identity is the thread, not the colour.
    const dmc = resolvePermitted(policy({ brands: ['dmc'] }), inputs()).eligible.length;
    const anchor = resolvePermitted(policy({ brands: ['anchor'] }), inputs()).eligible.length;
    expect(result.eligible.length).toBe(dmc + anchor);
  });

  it('treats no enabled brand as an error, never as full RGB', () => {
    const result = resolvePermitted(policy({ brands: [] }), inputs());
    expect(result.ok).toBe(false);
    expect(result.eligible).toEqual([]);
    expect(kinds(result.conflicts)).toContain('no-brands-enabled');
    expect(result.conflicts[0]?.severity).toBe('error');
    // The explanation names the way out, not just the problem.
    expect(result.conflicts[0]?.message).toContain('Enable at least one brand');
  });

  it('warns about a brand this build does not have, and carries on', () => {
    const result = resolvePermitted(policy({ brands: ['dmc', 'nosuchbrand'] }), inputs());
    expect(result.ok).toBe(true);
    expect(kinds(result.conflicts)).toContain('unknown-brand');
    expect(result.eligible.every((t) => t.brandId === 'dmc')).toBe(true);
  });
});

describe('inventory restriction', () => {
  it('permits only owned threads when ownedOnly is set', () => {
    const owned = new Set(['dmc:310', 'dmc:666']);
    const result = resolvePermitted(policy({ ownedOnly: true }), inputs({ owned }));
    expect(result.ok).toBe(true);
    expect(result.eligible.map((t) => t.id).sort()).toEqual(['dmc:310', 'dmc:666']);
  });

  it('explains an empty inventory rather than falling back to all threads', () => {
    const result = resolvePermitted(
      policy({ ownedOnly: true }),
      inputs({ owned: new Set() }),
    );
    expect(result.ok).toBe(false);
    expect(kinds(result.conflicts)).toContain('owned-none');
    expect(result.eligible).toEqual([]);
  });

  it('ignores the inventory entirely when ownedOnly is off', () => {
    const result = resolvePermitted(policy({ ownedOnly: false }), inputs({ owned: new Set() }));
    expect(result.eligible.length).toBe(489);
  });
});

describe('a strict library palette', () => {
  it('permits only its own threads, in its own order', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'library', paletteId: 'p1' } }),
      inputs({
        libraryPalette: { name: 'Mine', threadIds: ['dmc:666', 'dmc:310'] },
      }),
    );
    expect(result.eligible.map((t) => t.id)).toEqual(['dmc:666', 'dmc:310']);
  });

  it('keeps an unknown reference visible and unusable, never deleted', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'library', paletteId: 'p1' } }),
      inputs({
        libraryPalette: { name: 'Mine', threadIds: ['dmc:310', 'dmc:retired-999'] },
      }),
    );
    expect(result.eligible.map((t) => t.id)).toEqual(['dmc:310']);
    expect(result.unresolved.map((t) => t.id)).toEqual(['dmc:retired-999']);
    expect(result.unresolved[0]?.status).toBe('unresolved');
    expect(kinds(result.conflicts)).toContain('unresolved-entries');
  });

  it('preserves a thread whose brand was disabled, as a conflict', () => {
    const result = resolvePermitted(
      policy({ brands: ['dmc'], source: { kind: 'library', paletteId: 'p1' } }),
      inputs({
        libraryPalette: { name: 'Mine', threadIds: ['dmc:310', 'anchor:403'] },
      }),
    );
    expect(result.eligible.map((t) => t.id)).toEqual(['dmc:310']);
    expect(result.unresolved.map((t) => t.id)).toEqual(['anchor:403']);
  });

  it('errors when the named palette is missing, without substituting', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'library', paletteId: 'gone' } }),
      inputs(),
    );
    expect(result.ok).toBe(false);
    expect(kinds(result.conflicts)).toContain('source-missing');
    expect(result.conflicts[0]?.message).toContain('Nothing was substituted');
  });
});

describe('presets: strict restricts, prefer only nudges', () => {
  it('strict mode narrows the permitted set to the preset', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'preset', presetId: 'x', mode: 'strict' } }),
      inputs({ preset: { name: 'X', threadIds: ['dmc:310', 'dmc:666'], mode: 'strict' } }),
    );
    expect(result.eligible.map((t) => t.id)).toEqual(['dmc:310', 'dmc:666']);
  });

  it('prefer mode leaves the universe open and marks the preset preferred', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'preset', presetId: 'x', mode: 'prefer' } }),
      inputs({ preset: { name: 'X', threadIds: ['dmc:310'], mode: 'prefer' } }),
    );
    expect(result.eligible.length).toBe(489);
    expect(result.preferred.has('dmc:310')).toBe(true);
  });

  it('errors on a strict preset that resolved nothing', () => {
    const result = resolvePermitted(
      policy({ source: { kind: 'preset', presetId: 'x', mode: 'strict' } }),
      inputs({ preset: { name: 'X', threadIds: ['anchor:403'], mode: 'strict' } }),
    );
    expect(result.ok).toBe(false);
    expect(kinds(result.conflicts)).toContain('source-empty');
  });
});

describe('locks, preferences and exclusions', () => {
  it('removes excluded threads from the permitted set', () => {
    const result = resolvePermitted(policy({ excluded: ['dmc:310'] }), inputs());
    expect(result.eligible.some((t) => t.id === 'dmc:310')).toBe(false);
    expect(result.eligible.length).toBe(488);
  });

  it('keeps locks in permitted-set order, not the order they were added', () => {
    const result = resolvePermitted(
      policy({ locked: ['dmc:B5200', 'dmc:310'] }),
      inputs(),
    );
    const eligibleOrder = result.eligible.map((t) => t.id);
    const lockOrder = result.locks.map((t) => t.id);
    expect(lockOrder.length).toBe(2);
    expect(eligibleOrder.indexOf(lockOrder[0] ?? '')).toBeLessThan(
      eligibleOrder.indexOf(lockOrder[1] ?? ''),
    );
  });

  it('reports a lock that is both locked and excluded, applying the exclusion', () => {
    const result = resolvePermitted(
      policy({ locked: ['dmc:310'], excluded: ['dmc:310'] }),
      inputs(),
    );
    expect(kinds(result.conflicts)).toContain('locked-and-excluded');
    expect(result.locks).toEqual([]);
    expect(result.eligible.some((t) => t.id === 'dmc:310')).toBe(false);
  });

  it('keeps an unavailable lock rather than substituting a lookalike', () => {
    const result = resolvePermitted(
      policy({ brands: ['dmc'], locked: ['anchor:403'] }),
      inputs(),
    );
    expect(result.locks).toEqual([]);
    const conflict = result.conflicts.find((c) => c.kind === 'locked-not-permitted');
    expect(conflict?.message).toContain('no substitute was chosen');
  });

  it('errors when every permitted thread has been excluded', () => {
    const all = catalogue.threads.filter((t) => t.brandId === 'dmc').map((t) => t.id);
    const result = resolvePermitted(policy({ excluded: all }), inputs());
    expect(result.ok).toBe(false);
    expect(kinds(result.conflicts)).toContain('empty-permitted-set');
  });
});

describe('duplicate display colours', () => {
  it('reports same-colour threads as a note, and keeps both', () => {
    const entries = [
      thread('310', 'black', [0, 0, 0], { brandId: 'dmc' }),
      thread('403', 'black', [0, 0, 0], { brandId: 'anchor' }),
    ];
    const conflicts = duplicateDisplayColours(entries);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.severity).toBe('warning');
    expect(conflicts[0]?.message).toContain('stay separate references');
  });

  it('says nothing when every colour is distinct', () => {
    const entries = [
      thread('a', 'black', [0, 0, 0]),
      thread('b', 'white', [255, 255, 255]),
    ];
    expect(duplicateDisplayColours(entries)).toEqual([]);
  });
});
