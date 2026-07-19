# Trajectory

<!-- Shipped-work narrative. The story of what changed over time, in chunks. -->
<!-- Warm tier. Agents do NOT auto-read this every task. Read it on demand:
     during memory-maintenance.md (Refactor), release.md, or when
     reconstructing what already shipped. See AGENTS.md → "Before every task". -->
<!-- Compress on ship. One line per item: the outcome, not the implementation.
     The WHY lives in decision-log.md; the per-file roles live in file-map.md.
     Never paste a decision-log entry in here. A pointer is enough. -->
<!-- Keep every shipped ID individually greppable: start each line with the
     item ID. When one line covers a group of related sub-items, spell out
     each ID (e.g. WL-19a, WL-19b, ... WL-19h) rather than a range, so an
     ID-level reconcile can find them all. -->
<!-- Structure: newest phase/milestone at the top. Group items by the phase or
     milestone they belong to, with a one-line Outcome per phase. -->
<!-- Budget: see pm_skills/memory-policy.md. Over budget → memory-maintenance.md
     (Prune) moves the oldest phases to archive/trajectory/trajectory-NNNN-<range>.md
     and adds a row to archive/INDEX.md. Archives are append-only; never rewrite. -->

## M5 — WASM + WebGPU backends (in progress)

- M5-SELECT (2026-07-19) — automatic backend selection: one-shot
  startup calibration (ts vs wasm dither, DMC workload, 10%
  hysteresis), executor order explicit > selected > ts with the
  missing-backend safety net; StageTiming carries the backend that ran
  (profiling rows read "dither (wasm)"); ts fallback with both
  backends disabled proven in tests. See decision-log D42.
- M5-WEBGPU (2026-07-19) — WGSL LUT build + palette map as async GPU
  kernels; LUT build wired GPU-first into the worker cache
  (`ensureLut`, ts fallback), map kernel awaits the selection item;
  tolerance quantified in node via an f32 mirror (≤ 1% bins, near-tie
  bound) + skipIf real-GPU suite. See decision-log D41.
- M5-WASM (2026-07-19) — wasm dither backend registered (worker
  startup, assignment onto `ditherStage.backends`, ts fallback);
  alias/stub build-time feature detection; **bit-exact parity proven**
  vs TS at tolerance 0 incl. full DMC under CIELAB (6 golden tests).
  See decision-log D40.
- M5-CRATE (2026-07-19) — `stitch-engine` Rust crate: bit-exact
  Floyd–Steinberg port (f32/f64 JS semantics, libm math, simd128
  codegen), 6 Rust tests; wasm-pack build + toolchain-aware
  `check:wasm` gate step, CI installs the toolchain. Rust installed on
  the dev Mac. See decision-log D39.
- M5-PROFILE (2026-07-19) — profiling harness: per-stage last/median/max
  timings over a rolling 120-frame window (stage-change reset) in a
  dev-only "Profiling" disclosure below the info panel; stripped from
  production builds. See decision-log D38.

## M4 — Live capture (shipped 2026-07-19, v0.5.0)

- M4-CLOSE (2026-07-19) — milestone close: all five feature items
  shipped, gate green (186 tests); the live acceptance measurement
  (≥ 4 updates/sec in Photoshop, ~0 idle CPU) **waived at close** by
  maintainer decision — see decision-log D37. v0.5.0 bumped and
  tagged.
- M4-PAUSE (2026-07-19) — pause/resume + draft mode (§22 subset):
  pump-lifecycle pause toggle (session and manual refresh stay live,
  preview holds the last frame, named states), pure hysteresis
  governor dropping dithering under sustained load with a visible
  "Draft quality" label; exports untouched (full quality by
  construction). See decision-log D36.
- M4-DIRTY (2026-07-19) — dirty-frame skip (§22 subset): pre-readback
  64×64 downsample + FNV-1a hash + crop-region signature; unchanged
  frames skip the full grab and pipeline run ("Source unchanged."
  named state), region edits always re-process, skip count logged at
  pump stop. See decision-log D35.
- M4-PUMP (2026-07-19) — frame pump (§22 subset): live updates via
  `requestVideoFrameCallback` (rAF fallback) with a pure latest-wins
  gate at the grab — one readback+pipeline run in flight, newest
  frame wins; quiet per-frame path, pump failure degrades to manual
  Capture frame; starts/stops with the session. See decision-log D34.
