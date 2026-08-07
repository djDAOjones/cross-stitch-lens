/**
 * Retained-heap verdict vocabulary (M13-PROF-05 / M13-MEAS-03).
 *
 * The plateau probe reads Chrome's JS-heap figure at three moments:
 * before the fixed sequence, after 5 s of idle (natural GC's chance),
 * and — when the harness runs in a Chrome launched with
 * `--js-flags=--expose-gc` — after an explicit forced GC. The forced
 * reading answers the D71 question the DevTools snapshot pair was
 * queued for: an idle residue that a forced GC reclaims was lazy major
 * GC, not a leak; one that survives is real retention.
 *
 * A forced GC is a **labelled diagnostic**: it proves reachability,
 * never production pause behaviour. It also collects only the isolate
 * it runs in (the page), so a worker-held graph needs the snapshot
 * pair regardless — the verdict text keeps that honest.
 */

/**
 * Idle growth below this many MiB over the fixed sequence reads as a
 * plateau (GC noise), not retention — the threshold the first plateau
 * row shipped with (M13-PROF-05).
 */
export const RETENTION_PLATEAU_MIB = 25;

/**
 * Classify the plateau probe's end state. `afterForcedGcMb` is null
 * when the harness could not force a GC (no `--js-flags=--expose-gc`).
 * All figures are MiB readings of the same heap counter.
 */
export function retentionVerdict(
  startMb: number,
  afterIdleMb: number,
  afterForcedGcMb: number | null,
): string {
  if (afterIdleMb - startMb < RETENTION_PLATEAU_MIB) return 'plateau after natural GC';
  if (afterForcedGcMb === null) {
    return 'RETAINED after idle — investigate with a snapshot pair';
  }
  return afterForcedGcMb - startMb < RETENTION_PLATEAU_MIB
    ? 'lazy major GC — forced GC reclaimed the idle residue (diagnostic; not production pause behaviour)'
    : 'REAL retention — survives forced GC; a snapshot pair should name the retained path';
}
