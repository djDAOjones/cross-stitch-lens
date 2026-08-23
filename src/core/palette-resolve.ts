/**
 * The one entry point that turns a {@link PalettePolicy} into the
 * ordered palette the pipeline runs against.
 *
 * It exists so there is exactly one place where brands, source,
 * inventory, locks and the colour-count limit are composed in a fixed
 * order — the alternative is each caller composing them slightly
 * differently and the UI reporting a set the worker did not use.
 */

import {
  resolveProfileMembership,
  type ColorProfileRecipe,
  type ProfileInputs,
} from './color-profile.ts';
import type { ToneConfig } from './color/tone.ts';
import {
  duplicateDisplayColours,
  resolvePermitted,
  type PaletteConflict,
  type PalettePolicy,
  type PermittedSet,
  type PolicyInputs,
  type ResolvedPalette,
} from './palette-policy.ts';
import {
  applyColourFloor,
  buildDistribution,
  selectThreads,
  type FloorRule,
} from './palette-selection.ts';
import { paletteOf } from './palette.ts';
import type { PixelBuffer } from './types.ts';

/** Everything one resolution needs. */
export interface PaletteRequest {
  policy: PalettePolicy;
  inputs: PolicyInputs;
  /**
   * The grid-sized source buffer, for count-limited selection. Omit it
   * (before the first frame) and a count-limited policy resolves to
   * the full permitted set — a temporary over-supply that the next
   * frame narrows, never a silently violated limit, because the
   * pipeline has not run yet either.
   */
  source?: PixelBuffer | undefined;
  /** Palette name for display and export. */
  name: string;
}

/**
 * Resolve a policy to a palette.
 *
 * The count limit is applied last, on purpose: it selects *from* the
 * permitted set, so it can never widen one. A limit is therefore
 * incapable of reaching a thread the brand, inventory, or exclusion
 * rules ruled out — the invariant M7-ACCEPT-01 checks by asserting
 * every output reference belongs to the resolved permitted set.
 */
export function resolveProjectPalette(request: PaletteRequest): ResolvedPalette {
  const { policy, inputs, name } = request;
  const permitted = resolvePermitted(policy, inputs);
  const conflicts: PaletteConflict[] = [...permitted.conflicts];

  if (!permitted.ok) {
    return {
      palette: paletteOf(name, []),
      unresolved: permitted.unresolved,
      conflicts,
      eligibleCount: 0,
      selectedCount: 0,
      lockedCount: 0,
      ok: false,
    };
  }

  const eligibleCount = permitted.eligible.length;
  const source = policy.count.mode === 'all' ? undefined : request.source;

  if (source === undefined) {
    conflicts.push(...duplicateDisplayColours(permitted.eligible));
    return {
      palette: paletteOf(name, permitted.eligible),
      unresolved: permitted.unresolved,
      conflicts,
      eligibleCount,
      selectedCount: eligibleCount,
      lockedCount: permitted.locks.length,
      ok: true,
    };
  }

  const target = policy.count.n;
  if (permitted.locks.length > target) {
    conflicts.push({
      kind: 'locks-exceed-count',
      severity: 'warning',
      ids: permitted.locks.map((t) => t.id),
      message: `You have locked ${String(permitted.locks.length)} threads but asked for ${String(target)}. Every lock is being kept, so the palette has ${String(permitted.locks.length)} colours — unlock some, or raise the limit.`,
    });
  }
  if (target > eligibleCount) {
    const threads = eligibleCount === 1 ? 'thread is' : 'threads are';
    const all = eligibleCount === 1 ? 'it is' : `all ${String(eligibleCount)} are`;
    conflicts.push({
      kind: 'count-exceeds-eligible',
      severity: 'warning',
      ids: [],
      message: `You asked for ${String(target)} colours but only ${String(eligibleCount)} ${threads} permitted, so ${all} being used.`,
    });
  }

  const distribution = buildDistribution(source);
  const minDistance = policy.minDistance ?? 0;
  const selection = selectThreads(permitted, target, distribution, minDistance);

  if (selection.distanceLimited) {
    // Count and distance both held; distance won the conflict — the
    // sentence names both dials (M15-CORE-03).
    conflicts.push({
      kind: 'distance-limits-count',
      severity: 'warning',
      ids: [],
      message: `You asked for ${String(target)} colours at a minimum distance of ${String(minDistance)}; only ${String(selection.threads.length)} threads fit that far apart. Lower the distance or the colour count to change the balance.`,
    });
  } else if (
    policy.count.mode === 'exact' &&
    selection.threads.length < target &&
    target <= eligibleCount &&
    permitted.locks.length <= target
  ) {
    conflicts.push({
      kind: 'count-exceeds-eligible',
      severity: 'warning',
      ids: [],
      message: `You asked for exactly ${String(target)} colours; ${String(selection.threads.length)} were selected because the design does not contain enough distinguishable colours to justify more.`,
    });
  }

  conflicts.push(...duplicateDisplayColours(selection.threads));

  return {
    palette: paletteOf(name, selection.threads),
    unresolved: permitted.unresolved,
    conflicts,
    eligibleCount,
    selectedCount: selection.threads.length,
    lockedCount: selection.lockedCount,
    ok: true,
  };
}

