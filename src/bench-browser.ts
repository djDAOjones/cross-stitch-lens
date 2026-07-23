/**
 * Browser measurement harness (M13-MEAS-02) — the production-build
 * source of the three browser-only boundaries: `preview-update`,
 * `interaction` and `export`, plus capture cadence and drop counters.
 *
 * It measures the **shipped Worker route** — `PipelineClient` → worker
 * router → preview-surface draw — never core stages called on the page
 * and labelled end-to-end. Phase marks cross the worker boundary as
 * absolute monotonic timestamps (`src/bench/clock.ts`) because Window
 * and Worker have different `performance.timeOrigin`s.
 *
 * This is a real Vite entry (`/bench.html`), so `npm run build`
 * minifies and optimises it exactly like the app — measuring on the
 * dev server is what made the D47 figures unusable. It also carries
 * forward the M5-era production checks (the `mapPaletteGpu` gate and
 * real-GPU LUT agreement), now emitted in the bv2 row vocabulary.
 *
 * Rows and the final report appear on the page, on
 * `window.__BENCH__`, and as a downloadable bv2 JSON. Captured pixels,
 * surface names and window content never enter the report.
 *
 * It is a measurement tool, not part of the app: nothing imports it,
 * and it ships only because it is its own HTML entry.
 */

import { registerWasmDither } from './backends/wasm/dither.ts';
import { getDevice, isWebGpuAvailable } from './backends/webgpu/device.ts';
import { buildLutGpu, mapPaletteGpu } from './backends/webgpu/reduce.ts';
import { BOUNDARY_VERSION } from './bench/boundaries.ts';
import { absNow, timerResolutionMs } from './bench/clock.ts';
import {
  conservationViolations,
  countersMeta,
  CounterTracker,
  zeroCounters,
  zeroFrameReason,
  type CaptureCounters,
} from './bench/counters.ts';
import { measure, measureAsync } from './bench/harness.ts';
import {
  assessValidity,
  buildReport,
  formatReport,
  measuredRow,
  serialiseReport,
  skippedRow,
  type BenchReport,
  type BenchRow,
  type EnvironmentIdentity,
} from './bench/report.ts';
import {
  configFor,
  FS_DEFAULT,
  NO_DITHER,
  palette64,
  sourceBuffer,
  workloadById,
  workloadId,
  type Workload,
} from './bench/workloads.ts';
import type { BenchSourceMessage } from './bench-source.ts';
import { DirtyGate, frameSignature, hashPixels, sampleVideo } from './capture/dirty.ts';
import { DraftGovernor } from './capture/draft.ts';
import { PumpGate, startFramePump } from './capture/pump.ts';
import { captureErrorMessage, startCapture, type CaptureSession } from './capture/session.ts';
import { buildLut, LUT_SIZE } from './core/color/lut.ts';
import type { ColorMetric } from './core/color/metrics.ts';
import { loadDmcPalette, paletteLab } from './core/palette.ts';
import { fullRgbVariant, type PipelineConfig } from './core/pipeline/config.ts';
import { reduceStage } from './core/pipeline/reduce.ts';
import { computeStats } from './core/stats.ts';
import type { Backend, Palette, PixelBuffer } from './core/types.ts';
import { chartLayout, encodeChartPng } from './export/chart.ts';
import { buildChartPdf, type KeyEntry } from './export/pdf.ts';
import { encodePngBlob, scaleNearest } from './export/png.ts';
import { routeDither } from './worker/backend-select.ts';
import { PipelineClient } from './worker/client.ts';
import type { BackendForce, FrameMarks, StageTiming } from './worker/protocol.ts';
import { DEFAULT_GRID_STYLE } from './worker/grid.ts';

/** Still-input workloads the harness measures (bv2 matrix IDs). */
const STILL_200 = 'noise.w1280.opaque.g200.p64.lab.fs-s100-serp.resize-first.stretch.still';
const STILL_300 = 'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still';

/**
 * Pseudo-ID for rows whose input is the user-shared capture surface —
 * the source class is not one of the matrix's generated classes, so a
 * matrix ID would lie about the input. Grammar documented in
 * `docs/measurement-contract.md`; actual capture dimensions ride in
 * the row's `meta`.
 */
function captureId(grid: number): string {
  return `capture.g${String(grid)}.p64.lab.fs-s100-serp`;
}

const rows: BenchRow[] = [];
const findings: string[] = [];
const runStart = { wall: Date.now(), mono: performance.now() };

// ---------------------------------------------------------------- DOM

const status = document.createElement('p');
status.setAttribute('role', 'status');
const output = document.createElement('pre');
output.style.cssText = 'white-space:pre-wrap;font-size:12px;';
const previewCanvas = document.createElement('canvas');
previewCanvas.width = 600;
previewCanvas.height = 600;
previewCanvas.style.cssText = 'width:300px;height:300px;border:1px solid #666;';

function say(text: string): void {
  status.textContent = text;
}

function show(): void {
  output.textContent = rows
    .map((row) => {
      const median = row.summary === null ? row.reason ?? '—' : `${row.summary.median.toFixed(2)} ms (n=${String(row.summary.count)})`;
      return `${row.boundary}/${row.label} [${row.workloadId}]: ${median}`;
    })
    .concat(findings.map((f) => `finding: ${f}`))
    .join('\n');
}

function button(label: string, onClick: () => Promise<void>): HTMLButtonElement {
  const el = document.createElement('button');
  el.textContent = label;
  el.style.cssText = 'min-height:44px;min-width:44px;margin:4px;';
  el.addEventListener('click', () => {
    el.disabled = true;
    void onClick().finally(() => {
      el.disabled = false;
      show();
    });
  });
  return el;
}

// ------------------------------------------------- worker job waiting

interface SettledJob {
  startAt: number;
  settledAt: number;
  outcome: 'result' | 'error';
  marks?: FrameMarks;
}

const client = new PipelineClient();

/** Resolves per settled job; live mode streams, still mode awaits. */
let onSettled: ((job: SettledJob) => void) | null = null;
const startAts = new Map<number, number>();

client.setObserver({
  jobStarted(id, at) {
    startAts.set(id, at);
  },
  jobSettled(id, at, outcome, marks) {
    const startAt = startAts.get(id) ?? at;
    startAts.delete(id);
    onSettled?.({ startAt, settledAt: at, outcome, ...(marks ? { marks } : {}) });
  },
});

/**
 * The executor's per-stage timings for the most recent result. The
 * client delivers them synchronously after `jobSettled` fires, so a
 * caller that awaited {@link submitAndWait} reads this job's timings —
 * the still legs are strictly sequential, so the slot cannot be
 * overwritten by a concurrent job.
 */
let lastTimings: StageTiming[] = [];

/**
 * The most recent result buffer, sidecar included — same sequencing
 * guarantee as {@link lastTimings}. The backend comparison reads it to
 * assert byte equality between forced backends; it is never retained
 * across submits.
 */
let lastResult: PixelBuffer | null = null;
client.setOnResult((frame) => {
  lastTimings = frame.timings;
  lastResult = frame.buffer;
});

/** Submit one frame and await its settlement (still-input rows). */
function submitAndWait(
  buffer: PixelBuffer,
  config: PipelineConfig,
  force?: BackendForce,
): Promise<SettledJob> {
  return new Promise((resolve) => {
    onSettled = (job) => {
      onSettled = null;
      resolve(job);
    };
    client.submit(buffer, config, force);
  });
}

/** Phase decomposition of one settled job, for a row's `meta`. */
function phaseMeta(job: SettledJob): Record<string, number> {
  if (job.marks === undefined) return {};
  const m = job.marks;
  return {
    'phase queue+transfer ms': m.receivedAt - job.startAt,
    'phase compute ms': m.computeDoneAt - m.receivedAt,
    'phase bitmap ms': m.bitmapDoneAt - m.computeDoneAt,
    'phase draw ms': m.drawDoneAt - m.bitmapDoneAt,
    'phase return-transfer ms': job.settledAt - m.drawDoneAt,
  };
}

// ------------------------------------------------ still preview rows

/**
 * `preview-update` on a still submit: start when the client actually
 * posts the job, end at the worker's preview draw return (the
 * contract's end mark, carried back in `FrameMarks`). The later
 * main-thread settlement is a diagnostic phase, not the boundary.
 */
