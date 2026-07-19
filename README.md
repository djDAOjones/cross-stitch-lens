# Cross Stitch Lens

A macOS-first web app that converts visual artwork into cross-stitch
designs in real time. You edit artwork in another application (typically
Photoshop); Cross Stitch Lens captures a chosen screen region via
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

Pre-MVP. Work is organised into milestones **M0–M5** in
[`pm_skills/project/backlog.md`](pm_skills/project/backlog.md).
**M0–M3 have shipped (v0.4.0)**: the quality-gated scaffold, the full
TypeScript engine core (resize, CIELAB palette reduction, Floyd–
Steinberg dithering, stats), still-image import, the preview UI —
worker-rendered canvas with zoom/pan/fit, grid overlay with row/column
numbering, source-vs-output split compare, a live stats panel, and
Carbon-style control panels — and the export suite: clean/enlarged
PNGs, a styled PNG chart, a single-page PDF chart, and project
save/load as versioned JSON. Next up: **M4 live capture**
(`getDisplayMedia`, crop rectangle, frame pump).

## How to run

Prerequisites: Node LTS + npm. (Rust + `wasm-pack` are needed only from
M5.)

```sh
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # production build to dist/
npm test         # Vitest, including the golden suite
npm run check    # quality gate: typecheck + lint + test + build
```

`localhost` is a secure context, so screen capture and WebGPU work in
dev without HTTPS. The app is fully offline at runtime.

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