/** The highest severity present, for a one-line UI summary. */
export function worstSeverity(
  conflicts: readonly PaletteConflict[],
): 'error' | 'warning' | 'none' {
  if (conflicts.some((c) => c.severity === 'error')) return 'error';
  return conflicts.length > 0 ? 'warning' : 'none';
}

// --- profile-world resolution (M15-UI-01) ---------------------------

/** Everything one profile-world resolution needs. */
export interface ProfilePaletteRequest {
  /** The design's recipe copy (the (edited)-copy pattern, D114). */
  recipe: ColorProfileRecipe;
  /** Design-layer rules beside the recipe (M15-CORE-03). */
  design: {
    count: { mode: 'all' | 'max' | 'exact'; n: number };
    minDistance: number;
    mustUse: readonly string[];
    /** The colour-use floor (TONE-01, schema v12); absent = off. */
    floor?: FloorRule | undefined;
  };
  inputs: ProfileInputs;
  /** Grid-sized source for count selection; omit before the first frame. */
  source?: PixelBuffer | undefined;
  /**
   * Tone mode (TONE-01): selection then runs in the same tone space
   * cell matching uses — the D200 decision of record. Pass it only
   * under the 'lab' metric; absent = plain Lab, the pre-TONE-01
   * behaviour exactly.
   */
  tone?: ToneConfig | undefined;
  name: string;
}

/**
 * Resolve a design's recipe + rules to the palette the pipeline runs
 * against — the profile-world successor of the policy resolver. The
 * count limit still applies last, so it can never widen membership
 * (the M7-ACCEPT-01 invariant), and Must-use seats are guaranteed
 * wherever membership contains them; a seat outside membership is
 * kept and explained, never silently substituted.
 */
