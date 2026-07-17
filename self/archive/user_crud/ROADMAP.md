# PM Skills — Development Roadmap (scratch)

<!-- ARCHIVED 2026-07-16 (SELF-HOST). This file and the whole
     user_crud/ tree are frozen: the repo now runs its own pm-skills
     deployment in self/ (contract: self/AGENTS.md). Live content
     migrated to self/project/ — backlog.md (open waves + Later),
     wish-list.md (Inbox), decision-log.md (Settled + kick-off
     provenance), trajectory.md (Shipped), tickets/ (open detail
     files). The SESSION KICK-OFF block below is retired; its
     close-out checklist lives on in self/AGENTS.md → "End-of-task
     extension". Do not edit this tree. -->

<!-- Internal scratch (user_crud/) — TRACKED in git since 2026-07-16
     (versioned backup; see evaluations/2026-07-16-recent-dev-review.md
     P1) but source-only: NOT distributed, NOT a project-memory
     template, and excluded from the lint gate. This is the framework's
     single self-development file: kick-off prompt, roadmap, and
     decision record in one. Shipped work is recorded in
     pm_skills/CHANGELOG.md + git.

     PROVENANCE: rebuilt 2026-07-16 from the Digital Art Audience Hub
     case study (evaluations/2026-07-16-hub-case-study.md — exhaustive
     read of ~200 archived decision-log entries, 148 Hub commits, all
     memory files). The prior roadmap is archived verbatim at
     roadmap_old.md. Every open item has a detail file at
     tickets/<ID>.md carrying its evidence, approach, constraints, and
     grades — READ THE TICKET before scoping an item; do not re-research
     the Hub.

     SESSION KICK-OFF (self-hosting analogue of session-start.md Start B —
     paste "follow user_crud/ROADMAP.md" into a fresh chat, or invoke
     the /next workflow: .windsurf/workflows/next.md points here and
     adds nothing — this block stays the single source of truth):
     1. Load: this file; the top 2–3 pm_skills/CHANGELOG.md entries;
        pm_skills/VERSION; AGENTS.md (skip if already a global rule); the
        ticket file for the item you pick; the process prompts you'll use.
     2. Verify before trusting: reconcile this file against VERSION, the
        top CHANGELOG entry, and git status / recent log. Fix drift here
        first. Never write version-pinned snapshots into this file.
     3. Pick: Current focus first, then top of the earliest open Wave,
        then Later/minor. If all empty, triage the Inbox.
     4. Present concisely — what's next, what it touches, recommended
        process (4-stage vs quick-task), release class — then STOP and
        wait for go-ahead.
     5. When shipping, close out with this LITERAL CHECKLIST — tick
        every line in the closing report (protocol adherence degrades
        on weaker models when this is prose; see MODEL-TIER):
        [ ] pm_skills/VERSION bumped; CHANGELOG entry prepended with
            Upgrade actions.
        [ ] MANIFEST.md / GUIDE.md synced if files were added, renamed,
            or removed.
        [ ] npm run check green AFTER the last edit (including this
            file's own update).
        [ ] Release consistency check: every changed distributed file
            is named in the top CHANGELOG entry; VERSION == top entry.
        [ ] Finished item moved to Shipped here; its ticket file
            moved to tickets/archive/ (maintainer call 2026-07-16:
            archive, never delete — durable conclusions still fold
            into the CHANGELOG entry).
        [ ] Commit proposed with a staged-set echo (files staged vs
            files touched) — committing is the maintainer's call;
            propose, don't auto-run.

     Ticket grammar mirrors pm_skills/project/backlog.md:
       - **ID Short title** [flags] — one-line intent · grades.
         Detail: tickets/<ID>.md
     Status: [ ] todo  [~] in progress  [-] cut.
     Grades key (from the case study): Impact / Difficulty / Risk / OpΔ
     where Impact = operational improvement to consuming projects and
     OpΔ = change to the maintainer's day-to-day operation. -->

## Banked context (case-study evidence — cite, don't re-research)

Full analysis: `evaluations/2026-07-16-hub-case-study.md` (§ refs below).
Hub repo: `…/Jen and Jones/2026-02-25 Nottingham Contempory AI
Exhibition/Digital Art Audience Hub` (pm-skills 3.1.1; 148 commits
2026-02-28 → 07-08; 2,002 tests; ~200 shipped items; two live shows).

- **Bypass incident** (→ MEM-MAINT): July feedback batch shipped with a
  declared memory-update bypass; backlog later reconciled against git
  (Hub commit `d02ad15`); repayment session `dc73aa3` (2026-07-08)
  backfilled trajectory + repaired OneDrive #7. Case study §3.1.
- **Sync corruption** (→ ENV-PREFLIGHT, MULTI-WRITER): ≥7 recorded
  OneDrive incidents incl. a `.git` divergence (2026-05-29, recovery
  branch `recovered-0529-work`) and mid-task stale-reverts #3/#4/#5
  (2026-07-05, `*-Joe's MacBook Pro.*` conflict copies) and #7
  (2026-07-08, 19 files, trajectory content loss). §3.4.
- **Silent record loss** (→ ARCH-INTEG): the four 2026-06-23/24
  decision-log entries (Stage epic, DEP-9/DEP-10) were dropped by Hub
  commit `15dfabe` and exist in no archive; trajectory still points at
  them ("See decision-log 2026-06-23"). Recoverable via
  `git show 2dbbb52:pm_skills/project/decision-log.md`. §3.5.
- **Permanently-red budget** (→ BUDGET-SCALE, FILEMAP-GEN): Hub
  `file-map.md` ≈ 8,962 w vs 2,000 hard budget, "accepted floor" for a
  ~180-file project; hot session-start read ≈ 26,000 words, file-map
  ≈ 35 % of it. §3.2, §7.
- **Stalled human-owned item** (→ ITEM-AGE, SEC-BASE): SEC-1 leaked
  `OPENAI_API_KEY` in git history, standing Active since 2026-05-20,
  unrotated at HEAD. The Hub's own secrets machinery (WL-2
  `.env.secrets` + `scripts/scaffold-env.sh`) is the pattern to
  generalise. §3.6.