async function runStillPreview(workloadId: string): Promise<void> {
  const workload = workloadById(workloadId);
  const source = sourceBuffer(workload);
  const config: PipelineConfig = {
    preset: workload.order,
    grid: { width: workload.grid, height: workload.grid },
    resizeMode: workload.resizeMode,
    palette: palette64(),
    metric: workload.metric,
    dither: workload.dither,
  };
  const warmup = 3;
  const runs = 12;
  const samples: number[] = [];
  let lastJob: SettledJob | null = null;
  for (let i = 0; i < warmup + runs; i++) {
    const copy: PixelBuffer = {
      width: source.width,
      height: source.height,
      data: new Uint8ClampedArray(source.data),
    };
    const job = await submitAndWait(copy, config);
    if (job.outcome === 'error') {
      findings.push(`${workloadId}: worker error during still preview run`);
      return;
    }
    if (i < warmup) continue;
    if (job.marks === undefined) {
      findings.push(`${workloadId}: no frame marks — preview snapshot failed`);
      return;
    }
    samples.push(job.marks.drawDoneAt - job.startAt);
    lastJob = job;
  }
  rows.push(
    measuredRow({
      workloadId,
      boundary: 'preview-update',
      label: 'preview-update (still submit)',
      cache: 'warm',
      warmupRuns: warmup,
      samples,
      meta: lastJob === null ? {} : phaseMeta(lastJob),
    }),
  );
}

// ------------------------------- worker stage matrix (M13-PROF-01)

/**
 * The workloads the browser stage profile covers (M13-PROF-01 browser
 * half): the bv2 core block at the profiling grids, the M8 method
 * block, and the two resize-isolation expansions. Node↔browser ratios
 * pair rows by workload ID + stage label, so these IDs must be matrix
 * IDs the node bench also runs — `workloadById` throws on a typo.
 */
const STAGE_MATRIX: readonly string[] = [
  'noise.w1280.opaque.g300.p64.lab.nodither.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p489.lab.nodither.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p489.lab.fs-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p489.lab.nodither.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p489.lab.fs-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p64.lab.atkinson-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p64.lab.jarvis-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p64.lab.ordered-s100.resize-first.stretch.still',
  'noise.w1280.opaque.g300.p64.lab.bluenoise-s100.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.atkinson-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.jarvis-s100-serp.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.ordered-s100.resize-first.stretch.still',
  'noise.w1280.opaque.g1024.p64.lab.bluenoise-s100.resize-first.stretch.still',
  'noise.grid.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still',
  'noise.crop.opaque.g300.p64.lab.fs-s100-serp.resize-first.stretch.still',
];

/**
 * Per-stage profile over the real worker route: still submits of the
 * matrix above, aggregating the executor's own `StageTiming[]` into
 * bv2 `stage` rows and the worker phase marks into `pipeline-compute`
 * rows. Labels mirror the node matrix (`resize`/`reduce`/`dither`/
 * `pipeline`) so ratios pair mechanically; the report's environment
 * block names the runtime. Needs no capture gesture.
 */
async function runStageMatrix(): Promise<void> {
  for (const id of STAGE_MATRIX) {
    const workload = workloadById(id);
    const source = sourceBuffer(workload);
    const config = configFor(workload);
    // Fewer timed runs at the ceiling grid — a 1024² dither run is
    // ~0.3–0.5 s, and 5 samples already expose the spread.
    const plan = workload.grid >= 1024 ? { warmup: 2, runs: 5 } : { warmup: 2, runs: 8 };
    const perStage = new Map<string, { samples: number[]; backends: Set<Backend> }>();
    const computeSamples: number[] = [];
    let failed = false;
    for (let i = 0; i < plan.warmup + plan.runs; i++) {
      const copy: PixelBuffer = {
        width: source.width,
        height: source.height,
        data: new Uint8ClampedArray(source.data),
      };
      const job = await submitAndWait(copy, config);
      if (job.outcome === 'error') {
        findings.push(`${id}: worker error during the stage matrix`);
        failed = true;
        break;
      }
      if (i < plan.warmup) continue;
      for (const timing of lastTimings) {
        const entry = perStage.get(timing.stage) ?? { samples: [], backends: new Set<Backend>() };
        entry.samples.push(timing.ms);
        entry.backends.add(timing.backend);
        perStage.set(timing.stage, entry);
      }
      if (job.marks !== undefined) {
        computeSamples.push(job.marks.computeDoneAt - job.marks.receivedAt);
      }
    }
    if (failed) continue;
    for (const [stage, entry] of perStage) {
      const backends = [...entry.backends];
      rows.push(
        measuredRow({
          workloadId: id,
          boundary: 'stage',
          label: stage,
          backend: backends.length === 1 ? backends[0] ?? 'n/a' : 'n/a',
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: entry.samples,
          ...(backends.length === 1 ? {} : { meta: { 'mixed backends': backends.join(',') } }),
        }),
      );
    }
    if (computeSamples.length > 0) {
      rows.push(
        measuredRow({
          workloadId: id,
          boundary: 'pipeline-compute',
          label: 'pipeline',
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: computeSamples,
        }),
      );
    }
    say(`Stage matrix: ${id} done.`);
    show();
  }
  say('Stage matrix rows done.');
}

// ------------------------------------------------------- live capture

let capture: CaptureSession | null = null;
let stopPump: (() => void) | null = null;
const counters: CaptureCounters = zeroCounters();
let inFlight = 0;
let lastRvfc: VideoFrameCallbackMetadata | null = null;
let firstRvfc: VideoFrameCallbackMetadata | null = null;

/**
 * Reset the cadence marks for a fresh window. A helper rather than
 * inline `= null` assignments: inline nulls would flow-narrow these
 * captured lets to `null` for the whole window body (TS control-flow
 * analysis ignores the pump closure's re-assignments).
 */
function resetRvfc(): void {
  firstRvfc = null;
  lastRvfc = null;
}

async function startCaptureSession(): Promise<void> {
  if (capture !== null) {
    say('Capture already running.');
    return;
  }
  try {
    capture = await startCapture();
  } catch (error) {
    // A declined prompt is a normal outcome — recorded, never zero.
    rows.push(
      skippedRow({
        workloadId: captureId(300),
        boundary: 'preview-update',
        label: 'preview-update (live capture)',
        status: 'not-measured',
        reason: captureErrorMessage(error),
      }),
    );
    say(captureErrorMessage(error));
    return;
  }
  capture.video.style.cssText = 'width:200px;border:1px solid #666;';
  document.body.append(capture.video);
  capture.onEnded(() => {
    stopPump?.();
    stopPump = null;
    capture = null;
    say('Capture ended by the browser.');
  });
  // Early wrong-surface tell (2026-07-23 first run): sharing this
  // harness's own window records a near-static surface — zero frames
  // for both capture legs. Width equality against our own window in
  // device pixels is a heuristic, so it warns; the zero-frame verdict
  // after a window is the definitive check.
  const capturedWidth = capture.video.videoWidth;
  const looksLikeSelf =
    Math.abs(capturedWidth - Math.round(innerWidth * devicePixelRatio)) <= 2 ||
    Math.abs(capturedWidth - Math.round(outerWidth * devicePixelRatio)) <= 2;
  say(
    looksLikeSelf
      ? 'Capture running — but the shared surface matches this harness window’s ' +
          'width. The capture legs need the controlled source window (button 4): ' +
          'stop sharing via the browser UI, then Start capture again and pick it.'
      : 'Capture running. Use "Measure live preview" or the interaction run.',
  );
}

/**
 * Live measurement window: the shipped pump→dirty→submit loop over the
 * captured surface at a 300² grid for `seconds`, with counters
 * snapshotted every 5 s and preview-update spans taken per accepted
 * job. Mirrors `main.ts` policy (latest-wins both gates, dirty skip
 * with bounded staleness, draft governor sampled per frame).
 */
