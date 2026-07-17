# Development Infrastructure — pm-skills framework repository

Tier-0 docs project: Markdown plus dependency-light Node lint
tooling. Nothing builds, serves, or deploys. `CONTRIBUTING.md` is the
canonical tooling reference — this file records the pm-skills
capability surface and points there rather than restating it.

## Package management

Package manager: **npm**. Zero runtime dependencies. Three dev
dependencies (`cspell`, `editorconfig-checker`, `markdownlint-cli2`),
all lint tooling, all invoked via `npx --yes` so the gate runs with or
without a local `node_modules/`. Security override pins are documented
in `CONTRIBUTING.md` → "Security overrides".

## Canonical scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `check` | `npm run check` | The quality gate (alias of `lint`) |
| `lint` | `npm run lint` | All four checks below, in sequence |
| `lint:md` | `npx markdownlint-cli2 "**/*.md"` | Markdown lint |
| `lint:docs` | `node scripts/check-docs.mjs` | Relative-link + inline-path integrity |
| `lint:spell` | `npx cspell "**/*.md"` | Spelling (en-GB, curated dictionary) |
| `lint:editorconfig` | `npx editorconfig-checker` | EditorConfig conformance (non-Markdown) |
| `lint:fix` | `npx markdownlint-cli2 --fix "**/*.md"` | Auto-fix — separate verb, never the gate |

Do not add scripts without updating this table and `CONTRIBUTING.md`.

## Quality gate

- **Command:** `npm run check` — non-mutating, CI-safe.
- **Runs:** markdownlint, docs integrity (links + backticked paths),
  cspell, editorconfig-checker.
- **Scope:** every tracked Markdown file except the gate-excluded
  paths: `self/archive/**` (frozen pre-adoption history),
  `self/evaluations/**` and `self/_transcripts/**` (working outputs
  with exported content the gate cannot check). The living memory in
  `self/project/**` IS gated.
- **CI parity:** `.github/workflows/lint.yml` runs the same checks on
  every push and PR. A tracked pre-commit hook (`.githooks/`) runs
  `npm run check`; wired via `git config core.hooksPath .githooks`
  (the `prepare` script does this on `npm install`).
- A red gate blocks task close — fix the cause or record why the rule
  is wrong; never skip or weaken a check.

## Runtime lifecycle

Not applicable — nothing runs. The one-command capability collapses
to: clone, then `npm run check`.

## Maintainer diagnostics

Not applicable — no runtime. The gate's per-check output is the
diagnostic surface; CI logs are the durable copy.

## Version management

- **Product version:** `pm_skills/VERSION` — the distributed
  framework's SemVer, bumped per `pm_skills/prompts/release.md`.
  `package.json` deliberately carries no version (single source of
  truth).
- **Build identity:** the git commit sha; releases are commits on
  `main` whose top `pm_skills/CHANGELOG.md` entry matches VERSION.
- Source-only changes (`self/`, `scripts/`, lint config, CI) do not
  touch VERSION.

## Security baseline

No secrets, no runtime dependencies, no deploy surface. Dev-dependency
advisories are triaged via `npm audit`; approved pins live in
`package.json` `overrides` (see `CONTRIBUTING.md`). Transcripts are
redacted before commit (`pm_skills/GUIDE.md` → "Saving session
transcripts").

## Cloud-sync caveat

This checkout commonly lives on OneDrive. Never let `node_modules/`
sync; prefer the `npx` fallback or CI for authoritative runs. See
`CONTRIBUTING.md` → "OneDrive / cloud-synced checkout" and the
environment preflight in `pm_skills/prompts/memory-maintenance.md`.
