/**
 * Palette policy: the one pure place that decides **which threads a
 * conversion is allowed to use** (M7-BRAND-02, M7-INV-01, M7-PAL-01,
 * M7-PRESET-01, M7-MIX-01).
 *
 * Four restrictions compose here, and keeping them separate is the
 * whole design:
 *
 * - **brands** — the allowed universe (which shelves exist at all);
 * - **source** — a strict palette or preset drawn from that universe,
 *   or the universe itself;
 * - **ownedOnly** — the inventory overlay;
 * - **locked / preferred / excluded** — per-thread hard and soft rules.
 *
 * Collapsing any two of these is how "brand enabled" quietly starts
 * meaning "brand preferred". The count limit is deliberately *not*
 * here: it depends on the image, so it lives in `palette-selection.ts`
 * and consumes this module's output.
 *
 * Nothing in here throws. Every failure is a {@link PaletteConflict}
 * with a user-facing sentence, because these are all states a person
 * can reach by clicking two checkboxes — an exception thrown from
 * inside a pixel pipeline is not a UI (M7-MIX-01).
 */

import { paletteOf } from './palette.ts';
import {
  findBrand,
  threadsForBrands,
  unresolvedThread,
  type ThreadCatalogue,
} from './thread-catalogue.ts';
import type { Palette, Thread } from './types.ts';

/** How a preset applies: as the whole allowed set, or as a nudge. */
export type PresetMode = 'strict' | 'prefer';

/**
 * Where the permitted universe comes from, before the inventory and
 * per-thread rules are applied.
 */
export type PaletteSource =
  | { kind: 'brands' }
  | { kind: 'library'; paletteId: string }
  | { kind: 'preset'; presetId: string; mode: PresetMode };

/** `all` ignores `n`; `max` is a ceiling; `exact` is a request. */
export type CountMode = 'all' | 'max' | 'exact';

/** The complete, serialisable colour policy for one project. */
export interface PalettePolicy {
  /** Enabled brand ids, in user order. Empty is an error state. */
  brands: string[];
  source: PaletteSource;
  /** Restrict conversion to threads the user owns. */
  ownedOnly: boolean;
  count: { mode: CountMode; n: number };
  /**
   * Minimum perceptual distance (ΔE76) between chosen threads —
   * a rule about the chosen few, beside count where it belongs
   * (M15-CORE-03, D114). Absent or 0 = off. Must-use seats (locks)
   * are exempt: a hard promise beats a spacing preference.
   */
  minDistance?: number;
  /** Hard inclusions — thread ids. */
  locked: string[];
  /** Soft preferences — thread ids. */
  preferred: string[];
  /** Hard exclusions — thread ids. */
  excluded: string[];
}

/**
 * The default policy: DMC threads, limited to at most eight colours.
 * The at-most-8 default is the owner's call (M14-EXT-13, D91/D92 —
 * superseding D55's unlimited default): a stitchable first result
 * beats a photographic one. Fresh sessions only — the v2→v3 project
 * migration keeps its own inline `all/20` literal, because an old
 * file meant "no limit" when it was saved.
 */
export function defaultPolicy(): PalettePolicy {
  return {
    brands: ['dmc'],
    source: { kind: 'brands' },
    ownedOnly: false,
    count: { mode: 'max', n: 8 },
    locked: [],
    preferred: [],
    excluded: [],
  };
}

/** Every distinguishable way a policy can fail or need explaining.
 *  The `M15` block is the profile resolver's vocabulary
 *  (`color-profile.ts`) — same machinery, same sentence duty. */
export type ConflictKind =
  | 'no-brands-enabled'
  | 'unknown-brand'
  | 'source-missing'
  | 'source-empty'
  | 'unresolved-entries'
  | 'owned-none'
  | 'locked-and-excluded'
  | 'locked-not-permitted'
  | 'preferred-not-permitted'
  | 'empty-permitted-set'
  | 'locks-exceed-count'
  | 'count-exceeds-eligible'
  | 'duplicate-display-colour'
  // M15 profile resolution (M15-CORE-02):
  | 'unknown-library'
  | 'no-libraries-enabled'
  | 'owned-only-passes-synthetic'
  | 'include-and-exclude'
  | 'include-unresolved'
  | 'range-empty'
  | 'profile-empty'
  // M15 selection (M15-CORE-03):
  | 'distance-limits-count';