- **Protected-doc drift** (→ DOC-SYNC): SPEC §6 trails the code
  (11-entity model vs 9 documented); ADR-003/006 "formal closure"
  pending since 2026-05-19; ADR-008/013 amendments pending; DOC-1 drift
  inventory = 13 KB ticket (4× soft cap), deferred since early July. §3.3.
- **Consolidation muscle-memory break** (→ DEPREC-SHIM): after 3.0.0
  deleted `auto-jazz.md`, a July session was invoked against the
  archived backup copy of the old file
  (`archive/upgrade-backup-2026-07-04-1400/...`). §3.7.
- **Refactor/spike precedents** (→ REFACTOR-MODE, SPIKE): HELP-9 GUI
  rebuild preserved ~70 element IDs as an ad-hoc contract; REC-VERIFY +
  NET-1 were exemplary findings-only spikes that had to bend task.md.
- **What already works — don't fix:** lossless prunes with diff
  verification; wish-list triage (drained to zero); hard prohibitions
  (every dep add gated: better-sqlite3, c2pa-node, system-ffmpeg-over-
  npm, puppeteer-core); upgrade mechanism (8 clean upgrades incl. the
  2.0.0 migration + Shell-safety relocation); parallel sessions via
  declared disjoint file sets. §2.

## Inbox (untriaged captures — one line each)

- consider making "/next" part of the pm-skills framework itself. the reason is the following prompt works really well: use @session-start.md as the process to work on pm-skills itself, as a framework to work on the framework. Progress through the @ROADMAP.md  starting with the first to-do item, check the corrosponding file in @tickets for context, autojazz the work except where you need my input, then close out the development task -- if it can fit the project idealogy, doesn't present a conceptual issue, if there is merit, then please add to the roadmap. it's very handy to be able to burn through a roadmap in this fashion, saving time and tokens. if not viable or a good idea, please retain the entirity of this note for future consideration to give a simular one word signal for progress in this fashion.
- are tickets for roadmap items generated reliably enough? are there scenarios where they dont get made / context isn't flesht needed?
- should there be more commit and push to git as part of the framework? currently has a lot of manual input
- should there be somewhere like user crud as part of the pm-skills framework?

## Current focus

- (empty — Wave 4 complete; next pick: Wave 5, SELF-HOST.)

## Waves 1–3 — the 2026-07-16 burst (complete, retired)

