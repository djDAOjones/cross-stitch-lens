# Changelog

Append-only record of pm-skills framework releases. Newest entry at
the top. Never rewrite a published entry.

This file is the **upgrade instruction set**. Each release lists what
changed and, critically, an **Upgrade actions** block: the mechanical
steps an agent applies to move a project from the previous version to
this one. The upgrade procedure (`prompts/upgrade.md`) reads the
entries between a project's current `VERSION` and the latest, and
executes their Upgrade actions in order — oldest first.

Versioning is semver-style for a docs framework:

- **major** — structural or breaking change that needs a migration
  (renamed/removed files, restructured templates, changed memory
  contracts).
- **minor** — new file or capability, backward compatible (a new
  prompt, integration, or template section).
- **patch** — wording, clarification, or fix with no new files and no
  migration.

Maintainers: every framework change must bump `pm_skills/VERSION` and
add an entry here. See `prompts/release.md`.

---

## 3.17.1 — 2026-07-16

ARCH-INTEG: the append-only doctrine had no integrity check — content
could vanish from the decision-log + archives while `trajectory.md`
still pointed at it, and nothing noticed (a real incident: four
2026-06-23/24 entries dropped by a revert, referenced but present in no
archive, unflagged across three prunes and a Diagnose pass). Adds a
cheap referential check to Diagnose so silent loss surfaces at the next
health pass. Patch: one new Diagnose check + a Prune note, no new files,
no migration.

### Changed

- `pm_skills/prompts/memory-maintenance.md` — Diagnose gains check 7,
  **Archive referential integrity**, inserted after archive-hygiene
  check 6 (the two content-adjacent checks): it harvests dated
  `decision-log YYYY-MM(-DD)` pointers from `trajectory.md` and its
  archive chunks, harvests coverage from the live log's `## YYYY-MM-DD`
  headings plus each archive INDEX date range, and FAILs on any
  referenced date covered by neither — with a git-recovery hint and a
  propose-restore (never auto-edit) action. The former checks 7–12
  (Version drift, ADR status, Orphan ticket files, Unreconciled lite
  closes, Doc-delta ledger health, Ageing standing items) renumber to
  8–13. Prune P5 (Verify) gains a note to re-run this check after a
  `decision-log.md` / `trajectory.md` split.

### Upgrade actions

- `memory-maintenance.md` is `framework` — overwrite wholesale with the
  new version after the Step 4 customisation check. No project-memory,
  MANIFEST, or root-template change; no migration. Diagnose check
  numbers shifted (7 is now Archive referential integrity; 8–13 are the
  former 7–12) — update any local notes that cite a check by number.

## 3.17.0 — 2026-07-16

ITEM-AGE: standing human-owned work no longer ages invisibly. The
framework already keeps `[maintainer]`/`[sign-off]`/`[blocked]` items
*visible*, but visibility without age decays into wallpaper (the Hub
left a leaked API key tracked-but-unrotated for ~7 weeks). This surfaces
age at the moment a human is already choosing what to do — the Start B
pick — adds a new `[security]` flag for live exposure that banners at
every session start until closed, and gives Diagnose a matching check.
Informational only: age never reorders the queue. Minor.

### Added

- `pm_skills/prompts/session-start.md` — a **Security banner (both
  starts)** section: any open `[security]` item prints one banner line
  at the top of every session, on Start A and Start B alike, until it is
  closed (one line maximum — a wall of nags gets ignored). Start B's
  "Present the pick" output gains item 7, **Ageing standing items**: up
  to the 3 oldest `[maintainer]`/`[sign-off]`/`[blocked]` items with
  their age, computed from each item's date (`since <date>` fallback
  when shell date arithmetic is unavailable).
- `pm_skills/prompts/memory-maintenance.md` — Diagnose gains check 12,
  **Ageing standing items**: WARN on items past the age threshold or on
  any open `[security]` item; action is maintainer review.
- `pm_skills/memory-policy.md` — a **Standing-item age** row (WARN at
  30 days); it is a visibility nudge, not a size budget, and never
  auto-escalates an item's position.

### Changed

- `pm_skills/project/backlog.md` — ticket-grammar comment (the canonical
  copy) documents the `[maintainer]` and `[security]` flags and the
  convention that standing items carry their creation date
  (`YYYY-MM-DD`). `[security]` is reserved for live exposure (a leaked
  credential or open auth hole; nothing weaker) and a leaked-credential
  tracking item is flagged `[security]` on creation.
- `pm_skills/GUIDE.md` — the "Pick" section notes that the pick surfaces
  standing-item age and that a `[security]` item banners every session.

### Upgrade actions

- `session-start.md`, `memory-maintenance.md`, `memory-policy.md`, and
  `GUIDE.md` are `framework` — overwrite wholesale with the new
  versions after the Step 4 customisation check.
- `pm_skills/project/backlog.md` is `project-memory` (never overwritten):
  add the new flags and the standing-item date convention to your own
  ticket-grammar comment by hand — copy the `[maintainer]`/`[security]`
  flag lines and the "Standing items … carry their creation date"
  paragraph from the template. Then, going forward, put a creation date
  on new standing (`[maintainer]`/`[sign-off]`/`[blocked]`) items so
  Start B can age them, and flag any live-exposure item `[security]`.
- No migration of existing items is required; undated standing items
  simply show no age until you add a date. No MANIFEST or root-template
  change.

## 3.16.0 — 2026-07-16

NEXT-CMD: the proven `/next` loop ships as a distributed workflow —
one word picks the next backlog item, builds it auto-jazz, and closes
it. Composes existing pieces (Start B + task.md + end-of-task.md); no
new mechanism, backward compatible.

### Added

- `pm_skills/integrations/next.md` — one-word "run the next backlog
  item" trigger. Runs `session-start.md` → Start B to pick, then
  `task.md` auto-jazz to build, then `end-of-task.md` to close; the
  invocation is the go-ahead (no stop-for-confirm) and it ships one
  item per invocation. Guardrails preserved: `[sign-off]` items
  escalate to `full` mode, wish-list triage and the reconcile gate
  still run, and the `task.md` hard prohibitions still stop-and-ask.
  Inherits the `framework` class (`integrations/*`).

### Changed

- `pm_skills/GUIDE.md` — `integrations/` file tree lists `next.md`;
  the "Pick" section documents the one-word trigger and its
  guardrails.
- `README.md` — commands table gains a "Run next" row.

### Upgrade actions

- Copy `pm_skills/integrations/next.md` into the project. If your AI
  tool uses a workflow directory, also copy it there (alongside the
  other `integrations/*` files). No migration; no project-memory or
  root-template change.

## 3.15.3 — 2026-07-16

REPO-REVIEW: fixes from a full source-tree review. One code defect and
one doc clarification; no new files, no migration.

### Changed

- `pm_skills/scaffold/gen-file-map.mjs` — idempotence fix: the role
  parser read the generated `<!-- file-map-index -->` block's section
  lines (`` - `dir` — N file(s) ``) as path roles, so every re-run over
  an existing map flagged each section name under "No longer on disk".
  The index block is now excluded from role parsing; running the
  generator twice with no tree change again produces no diff, as its
  header promises.
- `pm_skills/GUIDE.md` — the scaffold file tree now notes that
  `gen-file-map.mjs` runs in place from `scaffold/` (copy it out only
  to customise), matching the file's own header and init.md Step 9,
  which copies the other scaffold files but not this one.

### Upgrade actions

- `pm_skills/GUIDE.md` — pick up via the normal `prompts/upgrade.md`
  diff; no per-project change to apply.
- `pm_skills/scaffold/gen-file-map.mjs` — the `scaffold` class is never
  overwritten by upgrade. **Manual action if you use the generator:**
  running it in place from `pm_skills/scaffold/`, replace that file with
  the new version; running a copied-out fork, port the fix (exclude the
  `<!-- file-map-index -->` block before parsing existing roles). A map
  already carrying a spurious "No longer on disk" block from this bug:
  delete the spurious directory-name lines once, then regenerate.

---

## 3.15.2 — 2026-07-16

REVIEW-FIXES: hygiene from the first review pass over the self-hosted
releases (3.15.0–3.15.1). Prose correction only; no behaviour change.

### Changed

- `pm_skills/CHANGELOG.md` — the 3.15.1 entry pointed two closed
  findings at a repo-specific decision-log path that means nothing to
  consuming projects (distributed files never reference source-only
  paths). Reworded to repo-neutral prose; that entry's Upgrade
  actions are untouched.

### Upgrade actions

- None. Changelog prose correction only; nothing to apply.

---

## 3.15.1 — 2026-07-16

ADOPT-FIXES: fixes from adopt.md's first real run (the SELF-HOST
dogfood). One distributed change plus two findings closed as
record-why-not.

### Changed

- `pm_skills/integrations/adopt.md` — Step 0 gains a **framework
  source tree** exception: a `pm_skills/VERSION` that belongs to the
  product itself (a clone/fork of the framework, root templates still
  carrying placeholders, no populated `pm_skills/project/*`) is not a
  prior deployment and must not route to `upgrade.md`. Prevents the
  confusing misroute anyone self-hosting a framework fork would hit.

Findings closed without a change (recorded in the framework
repository's own decision log): the `gen-file-map.mjs` `IGNORE` knob
worked as designed (copy-it-out path), and the `pm_skills/project/`
memory-home assumption is a repo-contract concern, not a prompt
change.

### Upgrade actions

- No file copies. One edit to an existing framework file
  (`pm_skills/integrations/adopt.md`) — pick it up via the normal
  `prompts/upgrade.md` diff. No per-project change to apply.

---

## 3.15.0 — 2026-07-16

CODEBASE-AUDIT: an invocable whole-codebase audit path. Composes the
existing review machinery into an outer loop instead of leaving the
"review the whole repo" habit in the maintainer's head. New `GUIDE.md`
subsection "Auditing the whole codebase" (under "The daily loop", after
"After an autonomous run"): the recipe — enumerate chunks from
`file-map.md` sections (directory-grouped, budget-aware), review each
chunk via `review.md` feature-area mode (findings-only, bounded
per-chunk read cost, resumable across sessions), aggregate into one
severity-tagged report stored cold, then triage into backlog/wish-list
with structural items spun out as `refactor`-mode tasks — never edited
inline. Adopt-tier repos with no generated file map chunk by top-level
directory; a dedicated `audit.md` is deferred until real use shows the
recipe under-specifies. New `prompts/review.md` "Whole-repo audit (all
sections)" note in Inputs: review.md is the per-chunk engine the recipe
calls; run it once per section, don't pass one oversized area. Chunking
is the point — a single unbounded pass is the anti-pattern the
sectional file map fixed. No new files; MANIFEST unchanged. Minor.

### Upgrade actions

- No file copies. Two edits to existing framework files
  (`pm_skills/GUIDE.md`, `pm_skills/prompts/review.md`) — pick them up
  via the normal `prompts/upgrade.md` diff. No per-project change to
  apply; the recipe is available from the next review/audit session.

---

## 3.14.1 — 2026-07-16

MODEL-TIER: model-tier guidance (Wave 4 tail). Guidance-only, no
mechanism — tells users which work is safe on a cheaper/faster model and
which wants the stronger tier. New `GUIDE.md` paragraph in "Looking
after project memory": memory maintenance is mostly mechanical (counts,
greps, `tail`/`diff` verification, log harvesting) and that half runs
cheap; judgement steps (scoping, design options, validation, review, any
**propose** step) and multi-step protocol closes (release + end-of-task
checklists) want the stronger tier — protocol adherence and judgement
degrade first on cheap models. The split is per-*step*, not per-session.
New scoping line in `prompts/memory-maintenance.md`'s shared-rules
header: the mechanical halves (every count, Diagnose's greps, Prune
P1/P4/P5 detect/execute/verify, Reconcile's log harvesting) run cheap;
the propose steps (Prune P2, Refactor R3, Reconcile RE3) and any
judgement call want the stronger tier — per-step, cross-referencing the
GUIDE. Evidence: the 2026-07-16 self-hosting burst directly tracked
session quality to model tier — the weak-model SPIKE session skipped the
preflight note and release consistency check, never re-ran the gate, and
introduced the burst's only semantic defect (evaluations/
2026-07-16-recent-dev-review.md W2). No new files; MANIFEST unchanged.
Patch.

### Upgrade actions

- No file copies. Documentation-only: the guidance applies from the next
  memory-maintenance or release/close on any repo — no per-project
  change to apply.

---

## 3.14.0 — 2026-07-16

MULTI-WRITER: parallel-session and multi-machine hardening. Turns the
`memory-policy.md` "one writer at a time" rule — which named the
constraint but gave parallel/multi-machine work no mechanism — into a
concrete, advisory protocol (no lockfiles; a crashed session must never
block the next one). New `session-start.md` "Parallel-session claim
(skip if solo)" section: a session declares its file set in chat and
checks `git status` before writing, and — the same-repo failure this
framework hit on 2026-07-16 — states the **provenance** of any
uncommitted changes it did not make (which session/machine/human, or
"unknown") before building on them, treating "unknown" as external code
(verify + gate before folding). New `end-of-task.md` "Secondary-session
close (parallel work)" section: the non-primary session runs the gate +
boot check but defers memory writes, emitting a structured `Handoff:`
block the primary (or the next Reconcile) applies — making concrete
memory-policy's "report their updates for the next serial close". New
`GUIDE.md` "Parallel and multi-machine work" subsection: git is the sync
channel, never the filesystem; the arrival procedure; the
single-worktree concurrency limitation. `task.md` step 11 staged-set
echo gains the "stage explicit paths only, never `git add -A` while
parallel" caveat. `memory-policy.md` one-writer rule now points at all
three mechanism homes. Advisory-only (no `.claims` lockfile — the
manual chat + `git status` pattern worked ~15 times on the Hub; add a
scratch file only if a real collision recurs). No new files; MANIFEST
unchanged. Minor.

### Upgrade actions