/**
 * One explained problem. `severity: 'error'` means no valid palette
 * came out; `'warning'` means one did, but the user is owed the reason
 * it is not what they asked for.
 */
export interface PaletteConflict {
  kind: ConflictKind;
  severity: 'error' | 'warning';
  /** Thread (or brand) ids involved; may be empty. */
  ids: string[];
  /** A full user-facing sentence. Never a bare code. */
  message: string;
}

/** The library palette a `library` source points at. */
export interface LibraryPaletteRef {
  name: string;
  /** Ordered thread ids. Unknown ids survive as unresolved entries. */
  threadIds: readonly string[];
  /** Last-known display data, for ids the catalogue no longer has. */
  snapshots?: ReadonlyMap<string, { name: string; hex: string; rgb: [number, number, number] }>;
}

/** A preset already resolved to concrete ids over the enabled brands. */
export interface ResolvedPresetRef {
  name: string;
  threadIds: readonly string[];
  mode: PresetMode;
}

/** Everything the resolver reads that is not the policy itself. */
export interface PolicyInputs {
  catalogue: ThreadCatalogue;
  /** Owned thread ids. Only consulted when `ownedOnly`. */
  owned?: ReadonlySet<string> | undefined;
  /** Required when `source.kind === 'library'`. */
  libraryPalette?: LibraryPaletteRef | undefined;
  /** Required when `source.kind === 'preset'`. */
  preset?: ResolvedPresetRef | undefined;
}

/** The permitted universe plus the per-thread rules, all validated. */
export interface PermittedSet {
  /** Ordered threads a conversion may use. Empty when `ok` is false. */
  eligible: Thread[];
  /** Valid locks, in eligible order — hard inclusions for selection. */
  locks: Thread[];
  /** Valid preferences — a selection nudge, never a guarantee. */
  preferred: Set<string>;
  /** Entries kept visible but not usable (unknown/retired references). */
  unresolved: Thread[];
  conflicts: PaletteConflict[];
  /** False when no conversion is possible under this policy. */
  ok: boolean;
}

/** Join ids into a readable clause, truncating a long list. */
function listIds(ids: readonly string[], max = 3): string {
  if (ids.length <= max) return ids.join(', ');
  return `${ids.slice(0, max).join(', ')} and ${String(ids.length - max)} more`;
}

/**
 * Resolve the permitted universe and the per-thread rules.
 *
 * Order of operations is deliberate and observable: brands first (the
 * universe), then the source (a subset of it), then ownership, then
 * exclusions. A lock is checked against the result of all four, so
 * "locked but you disabled its brand" reports the real reason rather
 * than a generic "not available".
 */
