# Trajectory — pm-skills framework repository

<!-- Shipped-work narrative, newest phase at the top. One line per
     item: the outcome. The why lives in decision-log.md; release
     detail lives in pm_skills/CHANGELOG.md — point, don't restate. -->

## Source-only fixes

- CI-NODE (2026-07-16) — CI Lint job bumped Node 20 → 22 and
  `engines` → `>=22.18.0`; `cspell@^10` needs Node `>=22.18.0` and was
  failing every push to `main`. No release. See decision-log 2026-07-16.

## Wave 5 — consuming-project features (shipped 2026-07-16, v3.15.0–3.17.1)

- ARCH-INTEG (3.17.1) — Diagnose gains check 7, archive referential
  integrity: dated `decision-log` pointers in the trajectory must
  resolve to a live-log entry or an archive INDEX range, else FAIL with
  a git-recovery hint (propose-restore, never auto-edit); Prune P5
  re-runs it after a split. Former checks 7–12 renumber to 8–13. See
  decision-log 2026-07-16.
- ITEM-AGE (3.17.0) — standing human-owned work surfaces its age at the
  Start B pick; new `[security]` flag banners at every session start
  until closed; Diagnose check 12 + a `memory-policy.md` age row
  (WARN 30 d). Grammar (canonical backlog comment) documents
  `[maintainer]`/`[security]` + the creation-date convention. Age is
  informational — never reorders the queue. See decision-log 2026-07-16.
- NEXT-CMD (3.16.0) — the `/next` loop shipped as a distributed
  workflow `pm_skills/integrations/next.md` (Start B pick → auto-jazz
  build → end-of-task close; one item per invocation, invocation is
  the go-ahead, `[sign-off]` escalates to full). GUIDE/README wired;
  this repo's `/next` now defers to the distributed copy + `self/`
  mapping. See decision-log 2026-07-16.
- REPO-REVIEW (3.15.3) — full source-tree review: gen-file-map
  idempotence fix in both forks (index block parsed as roles), scaffold
  copy-vs-run-in-place doc drift fixed, memory audited all-green. See
  decision-log 2026-07-16.
- CODEBASE-AUDIT (3.15.0) — whole-codebase audit path: an orchestrated
  loop over `review.md` area mode (chunk by `file-map.md` section,
  findings-only, aggregate, triage). GUIDE recipe + review.md pointer
  note; no new files. See decision-log 2026-07-16.
- ADOPT-FIXES (3.15.1) — adopt.md Step 0 gains a framework-source-tree
  exception (don't route the product's own `VERSION` to upgrade);
  two findings closed why-not (file-map `IGNORE` knob, `self/`
  memory-home mapping). See decision-log 2026-07-16.
- REVIEW-FIXES (3.15.2) — first `review.md` pass over the burst:
  changelog `self/` reference reworded (product-tree rule),
  transcripts deduped and renamed to convention, wish-list newline.
  See decision-log 2026-07-16.

Outcome: first product feature shipped through the self-hosted loop,
the loop's own first dogfood findings folded back in, and the burst
reviewed clean end-to-end.

## Self-hosting (shipped 2026-07-16)

- SELF-HOST — framework repo adopted its own memory: `self/`
  deployment (contract + standard memory set), ROADMAP scratch
  retired to `self/archive/user_crud/`, adopted memory lint-gated,
  session loops switched to the standard prompts with the `self/`
  path mapping. Source-only (no release). See decision-log
  2026-07-16.

Outcome: the framework develops itself through its own loops; first
real run of adopt.md (findings → ADOPT-FIXES).

## Wave 4 — process hardening (shipped 2026-07-16, v3.13.0–3.14.1)

- COMMIT-STEP (3.13.0) — per-task commit checkpoints with staged-set
  echo; recommend-only.
- MULTI-WRITER (3.14.0) — parallel-session claim, provenance rule,
  secondary-session handoff close.
- MODEL-TIER (3.14.1) — per-step model-tier guidance (mechanical
  halves cheap; judgement and protocol closes on the stronger tier).

Outcome: the failure modes observed on this repo's own 2026-07-16
burst are now framework mechanisms.

## Waves 1–3 — the 2026-07-16 burst (v3.2.0–3.12.1)

- MEM-MAINT (3.2.0) — sanctioned lite close + Reconcile verb.
- ENV-PREFLIGHT (3.3.0) — environment/sync-conflict preflight +
  repair playbook.
- BUDGET-SCALE (3.4.0) — scale-aware memory budgets.
- FILEMAP-GEN (3.5.0) — generated, sectional file-map.
- ADOPT (3.6.0) — existing-codebase adoption flow.
- TRANSCRIPTS (3.7.0) — chat-transcript archiving convention.
- SEC-BASE (3.8.0) — security baseline as the 5th tiered capability.
- SPIKE (3.9.0) — timeboxed spike mode.
- REFACTOR-MODE (3.10.0) — behaviour-preserving refactor mode.
- REVIEW-AREA (3.11.0) — feature-area review scope.
- DOC-SYNC (3.12.0) — protected-doc sync loop; plus 3.12.1
  burst-review consistency fixes.

Outcome: the Hub case-study findings (retrospective evaluation,
archived) triaged into eleven same-day releases.

## Foundations (2026-04 → 2026-07, v1.x–3.1.1)

- 2.0.0/3.0.0 — consolidation eras: token-efficiency, task.md modes,
  memory-maintenance verbs, 48 → 36 files.
- 2.8.0 — per-item `[detail]` ticket files.
- 3.1.0/3.1.1 — traceable version identity; public GitHub upgrade
  source.
- Source-only: quality-gate tooling (cspell, editorconfig-checker,
  docs-integrity checker, CI, pre-commit hook); npm-audit override
  pins.

Outcome: framework matured from initial templates to a versioned,
upgrade-safe distribution with a lint gate. Detail:
`pm_skills/CHANGELOG.md` + git history.
