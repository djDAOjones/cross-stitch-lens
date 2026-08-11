# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- OPEN WORK ONLY. Status: [ ] todo  [~] in progress  [-] cut. -->
<!-- Shipped work does NOT stay here. On ship: add one line to
     trajectory.md (the outcome) + an entry to decision-log.md (the why),
     then remove the item from this file. There is no Completed section. -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See pm_skills/memory-policy.md for limits; run memory-maintenance.md
     (Refactor) when the queue drifts into dated rounds. -->

Milestones ship in order. A milestone is done when its acceptance
line passes and `check` is green. Requirements references are to
`docs/requirements.md`.

**Ship order is no longer milestone-number order** (D149). Shipped:
M0–M8, M13, M14, M15. Remaining: **Batch C0**, then **Track A**
(M9 → M11 → M16 → M10 → M12), then **Track B**. The numbers stay
because they are greppable across the tickets and 149 decision
entries; they no longer imply sequence.

## Active

### Current — Batch C0 Sharpen the tools

Opened 2026-08-11 (D149). Fifteen mechanical items — confirmed
mechanism, named acceptance, no taste — as one gateless **autojazz**
batch. Nothing new: the 2026-08-09 sitting's findings plus the tooling
debt that made that sitting expensive.

**Scope and traced mechanisms are in `tickets/BATCH-C0.md`** — one run
sheet, not one file per item, since they ship together. Read it first;
the lines below are pointers only.

Order: RENAME-01 → the doc-sync pass (`doc-deltas.md`, not an item) →
AUDIT-01 → ROUTE-01 → the rest in any order. Those three are
preconditions for trusting the run: a rename afterwards means rewriting
what the run wrote, and `npm run audit` is red so the audits give no
signal. Closes on `check` **and** `audit` green.

- [ ] **RENAME-01 Rename the product to Pattern Mapper** [sign-off] [detail] (2026-08-11)
  Blocking question — which tier: strings only / plus code identity (needs preferences + IndexedDB migrations or user data is orphaned) / plus platform (repo, remote, synced directory — those three are the owner's, not the agent's).
- [ ] **AUDIT-01 `npm run audit` fails on a stale post-M8 assertion** [detail] (2026-08-11)
- [ ] **ROUTE-01 One routing disagreement in the M5-PERF-27 sweep** [detail] (2026-08-11)
  Read the `margin` column first: near-1.0 is noise and the assertion should tolerate ties; wide is a real defect. Not the same class as AUDIT-01.
- [ ] **DIAG-01 Benign browser noise is logged as an uncaught error** [detail] (2026-08-11)
- [ ] **KEY-01 The PDF thread key prints the hex twice** [detail] (2026-08-11)
  Regression fixture must be an **unnamed** generated colour — the existing green unit test uses the flattering named case.
- [ ] **EXPORT-01 Assert the exported artefacts, not just the helpers** [detail] (2026-08-11)
- [ ] **M8-GOLD-02 Golden fixtures for the four M8 methods** [detail] (2026-08-11)
  Owner-approved 2026-08-09. Source is a small JSON crop of `landscape-1.jpg` in the 8×8 house style, never the JPEG.
- [ ] **DATA-01 Sweep the thread catalogue: the two certain classes** [detail] (2026-08-11)
  Agent detects and reports; `thread-list.csv` is protected owner data and only the owner corrects it.
- [ ] **UI-06 Move "Colours used" under the Colour section** [detail] (2026-08-11)
- [ ] **DITH-06 Name the built-in dither profiles after their method** [detail] (2026-08-11)
  The run drafts seven names carrying method + plain qualifier; the owner signs.
- [ ] **FLICKER-01 Changing the colour count flickers through the source** [detail] (2026-08-11)
  Confirm the mechanism before fixing — the two candidate fixes are different changes.
- [ ] **ZOOM-01 The canvas jumps on the first wheel zoom** [detail] (2026-08-11)
  Confirm the mechanism before fixing; the suspect is the fit→manual handover, not the zoom curve.
- [ ] **A11Y-01 The automatable half of the screen-reader pass** [detail] (2026-08-11)
  Hand-rolled over `tests/ui-styles.test.ts`; no new dependency.
- [ ] **STALE-01 Close the small-edit staleness reservation** [detail] (2026-08-11)
  Close as accepted. Do **not** lower `DIRTY_MAX_STALE_MS` gatelessly — it trades an asserted promise for a comfort already accepted.
