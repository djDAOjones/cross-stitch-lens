/**
 * Browser measurement harness — the production-build counterpart to
 * `docs/browser-measurement.md`.
 *
 * That procedure pastes probes into the console against the **dev
 * server**, which serves unminified TypeScript through Vite. D47 flagged
 * the consequence: its TS figures ran 10–16× slower than node, so every
 * TS-vs-GPU ratio taken that way overstates the GPU. M5-PERF-23 is
 * explicitly gated on re-measuring on a production build before
 * `mapPaletteGpu` may be wired, and a console probe cannot do that —
 * the sources are not served.
 *
 * This is a real Vite entry, so `npm run build` minifies and optimises
 * it exactly like the app. Open `/bench.html` from `vite preview` and
 * the results appear as JSON in the page and on `window.__BENCH__`.
 *
 * It is a measurement tool, not part of the app: nothing imports it,
 * and it ships only because it is its own HTML entry.
 */

import { buildLutGpu, mapPaletteGpu } from './backends/webgpu/reduce.ts';
import { isWebGpuAvailable } from './backends/webgpu/device.ts';
import { buildCandidateTable } from './core/color/candidates.ts';
import { buildLut, LUT_SIZE } from './core/color/lut.ts';
import type { ColorMetric } from './core/color/metrics.ts';
import { loadDmcPalette } from './core/palette.ts';
import { ditherStage } from './core/pipeline/dither.ts';
import { reduceStage } from './core/pipeline/reduce.ts';
import { resizeStage } from './core/pipeline/resize.ts';
import type { Palette, PixelBuffer } from './core/types.ts';

/** One measured row. */
interface Row {
  name: string;
  medianMs: number;
  samples: number;
  notes?: Record<string, string | number>;
}

const rows: Row[] = [];
const findings: string[] = [];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Time `fn` after warmup, recording the median. */
function time(name: string, fn: () => unknown, runs = 5, warmup = 2, notes?: Row['notes']): number {
  for (let i = 0; i < warmup; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  const m = median(samples);
  rows.push({ name, medianMs: m, samples: runs, ...(notes ? { notes } : {}) });
  return m;
}

async function timeAsync(
  name: string,
  fn: () => Promise<unknown>,
  runs = 5,
  warmup = 2,
  notes?: Row['notes'],
): Promise<number> {
  for (let i = 0; i < warmup; i++) await fn();
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  const m = median(samples);
  rows.push({ name, medianMs: m, samples: runs, ...(notes ? { notes } : {}) });
  return m;
}

/** Deterministic noise source (LCG — no Math.random in measurements). */
function noise(width: number, height: number, seed = 0xbe0c): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  let state = seed >>> 0;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    data[i] = i % 4 === 3 ? 255 : state >>> 24;
  }
  return { width, height, data };
}

function slice(palette: Palette, n: number): Palette {
  return { name: `${palette.name}-${String(n)}`, entries: palette.entries.slice(0, n) };
}

/**
 * M5-PERF-32 — assert the GPU LUT agrees with the TS build bin for bin.
 *
 * The point M5B made the hard way: two GPU defects shipped behind a
 * `skipIf(!isWebGpuAvailable())` on a node CI, and the second was found
 * only by *executing* on a real GPU. So this asserts agreement, not
 * timing — and an implausibly fast row is itself a defect signal, which
 * is why the mismatch count is reported next to the time.
 */
async function gpuLutAgreement(palette: Palette, metric: ColorMetric): Promise<void> {
  const label = `${String(palette.entries.length)}/${metric}`;
  const gpu = await buildLutGpu(palette, metric);
  if (gpu === null) {
    findings.push(`GPU LUT ${label}: buildLutGpu returned null — kernel unavailable.`);
    return;
  }
  const ts = buildLut(palette, metric);
  let mismatches = 0;
  let firstBad = -1;
  for (let i = 0; i < LUT_SIZE; i++) {
    if (gpu[i] !== ts[i]) {
      mismatches++;
      if (firstBad < 0) firstBad = i;
    }
  }
  const distinct = new Set(gpu).size;
  rows.push({
    name: `GPU LUT agreement — ${label}`,
    medianMs: 0,
    samples: 0,
    notes: {
      mismatches,
      'first mismatching bin': firstBad,
      'distinct indices in gpu LUT': distinct,
      verdict: mismatches === 0 ? 'EXACT' : 'DISAGREES',
      // A kernel that never ran reads back as all-zeros, which is a
      // structurally valid LUT — so distinctness is checked too.
      'all-zeros trap': distinct <= 1 && palette.entries.length > 1 ? 'TRIPPED' : 'clear',
    },
  });
}

