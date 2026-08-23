# File Map

<!-- One line per source file: `path` — its role. Map roles, not history
     (move batch notes, dates, and test counts to decision-log.md). -->
<!-- Skeleton is generator-owned: run `node pm_skills/scaffold/gen-file-map.mjs`
     after adds/renames/deletes. It groups paths by top-level directory
     into `## <dir>` sections, preserves existing role text by path, marks
     new files `(role needed)`, and flags paths no longer on disk — you
     only write the role text. Sections below are a starting scaffold;
     the generator replaces them with directory-based ones on first run. -->
<!-- Hot read is SECTIONAL: read the index block + the sections matching
     the task's directories; read whole only for cross-cutting work
     (renames, conventions, upgrades). See AGENTS.md "Before every task".
     Size budget derives from the file count in the index — see
     pm_skills/memory-policy.md. -->

<!-- file-map-index -->
<!-- 295 file(s) across 12 section(s); regenerate with pm_skills/scaffold/gen-file-map.mjs -->
- `(root)` — 13 file(s)
- `.claude` — 2 file(s)
- `.githooks` — 1 file(s)
- `.github` — 1 file(s)
- `.windsurf` — 1 file(s)
- `_transcripts` — 1 file(s)
- `crates` — 4 file(s)
- `docs` — 16 file(s)
- `public` — 7 file(s)
- `scripts` — 22 file(s)
- `src` — 105 file(s)
- `tests` — 122 file(s)
<!-- /file-map-index -->

## (root)

- `AGENTS.md` — operative agent contract: hard rules, data model, read tiers
- `DEV-INFRASTRUCTURE.md` — build/run/test/version/deploy rulebook
- `README.md` — project front door: what it is, how to run it
- `THIRD-PARTY-NOTICES.md` — verbatim third-party licence texts (pdf-lib, wasm-bindgen, libm) plus the trademark/colour-data notice for public distribution (D161)
- `UI-STANDARDS.md` — Carbon-first UI + WCAG 2.2 AAA rulebook
- `bench-source.html` — entry for the controlled capture source the harness's interaction rows share (M13-MEAS-02)
- `bench.html` — entry for the production-build browser measurement harness; built by Vite alongside the app so its figures are not dev-server artefacts
- `cspell.json` — spelling dictionary + ignore paths for the docs gate
- `eslint.config.js` — flat config; core-isolation + no-console rules
- `index.html` — Vite entry; dev-shell styles (AAA contrast, pixelated preview)
- `package.json` — scripts (dev/build/test/check/verify:deploy) + dev dependencies
- `tsconfig.json` — strict TS config (ES2022, bundler resolution)
- `vite.config.ts` — Vite + Vitest config; injects version/build identity; `bundleInputs()` drops the bench harness when `PM_PUBLIC_BUNDLE=1` (PUB-06)

## .claude

- `.claude/launch.json` — dev-server and preview launch configs for agent browser preview, incl. the Pages base-path preview (serves a `dist` built with the same `--base`)
- `.claude/settings.json` — project agent settings: the SessionStart hook that provisions cloud sessions

## .githooks

- `.githooks/pre-commit` — runs `npm run check` before every commit

## .github

- `.github/workflows/lint.yml` — CI: `npm run check` on Node 22 per push/PR; a green default-branch push then rebuilds with the Pages base and `PM_PUBLIC_BUNDLE=1` (no harness) and publishes `dist` to GitHub Pages (D172), then `verify-deploy` confirms the live build id (D180)

## .windsurf

- `.windsurf/workflows/next.md` — `/next` wiring to the pm-skills loop

## _transcripts

- `_transcripts/README.md` — explains the gitignored chat-transcript store and its redaction rule (GUIDE → "Saving session transcripts")

## crates

- `crates/stitch-engine/.cargo/config.toml` — simd128 rustflags for the wasm target only
- `crates/stitch-engine/Cargo.lock` — pinned crate dependency graph (committed, CI cache key)
- `crates/stitch-engine/Cargo.toml` — crate manifest: wasm-bindgen + libm (approved allowlist)
- `crates/stitch-engine/src/lib.rs` — Floyd–Steinberg WASM backend: bit-exact port of the TS reference

## docs

