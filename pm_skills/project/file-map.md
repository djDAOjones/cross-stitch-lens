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
<!-- 31 file(s) across 9 section(s); regenerate with pm_skills/scaffold/gen-file-map.mjs -->
- `(root)` — 10 file(s)
- `.claude` — 1 file(s)
- `.githooks` — 1 file(s)
- `.github` — 1 file(s)
- `.windsurf` — 1 file(s)
- `docs` — 1 file(s)
- `scripts` — 4 file(s)
- `src` — 8 file(s)
- `tests` — 4 file(s)
<!-- /file-map-index -->

## (root)

- `AGENTS.md` — operative agent contract: hard rules, data model, read tiers
- `DEV-INFRASTRUCTURE.md` — build/run/test/version/deploy rulebook
- `README.md` — project front door: what it is, how to run it
- `UI-STANDARDS.md` — Carbon-first UI + WCAG 2.2 AAA rulebook
- `cspell.json` — spelling dictionary + ignore paths for the docs gate
- `eslint.config.js` — flat config; core-isolation + no-console rules
- `index.html` — Vite entry document; mounts `src/main.ts` at `#app`
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

- `src/core/palettes/dmc-anchor-map.csv` — owner-supplied DMC/Anchor map (protected)
- `src/core/palettes/dmc.json` — generated DMC palette, 533 colours (protected)
- `src/core/pipeline/identity.ts` — identity stage: hello-world purity demo
- `src/core/pipeline/index.ts` — pipeline executor: backend pick + ts fallback
- `src/core/types.ts` — core contracts: PixelBuffer, Palette, Stage, ProjectFile
- `src/diagnostics/log.ts` — structured logger: console + ring buffer + global capture
- `src/main.ts` — app entry: M0 shell, version display, logger boot
- `src/vite-env.d.ts` — ambient types for injected version/build globals

## tests

- `tests/golden/hello-4x4.expected.json` — golden fixture: identity expected output (protected)
- `tests/golden/hello-4x4.input.json` — golden fixture: 4x4 gradient input (protected)
- `tests/helpers/golden.ts` — golden harness: fixture load + tolerance compare
- `tests/pipeline-hello.test.ts` — M0 acceptance: identity golden + purity invariants
