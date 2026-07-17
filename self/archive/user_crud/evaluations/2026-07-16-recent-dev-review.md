# Recent-dev review — the 3.2.0 → 3.12.0 self-hosting burst

**Date:** 2026-07-16 (evening; same day as the burst)
**Scope:** the eleven releases shipped 17:40–19:18 on 2026-07-16
(3.2.0–3.12.0, commits `8a3b729`…`8b1dcbf` + follow-ups `08547dc`,
`a42a32b`), evaluated against three evidence sources:

1. **Chat transcripts** — 12 files in `user_crud/chat trajectories/`
   *(renamed post-review to `user_crud/_transcripts/2026-07-16-<ITEM-ID>.md`,
   duplicate deleted — see §6; old auto-titles are quoted below as found)*
   (~157 KB, output-only exports; one per release session plus overlap).
2. **Development tickets** — the 11 shipped tickets are deleted; the 8
   open ones remain in `user_crud/tickets/`. Shipped-ticket content was
   reconstructed from the ROADMAP Shipped fold-ins, the CHANGELOG
   entries, and this reviewer's own earlier-session context (it wrote
   the tickets). **Note: the deleted tickets are NOT in GitHub history —
   see finding P1.**
3. **The Hub case study** (`evaluations/2026-07-16-hub-case-study.md`)
   — the evidence base the burst implemented from.

Method: read all 12 transcripts; verify every changed framework file at
HEAD against what its session claimed and what its ticket specified;
run the quality gate and the generator; cross-check the release
protocol (VERSION / CHANGELOG / MANIFEST / GUIDE) per release.
**Corrections found were applied as 3.12.1** (auto-jazz mandate) — see
§5.

---

## 1. What happened (context for the findings)

One kick-off prompt, pasted verbatim into ~11 fresh chats over ~100
minutes:

> use session-start.md as the process to work on pm-skills itself …
> Progress through the ROADMAP … check the corresponding ticket …
> autojazz the work except where you need my input, then close out

| Release | Item | Session outcome |
| --- | --- | --- |
| 3.2.0 | MEM-MAINT (lite close + Reconcile) | clean; cspell +1 word |
| 3.3.0 | ENV-PREFLIGHT | clean; cspell +1 |
| 3.4.0 | BUDGET-SCALE | clean; first session to run its own new preflight (flagged the OneDrive path) |
| 3.5.0 | FILEMAP-GEN | generator written AND smoke-tested (`--stdout`, twice); editorconfig fix |
| 3.6.0 | ADOPT | clean |
| 3.7.0 | TRANSCRIPTS | clean; internal ID (`REAL-TRAJ`) kept out of distributed docs — good call |
| 3.8.0 | SEC-BASE | clean; one self-corrected edit mistake (cspell) |
| 3.9.0 | SPIKE | **weak session** — see W2; user switched model after it |
| 3.10.0 | REFACTOR-MODE | two overlapping chats — see W1 |
| 3.11.0 | REVIEW-AREA | clean; chose reword over dictionary-add |
| 3.12.0 | DOC-SYNC | clean session; **release commit shipped without its CHANGELOG entry** — see W3 |

Every session: green `npm run check` before close, ROADMAP updated,
ticket deleted, commit left to the maintainer. The maintainer committed
each release manually, normalising most commit messages.

---

## 2. What worked (evidence, not inference)

- **The ROADMAP kick-off protocol is real and repeatable.** Eleven cold
  starts, same prompt, no shared session state — each session found the
  right next item, loaded the right context, and closed the loop
  (Shipped entry + ticket deletion + release metadata). The
  ticket-as-banked-evidence pattern worked exactly as designed: no
  session re-researched the Hub. (Transcripts, all.)
- **Drift verification caught real state.** Sessions reconciled
  VERSION / top CHANGELOG / git status before working; the 3.10.0
  overlap session correctly detected that the work was already done and
  verified instead of duplicating (see W1 for the caveat).
- **The gate did its job.** cspell caught 6 new-word introductions;
  editorconfig caught template-literal indentation in the generator;
  each was fixed before close. Zero red closes.
