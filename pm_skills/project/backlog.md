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
M0–M8, M13, M14, M15, and **Batch C0** (D149–D159, 2026-08-11).
Remaining: **Track A** (M9 → M11 → M16 → M10 → M12), then **Track B**,
with **Track C — Publication** owner-paced alongside. The numbers stay
because they are greppable across the tickets and the decision log;
they no longer imply sequence.

## Active

### Current — Track A The printable pattern

Committed at D149; Current since Batch C0 shipped (D159). **Track A is
build-complete** — M9, M11, M10 and M12 all shipped (D165–D170), so
the brief's second success criterion is mechanically met. One
owner-gated item remains.

- [ ] **M16 Print-sized export defaults** [sign-off] (2026-08-09)
  Intent: export defaults sized for print, not screen — enlarged PNG ~2k px on its longest side, grid and numbering on by default, across all four exporters (demoted at D149; waits on M9's symbol decision — now landed).
  Done when: the owner signs the defaults per exporter, what stays configurable, and how saved projects' export settings migrate.
  Absorbs, on one sitting (D170): M9's remaining print inspection (every chart mode at minimum and typical cell sizes, grayscale/low-ink, key↔chart agreement) and M12's estimate defaults-and-wording review.

### Reported from the live app (2026-08-22)

The first user feedback since the deploy (D172), relayed by the owner
without steps or a bundle. Diagnosed in the running app before anything
was proposed (D173); sequencing is the owner's call — placed here so
the next pick sees them.

- [ ] **DIAG-02 Diagnostics for testers on the live build** [detail] (2026-08-23, opt-in and palette logging shipped 2026-08-23)
  Shipped (D175): the Debug menu mounts on the live build behind `?diag=1`, and every palette resolution is logged (profile, rule, seats, membership, selected, conflicts, source). Remaining: a one-click "Report a problem" that saves the project JSON and the redacted log together and opens the email route — waits on the `DEV_EMAIL` placeholder, which ships in a public bundle.
  Done when: a tester on the live URL can produce, in one click, a bundle and a project file naming the build, profile, count rule, seats, resolved palette and every conflict.

### Track B Durability & identity

Opened 2026-08-11 (D149). One subject: the app loses your work and
cannot tell two designs apart.

- [ ] **DUR-01 Work survives closing the tab** [sign-off] [detail] (2026-08-11, scope signed 2026-08-12)
  **Scope signed (D170)**: restore on reopen, a **history** of recent designs with the UI steering to explicit save, the source image restored **and embedded in saved files** (a live capture freezes to a still on save), bounded storage with an eviction warning and an opt-in to persist.
  Done when: reopening returns the design in progress without an explicit save, explicit saves still mean what they mean (portable, shareable, survives a storage clear-out), and the round-trip invariant holds.
  Open at the option gate: how images ride in a saved file — the format decision that follows from "picture files part of saves".
- [ ] **SAVE-01 A saved project has no name of its own** (2026-08-09)
  Intent: `projectFilename` names the file from the grid alone, so every 200 × 200 design saves identically. A `Design title` field already exists — does it drive the filename, and what does load do.
  Done when: a project carries a name the owner chose, it survives save/load, and two designs never collide by default. Ships with DUR-01.

### Track C — Publication

Opened 2026-08-11 (D160); audit clean, `LICENSE` landed (D161), notices
reachable in-app (PUB-01, D177).
**Publication proceeds in this repository** (D164): continuity over a
clean cut; protections rest on the stated posture and the items below.
**Live since 2026-08-22** at <https://djdaojones.github.io/pattern-mapper/>:
a green `check` on `main` publishes the built bundle (PUB-04, D172).
The owner's own branch deploy that day overtook the PUB-02 gate; the
item stays open and is now the pressing one.

- [ ] **PUB-02 Replace `graphic.jpg` and confirm the photo provenance** [maintainer] (2026-08-11)
  Intent: the flat-graphic demo slot is third-party fan art with a two-layer rights problem (the artist's copyright, and the underlying mark). The owner replaces it; the `PHOTO_SLOTS` contract keeps the name `graphic.jpg`, zero code changes. The item **gates public deploy** (D150: fix HEAD, keep history). The 2026-08-22 branch deploy already published HEAD's copy; PUB-04 narrowed the public surface to `dist`, which still carries the slot.
  Done when: `graphic.jpg` at HEAD is rights-clean, and the five photographs are confirmed as the owner's own (`landscape-1.jpg` is load-bearing twice: it seeded the M8 golden crop).
  Owner's replacement plan (2026-08-12): render it — a cube in Blender lit by three RGB lights aimed at the visible corners, giving both a colour spread and a luminance ramp across flat faces, which is exactly what the slot tests. Wholly self-produced from primitives, so the two-layer rights problem dissolves rather than being swapped for another.
- [ ] **PUB-05 Post-deploy verification as one command** (2026-08-23) — fetch the live index and compare its `buildId` with the commit just pushed; today a manual step (promoted from the wish-list; from 2026-08-22 PUB-04).
- [ ] **PUB-06 The bench harness ships inside the Pages bundle — decide whether the public bundle should carry it** (2026-08-23) — `bench.html` and `bench-source.html` are rollup inputs, so they ride in the Pages bundle, and the popup path is root-relative; keep, exclude from the Pages build only, or exclude from all builds (promoted from the wish-list; from 2026-08-22 PUB-04).

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

- [ ] **ICE-SYMBOL-UI-01 Manual symbol override picker** (2026-08-12)
  Intent: M9's declared v1-optional slice, deferred whole at its close (D170). Pick from *unused* glyphs only; taking another thread's symbol is an explicit swap, never a conflict state (D160-3).
  Done when: a thread's symbol can be reassigned from the unused pool and the override survives save/load. The model and persistence already exist — this is the UI alone.

**Presumptive milestone after Track A** (D149): controlling the final
image *is* the point of the app, and a broader audience may have no
upstream editor at all.

- [ ] **ICE-ADJUST-01 Image adjustments as a third profile kind** (2026-08-04, rescoped 2026-08-11)
  Intent: tonal sliders plus **colour thresholds as presets** — the first slice of §9, making the `adjust` stage real (D48). Build as a third kind on M15's profile editor, not loose sliders.
  Done when: adjustments remap the source ahead of reduction with live preview, ship as read-only built-ins plus editable copies, and survive save/load.
- [ ] **ICE-PROVENANCE-01 Tonal provenance view** (2026-08-04)
  Intent: D92's remaining tonal half — where each chosen thread sits in the source's light↔dark range. Needs new selection-stage introspection; an upstream editor cannot tell you this.
  Done when: the palette's tonal coverage is visible against the source's range, labelled as provenance.

**Owner judgement required** — none can run gatelessly.

- [ ] **ICE-VARIANTS-01 A contact sheet: one axis first** (2026-08-09, narrowed 2026-08-11)
  Intent: show a spread side by side and pick by eye. Narrowed by D149 to one bounded axis — the five dither methods from a frozen still.
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
  Intent: A11Y-01 took the "has a name" half; this is whether the announcements are any *good*, plus the no-meaning-by-colour check.
  Done when: a VoiceOver pass over the main control surface is recorded pass/fail per control, and the colour-only check is answered.

- [ ] **ICE-RECOLOUR-01 Creative recolouring: colour swap, pixel editor, and controls beyond nearest colour** [sign-off] [detail] (2026-08-22)
  Intent: creative control past realism in the colour mapping — a thread-for-thread swap layer (presence, where Must-use is only a seat), a cell-level pixel editor, and quantiser controls such as tone-only matching and the owner's target % distribution of palette colours (strongest at 1-bit / 2-state; deep thought, not solving). Pure stages after the colour stage or reduce-stage params — never preview-only.
  Done when: the owner signs which layers ship, in what order (the ticket recommends swap → tone-only matching → pixel editor after DUR-01), and where they live in the UI.

**Blocked on data or research.**

- [ ] **DATA-01 Correct the swept catalogue rows** [maintainer] [detail] (2026-08-11)
  The detection half shipped (D155): the sweep runs inside `npm run audit`, worklist in `docs/catalogue-sweep.md` — 21 unnamed rows (all Finca) and 11 same-brand hex pairs (the four **consecutive** Sullivans pairs first). Corrections are the owner's, in `thread-list.csv`; regenerate and re-run the sweep for the delta.
- [ ] **DATA-02 Name-versus-colour disagreement in the catalogue** (2026-08-11)
  Intent: the class DATA-01 parks. A crude probe returns 402 hits dominated by legitimate compound names; real cases look different (`ariadna:1650` is a cyan-white named "heather very light").
  Done when: a probe with a defensible false-positive rate ships, or the class closes as cosmetic (identity is `brandId:reference`; RGB is display-only, D55/D56).
- [ ] **DATA-04 Catalogue data-structure review before finalisation** [sign-off] (2026-08-12)
  Intent: settle the catalogue's shape once, ahead of DATA-03, so finalisation triggers the regeneration cascade a single time. On the table: an honest `provenance` vocabulary (D161); empty-`name` legality (the Finca rows); the 3,338 → 2,830 shared-hex semantics; per-brand metadata for M12 (skein length as data); `mappedFrom` vs ICE-XREF-01's table; a data version on the catalogue; and **where the owner CSV's source of truth lives** (in-repo vs private master, D163).
  Done when: the owner signs the target schema with migration notes and the ripple list — `build-palette.mjs`, the core `Thread` type, every consumer, and the snapshots inside saved project files (the round trip must hold).
- [ ] **DATA-03 Finalise the catalogue values before publication** [maintainer] (2026-08-11, reshaped 2026-08-11)
  Intent: the values are **compiled from public reference material, uncalibrated** (the `provenance: "measured"` label is inaccurate — D161 — and gets honest here). Lands as **one catalogue rebuild** with DATA-04's schema outcome and DATA-01's corrections (D164).
  Done when: the owner finalises the values, the provenance label tells the truth, and the regeneration cascade runs with approvals. Standing constraint: manufacturer-published lists stay **out of the repo** (the `THIRD-PARTY-NOTICES.md` posture).
- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data + no consumer] [detail] (2026-07-21)
  Owner-reviewed equivalences so "nearest equivalent" answers from published conversions, not colour distance. The real block is the missing consumer — do not start before ICE-EXPLORER-01.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance. The engine half exists; this is the view.

**Platform and packaging.**

- [ ] **PUB-03 Clean-cut republication — dormant contingency** [blocked: a named trigger] (2026-08-12, demoted 2026-08-12)
  Intent: the D163 plan (publish from a fresh initial commit; this repository goes private as the archive), kept as an option. Wakes on either trigger: a rights complaint touching this history, or the app turning commercial (which also retires the compiled catalogue values — DATA-03).
  Done when: triggered and executed per D163, or cut once publication is behind us.
- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] (2026-07-20)
  Raised by D149: publication targets any platform, so this spike is the packaging input.
- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [blocked: ICE-TAURI-01] [detail] (2026-07-20)
  Depends entirely on packaging (D53). D149 weakens the case — a broader audience may not run Photoshop at all.
