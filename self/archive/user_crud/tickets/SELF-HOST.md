# SELF-HOST — Framework repo adopts its own memory

> **Status:** Wave 5 (structural; after Wave 4 hardening).
> **Grades:** Impact **Med-High** · Difficulty **Medium** · Risk
> **Medium** · OpΔ **High** (changes the maintainer's day-to-day loop
> on this repo more than any framework release).
> **Release class:** mostly source-only (this repo's own memory);
> plus whatever small framework fixes the dogfooding surfaces
> (patch/minor as they arise).
> **Origin:** maintainer capture 2026-07-16 ("apply the pm-skills
> framework to its own repository — real project memory here, not just
> ROADMAP scratch?").

## Intent

Make this repo a real consuming project of its own framework: run
`adopt.md` on it, stand up actual project memory, and replace the
ROADMAP scratch-file analogue with the real session-start /
end-of-task loops. The framework should eat its own cooking — every
seam it has (docs-only tier detection, adopt on a repo with history,
memory budgets on a small file set) gets exercised for real.

## Done when

- A memory home exists for this repo (NOT `pm_skills/project/` — those
  are shipped templates) with the adopted equivalents of brief /
  architecture / file-map / backlog / decision-log / trajectory.
- The ROADMAP-vs-backlog question is resolved (one authority for open
  work; no double-bookkeeping) and the kick-off protocol lives in the
  standard place (session-start Start B + repo AGENTS.md), not only in
  a scratch-file comment.
- At least one real framework release has been shipped end-to-end
  through the adopted loop (session-start pick → task → end-of-task
  close → memory writes), and the release checklist (old kick-off
  step 5) survives as this repo's end-of-task extension.
- Findings about `adopt.md` itself (this is its first real run) are
  captured as tickets/backlog items.

## Evidence (banked — do not re-research)

- **The burst review is the case for it** — every finding maps to a
  memory-loop gap the real machinery already covers:
  P1 (shipped tickets deleted, unrecoverable pre-tracking) ↔ versioned
  memory + archive tier; W2 (weak-model protocol drift) ↔
  `end-of-task.md` gate; W3 (3.12.0 CHANGELOG-miss commit) ↔ close
  protocol + staged echo; N1 (transcript naming drift) ↔ the 3.7.0
  convention the repo itself wasn't following.
  `evaluations/2026-07-16-recent-dev-review.md`.
- **REAL-TRAJ closure** (ROADMAP Settled record): "re-run on the *next* consuming
  project, not the Hub" — self-hosting makes this repo that project.
- **ADOPT (3.6.0) has never run on a real repo.** This repo is the
  docs-only tier edge case (no app code, no tests beyond the doc gate)
  — exactly the tier-detection path least exercised.

## Approach

1. Run `pm_skills/integrations/adopt.md` against this repo as a real
   consuming project would; let it hit the docs-only tier and record
   every rough edge.
2. Memory home: `user_crud/` is already the de-facto memory (tracked,
   gate-excluded since 2026-07-16) — lean: adopt INTO it rather than
   inventing a second location. Rename/shape files to the standard set
   where sensible.
3. ROADMAP.md → `backlog.md` mapping: waves ≈ Next, Later/minor ≈
   Icebox, Shipped fold-ins ≈ trajectory entries, Settled record ≈
   decision log. Migrate once, keep `roadmap_old.md`-style verbatim
   archive.
4. The release close-out checklist (kick-off step 5) becomes this
   repo's documented end-of-task extension (release protocol is a
   framework-repo specific concern; don't push it into the
   distributed prompts).
5. Dogfood findings → new tickets; anything distributed that needs
   fixing ships as normal releases.

## Constraints

- `pm_skills/` stays a pristine distributed template tree — the repo's
  own memory never lives there and never ships.
- No double-bookkeeping, even transitionally: the cutover commit
  retires the old authority in the same change that creates the new
  one.
- Gate posture decision must be explicit: memory currently sits in the
  gate-excluded `user_crud/`; the Hub lints its memory. Either lift
  the exclusion for the adopted memory files or record why not.
- The migration must be lossless (diff-verifiable, like a Prune) —
  ROADMAP content either moves somewhere named or is archived
  verbatim.
- `.windsurf/workflows/next.md` (the /next shortcut) points at the
  ROADMAP kick-off block — when this item moves or replaces that
  block, update the workflow pointer in the same change.

## Files touched (framework)

None required up front — the point is to consume, not change. Expect
dogfooding fallout in `adopt.md` (docs-only tier), possibly
`memory-policy.md` (budgets on a tiny repo). This repo: `user_crud/*`
reshaped, root `AGENTS.md` gains the project sections init.md Step 6
prescribes.

## Open questions

- Does ROADMAP.md survive as a thin release-planning view over
  `backlog.md`, or fully dissolve into it? Lean: dissolve; releases
  are just backlog items with a release-class flag.
- Where does the kick-off prompt text land — repo `AGENTS.md`
  workflow section, or is session-start Start B sufficient as-is?
  Lean: Start B + a short AGENTS.md "this repo is self-hosted"
  section.
- Lint the adopted memory files or keep the `user_crud/` exclusion?
  Lean: lint them (Hub precedent); keep excluding only transcripts
  and evaluations.
