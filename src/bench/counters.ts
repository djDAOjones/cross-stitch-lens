/**
 * Capture-path counters for the browser harness (M13-MEAS-02).
 *
 * The live path drops work on purpose — dirty skips, latest-wins
 * coalescing at the pump and at the worker client — so a throughput
 * number without its counters cannot be interpreted. This module is a
 * pure ledger: the harness feeds it lifetime totals, it produces
 * interval snapshots (deltas, not totals) and a conservation check
 * that every announced frame is accounted for.
 *
 * Counter meanings (one per observable event on the live path):
 * - `callbacks` — video frame ticks announced by the pump subscription.
 * - `gateSuppressed` — ticks the pump gate refused to start a grab for
 *   (a grab was already in flight; the newest waits, older drop).
 * - `grabs` — full-resolution frame grabs performed.
 * - `dirtySkips` — grabs skipped as unchanged by the dirty gate.
 * - `forcedRefreshes` — unchanged frames processed anyway (staleness).
 * - `submitted` — frames submitted to the worker client.
 * - `pumpDrops` — pending frames dropped at the pump gate.
 * - `clientDrops` — pending jobs dropped at the worker client.
 * - `results` — processed frames delivered.
 * - `errors` — worker error responses.
 * - `draftEnters` / `draftExits` — draft-quality transitions.
 */

/** Lifetime totals at one instant. All fields are cumulative counts. */
export interface CaptureCounters {
  callbacks: number;
  gateSuppressed: number;
  grabs: number;
  dirtySkips: number;
  forcedRefreshes: number;
  submitted: number;
  pumpDrops: number;
  clientDrops: number;
  results: number;
  errors: number;
  draftEnters: number;
  draftExits: number;
}

/** A zeroed counter set (the tracker's starting point). */
export function zeroCounters(): CaptureCounters {
  return {
    callbacks: 0,
    gateSuppressed: 0,
    grabs: 0,
    dirtySkips: 0,
    forcedRefreshes: 0,
    submitted: 0,
    pumpDrops: 0,
    clientDrops: 0,
    results: 0,
    errors: 0,
    draftEnters: 0,
    draftExits: 0,
  };
}

/** One interval: deltas over `elapsedMs`, never lifetime totals. */
export interface CounterInterval {
  /** 1-based interval index. */
  index: number;
  elapsedMs: number;
  deltas: CaptureCounters;
}

/** Delta of two counter readings (b - a), field by field. */
function diff(a: CaptureCounters, b: CaptureCounters): CaptureCounters {
  const out = zeroCounters();
  for (const key of Object.keys(out) as (keyof CaptureCounters)[]) {
    out[key] = b[key] - a[key];
  }
  return out;
}

/**
 * Interval ledger over cumulative counters. The harness calls
 * `snapshot` at each interval boundary with the current lifetime
 * totals and a monotonic timestamp; the tracker returns the interval's
 * deltas. Pure — no timers, no I/O.
 */
export class CounterTracker {
  private last: CaptureCounters;
  private lastAt: number;
  private count = 0;
  private readonly all: CounterInterval[] = [];

  constructor(start: CaptureCounters, startAtMs: number) {
    this.last = { ...start };
    this.lastAt = startAtMs;
  }

  /** Close the current interval; returns its deltas. */
  snapshot(current: CaptureCounters, atMs: number): CounterInterval {
    this.count += 1;
    const interval: CounterInterval = {
      index: this.count,
      elapsedMs: atMs - this.lastAt,
      deltas: diff(this.last, current),
    };
    this.all.push(interval);
    this.last = { ...current };
    this.lastAt = atMs;
    return interval;
  }

  /** Every closed interval, in order. */
  get intervals(): readonly CounterInterval[] {
    return this.all;
  }
}

/**
 * Conservation checks over a counter reading: every announced frame
 * must be accounted for, and every submission answered or still in
 * flight. Returns human-readable violations; empty means consistent.
 *
 * `inFlight` is the number of jobs submitted whose response has not
 * arrived at the instant of the reading (0 or 1 under latest-wins,
 * passed in because only the harness can observe it).
 */
export function conservationViolations(
  c: CaptureCounters,
  inFlight: number,
): string[] {
  const violations: string[] = [];
  // Every pump callback either started a grab or was suppressed by the
  // in-flight gate.
  if (c.callbacks !== c.grabs + c.gateSuppressed) {
    violations.push(
      `callbacks (${String(c.callbacks)}) ≠ grabs (${String(c.grabs)}) + ` +
        `gate-suppressed (${String(c.gateSuppressed)})`,
    );
  }
  // Every grab was skipped as clean or submitted for processing.
  if (c.grabs !== c.dirtySkips + c.submitted) {
    violations.push(
      `grabs (${String(c.grabs)}) ≠ dirty skips (${String(c.dirtySkips)}) + ` +
        `submitted (${String(c.submitted)})`,
    );
  }
  // Forced refreshes are a subset of submissions.
  if (c.forcedRefreshes > c.submitted) {
    violations.push(
      `forced refreshes (${String(c.forcedRefreshes)}) exceed submissions ` +
        `(${String(c.submitted)})`,
    );
  }
  // Every submission was answered, dropped by the client, or is the
  // (single) job still in flight.
  if (c.submitted !== c.results + c.errors + c.clientDrops + inFlight) {
    violations.push(
      `submitted (${String(c.submitted)}) ≠ results (${String(c.results)}) + ` +
        `errors (${String(c.errors)}) + client drops (${String(c.clientDrops)}) + ` +
        `in flight (${String(inFlight)})`,
    );
  }
  return violations;
}

/** Flatten counters for a report row's `meta` field. */
export function countersMeta(
  c: CaptureCounters,
  prefix = '',
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(c) as (keyof CaptureCounters)[]) {
    out[`${prefix}${key}`] = c[key];
  }
  return out;
}
