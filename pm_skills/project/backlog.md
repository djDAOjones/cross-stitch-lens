# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- OPEN WORK ONLY. Status: [ ] todo  [~] in progress  [-] cut. -->
<!-- Shipped work does NOT stay here. On ship: add one line to
     trajectory.md (the outcome) + an entry to decision-log.md (the why),
     then remove the item from this file. There is no Completed section. -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See pm_skills/memory-policy.md for limits; run memory-maintenance.md
     (Refactor) when the queue drifts into dated rounds. -->

<!-- Ticket grammar (CANONICAL COPY — prompts and workflows point here,
     they do not restate it): quick items stay one line. Non-trivial or
     sign-off items add two lines so intent survives compression:
       - **ID Short title** [flags]
         Intent: the outcome wanted.
         Done when: the acceptance condition.
     Flags: [sign-off] (scope sign-off first → full mode), [blocked: X],
     [spike] (timeboxed investigation → spike mode in task.md),
     [detail] (has a ticket file), [maintainer] (human-owned, not agent
     work), [security] (live exposure — a leaked credential or open auth
     hole; nothing weaker).
     Standing items — [maintainer], [sign-off], or [blocked] work that
     waits across sessions — carry their creation date (YYYY-MM-DD) so
     Start B can surface their age at the pick and Diagnose can flag the
     stale ones. A [security] item is a standing item by definition and
     additionally prints a one-line session-start banner until closed;
     flag a leaked-credential tracking item [security] on creation
     (tracking is not remediation — rotate first).
     Add optional Scope:/Risks: lines only for sign-off items. -->

<!-- Optional detail file: when an item needs more context than its line
     can hold (research, options explored, acceptance detail, links),
     put it in pm_skills/project/tickets/<ITEM-ID>.md and add the [detail] flag
     to the item. Cold tier — agents read it ONLY when that item is the
     active task, so Active stays terse. Working context only; the "why"
     still goes to decision-log.md on ship. The file is deleted when the
     item ships or is cut — it does not outlive the item.
     Exception (D149): Batch C0's items share one run sheet,
     tickets/BATCH-C0.md, because they ship together in one run. -->

Milestones ship in order. A milestone is done when its acceptance
line passes and `check` is green. Requirements references are to
`docs/requirements.md`.

**Ship order is no longer milestone-number order** (D149). Shipped:
M0–M8, M13, M14, M15, **Batch C0** (D149–D159, 2026-08-11) and
**Track B** (DUR-01 + SAVE-01, D179, 2026-08-23). Remaining: **Track A**'s
M16 only, with **Track C — Publication** owner-paced alongside; the
numbers stay
because they are greppable across the tickets and the decision log;
they no longer imply sequence.

## Active

### Current — Track A The printable pattern

Build-complete — M9, M11, M10 and M12 shipped (D165–D170), so the
brief's second success criterion is met. One owner-gated item remains.

