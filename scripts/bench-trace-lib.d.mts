/**
 * Types for `bench-trace-lib.mjs` — the module stays plain JS so the
 * node launcher can import it untranspiled; the vitest suite gets
 * real types through this declaration.
 */

export declare const TRACE_CATEGORIES: readonly string[];

export interface TraceThread {
  pid: number;
  tid: number;
}

/** One GC bucket: pause count, total and worst pause, in ms. */
export interface GcBucket {
  count: number;
  totalMs: number;
  maxMs: number;
}

/** The three honest buckets — never summed into one number. */
export interface GcBuckets {
  minor: GcBucket;
  major: GcBucket;
  incrementalMarking: GcBucket;
}

export interface MarkedWindow {
  workloadId: string;
  boundary: string;
  startUs: number;
  endUs: number;
}

export interface ObserverLongTasks {
  source: string;
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface SummaryWindow {
  workloadId: string;
  boundary: string;
  durationMs: number;
  gc: GcBuckets;
  observerLongTasks?: ObserverLongTasks | null;
}

export interface TraceSummary {
  renderer: TraceThread | null;
  windows: SummaryWindow[];
  unpairedMarks: string[];
  wholeLeg: { durationMs: number; gc: GcBuckets } | null;
}

export declare function parseDevToolsActivePort(
  text: string,
): { port: number; path: string } | null;

export declare function parseMarkName(
  name: string,
): { workloadId: string; boundary: string; edge: 'start' | 'end' } | null;

export declare function benchThread(events: readonly unknown[]): TraceThread | null;

export declare function markedWindows(
  events: readonly unknown[],
  thread: TraceThread,
): { windows: MarkedWindow[]; unpaired: string[] };

export declare function gcSummary(
  events: readonly unknown[],
  thread: TraceThread,
  windows: readonly { startUs: number; endUs: number }[],
): { perWindow: GcBuckets[]; wholeLeg: GcBuckets };

export declare function summariseTrace(events: readonly unknown[]): TraceSummary;

export declare function attachObserverLongTasks(
  summary: TraceSummary,
  pageReport: unknown,
): TraceSummary;
