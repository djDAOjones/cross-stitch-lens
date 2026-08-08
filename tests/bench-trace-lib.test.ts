/**
 * Trace-parsing invariants (M13-MEAS-04): the numbers the trace leg
 * publishes — which thread was the bench renderer, which spans were
 * measured windows, which GC events count as what — must come from
 * tested decisions, not launcher glue. Event shapes in these fixtures
 * mirror a live Chrome 151 probe (2026-08-08): marks are `ph: 'I'` on
 * `blink.user_timing`; GC pauses are `ph: 'X'` `MinorGC` / `MajorGC`
 * on `devtools.timeline,v8`; incremental marking steps are
 * `V8.GCIncrementalMarking` on `v8`.
 */

import { describe, expect, it } from 'vitest';

import {
  attachObserverLongTasks,
  benchThread,
  gcSummary,
  markedWindows,
  parseDevToolsActivePort,
  parseMarkName,
  summariseTrace,
} from '../scripts/bench-trace-lib.mjs';

const BASE = 'capture.g300.p64.lab.fs-s100-serp';

interface FakeEvent {
  name: string;
  ph: string;
  cat: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  args?: Record<string, unknown>;
}

function mark(name: string, ts: number, pid = 1, tid = 10): FakeEvent {
  return { name, ph: 'I', cat: 'blink.user_timing', pid, tid, ts };
}

function gc(name: string, ts: number, dur: number, pid = 1, tid = 10): FakeEvent {
  return { name, ph: 'X', cat: 'devtools.timeline,v8', pid, tid, ts, dur };
}

/** One paired 300² window (1–2 s) with GC inside and outside it. */
function fixtureEvents(): FakeEvent[] {
  return [
    { name: 'thread_name', ph: 'M', cat: '__metadata', pid: 1, tid: 10, ts: 0, args: { name: 'CrRendererMain' } },
    mark(`bench:${BASE}:preview-update:start`, 1_000_000),
    gc('MinorGC', 1_200_000, 3_000),
    gc('MinorGC', 1_400_000, 5_000),
    gc('MajorGC', 1_600_000, 8_000),
    gc('V8.GCIncrementalMarking', 1_700_000, 500),
    // Same names on another thread/process: must not count.
    gc('MinorGC', 1_300_000, 9_000, 2, 20),
    gc('MajorGC', 1_500_000, 9_000, 1, 11),
    mark(`bench:${BASE}:preview-update:end`, 2_000_000),
    // After the window: whole-leg only.
    gc('MinorGC', 2_500_000, 2_000),
  ];
}

describe('parseDevToolsActivePort', () => {
  it('parses the two-line file (happy path)', () => {
    expect(parseDevToolsActivePort('55491\n/devtools/browser/abc-123')).toEqual({
      port: 55491,
      path: '/devtools/browser/abc-123',
    });
  });

  it('returns null while the file is incomplete (boundary)', () => {
    expect(parseDevToolsActivePort('')).toBeNull();
    expect(parseDevToolsActivePort('55491')).toBeNull();
    expect(parseDevToolsActivePort('not-a-port\n/devtools/browser/x')).toBeNull();
  });
});

describe('parseMarkName', () => {
  it('parses the bench mark grammar (happy path)', () => {
    expect(parseMarkName(`bench:${BASE}:preview-update:start`)).toEqual({
      workloadId: BASE,
      boundary: 'preview-update',
      edge: 'start',
    });
  });

  it('rejects foreign names and malformed edges (error)', () => {
    expect(parseMarkName('navigationStart')).toBeNull();
    expect(parseMarkName('bench:x:y')).toBeNull();
    expect(parseMarkName('bench:x:y:middle')).toBeNull();
    expect(parseMarkName('other:x:y:start')).toBeNull();
    expect(parseMarkName('bench::preview-update:start')).toBeNull();
  });
});

describe('benchThread', () => {
  it('identifies the renderer from its own marks (happy path)', () => {
    expect(benchThread(fixtureEvents())).toEqual({ pid: 1, tid: 10 });
  });

  it('majority-votes against a stray same-named mark (boundary)', () => {
    const events = [
      ...fixtureEvents(),
      mark(`bench:${BASE}:interaction:start`, 3_000_000, 9, 90),
    ];
    expect(benchThread(events)).toEqual({ pid: 1, tid: 10 });
  });

  it('returns null with no marks at all (empty)', () => {
    expect(benchThread([gc('MinorGC', 1, 1)])).toBeNull();
  });
});

