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
**Track B** (DUR-01 + SAVE-01, D179, 2026-08-23); **Track A** is
build-complete (D165–D170), its close parked with the print programme.
The order set on 2026-08-23 (D189): the **small UI batch** first, then
**Track D — Creative control**, then **Track C — Publication**; the
**Print** programme (M16's sitting, PRINT-01 → PRINT-02, PRINT-TEST-01)
waits in the Icebox until the owner schedules it. The numbers stay
because they are greppable across the tickets and the decision log;
they no longer imply sequence.

## Active

### Current — Small UI batch

Promoted from the Icebox at the 2026-08-23 triage (D188) — the five
shipped (D191–D194) — and, from the wish-list triage the same day, the
UI defects the owner ran in the same gateless batch; this order.

- [ ] **CAPTURE-END-01 End-of-capture salience** — the external-stop line ("Screen capture ended (sharing was stopped).") is truthful but easy to miss (owner sitting, D134). Done when the end of a capture is announced with a Carbon inline notification the user cannot miss, dismissible, in addition to the status line.

### Next — Track D Creative control of the image

Opened 2026-08-23 at the icebox triage (D188). One subject: the user
controls the final picture *inside* the app, beyond nearest-colour
realism (D149; the first live-app ask, D173). The swap is build-ready;
everything else runs through two scoping tickets with sessions,
prototypes and sign-off sittings of their own.

- [ ] **ICE-RECOLOUR-01 Colour swap (layer A)** [detail] (2026-08-22, signed 2026-08-23)
  Signed and optioned (D182): a design rule in `palette.design.swaps`, a pure stage over the sidecar with a render palette, targets from the whole universe, Swap… on the Colours-used row plus a Swaps chip list; builds as schema v11 in full mode from the plan gate. Closes MUST-01's presence half; layers B and C moved to PAINT-01 and CREATIVE-01 (D188).
  Done when: layer A ships with the round trip intact and a swap target reaching Colours used, the key and the estimates.
- [ ] **CREATIVE-01 Scope the creative and diagnostic image features** [sign-off] [detail] (2026-08-23)
  Intent: one signed programme — what ships, in what order, where each lives (stage, stage parameter, profile kind or view), the first slice — for the candidates the triage kept: tone-only matching (RECOLOUR C1), adjustments as a third profile kind (ICE-ADJUST-01), the contact sheet as a mechanism (ICE-VARIANTS-01), the tonal provenance view (ICE-PROVENANCE-01, the diagnostic half), PICK-01's in-app half, the target % distribution (RECOLOUR C2) and the ICE-PROFILES-02 hook. The IDs stay greppable here; the intent lives in the ticket.
  Done when: the owner signs the list, order, placements, persistence and UI homes; each signed feature becomes its own Track D item.
- [ ] **PAINT-01 Scope the pixel editor** [sign-off] [detail] (2026-08-23)
  Intent: an editor a stitcher can work in, not a demo brush — tools, the interaction model by pointer, keyboard and touch, persistence and clearing, undo, its composition with the swap's render palette, and the v1 slice. Stills only in v1, after layer A (D182-3/4).
  Done when: the owner signs the v1 tool set, interaction model, persistence and build slices; each slice becomes its own Track D item.
- [ ] **PICK-01 Eyedropper: grab a colour from the picture, the design or the screen** (2026-08-23)
  Intent: pick from the source picture or the rendered design — and, where the browser has the EyeDropper API, from anything on screen — and resolve it to the nearest threads with their distance, feeding Must-use (pins, D178), swap targets (D182) and the inventory. The editor's pick-up tool is PAINT-01's.
  Done when: scoped in CREATIVE-01 and PAINT-01, then built as a Track D item.

### Then — Track C Publication

Live since 2026-08-22 at <https://djdaojones.github.io/pattern-mapper/>:
a green `check` on `main` publishes the built bundle and then verifies
it (PUB-04/PUB-05, D172/D180). Publication proceeds in this repository
(D164); `LICENSE` and the notices ship and are readable in-app (D161,
D177). Both items are the owner's; the 2026-08-22 branch deploy
overtook the PUB-02 gate, so that one is pressing.

- [ ] **PUB-02 Replace `graphic.jpg` and confirm the photo provenance** [maintainer] (2026-08-11)
  Intent: the flat-graphic demo slot is third-party fan art with a two-layer rights problem (the artist's copyright and the underlying mark); it gates public deploy (D150) and is already live. The owner replaces it — the plan (2026-08-12): a Blender cube lit by three RGB lights, giving a colour spread and a luminance ramp from primitives alone, so no rights problem remains; the `PHOTO_SLOTS` contract keeps the name, zero code changes.
  Done when: `graphic.jpg` at HEAD is rights-clean, and the five photographs are confirmed as the owner's own (`landscape-1.jpg` also seeded the M8 golden crop).
- [ ] **DIAG-03 Set `DEV_EMAIL` to the dedicated alias** [maintainer] (2026-08-23)
  Intent: one line in `src/ui/diagnostics-button.ts` — a retirable alias, never a personal address (D187); until then "Report a problem" composes with no recipient. Each push deploys.
  Done when: a tester's report reaches the alias.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

**Print — parked 2026-08-23 on the owner's word (D189).** Scoped and
build-ready (`838f3e7`): the owner's calls — the preset sizes stand as
starting values, every print size derives from one type scale, no
backward compatibility for print settings (files still load), M16's
sitting signs the standard first — are in PRINT-01's ticket. Returns to
Active when the owner schedules it; Track A's close waits with it.

- [ ] **M16 The print standard: sign the floors and presets on paper** [sign-off] (2026-08-09, re-aimed 2026-08-23)
  The owner's sitting with a printer signs the Readable / Large print / Compact values, the default assembly mode and key placement, and records M9's print inspection and M12's estimate review (D170) — the evidence PRINT-01 builds to. Pack at `bench-reports/m16-sitting/`; its form's items 2–9 and 13 are superseded by PRINT-01's model. Done when the preset table and defaults are signed in the decision log, M9's inspection and M12's review are recorded pass/fail, and Track A's close is decided.
- [ ] **PRINT-01 The print plan: size presets with floors, a planner that fits the paper** [detail] (2026-08-23)
  Readable / Large print / Compact presets with text and cell floors, furniture as ratios of the cell, balanced tiles, paper and orientation alternatives with a page stepper, A3 and a true-size page, key with the chart or separate; the print-plan model replaces `export.pdf`. Done when a 200² design prints at ≥ 3.5 mm per stitch with ≥ 10 pt numbers by default and PRINT-TEST-01 is green at every preset.
- [ ] **PRINT-02 Assembly and sequence: join, work page by page, a key per page** [detail] (2026-08-23)
  The two ways a tiled chart is used — taped into one sheet (lettered tiles, glue tabs, registration marks, an assembly page) or stitched page by page (shaded overlap, continuation labels, stitching-order pages, a per-page key). Done when both modes print from the plan and the pages tape together by their marks.
- [ ] **PRINT-TEST-01 The proof set: one command prints every case with a checklist** [detail] (2026-08-23)
  `npm run print:proof` renders every chart style × preset × paper × mode with a proof strip per sheet and writes the tick-box checklist. Done when the set renders from one command and a ruler on the scale bar proves 100 %.

**Owner-paced — yes at the 2026-08-23 triage (D188)**, scheduled by the
owner; the catalogue is one cascade (DATA-01 → DATA-04 → DATA-03, D164).

- [ ] **A11Y-VO-01 The human remainder of the screen-reader pass** [maintainer] (2026-08-09)
  Intent: A11Y-01 took the "has a name" half; this is whether the announcements are any *good*, plus the no-meaning-by-colour check. PUB-01's Licences control and DUR-01's three new controls have joined the list (D177, D179). Pairs with M16's sitting.
  Done when: a VoiceOver pass over the main control surface is recorded pass/fail per control, and the colour-only check is answered.
- [ ] **DATA-01 Correct the swept catalogue rows** [maintainer] [detail] (2026-08-11)
  The detection half shipped (D155): the sweep runs inside `npm run audit`, worklist in `docs/catalogue-sweep.md` — 21 unnamed rows (all Finca) and 11 same-brand hex pairs. Corrections are the owner's, in `thread-list.csv`; regenerate and re-run the sweep for the delta.
- [ ] **DATA-04 Catalogue data-structure review before finalisation** [sign-off] (2026-08-12)
  Intent: settle the catalogue's shape once, ahead of DATA-03, so finalisation triggers the regeneration cascade a single time — provenance vocabulary (D161), empty-name legality, shared-hex semantics, per-brand metadata, `mappedFrom` vs the curated cross-reference note in ICE-EXPLORER-01's ticket, a data version, and where the owner CSV lives (D163).
  Done when: the owner signs the target schema with migration notes and the ripple list — `build-palette.mjs`, the core `Thread` type, every consumer, and the snapshots inside saved project files (the round trip must hold).
- [ ] **DATA-03 Finalise the catalogue values before publication** [maintainer] (2026-08-11, reshaped 2026-08-11)
  Intent: the values are compiled from public reference material, uncalibrated — the `provenance: "measured"` label is inaccurate (D161) and gets honest here. Lands as one catalogue rebuild with DATA-04's schema outcome and DATA-01's corrections (D164); manufacturer-published lists stay out of the repo.
  Done when: the owner finalises the values, the provenance label tells the truth, and the regeneration cascade runs with approvals.

**Parked — each wakes on a named trigger** (D188).

- [ ] **ICE-PROFILES-02 More built-in colour profiles: the unbuilt candidates** [detail] (2026-08-09)
  Forty unsigned candidate names kept when M15-GALLERY-01 closed at sixteen. Wakes when CREATIVE-01's tone-only matching ships or a user asks; done when run through the signed-batch process, or cut.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance; the engine half exists. Wakes on a user ask. Its ticket carries the curated cross-reference note absorbed from ICE-XREF-01 (cut 2026-08-23).
- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] [blocked: a named trigger] (2026-07-20)
  Raised by D149: publication targets any platform, so this spike is the packaging input. Wakes on users asking for an installable app, or browser capture proving insufficient on a platform the audience uses; its Photoshop-workspace case went with ICE-WORKSPACE-01 (cut, D188).
- [ ] **PUB-03 Clean-cut republication — dormant contingency** [blocked: a named trigger] (2026-08-12, demoted 2026-08-12)
  Intent: the D163 plan (publish from a fresh initial commit; this repository goes private as the archive), kept as an option. Wakes on a rights complaint touching this history, or the app turning commercial (which also retires the compiled catalogue values — DATA-03).
  Done when: triggered and executed per D163, or cut once publication is behind us.
