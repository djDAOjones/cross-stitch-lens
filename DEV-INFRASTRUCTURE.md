# Dev Infrastructure

This file defines the permanent rules for how the project is built,
run, tested, versioned, and shipped. `AGENTS.md` references this file.
Read it before any task that involves the build system, dev server,
scripts, configuration, or deployment.

---

## Package management

Package manager: **npm** (Node LTS).

- `package.json` lives in the project root. Run `npm install` after
  cloning. Do not commit `node_modules`.
- **Runtime dependencies** require explicit approval. Current
  allowlist: **Carbon** web components and **pdf-lib**. Default is to
  add nothing further.
- **Dev dependencies** (Vite, Vitest, ESLint, Prettier, typescript,
  `@webgpu/types` — types only, never bundled) can be added when
  justified by the architecture.
- **Rust toolchain** (stable via rustup + the `wasm32-unknown-unknown`
  target + `wasm-pack`) is required for M5 crate work. Vite dev/build
  and `check` still pass without it: `check:wasm` skips with a visible
  warning locally, but **fails hard in CI** (which always installs the
  toolchain), so the skip can never green-wash a mainline break.
- **Cargo dependencies** follow the same approval rule as npm runtime
  dependencies (they compile into the shipped `.wasm`). Current
  allowlist: **wasm-bindgen** (the JS↔Rust interface) and **libm**
  (fdlibm-lineage `pow`/`cbrt` for bit-exact parity with V8 `Math`).

---

## Canonical scripts

| Script | Command | Purpose | When to use |
| --- | --- | --- | --- |
| `dev` | `vite` | Dev server (default port 5173) | Day-to-day development |
| `build` | `vite build` | Production build to `dist` | Before deploy |
| `build:wasm` | `wasm-pack build crates/stitch-engine --target web` | Rust→WASM release build into `crates/stitch-engine/pkg` (gitignored) | When touching the Rust crate |
| `test` | `vitest run` | Vitest incl. golden suite | After every change |
| `bench` | `BENCH=1 vitest run tests/benchmark.test.ts` | Workload matrix + JSON report to `bench-reports`, then budget assertions | Perf-sensitive changes, pre-release |
| `audit` | `AUDIT=1 vitest run tests/audits` | M5B component decompositions + defect reproductions; JSON artefacts to `bench-reports` | Investigating where a cost or a defect lives |
| `matrix` | `MATRIX_FULL=1 vitest run tests/acceptance-matrix.test.ts` | Full acceptance/parity matrix incl. the 1024² ceiling row | Verifying composed-pipeline correctness across axes |
| `matrix:write` | `node scripts/write-acceptance-matrix.mjs` | Regenerate `docs/acceptance-matrix.md`, the matrix coverage table | After a matrix row change — `check` fails if the committed copy drifts (staleness gate) |
| `bench:auto` | `node scripts/bench-auto.mjs` | Automated owner-session legs: flag-granted capture + forced-GC memory reports via a dedicated Chrome (M13-MEAS-03) | Refreshing the browser capture/memory evidence — awake desktop, hands off, never CI; `-- --when-quiet` arms it to fire in the next user-idle gap |
| `bench:crosscheck` | `node scripts/bench-cross-check.mjs` | Part-A′ arithmetic: manual capture report vs the automated canonical one, side by side (same-build guarded) | Once, after the owner's manual Part-A′ run — the verdict stays human and is recorded in the decision log |
| `bench:auto -- --crosscheck` | (mode of `bench:auto`) | The whole Part A′ in one command: flag-granted leg, then a picker-granted leg (real picker; scripted tile+Share click via System Events when Accessibility allows, else one human click), then the comparison table | The zero-or-one-click Part A′ — same build guaranteed by construction |
| `bench:trace` | `node scripts/bench-auto.mjs --trace` | Part-C trace leg (M13-MEAS-04): the capture workloads re-run under raw-CDP tracing (Node built-in WebSocket, zero new deps) → validated GC-pause report per window, observer long tasks quoted alongside | Refreshing the GC-pause evidence — same quiet-desktop rules as `bench:auto`; its timing rows are cross-context (traced), never capture canon |
| `check` | 7 non-mutating steps: types, lint, wasm, test, build, docs, secrets | **Quality gate** | Before calling a task done |
| `lint:fix` | `eslint . --fix` | Auto-fix (separate from the gate) | Cleanup, never the CI pass/fail |