All eleven items shipped same-day as 3.2.0–3.12.0 (+ 3.12.1 fixes):
MEM-MAINT, ENV-PREFLIGHT, BUDGET-SCALE, FILEMAP-GEN · ADOPT,
TRANSCRIPTS, SEC-BASE · SPIKE, REFACTOR-MODE, REVIEW-AREA, DOC-SYNC.
Records in Shipped below + CHANGELOG; burst retrospective in
evaluations/2026-07-16-recent-dev-review.md.

## Wave 4 — process hardening (complete, retired)

Evidence-raised: each failure mode occurred on THIS repo on 2026-07-16
(evaluations/2026-07-16-recent-dev-review.md W1–W3). All three items
shipped: COMMIT-STEP (3.13.0), MULTI-WRITER (3.14.0), MODEL-TIER
(3.14.1). Records in Shipped below + CHANGELOG.

## Wave 5 — self-hosting & holistic review (next phase, part 2)

Both from the maintainer's 2026-07-16 captures. SELF-HOST first —
CODEBASE-AUDIT's first real target is then the self-hosted repo
itself.

- [ ] **SELF-HOST Framework repo adopts its own memory** [decision
  needed: ROADMAP-vs-backlog + gate posture] — run adopt.md on this
  repo; real session loops replace the scratch-file analogue; first
  real ADOPT-tier dogfood · Med-High / Medium / Medium / High.
  Detail: tickets/SELF-HOST.md
- [ ] **CODEBASE-AUDIT Whole-codebase review pass** [decision needed:
  GUIDE recipe vs review.md whole-repo mode] — chunked holistic audit
  composing review.md area mode; findings-first, never silent edits ·
  Medium / Medium / Low / Low. Detail: tickets/CODEBASE-AUDIT.md

## Later / minor

Unordered pool — promote into a wave at pick time.

- [ ] **ITEM-AGE Standing-item ageing** — `[maintainer]`/`[sign-off]`
  items show age at the batch pick; `[security]` banner escalation ·
  Medium / Low / Low / Low. Detail: tickets/ITEM-AGE.md
- [ ] **ARCH-INTEG Archive-integrity check in Diagnose** — verify
  dated decision-log references resolve; INDEX coverage · Medium /
  Low / Low / None. Detail: tickets/ARCH-INTEG.md
- [ ] **PROCESS-TPL PROCESS.md slot / ADR protocol** [decision needed:
  template vs absorb] — first-class home for macro phases + ADR
  closure protocol the Hub had to invent · Med-High / Medium / Low /
  Low. Detail: tickets/PROCESS-TPL.md
- [ ] **DEPREC-SHIM Deprecation shims on consolidation** — upgrade
  offers workflow-dir cleanup / tombstones for removed files ·
  Low-Med / Low / Low / None. Detail: tickets/DEPREC-SHIM.md
- [ ] **TASK-SIZING Size hint for task scope** — `size:
  minimal|medium|large` calibrates option breadth, never gates or
  prohibitions · Low-Med / Low / Low-Med / Low.
  Detail: tickets/TASK-SIZING.md

## Settled — closed / deferred / declined (don't re-litigate)

