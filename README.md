# Pattern Mapper

A web app that converts visual artwork into cross-stitch designs in
real time. You edit artwork in another application (typically
Photoshop); Pattern Mapper captures a chosen screen region via
`getDisplayMedia` and continuously renders a live cross-stitch
interpretation — reducing the source both **spatially** (to a fixed
stitch grid) and in **colour** (to a selected thread palette, with
dithering as a first-class tool). It can also import a still image, show
live stitch/colour stats, and export clean/enlarged PNGs, a styled PNG
chart, and a single-page PDF chart.

The core mental model is a **pure staged image-processing pipeline**
(`adjust → resize → reduce(+dither)`) running in a Web Worker, with a
TypeScript reference implementation as ground truth and Rust→WASM /
WebGPU as profiled drop-in backends.

## Status

Pre-MVP. Work is organised into milestones in
[`pm_skills/project/backlog.md`](pm_skills/project/backlog.md).
**M0–M8, M13, M14, M15 and Batch C0 have all shipped** (v0.5.0), and
**Track A — the printable pattern — is build-complete**: M9 symbols
and B/W charting (build landed; owner signatures on printed evidence
outstanding), M11 grid and tick styling presets (schema v7's
screen/print styling split), M10 multi-page PDF export (schema v8 — a
page planner, cover map, and ruler-true tiled pages), and M12 fabric
and thread estimates (schema v9, every result disclosing its
assumptions). What remains in the arc is human: the M9 signatures and
M16's print-sized export defaults sitting.
**Track B — durability — shipped 2026-08-23**: `.pmproj` project
packages (schema v10) with the picture embedded, a design history that
restores the latest design on reopen, and title-named files (DUR-01,
SAVE-01). **Track D — creative control — opened 2026-08-23** with the
colour swap (ICE-RECOLOUR-01, schema v11): every stitch the mapper
gives one thread can be worked in another, chosen from the whole
catalogue, and the key, counts and estimates follow. **Tone mode**
(TONE-01, schema v12) landed 2026-08-24: a colour ↔ tone slider whose
weighted metric runs through matching, selection and dither alike, a
lightness ramp with cut handles and Equalise at the tone end-stop, a
three-point lightness curve, a colour-use floor, and re-pick from the
current frame — its user-facing names are still working labels
pending the owner sitting. **Image adjustments** (ADJUST-01, schema
v13) followed the same day: the picture is controlled inside the app
before it becomes stitches — one lightness curve carrying the black
and white points at its ends, plus saturation — as a third kind of
profile, with nine built-in starting points — signed 2026-08-24 —
and editable copies. The palette is re-selected from the adjusted
picture, so an adjustment changes which threads the design buys.

**M15 (colour & dithering profiles)** closed on both acceptance gates
(D148): colour profiles as composition recipes with a kind-agnostic
takeover editor, schema v5, sixteen signed built-in style profiles, and
dithering profiles on the same shell. **M14 (UI/UX excellence)**
completed over six review looks plus a maintainer end review (D127).
**M13 (visual processing performance)** shipped on its maintainer gate:
the ≥ 4 preview updates/sec promise is now asserted by `bench:auto`,
not merely stated.

**M0–M7** delivered: the quality-gated scaffold, the full
TypeScript engine core (resize, CIELAB palette reduction, Floyd–
Steinberg dithering, stats), still-image import, the preview UI —
worker-rendered canvas with zoom/pan/fit, grid overlay with row/column
numbering, source-vs-output split compare, a live stats panel, and
Carbon-style control panels — the export suite (clean/enlarged PNGs, a
styled PNG chart, a single-page PDF chart, project save/load — since
DUR-01 a `.pmproj` package: versioned JSON with the picture inside) —
**live capture**: a `getDisplayMedia` session with a
user-drawn crop rectangle over a live thumbnail, a latest-wins frame
pump, dirty-frame skipping, pause/resume, and a draft-quality mode
under load — the **performance backends** (Rust→WASM error diffusion,
WebGPU colour reduction, automatic per-stage selection, benchmark
harness) — and the **companion layout**: a preview-first responsive
shell usable from 320 CSS px, accordion sections with persisted
disclosure, fit-to-space/width/height, and four independently-settable
resolutions (pattern, capture, preview, export) — and the **palette &
colour strategy**: a thread catalogue of 3,338 threads across eight
brands, per-brand enable/disable, a cross-project thread inventory in
IndexedDB with an "only threads I own" restriction, named library
palettes, exact/maximum colour-count targets, and Must-use threads with
auto-fill — every narrowing explained in words rather than silently
applied. **M8 dithering expansion** shipped five dither methods as user
choices (Floyd–Steinberg, Atkinson, Jarvis, ordered Bayer 8×8,
blue-noise) behind a discriminated config with per-family strength and
serpentine where a scan direction exists, with evidence in
`docs/dither-evaluation.md`; its visual acceptance closed inside
M15-DITH-05 (D148).

