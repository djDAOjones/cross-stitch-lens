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

## M7 — Palette & colour strategy (shipped 2026-07-21)

- M7-LIB-01 (2026-07-21) — the library operations that never shipped:
  keyboard-operable palette reordering and entry removal (both bump the
  revision), bulk owned/not-owned across the whole filter rather than
  the rendered page, and palette deletion with a session undo. The
  entry list is a collapsed disclosure capped at 60. See decision-log
  D58.
- M7-ACCEPT-01 (2026-07-21) — maintainer accepted the combined
  brands → inventory → palettes → presets → counts → locks workflow.
  Close triage kept one item ahead of M8 (M7-LIB-01, the library
  operations that never shipped) and moved the two that depend on
  owner data to the Icebox (ICE-XREF-01, ICE-PRESET-01). See decision-log D57.
- M7-DATA-01 (2026-07-21) — owner thread data superseded mid-milestone:
  `thread-list.csv` (3,338 threads, 8 brands, each brand's own measured
  colours) replaces the DMC→Anchor cross-reference; `dmc.json` retired,
  `catalogue.json` generated in its place. See decision-log D56.
- M7-BRAND-01 (2026-07-21) — thread identity is `brandId:reference` and
  RGB is display-only: `Thread` replaces `PaletteEntry`, a
  palette-index sidecar runs through reduce, dither, the Rust crate,
  the worker protocol and stats, so ~500 threads sharing a colour with
  another stay distinct. See decision-log D55.
- M7-BRAND-02 (2026-07-21) — brands enable/disable as a checkbox group
  with deterministic union order; no-brand is an explained error, never
  full-RGB. Stats, chart key and PDF carry brand + reference. See
  decision-log D55.
- M7-INV-01 (2026-07-21) — cross-project thread inventory in IndexedDB
  behind a `LibraryStore` interface (memory fallback announced, never
  silent), versioned canonical import/export, additive merge, and an
  "only threads I own" restriction. See decision-log D55.
- M7-PAL-01 (2026-07-21) — named library palettes with revisions;
  project schema v3 stores policy *and* the resolved snapshot, so a
  reopen reproduces the design even after the library palette is edited
  or deleted. See decision-log D55.
- M7-PRESET-01 (2026-07-21) — four algorithmic LCh presets (Neutrals,
  Pastels, Earth tones, Deep shades), each labelled with its rule;
  strict vs preference kept distinct; curated membership deferred to
  owner review. See decision-log D55.