Decisions already made at the 2026-07-16 triage; reopen only if a
stated trigger fires. Full reasoning: case study Addendum A, Tier C
(this section's former name).

- [x] **REAL-TRAJ** — CLOSED. Executed by the Hub case study
  (`evaluations/2026-07-16-hub-case-study.md`); its "Done when"
  (findings recorded + triaged into this roadmap) is satisfied by this
  rebuild. Re-run on the *next* consuming project, not the Hub.
- [-] **FMT-CONV** — DECLINED. The 2.0.0/3.0.0 ticket grammar sufficed
  for ~200 Hub items; only formatting debt was a one-off flags-legend
  normalisation (Hub `573e76d`). A format checker would add gate
  friction for marginal gain. Revisit only if tooling ever parses the
  backlog programmatically.
- [ ] **DATA-MIG** — DEFERRED with trigger: *first consuming project
  with persistent user data*. No observed Hub pain (append-only log +
  rebuildable projections is itself a migration posture). When
  triggered: hard rule "no irreversible data change without a
  documented backout" + DEV-INFRASTRUCTURE section reusing the
  upgrade.md Step-8 snapshot → propose → execute → reconcile shape.
  Grades then: High / Medium / Low / Low.
- [ ] **TEST-DOC** — DEFERRED / cut down. Doctrine already explicit in
  `AGENTS.md` → Testing (1.3.0) and behaved well on the Hub (2,002
  tests, honest "not applicable" use, no coverage theatre). If ever
  done: one cross-reference paragraph in the DEV-INFRA Quality-gate
  section, nothing more.
- [ ] **CL-HORIZON** — ICEBOX unchanged. CHANGELOG ~11.5k words, cold
  outside upgrades; the upgrade path reads only the version gap.
  Trigger stands: revisit past ~20k words.

## Shipped (recent context — see CHANGELOG for detail)

- **3.14.1** — MODEL-TIER (Wave 4 tail): model-tier guidance,
  guidance-only. GUIDE "Looking after project memory" paragraph +
  `memory-maintenance.md` shared-rules header line: mechanical halves
  (counts, greps, detect/execute/verify, log harvesting) run cheap;
  judgement steps, **propose** steps (Prune P2 / Refactor R3 /
  Reconcile RE3), and multi-step protocol closes want the stronger tier
  — protocol adherence degrades first on cheap models (burst W2
  evidence). Per-step, not per-session. No new files; MANIFEST
  unchanged. Ticket → tickets/archive/. Patch.
- **3.14.0** — MULTI-WRITER (Wave 4): parallel-session + multi-machine
  hardening. Turns memory-policy's "one writer at a time" rule into a
  mechanism — session-start "Parallel-session claim" (declare file set +
  check `git status` + state provenance of uncommitted changes, "unknown"
  → treat as external code: the exact same-repo failure from burst W1);
  end-of-task "Secondary-session close" `Handoff:` block (secondary defers
  memory writes for the primary/Reconcile to apply); GUIDE "Parallel and
  multi-machine work" (git is the sync channel not the filesystem; arrival
  procedure; single-worktree concurrency limitation); task.md step-11
  `git add -A` caveat. Advisory-only — no `.claims` lockfile (open
  question resolved to the manual pattern; add only if a real collision
  recurs). No new files; MANIFEST unchanged. Ticket → tickets/archive/.
  Minor.
- **3.13.0** — COMMIT-STEP (Wave 4): per-task commit checkpoints in
  `integrations/task.md` (new step 11). Recommend-commit only, never
  auto-commit/push; message shape aligned with the `Close: lite` trailer
  grammar; **staged-set echo** (staged vs touched, flags the 3.12.0-style
  changelog omission); shell-safety one-`-m`-per-line example; long-run
  per-milestone checkpoint mirroring `init-mvp.md`; non-git skip.
  `end-of-task.md` report gains a commit-status line; GUIDE daily-loop
  "Commit as you close" paragraph. No new files; MANIFEST unchanged.
  Ticket → tickets/archive/. Minor.
- **3.12.1** — burst-review consistency fixes: spike closes full with a
  reduced surface (never lite — the lite trailer broke Reconcile RE4);
  generator path corrected to `pm_skills/scaffold/gen-file-map.mjs`
  everywhere (old short path resolved from no project root); upgrade.md
  Step 3 now copies NEW scaffold files named by a changelog entry (the
  3.5.0 copy action was a dead letter); session-start Start B mode list
  += refactor; init.md Step 11 mode list += spike/refactor. From the
  recent-dev review (evaluations/2026-07-16-recent-dev-review.md).
  Patch.
- **3.12.0** — DOC-SYNC: protected-doc sync loop. New cold-tier
  `pm_skills/project/doc-deltas.md` ledger (capture-only, one checkbox
  line per delta); `end-of-task.md` step 3 captures a delta when a task
  changes behaviour a protected doc describes; `session-start.md` Start B
  surfaces `doc-deltas: N open, oldest DATE`; a 5th `Doc-sync` verb in
  `memory-maintenance.md` (DS1–DS6) presents each doc's batched diff for
  per-doc sign-off, applies, and ticks lines; Diagnose check 11 +
  Prune P2 handling; `memory-policy.md` budget row (10 open / 30 days);
  `review.md` feature-area doc-currency check feeds the ledger; MANIFEST
  row + AGENTS cold-tier bullet + GUIDE wiring. Ledger is capture-only
  (DOC-1 lesson — edit derived fresh at sync time, never stored); nothing
  auto-edits a protected doc. Upgrade action includes the optional
  one-time DOC-1 → ledger fold for the Hub. Ticket folded into this entry
  and the CHANGELOG; deleted. Minor.
