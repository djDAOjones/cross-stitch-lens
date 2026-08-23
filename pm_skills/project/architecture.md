# Architecture — Pattern Mapper

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
| Persistence | `.pmproj` project packages — a store-only zip holding canonical `project.json` beside the picture verbatim (schema v12; explicit save; legacy `.json` v1–v9 still loads); IndexedDB for **library** data — thread inventory, saved palettes, profiles, user colours — and, in its own database `pattern-mapper-designs`, the **design history** that restores the latest design on reopen and steers to explicit save (DUR-01, D179) |
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
      dither.ts    # five dither methods (DitherConfig union)
      threshold-tiles.ts # Bayer + blue-noise threshold tiles
    color/         # sRGB↔linear↔Lab, distance metrics
    stats.ts       # stitch/colour counts
    project.ts     # (de)serialisation, schema versioning
    project-package.ts # .pmproj container: deterministic writer, bounded reader
  backends/
    wasm/          # thin TS adapters over the Rust crate
    webgpu/        # WGSL shaders + dispatch adapters
  worker/          # pipeline executor, scheduling, dirty-frame detection
  capture/         # getDisplayMedia session, crop-rect model
  export/          # png.ts, chart.ts, pdf.ts
  library/         # IndexedDB: inventory + palettes (store.ts), design history (snapshots.ts)
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

Fully transparent cells (`alpha === 0`) take no part in the dither
scan or error diffusion — they carry no colour, and quantising them as
opaque black would diffuse phantom error into the stitches beside a
`contain`/`fit` letterbox band. This is `=== 0` exactly, not the D9
`< 128` fabric threshold (a semi-transparent cell has a real colour);
the rule is mirrored bit-for-bit in the TS and Rust dither backends
(D49).

Dithering is a discriminated **`DitherConfig` union** (added at schema
v4): `none`; error-diffusion methods (Floyd–Steinberg, Atkinson,
Jarvis) carrying `serpentine` + `strength` (0–1, fraction of error
diffused); threshold methods (ordered Bayer 8×8, blue-noise 32×32)
carrying `strength` alone (0–2 × a ±48/255 base amplitude), tiles from
`threshold-tiles.ts`. Invalid combinations cannot be expressed
(D61/D62).

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
- Backend selection is per-stage, routed by the colour **metric**, not
  by runtime profiling: `lab → ts` (the TS path prunes candidates),
  `rgb → wasm`. The wasm crate implements exactly Floyd–Steinberg at
  full strength, so `routeDither` sends every other `DitherConfig` to
  `ts` unconditionally and the wasm adapter delegates defensively when
  params say otherwise — a backend may never substitute a different
  method (D62). Routing holds no state — D42's startup calibration was
  removed, not retuned (D48). A recorded per-stage override exists
  (`setSelectedBackend`, applied where routing has no opinion) but is
  currently reachable only from tests and audits — there is no
  user-facing backend override yet. The measurement harness can
  additionally force a backend per stage via the worker *request*
  (`force`, above even routing; M13-PROF-03) — harness-only by
  construction: it is not on `PipelineConfig`, so it cannot persist
  or reach a project file.

### Pipeline

Ordered list of stage instances + params, executed in the worker.
Order is data, not code — it is stored in the project file and the
UI can reorder it (requirements §7). Default order:
`adjust → resize → reduce(+dither)`. The `adjust` stage is a pure
identity until §9 image-adjustment params exist, so it is currently
**omitted from the built stage list** rather than run as a no-op; the
canonical order is unchanged and the slot returns when adjustments
land (D48).

### Thread identity and the palette policy (M7)

Identity is `brandId:reference` (`Thread.id`); RGB is a display value
only. Threads are never merged because their colours match — the
catalogue holds 3,338 threads across eight brands at just 2,830
distinct colours, so RGB de-duplication would delete ~500 real threads
(D55/D56).

Because two threads can render identically, "which thread is this
stitch?" has no answer in the pixels. Stages that map to a palette
therefore emit a **palette-index sidecar** on their output buffer
(`PixelBuffer.indices`, `EMPTY_INDEX = 0xffff` for fabric), transferred
across the worker boundary alongside the pixels. A stage that
invalidates it (resize after reduce, under `reduce-first`) omits it,
and stats fall back to counting colours with no reference rather than
guessing one.

Which threads a conversion may use is decided by one pure layer:

| Module | Owns |
| --- | --- |
| `thread-catalogue.ts` | Brands, threads, identity, union ordering |
| `palette-policy.ts` | brands ∩ source ∩ ownedOnly − excluded, + locks/preferences → `PermittedSet` + typed conflicts |
| `palette-selection.ts` | Colour-count selection and lock/prefer auto-fill over a weighted Lab distribution |
| `palette-resolve.ts` | The single entry point composing the two, count applied **last** |
| `palette-presets.ts` | Built-in algorithmic LCh schemes |
| `thread-equivalents.ts` | Nearest cross-brand equivalent, curated over computed |

Nothing there throws: every failure is a `PaletteConflict` with a
severity and a user-facing sentence. The count limit selects *from* the
permitted set, so it can never widen one — the invariant M7-ACCEPT-01
checks.

