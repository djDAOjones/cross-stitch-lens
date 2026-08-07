/**
 * M15-CORE-02: the profile recipe resolver — every narrowing step
 * with its explanation sentence, the ordering contract (the D46 LUT
 * fingerprint reads the resolved order), the built-ins, and the
 * policy → recipe bridge.
 */

import { describe, expect, it } from 'vitest';

import {
  builtInProfiles,
  emptyRecipe,
  matchesRanges,
  policyToRecipe,
  resolveProfileMembership,
  rgbToHsb,
  type ColorProfileRecipe,
  type ProfileInputs,
} from '../src/core/color-profile.ts';
import { userColor } from '../src/core/color-sources.ts';
import { defaultPolicy } from '../src/core/palette-policy.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';

const catalogue = loadCatalogue();

function inputs(overrides: Partial<ProfileInputs> = {}): ProfileInputs {
  return { catalogue, ...overrides };
}

function recipe(overrides: Partial<ColorProfileRecipe> = {}): ColorProfileRecipe {
  return { ...emptyRecipe(), ...overrides };
}

describe('library union (step 1)', () => {
  it('unions in recipe order and deduplicates by id', () => {
    const one = resolveProfileMembership(
      recipe({ libraries: ['dmc', 'map:bw'] }),
      inputs(),
    );
    expect(one.ok).toBe(true);
    // Brand content first, map content after — recipe order.
    expect(one.entries[0]?.brandId).toBe('dmc');
    expect(one.entries.at(-1)?.brandId).toBe('map:bw');
    const ids = one.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves deterministically — same recipe, same table', () => {
    const r = recipe({ libraries: ['dmc', 'map:retro16'] });
    expect(resolveProfileMembership(r, inputs())).toEqual(
      resolveProfileMembership(r, inputs()),
    );
  });

  it('treats "mine" as the inventory-as-library', () => {
    const owned = new Set(['dmc:310', 'dmc:321']);
    const mine = resolveProfileMembership(recipe({ libraries: ['mine'] }), inputs({ owned }));
    expect(mine.entries.map((e) => e.id)).toEqual(['dmc:310', 'dmc:321']);
  });

  it('explains an unknown library and carries on', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['nope', 'map:bw'] }),
      inputs(),
    );
    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(2);
    const conflict = result.conflicts.find((c) => c.kind === 'unknown-library');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toContain('"nope"');
  });

  it('errors an empty recipe with the way out named', () => {
    const result = resolveProfileMembership(recipe(), inputs());
    expect(result.ok).toBe(false);
    const conflict = result.conflicts.find((c) => c.kind === 'no-libraries-enabled');
    expect(conflict?.severity).toBe('error');
    expect(conflict?.message).toContain('Enable a library or pin a colour');
  });
});

describe('ownedOnly (step 2, the D115 carve-out)', () => {
  it('intersects thread content but passes synthetic entries through', () => {
    const owned = new Set(['dmc:310']);
    const result = resolveProfileMembership(
      recipe({ libraries: ['dmc', 'map:bw'], ownedOnly: true }),
      inputs({ owned }),
    );
    expect(result.ok).toBe(true);
    expect(result.entries.map((e) => e.id)).toEqual(['dmc:310', 'map:bw:black', 'map:bw:white']);
    const note = result.conflicts.find((c) => c.kind === 'owned-only-passes-synthetic');
    expect(note?.severity).toBe('warning');
    expect(note?.message).toContain('not ownable');
  });

  it('does not empty a map-only profile under ownedOnly', () => {
    // The exact silent-empty case D115 names: a map plus owned-only
    // with an empty inventory must keep the map.
    const result = resolveProfileMembership(
      recipe({ libraries: ['map:websafe'], ownedOnly: true }),
      inputs({ owned: new Set() }),
    );
    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(216);
  });

  it('errors with the inventory sentence when threads alone empty', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['dmc'], ownedOnly: true }),
      inputs({ owned: new Set() }),
    );
    expect(result.ok).toBe(false);
    const conflict = result.conflicts.find((c) => c.kind === 'owned-none');
    expect(conflict?.severity).toBe('error');
    expect(conflict?.message).toContain('inventory');
  });
});

