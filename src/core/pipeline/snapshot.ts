/**
 * Request snapshots (STATE-03, the D212 convention).
 *
 * A pipeline request is answered asynchronously, and by the time its
 * answer arrives the app's live state has usually moved on — a frame
 * takes tens of milliseconds, an export takes seconds, and the user
 * is free to touch every control throughout. A result that is
 * interpreted against *current* state rather than against the state
 * it was computed from is wrong in a way that is hard to see and
 * harder to reproduce: the numbers simply disagree with the picture.
 *
 * So a request carries a snapshot taken at submission, and its result
 * is read only against that snapshot. This is the type that travels.
 *
 * ## Why a shallow copy is a complete snapshot
 *
 * `main.ts` owns one long-lived `PipelineConfig` and **replaces**
 * its fields rather than mutating what they point at — every write is
 * of the form `config.tone = { ...currentTone(), weight }` or
 * `config.dither = structuredClone(chosen)`. There is no
 * `config.x.y = z` and no `Object.assign(config.…)` anywhere in the
 * app. Under that discipline a shallow copy captures everything: the
 * copy's field values are the objects that were current at
 * submission, and nothing will ever edit those objects in place.
 *
 * A deep clone would also be correct, and costs a full copy of the
 * palette — up to 489 thread records — on every submitted frame, for
 * no additional safety while the discipline holds.
 *
 * **The discipline is the load-bearing part**, so it is pinned by
 * `tests/request-snapshot.test.ts` rather than left as a comment: the
 * day someone writes `config.grid.width = n`, that test is what says
 * a shallow snapshot no longer suffices.
 */

import type { PipelineConfig } from './config.ts';

/**
 * What a request carries with it and hands back with its result.
 *
 * `config` is a copy taken at submission — never a view of the live
 * one. Read a result's palette, metric or dither settings from here,
 * never from the app's current config.
 */
export interface RequestSnapshot {
  readonly config: PipelineConfig;
}

/**
 * Take the snapshot. Call at submission, once, and keep the result
 * with the request rather than re-deriving it later.
 */
export function requestSnapshot(config: PipelineConfig): RequestSnapshot {
  return { config: { ...config } };
}
