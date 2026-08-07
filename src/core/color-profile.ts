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
    if (recipe.ownedOnly && union.length > 0 && narrowed.length === 0) {
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

  return { entries, conflicts, ok: true };
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
  return [
    profile('dmc', 'DMC', { libraries: ['dmc'] }),
    profile('all-threads', 'All threads', { libraries: allBrands }),
    profile('my-threads', 'My threads', { libraries: ['mine'] }),
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