- `docs/acceptance-combined-record.md` — the evidence record of the M13 + M15 combined maintainer sitting: leg verdicts, the four D135 agenda lines, per-method and per-profile results, and what was deliberately not proven (D148).
- `docs/acceptance-combined-session.md` — the combined M13+M15 owner sitting: build decision, prep, nine-leg order, per-item close conditions
- `docs/acceptance-live-rehearsal.md` — M5-ACCEPT-03 rehearsal checklist: setup, actions, evidence, miss classification
- `docs/acceptance-m13-live.md` — M13-ACCEPT-02 run sheet: live Photoshop capture legs, the four owner-judgement lines, pinned to the passing build
- `docs/acceptance-matrix.md` — M5-ACCEPT-01 evidence: generated coverage table, per-row invariants, explicit skips
- `docs/acceptance-visual-review.md` — M5-ACCEPT-02 review sheet: review set, protocol, verdict record
- `docs/browser-measurement.md` — browser-only boundary procedure + recorded results (M5-PERF-18)
- `docs/catalogue-sweep.md` — DATA-01 owner worklist written by the committed sweep: unnamed catalogue rows and same-brand hex pairs (D155)
- `docs/dither-evaluation.md` — M8-SPIKE-01 evidence: method, findings, committed set, control surface (D61)
- `docs/measurement-contract.md` — boundary contract (bv2): workload ID grammar, matrix blocks, report schema + run validity, budget bindings, browser rehearsal
- `docs/performance-evidence.md` — measured evidence: bv1 history (M5 audits, M5C decisions) + the bv2 re-baseline (M13-MEAS-01)
- `docs/requirements.md` — full combined requirements spec (reference only)
- `docs/ui-audit.md` — M14-AUDIT-01 findings record: surface × state matrix, 22 ranked findings, style inventory, baseline hashes + re-run rules
- `docs/ui-evidence.md` — M14 implementation evidence: per-task matrix runs, deviations, before/after notes
- `docs/ui-journeys.md` — M14-AUDIT-02 record: five journey step tables, depth measurements, control-tier inventory
- `docs/ui-spec.md` — M14-SPEC-01: tier/reach contract, 5-section architecture, control table, terminology map, keyboard model

## public

- `public/profile-demo/README.md` — names the four owner-supplied preview photos the editor rig looks for (M15-UI-04)
- `public/profile-demo/graphic.jpg` — demo slot: flat-colour graphic, the banding and posterisation case.
- `public/profile-demo/landscape-1.jpg` — demo slot: first landscape; also the agreed source for M8-GOLD-02's golden crop.
- `public/profile-demo/landscape-2.jpg` — demo slot: second landscape, so a palette must hold up on more than one.
- `public/profile-demo/portrait.jpg` — demo slot: portrait; skin tones are where a narrow profile fails first.
- `public/profile-demo/stained-glass.jpg` — demo slot: saturated colour against black leading, the hardest case for a rule-shaped profile.
- `public/profile-demo/text.png` — demo slot: text in three fonts; legibility survives the reduction or it does not.

## scripts

- `scripts/bench-auto-lib.d.mts` — types for the quiet-run helpers (plain-JS module, typed for the test suite)
- `scripts/bench-auto-lib.mjs` — quiet-run logic: HIDIdleTime parsing, stamped/canonical artefact naming, environmental-retry gate (pure)
- `scripts/bench-auto-validate.d.mts` — types for the validation module (kept plain-JS for the node launcher)
- `scripts/bench-auto-validate.mjs` — bv2 report validation for the automated owner-session legs (pure; shared launcher/test)
- `scripts/bench-auto.mjs` — one-command automated owner-session legs: build, serve, flagged dedicated Chrome ×2, collect + validate reports
- `scripts/bench-cdp.mjs` — raw-CDP client for the trace leg (Node built-in WebSocket): DevToolsActivePort wait, command/event socket, streamed Tracing start/stop
- `scripts/bench-cross-check.d.mts` — types for the cross-check comparison (plain-JS CLI, typed for the test suite)
- `scripts/bench-cross-check.mjs` — Part-A′ arithmetic: manual vs automated capture rows side by side, same-build guarded (verdict stays human)
- `scripts/bench-trace-lib.d.mts` — types for bench-trace-lib.mjs so the vitest suite gets real types over the plain-JS module
- `scripts/bench-trace-lib.mjs` — pure trace parsing (M13-MEAS-04): mark grammar, renderer self-identification, window pairing, three-bucket GC accounting, observer long-task quoting
- `scripts/build-palette.mjs` — derives `dmc.json` from the owner CSV
- `scripts/check-contrast.mjs` — gate step: WCAG AAA proof of every tokens.css @pair, both schemes
- `scripts/check-docs.mjs` — docs gate: backticked path/link validation
- `scripts/check-secrets.mjs` — report-only credential-shape scan (gate step)
- `scripts/check-wasm.mjs` — gate step: cargo test + wasm-pack build; toolchain-aware skip (hard-fails in CI)
- `scripts/cloud-setup.sh` — SessionStart hook body: `npm ci` inside a cloud session only; no-op locally
- `scripts/gen-golden-hello.mjs` — one-time generator of the M0 hello fixtures
- `scripts/gen-symbol-evidence.mjs` — M9 print-evidence generator: renders the glyph catalogue as a vector PDF (batch pages + distinctness page) to bench-reports/ for owner signature (`symbols:evidence`)
- `scripts/save-transcript.mjs` — saves a chat-session transcript into _transcripts/ (`npm run transcript`)
- `scripts/verify-deploy.d.mts` — types for the verify-deploy helpers (plain-JS module, typed for the test suite — the bench-auto-lib.d.mts pattern)
- `scripts/verify-deploy.mjs` — post-deploy verification CLI + pure helpers: fetch the live index, resolve the hashed entry asset, read its build id, compare the SHA with the pushed commit; `--wait` polls; exit 0/1/2 (PUB-05)
- `scripts/write-acceptance-matrix.mjs` — regenerates the coverage table (the fixer; `check` only compares)