async function runLiveWindow(seconds: number): Promise<void> {
  const session = capture;
  if (session === null) {
    say('Start capture first.');
    return;
  }
  const config: PipelineConfig = {
    preset: 'resize-first',
    grid: { width: 300, height: 300 },
    resizeMode: 'stretch',
    palette: palette64(),
    metric: 'lab',
    dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
  };
  const pumpGate = new PumpGate();
  const dirtyGate = new DirtyGate();
  const governor = new DraftGovernor();
  let wasDraft = false;
  const samples: number[] = [];
  let lastJob: SettledJob | null = null;
  const pumpDropsBefore = pumpGate.droppedCount;
  const clientDropsBefore = client.droppedFrames;
  const callbacksBefore = counters.callbacks;
  // Fresh cadence readings per window — module state would otherwise
  // leak a previous window's marks into this row.
  resetRvfc();

  onSettled = (job) => {
    inFlight = Math.max(0, inFlight - 1);
    if (job.outcome === 'error') {
      counters.errors++;
      return;
    }
    counters.results++;
    if (job.marks !== undefined) {
      samples.push(job.marks.drawDoneAt - job.startAt);
      lastJob = job;
      const total = job.marks.computeDoneAt - job.marks.receivedAt;
      const nowDraft = governor.sample(total);
      if (nowDraft && !wasDraft) counters.draftEnters++;
      if (!nowDraft && wasDraft) counters.draftExits++;
      wasDraft = nowDraft;
    }
  };

  const pumpGrab = async (): Promise<void> => {
    try {
      const signature = frameSignature(hashPixels(sampleVideo(session.video)), null);
      counters.grabs++;
      const skippedBefore = dirtyGate.skippedCount;
      const forcedBefore = dirtyGate.forcedCount;
      if (!dirtyGate.shouldProcess(signature, Date.now())) {
        counters.dirtySkips += dirtyGate.skippedCount - skippedBefore;
        return;
      }
      counters.forcedRefreshes += dirtyGate.forcedCount - forcedBefore;
      const buffer = await session.grabFrame();
      counters.submitted++;
      inFlight++;
      client.submit(buffer, config);
    } catch {
      counters.errors++;
    } finally {
      if (pumpGate.grabDone()) void pumpGrab();
    }
  };

  stopPump = startFramePump(session.video, (metadata) => {
    counters.callbacks++;
    if (metadata !== undefined) {
      firstRvfc ??= metadata;
      lastRvfc = metadata;
    }
    if (pumpGate.frameArrived()) void pumpGrab();
    else counters.gateSuppressed++;
  });

  // Drive the controlled source while the window runs: the source
  // repaints only on command (bench-source.ts), so an undriven window
  // over it is static and records zeros — the 2026-07-23 first-run
  // failure. 250 ms matches the ≥ 4 updates/sec product promise. Seqs
  // sit far above the interaction run's 1..8 so the two flows can
  // never claim each other's paint replies.
  const LIVE_SEQ_BASE = 1_000_000;
  let changesCommanded = 0;
  let paintsConfirmed = 0;
  const onPaint = (event: MessageEvent): void => {
    const message = event.data as BenchSourceMessage;
    if (message.type === 'painted' && message.seq >= LIVE_SEQ_BASE) paintsConfirmed++;
  };
  sourceChannel.addEventListener('message', onPaint);
  const driver =
    sourceWindow !== null && !sourceWindow.closed
      ? setInterval(() => {
          changesCommanded++;
          sourceChannel.postMessage({
            type: 'change',
            seq: LIVE_SEQ_BASE + changesCommanded,
          } satisfies BenchSourceMessage);
        }, 250)
      : null;

  const tracker = new CounterTracker({ ...counters }, performance.now());
  say(`Measuring live capture for ${String(seconds)} s…`);
  const intervalMeta: Record<string, string | number | boolean> = {};
  for (let i = 0; i < Math.ceil(seconds / 5); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    counters.pumpDrops = pumpGate.droppedCount - pumpDropsBefore;
    counters.clientDrops = client.droppedFrames - clientDropsBefore;
    const interval = tracker.snapshot({ ...counters }, performance.now());
    intervalMeta[`interval ${String(interval.index)}`] = JSON.stringify(interval.deltas);
  }
  stopPump?.();
  stopPump = null;
  onSettled = null;
  if (driver !== null) clearInterval(driver);
  sourceChannel.removeEventListener('message', onPaint);

  counters.pumpDrops = pumpGate.droppedCount - pumpDropsBefore;
  counters.clientDrops = client.droppedFrames - clientDropsBefore;
  const violations = conservationViolations(counters, inFlight);
  for (const violation of violations) findings.push(`counter conservation: ${violation}`);

  const windowCallbacks = counters.callbacks - callbacksBefore;
  const sourceMeta: Record<string, string | number | boolean> = {
    'source window open': driver !== null,
    'source changes commanded': changesCommanded,
    'source paints confirmed': paintsConfirmed,
  };

  // A window in which no frame was ever presented is not a measured
  // zero — it is a not-measured row plus a tainting finding (the bv2
  // rule: no result is encoded as zero).
  const zeroReason = zeroFrameReason(windowCallbacks, paintsConfirmed);
  if (zeroReason !== null) {
    findings.push(`live window: ${zeroReason}`);
    rows.push(
      skippedRow({
        workloadId: captureId(300),
        boundary: 'preview-update',
        label: 'preview-update (live capture)',
        status: 'not-measured',
        reason: zeroReason,
        meta: {
          'capture width': session.video.videoWidth,
          'capture height': session.video.videoHeight,
          'page visible': document.visibilityState === 'visible',
          ...sourceMeta,
        },
      }),
    );
  } else {
    const cadence: Record<string, string | number | boolean> = {};
    if (firstRvfc !== null && lastRvfc !== null && lastRvfc !== firstRvfc) {
      // presentedFrames counts frames the browser presented; the gap to
      // our callback count is the missed-callback figure.
      const presented = lastRvfc.presentedFrames - firstRvfc.presentedFrames;
      cadence['rvfc presentedFrames delta'] = presented;
      cadence['rvfc missed callbacks'] = Math.max(0, presented - counters.callbacks);
    } else {
      cadence['rvfc metadata'] = 'unsupported';
    }

    rows.push(
      measuredRow({
        workloadId: captureId(300),
        boundary: 'preview-update',
        label: 'preview-update (live capture)',
        cache: 'warm',
        warmupRuns: 0,
        samples,
        meta: {
          'capture width': session.video.videoWidth,
          'capture height': session.video.videoHeight,
          'updates/sec over window': samples.length / seconds,
          'window callbacks': windowCallbacks,
          'page visible': document.visibilityState === 'visible',
          ...sourceMeta,
          ...countersMeta(counters, 'counter '),
          ...cadence,
          ...intervalMeta,
          ...(lastJob === null ? {} : phaseMeta(lastJob)),
        },
      }),
    );
  }
  if (document.visibilityState !== 'visible') {
    findings.push('page was hidden during the live window — throttled, not evidence');
  }
  say('Live window done.');
}

// -------------------------------------------------------- interaction

let sourceWindow: Window | null = null;
const sourceChannel = new BroadcastChannel('csl-bench-source');

async function openSource(): Promise<void> {
  sourceWindow = window.open('/bench-source.html', 'csl-bench-source', 'width=800,height=600');
  if (sourceWindow === null) {
    findings.push('popup blocked — open /bench-source.html manually in a second window');
    say('Popup blocked. Open /bench-source.html manually, then share that window.');
    return;
  }
  say('Source window open. Start capture and choose that window in the picker.');
  return Promise.resolve();
}

/**
 * `interaction` against the controlled source: the span from the
 * source window's own paint mark to the preview draw return of the
 * first job started after it. Never reconstructed from medians. Real
 * Photoshop interaction remains the manual M13-ACCEPT-02 leg.
 */