- M4-CROP (2026-07-19) — user-drawn crop rectangle over the live
  thumbnail (§3 subset): pure geometry model (clamp/move/resize/
  hit-test) in source pixels, draw/move/resize by pointer, arrow-key
  move + shift-resize, lock toggle, source-px → stitches readout,
  cropped frame grabs, mid-session source-resize re-clamp;
  hermetically tested. See decision-log D33.
- M4-SESSION (2026-07-19) — `getDisplayMedia` screen/window capture
  session (§3 subset): user-initiated Start/Capture frame/Stop buttons
  in the source section, honest permission UX (declined prompt is a
  status, not an error), external stop-sharing handled, one-shot frame
  grab into the existing pipeline path; pure error/label helpers
  node-tested. See decision-log D32.

Outcome: the product's defining loop runs — share a screen or window,
draw/move/lock a crop region over the live thumbnail, and watch the
cross-stitch preview follow edits in another app, with unchanged
frames costing ~nothing, latest-wins everywhere, pause/resume, and an
honest draft-quality mode under load. Live acceptance measurement
waived at close (D37).

## M3 — Exports (shipped 2026-07-19, v0.4.0)

- M3-CLOSE (2026-07-19) — milestone close: clean-PNG acceptance leg
  green (export re-runs the pipeline and encodes the engine buffer;
  pixel-exact, tested); the printed-A4 legibility leg **waived at
  close** by maintainer decision — see decision-log D31. v0.4.0
  bumped and tagged.
- M3-PROJECT (2026-07-19) — project save/load as JSON schema v1 (§20
  subset): settings-only (pipeline config with palette by name,
  grid/chart style, export prefs), canonical serialisation for the
  byte-identical round-trip invariant, path-named validation errors,
  forward-migration switch; Save/Load control group syncs the panel
  and reprocesses once. See decision-log D30.
- M3-PDF (2026-07-19) — single-page PDF chart (§18 subset): pdf-lib
  first use; chart raster embedded at ~300 dpi with vector title +
  used-colour thread key (swatch/code/hex), A4/Letter, orientation,
  mm margins; layout + built PDF parsed under Node in tests;
  browser-verified. Print legibility check remains manual. See
  decision-log D29.
- M3-CHART (2026-07-19) — styled PNG chart export (§14 subset): stitch
  cells + minor/major grid + margin numbering, sharing the preview's
  grid settings and pure geometry; white-paper print colours; pure
  layout tested, browser-verified pixel-exact. See decision-log D28.
- M3-PNG (2026-07-19) — clean PNG export (§13 MVP subset): 1 px/stitch
  or integer nearest-neighbour enlargement, transparent or solid
  background; a dedicated worker export message re-runs the pipeline at
  full quality (never the preview frame); pure scale/flatten helpers
  unit-tested, browser-verified pixel-exact. See decision-log D27.

Outcome: a captured design leaves the app on paper and disk — clean
and enlarged PNGs, a styled chart PNG, a single-page A4/Letter PDF
with thread key, and a versioned JSON project that round-trips
byte-identically. Print-legibility check waived at close (D31).

## M2 — Preview & info UI (shipped 2026-07-19, v0.3.0)

- M2-CLOSE (2026-07-19) — milestone close: both acceptance legs
  verified (controls 3.3 ms against 150 ms; worst-case preview redraw
  0.32 ms at a 1024×1024 grid against the 16.7 ms frame budget),
  version bumped to v0.3.0. See decision-log D25.

- M2-PANELS (2026-07-18) — Carbon-style control panels: Grid /
  Colour / Dither / Pipeline `fieldset` groups of native controls (toggle
  switches, clamped number fields, colour picker, selects), instant
  apply; pipeline changes reprocess a main-side master copy through
  latest-wins, grid changes stay view-only; dither disabled in
  full-RGB; browser-verified at 3.3 ms/frame. See decision-log D24.
- M2-INFO (2026-07-18) — info panel bound to stats (§11): summary
  line + colours-by-usage table (swatch, thread ref, count, %) below
  the preview, live per frame; pure node-tested row model, top-30 cap
  with aggregate row, en-GB counts, empty state; browser-verified.
  See decision-log D23.
- M2-COMPARE (2026-07-18) — source vs output split compare (§10):
  full-RGB twin pipeline pass at grid scale (cell-aligned halves),
  worker-cached source frame, divider + native Split slider behind a
  Compare toggle; clip-free draw after a Chromium compositor stall
  (no ctx.clip on the transferred OffscreenCanvas); browser-verified.
  See decision-log D22.
