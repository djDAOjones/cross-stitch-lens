/**
 * Profiling debug panel (M5 harness): per-stage pipeline timings over
 * a rolling window of processed frames — last / median / max plus a
 * whole-frame total row. The timing window is pure (tested in node);
 * only createDebugPanel touches the DOM. Dev-only: main.ts mounts it
 * only under import.meta.env.DEV (UI-STANDARDS → "Diagnostics
 * affordance").
 */

import type { StageTiming } from '../worker/protocol.ts';

/** Frames retained per stage; older samples fall off the front. */
export const WINDOW_SIZE = 120;

/** One rendered table row (times in ms). */
export interface TimingRow {
  stage: string;
  last: number;
  median: number;
  max: number;
}

/** Milliseconds to a fixed 2-decimal string ("3.14"). */
export function formatMs(ms: number): string {
  return ms.toFixed(2);
}

/**
 * Row label for a timing: the stage name, suffixed with the backend
 * that ran when it is not the TS reference — "dither (wasm)" — so an
 * automatic backend switch is visible (and, via the stage-key reset,
 * starts a fresh comparison window).
 */
export function timingLabel(timing: StageTiming): string {
  return timing.backend === 'ts' ? timing.stage : `${timing.stage} (${timing.backend})`;
}

/** Median of a non-empty array (mean of the middle pair when even). */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function toRow(stage: string, samples: number[]): TimingRow {
  return {
    stage,
    last: samples[samples.length - 1] ?? 0,
    median: median(samples),
    max: Math.max(...samples),
  };
}

/**
 * Rolling per-stage timing window. Samples from frames with a
 * different stage list (a pipeline-preset change) reset the window so
 * the aggregates always describe one comparable configuration.
 */
export class TimingWindow {
  private readonly capacity: number;
  /** Per-stage samples, keyed in stage order; insertion order = row order. */
  private samples = new Map<string, number[]>();
  /** Whole-frame totals, same window. */
  private totals: number[] = [];
  private stageKey = '';

  constructor(capacity: number = WINDOW_SIZE) {
    this.capacity = capacity;
  }

  /** Record one processed frame's stage timings. */
  record(timings: StageTiming[]): void {
    const labels = timings.map(timingLabel);
    const key = labels.join('→');
    if (key !== this.stageKey) {
      this.samples = new Map();
      this.totals = [];
      this.stageKey = key;
    }
    let total = 0;
    timings.forEach((timing, i) => {
      const label = labels[i] ?? timing.stage;
      const series = this.samples.get(label) ?? [];
      series.push(timing.ms);
      if (series.length > this.capacity) series.shift();
      this.samples.set(label, series);
      total += timing.ms;
    });
    this.totals.push(total);
    if (this.totals.length > this.capacity) this.totals.shift();
  }

  /** Stage rows in pipeline order; empty before the first frame. */
  rows(): TimingRow[] {
    return [...this.samples.entries()].map(([stage, series]) => toRow(stage, series));
  }

  /** Whole-frame total row; null before the first frame. */
  totalRow(): TimingRow | null {
    if (this.totals.length === 0) return null;
    return toRow('Total', this.totals);
  }

  /** Frames currently in the window. */
  get frameCount(): number {
    return this.totals.length;
  }
}

/** The live profiling panel: a DOM element plus its per-frame updater. */
export interface DebugPanel {
  element: HTMLElement;
  update(timings: StageTiming[], droppedFrames: number): void;
}

/** Build the panel. Starts in its empty state until the first update. */
export function createDebugPanel(doc: Document): DebugPanel {
  const element = doc.createElement('details');
  element.className = 'debug-panel';
  const summary = doc.createElement('summary');
  summary.textContent = 'Profiling';
  const meta = doc.createElement('p');
  meta.className = 'meta';
  meta.textContent = 'No frames yet — timings appear after the first processed frame.';

  const table = doc.createElement('table');
  table.hidden = true;
  const caption = doc.createElement('caption');
  caption.textContent = 'Pipeline stage timings';
  const thead = doc.createElement('thead');
  const headRow = doc.createElement('tr');
  for (const text of ['Stage', 'Last (ms)', 'Median (ms)', 'Max (ms)']) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    if (text !== 'Stage') th.className = 'num';
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = doc.createElement('tbody');
  table.append(caption, thead, tbody);
  element.append(summary, meta, table);

  const timingWindow = new TimingWindow();

  function appendRow(row: TimingRow): void {
    const tr = doc.createElement('tr');
    const stage = doc.createElement('td');
    stage.textContent = row.stage;
    tr.append(stage);
    for (const value of [row.last, row.median, row.max]) {
      const td = doc.createElement('td');
      td.className = 'num';
      td.textContent = formatMs(value);
      tr.append(td);
    }
    tbody.append(tr);
  }

  function update(timings: StageTiming[], droppedFrames: number): void {
    timingWindow.record(timings);
    tbody.replaceChildren();
    for (const row of timingWindow.rows()) appendRow(row);
    const total = timingWindow.totalRow();
    if (total !== null) appendRow(total);
    table.hidden = timingWindow.frameCount === 0;
    const frames = timingWindow.frameCount;
    meta.textContent =
      `${String(frames)} ${frames === 1 ? 'frame' : 'frames'} sampled · ` +
      `${String(droppedFrames)} dropped`;
  }

  return { element, update };
}