export function resolvePermitted(
  policy: PalettePolicy,
  inputs: PolicyInputs,
): PermittedSet {
  const conflicts: PaletteConflict[] = [];
  const unresolved: Thread[] = [];
  const { catalogue } = inputs;

  const known: string[] = [];
  for (const brandId of policy.brands) {
    if (findBrand(catalogue, brandId) === undefined) {
      conflicts.push({
        kind: 'unknown-brand',
        severity: 'warning',
        ids: [brandId],
        message: `This build has no thread data for brand "${brandId}", so its threads are unavailable.`,
      });
    } else {
      known.push(brandId);
    }
  }

  if (known.length === 0) {
    conflicts.push({
      kind: 'no-brands-enabled',
      severity: 'error',
      ids: [],
      message:
        'No thread brand is enabled, so there is nothing to convert to. Enable at least one brand, or switch to full-RGB mode.',
    });
    return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
  }

  const universe = threadsForBrands(catalogue, known);
  const inUniverse = new Set(universe.map((t) => t.id));

  // --- source ------------------------------------------------------
  let sourced: Thread[] = universe;
  const preferredIds = new Set(policy.preferred);

  if (policy.source.kind === 'library') {
    const ref = inputs.libraryPalette;
    if (ref === undefined) {
      conflicts.push({
        kind: 'source-missing',
        severity: 'error',
        ids: [policy.source.paletteId],
        message: `The saved palette this project uses ("${policy.source.paletteId}") is not in your library. Nothing was substituted for it.`,
      });
      return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
    }
    sourced = [];
    for (const id of ref.threadIds) {
      const thread = catalogue.byId.get(id);
      if (thread === undefined) {
        unresolved.push(unresolvedThread(id, ref.snapshots?.get(id)));
      } else if (inUniverse.has(id)) {
        sourced.push(thread);
      } else {
        // Known thread, disabled brand: a real conflict, not a missing
        // record. The user's choice is preserved, not deleted.
        unresolved.push({ ...thread, status: 'unresolved' });
      }
    }
    if (unresolved.length > 0) {
      conflicts.push({
        kind: 'unresolved-entries',
        severity: 'warning',
        ids: unresolved.map((t) => t.id),
        message: `${String(unresolved.length)} thread(s) in palette "${ref.name}" are unavailable (unknown reference or disabled brand): ${listIds(unresolved.map((t) => t.id))}. They are kept in the palette but excluded from conversion.`,
      });
    }
  } else if (policy.source.kind === 'preset') {
    const preset = inputs.preset;
    if (preset === undefined) {
      conflicts.push({
        kind: 'source-missing',
        severity: 'error',
        ids: [policy.source.presetId],
        message: `Preset "${policy.source.presetId}" is not available in this build.`,
      });
      return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
    }
    const resolved = preset.threadIds.filter((id) => inUniverse.has(id));
    if (preset.mode === 'strict') {
      sourced = resolved.flatMap((id) => {
        const thread = catalogue.byId.get(id);
        return thread === undefined ? [] : [thread];
      });
      if (sourced.length === 0) {
        conflicts.push({
          kind: 'source-empty',
          severity: 'error',
          ids: [],
          message: `No thread in preset "${preset.name}" is available from the enabled brands, so a strict application of it has nothing to convert to.`,
        });
        return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
      }
      if (resolved.length < preset.threadIds.length) {
        conflicts.push({
          kind: 'unresolved-entries',
          severity: 'warning',
          ids: [],
          message: `Preset "${preset.name}" resolved ${String(resolved.length)} of ${String(preset.threadIds.length)} threads from the enabled brands; the rest are unavailable and were not substituted.`,
        });
      }
    } else {
      // Preference mode: the universe stays open, the preset only
      // biases selection. This is the split M7-PRESET-01 insists on.
      for (const id of resolved) preferredIds.add(id);
      if (resolved.length === 0) {
        conflicts.push({
          kind: 'source-empty',
          severity: 'warning',
          ids: [],
          message: `No thread in preset "${preset.name}" is available from the enabled brands, so it is having no effect on the selection.`,
        });
      }
    }
  }

  // --- inventory ---------------------------------------------------
  let permitted = sourced;
  if (policy.ownedOnly) {
    const owned = inputs.owned ?? new Set<string>();
    permitted = permitted.filter((t) => owned.has(t.id));
    if (permitted.length === 0) {
      conflicts.push({
        kind: 'owned-none',
        severity: 'error',
        ids: [],
        message:
          'You have restricted conversion to threads you own, but none of the permitted threads are marked as owned. Add threads to your inventory or turn off "only threads I own".',
      });
      return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
    }
  }

  // --- exclusions --------------------------------------------------
  const excluded = new Set(policy.excluded);
  const bothLockedAndExcluded = policy.locked.filter((id) => excluded.has(id));
  if (bothLockedAndExcluded.length > 0) {
    // Neither state is allowed to win silently: the UI must resolve
    // this at the interaction that created it (M7-MIX-01). Here the
    // exclusion holds, and the lock is reported as ignored.
    conflicts.push({
      kind: 'locked-and-excluded',
      severity: 'warning',
      ids: bothLockedAndExcluded,
      message: `${listIds(bothLockedAndExcluded)} is both locked and excluded. The exclusion is being applied; remove one of the two to settle it.`,
    });
  }
  const eligible = permitted.filter((t) => !excluded.has(t.id));

  if (eligible.length === 0) {
    conflicts.push({
      kind: 'empty-permitted-set',
      severity: 'error',
      ids: [],
      message:
        'Every permitted thread has been excluded, so there is nothing left to convert to. Remove an exclusion to continue.',
    });
    return { eligible: [], locks: [], preferred: new Set(), unresolved, conflicts, ok: false };
  }

  // --- locks and preferences ---------------------------------------
  const eligibleIds = new Set(eligible.map((t) => t.id));
  const lockedSet = new Set(policy.locked.filter((id) => eligibleIds.has(id)));
  const rejectedLocks = policy.locked.filter(
    (id) => !eligibleIds.has(id) && !excluded.has(id),
  );
  if (rejectedLocks.length > 0) {
    conflicts.push({
      kind: 'locked-not-permitted',
      severity: 'warning',
      ids: rejectedLocks,
      message: `${listIds(rejectedLocks)} is locked but not in the permitted set (disabled brand, not owned, or outside the selected palette). The lock is kept for when it becomes available; no substitute was chosen.`,
    });
  }
  const rejectedPrefs = [...preferredIds].filter((id) => !eligibleIds.has(id));
  if (rejectedPrefs.length > 0) {
    conflicts.push({
      kind: 'preferred-not-permitted',
      severity: 'warning',
      ids: rejectedPrefs,
      message: `${String(rejectedPrefs.length)} preferred thread(s) are not in the permitted set and are being ignored.`,
    });
  }

  // Locks keep eligible order, so the resulting palette order — which
  // is the nearest-match tie-break — never depends on the order the
  // user happened to click the locks in.
  const locks = eligible.filter((t) => lockedSet.has(t.id));
  const preferred = new Set([...preferredIds].filter((id) => eligibleIds.has(id)));

  return { eligible, locks, preferred, unresolved, conflicts, ok: true };
}

