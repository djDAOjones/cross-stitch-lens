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
<!-- 148 file(s) across 10 section(s); regenerate with pm_skills/scaffold/gen-file-map.mjs -->
- `(root)` — 11 file(s)
- `.claude` — 1 file(s)
- `.githooks` — 1 file(s)
- `.github` — 1 file(s)
- `.windsurf` — 1 file(s)
- `crates` — 4 file(s)
- `docs` — 7 file(s)
- `scripts` — 6 file(s)
- `src` — 53 file(s)
- `tests` — 63 file(s)
<!-- /file-map-index -->

## (root)

- `AGENTS.md` — operative agent contract: hard rules, data model, read tiers
- `DEV-INFRASTRUCTURE.md` — build/run/test/version/deploy rulebook
- `README.md` — project front door: what it is, how to run it
- `UI-STANDARDS.md` — Carbon-first UI + WCAG 2.2 AAA rulebook
- `bench.html` — entry for the production-build browser measurement harness; built by Vite alongside the app so its figures are not dev-server artefacts
- `cspell.json` — spelling dictionary + ignore paths for the docs gate
- `eslint.config.js` — flat config; core-isolation + no-console rules
- `index.html` — Vite entry; dev-shell styles (AAA contrast, pixelated preview)
- `package.json` — scripts (dev/build/test/check) + dev dependencies
- `tsconfig.json` — strict TS config (ES2022, bundler resolution)
- `vite.config.ts` — Vite + Vitest config; injects version/build identity

## .claude

- `.claude/launch.json` — dev-server launch config for agent browser preview

## .githooks

- `.githooks/pre-commit` — runs `npm run check` before every commit

## .github

- `.github/workflows/lint.yml` — CI: `npm run check` on Node 22 per push/PR

## .windsurf

- `.windsurf/workflows/next.md` — `/next` wiring to the pm-skills loop

## crates

- `crates/stitch-engine/.cargo/config.toml` — simd128 rustflags for the wasm target only
- `crates/stitch-engine/Cargo.lock` — pinned crate dependency graph (committed, CI cache key)
- `crates/stitch-engine/Cargo.toml` — crate manifest: wasm-bindgen + libm (approved allowlist)
- `crates/stitch-engine/src/lib.rs` — Floyd–Steinberg WASM backend: bit-exact port of the TS reference

## docs

- `docs/acceptance-live-rehearsal.md` — M5-ACCEPT-03 rehearsal checklist: setup, actions, evidence, miss classification
- `docs/acceptance-matrix.md` — M5-ACCEPT-01 evidence: generated coverage table, per-row invariants, explicit skips
- `docs/acceptance-visual-review.md` — M5-ACCEPT-02 review sheet: review set, protocol, verdict record
- `docs/browser-measurement.md` — browser-only boundary procedure + recorded results (M5-PERF-18)
- `docs/measurement-contract.md` — M5 boundary contract (bv1), workload matrix, report schema, browser rehearsal
- `docs/performance-evidence.md` — M5 measured evidence: bv1 baseline, component audits, M5C decisions
- `docs/requirements.md` — full combined requirements spec (reference only)

## scripts

- `scripts/build-palette.mjs` — derives `dmc.json` from the owner CSV
- `scripts/check-docs.mjs` — docs gate: backticked path/link validation
- `scripts/check-secrets.mjs` — report-only credential-shape scan (gate step)
- `scripts/check-wasm.mjs` — gate step: cargo test + wasm-pack build; toolchain-aware skip (hard-fails in CI)
- `scripts/gen-golden-hello.mjs` — one-time generator of the M0 hello fixtures
- `scripts/write-acceptance-matrix.mjs` — regenerates the coverage table (the fixer; `check` only compares)

## src

