/**
 * Colour profiles (M15-CORE-02, D114): the composition recipe and its
 * resolver to the effective ordered colour table.
 *
 * A profile is a **recipe, never a flat list**: which colour libraries
 * are enabled (thread brands, generated maps, the inventory), an
 * "only colours I own" modifier, explicit per-colour pins, and
 * optional two-pole H/S/B range rules — resolved on demand, every
 * narrowing explained through the M7 conflicts machinery. Explicit
 * membership (a converted saved palette, the Classic built-in) is the
 * degenerate recipe: no libraries, include pins only.
 *
 * Resolution order is the contract (the D46 LUT fingerprint reads the
 * resolved order): libraries union → ownedOnly → ranges → exclude
 * pins → include pins. Include wins over a range rule; exclude wins
 * over everything. Deterministic throughout; nothing throws.
 *
 * The old {@link PalettePolicy} maps through {@link policyToRecipe} —
 * the shared primitive PERSIST-01's migration and UI-01's cutover
 * both use. Until the M15-UI-01 cutover the shipped panel still
 * drives the policy path; this layer is the model it lands on.
 */

import { COLOR_MAP_IDS, generateColorMap } from './color-sources.ts';
import type { PaletteConflict, PalettePolicy, PolicyInputs } from './palette-policy.ts';
import { threadsForBrands, type ThreadCatalogue } from './thread-catalogue.ts';
import type { Thread } from './types.ts';

/**
 * A library a recipe can enable: a thread brand id (`"dmc"`), a
 * generated map (`"map:websafe"`), or the inventory (`"mine"`).
 */
export type ProfileLibraryId = string;

/**
 * One two-pole H/S/B range rule. Poles are inclusive; a missing pole
 * leaves that axis unconstrained. Hue is 0–360 and wraps when
 * `from > to` (350 → 20 spans red across zero); saturation and
 * brightness are 0–100. A recipe may carry several rules — an entry
 * passes if it matches any one of them (union of bands).
 */
export interface HsbRangeRule {
  hue?: [number, number];
  saturation?: [number, number];
  brightness?: [number, number];
}

/** The serialisable composition recipe (D114). */
export interface ColorProfileRecipe {
  /** Enabled libraries, in user order. May be empty for pin-only. */
  libraries: ProfileLibraryId[];
  /** Restrict thread-library content to owned threads (D115: never
   *  applies to `map:`/`user:` entries — they are not ownable). */
  ownedOnly: boolean;
  /** Explicit inclusions, by id. Win over range rules. */
  include: string[];
  /** Explicit exclusions, by id. Win over everything. */
  exclude: string[];
  /** Range rules over library content; empty = no filtering. */
  ranges: HsbRangeRule[];
}

/** A named, versioned profile — the records.ts pattern generalised. */
export interface ColorProfile {
  id: string;
  name: string;
  /** Incremented on every committed edit (library revision rule). */
  revision: number;
  /** Read-only built-in (duplicate-to-edit). */
  builtin: boolean;
  /** Provenance note, e.g. `"builtin"` or `"palette:pal-3"`. */
  createdFrom: string;
  recipe: ColorProfileRecipe;
}

/** What profile resolution reads besides the recipe. */
export interface ProfileInputs {
  catalogue: ThreadCatalogue;
  /** Owned thread ids; consulted only when `ownedOnly`. */
  owned?: ReadonlySet<string> | undefined;
  /** The global My-colours library, for resolving `user:` pins. */
  userColors?: ReadonlyMap<string, Thread> | undefined;
}

/** The resolved effective table plus every explanation. */
export interface ResolvedProfileMembership {
  /** Ordered entries — the effective colour table. */
  entries: Thread[];
  conflicts: PaletteConflict[];
  /** False when the recipe resolves to nothing. */
  ok: boolean;
}

/** An empty, valid recipe — the explicit-membership starting point. */
export function emptyRecipe(): ColorProfileRecipe {
  return { libraries: [], ownedOnly: false, include: [], exclude: [], ranges: [] };
}

/**
 * Pin a colour into a recipe so its membership is certain to hold it:
 * the id joins `include` (once) and leaves `exclude`, because exclusion
 * wins over everything and a pinned-and-excluded colour resolves to a
 * Note, not a seat. Pure — the input is untouched.
 *
 * This is the design-side half of a Must-use pick outside the profile
 * (MUST-01): the seat's promise is kept by widening the design's
 * own copy of the recipe — the D114 (edited)-copy pattern — never the
 * shared profile.
 */
