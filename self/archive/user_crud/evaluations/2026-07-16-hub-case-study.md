# pm-skills evaluation — Digital Art Audience Hub case study

**Date:** 2026-07-16 · **Evaluator:** Cascade (agent-run analysis, exhaustive evidence read)
**Framework:** pm-skills v3.1.1 (this repo) · **Case project:** AI Jam Exhibition System v2
(`…/2026-02-25 Nottingham Contempory AI Exhibition/Digital Art Audience Hub`)

---

## 0. Method and evidence base

Everything below is grounded in on-disk artefacts; no chat-session data exists for May–June
(see §9 Evidence gaps).

| Evidence | Volume read |
| --- | --- |
| Framework repo: README, GUIDE, MANIFEST, memory-policy, init.md, all 13 prompts, 3 integrations, CHANGELOG (1,520 lines), git log (47 commits) | full |
| Hub rulebooks + docs: AGENTS.md (534 lines), PROCESS.md, SPEC.md structure, README, DEV-INFRASTRUCTURE, UI-STANDARDS, project_manual, 15 ADRs (headings), runbooks | full / structural |
| Hub active memory: brief, architecture, conventions, backlog, decision-log, trajectory, file-map, wish-list, event-names, tickets/DOC-1 | full (~26,000 words) |
| Hub archives: **all 9 archived decision logs (~700 KB, ~200 entries, 2026-05-02 → 2026-07-05)**, archive INDEX, backlog-shipped, 6 trajectory archives, 5 file-map snapshots | full (decision logs); index-level (file-maps) |
| Hub git history: 148 commits (2026-02-28 → 2026-07-08), tags, branches, `git log -S` forensics | full |
| Secondary: `legacy/` (v1 assets), `archive_sessions/` (10 runtime sessions), sibling `Windsurf/` sync-residue folder, `_user files/chat trajectories/` (12 July transcripts), `user_crud/ROADMAP.md`, GitHub remote | sampled |

Scale of the case: **148 commits over ~10 weeks of v2 work, ~200 shipped backlog items across
30+ epics, 0 → 2,002 tests, 15 ADRs, 8 framework upgrades (unversioned → 3.1.1), two live
shows run off the codebase (2026-06-05 rehearsal-grade, 2026-07-08 show-grade).**

---

## 1. Timeline — how the Hub and the framework co-evolved

The single most important structural fact: **the Hub is not merely a consumer of pm-skills; it
is the forge the framework was hammered in.** The framework repo was created 2026-04-13, weeks
*after* the Hub's v1 (Feb–Mar). Versioning only began 2026-05-28, four weeks after the Hub
installed an unversioned copy.