async function runInteraction(changes: number): Promise<void> {
  const session = capture;
  if (session === null) {
    say('Start capture first (share the source window).');
    return;
  }
  const config: PipelineConfig = {
    preset: 'resize-first',
    grid: { width: 300, height: 300 },
    resizeMode: 'stretch',
    palette: palette64(),
    metric: 'lab',
    dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
  };
  const pumpGate = new PumpGate();
  const dirtyGate = new DirtyGate();
  const samples: number[] = [];
  let misses = 0;
  let pumpCallbacks = 0;
  let paintsConfirmed = 0;
  let paintedAt: number | null = null;
  let settleWaiter: ((span: number | null) => void) | null = null;

  onSettled = (job) => {
    inFlight = Math.max(0, inFlight - 1);
    if (job.outcome !== 'result' || job.marks === undefined) return;
    if (paintedAt !== null && job.startAt > paintedAt && settleWaiter !== null) {
      const waiter = settleWaiter;
      settleWaiter = null;
      waiter(job.marks.drawDoneAt - paintedAt);
    }
  };

  const pumpGrab = async (): Promise<void> => {
    try {
      const signature = frameSignature(hashPixels(sampleVideo(session.video)), null);
      if (dirtyGate.shouldProcess(signature, Date.now())) {
        const buffer = await session.grabFrame();
        inFlight++;
        client.submit(buffer, config);
      }
    } catch {
      /* a failed grab surfaces as a missed change below */
    } finally {
      if (pumpGate.grabDone()) void pumpGrab();
    }
  };
  const stop = startFramePump(session.video, () => {
    pumpCallbacks++;
    if (pumpGate.frameArrived()) void pumpGrab();
  });

  say(`Running ${String(changes)} controlled changes…`);
  for (let seq = 1; seq <= changes; seq++) {
    const painted = new Promise<number | null>((resolve) => {
      // The timeout also detaches the handler — a missed paint must
      // not leave a stale listener on the channel.
      const timeout = setTimeout(() => {
        sourceChannel.removeEventListener('message', handler);
        resolve(null);
      }, 3000);
      function handler(event: MessageEvent): void {
        const message = event.data as BenchSourceMessage;
        if (message.type === 'painted' && message.seq === seq) {
          clearTimeout(timeout);
          sourceChannel.removeEventListener('message', handler);
          resolve(message.at);
        }
      }
      sourceChannel.addEventListener('message', handler);
    });
    sourceChannel.postMessage({ type: 'change', seq } satisfies BenchSourceMessage);
    const at = await painted;
    if (at === null) {
      findings.push(`interaction change ${String(seq)}: source window never confirmed its paint`);
      misses++;
      continue;
    }
    paintsConfirmed++;
    paintedAt = at;
    const span = await new Promise<number | null>((resolve) => {
      const waiter = (value: number | null): void => {
        resolve(value);
      };
      settleWaiter = waiter;
      // Identity guard, not a null check: this timer outlives a fast
      // settle, and a stale firing must be a no-op. A null check here
      // let a leftover timer from a fast change steal a later change's
      // waiter — that waiter could then never resolve, freezing the
      // whole run (the 2026-07-23 run-2 hang at change 3).
      setTimeout(() => {
        if (settleWaiter === waiter) {
          settleWaiter = null;
          resolve(null);
        }
      }, 5000);
    });
    paintedAt = null;
    if (span === null) misses++;
    else samples.push(span);
    // Space the changes out so spans never overlap.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  stop();
  onSettled = null;

  // Zero presented frames means the shared surface never showed the
  // source window's paints — publish the cause, never eight silent
  // misses (the 2026-07-23 first-run signature).
  const zeroReason = zeroFrameReason(pumpCallbacks, paintsConfirmed);
  if (zeroReason !== null) {
    findings.push(`interaction: ${zeroReason}`);
    rows.push(
      skippedRow({
        workloadId: captureId(300),
        boundary: 'interaction',
        label: 'interaction (controlled source)',
        status: 'not-measured',
        reason: zeroReason,
        meta: {
          'changes commanded': changes,
          'changes missed': misses,
          'source paints confirmed': paintsConfirmed,
          source: 'bench-source window (same origin, paint-timestamped)',
        },
      }),
    );
    say('Interaction run collected no spans — see findings.');
    return;
  }
  if (samples.length === 0) {
    // Frames flowed yet nothing settled after any paint — a different
    // defect (dirty gate, worker path); name it rather than let an
    // empty row pass without a cause.
    findings.push(
      `interaction: all ${String(changes)} changes missed despite ` +
        `${String(pumpCallbacks)} presented frames — investigate dirty gate or worker path`,
    );
  }
  rows.push(
    measuredRow({
      workloadId: captureId(300),
      boundary: 'interaction',
      label: 'interaction (controlled source)',
      cache: 'warm',
      warmupRuns: 0,
      samples,
      meta: {
        'changes commanded': changes,
        'changes missed': misses,
        'source paints confirmed': paintsConfirmed,
        'pump callbacks': pumpCallbacks,
        source: 'bench-source window (same origin, paint-timestamped)',
      },
    }),
  );
  say('Interaction run done.');
}

// ------------------------------------------------------------ exports

/**
 * `export`: from the export request to the encoded artefact ready.
 * Children (worker pipeline re-run, scale, encode, chart raster, PDF
 * assembly) are measured as their own rows so the composite is
 * decomposable without reconstructing it from medians.
 */
async function runExports(): Promise<void> {
  const workload = workloadById(STILL_300);
  const source = sourceBuffer(workload);
  const p64 = palette64();
  const config: PipelineConfig = {
    preset: 'resize-first',
    grid: { width: 300, height: 300 },
    resizeMode: 'stretch',
    palette: p64,
    metric: 'lab',
    dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
  };
  const copy = (): PixelBuffer => ({
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  });
  const plan = { warmup: 1, runs: 5 };

  const pipelineSamples = await measureAsync(async () => client.exportFrame(copy(), config), plan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export/pipeline re-run',
      cache: 'warm',
      warmupRuns: plan.warmup,
      samples: pipelineSamples,
    }),
  );

  const frame = await client.exportFrame(copy(), config);

  const scaleSamples = measure(() => scaleNearest(frame, 4), plan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export/scale ×4',
      cache: 'warm',
      warmupRuns: plan.warmup,
      samples: scaleSamples,
    }),
  );
  const scaled = scaleNearest(frame, 4);
  const encodeSamples = await measureAsync(async () => encodePngBlob(scaled), plan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export/encode png (×4)',
      cache: 'warm',
      warmupRuns: plan.warmup,
      samples: encodeSamples,
    }),
  );
  // Composite: request → encoded clean PNG ready.
  const cleanSamples = await measureAsync(async () => {
    const out = await client.exportFrame(copy(), config);
    await encodePngBlob(scaleNearest(out, 4));
  }, plan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export (clean png ×4)',
      cache: 'warm',
      warmupRuns: plan.warmup,
      samples: cleanSamples,
    }),
  );

  const chartPlan = { warmup: 1, runs: 3 };
  const chartSamples = await measureAsync(async () => {
    const out = await client.exportFrame(copy(), config);
    await encodeChartPng(out, DEFAULT_GRID_STYLE, 10);
  }, chartPlan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export (chart png, cell 10)',
      cache: 'warm',
      warmupRuns: chartPlan.warmup,
      samples: chartSamples,
    }),
  );

  const pdfSamples = await measureAsync(async () => {
    const out = await client.exportFrame(copy(), config);
    const cell = 8;
    const layout = chartLayout(out.width, out.height, DEFAULT_GRID_STYLE, cell);
    const chartBlob = await encodeChartPng(out, DEFAULT_GRID_STYLE, cell);
    const chartPng = new Uint8Array(await chartBlob.arrayBuffer());
    const entries: KeyEntry[] = computeStats(out, p64).perColor.map((c) => ({
      hex: c.hex,
      rgb: c.rgb,
    }));
    await buildChartPdf(chartPng, layout.width, layout.height, entries, {
      pageSize: 'a4',
      orientation: 'portrait',
      marginMm: 12,
      title: 'bench',
    });
  }, chartPlan);
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export (single-page pdf)',
      cache: 'warm',
      warmupRuns: chartPlan.warmup,
      samples: pdfSamples,
    }),
  );
  say('Export rows done.');
}

// ------------------------------------------ M5-era production checks

/** GPU LUT agreement (M5-PERF-32), now emitted as bv2 prepare rows. */
async function gpuChecks(): Promise<void> {
  const dmc = loadDmcPalette();
  const p64 = palette64();
  if (!isWebGpuAvailable()) {
    rows.push(
      skippedRow({
        workloadId: STILL_300,
        boundary: 'prepare',
        label: 'lut-build (webgpu)',
        status: 'unsupported',
        reason: 'WebGPU unavailable in this browser',
      }),
    );
    return;
  }
  const agreement = async (palette: Palette, metric: ColorMetric): Promise<void> => {
    const label = `${String(palette.entries.length)}/${metric}`;
    const gpu = await buildLutGpu(palette, metric);
    if (gpu === null) {
      findings.push(`GPU LUT ${label}: buildLutGpu returned null — kernel unavailable`);
      return;
    }
    const ts = buildLut(palette, metric);
    let mismatches = 0;
    for (let i = 0; i < LUT_SIZE; i++) if (gpu[i] !== ts[i]) mismatches++;
    const distinct = new Set(gpu).size;
    rows.push(
      measuredRow({
        workloadId: STILL_300,
        boundary: 'prepare',
        label: `lut-build agreement (webgpu, ${label})`,
        backend: 'webgpu',
        cache: 'cold',
        warmupRuns: 0,
        samples: [0],
        meta: {
          mismatches,
          verdict: mismatches === 0 ? 'EXACT' : 'DISAGREES',
          'all-zeros trap': distinct <= 1 && palette.entries.length > 1 ? 'TRIPPED' : 'clear',
        },
      }),
    );
  };
  await agreement(p64, 'lab');
  await agreement(p64, 'rgb');
  await agreement(dmc, 'lab');

  // The M5-PERF-23 gate row: production-build ts vs webgpu per-pixel
  // map, on the matrix's grid-sized 1024² source (already at grid, so
  // this isolates the mapping stage exactly as the node row does).
  const resized = sourceBuffer(
    workloadById('noise.grid.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still'),
  );
  const lut = buildLut(p64, 'lab');
  const tsSamples = measure(
    () => reduceStage.backends.ts(resized, { palette: p64, metric: 'lab', path: 'lut', lut }),
    { warmup: 3, runs: 15 },
  );
  rows.push(
    measuredRow({
      workloadId: 'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still',
      boundary: 'stage',
      label: 'reduce (production ts, page context)',
      backend: 'ts',
      cache: 'warm',
      warmupRuns: 3,
      samples: tsSamples,
    }),
  );
  const probe = await mapPaletteGpu(resized, p64, lut);
  if (probe === null) {
    findings.push('mapPaletteGpu returned null on a production build — kernel unavailable');
    return;
  }
  const gpuSamples = await measureAsync(async () => mapPaletteGpu(resized, p64, lut), {
    warmup: 3,
    runs: 15,
  });
  rows.push(
    measuredRow({
      workloadId: 'noise.w1280.opaque.g1024.p64.lab.nodither.resize-first.stretch.still',
      boundary: 'stage',
      label: 'reduce (webgpu map, end-to-end)',
      backend: 'webgpu',
      cache: 'warm',
      warmupRuns: 3,
      samples: gpuSamples,
    }),
  );
}

