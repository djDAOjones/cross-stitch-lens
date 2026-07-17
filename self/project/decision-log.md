# Decision Log — pm-skills framework repository

<!-- Append new decisions at the top. Don't edit old entries. -->
<!-- Hot sectional: agents scan the latest 10 headings, open only
     relevant bodies. Keep entries tight: Decision / Rationale /
     Alternatives. -->

## 2026-07-16 — CI-NODE: bump CI Node to 22 for cspell v10 (source-only)

**Decision:** Bumped `.github/workflows/lint.yml` from `node-version:
20` to `22`, and aligned `package.json` `engines` to `>=22.18.0`
(architecture.md updated to match). No VERSION bump — CI/tooling config
is source-only.

**Rationale:** Every push to `main` was failing the Lint job (flood of
GitHub failure emails). Root cause was environmental, not content:
`cspell@^10` requires Node `>=22.18.0` and aborted the `lint:spell`
step with `Unsupported NodeJS version (20.20.2)`. `npm run check`
passed locally because the maintainer runs Node v24; only the pinned
CI runner was stale.

**Alternatives:** Node 24 (rejected — 22 is current LTS, sufficient for
the `>=22.18.0` floor); pinning cspell back to v9 (rejected — bumping
the runner is the correct fix, not freezing a dependency).

## 2026-07-16 — ARCH-INTEG: archive referential-integrity check (3.17.1)

**Decision:** Shipped ARCH-INTEG as patch 3.17.1 — a new Diagnose check
(**Archive referential integrity**) plus a Prune P5 re-verification note
in `memory-maintenance.md`. The check harvests dated `decision-log`
pointers from the trajectory (live + archive chunks) and FAILs on any
date the live log's `## YYYY-MM-DD` headings and the archive INDEX
ranges don't cover, with a git-recovery hint. Decided at the ungated
gates: (1) **placement after archive-hygiene check 6**, not appended at
the end — the ticket's explicit position, grouping it with the two
content-adjacent checks (4 file-map paths, 6 INDEX rows) it extends from
*files exist* to *content covered*; this renumbers the former checks
7–12 to 8–13. (2) **patch bump** (one check + one note, no new files, no
migration, MANIFEST unchanged). (3) **date-level granularity +
"unresolved reference" wording**, accepting a small false-positive rate
for one cheap shell pass (ticket constraint). (4) **propose-restore,
never auto-edit** — consistent with Diagnose-never-edits.

**Rationale:** The append-only doctrine protected file *existence* but
not *a citation resolving to content*; the banked incident (four
2026-06-23/24 entries dropped by a Hub revert, still referenced by
trajectory-0003/0004, present in no archive, an invisible INDEX hole)
went unflagged across three prunes and a Diagnose pass precisely because
checks 4 and 6 verify files, not coverage. Frozen CHANGELOG entries that
cite the old check numbers stay as-is — append-only history records the
release-time state; the renumber is called out in the 3.17.1 Upgrade
actions instead.

**Alternatives considered:** Append as check 13 (no renumber churn) —
rejected; the ticket deliberately groups it with checks 4/6 for the
reader thinking about archive integrity, and MD029 being disabled means
the renumber is cosmetic, not a lint risk. Entry-level (not date-level)
granularity — rejected (needs headline parsing; the failure mode is
whole-day slices vanishing). Reverse check (archive entries never
referenced) — rejected per the ticket (unreferenced history is fine;
the doctrine protects existence, not citation).

## 2026-07-16 — ITEM-AGE: standing-item ageing + `[security]` flag (3.17.0)

**Decision:** Shipped ITEM-AGE as a minor release. Standing human-owned
work (`[maintainer]`/`[sign-off]`/`[blocked]`) now carries a creation
date in the canonical backlog grammar, and Start B surfaces the 3 oldest
with their age at the pick (item 7 of "Present the pick"). A new
`[security]` flag — reserved for live exposure (leaked credential, open
auth hole; nothing weaker) — prints a one-line banner at every session
start, on Start A and B alike, until closed. Diagnose gained check 12
(ageing standing items + any open `[security]`); `memory-policy.md`
gained a Standing-item age row (WARN 30 d). Decided at the ungated
gates: (1) **bump = minor** (new capability + flag, backward
compatible, no migration); (2) **threshold = 30 d WARN** in
memory-policy (ticket open question 1 — numbers live there); (3)
**banner = one line max** even for multiple `[security]` items (ticket
constraint against nag-walls), age via shell arithmetic with a
`since <date>` fallback; (4) **held scope to the ticket's file set** —
did **not** edit the root `AGENTS.md` "Security baseline" playbook
(open question 2), because that would change the release class to a
root-template 3-way merge; parked as a wish-list follow-up.