- [ ] **M16 Print-sized export defaults** [sign-off] (2026-08-09)
  Intent: export defaults sized for print, not screen — enlarged PNG ~2k px on its longest side, grid and numbering on by default, across all four exporters (demoted at D149; waited on M9's symbol decision, now landed).
  Done when: the owner signs the defaults per exporter, what stays configurable, and how saved projects' export settings migrate.
  Absorbs, on one sitting (D170): M9's print inspection (every chart mode at typical cell sizes, grayscale/low-ink, key↔chart agreement) and M12's estimate defaults-and-wording review.

### Track C — Publication

Live since 2026-08-22 at <https://djdaojones.github.io/pattern-mapper/>:
a green `check` on `main` publishes the built bundle and then verifies
it (PUB-04/PUB-05, D172/D180). Publication proceeds in this repository
(D164); `LICENSE` and the notices ship and are readable in-app (D161,
D177). The 2026-08-22 branch deploy overtook the PUB-02 gate, so that
item is the pressing one.

- [ ] **PUB-02 Replace `graphic.jpg` and confirm the photo provenance** [maintainer] (2026-08-11)
  Intent: the flat-graphic demo slot is third-party fan art with a two-layer rights problem (the artist's copyright and the underlying mark); it gates public deploy (D150) and is already live. The owner replaces it — the plan (2026-08-12): a Blender cube lit by three RGB lights, giving a colour spread and a luminance ramp from primitives alone, so no rights problem remains; the `PHOTO_SLOTS` contract keeps the name, zero code changes.
  Done when: `graphic.jpg` at HEAD is rights-clean, and the five photographs are confirmed as the owner's own (`landscape-1.jpg` also seeded the M8 golden crop).
- [ ] **DIAG-02 Diagnostics for testers on the live build** [maintainer] [detail] (2026-08-23, report shipped 2026-08-23)
  Shipped (D175, D183): the Debug menu mounts behind `?diag=1`, every palette resolution is logged, and "Report a problem" saves the settings document and the redacted log in one click, then opens the compose window. Remaining, the owner's: a dedicated, retirable alias in `DEV_EMAIL` (`src/ui/diagnostics-button.ts`) — it ships in a public bundle, so never a personal address; empty composes with no recipient.
  Done when: the alias is set and a tester's report reaches it.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

- [ ] **ICE-SYMBOL-UI-01 Manual symbol override picker** (2026-08-12)
  Intent: M9's v1-optional slice, deferred whole at its close (D170). Pick from *unused* glyphs only; taking another thread's symbol is an explicit swap, never a conflict state (D160-3).
  Done when: a thread's symbol can be reassigned from the unused pool and the override survives save/load. Model and persistence exist — this is the UI alone.

**Presumptive milestone after Track A** (D149): controlling the final
image is the point of the app; a broader audience may have no upstream
editor.

- [ ] **ICE-ADJUST-01 Image adjustments as a third profile kind** (2026-08-04, rescoped 2026-08-11)
  Intent: tonal sliders plus **colour thresholds as presets** — the first slice of §9, making the `adjust` stage real (D48). Build as a third kind on M15's profile editor, not loose sliders.
  Done when: adjustments remap the source ahead of reduction with live preview, ship as read-only built-ins plus editable copies, and survive save/load.
- [ ] **ICE-PROVENANCE-01 Tonal provenance view** (2026-08-04)
  Intent: D92's remaining tonal half — where each chosen thread sits in the source's light↔dark range. Needs new selection-stage introspection; an upstream editor cannot tell you this.
  Done when: the palette's tonal coverage is visible against the source's range, labelled as provenance.

**Owner judgement required** — none can run gatelessly.

- [ ] **ICE-VARIANTS-01 A contact sheet: one axis first** (2026-08-09, narrowed 2026-08-11)
  Intent: show a spread side by side and pick by eye — one bounded axis, the five dither methods from a frozen still (D149).
  Done when: a five-cell dither sweep renders from a frozen still, labelled, and picking a cell adopts that method. Never live capture: one pipeline per frame stands.
- [ ] **ICE-LIMIT-01 Rescale the colour-limit slider** (2026-08-09)
  Intent: ceiling to 512, a perceptual scale with the midpoint near 16, and drop 1 as selectable (D149; supersedes part of D98's range).
  Done when: the owner signs the scale and floor, and projects saved under the old range still load.
- [ ] **ICE-WIDTH-01 Decide what the app's width is designed for** (2026-08-09)
  Intent: the shell says "works down to 320 px" but nobody decided what width it is *for*; the owner wants as narrow as possible while fully functional.
  Done when: a stated width target and rationale are recorded, and narrow-width behaviour is judged against it.
- [ ] **ICE-WIDTH-02 A low-height readout for judging window width** [blocked: ICE-WIDTH-01] (2026-08-09)
  Intent: the header's width line costs two lines of height where space is scarcest. Blocked: a readout cannot place you until there is a target.
- [ ] **ICE-PROFILES-02 More built-in colour profiles: the unbuilt candidates** [detail] (2026-08-09)
  Forty unsigned candidate names kept when M15-GALLERY-01 closed at sixteen. Done when run through the signed-batch process, or cut.
- [ ] **A11Y-VO-01 The human remainder of the screen-reader pass** [maintainer] (2026-08-09)
  Intent: A11Y-01 took the "has a name" half; this is whether the announcements are any *good*, plus the no-meaning-by-colour check. PUB-01's Licences control and DUR-01's three new controls have joined the list (D177, D179).
  Done when: a VoiceOver pass over the main control surface is recorded pass/fail per control, and the colour-only check is answered.
- [ ] **ICE-RECOLOUR-01 Creative recolouring: colour swap, pixel editor, and controls beyond nearest colour** [detail] (2026-08-22, signed 2026-08-23)
  Signed (D182): swap → tone-only matching → pixel editor; the swap is a design rule and a pure stage over the sidecar, targets from the whole universe, Swap… on the Colours-used row plus a Swaps chip list; layer A builds as schema v11 when scheduled.
  Done when: layer A ships with the round trip intact and a swap target reaching Colours used, the key and the estimates.

**Blocked on data or research.** Unblock order: DATA-04 and DATA-01
feed DATA-03; ICE-EXPLORER-01 is the consumer ICE-XREF-01 waits for.

- [ ] **DATA-01 Correct the swept catalogue rows** [maintainer] [detail] (2026-08-11)
  The detection half shipped (D155): the sweep runs inside `npm run audit`, worklist in `docs/catalogue-sweep.md` — 21 unnamed rows (all Finca) and 11 same-brand hex pairs. Corrections are the owner's, in `thread-list.csv`; regenerate and re-run the sweep for the delta.
- [ ] **DATA-02 Name-versus-colour disagreement in the catalogue** (2026-08-11)
  Intent: the class DATA-01 parks. A crude probe returns 402 hits dominated by legitimate compound names; real cases look different (`ariadna:1650` is a cyan-white named "heather very light").
  Done when: a probe with a defensible false-positive rate ships, or the class closes as cosmetic (identity is `brandId:reference`; RGB is display-only, D55/D56).
- [ ] **DATA-04 Catalogue data-structure review before finalisation** [sign-off] (2026-08-12)
  Intent: settle the catalogue's shape once, ahead of DATA-03, so finalisation triggers the regeneration cascade a single time — provenance vocabulary (D161), empty-name legality, shared-hex semantics, per-brand metadata, `mappedFrom` vs ICE-XREF-01, a data version, and where the owner CSV lives (D163).
  Done when: the owner signs the target schema with migration notes and the ripple list — `build-palette.mjs`, the core `Thread` type, every consumer, and the snapshots inside saved project files (the round trip must hold).
- [ ] **DATA-03 Finalise the catalogue values before publication** [maintainer] (2026-08-11, reshaped 2026-08-11)
  Intent: the values are compiled from public reference material, uncalibrated — the `provenance: "measured"` label is inaccurate (D161) and gets honest here. Lands as one catalogue rebuild with DATA-04's schema outcome and DATA-01's corrections (D164); manufacturer-published lists stay out of the repo.
  Done when: the owner finalises the values, the provenance label tells the truth, and the regeneration cascade runs with approvals.
- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data + no consumer] [detail] (2026-07-21)
  Owner-reviewed equivalences so "nearest equivalent" answers from published conversions, not colour distance. The real block is the missing consumer — do not start before ICE-EXPLORER-01.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance. The engine half exists; this is the view.

**Platform and packaging.** ICE-TAURI-01 unblocks ICE-WORKSPACE-01.

- [ ] **PUB-03 Clean-cut republication — dormant contingency** [blocked: a named trigger] (2026-08-12, demoted 2026-08-12)
  Intent: the D163 plan (publish from a fresh initial commit; this repository goes private as the archive). Wakes on a rights complaint touching this history, or the app turning commercial (which also retires the compiled catalogue values — DATA-03).
  Done when: triggered and executed per D163, or cut once publication is behind us.
- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] (2026-07-20)
  Raised by D149: publication targets any platform, so this spike is the packaging input.
- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [blocked: ICE-TAURI-01] [detail] (2026-07-20)
  Depends entirely on packaging (D53). D149 weakens the case — a broader audience may not run Photoshop.