## src

- `src/backends/wasm/dither.ts` — wasm dither adapter: init + StageFn wrap + backends.wasm registration
- `src/backends/wasm/stitch-engine-wasm.d.ts` — ambient types for the stitch-engine-wasm alias (tsc without pkg)
- `src/backends/wasm/stub.ts` — alias stand-in when the pkg is unbuilt; never called at runtime
- `src/backends/webgpu/device.ts` — WebGPU feature detect + one lazy shared device (null on failure)
- `src/backends/webgpu/reduce.ts` — async GPU kernels: LUT build + palette map; null → ts fallback
- `src/backends/webgpu/wgsl.ts` — WGSL sources + binding indices: lut-build (metric-baked) + integer palette-map
- `src/bench-browser.ts` — the bv2 browser harness: preview-update/interaction/export rows through the shipped Worker route, the M13 worker-route stage matrix, LUT-build timing, selection-source contention and forced-backend comparison legs (`?auto=` unattended mode), live-capture counters, the M5 GPU gates, downloadable bv2 report. Not imported by the app
- `src/bench-source.ts` — controlled interaction source: repaints on BroadcastChannel command, replies with its own paint timestamp
- `src/bench/boundaries.ts` — the six measurement boundaries + BOUNDARY_VERSION (code copy of the contract; moved from tests/bench so production entries never import test modules)
- `src/bench/clock.ts` — absolute cross-context timestamps (timeOrigin + now) + timer-resolution probe
- `src/bench/counters.ts` — capture-path counter ledger: interval snapshots, conservation checks, drop folding across windows, zero-frame verdict (pure)
- `src/bench/edit-classes.ts` — the six Part-B edit-class approximations: seeded pure geometry + drive cadences
- `src/bench/harness.ts` — warm-up policy, sync/async sample collection, interleaved candidate timing
- `src/bench/memory.ts` — retained-heap verdict vocabulary: plateau threshold + forced-GC lazy-vs-real classification (pure)
- `src/bench/report.ts` — report schema, percentiles, unmeasured-never-zero rows, run-validity assessment (pure)
- `src/bench/workloads.ts` — the frozen bv2 workload matrix (DitherConfig axis) + seeded source generators
- `src/capture/crop.ts` — pure crop-rect geometry: clamp/move/resize, hit-test, stitch span
- `src/capture/dirty.ts` — dirty-frame skip: 64×64 sampler, FNV-1a hash, region signature, staleness gate
- `src/capture/draft.ts` — draft-quality governor: pure hysteresis over frame times
- `src/capture/master-image.ts` — master-image readback rule: refills a transferred (detached) buffer, never returns a blank one (pure)
- `src/capture/pump.ts` — frame pump: rVFC subscription + pure latest-wins grab gate
- `src/capture/session.ts` — getDisplayMedia session: start/grab/snapshot/stop + pure error/label helpers
- `src/capture/surface.ts` — one reusable grab canvas: resize in place, never reallocate per frame (pure, injected factory)
- `src/core/color-profile.ts` — colour-profile recipe + resolver to the effective ordered table, every narrowing explained; built-ins; policy→recipe bridge (M15); pin/unpin recipe helpers (MUST-01)
- `src/core/color-sources.ts` — generated colour maps, map:/user: identity namespaces, CSS name table, provenance-honest labels (M15)
- `src/core/color/candidates.ts` — per-bin candidate pruning for exact Lab matching: conservative Lab bounding box per 15-bit bin, witness-radius exclusion. An exclusion proof, not an approximation — returns the identical index to a full scan
- `src/core/color/convert.ts` — sRGB↔linear↔Lab conversions (D65, CIE 1976)
- `src/core/color/lut.ts` — 15-bit RGB→palette-index LUT builder + exact nearest
- `src/core/color/metrics.ts` — squared colour distances: Euclidean RGB, ΔE76
- `src/core/estimates.ts` — pure fabric sizing + thread/skein estimator (M12): named factors only, per-colour skein round-up, and the disclosure sentence
- `src/core/grid-presets.ts` — six built-in grid styling presets (paired screen/print halves) + exact-match provenance detector; in core so the v6→v7 migration can label files
- `src/core/grid-style.ts` — the persisted grid style-values shape + appearance-preserving defaults; single source for the worker style, both project-file halves, and the presets
- `src/core/palette-policy.ts` — brands/source/inventory/locks → permitted set + explained conflicts
- `src/core/palette-presets.ts` — built-in algorithmic colour-scheme presets (LCh rules)
- `src/core/palette-resolve.ts` — the one policy → ordered palette entry point
- `src/core/palette-selection.ts` — colour-count selection and lock/prefer auto-fill
- `src/core/palette.ts` — Palette model, DMC preset load, rgb/Lab flattening, colour + identity fingerprints
- `src/core/palettes/catalogue.json` — generated catalogue, 3,338 threads across 8 brands (protected)
- `src/core/palettes/dmc-anchor-map.csv` — superseded DMC/Anchor map, kept as owner data (protected)
- `src/core/palettes/thread-list.csv` — owner-supplied 8-brand thread list (protected)
- `src/core/palettes/thread-map-proposed.csv` — proposed cross-reference schema, no data yet (protected)
- `src/core/pipeline/adjust.ts` — adjust hook stage: identity until §9 ops land
- `src/core/pipeline/config.ts` — PipelineConfig → stage list; §7 presets; full-RGB twin
- `src/core/pipeline/dither-presets.ts` — canonical dither presets + structural equality + built-in matching (M15-DITH-01; moved from ui)
- `src/core/pipeline/dither.ts` — Floyd–Steinberg dither: exact errors, serpentine
- `src/core/pipeline/identity.ts` — identity stage: hello-world purity demo
- `src/core/pipeline/index.ts` — pipeline executor: backend pick + ts fallback
- `src/core/pipeline/reduce.ts` — reduce stage: LUT + exact paths, alpha passthrough
- `src/core/pipeline/resize.ts` — resize stage: area-average, 4 modes, empty cells
- `src/core/pipeline/threshold-tiles.ts` — Bayer + void-and-cluster blue-noise threshold tiles: fixed data, documented provenance, memoised
- `src/core/project-package.ts` — store-only zip project package (`.pmproj`): deterministic writer (fixed 1980 stamps), bounded reader with named refusals, format detection, readProjectBytes/writeProjectBytes (DUR-01)
- `src/core/project.ts` — project file (§20): schema v10 with the `source` block, v1→v10 migrations, canonical (de)serialisation, title-driven `projectFilename` + stamp fallback, `PROJECT_EXTENSION` (DUR-01/SAVE-01)
- `src/core/stats.ts` — design stats §11 subset: counts, %, thread refs
- `src/core/symbols/assignment.ts` — symbol assignment as persisted state (D160-4): need-based grants, release-to-back queue, survivor-free reset, overrides, load reconcile
- `src/core/symbols/glyphs.ts` — the app-owned 64-glyph catalogue in canonical append-only order; fill-only M/L/C/Z paths rendered identically by Path2D and drawSvgPath (D165)
- `src/core/thread-catalogue.ts` — brands, threads, stable `brandId:reference` identity
- `src/core/thread-equivalents.ts` — nearest cross-brand equivalent (curated over computed)
- `src/core/types.ts` — core contracts: PixelBuffer, Palette, Stage
- `src/diagnostics/bundle.ts` — copy-diagnostics bundle: pure builder + fail-closed redaction
- `src/diagnostics/log.ts` — structured logger: console + ring buffer + global capture
- `src/export/chart.ts` — styled PNG chart (§14 subset): pure margin/
- `src/export/key-entries.ts` — assembles the chart/PDF thread key from stats + palette (+ symbol map since M9) — the real assembly the artefact suite drives (D153)
- `src/export/pages.ts` — pure multi-page planner (M10): half-open tile bounds, leading-edge overlap, row-major order, sentence errors; plus the frame slice helper
- `src/export/pdf.ts` — single-page PDF chart (§18 subset): pure
- `src/export/png.ts` — clean PNG export (§13 subset): pure nearest-
- `src/library/records.ts` — Pure library file formats: canonical inventory/palette JSON, validation, additive merge, id-collision rename
- `src/library/snapshots.ts` — the design history: its own IndexedDB database (meta + payload stores) with an announced memory fallback; pure quota model (tiers, oldest-first eviction, near-quota) and the Project line's copy (DUR-01)
- `src/library/store.ts` — Cross-project library storage behind one interface; IndexedDB impl + memory fallback that announces itself; exports the request helper the design history shares
- `src/main.ts` — app entry: M2 shell — import, control panel, preview, info panel
- `src/ui/accordion.ts` — Carbon accordion section: h2-wrapped toggle, hidden panel, derived closed-state summary
- `src/ui/browse-table.ts` — shared capped search table (the 60-row pattern extracted; D117 seam 3)
- `src/ui/colour-section.ts` — recut Colour section: profile select + (edited) verbs, count + minimum distance, Must-use chips, inventory reveal (M15-UI-01)
- `src/ui/controls.ts` — Carbon-style field builders: toggle/number/colour/select + clampInt
- `src/ui/debug-panel.ts` — dev-only profiling panel: rolling timing window (pure) + disclosure DOM
- `src/ui/diagnostics-button.ts` — the Debug menu: Report a problem (project document + redacted log + mailto, DIAG-02), Copy diagnostics, Download log; announced status line; `DEV_EMAIL`
- `src/ui/dither-model.ts` — pure Dither-controls model: algorithm options, per-family strength, evidence-bearing presets, session memory
- `src/ui/import.ts` — import routes → decode: filter (pure) + blob→PixelBuffer
- `src/ui/info-panel.ts` — "Colours used" table content: pure row model + thin DOM half, hosted by a section (M14-EXT-41); the live symbol key column (ICE-SYMBOL-UI-01); focus kept across rebuilds
- `src/ui/modal.ts` — Carbon modals (text prompt, choices, danger confirm, live-apply form): trap arithmetic pure, focus restore, Escape/backdrop cancel
- `src/ui/notices.ts` — licences and notices: `?raw` imports of `LICENSE` + `THIRD-PARTY-NOTICES.md`, a pure document parser, the Close-only dialog and the ghost header button (PUB-01)
- `src/ui/preferences.ts` — Shell preferences (per-disclosure open state) in localStorage; parse falls back to defaults for anything unreadable. Never project data.
- `src/ui/preview.ts` — preview controller: toolbar, wheel/drag/keys → worker
- `src/ui/profile-editor-colour.ts` — colour profile kind: libraries, pins, ranges, custom colours, fingerprinted readout; pure halves exported
- `src/ui/profile-editor-dither.ts` — dither profile kind: three-field form, basis lines, palette-context line; mounts the shared shell unchanged (M15-DITH-02)
- `src/ui/profile-editor-preview.ts` — kind-generic judgement preview: slots, offline states, test card, ÷1/÷4/÷16 grid, debounced real-pipeline renders
- `src/ui/profile-editor.ts` — kind-agnostic takeover editor shell: switcher + verbs, draft-then-Save, D117 Save contract, no frame-facing API
- `src/ui/sample.ts` — deterministic drawn test-card for "Try a sample"; feeds the normal source path
- `src/ui/scales.ts` — The four resolutions kept apart — pattern/capture/preview/export — with unit-named fields, reference-sharing updaters, and the visible label set.
- `src/ui/shell.ts` — Shell state reduced to the cold flag (M14-EXT-31/32); `visibility()` is the single composition rule for what the cold surface hides.
- `src/ui/styles/base.css` — element layer: reset, [hidden] contract, focus ring, type ramp, generic fields/buttons/toggle/tables
- `src/ui/styles/shell.css` — shell chrome: header, columns, preview host, focus-mode chain, capture surfaces, panel containers
- `src/ui/styles/tokens.css` — design tokens: project + Carbon-convention systems, both schemes, @pair contrast contract (D80)
- `src/ui/symbol-picker.ts` — symbol override picker (ICE-SYMBOL-UI-01): pure model (unused pool in catalogue order, the row's glyph), inline-SVG glyph element, the Carbon picker dialog over `runModal`
- `src/ui/viewport.ts` — pure viewport maths: fit, anchored zoom, pan clamp
- `src/vite-env.d.ts` — ambient types for injected version/build globals
- `src/worker/backend-select.ts` — per-workload dither routing (metric-categorical, M5-PERF-27) + recorded per-stage override map
- `src/worker/client.ts` — main-thread client: Worker + coalescing + transfer + optional measurement observer
- `src/worker/coalesce.ts` — latest-wins scheduler (no queue), drop counter
- `src/worker/execute.ts` — timed frame execution; errors become responses
- `src/worker/grid.ts` — pure grid/tick geometry: line placement, auto-hide, label thinning
- `src/worker/lut-cache.ts` — one LUT per palette content+metric; LRU-bounded; rejects implausible GPU LUTs; hit/miss/eviction counters
- `src/worker/pipeline-worker.ts` — worker entry shell: owns worker scope, wires router
- `src/worker/preview-surface.ts` — worker: OffscreenCanvas; view/grid/tick/compare redraw (no clip)
- `src/worker/protocol.ts` — main↔worker message types, transferred buffers, absolute-clock frame marks, harness-only backend force
- `src/worker/router.ts` — message routing + compare source cache; guarantees one response per request

## tests

- `tests/a11y-names.test.ts` — accessible-name tripwire over the control surface (D156)
- `tests/acceptance-matrix.test.ts` — M5-ACCEPT-01 driver: per-row invariants through the worker entry, tie-break oracles, coverage-table staleness gate
- `tests/audits/audit.ts` — audit harness: AUDIT=1 gate, timed/counted rows, JSON artefacts
- `tests/audits/candidates/dither-candidates.ts` — dither prototypes: exact pruning table, hoisted scan, rounded conversion
- `tests/audits/candidates/m8-dither-candidates.ts` — M8-SPIKE-01 prototypes: kernel-as-data diffusion, threshold tiles, candidate registry — never imported by src/
- `tests/audits/candidates/resize-candidates.ts` — resize prototypes: hoisted (bit-exact), separable, summed-area
- `tests/audits/catalogue.audit.test.ts` — catalogue data sweep behind `npm run audit`: unnamed rows and same-brand hex pairs feed docs/catalogue-sweep.md (D155)
- `tests/audits/dither.audit.test.ts` — M5-PERF-13/14: conversion decomposition + exact-pruning proof
- `tests/audits/lut-reduce.audit.test.ts` — M5-PERF-12: LUT build vs map, stale-cache-key repro
- `tests/audits/m13-prep.audit.test.ts` — M13-PROF-02 node half: policy/selection/build timings per palette size, counter-proven cache behaviour
- `tests/audits/m13-stage.audit.test.ts` — M13-PROF-01 node half: stage ranking per grid/palette/method + dither-leader decomposition
- `tests/audits/m8-dither.audit.test.ts` — M8-SPIKE-01 evaluation (AUDIT=1): quality/structure metrics, timings, HTML gallery artefact
- `tests/audits/orchestration.audit.test.ts` — M5-PERF-10: palette rebuild, `?? 0` tax, allocation inventory
- `tests/audits/profile-gallery.audit.test.ts` — M15-GALLERY-01 batch evidence: every built-in rendered on the sample card at the default limit, reported by selected colour and share
- `tests/audits/resize.audit.test.ts` — M5-PERF-11: candidate timings + byte-equality across the mode matrix
- `tests/audits/routing.audit.test.ts` — sweeps grid × palette × metric on both dither backends and asserts `routeDither` agrees with the measured winner on every row (M5-PERF-27 evidence)
- `tests/audits/runtime.audit.test.ts` — M5-PERF-16/17/19: compare cost, gate stalls, dirty sensitivity, export isolation
- `tests/audits/wasm-boundary.audit.test.ts` — M5-PERF-15: boundary vs Rust split, calibration representativeness
- `tests/backend-select.test.ts` — selection policy/calibration + ts fallback with both backends disabled
- `tests/bench-auto-lib.test.ts` — quiet-run logic: idle parsing, valid-only canonical naming, never-retry-structural gate
- `tests/bench-auto-validate.test.ts` — automated-run validation: tainted/hidden/incomplete reports must fail, complete ones pass
- `tests/bench-counters.test.ts` — capture-counter ledger: interval deltas, conservation violations, multi-window drop folding, meta flattening
- `tests/bench-cross-check.test.ts` — cross-check comparison: ratios, same-build + tainted guards, missing rows never invented
- `tests/bench-edit-classes.test.ts` — edit-class geometry: seed determinism, per-class ops, bounds, stroke continuity
- `tests/bench-matrix.test.ts` — workload-matrix invariants: dither ID tokens, unique/derived IDs, core + method blocks, axis coverage
- `tests/bench-memory.test.ts` — retention verdicts: plateau/no-reading/lazy-GC/real-retention branches + threshold boundary
- `tests/bench-report.test.ts` — boundary contract, percentile math, warm-up exclusion, run-validity rules, schema round-trip
- `tests/bench-trace-lib.test.ts` — trace-parsing invariants: mark pairing strictness, thread majority vote, GC bucket attribution, ts-0 metadata span regression
- `tests/bench/env-node.ts` — node build/environment capture + report output dir
- `tests/bench/run-node.ts` — matrix runner + budget-to-row bindings + cold preparation rows
- `tests/benchmark.test.ts` — BENCH=1-gated: runs the matrix, writes the report, then asserts validity and budgets
- `tests/capture-crop.test.ts` — crop geometry: bounds/min-size, handles, hit-test, span
- `tests/capture-dirty.test.ts` — hash determinism/sensitivity, region-aware signatures, staleness bound
- `tests/capture-draft.test.ts` — governor hysteresis: enter/exit runs, gap, reset
- `tests/capture-master-image.test.ts` — master readback: real transfer-detachment, refill, failed/empty refill
- `tests/capture-pump.test.ts` — pump gate policy: busy/pending/drop/reset transitions
- `tests/capture-session.test.ts` — capture pure half: error messages, surface labels
- `tests/capture-surface.test.ts` — grab-surface reuse: one canvas across N grabs, in-place resize, context failure
- `tests/color-convert.test.ts` — golden: Lab reference values + round-trips
- `tests/color-profile.test.ts` — profile resolver: every narrowing step + sentence, ordering contract, built-ins non-empty, policy→recipe bridge; recipe pin helpers + pins-only inventory warning (MUST-01)
- `tests/color-sources.test.ts` — map identity/count/ordering pins, exact-match naming incl. lime/green, namespace collision guard
- `tests/controls.test.ts` — number-input clamping (pure half of controls)
- `tests/debug-menu.test.ts` — Debug-menu pure halves: the report sequence (order, log-only fallback, failure stops before mail), mailto redaction boundary, announced outcomes, `DEV_EMAIL` shape (M14-EXT-26, DIAG-02)
- `tests/debug-panel.test.ts` — timing-window aggregation, cap, stage-change reset, ms formatting
- `tests/design-snapshots.test.ts` — design history store + quota model: tiers, oldest-first eviction, near-quota copy, memory fallback (DUR-01)
- `tests/diagnostics-bundle.test.ts` — redaction (secret keys/values, fail-closed, caps), bundle shape, status text
- `tests/diagnostics-log.test.ts` — diagnostics logger/ring-buffer contract, including fault retention (D152)
- `tests/dither-algorithms.test.ts` — M8 method invariants: determinism, membership+sidecar, boundaries, distinctness, tile validity
- `tests/dither-model.test.ts` — dither-control state matrix: families, strength semantics, preset↔custom, per-method memory
- `tests/dither-pruning.test.ts` — pruning exactness over 138,688 adversarial values × 5 palettes, dither byte-equality with and without a table, and the shared f32 work-buffer reuse guards (M5-PERF-22/25)
- `tests/dither.test.ts` — dither golden + determinism/mean/serpentine invariants
- `tests/estimates.test.ts` — hand-calculated sizes and lengths, skein boundaries, the colours-cannot-share-a-skein invariant, the disclosure sentence
- `tests/export-artefacts.test.ts` — end-to-end export artefact suite over the real key assembly and PDF build, parsed back under Node (D153)
- `tests/export-chart.test.ts` — chart layout: label margin + edge pad,
- `tests/export-pages.test.ts` — planner invariants: exact-fit/overflow, overlap edges, fresh-span coverage with no gaps, slice sidecar alignment, error sentences
- `tests/export-pdf.test.ts` — PDF layout (page sizes, aspect fit, key
- `tests/export-png.test.ts` — export transforms: k×k block replication,
- `tests/golden/dither-8x8.expected.json` — golden fixture: dither expected, TS-generated (protected)
- `tests/golden/dither-8x8.input.json` — golden fixture: dither input (protected)
- `tests/golden/hello-4x4.expected.json` — golden fixture: identity expected output (protected)
- `tests/golden/hello-4x4.input.json` — golden fixture: 4x4 gradient input (protected)
- `tests/golden/m8-atkinson-8x8.expected.json` — M8 golden: Atkinson over the difficulty crop (D154)
- `tests/golden/m8-blue-noise-8x8.expected.json` — M8 golden: blue-noise over the difficulty crop (D154)
- `tests/golden/m8-crop-8x8.input.json` — M8 golden input: the 8×8 crop chosen for difficulty (D154)
- `tests/golden/m8-jarvis-8x8.expected.json` — M8 golden: Jarvis over the difficulty crop (D154)
- `tests/golden/m8-ordered-8x8.expected.json` — M8 golden: ordered Bayer over the difficulty crop (D154)
- `tests/golden/reduce-2x2.expected.json` — golden fixture: reduce expected, hand-derived (protected)
- `tests/golden/reduce-2x2.input.json` — golden fixture: reduce input, hand-derived (protected)
- `tests/golden/resize-9x5-contain-4x4.expected.json` — golden fixture: resize expected, TS-generated (protected)
- `tests/golden/resize-9x5-contain-4x4.input.json` — golden fixture: resize input (protected)
- `tests/grid-presets.test.ts` — the presets' signing: unique ids, schema-bound values, the Every-10-equals-defaults migration identity, exact matching
- `tests/grid.test.ts` — grid-line placement, tick numbering/thinning, auto-hide rule
- `tests/helpers/golden.ts` — golden harness: fixture load + tolerance compare
- `tests/helpers/lut-f32.ts` — f32 mirror of the WGSL LUT arithmetic (fround per op)
- `tests/helpers/project-fixture.ts` — compact v10 project fixture for the container/history suites
- `tests/helpers/threads.ts` — Thread fixtures — one place identity-carrying test palettes are built
- `tests/helpers/wgsl-reserved.ts` — WGSL reserved-word list + identifier scan (GPU-free shader guard)
- `tests/highlight.test.ts` — highlight-mask invariants: scrim membership, compare composition, index keying (M14-EXT-17)
- `tests/info-panel.test.ts` — row cap/overflow, thread-vs-hex labels, percent format
- `tests/library-records.test.ts` — Library file round trips, corrupt/oversized import, merge, collisions, memory store
- `tests/lut-cache.test.ts` — cache identity by palette content, LRU bound, GPU-LUT sanity rejection
- `tests/matrix/rows.ts` — the correctness matrix: row definitions with `proves` text, adversarial palettes, seeded sources
- `tests/modal.test.ts` — pure halves: focus-trap decisions + aria-describedby list arithmetic
- `tests/notices.test.ts` — parser invariants, byte-for-byte pin of the shipped texts to the repo files, no-fetch / no-root-URL guard (D172)
- `tests/palette-policy.test.ts` — Policy resolution: brands/source/inventory/exclusions and every explained conflict
- `tests/palette-presets.test.ts` — Preset semantics: real references, enabled-brand only, visible degradation, stated rules
- `tests/palette-resolve.test.ts` — the profile-world resolver's pins: COUNT-01 sentences, MUST-01 seat rule (pin fills, Revert shape, My-inventory pins, ownedOnly), empty-inventory case
- `tests/palette-selection.test.ts` — Count limits and auto-fill, incl. the canonical "lock 5, request 15 → 10 filled"
- `tests/palette.test.ts` — DMC load invariants (533, unique, hex↔rgb)
- `tests/pipeline-config.test.ts` — preset order, full-RGB, dither-replaces-reduce
- `tests/pipeline-hello.test.ts` — M0 acceptance: identity golden + purity invariants
- `tests/profile-editor.test.ts` — editor pure halves: browse rows, hex parsing, readout fingerprints, grid divisors, absent-vs-broken slots
- `tests/profile-store.test.ts` — kind-aware store contract, generic profiles file round-trip, builtin rejection, My colours, paletteToProfile
- `tests/project-package.test.ts` — `.pmproj` container: byte-identical round trip, legacy JSON detection, refusals for compressed/encrypted/zip64/truncated packages (DUR-01)
- `tests/project.test.ts` — project file: byte-identical round trip, validation errors, version refusal, v10 migration, title/fallback naming (SAVE-01)
- `tests/reduce.test.ts` — reduce golden + invariants (membership, fixed point, LUT↔exact)
- `tests/resize.test.ts` — resize golden + geometry/average/bounds invariants
- `tests/save-transcript.test.ts` — transcript-save script behaviour (paths, redaction guard)
- `tests/scales.test.ts` — The 4×4 independence matrix (identity, not equality) plus the label-distinctness checks.
- `tests/shell.test.ts` — Shell visibility composition, panel/focus label state, and preference fallback including a throwing storage.
- `tests/stats.test.ts` — stats partition/sum/sort/reference invariants
- `tests/symbol-picker.test.ts` — picker model: unused pool order, row glyph before/after a grant, an override surviving save → load and winning at the next grant
- `tests/symbols-assignment.test.ts` — assignment-model semantics: grants, release-to-back, disjoint reset, overrides, exhaustion, reconcile (D165)
- `tests/symbols-glyphs.test.ts` — glyph catalogue invariants: pinned canonical order (append-only tripwire), path grammar, bounds (D165)
- `tests/thread-equivalents.test.ts` — Nearest cross-brand equivalent: ordering, labelling, curated over computed
- `tests/ui-baseline/baseline.test.ts` — M14 byte-identity tripwire: pins fixture/pipeline/project hashes inside check
- `tests/ui-baseline/exports/chart-200x200.pdf` — M14 baseline capture: chart PDF (compare date-normalised, D74)
- `tests/ui-baseline/exports/chart-200x200.png` — M14 baseline capture: chart PNG at cell 10
- `tests/ui-baseline/exports/design-200x200.png` — M14 baseline capture: clean PNG, pixels = reference pin
- `tests/ui-baseline/exports/design-200x200@4x.png` — M14 baseline capture: enlarged PNG at scale 4
- `tests/ui-baseline/exports/project-200x200.json` — M14 baseline capture: saved project (compare field-wise, D74)
- `tests/ui-baseline/hashes.json` — Committed SHA-256 pins the baseline test asserts; never regenerated
- `tests/ui-baseline/source-gradient-256.png` — Deterministic fixture the browser walks import; write-once
- `tests/ui-baseline/source.ts` — Seeded fixture generator + minimal PNG encoder for the baseline
- `tests/ui-import.test.ts` — image-file filtering (pure half of import)
- `tests/ui-styles.test.ts` — stylesheet invariant greps: [hidden]!important, no CSS order, dev-shell absence, import order
- `tests/verify-deploy.test.ts` — verify-deploy pure helpers with the network off: entry-script discovery, build-id parsing, SHA prefix match, verdict line, arg parsing (PUB-05)
- `tests/viewport.test.ts` — viewport maths exact cases (fit/anchor/clamp)
- `tests/wasm-dither.test.ts` — wasm↔TS bit-exact parity: golden fixture, metrics/scan modes, full DMC Lab
- `tests/webgpu-lut.test.ts` — GPU tolerance suite: f32-mirror near-tie bound, static shader scans, skipIf real-GPU parity
- `tests/worker-executor.test.ts` — executor end-to-end, LUT cache, coalescer
- `tests/worker-router.test.ts` — response invariant: every request answered, gate released on each rejection