export function pinIntoRecipe(recipe: ColorProfileRecipe, id: string): ColorProfileRecipe {
  return {
    ...recipe,
    include: recipe.include.includes(id) ? [...recipe.include] : [...recipe.include, id],
    exclude: recipe.exclude.filter((pinned) => pinned !== id),
  };
}

/**
 * Undo {@link pinIntoRecipe} for one colour, measured against the
 * linked profile's own recipe: the include goes unless the base has
 * it, and a base exclusion comes back. Narrow on purpose — it restores
 * only what a pin could have changed and never adds a base include the
 * copy lacks — so removing a Must-use returns the copy to the
 * profile's state for that colour and nothing else, with no record of
 * who pinned what. Without a base (an unlinked design) nothing can be
 * proven to have been ours, so the recipe comes back unchanged.
 */
export function unpinFromRecipe(
  recipe: ColorProfileRecipe,
  id: string,
  base: ColorProfileRecipe | undefined,
): ColorProfileRecipe {
  if (base === undefined) return recipe;
  const include = base.include.includes(id)
    ? [...recipe.include]
    : recipe.include.filter((pinned) => pinned !== id);
  const exclude =
    base.exclude.includes(id) && !recipe.exclude.includes(id)
      ? [...recipe.exclude, id]
      : [...recipe.exclude];
  return { ...recipe, include, exclude };
}

/** Join ids into a readable clause, truncating a long list. */
function listIds(ids: readonly string[], max = 3): string {
  if (ids.length <= max) return ids.join(', ');
  return `${ids.slice(0, max).join(', ')} and ${String(ids.length - max)} more`;
}

/** RGB 0–255 → H 0–360, S 0–100, B 0–100 (HSV). Pure arithmetic. */
export function rgbToHsb(rgb: [number, number, number]): [number, number, number] {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = max === 0 ? 0 : (delta / max) * 100;
  return [hue, saturation, max * 100];
}

/** Inclusive pole check; hue wraps when from > to. */
function inPole(value: number, pole: [number, number] | undefined, wraps: boolean): boolean {
  if (pole === undefined) return true;
  const [from, to] = pole;
  if (wraps && from > to) return value >= from || value <= to;
  return value >= from && value <= to;
}

/** True when the entry's colour passes at least one range rule. */
export function matchesRanges(rgb: [number, number, number], rules: readonly HsbRangeRule[]): boolean {
  if (rules.length === 0) return true;
  const [h, s, v] = rgbToHsb(rgb);
  return rules.some(
    (rule) =>
      inPole(h, rule.hue, true) &&
      inPole(s, rule.saturation, false) &&
      inPole(v, rule.brightness, false),
  );
}

/** Resolve one library id to its ordered entries, or null if unknown. */
function libraryEntries(id: ProfileLibraryId, inputs: ProfileInputs): Thread[] | null {
  if (id === 'mine') {
    const owned = inputs.owned ?? new Set<string>();
    return inputs.catalogue.threads.filter((t) => owned.has(t.id));
  }
  if (id.startsWith('map:')) {
    const mapId = id.slice('map:'.length);
    const known = COLOR_MAP_IDS.find((m) => m === mapId);
    return known === undefined ? null : generateColorMap(known).entries;
  }
  if (inputs.catalogue.brands.some((b) => b.id === id)) {
    return threadsForBrands(inputs.catalogue, [id]);
  }
  return null;
}

/** Resolve a pinned id from catalogue, maps, or the user library. */
function resolvePinned(id: string, inputs: ProfileInputs): Thread | undefined {
  const thread = inputs.catalogue.byId.get(id);
  if (thread !== undefined) return thread;
  if (id.startsWith('map:')) {
    const rest = id.slice('map:'.length);
    const mapId = rest.slice(0, rest.indexOf(':'));
    const known = COLOR_MAP_IDS.find((m) => m === mapId);
    if (known === undefined) return undefined;
    return generateColorMap(known).entries.find((e) => e.id === id);
  }
  return inputs.userColors?.get(id);
}

/**
 * Resolve a recipe to the effective ordered colour table, every
 * narrowing explained. The order contract:
 *
 * 1. Enabled libraries union — in recipe order, deduplicated by id.
 * 2. `ownedOnly` intersects **thread content only**; `map:`/`user:`
 *    entries pass through with the distinction named (D115).
 * 3. Range rules filter library content.
 * 4. Exclude pins remove (they win over everything).
 * 5. Include pins restore or append — restored entries keep their
 *    library position, new ones append in pin order.
 */