| Period | Hub | Framework |
| --- | --- | --- |
| Feb–Mar 2026 | v1 built fast, ran a real show. Commit hygiene poor (`Update: 6 added,14 modified`). 1,600-line monolith, parallel state arrays — the debt that motivated everything after | did not exist |
| April | Spec-writing offline (SPEC.md v0.2 + 10 ADRs). **Zero commits** | repo created 2026-04-13; templates drafted; dormant after 2026-04-16 |
| 2026-05-02/03 | v1 wiped to `v1-final` tag; pm-skills installed; PROCESS.md ratified; Phase A done in a day; a single "depth-first" session ships M2–M5 (55 tests) | unversioned |
| 2026-05-04 → 20 | Feature/bug rounds; **17 days of work in ~2 commits**; leaked `OPENAI_API_KEY` found (SEC-1); one bug fixed via ad-hoc chat with an honest process retrospective appended | prune + auto-jazz workflows added upstream 2026-05-27 (mirroring what the Hub was already improvising) |
| 2026-05-28 → 31 | Upgrades none→1.0.0→1.1.0; "Shell safety" custom rule relocated to a root template (the customisation mechanism worked); parallel Cascade sessions begin; first OneDrive `.git` corruption (recovery branch + "keep the repo out of OneDrive" recommendation — never actioned) | v1.0.0 (versioning), 1.1.0 (wish-list), 1.2.0 (init-mvp), 1.3.0 (testing doctrine) — released in 4 days, all shapes taken from Hub practice |
| 2026-06-01 | 2.0.0 upgrade + migration: the 23,047-word backlog (157 shipped `[x]` vs 20 open) compressed to a 1,221-word open-work queue with a lossless ID reconcile; 9+ decision entries in one day; two parallel sessions coordinating by declared disjoint file sets | **2.0.0** "memory metabolism" — designed directly from the Hub's pathological backlog |
| 2026-06-03 → 05 | Voice-transcript intake → 12 tickets/3 tiers; live show 2026-06-05: two root-cause hotfixes under a no-restart constraint (default-Closed artists; cloudflared bodyless-POST 415) | 2.1.0 (budget recalibration — "alarms no legal prune could clear"), 2.2.x (deploy, archive-chunk fix citing the Hub's own files) |
| 2026-06-13 → 19 | Rehearsal harness v1/v1.1/UI (S0–S6, G0–G4); GATE-1; overnight auto-jazz code review against a live show; 2.7.3 upgrade + prune | 2.3.0–2.7.3: runtime recovery, diagnostics, quality gate, lint baseline — each generalising a Hub capability |
| 2026-06-23 → 07-03 | Stage epic + named tunnel + venue visit (QUIC blocked); **the 4 decision-log entries for this period were later dropped by commit `15dfabe` and now exist only in git** | 2.8.0 tickets/`[detail]` (Hub adopted only for DOC-1) |
| 2026-07-03 → 05 | Triple upgrade 2.7.3→3.1.1; v-next pivot: 12 epics/~34 tickets in 6 dependency-ordered waves, burned down in ~3 days mostly auto-jazz; OneDrive incidents #3, #4, #5 mid-task, each repaired and logged | **3.0.0** token-efficiency + consolidation (48→36 files, checkpoint default) from an external review; 3.1.0 version identity |
| 2026-07-06 → 08 | Feedback batch shipped in a rapid multi-commit run with a **declared memory-update bypass**; backlog later reconciled against git (`d02ad15`); maintenance session repairs OneDrive #7 and backfills the record; show runs 2026-07-08; same-day bug diagnosis from show artefacts (REC-FPS-1 ~1 fps probe) | — |

Commit distribution: Feb 6 · Mar 9 · Apr 0 · May 26 · Jun 46 · Jul 61 — granularity and
traceability improved monotonically.

---

## 2. What worked well

### 2.1 The decision log is the single highest-value artefact

~200 entries, all with Decision / Rationale / Alternatives-considered / Link / Verification.
Demonstrated pay-offs, not hypothetical ones:

- **Regression archaeology.** The 2026-07-08 `LAN-1` fix traced a broken Helper switch to the
  2026-07-04 `/api/health` CORS-removal *decision*, three days and ~30 commits earlier —
  root-caused in one session because the removal had a written rationale.
- **Invariant defence.** MOD-1 (operator-typed macro prompt) was flagged as conflicting with a
  hard invariant; four options were put to the maintainer and the override recorded *before*
  any code — the invariant edit was sequenced doc-first per PROCESS §3.5.
- **Honest deviation records.** The 2026-05-20 bug fixed as ad-hoc chat carries a written
  process retrospective; the 2026-06-04 REC-5 first attempt that "skipped the pm-skills gates"
  was reverted in full and re-run through the four stages, and says so.

### 2.2 Scope control genuinely operated

- "Smallest useful scope" is visible in outcomes: one-line CSS fixes shipped as one-line fixes
  (WL-10, AW-TILE-1 root-caused to a selector specificity clash rather than rebuilt).
- Out-of-scope pressure was systematically diverted: wish-list rounds 1–5 plus the intake
  triages absorbed ~80 raw ideas into coded, provenance-tagged tickets; the wish-list is
  empty at HEAD (drained by triage, exactly as designed).
- Hard prohibitions held. Every runtime dependency crossing is visible and gated:
  `better-sqlite3` (ADR-001), `@contentauth/c2pa-node` ("first new runtime dep since the Hub
  stack", spike-proven), system ffmpeg chosen *over* an npm dep to honour the zero-dep default,
  `puppeteer-core` maintainer-approved. No silent dependency ever appears in the log.

### 2.3 Compress-on-ship + tiered reads kept a 5-month memory usable

The 2.0.0 migration is the flagship: a 23,047-word backlog that was ~95 % shipped narration
became a 1,221-word open-work queue, with a **byte-identical snapshot and a line-anchored ID
reconcile proving zero loss**. Nine subsequent prunes repeated the lossless pattern
(diff-verified splits, archive INDEX maintained). At HEAD, an agent can answer "what's next"
from a 1,658-word backlog despite ~200 shipped items behind it.

### 2.4 Continuity and multi-session coordination

- New sessions resumed mid-epic routinely; the backlog + latest-entries read was sufficient
  context in practice (July trajectories show session-start → grep decision-log headings →
  targeted file reads → work, with no re-derivation of settled decisions).
- **Parallel sessions** (two Cascades at once) worked via explicitly declared disjoint file
  sets, recorded per entry ("Collision-safety" paragraphs); the one mid-flight collision
  (LINKS-2 build break during BIND-1b) was surfaced, not silently overwritten.
- Second-machine work (`ROOT-ARTIST` via `b871d2f`, HELPER-LINKS) was verified coherent and
  folded in with its own decision entries.

### 2.5 The framework↔project feedback loop is real and fast

Every 1.x–2.x release maps to a named Hub pain: 2.0.0 (its backlog), 2.1.0 (its
permanently-red budgets), 2.2.1 (its `decision-log-2026-06-01-b.md` split absurdity, cited by
name), 2.3.0/2.4.0 (its boot scripts and diagnostics), 2.5.0 (its auto-jazz review debt),
2.7.2 (its QT escalation gap), 3.0.0 (its echo-drift bug class and token bills). Median
pain→release latency: **days**. This is dogfooding operating as designed.

### 2.6 Verification discipline scaled with autonomy

- Tests grew 0 → 2,002 with the invariant-led doctrine visibly applied: regression test per
  fixed bug (the `v`-flag regex bug got the exact assertion that would have caught it),
  negative privacy assertions ("no `display:*` broadcast carries text"), replay round-trips.
- As gating loosened (checkpoint → auto-jazz through July), verification *tightened*: every
  entry ends `typecheck 0 · N tests · build 0`, and the purpose-built **rehearsal harness**
  (S0–S11 + G0–G4) gave a one-command LIVE-READY verdict before the show — the project's own
  answer to "how do I trust autonomous output", complementing `review.md`.
- Commit messages carry the gate results, making `git log` a verification ledger.

### 2.7 Upgrades were safe in practice

Eight upgrades, each with provenance, Step-4 customisation checks, dirty-tree backups, and no
memory loss *through the upgrade mechanism itself*. The one genuinely hard case — relocating
the Hub's local "Shell safety" edits out of framework files into `DEV-INFRASTRUCTURE.md` at
1.0.0 — is exactly what MANIFEST class design intended.

---

## 3. Weaknesses and limitations

### 3.1 The close-out ritual is too expensive for burst development — so it got bypassed

End-of-task touches 4–8 memory files, and log entries averaged 400–1,500 words against a
150–300 guideline. During the July sprint the maintainer **abandoned the ritual for a whole
batch** ("memory-update bypass — the commit messages carry the per-item detail",
`backlog.md` reconciliation note, `d02ad15`), then needed a paid-back maintenance session
(2026-07-08) to backfill trajectory and repair the record. `user_crud/ROADMAP.md` (MEM-MAINT)
confirms this is a recognised, recurring ad-hoc pattern. **The framework's most important
loop is the one users route around when velocity matters** — it needs a sanctioned cheap path,
not an improvised one.

### 3.2 Fixed budgets don't fit grown projects; permanently-red alarms return

`file-map.md` sits at ~8,962 words against a 2,000 hard budget, "accepted as the irreducible
floor" — the exact "always-red, always-ignored" dynamic 2.1.0 was written to kill, recreated
at the file level. The decision-log word guard trips routinely because dense sign-off entries
are structurally >300 words. Budgets keyed to fixed word counts rather than to project size
(file count, entry count) go stale on any project that succeeds.

### 3.3 Protected-doc drift has no loop

SPEC.md and the ADRs are protected (edit only on request) — correct — but nothing schedules
their reconciliation. At HEAD: SPEC §6 still describes the pre-PERF-1e `Performance` shape;
ADR-003/ADR-006 have been "formal closure is a tracked follow-up" since **May 19**; ADR-008
needs the ACCESS-INTERNAL amendment; ADR-013 doesn't describe the ad-hoc trigger; DOC-1 (the
catch-up sweep) grew a 13 KB drift inventory (4× the ticket soft cap) and has been deferred
since early July. Every deferral was *recorded* — the framework is honest about the debt — but
recording is not retiring.

### 3.4 The environment defeated the memory model, seven times

OneDrive sync corrupted the working tree at least 7 recorded times: a `.git` divergence
(2026-05-29, needing a recovery branch/tag), stale-reverts of staged files mid-task
(incidents #3, #4, #5 during the July waves — one losing the whole CUE-1 panel until restored
from the index), and #7 (2026-07-08: 19 files stale-reverted, `trajectory.md` losing the
Wave-3+ record, two framework prompts silently downgraded to pre-3.x text). The framework's
one-writer rule assumes a sane filesystem; it had no preflight to *detect* a hostile one. The
"move the repo out of OneDrive" recommendation was first written 2026-05-31 and never
enforced — advice without a check is not a control.

