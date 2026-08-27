/**
 * "Latest wins" for asynchronous selection (UI-NITS-01).
 *
 * A selector whose load step is `async` has an ordering hazard the
 * synchronous version does not: two selections in flight settle in
 * *completion* order, not request order, so a slow earlier one can
 * land last and leave the view showing something the control does not
 * name. The fix is a generation token — take one when the attempt
 * begins, and apply the result only while it is still the newest.
 *
 * Deliberately tiny and deliberately UI-local. `main.ts` already
 * carries counters of this shape for the source lifecycle, and
 * STATE-01 is where that convention gets signed across the app; this
 * is the profile editor's own, not a bid to be that convention.
 */

/** A generation gate. One per independently-raced sequence. */
export interface LatestWins {
  /**
   * Start an attempt. The returned predicate answers "is this still
   * the newest attempt?" — call it after every `await`, and abandon
   * the continuation when it answers false.
   */
  begin(): () => boolean;
}

export function latestWins(): LatestWins {
  let generation = 0;
  return {
    begin(): () => boolean {
      const mine = ++generation;
      return () => mine === generation;
    },
  };
}