export function resolveProfileMembership(
  recipe: ColorProfileRecipe,
  inputs: ProfileInputs,
): ResolvedProfileMembership {
  const conflicts: PaletteConflict[] = [];

  // --- 1. libraries -------------------------------------------------
  const union: Thread[] = [];
  const seen = new Set<string>();
  for (const libraryId of recipe.libraries) {
    const entries = libraryEntries(libraryId, inputs);
    if (entries === null) {
      conflicts.push({
        kind: 'unknown-library',
        severity: 'warning',
        ids: [libraryId],
        message: `This build has no colour library "${libraryId}", so it contributes nothing to this profile.`,
      });
      continue;
    }
    for (const entry of entries) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        union.push(entry);
      }
    }
  }
  // "My inventory" is the inventory of the browser this runs in — not
  // in the project file — so a shared design meets an empty inventory
  // first. Name it (COUNT-01): the generic empty-profile sentence sent
  // the owner's reporter after a library, a pin, or an exclusion, none
  // of which was the remedy. The warning itself waits until the table
  // is known (MUST-01): it is due whether the profile still resolves
  // through other libraries or through its pins alone.
  const mineEmpty =
    recipe.libraries.includes('mine') && (inputs.owned === undefined || inputs.owned.size === 0);
  if (recipe.libraries.length === 0 && recipe.include.length === 0) {
    conflicts.push({
      kind: 'no-libraries-enabled',
      severity: 'error',
      ids: [],
      message:
        'This profile has no colour library enabled and no pinned colours, so it resolves to nothing. Enable a library or pin a colour.',
    });
    return { entries: [], conflicts, ok: false };
  }

  // --- 2. ownedOnly -------------------------------------------------
  let narrowed = union;
  if (recipe.ownedOnly) {
    const owned = inputs.owned ?? new Set<string>();
    const synthetic = narrowed.filter(
      (t) => t.brandId.startsWith('map:') || t.brandId === 'user',
    );
    narrowed = narrowed.filter(
      (t) => t.brandId.startsWith('map:') || t.brandId === 'user' || owned.has(t.id),
    );
    if (synthetic.length > 0) {
      // Without this sentence, a map + owned-only profile that kept
      // its generated colours would look like a broken filter — and
      // without the pass-through it would empty silently (D115).
      conflicts.push({
        kind: 'owned-only-passes-synthetic',
        severity: 'warning',
        ids: [],
        message: `"Only colours I own" applies to thread brands; ${String(synthetic.length)} generated or custom colour(s) are not ownable and stay available.`,
      });
    }
  }

  // --- 3. ranges ----------------------------------------------------
  const ranged = narrowed.filter((t) => matchesRanges(t.rgb, recipe.ranges));

  // --- 4 & 5. pins --------------------------------------------------
  const excluded = new Set(recipe.exclude);
  const contradicted = recipe.include.filter((id) => excluded.has(id));
  if (contradicted.length > 0) {
    // The M7-MIX-01 conduct: neither wins silently — exclusion holds,
    // the contradiction is reported for the UI to settle.
    conflicts.push({
      kind: 'include-and-exclude',
      severity: 'warning',
      ids: contradicted,
      message: `${listIds(contradicted)} is both included and excluded in this profile. The exclusion is being applied; remove one of the two to settle it.`,
    });
  }
  const includeIds = new Set(recipe.include.filter((id) => !excluded.has(id)));
  // Include wins over a range rule: a ranged-out library entry that is
  // pinned comes back at its library position.
  const kept = narrowed.filter(
    (t) => !excluded.has(t.id) && (includeIds.has(t.id) || ranged.includes(t)),
  );
  const present = new Set(kept.map((t) => t.id));
  const appended: Thread[] = [];
  const unresolvedPins: string[] = [];
  for (const id of recipe.include) {
    if (excluded.has(id) || present.has(id)) continue;
    const entry = resolvePinned(id, inputs);
    if (entry === undefined) {
      unresolvedPins.push(id);
    } else {
      present.add(id);
      appended.push(entry);
    }
  }
  if (unresolvedPins.length > 0) {
    conflicts.push({
      kind: 'include-unresolved',
      severity: 'warning',
      ids: unresolvedPins,
      message: `${listIds(unresolvedPins)} is pinned into this profile but not available in this build (unknown reference or missing custom colour), so it is not in the resolved table.`,
    });
  }
  const entries = [...kept, ...appended];

  if (entries.length === 0) {
    // Name the proximate emptiness, not a generic failure.
    if (mineEmpty && union.length === 0) {
      conflicts.push({
        kind: 'owned-none',
        severity: 'error',
        ids: [],
        message:
          'This profile draws on My inventory, and that inventory has no threads in this browser. Mark threads as owned under "My inventory", or choose another profile.',
      });
    } else if (recipe.ownedOnly && union.length > 0 && narrowed.length === 0) {
      conflicts.push({
        kind: 'owned-none',
        severity: 'error',
        ids: [],
        message:
          'This profile is restricted to colours you own, but none of its library content is marked as owned. Add threads to your inventory or turn off "only colours I own".',
      });
    } else if (recipe.ranges.length > 0 && narrowed.length > 0 && ranged.length === 0) {
      conflicts.push({
        kind: 'range-empty',
        severity: 'error',
        ids: [],
        message:
          'The colour ranges in this profile exclude everything its libraries provide, so it resolves to nothing. Widen a range or pin a colour.',
      });
    } else {
      conflicts.push({
        kind: 'profile-empty',
        severity: 'error',
        ids: [],
        message:
          'This profile resolves to nothing: everything it contains is excluded or unavailable. Add a library, a pin, or remove an exclusion.',
      });
    }
    return { entries: [], conflicts, ok: false };
  }

  // An empty inventory contributes nothing whether the profile still
  // resolves through other libraries or through its pins alone — the
  // pins-only case is a Must-use design opened on another machine
  // (MUST-01): it renders its seats, and this is what still says where
  // the rest of the profile went.
  if (mineEmpty) {
    conflicts.push({
      kind: 'owned-none',
      severity: 'warning',
      ids: [],
      message:
        'My inventory is enabled, but your inventory has no threads in this browser, so it contributes nothing to this profile.',
    });
  }

  return { entries, conflicts, ok: true };
}

