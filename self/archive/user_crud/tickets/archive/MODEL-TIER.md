# MODEL-TIER — Model-tier guidance

> **Status:** Wave 4, piggyback — ship with either Wave 4 release
> (promoted from Later/minor at the 2026-07-16 evening triage;
> evidence-raised, see below).
> **Grades:** Impact **Low-Med** (cost only, no capability change) ·
> Difficulty **Trivial** · Risk **Low** · OpΔ **Low**.
> **Release class:** patch (one GUIDE paragraph + one header line).
> **Case study:** §7, Addendum A C6. Carried from roadmap_old.md
> Minor/icebox, promoted to piggyback.

## Intent

One short paragraph telling users that mechanical stages suit cheaper
models than judgement stages — no per-tool configuration, no mechanism.

## Done when

GUIDE carries the paragraph; `memory-maintenance.md`'s header carries
one line scoping it to the right halves of the verbs.

## Evidence (banked — do not re-research)

- The Hub ran ~9 prune/maintenance operations in six weeks; their
  mechanics are counts, greps, `tail`/`diff` verification, and INDEX
  bookkeeping — token-heavy, judgement-light (§7 "meta-work sessions
  are pure token cost").
- The same sessions also contain the counter-example that bounds the
  advice: prune **propose** steps make judgement calls (the 2026-06-19
  prune declined to archive further because it would "split a single
  day across live + archive — breaks epoch-integrity"; the 2026-05-30
  prune honoured a maintainer steer about contextual advantage). A weak
  model mis-proposing a prune is the real risk.
- MEM-MAINT's Reconcile verb (tickets/MEM-MAINT.md) adds another
  mechanical candidate once it exists.

## Approach

GUIDE, one paragraph (placement: near "Looking after project memory"):
mechanical work — the size-check counts, Prune P1/P4/P5
detect/execute/verify, Diagnose's greps, Reconcile's log harvesting —
runs fine on a cheaper/faster model; judgement work — scoping, design
options, any **propose** step (P2/R3), validation, review — should not.
One matching line in `memory-maintenance.md`'s shared-rules header.

## Constraints

- Guidance only: no tool names, no config keys, no per-tool
  instructions (tools change faster than the framework releases).
- The propose/apply boundary must be stated explicitly — the advice is
  per-*step*, not per-*verb*.

## Files touched (framework)

`pm_skills/GUIDE.md`, `pm_skills/prompts/memory-maintenance.md`
(header line). MANIFEST unchanged.

## Evidence upgrade — 2026-07-16 self-hosting burst (this repo, same day)

- Session quality tracked model tier directly during the burst: the
  weak-model SPIKE session (3.9.0) skipped the environment-preflight
  note and the release consistency check, never re-ran the gate after
  its ROADMAP edit, proposed a nonconforming commit message, and
  introduced the burst's only semantic defect ("spike closes lite",
  fixed in 3.12.1). The user re-ran the follow-up item on a better
  model, which then also had to clean up (see MULTI-WRITER's linked
  incident). Transcript:
  `_transcripts/2026-07-16-SPIKE-and-REFACTOR-MODE-redo.md`; analysis:
  `evaluations/2026-07-16-recent-dev-review.md` W2.
- Sharpens the guidance: release/close **protocol adherence** (the
  mechanical checklist half) degrades first on cheap models — the GUIDE
  paragraph should say judgement stages *and* multi-step protocol
  closes both want the stronger tier; only genuinely mechanical
  verification (counts, greps, diff checks) is safely cheap.

## Open questions

None — ship whenever a release is already rolling.
