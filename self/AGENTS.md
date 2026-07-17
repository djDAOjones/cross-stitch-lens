# AI Agent Rules — pm-skills framework repository (self-hosted)

This is the **operative agent contract for this repository**. The
root `AGENTS.md` is a distribution template (product, shipped with
placeholders intact) — it is NOT this repo's contract. Read this file
instead.

## Product identity

**pm-skills** — _a project-management layer for AI-assisted coding_:
project memory, rulebooks, and workflows that let an AI agent carry a
project's context between chat sessions and design before it codes.
See `README.md` for the product description.

This repository holds **two separated concerns**:

| Concern | Where it lives | Rules |
| --- | --- | --- |
| **Product** — the distributed framework | `pm_skills/` + root `AGENTS.md`, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md` | Pristine. Template placeholders stay. Every change is a release. |
| **Process** — this repo's own pm-skills deployment | `self/` | Living project memory. Never distributed. Lint-gated. |

## Path mapping (self-hosting rule)

The framework's prompts and workflows apply to this repo unchanged,
with one substitution:

- Where a prompt says `pm_skills/project/<file>`, this repo reads and
  writes `self/project/<file>`.
- Where a prompt says root `AGENTS.md` / `DEV-INFRASTRUCTURE.md`, this
  repo reads `self/AGENTS.md` / `self/DEV-INFRASTRUCTURE.md`.
- `UI-STANDARDS.md` is **not applicable** — this repo has no UI.
- Everything else (`pm_skills/prompts/*`, `pm_skills/integrations/*`,
  verbs, modes, budgets, tiers) applies as written.

## Before every task

Standard pm-skills read tiers (`pm_skills/prompts/session-start.md`),
mapped to this repo:

**Hot whole-file** — `README.md`, `self/project/brief.md`,
`self/project/architecture.md`, `self/project/conventions.md`.

**Conditional** — `CONTRIBUTING.md` when the task touches tooling,
lint config, CI, or repo structure. `self/DEV-INFRASTRUCTURE.md` →
"Quality gate" at every task close.

**Hot sectional** — `self/project/file-map.md` (index + touched
sections), `self/project/backlog.md` (Active only),
`self/project/decision-log.md` (latest 10 headings).

**Warm** — `self/project/trajectory.md`.

**Cold (never auto-read)** — `self/project/wish-list.md`,
`self/project/doc-deltas.md`, `self/project/tickets/<ID>.md` (active
`[detail]` item only), `self/project/archive/`, `self/archive/`
(pre-adoption history), `self/evaluations/`, `self/_transcripts/`.

Memory budgets: `pm_skills/memory-policy.md` applies unchanged.

## Hard rules (this repository)

- **The product tree is protected.** Nothing repo-specific ever goes
  into `pm_skills/` or the three root templates. No distributed file
  may reference `self/`.
- **Every distributed change is a release.** Any edit to a
  `pm_skills/**` file or a root template bumps `pm_skills/VERSION`
  and prepends a `pm_skills/CHANGELOG.md` entry with Upgrade actions
  (`pm_skills/prompts/release.md`). Source-only changes (this
  directory, `scripts/`, lint config, CI, `package.json`) never bump
  VERSION — see `CONTRIBUTING.md`.
- **MANIFEST/GUIDE sync.** Adding, renaming, or removing a distributed
  file updates `pm_skills/MANIFEST.md` and the `pm_skills/GUIDE.md`
  file tree in the same change.
- **One-command quality gate.** `npm run check` — non-mutating,
  CI-mirrored. Green after the last edit is the precondition for
  closing any task.
- **Deliberate forks stay forked.** `pm_skills/scaffold/` ships
  generic copies; `scripts/` holds this repo's tuned siblings. A bug
  fixed in one must be considered for the other (see
  `CONTRIBUTING.md` → "Note on deliberate forks").
- **Minimal dependencies.** Zero runtime deps; dev deps only with
  explicit approval (currently three, all lint tooling).
- **Prose conventions.** en-GB spelling, hard-wrapped ~72-char prose,
  markdownlint defaults per root `.markdownlint.json`.

## End-of-task extension — framework release checklist

`pm_skills/prompts/end-of-task.md` applies as written. When the task
changed **distributed files**, additionally tick every line in the
closing report:

- [ ] `pm_skills/VERSION` bumped; CHANGELOG entry prepended with
  Upgrade actions.
- [ ] `pm_skills/MANIFEST.md` / `pm_skills/GUIDE.md` synced if files
  were added, renamed, or removed.
- [ ] `npm run check` green AFTER the last edit (including the memory
  updates themselves).
- [ ] Release consistency: every changed distributed file is named in
  the top CHANGELOG entry; VERSION == top entry.
- [ ] Shipped item removed from `self/project/backlog.md`; one line
  added to `self/project/trajectory.md`; the why recorded in
  `self/project/decision-log.md`; its ticket file moved to
  `self/project/archive/tickets/` (maintainer call 2026-07-16:
  archive, never delete).
- [ ] Commit proposed with a staged-set echo (files staged vs files
  touched) — committing is the maintainer's call; propose, never
  auto-run.

Source-only tasks tick only the last three lines.

## Not applicable here

- **UI standards / Carbon / WCAG** — no UI. If the framework ever
  grows a UI surface (site, viewer), adopt `UI-STANDARDS.md` then.
- **Runtime lifecycle / diagnostics** — nothing runs; the repo is
  Markdown plus lint tooling. The quality gate is the only verb
  (`self/DEV-INFRASTRUCTURE.md`).

## Provenance

Adopted via `pm_skills/integrations/adopt.md` on 2026-07-16
(SELF-HOST). The pre-adoption memory — roadmap, kick-off protocol,
tickets, evaluations, transcripts — is archived verbatim at
`self/archive/user_crud/`. Decisions carried from it live in
`self/project/decision-log.md`.