- `src/backends/wasm/dither.ts` — wasm dither adapter: init + StageFn wrap + backends.wasm registration
- `src/backends/wasm/stitch-engine-wasm.d.ts` — ambient types for the stitch-engine-wasm alias (tsc without pkg)
- `src/backends/wasm/stub.ts` — alias stand-in when the pkg is unbuilt; never called at runtime
- `src/backends/webgpu/device.ts` — WebGPU feature detect + one lazy shared device (null on failure)
- `src/backends/webgpu/reduce.ts` — async GPU kernels: LUT build + palette map; null → ts fallback
- `src/backends/webgpu/wgsl.ts` — WGSL sources + binding indices: lut-build (metric-baked) + integer palette-map
- `src/bench-browser.ts` — the harness itself: production-build GPU-vs-TS comparison (M5-PERF-23 gate), real-GPU LUT bin agreement (M5-PERF-32), in-browser pipeline timings. Not imported by the app
- `src/capture/crop.ts` — pure crop-rect geometry: clamp/move/resize, hit-test, stitch span
- `src/capture/dirty.ts` — dirty-frame skip: 64×64 sampler, FNV-1a hash, region signature, staleness gate
- `src/capture/draft.ts` — draft-quality governor: pure hysteresis over frame times
- `src/capture/pump.ts` — frame pump: rVFC subscription + pure latest-wins grab gate
- `src/capture/session.ts` — getDisplayMedia session: start/grab/stop + pure error/label helpers
- `src/core/color/candidates.ts` — per-bin candidate pruning for exact Lab matching: conservative Lab bounding box per 15-bit bin, witness-radius exclusion. An exclusion proof, not an approximation — returns the identical index to a full scan
- `src/core/color/convert.ts` — sRGB↔linear↔Lab conversions (D65, CIE 1976)
- `src/core/color/lut.ts` — 15-bit RGB→palette-index LUT builder + exact nearest
- `src/core/color/metrics.ts` — squared colour distances: Euclidean RGB, ΔE76
- `src/core/palette.ts` — Palette model, DMC preset load, rgb/Lab flattening, content fingerprint
- `src/core/palettes/dmc-anchor-map.csv` — owner-supplied DMC/Anchor map (protected)
- `src/core/palettes/dmc.json` — generated DMC palette, 533 colours (protected)
- `src/core/pipeline/adjust.ts` — adjust hook stage: identity until §9 ops land
- `src/core/pipeline/config.ts` — PipelineConfig → stage list; §7 presets; full-RGB twin
- `src/core/pipeline/dither.ts` — Floyd–Steinberg dither: exact errors, serpentine
- `src/core/pipeline/identity.ts` — identity stage: hello-world purity demo
- `src/core/pipeline/index.ts` — pipeline executor: backend pick + ts fallback
- `src/core/pipeline/reduce.ts` — reduce stage: LUT + exact paths, alpha passthrough
- `src/core/pipeline/resize.ts` — resize stage: area-average, 4 modes, empty cells
- `src/core/project.ts` — project file v1 (§20): schema, migration, canonical (de)serialisation
- `src/core/stats.ts` — design stats §11 subset: counts, %, thread refs
- `src/core/types.ts` — core contracts: PixelBuffer, Palette, Stage
- `src/diagnostics/bundle.ts` — copy-diagnostics bundle: pure builder + fail-closed redaction
- `src/diagnostics/log.ts` — structured logger: console + ring buffer + global capture
- `src/export/chart.ts` — styled PNG chart (§14 subset): pure margin/
- `src/export/pdf.ts` — single-page PDF chart (§18 subset): pure
- `src/export/png.ts` — clean PNG export (§13 subset): pure nearest-
- `src/main.ts` — app entry: M2 shell — import, control panel, preview, info panel
- `src/ui/controls.ts` — Carbon-style field builders: toggle/number/colour/select + clampInt
- `src/ui/debug-panel.ts` — dev-only profiling panel: rolling timing window (pure) + disclosure DOM
- `src/ui/diagnostics-button.ts` — the "Copy diagnostics" control + announced status line
- `src/ui/import.ts` — import routes → decode: filter (pure) + blob→PixelBuffer
- `src/ui/info-panel.ts` — stats info panel: pure row model + thin DOM half
- `src/ui/preview.ts` — preview controller: toolbar, wheel/drag/keys → worker
- `src/ui/viewport.ts` — pure viewport maths: fit, anchored zoom, pan clamp
- `src/vite-env.d.ts` — ambient types for injected version/build globals
- `src/worker/backend-select.ts` — auto backend pick: one-shot calibration + hysteresis policy + selection map
- `src/worker/client.ts` — main-thread client: Worker + coalescing + transfer
- `src/worker/coalesce.ts` — latest-wins scheduler (no queue), drop counter
- `src/worker/execute.ts` — timed frame execution; errors become responses
- `src/worker/grid.ts` — pure grid/tick geometry: line placement, auto-hide, label thinning
- `src/worker/lut-cache.ts` — one LUT per palette content+metric; LRU-bounded; rejects implausible GPU LUTs
- `src/worker/pipeline-worker.ts` — worker entry shell: owns worker scope, wires router
- `src/worker/preview-surface.ts` — worker: OffscreenCanvas; view/grid/tick/compare redraw (no clip)
- `src/worker/protocol.ts` — main↔worker message types, transferred buffers
- `src/worker/router.ts` — message routing + compare source cache; guarantees one response per request