/**
 * Menu groups for the built-in profiles (MENU-01).
 *
 * The gallery reached 25 built-ins in a flat select. Grouping is
 * presentation only — it never touches membership, and the project
 * file stores a `profileRef` by id, so regrouping cannot alter a
 * saved design.
 *
 * The split is *what a user is asking for*: where colours come from
 * (`threads`), the plain utility sets (`basics`), and then styles
 * halved into `nature` and `style`. That last split is the one that
 * earns the grouping — a single "Styles" group would have held 19 of
 * the 25 and left the scrolling untouched. The sixteen gallery
 * profiles fall 8/8 across it, which is the same axis
 * ICE-PROFILES-02's pool A already uses for its own candidates.
 *
 * A profile that genuinely straddles goes to `style`: `nature` stays
 * literal, or it stops meaning anything.
 */
export type ProfileGroup = 'threads' | 'basics' | 'nature' | 'art' | 'design' | 'signal';

/** Group labels in menu order. Order here is the menu's order. */
export const PROFILE_GROUPS: readonly { id: ProfileGroup; label: string }[] = [
  { id: 'threads', label: 'Your threads' },
  { id: 'basics', label: 'Basics' },
  { id: 'nature', label: 'Nature and place' },
  { id: 'art', label: 'Art and craft' },
  { id: 'design', label: 'Design and era' },
  { id: 'signal', label: 'Screen and signal' },
];

/**
 * Which group each built-in sits in, by profile id.
 *
 * Deliberately a lookup beside `builtInProfiles()` rather than a field
 * on `ColorProfile`: built-ins are computed from code, user profiles
 * are persisted, and a field would push a presentation concern into
 * the saved shape for no gain. User profiles are not keyed here — they
 * all render under one "Your profiles" group.
 *
 * A built-in missing from this map is a defect, not a default; the
 * test asserts the two lists match exactly.
 */