- No file copies. From the next session on a repo where parallel or
  multi-machine work happens: declare your file set and check
  `git status` at start (`session-start.md` → "Parallel-session
  claim"); if you find uncommitted changes you did not make, state their
  provenance before building on them and treat "unknown" as external
  code. Parallel secondary sessions close via the new
  `end-of-task.md` "Secondary-session close" handoff block instead of
  writing memory. Solo, single-machine projects need do nothing — the
  claim step is skipped when solo.

## 3.13.0 — 2026-07-16

COMMIT-STEP: per-task commit checkpoints in the task workflow. Codifies
the per-ticket commit habit the Digital Art Audience Hub converged on by
trial (per-ticket, ID-titled commits carrying gate results in the body),
so a rollback point and a `git log` verification ledger exist from a
project's first week instead of emerging by trial. Recommend-commit
only — never auto-commit or push. New `integrations/task.md` step 11
"Recommend a commit (checkpoint)": message shape aligned with the
`Close: lite` trailer grammar (`<ITEM-ID>: <summary>` title + what/why +
`Verify:` line); a **staged-set echo** (files about to be committed vs
files the task touched, flagging any omission — the failure mode where a
release commit shipped without its own changelog entry); a shell-safety
one-`-m`-per-line example (the Hub misfired bare ` -m ` chains); a
long-run per-milestone checkpoint note mirroring `init-mvp.md`; and a
non-git skip. `end-of-task.md` step 5 report gains a commit-status line
(`committed` / `staged — commit recommended` / `not staged`). GUIDE
daily-loop "Commit as you close" paragraph. No new files; MANIFEST
unchanged. Minor.

### Upgrade actions

- No file copies. When you next run `integrations/task.md`, its close
  now ends with a recommend-commit step (step 11): after the gate is
  green and memory is written, the agent stages the change set, echoes
  the staged files against the files touched, and proposes a commit with
  the `<ITEM-ID>: <summary>` + `Verify:` message shape — it does not
  auto-commit or push. Adopt the message shape for your project's
  commits so lite and full closes read the same in `git log`.

## 3.12.1 — 2026-07-16

Consistency fixes from a same-day review of the 3.2.0–3.12.0 burst
(eleven releases in one sitting). No new capability; five cross-file
inconsistencies the burst left behind. Patch.

### Fixed

- **Spike close mode** (`integrations/task.md`) — the spike section said
  "close `lite` by default", contradicting step 10's "never default to
  lite" and, worse, breaking Reconcile: a spike writes its findings
  decision-log entry and resolves its backlog item at close, so a
  `Close: lite` trailer would later hand Reconcile an item it cannot
  evict (RE4 lossless-check mismatch). A spike now closes **full with a
  reduced surface** — the findings entry and backlog resolution are the
  memory writes; trajectory/file-map are skipped because throwaway code
  does not ship. Never lite.
- **Generator path** — `scaffold/gen-file-map.mjs` resolved from no
  project root (the file ships at `pm_skills/scaffold/`). All operative
  references now use the full path: `AGENTS.md` (read tiers),
  `prompts/session-start.md`, `prompts/end-of-task.md` (the `node`
  command), `memory-policy.md`, the `project/file-map.md` template
  comments, and the generator's own usage lines and emitted header/index
  text.
- **Scaffold class on upgrade** (`prompts/upgrade.md` Step 3) — "never
  touched on upgrade; skip" made the 3.5.0 upgrade action ("copy
  `gen-file-map.mjs` into the project") a dead letter. The rule now
  reads: never overwrite an existing copy, but a **new** scaffold file
  named by a changelog entry's Upgrade actions is copied in once.
- **Mode-list drift** — `prompts/session-start.md` Start B's
  recommended-mode line gains `refactor` (3.10.0 omission);
  `init.md` Step 11's mode list gains `spike` and `refactor`
  (3.9.0/3.10.0 omissions).

### Upgrade actions

- Overwrite the `framework` files: `pm_skills/integrations/task.md`,
  `pm_skills/prompts/session-start.md`, `pm_skills/prompts/end-of-task.md`,
  `pm_skills/prompts/upgrade.md`, `pm_skills/memory-policy.md`,
  `pm_skills/init.md`, and `pm_skills/scaffold/gen-file-map.mjs`*
  (*scaffold-class: overwrite only if the project has not customised its
  copy — the change is comment/emitted text only).
- `AGENTS.md` is `root-template` (3-way merge): in the hot-sectional
  `file-map.md` bullet, correct the generator path to
  `pm_skills/scaffold/gen-file-map.mjs`.
- `pm_skills/project/file-map.md` is `project-memory` — not overwritten.
  Optionally correct the generator path in its header comments by hand,
  or let the next generator run refresh the index line.
- No new files, no `MANIFEST.md` change, no migration. Projects that
  never used spike mode or the generator are unaffected.

## 3.12.0 — 2026-07-16

Adds a **protected-doc sync loop**. Protected docs (SPEC, ADRs, and kin)
are correctly edit-on-request only, but nothing scheduled their
reconciliation, so flagged deltas accumulated silently (the Hub's DOC-1
ticket ballooned to 13 KB — 4× the ticket soft cap — with per-file edit
lists deferred for weeks). This gives the debt a **ledger**, an **age**,
and a **batched sign-off pass**. A new cold-tier
`pm_skills/project/doc-deltas.md` captures one line per delta at task
close; session start surfaces the open count + oldest age; a 5th
`Doc-sync` verb in `memory-maintenance.md` presents each doc's batched
diff for sign-off, applies approved edits, and ticks the lines; Diagnose
gains a ledger-health check. The ledger is **capture-only** (the DOC-1
lesson — the edit is derived fresh from the source at sync time, never
stored) and nothing auto-edits a protected doc. Implements DOC-SYNC
(Wave 3). Minor.

### Added

- `pm_skills/project/doc-deltas.md` — new `project-memory` (cold-tier)
  ledger template: capture-only, one checkbox line per delta, mirrors the
  wish-list template's capture/triage-boundary comments.

### Changed

- `pm_skills/prompts/memory-maintenance.md` — new **Doc-sync** verb
  (DS1–DS6 + rules); intro now lists five verbs; Diagnose gains check 11
  (doc-delta ledger health); Prune P2 gains a `doc-deltas.md` handling
  line (delete `[x]` lines, propose Doc-sync for open overrun);
  frontmatter description updated.
- `pm_skills/prompts/end-of-task.md` — step 3 gains a `doc-deltas.md`
  capture bullet; size-check full sweep counts open deltas; overrun
  action proposes Doc-sync.
- `pm_skills/prompts/session-start.md` — Start B surfaces
  `doc-deltas: N open, oldest DATE` (nudge, not gate); cold-tier
  reference list gains the ledger.
- `pm_skills/prompts/review.md` — the feature-area protected-doc
  currency check now also appends a one-line delta to the ledger.
- `pm_skills/memory-policy.md` — new budget row: `doc-deltas.md` open
  deltas (10 open **or** oldest 30 days).
- `pm_skills/MANIFEST.md` — `pm_skills/project/doc-deltas.md` →
  `project-memory` row.
- `AGENTS.md` (root template) — cold-tier bullet for `doc-deltas.md`.
- `pm_skills/GUIDE.md` — file tree, memory-update table, and the
  maintenance-verbs list (now five) document the ledger and Doc-sync.

### Upgrade actions

- Adopt the updated `pm_skills/prompts/memory-maintenance.md`,
  `end-of-task.md`, `session-start.md`, `review.md`,
  `pm_skills/memory-policy.md`, `pm_skills/MANIFEST.md`, and
  `pm_skills/GUIDE.md` (all `framework` — distributed via existing
  globs). Projects that customised any of these should re-apply the
  doc-sync additions.
- **New `project-memory` file:** create
  `pm_skills/project/doc-deltas.md` from the source template (upgrade
  Step 8 "new project-memory file → create from template, skip if
  exists"). There is nothing to preserve; it starts empty.
- Merge the `AGENTS.md` cold-tier `doc-deltas.md` bullet into the
  project's `AGENTS.md` (root-template 3-way merge, Step 7).
- **Optional migration** — a project that has been tracking protected-doc
  drift in an ad-hoc ticket (the Hub's `tickets/DOC-1.md`) can fold its
  per-doc flags into `doc-deltas.md` as one capture line each, then
  delete the ticket. One-time, Reconcile-style; do it only if the ledger
  is a better home than the existing ticket.

## 3.11.0 — 2026-07-16

Extends `review.md` to accept a **feature area** as its review scope, not
just a diff range. Give it a name plus its IDs (epic letter, ticket IDs)
and/or entry-point files; the Load step assembles the change set with
`git log --grep='<ID>'` per ID, unions the touched files, and pulls the
matching `trajectory.md` / `decision-log.md` entries — stating the
assembled commit list and file set before auditing so the scope is
explicit and correctable. This is the natural review unit once batches
ship gateless and lite-closed. Everything downstream (scope adherence,
contract audit, risk, verdict) runs unchanged; the intent map groups by
ticket ID. Feature-area reviews add one protected-doc currency check
(does the doc still describe this area's current behaviour?) as a
punch-list flag. Cross-referenced from `memory-maintenance.md` Reconcile:
a reconciled batch is a ready-made area to review. Based on the Hub's
improvised Wave-6 "concept-alignment audit". Implements REVIEW-AREA
(Wave 3). Minor.

### Changed

- `pm_skills/prompts/review.md` — Inputs gains a feature-area shape
  (name + IDs/entry points, one area per run, refuse areas that don't map
  to greppable IDs or named files);
  Load step documents change-set assembly and mandates an assembled-scope
  statement before auditing; intent map groups by ticket ID for area
  reviews; contract audit gains a protected-doc currency check.
- `pm_skills/prompts/memory-maintenance.md` — Reconcile RE6 suggests a
  feature-area review of the reconciled batch (propose, don't run).
- `pm_skills/GUIDE.md` — `review.md` file-tree line notes "or feature
  area"; "After an autonomous run" section documents the feature-area
  input.

### Upgrade actions

- Adopt the updated `pm_skills/prompts/review.md`,
  `pm_skills/prompts/memory-maintenance.md`, and `pm_skills/GUIDE.md`.
  No new files, no memory-contract change, no MANIFEST change —
  distributed via existing globs. Projects that customised `review.md`
  should re-apply the feature-area Inputs/Load additions.

## 3.10.0 — 2026-07-16

Adds **refactor mode** to `task.md` — a behaviour-preserving
restructuring mode whose acceptance criterion is fixed: **observable
behaviour unchanged**. It gates like `checkpoint` (scope approves the
declared surface, option approves the restructuring shape) and lifts the
">5 files not in scope" hard prohibition **within the declared surface
only**. Carries a named preservation contract (tests green before and
after, no event/data-model/API/route delta, an explicit
preserved-interface list re-verified by grep, build-artefact sanity) and
a green-`check` baseline precondition. Based on three Hub refactors
(HELP-9, MOD-2, LINKS-2) that each had to improvise this contract
through generic modes. The `refactor` mode (code/structure) is distinct
from the `Refactor` verb in `memory-maintenance.md` (project memory).
Implements REFACTOR-MODE (Wave 3). Minor.

### Changed

- `pm_skills/integrations/task.md` — new `refactor` row in the mode
  table; mode-inference paragraph maps "refactor this" / "restructure
  without changing behaviour" → refactor mode; the >5-file prohibition
  notes the in-surface lift; new "Refactor mode" section (declared
  surface, baseline precondition, preservation-contract checklist,
  constraints, memory Refactor-verb disambiguation); frontmatter mode
  list updated.
- `pm_skills/prompts/validation.md` — generic pointer: in `refactor`
  mode, also run the task.md preservation contract. Prompt stays
  mode-agnostic; the checklist lives in task.md.
- `pm_skills/GUIDE.md` — mode table and `task.md` file-tree listing gain
  the `refactor` row; one-line disambiguation from the memory Refactor
  verb.

### Upgrade actions

1. Replace `pm_skills/integrations/task.md` with the new version (adds
   the `refactor` mode row, inference, in-surface prohibition lift, and
   the "Refactor mode" section).
2. In `pm_skills/prompts/validation.md`, add the `refactor`-mode pointer
   bullet to the Rules block.
3. In `pm_skills/GUIDE.md`, add the `refactor` row to the mode table and
   the `task.md` file-tree line, plus the one-line disambiguation.
4. No new files. MANIFEST unchanged.

---

## 3.9.0 — 2026-07-16

Adds **spike mode** to `task.md` — a timeboxed exploratory mode where
findings are the deliverable and code is throwaway. Use it when a
backlog item carries the `[spike]` flag or you say "spike this". One
session, one question; the spike delivers a decision-log entry (and
optionally a `spec/<topic>-findings.md`), then resolves or replaces the
item with concrete follow-up tickets. Closes `lite` by default. Based
on two Hub precedents (REC-VERIFY, NET-1) that had to bend task.md to
do what spike mode now documents directly. Implements SPIKE (Wave 3).
Minor.

### Changed

- `pm_skills/integrations/task.md` — new `spike` row in the mode table;
  new "Spike mode" section (contract, deliverables, constraints, steps);
  mode-inference paragraph now maps `[spike]` → spike mode; frontmatter
  updated.
- `pm_skills/prompts/session-start.md` — Start B "Recommended mode"
  line now lists `spike` and recommends it for `[spike]`-flagged items.
- `pm_skills/project/backlog.md` — ticket grammar comment annotates
  `[spike]` with its mode mapping (`→ spike mode in task.md`) and
  `[sign-off]` with `→ full mode` for parity.
- `pm_skills/GUIDE.md` — mode table gains the `spike` row; file-tree
  listing for `task.md` includes spike in the mode list.

### Upgrade actions

1. Replace `pm_skills/integrations/task.md` with the new version.
2. In `pm_skills/prompts/session-start.md`, update the "Recommended
   mode" line (item 4 under "Present the pick") to include `spike` and
   the `[spike]`-flag recommendation.
3. In `pm_skills/project/backlog.md`, update the ticket-grammar comment
   to annotate `[spike]` with `→ spike mode in task.md`.
4. No new files. MANIFEST unchanged.

---

## 3.8.0 — 2026-07-16

Adds a **security baseline** as the fifth tiered build/run/ship
capability, joining runtime recovery (2.3.0), self-explaining runtime
(2.4.0), quality gate (2.6.0), and version identity (3.1.0). Expressed
the same way — an `AGENTS.md` hard rule whose implementation scales by
tier plus a populated `DEV-INFRASTRUCTURE.md` section — and it carries
the piece the Hub incident proved matters most: a **rotation-first
leaked-credential response playbook**. The Hub left a real API key
unrotated for ~7 weeks with a standing tracking item that did nothing;
tracking is not remediation, rotation is. Implements SEC-BASE (Wave 3).
Minor.

### Changed

- `AGENTS.md` (root template) — new **Security baseline** hard rule
  (secrets outside the repo; never in URLs, logs, QR codes, or the
  diagnostics bundle; committed template values are placeholders;
  dependency advisories triaged on a cadence and at upgrade;
  rotate-first on a leak), tiered like the other four capabilities and
  cross-referencing the diagnostics-redaction rule rather than
  restating it. Matching anti-pattern bullet added.
- `DEV-INFRASTRUCTURE.md` (root template) — new **Security baseline**
  section after "Quality gate": Tier 0–2 shape (secret storage, `.env`
  workflow, `.gitignore` coverage, a report-only key-shape scan folded
  into `check`, dependency-audit cadence) plus the rotation-first
  response playbook.
- `pm_skills/init.md` — Step 8 populate list gains a "Security baseline"
  item (renumbered 7–14); a Step 10 readiness checkbox; and an
  "Appendix B — Security baseline example" (Tier 1 worked shape).
- `pm_skills/prompts/deploy.md` — the pre-flight "Secrets are external"
  check now points at the Security baseline section and its
  rotation-first playbook.
- `pm_skills/prompts/scoping.md` — new secret-surface flag (mirrors the
  runtime / diagnostics / quality-gate flags).
- `pm_skills/prompts/validation.md` — new "Secret surface" check
  (inserted as item 6; test-plan/edge/signs renumbered 7–9).

### Upgrade actions

- `AGENTS.md` and `DEV-INFRASTRUCTURE.md` are `root-template` (3-way
  merge): add the new **Security baseline** hard rule + anti-pattern
  bullet, and the new **Security baseline** section (after "Quality
  gate"), preserving every populated section verbatim. A project that
  already documents secrets handling folds it under this heading.
- `pm_skills/init.md`, `pm_skills/prompts/deploy.md`,
  `pm_skills/prompts/scoping.md`, and `pm_skills/prompts/validation.md`
  are `framework`: overwrite wholesale after the Step 4 customisation
  check.
- No `MANIFEST.md` change (no new paths; the scaffold secret-compose
  script is deferred to a follow-up — documented pattern only for now).

## 3.7.0 — 2026-07-16

Makes **session transcripts** a first-class (but cold, gitignored)
artefact. Framework evaluations, retrospectives, and prompt-tuning now
have observable session evidence instead of inference — the 2026-07-16
Hub case study was blind to May–June because no transcripts existed for
those months. Documents a convention only; no scripts, no new prompt
file, tool-dependent export stays a habit not a mechanism. Implements
TRANSCRIPTS (Wave 2). Minor.

### Added

- `pm_skills/GUIDE.md` — "Saving session transcripts" section: the
  `_transcripts/` convention (folder at project root, naming
  `YYYY-MM-DD-<ITEM-ID-or-topic>.md`, cold tier, gitignored by default,
  redact-before-commit rule cross-referencing the diagnostics redaction
  invariant, and a retrospective-evaluation pointer).
- `pm_skills/scaffold/.gitignore` — ignores `_transcripts/` by default,
  so transcripts stay local unless deliberately committed after a
  redaction pass.

### Changed

- `AGENTS.md` (root template) — new cold-tier bullet for
  `_transcripts/*.md` (never auto-read; points at the GUIDE section).
- `pm_skills/prompts/end-of-task.md` — the closing report gains one
  non-blocking reminder to save the conversation to `_transcripts/`
  (redact before committing). Never gates the close.

### Upgrade actions

- `AGENTS.md` is `root-template` (3-way merge): add the `_transcripts/*.md`
  cold-tier bullet under "Cold — never auto-read", after the
  `tickets/<ITEM-ID>.md` bullet, preserving all populated sections.
- `pm_skills/GUIDE.md` and `pm_skills/prompts/end-of-task.md` are
  `framework`: overwrite wholesale after the Step 4 customisation check.
- `pm_skills/scaffold/.gitignore` is `scaffold` (never touched on
  upgrade): the project owns its copy. Optionally add `_transcripts/`
  to the project's own root `.gitignore` to adopt the convention — not
  required, and no effect until a `_transcripts/` folder is created.
- No `MANIFEST.md` change (no new paths; all touched files already
  classed).

## 3.6.0 — 2026-07-16

Adds an **adoption path** for projects that already have code.
`init.md` interviews for a new project and `init-mvp.md` builds one
from an idea; neither covers arriving with a mature or half-built
repository. `integrations/adopt.md` reverse-engineers project memory
from the source tree and git history, then interviews only for the gaps
the repo cannot fill — the retrofit the Hub proved by hand, now a
first-class workflow. Implements ADOPT (Wave 2). Minor.

### Added

- `pm_skills/integrations/adopt.md` — retrofit workflow (`framework`
  class, inherited from `integrations/*`). Step 0 detects prior
  pm-skills and routes to `upgrade.md`; Phase 1 is a read-only inventory
  (file-map via `gen-file-map.mjs`, stack from manifests, trajectory
  seed from `git log`, brief that links existing docs, conventions by
  sampling) with a per-directory read-cost cap; Phase 2 is a single
  gap interview (~8 questions, batched) writing the memory files with a
  single seed decision-log entry and `(reverse-engineered — verify)`
  markers; Phase 3 runs `init.md` Step 10 readiness and hands off to
  `session-start.md` → Start B. Adopt-only (no build band). Proposes,
  never overwrites; degrades without git history.

### Changed

- `pm_skills/init.md` — new "Arriving with an existing codebase?"
  pointer to `adopt.md` in the agent-mode intro.
- `pm_skills/GUIDE.md` — `adopt.md` added to the `integrations/` file
  tree; "Existing codebase, no pm-skills yet" entry under "Starting a
  project".
- `README.md` — existing-codebase entry point after the init-mvp block;
  `adopt.md` row in the commands table.

### Upgrade actions

- Copy `pm_skills/integrations/adopt.md` into the project (new
  `framework` file; no migration).
- No project-memory changes. `MANIFEST.md` unchanged — `adopt.md` is
  covered by the `pm_skills/integrations/*` glob (inherits `framework`).
- If your tool uses workflow files, copy `adopt.md` into your workflow
  directory alongside the other `integrations/*` files.

## 3.5.0 — 2026-07-16

Makes `file-map.md` — the biggest per-task hot-read line-item and the
highest-maintenance memory file — a **generated skeleton read
sectionally**. A dependency-free script owns the mechanical bookkeeping
(the path list, grouped by directory) so the agent writes only the
judgement (each file's role), and the hot read drops from whole-file to
an index block plus the sections the task touches. Implements FILEMAP-GEN
(Wave 1); mirrors the headings-first decision-log read 3.0.0 proved.

### Added

- `pm_skills/scaffold/gen-file-map.mjs` — dependency-free Node generator
  (`scaffold` class). Discovers source files via `git ls-files` (honours
  `.gitignore`, no full-tree walk), groups them by top-level directory
  into `## <dir>` sections (root files under `## (root)`), and merges
  role text **by path**: an existing role is preserved verbatim, a new
  file gets `(role needed)`, and a path no longer on disk is flagged
  under a "No longer on disk" block, never silently dropped. Emits a
  `<!-- file-map-index -->` block (per-section counts + total) so the
  sectional read is cheap and the BUDGET-SCALE budget can read the file
  count from it. Idempotent and stably sorted; `--stdout` prints without
  writing; a target path arg overrides the default; an `IGNORE` knob at
  the top of the file is the documented tuning point.

### Changed

- `AGENTS.md` — `file-map.md` moves from **hot whole-file** to **hot
  sectional**: read the `<!-- file-map-index -->` block plus the sections
  whose directory the task touches; read whole-file only for
  cross-cutting work (renames, conventions, upgrades). It remains
  accreting and budgeted.
- `pm_skills/prompts/session-start.md` — the quick-reference read list
  mirrors the new tier (file-map under hot sectional).
- `pm_skills/prompts/end-of-task.md` — the file-map update step offers
  `node scaffold/gen-file-map.mjs` for adds/renames/deletes, leaving only
  `(role needed)` lines and flagged stale paths to resolve by hand.
- `pm_skills/project/file-map.md` (template) — comments describe the
  index + section + generator convention; carries the
  `<!-- file-map-index -->` anchor. Existing populated maps are untouched
  (project-memory class); projects adopt by running the generator once.
- `pm_skills/memory-policy.md` — the derived file-map budget may read the
  file count straight from the generated index block.
- `pm_skills/GUIDE.md` — scaffold tree lists the generator; the read-tier
  summary and folder listing reflect the sectional file map.

### Upgrade actions

- Copy `pm_skills/scaffold/gen-file-map.mjs` into the project. It is
  `scaffold` class: copied once, then project-owned — never force-upgraded
  (covered by the existing `pm_skills/scaffold/*` glob; no `MANIFEST.md`
  change).
- Overwrite the `framework` files after the Step 4 customisation check:
  `GUIDE.md`, `memory-policy.md`, `prompts/session-start.md`,
  `prompts/end-of-task.md`.
- `AGENTS.md` is `root-template`: 3-way merge the "Before every task"
  read tiers — move `file-map.md` out of hot whole-file into the hot
  sectional group with the index-plus-sections instruction, preserving
  any project-specific customisations.
- `pm_skills/project/file-map.md` is `project-memory` — **not**
  overwritten. To adopt the generated skeleton, run
  `node scaffold/gen-file-map.mjs` once (it preserves existing role text
  and adds the index block) and tune the `IGNORE` list. Optional: an
  existing hand-maintained map still reads correctly whole-file.
- No data migration.

## 3.4.0 — 2026-07-16

Makes the two remaining **fixed** memory budgets **scale-aware**, so a
project that succeeds never carries a permanently-red alarm that trains
agent and maintainer to ignore the size check — the exact pathology
2.1.0 removed for the hot-set cap, recreated at the file level. Numbers
still live only in `memory-policy.md`; the prompts point, never restate.

- **`file-map.md` budget = f(file count).** The fixed 2,000-word budget
  becomes **~35 words × mapped files, floor 2,000**, re-derived each
  check from the mapped-file count
  (``grep -cE '^- `' file-map.md``). A ~180-file map now budgets ~6,300
  words: its stripped current-role floor reads **green**, while accreted
  history (task tags, dates, test counts) still trips it. The budget
  measures **noise, not size**. The coefficient (~35) is tunable per
  project; the check prints the derivation (`180 × 35 = 6,300`) so a red
  result is self-explaining. New "Deriving the file-map budget" section
  documents the arithmetic.
- **`decision-log.md`: per-entry runaway guard replaces the file-level
  word budget.** The ~6,000-word file guard tripped on healthy
  accumulated density (many tight entries) rather than the bloat it was
  meant to catch. Entry count (20) stays the primary trigger; the
  secondary guard is now **any single entry > ~600 words** — a
  runaway-entry detector, which is what the word budget was actually
  for.

Minor: memory-policy change, backward compatible. No files added,
renamed, or removed; no `MANIFEST.md` change; no memory-contract or data
migration. Backlog Active and `trajectory.md` budgets are unchanged
(both stayed satisfiable in practice) — this is not a general loosening.

### Changed

- `pm_skills/memory-policy.md` — file-map row now `~35 words × mapped
  files, floor 2,000`; decision-log row's `~6,000 words` secondary guard
  replaced by `any single entry > ~600 words`; new "Deriving the
  file-map budget" section; age-row wording aligned to "per-entry".
- `pm_skills/prompts/end-of-task.md` — full-sweep size check: file-map
  budget described as derived (print the derivation); decision-log
  checks entry count + per-entry guard, not file words.
- `pm_skills/prompts/memory-maintenance.md` — Diagnose budget check and
  Prune P1/P2 aligned to the derived file-map budget and per-entry
  decision-log guard.

### Upgrade actions

- Apply this version's edits to the four files above in any project that
  has customised copies. All are wording/number changes inside existing
  sections — no structural migration.
- If a consuming project's `file-map.md` sat over the old 2,000-word
  budget as an "accepted floor" (a large codebase), re-derive its budget
  (`mapped files × ~35`, floor 2,000): a healthy stripped map should now
  read green. Only re-run a Prune if it is still over the derived budget
  (i.e. carries genuine accreted history).
- If a project tuned its file-map density away from ~35 words/file,
  record its coefficient in `conventions.md` (or a `file-map.md`
  comment) and derive against that.
- No `VERSION`-gated data or file moves; a project already on 3.3.0
  needs only the text edits.

## 3.3.0 — 2026-07-16

Adds an **environment & sync-conflict preflight** plus a **sync-repair
playbook** — the framework's memory model assumes a sane filesystem, and
cloud-sync folders (OneDrive, Dropbox, Google Drive, iCloud) break that
assumption by silently reverting tracked files mid-session and spawning
conflict copies. Generalises a heavy consuming project's seven-plus
recorded OneDrive incidents (including a `.git` divergence and repeated
mid-task stale-reverts) into a standing, repeatable procedure.

One canonical block, referenced not restated:

- **Environment preflight (shared)** (`memory-maintenance.md`) — three
  dependency-free shell checks (cloud-sync path match, hostname-derived
  conflict-artefact scan, git-sanity/HEAD check), a classification +
  repair playbook (byte-identical-to-HEAD → delete; HEAD + live edits →
  restore over the stale file; worktree superset → keep and re-stage;
  uncertain → stop and show diffs), and a one-line-per-repair record
  rule. Never auto-deletes a conflict copy without byte-verification.
- **Severity by caller** — session start runs it **warn-only** (a daily
  blocker gets disabled); Prune (P3) and Upgrade (Step 5) run it
  **blocking** before they move files.
- **Standing advice with teeth** — an AGENTS hard rule marks
  cloud-synced repo paths unsupported for project memory, and the
  session-start preflight repeats the warning every session so the
  advice cannot silently lapse.

Minor: new capability, backward compatible. No files added, renamed, or
removed; no `MANIFEST.md` change; no memory-contract or data migration.
Projects on a non-synced path are effectively unaffected (the preflight
is a fast no-op).

### Added

- `pm_skills/prompts/memory-maintenance.md` — an **Environment preflight
  (shared)** section (E1 detect / E2 classify + repair playbook / E3
  record, plus severity and standing-advice notes), positioned before
  the four verbs.

### Changed

- `pm_skills/prompts/session-start.md` — a new **Environment preflight
  (warn-only)** section running the E1 checks at session start.
- `pm_skills/prompts/memory-maintenance.md` — Prune **P3** now runs the
  preflight as a blocking gate before backup.
- `pm_skills/prompts/upgrade.md` — **Step 5** now runs the preflight as
  a blocking gate before backup.
- `AGENTS.md` (root template) — a new **Hostile-filesystem guard** hard
  rule under "Hard rules (invariants)".
- `pm_skills/GUIDE.md` — a Quick-answers entry on cloud-synced repo
  paths pointing at the preflight and repair playbook.

### Upgrade actions

- Overwrite the four `framework` files
  (`pm_skills/prompts/memory-maintenance.md`,
  `pm_skills/prompts/session-start.md`, `pm_skills/prompts/upgrade.md`,
  `pm_skills/GUIDE.md`) with the source versions (Step 4 customisation
  check applies — surface any local edits before overwriting).
- `AGENTS.md` is a `root-template`: 3-way merge (Step 7). Add the
  **Hostile-filesystem guard** bullet as the last item under "Hard rules
  (invariants)", preserving every populated section verbatim. If the
  project already added the bullet, skip.
- No new files, no `MANIFEST.md` change, no project-memory migration.

## 3.2.0 — 2026-07-16

Adds a **sanctioned lite close + Reconcile verb** — a cheap close-out
for burst development that defers project-memory writes without ever
bypassing them. Formalises the ad-hoc "source of truth = commits, not
the backlog" bypass observed in a heavy consuming project (~200 shipped
items) into a first-class, lossless loop.

Two moving parts:

- **`Close: lite`** (`end-of-task.md`) — a close mode where the quality
  gate and runtime-boot checks still run, but the memory updates and
  size check are deferred and the task is recorded as a structured
  commit trailer (`Item:` / `Outcome:` / `Decision:` / `Verify:` /
  `Close: lite`). The trailer grammar is defined in exactly one place
  (`end-of-task.md`) because Reconcile parses it as data. Forbidden for
  `[sign-off]` items and `full`-mode runs — their rationale is the
  record.
- **Reconcile** (`memory-maintenance.md`, the 4th verb beside
  Diagnose / Prune / Refactor) — reads `Close: lite` trailers from
  `git log` since the last reconcile marker, evicts each backlog item,
  adds one trajectory line per item, and appends ONE consolidated
  decision-log entry naming every folded item plus a `Reconcile marker:`
  SHA. A lossless ID check (trailer IDs = evicted backlog IDs + new
  trajectory IDs) refuses to write partial memory; unparseable commits
  go to manual triage, never a guess. Never auto-run — proposed like
  Prune.

Session start now counts unreconciled lite closes and enforces a hard
cap (`memory-policy.md`: 5 closes or oldest 7 days) that makes a
reconcile mandatory before the next-batch pick, so deferral can't become
a memory hole. Diagnose gains a matching check.

Minor: new capability, backward compatible. No files renamed or
removed; no `MANIFEST.md` change; no memory-contract or data migration.
Projects that never use lite closes are unaffected.

### Added

- `pm_skills/prompts/end-of-task.md` — a **Close mode: full or lite**
  section defining the canonical `Close: lite` commit-trailer grammar
  and the lite prohibitions; steps 3–4 note the lite path defers memory
  writes and the size check; step 5 reports "lite close — reconcile
  pending".
- `pm_skills/prompts/memory-maintenance.md` — the **Reconcile** verb
  (RE1 find window → RE2 parse trailers → RE3 propose → RE4 lossless
  check → RE5 apply → RE6 verify + Reconcile rules), plus Diagnose
  check 10 (unreconciled lite closes) and a four-verb intro.
- `pm_skills/prompts/session-start.md` — a **Check for unreconciled
  lite closes** section (count + oldest date at session start) and a
  Start B gate that blocks the next-batch pick past the cap.
- `pm_skills/memory-policy.md` — an **Unreconciled `Close: lite`
  closes** budget row (5 closes / 7 days) — the single home for the cap
  numbers.

### Changed

- `pm_skills/integrations/task.md` — step 10 gains `close: lite|full`
  inference (lite only if the user asks; never the default; forbidden
  for `[sign-off]` / `full`).
- `AGENTS.md` (`root-template`) — one Workflow pointer line (item 4) to
  the lite close + Reconcile loop.
- `pm_skills/GUIDE.md` — a "Closing lite (for burst work)" note in the
  daily loop; Reconcile added to the memory-maintenance verb list (now
  four); the prompts file-tree description updated.

### Upgrade actions

- Replace the `framework` files with their new versions after the
  Step 4 customisation check: `pm_skills/prompts/end-of-task.md`,
  `pm_skills/prompts/memory-maintenance.md`,
  `pm_skills/prompts/session-start.md`, `pm_skills/memory-policy.md`,
  `pm_skills/integrations/task.md`, `pm_skills/GUIDE.md`.
- `AGENTS.md` is `root-template`: 3-way merge — add the new Workflow
  item 4 (lite close + Reconcile pointer), preserving every populated
  section verbatim.
- No `MANIFEST.md` change (no new/removed/renamed paths). No
  project-memory migration. Existing full closes are unchanged; lite is
  opt-in per task.

---

## 3.1.1 — 2026-07-04

Clarifies the upgrade source flow so agents suggest the public PM-Skills
GitHub repository as the first port of call, while preserving local
checkouts, forks, and pasted files as accepted sources.

### Changed

- `pm_skills/prompts/upgrade.md` — Step 0 now names
  `https://github.com/djDAOjones/PM-Skills.git` as the first source to
  suggest when the user has not provided one, with local checkouts,
  alternate Git URLs, and pasted files still supported.
- `pm_skills/GUIDE.md` — upgrade guidance mirrors the default source
  wording.

### Upgrade actions

- Replace `pm_skills/prompts/upgrade.md` and `pm_skills/GUIDE.md` with
  the new versions after the Step 4 customisation check.
- No root-template merges, `MANIFEST.md` changes, or project-memory
  migrations.

---

## 3.1.0 — 2026-07-04

Adds **Traceable version identity** — the framework's first opinion on
how a *consuming project* names and traces its releases, and the fourth
build/run/ship capability alongside *One-command runtime recovery*
(2.3.0), *Self-explaining runtime* (2.4.0), and *One-command quality
gate* (2.6.0). The framework already demanded version-stamped,
commit-mapped, rollback-ready deploys (`deploy.md`) but never defined
what a version *is*: `DEV-INFRASTRUCTURE.md` → Version management was an
empty placeholder, the only example (`init.md`) taught an unrelated
`major.minor.build` scheme, and the diagnostics bundle referenced an
undefined "app version / build".

This release fills the hole with a two-part identity, expressed the same
way as the other three capabilities — a hard rule whose implementation
scales by tier:

- **Product version** — the release name, `vMAJOR.MINOR.PATCH`
  (SemVer-shaped, `v`-prefixed). MAJOR = product era / breaking
  data-or-workflow change / real users now depend on it; MINOR = a
  shipped milestone or feature batch; PATCH = fix, polish, copy. Start at
  `v0.1.0`; reserve `v1.0.0` for "users can trust it". Answers "what
  release is this?".
- **Build identity** — the trace, `vMAJOR.MINOR.PATCH+YYYYMMDD.shortsha`
  (SemVer build metadata pinning the exact commit). Answers "exactly what
  code is live?".

Git tags use the product version; multiple deploys of one product
version are told apart by build identity; production exposes both in the
diagnostics bundle (`appVersion` / `buildId`, ideally `commit`). It is
deliberately identity-only — not Git Flow, branch naming, PR rules, or
Conventional Commits. The framework's own version (`pm_skills/VERSION` +
`release.md`) is unchanged and separate; `deploy.md` already states that
boundary.

Minor: a new `AGENTS.md` hard rule and anti-pattern, a populated
`DEV-INFRASTRUCTURE.md` template section, and sharpened `deploy.md` /
`init.md` wiring. Backward compatible — no files renamed or removed, no
`MANIFEST.md` change, no memory-contract change, no data migration.

### Added

- `AGENTS.md` (`root-template`) — hard rule **Traceable version
  identity** (two-part identity, tag = product version, expose both,
  tiered) plus a matching anti-pattern rejecting untraceable builds and
  collapsing the release name into the build trace.

### Changed

- `DEV-INFRASTRUCTURE.md` (`root-template`) — the **Version management**
  section replaces its bare placeholder with the two-part default policy,
  its sources / injection / exposure mechanics, and the Tier 0–2 shape,
  cross-referencing the new hard rule and the diagnostics bundle. The
  **Maintainer diagnostics** INCLUDE list names `product version + build
  identity` and `commit` explicitly.
- `pm_skills/init.md` — Step 8 item 8 (**Version management**) points at
  the two-part identity; Appendix B's **Version management example**
  replaces `major.minor.build` with the product-version + build-identity
  table; the Tier 1 diagnostics example copies the build id; Step 10
  readiness gains a version-identity checkbox; the never-hand-edit
  examples label `version.json` as the generated build identity.
- `pm_skills/prompts/deploy.md` — step 2 **Version stamped** sets the
  product version and derives/tags the build identity per
  `DEV-INFRASTRUCTURE.md`; step 3 notes the produced build identity;
  step 4 **Version match** checks the live `buildId` against this
  deploy's commit; step 6 records both in `trajectory.md`.

### Upgrade actions

- `AGENTS.md` (`root-template`, 3-way merge — preserve every populated
  section verbatim): add the **Traceable version identity** hard rule
  after *One-command quality gate*, and the matching bullet in
  *Anti-patterns to reject*.
- `DEV-INFRASTRUCTURE.md` (`root-template`, 3-way merge): take the new
  **Version management** guidance (if the project already populated that
  section, keep its content and reconcile it against the new default
  shape); add `product version + build identity` / `commit` to the
  **Maintainer diagnostics** INCLUDE list.
- Replace these `framework` files wholesale (after the Step 4
  customisation check): `pm_skills/init.md`, `pm_skills/prompts/deploy.md`.
- Adopt the invariant in practice: define the product version + build
  identity in `DEV-INFRASTRUCTURE.md` → Version management (or record
  that it is deliberately deferred for a pre-deploy MVP). If the project
  still documents a `major.minor.build` scheme, migrate it to the
  two-part identity.
- No new or removed paths; `MANIFEST.md` unchanged. No data migration.

---

## 3.0.0 — 2026-07-03

The **token-efficiency and consolidation release**: cuts the fixed
per-task meta-cost (fewer approval round-trips, a lighter always-loaded
contract, less over-fetching) and shrinks the framework surface from 48
distributed files to 36 — without weakening any guardrail. It lands the
conclusions of an external review of the framework repo. The review's
key finding: the framework's dominant historical bug class was
cross-file drift between near-identical files (see 2.4.1, 2.7.1,
2.7.2); consolidation deletes that class at source.

**1. One task workflow with gating modes.** The former `feature.md`,
`auto-jazz.md`, and `auto-jazz-lite.md` (plus a short-lived
`checkpoint.md` draft) merge into `integrations/task.md` — one
skeleton, four modes: `full` (4 gates, for `[sign-off]`/high-risk),
**`checkpoint` (2 gates — scope approval and design pick — the new
default)**, `auto-jazz` (0 gates), `auto-jazz-lite` (0 gates,
compressed). The old names survive as spoken modes. One canonical
hard-prohibition list, a small-task escape hatch to the quick path,
and a resume-insurance rule (persist approved scope + picked option to
the item's ticket file when work will span sessions).

**2. One memory-maintenance workflow with verbs.** `doctor-memory.md`,
`prune-memory.md`, and `roadmap-refactor.md` merge into
`prompts/memory-maintenance.md` — **Diagnose / Prune / Refactor** as
sections of one file; run only the verb asked for. The wrapper
integrations (`integrations/prune-memory.md`, `integrations/upgrade.md`)
are deleted; `prompts/upgrade.md` and `memory-maintenance.md` carry
workflow frontmatter and are consumed directly.

**3. One session entry point.** `next-batch.md` and `corrections.md`
merge into `prompts/session-start.md`: Start A (you name the task),
Start B (the agent picks the next batch, with the wish-list triage),
and the drift-correction snippets.

**4. One greenfield workflow.** `spec-to-prod.md` merges into
`integrations/init-mvp.md` as **scope bands**: Band 0 (local MVP — the
default, the old init-mvp behaviour), Band 1 (deployed MVP), Band 2
(deployed Current milestone), Band 3 (full backlog to production).
`integrations/init-project.md` merges into `pm_skills/init.md` via an
"Agent mode" preamble — one init document for both the manual and
agent-driven paths, ending the documented mirror-drift between them.

**5. `memory-policy.md` (new framework file).** The memory size budget
table and overrun actions move out of the always-loaded `AGENTS.md`
into `pm_skills/memory-policy.md`, read only at task close. `AGENTS.md`
keeps the read tiers and a summary pointer — the per-turn constant
drops by roughly a third. Also adds the end-of-task size-check **fast
path** (≤ 2 memory files touched → count only those) and a
**one-writer rule** for parallel agent sessions.

**6. Leaner reads and outputs.** Decision-log hot read becomes
headings-first (scan the latest 10 headings, open only relevant
bodies). `DEV-INFRASTRUCTURE.md` tier docs now state that its Quality
gate section is a sectional read at task close. Every stage prompt
gains a be-terse output rule ("n/a" where empty). The backlog template
comment becomes the canonical ticket grammar (flags enumerated);
`release.md` gains a changed-vs-named coverage check on its verify
step.

Major: files are renamed/merged and the `AGENTS.md` root template is
restructured — but there is **no project-memory data migration**; all
`project/` content is untouched.

### Added

- `pm_skills/integrations/task.md` (`framework`) — the task workflow;
  modes `full` / `checkpoint` (default) / `auto-jazz` /
  `auto-jazz-lite`.
- `pm_skills/prompts/memory-maintenance.md` (`framework`) — Diagnose /
  Prune / Refactor verbs; carries workflow frontmatter.
- `pm_skills/memory-policy.md` (`framework`) — canonical memory
  budgets, overrun actions, size-check fast path, one-writer rule.
  Declared in `MANIFEST.md`.

### Removed

- `pm_skills/integrations/feature.md`, `auto-jazz.md`,
  `auto-jazz-lite.md` → merged into `integrations/task.md` as modes.
- `pm_skills/prompts/doctor-memory.md`, `prune-memory.md`,
  `roadmap-refactor.md` → merged into `prompts/memory-maintenance.md`
  as verbs.
- `pm_skills/prompts/next-batch.md`, `corrections.md` → merged into
  `prompts/session-start.md` (Start B; Drift corrections).
- `pm_skills/integrations/spec-to-prod.md` → merged into
  `integrations/init-mvp.md` as scope Bands 1–3.
- `pm_skills/integrations/init-project.md` → merged into
  `pm_skills/init.md` (Agent mode).
- `pm_skills/integrations/prune-memory.md`,
  `pm_skills/integrations/upgrade.md` — thin wrappers deleted; the
  canonical prompts carry frontmatter and are used directly.

### Changed

- `AGENTS.md` (`root-template`) — "Memory size budgets" collapses to a
  pointer at `pm_skills/memory-policy.md`; decision-log tier read is
  headings-first; the `DEV-INFRASTRUCTURE.md` conditional bullet notes
  the Quality-gate sectional read; Workflow rule 1 points at `task.md`
  with checkpoint as the default mode; wish-list triage and
  document-ownership rows re-point at `session-start.md` Start B and
  `memory-maintenance.md`.
- `pm_skills/prompts/session-start.md` — absorbs Start B (next-batch)
  and the drift corrections; tier quick-ref re-grouped (conditional
  split out; headings-first decision-log; Quality-gate sectional
  note); continuing-a-task points at the item's ticket file.
- `pm_skills/prompts/end-of-task.md` — size check gains the fast path;
  budgets referenced from `memory-policy.md`; maintenance proposals
  point at the `memory-maintenance.md` verbs.
- `pm_skills/prompts/scoping.md`, `design-options.md`,
  `implementation-plan.md`, `validation.md`, `quick-task.md` — be-terse
  output rules.
- `pm_skills/prompts/upgrade.md` — gains workflow frontmatter; intro
  names `memory-policy.md`; the migration pre-flight references the
  Diagnose verb.
- `pm_skills/prompts/review.md` — reviews `task.md` auto-jazz runs and
  `init-mvp` builds; memory-hygiene step cross-references the Diagnose
  verb.
- `pm_skills/prompts/release.md` — step 5 lists `task.md`; step 6
  gains the changed-vs-named coverage check with a matching verify
  snippet.
- `pm_skills/integrations/bugfix.md` — context-load step adopts the
  headings-first decision-log read.
- `pm_skills/integrations/init-mvp.md` — absorbs the scope bands,
  version-control expectation, and deploy phase; foundation steps now
  reference `init.md` agent mode; prohibitions reference the canonical
  `task.md` list.
- `pm_skills/init.md` — gains the Agent mode preamble and workflow
  frontmatter; Step 3 reads the canonical ticket grammar from the
  backlog template; Step 11 lists `task.md` modes; memory-hygiene
  section points at the maintenance verbs.
- `pm_skills/project/*` templates (`project-memory`) — comment-only:
  `brief.md`, `architecture.md`, `conventions.md`, `file-map.md`,
  `trajectory.md`, `wish-list.md`, `backlog.md`, `decision-log.md`
  point budget references at `pm_skills/memory-policy.md` and
  maintenance references at the verbs; `backlog.md`'s ticket-grammar
  comment is marked canonical and gains the full flag list;
  `decision-log.md` notes the headings-first read. Existing populated
  files are unaffected.
- `pm_skills/GUIDE.md` — rewritten novice-first for the consolidated
  shape: plain-language mental model (memory / rulebooks / workflows,
  compress-on-ship, read tiers), the file tree with one-liners, both
  driving styles, starting paths with the scope-band table, the daily
  loop with a mode table and rationale, the manual paste flow, memory
  upkeep, and a quick-answers FAQ.
- `pm_skills/MANIFEST.md` — adds the `pm_skills/memory-policy.md` row.

### Upgrade actions

- Add the new `framework` files: `pm_skills/integrations/task.md`,
  `pm_skills/prompts/memory-maintenance.md`,
  `pm_skills/memory-policy.md`.
- **Delete** (per-file confirmation, per upgrade Step 6) the merged
  files listed under Removed above. Any local customisation found in
  them by the Step 4 check moves to the absorbing file.
- Replace these `framework` files wholesale (after the Step 4
  customisation check): `pm_skills/GUIDE.md`, `pm_skills/init.md`,
  `pm_skills/MANIFEST.md`, `pm_skills/prompts/session-start.md`,
  `pm_skills/prompts/end-of-task.md`, `pm_skills/prompts/scoping.md`,
  `pm_skills/prompts/design-options.md`,
  `pm_skills/prompts/implementation-plan.md`,
  `pm_skills/prompts/validation.md`, `pm_skills/prompts/quick-task.md`,
  `pm_skills/prompts/upgrade.md`, `pm_skills/prompts/review.md`,
  `pm_skills/prompts/release.md`, `pm_skills/integrations/bugfix.md`,
  `pm_skills/integrations/init-mvp.md`.
- `AGENTS.md` (`root-template`, 3-way merge — preserve every populated
  section verbatim): replace the "Memory size budgets" table with the
  new pointer paragraph **only if the project kept the default table**;
  if the project customised budget numbers, move the customised rows
  into its `pm_skills/memory-policy.md` copy first. Take the new
  Workflow rules, tier bullets, wish-list triage pointers, and
  document-ownership rows.
- If your AI tool's workflow directory contains copies of the removed
  workflows, replace them with `task.md` (and optionally
  `prompts/upgrade.md` / `prompts/memory-maintenance.md`, which now
  carry frontmatter).
- `pm_skills/project/*` templates are `project-memory`: no action for
  populated files; the comment-only re-pointing applies to fresh
  projects (optionally update the guidance comments in place — they
  are comments, not content).
- No data migration: no memory content moves.

---

## 2.8.0 — 2026-06-28

Adds **optional per-item detail files** for backlog items. A non-trivial
item can now carry a cold-tier `pm_skills/project/tickets/<ITEM-ID>.md`
holding its research, options explored, acceptance detail, and links —
read **only** when that item is the active task, so the backlog Active
section stays terse and the every-task read load is unchanged. The item's
backlog line marks the file with a new `[detail]` flag.

Working context only: the decision rationale (the "why") still lives only
in `decision-log.md`. The file is deleted when the item ships or is cut,
so the folder never becomes a graveyard — `end-of-task.md` and
`roadmap-refactor.md` evict, `doctor-memory.md` flags orphans.

Minor: new optional capability and a new (lazily-created) memory folder,
backward compatible. Existing projects are unaffected until they opt in.

### Added

- `pm_skills/project/tickets/*` (`project-memory`) — optional per-item
  detail files, created lazily on first use (like `archive/`). Declared
  in `MANIFEST.md`.
- `AGENTS.md` (`root-template`) — a Cold-tier read rule, a budget row
  (soft ~600 words each), and a document-ownership row for ticket files.
- `[detail]` backlog flag — documented in `pm_skills/project/backlog.md`'s
  ticket-grammar comment.

### Changed

- `pm_skills/prompts/scoping.md`, `next-batch.md`, `quick-task.md`,
  `bug-scoping.md` — read the active item's ticket file when it carries
  `[detail]`; scoping persists overflow context into it.
- `pm_skills/prompts/end-of-task.md` — ticket-file lifecycle (fold into
  the log/trajectory, then delete on ship/cut) and an orphan sweep in the
  size check.
- `pm_skills/prompts/roadmap-refactor.md`, `doctor-memory.md` — detect and
  evict orphan ticket files and dangling `[detail]` flags.
- `pm_skills/GUIDE.md`, `pm_skills/prompts/session-start.md` — wire the
  new path into the Cold tier and the keeping-memory-fresh table.
- `pm_skills/init.md`, `pm_skills/integrations/init-project.md` — note
  that `pm_skills/project/tickets/` is lazily created and cold, parallel
  to the existing `archive/` note.

### Upgrade actions

- `AGENTS.md` (`root-template`): on the 3-way merge, take the new
  Cold-tier ticket bullet, the `tickets/<ITEM-ID>.md` budget row, and the
  `project/tickets/` document-ownership row; preserve every populated
  section verbatim.
- `pm_skills/prompts/*`, `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`, `pm_skills/GUIDE.md`,
  `pm_skills/MANIFEST.md` (`framework`): overwritten wholesale after the
  Step 4 customisation check. No project action.
- `pm_skills/project/backlog.md` (`project-memory`): additive only — the
  `[detail]` flag and detail-file convention are added to the
  ticket-grammar comment. No migration; existing items are unaffected;
  adopt the flag when an item needs detail.
- No paths removed. `pm_skills/project/tickets/` is created lazily on
  first use; nothing to create at upgrade.

---

## 2.7.3 — 2026-06-16

Arrow-glyph consistency in distributed-template comments. Three shipped
templates carried ASCII `->` arrows inside their HTML author-guidance
comments, where the framework's house style (set by the 2.5.0 arrow
sweep) is the Unicode `→`. These arrows live only inside `<!-- … -->`
comments, so they never appear in rendered output — this is a pure
source-consistency fix with no behavioural or rendered change.

Only prose `->` is normalised; the `-->` comment terminators that share
those characters are deliberately left intact.

Patch-level: comment wording in existing distributed files. No new
files, no migration, no `MANIFEST.md` change, no memory-contract change.

### Changed

- `DEV-INFRASTRUCTURE.md` (`root-template`) — prose `->` arrows in the
  "Maintainer diagnostics" CUSTOMISE comment normalised to `→`.
- `pm_skills/project/trajectory.md` (`project-memory`) — prose `->`
  arrows in the guidance comments and the example-phase block normalised
  to `→`.
- `pm_skills/project/wish-list.md` (`project-memory`) — prose `->` arrows
  in the guidance comments normalised to `→`.

### Upgrade actions

- `DEV-INFRASTRUCTURE.md` (`root-template`): on the standard 3-way merge,
  take the new comment text. A populated project will have replaced the
  CUSTOMISE comment with real content, so there is typically nothing to
  merge — no action needed.
- `trajectory.md` / `wish-list.md` (`project-memory`): never overwritten
  on upgrade, so existing projects are unaffected; only newly-initialised
  projects pick up the normalised comments. No action needed.
- No `MANIFEST.md` change (no paths added, removed, or reclassified).

---

## 2.7.2 — 2026-06-16

Closes the **quick-path impact-awareness gap**. `quick-task.md` — the
lean single-stage scope-and-plan for small tasks — was the only
scope/plan path with no awareness of the build/run/verify triad
surfaces. A small task that touched a runtime component, an
instrumentable surface, or the quality-gate surface could pass through
the quick path without the contract-doc update that `scoping.md`,
`implementation-plan.md`, and `validation.md` enforce for the full
sequence.

`quick-task.md` now carries one escalation-guard rule: if such an impact
surfaces, stop and escalate to the full `scoping.md` sequence, where the
impact flags and their `DEV-INFRASTRUCTURE.md` / `UI-STANDARDS.md`
obligations live. It escalates rather than echoing those flags inline —
preserving single-source-of-truth and not reopening the duplication
drift class that 2.7.1 just closed.

Resolves the `quick-task.md` impact-flags decision (the QT roadmap
item); the decision predated the quality-gate flag, so the guard covers
all three triad surfaces, not just runtime and diagnostics.

Patch-level: one rule added to an existing `framework` file. No new
files, no migration, no `MANIFEST.md` change, no memory-contract change.

### Changed

- `pm_skills/prompts/quick-task.md` — added an escalation-guard rule:
  if a small task turns out to touch a runtime component, an
  instrumentable surface, or the quality-gate surface, stop and escalate
  to the full `scoping.md` sequence. Output list and other rules
  unchanged.

### Upgrade actions

- Replace this `framework` file wholesale:
  `pm_skills/prompts/quick-task.md`.
- No data migration; no `root-template` or `project-memory` changes;
  `MANIFEST.md` unchanged (no paths added, removed, or reclassified).

---

## 2.7.1 — 2026-06-16

Removes the **stage-output echo drift class** at its source. The
orchestration workflows (`feature.md`, `auto-jazz.md`,
`auto-jazz-lite.md`) inline-echoed each stage prompt's output list in
their matching steps, purely for in-flow readability. Those echoes
duplicated the canonical lists in `scoping.md`, `design-options.md`,
`implementation-plan.md`, `validation.md`, and `quick-task.md`, and
drifted silently — the validation echo went stale in 2.4.1 (dropping the
Runtime and Diagnostics checks), and 2.5.0 could only *guard* it with a
manual `release.md` re-sync reminder.

Each echo step already instructs the agent to read the canonical prompt,
so the inline list was redundant for execution and only a skim aid for a
human — and it was already lossy (the `design-options` echo silently
dropped that prompt's "note anything that should stay unchanged"
output). This release deletes the inline lists and replaces each with a
pointer to the prompt, making each stage prompt the single source of
truth for its own outputs. Drift is now impossible: changing a prompt's
output list requires no workflow edit.

`release.md` step 5 is updated to match — it no longer asks to re-sync
echoes (there are none); it now guards only against a stage prompt being
renamed, added, or removed, which would invalidate a workflow's "Read
`pm_skills/prompts/X.md`" reference.

Patch-level: wording and structure of existing `framework` files only.
No new files, no migration, no `MANIFEST.md` change, no memory-contract
change. All control flow (gates, assumptions, search/present/wait lines)
is unchanged.

### Changed

- `pm_skills/integrations/feature.md` — steps 4–8: the inline
  scoping / design-options / implementation-plan / validation /
  quick-task output lists are replaced with a pointer to the named stage
  prompt. Gate and control-flow lines unchanged.
- `pm_skills/integrations/auto-jazz.md` — steps 3–6: same replacement
  for the four design-stage echoes. Assumption/continue lines unchanged.
- `pm_skills/integrations/auto-jazz-lite.md` — step 3: same replacement
  for the quick-task echo.
- `pm_skills/prompts/release.md` — step 5 reframed from "re-sync the
  inline echoes" to "the workflows reference the prompts; update only on
  a prompt rename/add/remove".

### Upgrade actions

- Replace these `framework` files wholesale:
  `pm_skills/integrations/feature.md`,
  `pm_skills/integrations/auto-jazz.md`,
  `pm_skills/integrations/auto-jazz-lite.md`,
  `pm_skills/prompts/release.md`.
- No data migration; no `root-template` or `project-memory` changes;
  `MANIFEST.md` unchanged (no paths added, removed, or reclassified).

---

## 2.7.0 — 2026-06-16

Ships a **lint baseline** to consuming projects, completing the
*One-command quality gate* (2.6.0): the gate is no longer "bring your own
from zero". The framework was opinionated about the gate's policy but
shipped no config. It now ships the one lint baseline every pm-skills
project can use regardless of stack — Markdown — because project memory
itself is Markdown.

Hybrid by design: the universal, stack-agnostic layer ships as scaffold
(a relaxed-but-strict markdownlint config + a dependency-free internal
link checker); the stack-specific layer (code linters, type checkers,
formatters) stays documented as per-stack recommended defaults in
`conventions.md`, not mandated — honouring the stack-agnostic "slots, not
a mandated linter" stance of the quality gate.

Opinionation, stated once: be strict (error, in `check`) on correctness —
broken/unused imports, dead code, type errors, broken links,
accessibility violations; make formatting invisible (auto-fix, never the
gate); keep taste/complexity rules opt-in and off by default; defer
spell-check until a domain dictionary exists.

Backward compatible: two new `scaffold`-class files (covered by the
existing `pm_skills/scaffold/*` manifest glob) plus additive wiring to
`init.md`, `init-project.md`, `GUIDE.md`, and two root-template sections.
No files renamed or removed; no stage-prompt output list changed, so the
`feature.md` / `auto-jazz.md` validation echoes need no re-sync.

### Added

- `pm_skills/scaffold/.markdownlint.json` (`scaffold`) — Markdown lint
  baseline: `default: true` with `MD013` off (line-length noise) and
  `MD024: siblings_only` (repeated changelog headings). Strict on what
  breaks rendering, relaxed on style. A starting point each project owns.
- `pm_skills/scaffold/check-links.mjs` (`scaffold`) — dependency-free
  (Node-only) internal Markdown link-integrity checker; catches broken
  cross-references in docs and project memory. Deletable for non-Node
  stacks.

### Changed

- `pm_skills/init.md` — Step 9 copies the two new scaffold files; the
  Step 8 quality-gate item points at the per-stack defaults and the
  shipped baseline; Step 10 readiness gains a baseline checkbox.
- `pm_skills/integrations/init-project.md` — scaffold-copy step and
  readiness list include the two new files.
- `pm_skills/project/conventions.md` (`project-memory` template) — the
  Tooling guidance gains the per-stack recommended-defaults and the
  opinionation dial. Existing populated files are unaffected.
- `DEV-INFRASTRUCTURE.md` (`root-template`) — the Quality gate section
  names the shipped Markdown baseline as the Tier 0 floor and the
  formatting-is-auto-fix-not-gate rule.
- `pm_skills/GUIDE.md` — the "What's in this folder" tree lists the two
  new scaffold files.

### Upgrade actions

- Replace these `framework` files wholesale: `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`, `pm_skills/GUIDE.md`.
- `DEV-INFRASTRUCTURE.md` (`root-template`, 3-way merge — preserve your
  populated content): add the shipped-baseline + formatting note to the
  **Quality gate** section guidance.
- `pm_skills/project/conventions.md` is `project-memory`: no action if
  you have populated it; otherwise the template now carries the per-stack
  tooling defaults.
- `scaffold` (copied once, never force-upgraded): optionally copy
  `pm_skills/scaffold/.markdownlint.json` and
  `pm_skills/scaffold/check-links.mjs` into your project root to adopt the
  baseline. Existing scaffold files are never overwritten.
- `pm_skills/MANIFEST.md`: no change — the new files are covered by the
  existing `pm_skills/scaffold/*` glob.

---

## 2.6.0 — 2026-06-16

Adds the **One-command quality gate** — the third runtime guardrail,
completing the build/run/verify triad alongside *One-command runtime
recovery* (2.3.0) and *Self-explaining runtime* (2.4.0). The framework
front-loads design discipline and is opinionated about getting a project
running and making it legible, but it had no invariant for *verifying a
change is sound*. "Run build and tests" lived only as scattered,
inconsistent instructions; there was no single, named, non-mutating
command an agent could always run to answer "did I break anything?".

This release makes that opinion explicit: every project exposes one
`check` command — non-mutating, CI-safe, focused on invariants — and the
framework defines it (`DEV-INFRASTRUCTURE.md`), sets it up (`init.md`),
and enforces it at the end of every task (`end-of-task.md`) and in
`review.md`. It is stack-agnostic and tiered (Tier 0 docs/static → Tier 2
mature app), so it scales from a placeholder + link scan to a full lint,
type, test, and build pipeline. Tool choices stay in `conventions.md`.

Backward compatible: additive sections to two root templates (3-way
merged on upgrade) and additive wiring to framework prompts. No files
renamed or removed, no `MANIFEST.md` change, and no stage-prompt output
list changed — so the `feature.md` / `auto-jazz.md` validation echoes do
not need re-syncing.

### Added

- `AGENTS.md` (`root-template`) — hard rule **One-command quality gate**
  (non-mutating, CI-safe, tiered) plus a matching anti-pattern rejecting
  a missing gate, a mutating `check`, or green-washing.
- `DEV-INFRASTRUCTURE.md` (`root-template`) — new **Quality gate**
  section (after *Maintainer diagnostics*): the `check` command, what it
  runs and omits, CI parity, the "trust not taste" rule selection, and
  the Tier 0–2 shape.
- `pm_skills/init.md` — Step 8 gains a **Quality gate** populate-item;
  Appendix B gains a **Quality gate example**.

### Changed

- `pm_skills/prompts/end-of-task.md` — new step 1 *Run the quality gate*
  (`check`); existing steps renumbered and the report gains a gate line.
- `pm_skills/prompts/review.md` — step 5 confirms `check` was run and is
  green for the change set.
- `pm_skills/prompts/scoping.md`, `implementation-plan.md` — a
  *check-surface* flag in their Rules sections (output lists unchanged).
- `pm_skills/integrations/auto-jazz.md`, `auto-jazz-lite.md` — the verify
  step now names the quality gate (`check`).
- `pm_skills/GUIDE.md` — the end-of-task housekeeping summary lists the
  quality gate.
- `pm_skills/init.md` — Step 10 adds a `check` readiness checkbox and
  folds the placeholder scan into `check`.
- `pm_skills/project/conventions.md` (`project-memory` template) — the
  Tooling section points tool choices at the gate. Existing projects'
  populated files are unaffected.

### Upgrade actions

- `AGENTS.md` (`root-template`, 3-way merge — preserve your populated
  content): add the **One-command quality gate** hard rule after
  *Self-explaining runtime*, and the matching bullet in *Anti-patterns to
  reject*.
- `DEV-INFRASTRUCTURE.md` (`root-template`, 3-way merge): add the new
  **Quality gate** section after *Maintainer diagnostics*. If the project
  has a build step, populate it (define your `check`); otherwise mark it
  Tier 0 / "n/a".
- Replace these `framework` files wholesale:
  `pm_skills/prompts/end-of-task.md`, `pm_skills/prompts/review.md`,
  `pm_skills/prompts/scoping.md`,
  `pm_skills/prompts/implementation-plan.md`,
  `pm_skills/integrations/auto-jazz.md`,
  `pm_skills/integrations/auto-jazz-lite.md`, `pm_skills/GUIDE.md`,
  `pm_skills/init.md`.
- `pm_skills/project/conventions.md` is `project-memory`: no action if you
  have populated it; if you still carry the template comments, you may
  adopt the refreshed Tooling note.
- Adopt the invariant in practice: ensure the project exposes a single
  non-mutating `check` command (or record that the gate is deliberately
  deferred for an early MVP).

## 2.5.0 — 2026-06-14

Adds the **review** capability — the missing mirror of the design
pipeline. The framework front-loads discipline going *in* (scoping →
design → plan → validation, and the gateless `auto-jazz` / `init-mvp` /
`spec-to-prod` runs that compress it), but gave the human nothing
structured for the way *out*. With gateless modes the review burden just
moves to after the run — and "I'll review later" had no tool. This
release closes that loop.

`prompts/review.md` is a read-only pass over a change set (typically an
autonomous run): it maps the diff to intent, checks scope adherence and
every stated assumption, audits against the hard-rule / UI / dev
contracts, names the regression surface and what only a human can
verify, confirms project-memory housekeeping happened, and ends with a
verdict (accept / accept-with-follow-ups / needs-changes) plus a
prioritised punch list. It proposes; it never silently rewrites the
work — approved fixes run as their own task. Durable findings feed back
into memory (an anti-pattern into `AGENTS.md`, a convention into
`conventions.md`, an idea into `wish-list.md`).

It is wired where the review need is created: the closing reports of
`auto-jazz`, `auto-jazz-lite`, `init-mvp`, and `spec-to-prod` now point
at it, and `GUIDE.md` lists it.

This release also hardens `release.md` so the framework self-catches the
two drift classes 2.4.1 had to fix by hand: a GUIDE file-tree check in
the verify snippet, and a step-5 reminder to re-sync the `feature.md` /
`auto-jazz.md` validation echoes when a stage prompt's outputs change.

Backward compatible: one new `framework` prompt (covered by the
`pm_skills/prompts/*` manifest wildcard — no `MANIFEST.md` change) and
additive wiring lines. No files renamed or removed, no migration.

### Added

- `pm_skills/prompts/review.md` (`framework`) — read-only review of a
  run: intent map, scope-and-assumption check, contract audit, risk and
  manual-check list, memory-hygiene check, verdict + punch list, and
  propose-don't-apply feedback into memory.

### Changed

- `pm_skills/integrations/auto-jazz.md`, `auto-jazz-lite.md`,
  `init-mvp.md`, `spec-to-prod.md` — closing reports now suggest running
  `prompts/review.md` to review the gateless run before accepting it.
- `pm_skills/GUIDE.md` — lists `review.md` in the prompts tree and adds
  a per-task-reference note on reviewing any gateless run.
- `pm_skills/prompts/release.md` — verify snippet gains a GUIDE
  file-tree check; step 5 gains a reminder to re-sync the workflow
  validation echoes when a stage prompt's outputs change, and to
  re-sync the `quick-task.md` echo in `feature.md` / `auto-jazz-lite.md`.
- `pm_skills/prompts/doctor-memory.md`,
  `pm_skills/prompts/roadmap-refactor.md` — consistency sweep: normalised
  stray ASCII `->` to the Unicode `→` used in rendered prose
  framework-wide. Cosmetic; no behaviour change.

### Upgrade actions

- Add the new `framework` file `pm_skills/prompts/review.md`.
- Replace the `framework` files: `pm_skills/integrations/auto-jazz.md`,
  `pm_skills/integrations/auto-jazz-lite.md`,
  `pm_skills/integrations/init-mvp.md`,
  `pm_skills/integrations/spec-to-prod.md`, `pm_skills/GUIDE.md`,
  `pm_skills/prompts/release.md`, `pm_skills/prompts/doctor-memory.md`,
  `pm_skills/prompts/roadmap-refactor.md`.
- `MANIFEST.md` unchanged — `review.md` inherits `framework` from the
  `pm_skills/prompts/*` wildcard. No data migration; no `root-template`
  changes.

---

## 2.4.1 — 2026-06-14

Consistency fixes only — no new files, no migration. Re-syncs two
workflow files with the canonical stage prompts after the 2.3.0 and
2.4.0 additions, unifies one diagnostic grep, and completes the GUIDE
folder map.

The load-bearing fix: `feature.md` and `auto-jazz.md` echo
`validation.md`'s output list inline, and that echo had gone stale — it
still listed the pre-2.3.0 six items ("Test coverage assessment", no
runtime, no diagnostics). An agent running validation through either
workflow could therefore skip the **Runtime impact** (2.3.0) and
**Diagnostics & redaction** (2.4.0) checks the canonical prompt now
requires — silently dropping the two newest opinions at their point of
use. The echo is brought back in step with `validation.md`'s current
eight outputs. The scoping, design-options, and implementation-plan
echoes in both files were checked and are already faithful.

### Changed

- `pm_skills/integrations/feature.md` — validation step output echo
  synced to `validation.md`'s current eight items (adds Runtime impact,
  Diagnostics & redaction; "Test coverage assessment" → "Test plan").
- `pm_skills/integrations/auto-jazz.md` — same validation echo sync.
- `pm_skills/prompts/doctor-memory.md` — done-work grep anchored to
  `^\s*[-*] \[x\]`, matching `end-of-task.md` and `prune-memory.md` (now
  catches `*`-bulleted lists, not only `-`).
- `pm_skills/GUIDE.md` — "What's in this folder" tree now lists `GUIDE.md`
  and `init.md`, so it matches the actual `pm_skills/` contents (per
  `release.md` steps 5–6).

### Upgrade actions

- Replace the `framework` files: `pm_skills/integrations/feature.md`,
  `pm_skills/integrations/auto-jazz.md`,
  `pm_skills/prompts/doctor-memory.md`, `pm_skills/GUIDE.md`.
- No data migration; no `root-template` changes; `MANIFEST.md` unchanged
  (no new or moved paths).

---

## 2.4.0 — 2026-06-14

Makes the framework opinionated about **maintainer diagnostics**: the app
should make its own behaviour legible while it is being built, so a
maintainer can hand an AI agent a useful diagnostic snapshot with one
click — instead of reproducing a bug, opening DevTools, preserving logs,
and copying the right lines by hand.

This is the diagnostic sibling of 2.3.0's runtime-recovery opinion (and the
second half of the same dogfooding note that motivated it). Where 2.3.0
made *getting the app running* a one-command, verified-ready capability,
2.4.0 makes *understanding what the app did* a one-click, redacted,
paste-ready one. The two share a shape and a discipline: a documented
contract, init wiring, verification wiring, and scaling by complexity —
never a shipped library.

A page cannot read the browser's native DevTools console, so the opinion is
built on an app-owned path: a small structured logger writes to the console
**and** a bounded in-memory buffer; global `error` / `unhandledrejection`
hooks funnel into it; and a dev-only "copy diagnostics" affordance copies a
**redacted** bundle for pasting to an agent. It is structured diagnostics
with the console as one sink — explicitly **not** scattered `console.log`.
Redaction is a safety invariant following OWASP logging guidance: never
tokens, cookies, raw bodies, full storage, or PII.

The opinion spans two contracts along the framework's own ownership lines:
the instrumentation (logger, buffer, schema, capture, redaction, bundle)
lives in `DEV-INFRASTRUCTURE.md`; the affordance (placement, Carbon
styling, 44px, focus, copy feedback, dev-only) lives in `UI-STANDARDS.md`;
a one-line invariant in `AGENTS.md` points at both. Its highest-leverage
hook is the **bug workflow**: `bug-scoping.md` now asks for the diagnostic
bundle first and treats a missing diagnostics path as the first finding.

It **scales with complexity**: Tier 0 (static / no-UI) makes uncaught
errors legible via a console helper + a global error hook; Tier 1 (typical
dev-server app) adds the ring buffer and the copy affordance; Tier 2
(operator-facing) adds interaction-id correlation, network-failure capture,
User Timing marks, and optional forward-to-server (e.g. Vite
`server.forwardConsole`). The capability and its documentation are required
at every tier; only the implementation heft scales.

Backward compatible: no files renamed or removed, no data migration, no
changed memory contracts. The three `root-template` edits are additive
sections that 3-way merge cleanly.

### Changed

- `AGENTS.md` (`root-template`) — adds the **Self-explaining runtime** hard
  rule (structured logger → console + bounded buffer; dev-only redacted
  copy-diagnostics affordance where there is UI; redact by default; scales
  by tier), a diagnostics anti-pattern (console.log spam / a leaky or
  prod-exposed copy control), and extends the Document-ownership rows so
  `DEV-INFRASTRUCTURE.md` owns "maintainer diagnostics" and
  `UI-STANDARDS.md` owns the "diagnostics affordance".
- `DEV-INFRASTRUCTURE.md` (`root-template`) — adds a **Maintainer
  diagnostics** section (after Runtime lifecycle): the structured logger,
  log-record shape, bounded ring buffer, global error/rejection capture,
  the redacted copy bundle (include/exclude lists), redaction, dev-only
  gating, optional forward-to-server, and the tiered shape. Collapses to
  one line for pure-static projects.
- `UI-STANDARDS.md` (`root-template`) — adds a **Diagnostics affordance**
  section (placement hierarchy, Carbon icon-button styling, 44px, focus,
  copy feedback, dev-only) and a Design-review-gate item.
- `pm_skills/init.md` — Step 8 population prompt gains a Maintainer
  diagnostics item; Step 10 readiness gains a diagnostics check; Appendix B
  gains a tiered Maintainer diagnostics example.
- `pm_skills/integrations/init-project.md` — mirrors the Step 8 and Step 10
  additions.
- `pm_skills/integrations/init-mvp.md` — the runnable-skeleton step wires
  the minimal diagnostics path (logger + global error hook) as the skeleton
  goes up; integration verification checks diagnostics work and the bundle
  redacts.
- `pm_skills/prompts/bug-scoping.md` — adds a diagnostic-bundle input and a
  rule to use it as primary evidence, and to flag a missing diagnostics
  path as the first finding.
- `pm_skills/prompts/scoping.md` — flags the diagnostics impact when a task
  adds instrumentable behaviour or a user-facing surface.
- `pm_skills/prompts/validation.md` — adds a "Diagnostics & redaction"
  pre-code check (output items renumbered 5 → 8).
- `pm_skills/prompts/implementation-plan.md` — folds the structured logger
  and the diagnostics contract docs into the files to modify, with a
  "notable events logged, bundle stays redacted" acceptance criterion.
- `pm_skills/prompts/end-of-task.md` — extends the `UI-STANDARDS.md` and
  `DEV-INFRASTRUCTURE.md` update triggers to the diagnostics affordance and
  maintainer diagnostics.

### Upgrade actions

- Re-merge `AGENTS.md` from the new root template (`prompts/upgrade.md`
  Step 7): add the "Self-explaining runtime" hard rule, the diagnostics
  anti-pattern, and the updated Document-ownership rows. Preserve all
  populated project-specific content.
- Re-merge `DEV-INFRASTRUCTURE.md` from the new root template: add the new
  "Maintainer diagnostics" section (after "Runtime lifecycle"). Populate it
  for your project, or collapse it to one line / mark it n/a for a
  pure-static project. Preserve every already-populated section verbatim.
- Re-merge `UI-STANDARDS.md` from the new root template: add the
  "Diagnostics affordance" section and the Design-review-gate item.
  Preserve every populated section verbatim.
- Replace the `framework` files: `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`,
  `pm_skills/integrations/init-mvp.md`,
  `pm_skills/prompts/bug-scoping.md`, `pm_skills/prompts/scoping.md`,
  `pm_skills/prompts/validation.md`,
  `pm_skills/prompts/implementation-plan.md`,
  `pm_skills/prompts/end-of-task.md`.
- No data migration; `MANIFEST.md` is unchanged (no new paths).
- Optional follow-up: on the next task that touches the runtime or UI,
  populate the new `DEV-INFRASTRUCTURE.md` → "Maintainer diagnostics" and
  `UI-STANDARDS.md` → "Diagnostics affordance" sections so the diagnostics
  path is documented.

---

## 2.3.0 — 2026-06-13

Makes the framework opinionated about **runtime recoverability**: reaching
a known-good running state — and getting back there after it drifts — is
one documented, safe command, never a remembered ritual.

The framework was already opinionated about product quality (Carbon, WCAG
2.2 AAA, project memory, testing, minimal-change) and about *production*
deploy recoverability (`deploy.md`: pre-flight, live health, rollback). It
had no *local* equivalent: a solo maintainer had to hold ports, stale
processes, env composition, generated outputs, tunnels, and startup order
in their head just to get a local app running again. This release adds the
dev-side sibling of `deploy.md`.

The opinion follows the framework's existing shape — a one-line hard rule
in the contract, a populated section in the dev-infra doc, init wiring to
create it, and verification wiring to check it — and **scales with
complexity**: pure-static projects document one command ("serve this
directory"); single dev-server apps get `dev` + `reboot`; multi-process
and operator-facing apps add `boot` / `stop` / `status` / `logs` /
`reset`. The capability and its documentation are required at every tier;
only the implementation heft scales.

Backward compatible: no files renamed or removed, no data migration, no
changed memory contracts. The two `root-template` edits are additive
sections that 3-way merge cleanly.

### Changed

- `AGENTS.md` (`root-template`) — adds the **One-command runtime
  recovery** hard rule (boot/reboot to a verified-ready state via one
  safe command; kill only owned processes; allowlist cleanup; no
  destructive reset without an explicit flag; scales by tier), an
  ad-hoc-startup anti-pattern, and extends the Document-ownership row so
  `DEV-INFRASTRUCTURE.md` owns "runtime lifecycle".
- `DEV-INFRASTRUCTURE.md` (`root-template`) — adds a **Runtime
  lifecycle** section (after Dev server): command surface, dev URL/port,
  components and startup order, process ownership / PID & log locations,
  env and `.env` workflow, allowlisted generated-output cleanup, health /
  readiness checks, recovery playbook, exposure controls, and protected
  paths. Collapses to one line for pure-static projects.
- `pm_skills/init.md` — Step 8 population prompt gains a Runtime lifecycle
  item; Step 10 readiness gains a "documented and boots to a ready state"
  check; Appendix B gains a tiered Runtime lifecycle example (single dev
  server → operator-facing).
- `pm_skills/integrations/init-project.md` — mirrors the Step 8 and
  Step 10 additions.
- `pm_skills/integrations/init-mvp.md` — the runnable-skeleton step
  records the canonical boot/reboot command and verifies a ready state;
  integration verification boots to a ready state, not just a launched
  process.
- `pm_skills/prompts/end-of-task.md` — adds a conditional runtime-boot
  verification step (boot via the canonical command; verify readiness,
  not launch), extends the `DEV-INFRASTRUCTURE.md` update trigger to the
  runtime lifecycle, and adds a runtime line to the report. Sections
  renumbered (1 → 4).
- `pm_skills/prompts/scoping.md` — flags the runtime-lifecycle impact
  when a task adds or changes a runtime component.
- `pm_skills/prompts/validation.md` — adds a "Runtime impact" pre-code
  check (preserves one-command boot/reboot and a readiness check).
- `pm_skills/prompts/implementation-plan.md` — folds the runtime command
  surface and the `DEV-INFRASTRUCTURE.md` doc into the files to modify,
  with a "boots to a ready state" acceptance criterion.

### Upgrade actions

- Re-merge `AGENTS.md` from the new root template (`prompts/upgrade.md`
  Step 7): add the "One-command runtime recovery" hard rule, the
  ad-hoc-startup anti-pattern, and the updated Document-ownership row for
  `DEV-INFRASTRUCTURE.md`. Preserve all populated project-specific content.
- Re-merge `DEV-INFRASTRUCTURE.md` from the new root template: add the new
  "Runtime lifecycle" section (after "Dev server"). Populate it for your
  project, or collapse it to one line / mark it n/a for a pure-static
  project. Preserve every already-populated section verbatim.
- Replace the `framework` files: `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`,
  `pm_skills/integrations/init-mvp.md`,
  `pm_skills/prompts/end-of-task.md`, `pm_skills/prompts/scoping.md`,
  `pm_skills/prompts/validation.md`,
  `pm_skills/prompts/implementation-plan.md`.
- No data migration; `MANIFEST.md` is unchanged (no new paths).
- Optional follow-up: on the next task that touches the runtime, populate
  the new `DEV-INFRASTRUCTURE.md` → "Runtime lifecycle" section so the
  boot/reboot command is documented.

---

## 2.2.1 — 2026-06-04

Fixes a smaller sibling of the 2.1.0 bug, surfaced by dogfooding a prune
on the same mature project. Two cold decision-log archive chunks sat ~3×
over the 8,000-word `archive/` chunk cap and had been flagged-and-deferred
across two prune sessions — the same "always-red, always-ignored" dynamic
2.1.0 removed from the hot-set.

Root cause: the chunk cap measured the wrong thing. Its rationale —
"split so each loads in one read" — is obsolete: cold archives are never
auto-read; they're grepped, then a line-range is read, so file size is
irrelevant. The cap's only effect was to force navigationally-useless
splits (the project literally had a `decision-log-2026-06-01.md` and a
`decision-log-2026-06-01-b.md` — the same day split in two purely to
satisfy the cap). The real value of chunking is INDEX browsability, which
is a *boundary* concern (month / migration epoch), not a *size* one.

The fix replaces the word/entry chunk cap with boundary-based chunking:
one epoch per file, split only for browsability, never for size. An epoch
bounds its own growth, so nothing accretes unbounded even without a cap.
Also folds two minor consistency fixes found in the same review.

Backward compatible: no files renamed or removed, no data migration.
Existing oversized cold chunks are harmless and need no action.

### Changed

- `AGENTS.md` (`root-template`) — the `archive/` chunk budget changes
  from `8,000 words or 20 entries per file` (action: "split so each loads
  in one read") to `one epoch per file (whole month / migration
  boundary)` — chunk by sequence boundary for INDEX browsability, not
  size; sub-split an epoch only if genuinely unwieldy to grep. The
  `backlog.md` Active row's `1,500 words and ~40 open items` is clarified
  to `or … (whichever trips first)`, with a note that a low item count at
  high words means items are too verbose.
- `pm_skills/prompts/prune-memory.md` — detect no longer word-counts
  archive chunks against a cap (notes multi-epoch spans only); the
  propose / decision-log / rules steps reframe splitting as
  epoch-boundary, browsability-driven; adds an INDEX caveat to put
  entry/word counts only on frozen archive rows, never the live-file row
  (it goes stale the moment the prune appends its own record — an
  off-by-one seen in the live project's INDEX).
- `pm_skills/prompts/doctor-memory.md` — archive-hygiene check drops the
  per-chunk word-count; a multi-epoch chunk is INFO, not a WARN; a
  missing/stale INDEX stays a WARN.
- `pm_skills/prompts/upgrade.md` — the major-version migration routine
  splits archive destinations on epoch boundaries for browsability, not
  when they "exceed a budget".

### Upgrade actions

- Re-merge the `AGENTS.md` "Memory size budgets" table from the new root
  template (`prompts/upgrade.md` Step 7) — specifically the `archive/`
  chunk and `backlog.md` Active rows.
- Replace `pm_skills/prompts/prune-memory.md`,
  `pm_skills/prompts/doctor-memory.md`, and `pm_skills/prompts/upgrade.md`
  (`framework` files).
- No data migration: existing archive chunks are left as-is.

---

## 2.2.0 — 2026-06-03

Adds an end-to-end path from spec to a deployed product, and the
production-deploy primitive it was missing.

Until now the framework took a spec as far as a locally-running
first-milestone MVP (`init-mvp.md`) and then handed back to the
per-milestone loop. Nothing drove a production deploy of a consuming
project — `release.md` versions the framework itself, not your app —
and no single workflow chained foundation → milestones → deploy.

Two new framework files close that gap by composing existing workflows
rather than duplicating them. Backward compatible: no files renamed or
removed, no data migration, no changed memory contracts.

### Added

- `pm_skills/prompts/deploy.md` — canonical production deploy + live-
  verification primitive for a consuming project. Reads
  `DEV-INFRASTRUCTURE.md` → Deployment, runs pre-flight (clean tree,
  green build, version stamped, secrets external), executes the
  documented pipeline, verifies the live result, and rolls back on
  failure. The app-deploy counterpart to `release.md`.
- `pm_skills/integrations/spec-to-prod.md` — orchestrator that chains
  `init-mvp.md` (foundation + MVP) → the `next-batch.md`/`auto-jazz.md`
  milestone loop → `deploy.md`, bounded by a signed-off **scope band**
  (Deployed MVP / Deployed Current milestone / Full backlog to
  production). Adds two gates (foundation, scope band) and an
  opinionated Git-with-remote expectation; delegates all build rigour
  to the workflows it wraps.

### Changed

- `pm_skills/GUIDE.md` — "Start here" gains a spec-to-prod entry; file
  tree and manual-workflow sections list the two new files.
- `README.md` — quick start notes the build-and-ship path.

### Upgrade actions

- Copy the two new `framework` files into your project:
  `pm_skills/prompts/deploy.md` and
  `pm_skills/integrations/spec-to-prod.md`. Both inherit the
  `framework` class from the existing `pm_skills/prompts/*` and
  `pm_skills/integrations/*` manifest wildcards — no `MANIFEST.md`
  change is needed.
- Replace `pm_skills/GUIDE.md` (`framework` file).
- No data migration: existing project memory and populated root
  templates are untouched. To use the new path, ensure
  `DEV-INFRASTRUCTURE.md` → Deployment is populated; `deploy.md` will
  prompt for it if not.

---

## 2.1.0 — 2026-06-03

Recalibrates the memory size budgets. Dogfooding `prune-memory.md` on a
mature project surfaced two budgets that were *permanently* over — alarms
no legal prune could ever clear, which trains both agent and maintainer
to ignore the size check entirely.

Root cause: the budgets treated two different file classes identically.
**Accreting** files (`file-map.md`, `decision-log.md`, `backlog.md`,
`trajectory.md`) genuinely grow and need tight, prunable budgets.
**Reference** docs (`README`, `brief.md`, `architecture.md`,
`conventions.md`, and any project standards/process/infra docs) are
written once to a natural size, never accrete, and have no prune action —
yet the fixed 8,000-word "total hot whole-file set" cap summed them in,
so it fired on every mature project before any work even started (5
default hot files × the 2,000 single-file budget = 10,000 > 8,000). The
two conditional reads (`UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`) were
also counted into the every-task total despite being read only when a
task touches their domain.

The fix splits the hot whole-file tier into **reference** (soft per-doc
guideline, not a prune target), **accreting** `file-map.md` (hard
prunable budget), and **conditional** (excluded from the every-task
load); replaces the fixed hot-set sum with a structural review; and
aligns the decision-log word budget with its entry budget at a realistic
density.

Backward compatible: no files renamed or removed, no data migration. A
project adopts the recalibrated budgets when it next merges the
`AGENTS.md` root template.

### Changed

- `AGENTS.md` (`root-template`) — "Read tiers" Hot whole-file split into
  *reference* / *accreting* (`file-map.md`) / *conditional*
  (`UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`). "Memory size budgets":
  the fixed `Total hot whole-file set | 8,000` row becomes a structural
  *every-task read load* review (no aggregate word cap); reference docs
  get a soft ~3,500-word per-doc guideline (not a prune target);
  `file-map.md` keeps its 2,000 hard budget with an irreducible-roles
  floor note; the `decision-log.md` word budget moves 4,000 → ~6,000
  (consistent with 20 entries × ~300 words), entry count primary.
- `pm_skills/prompts/prune-memory.md` — detect step drops the aggregate
  hot-set sum and anchors the `[x]` count to list items
  (`^\s*[-*] \[x\]`); propose step adds a reference-docs-are-not-prune-
  targets rule and a structural every-task-load review, and notes the
  file-map irreducible-roles floor.
- `pm_skills/prompts/doctor-memory.md` — budget check distinguishes hard
  (accreting / sectional) overruns (FAIL) from soft reference-doc
  overruns (WARN); no aggregate hot-set cap.
- `pm_skills/prompts/end-of-task.md` — size check matches the two-class
  model; anchors the `[x]` grep; adds a decision-log entry-tightness
  note (~150–300 words/entry).
- `pm_skills/GUIDE.md` — Hot whole-file tier summary notes the
  reference / accreting / conditional split.

### Upgrade actions

- Re-merge the `AGENTS.md` "Read tiers" and "Memory size budgets"
  sections from the new root template (`prompts/upgrade.md` Step 7),
  preserving any project-added hot reads (file them under *reference* or
  *conditional*) and any project-specific budget rows.
- Replace `pm_skills/prompts/prune-memory.md`,
  `pm_skills/prompts/doctor-memory.md`,
  `pm_skills/prompts/end-of-task.md`, and `pm_skills/GUIDE.md`
  (`framework` files).
- No data migration: existing memory files are untouched.

---

## 2.0.0 — 2026-06-01

Gives project memory a metabolism. Earlier versions could *capture*
work (backlog, decision-log, wish-list) and *archive* history (prune),
but nothing bounded the **active, forward-looking** layer — and the
budgets keyed off a section name (`## Completed`) that real projects
stopped feeding, recording shipped work as `[x]` items under Active
milestones instead. The result, observed on a mature project: a
~22,000-word backlog that was ~90% shipped work narrated in full, each
item duplicating its decision-log entry, while the prune found almost
nothing to do.

This release re-points the metabolism at the layer that actually grows.
The hot/active layer now holds **open work only**. The moment a task
ships, its record leaves the backlog: a one-line outcome goes to the new
`trajectory.md`, and the *why* stays in `decision-log.md` — written
once, never twice. New budgets measure the right axis (backlog Active
words and open-item count, zero `[x]`, decision-log words, an archive
chunk cap), two new workflows repair and diagnose drift the size check
can't see, and the archive gets a browsable `INDEX.md`.

Breaking because it changes the memory contract: the backlog
`## Completed` section is removed and a new `project-memory` file
(`trajectory.md`) is introduced. The upgrade is a one-time, approved,
non-destructive migration — no history is lost.

### Added

- `pm_skills/project/trajectory.md` (`project-memory`) — the
  shipped-work narrative. **Warm** read tier: read on demand (roadmap
  refactor, release, reconstructing what shipped), not every task.
  One line per item + a decision-log pointer; archives by size to
  `archive/trajectory/`.
- `pm_skills/prompts/roadmap-refactor.md` (`framework`) — repair a
  drifted backlog: regroup by lifecycle and dependency, dedupe stale
  rounds, evict shipped work to `trajectory.md`. Distinct from
  `next-batch` (which picks) and `prune-memory` (which archives by size).
- `pm_skills/prompts/doctor-memory.md` (`framework`) — a read-only
  memory health check for structural drift the size check misses:
  `[x]` in the backlog, stale `file-map` paths, cross-file duplication,
  oversized/un-indexed archives, and framework version lag. Proposes the
  workflow that fixes each finding; never edits.
- A new **Warm** read tier and an `archive/INDEX.md` convention (the
  browsable map of cold storage).

### Changed

- `AGENTS.md` (`root-template`) — four read tiers (added Warm for
  `trajectory.md`); backlog is open-work-only (no Completed); rebuilt
  the **Memory size budgets** table to bound the active layer (backlog
  Active 1,500 words / ~40 open items, zero `[x]`; `trajectory.md`
  2,000 words; decision-log 20 entries **or** 4,000 words; archive chunk
  cap 8,000 words / 20 entries); added anti-patterns for
  shipped-work-in-backlog and audit-trail drift; document-ownership row
  for `trajectory.md`.
- `pm_skills/prompts/end-of-task.md` — decision-log is the canonical
  *why*; on ship, **remove** the backlog item (no Completed section) and
  add one line to `trajectory.md`; the size check counts backlog Active
  words/open/`[x]`, trajectory words, and decision-log words; structural
  backlog issues route to `roadmap-refactor.md`.
- `pm_skills/prompts/prune-memory.md` — relocate stray `[x]` work to
  `trajectory.md`; archive oldest trajectory phases; split the
  decision-log by **words** as well as entries; enforce the archive
  chunk cap; maintain `archive/INDEX.md`.
- `pm_skills/prompts/session-start.md`, `pm_skills/GUIDE.md` — document
  the four tiers, `trajectory.md`, and the two new prompts.
- `pm_skills/project/backlog.md` (`project-memory` template) — removed
  the `## Completed` section; open-work-only with a tiny optional ticket
  grammar (Intent / Done-when) so intent survives compression.
- `pm_skills/project/decision-log.md` (`project-memory` template) —
  noted the word budget and that it is the single home of the *why*.
- `pm_skills/MANIFEST.md` — added the `trajectory.md` path row.
- `pm_skills/prompts/upgrade.md` — Step 8 gains a concrete, repeatable,
  lossless memory-migration routine: snapshot → propose → execute (align
  with any pre-existing archive) → **binary line-anchored ID reconcile**,
  with `VERSION` stamped only after the reconcile passes. The mechanics
  behind the migration below.
- `pm_skills/init.md` + `pm_skills/integrations/init-project.md` — the
  backlog-generation step now produces open-work-only tickets in the
  2.0.0 grammar (Intent / Done-when + flags) so a project is born lean,
  with a compress-on-ship note added to "Memory hygiene".

### Upgrade actions

- Add `pm_skills/prompts/roadmap-refactor.md` and
  `pm_skills/prompts/doctor-memory.md` (`framework` — new files).
- Replace `pm_skills/prompts/end-of-task.md`, `prune-memory.md`,
  `session-start.md`, `upgrade.md`, and `pm_skills/GUIDE.md` with the new
  versions (`framework` — wholesale, subject to the Step 4 customisation
  check).
- Create `pm_skills/project/trajectory.md` from the source template
  (`project-memory` — new file; skip if it already exists, never
  overwrite).
- `AGENTS.md` (`root-template`, 3-way merge): the **Read tiers**,
  **Memory size budgets**, document-ownership, and anti-pattern blocks
  are framework-authored — if the project left them at the defaults,
  replace with the new versions; if the project customised the numbers or
  tiers, surface a diff and let the user adopt. Preserve every
  project-populated section verbatim.
- `pm_skills/project/backlog.md` and `decision-log.md`
  (`project-memory`): apply the new template comments/structure only
  where still the unedited placeholders; never rewrite a project's real
  content. The Completed-section removal is handled by the memory
  migration below, not by overwriting.
- **Memory migration (one-time, approved, non-destructive).** A
  major-version data move; `pm_skills/prompts/upgrade.md` Step 8 runs the
  snapshot → propose → execute → reconcile mechanics. Lose nothing:
  1. **Snapshot** `backlog.md` verbatim to
     `archive/trajectory/backlog-pre-v2-YYYY-MM-DD.md` (byte-identical
     safety net).
  2. Create `trajectory.md` (above).
  3. Run `pm_skills/prompts/roadmap-refactor.md`: relocate every `[x]`
     item and any `## Completed` section out of `backlog.md` into
     `trajectory.md` (one compressed line each, starting with the ID,
     grouped into phases; split into sequential `archive/trajectory/`
     chunks when the live file would exceed its 2,000-word budget),
     confirming each item's *why* already lives in `decision-log.md`.
     Align with any pre-existing shipped archive (e.g. `backlog-shipped.md`)
     rather than duplicating it. Remove `## Completed` once empty.
  4. Create or refresh `archive/INDEX.md`.
  5. **Reconcile (lossless proof):** compare leading item IDs (snapshot
     `- [x] **ID**` lines vs. trajectory `- ID —` lines, anchored to line
     starts) — the set difference must be **empty**; zero `[x]` remain in
     `backlog.md`; the snapshot is still byte-identical. Then run
     `pm_skills/prompts/doctor-memory.md` to confirm budgets, and
     `pm_skills/prompts/prune-memory.md` if the decision-log or any
     chunk is over budget.
  6. Stamp `pm_skills/VERSION` to 2.0.0 **only after** the reconcile
     passes (held at 1.x through the framework sync).
- A project already past these (no `## Completed`, has `trajectory.md`)
  needs only the file/prompt replacements — the migration is a no-op.

## 1.3.0 — 2026-05-31

Bakes in a lean, opinionated testing doctrine — invariant-led, with
named test categories — so testing is a first-class default alongside
Carbon, WCAG 2.2 AAA, Nielsen, and JSDoc. No new standard file, no
coverage threshold, no default security or performance tooling. Tool
names (Vitest, Playwright) live in the project layer, not the
always-read contract.

### Changed

- `AGENTS.md` (`root-template`) — rewrote the **Testing** section:
  tests protect invariants (not coverage); named categories with
  "not applicable" as a valid outcome; fast and hermetic; two layers;
  a softened anti-gaming rule (obsolete tests are updated through the
  approval gate, not silently weakened); no hollow tests; rigour ramps
  with maturity.
- `pm_skills/prompts/validation.md` — Stage 4 "test coverage" became a
  concrete test-plan gate over the named categories, with "not
  applicable" allowed per category.
- `pm_skills/init.md` — replaced the generic testing-policy ladder with
  the opinionated ramp (pre-invariant → safety net → journeys); names
  Vitest and Playwright as the JS/Node default. Step 6's testing item
  now keeps the doctrine and points project specifics to
  `conventions.md`.
- `pm_skills/project/conventions.md` — sharpened the Testing and Tooling
  template guidance (runner config and its reasons, e.g. sequential
  execution when tests mutate env or reset singletons; project
  invariants; default tools).
- `README.md`, `pm_skills/GUIDE.md` — added the testing doctrine to the
  stated defaults.

### Upgrade actions

- Replace `pm_skills/prompts/validation.md` and `pm_skills/init.md` with
  the new versions (`framework` — wholesale).
- In `AGENTS.md` (`root-template`, 3-way merge): if the project still
  has the default Testing section, replace it with the new doctrine; if
  the project customised its Testing section, leave it and offer the new
  doctrine for the user to adopt.
- `pm_skills/project/conventions.md` (`project-memory`): apply the
  improved template guidance only where the Testing/Tooling sections are
  still the unedited placeholders; never overwrite a project's filled-in
  policy.
- No memory migration required.

## 1.2.1 — 2026-05-31

Strengthen the wish-list promote step in `next-batch` so promoted items
are ranked relative to existing backlog items instead of appended
blindly, keeping the next-batch pick reading off a current order.

### Changed

- `pm_skills/prompts/next-batch.md` — promote step now requires placing a
  promoted item relative to existing Current/Next/Icebox items with a
  one-line above/below rationale. Makes `next-batch` the explicit (lazy,
  just-in-time) re-ranking point.

### Upgrade actions

- Replace `pm_skills/prompts/next-batch.md` with the new version. No
  memory migration; behavioural clarification only.

## 1.2.0 — 2026-05-31

Adds `init-mvp`: a guided-then-autonomous workflow that turns wants or
specs into a runnable first-milestone MVP. It marries the gated initializer
(`init-project.md`) with gateless execution (`auto-jazz.md`) — you sign off
the foundation, then it builds to completion — across the whole initial
development phase, with staged rollback checkpoints and a stop-and-narrow
rule for safety.

### Added

- `pm_skills/integrations/init-mvp.md` (`framework`) — gated foundation,
  then gateless build. Phase A is gated like `init-project.md`: it reads
  the interpretation back, then builds the foundation (brief, architecture,
  backlog, contracts, scaffold) and fixes the stack + dependency policy,
  ending at a foundation sign-off gate. Phase B then runs without gates:
  stands up a runnable skeleton and burns down the first milestone via the
  `auto-jazz` loop. Runs the standard four-stage approach at two altitudes
  (project-altitude gated, item-altitude gateless) — no extra design
  stages. Inherits the auto-jazz hard prohibitions plus two of its own: no
  building past the first milestone in one run, and a greenfield dependency
  rule (only deps the recorded architecture names are authorised).

### Changed

- `pm_skills/GUIDE.md` — adds a "New project, and you want the agent to
  build it?" pointer under Start here, the `init-mvp.md` entry in the
  integrations file tree, and the previously-missing `prune-memory.md`
  integration row alongside it.
- `pm_skills/init.md` — adds a "Prefer to let the agent build it?" callout
  pointing at the guided-then-autonomous path.
- `pm_skills/integrations/init-project.md` — cross-references the
  guided-then-autonomous variant.
- `README.md` — notes the guided-then-autonomous path in Quick start.

### Upgrade actions

- Create `pm_skills/integrations/init-mvp.md` from the source. It is a new
  `framework` file — nothing to preserve; copy it in.
- Overwrite these `framework` files with the source versions, after the
  Step 4 customisation check: `pm_skills/GUIDE.md`, `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md`.
- `README.md`: most consuming projects keep their own root README — skip
  unless the project intentionally tracks the framework README.
- No `pm_skills/MANIFEST.md` change — `pm_skills/integrations/*` already
  classifies the new file as `framework`.
- No `project/` memory migrations.
- Bump `pm_skills/VERSION` to `1.2.0` (stamped by overwriting the framework
  `VERSION` file).
- Result: project is at **1.2.0**.

## 1.1.0 — 2026-05-30

Adds the wish-list: a cold-tier capture inbox for parking unscoped
ideas mid-task, with capture and triage rules plus the upgrade
handling needed to ship a brand-new project-memory file.

### Added

- `pm_skills/project/wish-list.md` (`project-memory`) — capture inbox
  for unscoped ideas. Cold tier (never auto-read); drained by triage
  into `backlog.md`. One line per idea; promote or cut at triage;
  soft cap ~25 open items.

### Changed

- `AGENTS.md` (`root-template`) — adds a "Capturing deferred ideas
  (wish-list)" section, a Cold read-tier entry, a memory-budget row,
  a Document-ownership update, and an anti-pattern.
- `pm_skills/prompts/next-batch.md` — adds a quick wish-list triage
  step (promote or cut) before picking the batch.
- `pm_skills/prompts/corrections.md` — adds a "Park it" capture
  trigger.
- `pm_skills/prompts/scoping.md` — routes worth-keeping out-of-scope
  items into the wish-list.
- `pm_skills/prompts/end-of-task.md` — counts open wish-list items in
  the size check and proposes triage (not archiving) when over budget.
- `pm_skills/prompts/prune-memory.md` — adds a wish-list action: drain
  by triage, never archive.
- `pm_skills/prompts/session-start.md` — lists the wish-list under
  Cold (do not auto-load).
- `pm_skills/prompts/upgrade.md` — Step 8 now creates a brand-new
  `project-memory` file from the template (never overwrites).
- `pm_skills/MANIFEST.md` — adds the `wish-list.md` → `project-memory`
  row.
- `pm_skills/GUIDE.md`, `pm_skills/init.md`,
  `pm_skills/integrations/init-project.md` — document the wish-list in
  the file tree, read tiers, memory-fresh table, and init notes.

### Upgrade actions

- Create `pm_skills/project/wish-list.md` from the source template. It
  is a new `project-memory` file — nothing to preserve. **Skip if it
  already exists; never overwrite.**
- Overwrite these `framework` files with the source versions, after
  the Step 4 customisation check: `pm_skills/prompts/next-batch.md`,
  `corrections.md`, `scoping.md`, `end-of-task.md`, `prune-memory.md`,
  `session-start.md`, `upgrade.md`, `pm_skills/GUIDE.md`,
  `pm_skills/init.md`, `pm_skills/integrations/init-project.md`,
  `pm_skills/MANIFEST.md`.
- 3-way merge `AGENTS.md` (`root-template`): add the "Capturing
  deferred ideas (wish-list)" section, the Cold read-tier bullet, the
  `wish-list.md` budget row, the Document-ownership update, and the
  anti-pattern. Preserve every populated section verbatim.
- Bump `pm_skills/VERSION` to `1.1.0` (stamped by overwriting the
  framework `VERSION` file).
- Result: project is at **1.1.0**.

## 1.0.0 — 2026-05-28

First versioned release. Establishes self-describing metadata so
upgrades become a short declarative read instead of a full-tree
forensic diff. Prior copies of pm-skills were unversioned; treat any
project without a `pm_skills/VERSION` file as pre-1.0.0.

### Added

- `pm_skills/VERSION` — single-line semver. The upgrade fast-path
  check reads this first.
- `pm_skills/CHANGELOG.md` — this file.
- `pm_skills/MANIFEST.md` — classifies every framework path as
  `framework`, `root-template`, `project-memory`, or `scaffold`, so
  an upgrade never has to infer whether a file is safe to overwrite.
- `pm_skills/prompts/release.md` — maintainer-side release checklist
  that keeps `VERSION`, this changelog, and the manifest in sync.

### Changed

- `pm_skills/prompts/upgrade.md` — rewritten to read `VERSION`,
  `CHANGELOG.md`, and `MANIFEST.md` first: check versions and stop if
  equal, apply only the documented deltas when behind, and fall back
  to a full diff only for pre-1.0.0 (unversioned) projects. Adds a
  defensive check that surfaces locally-customised framework files
  before overwriting them, and records source + version provenance.
- `pm_skills/GUIDE.md`, `README.md` — document versioning and the new
  upgrade flow.

### Upgrade actions

For a project on a pre-1.0.0 (unversioned) copy:

- Copy the four new framework files into the project's `pm_skills/`:
  `VERSION`, `CHANGELOG.md`, `MANIFEST.md`, `prompts/release.md`.
- Overwrite `pm_skills/prompts/upgrade.md` and `pm_skills/GUIDE.md`
  (both `framework` class — but first run the Step 4 customisation
  check; some projects added local sections such as "Shell safety").
- `README.md`: most consuming projects keep their own root README —
  skip unless the project intentionally tracks the framework README.
- No `project/` memory migrations.
- Result: project is at **1.0.0**.