## tests

- `tests/acceptance-matrix.test.ts` — M5-ACCEPT-01 driver: per-row invariants through the worker entry, tie-break oracles, coverage-table staleness gate
- `tests/audits/audit.ts` — audit harness: AUDIT=1 gate, timed/counted rows, JSON artefacts
- `tests/audits/candidates/dither-candidates.ts` — dither prototypes: exact pruning table, hoisted scan, rounded conversion
- `tests/audits/candidates/resize-candidates.ts` — resize prototypes: hoisted (bit-exact), separable, summed-area
- `tests/audits/dither.audit.test.ts` — M5-PERF-13/14: conversion decomposition + exact-pruning proof
- `tests/audits/lut-reduce.audit.test.ts` — M5-PERF-12: LUT build vs map, stale-cache-key repro
- `tests/audits/orchestration.audit.test.ts` — M5-PERF-10: palette rebuild, `?? 0` tax, allocation inventory
- `tests/audits/resize.audit.test.ts` — M5-PERF-11: candidate timings + byte-equality across the mode matrix
- `tests/audits/routing.audit.test.ts` — sweeps grid × palette × metric on both dither backends and asserts `routeDither` agrees with the measured winner on every row (M5-PERF-27 evidence)
- `tests/audits/runtime.audit.test.ts` — M5-PERF-16/17/19: compare cost, gate stalls, dirty sensitivity, export isolation
- `tests/audits/wasm-boundary.audit.test.ts` — M5-PERF-15: boundary vs Rust split, calibration representativeness
- `tests/backend-select.test.ts` — selection policy/calibration + ts fallback with both backends disabled
- `tests/bench-matrix.test.ts` — workload-matrix invariants: unique/derived IDs, core cross-product, axis coverage
- `tests/bench-report.test.ts` — boundary contract, percentile math, warm-up exclusion, schema round-trip
- `tests/bench/boundaries.ts` — the six measurement boundaries + BOUNDARY_VERSION (code copy of the contract)
- `tests/bench/env-node.ts` — node build/environment capture + report output dir
- `tests/bench/harness.ts` — warm-up policy, sample collection, interleaved candidate timing
- `tests/bench/report.ts` — report schema, percentiles, unmeasured-never-zero rows (pure)
- `tests/bench/run-node.ts` — matrix runner + budget-to-row bindings
- `tests/bench/workloads.ts` — the frozen M5 workload matrix + seeded source generators
- `tests/benchmark.test.ts` — BENCH=1-gated: runs the matrix, writes the report, then asserts budgets
- `tests/capture-crop.test.ts` — crop geometry: bounds/min-size, handles, hit-test, span
- `tests/capture-dirty.test.ts` — hash determinism/sensitivity, region-aware signatures, staleness bound
- `tests/capture-draft.test.ts` — governor hysteresis: enter/exit runs, gap, reset
- `tests/capture-pump.test.ts` — pump gate policy: busy/pending/drop/reset transitions
- `tests/capture-session.test.ts` — capture pure half: error messages, surface labels
- `tests/color-convert.test.ts` — golden: Lab reference values + round-trips
- `tests/controls.test.ts` — number-input clamping (pure half of controls)
- `tests/debug-panel.test.ts` — timing-window aggregation, cap, stage-change reset, ms formatting
- `tests/diagnostics-bundle.test.ts` — redaction (secret keys/values, fail-closed, caps), bundle shape, status text
- `tests/dither-pruning.test.ts` — pruning exactness over 138,688 adversarial values × 5 palettes, dither byte-equality with and without a table, and the shared f32 work-buffer reuse guards (M5-PERF-22/25)
- `tests/dither.test.ts` — dither golden + determinism/mean/serpentine invariants
- `tests/export-chart.test.ts` — chart layout: label margin + edge pad,
- `tests/export-pdf.test.ts` — PDF layout (page sizes, aspect fit, key
- `tests/export-png.test.ts` — export transforms: k×k block replication,
- `tests/golden/dither-8x8.expected.json` — golden fixture: dither expected, TS-generated (protected)
- `tests/golden/dither-8x8.input.json` — golden fixture: dither input (protected)
- `tests/golden/hello-4x4.expected.json` — golden fixture: identity expected output (protected)
- `tests/golden/hello-4x4.input.json` — golden fixture: 4x4 gradient input (protected)
- `tests/golden/reduce-2x2.expected.json` — golden fixture: reduce expected, hand-derived (protected)
- `tests/golden/reduce-2x2.input.json` — golden fixture: reduce input, hand-derived (protected)
- `tests/golden/resize-9x5-contain-4x4.expected.json` — golden fixture: resize expected, TS-generated (protected)
- `tests/golden/resize-9x5-contain-4x4.input.json` — golden fixture: resize input (protected)
- `tests/grid.test.ts` — grid-line placement, tick numbering/thinning, auto-hide rule
- `tests/helpers/golden.ts` — golden harness: fixture load + tolerance compare
- `tests/helpers/lut-f32.ts` — f32 mirror of the WGSL LUT arithmetic (fround per op)
- `tests/helpers/wgsl-reserved.ts` — WGSL reserved-word list + identifier scan (GPU-free shader guard)
- `tests/info-panel.test.ts` — row cap/overflow, thread-vs-hex labels, percent format
- `tests/lut-cache.test.ts` — cache identity by palette content, LRU bound, GPU-LUT sanity rejection
- `tests/matrix/rows.ts` — the correctness matrix: row definitions with `proves` text, adversarial palettes, seeded sources
- `tests/palette.test.ts` — DMC load invariants (533, unique, hex↔rgb)
- `tests/pipeline-config.test.ts` — preset order, full-RGB, dither-replaces-reduce
- `tests/pipeline-hello.test.ts` — M0 acceptance: identity golden + purity invariants
- `tests/project.test.ts` — project file: byte-identical round trip, validation errors, version refusal
- `tests/reduce.test.ts` — reduce golden + invariants (membership, fixed point, LUT↔exact)
- `tests/resize.test.ts` — resize golden + geometry/average/bounds invariants
- `tests/stats.test.ts` — stats partition/sum/sort/reference invariants
- `tests/ui-import.test.ts` — image-file filtering (pure half of import)
- `tests/viewport.test.ts` — viewport maths exact cases (fit/anchor/clamp)
- `tests/wasm-dither.test.ts` — wasm↔TS bit-exact parity: golden fixture, metrics/scan modes, full DMC Lab
- `tests/webgpu-lut.test.ts` — GPU tolerance suite: f32-mirror near-tie bound, static shader scans, skipIf real-GPU parity
- `tests/worker-executor.test.ts` — executor end-to-end, LUT cache, coalescer
- `tests/worker-router.test.ts` — response invariant: every request answered, gate released on each rejection
