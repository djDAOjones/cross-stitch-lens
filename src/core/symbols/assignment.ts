/**
 * Symbol assignment: which thread wears which glyph (M9, D160
 * decisions 3 and 4).
 *
 * Assignment is **identity-keyed persisted state, not recomputation**:
 * a symbol is granted the first time a thread needs one, stored, and
 * kept for as long as that thread stays in the palette. Determinism
 * and stability fall out of persistence — reordering or hiding palette
 * entries can move nothing, because nothing is derived from position.
 *
 * The rules, verbatim from the signed scope:
 *
 * - Keyed on `brandId:reference` (`Thread.id`). Never on colour.
 * - First need takes the **next unused symbol in canonical order**
 *   (the queue front) and is stored in the project file.
 * - A departed thread releases its symbol to the **back** of the
 *   queue, so a newcomer never immediately inherits a symbol the
 *   stitcher still associates with a recent colour.
 * - A palette replacement with **no surviving thread** resets the
 *   queue to canonical order — cross-brand replacement carries
 *   nothing over, least of all by RGB similarity (D55/D56).
 * - Overrides pick from **unused** symbols only; collisions are
 *   unrepresentable rather than validated. Dormant overrides (for
 *   threads not currently present) stay in the file.
 *
 * Everything here is pure: fresh state out, inputs untouched, no
 * hidden order dependence. The canonical id list is a parameter so
 * tests can drive small catalogues; the app passes `SYMBOL_IDS`.
 */

/** One persisted thread → symbol grant (or override). */
export interface SymbolPair {
  threadId: string;
  symbolId: string;
}

/**
 * The persisted assignment state. `assigned` is the single effective
 * truth (grant order preserved); `queue` is every unused symbol in
 * grant order (front = next); `overrides` are standing user
 * preferences applied at grant time when their symbol is free.
 */
export interface SymbolAssignmentState {
  assigned: readonly SymbolPair[];
  queue: readonly string[];
  overrides: readonly SymbolPair[];
}

/** A fresh state: nothing granted, the full catalogue queued. */
export function initialSymbolState(canonical: readonly string[]): SymbolAssignmentState {
  return { assigned: [], queue: [...canonical], overrides: [] };
}

/**
 * Repair a loaded state against this build's catalogue.
 *
 * A project file is user data from outside this build: it may carry
 * symbol ids a newer app knew, duplicates from a hand edit, or a
 * queue that predates a catalogue batch. Grants on unknown symbols
 * are dropped (their threads simply re-grant at next need); the queue
 * keeps its persisted order, then appends any catalogue id it is
 * missing in canonical order — which is exactly how a later glyph
 * batch joins an existing design: at the back, changing nothing
 * already granted. Overrides keep unknown symbol ids on purpose: they
 * are dormant (never in the queue, so never granted) but they are the
 * user's data, and a build that knows the glyph honours them again.
 */
export function reconcileSymbolState(
  state: SymbolAssignmentState,
  canonical: readonly string[],
): SymbolAssignmentState {
  const known = new Set(canonical);
  const usedSymbols = new Set<string>();
  const usedThreads = new Set<string>();
  const assigned: SymbolPair[] = [];
  for (const pair of state.assigned) {
    if (!known.has(pair.symbolId)) continue;
    if (usedSymbols.has(pair.symbolId) || usedThreads.has(pair.threadId)) continue;
    usedSymbols.add(pair.symbolId);
    usedThreads.add(pair.threadId);
    assigned.push({ threadId: pair.threadId, symbolId: pair.symbolId });
  }
  const queued = new Set<string>();
  const queue: string[] = [];
  for (const id of state.queue) {
    if (!known.has(id) || usedSymbols.has(id) || queued.has(id)) continue;
    queued.add(id);
    queue.push(id);
  }
  for (const id of canonical) {
    if (usedSymbols.has(id) || queued.has(id)) continue;
    queued.add(id);
    queue.push(id);
  }
  const overrideThreads = new Set<string>();
  const overrides: SymbolPair[] = [];
  for (const pair of state.overrides) {
    if (overrideThreads.has(pair.threadId)) continue;
    overrideThreads.add(pair.threadId);
    overrides.push({ threadId: pair.threadId, symbolId: pair.symbolId });
  }
  return { assigned, queue, overrides };
}

/**
 * Apply a palette-membership change: departed threads release their
 * symbols to the queue back (in grant order); survivors keep theirs
 * untouched. A non-empty palette sharing **no** thread with the
 * previous grants is a wholesale replacement and resets the queue to
 * canonical (D160 decision 4). Grants for newcomers do not happen
 * here — they happen at first need ({@link grantNeeded}).
 */