- M2-TICKS (2026-07-18) — tick marks + row/column numbering (§16
  subset): boundary-aligned numbers at the major interval, origin 1,
  top/left edges, collision-free label thinning, theme-aware text
  colour, fit margin reserving room; rides the GridStyle message and
  the Grid toggle; browser-verified. See decision-log D21.
- M2-GRID (2026-07-18) — grid overlay (§15 subset): pure line
  geometry with minor/major intervals, device-px snapping and a
  spacing-based auto-hide, drawn worker-side above the stitches at
  zoom-independent thickness; GridStyle over the protocol (DPR-blind
  worker), interim toolbar toggle; browser-verified. See decision-log
  D20.
- M2-PREVIEW (2026-07-18) — worker-rendered preview surface: canvas
  control transferred to the worker (bitmap redraw on view change, no
  reprocessing), pure viewport maths (fit, cursor-anchored zoom 5%–
  6400%, pan clamping), wheel/drag/keyboard (+/−/0/arrows) input,
  44px toolbar, auto-fit per new image; browser-verified. See
  decision-log D19.

Outcome: the app is a usable interactive tool — import an image,
tune colour mode / dither / pipeline order / grid styling from a
Carbon-style panel, compare source against output, and read live
per-colour stats, all at single-digit-millisecond latencies.

## M1 — Engine core (shipped 2026-07-18, v0.2.0)

- M1-STATS (2026-07-18) — design stats (§11 subset): stitch/empty
  partition on the D9 alpha-50% rule, distinct colours, per-colour
  counts + % of stitches sorted by usage, thread references attached;
  wired into the shell caption. See decision-log D18.
- M1-IMPORT (2026-07-18) — image import (file picker, drag-drop,
  paste) through one decode path into the worker pipeline, plus the
  minimal M1 dev shell rendering the dithered 200×200 DMC preview 1:1
  (pixelated upscale); browser-verified end-to-end, closing the D16
  worker manual gate. See decision-log D17.
- M1-WORKER (2026-07-18) — worker pipeline executor: serialisable
  PipelineConfig with both §7 order presets (order is data), adjust
  hook stage (identity until §9 ops), worker-side LUT cache, exact
  latest-wins coalescing, transferred-buffer protocol, error-as-
  response; hermetic tests, browser exercise lands with M2. See
  decision-log D16.
- M1-RESIZE (2026-07-18) — resize stage: pure area-average resampler
  in premultiplied alpha; stretch/contain/cover/fit (fit = scale-down
  contain), grid-sized output with empty cells, 1–1024 validation;
  golden fixture + hand-derived geometry/average invariants. See
  decision-log D15.
- M1-DITHER (2026-07-18) — Floyd–Steinberg dither stage: exact error
  terms in a float working buffer, serpentine option, seed carried in
  the params schema for future stochastic variants; golden fixture
  generated by the TS reference + determinism/mean-preservation
  invariants. See decision-log D14.
- M1-COLOR (2026-07-18) — sRGB↔linear↔Lab conversions (D65, CIE 1976)
  plus Euclidean-RGB / ΔE76 metrics, golden-tested against published
  reference values; round-trip within 1/255. See decision-log D13.
- M1-PALETTE (2026-07-18) — Palette model over the generated DMC data
  (533 colours) with typed-array rgb/Lab flattening. See decision-log D13.
- M1-LUT (2026-07-18) — 15-bit RGB → palette-index LUT builder
  (bit-replicated bin representatives); worker hosting lands with the
  executor item. See decision-log D13.
- M1-REDUCE (2026-07-18) — reduce stage, LUT + exact paths under one
  contract, alpha passthrough; golden fixture + invariant suite
  (palette membership, fixed point, LUT↔exact agreement). See
  decision-log D13.

Outcome: the whole engine path runs — import a PNG in the browser,
worker-process it (resize → reduce/dither against the real DMC
palette), render 200×200 with live stats. Acceptance caveats in D18.

## M0 — Scaffold & quality gate (shipped 2026-07-17, v0.1.0)

- M0 — Vite 8 + TS 6 strict + ESLint 10 (core-isolation rule) + Vitest 4;
  `check` = typecheck + lint + test + build + docs baseline + secret scan;
  CI runs `check`; core types (`PixelBuffer`, `Palette`, `Stage`,
  `ProjectFile` v1 stub) + minimal pipeline executor; golden harness with
  per-test tolerance + hello-world identity test (4 tests); app shell with
  build identity + structured logger. See decision-log 2026-07-17 (D12).

Outcome: `npm run check` green end-to-end; dev server boots and renders
the shell with version identity.
