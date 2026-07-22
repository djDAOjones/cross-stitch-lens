/**
 * Cross-context timestamps for the browser harness (M13-MEAS-02).
 *
 * Window and Worker each have their own `performance.timeOrigin`, so a
 * raw `performance.now()` from one context means nothing in the other.
 * `timeOrigin + now()` is an absolute monotonic reading both contexts
 * can place on one timeline (High Resolution Time §7); every mark that
 * crosses the worker boundary is sent in this form.
 */

/** Absolute monotonic milliseconds: `performance.timeOrigin + now()`. */
export function absNow(): number {
  return performance.timeOrigin + performance.now();
}

/**
 * Observed timer resolution in ms — the smallest non-zero step
 * `performance.now()` produces. Browsers deliberately coarsen timers,
 * so the report records what the run could actually resolve rather
 * than assuming microseconds.
 */
export function timerResolutionMs(): number {
  let smallest = Infinity;
  let last = performance.now();
  // 64 observed steps bound the loop; a coarsened timer produces its
  // quantum, a fine one produces sub-0.1 ms readings almost at once.
  for (let steps = 0; steps < 64; ) {
    const next = performance.now();
    if (next > last) {
      smallest = Math.min(smallest, next - last);
      last = next;
      steps++;
    }
  }
  return smallest;
}