- **3.11.0** — REVIEW-AREA: `review.md` accepts a feature area (name +
  IDs/entry points) as review scope, not just a diff range. Load step
  assembles the change set (`git log --grep` per ID + unioned files +
  matching trajectory/decision-log entries) and states it before
  auditing; intent map groups by ticket ID; contract audit gains a
  protected-doc currency check (the open question's lean — one
  punch-list line, full ledger stays a DOC-SYNC task). One-way-each
  cross-ref with MEM-MAINT (Reconcile RE6 suggests a feature-area review
  of the reconciled batch). Wiring: GUIDE file-tree + "after an
  autonomous run" section. review.md + memory-maintenance.md + GUIDE
  only; MANIFEST unchanged. Minor. Ticket folded into this entry and the
  CHANGELOG.
- **3.10.0** — REFACTOR-MODE: behaviour-preserving `refactor` mode in
  task.md. Gates like checkpoint (scope = declared surface; option =
  restructuring shape); fixed acceptance criterion (observable
  behaviour unchanged); >5-file prohibition lifted within the declared
  surface only; named preservation contract (tests green before/after,
  no event/data/API/route delta, preserved-interface grep list,
  build-artefact sanity) + green-check baseline precondition. Open
  questions resolved to leans: checklist inline in task.md,
  validation.md stays generic with a pointer, GUIDE disambiguates the
  mode from memory-maintenance's Refactor verb. Wiring: validation.md
  Rules pointer + GUIDE mode table/file-tree rows. MANIFEST unchanged
  (no new paths). Minor. Ticket folded into this entry and the
  CHANGELOG.
- **3.9.0** — SPIKE: timeboxed spike mode in task.md (findings as
  deliverable, throwaway code, closes lite). Shipped 2026-07-16.
- **3.8.0** — SEC-BASE: security baseline as the 5th tiered
  build/run/ship capability. `AGENTS.md` hard rule + anti-pattern
  (secrets outside the repo; never in URLs/logs/QR/diagnostics;
  committed template values are placeholders; dependency advisories
  triaged on a cadence + at upgrade; rotate-first on a leak,
  cross-refs diagnostics redaction). `DEV-INFRASTRUCTURE.md` "Security
  baseline" section (Tier 0–2: secret storage, `.env`/`.gitignore`
  placeholder discipline, report-only key-shape scan folded into
  `check`, dependency-audit cadence) + rotation-first response
  playbook. Wiring: init.md Step 8 item (renumbered 7–14) + Step 10
  checkbox + Appendix-B example; deploy.md pre-flight points at the
  section; scoping.md secret-surface flag; validation.md "Secret
  surface" check (item 6). Open questions resolved to leans: scaffold
  secret-compose script deferred (document-only for now); key-shape
  grep folded into the placeholder scan / `check`. cspell += AKIA,
  gitleaks, trufflehog, unrotated. MANIFEST/GUIDE unchanged (no new
  paths). Minor. Ticket folded into this entry and the CHANGELOG.
- **3.7.0** — TRANSCRIPTS: chat-transcript archiving convention.
  `_transcripts/` folder at project root (naming
  `YYYY-MM-DD-<ITEM-ID-or-topic>.md`, cold tier, gitignored by default,
  redact-before-commit); new GUIDE "Saving session transcripts" section;
  AGENTS cold-tier bullet; scaffold `.gitignore` ignores the folder;
  end-of-task report gains a non-blocking save reminder. Documented
  habit only — no scripts, no new prompt file (tool-dependent export).
  Internal roadmap IDs kept out of distributed docs (reworded to
  "retrospective evaluation"). MANIFEST unchanged. Minor. Ticket folded
  into the CHANGELOG entry and deleted.