- M7-COUNT-01 (2026-07-21) — exact/maximum colour counts by greedy
  weighted-ΔE selection over real permitted threads, chosen against the
  resized full-RGB source (never the pipeline's own output); selected
  and used counts reported separately. See decision-log D55.
- M7-MIX-01 (2026-07-21) — lock / prefer / exclude as three disjoint
  sets with auto-fill; "lock 5, request 15" fills exactly ten, and
  every conflict is a typed result with a user-facing sentence. See
  decision-log D55.
- M7-EQUIV-01 (2026-07-21) — nearest cross-brand equivalent, curated
  over computed, each labelled; no curated data exists yet, so every
  answer today says "closest by colour" with its ΔE. See decision-log D56.

Outcome: eight brands, 3,338 threads, and one policy layer behind them —
a design can be restricted to a brand, an inventory, a saved palette or
a preset, capped at a colour count, and pinned with locks, with every
narrowing explained in words rather than silently applied.

## M6 — Photoshop companion layout (shipped 2026-07-21)

- M6-ACCEPT-01 (2026-07-21) — maintainer accepted the companion layout
  gate: side-by-side Photoshop workflow, aspect-locked crop under
  pointer and keyboard on Retina, and the live-update rate under that
  load. See decision-log D54.
- M6-SCALE-01 (2026-07-21) — pattern / capture / preview / export scale
  split into four unit-named quantities in `src/ui/scales.ts`, with
  pattern-dimension controls added and a 4×4 matrix test asserting
  independence by reference identity. See decision-log D52.
- M6-CAPRES-01 (2026-07-21) — capture frame aspect-locked to the pattern
  through `constrainRect` on every mutation route; region size no longer
  affects stitch count. `stitchSpan` removed as tautological. See
  decision-log D52.
- M6-VIEW-01 (2026-07-21) — fit-to-space / fit-width / fit-height, zoom,
  stitch-dimensions readout, and preview scale persisted in project
  schema v2 (CSS px per stitch, forward migration from v1). See
  decision-log D52.
- M6-PANEL-01 (2026-07-21) — settings panel collapses from a permanent
  shell bar with `aria-expanded`; preview gains 37 % more area; state
  remembered in a localStorage shell preference, not project data. See
  decision-log D52.
- M6-FOCUS-01 (2026-07-21) — preview focus hides all but the preview,
  its toolbar, and a compact status line derived from one owned
  snapshot; live capture continues; Escape plus a persistent exit
  control. See decision-log D52.
- M6-NARROW-01 (2026-07-21) — preview-first DOM at every width with the
  settings panel to its right above 60 rem; verified at 320/360/480/800/
  1000 CSS px with no page-level horizontal scrolling, no under-44 px
  targets, and preview before controls in tab order. See decision-log D52.
- M6-WIN-01 (2026-07-21) — spike: browser window placement parked
  (option A, size guidance only); `resizeTo` is ignored without error,
  window-management permission denied, popups blocked even from a
  trusted gesture. No production code. See decision-log D53.

Outcome: the app works as a tall companion beside Photoshop — at 320–480
CSS px the preview takes 93–95 % of the width, panel collapse and preview
focus grow it further, and pattern dimensions are provably independent of
capture, display, and export scale.

## M5 — WASM + WebGPU backends (shipped 2026-07-20)

- M5-ACCEPT-02, M5-ACCEPT-03, M5-ACCEPT-04, M5-ACCEPT-05 (2026-07-20) —
  maintainer tested and accepted the M5 acceptance gates: visual review,
  live Photoshop rehearsal, budget/protected-doc reconciliation, and the
  milestone close sign-off. M5F closed; M5 shipped. See decision-log D51.

- DIAG-01 (2026-07-20) — copy-diagnostics affordance built: a hard-rule
  gap where AGENTS.md, UI-STANDARDS and DEV-INFRASTRUCTURE all specified
  a control that did not exist and `recentLogs()` sat as a dead export.
  Pure bundle builder with fail-closed redaction (secret-shaped keys and
  values withheld, unrecognised types dropped rather than serialised),
  dev-only text-button control announcing what was copied and that it is
  redacted. Verified live in the browser against a seeded secret.
  Unblocks M5-ACCEPT-03, which had no way to record its evidence. Gate
  packs for both maintainer items written:
  `docs/acceptance-visual-review.md` and
  `docs/acceptance-live-rehearsal.md`. See decision-log D50.

- M5-ACCEPT-01 (2026-07-20) — integrated correctness and parity matrix:
  31 rows over preset × metric × dither × resize mode × palette ×
  alpha × grid, driven through the real worker entry, 218 assertions in
  `check` (1024² ceiling behind `MATRIX_FULL=1`). Coverage table
  generated into `docs/acceptance-matrix.md` with its staleness gated.
  Found and fixed an engine defect on the first run — fully transparent
  cells were quantised as opaque black and diffused that error into the
  stitches beside them, so a `contain`/`fit` letterbox band destroyed
  the dither of the artwork it framed (TS + Rust, no golden fixture
  changed). Characterised `reduce-first` as non-stitchable rather than
  waiving the palette-membership invariant for it. Promoted export
  isolation out of `AUDIT=1`-only into the gate, and added the brief's
  never-asserted "a saved project reopens with identical output". See
  decision-log D49.

- M5-PERF-21, M5-PERF-22, M5-PERF-25, M5-PERF-20, M5-PERF-28,
  M5-PERF-27, M5-PERF-23, M5-PERF-24, M5-PERF-32 (2026-07-20) — M5D
  quality-neutral implementation, all bit-exact. Resize hoisted
  (1.29–1.77×); dither inlined + per-bin pruned (3.6× at 64 colours,
  16.2× at 533, 0 mismatches over 138,688 adversarial values × 5
  palettes); identity `adjust` omitted and the 12 MB dither scratch
  reused (per-frame allocation ~26.5 MB → ~8 MB at 1024², closing
  M5-PERF-20); split compare now donates the pipeline's post-resize
  buffer instead of re-running it (one pipeline per frame, not two);
  dither routed per workload by metric (lab → ts, rgb → wasm) with
  D42's startup calibration removed; budgets replaced by measured
  baselines naming runtime + workload + build, with regression and
  staleness guards. `mapPaletteGpu` **declined on its own gate** — on a
  production build the GPU edge is ~1.4×, not D47's dev-server 6.7×.
  New `bench.html` production-build browser harness satisfied
  M5-PERF-32 on a real GPU (0 mismatches over 32,768 bins × 3 configs).
  M5B's causal attribution corrected twice: both its "algorithmic" wins
  were call-boundary costs. See decision-log D48.

- M5-PERF (2026-07-20) — M5C decision gate: **processing modes cut**.
  Balanced's ingredients both died on M5B evidence (rounded conversion
  ~0% gain but 49–53% of pixels changed; separable resize slower), so
  one fidelity plus the existing draft governor ships instead — no
  visual thresholds needed anywhere, golden fixtures untouched, and the
  v1 back-compat waiver withdrawn. Budgets reshaped to one product
  promise plus regression-guarded measured baselines. M5E cut; evidence
  re-homed to `docs/performance-evidence.md`. See decision-log D47.

