# PROCESS-TPL — PROCESS.md slot / ADR closure protocol

> **Status:** Later / minor · **decision needed** (template vs absorb).
> **Grades:** Impact **Med-High** (complex projects) · Difficulty
> **Medium** · Risk **Low** · OpΔ **Low**.
> **Release class:** minor.
> **Case study:** §3.7, §6 R9.

## Intent

The Hub's most sophisticated process assets live in a file pm-skills
doesn't know about. Every complex project will reinvent it. Give it a
first-class home — either an optional `PROCESS.md` root template, or
absorb its portable parts (ADR closure protocol, spike timeboxing,
definitions of done) into existing framework docs.

## Done when

The decision is recorded; if "template": an optional root-template
`PROCESS.md` ships with CUSTOMISE sections + init wiring + a read-tier
note; if "absorb": the ADR-closure protocol and definition-of-done
land in framework docs and GUIDE explains when a project should write
its own process doc.

## Evidence (banked — do not re-research)

- **What the Hub invented** (PROCESS.md, ratified 2026-05-03, v0.2):
  three macro phases with demonstrable boundaries; per-task rhythm (now
  superseded by task.md — the stale half); **ADR closure protocol** (§4:
  spike ≤1 session → `## Decision (date)` section, demote *Current
  thinking* to a dated note → decision-log link → SPEC update → sweep
  working assumptions); trivial-vs-non-trivial criteria (§3.4–3.5:
  always 4-stage for SPEC/ADR/event/data-model/scripts/deps);
  definitions of done per task/milestone/phase (§5); demo-gate cadence +
  timeboxed spikes (§6); risk watch list (§7); process anti-patterns
  (§8); roles (§9); memory-placement table (§10).
- **It earned its keep:** §3.5 forced the doc-first sequencing of the
  MOD-1 invariant override; §4 closed ADR-001/009 cleanly (2026-05-03)
  and ADR-003 (2026-05-28); the anti-patterns section predicted the
  monolith failure mode ("'It's just a small change' is how 1600-line
  monoliths happen").
- **It also rotted where it duplicated the framework:** §1.3 ADR table
  frozen at 2026-05-03 needed a "historical snapshot" disclaimer; §11
  "recommended next session" went a year stale and was replaced by a
  backlog pointer (two housekeeping passes, 2026-05-19). Lesson: the
  template must hold only what the framework does NOT (phases, ADR
  protocol, DoD) and point at backlog/task.md for the rest.
- **Read-load cost:** the Hub added PROCESS.md to the hot whole-file
  tier (~3,700 words every session) — a template should mark most of it
  conditional/warm.
- ADRs themselves are project-invented too (`spec/adr` with *Current
  thinking* → *Decision* structure, 15 files) — the protocol is the
  portable part; the framework need not ship an ADR template to bless
  the practice.

## Approach (both options sketched for the decision)

**Option A — optional root template `PROCESS.md`:** CUSTOMISE sections
for: macro phases + phase DoD; ADR/decision closure protocol (the Hub
§4 text, generalised); always-4-stage triggers (project-specific list
extending task.md's prohibitions); demo/spike cadence; risk watch list.
Explicit non-content: anything task.md/backlog already owns. Init Step
gains an optional populate item ("complex multi-phase project? populate
PROCESS.md"); read tier = reference doc, **conditional** not hot
(learning from the Hub's cost). MANIFEST: `root-template`.

**Option B — absorb, no new file:** ADR closure protocol becomes a
GUIDE section + a `decision-log.md` template comment ("projects with
formal ADRs: close via spike → Decision section → log link → doc
sweep"); DoD-per-phase folded into init-mvp's milestone language;
GUIDE gets "when to write your own PROCESS.md" guidance. Cheaper, less
discoverable.

Recommendation at grading time: **A**, because the Hub's §4/§5/§7 had
no natural home in any existing file and Option B scatters them.

## Constraints

- Whatever ships must not duplicate task.md/backlog content (the rot
  evidence above) — pointers only.
- Optional: init must treat it as skippable without nag for simple
  projects.
- If A: upgrade handling is the standard 3-way root-template merge;
  section renames must be avoided once shipped (merge cost).

## Files touched (framework)

Option A: new root `PROCESS.md` template + `pm_skills/MANIFEST.md`
row + `init.md` step + `AGENTS.md` read-tier mention + GUIDE.
Option B: `pm_skills/GUIDE.md`, `pm_skills/project/decision-log.md`
comments, `init-mvp.md`.

## Open questions

- The decision itself (A vs B) — present both at a design-options gate.
- If A: does the risk-watch-list section earn its place, or is it
  wish-list-adjacent scope creep? Lean keep — it is cheap and the Hub's
  §7 predicted two real risks (venue LAN, helper form-factor).
