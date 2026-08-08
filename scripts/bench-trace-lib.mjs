/**
 * Pure trace-parsing helpers for the CDP trace leg (M13-MEAS-04) —
 * kept out of the launcher so every decision that turns raw trace
 * events into published numbers is unit-tested. Event shapes are
 * anchored to a live probe of Chrome 151 (2026-08-08), not to
 * documentation: GC pauses are the `MinorGC` / `MajorGC` complete
 * events on the bench renderer's main thread plus the
 * `V8.GCIncrementalMarking` step slices, reported as separate
 * buckets — never summed into one number, because an incremental
 * step is main-thread work but not a stop-the-world pause. Long
 * tasks deliberately do NOT come from the trace: the affordable
 * category set carries no task envelopes (`toplevel` cost ~38k
 * events / 9.6 MB per 6 s when probed — an observer effect on the
 * measurement instance), so the page's own PerformanceObserver
 * numbers, already in the capture rows, remain the long-task
 * evidence and are quoted per window with their source named.
 */

/** Trace categories the leg records — the probed-affordable set. */
export const TRACE_CATEGORIES = ['devtools.timeline', 'blink.user_timing', 'v8'];

/** GC bucket definitions: trace event name → published bucket. */
const GC_BUCKETS = {
  MinorGC: 'minor',
  MajorGC: 'major',
  'V8.GCIncrementalMarking': 'incrementalMarking',
};

/**
 * Parse Chrome's two-line `DevToolsActivePort` file (port, then the
 * browser-target path) into `{ port, path }`, or null while the file
 * is still incomplete — Chrome writes it asynchronously at startup.
 */
export function parseDevToolsActivePort(text) {
  const [port, path] = String(text).split('\n');
  if (!/^\d+$/.test(port ?? '') || !(path ?? '').startsWith('/')) return null;
  return { port: Number(port), path };
}

/**
 * Parse a harness window mark (`bench:<workloadId>:<boundary>:<edge>`,
 * see `markWindow` in `src/bench-browser.ts`) into its parts, or null
 * for anything else. WorkloadIds contain dots but never colons, so a
 * strict 4-field split is unambiguous.
 */
export function parseMarkName(name) {
  const parts = String(name).split(':');
  if (parts.length !== 4 || parts[0] !== 'bench') return null;
  const [, workloadId, boundary, edge] = parts;
  if (edge !== 'start' && edge !== 'end') return null;
  if (workloadId === '' || boundary === '') return null;
  return { workloadId, boundary, edge };
}

/** True for a User Timing event carrying one of our window marks. */
function isBenchMark(event) {
  return (
    typeof event.cat === 'string' &&
    event.cat.includes('blink.user_timing') &&
    parseMarkName(event.name) !== null
  );
}

/**
 * Identify the bench renderer's main thread from the window marks it
 * emitted — self-identifying and immune to how many renderers the
 * browser spawned (a probe saw 12 `CrRendererMain` threads; frame
 * metadata was absent). Majority vote guards against a stray
 * same-named mark from another page. Null when no marks exist.
 */
export function benchThread(events) {
  const votes = new Map();
  for (const event of events) {
    if (!isBenchMark(event)) continue;
    const key = `${String(event.pid)}:${String(event.tid)}`;
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [key, count] of votes) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  if (best === null) return null;
  const [pid, tid] = best.split(':');
  return { pid: Number(pid), tid: Number(tid) };
}

/**
 * Pair start/end marks on the bench thread into measured windows.
 * Pairing is by `<workloadId>|<boundary>` key in timestamp order; a
 * key whose edges do not pair up cleanly is reported in `unpaired`
 * rather than guessed — a validator failure, never a silent range.
 */
export function markedWindows(events, thread) {
  const marks = events
    .filter(
      (event) =>
        isBenchMark(event) && event.pid === thread.pid && event.tid === thread.tid,
    )
    .map((event) => ({ ...parseMarkName(event.name), ts: event.ts }))
    .sort((a, b) => a.ts - b.ts);
  const open = new Map();
  const windows = [];
  const unpaired = [];
  for (const mark of marks) {
    const key = `${mark.workloadId}|${mark.boundary}`;
    if (mark.edge === 'start') {
      if (open.has(key)) unpaired.push(`${key} (start with no end)`);
      open.set(key, mark.ts);
    } else {
      const startUs = open.get(key);
      if (startUs === undefined) {
        unpaired.push(`${key} (end with no start)`);
        continue;
      }
      open.delete(key);
      windows.push({
        workloadId: mark.workloadId,
        boundary: mark.boundary,
        startUs,
        endUs: mark.ts,
      });
    }
  }
  for (const key of open.keys()) unpaired.push(`${key} (start with no end)`);
  return { windows, unpaired };
}