Do not add scripts without updating this table.

---

## Dev server

- **URL:** `http://localhost:5173` (Vite default)
- **Start:** `npm run dev`
- **Serves:** the app from `src/` via `index.html`, with hot module
  reload.
- **Secure context:** `localhost` is a secure context, so
  `getDisplayMedia` and WebGPU work in dev without HTTPS.

All development and testing should use this URL. Do not hard-code
alternative ports or URLs.

- **Parallel sessions:** `vite.config.ts` honours a `PORT` env var and
  `launch.json` sets `autoPort`, so a second session's dev server
  coexists with a running one instead of colliding on 5173 (D27). The
  env var is the sanctioned override; hard-coding a port is still out.

---

## Runtime lifecycle

Single Vite dev server — `dev` + `reboot`:

| Verb | Command | Does |
| --- | --- | --- |
| `dev` | `npm run dev` | Foreground dev server at `http://localhost:5173` |
| `reboot` | clear port 5173, remove `dist`, restart `dev` | Get back to a known-good running state |

- **Owns:** port 5173 only. `reboot` kills just the process on that
  port — no blanket `killall`.
- **Components:** one process (Vite). The app then spawns a processing
  Web Worker in the browser — no server-side background processes, no
  PID/log files to manage.
- **Env:** none required. The app is fully offline at runtime (no
  network calls); there is no `.env` and no secrets sidecar.
- **Cleans:** `dist` only (generated). Never source, never
  `tests/golden`, never owner-supplied palette data.
- **Ready when:** the dev URL serves HTTP 200 and the app shell renders
  — not merely that the process started.
- **Exposure:** local-only by default. Do not enable Vite `--host`
  (LAN exposure) or a public tunnel without an explicit flag and a
  printed warning.
- **Protected paths:** see "Files agents must not hand-edit" below.

---

## Maintainer diagnostics

Tier 1. Diagnostics flow through an app-owned logger and buffer, not the
native DevTools console.

- **Logger:** `src/diagnostics/log.ts` — one structured entry point
  (`log.debug/info/warn/error`). Writes to the console **and** a
  bounded in-memory ring buffer. No scattered ad-hoc `console.log`.
- **Record shape:** `{ time, level, scope, event, message, data,
  error }` (+ optional `interactionId`).
- **Ring buffer:** last ~200 entries, oldest evicted. This buffer — not
  the native console — is what the copy affordance reads.
- **Global capture:** `window` `error` + `unhandledrejection` funnel
  into the logger so nothing fails silently.
- **Debug panel (dev builds):** per-stage timings, active backend per
  stage, frames processed/skipped, LUT rebuild count. There is no
  user-facing backend override: `setSelectedBackend` is reachable only
  from tests and audits (a `?backend=` URL param is a wish-list idea,
  not a shipped switch).
- **Copy-diagnostics bundle:** dev-only affordance (control defined in
  `UI-STANDARDS.md` → "Diagnostics affordance"). Copies app name,
  `appVersion` + `buildId` (+ commit), timestamp + timezone, route/view,
  UA + viewport, dev flags + active backends, the last N **redacted**
  log entries, uncaught errors, and a redaction notice.
- **Redaction:** default-on, fail-closed. Never tokens, cookies, raw
  bodies, full storage, or PII (this app has no secrets or PII at
  runtime, but the rule stands).
- **Gating:** affordance + verbose levels are dev-only; production needs
  an explicit opt-in flag (`DIAG=1`) and a redaction review.
- **Forward-to-server (optional):** Vite `server.forwardConsole` can
  forward browser runtime events to the dev server for the coding agent.

---

## Quality gate

