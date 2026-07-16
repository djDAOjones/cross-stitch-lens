# DEV-INFRASTRUCTURE.md — seed content for StitchLive

Fills the `<!-- CUSTOMISE -->` placeholders in the PM-Skills
template.

## Runtime targets

- Primary: Chrome (current) on macOS — WebGPU + `getDisplayMedia`
  fully supported.
- Secondary: Safari (current) — must run via TS fallbacks even if
  WebGPU/capture behave differently; feature-detect, never UA-sniff.
- Fully offline once loaded (no network calls at runtime).

## Toolchain

- Node LTS, npm. Vite for dev/build. Vitest for tests. ESLint +
  Prettier. TypeScript strict.
- Rust stable + `wasm-pack` (from M5). The WASM build is an npm
  script (`build:wasm`) producing `crates/stitch-engine/pkg`,
  imported by `src/backends/wasm/`. Vite dev works without it —
  guard with feature detection so pre-M5 checkouts and CI without
  Rust still pass.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server (default port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run build:wasm` | wasm-pack release build (M5+) |
| `npm run test` | Vitest, includes golden suite |
| `npm run bench` | Benchmark test with budget assertions |
| `npm run check` | **Quality gate**: typecheck + lint + test + build |

`check` is the gate the agent runs at end-of-task. It must stay under
~2 minutes locally; benchmarks run with a ×3 tolerance multiplier in
CI (`CI=true`).

## Headers & security

`getDisplayMedia` and WebGPU require a secure context: fine on
`localhost` dev and any HTTPS deploy. If SharedArrayBuffer is ever
adopted (threads in WASM), dev and deploy must send COOP/COEP
headers — record that as a decision first.

## Diagnostics

- Debug panel (dev builds): per-stage timings, active backend per
  stage, frames processed/skipped, LUT rebuild count.
- `?backend=ts|wasm|webgpu` URL override for manual testing.

## Deploy (post-MVP)

Static hosting (GitHub Pages / Netlify) — the app is a static bundle.
Tauri packaging is a separate future pipeline; nothing in the build
may assume it.

## Protected files

- `tests/golden/**` (regeneration needs owner approval — AGENTS rule 10)
- `pm_skills/project/decision-log.md` (append-only)
- Palette source data supplied by the owner (`src/core/palettes/*.json`)