export function resolveProfilePalette(request: ProfilePaletteRequest): ResolvedPalette {
  const { recipe, design, inputs, name } = request;
  const membership = resolveProfileMembership(recipe, inputs);
  const conflicts: PaletteConflict[] = [...membership.conflicts];

  if (!membership.ok) {
    return {
      palette: paletteOf(name, []),
      unresolved: [],
      conflicts,
      eligibleCount: 0,
      selectedCount: 0,
      lockedCount: 0,
      ok: false,
    };
  }

  const eligible = membership.entries;
  const eligibleIds = new Set(eligible.map((t) => t.id));
  const locks = eligible.filter((t) => design.mustUse.includes(t.id));
  const missingSeats = design.mustUse.filter((id) => !eligibleIds.has(id));
  if (missingSeats.length > 0) {
    conflicts.push({
      kind: 'locked-not-permitted',
      severity: 'warning',
      ids: [...missingSeats],
      message: `${missingSeats.join(', ')} is set to Must use but is not in this profile's colours. The seat is kept for when it returns; no substitute was chosen.`,
    });
  }

  const eligibleCount = eligible.length;
  const floor =
    design.floor !== undefined && design.floor.on && design.floor.minStitches > 0
      ? design.floor
      : undefined;
  // The floor needs the distribution even without a count limit —
  // "use everything that earns its stitches" is a legal rule — so
  // 'all' mode keeps the source when a floor is on.
  const source =
    design.count.mode === 'all' && floor === undefined ? undefined : request.source;
  const permitted: PermittedSet = {
    eligible,
    locks,
    preferred: new Set<string>(),
    unresolved: [],
    conflicts: [],
    ok: true,
  };

  if (source === undefined) {
    conflicts.push(...duplicateDisplayColours(eligible));
    return {
      palette: paletteOf(name, eligible),
      unresolved: [],
      conflicts,
      eligibleCount,
      selectedCount: eligibleCount,
      lockedCount: locks.length,
      ok: true,
    };
  }

  /** The floor's explanation, shared by both paths below. */
  const floorSentence = (dropped: number, kept: number): PaletteConflict => {
    const colours = dropped === 1 ? 'colour' : 'colours';
    const minimum = String(floor?.minStitches ?? 0);
    return {
      kind: 'floor-dropped',
      severity: 'warning',
      ids: [],
      message: `${String(dropped)} ${colours} earned fewer than ${minimum} stitches and ${dropped === 1 ? 'was' : 'were'} dropped, leaving ${String(kept)}. Lower the minimum stitches per colour, or turn it off, to keep more.`,
    };
  };

  // 'all' mode with a floor: no count selection — the whole membership
  // stands, then the under-earners drop. The minimum-distance rule
  // stays not-applied here, exactly as 'all' mode has always worked.
  if (design.count.mode === 'all') {
    const distribution = buildDistribution(source);
    const floored = applyColourFloor(
      eligible,
      locks,
      distribution,
      floor?.minStitches ?? 0,
      request.tone,
    );
    if (floored.dropped > 0) {
      conflicts.push(floorSentence(floored.dropped, floored.threads.length));
    }
    conflicts.push(...duplicateDisplayColours(floored.threads));
    return {
      palette: paletteOf(name, floored.threads),
      unresolved: [],
      conflicts,
      eligibleCount,
      selectedCount: floored.threads.length,
      lockedCount: locks.length,
      ok: true,
    };
  }

  const target = design.count.n;
  if (locks.length > target) {
    conflicts.push({
      kind: 'locks-exceed-count',
      severity: 'warning',
      ids: locks.map((t) => t.id),
      message: `You have ${String(locks.length)} Must-use colours but asked for ${String(target)}. Every seat is being kept, so the palette has ${String(locks.length)} colours — remove a Must use, or raise the limit.`,
    });
  }
  if (target > eligibleCount) {
    // "resolves 1 colour, so it is being used" / "resolves 6 colours,
    // so all 6 are being used". The fragment was copied from the
    // policy-world sentence with its verb attached, which read
    // "resolves 1 colour is, so it is being used" until COUNT-01.
    const threads = eligibleCount === 1 ? 'colour' : 'colours';
    const all = eligibleCount === 1 ? 'it is' : `all ${String(eligibleCount)} are`;
    conflicts.push({
      kind: 'count-exceeds-eligible',
      severity: 'warning',
      ids: [],
      message: `You asked for ${String(target)} colours but this profile resolves ${String(eligibleCount)} ${threads}, so ${all} being used.`,
    });
  }

  const distribution = buildDistribution(source);
  const selection = selectThreads(permitted, target, distribution, design.minDistance, {
    tone: request.tone,
    floor,
  });

  if (selection.floorDropped > 0) {
    conflicts.push(floorSentence(selection.floorDropped, selection.threads.length));
  }
  if (selection.distanceLimited) {
    conflicts.push({
      kind: 'distance-limits-count',
      severity: 'warning',
      ids: [],
      message: `You asked for ${String(target)} colours at a minimum distance of ${String(design.minDistance)}; only ${String(selection.threads.length)} fit that far apart. Lower the distance or the colour count to change the balance.`,
    });
  } else if (
    design.count.mode === 'exact' &&
    selection.threads.length < target &&
    selection.floorDropped === 0 &&
    target <= eligibleCount &&
    locks.length <= target
  ) {
    conflicts.push({
      kind: 'count-exceeds-eligible',
      severity: 'warning',
      ids: [],
      message: `You asked for exactly ${String(target)} colours; ${String(selection.threads.length)} were selected because the design does not contain enough distinguishable colours to justify more.`,
    });
  }

  conflicts.push(...duplicateDisplayColours(selection.threads));

  return {
    palette: paletteOf(name, selection.threads),
    unresolved: [],
    conflicts,
    eligibleCount,
    selectedCount: selection.threads.length,
    lockedCount: selection.lockedCount,
    ok: true,
  };
}