| Script | Command | Purpose |
| --- | --- | --- |
| `check` | `check:types && check:lint && check:wasm && check:test && check:build && check:docs && check:contrast && check:secrets` | The quality gate — run before calling a task done |
| `check:wasm` | `node scripts/check-wasm.mjs` | Rust crate tests + wasm-pack build; skips (warns) without the toolchain locally, hard-fails in CI |
| `check:contrast` | `node scripts/check-contrast.mjs` | WCAG AAA proof of every `@pair` in `src/ui/styles/tokens.css`, both schemes; fails under 7:1 (4.5:1 large, 3:1 non-text) |
| `lint:fix` | `eslint . --fix` | Auto-fix (separate from the gate; never the CI pass/fail) |

- **Runs, in order:** type check (`tsc --noEmit`), ESLint (incl. the
  `src/core/` isolation rule), the Rust crate step (`cargo test` +
  `wasm-pack build`, toolchain-aware — **before** Vitest so the
  wasm-parity suite has a fresh pkg), Vitest (incl. the golden and
  wasm-parity suites), and a production `vite build`. Plus the
  Markdown lint + link-check baseline on project memory
  (`check:docs`) and the report-only secret scan (`check:secrets`).
- **Non-mutating:** `check` only reports; fixes live in `lint:fix` and
  format-on-save. Formatting is never a gate failure.
- **CI parity:** the CI workflow runs `npm run check`, so local green =
  CI green. Benchmarks run with a ×3 tolerance multiplier in CI
  (`CI=true`).
- **Omits:** `bench` and `audit` (their own verbs; run on
  perf-sensitive changes and pre-release) and any future e2e — slow,
  kept out of `check`. `check` must stay under ~2 minutes locally.
- **Test timeouts are liveness bounds, not perf assertions:** Vitest
  `testTimeout`/`hookTimeout` are 30 s (`vite.config.ts`, mirrored by
  the explicit floor in `tests/acceptance-matrix.test.ts`) so a loaded
  desktop slows the gate instead of failing it — a QoS-demoted run
  measurably inflates per-test wall 10–35× with assertions still
  passing. Perf budgets stay in `bench` (D43/D44); the ~2-minute bar
  above describes a quiet desktop. Rationale and evidence: decision
  log D136.

---

## Security baseline

This is a fully offline, client-side app with **no runtime secrets and
no backend** — the surface is small. The baseline is therefore Tier 0:

- **Secret storage:** n/a at runtime. Should any tooling ever need a
  token (e.g. a deploy key), it lives in the environment / CI secret
  store — never in source, URLs, logs, or the diagnostics bundle (see
  "Maintainer diagnostics").
- **.env / .gitignore:** no `.env` is required today. `.gitignore`
  covers `.env`, `.env.*`, and `node_modules` pre-emptively; any future
  template is `.env.example` with placeholder values only.
- **Secret scan:** `check` includes a report-only, dependency-free grep
  for obvious key shapes (`sk-`, `AKIA`, `ghp_`, PEM headers) in tracked
  files. Non-mutating.
- **Dependency audit:** `npm audit` on every dependency upgrade;
  approved pins held via `overrides`, never a blanket `--force`.
- **Secure context:** `getDisplayMedia` and WebGPU require a secure
  context (fine on `localhost` and any HTTPS deploy). If
  `SharedArrayBuffer` is ever adopted (WASM threads), dev and deploy
  must send COOP/COEP headers — record that as a decision first.
- **Leaked-credential response:** rotate at the provider first, replace
  in the secret store, verify, then decide on history rewrite (usually
  skip once the key is dead). Record the decision in `decision-log.md`.

---

## Build system

- **Bundler:** Vite (Rollup under the hood).
- **Entry point:** `index.html` → `src/main.ts`.
- **Output directory:** `dist`.
- **Format/target:** ESM, target ES2020+.
- **Source maps:** enabled in dev and production.
- **Minification:** production builds only.
- **WASM:** `crates/stitch-engine/pkg` (from `build:wasm`) is imported
  by `src/backends/wasm` through the `stitch-engine-wasm` alias
  (vite.config.ts): when the pkg is missing the alias resolves to
  `src/backends/wasm/stub.ts` and the `__WASM_AVAILABLE__` define makes
  registration a logged no-op, so dev/build/test succeed without the
  Rust toolchain and the pipeline stays on the TS backend.