export function syncPalette(
  state: SymbolAssignmentState,
  paletteIds: readonly string[],
  canonical: readonly string[],
): SymbolAssignmentState {
  const present = new Set(paletteIds);
  const survivors = state.assigned.filter((p) => present.has(p.threadId));
  if (state.assigned.length > 0 && survivors.length === 0 && paletteIds.length > 0) {
    return { assigned: [], queue: [...canonical], overrides: state.overrides };
  }
  if (survivors.length === state.assigned.length) return state;
  const released = state.assigned
    .filter((p) => !present.has(p.threadId))
    .map((p) => p.symbolId);
  return {
    assigned: survivors,
    queue: [...state.queue, ...released],
    overrides: state.overrides,
  };
}

/** Result of a grant pass: the new state plus any threads left bare. */
export interface GrantResult {
  state: SymbolAssignmentState;
  /** Threads that needed a symbol after the queue ran out, in order. */
  unassigned: readonly string[];
}

/**
 * Grant symbols to every needing thread that has none. Pass the needs
 * in palette order so the grant sequence never depends on stitch
 * counts or frame content. An override whose symbol is still unused
 * wins over the queue front; an override whose symbol is taken stays
 * dormant and the queue serves instead — no conflict state exists.
 * When the queue empties, remaining needs are reported, not silently
 * doubled up: repeating a symbol is banned (D160 decision 1).
 */
export function grantNeeded(
  state: SymbolAssignmentState,
  needIds: readonly string[],
): GrantResult {
  const have = new Set(state.assigned.map((p) => p.threadId));
  const wanted: string[] = [];
  for (const id of needIds) {
    if (!have.has(id) && !wanted.includes(id)) wanted.push(id);
  }
  if (wanted.length === 0) return { state, unassigned: [] };

  const assigned = [...state.assigned];
  const queue = [...state.queue];
  const overrideFor = new Map(state.overrides.map((p) => [p.threadId, p.symbolId]));
  const unassigned: string[] = [];
  for (const threadId of wanted) {
    const preferred = overrideFor.get(threadId);
    const at = preferred === undefined ? -1 : queue.indexOf(preferred);
    if (at >= 0) {
      assigned.push({ threadId, symbolId: queue[at] as string });
      queue.splice(at, 1);
      continue;
    }
    const next = queue.shift();
    if (next === undefined) {
      unassigned.push(threadId);
      continue;
    }
    assigned.push({ threadId, symbolId: next });
  }
  return { state: { assigned, queue, overrides: state.overrides }, unassigned };
}

/** The effective thread → symbol map (grants only; always injective). */
export function effectiveSymbols(state: SymbolAssignmentState): ReadonlyMap<string, string> {
  return new Map(state.assigned.map((p) => [p.threadId, p.symbolId]));
}

/** Outcome of an override request. */
export interface OverrideResult {
  ok: boolean;
  state: SymbolAssignmentState;
  /** User-facing sentence when `ok` is false. */
  reason?: string;
}

/**
 * Record a manual override: this thread should wear this symbol.
 *
 * Only an **unused** symbol can be picked (D160 decision 3) — taking
 * another thread's symbol is an explicit swap at the UI layer, never a
 * conflict state here. If the thread already wears a symbol, it
 * changes into the override now and releases its old symbol to the
 * queue back; otherwise the override waits for the thread's first
 * need.
 */
export function setOverride(
  state: SymbolAssignmentState,
  threadId: string,
  symbolId: string,
): OverrideResult {
  const holder = state.assigned.find((p) => p.symbolId === symbolId);
  if (holder !== undefined && holder.threadId !== threadId) {
    return {
      ok: false,
      state,
      reason: 'That symbol is in use by another thread. Swap it explicitly instead.',
    };
  }
  const current = state.assigned.find((p) => p.threadId === threadId);
  const ownsAlready = current !== undefined && current.symbolId === symbolId;
  if (!ownsAlready && !state.queue.includes(symbolId)) {
    return { ok: false, state, reason: 'That symbol is not in this catalogue.' };
  }
  const overrides = [
    ...state.overrides.filter((p) => p.threadId !== threadId),
    { threadId, symbolId },
  ];
  if (current === undefined || ownsAlready) {
    return { ok: true, state: { ...state, overrides } };
  }
  const queue = [...state.queue];
  queue.splice(queue.indexOf(symbolId), 1);
  queue.push(current.symbolId);
  const assigned = state.assigned.map((p) =>
    p.threadId === threadId ? { threadId, symbolId } : p,
  );
  return { ok: true, state: { assigned, queue, overrides } };
}

/** Remove a standing override; the current grant, if any, stays on. */
export function clearOverride(
  state: SymbolAssignmentState,
  threadId: string,
): SymbolAssignmentState {
  const overrides = state.overrides.filter((p) => p.threadId !== threadId);
  if (overrides.length === state.overrides.length) return state;
  return { ...state, overrides };
}
