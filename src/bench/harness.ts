/**
 * Timing harness (M5-PERF-03): warm-up policy and sample collection.
 *
 * Two rules make the samples trustworthy:
 * - warm-up runs are executed and discarded, and their count is
 *   recorded on the row — a hidden warm-up is an unfalsifiable claim;
 * - candidate backends are measured interleaved, round-robin, so
 *   thermal drift and GC pauses land on both rather than on whichever
 *   ran second.
 *
 * The clock is injectable so the harness itself is testable without
 * depending on wall-clock behaviour.
 */

/** Wall-clock source; overridable in tests. */
export type Clock = () => number;

const defaultClock: Clock = () => performance.now();

/** How many runs to warm and time. */
export interface RunPlan {
  warmup: number;
  runs: number;
}

/**
 * Warm-up and run counts by expected cost. Fixed rather than
 * warm-until-stable because a fixed policy is reproducible across
 * machines; the recorded relative spread is what exposes an
 * under-warmed row.
 */
export function planFor(expectedMs: number): RunPlan {
  if (expectedMs >= 250) return { warmup: 1, runs: 3 };
  if (expectedMs >= 50) return { warmup: 2, runs: 5 };
  return { warmup: 2, runs: 7 };
}

/**
 * Run `fn` through its warm-up, then return the raw timed samples in
 * execution order. Samples are never pre-aggregated here — the report
 * layer owns summarising, so distributions survive to the JSON.
 */
export function measure(
  fn: () => unknown,
  plan: RunPlan,
  now: Clock = defaultClock,
): number[] {
  for (let i = 0; i < plan.warmup; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < plan.runs; i++) {
    const start = now();
    fn();
    samples.push(now() - start);
  }
  return samples;
}

/**
 * Async twin of {@link measure} for work that must be awaited (worker
 * round-trips, GPU readbacks, encoders). Same warm-up policy; awaiting
 * inside the clock is deliberate — the completion is the mark.
 */
export async function measureAsync(
  fn: () => Promise<unknown>,
  plan: RunPlan,
  now: Clock = defaultClock,
): Promise<number[]> {
  for (let i = 0; i < plan.warmup; i++) await fn();
  const samples: number[] = [];
  for (let i = 0; i < plan.runs; i++) {
    const start = now();
    await fn();
    samples.push(now() - start);
  }
  return samples;
}

/**
 * Measure several candidates round-robin: every candidate is warmed
 * first, then one timed run each per round. Comparing backends any
 * other way lets the machine's state, not the code, pick the winner.
 */
export function measureInterleaved<K extends string>(
  candidates: readonly (readonly [K, () => unknown])[],
  plan: RunPlan,
  now: Clock = defaultClock,
): Map<K, number[]> {
  const samples = new Map<K, number[]>();
  for (const [key] of candidates) samples.set(key, []);
  for (let i = 0; i < plan.warmup; i++) {
    for (const [, fn] of candidates) fn();
  }
  for (let run = 0; run < plan.runs; run++) {
    for (const [key, fn] of candidates) {
      const start = now();
      fn();
      samples.get(key)?.push(now() - start);
    }
  }
  return samples;
}

/** Byte length of a typed array — countable allocation evidence. */
export function bytesOf(view: ArrayBufferView): number {
  return view.byteLength;
}
