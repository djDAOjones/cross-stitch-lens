# Browser measurement procedure (M5-PERF-18)

Three boundaries in `measurement-contract.md` — `preview-update`,
`interaction` and `export` — cannot be observed in node, and the M5A
matrix records them as explicit `unsupported` rows rather than zeros.
This is the procedure that fills them, plus the recorded results of the
first run. It also covers the two node-invisible engine questions:
GPU LUT build (M5-PERF-12) and the canvas resize candidate
(M5-PERF-11).

## Why a separate procedure

The node matrix is not a safe proxy for the browser. This run measured
the **same TS resize, on the same machine, ~3.5× slower in the browser
than in node**, while TS dither was only ~1.1× slower — so the gap is
stage-dependent and cannot be corrected with a global multiplier. Any
budget bound to a node median is therefore a claim about node, not about
the product. Re-measure here before binding a budget.

## Running it

1. `npm run dev` (or `preview_start` with `.claude/launch.json`).
2. Open `http://localhost:5173` in a Chromium-based browser with
   WebGPU. Confirm `navigator.gpu` exists — several findings below are
   conditional on it.
3. Paste each probe from "Probes" into the console. Vite serves the
   TypeScript sources, so `await import('/src/…/x.ts')` resolves the
   real modules — the probes measure shipped code, not a copy.
4. Record the medians against the build id shown in the diagnostics
   panel.

Timing notes: `performance.now()` here has **0.1 ms** granularity, so
sub-0.1 ms rows are reported as 0 and must not be read as free.
`drawImage` is asynchronous — timing the draw alone always reads 0; the
honest figure includes the `getImageData` readback that forces the sync
point, and that is what the tables below report.

## Probes

- **P1 environment** — `navigator.gpu`, `hardwareConcurrency`,
  `devicePixelRatio`, `OffscreenCanvas`, clock granularity.
- **P2 canvas resize** — `drawImage` into an `OffscreenCanvas` at
  1280→{200, 300, 1024}, timed with and without readback, and diffed
  against `resizeStage.backends.ts` for the same input.
- **P3 render components** — `ImageData` wrap, `createImageBitmap`,
  clear + `drawImage` onto the preview surface, at 1024².
- **P4 worker parity** — the same TS resize/dither run inside a module
  Worker, to separate "browser vs node" from "main thread vs worker".
- **P5 GPU LUT** — `buildLutGpu` vs `buildLut`, timed, and compared
  bin-for-bin. **Always assert the bin agreement, never just the time.**
- **P6 preview-update** — a real `PipelineClient` with an attached
  canvas, timing submit → `onResult` (which the worker posts after the
  bitmap snapshot and surface draw).

Probe sources live in the session record for this milestone; each is a
single self-contained async IIFE with no dependencies beyond the dev
server.

## Results — 2026-07-19, Apple M1 Max, WebGPU (Metal 3)

### preview-update (browser-only boundary, first numbers ever taken)

Source 1280², DMC-64, Lab, serpentine, `resize-first`, TS backend.

| Workload | median ms | p95 ms | updates/sec |
| --- | --- | --- | --- |
| 200² dither | 57.5 | 209.5 | 17.4 |
| 300² dither | 85.9 | 86.8 | 11.6 |
| 300² no dither | 47.9 | 49.8 | 20.9 |
| 1024² dither | 633.7 | 634.6 | 1.6 |

The brief's bar is **≥ 4 preview updates/sec at ≤ 300 × 300**. That is
met with margin (11.6–17.4/sec). The 1024² ceiling misses it at
1.6/sec — consistent with the node pipeline rows, and the case the
adaptive draft governor exists for.

### Preview render components (the ≤ 5 ms budget row)

| Component | median ms |
| --- | --- |
| `ImageData` wrap, 1024² | 0.5 |
| `createImageBitmap`, 1024² | 1.5 |
| clear + `drawImage` bitmap → 1600×1000 surface | < 0.1 |

Total ≈ **2 ms**, inside the 5 ms budget. M5-PERF-02 must still decide
whether the row means "worker canvas draw" or "bitmap-to-visible"; on
these numbers it passes under either reading.

### Canvas resize candidate (M5-PERF-11)

| Path | 1280→200 | 1280→1024 |
| --- | --- | --- |
| `drawImage` + `getImageData` | 1.9 ms | 8.1 ms |
| TS reference (browser) | 32.9 ms | 131.0 ms |
| TS reference (node, same machine) | 11.1 ms | 37.2 ms |

Canvas is 16× the TS reference in the browser — and still **misses the
5 ms budget at 1024**. Quality, however, rules it out as a drop-in:

| Comparison vs the TS oracle | mean Δ/channel | max Δ | pixels changed |
| --- | --- | --- | --- |
| 1280→200 opaque | 39.1 | 135 | 100% |
| 1280→200 alpha edges | 31.9 | 184 (α 3) | 77% |
| 1280→1024 opaque | 5.4 | 31 | 99.9% |
| 1280→1024 alpha edges | 4.7 | 254 (α 1) | 77% |

`drawImage` is **not** area averaging at hard downscale ratios, which is
exactly the regime the product uses (a 1512×982 crop → 200² grid). It
can only ever be a distinct creative mode with visibly different output,
never a quality-neutral backend.

### GPU LUT build (M5-PERF-12) — defect, see below

| Palette | GPU ms | TS ms | bins disagreeing with TS |
| --- | --- | --- | --- |
| 64 | 0.4 | 32.6 | 31,550 (96.3%) |
| 533 | 0.3 | 214.4 | 32,763 (100.0%) |

The timings are meaningless: the kernel never ran. See the finding
below. **No GPU LUT speedup has been demonstrated**, and the row stays
open for M5C.

## Defect found by this procedure

**The WebGPU LUT build has never worked, and it silently replaces the
correct one.**

`lutBuildShader` declares `let target = …`, and `target` is a
**reserved keyword in WGSL**. The module fails to compile. WebGPU
reports shader compilation errors *asynchronously* — through
`getCompilationInfo()` and error scopes — so `createShaderModule` and
`createComputePipeline` do not throw, `buildLutGpu`'s `try/catch` never
fires, the dispatch is a no-op, and the zero-initialised result buffer
is read back as a perfectly well-formed all-zeros `Uint16Array`.

`ensureLut()` is GPU-first and caches whatever it gets, in preference to
the TS build. So on the real frame path:

```text
ensureLut (GPU-first) → distinct output colours: ["250,250,250"]
getLut   (TS)         → distinct output colours: ["255,180,150",
                          "250,250,250", "210,82,146", "109,26,43"]
```

Every pixel maps to palette index 0. In any WebGPU-capable browser,
**non-dithered palette reduction renders a solid single-colour image**,
and exports the same. Dithered output is unaffected (dither never uses
the LUT), which is why the app still looked plausible.

Why the suites missed it: the real-GPU block in `tests/webgpu-lut.test.ts`
is `describe.skipIf(!isWebGpuAvailable())`, and CI is node — so it never
runs anywhere. The f32 mirror it falls back to tests the *intended*
arithmetic, not the emitted shader.

Two lessons this procedure now encodes:

1. **Never accept a GPU result on timing alone.** P5 asserts bin
   agreement, and an implausibly fast GPU row is a defect signal.
2. **Always drain error scopes and `getCompilationInfo()`** around
   shader creation. A silent WGSL compile failure is indistinguishable
   from a successful zero-filled dispatch.

Follow-ups: M5-PERF-31 (fix + real-GPU coverage in CI).
