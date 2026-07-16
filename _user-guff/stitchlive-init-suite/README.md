# StitchLive — PM-Skills init source suite

Source documents for initialising the cross-stitch design app as a
PM-Skills project. Generated 2026-07-16 from the combined
requirements spec plus the platform/performance decisions made during
planning.

## Contents

```
README.md                        ← this file
docs/
  requirements.md                ← full combined requirements spec (reference, verbatim)
  init-answers.md                ← answers to the spec's §26 key questions
pm_skills-seeds/                 ← drop into pm_skills/project/ during init
  brief.md
  architecture.md
  conventions.md
  backlog.md
  decision-log.md
  wish-list.md
rulebook-seeds/                  ← merge into the root rulebook templates
  AGENTS-additions.md
  DEV-INFRASTRUCTURE-seed.md
  UI-STANDARDS-additions.md
```

(`trajectory.md` and `file-map.md` start empty — the framework
populates them as work ships.)

## How to use

1. Create the project repo; copy `pm_skills/` and the three rulebook
   templates from PM-Skills as usual.
2. Copy this suite into the repo root (e.g. as `init-input/`) and
   copy `docs/requirements.md` to the project's `docs/`.
3. In Windsurf, start the init:

   > Run pm_skills/init.md in agent mode. Use the documents in
   > init-input/ as the source of truth: seed each project memory
   > file from its counterpart in init-input/pm_skills-seeds/, merge
   > init-input/rulebook-seeds/ into the rulebook templates, and take
   > interview answers from init-input/docs/init-answers.md. Ask me
   > only about items marked (provisional).

4. Review its drafts, then kick off with:

   > My task: Milestone M0 from the backlog.

## Two things to supply during init

- **Thread palette spreadsheet** — the hex/name/number data for the
  first preset palette (backlog M1 uses a placeholder until then).
- **Project name** — "StitchLive" is a working title used throughout;
  a rename during init is a find-and-replace, do it then or never.

## Design intent (one paragraph for the agent)

Speed comes from architecture first, exotic tech second: resize to
the stitch grid before any per-pixel work, LUT-based palette
matching, all processing in a Worker, zero-copy buffer transfers.
The TypeScript reference implementation of every stage is permanent
ground truth; Rust→WASM (error diffusion) and WebGPU (parallel
stages) are drop-in backends added in M5 only where the profiler
says the TS path misses budget. The previous prototype
(Photoshop-Live-Ditherer) failed on exactly these points — see
decision-log D2/D3 before proposing a Photoshop plugin or
document-scale processing.