// --------------------------------- LUT build timing (M13-PROF-02)

/** The p489 core workload the DMC prepare rows are identified under. */
const STILL_300_P489 = 'noise.w1280.opaque.g300.p489.lab.fs-s100-serp.resize-first.stretch.still';

/**
 * GPU-vs-TS LUT build, timed end-to-end (M13-PROF-02 browser half).
 * `buildLutGpu` contains the full end-to-end cost the ticket asks
 * about — palette flatten/upload, dispatch, readback — and the module
 * caches device and pipeline, so the first call is its own cold row
 * (device request + shader compile) and later calls are the steady
 * per-build price. Labels match the node bench's prepare rows so the
 * TS halves pair by ID + label. Agreement is asserted on every timed
 * palette — a fast GPU number without bin agreement is a defect signal
 * (D46), never a result.
 */
async function lutBuildTiming(): Promise<void> {
  const cases: readonly (readonly [Palette, string, string])[] = [
    [palette64(), 'dmc-64-bench', STILL_300],
    [loadDmcPalette(), 'DMC', STILL_300_P489],
  ];
  const plan = { warmup: 1, runs: 5 };
  for (const [palette, name, id] of cases) {
    const samples = measure(() => buildLut(palette, 'lab'), plan);
    rows.push(
      measuredRow({
        workloadId: id,
        boundary: 'prepare',
        label: `lut-build (${name}:lab)`,
        backend: 'ts',
        cache: 'cold',
        warmupRuns: plan.warmup,
        samples,
      }),
    );
  }
  if (!isWebGpuAvailable()) {
    rows.push(
      skippedRow({
        workloadId: STILL_300,
        boundary: 'prepare',
        label: 'lut-build timing (webgpu)',
        status: 'unsupported',
        reason: 'WebGPU unavailable in this browser',
      }),
    );
    return;
  }
  const firstStart = performance.now();
  const first = await buildLutGpu(palette64(), 'lab');
  const firstMs = performance.now() - firstStart;
  if (first === null) {
    findings.push('lut timing: buildLutGpu returned null — kernel unavailable');
    return;
  }
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'prepare',
      label: 'lut-build (webgpu first call: device+pipeline+build)',
      backend: 'webgpu',
      cache: 'cold',
      warmupRuns: 0,
      samples: [firstMs],
    }),
  );
  for (const [palette, name, id] of cases) {
    const samples = await measureAsync(async () => buildLutGpu(palette, 'lab'), plan);
    const gpu = await buildLutGpu(palette, 'lab');
    if (gpu === null) {
      findings.push(`lut timing (${name}): buildLutGpu returned null mid-run`);
      continue;
    }
    const ts = buildLut(palette, 'lab');
    let mismatches = 0;
    for (let i = 0; i < LUT_SIZE; i++) if (gpu[i] !== ts[i]) mismatches++;
    const distinct = new Set(gpu).size;
    rows.push(
      measuredRow({
        workloadId: id,
        boundary: 'prepare',
        label: `lut-build (webgpu steady, ${name}:lab)`,
        backend: 'webgpu',
        cache: 'cold',
        warmupRuns: plan.warmup,
        samples,
        meta: {
          mismatches,
          verdict: mismatches === 0 ? 'EXACT' : 'DISAGREES',
          'all-zeros trap': distinct <= 1 && palette.entries.length > 1 ? 'TRIPPED' : 'clear',
        },
      }),
    );
  }
  say('LUT build timing done.');
}

// --------------------- selection-source contention (M13-PROF-02)

/**
 * Does the palette-selection full-RGB export block live preview?
 * (M13-PROF-02.) The worker is single-threaded and FIFO, so an export
 * job serialises with frame jobs regardless of where frames originate
 * — which makes the contention measurable without a capture gesture: a
 * still-submit pump at the product-promise cadence (250 ms) stands in
 * for the live path, and `exportFrame` with the app's own
 * `fullRgbVariant` config is exactly the `ensureSelectionSource` call
 * (`src/main.ts`). Each export is chased by an immediate probe submit,
 * so at least one frame per export records the worst-case FIFO
 * displacement. Caveat carried in the labels: pump cadence is
 * synthetic — the capture-path confirmation is M13-PROF-04's live leg.
 */
async function runContentionProbe(): Promise<void> {
  const workload = workloadById(STILL_300);
  const source = sourceBuffer(workload);
  const config = configFor(workload);
  const selectionConfig = fullRgbVariant(config);
  const copy = (): PixelBuffer => ({
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  });
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const spanRecords: { startAt: number; endAt: number }[] = [];
  let workerErrors = 0;
  onSettled = (job) => {
    if (job.outcome !== 'result') {
      workerErrors++;
      return;
    }
    if (job.marks === undefined) return;
    spanRecords.push({ startAt: job.startAt, endAt: job.marks.drawDoneAt });
  };
  const dropsBefore = client.droppedFrames;
  let submits = 0;
  const pump = setInterval(() => {
    submits++;
    client.submit(copy(), config);
  }, 250);

  say('Contention probe: 4 s baseline, then 5 exports…');
  await sleep(4000);
  const exportWindows: { start: number; end: number }[] = [];
  const exportSamples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const startAbs = absNow();
    const start = performance.now();
    const pending = client.exportFrame(copy(), selectionConfig);
    // Probe frame posted straight behind the export: the worker is
    // FIFO, so its span records the worst-case displacement.
    submits++;
    client.submit(copy(), config);
    await pending;
    exportSamples.push(performance.now() - start);
    exportWindows.push({ start: startAbs, end: absNow() });
    await sleep(1200);
  }
  await sleep(800);
  clearInterval(pump);
  // Let the last in-flight frame settle before detaching the sink.
  await sleep(600);
  onSettled = null;

  const overlapped: number[] = [];
  const baseline: number[] = [];
  for (const record of spanRecords) {
    const hits = exportWindows.some((w) => record.startAt < w.end && record.endAt > w.start);
    (hits ? overlapped : baseline).push(record.endAt - record.startAt);
  }
  const meta: Record<string, string | number | boolean> = {
    'pump cadence ms': 250,
    submits,
    'client drops': client.droppedFrames - dropsBefore,
    'worker errors': workerErrors,
    exports: exportWindows.length,
  };
  if (baseline.length === 0) {
    findings.push('contention probe: no baseline preview span settled — worker path broken');
  } else {
    rows.push(
      measuredRow({
        workloadId: STILL_300,
        boundary: 'preview-update',
        label: 'preview-update (still pump, no export)',
        cache: 'warm',
        warmupRuns: 0,
        samples: baseline,
        meta,
      }),
    );
  }
  if (overlapped.length === 0) {
    findings.push('contention probe: no preview span overlapped an export window');
  } else {
    rows.push(
      measuredRow({
        workloadId: STILL_300,
        boundary: 'preview-update',
        label: 'preview-update (still pump, overlapping selection-source export)',
        cache: 'warm',
        warmupRuns: 0,
        samples: overlapped,
        meta,
      }),
    );
  }
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'export',
      label: 'export (selection-source full-rgb, w1280→300²)',
      cache: 'warm',
      warmupRuns: 0,
      samples: exportSamples,
      meta: { context: 'concurrent 250 ms still pump' },
    }),
  );
  say('Contention probe done.');
}

// ------------------- backend end-to-end comparison (M13-PROF-03)

/** Fresh copy of a source buffer (submits transfer their pixels). */
function copyOf(source: PixelBuffer): PixelBuffer {
  return {
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  };
}

/** Median of a sample set (report rows carry the full distribution). */
function medianOf(samples: readonly number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}

/**
 * Byte-level output comparison, sidecar included. Every backend-
 * comparison timing row carries one of these verdicts: a fast invalid
 * result is a defect signal, never a win (D46).
 */