export const BUILTIN_PROFILE_GROUPS: Readonly<Record<string, ProfileGroup>> = {
  'builtin:dmc': 'threads',
  'builtin:all-threads': 'threads',
  'builtin:my-threads': 'threads',
  'builtin:bw': 'basics',
  'builtin:retro16': 'basics',
  'builtin:websafe': 'basics',
  'builtin:sepia': 'basics',
  'builtin:pastels': 'basics',
  'builtin:classic': 'basics',
  'builtin:autumn-leaves': 'nature',
  'builtin:golden-hour': 'nature',
  'builtin:winter-frost': 'nature',
  'builtin:deep-sea': 'nature',
  'builtin:rainforest': 'nature',
  'builtin:spring-meadow': 'nature',
  'builtin:moorland': 'nature',
  'builtin:gemstones': 'nature',
  'builtin:neon-noir': 'signal',
  'builtin:de-stijl': 'design',
  'builtin:delft-blue': 'art',
  'builtin:ukiyo-e': 'art',
  'builtin:art-deco': 'design',
  'builtin:mid-century': 'design',
  'builtin:fair-isle': 'art',
  'builtin:fluoro-spot': 'signal',
  // Batch 3 (unsigned).
  'builtin:grisaille': 'art',
  'builtin:chiaroscuro': 'art',
  'builtin:vermilion-madder': 'art',
  'builtin:teal-orange': 'signal',
  'builtin:anodised': 'design',
  'builtin:heraldic': 'signal',
  'builtin:hi-vis': 'signal',
  'builtin:transit': 'signal',
};

/**
 * Menu position of a profile's group: its index in {@link PROFILE_GROUPS},
 * or one past the end for user profiles, which always come last.
 *
 * Callers sort by this before rendering. The option renderer takes group
 * order from first appearance and never sorts behind the caller's back,
 * so without this the menu would follow `builtInProfiles()` definition
 * order instead — which is batch order, not reading order.
 */
export function profileGroupIndex(id: string, builtin: boolean): number {
  if (!builtin) return PROFILE_GROUPS.length;
  const group = BUILTIN_PROFILE_GROUPS[id];
  const at = PROFILE_GROUPS.findIndex((g) => g.id === group);
  return at === -1 ? PROFILE_GROUPS.length : at;
}

/** The group label a profile renders under, built-in or not. */
export function profileGroupLabel(id: string, builtin: boolean): string {
  if (!builtin) return 'Your profiles';
  const group = BUILTIN_PROFILE_GROUPS[id];
  const found = PROFILE_GROUPS.find((g) => g.id === group);
  // An ungrouped built-in is a defect the test catches, but at runtime
  // it must still reach the menu rather than vanish from it.
  return found?.label ?? 'Your profiles';
}

/**
 * The read-only built-in profiles (D114/D115). Computed against the
 * live catalogue so the brand-wide entries follow catalogue releases;
 * "Classic cross stitch" is an honest agent-chosen DMC starter set
 * (a real, usable profile — never a placeholder; the wider gallery is
 * M15-GALLERY-01's owner-paced work).
 */
