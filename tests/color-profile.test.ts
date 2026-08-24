/**
 * M15-CORE-02: the profile recipe resolver — every narrowing step
 * with its explanation sentence, the ordering contract (the D46 LUT
 * fingerprint reads the resolved order), the built-ins, and the
 * policy → recipe bridge.
 */

import { describe, expect, it } from 'vitest';

import {
  BUILTIN_PROFILE_GROUPS,
  PROFILE_GROUPS,
  builtInProfiles,
  emptyRecipe,
  matchesRanges,
  pinIntoRecipe,
  policyToRecipe,
  profileGroupIndex,
  profileGroupLabel,
  resolveProfileMembership,
  rgbToHsb,
  unpinFromRecipe,
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

  it('names the empty inventory when My threads is the whole profile (COUNT-01)', () => {
    // The owner's reporter hit this with a saved My-threads design on
    // a browser that had never marked a thread as owned; the generic
    // sentence sent them after a library, a pin, or an exclusion.
    const result = resolveProfileMembership(
      recipe({ libraries: ['mine'] }),
      inputs({ owned: new Set() }),
    );
    expect(result.ok).toBe(false);
    const conflict = result.conflicts.find((c) => c.kind === 'owned-none');
    expect(conflict?.severity).toBe('error');
    expect(conflict?.message).toContain('inventory has no threads in this browser');
    expect(result.conflicts.some((c) => c.kind === 'profile-empty')).toBe(false);
  });

  it('warns that an empty inventory contributes nothing when other libraries carry the profile', () => {
    const result = resolveProfileMembership(recipe({ libraries: ['mine', 'map:bw'] }), inputs());
    expect(result.ok).toBe(true);
    expect(result.entries).toHaveLength(2);
    const conflict = result.conflicts.find((c) => c.kind === 'owned-none');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toContain('contributes nothing');
  });

  it('still names the empty inventory when the profile resolves through its pins alone (MUST-01)', () => {
    // A Must-use design opened on another machine: its seats are pinned
    // into the copy, so it renders — and this warning is the only thing
    // left saying that the inventory half of the profile is empty here.
    const result = resolveProfileMembership(
      recipe({ libraries: ['mine'], include: ['anchor:403', 'ariadna:1781'] }),
      inputs({ owned: new Set() }),
    );
    expect(result.ok).toBe(true);
    expect(result.entries.map((e) => e.id)).toEqual(['anchor:403', 'ariadna:1781']);
    const conflict = result.conflicts.find((c) => c.kind === 'owned-none');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toContain('contributes nothing');
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

describe('recipe pins (MUST-01 — a Must-use outside the profile widens the copy)', () => {
  it('pins a colour once and lifts its exclusion', () => {
    const before = recipe({ libraries: ['dmc'], exclude: ['anchor:403'] });
    const pinned = pinIntoRecipe(before, 'anchor:403');
    expect(pinned.include).toEqual(['anchor:403']);
    expect(pinned.exclude).toEqual([]);
    expect(pinIntoRecipe(pinned, 'anchor:403').include).toEqual(['anchor:403']);
    // Pure: the input is untouched, and the rest of the recipe rides across.
    expect(before.include).toEqual([]);
    expect(before.exclude).toEqual(['anchor:403']);
    expect(pinned.libraries).toEqual(['dmc']);
  });

  it('resolves the seat an exclusion would otherwise have kept out', () => {
    const pinned = pinIntoRecipe(
      recipe({ libraries: ['map:bw'], exclude: ['map:bw:black'] }),
      'map:bw:black',
    );
    const result = resolveProfileMembership(pinned, inputs());
    expect(result.entries.map((e) => e.id)).toEqual(['map:bw:black', 'map:bw:white']);
    expect(result.conflicts.some((c) => c.kind === 'include-and-exclude')).toBe(false);
  });

  it('unpins against the base: the include goes unless the profile has it, a base exclusion returns', () => {
    const base = recipe({ libraries: ['dmc'], include: ['dmc:310'], exclude: ['dmc:666'] });
    // The design pinned two colours and, through one of them, lifted
    // the profile's own exclusion.
    const copy = pinIntoRecipe(pinIntoRecipe(base, 'anchor:403'), 'dmc:666');
    expect(copy.include).toEqual(['dmc:310', 'anchor:403', 'dmc:666']);
    expect(copy.exclude).toEqual([]);
    const one = unpinFromRecipe(copy, 'anchor:403', base);
    expect(one.include).toEqual(['dmc:310', 'dmc:666']);
    const two = unpinFromRecipe(one, 'dmc:666', base);
    expect(two).toEqual(base);
    // A pin the profile itself carries is the profile's, not ours.
    expect(unpinFromRecipe(two, 'dmc:310', base)).toEqual(base);
    // Pure: the copy is untouched.
    expect(copy.include).toEqual(['dmc:310', 'anchor:403', 'dmc:666']);
  });

  it('unpins nothing without a base — an unlinked design cannot prove a pin was its own', () => {
    const copy = recipe({ include: ['anchor:403'] });
    expect(unpinFromRecipe(copy, 'anchor:403', undefined)).toBe(copy);
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

  it('marks every built-in read-only with builtin provenance', () => {
    for (const profile of builtInProfiles(catalogue)) {
      expect(profile.builtin).toBe(true);
      expect(profile.revision).toBe(0);
      expect(profile.createdFrom).toBe('builtin');
      expect(profile.id.startsWith('builtin:')).toBe(true);
    }
  });

  it('gives every built-in a distinct id and a distinct name', () => {
    // The gallery grows by batches (M15-GALLERY-01); a duplicate name
    // is invisible in the select and a duplicate id silently shadows.
    const profiles = builtInProfiles(catalogue);
    expect(new Set(profiles.map((p) => p.id)).size).toBe(profiles.length);
    expect(new Set(profiles.map((p) => p.name)).size).toBe(profiles.length);
  });

  it('resolves every curated pin', () => {
    // A curated profile is only honest if each colour it names really
    // exists: an unresolved pin ships a shorter palette than its name
    // promises, and does it quietly. This is the *resolution* claim
    // only — see below for the separate pin-only claim, which a future
    // curated profile that also enables a library would rightly break.
    for (const profile of builtInProfiles(catalogue)) {
      if (profile.recipe.include.length === 0) continue;
      const result = resolveProfileMembership(profile.recipe, inputs());
      expect(
        result.conflicts.find((c) => c.kind === 'include-unresolved'),
        `${profile.name} has an unresolved pin`,
      ).toBeUndefined();
      for (const id of profile.recipe.include) {
        expect(
          result.entries.some((t) => t.id === id),
          `${profile.name} is missing pinned ${id}`,
        ).toBe(true);
      }
    }
  });

  it('keeps today’s curated profiles pin-only — membership is the whole recipe', () => {
    // Separate from the claim above on purpose: this one is about the
    // shape the gallery currently uses, not about pins resolving, and
    // it is meant to fail loudly if a curated profile ever also opens
    // a library — at which point the count below stops meaning
    // anything and the profile needs its own reasoning.
    for (const profile of builtInProfiles(catalogue)) {
      if (profile.recipe.include.length === 0) continue;
      expect(profile.recipe.libraries, `${profile.name} opens a library`).toEqual([]);
      const result = resolveProfileMembership(profile.recipe, inputs());
      expect(result.entries.length, `${profile.name} entry count`).toBe(
        profile.recipe.include.length,
      );
    }
  });

  // No test guards against a curated profile carrying two colours the
  // eye cannot separate — the Delft double-white the review caught.
  // One was written and removed: a wasteful duplicate and a deliberate
  // tonal rung have the same signature. That white pair was 21 apart
  // in RGB, but the shipped Classic set has two greens at 18 and
  // Delft's own navies sit at 15, so every threshold that catches the
  // duplicate also condemns a ladder. The difference is intent, which
  // is what owner curation is for — a gate here would be theatre.

  it('keeps every range-shaped built-in a real narrowing, not a relabelled catalogue', () => {
    // The failure a range profile actually has is being so wide it is
    // "All threads" under a prettier name, or so narrow a colour-count
    // limit cannot select from it. The eligible universe is meant to
    // be large (Sepia 346, Pastels 965) — a range profile is what the
    // design's colour-count limit selects *from*, never the palette.
    //
    // Both bounds count DISTINCT COLOURS, not entries: the catalogue's
    // 3,338 threads render as 2,830 distinct colours (D55/D56), so
    // entry count overstates how much a profile really offers the eye.
    //
    // The floor guards the DEFAULT limit of 8 with room to spare, not
    // the maximum: the count field accepts up to 512 (colour-section.ts),
    // and no rule-shaped profile is expected to satisfy that — asking a
    // style for more colours than the style contains is answered by
    // giving fewer, not by widening the style.
    const distinct = (recipe: ColorProfileRecipe): number =>
      new Set(resolveProfileMembership(recipe, inputs()).entries.map((t) => t.hex)).size;
    const total = distinct({ ...emptyRecipe(), libraries: catalogue.brands.map((b) => b.id) });
    for (const profile of builtInProfiles(catalogue)) {
      if (profile.recipe.ranges.length === 0) continue;
      const colours = distinct(profile.recipe);
      expect(colours, `${profile.name} too narrow to select from`).toBeGreaterThan(48);
      expect(colours, `${profile.name} is not a narrowing`).toBeLessThan(total * 0.5);
    }
  });

  it('names the gallery by style, never by trademark', () => {
    // The D115 naming rule, kept as a test because it is the one that
    // a later batch is most likely to break in good faith. The list
    // leans towards the traps a *colour* gallery attracts — brands
    // whose names are commonly used as colour words — rather than
    // brands nobody would reach for when naming a palette.
    //
    // Whole words only. Unanchored, short brand names are substrings of
    // ordinary colour vocabulary: `ral` sits inside "Coral reef", which
    // is a candidate in this very ticket, and `lego` inside "Allegory".
    // A naming guard that rejects legitimate names would be worse than
    // no guard, because the fix looks like renaming the profile.
    const forbidden = new RegExp(
      `\\b(?:${[
        'pantone', 'copic', 'dulux', 'farrow', 'ral',
        // 'riso' earns its place: batch 2 nearly shipped it. The
        // ticket's own candidate list says "Risograph print", and a
        // duplicator brand reads as a print technique rather than as
        // a mark, which is exactly the good-faith failure this guard
        // is for. It ships as "Fluoro spot print" (D144).
        'riso', 'risograph',
        'tiffany', 'hermes', 'hermès', 'barbie', 'coca[- ]?cola', 'ferrari',
        'lego', 'disney', 'pokemon', 'pokémon', 'minecraft', 'stardew', 'nintendo',
        'crayola', 'sharpie', 'instagram', 'starbucks', 'ikea',
        // Film, print and material marks (ICE-PROFILES-02 second pool).
        // 'technicolor' is the one that proves the guard cannot be
        // left alone: it sits in the ticket's own candidate list and
        // passed this test for two batches, because a fixed list can
        // only catch the marks somebody already thought of.
        'technicolor', 'technicolour', 'kodachrome', 'polaroid',
        'formica', 'perspex', 'tarmac', 'astroturf', 'day[- ]?glo', 'letraset',
        // Early-computing marks. The category is new, and every
        // machine that defined a palette also defined a trademark.
        'atari', 'amiga', 'sega', 'game[- ]?boy',
      ].join('|')})\\b`,
      'i',
    );
    // The guard has to still bite, and still let the ticket's own
    // candidates through — both directions, or the anchoring above
    // could silently defang it.
    expect(forbidden.test('Pantone 448 C')).toBe(true);
    expect(forbidden.test('RAL 5013 cobalt')).toBe(true);
    expect(forbidden.test('Risograph print')).toBe(true);
    expect(forbidden.test('Coral reef')).toBe(false);
    expect(forbidden.test('Allegory')).toBe(false);
    // 'riso' must not eat "Risotto" or a hue named for it; whole-word
    // anchoring is the only thing standing between the two.
    expect(forbidden.test('Risotto cream')).toBe(false);
    // The additions bite, including the one that sat in the candidate
    // list unnoticed while the guard passed.
    expect(forbidden.test('Technicolor')).toBe(true);
    expect(forbidden.test('Game Boy green')).toBe(true);
    expect(forbidden.test('Day-Glo poster')).toBe(true);
    // And the words deliberately kept OUT, each for the D139 reason —
    // a guard that rejects a legitimate name is worse than no guard,
    // because the fix looks like renaming the profile.
    //
    // 'spectrum' names a home micro, but it is first an ordinary
    // colour word: guarding it would condemn "Spectral bands".
    expect(forbidden.test('Spectral bands')).toBe(false);
    // 'commodore' names a machine and a naval rank; a maritime
    // palette has every right to it.
    expect(forbidden.test('Commodore blue')).toBe(false);
    // 'tarmac' is whole-word anchored like the rest, so the road
    // surface it was named for still passes.
    expect(forbidden.test('Tarmacadam yard')).toBe(false);
    for (const profile of builtInProfiles(catalogue)) {
      expect(forbidden.test(profile.name), `${profile.name} reads as a trademark`).toBe(false);
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

describe('menu groups (MENU-01)', () => {
  it('groups exactly the built-ins that exist — no orphans, no ghosts', () => {
    // The map and the definitions live in one file precisely so this
    // can be an equality, not a subset: a new built-in that forgets
    // its group fails here rather than silently landing in the wrong
    // half of the menu.
    const ids = builtInProfiles(catalogue).map((p) => p.id);
    expect(new Set(Object.keys(BUILTIN_PROFILE_GROUPS))).toEqual(new Set(ids));
  });

  it('names every group it uses', () => {
    const known = new Set(PROFILE_GROUPS.map((g) => g.id));
    for (const [id, group] of Object.entries(BUILTIN_PROFILE_GROUPS)) {
      expect(known.has(group), `${id} sits in unknown group ${group}`).toBe(true);
    }
  });

  it('keeps no group longer than the flat list it replaced', () => {
    // The point of the exercise. The first taxonomy put 19 of the 25
    // under one heading, which tidied the edges and left the scrolling
    // alone; the shipped split holds nothing over eight. If a batch
    // pushes a group past twelve, re-balance or take the picker
    // (ICE-PICKER-01) — this bound is the trigger, not decoration.
    const sizes = new Map<string, number>();
    for (const group of Object.values(BUILTIN_PROFILE_GROUPS)) {
      sizes.set(group, (sizes.get(group) ?? 0) + 1);
    }
    for (const [group, n] of sizes) {
      expect(n, `group ${group} holds ${String(n)}`).toBeLessThanOrEqual(12);
    }
    // Tripwire, not a rule: the rule is the bound above. This pins the
    // current largest so a batch that reshapes the menu has to say so.
    // Manufacturers is the biggest at 9 — eight brands plus All threads.
    expect(Math.max(...sizes.values())).toBe(9);
  });

  it('labels user profiles as their own group, built-ins by their own', () => {
    expect(profileGroupLabel('builtin:dmc', true)).toBe('Manufacturers');
    expect(profileGroupLabel('builtin:anchor', true)).toBe('Manufacturers');
    // Not a manufacturer and not a style — it is yours.
    expect(profileGroupLabel('builtin:my-threads', true)).toBe('Your profiles');
    expect(profileGroupLabel('builtin:autumn-leaves', true)).toBe('Nature and place');
    expect(profileGroupLabel('builtin:art-deco', true)).toBe('Design and era');
    expect(profileGroupLabel('builtin:ukiyo-e', true)).toBe('Art and craft');
    expect(profileGroupLabel('builtin:transit', true)).toBe('Screen and signal');
    expect(profileGroupLabel('p-whatever', false)).toBe('Your profiles');
  });

  it('sorts into the declared group order, not batch order', () => {
    // The renderer takes group order from first appearance, so the menu
    // follows whatever order the caller supplies. Without this sort it
    // would follow builtInProfiles() — batch order — and a gallery
    // batch would silently reshuffle the menu.
    const ordered = builtInProfiles(catalogue)
      .map((p) => ({ id: p.id, at: profileGroupIndex(p.id, true) }))
      .sort((a, b) => a.at - b.at);
    const labels = [...new Set(ordered.map((p) => profileGroupLabel(p.id, true)))];
    expect(labels).toEqual(PROFILE_GROUPS.map((g) => g.label));
  });

  it('puts user profiles last, alongside My inventory', () => {
    const yours = PROFILE_GROUPS.findIndex((g) => g.id === 'yours');
    expect(profileGroupIndex('p-mine', false)).toBe(yours);
    // My inventory shares that group; everything else comes before it,
    // so a saved profile can never be buried among the built-ins.
    expect(profileGroupIndex('builtin:my-threads', true)).toBe(yours);
    for (const p of builtInProfiles(catalogue)) {
      if (p.id === 'builtin:my-threads') continue;
      expect(profileGroupIndex(p.id, true)).toBeLessThan(yours);
    }
  });

  it('gives every manufacturer its own profile, none privileged', () => {
    // DMC was once the only brand with a built-in, which gave the
    // largest range billing it had not earned.
    const ids = builtInProfiles(catalogue).map((p) => p.id);
    for (const brand of catalogue.brands) {
      expect(ids, `${brand.name} has no profile`).toContain(`builtin:${brand.id}`);
      expect(profileGroupLabel(`builtin:${brand.id}`, true)).toBe('Manufacturers');
    }
  });

  it('does not lose an unknown built-in from the menu', () => {
    // A defect the equality test above catches at build time — but at
    // runtime a profile must still reach the menu rather than vanish.
    expect(profileGroupLabel('builtin:not-a-real-profile', true)).toBe('Your profiles');
  });
});
