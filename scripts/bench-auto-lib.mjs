/**
 * Pure helpers for the automated owner-session launcher
 * (M13-MEAS-03 quiet-run mode) — kept out of `bench-auto.mjs` so the
 * logic that decides when to run, when to retry, and what to name an
 * artefact is unit-tested while the launcher itself stays thin glue.
 */

/**
 * Seconds since the last user input, parsed from
 * `ioreg -c IOHIDSystem` output (`"HIDIdleTime" = <nanoseconds>`), or
 * null when the field is absent (non-macOS or a changed ioreg shape —
 * callers must treat null as "cannot gate on idleness", never as
 * "idle").
 */
export function parseIdleSeconds(ioregText) {
  const match = /"HIDIdleTime"\s*=\s*(\d+)/.exec(String(ioregText));
  if (match === null) return null;
  return Math.floor(Number(match[1]) / 1_000_000_000);
}

/** Compact local timestamp for artefact names: YYYYMMDD-HHMMSS. */
export function formatStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${String(date.getFullYear())}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Report artefact paths for one leg of one attempt. Every attempt
 * writes its **stamped** file (evidence survives, valid or not); only
 * a leg that passed validation is also copied to the **canonical**
 * unstamped name — so the canonical file can never hold a tainted run
 * (run 6 of 2026-08-08 clobbered run 5's valid mem report; this is
 * the fix).
 */
export function reportPaths(buildId, leg, stamp) {
  const safe = String(buildId).replaceAll('+', '_');
  return {
    stamped: `browser-bench-${safe}-${leg}.${stamp}.json`,
    canonical: `browser-bench-${safe}-${leg}.json`,
  };
}

/**
 * Failure signatures that an undisturbed desktop would not produce —
 * hidden or occluded windows, a throttled source, a capture
 * precondition that failed downstream of those. A retry (after a
 * fresh idle wait) is only worth an attempt when **every** failure
 * matches; anything else (a conservation violation, a missing
 * forced-GC reading, a thrown leg) is structural and rerunning cannot
 * fix it.
 */
const ENVIRONMENTAL_SIGNATURES = [
  'not visible',
  'hidden',
  'throttled',
  'presented no frames',
  'never confirmed',
  'precondition failed',
];

/** True when a non-empty failure list is wholly environmental. */
export function isEnvironmentalFailure(failures) {
  if (!Array.isArray(failures) || failures.length === 0) return false;
  return failures.every((failure) =>
    ENVIRONMENTAL_SIGNATURES.some((signature) => String(failure).includes(signature)),
  );
}