describe('range rules (step 3)', () => {
  it('converts RGB to HSB correctly at the anchors', () => {
    expect(rgbToHsb([255, 0, 0])).toEqual([0, 100, 100]);
    expect(rgbToHsb([0, 255, 0])[0]).toBe(120);
    expect(rgbToHsb([0, 0, 0])).toEqual([0, 0, 0]);
    expect(rgbToHsb([255, 255, 255])).toEqual([0, 0, 100]);
  });

  it('applies two-pole rules with hue wrap', () => {
    const redWrap = [{ hue: [330, 30] as [number, number] }];
    expect(matchesRanges([255, 0, 0], redWrap)).toBe(true);
    expect(matchesRanges([0, 255, 0], redWrap)).toBe(false);
    // Rose pink, hue ≈ 336 — inside the wrapped band's low side.
    expect(matchesRanges([255, 0, 100], redWrap)).toBe(true);
  });

  it('treats several rules as a union of bands', () => {
    const rules = [{ hue: [110, 130] as [number, number] }, { hue: [230, 250] as [number, number] }];
    expect(matchesRanges([0, 255, 0], rules)).toBe(true);
    expect(matchesRanges([0, 0, 255], rules)).toBe(true);
    expect(matchesRanges([255, 0, 0], rules)).toBe(false);
  });

  it('errors when ranges empty the whole profile, naming the ranges', () => {
    const result = resolveProfileMembership(
      recipe({
        libraries: ['map:bw'],
        // Black and white both fail a mid-saturation demand.
        ranges: [{ saturation: [40, 60] }],
      }),
      inputs(),
    );
    expect(result.ok).toBe(false);
    const conflict = result.conflicts.find((c) => c.kind === 'range-empty');
    expect(conflict?.severity).toBe('error');
    expect(conflict?.message).toContain('Widen a range or pin a colour');
  });
});

describe('pins (steps 4 and 5)', () => {
  it('include wins over a range rule, keeping library position', () => {
    const result = resolveProfileMembership(
      recipe({
        libraries: ['map:bw'],
        ranges: [{ brightness: [90, 100] }],
        include: ['map:bw:black'],
      }),
      inputs(),
    );
    // Black fails the brightness rule but is pinned back — at its
    // library position, ahead of white.
    expect(result.entries.map((e) => e.id)).toEqual(['map:bw:black', 'map:bw:white']);
  });

  it('appends pins from outside the libraries, in pin order', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['map:bw'], include: ['dmc:321', 'dmc:310'] }),
      inputs(),
    );
    expect(result.entries.map((e) => e.id)).toEqual([
      'map:bw:black',
      'map:bw:white',
      'dmc:321',
      'dmc:310',
    ]);
  });

  it('resolves user: pins from the My-colours library', () => {
    const custom = userColor('c1', [220, 20, 60]);
    const result = resolveProfileMembership(
      recipe({ include: ['user:c1'] }),
      inputs({ userColors: new Map([[custom.id, custom]]) }),
    );
    expect(result.ok).toBe(true);
    expect(result.entries[0]?.name).toBe('Crimson');
  });

  it('exclude wins over everything, and the contradiction is a sentence', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['map:bw'], include: ['map:bw:black'], exclude: ['map:bw:black'] }),
      inputs(),
    );
    expect(result.entries.map((e) => e.id)).toEqual(['map:bw:white']);
    const conflict = result.conflicts.find((c) => c.kind === 'include-and-exclude');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toContain('both included and excluded');
  });

  it('explains an unresolvable pin instead of inventing an entry', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['map:bw'], include: ['user:gone', 'dmc:99999'] }),
      inputs(),
    );
    expect(result.ok).toBe(true);
    const conflict = result.conflicts.find((c) => c.kind === 'include-unresolved');
    expect(conflict?.ids).toEqual(['user:gone', 'dmc:99999']);
  });

  it('errors an all-excluded profile with the way out named', () => {
    const result = resolveProfileMembership(
      recipe({ libraries: ['map:bw'], exclude: ['map:bw:black', 'map:bw:white'] }),
      inputs(),
    );
    expect(result.ok).toBe(false);
    expect(result.conflicts.find((c) => c.kind === 'profile-empty')?.severity).toBe('error');
  });
});