/** A permitted set narrowed to a final ordered palette. */
export interface ResolvedPalette {
  palette: Palette;
  /** Entries kept visible in the UI but not usable for conversion. */
  unresolved: Thread[];
  conflicts: PaletteConflict[];
  /** Threads permitted before the count limit was applied. */
  eligibleCount: number;
  /** Threads in the resulting palette. */
  selectedCount: number;
  /** How many of those came from locks. */
  lockedCount: number;
  ok: boolean;
}

/**
 * Report threads that share a display RGB with an earlier entry.
 *
 * This is a warning, never a merge: the records stay distinct because
 * they are distinct purchases (M7-BRAND-01). What the user needs to
 * know is that the rendered design cannot tell them apart by eye, and
 * that palette order decides which one a stitch is labelled with.
 */
export function duplicateDisplayColours(entries: readonly Thread[]): PaletteConflict[] {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const entry of entries) {
    const key = entry.hex;
    const first = seen.get(key);
    if (first === undefined) seen.set(key, entry.id);
    else collisions.push(`${entry.id} (same colour as ${first})`);
  }
  if (collisions.length === 0) return [];
  return [
    {
      kind: 'duplicate-display-colour',
      severity: 'warning',
      ids: collisions,
      message: `${String(collisions.length)} thread(s) share a display colour with an earlier entry: ${listIds(collisions, 2)}. They stay separate references, but the preview cannot show the difference and palette order decides which one a stitch is labelled with.`,
    },
  ];
}

/**
 * Build the palette for a policy that needs no image — i.e. `count.mode
 * === 'all'`. Count-limited policies go through
 * `selectPalette` in `palette-selection.ts`, which needs the source
 * colour distribution.
 */
export function resolveFullPalette(
  policy: PalettePolicy,
  inputs: PolicyInputs,
  name: string,
): ResolvedPalette {
  const permitted = resolvePermitted(policy, inputs);
  const conflicts = [
    ...permitted.conflicts,
    ...duplicateDisplayColours(permitted.eligible),
  ];
  return {
    palette: paletteOf(name, permitted.eligible),
    unresolved: permitted.unresolved,
    conflicts,
    eligibleCount: permitted.eligible.length,
    selectedCount: permitted.eligible.length,
    lockedCount: permitted.locks.length,
    ok: permitted.ok,
  };
}
