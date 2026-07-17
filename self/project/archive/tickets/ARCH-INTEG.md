# ARCH-INTEG — Archive-integrity check in Diagnose

<!-- cspell:ignore ngrok -->

> **Status:** Later / minor.
> **Grades:** Impact **Medium** · Difficulty **Low** · Risk **Low** ·
> OpΔ **None**.
> **Release class:** patch (one new Diagnose check + Prune note).
> **Case study:** §3.5, §6 R7.

## Intent

The append-only doctrine has no integrity check: content can vanish
from the live log + archives while trajectory still points at it, and
nothing notices. Add a cheap referential check to Diagnose so silent
loss is caught at the next health pass.

## Done when

Diagnose verifies that (a) every `see decision-log YYYY-MM-DD` /
"decision-log YYYY-MM-DD" reference in `trajectory.md` (live + archive
chunks' headers) resolves to an entry dated that day in the live log or
an archive whose INDEX range covers it; (b) INDEX ranges have no gaps
against the dated references found; FAIL lists the orphaned dates with
a git-recovery hint.

## Evidence (banked — do not re-research)

- **The incident:** the four 2026-06-23/24 decision entries (Stage
  epic STAGE-2/3, DEP-9 named tunnel, DEP-10 landing page) were
  dropped by Hub commit `15dfabe` (2026-07-04, "upgrade framework v3 +
  revert DEP-9/DEP-10/ngrok hub changes") and exist in **no archive**;
  `trajectory-0003/0004` still say "See decision-log 2026-06-23"; the
  archive INDEX presents complete coverage (05-02→07-05 ranges) with
  an invisible 06-20→07-03 hole. Recovery:
  `git show 2dbbb52:pm_skills/project/decision-log.md` (4 entries
  present at that commit).
- Whether the drop was intended (revert semantics) or collateral is an
  open maintainer question (case study §9) — either way, *nothing
  flagged it* across three subsequent prunes and a Diagnose pass.
- Existing Diagnose checks are adjacent but blind to this: check 4
  (file-map paths exist on disk) and check 6 (INDEX rows resolve to
  real files) verify *files*, not *content coverage*.

## Approach

1. **New Diagnose check** (after archive-hygiene check 6):
   - harvest dated references: `grep -oE 'decision-log
     2026-[0-9-]+' trajectory.md archive/trajectory/*.md | sort -u`;
   - harvest coverage: dates in the live log's `## YYYY-MM-DD`
     headings + each archive's INDEX date range;
   - set-difference → FAIL rows: "referenced 2026-06-23 — not in live
     log or any archive range; recover via git history
     (`git log -S '## 2026-06-23' -- <decision-log path>`)".
2. **Prune note (P5):** after a split, re-run the reference check on
   the touched files (cheap re-verification that the split didn't
   orphan a pointer).
3. **Repair guidance, not repair:** Diagnose proposes restoring the
   entries into a dated archive file (append-only: a new archive chunk
   with a provenance header "restored from `<sha>`") — applies only with
   approval, consistent with Diagnose-never-edits.

## Constraints

- Shell-only (grep/sort/comm); single pass; bounded to the trajectory +
  INDEX surface — do not grep the whole repo.
- Date-level granularity is enough (entry-level would need parsing
  headlines; the failure mode is whole-day slices vanishing with
  reverts/prunes).
- False positives from prose mentioning a date without being a pointer:
  anchor the harvest pattern to the established cross-ref phrasings
  ("see decision-log", "decision-log YYYY-MM-DD") and accept a small
  miss rate — WARN wording says "unresolved reference", not "data
  loss".

## Files touched (framework)

`pm_skills/prompts/memory-maintenance.md` (Diagnose check + P5 note).
MANIFEST unchanged.

## Open questions

- Also check the reverse (archive entries never referenced)? No —
  unreferenced history is fine; the doctrine protects existence, not
  citation.
- Hub remediation when this lands: restore the four entries from
  `2dbbb52` into `archive/decision-log-2026-06-23-to-2026-06-24.md`
  with a provenance header, update INDEX — propose to maintainer
  (pairs with the §9 open question about intent).