### 3.5 Append-only was silently violated once

The four 2026-06-23/24 decision entries (Stage epic, DEP-9 named tunnel, DEP-10 landing page)
were dropped by commit `15dfabe` ("upgrade framework v3 + revert DEP-9/DEP-10/ngrok hub
changes", 2026-07-04) and exist in **no archive** — `trajectory-0003/0004` still say "See
decision-log 2026-06-23", and `archive/INDEX.md` presents itself as complete coverage. The
content is recoverable from git, but the doctrine ("append-only, never rewrite") had no
integrity check to notice the loss.

### 3.6 Maintainer-owned items stall indefinitely

SEC-1 — a **live leaked OpenAI key in git history** — has been a standing Active item since
2026-05-20 (~7 weeks at HEAD). DEP-7, the NET-1 on-site check, and DOC-1 similarly age
without pressure. The framework keeps them *visible* (good — SEC-1 is deliberately pinned
Active) but has no ageing/escalation signal, so visibility decays into wallpaper.

### 3.7 Smaller frictions

- **Consolidation broke muscle memory:** after 3.0.0 deleted `auto-jazz.md`, a July session
  was invoked against the *archived backup copy* of the old workflow file. Renames need
  deprecation shims or workflow-dir cleanup.
- **Shell-safety rule misfired:** several June commit messages contain literal ` -m ` chains
  (the multi-`-m` rule applied wrongly), permanently mangling the git record.
- **PROCESS.md is a project invention with no framework slot.** The Hub's most sophisticated
  process assets — macro phases, the ADR closure protocol, definition-of-done, risk watch
  list — live in a file pm-skills doesn't know about, added by hand to the hot read tiers.
  Its §1.3/§11 went stale and needed dedicated housekeeping passes.
- **Early git integration was absent:** May ran ~17 days across 2 commits (framework said
  nothing about committing until init-mvp's checkpoints arrived); rollback capability was
  luck until June.
- **The framework's own diagnostics opinion was never adopted by its flagship:** the Hub's
  `DEV-INFRASTRUCTURE.md` "Maintainer diagnostics" section has carried a CUSTOMISE stub since
  the 2.4.0 upgrade — deferred at every subsequent upgrade readiness check.

---

## 4. Problems in practical use (observed, not hypothetical)

1. **Inconsistent adoption of gates, front-loaded era:** the 2026-05-03 "depth-first, no
   periodic approval" mega-session and the 2026-05-20 chat-debug bypass predate the modes that
   would have legitimised them (auto-jazz was only formalised upstream 2026-05-27). Practice
   led process; the framework caught up.
2. **Process overhead documented by its own artefacts:** ~9 prune/maintenance operations in
   6 weeks, each a multi-step shell session (P1–P6) with before/after tables; three prunes in
   a single week of July. Memory upkeep consumed real sessions that shipped nothing.
3. **Two-upstream divergence:** on 2026-05-28 the local framework folder and GitHub had
   *bidirectionally* diverged (GitHub ahead on `next-batch.md`, behind on Shell safety);
   resolved manually. Versioning (1.0.0, next day) fixed this class.
4. **Repeated planning without implementation is largely absent** — a genuine strength: every
   triage entry maps to shipped IDs or explicit Icebox/cut decisions. The one soft spot is
   ADR formal-closure promises (§3.3).
5. **Implementation without close-out** happened exactly where predicted: gateless burst work
   (July feedback batch), where the bypass was at least *declared* and later reconciled.
6. **Lost context between machines/tools came from the platform, not the process** (OneDrive;
   Windsurf sync-residue folder `…/Windsurf/` still shadowing the renamed project folder).

---

## 5. Long-term trajectory

- **Discipline rose with velocity, not against it.** May: 26 commits, verbose entries, two
  giant catch-up commits. July: 61 commits in 8 days, per-ticket commits with gate results,
  ~300-word entries, dependency-ordered waves, a rehearsal gate before the show — while most
  work ran gateless. Trust was earned via verification, and gating was *re-tightened*
  selectively (`[sign-off]` items still ran full four-stage, e.g. REC-ASSEMBLE-1).
- **Recurring problems split cleanly:** those inside the framework's reach (backlog rot,
  budget miscalibration, echo drift, over-fetching) were fixed at the framework level and did
  not recur; those outside its reach (OneDrive, maintainer-owned security tasks, protected-doc
  sign-off) recurred and were managed by repair rather than prevention.
- **The end state is strong:** a 2,002-test system with one-command rehearsal verdicts, a
  navigable 5-month decision history, an operator manual, and a memory a fresh agent can load
  in ~26 K words. v1's fate (1,600-line monolith, unreadable history) is the control group —
  same maintainer, same product domain, radically different outcome.
- **Evidence for future projects:** the framework demonstrably compounds — the Hub's second
  half was faster *and* better-recorded than its first. But the evidence base is one project,
  one maintainer, one agent platform (see §9).

---

## 6. Recommended improvements, graded

Grading: **Impact** = expected improvement to consuming-project outcomes · **Difficulty** =
effort to implement in pm-skills · **Risk** = chance of harming existing behaviour ·
**Op Δ** = how much it changes the maintainer's day-to-day operation.

| # | Proposal | Impact | Difficulty | Risk | Op Δ |
| --- | --- | --- | --- | --- | --- |
| R1 | **Sanctioned lite close.** A `close:lite` mode of `end-of-task.md`: commit message becomes the per-item record (structured trailer), memory writes deferred to a new **`reconcile` verb** in `memory-maintenance.md` that back-fills backlog/trajectory *from git log* in batch (the 2026-07-08 session, productised). Auto-suggest when >N items ship in one session. | High | Medium | Medium (memory quality if reconcile is skipped — pair with a session-start nag when a lite-close is unreconciled) | Medium |
| R2 | **Environment preflight.** Session-start + prune/upgrade check: detect cloud-synced paths (`CloudStorage`, Dropbox, iCloud patterns), detect sync-conflict artefacts (`*-<machine-name>.*`), verify referenced archives resolve. Ship the July-8 repair playbook as a documented procedure. | High (prevents data loss) | Low | Low | Low |
| R3 | **Scale-aware budgets.** `file-map.md` budget = f(file count) (e.g. ~35 words/file) or words-per-entry; decision-log word guard per-entry only. Kill the permanently-red alarm class for good. | Medium | Low | Low | None |
| R4 | **Protected-doc sync loop.** End-of-task accumulates a machine-readable "doc-delta" list (SPEC/ADR sections flagged pending sign-off); session-start Start B surfaces the count + age; a `doc-sync` pass (DOC-1 productised) presents all deltas for one batched sign-off. | Med-High | Medium | Low | Low-Med |
| R5 | **Standing-item ageing.** `[maintainer]`/`[sign-off]` items carry their creation date; Start B prints age ("SEC-1 — open 49 days — leaked credential"). Optional `[security]` flag escalates to a session-start banner. | Medium (SEC-1 would not be 7 weeks old) | Low | Low | Low |
| R6 | **`adopt.md` retrofit flow** (already in ROADMAP Next). Reverse-engineer architecture/file-map/seed-trajectory from tree + git history; interview only for gaps. The largest broader-adoption lever. | High (for new users) | Medium | Low | Low |
| R7 | **Archive integrity in Diagnose.** Check that every `see decision-log YYYY-MM-DD` pointer in trajectory resolves to a live or archived entry; check INDEX coverage vs dated references. Would have caught the lost 06-23 entries. | Medium | Low | Low | None |
| R8 | **Commit checkpoints in `task.md`.** A recommend-commit step after verify (message template = ID + summary + gate results), and per-milestone in longer runs — codifying what the Hub converged on. Never auto-commit. | Medium | Low | Low | Low |
| R9 | **PROCESS slot / ADR protocol.** Either a first-class optional `PROCESS.md` template (macro phases, spike timeboxes, ADR closure protocol, definition-of-done) or absorb the ADR-closure protocol into the framework docs. The Hub proved the value; every complex project will reinvent it. | Med-High | Medium | Low | Low |
| R10 | **`spike.md`** (already in ROADMAP Next): timeboxed, throwaway-branch, single-decision-entry contract. The Hub's `[spike]` flag + "timebox or kill" rule, generalised. | Medium | Low | Low | Low |
| R11 | **Deprecation shims on consolidation.** Upgrade Step 6 offers to clean the AI tool's workflow dir and/or leave one-line tombstones ("moved to task.md modes") for removed workflow names. | Low-Med | Low | Low | None |
| R12 | **Multi-writer hardening.** Beyond one-writer: a `sessions/.claim` convention for parallel sessions (declare intended file set; second session reads it), plus "git is the sync channel, never the filesystem" guidance for multi-machine work. | Medium | Med-High | Medium | Medium |
| R13 | **Transcript archiving convention** (ROADMAP inbox): a documented `_transcripts/` location + naming, so session evidence exists for future evaluations like this one. | Low-Med | Low | Low | Low |
| R14 | **Generated / sectional file-map.** Make `file-map.md` partially derivable (a script emits the skeleton; agents maintain only role text), and make its hot read *sectional* (read the sections matching the task's directories, like the decision-log headings-first read). | High (token cost, every task) | Medium | Medium (missed-context risk — mitigate by always reading the section index) | Low |

Priority order for maximum return: **R1, R2, R14, R3, R4, R6** — the first three attack the
two failure modes that actually materialised (bypass + sync corruption) and the largest
per-task token line-item.

---

## 7. Token-usage efficiency

What the evidence shows (structural — no usage metering exists; see §9):

- **Session-start hot read at Hub scale ≈ 26,000 words (~35 K tokens)** before any work:
  file-map 8,962 + AGENTS 4,700 + architecture 1,527 + conventions 1,838 + brief 1,061 +
  README ~1,400 + PROCESS ~3,700 + backlog Active ~1,000 + decision-log headings. `file-map.md`
  alone is ~35 % — hence R14.
- **The write side is heavier than the read side.** Entries ran 3–10× the 150–300-word
  guideline through June; each ship also rewrote backlog/trajectory/file-map. 3.0.0's be-terse
  rules visibly compressed July entries (~300–600 words), but verification blocks and
  alternatives lists keep entries long. The deepest fix is R1 (write once, in the commit;
  reconcile in batch).
- **Meta-work sessions are pure token cost:** ~9 prune/maintenance passes, each reading and
  rewriting the largest files in the repo. R3 (fewer false alarms) and epoch-boundary chunking
  (already fixed in 2.2.1) reduce frequency; R1 reduces the accretion rate itself.
- **3.0.0 was a genuine efficiency release** — checkpoint default (2 round-trips saved per
  task), memory-policy extraction (~⅓ off the always-loaded contract), headings-first
  decision-log, end-of-task fast path — and the July cadence (30+ tickets in 5 days) is the
  observable result. The remaining big levers are R14, R1, and same-day session context reuse
  (re-reading an unchanged hot set several times per day is unaddressed).

---

## 8. Problems still to solve (framework-level)

1. **The close-out cost/benefit curve** (§3.1) — unresolved by 3.0.0's fast path; R1 is the
   proposal. Until then every high-velocity phase will re-invent the bypass.
2. **Hostile filesystems / multi-machine sync** (§3.4) — recurring risk for any OneDrive/
   Dropbox/iCloud user, i.e. many vibe coders. R2/R12.
3. **Protected-doc debt** (§3.3) — SPEC/ADR drift compounds silently; on the Hub it is now
   material (11-entity model vs SPEC's 9). R4.
4. **Ageing of human-owned work** (§3.6) — the leaked-key case shows "visible" ≠ "handled".
   R5, plus the ROADMAP's SEC-BASE (secrets hygiene as a 5th tiered capability) would have
   prevented the leak class at source.
5. **Budget calibration as projects grow** (§3.2) — R3, and periodically re-derive guideline
   numbers from real mature projects (the ROADMAP's REAL-TRAJ item; this document is
   effectively its first execution).
6. **Verifying memory is actually *used*** — there is good anecdotal retrieval evidence but no
   systematic signal for which memory content earns its read cost. A cheap experiment: log
   (in the closing report) which memory files/sections materially informed the task, and prune
   what never gets cited.
7. **Single-evaluator loop** — the framework's changes are designed, implemented, and judged
   by the same maintainer+agent pair. The 3.0.0 external review demonstrably found things
   dogfooding missed; institutionalise an occasional external/cold review (or a second
   consuming project — `user_crud` is not yet one).

---

## 9. Outstanding questions and evidence gaps

- **No chat transcripts before July.** Gate-level behaviour (how often scope/design gates
  changed the outcome vs rubber-stamped; how much drift-correction was needed) is inferred
  from decision entries for May–June. The 12 July transcripts confirm the auto-jazz loop
  works as documented, but the *gated*-era interaction record is gone. (R13 fixes forward.)
- **No token/cost telemetry.** Efficiency claims here are structural (word counts), not
  measured spend. Worth capturing per-session token counts for a week before/after R1/R14.
- **Product outcomes are proxied.** Test counts, rehearsal verdicts and shipped scope are
  strong proxies, but audience/curator satisfaction from the 2026-07-08 show isn't in-repo;
  "did the framework produce a better *show*" is unanswerable from artefacts alone.
- **Was the 06-23/24 decision-log removal deliberate?** Commit `15dfabe` bundles a framework
  upgrade with a DEP-9/DEP-10 revert; whether dropping the four entries was intended (revert
  semantics) or collateral needs maintainer confirmation before restoring them to an archive.
- **`user_crud` is too embryonic** to test second-project transferability; the framework's
  self-hosting via `ROADMAP.md` deviates from its own prescribed memory shape (deliberately),
  which slightly weakens the "works anywhere" claim.
- **Single-user evidence.** Everything above is one maintainer + Cascade on macOS/OneDrive.
  Team dynamics, other agent tools (the manual paste flow is documented but unexercised), and
  non-JS stacks are untested territory.

---

## 10. Overall judgement

**Suitability in its present form: qualified yes.** For this class of project — a solo
maintainer directing an AI agent on a complex, safety-relevant, single-repo product — the
evidence is strong: requirements clarity (SPEC/ADR + brief), scope control (wish-list/triage,
hard prohibitions), decision quality (alternatives-considered as standard), continuity
(mid-epic resumption, parallel sessions), traceability (2,002 tests, gate-stamped commits,
lossless archives), and recovery (context rebuilt after every interruption, including
filesystem corruption) all demonstrably improved over the v1 baseline. The costs — a heavy
close-out ritual, meta-maintenance sessions, and budget noise — are real but were absorbed
while *increasing* velocity.

**Suitability after modification: strong yes.** The two failure modes that actually bit —
close-out bypass under velocity (§3.1) and environment-level corruption (§3.4) — plus the
token-dominant file-map read (R14) are all tractable, low-risk changes. Implementing R1–R4
(+R6) would remove the observed friction without weakening any guardrail; most other findings
are already self-identified in `user_crud/ROADMAP.md`, which is itself evidence the feedback
loop works.

**Suitability for broader use: promising, unproven.** The framework generalised *from* one
project; it has not yet been proven *on* a second. Its opinions (Carbon, AAA, invariant
testing, zero-dep default) fit web-app solo builds; the manual paste flow, non-JS stacks, and
team use are untested. The biggest adoption blocker is greenfield bias — most prospective
users arrive with an existing repo, making `adopt.md` (R6) the highest-leverage next release.
Recommended posture: continue using it as-is on the Hub, apply R1–R4 before or during the next
project, and treat the next new project (not `user_crud`) as the deliberate second test case
with transcript archiving (R13) enabled from day one.

---

*Cross-references: framework CHANGELOG 1.0.0–3.1.1; Hub `pm_skills/project/archive/INDEX.md`;
Hub commits `d02ad15` (reconciliation), `15dfabe` (entry loss), `dc73aa3` (OneDrive repair);
`user_crud/ROADMAP.md` (MEM-MAINT, ADOPT, SPIKE, SEC-BASE, REAL-TRAJ).*

---

## Addendum A — ROADMAP triage against the case-study evidence (2026-07-16)

Every open `user_crud/ROADMAP.md` item, assessed against §2–§8: does the Hub evidence say it
would improve operation, what is the rough approach + constraints, and the four grades.
**Impact** = operational improvement for consuming projects · **Difficulty** = build effort ·
**Risk** = chance of harming existing behaviour · **Op Δ** = change to the maintainer's
day-to-day operation. R-numbers refer to §6.

### Summary verdict table

| Roadmap item | Maps to | Verdict | Impact | Difficulty | Risk | Op Δ |
| --- | --- | --- | --- | --- | --- | --- |
| MEM-MAINT (Decisions) | R1 | **Promote → Current focus.** Strongest evidence of any item | High | Medium | Medium | Low† |
| ADOPT (Next) | R6 | **Promote — next minor release** | High (adoption) / nil (Hub) | Medium | Low | Low |
| SEC-BASE (Next) | §8.4, R5-adjacent | **Promote** — the leaked-key incident is the proof | Med-High | Medium | Low | Low-Med |
| Transcript archiving (Inbox) | R13 | **Promote** — this evaluation was blinded May–June without it | Low-Med | Low | Low | Low |
| SPIKE (Next) | R10 | **Promote, reshaped**: a `task.md` mode, not a new file | Medium | Low | Low | Low |
| review.md feature-area scope (Inbox) | pairs w/ R1, R4 | **Promote, small** | Medium | Low | Low | Low |
| Code-refactor verb (Inbox) | — | **Promote, reshaped**: a `task.md` mode, not a new file | Medium | Low-Med | Medium | Low |
| TASK-SIZING (Next) | — | **Keep in Next, low** — free-text steering already works | Low-Med | Low | Low-Med | Low |
| REAL-TRAJ (Next) | this document | **Close via bookkeeping** — executed by this case study | (realised) | Trivial | None | None |
| DATA-MIG (Next) | — | **Defer with trigger** ("first consuming project with a real DB") | Low now / High later | Medium | Low | Low |
| TEST-DOC (Next) | — | **Defer / cut down** — no observed pain; doctrine already explicit | Low | Low | Low | None |
| MEM-MAINT sibling: FMT-CONV (Decisions) | — | **Resolve as "no"** — existing ticket grammar sufficed | Low | Low | Low (a strict checker would *add* gate friction) | None |
| CL-HORIZON (Minor) | — | **Keep icebox** — trigger (~20k words) is right; cold-read cost only | Low | Low | Low | None |
| MODEL-TIER (Minor) | §7 | **Piggyback** — one GUIDE paragraph, ship with any release | Low-Med (cost) | Trivial | Low | Low |

† MEM-MAINT's Op Δ is Low *for this maintainer* because it formalises the existing ad-hoc
bypass; for a by-the-book user it is Medium.

### Tier A — promote now (direct evidence of operational pain)

**A1. MEM-MAINT → the R1 design (promote to Current focus).**
*Evidence:* the July feedback batch shipped with a declared memory bypass; the 2026-07-08
maintenance session was the manual repayment; the ROADMAP itself admits the ad-hoc pattern.
*Approach:* resolve the "decision needed" as **yes**, shaped as three pieces —
(1) a `close:lite` mode of `end-of-task.md`: the quality gate still runs, memory writes are
replaced by a **structured commit-message trailer** (item ID · one-line outcome · one-line
decision · gate results — the Hub's July commit style, codified);
(2) a new **Reconcile verb** in `memory-maintenance.md`: reads `git log` since the last
reconcile, batch-evicts backlog items, writes trajectory lines and one consolidated
decision-log entry (the 2026-07-08 session, productised), with a lossless ID check mirroring
the 2.0.0 line-anchored reconcile;
(3) `session-start.md` surfaces "N unreconciled lite-closes" so the debt is visible.
*Constraints:* `check` is never skippable — lite applies to memory writes only; `[sign-off]` /
`full`-mode tasks may not lite-close (their rationale is the record); reconcile becomes
**mandatory before the next batch pick** past a cap (e.g. >5 lite closes or >7 days); commit
trailers must carry the backlog ID or the reconcile refuses to guess.
*Grades:* Impact **High** · Difficulty **Medium** · Risk **Medium** (memory decay if the
reconcile is skipped — mitigated by the nag + cap) · Op Δ **Low†**.

**A2. ADOPT → the R6 design (next minor release).**
*Evidence:* greenfield bias is the biggest adoption blocker; the Hub itself was a retrofit
that had to improvise (hand-populated memory, invented PROCESS.md).
*Approach:* `adopt.md` in three phases — inventory (tree walk → file-map skeleton; `git log`
→ seed trajectory phases; manifests/configs → architecture draft; README → brief draft), gap
interview (only what inventory can't answer), then the standard `init.md` Step-10 readiness
check. Pair with a generator script for the file-map skeleton (feeds R14).
*Constraints:* proposes, never overwrites existing docs; must work without git history; cap
inventory read cost on large repos (sample by directory, not exhaustive read); seeded content
carries a "reverse-engineered — verify" marker so agents don't over-trust inferred rationale;
`framework` class, minor version.
*Grades:* Impact **High** (for adoption; nil for the Hub) · Difficulty **Medium** · Risk
**Low** · Op Δ **Low**.

**A3. SEC-BASE (keep in Next, raise priority).**
*Evidence:* SEC-1 — a real leaked `OPENAI_API_KEY`, unrotated for ~7 weeks; the Hub had to
invent its own secrets machinery (WL-2 `.env.secrets` sidecar + `scaffold-env.sh`); npm-audit
discipline was improvised twice (Hub 2026-05-20, framework 2026-06-17).
*Approach:* the 5th tiered capability, same shape as the other four — an `AGENTS.md` hard
rule (secrets never in repo/URLs/logs; audit cadence; pre-deploy secret check), a
`DEV-INFRASTRUCTURE.md` "Security baseline" section (Tier 0: `.gitignore` + `.env.example`
discipline + placeholder scan in `check`; Tier 1: sidecar-compose pattern generalised from the
Hub's `scaffold-env.sh` + audit-on-upgrade; Tier 2: pre-commit secret scanner + dependency
audit), and scoping/validation flags when a task touches a secrets/auth surface. Include a
**leaked-credential response playbook** — the SEC-1 lesson is that rotation, not tracking, is
the fix.
*Constraints:* stack-agnostic (slots, not mandated tools — the quality-gate precedent);
`check` stays non-mutating; scanners are opt-in scaffold, never forced; must not duplicate
the existing diagnostics-redaction rule — cross-reference it.
*Grades:* Impact **Med-High** · Difficulty **Medium** · Risk **Low** · Op Δ **Low-Med**.

**A4. Transcript archiving (inbox → promote as a convention).**
*Evidence:* §9 — May–June session behaviour is unobservable; this evaluation leaned on 12
July transcripts that exist only because the maintainer started saving them by hand.
*Approach:* convention only, no tooling — a documented `_transcripts/` folder (gitignored by
default), naming `YYYY-MM-DD-<task-id>.md`; one line in the `end-of-task.md` closing report
("export the transcript if your tool supports it"); GUIDE paragraph.
*Constraints:* transcripts can contain secrets → gitignored default + redaction warning;
tool-dependent, so it stays a habit, not a gate; cold tier — never auto-read.
*Grades:* Impact **Low-Med** (compounding evidence value) · Difficulty **Low** · Risk **Low**
· Op Δ **Low**.

### Tier B — promote with reshaping

**B1. SPIKE → a `task.md` mode, not a new file.**
*Evidence:* the Hub's `[spike]` flag + PROCESS timebox-or-kill rule produced two exemplary
spikes (REC-VERIFY, NET-1 desk analysis) — both "findings, no fix", both had to bend task.md
to fit.
*Approach:* `spike` mode: timebox declared up front; deliverable = one findings decision-log
entry (+ optional `spec/<topic>-findings.md`, the Hub's pattern); code in a throwaway
branch/dir; outcome must create or resolve a backlog item; lite close by default.
*Constraints:* hard prohibitions still apply (no dep installs even in a spike); at the
timebox, stop and report inconclusive-as-information; spike code never merges without a
normal task. Post-3.0.0 ethos: add a mode, not a file.
*Grades:* Impact **Medium** · Difficulty **Low** · Risk **Low** · Op Δ **Low**.

**B2. review.md feature-area scope (inbox → small extension).**
*Evidence:* the Wave-6 "concept-alignment audit" was an improvised feature-area review; with
R1 lite-closes, diff-ranges become awkward and "review this epic" is the natural unit.
*Approach:* extend `review.md` Inputs to accept a feature area (name + IDs); the agent
assembles the change set from trajectory/decision-log IDs + `git log --grep`, then runs the
existing audit unchanged.
*Constraints:* read-only stays; one epic per run (token bound); refuse areas that don't map
to greppable IDs.
*Grades:* Impact **Medium** · Difficulty **Low** · Risk **Low** · Op Δ **Low**.

**B3. Code-refactor verb (inbox → a `task.md` mode).**
*Evidence:* HELP-9 (GUI rebuild preserving ~70 element IDs), MOD-2 (simplify-in-place),
LINKS-2 — real refactors ran through task.md but had to negotiate the ">5 files not in
scope" prohibition, and behaviour-preservation had no named contract.
*Approach:* `refactor` mode: acceptance criterion is **no behaviour change**; validation adds
a preservation checklist (tests unchanged and green, no event/data-model/API delta, an
explicit preserved-contract list à la HELP-9's ID inventory); the >5-file prohibition is
lifted *within the declared surface only*.
*Constraints:* requires a green baseline before starting (or an explicit no-coverage
acknowledgement); feature work and refactor may not mix in one run; protected files stay
protected.
*Grades:* Impact **Medium** · Difficulty **Low-Med** · Risk **Medium** (under-declared
surface = blast radius) · Op Δ **Low**.

**B4. TASK-SIZING (keep in Next, low priority).**
*Evidence:* size steering already happens effectively via free text ("full restructure
welcome", "do everything needed", default-smallest otherwise); no observed failure attributable
to its absence — this is a formalisation, not a fix.
*Approach:* a one-word hint at invocation (`size: minimal|medium|large`) consumed by scoping +
design-options (calibrates option breadth); recorded in the decision entry; default remains
minimal.
*Constraints:* size never changes gate count (gating stays mode-driven) and never authorises
dependency adds or protected-file edits; `large` ≠ permission for speculative refactors —
that is B3's job.
*Grades:* Impact **Low-Med** · Difficulty **Low** · Risk **Low-Med** (normalising bigger
default scope — keep minimal as the unstated default) · Op Δ **Low**.

### Tier C — close, defer, or decide "no"

**C1. REAL-TRAJ — close.** This document is its execution (a mature project's full memory
reviewed; findings triaged here). Remaining bookkeeping: a framework decision-log/CHANGELOG
note, fold Tier-A/B verdicts into the ROADMAP, mark done. Re-run on the *next* project, not
this one. Grades: realised / Trivial / None / None.

**C2. TEST-DOC — defer or cut down.** The doctrine is already explicit in `AGENTS.md` →
Testing (1.3.0) and behaved well (2,002 tests, honest "not applicable" use, no coverage
theatre observed). If kept: one cross-reference paragraph in the DEV-INFRA Quality-gate
section, nothing more. Grades: Low / Low / Low / None.

**C3. DATA-MIG — defer with an explicit trigger.** No observed pain: the Hub's append-only
log + rebuildable projections *is* a migration posture, and the framework already owns the
snapshot→propose→execute→reconcile mechanics (upgrade.md Step 8) to generalise from. Trigger:
first consuming project with persistent user data. Grades: Low now, High later / Medium /
Low / Low.

**C4. FMT-CONV — resolve as "no new conventions".** The 2.0.0/3.0.0 ticket grammar sufficed
for ~200 items; the only formatting debt was a one-off flags-legend normalisation
(`573e76d`). A format checker would add gate friction for marginal gain. Record the decision;
revisit only if tooling ever parses the backlog programmatically. Grades: Low / Low / Low
(checker false-positives are the risk of doing it, not skipping it) / None.

**C5. CL-HORIZON — keep icebox.** ~11.5k words, cold outside upgrades, and the upgrade path
reads only the version gap. The ~20k trigger already on the item is right.

**C6. MODEL-TIER — piggyback.** One GUIDE paragraph ("mechanical verbs — counts, prunes,
reconciles — suit cheaper models; scoping/design do not") shipped with any release. Constrain
it to the *verify/count* halves of maintenance verbs; the propose step stays on a capable
model (a weak model mis-proposing a prune is the risk). Grades: Low-Med (cost) / Trivial /
Low / Low.

### Gaps — case-study recommendations with no ROADMAP line yet

These should be **added** to the ROADMAP inbox/Next (see §6 for grades): R2 environment
preflight + sync-conflict guard (top gap — seven OneDrive incidents), R3 scale-aware budgets,
R4 protected-doc sync loop, R5 standing-item ageing (complements SEC-BASE: SEC-BASE prevents,
R5 escalates), R7 archive-integrity check in Diagnose, R8 commit checkpoints in task.md,
R9 PROCESS/ADR-protocol template slot, R11 deprecation shims on consolidation, R12
multi-writer hardening, R14 sectional/generated file-map.

### Suggested sequencing

1. **Wave 1 — operational relief (before or during the next Hub work):** MEM-MAINT/R1 +
   R2 preflight + R3 budgets. One minor release; directly removes the two observed failure
   modes and the loudest alarm noise.
2. **Wave 2 — adoption:** ADOPT/R6 + transcript convention/R13 + REAL-TRAJ close. Sets up the
   second-project test with evidence capture on from day one.
3. **Wave 3 — capabilities:** SEC-BASE, SPIKE mode, refactor mode, review-area extension,
   R4 doc-sync.
4. **Decide-and-record:** FMT-CONV ("no"), TEST-DOC (cross-ref only), DATA-MIG (trigger),
   MODEL-TIER (piggyback paragraph).
