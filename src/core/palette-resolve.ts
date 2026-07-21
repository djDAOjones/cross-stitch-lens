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
  duplicateDisplayColours,
  resolvePermitted,
  type PaletteConflict,
  type PalettePolicy,
  type PolicyInputs,
  type ResolvedPalette,
} from './palette-policy.ts';
import { buildDistribution, selectThreads } from './palette-selection.ts';
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
  const selection = selectThreads(permitted, target, distribution);

  if (
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