**Rationale:** Visibility without age decays into wallpaper — the Hub
left a leaked API key tracked-but-unrotated ~7 weeks with perfect
visibility and zero pressure (banked evidence, ticket §Evidence). Age is
strictly **informational**: it never auto-escalates an item's position
(ordering stays dependency-driven — the Hub's explicit convention), so
the whole feature is a surfacing nudge, not a scheduler. `[security]` is
the one exception that nags on a task-focused Start A, because an
unrotated live exposure genuinely outranks the task. `project/backlog.md`
is `project-memory` (never overwritten on upgrade), so the grammar
addition ships with a manual Upgrade action; the four framework files
overwrite wholesale. MANIFEST unchanged (no files added/renamed).

**Alternatives considered:** Age reorders the queue — rejected (breaks
the dependency-ordering invariant; the ticket is explicit age is
informational). Per-item `[security]` banner lines — rejected
(nag-wall; the permanently-red-budget lesson). Editing the root
Security-baseline playbook now — deferred (changes release class;
parked). A date-parsing dependency — rejected (zero-runtime-deps rule;
shell arithmetic + `since <date>` fallback).

## 2026-07-16 — NEXT-CMD: `/next` shipped as a distributed workflow (3.16.0)

**Decision:** Shipped `pm_skills/integrations/next.md` — the one-word
"run the next backlog item" trigger — as a `framework`-class
integration (auto-jazz run). It composes three existing pieces with no
new mechanism: `session-start.md` → Start B (pick) → `task.md`
auto-jazz (build) → `end-of-task.md` (close). Decided at the ungated
gates: (1) **location** `integrations/` not `prompts/` — it is
invoked, not pasted (ticket open question, leaned integrations); (2)
**one item per invocation**, not burn-down-until-stopped — bounded,
matches "batch" semantics (ticket recommendation); (3) **invocation is
the go-ahead** — state the pick in one line and continue rather than
waiting for Start B's confirm (prototype behaviour). Wired GUIDE (file
tree + Pick section) and README (commands table); MANIFEST unchanged
(the `integrations/*` wildcard already classes it `framework`). This
repo's `.windsurf/workflows/next.md` rewritten to defer to the
distributed copy plus the `self/` path mapping, closing NEXT-CMD's
"Done when".

**Rationale:** The whole risk of a one-word gateless trigger is
normalising gateless runs, so the guardrail wording is the real work,
not the composition. The file makes four guardrails load-bearing and
non-optional: `[sign-off]` escalates to `full` mode, wish-list triage
still runs at the pick, the reconcile gate still holds, and `task.md`'s
hard prohibitions still stop-and-ask. Close stays `full` by default.
Minor bump (new backward-compatible file); Upgrade action is a single
file copy.

**Alternatives considered:** `prompts/` placement — rejected (pasted,
not invoked; the trigger is a command). Burn-down-until-stopped —
rejected (unbounded gateless runs are exactly what the guardrails
guard against; one item keeps each run auditable). A new mechanism
(dedicated pick+run engine) — rejected (the three composed workflows
already do it; the prototype proved composition works).

## 2026-07-16 — Roadmap refactor + wish-list triage (maintainer-approved)

**Decision:** Drained the wish-list (5 → 0) and re-ordered the backlog
by value, per maintainer sign-off ("yes to wishlist triage; re-order as
you see fit"). Promoted: **NEXT-CMD** (two `/next`-trigger captures
merged; → Current, first position, ticket created preserving the
archived-ROADMAP pointer) and **TICKET-GEN** `[spike]` (→ Next). Cut:
commit-and-push automation, and the maintainer-scratch-home question.
Current is now NEXT-CMD → ITEM-AGE → ARCH-INTEG; Next is TICKET-GEN →
PROCESS-TPL; DEPREC-SHIM, TASK-SIZING, and the three blocked items stay
iced. The brief's open question (was `/next` distribution) is resolved
by the promotion.

**Rationale:** NEXT-CMD leads — the maintainer asked for it twice and
the repo's own `/next` is a working prototype; ITEM-AGE / ARCH-INTEG
are cheap Medium-impact hardening. The spike precedes PROCESS-TPL so
evidence lands before the heavier `[sign-off]` design. Cuts: never-
auto-push is a settled framework stance (COMMIT-STEP covers the rest),
and the scratch-home revisit trigger (a second self-hosted case) is
already recorded under ADOPT-FIXES.