function compareOutputs(
  a: PixelBuffer,
  b: PixelBuffer,
): { verdict: 'EXACT' | 'DISAGREES'; pixelMismatches: number; indices: string } {
  let pixelMismatches = 0;
  if (a.data.length !== b.data.length) {
    pixelMismatches = Math.abs(a.data.length - b.data.length);
  } else {
    for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) pixelMismatches++;
  }
  let indices: string;
  const ai = a.indices;
  const bi = b.indices;
  if (ai === undefined && bi === undefined) indices = 'absent on both';
  else if (ai === undefined || bi === undefined) indices = 'missing on one side';
  else if (ai.length !== bi.length) indices = 'length mismatch';
  else {
    let mismatches = 0;
    for (let i = 0; i < ai.length; i++) if (ai[i] !== bi[i]) mismatches++;
    indices = mismatches === 0 ? 'EXACT' : `${String(mismatches)} mismatches`;
  }
  const verdict =
    pixelMismatches === 0 && (indices === 'EXACT' || indices === 'absent on both')
      ? 'EXACT'
      : 'DISAGREES';
  return { verdict, pixelMismatches, indices };
}

/**
 * The FS cells the worker-route comparison sweeps: the two routing
 * rules' own axes (metric × palette × grid). Lab cells are frozen-
 * matrix IDs; rgb cells beyond the matrix's one rgb row are built
 * through the same grammar (`workloadId`), so their IDs stay truthful
 * about every axis without widening the frozen matrix itself.
 */
function backendCells(): Workload[] {
  const cells: Workload[] = [];
  for (const metric of ['lab', 'rgb'] as const) {
    for (const palette of ['p64', 'p489'] as const) {
      for (const grid of [200, 300, 1024]) {
        const spec = {
          source: 'noise' as const,
          sourceSize: 'w1280' as const,
          alpha: 'opaque' as const,
          grid,
          palette,
          metric,
          dither: FS_DEFAULT,
          order: 'resize-first' as const,
          resizeMode: 'stretch' as const,
          path: 'still' as const,
        };
        cells.push({ id: workloadId(spec), ...spec });
      }
    }
  }
  return cells;
}

/**
 * Wait (bounded) until a forced-wasm dither actually runs wasm in the
 * worker — registration there is fire-and-forget at startup, so an
 * early forced frame can legitimately fall back to ts.
 */
async function awaitWasmInWorker(): Promise<boolean> {
  const workload = workloadById(STILL_200);
  const source = sourceBuffer(workload);
  const config = configFor(workload);
  for (let attempt = 0; attempt < 10; attempt++) {
    const job = await submitAndWait(copyOf(source), config, { dither: 'wasm' });
    if (
      job.outcome === 'result' &&
      lastTimings.some((t) => t.stage === 'dither' && t.backend === 'wasm')
    ) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

/**
 * Cold initialisation rows: the once-per-context costs a routing
 * decision would amortise. The wasm figure is the page-context
 * fetch+compile+init of the same pkg the worker loads (the worker's
 * own registration is unobservable from here); the GPU figure is
 * device acquisition, cold only when this leg runs before any other
 * GPU leg — the meta says which.
 */
async function runBackendColdInit(): Promise<void> {
  if (__WASM_AVAILABLE__) {
    const start = performance.now();
    const registered = await registerWasmDither();
    const ms = performance.now() - start;
    if (registered) {
      rows.push(
        measuredRow({
          workloadId: STILL_300,
          boundary: 'prepare',
          label: 'wasm module init (page context)',
          backend: 'wasm',
          cache: 'cold',
          warmupRuns: 0,
          samples: [ms],
          meta: { 'one-shot': 'module caching makes later calls no-ops' },
        }),
      );
    } else {
      findings.push('backend comparison: page-context wasm registration failed');
    }
  } else {
    rows.push(
      skippedRow({
        workloadId: STILL_300,
        boundary: 'prepare',
        label: 'wasm module init (page context)',
        status: 'unsupported',
        reason: 'wasm pkg not built into this bundle',
      }),
    );
  }
  const start = performance.now();
  const device = await getDevice();
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'prepare',
      label: 'gpu device acquisition (page context)',
      backend: 'webgpu',
      cache: 'cold',
      warmupRuns: 0,
      samples: [performance.now() - start],
      meta: {
        available: device !== null,
        'cold only when the backend leg runs before other GPU legs': true,
      },
    }),
  );
}

/**
 * TS↔WASM Floyd–Steinberg through the shipped worker route, both
 * backends forced onto every cell of the routing rules' own axes,
 * interleaved run-for-run to share thermal and GC noise. Each cell
 * publishes per-backend `stage` rows (the executor's own dither
 * timing, so wasm boundary copies are inside the mark) and
 * `preview-update` rows (the full user-visible span), with byte
 * equality of pixels *and* the palette-index sidecar asserted between
 * the two backends' outputs.
 */
async function runBackendDitherMatrix(): Promise<void> {
  const wasmUp = await awaitWasmInWorker();
  if (!wasmUp) {
    rows.push(
      skippedRow({
        workloadId: STILL_300,
        boundary: 'stage',
        label: 'dither backend comparison',
        status: 'unsupported',
        reason: 'wasm backend never became available in the worker',
      }),
    );
    return;
  }
  const sides = ['ts', 'wasm'] as const;
  for (const cell of backendCells()) {
    const source = sourceBuffer(cell);
    const config = configFor(cell);
    const routed = routeDither({
      grid: cell.grid,
      paletteSize: config.palette?.entries.length ?? 0,
      metric: cell.metric,
      algorithm: 'floyd-steinberg',
      strength: 1,
    });
    const plan = cell.grid >= 1024 ? { warmup: 1, runs: 5 } : { warmup: 2, runs: 8 };
    const perSide: Record<
      (typeof sides)[number],
      { stage: number[]; preview: number[]; used: Set<Backend>; final: PixelBuffer | null }
    > = {
      ts: { stage: [], preview: [], used: new Set(), final: null },
      wasm: { stage: [], preview: [], used: new Set(), final: null },
    };
    let failed = false;
    for (let i = 0; i < plan.warmup + plan.runs && !failed; i++) {
      for (const side of sides) {
        const job = await submitAndWait(copyOf(source), config, { dither: side });
        if (job.outcome === 'error') {
          findings.push(`${cell.id}: worker error during backend comparison (forced ${side})`);
          failed = true;
          break;
        }
        if (i < plan.warmup) continue;
        const timing = lastTimings.find((t) => t.stage === 'dither');
        if (timing !== undefined) {
          perSide[side].stage.push(timing.ms);
          perSide[side].used.add(timing.backend);
        }
        if (job.marks !== undefined) {
          perSide[side].preview.push(job.marks.drawDoneAt - job.startAt);
        }
        perSide[side].final = lastResult;
      }
    }
    if (failed) continue;
    if (perSide.wasm.used.has('ts')) {
      findings.push(`${cell.id}: forced wasm fell back to ts mid-run — cell not comparable`);
      continue;
    }
    const equality =
      perSide.ts.final !== null && perSide.wasm.final !== null
        ? compareOutputs(perSide.ts.final, perSide.wasm.final)
        : null;
    if (equality !== null && equality.verdict !== 'EXACT') {
      findings.push(
        `${cell.id}: forced ts and wasm outputs disagree — ` +
          `${String(equality.pixelMismatches)} pixel bytes, indices ${equality.indices}`,
      );
    }
    const winner =
      medianOf(perSide.ts.stage) <= medianOf(perSide.wasm.stage) ? 'ts' : 'wasm';
    for (const side of sides) {
      const meta: Record<string, string | number | boolean> = {
        'routed backend': routed,
        'stage winner this cell': winner,
        ...(equality === null
          ? {}
          : {
              'output vs other side': equality.verdict,
              'indices sidecar': equality.indices,
            }),
      };
      rows.push(
        measuredRow({
          workloadId: cell.id,
          boundary: 'stage',
          label: `dither (forced ${side})`,
          backend: side,
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: perSide[side].stage,
          meta,
        }),
      );
      rows.push(
        measuredRow({
          workloadId: cell.id,
          boundary: 'preview-update',
          label: `preview-update (forced ${side})`,
          backend: side,
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: perSide[side].preview,
          meta,
        }),
      );
    }
    say(`Backend matrix: ${cell.id} done.`);
    show();
  }
}

/**
 * TS LUT-map vs `mapPaletteGpu`, end-to-end in page context (the GPU
 * kernel is async and unrouted by design — D41/M5-PERF-23 — so the
 * page is where its candidate cost is honestly measurable). Grid-sized
 * sources isolate the mapping from resize. The GPU side has a hard
 * capability gap either way: it returns no palette-index sidecar, so
 * wiring it as-is would erase thread identity (D55) — carried on every
 * row rather than argued from speed.
 */
