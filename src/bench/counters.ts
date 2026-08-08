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
 *   Both drop counts are cumulative like every other field; their two
 *   sources run on different clocks, so fold them in via `DropLedger`.
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
 * Cursor folding the two drop sources into the cumulative ledger
 * (M13-DEF-03). They report on different clocks: the pump gate is
 * constructed per measurement window, so its count starts at zero,
 * while the worker client outlives every window and its count only
 * grows. Assigning either raw value to a `CaptureCounters` field —
 * whose siblings (`submitted`, `results`) accumulate across windows —
 * is what tainted the D134 sitting: the ledger came up short by
 * exactly the earlier windows' drops and interval deltas went
 * negative. Folding by delta keeps the cumulative books straight while
 * `windowTotals` keeps the per-window figure the row still wants.
 *
 * Both totals must be monotonic from the constructor's reading: a
 * source that goes backwards is a defect, and it is left to surface in
 * the conservation check rather than clamped away here.
 */
export class DropLedger {
  private pumpAt: number;
  private clientAt: number;
  private windowPump = 0;
  private windowClient = 0;

  constructor(pumpTotal: number, clientTotal: number) {
    this.pumpAt = pumpTotal;
    this.clientAt = clientTotal;
  }

  /**
   * Add drops observed since the last fold to `into`'s cumulative
   * totals, and return this window's own totals so far.
   */
  fold(
    into: CaptureCounters,
    pumpTotal: number,
    clientTotal: number,
  ): { pumpDrops: number; clientDrops: number } {
    const pumpNew = pumpTotal - this.pumpAt;
    const clientNew = clientTotal - this.clientAt;
    this.pumpAt = pumpTotal;
    this.clientAt = clientTotal;
    into.pumpDrops += pumpNew;
    into.clientDrops += clientNew;
    this.windowPump += pumpNew;
    this.windowClient += clientNew;
    return this.windowTotals;
  }

  /** This window's drops, separate from the cumulative ledger. */
  get windowTotals(): { pumpDrops: number; clientDrops: number } {
    return { pumpDrops: this.windowPump, clientDrops: this.windowClient };
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

/**
 * Why a capture measurement window yielded no evidence, or null when
 * frames flowed. `requestVideoFrameCallback` is damage-driven for
 * captured surfaces, so a zero-callback window means the shared surface
 * never presented a frame — it was static, or it was not the surface
 * the run needed. The first owner run (2026-07-23) shared the harness's
 * own window and recorded 30 s of structurally valid zeros with a clean
 * validity verdict; this verdict exists so a silent zero is published
 * as `not-measured` plus a tainting finding, never as 0 updates/sec.
 *
 * `paintsConfirmed` is how many controlled-source paints were
 * acknowledged over the BroadcastChannel during the window: paints
 * without frames prove the shared surface is not the source window.
 */
export function zeroFrameReason(
  callbacks: number,
  paintsConfirmed: number,
): string | null {
  if (callbacks > 0) return null;
  if (paintsConfirmed > 0) {
    return (
      `the source window confirmed ${String(paintsConfirmed)} paint(s) but the ` +
      `shared surface presented no frames — the shared surface is not the ` +
      `source window; share the controlled source window (button 4)`
    );
  }
  return (
    'the shared surface presented no frames during the window — a static or ' +
    'wrong surface; share the controlled source window (button 4)'
  );
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