**Alternatives considered:** Keeping the cut items iced — rejected;
both have recorded stances/triggers, and the Icebox is post-triage
commitment, not a second inbox.

## 2026-07-16 — REPO-REVIEW: full source-tree review + memory refresh

**Decision:** Maintainer-directed full review (auto-jazz): all four
Node scripts, every distributed doc, configs, CI, hook, and the `self/`
memory. One defect found and fixed in **both** gen-file-map forks
(`scripts/` + `pm_skills/scaffold/`, per the deliberate-forks rule):
the role parser read the generated index block's section lines as path
roles, so any re-run over an existing map emitted a spurious "No longer
on disk" block — non-idempotent, contradicting the file header. Fix:
strip the index block before parsing roles; both forks verified
idempotent. One doc drift fixed: GUIDE/README described the scaffold as
wholly copy-once while `gen-file-map.mjs` runs in place (init Step 9
deliberately does not copy it). Shipped as patch 3.15.3. Memory was
audited against every budget — all green (48-file map ⇒ floor 2,000 vs
609 words; 6 log entries; 470 trajectory words; 5 wish-list items; 0
doc-deltas; 0 lite closes) — so the "purge" resolved to refreshing the
stale backlog placeholder, not archiving.

**Rationale:** The bug was upstream in the parser, not in the emitted
map, so the minimal fix is one function; the committed map was clean
(written by a first run), which is why the gate never caught it — only
a second run exposed it. Doc wording followed actual behaviour rather
than the reverse.

**Alternatives considered:** Filtering directory names out of the stale
list downstream — rejected (treats the symptom; index lines would still
pollute the roles map). Skipping the scaffold fork — rejected
(CONTRIBUTING's fork rule; same defect, same fix).

## 2026-07-16 — REVIEW-FIXES: first review pass over the self-host burst

**Decision:** Reviewed the three-commit burst SELF-HOST → 3.15.0 →
3.15.1 (`review.md`, range `83ca5cd..797075d`) — verdict: accept with
follow-ups. Three fixes applied: (1) the 3.15.1 changelog entry's
repo-specific `self/` reference reworded to repo-neutral prose,
shipped as patch 3.15.2; (2) a maintainer wish-list capture given its
trailing newline (the gate was red on MD047); (3) the seven saved
transcripts deduplicated (two byte-identical to archived copies
deleted) and renamed to the dated convention.

**Rationale:** The product-tree rule ("no distributed file may
reference `self/`") outranks the changelog's append-only guidance for
a same-day prose slip that leaves Upgrade actions untouched — the
append-only rule protects upgrade semantics, which did not change.
Boundary recorded: a *repo-specific* `self/` reference violates the
rule; a *generic example* (adopt.md Step 0's "e.g. `self/`" naming
the fork pattern) is intent-compliant and stays.

**Alternatives considered:** Leaving the published entry untouched —
rejected (a permanent letter-violation of a hard rule to preserve
prose history). Rewording adopt.md's example too — rejected (the
example is generic by construction and names the one proven pattern).

## 2026-07-16 — ADOPT-FIXES: one fix shipped, two closed why-not

**Decision:** Triaged the three findings from adopt.md's first real run
(SELF-HOST dogfood). Finding 1 (Step-0 misroutes the framework source
tree to upgrade.md, because its `pm_skills/VERSION` is the *product*)
shipped as patch 3.15.1 — a Step-0 "framework source tree" exception.
Findings 2 and 3 close **without** a distributed change:

- **Finding 2 (file-map generator scope).** The scaffold
  `gen-file-map.mjs` `IGNORE` list excludes `pm_skills/**` — correct for
  consuming projects, wrong where the product tree IS the source. The
  documented copy-it-out path (`scripts/gen-file-map.mjs`, tuned to map
  the product tree) resolved it; the knob worked as designed. No change.
- **Finding 3 (memory-home assumption).** adopt/init/session prompts
  assume the memory home is `pm_skills/project/`. Self-hosting needed a
  parallel home (`self/`) plus a path-mapping rule, but that is a
  repo-contract concern (`self/AGENTS.md`), not a prompt change, and
  this repo is the only known self-hosted case. Revisit only if a second
  self-hosted deployment appears.

**Rationale:** Only Finding 1 is a defect anyone reusing the flow would
hit; 2 and 3 are self-hosting edge cases the existing knobs and the repo
contract already cover. Keeps adopt.md's brevity discipline (one
sub-bullet, no new phase) per the ticket constraint.