export function builtInProfiles(catalogue: ThreadCatalogue): ColorProfile[] {
  const allBrands = catalogue.brands.map((b) => b.id);
  const profile = (
    id: string,
    name: string,
    recipe: Partial<ColorProfileRecipe>,
  ): ColorProfile => ({
    id: `builtin:${id}`,
    name,
    revision: 0,
    builtin: true,
    createdFrom: 'builtin',
    recipe: { ...emptyRecipe(), ...recipe },
  });
  // The classic starter set: strong primaries, the standard
  // black/white anchors, and a spread of the DMC families a beginner
  // kit reaches for (greens, blues, reds, browns, greys).
  const classic = [
    '310', 'B5200', '321', '666', '973', '444', '947', '740',
    '699', '700', '702', '907', '796', '797', '336', '995',
    '550', '899', '818', '3371', '434', '801', '762', '415', '317',
  ].map((reference) => `dmc:${reference}`);
  const dmc = (...references: string[]): string[] =>
    references.map((reference) => `dmc:${reference}`);
  // M15-GALLERY-01 batch 1 — owner-signed 2026-08-09 (D140).
  // Curated membership, in deliberate order: order is identity (D46),
  // so a ladder ships reading light-to-dark rather than as a bag.
  const deStijl = dmc('666', '820', '444', '310', 'B5200');
  // One white, not two: B5200 Snow White sat beside 3865 Winter White
  // and took 1.1 % of the image — a slot spent on a near-duplicate
  // (#fafaff vs #f7f7f0). Winter White stays; it is the warmer of the
  // two and reads as glaze rather than paper.
  const delft = dmc('3865', '3752', '932', '931', '930', '3750', '336', '823');
  const ukiyoE = dmc('3865', '3046', '3852', '921', '355', '522', '931', '930', '3750', '3781', '310');
  // M15-GALLERY-01 batch 2 — owner-signed 2026-08-09 (D146).
  // Same split as batch 1 and the same order-is-identity rule: each
  // curated list is written the way it should read, light to dark
  // where the style is a ladder and by ink where it is not.
  //
  // Chrome, cream, two golds, jade, black. The chrome is a real deco
  // colour, not a filler: the style is metal against lacquer. Signed
  // with its residual named, as Neon noir was — Pearl Grey takes
  // 43.8 % of the evidence card, because that card carries a full
  // greyscale ramp and so hands the mid grey area a photograph never
  // would. The alternative was offered and not taken: swapping 415
  // for 3799 (Pewter Grey very dark) buys a deeper shadow and drops
  // Black to 2.6 %. Do not "fix" the grey later without asking.
  const artDeco = dmc('712', '415', '3852', '782', '3814', '310');
  const midCentury = dmc('739', '3820', '921', '3012', '3809', '801');
  // Undyed wool, then the four traditional dyes: madder red, indigo,
  // ochre, moss. Shares 930 with Delft blue on purpose — a thread
  // belongs to as many styles as use it; profiles are not partitions.
  const fairIsle = dmc('3866', '3045', '3052', '3721', '930', '838');
  // The ticket calls this candidate "Risograph print". Risograph is
  // Riso Kagaku's trademark, so the shipped name describes the style
  // instead (D115's naming rule): fluorescent spot inks overprinted
  // on off-white stock. Pink, yellow, green, blue, black, paper.
  const fluoroSpot = dmc('3865', '307', '3805', '996', '912', '310');
  // The violet gap, curated because dyed metal is a specific set,
  // not a band. DMC 3746 is the closest the catalogue comes to an
  // anodised violet (ΔE ~27 from a true one) — the saturation of
  // dyed aluminium is simply outside what thread does. Kept
  // single-brand: the colour is imperfect either way, so there is
  // nothing to buy a second manufacturer for.
  const anodised = dmc('3820', '415', '907', '817', '3746');
  // Seven tinctures, a system fixed for eight centuries, and the
  // second thing in this batch that supplies violet. Ordered by ink
  // the way heraldry lists them — metals first, then the colours —
  // rather than light to dark: this is not a ladder (D46).
  const heraldic = dmc('973', 'BLANC', '666', '797', '701', '552', '310');
  // The only entry in the whole gallery that leaves DMC, and the
  // reason is the name. Hi-vis IS fluorescent yellow-green; DMC's
  // nearest is ΔE ~36 (Lemon — a plain yellow), which would make this
  // a profile that lies about what it is. Ariadna 1697 lands at ΔE
  // ~7. Orange and black stay DMC, so the shopping list costs exactly
  // one extra manufacturer.
  //
  // Three entries, not four: retroreflective silver is real workwear,
  // but DMC 415 took 57.7 % of the evidence card against the fluoro's
  // 14.5 % — grey with accents, not hi-vis. Signed as the gallery's
  // deliberate multi-brand exception (D206); do not "correct" it to
  // DMC without asking, because that quietly renames the profile.
  const hiVis = ['ariadna:1697', ...dmc('971', '310')];
  // Membership as a stated rule: one entry per hue sextant at
  // maximum mutual separation, in wheel order from red. Six, and
  // six is the claim — adding a black or a grey "for completeness"
  // would break the only thing this profile asserts.
  const transit = dmc('666', '973', '702', '3844', '797', '3607');
  return [
    profile('dmc', 'DMC', { libraries: ['dmc'] }),
    profile('all-threads', 'All threads', { libraries: allBrands }),
    // "My inventory", not "My threads" (MYTHREADS-01): the old name read
    // as "the threads I choose" and sent a new user into a profile that
    // is empty by construction. The id stays — saved files reference it.
    profile('my-threads', 'My inventory', { libraries: ['mine'] }),
    profile('bw', 'Black & white', { libraries: ['map:bw'] }),
    profile('retro16', 'Retro 16', { libraries: ['map:retro16'] }),
    profile('websafe', 'Web-safe', { libraries: ['map:websafe'] }),
    profile('sepia', 'Sepia', {
      libraries: allBrands,
      ranges: [{ hue: [18, 50], saturation: [8, 60], brightness: [15, 96] }],
    }),
    profile('pastels', 'Pastels', {
      libraries: allBrands,
      ranges: [{ saturation: [0, 45], brightness: [65, 100] }],
    }),
    profile('classic', 'Classic cross stitch', { include: classic }),
    // --- M15-GALLERY-01 batch 1 — owner-signed 2026-08-09 (D140) -----
    // Rule-shaped where the style genuinely is a band of colour space,
    // curated where a rule would lie about it. A range profile is the
    // *eligible universe* the design's colour-count limit then selects
    // from, so hundreds of entries is the shape (Sepia resolves 346,
    // Pastels 965) — narrowness of character matters, not of count.
    // All eight draw on every brand, signed as such: the multi-brand
    // shopping list is a selection concern, not a membership one.
    profile('autumn-leaves', 'Autumn leaves', {
      libraries: allBrands,
      ranges: [{ hue: [10, 42], saturation: [45, 100], brightness: [22, 78] }],
    }),
    profile('golden-hour', 'Golden hour', {
      libraries: allBrands,
      ranges: [{ hue: [28, 55], saturation: [40, 100], brightness: [72, 100] }],
    }),
    profile('winter-frost', 'Winter frost', {
      libraries: allBrands,
      ranges: [{ hue: [175, 245], saturation: [5, 35], brightness: [70, 100] }],
    }),
    profile('deep-sea', 'Deep sea', {
      libraries: allBrands,
      ranges: [{ hue: [185, 255], saturation: [35, 100], brightness: [8, 45] }],
    }),
    // Three bands, because the style is two saturated poles against
    // near-black rather than one contiguous region: magenta, cyan, and
    // an unhued dark neutral floor for everything the light misses.
    // Retuned twice at review, and the floor is why. The cyan pole
    // started at hue 170 — sea green — and won the image at 43 %
    // while the floor supplied 9 %: the profile rendered tropical.
    // Loosening the floor to saturation 35 then let a dark olive win
    // at 30 %: swampy, no better. The floor has to stay genuinely
    // neutral to read as black, so it is saturation ≤ 12 taken deeper
    // instead (brightness ≤ 35) — 32 near-neutral darks with no greens
    // among them at all. Cyan starts at 188, past green.
    //
    // Signed as-is with a known residual (D140): its largest area is a
    // mid grey-taupe rather than true darkness. A rename was offered
    // and declined — the catalogue holds too few near-blacks to carry
    // the name any harder, and the neon poles do read. Do not "fix"
    // this later without asking; it is a decision, not a defect.
    profile('neon-noir', 'Neon noir', {
      libraries: allBrands,
      ranges: [
        { hue: [285, 335], saturation: [65, 100], brightness: [55, 100] },
        { hue: [188, 208], saturation: [65, 100], brightness: [55, 100] },
        { saturation: [0, 12], brightness: [0, 35] },
      ],
    }),
    profile('de-stijl', 'De Stijl primaries', { include: deStijl }),
    profile('delft-blue', 'Delft blue', { include: delft }),
    profile('ukiyo-e', 'Ukiyo-e woodblock', { include: ukiyoE }),
    // --- M15-GALLERY-01 batch 2 — owner-signed 2026-08-09 (D146) -----
    // Four rules and four lists, chosen against the gaps batch 1 left:
    // the gallery had no greens, no all-hue high chroma and no muted
    // mid-neutrals, and its culture half was all pre-war Europe and
    // Japan. All-brands stands per D140.
    //
    // Rainforest and Spring meadow are deliberately the same hue arc
    // split by brightness — the dark canopy greens and the light
    // meadow greens — which is why neither carries a hue band the
    // other lacks. The seam is at brightness 52.
    profile('rainforest', 'Rainforest', {
      libraries: allBrands,
      ranges: [{ hue: [75, 165], saturation: [40, 100], brightness: [12, 52] }],
    }),
    profile('spring-meadow', 'Spring meadow', {
      libraries: allBrands,
      ranges: [{ hue: [70, 150], saturation: [38, 100], brightness: [52, 98] }],
    }),
    // No hue band at all, and that is the claim: a gem is defined by
    // chroma, not by which hue it happens to be. The rule is the one
    // shape in the gallery that narrows on saturation alone.
    profile('gemstones', 'Gemstones', {
      libraries: allBrands,
      ranges: [{ saturation: [72, 100], brightness: [30, 88] }],
    }),
    // The mirror of Gemstones: everything the weather has taken the
    // colour out of. Heather, peat, bracken and distance all live in
    // one low-saturation mid-brightness band, so one rule holds them.
    profile('moorland', 'Moorland', {
      libraries: allBrands,
      ranges: [{ saturation: [8, 42], brightness: [18, 58] }],
    }),
    profile('art-deco', 'Art deco', { include: artDeco }),
    profile('mid-century', 'Mid-century modern', { include: midCentury }),
    profile('fair-isle', 'Fair Isle', { include: fairIsle }),
    profile('fluoro-spot', 'Fluoro spot print', { include: fluoroSpot }),
    // --- ICE-PROFILES-02 batch 3 — owner-signed 2026-08-24 (D206) ----
    // Picked against the gaps the first sixteen left: no red, no
    // violet, no achromatic ladder, no all-hue dark, one two-pole
    // shape, and nothing from industry. Four rules and four curated,
    // the batch-2 split. Names and membership stand as drafted, the
    // multi-brand hi-vis included; three were retuned under the
    // evidence run before signature (D139's lesson, twice over).
    //
    // The achromatic gap. Black & white is two entries and Greys is
    // four generated levels; nothing thread-backed spanned the range.
    // Chroma ≤ 8 rather than 0 because a dye lot is never neutral —
    // it resolves 138, the narrowest rule in the gallery, and that is
    // the catalogue's honest supply of near-neutrals, not a mistuning.
    profile('grisaille', 'Grisaille', {
      libraries: allBrands,
      ranges: [{ saturation: [0, 8] }],
    }),
    // The all-hue dark gap: every dark profile shipped is hue-locked
    // (Deep sea cool, Rainforest green). Two bands with a deliberate
    // hole between them — the style is shadow against a small bright
    // relief, so the mid-tones are what it must exclude.
    profile('chiaroscuro', 'Chiaroscuro', {
      libraries: allBrands,
      ranges: [{ brightness: [0, 22] }, { saturation: [0, 10], brightness: [92, 100] }],
    }),
    // The red gap. Autumn leaves opens at hue 10 and is orange in
    // practice, so nothing owned red. Wraps through 0 by design.
    profile('vermilion-madder', 'Vermilion and madder', {
      libraries: allBrands,
      ranges: [{ hue: [350, 15], saturation: [58, 100], brightness: [32, 86] }],
    }),
    // The two-pole gap: Neon noir is the only pole shape shipped and
    // it is magenta/cyan. This is the warm/cool grade — a skin arc
    // against a shadow arc, with the greens and magentas left out.
    profile('teal-orange', 'Teal and orange', {
      libraries: allBrands,
      ranges: [
        { hue: [15, 40], saturation: [35, 100], brightness: [30, 95] },
        { hue: [175, 205], saturation: [30, 100], brightness: [20, 80] },
      ],
    }),
    profile('anodised', 'Anodised aluminium', { include: anodised }),
    profile('heraldic', 'Heraldic tinctures', { include: heraldic }),
    profile('hi-vis', 'High-visibility safety', { include: hiVis }),
    profile('transit', 'Transit map lines', { include: transit }),
  ];
}

