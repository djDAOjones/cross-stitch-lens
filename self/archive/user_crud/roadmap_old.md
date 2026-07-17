# PM Skills — Development Roadmap (scratch)

<!-- Gitignored internal scratch (user_crud/). NOT distributed and NOT a
     project-memory template — those (pm_skills/project/*) ship blank and
     must stay blank. This is the framework's single self-development
     file: kick-off prompt, capture inbox, and forward-looking roadmap in
     one. Shipped work is recorded in pm_skills/CHANGELOG.md + git, not
     here.

     SESSION KICK-OFF (self-hosting analogue of session-start.md Start B —
     paste "follow user_crud/ROADMAP.md" into a fresh chat):
     1. Load: this file; the top 2–3 pm_skills/CHANGELOG.md entries;
        pm_skills/VERSION; AGENTS.md (skip if already a global rule); the
        process prompts you'll use (scoping / design-options /
        implementation-plan / validation / quick-task / release).
     2. Verify before trusting: reconcile this file against VERSION, the
        top CHANGELOG entry, and git status / recent log. Fix drift here
        first. Never write version-pinned snapshots into this file —
        they rot.
     3. Pick: Current focus first, then top of Next, then a Decisions
        needed item (present 2–3 options, get a decision), then Minor.
        If all empty, triage the Inbox below into these sections.
     4. Present concisely — what's next, what it touches, recommended
        process (4-stage vs quick-task), release or source-only — then
        STOP and wait for go-ahead.
     5. When shipping: follow release.md (bump pm_skills/VERSION,
        prepend a CHANGELOG entry with Upgrade actions, sync MANIFEST.md /
        GUIDE.md if files changed), run npm run check (must be green),
        move the finished item to Shipped here. Committing is the
        maintainer's call — propose, don't auto-run.

     Ticket grammar mirrors pm_skills/project/backlog.md:
       - **ID Short title** [flags]
         Intent: the outcome wanted.
         Done when: the acceptance condition.
     Status: [ ] todo  [~] in progress  [-] cut. -->

## Inbox (untriaged captures — one line each; triage into sections below, then delete)

- code refactor prompt/verb — dedicated flow for restructuring existing code without behaviour change (not scoped; checked 2026-07-04: nothing covers it — memory-maintenance.md's Refactor verb is memory-only)
- extend review.md to accept a feature area / shipped feature as review scope, not just a change-set diff (residual of "feature appraisal / bug-hunter" idea; review.md already covers the audit flow itself — checked 2026-07-04)
- writing all AI chat transcript/trajectory to a folder for later reading / use for framework and user input optimisation

## Current focus

- (empty)

## Next

- [ ] **ADOPT Existing-codebase adoption flow** [not scoped]
  Intent: a retrofit path (`adopt.md`) for mature repos — reverse-engineer
  `architecture.md`, `file-map.md`, and a seed `trajectory.md` /
  `decision-log.md` from the source tree and git history, then interview
  only for gaps. `init.md` interviews for new projects and `init-mvp.md`
  builds from an idea; nothing covers retrofitting. Biggest adoption
  lever — most people arriving already have a half-built project.
  Done when: `adopt.md` produces populated project memory from an
  existing repo with only gap-filling interview questions.
- [ ] **SPIKE Spike/experiment workflow** [not scoped]
  Intent: a time-boxed exploratory mode (`spike.md`) distinct from
  `task.md` — throwaway branch, no backlog item required, no memory
  writes except one decision-log entry recording what was learned. Vibe
  coders explore constantly; today exploration is forced into
  task-shaped clothing or left undocumented.
  Done when: `spike.md` exists with the time-box, branch, and
  single-decision-log-entry memory contract.
- [ ] **SEC-BASE Security baseline as the 5th tiered capability** [not scoped]
  Intent: a framework opinion on secrets handling, .env hygiene,
  dependency auditing (the source-only npm-audit discipline as a
  consuming-project default), and a pre-deploy security checklist —
  joining the four build/run/ship capabilities (runtime recovery 2.3.0,
  self-explaining runtime 2.4.0, quality gate 2.6.0, version identity
  3.1.0) and the existing diagnostics-redaction rule.
  Done when: an `AGENTS.md` hard rule + `DEV-INFRASTRUCTURE.md` section
  following the established Tier 0–2 pattern.
- [ ] **TEST-DOC Testing doctrine made explicit** [not scoped]
  Intent: the README advertises a "lean invariant-led testing doctrine"
  but it lives implicitly inside the quality-gate rule; a short explicit
  section defining what deserves a test (invariants, regressions — not
  coverage theatre) would stop agents over- and under-testing.
  Done when: a short section lands in `AGENTS.md` or
  `DEV-INFRASTRUCTURE.md` (placement is a design decision).
- [ ] **DATA-MIG Data-migration discipline** [not scoped]
  Intent: `deploy.md` has rollback, but nothing covers persistent-data
  changes in consuming projects — reversible migrations,
  backup-before-destructive-op, schema versioning. Matters the moment a
  consuming project grows a database.
  Done when: a hard rule ("no irreversible data change without a
  documented backout") + a `DEV-INFRASTRUCTURE.md` section.
- [ ] **TASK-SIZING Sizing levels for task scope** [not scoped]
  Intent: let the framework accept a scope size for a task: minimum
  (do the smallest change, current and default), medium (allow a bit
  more), and large (go big). Helps match the fix to the maintainer's
  appetite and the risk of the change.
  Done when: a prompt or flag is designed that reliably steers the
  agent's ambition across the three levels without breaking the
  minimal-change default.
- [ ] **REAL-TRAJ Review mature-project trajectory for framework tweaks**
  [not scoped]
  Intent: inspect the project memory of an existing mature repo
  (especially `trajectory.md`, `decision-log.md`, `backlog.md`) to see
  how real-world narrative and decision records evolve, and identify
  any reflection-driven tweaks to the pm-skills templates or prompts.
  Done when: findings are recorded in the framework's decision log
  and any resulting changes are triaged into this roadmap.

## Decisions needed

- [ ] **FMT-CONV Backlog/ticket formatting conventions** [not scoped]
  Intent: decide whether `pm_skills/project/backlog.md` and
  `pm_skills/project/tickets/<ID>.md` should adopt explicit formatting
  conventions (e.g., Markdown line length, heading levels, required
  sections, status emoji) so agents produce consistent, parseable
  project memory. If yes, define the minimal enforceable rule set.
  Done when: a decision is recorded in `pm_skills/project/decision-log.md`
  and, if adopted, a conventions section or checker is added to the
  framework.
- [ ] **MEM-MAINT Conditional post-session memory maintenance** [not scoped]
  Intent: decide whether the framework should support a mode that skips
  `decision-log.md`, `trajectory.md`, `backlog.md`, and `file-map.md`
  updates after a session when nothing material changed, because running
  the full memory-maintenance flow is credit-expensive and often
  no-op. The maintainer already uses an ad-hoc prompt bypass; consider
  whether to adapt `session-start.md` / `task.md` auto-jazz to offer an
  explicit "memory updates optional" flag and/or defer commit/push to a
  separate verb.
  Done when: a decision is recorded in `pm_skills/project/decision-log.md`
  and, if adopted, a prompt/flag or process change is added to the
  framework.

## Minor / cosmetic

- [ ] **CL-HORIZON Changelog support horizon** [icebox]
  Intent: stop CHANGELOG.md accreting forever in consuming projects.
  Done when: entries older than a stated horizon (e.g. two majors) move
  to an archive file the upgrade legacy path knows about. Not urgent
  (~11k words, cold except during upgrades); revisit past ~20k.
- [ ] **MODEL-TIER Model-tier guidance** [icebox]
  Intent: note that mechanical stages (end-of-task counts, prunes) can
  run on a cheaper model than scoping/design.
  Done when: one short paragraph in GUIDE.md; no per-tool config.

## Shipped (recent context — see CHANGELOG for detail)

- **3.1.1** (in working tree, uncommitted as of 2026-07-04) — upgrade.md
  Step 0 now names the public PM-Skills GitHub repo as the default
  upgrade source; GUIDE.md mirrors the wording. Patch.
- **3.1.0** (committed bf4376b) — Traceable version identity (VER): the 4th build/run/ship
  capability, after runtime-recovery (2.3.0), self-explaining-runtime
  (2.4.0), quality-gate (2.6.0). Consuming-project version-naming default
  = two-part identity — product version `vMAJOR.MINOR.PATCH` (release
  name) + build identity `+YYYYMMDD.shortsha` (exact-commit trace). New
  `AGENTS.md` hard rule + anti-pattern; populated `DEV-INFRASTRUCTURE.md`
  → Version management (Tier 0–2); retired the conflicting
  `major.minor.build` example in `init.md`; sharpened `deploy.md`
  version-stamp/match + diagnostics `appVersion`/`buildId`. Identity only
  — not Git Flow / branch / PR / commit conventions; framework's own
  `VERSION` + `release.md` stay separate. Minor; backward compatible.
- **3.0.0** — Token-efficiency + consolidation release, from an
  external repo review. Efficiency: checkpoint gating (2 gates)
  default, `memory-policy.md` (budgets out of always-loaded AGENTS),
  headings-first decision-log read, end-of-task fast path, be-terse
  output rules, resume insurance, one-writer rule, release.md
  coverage check. Consolidation (48 → 36 distributed files;
  integrations 10 → 3): `task.md` absorbs feature/checkpoint/
  auto-jazz/auto-jazz-lite as modes; `memory-maintenance.md` absorbs
  doctor/prune/roadmap-refactor as verbs; session-start absorbs
  next-batch (Start B) + corrections; init-mvp absorbs spec-to-prod
  (scope bands 0–3); init.md absorbs init-project (agent mode);
  wrapper integrations cut. (source-only) lint scripts npx-prefixed;
  check-links + check-paths merged into `scripts/check-docs.mjs`
  (changelog excluded as a path source). Covers zz_IDEAS: "4-phase
  optimisation" + "command cleanup".
- **2.8.0** — Per-item `[detail]` ticket files
  (`pm_skills/project/tickets/<ID>.md`, cold tier, lifecycle-evicted).
  Covers zz_IDEAS: ".md ticketing system"; rejects chat-logs-as-tickets.
  Committed (0c86726).
- **(source-only)** — Security: closed the 2 moderate `npm audit`
  advisories (CVE-2026-53550 js-yaml, CVE-2026-48988 markdown-it) that
  arrived via `markdownlint-cli2`'s exact-pinned transitive deps. Added
  `package.json` `overrides` → js-yaml `^4.2.0`, markdown-it `^14.2.0`
  (backward-compatible minor bumps carrying the DoS patches); regenerated
  the lockfile; `CONTRIBUTING.md` documents the pins; `cspell.json` gains
  "smartquotes". `npm audit` reports 0; full gate green. Committed
  (fde054a).
- **(source-only)** — Quality-gate tooling: added `cspell` (curated
  `cspell.json` dictionary), `editorconfig-checker` (non-Markdown, via
  `.editorconfig-checker.json`), and a dependency-free
  `scripts/check-paths.mjs` (inline backticked path-reference integrity).
  Wired into `npm run lint`/`check` + `.github/workflows/lint.yml`;
  `CONTRIBUTING.md` updated; lockfile regenerated. Source-only (no
  `VERSION` bump). Committed (9b81c751).
- Older entries (2.7.x and below, plus earlier source-only work)
  trimmed 2026-07-04 — see `pm_skills/CHANGELOG.md` and git history.