Count selection reads the resized **full-RGB** grid buffer, never the
pipeline's own output: selecting from an already-reduced image feeds
the selector its previous answer, so a design narrowed to 12 colours
could never widen back to 30. It is fetched once per source or geometry
change through the export route, not per frame.

Library data (thread inventory, saved palettes) lives in IndexedDB
behind `src/library/store.ts`, outside `src/core/` — core consumes a
plain immutable set of allowed identities. The memory fallback is
announced through `LibraryStore.persistent`, never silent.

### Colour reduction strategy

1. On palette, metric or tone change, build a LUT: 15-bit quantised
   RGB (32,768 entries) → nearest palette index, computed once in the
   worker (CIELAB distance by default; metric pluggable). The LUT
   stores palette *indices*, so its cache key is a content fingerprint
   of the entries **in order** — never the palette name (D46) — plus,
   since TONE-01, the tone fingerprint (weight, curve, cuts), because
   an engaged tone is baked into the entries. An engaged tone builds
   on the TS path only (the WGSL kernel has not learned the weights)
   and matches in the tone space (curved L, w·a, w·b — `tone.ts`);
   dither then diffuses its error in that same space (D200/D201).
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

## Performance budgets (measured baselines, asserted by `npm run bench`)

The bar that binds is the product promise: **≥ 4 preview updates/sec at
≤ 300² in the browser**. Since M13-IMPL-02 it is *asserted*, not merely
stated — the driven capture leg of `npm run bench:auto` fails when the
sustained rate drops below 4/sec or any frame is missed or dropped
(D135). 1024² is an export/finishing grid, not a live-editing one, and
the brief's "≤ 100 ms at 1024²" line was **retired** at D135: what
binds there is correctness plus an honest published median.

Two kinds of bound row, never interchangeable:

- **Regression baselines** — an observed median naming its **runtime,
  workload ID and build**, guarded ×1.35 plus a staleness guard (a row
  running > 2× faster than recorded fails, so the baseline cannot go
  slack). They answer "did this get worse?". All node rows are these.
- **Product targets** — the promise above, at a browser boundary. Only
  driven **base** capture rows may carry one; `.edit-<class>` rows and
  anything measured against real Photoshop are permanently unbindable
  (the bv2 amendment, enforced in code). `interaction` stays published,
  not bound.

The canonical rows and the boundaries they bind to live in
`docs/measurement-contract.md` (boundary contract **bv2**);
`npm run bench` writes the node report and asserts the baselines,
`npm run bench:auto` the browser leg and its targets. Budgets bind to
**warm, steady-state** calls — preparation is budgeted separately and
cache misses publish as their own cold rows.

Node is **not** a browser proxy (the same TS resize runs ~3.5× slower
in-browser while dither is ~1.1×), so every row names the runtime it was
taken on, and node never asserts a browser promise through a multiplier.
The aspirational 5/10/15/100 ms table that stood here missed every row
but preview-render from the day it was written (D43) and was replaced by
measured reality at M5C/M5D (D47/D48).

## Project file (JSON, versioned)

`{ schemaVersion, source, pipeline, palette, symbols, gridStyle,
preview, export, estimates }` — see requirements §20 for the full field
inventory. Loading an older `schemaVersion` must migrate, never fail
(currently **v12** — `SCHEMA_VERSION` in `src/core/project.ts` — with
forward steps from v1–v11; v5 added the colour and dither profile refs
at M15 under the D114 compatibility waiver, v6 the symbol-assignment
block and chart mode at M9, v7 the grid-styling split at M11, v8 the
PDF pagination fields at M10, v9 the fabric/estimation settings at
M12, v10 the `source` block `{ entry, type, name }` naming the embedded
picture at DUR-01, v11 the colour swaps in `palette.design`
(ICE-RECOLOUR-01), v12 the tone block `pipeline.tone` and the
colour-use floor `palette.design.floor` (TONE-01)). A file saved by a
*newer* version is refused with a message naming both versions, never
silently misread.

Since DUR-01 (D179) the file on disk is a `.pmproj` **package**
(`src/core/project-package.ts`): a store-only zip holding `project.json`
and the picture's bytes verbatim, deterministic (fixed 1980 stamps,
fixed layout) so the round trip stays byte-identical, and read as
untrusted input — sizes checked before any copy, CRCs verified,
compressed, encrypted, zip64 and truncated archives refused with a
sentence. Legacy `.json` files are told apart by their first bytes.

The `gridStyle` block (v7, M11) is `{ screen, print, preset }`: one
style-values shape (`src/core/grid-style.ts`) persisted twice —
screen in CSS px driving the preview overlay, print in raster px
driving the chart PNG and the PDF's embedded chart — plus preset
provenance (`src/core/grid-presets.ts`; null = custom). Canonical
values always win: the preset id records where the values came from
and can never restyle a saved design.

The `palette` block holds **both** halves, and needs both (D55):

- `policy` — the user's intent (enabled brands, source, `ownedOnly`,
  count request, locks/preferences/exclusions). Policy alone would let
  a catalogue release silently change a saved design.
- `snapshot` — the exact ordered threads that rendered it. Snapshot
  alone would lose the intent, so nothing could be recomputed.

On reopen the snapshot is authoritative; library drift is reported,
never repaired by name. `null` is full-RGB mode.