async function runMapBackendSweep(): Promise<void> {
  if (!isWebGpuAvailable()) {
    rows.push(
      skippedRow({
        workloadId: STILL_300,
        boundary: 'stage',
        label: 'reduce backend comparison',
        status: 'unsupported',
        reason: 'WebGPU unavailable in this browser',
      }),
    );
    return;
  }
  const palettes = [
    ['p64' as const, palette64()],
    ['p489' as const, loadDmcPalette()],
  ] as const;
  for (const [axis, palette] of palettes) {
    for (const grid of [200, 300, 1024]) {
      const spec = {
        source: 'noise' as const,
        sourceSize: 'grid' as const,
        alpha: 'opaque' as const,
        grid,
        palette: axis,
        metric: 'lab' as const,
        dither: NO_DITHER,
        order: 'resize-first' as const,
        resizeMode: 'stretch' as const,
        path: 'still' as const,
      };
      const id = workloadId(spec);
      const source = sourceBuffer({ id, ...spec });
      const lut = buildLut(palette, 'lab');
      const params = { palette, metric: 'lab' as const, path: 'lut' as const, lut };
      const probe = await mapPaletteGpu(source, palette, lut);
      if (probe === null) {
        findings.push(`${id}: mapPaletteGpu returned null — kernel unavailable`);
        continue;
      }
      const plan = grid >= 1024 ? { warmup: 2, runs: 6 } : { warmup: 2, runs: 8 };
      for (let i = 0; i < plan.warmup; i++) {
        reduceStage.backends.ts(source, params);
        await mapPaletteGpu(source, palette, lut);
      }
      const tsSamples: number[] = [];
      const gpuSamples: number[] = [];
      for (let i = 0; i < plan.runs; i++) {
        const tsStart = performance.now();
        reduceStage.backends.ts(source, params);
        tsSamples.push(performance.now() - tsStart);
        const gpuStart = performance.now();
        await mapPaletteGpu(source, palette, lut);
        gpuSamples.push(performance.now() - gpuStart);
      }
      const tsOut = reduceStage.backends.ts(source, params);
      const gpuOut = await mapPaletteGpu(source, palette, lut);
      let pixelMismatches = -1;
      if (gpuOut !== null) {
        pixelMismatches = 0;
        for (let i = 0; i < tsOut.data.length; i++) {
          if (tsOut.data[i] !== gpuOut.data[i]) pixelMismatches++;
        }
        if (pixelMismatches > 0) {
          findings.push(
            `${id}: mapPaletteGpu pixels disagree with ts LUT path — ` +
              `${String(pixelMismatches)} bytes`,
          );
        }
      }
      const meta: Record<string, string | number | boolean> = {
        'pixel verdict': pixelMismatches === 0 ? 'EXACT' : 'DISAGREES',
        'indices sidecar': 'ts emits it; gpu returns none — unroutable as-is (D55)',
        'winner (median)': medianOf(tsSamples) <= medianOf(gpuSamples) ? 'ts' : 'webgpu',
      };
      rows.push(
        measuredRow({
          workloadId: id,
          boundary: 'stage',
          label: 'reduce (ts lut path, page context)',
          backend: 'ts',
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: tsSamples,
          meta,
        }),
      );
      rows.push(
        measuredRow({
          workloadId: id,
          boundary: 'stage',
          label: 'reduce (webgpu map, end-to-end)',
          backend: 'webgpu',
          cache: 'warm',
          warmupRuns: plan.warmup,
          samples: gpuSamples,
          meta,
        }),
      );
      say(`Map sweep: ${id} done.`);
    }
  }
}

/**
 * Per-call palette preparation the wasm adapter pays on *every frame*:
 * it recomputes the Lab flatten per call (`paletteLab` builds a fresh
 * Float32Array each time — src/backends/wasm/dither.ts). Timed here so
 * the synthesis can weigh caching it; at p64 it may be noise, at p489
 * it is 489 sRGB→Lab conversions per frame.
 */
function runPaletteFlattenRows(): void {
  const cases = [
    [palette64(), 'dmc-64-bench', STILL_300],
    [loadDmcPalette(), 'DMC', STILL_300_P489],
  ] as const;
  const plan = { warmup: 2, runs: 10 };
  for (const [palette, name, id] of cases) {
    const samples = measure(() => paletteLab(palette), plan);
    rows.push(
      measuredRow({
        workloadId: id,
        boundary: 'prepare',
        label: `palette lab flatten (${name})`,
        backend: 'ts',
        cache: 'warm',
        warmupRuns: plan.warmup,
        samples,
        meta: { 'recomputed per wasm dither call': true },
      }),
    );
  }
}

/**
 * The rgb→wasm rule at the full export boundary: the matrix's one
 * routed-wasm workload exported with routing (wasm) and forced ts,
 * interleaved. A stage win that disappears in the composite would
 * show up here.
 */
async function runExportBackendComparison(): Promise<void> {
  const cell = workloadById(
    'noise.w1280.opaque.g1024.p64.rgb.fs-s100-serp.resize-first.stretch.still',
  );
  const source = sourceBuffer(cell);
  const config = configFor(cell);
  const plan = { warmup: 1, runs: 4 };
  const sides: readonly (readonly [string, BackendForce | undefined])[] = [
    ['routed (wasm)', undefined],
    ['forced ts', { dither: 'ts' }],
  ];
  for (let i = 0; i < plan.warmup; i++) {
    for (const [, force] of sides) await client.exportFrame(copyOf(source), config, force);
  }
  const samples = new Map<string, number[]>();
  for (let i = 0; i < plan.runs; i++) {
    for (const [name, force] of sides) {
      const start = performance.now();
      await client.exportFrame(copyOf(source), config, force);
      const list = samples.get(name) ?? [];
      list.push(performance.now() - start);
      samples.set(name, list);
    }
  }
  const routedOut = await client.exportFrame(copyOf(source), config);
  const forcedOut = await client.exportFrame(copyOf(source), config, { dither: 'ts' });
  const equality = compareOutputs(routedOut, forcedOut);
  if (equality.verdict !== 'EXACT') {
    findings.push(
      `${cell.id}: routed and forced-ts exports disagree — ` +
        `${String(equality.pixelMismatches)} pixel bytes, indices ${equality.indices}`,
    );
  }
  for (const [name] of sides) {
    rows.push(
      measuredRow({
        workloadId: cell.id,
        boundary: 'export',
        label: `export/pipeline re-run (${name})`,
        backend: name === 'forced ts' ? 'ts' : 'wasm',
        cache: 'warm',
        warmupRuns: plan.warmup,
        samples: samples.get(name) ?? [],
        meta: {
          'output vs other side': equality.verdict,
          'indices sidecar': equality.indices,
        },
      }),
    );
  }
}

/**
 * Fallback and validity probes — each current failure path answered
 * exactly once, with the output still correct (D46: a silent path
 * wedges live preview permanently; a fast wrong result is a defect).
 */