- **Static files:** assets under `public` and `src` are handled by Vite.

The output directory `dist` is **read-only** — never hand-edit it; it
is overwritten on every build.

---

## Version management

| Part | Format | Source | Updated | Example |
| --- | --- | --- | --- | --- |
| Product version | `vMAJOR.MINOR.PATCH` | `package.json` `version`, tagged in git | Manually — MAJOR era/breaking, MINOR milestone (M0–M5), PATCH fix | `v0.2.0` |
| Build identity | `product+YYYYMMDD.shortsha` | Commit + date, injected at build via Vite `define` | Automatically, every build | `v0.2.0+20260716.a1b2c3d` |

- Start at `v0.1.0`; each shipped milestone (M0–M5) is a MINOR bump;
  reserve `v1.0.0` for "users can trust it".
- Both reach production and both appear in the diagnostics bundle as
  `appVersion` / `buildId` (+ `commit`). These fields are non-secret.
- Git tags use the product version (e.g. `v0.2.0`); multiple deploys of
  one product version are told apart by build identity.
- The generated build identity is never hand-edited (see "Files agents
  must not hand-edit").

---

## Deployment

- **Target:** static hosting (GitHub Pages / Netlify) — the app is a
  static bundle. **Post-MVP**; nothing ships until the MVP milestones
  land.
- **Requirement:** HTTPS (secure context) for `getDisplayMedia` and
  WebGPU.
- **Pipeline:** `npm run build` → `dist`, published by the host.
- **Post-deploy:** verify the live URL serves the `buildId` just built
  (compare the diagnostics bundle).
- Tauri packaging is a **separate future pipeline** — nothing in the
  build may assume it.

---

## Utility scripts

- **`build:wasm`** — `wasm-pack` release build of `crates/stitch-engine`
  into `crates/stitch-engine/pkg` (M5+). Not required for pre-M5
  checkouts or CI without Rust.
- **`audit`** — runs the M5B component audits (`tests/audits`): the
  decompositions behind the matrix rows, plus reproductions of the
  defects those audits found. Gated behind `AUDIT=1` for the same reason
  as `bench` — the gate stays fast — and out of `check` for the same
  reason: it times things. Candidate prototypes under
  `tests/audits/candidates/` are measurement subjects, never shipping
  code, and nothing in `src/` may import them. Browser-only boundaries
  are **not** covered here; their procedure is
  `docs/browser-measurement.md`.
- **`bench`** — runs the bv2 workload matrix under the boundary contract
  in `docs/measurement-contract.md`, writes a machine-readable report to
  `bench-reports` (gitignored — regenerated, never committed), logs a
  human summary, and only then asserts the budgets (×3 tolerance in CI).
  The report is written **before** the assertions, so a missed budget
  still leaves complete evidence on disk, and a run that was interrupted
  or stalled is marked **tainted** and fails loudly rather than
  publishing a dirty median. Gated behind `BENCH=1` so the suite skips
  visibly in a plain `vitest run`. Report schema, matrix coverage,
  warm-up policy, validity rules and capture-counter conservation are
  unit-tested in `tests/bench-matrix.test.ts`,
  `tests/bench-report.test.ts` and `tests/bench-counters.test.ts`,
  which **do** run in `check`.
- **`bench:browser`** — production build + `vite preview` (port 4173);
  open `http://localhost:4173/bench.html`. The bv2 browser harness for
  the browser-only boundaries (`preview-update`, `interaction`,
  `export`) and the capture counters — user-gesture-driven because
  `getDisplayMedia` requires the owner to choose the shared surface.
  Ready when the harness page reports "Production harness ready".
  Procedure and interpretation limits:
  `docs/browser-measurement.md` → "The bv2 harness run". Shares the bv2
  vocabulary through `src/bench/` (moved from `tests/bench/` so
  production entries never import test modules).
- **`bench:auto`** — the automated owner-session legs (M13-MEAS-03,
  Tier 1: launch flags only, no new dependencies). Builds, serves the
  production bundle (`BENCH_PORT`, default 4173, `--strictPort` — it
  never takes over a port something else holds), then launches the
  installed Chrome (`BENCH_CHROME` overrides the binary path) twice
  with a throwaway profile: once for the flag-granted capture legs
  (`--auto-select-window-capture-source-by-title`, content-verified
  in-page before any row is measured) and once for the memory leg
  under `--js-flags=--expose-gc` (the forced-GC retention probe).
  Validates both reports (untainted, visible page, all legs measured
  — `scripts/bench-auto-validate.mjs`) and writes every attempt to a
  **timestamped** file in `bench-reports`, copying a leg to its
  canonical unstamped name only when it validated — the canonical
  artefact can never hold a tainted run. An invalid run exits
  non-zero and must not be quoted. Needs an **awake desktop with the
  windows left visible** — never headless, never CI.
  `-- --when-quiet` (or `BENCH_WHEN_QUIET=1`) automates that
  precondition rather than bending it: wait for `BENCH_IDLE_SECS`
  (default 60) of user idle (`ioreg` HIDIdleTime), wake and hold the
  display with the macOS built-in `caffeinate` for the run, and
  re-arm for the next quiet gap when a failure is wholly
  environmental (hidden windows / throttled source), up to
  `BENCH_ATTEMPTS` tries (default 3 armed, 1 direct); structural
  failures never retry, and no user input is ever faked
  (quiet-run logic unit-tested in `scripts/bench-auto-lib.mjs`).
  Owns only what it starts: its preview server, its Chrome
  instances, their temp profiles, its caffeinate holder. Procedure
  and honesty rules: `docs/browser-measurement.md` → "Automated
  owner-session legs".
  `-- --trace` (M13-MEAS-04, or `bench:trace`) runs one leg instead:
  the capture workloads under browser-level CDP tracing — the
  launcher attaches to its own flagged Chrome over Node's built-in
  WebSocket (`scripts/bench-cdp.mjs`, no new dependencies), records
  the probed-affordable categories, and publishes per-window GC
  buckets (minor / major / incremental-marking, never summed) with
  the page's own PerformanceObserver long tasks quoted alongside,
  source named (`scripts/bench-trace-lib.mjs`, unit-tested). The raw
  trace stays local under a `traces` subfolder of `bench-reports`;
  the merged report follows the stamped/canonical rule; a trace-leg
  timing row is cross-context evidence (recorded under tracing) and
  never replaces the untraced capture canon.

---

## Configuration strategy

- **Constants:** tuneable engine values (grid limits, LUT bit depth,
  default budgets, dirty-frame hash size) live in `src/core/` constants
  modules, grouped by domain — not scattered across service files.
- **Stage params:** each stage's `<Stage>Params` type is the single
  source of truth for both its UI controls and its project-file schema.
- **Design tokens:** project brand/semantic colours in
  `src/ui/styles/tokens.css`; Carbon structural conventions (spacing,
  type, layer) implemented to match Carbon spec. See `UI-STANDARDS.md`.
- **Pipeline order** is user data (stored in the project file), not a
  constant.

---

## Editor config

The project root contains `.editorconfig` for mechanical style
enforcement: UTF-8, LF line endings, 2-space indentation, trailing
whitespace trimmed (except in Markdown). Single quotes in TypeScript are
an ESLint/Prettier concern, not `.editorconfig`.

---

## Files agents must not hand-edit

- `dist` — build output, overwritten on every build.
- `crates/stitch-engine/pkg` — generated `wasm-pack` output.
- `tests/golden/**` — golden fixtures; regeneration needs owner
  approval with a stated reason.
- `src/core/palettes/thread-list.csv` — owner-supplied thread list.
- `src/core/palettes/thread-map-proposed.csv` — owner-supplied
  cross-reference schema (header only so far).
- `src/core/palettes/dmc-anchor-map.csv` — superseded owner palette
  source, retained as owner data.
- `src/core/palettes/catalogue.json` — generated by
  `scripts/build-palette.mjs` (re-run the script; do not hand-edit).
- The injected build identity — generated per build.
- `package-lock.json` — managed by npm (commit, but do not hand-edit).
