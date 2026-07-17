# MULTI-WRITER — Parallel-session / multi-machine hardening

> **Status:** Wave 4, second (promoted from Later/minor at the
> 2026-07-16 evening triage; evidence-raised, see below). Ships before
> Wave 5 — self-hosting needs the provenance discipline in place.
> **Grades:** Impact **Medium** · Difficulty **Med-High** · Risk
> **Medium** · OpΔ **Medium**.
> **Release class:** minor.
> **Case study:** §2.4, §3.4, §6 R12.

## Intent

The one-writer rule (memory-policy) names the constraint but gives
parallel and multi-machine work no mechanism. The Hub proved both
happen routinely — codify the coordination patterns that worked and
close the gaps that didn't.

## Done when

A documented parallel-session protocol exists (claim declaration +
collision-safe memory writes) and a multi-machine rule ("git is the
sync channel, never the filesystem") with a defined arrival procedure
for second-machine work.

## Evidence (banked — do not re-research)

*Parallel sessions (same machine) — what worked, undocumented:*

- 2026-05-29 NAV-3/NAV-2: session cross-referenced live `git status`
  against the in-flight DEP-2 footprint to pick "a collision-free
  sandbox"; memory edits made "surgically (own lines only) in the
  window while DEP-2 was between writes".
- 2026-06-01 (peak: 9+ entries, ≥3 concurrent sessions): every entry
  carries a "Parallel-session note: disjoint from …" paragraph; staging
  discipline "staged only my own files (no `git add -A`)"; a BUG-3
  entry "appeared mid-session" in the shared decision-log without
  conflict.
- 2026-06-04 CP-1a: "applied over the live tree — the full green suite
  confirms coexistence".
- The one collision: BIND-1b's redeploy "briefly blocked by an
  unrelated in-flight LINKS-2 build break (`links/main.ts` mid-swap) —
  surfaced to the maintainer, who finished it".

*Multi-machine — what hurt:*

- ROOT-ARTIST (2026-07-05): code "synced from the second machine"
  via commit `b871d2f` — the good path (git carried it).
- HELPER-LINKS (2026-07-08): "parallel-session work that arrived via
  OneDrive sync; verified coherent … and green under the full gate" —
  the bad path (filesystem carried it; coherence was luck plus a
  manual audit).
- The OneDrive incident record (see tickets/ENV-PREFLIGHT.md) is
  largely multi-machine sync fallout.
- Existing rule text: memory-policy "One writer at a time … only one
  may perform end-of-task memory updates; the others report their
  updates for the next serial close"; the Prune verify step treats a
  concurrent edit as stop-and-report. Named, but no mechanism.

## Approach

1. **Claim declaration (lightweight, no lockfiles):** a parallel
   session's first act is to state its intended file set in chat AND
   check `git status` for in-flight edits (the NAV-3 pattern, made a
   step). Optional: a `sessions/.claims` scratch line (`<date> <topic>
   <paths>`) written at start, cleared at close — advisory, not a lock;
   gitignored.
2. **Memory-write discipline for secondaries:** the non-primary session
   defers end-of-task memory writes and instead emits its updates as a
   block the primary (or the next serial close / MEM-MAINT Reconcile)
   applies — turning memory-policy's sentence into a concrete handoff
   format.
3. **Staging rule:** never `git add -A` while parallel (the Hub's
   learned rule) — stage explicit paths only.
4. **Multi-machine rule (one paragraph, DEV-INFRA or GUIDE):** work
   crosses machines as commits/branches, never as file-sync; a
   second-machine arrival is treated like external code — verify
   coherent + run the gate before folding (the HELPER-LINKS audit,
   productised as a 3-step check).
5. Cross-refs: ENV-PREFLIGHT detects the filesystem symptoms;
   MEM-MAINT Reconcile is the natural place secondary updates land.

## Constraints

- Advisory coordination only — no lockfiles that can strand a session
  (a crashed session must never block the next one).
- The claim scratch must be gitignored and self-expiring in practice
  (stale claims are ignorable noise, stated as such).
- Keep it out of the hot read path: one paragraph in the workflow docs,
  not a new always-read contract section.

## Files touched (framework)

`pm_skills/memory-policy.md` (rule → mechanism pointer),
`pm_skills/prompts/session-start.md` (claim step, one bullet),
`pm_skills/prompts/end-of-task.md` (secondary-session handoff block),
`pm_skills/GUIDE.md` / `DEV-INFRASTRUCTURE.md` template (multi-machine
paragraph). MANIFEST unchanged.

## Evidence upgrade — 2026-07-16 self-hosting burst (this repo, same day)

- During the 3.9.0→3.10.0 window, two chats overlapped on this repo and
  the user switched model mid-stream. The redo session found
  uncommitted REFACTOR-MODE work of unknown provenance, **misattributed
  it to the user** ("you'd manually implemented most of it"), and
  closed the release on that premise. Outcome was correct only because
  it re-verified every artefact against the ticket. Transcript:
  `_transcripts/2026-07-16-SPIKE-and-REFACTOR-MODE-redo.md`; parallel
  session: `_transcripts/2026-07-16-REFACTOR-MODE.md`. Full analysis:
  `evaluations/2026-07-16-recent-dev-review.md` W1.
- New requirement for the Approach: **provenance rule** — a session must
  state the provenance of any uncommitted changes it finds (which
  session/machine/human made them, or "unknown") before building on
  them; "unknown" downgrades them to external code (verify + gate
  before folding, the HELPER-LINKS pattern in step 4).
- Priority effect: raised from evidence-months-old to
  evidence-same-repo-same-day. Pick early.

## Open questions

- Is `.claims` worth it, or is chat-declared + git-status-checked
  enough (it was, on the Hub, ~15 times)? Lean: document the manual
  pattern first; add the scratch file only if a real collision recurs.
- Interaction with tools that run truly concurrent agents on one
  worktree — out of scope; note as a known limitation.
