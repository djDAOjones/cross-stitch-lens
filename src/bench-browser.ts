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

import { isWebGpuAvailable } from './backends/webgpu/device.ts';
import { buildLutGpu, mapPaletteGpu } from './backends/webgpu/reduce.ts';
import { BOUNDARY_VERSION } from './bench/boundaries.ts';
import { timerResolutionMs } from './bench/clock.ts';
import {
  conservationViolations,
  countersMeta,
  CounterTracker,
  zeroCounters,
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
  type BenchRow,
  type EnvironmentIdentity,
} from './bench/report.ts';
import { palette64, sourceBuffer, workloadById } from './bench/workloads.ts';
import type { BenchSourceMessage } from './bench-source.ts';
import { DirtyGate, frameSignature, hashPixels, sampleVideo } from './capture/dirty.ts';
import { DraftGovernor } from './capture/draft.ts';
import { PumpGate, startFramePump } from './capture/pump.ts';
import { captureErrorMessage, startCapture, type CaptureSession } from './capture/session.ts';
import { buildLut, LUT_SIZE } from './core/color/lut.ts';
import type { ColorMetric } from './core/color/metrics.ts';
import { loadDmcPalette } from './core/palette.ts';
import type { PipelineConfig } from './core/pipeline/config.ts';
import { reduceStage } from './core/pipeline/reduce.ts';
import { computeStats } from './core/stats.ts';
import type { Palette, PixelBuffer } from './core/types.ts';
import { chartLayout, encodeChartPng } from './export/chart.ts';
import { buildChartPdf, type KeyEntry } from './export/pdf.ts';
import { encodePngBlob, scaleNearest } from './export/png.ts';
import { PipelineClient } from './worker/client.ts';
import type { FrameMarks } from './worker/protocol.ts';
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

/** Submit one frame and await its settlement (still-input rows). */
function submitAndWait(buffer: PixelBuffer, config: PipelineConfig): Promise<SettledJob> {
  return new Promise((resolve) => {
    onSettled = (job) => {
      onSettled = null;
      resolve(job);
    };
    client.submit(buffer, config);
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

// ------------------------------------------------------- live capture

let capture: CaptureSession | null = null;
let stopPump: (() => void) | null = null;
const counters: CaptureCounters = zeroCounters();
let inFlight = 0;
let lastRvfc: VideoFrameCallbackMetadata | null = null;
let firstRvfc: VideoFrameCallbackMetadata | null = null;

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
  say('Capture running. Use "Measure live preview" or the interaction run.');
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

  counters.pumpDrops = pumpGate.droppedCount - pumpDropsBefore;
  counters.clientDrops = client.droppedFrames - clientDropsBefore;
  const violations = conservationViolations(counters, inFlight);
  for (const violation of violations) findings.push(`counter conservation: ${violation}`);

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
        'page visible': document.visibilityState === 'visible',
        ...countersMeta(counters, 'counter '),
        ...cadence,
        ...intervalMeta,
        ...(lastJob === null ? {} : phaseMeta(lastJob)),
      },
    }),
  );
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
    if (pumpGate.frameArrived()) void pumpGrab();
  });

  say(`Running ${String(changes)} controlled changes…`);
  for (let seq = 1; seq <= changes; seq++) {
    const painted = new Promise<number | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 3000);
      const handler = (event: MessageEvent): void => {
        const message = event.data as BenchSourceMessage;
        if (message.type === 'painted' && message.seq === seq) {
          clearTimeout(timeout);
          sourceChannel.removeEventListener('message', handler);
          resolve(message.at);
        }
      };
      sourceChannel.addEventListener('message', handler);
    });
    sourceChannel.postMessage({ type: 'change', seq } satisfies BenchSourceMessage);
    const at = await painted;
    if (at === null) {
      findings.push(`interaction change ${String(seq)}: source window never confirmed its paint`);
      misses++;
      continue;
    }
    paintedAt = at;
    const span = await new Promise<number | null>((resolve) => {
      settleWaiter = resolve;
      setTimeout(() => {
        if (settleWaiter !== null) {
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

function finishReport(): Promise<void> {
  const validity = assessValidity(rows, {
    wallStartMs: runStart.wall,
    wallEndMs: Date.now(),
    monoStartMs: runStart.mono,
    monoEndMs: performance.now(),
  });
  for (const finding of findings) validity.findings.push(finding);
  validity.tainted = validity.tainted || findings.length > 0;
  const report = buildReport(
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
  (window as unknown as { __BENCH__: unknown }).__BENCH__ = report;
  output.textContent = formatReport(report);
  const blob = new Blob([serialiseReport(report)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `browser-bench-${__BUILD_ID__.replaceAll('+', '_')}.json`;
  link.textContent = 'Download bv2 JSON report';
  link.style.cssText = 'display:block;margin:8px 4px;min-height:44px;';
  document.body.append(link);
  say(validity.tainted ? 'Report ready — TAINTED, see findings.' : 'Report ready.');
  return Promise.resolve();
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
    button('2 · GPU checks (M5 gates)', gpuChecks),
    button('3 · Export rows', runExports),
    button('4 · Open controlled source window', openSource),
    button('5 · Start capture (choose a surface)', startCaptureSession),
    button('6 · Measure live preview (30 s)', async () => runLiveWindow(30)),
    button('7 · Interaction run (8 changes)', async () => runInteraction(8)),
    button('8 · Finish & download report', finishReport),
  );
  document.body.append(controls, output);
  say(
    'Production harness ready. Run 1–3 without capture; 4–7 need a user-chosen ' +
      'capture surface; 8 assembles the bv2 report.',
  );
}

main();