- **3.6.0** — ADOPT: existing-codebase adoption flow. New
  `pm_skills/integrations/adopt.md` — Step 0 detects prior pm-skills and
  routes to upgrade; Phase 1 read-only inventory (file-map via
  gen-file-map, stack from manifests, trajectory seed from git log,
  brief linking existing docs, conventions by sampling) with a
  per-directory read-cost cap; Phase 2 single batched gap interview
  (~8 Qs) writing memory with one seed decision-log entry +
  `(reverse-engineered — verify)` markers; Phase 3 init.md Step-10
  readiness → hand off to Start B. Adopt-only (no build band); proposes
  never overwrites; degrades without git history. Open questions all
  resolved to the ticket's lean answers (integrations placement,
  adopt-only v1, step-0 upgrade route). Wired into init.md / GUIDE /
  README; MANIFEST unchanged (integrations glob). cspell dictionary +=
  Dockerfiles, pyproject. Minor. Ticket folded into this entry and the
  CHANGELOG.
- **3.5.0** — FILEMAP-GEN: generated, sectional file-map. New
  `pm_skills/scaffold/gen-file-map.mjs` (zero-dep, `git ls-files`,
  directory-grouped sections, path-keyed role merge, `(role needed)` for
  new files, stale-path flagging, `<!-- file-map-index -->` block with
  counts, `--stdout` dry preview, `IGNORE` knob). `file-map.md` moved
  from hot whole-file to hot sectional (index + touched sections;
  whole-file only for cross-cutting) in AGENTS.md + session-start.md;
  end-of-task offers the generator; template carries the index anchor;
  memory-policy reads file count from the index; GUIDE/README trees
  updated. No MANIFEST change (scaffold glob). Minor. Ticket folded into
  this entry and the CHANGELOG.
- **3.4.0** — BUDGET-SCALE: scale-aware memory budgets. `file-map.md`
  budget = ~35 words × mapped files (floor 2,000), re-derived each
  check — measures noise not size, kills the permanently-red alarm
  class (Hub's ~180-file map now budgets ~6,300 and reads green at its
  stripped floor). Decision-log secondary guard = any single entry
  > ~600 words (runaway-entry detector), replacing the ~6,000-word
  file guard that tripped on healthy density. Substance in
  `memory-policy.md` (+ new "Deriving the file-map budget" section);
  wording sync in end-of-task.md + memory-maintenance.md; check prints
  the derivation. No new files; MANIFEST/GUIDE unchanged. Minor.
- **3.3.0** — ENV-PREFLIGHT: environment & sync-conflict preflight +
  repair playbook. Canonical "Environment preflight (shared)" block in
  memory-maintenance.md (E1 detect → E2 classify/repair → E3 record);
  warn-only at session-start, blocking in Prune P3 + Upgrade Step 5;
  AGENTS "Hostile-filesystem guard" hard rule; GUIDE Quick-answers
  pointer. No new files; MANIFEST unchanged. Minor.
- **3.2.0** — MEM-MAINT: sanctioned lite close + Reconcile verb.
  `Close: lite` commit trailer (gate + boot run; memory writes deferred)
  in end-of-task.md; 4th `Reconcile` verb in memory-maintenance.md
  (git-log back-fill, lossless ID check, marker); session-start count +
  hard cap (5 closes / 7 days in memory-policy.md); task.md
  `close: lite|full` inference; AGENTS/GUIDE wiring. Minor.
- **3.1.1** — upgrade.md Step 0 names the public GitHub repo as the
  default upgrade source; GUIDE mirrors. Patch.
- **3.1.0** (`bf4376b`) — Traceable version identity: 4th build/run/ship
  capability; two-part product version + build identity; AGENTS hard
  rule + DEV-INFRA section (Tier 0–2); deploy.md version-stamp/match.
- **3.0.0** — Token-efficiency + consolidation (48 → 36 files;
  integrations 10 → 3): task.md modes (full/checkpoint default/
  auto-jazz/-lite); memory-maintenance.md verbs (Diagnose/Prune/
  Refactor); session-start absorbs next-batch + corrections; init-mvp
  absorbs spec-to-prod (bands 0–3); init.md absorbs init-project;
  memory-policy.md extracted; headings-first decision-log read;
  end-of-task fast path; be-terse rules.
- **2.8.0** (`0c86726`) — per-item `[detail]` ticket files
  (`pm_skills/project/tickets/`, cold tier, lifecycle-evicted).
- **(source-only)** — npm-audit override pins (js-yaml `^4.2.0`,
  markdown-it `^14.2.0`, `fde054a`); quality-gate tooling: cspell +
  editorconfig-checker + check-paths.mjs wired into lint/check + CI
  (`9b81c751`).
- Older (2.7.x and below): see `pm_skills/CHANGELOG.md` + git history.