describe('markedWindows', () => {
  it('pairs start/end into a window (happy path)', () => {
    const { windows, unpaired } = markedWindows(fixtureEvents(), { pid: 1, tid: 10 });
    expect(unpaired).toEqual([]);
    expect(windows).toEqual([
      { workloadId: BASE, boundary: 'preview-update', startUs: 1_000_000, endUs: 2_000_000 },
    ]);
  });

  it('reports an unpaired start and an orphan end instead of guessing (error)', () => {
    const events = [
      mark(`bench:${BASE}:preview-update:start`, 1_000),
      mark(`bench:${BASE}:interaction:end`, 2_000),
    ];
    const { windows, unpaired } = markedWindows(events, { pid: 1, tid: 10 });
    expect(windows).toEqual([]);
    expect(unpaired).toContain(`${BASE}|preview-update (start with no end)`);
    expect(unpaired).toContain(`${BASE}|interaction (end with no start)`);
  });
});

describe('gcSummary', () => {
  it('buckets pauses per window and whole-leg, on the bench thread only (happy path)', () => {
    const thread = { pid: 1, tid: 10 };
    const { windows } = markedWindows(fixtureEvents(), thread);
    const summary = gcSummary(fixtureEvents(), thread, windows);
    expect(summary.perWindow[0]?.minor).toEqual({ count: 2, totalMs: 8, maxMs: 5 });
    expect(summary.perWindow[0]?.major).toEqual({ count: 1, totalMs: 8, maxMs: 8 });
    expect(summary.perWindow[0]?.incrementalMarking).toEqual({ count: 1, totalMs: 0.5, maxMs: 0.5 });
    // The post-window MinorGC counts toward the leg, not the window.
    expect(summary.wholeLeg.minor.count).toBe(3);
    expect(summary.wholeLeg.major.count).toBe(1);
  });

  it('attributes a pause to the window where it began (boundary)', () => {
    const thread = { pid: 1, tid: 10 };
    const windows = [
      { workloadId: BASE, boundary: 'preview-update', startUs: 1_000, endUs: 2_000 },
    ];
    const straddling = [gc('MajorGC', 1_990, 5_000)];
    const summary = gcSummary(straddling, thread, windows);
    expect(summary.perWindow[0]?.major.count).toBe(1);
    expect(summary.wholeLeg.major.count).toBe(1);
  });
});

describe('summariseTrace + attachObserverLongTasks', () => {
  it('produces the published shape end to end (happy path)', () => {
    const summary = summariseTrace(fixtureEvents());
    expect(summary.renderer).toEqual({ pid: 1, tid: 10 });
    expect(summary.unpairedMarks).toEqual([]);
    expect(summary.windows).toHaveLength(1);
    const window = summary.windows[0];
    if (window === undefined) throw new Error('fixture broken');
    expect(window.durationMs).toBe(1000);
    expect(window.gc.minor.count).toBe(2);
    expect(summary.wholeLeg?.gc.minor.count).toBe(3);
    // Regression: the ts-0 thread_name metadata row must not stretch
    // the leg span back to boot — first real event 1.0 s, last GC ends
    // at 2.502 s.
    expect(summary.wholeLeg?.durationMs).toBe(1502);
  });

  it('quotes the page rows\' observer long tasks with their source named (happy path)', () => {
    const summary = summariseTrace(fixtureEvents());
    const pageReport = {
      rows: [
        {
          workloadId: BASE,
          boundary: 'preview-update',
          meta: { 'long tasks': 4, 'long task total ms': 320, 'long task max ms': 180 },
        },
      ],
    };
    attachObserverLongTasks(summary, pageReport);
    expect(summary.windows[0]?.observerLongTasks).toEqual({
      source: 'in-page PerformanceObserver (longtask)',
      count: 4,
      totalMs: 320,
      maxMs: 180,
    });
  });

  it('reports null long tasks when the observer was unsupported (empty)', () => {
    const summary = summariseTrace(fixtureEvents());
    attachObserverLongTasks(summary, {
      rows: [{ workloadId: BASE, boundary: 'preview-update', meta: { 'long tasks': 'unsupported' } }],
    });
    expect(summary.windows[0]?.observerLongTasks).toBeNull();
  });

  it('returns an identifiable empty summary when no marks exist (empty)', () => {
    const summary = summariseTrace([gc('MinorGC', 1, 1)]);
    expect(summary.renderer).toBeNull();
    expect(summary.windows).toEqual([]);
    expect(summary.wholeLeg).toBeNull();
  });
});