**Alternatives considered:** Generalising the `self/` mapping into the
distributed prompts — rejected as speculative (single known case; would
bloat every consuming project's read for a maintainer-only concern).

## 2026-07-16 — CODEBASE-AUDIT: recipe, not a new prompt

**Decision:** Ship the whole-codebase audit as a `GUIDE.md` recipe
("Auditing the whole codebase") plus a short pointer note in
`review.md`'s Inputs, composing the existing pieces (review.md area
mode, refactor mode, the doc-deltas ledger) rather than a dedicated
`audit.md`. Chunk unit is the `file-map.md` section (top-level dirs
for adopt-tier repos with no generated map); the audit is
findings-only, aggregated into a cold dated report, triaged into
backlog/wish-list with structural items spun out as refactor tasks.
Minor release 3.15.0.

**Rationale:** The pieces already existed; the only gap was the outer
loop (enumerate → review each → aggregate → triage) — orchestration,
not new mechanism. A recipe keeps the framework surface small and
defers a prompt file until real use proves it under-specifies. Bounded
per-chunk read cost answers the banked read-cost lesson (Hub file-map
~9k words): a single unbounded pass is exactly the anti-pattern the
sectional file-map fixed.

**Alternatives considered:**

- A new `audit.md` prompt — more surface, duplicates area mode;
  deferred behind an evidence trigger.
- A `review.md` whole-repo mode — the orchestration is multi-session
  and sits above a single review, so it belongs in the GUIDE, not
  inside the per-chunk engine.

## 2026-07-16 — SELF-HOST: self/ is the repo's own deployment home

**Decision:** This repo's pm-skills deployment lives in a top-level
`self/` directory mirroring the standard layout (`self/AGENTS.md`,
`self/DEV-INFRASTRUCTURE.md`, `self/project/*`), with one documented
path-mapping rule. The pre-adoption memory (`user_crud`) is archived
verbatim at `self/archive/user_crud/`; its live content migrated into
the standard memory set. The adopted memory is lint-gated; only
`self/archive/**`, `self/evaluations/**`, and `self/_transcripts/**`
stay excluded.

**Rationale:** The standard deployment paths are occupied by the
product here — `pm_skills/` must stay a pristine distributed tree and
the root templates ship with placeholders intact — so the deployment
needs a parallel home that keeps the product/process boundary
mechanically obvious. Maintainer picked this structure at the
2026-07-16 gate ("the repo needs to manage the development of the
framework, but keep its own pm-skills deployment for project
management — clear and organised separation").

**Alternatives considered:**

- Reshape `user_crud` in place (the ticket's lean): keeps a
  meaningless name; conflicts with the maintainer's "retire
  everything else, keep user_crud as archive" direction.
- Make `pm_skills/project/` the real memory and move blank templates
  elsewhere: a breaking product restructure driven by this repo's
  convenience; rejected.

## 2026-07-16 — Decisions carried from the retired ROADMAP

Carried verbatim-in-substance from the retired scratch roadmap
(archived at `self/archive/user_crud/ROADMAP.md` — full reasoning in
the case study it cites). Do not re-litigate:

- **REAL-TRAJ** — CLOSED. Executed by the Hub case study; re-run on
  the *next* consuming project. Self-hosting makes this repo that
  project.
- **FMT-CONV** — DECLINED. Backlog-grammar checker adds gate friction
  for marginal gain; revisit only if tooling parses the backlog
  programmatically.
- **DATA-MIG / TEST-DOC / CL-HORIZON** — DEFERRED with triggers; held
  as blocked Icebox items in `self/project/backlog.md`.
- **Ticket archiving** — maintainer call: archive shipped tickets,
  never delete (durable conclusions still fold into the CHANGELOG
  entry). Home going forward: `self/project/archive/tickets/`.

## 2026-07-16 — Adopted pm-skills (self-hosted)

**Decision:** Adopted pm-skills onto its own repository via
`pm_skills/integrations/adopt.md`; project memory reverse-engineered
from the source tree, git history, and the pre-adoption scratch
roadmap (reverse-engineered — verify). Session loops now run the
standard prompts with the `self/` path mapping instead of the
ROADMAP kick-off analogue.