- **Cross-release wiring held up under sequential autonomous edits.**
  3.12.0's Doc-sync correctly threads through end-of-task step 3,
  Start B, Diagnose 11, Prune P2, memory-policy, MANIFEST, review.md
  — written by a session that had never seen the 3.2.0–3.11.0 sessions,
  only their artefacts. The artefact trail was sufficient. Verified at
  HEAD: `memory-maintenance.md`, `memory-policy.md`, `MANIFEST.md` are
  internally consistent.
- **Self-application mid-burst.** From 3.4.0 onward, sessions ran the
  environment preflight that 3.3.0 had just shipped and flagged the
  repo's own OneDrive path — the framework consumed its own new rule
  within minutes of shipping it.
- **Scope discipline.** No session added a dependency, touched
  protected files, or wandered outside its ticket's file list. The one
  deliberate deviation (3.7.0 rewording `REAL-TRAJ` out of distributed
  docs) was flagged to the user explicitly.

---

## 3. Findings — prioritised

Ordered by risk to consuming projects, then to the framework itself.
Each is labelled **[evidence]** (observed in transcript/file/git) or
**[inference]** (my judgement from the evidence).

### P1 — Deleted tickets are unrecoverable; open tickets are single-copy on a hostile filesystem

**[evidence]** `user_crud/` is gitignored and has **zero commits** in
history (`git log --all -- user_crud` is empty). The 11 shipped tickets
were deleted per the ROADMAP protocol ("fold durable conclusions into
the CHANGELOG entry"); your instruction for this review assumed "see
GitHub history for earlier ticket-context .md files" — **that history
does not exist**. The 8 open tickets (ITEM-AGE … MODEL-TIER), the
ROADMAP, the case study, and all 12 transcripts exist only as working
files inside a OneDrive path — the exact hazard class ENV-PREFLIGHT
(3.3.0) ships a playbook for, with 7+ recorded corruption incidents on
the Hub.
**[inference]** The fold-ins are good (the CHANGELOG entries and
ROADMAP Shipped notes carry the durable conclusions), so the *loss so
far* is modest: the deleted tickets' detailed Evidence/Approach/Open-
questions sections. But the open tickets carry the full remaining
roadmap value, and a single OneDrive stale-revert could take them.
**Recommendation (needs your call — not auto-applied):** track
`user_crud/` in git. Cheapest shape: remove `user_crud/` from
`.gitignore` and commit it (the repo is private-ish; the folder is the
framework's own project memory in all but name), or keep it ignored and
add a tiny `tar`-to-`_backups/` habit. Deleting shipped tickets stays
fine once the folder is versioned — deletion becomes recoverable.
**Applied same evening on the maintainer's go-ahead — see §6.**

### W1 — Concurrent sessions + a model switch produced a misattributed close (3.10.0)

**[evidence]** Two transcripts cover REFACTOR-MODE. In
`PM-Skills Self-Hosting Roadmap 2.md` (now
`_transcripts/2026-07-16-SPIKE-and-REFACTOR-MODE-redo.md`), the SPIKE
session (old model)
made six unexplained `*Edited relevant file*` calls after its close;
the user then said *"please redo this using the better model I just
selected"*; the new model found REFACTOR-MODE mostly implemented,
VERSION already 3.10.0, and told the user *"you'd manually implemented
most of it … you did those"* — then closed the release on that basis.
Meanwhile `PM-Skills Self-Development Roadmap 2.md` (now
`_transcripts/2026-07-16-REFACTOR-MODE.md`) is a complete,
normal REFACTOR-MODE session that did the implementation itself.
**[inference]** The "manual edits" the redo model attributed to you
were almost certainly agent edits (the pre-switch model's silent
continuation, or the parallel chat). The close was correct only because
the model re-verified every artefact against the ticket — the
misattribution itself cost nothing this time, but "uncommitted work of
unknown provenance, assumed to be the user's" is exactly how a
concurrent session's half-finished edits get blessed. This is live
evidence for the open **MULTI-WRITER** ticket (session claim files),
and the model-switch trigger is live evidence for **MODEL-TIER**.
**No file fix available** — process finding. Mitigation that already
exists: the redo model's verify-against-ticket habit. Mitigation to
add: MULTI-WRITER's claim-file, and a one-line rule "state provenance
of uncommitted changes before building on them" (fits MULTI-WRITER's
ticket).

### W2 — Session quality varied by model; the weak session left the burst's only spec defect

**[evidence]** The SPIKE session (the one the user re-ran with a
better model) is the only session that: skipped the preflight note,
skipped the release consistency check, never re-ran the gate after its
ROADMAP edit, and proposed a nonconforming commit message
(`feat(task): …` vs the repo's `Release X.Y.Z: …`). It also introduced
the burst's only real semantic defect (F1 below: "spike closes lite by
default"). All other sessions ran the fuller close.
**[inference]** The kick-off block (ROADMAP comment, steps 1–5) is
prose, not a checklist — adherence degraded exactly where model
capability degraded. Supports **MODEL-TIER** (GUIDE guidance on which
steps tolerate cheaper models) and suggests the kick-off's step 5
should be a literal checklist (cheap future tweak, not urgent).

### W3 — The release protocol's atomicity broke at the human commit step (3.12.0)

**[evidence]** Release commit `8b1dcbf` (3.12.0) contains VERSION +
9 files but **not** the CHANGELOG entry; `08547dc` one minute later
adds the entire 66-line entry ("Clarify 3.12.0 changelog entry").
The DOC-SYNC transcript shows the session *did* write the entry and
*did* pass the coverage check pre-commit — the gap opened between
session close and manual commit.
**[inference]** Likely a staging slip (or an OneDrive stale-revert of
CHANGELOG.md at commit time — unprovable now). Either way: the one
step no agent verifies is the commit itself. This is the exact case
for the open **COMMIT-STEP** ticket (commit checkpoints with a
verified message + file-set template). Self-healed within a minute
this time; on a consuming project an upgrade reading "entries newer
than VERSION" between those two commits would have found a version
with no upgrade actions.

### F1–F5 — Cross-file inconsistencies left by the burst (all fixed in 3.12.1)

1. **[evidence] Spike close-mode contradiction (functional).**
   `task.md` spike step 5 said "Close: `lite` by default"; step 10
   says lite is "never default"; and a spike's deliverables (decision-
   log entry written now, backlog item resolved now) are incompatible
   with the lite trailer — Reconcile RE4 requires every trailer ID to
   resolve to an *open* backlog item, so a by-the-book spike +
   by-the-book Reconcile = guaranteed lossless-check failure.
   3.2.0 and 3.9.0 were written 77 minutes apart by different sessions;
   neither could see the other's semantics. **Fixed:** spike closes
   full with a reduced surface; never lite.
2. **[evidence] Generator path resolved from no project root.**
   `scaffold/gen-file-map.mjs` (AGENTS.md, session-start.md,
   end-of-task.md's `node` command, memory-policy.md, the file-map
   template, and the generator's own usage/emitted text) — the file
   ships at `pm_skills/scaffold/`. The repo's own `check-docs.mjs`
   masked it: it resolves backticked paths against both the repo root
   *and* `pm_skills/` (BASES), so a path that only resolves inside
   `pm_skills/` passes here but fails in every consuming project.
   **Fixed:** full path everywhere.
3. **[evidence] Scaffold-class upgrade rule defeated its own delivery.**
   `upgrade.md` Step 3: "`scaffold` → never touched on upgrade; skip"
   — but 3.5.0's Upgrade actions say "Copy `gen-file-map.mjs` into the
   project". A literal agent skips the copy; a Hub upgrade to 3.12.0
   would never receive the generator. **Fixed:** new scaffold files
   named by a changelog entry are copied in once; existing copies are
   never overwritten.
4. **[evidence] Start B mode list missing `refactor`** (3.10.0 wired
   GUIDE + validation but not session-start's recommended-mode line,
   while 3.9.0 did wire spike's). **Fixed.**
5. **[evidence] init.md Step 11 mode list missing `spike` and
   `refactor`.** **Fixed.**

**[inference] Pattern behind F1–F5:** every one is an *integration*
seam between releases (a later feature contradicting or under-wiring an
earlier one), not an intra-release error. Single-session quality was
high; there was no cross-burst integration pass until this review. A
standing habit — run `review.md` over the batch after any multi-release
burst (REVIEW-AREA now exists precisely for this) — would have caught
all five the same evening. That is also exactly what Reconcile RE6 now
recommends after lite batches.

### N1 — Transcript hygiene (minor, report-only)

**[evidence]** The 12 transcripts are saved under auto-generated chat
titles ("PM-Skills Framework Development 3.md" covers ADOPT; "…
Self-Hosting Roadmap.md" covers SPIKE), not the 3.7.0 convention
(`YYYY-MM-DD-<ITEM-ID>.md`) the burst itself shipped; one file
(`PM-Skills Self-Hosting Roadmap.md`) is a strict-prefix duplicate of
its "2" sibling; they live in `user_crud/chat trajectories/` rather
than a `_transcripts/` folder. Item-to-file mapping required mtime
correlation.
**[inference]** Zero functional risk, but the framework isn't eating
its own 3.7.0 cooking, and future evaluations pay the mapping cost.
Cheap fix when convenient: rename to
`2026-07-16-<ITEM-ID>.md`, delete the duplicate. Not auto-applied —
they're your files and renames may fight your tooling.

### N2 — "Global-rule snapshot ahead of disk" (worth understanding, no action taken)

**[evidence]** Three sessions (3.2.0, 3.8.0-adjacent wording, 3.12.0)
each reported that the loaded AGENTS.md global-rule snapshot *already
contained* text that was not yet in the on-disk file (lite-close item
4; the doc-deltas cold-tier bullet), and treated the snapshot as the
intended wording, "bringing disk into line".
**[inference]** Disk at HEAD now matches the snapshot exactly, so no
damage — but the mechanism matters. Most likely your Windsurf global
rules were pre-updated to the intended end-state (perhaps from the
ticket texts) before the burst. If so: harmless, even elegant. If not
— if the tool's memory snapshot can drift ahead of or away from the
file — then "reconcile disk to memory" is backwards authority, and a
session could resurrect deleted rules. Worth a one-line answer from
you; if the memory is hand-maintained, a `<!-- memory synced
YYYY-MM-DD -->` marker in AGENTS.md would make the direction of truth
explicit.

**Answered 2026-07-16 (maintainer):** AGENTS.md only ever changes
through vibe-coding sessions, and those changes are committed to
GitHub — the tracked file + git history are the source of truth; the
tool's rule memory is derived from it. No sync marker needed; git log
IS the sync record. **Closed.**

### N3 — Residual small stuff (report-only)

- ~~`VERSION` file carries a trailing blank line~~ — **withdrawn**:
  byte-check shows exactly `3.12.1\n`; the "line 2" was a file-viewer
  rendering artifact (see §6).
- **[evidence]** cspell dictionary strategy alternated between
  add-word (unparseable, worktree, FILEMAP, timebox) and reword
  (TRAJ, ungreppable, pickable) across sessions. Both defensible;
  no rule says which. One line in CONTRIBUTING.md would settle it.
- **[evidence]** The repo itself remains on a OneDrive path — the
  standing self-exempted hazard. Every session now warns (3.3.0
  works); the warning is doing its job, the move hasn't happened.

---

## 4. Verdict

The burst is the framework's best evidence to date: eleven
evidence-banked roadmap items shipped in ~100 minutes across isolated
sessions, all gates green, with the ticket → autojazz → release loop
functioning exactly as documented — including mid-burst
self-application of its own new rules. Single-session reliability was
high and correlated visibly with model quality (W2).

The failure modes were all **between** sessions, not within them:
integration seams (F1–F5), concurrent-session provenance (W1), and the
one unverified human step (W3). All five file-level defects are fixed
in 3.12.1; the three process findings map one-to-one onto tickets the
roadmap already holds (MULTI-WRITER, MODEL-TIER, COMMIT-STEP) — this
review upgrades their evidence from "Hub, months ago" to "this repo,
today", which should raise their pick priority.

The single most important non-file action is **P1: version
`user_crud/`** — the framework's own memory is currently the least
protected artefact in the building.

## 5. Corrections applied (3.12.1, this review)

- `pm_skills/integrations/task.md` — spike closes full/reduced-surface,
  never lite (F1).
- `AGENTS.md`, `pm_skills/prompts/session-start.md`,
  `pm_skills/prompts/end-of-task.md`, `pm_skills/memory-policy.md`,
  `pm_skills/project/file-map.md`,
  `pm_skills/scaffold/gen-file-map.mjs` — generator path
  `pm_skills/scaffold/gen-file-map.mjs` everywhere (F2).
- `pm_skills/prompts/upgrade.md` — Step 3 scaffold rule delivers new
  scaffold files (F3).
- `pm_skills/prompts/session-start.md` — Start B mode list + refactor
  (F4).
- `pm_skills/init.md` — Step 11 mode list + spike/refactor (F5).
- `pm_skills/VERSION` 3.12.0 → 3.12.1; CHANGELOG entry with upgrade
  actions; ROADMAP: Inbox captures folded in from the stray tail,
  3.9.0 shipped-record corrected, 3.12.1 recorded.
- Verified: `npm run check` green (36 files, 0 issues); generator
  smoke-tested; release consistency check clean (every changed
  distributed file named in the 3.12.1 entry).

## 6. Follow-up actions applied (same evening, maintainer go-ahead)

The maintainer approved working through the remaining findings
("go with your recommendations"). Applied — all source-only, no
framework release needed (3.12.1 already carries the distributed
fixes):

- **P1** — `user_crud/` is now **tracked in git**: removed from
  `.gitignore`; excluded from the lint gate explicitly
  (`.markdownlint-cli2.jsonc` `ignores`, `cspell.json` `ignorePaths`,
  `.editorconfig-checker.json`, `scripts/check-docs.mjs`
  `FILE_EXCLUDE`); posture documented in `CONTRIBUTING.md`. A
  report-only secret-shape scan over the folder came back clean before
  tracking.
- **N1** — transcripts renamed to the 3.7.0 convention:
  `user_crud/chat trajectories/` → `user_crud/_transcripts/`, files now
  `2026-07-16-<ITEM-ID>.md` (11 files; the strict-prefix duplicate
  `PM-Skills Self-Hosting Roadmap.md` deleted after byte-verification).
- **W1–W3** — evidence upgraded in place: `tickets/MULTI-WRITER.md`
  (+ provenance rule for uncommitted changes), `tickets/MODEL-TIER.md`
  (+ protocol-adherence-degrades-first observation),
  `tickets/COMMIT-STEP.md` (+ staged-set echo requirement; stale
  MEM-MAINT open question resolved). ROADMAP Later/minor reordered —
  COMMIT-STEP, MULTI-WRITER, MODEL-TIER to the top with
  `[evidence: 2026-07-16 burst]` flags.
- **W2 (process)** — the ROADMAP kick-off step 5 is now a literal
  close-out checklist (six ticked lines incl. a release consistency
  check and a staged-set echo), replacing the prose that weak-model
  sessions under-executed.
- **N3** — `pm_skills/VERSION` byte-verified as `3.12.1\n` (the
  "trailing blank line" was a file-viewer rendering artifact, not a
  real defect — withdrawn); `CONTRIBUTING.md` now records the cspell
  word-vs-reword strategy.
- **N2 — closed by maintainer answer** (2026-07-16 evening): AGENTS.md
  changes only via vibe-coding sessions, committed to GitHub; file +
  git history authoritative, rule memory derived. No marker needed.
- **Not applied:** the OneDrive relocation (user's environment; the
  3.3.0 preflight warning stands as mitigation — and earned its keep
  again tonight: a maintainer ROADMAP edit was invisible to a
  fresh read for several minutes before surfacing, classic sync lag).