- M5-PERF-31, M5-PERF-30, M5-PERF-29, M5-PERF-26 (2026-07-20) —
  M5B-FIX: the four audit defects closed. The WebGPU LUT works for the
  first time (523 distinct indices, 0 mismatches vs TS across all 32,768
  bins on Metal-3) — the reserved-keyword bug was hiding a second,
  bind-group defect that only real-GPU execution could surface. LUT
  cache keyed on palette content (LRU-bounded); worker routing extracted
  to `router.ts` and now answers every request, so a rejection can no
  longer wedge live preview; `DirtyGate` bounds an averaged-away edit to
  2 s instead of never appearing. Real-GPU CI coverage carried forward
  as M5-PERF-32. See decision-log D46.

- M5-PERF-10, M5-PERF-11, M5-PERF-12, M5-PERF-13, M5-PERF-14,
  M5-PERF-15, M5-PERF-16, M5-PERF-17, M5-PERF-18, M5-PERF-19
  (2026-07-19) — M5B component audits: ten investigations shipped as a
  repeatable `npm run audit` suite plus the first browser measurements
  the project has ever taken (`docs/browser-measurement.md`). Found
  three **bit-exact** wins (dither 888 → 217 ms at 1024²/64; resize
  ~1.5× everywhere), overturned four bv1 leads, closed the wasm-boundary
  and `?? 0` leads as immaterial, and uncovered a shipped wrong-output
  bug: the WebGPU LUT shader has never compiled and silently replaced
  the correct LUT. Evidence in `docs/performance-evidence.md`; see decision-log
  D45.

- M5-PERF-01, M5-PERF-02, M5-PERF-03 (2026-07-19) — M5A measurement
  truth: boundary contract **bv1** (six boundaries, versioned so a moved
  mark invalidates comparison), a frozen 24-row workload matrix with
  derived stable IDs, and a report schema keeping raw samples plus
  build/environment identity — unmeasurable rows are `unsupported` with
  a reason, never zero. `npm run bench` writes the JSON report *before*
  asserting, so a missed budget still leaves evidence.
  Baseline (M1 Max, 124 rows) reproduces every D43 figure; all five
  budgets still miss. Decomposition overturned two leads: dither is
  **conversion-bound** (Lab is ~70% of cost — pruning alone can address
  ~22%), and **separable resize is challenged** (~1.5–2× available, not
  the ~7× needed). `adjust` clone and stage-list build measured
  immaterial. No browser numbers taken — rehearsal documented,
  M5-PERF-18 owns it. See decision-log D44.
- M5-BENCH (2026-07-19) — budget benchmark shipped (`npm run bench`,
  BENCH=1-gated, ×3 CI stretch): asserts the architecture.md table at
  1024×1024/64 DMC. **All five budgets miss** (whole pipeline 452 ms
  vs 100; dither-wasm 412 ms vs 15) — recorded honestly, milestone
  held open with a [sign-off] budget-gap item; architecture drift
  captured as a doc-delta. See decision-log D43.
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