Later milestones deliberately superseded parts of the above, so read
this list as the arc rather than the current control surface: the
settings-panel collapse and preview-focus mode retired at M14, the
capture region's aspect lock now **defaults off** with both pattern
dimensions deriving from the region (D107), and M15 retired `prefer`
and dissolved `exclude` into profile membership (D114/D124).

## How to run

Prerequisites: Node LTS + npm. For the M5 Rust crate: rustup (stable +
the `wasm32-unknown-unknown` target) and `wasm-pack` — without them
`check` skips the crate step with a warning (CI still runs it).

```sh
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production build to dist/
npm run build:wasm # Rust→WASM crate build (crates/stitch-engine)
npm test           # Vitest, including the golden suite
npm run check      # quality gate: typecheck + lint + test + wasm + build
npm run verify:deploy -- --wait 600  # after a push: the live site serves this commit
```

`localhost` is a secure context, so screen capture and WebGPU work in
dev without HTTPS. The app is fully offline at runtime.

**Live copy:** every green push to `main` publishes the production
bundle to GitHub Pages at <https://djdaojones.github.io/pattern-mapper/>
(the `deploy` job in `.github/workflows/lint.yml`, D172). To preview
that bundle locally under the same base path:
`npx vite build --base /pattern-mapper/ && npx vite preview --base /pattern-mapper/`.
After a push, `npm run verify:deploy -- --wait 600` waits out the deploy
and confirms the live site serves that commit (D180); CI runs the same
check after the deploy job. The public bundle omits the bench harness
(`PM_PUBLIC_BUNDLE=1`, D181).

## Key modules and entry points

- `index.html` → `src/main.ts` — app entry.
- `src/core/` — the pure engine (types, pipeline stages, colour math,
  stats, project serialisation). **Imports nothing outside `src/core/`.**
- `src/worker/` — pipeline executor, scheduling, dirty-frame detection.
- `src/backends/` — `wasm/` and `webgpu/` adapters behind the same
  stage interface as the TS reference.
- `src/capture/` — `getDisplayMedia` session + crop-rect model.
- `src/export/` — PNG, chart, and PDF exporters.
- `src/ui/` — Carbon-based panels + the preview host.
- `crates/stitch-engine/` — Rust error-diffusion crate (M5).
- `docs/requirements.md` — the full requirements spec (reference; cite
  section numbers, don't duplicate).

Full architecture: [`pm_skills/project/architecture.md`](pm_skills/project/architecture.md).

## Invariants a contributor must not break

- **Engine purity.** `src/core/` never touches the DOM, `window`,
  Workers, or I/O; stages are pure functions over a `PixelBuffer`.
- **TS reference is ground truth.** A WASM/WebGPU backend is added only
  where a profile shows the TS path misses budget, and must pass the
  same golden suite. The TS backend is never deleted.
- **Resize before per-pixel work** (the core performance lever) and
  **no processing on the main thread**.
- **Exports always re-run the pipeline at full quality** — preview
  quality must never leak into exported output.
- **Project files are versioned user data**: loaders migrate forward;
  save → load → save is byte-identical.
- **No new runtime dependencies without approval** (allowlist: Carbon
  web components, pdf-lib). **No UXP / Photoshop-plugin path** (see
  decision-log D2).

The permanent rules live in [`AGENTS.md`](AGENTS.md),
[`UI-STANDARDS.md`](UI-STANDARDS.md), and
[`DEV-INFRASTRUCTURE.md`](DEV-INFRASTRUCTURE.md). Living project memory
(brief, architecture, backlog, decisions) is in
[`pm_skills/project/`](pm_skills/project/); this project is managed with
the PM-Skills framework in `pm_skills/`.

## Licence

All rights reserved — see [`LICENSE`](LICENSE); third-party terms are in
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md). Both are readable in
the app via the header's **Licences** button (D177).
