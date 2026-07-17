# COMMIT-STEP — Commit checkpoints in `task.md`

> **Status:** Wave 4, top — the next pick (promoted from Later/minor
> at the 2026-07-16 evening triage; evidence-raised, see below).
> **Grades:** Impact **Medium** · Difficulty **Low** · Risk **Low** ·
> OpΔ **Low**.
> **Release class:** patch/minor (wording in existing files).
> **Case study:** §3.7 ("early git integration was absent"), §6 R8.

## Intent

Codify the per-task commit habit the Hub converged on, so rollback
capability exists from a project's first week instead of emerging by
trial. Recommend-commit, never auto-commit.

## Done when

`task.md` has a checkpoint step after Verify (and per-milestone in long
runs) recommending a commit with a message template (ID + summary +
gate results); `end-of-task.md` report includes commit status; the
lite-close trailer (MEM-MAINT) is referenced as the message shape.

## Evidence (banked — do not re-research)

- **The failure mode:** Hub May 2026 ran ~17 days of work in ~2 commits
  (`8d532c9` "Catch up: WL-2/14/15/16/17/18 + B-bug-3…", `8287abe`
  "Major update…" covering 2026-05-04→20 incl. 220 tests). Any
  mid-window mistake had no rollback point; the framework said nothing
  about committing until init-mvp's rollback checkpoints (1.2.0) — and
  those cover greenfield runs only.
- **The converged practice (June–July):** per-ticket commits, ID-titled,
  carrying gate results in the body ("typecheck 0 / 1993 tests (+17) /
  build 0") — 46 commits in June, 61 in July. This made `git log` a
  verification ledger and enabled the 2026-07-08 backlog-vs-git
  reconciliation (`d02ad15`) and every archaeology win in §2.1.
- **Precedents to align with:** `init-mvp.md` checkpoints ("recommend
  the user commit now… do not auto-commit"); memory-maintenance P6 /
  Refactor R5 ("stage… leave committing to the user"); Hub
  `DEV-INFRASTRUCTURE.md` "Shell safety" (multi-`-m` one-liners) — and
  its misfire: several June commit messages contain literal ` -m `
  chains (`de6dec4`, `a90eff0`, `26860df`), so the template must state
  the correct form with an example, not just the rule.

## Approach

1. **`task.md` step 9.5 (or fold into 9 Verify):** "Recommend a commit:
   `<ID>: <summary>` + body lines (what/why one-liner; `Verify:
   typecheck 0 · N tests · build 0`; `Item:` trailer per MEM-MAINT).
   Stage the change set; leave committing to the user unless the
   invocation said 'commit at end'." Long runs (resume-insurance
   territory): recommend per-milestone checkpoints, mirroring init-mvp.
2. **Message shape documented once** (in task.md), aligned with the
   MEM-MAINT trailer grammar so lite closes and normal closes read the
   same in `git log`.
3. **Shell-safety note:** one correct multi-`-m` example inline
   (`git commit -m "TITLE" -m "body line" -m "Verify: …"`), because the
   Hub proved the rule alone gets misapplied.
4. **`end-of-task.md` report line:** committed / staged-awaiting-user /
   not staged.

## Constraints

- Never auto-commit or push (existing framework posture everywhere;
  "commit and push at end" must be an explicit user instruction, as Hub
  practice already treats it).
- No branch/PR/Git-Flow opinions — identity and checkpoints only (the
  3.1.0 boundary statement).
- Works when the project isn't a git repo: say so once and skip.

## Files touched (framework)

`pm_skills/integrations/task.md`, `pm_skills/prompts/end-of-task.md`
(one report line), `pm_skills/GUIDE.md` (daily-loop sentence).
MANIFEST unchanged.

## Evidence upgrade — 2026-07-16 self-hosting burst (this repo, same day)

- The 3.12.0 release commit (`8b1dcbf`) shipped **without its CHANGELOG
  entry**; the 66-line entry landed one minute later in `08547dc`. The
  session had written and coverage-checked the entry — the gap opened
  at the manual commit step (staging slip or sync revert), the one step
  no agent verifies. A consuming project upgrading in that window would
  have read a version with no Upgrade actions. Analysis:
  `evaluations/2026-07-16-recent-dev-review.md` W3.
- Adds a requirement to the Approach: the recommended-commit step
  should include a **staged-set echo** — list the files about to be
  committed against the files the close touched, so a missing file is
  visible before the commit, not after. (MEM-MAINT shipped as 3.2.0,
  so the trailer-grammar dependency is resolved — this ticket now just
  references `end-of-task.md`.)
- Priority effect: raised — the failure mode has now occurred on the
  framework repo itself, not only the Hub.

## Open questions

- ~~Coordinate landing with MEM-MAINT (shared trailer grammar) — ship
  together or MEM-MAINT first?~~ Resolved: MEM-MAINT shipped first
  (3.2.0); reference its trailer grammar in `end-of-task.md`.