- [ ] **DOCS-01 Retire or automate the transcript-saving ritual** [detail] (2026-08-11)
  Its stated `.gitignore` blocker was already fixed; only the save-or-retire question remains.

### Next — Track A The printable pattern

Committed 2026-08-11 (D149). The product's unfinished half: M13–M15 all
improved the input and appearance side, and the brief's second success
criterion — a stitchable chart PDF printed from a captured design — is
still not met. That PDF is one page, colour cells only, screen-sized,
no symbols.

- [ ] **M9 Symbols & B/W charting** [sign-off] [detail] (2026-07-22)
  Automatic distinct-symbol assignment (stable, reassignable, collision-handled), chart modes, full sortable colour key with brand + reference + stitch count.
  Owner decisions first: symbol visual language, asset/font licence, manual-override scope, whether assignments survive palette replacement. **The licence answer now depends on distribution (D149)** — settle ICE-TAURI-01's intent first or pick symbol assets twice.
- [ ] **M11 Grid, ruler & tick styling presets** [detail] (2026-07-22)
  Minor/major grid styling, numbering/rulers, named presets incl. high-contrast, separate screen vs print settings. Absorbs the `FIT_MARGIN` tick-label clip waived at M14-VERIFY-01.
- [ ] **M16 Print-sized export defaults** [sign-off] (2026-08-09)
  Intent: export defaults sized for print, not screen — enlarged PNG ~2k px on its longest side, grid lines and major numbering on by default, across all four exporters.
  Done when: the owner signs the defaults per exporter, what stays configurable, and how a saved project's export settings migrate. **Demoted from milestone to a task in this arc (D149)**: its grid-and-numbering ask *is* an M11 preset, and print defaults cannot be settled before M9 decides whether a cell carries a symbol. Exports still re-run the pipeline at full quality.
- [ ] **M10 Multi-page PDF chart export** [blocked: M9 for symbol charts] [detail] (2026-07-20)
  A4/Letter pagination, overlap + registration marks, consistent coordinates + overview map, vector grid/symbols. Pure page planner first — bounded geometry, fully testable.
- [ ] **M12 Fabric & thread estimates** [detail] (2026-07-22)
  Fabric count → physical size, cut margins, centre point; qualified per-colour thread/skein estimates. Every result discloses its assumptions; an estimate is never presented as a guarantee.

### Track B Durability & identity

Opened 2026-08-11 (D149). One subject: the app loses your work and
cannot tell two designs apart.

- [ ] **DUR-01 Nothing survives closing the tab** [sign-off] (2026-08-11)
  Intent: no autosave, no session restore, no unsaved-work guard (`beforeunload` is absent from `src/`). IndexedDB holds **library** data only; localStorage holds accordion state. The design — source, crop, grid, palette snapshot, dither, export settings — exists only if you save a file, and the mitigation is one sentence at `src/main.ts:1971`. Confirmed at M14-AUDIT-02 (D75), never opened as work; `architecture.md` wrongly claimed autosave existed until D149.
  Done when: the owner signs what is restored and when, closing and reopening returns the design in progress without an explicit save, explicit saves still mean what they mean, and the round-trip invariant holds.
  Scope questions: one slot or a history; does restore compete with `Save project`; what happens when a restored design references a profile or thread the library lost; does the source image persist (a 2048² still is megabytes).
- [ ] **SAVE-01 A saved project has no name of its own** (2026-08-09)
  Intent: `projectFilename` names the file from the grid alone (`src/main.ts:2032`), so every 200 × 200 design saves identically and a folder of projects is indistinguishable. A `Design title` field already exists, so the question is whether it drives the filename, whether there is a dialogue, and what load does.
  Done when: a project carries a name the owner chose, it survives save/load, and two designs never collide by default. Ships with DUR-01.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

**Presumptive milestone after Track A.** D149 moved these up: the owner
holds that controlling the final image process *is* the point of the
app, and a broader audience may have no upstream editor at all — which
defeats the "Photoshop does it better" case against adjustments.

- [ ] **ICE-ADJUST-01 Image adjustments as a third profile kind** (2026-08-04, rescoped 2026-08-11)
  Intent: tonal sliders plus **colour thresholds as presets** — the first slice of §9, and what makes the `adjust` stage real (present since M1, omitted from built pipelines until §9 params exist, D48). Build it as a third kind on M15's kind-agnostic profile editor, not loose sliders: "available as presets" is what that shell already does.
  Done when: adjustments remap the source ahead of reduction with live preview, ship as read-only built-ins plus editable copies, and survive save/load.