/**
 * Map an old policy onto the recipe model — the one primitive the
 * PERSIST-01 migration and the UI-01 cutover share, under the D114
 * compatibility waiver: membership semantics carry over best-effort
 * (strict presets and saved palettes become explicit membership;
 * a prefer-mode preset keeps its open universe and loses only its
 * steering half, which retired with the prefer rule), and the caller
 * owns the visible note. Locks stay a design-layer concern
 * (M15-CORE-03) — they are not membership and do not map here.
 */
/**
 * Convert a saved library palette 1:1 into an explicit-membership
 * profile (M15-PERSIST-01, D115): same id, name and revision, order
 * preserved (order is identity — D46), provenance recorded. The D114
 * waiver covers policy semantics, never library data — a palette the
 * user built converts whole.
 */
export function paletteToProfile(palette: {
  id: string;
  name: string;
  revision: number;
  threadIds: readonly string[];
}): ColorProfile {
  return {
    id: palette.id,
    name: palette.name,
    revision: palette.revision,
    builtin: false,
    createdFrom: `palette:${palette.id}`,
    recipe: { ...emptyRecipe(), include: [...palette.threadIds] },
  };
}

export function policyToRecipe(policy: PalettePolicy, inputs: PolicyInputs): ColorProfileRecipe {
  const recipe = emptyRecipe();
  recipe.ownedOnly = policy.ownedOnly;
  recipe.exclude = [...policy.excluded];
  if (policy.source.kind === 'library') {
    const ref = inputs.libraryPalette;
    recipe.include = ref === undefined ? [] : [...ref.threadIds];
    return recipe;
  }
  if (policy.source.kind === 'preset' && policy.source.mode === 'strict') {
    recipe.include = inputs.preset === undefined ? [] : [...inputs.preset.threadIds];
    return recipe;
  }
  recipe.libraries = [...policy.brands];
  return recipe;
}
