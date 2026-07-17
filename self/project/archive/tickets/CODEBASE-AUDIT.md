# CODEBASE-AUDIT — Whole-codebase review pass

> **Status:** Wave 5 (after SELF-HOST; consuming-project feature).
> **Grades:** Impact **Medium** · Difficulty **Medium** · Risk **Low**
> · OpΔ **Low**.
> **Release class:** minor (GUIDE recipe and/or review.md extension).
> **Origin:** maintainer capture 2026-07-16 ("full code review /
> refactor feature — holistic codebase pass; relate to review.md +
> refactor mode; scope unclear" — scope question is THE open decision).

## Intent

Give consuming projects an invocable path for "review the whole
codebase": a holistic audit that chunks the repo into bounded areas,
runs each through the existing review machinery, and aggregates
findings into triaged captures — instead of the maintainer hand-
orchestrating area-by-area sessions.

## Done when

- A documented, invocable path exists for a whole-repo audit that
  scales by repo size (bounded read cost per chunk, explicit chunk
  list stated before auditing).
- Output is findings-first: an aggregated report + backlog/wish-list
  captures with severity — never silent edits; refactor-mode tasks are
  spun out per accepted finding, not executed inline.
- The path composes the existing pieces (review.md area mode 3.11.0,
  refactor mode 3.10.0, spike mode 3.9.0) rather than duplicating
  them.

## Evidence (banked — do not re-research)

- **Hub precedent:** the overnight code-review hardening sessions
  (2026-06-05→19: remote-artist, AI, config areas — decision-log
  archive) were exactly this, done ad hoc: the maintainer picked
  areas, ran repeated bounded reviews, folded findings into the
  backlog. It worked — but the orchestration lived in the
  maintainer's head, not the framework.
- **Existing coverage and the gap:** `review.md` (3.11.0) audits one
  diff range or one feature area; refactor mode executes one declared
  surface. Nothing owns the outer loop — enumerate areas → review each
  → aggregate → triage.
- **Read-cost lesson:** Hub file-map at ~180 files ≈ 9k words (case
  study §3.2) — a whole-repo pass MUST chunk; a single unbounded
  session is exactly the anti-pattern the sectional file-map fixed.

## Approach (lean — decision needed)

Lean: **orchestration recipe, not a new prompt file.**

1. Chunk source = `file-map.md` sections (already directory-grouped,
   generated, budget-aware); the audit session states the chunk list +
   order up front.
2. Per chunk: run `review.md` in feature-area mode with the chunk as
   the declared area; findings-only (spike posture), bounded read
   cost.
3. Aggregate: one audit report (severity-tagged findings, per-chunk
   coverage statement, explicit "not audited" list); captures appended
   to wish-list/backlog per normal triage grammar.
4. Home: a "Whole-codebase audit" section in GUIDE (the recipe) + a
   short "whole repo = all sections" paragraph in review.md's area
   mode. Only if real use shows the recipe under-specifies does a
   dedicated `audit.md` get considered.

## Constraints

- Findings-only by default — an audit never edits code; execution goes
  through task.md (refactor mode for structural items).
- Bounded per-chunk read cost with the cap stated (adopt.md's
  per-directory read-cost cap is the precedent).
- Protected-doc currency checks (3.11.0/3.12.0) run per chunk and feed
  the doc-deltas ledger, not ad-hoc doc edits.
- Multi-session by design: each chunk review must close cleanly
  (resumable), so a big repo audit can span sessions without a
  monolithic context.

## Files touched (framework)

`pm_skills/GUIDE.md` (recipe section), `pm_skills/prompts/review.md`
(whole-repo paragraph in area mode). MANIFEST unchanged unless a
dedicated audit.md is chosen (not the lean).

## Open questions

- Recipe in GUIDE vs `review.md` whole-repo mode vs new `audit.md` —
  the capture's "scope unclear" flag. Lean above; decide at scoping
  with the maintainer.
- Chunk unit for repos without a generated file-map (adopt-tier
  projects): top-level directories? Defer until first real run.
- Does the audit report live in transcript-style cold storage or as a
  dated file in `self/evaluations/`? Lean: dated report next to
  project memory, cold tier.
