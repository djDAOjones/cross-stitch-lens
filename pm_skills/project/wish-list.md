# Wish-list

<!-- Capture inbox for unscoped ideas. Append one line; no structure required. -->
<!-- Cold tier. Agents NEVER auto-read this file. Read it only during an
     explicit triage pass — the next-batch pick (session-start.md Start B),
     or end-of-task.md / memory-maintenance.md when the size check flags
     it. See AGENTS.md → "Before every task". -->
<!-- Boundary: this is PRE-triage — raw, unjudged ideas. The backlog Icebox
     is POST-triage — ideas already judged worth keeping. Promote items INTO
     backlog.md (Current, Next, or Icebox); never treat this as a second backlog. -->
<!-- Triage = promote or cut. Promoting MOVES the item into backlog.md. Cutting
     DELETES the line. No history is kept here — survivors live in the backlog. -->
<!-- Format: one plain bullet per idea, optionally a source. Append at the
     bottom; triage from the top. Example:
     - Idea in one line — (from: 2026-05-30 task) -->
<!-- Soft cap ~25 open items. Over budget → end-of-task flags it and
     memory-maintenance.md (Prune) runs a forced triage pass (not an
     archive). See pm_skills/memory-policy.md. -->

Raw parked ideas. Triage into backlog.md or cut. Section numbers
refer to `docs/requirements.md`.

<!-- Triaged 2026-08-23 (D197): every line promoted or cut — the spec
     §25 parking lot goes back to being docs/requirements.md §25's
     alone. Append new ideas below this comment. -->
- Tone-aware candidate pruning: tone mode skips the Lab candidate table (full scan per pixel under dither); extend the exclusion proof to the scaled/curved space if a large-palette tone design ever feels slow.
- Ramp track click-to-move: tapping the ramp between handles could move the nearest cut there; today only the handles drag.
- Adjustments under a large capture region: the adjust stage is source-resolution work at ~86 ms/MP in the worker, ~5× the resize, so an adjusted 4 MP surface misses ≥ 4 updates/s while a w1280 one holds ~7–8; if it is felt, the answers are draft-quality participation or CAPTURE-OMT-01's off-main-thread grab, not a second pass at the maths (from: ADJUST-01, D202).
- Index-guard cost in the hot loops: dropping the `?? 0` reads in the adjust loop measured ~12 % under `noUncheckedIndexedAccess`; if the engine ever needs it, decide the idiom once across dither/tone/adjust rather than one loop at a time (from: ADJUST-01, D202).