/** Empty per-bucket accumulator: count / total / max, in ms. */
function emptyBuckets() {
  const zero = () => ({ count: 0, totalMs: 0, maxMs: 0 });
  return { minor: zero(), major: zero(), incrementalMarking: zero() };
}

function addToBucket(bucket, durMs) {
  bucket.count += 1;
  bucket.totalMs += durMs;
  bucket.maxMs = Math.max(bucket.maxMs, durMs);
}

function roundBuckets(buckets) {
  for (const bucket of Object.values(buckets)) {
    bucket.totalMs = Number(bucket.totalMs.toFixed(2));
    bucket.maxMs = Number(bucket.maxMs.toFixed(2));
  }
  return buckets;
}

/**
 * Bucket the GC complete-events on the bench main thread into the
 * given window ranges plus a whole-leg total. An event belongs to a
 * window when its **start** timestamp falls inside the range — a
 * pause straddling the window edge is attributed to where it began,
 * and is never counted twice.
 */
export function gcSummary(events, thread, windows) {
  const perWindow = windows.map(() => emptyBuckets());
  const wholeLeg = emptyBuckets();
  for (const event of events) {
    if (event.ph !== 'X' || event.pid !== thread.pid || event.tid !== thread.tid) continue;
    const bucketName = GC_BUCKETS[event.name];
    if (bucketName === undefined) continue;
    const durMs = (event.dur ?? 0) / 1000;
    addToBucket(wholeLeg[bucketName], durMs);
    const index = windows.findIndex(
      (window) => event.ts >= window.startUs && event.ts < window.endUs,
    );
    if (index !== -1) addToBucket(perWindow[index][bucketName], durMs);
  }
  return {
    perWindow: perWindow.map(roundBuckets),
    wholeLeg: roundBuckets(wholeLeg),
  };
}

/**
 * The full trace half of the merged report: identify the renderer,
 * pair the windows, bucket GC — plus the leg's observed span. Pure:
 * events in, plain data out; the launcher owns file names and I/O.
 */
export function summariseTrace(events) {
  const thread = benchThread(events);
  if (thread === null) {
    return { renderer: null, windows: [], unpairedMarks: [], wholeLeg: null };
  }
  const { windows, unpaired } = markedWindows(events, thread);
  const gc = gcSummary(events, thread, windows);
  let firstUs = Infinity;
  let lastUs = -Infinity;
  for (const event of events) {
    if (event.pid !== thread.pid || event.tid !== thread.tid) continue;
    // Metadata records (ph 'M': thread_name etc.) carry ts 0 — they
    // name things, they don't happen at a time; including one would
    // stretch the leg span back to boot (the first run printed a
    // 873,735 s "leg").
    if (event.ph === 'M') continue;
    if (typeof event.ts !== 'number' || event.ts === 0) continue;
    firstUs = Math.min(firstUs, event.ts);
    lastUs = Math.max(lastUs, event.ts + (event.dur ?? 0));
  }
  return {
    renderer: thread,
    windows: windows.map((window, index) => ({
      workloadId: window.workloadId,
      boundary: window.boundary,
      durationMs: Number(((window.endUs - window.startUs) / 1000).toFixed(1)),
      gc: gc.perWindow[index],
    })),
    unpairedMarks: unpaired,
    wholeLeg: {
      durationMs:
        lastUs > firstUs ? Number(((lastUs - firstUs) / 1000).toFixed(1)) : 0,
      gc: gc.wholeLeg,
    },
  };
}

/**
 * Quote the page's own PerformanceObserver long-task numbers (already
 * in the capture rows' meta) onto the matching trace windows, source
 * named — the trace leg's category set deliberately records no task
 * envelopes, so these are the long-task evidence, not a trace product.
 */
export function attachObserverLongTasks(summary, pageReport) {
  const rows = Array.isArray(pageReport?.rows) ? pageReport.rows : [];
  for (const window of summary.windows) {
    const row = rows.find(
      (candidate) =>
        candidate.workloadId === window.workloadId &&
        candidate.boundary === window.boundary,
    );
    const meta = row?.meta;
    window.observerLongTasks =
      typeof meta?.['long tasks'] === 'number'
        ? {
            source: 'in-page PerformanceObserver (longtask)',
            count: meta['long tasks'],
            totalMs: meta['long task total ms'] ?? 0,
            maxMs: meta['long task max ms'] ?? 0,
          }
        : null;
  }
  return summary;
}
