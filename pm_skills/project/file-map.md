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
<!-- 93 file(s) across 9 section(s); regenerate with pm_skills/scaffold/gen-file-map.mjs -->
- `(root)` — 10 file(s)
- `.claude` — 1 file(s)
- `.githooks` — 1 file(s)
- `.github` — 1 file(s)
- `.windsurf` — 1 file(s)
- `docs` — 1 file(s)
- `scripts` — 4 file(s)
- `src` — 41 file(s)
- `tests` — 33 file(s)
<!-- /file-map-index -->

## (root)

- `AGENTS.md` — operative agent contract: hard rules, data model, read tiers
- `DEV-INFRASTRUCTURE.md` — build/run/test/version/deploy rulebook
- `README.md` — project front door: what it is, how to run it
- `UI-STANDARDS.md` — Carbon-first UI + WCAG 2.2 AAA rulebook
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

## docs

- `docs/requirements.md` — full combined requirements spec (reference only)

## scripts

- `scripts/build-palette.mjs` — derives `dmc.json` from the owner CSV
- `scripts/check-docs.mjs` — docs gate: backticked path/link validation
- `scripts/check-secrets.mjs` — report-only credential-shape scan (gate step)
- `scripts/gen-golden-hello.mjs` — one-time generator of the M0 hello fixtures

## src

- `src/capture/crop.ts` — pure crop-rect geometry: clamp/move/resize, hit-test, stitch span
- `src/capture/dirty.ts` — dirty-frame skip: 64×64 sampler, FNV-1a hash, region signature
- `src/capture/draft.ts` — draft-quality governor: pure hysteresis over frame times
- `src/capture/pump.ts` — frame pump: rVFC subscription + pure latest-wins grab gate
- `src/capture/session.ts` — getDisplayMedia session: start/grab/stop + pure error/label helpers
- `src/core/color/convert.ts` — sRGB↔linear↔Lab conversions (D65, CIE 1976)
- `src/core/color/lut.ts` — 15-bit RGB→palette-index LUT builder + exact nearest
- `src/core/color/metrics.ts` — squared colour distances: Euclidean RGB, ΔE76
- `src/core/palette.ts` — Palette model, DMC preset load, rgb/Lab flattening
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
- `src/diagnostics/log.ts` — structured logger: console + ring buffer + global capture
- `src/export/chart.ts` — styled PNG chart (§14 subset): pure margin/
- `src/export/pdf.ts` — single-page PDF chart (§18 subset): pure
- `src/export/png.ts` — clean PNG export (§13 subset): pure nearest-
- `src/main.ts` — app entry: M2 shell — import, control panel, preview, info panel
- `src/ui/controls.ts` — Carbon-style field builders: toggle/number/colour/select + clampInt
- `src/ui/debug-panel.ts` — dev-only profiling panel: rolling timing window (pure) + disclosure DOM
- `src/ui/import.ts` — import routes → decode: filter (pure) + blob→PixelBuffer
- `src/ui/info-panel.ts` — stats info panel: pure row model + thin DOM half
- `src/ui/preview.ts` — preview controller: toolbar, wheel/drag/keys → worker
- `src/ui/viewport.ts` — pure viewport maths: fit, anchored zoom, pan clamp
- `src/vite-env.d.ts` — ambient types for injected version/build globals
- `src/worker/client.ts` — main-thread client: Worker + coalescing + transfer
- `src/worker/coalesce.ts` — latest-wins scheduler (no queue), drop counter
- `src/worker/execute.ts` — timed frame execution; errors become responses
- `src/worker/grid.ts` — pure grid/tick geometry: line placement, auto-hide, label thinning
- `src/worker/lut-cache.ts` — one LUT per palette+metric, built on miss
- `src/worker/pipeline-worker.ts` — worker entry: postMessage routing + compare source cache
- `src/worker/preview-surface.ts` — worker: OffscreenCanvas; view/grid/tick/compare redraw (no clip)
- `src/worker/protocol.ts` — main↔worker message types, transferred buffers

## tests

- `tests/capture-crop.test.ts` — crop geometry: bounds/min-size, handles, hit-test, span
- `tests/capture-dirty.test.ts` — hash determinism/sensitivity, region-aware signatures
- `tests/capture-draft.test.ts` — governor hysteresis: enter/exit runs, gap, reset
- `tests/capture-pump.test.ts` — pump gate policy: busy/pending/drop/reset transitions
- `tests/capture-session.test.ts` — capture pure half: error messages, surface labels
- `tests/color-convert.test.ts` — golden: Lab reference values + round-trips
- `tests/controls.test.ts` — number-input clamping (pure half of controls)
- `tests/debug-panel.test.ts` — timing-window aggregation, cap, stage-change reset, ms formatting
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
- `tests/info-panel.test.ts` — row cap/overflow, thread-vs-hex labels, percent format
- `tests/palette.test.ts` — DMC load invariants (533, unique, hex↔rgb)
- `tests/pipeline-config.test.ts` — preset order, full-RGB, dither-replaces-reduce
- `tests/pipeline-hello.test.ts` — M0 acceptance: identity golden + purity invariants
- `tests/project.test.ts` — project file: byte-identical round trip, validation errors, version refusal
- `tests/reduce.test.ts` — reduce golden + invariants (membership, fixed point, LUT↔exact)
- `tests/resize.test.ts` — resize golden + geometry/average/bounds invariants
- `tests/stats.test.ts` — stats partition/sum/sort/reference invariants
- `tests/ui-import.test.ts` — image-file filtering (pure half of import)
- `tests/viewport.test.ts` — viewport maths exact cases (fit/anchor/clamp)
- `tests/worker-executor.test.ts` — executor end-to-end, LUT cache, coalescer