describe('built-in profiles', () => {
  it('every built-in resolves non-empty against the shipped catalogue', () => {
    // My-threads needs an inventory to mean anything: resolve it over
    // a small owned set; everything else over the bare catalogue.
    const owned = new Set(['dmc:310']);
    for (const profile of builtInProfiles(catalogue)) {
      const result = resolveProfileMembership(profile.recipe, inputs({ owned }));
      expect(result.ok, `${profile.name} resolves`).toBe(true);
      expect(result.entries.length, `${profile.name} non-empty`).toBeGreaterThan(0);
    }
  });

  it('classic cross stitch resolves every pin — honest, never placeholder', () => {
    const classic = builtInProfiles(catalogue).find((p) => p.id === 'builtin:classic');
    expect(classic).toBeDefined();
    if (classic === undefined) return;
    const result = resolveProfileMembership(classic.recipe, inputs());
    expect(result.conflicts.find((c) => c.kind === 'include-unresolved')).toBeUndefined();
    expect(result.entries.length).toBe(classic.recipe.include.length);
  });

  it('marks every built-in read-only with builtin provenance', () => {
    for (const profile of builtInProfiles(catalogue)) {
      expect(profile.builtin).toBe(true);
      expect(profile.revision).toBe(0);
      expect(profile.createdFrom).toBe('builtin');
      expect(profile.id.startsWith('builtin:')).toBe(true);
    }
  });
});

describe('policyToRecipe (the PERSIST-01 / UI-01 bridge)', () => {
  it('maps brands, ownedOnly and exclusions straight across', () => {
    const policy = {
      ...defaultPolicy(),
      brands: ['dmc', 'anchor'],
      ownedOnly: true,
      excluded: ['dmc:310'],
    };
    const mapped = policyToRecipe(policy, { catalogue });
    expect(mapped.libraries).toEqual(['dmc', 'anchor']);
    expect(mapped.ownedOnly).toBe(true);
    expect(mapped.exclude).toEqual(['dmc:310']);
    expect(mapped.include).toEqual([]);
  });

  it('converts a saved palette to explicit membership, order intact', () => {
    const policy = {
      ...defaultPolicy(),
      source: { kind: 'library', paletteId: 'p1' } as const,
    };
    const mapped = policyToRecipe(policy, {
      catalogue,
      libraryPalette: { name: 'Mine', threadIds: ['dmc:321', 'dmc:310'] },
    });
    expect(mapped.libraries).toEqual([]);
    expect(mapped.include).toEqual(['dmc:321', 'dmc:310']);
  });

  it('converts a strict preset to explicit membership', () => {
    const policy = {
      ...defaultPolicy(),
      source: { kind: 'preset', presetId: 'pastel', mode: 'strict' } as const,
    };
    const mapped = policyToRecipe(policy, {
      catalogue,
      preset: { name: 'Pastel', threadIds: ['dmc:818'], mode: 'strict' },
    });
    expect(mapped.include).toEqual(['dmc:818']);
    expect(mapped.libraries).toEqual([]);
  });

  it('keeps a prefer-mode preset open — the steering half retired', () => {
    const policy = {
      ...defaultPolicy(),
      brands: ['dmc'],
      source: { kind: 'preset', presetId: 'pastel', mode: 'prefer' } as const,
    };
    const mapped = policyToRecipe(policy, {
      catalogue,
      preset: { name: 'Pastel', threadIds: ['dmc:818'], mode: 'prefer' },
    });
    expect(mapped.libraries).toEqual(['dmc']);
    expect(mapped.include).toEqual([]);
  });

  it('never maps locks — they are the design layer (M15-CORE-03)', () => {
    const policy = { ...defaultPolicy(), locked: ['dmc:310'] };
    const mapped = policyToRecipe(policy, { catalogue });
    expect(mapped.include).toEqual([]);
    expect(mapped.exclude).toEqual([]);
  });
});
