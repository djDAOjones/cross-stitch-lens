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
- Keep the CI pins from rotting: CI-01 pinned five actions to commit SHAs, which is safe but static — a scheduled Dependabot `github-actions` config (or a monthly job) would open the bump PR instead of relying on someone remembering the DEV-INFRASTRUCTURE procedure. Cheap; the risk it removes is a security patch we never notice (from: BATCH-E0, D209).
- The file-map generator maps untracked files, and `scripts/check-docs.mjs` then fails in every clean checkout: `pm_skills/scaffold/gen-file-map.mjs` discovers `git ls-files --others --exclude-standard`, so a local-only Codex hooks file got a mapped line and reddened CI twice while the local gate stayed green — once from the map, once from the wish-list note describing it, because the PATHS check reads any backticked path-shaped code span. Including uncommitted files is deliberate (map a file before committing it), but nothing warns that mapping one you never intend to commit is a gate trap. Options: have the generator mark untracked entries, or have the checker name the cause. Framework-class change (from: BATCH-E0 CI, D209).
- Pinned actions are aging out of their runtime: `actions/checkout`, `setup-node` and `cache` at v4 target Node 20, which the runner now force-upgrades to Node 24 with a deprecation annotation on every run. Predates CI-01 (v4 resolved to these SHAs already); v7/v7/v6 are current. A major bump is a behaviour change, so it wants its own commit per the DEV-INFRASTRUCTURE procedure (from: BATCH-E0 CI, D209).