- [ ] **ICE-PROVENANCE-01 Tonal provenance view** (2026-08-04)
  Intent: D92's remaining tonal half — where each chosen thread sits in the source's light↔dark range. Needs new selection-stage introspection. Unlike adjustments, an upstream editor cannot tell you this.
  Done when: the palette's tonal coverage is visible against the source's range, labelled as provenance.

**Owner judgement required** — none can run gatelessly.

- [ ] **ICE-VARIANTS-01 A contact sheet: one axis first** (2026-08-09, narrowed 2026-08-11)
  Intent: stepping one value at a time makes you compare against memory; show a spread side by side and pick by eye. Narrowed by D149 to one bounded axis — the five dither methods from a frozen still — from the original four axes. Let one axis earn the rest.
  Done when: a five-cell dither sweep renders from a frozen still, each cell labelled, and picking a cell adopts that method. Never live capture: one pipeline per frame is a standing rule.
- [ ] **ICE-LIMIT-01 Rescale the colour-limit slider** (2026-08-09)
  Intent: promoted from the wish-list at D149. Ceiling to 512, a perceptual scale putting the midpoint near 16, and drop 1 as selectable — 2→16 is where the picture changes most and 1 has no definition. Supersedes part of M14-EXT-13's range (D98).
  Done when: the owner signs the scale and floor, and projects saved under the old range still load.
- [ ] **ICE-WIDTH-01 Decide what the app's width is designed for** (2026-08-09)
  Intent: the shell says "works down to 320 px" but nobody decided what width it is *for*. Owner's goal: as narrow as possible while fully functional — though D149's broader audience will not always run Photoshop beside it.
  Done when: a stated width target and rationale are recorded, and narrow-width behaviour is judged against it. Pairs with UI-06.
- [ ] **ICE-WIDTH-02 A low-height readout for judging window width** [blocked: ICE-WIDTH-01] (2026-08-09)
  Intent: the header's width line is the right idea but costs two lines of height exactly where space is scarcest. Blocked: a readout cannot place you until there is a target.
- [ ] **ICE-PROFILES-02 More built-in colour profiles: the unbuilt candidates** [detail] (2026-08-09)
  Forty unsigned candidate names kept when M15-GALLERY-01 closed at sixteen. Done when run through the signed-batch process, or cut.
- [ ] **A11Y-VO-01 The human remainder of the screen-reader pass** [maintainer] (2026-08-09)
  Intent: narrowed by D149 — A11Y-01 takes the "has a name" half; this is whether the announcements are any *good*, plus the no-meaning-by-colour check. An open gap against M15's AAA commitment, recorded rather than guessed.
  Done when: a VoiceOver pass over the capture controls, colour/dither selects, editor fields and export buttons is recorded pass/fail per control, and the colour-only check is answered.

**Blocked on data or research.**

- [ ] **DATA-02 Name-versus-colour disagreement in the catalogue** (2026-08-11)
  Intent: the class DATA-01 parks. A crude probe returns 402 hits dominated by compound names ("Blue Green") legitimately sitting between their two words; real cases look different (`ariadna:1650` is a cyan-white named "heather very light").
  Done when: a probe with a defensible false-positive rate ships, or the class closes as cosmetic — a wrong name is ugly in the key, since identity is `brandId:reference` and RGB is display-only (D55/D56).
- [ ] **DATA-03 Published brand colour values** [blocked: owner data] (2026-08-11)
  Intent: the class that affects output. All 3,338 rows are provenance `measured` with no published source in the repo, so no hex can be checked against what the brand says. The item this was split out of (D149) excluded it while chasing the cosmetic class.
  Done when: at least one brand's published values are in the repo as owner data with provenance recorded, and the measured rows are diffed against them.
- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data + no consumer] [detail] (2026-07-21)
  Owner-reviewed equivalences so "nearest equivalent" answers from published conversions, not colour distance. The real block is the missing consumer — do not start before ICE-EXPLORER-01.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance. The engine half exists; this is the view.

**Platform and packaging.**

- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] (2026-07-20)
  **Raised by D149**: the owner intends to publish to a broader audience on any platform, so "macOS-first" is no longer the product and this spike is the input to M9's licence decision.
- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [blocked: ICE-TAURI-01] [detail] (2026-07-20)
  Depends entirely on packaging (browser window placement is parked, D53). D149 weakens the case — a broader audience may not run Photoshop at all.

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
