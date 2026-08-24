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
**Track B** (DUR-01 + SAVE-01, D179, 2026-08-23) and the **small UI
batch** (eight items, D191–D196, 2026-08-23); **Track A** is
build-complete (D165–D170), its close parked with the print programme.
The order set on 2026-08-23 (D189): the small UI batch first, then
**Track D — Creative control**, then **Track C — Publication**; the
**Print** programme (M16's sitting, PRINT-01 → PRINT-02, PRINT-TEST-01)
waits in the Icebox until the owner schedules it. The numbers stay
because they are greppable across the tickets and the decision log;
they no longer imply sequence.

## Active

### Current — Track D Creative control of the image

Opened 2026-08-23 at the icebox triage (D188). One subject: the user
controls the final picture *inside* the app, beyond nearest-colour
realism (D149; the first live-app ask, D173). The swap shipped
(D199); the creative programme is signed (D200) — five slices in
order, their spec shared in `tickets/CREATIVE-01.md` (the D149
shared-file exception; it dies with the last slice). PAINT-01 still
scopes separately.

**Interleaved 2026-08-24, ahead of the slices:** MENU-01 is not part of
the creative programme. It sits here because it is small, stands alone,
and is the precondition for ICE-PROFILES-02's batch three — the menu it
fixes is already a 25-item flat list, and that batch is what makes it
visibly worse.

- [ ] **MENU-01 Group the profile menu so it stays scannable** [detail] (2026-08-24)
  Intent: the colour-profile select is a flat list of every profile — 25 built-ins today, 33 after ICE-PROFILES-02's batch three. Group it (`<optgroup>`) on five groups, owner-chosen 2026-08-24: Your threads (3) / Basics (6) / Nature and place (8) / Style and era (8) / Your profiles. No group exceeds eight — the first proposal put all 19 non-library built-ins under one "Styles" heading, which tidied the edges and left the scrolling untouched; checked, the sixteen gallery profiles fall 8/8 into nature and culture, the axis ICE-PROFILES-02's pool A already uses. Verified as low-risk: the project file stores only `profileRef {id, revision}`, so no schema change and no migration; `ui-baseline` pins engine and export bytes, not DOM. Two selects carry it, and the editor's switcher is shared with dither (7) and adjust (9), which stay flat. The ticket carries a recommendation for every decision — a build session may proceed on them; the taxonomy is now settled, so a build session can proceed throughout.
  Done when: both selects group the colour profiles, the four special cases still behave (the unlinked "This design's colours" option, My inventory's empty state, the `(edited)` suffix, and the `(built-in)` suffix which the groups make redundant in the Colour section), the dither and adjust switchers are untouched, the audit table matches the menu, a UI-STANDARDS line records the rule — there is none on long lists today — and `check` is green with the first DOM-level test of the option structure.

- [~] **TONE-01 Tone mode: the weighted metric, the ramp and the curve** [detail] (2026-08-23)
  Intent: slice 1 (D200), schema v12 — the colour↔tone slider in the metric with the count-limit selection carrying the same weight, ladder mode with cut handles on the ramp (control and provenance in one), natural cuts + Equalise, target shares at source-lightness quantiles, the three-point curve, the colour-use floor, re-pick from the current frame. Dither diffuses in the weighted space (the prototype's confirmed call); the LUT key carries the weight (D46).
  Done when: a ladder profile maps a photograph as tone at the end-stop, the ramp readout shows achieved shares under dither, and the in-slice naming items (mode name, floor label/unit, confetti wording, ramp shape) are settled with the owner.
  Status: build landed and verified 2026-08-24 (D201) — everything above works in the app with working labels; open is the owner half of done-when: the four naming items, plus a keyboard pass on the ramp cut handles (the curve points went green at D203 — the control is shared; the driven browser cannot prove native activation).
- [ ] **ADJUST-02 Adjustments 2b: the six-band H/S/L mixer and the saturation range slider** [detail] (2026-08-23)
  Intent: slice 2b (D200) — both collapsed by default; the range slider's remap flavour (nominal with a low-S roll-off, lean, vs observed-range) is the design-options fork left open.
  Done when: both controls ship collapsed and the remap flavour is decided with the owner.
- [ ] **PICK-01 Eyedropper: grab a colour from the picture, the design or the screen** (2026-08-23)
  Intent: slice 3 (D200), no bump — pick from the source picture or the rendered design — and, where the browser has the EyeDropper API, from anything on screen — and resolve it to the nearest threads with their distance, feeding Must-use (pins, D178), swap targets (D182) and the inventory. The preview tool-mode pilot PAINT-01 inherits; the editor's pick-up tool is PAINT-01's.
  Done when: a picked colour lands in Must-use, a swap target or the inventory with its ΔE shown.
- [ ] **SHEET-01 The contact sheet as a mechanism** [detail] (2026-08-23)
  Intent: slice 4 (D200), no bump — frozen still → labelled variants → a pick adopts, through the worker route; axis 1 the dither presets, axis 2 the adjustment presets, profiles later. The render loop must not yield on frames alone (an occluded window suspends rAF — the prototype's constraint).
  Done when: both axes ship through the worker, a pick adopts into the design, and the adoption sentence survives the reprocess (STATUS-01 or its equivalent).
- [ ] **COMPARE-ERR-01 Match-error compare: the ΔE heat map** (2026-08-23)
  Intent: slice 5 (D200), no bump — a Compare-class decoration (D92) showing where the palette serves the picture worst, which is where a Must-use, a swap or a painted cell earns its place.
  Done when: the heat map ships as a compare mode with an honest label.
- [ ] **PAINT-01 Scope the pixel editor** [sign-off] [detail] (2026-08-23)
  Intent: an editor a stitcher can work in, not a demo brush — tools, the interaction model by pointer, keyboard and touch, persistence and clearing, undo, its composition with the swap's render palette (shipped, D199), and the v1 slice. Stills only in v1 (D182-3/4).
  Done when: the owner signs the v1 tool set, interaction model, persistence and build slices; each slice becomes its own Track D item.

### Next — Track C Publication

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

**Parked follow-ups — each wakes on a named trigger** (wish-list
triage, D197).

- [ ] **INFRA-03 Gate reliability on the synced tree** — `npm run audit` intermittently reports 2 failures right after a full `check` (twice, 2026-08-11; grab `/tmp/audit.log` while red), and `crates/stitch-engine/pkg` goes stale silently without a local Rust toolchain. Wakes on the next red.
- [ ] **CAPTURE-OMT-01 Off-main-thread capture** — move the surface-sized grab readback and dirty sample off the main thread (`MediaStreamTrackProcessor`-class); an architecture change with its own scope (D135). Wakes on felt stutter, or a captured surface materially over 6.5 MP.
- [ ] **COUNT-02 Re-select against the held source** — every distinct count step pays a full-RGB refetch plus the FLICKER-01 hold although the distribution does not depend on the count. Wakes on a slider-feel report.
- [ ] **DUR-02 Accept a deflate-compressed `.pmproj`** — a package re-zipped by Finder or Explorer is refused; `DecompressionStream('deflate-raw')` in an adapter outside core would accept it. Wakes when a user hits it.
- [ ] **DUR-03 Design-history follow-ups** — remove one design, clear the history, "Keep more designs" outside the near-quota window; a "capture the same window again" offer when a restored capture returns as a still. Wakes on a user ask.
- [ ] **DIAG-04 One-file report** — `project.json` plus the log inside a store-only `.pmproj` the app loads directly: one download, no multiple-downloads prompt (D187 chose two files). Wakes on tester friction.
- [ ] **SYMBOL-SWAP-01 Explicit symbol swap** — take another thread's glyph and hand it yours in one act; a model verb beside `setOverride`, the picker lists the unused pool only (D191). Wakes on a user ask.
- [ ] **STATUS-01 Keep a status sentence across one reprocess** — a sentence set beside a reprocess ("X is stitched as Y.", the Must-use sentences) shows only until the frame's "Preview updated." replaces it a second later; the status line needs a way to hold a user-facing sentence through one frame (from ICE-RECOLOUR-01). Wakes on a user missing an explanation.

**Parked — each wakes on a named trigger** (D188).

- [ ] **ICE-PROFILES-02 More built-in colour profiles: the unbuilt candidates** [detail] (2026-08-09)
  Forty unsigned candidate names kept when M15-GALLERY-01 closed at sixteen. Wakes when CREATIVE-01's tone-only matching ships or a user asks; done when run through the signed-batch process, or cut.
- [ ] **SNAP-01 Snap any profile to one manufacturer's range** [detail] [blocked: a named trigger] (2026-08-24)
  Intent: render any colour profile in the threads you actually buy — the owner's ask at the manufacturer split. Matters more than convenience: every curated built-in is a list of specific threads and all but one are DMC, so the gallery is brand-shaped even after MENU-01 removed DMC's billing from the menu; this removes it from the profiles. Could also retire D206's multi-brand hi-vis exception. **The engine half already exists and is wired to nothing** — `core/thread-equivalents.ts` does nearest-in-CIELAB per brand with a curated-over-computed model, tested, unused. The work is profile-level application, the UI, and the honesty: there is no curated data yet (`thread-map-proposed.csv` is a header), so every snap today is a *suggestion*, and a shopping list is what people spend money on.
  Done when: not scoped — a scoping pass answers where it lives (per-design control, standing preference, or export-only) and the collision rule (two colours snapping to one thread: shrink, second-nearest, or refuse), then produces a build slice. Wakes on the owner scheduling it, on curated cross-reference data arriving (DATA-01), or on a user asking for a design in another brand.
- [ ] **ICE-PICKER-01 A searchable, taggable profile picker** [detail] [blocked: a named trigger] (2026-08-24)
  Intent: what replaces MENU-01's grouped `<select>` once profiles outgrow it — tags AND groups, both, with collapse and search over each, and a highlighted few on top (the owner's hunch, 2026-08-24: "I think we'll have well over 100 profiles as things progress", which makes this a question of when rather than whether). Not MENU-01: a search field and tag filters cannot live inside a native `<select>`, and UI-STANDARDS prefers native (lines 212, 317), so leaving it must be earned by a count grouping cannot carry — 33 is not that count. Cheaper than it looks: `ui/browse-table.ts` already owns search, the row cap and the honest count line for the 3,338-thread browse, so the work is a row model plus filters, not a search control. Three orthogonal axes must stay separate: `group` (one, MENU-01 ships it), `tags` (many, here), `featured` (here).
  Done when: not scoped — a scoping pass answers the open questions (chiefly whether user profiles get tags, which is the one that costs a schema version) and produces a build slice. Wakes when one optgroup passes ~25 on its own, when a user asks to find a profile by anything but scrolling, or when saved profiles become a scrolling problem themselves.
- [ ] **ICE-SELECTS-01 Converge the four profile selects on one option renderer** (2026-08-24)
  Intent: four selects list profiles — `#colour-profile` (`ui/colour-section.ts`), `#dither-profile` and `#adjust-profile` (`main.ts`), and the editor's shared `#<kind>-profile-switcher` — and each hand-rolls its option loop. They have drifted: one builds labels inline, two build from `[value, label]` pairs, and the `(built-in)` suffix and sentinel handling differ between them as a result. The *controls* are correctly separate (a section select applies a profile to the design; the switcher opens one for editing, guarded by `confirmDiscard`) — only the rendering should converge. MENU-01 extracts a helper for the two colour selects as a precondition of grouping; this item finishes the job across all four.
  Done when: one renderer serves all four selects with their differences expressed as options, not as copies. Wakes when MENU-01 has landed its helper, or when a fifth select is proposed.
- [ ] **TWOCOLOUR-01 A two-colour mode whose two colours you choose** [detail] (2026-08-24)
  Intent: two colours of the user's choosing is reachable today only by building a profile with two pinned colours — seven steps through a general editor, and nothing in the product names the idea (`grep` finds no "1-bit" or "two colour" in the UI). Worse, the name that does exist misleads: `1-bit RGB` is eight colours, being one bit per channel, so the app currently answers the question wrongly. `Black & white` is the obvious start and cannot be edited, its membership being a generated map. The ticket carries three shapes (a pinned built-in, a fourth profile kind, a Colour-section shortcut) plus the `1-bit RGB` re-label; the owner picks.
  Done when: a user reaches a two-colour design with their own two colours without working out that a profile is the mechanism, and `1-bit RGB` no longer misdirects. Raised by the owner 2026-08-24 and iceboxed by their own "maybe for later" — wakes on their word, no other trigger needed.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance; the engine half exists. Wakes on a user ask. Its ticket carries the curated cross-reference note absorbed from ICE-XREF-01 (cut 2026-08-23).
- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] [blocked: a named trigger] (2026-07-20)
  Raised by D149: publication targets any platform, so this spike is the packaging input. Wakes on users asking for an installable app, or browser capture proving insufficient on a platform the audience uses; its Photoshop-workspace case went with ICE-WORKSPACE-01 (cut, D188).
- [ ] **PUB-03 Clean-cut republication — dormant contingency** [blocked: a named trigger] (2026-08-12, demoted 2026-08-12)
  Intent: the D163 plan (publish from a fresh initial commit; this repository goes private as the archive), kept as an option. Wakes on a rights complaint touching this history, or the app turning commercial (which also retires the compiled catalogue values — DATA-03).
  Done when: triggered and executed per D163, or cut once publication is behind us.