async function run(): Promise<void> {
  const dmc = loadDmcPalette();
  const p64 = slice(dmc, 64);
  const gpuAvailable = isWebGpuAvailable();

  rows.push({
    name: 'environment',
    medianMs: 0,
    samples: 0,
    notes: {
      build: __BUILD_ID__,
      version: __APP_VERSION__,
      webgpu: String(gpuAvailable),
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: devicePixelRatio,
      wasmAvailable: String(__WASM_AVAILABLE__),
      mode: import.meta.env.MODE,
    },
  });

  // ---- M5-PERF-23: the gated mapPaletteGpu question -----------------
  // D47's dev-server figures put the GPU 6.7× ahead on per-pixel
  // mapping, but flagged the TS side as understated by 10–16×. This is
  // the same comparison on a production build, which is the gate.
  const grid1024 = noise(1024, 1024);
  const lut64 = buildLut(p64, 'lab');

  const tsMapMs = time(
    'reduce (ts, LUT path) — 1024²/64',
    () => reduceStage.backends.ts(grid1024, { palette: p64, metric: 'lab', path: 'lut', lut: lut64 }),
    15,
    3,
  );

  let gpuMapMs = Number.NaN;
  if (gpuAvailable) {
    const probe = await mapPaletteGpu(grid1024, p64, lut64);
    if (probe === null) {
      findings.push('mapPaletteGpu returned null on a production build — kernel unavailable.');
    } else {
      gpuMapMs = await timeAsync(
        'reduce (webgpu map) — 1024²/64',
        async () => mapPaletteGpu(grid1024, p64, lut64),
        15,
        3,
      );
      // Correctness before speed: the GPU map must equal the TS LUT path.
      const tsOut = reduceStage.backends.ts(grid1024, {
        palette: p64,
        metric: 'lab',
        path: 'lut',
        lut: lut64,
      });
      let diff = 0;
      for (let i = 0; i < tsOut.data.length; i++) {
        if (tsOut.data[i] !== probe.data[i]) diff++;
      }
      rows.push({
        name: 'GPU map agreement — 1024²/64',
        medianMs: 0,
        samples: 0,
        notes: { differingBytes: diff, verdict: diff === 0 ? 'EXACT' : 'DISAGREES' },
      });
    }
  }

  const ratio = gpuMapMs > 0 ? tsMapMs / gpuMapMs : Number.NaN;
  rows.push({
    name: 'M5-PERF-23 GATE — mapPaletteGpu vs ts, production build',
    medianMs: 0,
    samples: 0,
    notes: {
      'ts ms': Math.round(tsMapMs * 100) / 100,
      'gpu ms': Number.isNaN(gpuMapMs) ? 'n/a' : Math.round(gpuMapMs * 100) / 100,
      'ratio (>1 = gpu faster)': Number.isNaN(ratio) ? 'n/a' : Math.round(ratio * 100) / 100,
      'D47 dev-server ratio': 6.7,
    },
  });

  // ---- M5-PERF-32: real-GPU correctness ----------------------------
  if (gpuAvailable) {
    await gpuLutAgreement(p64, 'lab');
    await gpuLutAgreement(p64, 'rgb');
    await gpuLutAgreement(dmc, 'lab');
  } else {
    findings.push('No WebGPU in this browser — M5-PERF-32 assertions did not run.');
  }

  // ---- M5-PERF-24: the product promise, in-browser ------------------
  // "≥ 4 preview updates/sec at ≤ 300²" is the one promise D47 kept as
  // a budget, and it is defined in-browser, so it belongs here.
  //
  // SCOPE: this times the PIPELINE (resize + dither), not the full
  // preview-update boundary the promise is stated at — that boundary
  // additionally carries the worker round-trip, the ImageBitmap
  // snapshot and the surface draw (M5B measured 85.9 ms end to end at
  // 300² against a much cheaper pipeline). So these rows are a LOWER
  // BOUND on frame cost and an UPPER BOUND on updates/sec: they can
  // prove the promise is missed, and they can show large headroom, but
  // a marginal pass here would not settle it. The end-to-end figure
  // stays with P6 in docs/browser-measurement.md and the live
  // rehearsal in M5-ACCEPT-03.
  const source = noise(1280, 1280, 0x51ce);
  const table64 = buildCandidateTable(p64);

  /** One pipeline run at `grid` — the unit the promise is stated in. */
  const pipelineRun = (grid: number): PixelBuffer => {
    const resized = resizeStage.backends.ts(source, {
      width: grid,
      height: grid,
      mode: 'stretch',
    });
    return ditherStage.backends.ts(resized, {
      palette: p64,
      metric: 'lab',
      serpentine: true,
      candidates: table64,
    });
  };

  // Warm the shared code path at every size BEFORE timing any of it.
  // Without this the first grid measured absorbs the JIT cost of the
  // whole pipeline and reads slower than a larger grid — which is what
  // the first run of this harness reported (200² at 2.45 updates/sec
  // against 300² at 15.06), a number that would have been published as
  // a product-promise failure.
  for (const grid of [200, 300, 1024]) pipelineRun(grid);

  for (const grid of [200, 300, 1024]) {
    const ms = time(
      `pipeline (resize + dither, ts) — ${String(grid)}²/64/lab`,
      () => pipelineRun(grid),
      grid === 1024 ? 3 : 5,
      2,
    );
    rows.push({
      name: `product promise (pipeline only, upper bound) — ${String(grid)}²/64/lab`,
      medianMs: 0,
      samples: 0,
      notes: {
        'pipeline updates/sec (upper bound)': Math.round((1000 / ms) * 100) / 100,
        'bar (>=4/sec applies at <=300)': grid <= 300 ? 'applies' : 'export/finishing grid',
        'headroom x over the 4/sec bar': Math.round((1000 / ms / 4) * 100) / 100,
        verdict:
          grid > 300 ? 'n/a' : 1000 / ms >= 4 ? 'PASS (pipeline); confirm end-to-end at ACCEPT-03' : 'FAIL',
      },
    });
  }

  const output = { rows, findings };
  (window as unknown as { __BENCH__: unknown }).__BENCH__ = output;
  const pre = document.createElement('pre');
  pre.id = 'bench-output';
  pre.textContent = JSON.stringify(output, null, 2);
  document.body.append(pre);
  const done = document.createElement('div');
  done.id = 'bench-done';
  done.textContent = 'complete';
  document.body.append(done);
}

void run().catch((error: unknown) => {
  const pre = document.createElement('pre');
  pre.id = 'bench-error';
  pre.textContent = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  document.body.append(pre);
});