async function runFallbackProbes(): Promise<void> {
  // Probe A: a forced backend that is not registered in the worker
  // (webgpu never implements the StageFn contract) must fall back to
  // ts and still answer.
  const still = workloadById(STILL_300);
  const jobA = await submitAndWait(copyOf(sourceBuffer(still)), configFor(still), {
    dither: 'webgpu',
  });
  const usedA = lastTimings.find((t) => t.stage === 'dither')?.backend ?? 'none';
  if (jobA.outcome !== 'result' || usedA !== 'ts') {
    findings.push(
      `fallback probe: forced unregistered backend answered ${jobA.outcome} on '${usedA}' — expected a ts fallback result`,
    );
  }
  rows.push(
    measuredRow({
      workloadId: still.id,
      boundary: 'stage',
      label: 'dither (forced unregistered webgpu → fallback)',
      backend: 'ts',
      cache: 'n/a',
      warmupRuns: 0,
      samples: [0],
      meta: {
        answered: jobA.outcome === 'result',
        'fell back to': usedA,
        verdict: jobA.outcome === 'result' && usedA === 'ts' ? 'PASS' : 'FAIL',
      },
    }),
  );

  // Probe B: forced wasm with a non-FS method — the adapter guards by
  // delegating to the TS reference internally (M8-ALG-01), so the
  // output must be byte-identical to the routed ts run. Note the
  // timing-label consequence: StageTiming.backend reports 'wasm'
  // while TS reference code actually executed — recorded here as a
  // defect candidate for the synthesis, reachable only via forcing.
  const atkinsonId =
    'noise.w1280.opaque.g300.p64.lab.atkinson-s100-serp.resize-first.stretch.still';
  const atkinson = workloadById(atkinsonId);
  await submitAndWait(copyOf(sourceBuffer(atkinson)), configFor(atkinson));
  const routedOut = lastResult;
  await submitAndWait(copyOf(sourceBuffer(atkinson)), configFor(atkinson), {
    dither: 'wasm',
  });
  const forcedOut = lastResult;
  const labelB = lastTimings.find((t) => t.stage === 'dither')?.backend ?? 'none';
  const equalityB =
    routedOut !== null && forcedOut !== null ? compareOutputs(routedOut, forcedOut) : null;
  if (equalityB !== null && equalityB.verdict !== 'EXACT') {
    findings.push(
      `fallback probe: forced-wasm atkinson output differs from ts — the delegation guard failed`,
    );
  }
  rows.push(
    measuredRow({
      workloadId: atkinsonId,
      boundary: 'stage',
      label: 'dither (forced wasm, non-FS method → delegation guard)',
      backend: 'ts',
      cache: 'n/a',
      warmupRuns: 0,
      samples: [0],
      meta: {
        'output vs routed ts': equalityB === null ? 'not captured' : equalityB.verdict,
        'timing label reports': labelB,
        'actually executed': 'ts reference via adapter delegation (M8-ALG-01)',
        'label defect candidate': labelB === 'wasm',
      },
    }),
  );

  // Probe C: GPU device loss. Destroying the page-side shared device
  // must never hang or throw a later kernel call, and the next call
  // after the lost handler runs must re-initialise. Runs last in the
  // leg: it deliberately invalidates the page-side pipeline cache.
  if (!isWebGpuAvailable()) return;
  const device = await getDevice();
  if (device === null) return;
  device.destroy();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const during = await buildLutGpu(palette64(), 'lab');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const after = await buildLutGpu(palette64(), 'lab');
  let recovery = 'STILL NULL';
  if (after !== null) {
    const ts = buildLut(palette64(), 'lab');
    let mismatches = 0;
    for (let i = 0; i < LUT_SIZE; i++) if (after[i] !== ts[i]) mismatches++;
    recovery = mismatches === 0 ? 'rebuilt, EXACT' : `rebuilt, ${String(mismatches)} mismatches`;
  }
  if (after === null || !recovery.includes('EXACT')) {
    findings.push(`device-lost probe: recovery failed — ${recovery}`);
  }
  rows.push(
    measuredRow({
      workloadId: STILL_300,
      boundary: 'prepare',
      label: 'gpu device-lost recovery (page context)',
      backend: 'webgpu',
      cache: 'n/a',
      warmupRuns: 0,
      samples: [0],
      meta: {
        'call after destroy': during === null ? 'null (fell back)' : 'recovered already',
        'recovery call': recovery,
        verdict: recovery.includes('EXACT') ? 'PASS' : 'FAIL',
      },
    }),
  );
}

/** The full M13-PROF-03 leg, cold rows first, destructive probe last. */
async function runBackendComparison(): Promise<void> {
  await runBackendColdInit();
  await runBackendDitherMatrix();
  await runMapBackendSweep();
  runPaletteFlattenRows();
  await runExportBackendComparison();
  await runFallbackProbes();
  say('Backend comparison rows done.');
}

// -------------------------------------------------------------- report

function browserEnvironment(): EnvironmentIdentity {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    runtime: 'browser',
    runtimeVersion: navigator.userAgent,
    os: navigator.platform,
    arch: 'n/a (browser)',
    cpuModel: 'n/a (browser)',
    cpuCount: navigator.hardwareConcurrency,
    memoryGb: nav.deviceMemory ?? -1,
    ci: false,
    budgetMultiplier: 1,
  };
}

function assembleReport(): BenchReport {
  const validity = assessValidity(rows, {
    wallStartMs: runStart.wall,
    wallEndMs: Date.now(),
    monoStartMs: runStart.mono,
    monoEndMs: performance.now(),
  });
  for (const finding of findings) validity.findings.push(finding);
  validity.tainted = validity.tainted || findings.length > 0;
  return buildReport(
    {
      boundaryVersion: BOUNDARY_VERSION,
      startedAt: new Date(runStart.wall).toISOString(),
      build: {
        appVersion: __APP_VERSION__,
        buildId: __BUILD_ID__,
        gitSha: __BUILD_ID__.split('.').at(-1) ?? 'unknown',
        wasmBuilt: __WASM_AVAILABLE__,
      },
      environment: browserEnvironment(),
      validity,
    },
    [
      measuredRow({
        workloadId: 'env',
        boundary: 'prepare',
        label: 'environment',
        warmupRuns: 0,
        samples: [0],
        meta: {
          viewport: `${String(innerWidth)}×${String(innerHeight)}`,
          devicePixelRatio,
          visibility: document.visibilityState,
          'timer resolution ms': timerResolutionMs(),
          webgpu: isWebGpuAvailable(),
          mode: import.meta.env.MODE,
        },
      }),
      ...rows,
    ],
  );
}

function publishReport(report: BenchReport): void {
  (window as unknown as { __BENCH__: unknown }).__BENCH__ = report;
  output.textContent = formatReport(report);
  const blob = new Blob([serialiseReport(report)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `browser-bench-${__BUILD_ID__.replaceAll('+', '_')}.json`;
  link.textContent = 'Download bv2 JSON report';
  link.style.cssText = 'display:block;margin:8px 4px;min-height:44px;';
  document.body.append(link);
  say(report.validity.tainted ? 'Report ready — TAINTED, see findings.' : 'Report ready.');
}

function finishReport(): Promise<void> {
  publishReport(assembleReport());
  return Promise.resolve();
}

// ----------------------------------------------------------- auto mode

/**
 * Unattended no-capture legs (M13-PROF-01/02/03 browser halves):
 * `?auto=still,stage,backend,gpu,lut,contention` runs the listed legs
 * on load and, with `post=<url>`, POSTs the serialised bv2 report to a
 * local collector — so an agent can run the gestureless half of the
 * procedure in a real, foreground browser window it cannot script.
 * `backend` runs before the M5-era GPU legs so its cold rows stay
 * cold in a combined run.
 * (A hidden page is CPU-throttled to the point of 10–20× inflated
 * samples — the in-app preview pane can never be a measurement
 * surface.) The capture legs are excluded by construction: they need
 * the owner's picker gesture. Visibility still rides in the env row,
 * so a background auto run is self-incriminating, not silently wrong.
 */
async function runAuto(): Promise<void> {
  const params = new URL(location.href).searchParams;
  const auto = params.get('auto');
  if (auto === null) return;
  const legs = new Set(auto.split(','));
  say('Auto run: measuring…');
  if (legs.has('still')) {
    await runStillPreview(STILL_200);
    await runStillPreview(STILL_300);
  }
  if (legs.has('stage')) await runStageMatrix();
  if (legs.has('backend')) await runBackendComparison();
  if (legs.has('gpu')) await gpuChecks();
  if (legs.has('lut')) await lutBuildTiming();
  if (legs.has('contention')) await runContentionProbe();
  show();
  const report = assembleReport();
  publishReport(report);
  const post = params.get('post');
  if (post !== null) {
    try {
      await fetch(post, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: serialiseReport(report),
      });
      say('Auto run complete — report posted.');
    } catch {
      say('Auto run complete — POST failed; report is on window.__BENCH__.');
    }
  }
}

// ---------------------------------------------------------------- main

function main(): void {
  document.body.append(status, previewCanvas);
  client.attachCanvas(previewCanvas);
  client.resizeSurface(600, 600);
  client.setView(2, 0, 0);

  const controls = document.createElement('div');
  controls.append(
    button('1 · Still preview rows (200², 300²)', async () => {
      await runStillPreview(STILL_200);
      await runStillPreview(STILL_300);
      say('Still preview rows done.');
    }),
    button('1b · Stage matrix (worker route)', runStageMatrix),
    button('2 · GPU checks (M5 gates)', gpuChecks),
    button('2b · LUT build timing (ts vs webgpu)', lutBuildTiming),
    button('2c · Backend comparison (ts / wasm / webgpu)', runBackendComparison),
    button('3 · Export rows', runExports),
    button('3b · Selection-source contention (still pump)', runContentionProbe),
    button('4 · Open controlled source window', openSource),
    button('5 · Start capture (choose a surface)', startCaptureSession),
    button('6 · Measure live preview (30 s)', async () => runLiveWindow(30)),
    button('7 · Interaction run (8 changes)', async () => runInteraction(8)),
    button('8 · Finish & download report', finishReport),
  );
  document.body.append(controls, output);
  say(
    'Production harness ready. Run 1–3b without capture; 4–7 need a user-chosen ' +
      'capture surface; 8 assembles the bv2 report.',
  );
  void runAuto();
}

main();
