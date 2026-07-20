# Architecture — Cross Stitch Lens

<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->
<!-- Describe current structure only. Move historical batch notes to decision-log.md. -->

## Stack (decided — do not relitigate; see decision-log.md)

| Layer | Choice |
| --- | --- |
| Language | TypeScript, `strict: true` |
| Build/dev | Vite |
| UI | Carbon Design System web components + plain DOM; **no framework in the processing path** |
| Preview | Canvas 2D via OffscreenCanvas in a Worker; WebGL/WebGPU render later if profiling demands |
| Processing | Dedicated Web Worker(s); zero-copy transfers (`ArrayBuffer` transferables, `ImageBitmap`) |
| Native acceleration | Rust → WASM (`wasm-pack`, SIMD) for error diffusion; WebGPU compute (WGSL) for parallel stages |
| Capture | `getDisplayMedia` + user-drawn crop rect; frames via `ImageCapture`/`requestVideoFrameCallback` |
| PDF export | pdf-lib |
| Persistence | Versioned JSON project files; IndexedDB for autosave/session state |
| Tests | Vitest + golden-output fixtures |
| Future packaging | Tauri v2 (macOS ScreenCaptureKit plugin for arbitrary-region capture) — no code paths assume it |

## Repository layout

```text
src/
  core/            # Pure engine. No DOM, no Worker, no UI imports. Ever.
    types.ts       # PixelBuffer, Palette, StageParams
    pipeline/      # Stage implementations (TS reference)
      resize.ts
      adjust.ts
      reduce.ts    # palette mapping + LUT build
      dither.ts    # Floyd–Steinberg (error diffusion)
    color/         # sRGB↔linear↔Lab, distance metrics
    stats.ts       # stitch/colour counts
    project.ts     # (de)serialisation, schema versioning
  backends/
    wasm/          # thin TS adapters over the Rust crate
    webgpu/        # WGSL shaders + dispatch adapters
  worker/          # pipeline executor, scheduling, dirty-frame detection
  capture/         # getDisplayMedia session, crop-rect model
  export/          # png.ts, chart.ts, pdf.ts
  ui/              # Carbon components, panels, preview host
crates/
  stitch-engine/   # Rust: error diffusion (+ future hot stages)
tests/
  golden/          # input fixtures + expected output buffers
docs/
  requirements.md  # full combined requirements spec (reference only)
```

## Core contracts

### PixelBuffer

```ts
interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA, length = w*h*4
}
```

All pipeline stages are pure functions `(PixelBuffer, params) →
PixelBuffer` (or index buffers where noted). No stage touches the
DOM, reads globals, or mutates its input.

### Stage backends

```ts
type Backend = 'ts' | 'wasm' | 'webgpu';

interface Stage<P> {
  name: string;
  backends: Partial<Record<Backend, StageFn<P>>>; // 'ts' is mandatory
}
```

- The TS implementation is the **reference**: always present, ground
  truth for golden tests, automatic fallback when WASM/WebGPU are
  unavailable or fail.
- WASM/WebGPU implementations must be bit-exact vs. the TS reference
  where the algorithm is deterministic (error diffusion), or within a
  documented tolerance where not (GPU float rounding in colour math).
- Backend selection is per-stage, automatic by default (profiled),
  user-overridable in a debug panel.

### Pipeline

Ordered list of stage instances + params, executed in the worker.
Order is data, not code — it is stored in the project file and the
UI can reorder it (requirements §7). Default order:
`adjust → resize → reduce(+dither)`.

### Colour reduction strategy

1. On palette or metric change, build a LUT: 15-bit quantised RGB
   (32,768 entries) → nearest palette index, computed once in the
   worker (CIELAB distance by default; metric pluggable). The LUT
   stores palette *indices*, so its cache key is a content fingerprint
   of the entries **in order** — never the palette name (D46).
2. Per-pixel mapping is then an array lookup — this is why the TS
   path is already fast; WASM/WebGPU accelerate LUT *construction*
   and non-LUT paths (dither error terms use exact arithmetic).

### Worker & scheduling

- Main thread: capture + UI only. One processing Worker owns the
  pipeline and an OffscreenCanvas for the preview.
- Frames are coalesced: if a frame arrives while processing, keep
  only the newest (latest-wins, no queue).
- Dirty-frame detection: hash a 64×64 downsample of the crop; skip
  identical frames (requirements §22). The downsample averages small
  edits away, so an unchanged-looking source is re-processed anyway
  after `DIRTY_MAX_STALE_MS` — bounded staleness, not silent loss (D46).
- Every worker request answers exactly once (result or error): the
  client's latest-wins gate releases only on a response, so a silent
  path wedges live preview permanently (D46).
- Preview may run at reduced quality under load; **exports always
  re-run the pipeline at full quality**.

## Performance budgets (checked in CI via benchmark test)

| Stage (1024 × 1024 grid, 64-colour palette) | Budget |
| --- | --- |
| Resize (GPU-backed `drawImage`) | ≤ 5 ms |
| Palette reduce via LUT | ≤ 10 ms |
| Floyd–Steinberg (WASM) | ≤ 15 ms |
| Preview render | ≤ 5 ms |
| **Whole pipeline** | **≤ 100 ms** |

At the typical 200 × 200 grid the whole pipeline must run ≤ 10 ms.

## Project file (JSON, versioned)

`{ schemaVersion, grid, source, palette, pipeline[], preview, chart,
export }` — see requirements §20 for the full field inventory.
Loading an older `schemaVersion` must migrate, never fail.
