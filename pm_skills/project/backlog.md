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
M0–M8, M13, M14, M15, and **Batch C0** (D149–D159, 2026-08-11).
Remaining: **Track A** (M9 → M11 → M16 → M10 → M12), then **Track B**,
with **Track C — Publication** owner-paced alongside. The numbers stay
because they are greppable across the tickets and the decision log;
they no longer imply sequence.

## Active

### Current — Track A The printable pattern

Committed 2026-08-11 (D149); became Current at D159 when Batch C0
shipped whole; **M9's scope signed the same day (D160)** — the four
owner decisions are made and recorded in the ticket, so the build can
start gateless up to the first glyph batch. The product's unfinished
half: M13–M15 all
improved the input and appearance side, and the brief's second success
criterion — a stitchable chart PDF printed from a captured design — is
still not met. That PDF is one page, colour cells only, screen-sized,
no symbols.

- [ ] **M9 Symbols & B/W charting** [sign-off] [detail] (2026-07-22, scope signed 2026-08-11)
  **Scope signed (D160)**: app-owned vector glyphs (~64 reviewed, refusal past the set), overrides from the unused pool with explicit swap, assignment as identity-keyed *persisted state*. Decoupled from ICE-TAURI-01 — no font, no licence surface. The ticket carries the four decisions in full.
  Remaining: build (assignment model + project-file persistence, chart modes, key) — largely gateless — plus the glyph batches, drafted and **owner-signed on printed evidence** (the [sign-off] that stays).
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

### Track C — Publication

Opened 2026-08-11 (D160) from the owner's ask: the app is intended for
the owner's personal website, public use. Audited the same day —
the shipped surface is unusually clean: **one** npm runtime dependency
(pdf-lib, MIT), two crates compiled into the shipped wasm
(wasm-bindgen, libm — MIT/Apache-2.0), blue-noise tiles generated
in-house, no Carbon code or icon assets shipped, PDF uses standard
fonts (referenced, not embedded), and `Cargo.toml` already declares
`UNLICENSED`. ~~The repo is public on GitHub with no licence~~ —
`LICENSE` landed at D161. **Publication proceeds in this repository**
(D164): the owner weighed a clean-cut republication (D163) against
keeping the one continuous public record and chose continuity — the
development history has portfolio value, and the protections that
matter rest on the stated posture and on the replacement items below,
which fix the tree that visitors and the deployed app actually see.

- [ ] **PUB-01 Licences and notices for public distribution** (2026-08-11, decided 2026-08-11)
  **Decision (a) made and executed (D161)**: proprietary — "protect the app IP for now". `LICENSE` (all rights reserved, source-visible, no contributions) and `THIRD-PARTY-NOTICES.md` (pdf-lib, wasm-bindgen, libm verbatim MIT texts + the trademark/colour-data notice) are committed; `package.json` and `Cargo.toml` both declare `UNLICENSED`. Reversible later — proprietary-now keeps every option open; open-sourcing cannot be undone.
  Remaining: the notices become **reachable from the app** (a small UI surface — placement is a taste call), and ship with the deploy when deploying becomes real.
- [ ] **PUB-02 Replace `graphic.jpg` and confirm the photo provenance** [maintainer] (2026-08-11)
  Intent: the flat-graphic demo slot is fan art of the Amiga logo by DeviantArt user zgodzinski — a two-layer rights problem (the artist's copyright, and the Amiga mark underneath, which is not the artist's to license). The owner replaces it rather than clearing it; the slot needs any flat-colour hard-edged graphic, and the `PHOTO_SLOTS` filename contract means the replacement keeps the name `graphic.jpg` with zero code changes (`tests/profile-editor.test.ts` pins the list). History keeps the old file — fixing HEAD is the proportionate remedy (the D150 no-history-rewrite principle); the item **gates public deploy**.
  Done when: `graphic.jpg` at HEAD is rights-clean, and the five photographs are confirmed as the owner's own (load-bearing twice: `landscape-1.jpg` seeded the M8 golden crop).

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

- [ ] **DATA-01 Correct the swept catalogue rows** [maintainer] [detail] (2026-08-11)
  The detection half shipped (D155): the sweep runs inside `npm run audit` and the worklist is `docs/catalogue-sweep.md` — 21 unnamed rows (all Finca, certain) and 11 same-brand hex pairs (needs eyes; the four **consecutive** Sullivans pairs first — the copied-down-cell shape). Corrections are the owner's, in `thread-list.csv`, then `catalogue.json` regenerated by `scripts/build-palette.mjs` and the sweep re-run to read the delta.
- [ ] **DATA-02 Name-versus-colour disagreement in the catalogue** (2026-08-11)
  Intent: the class DATA-01 parks. A crude probe returns 402 hits dominated by compound names ("Blue Green") legitimately sitting between their two words; real cases look different (`ariadna:1650` is a cyan-white named "heather very light").
  Done when: a probe with a defensible false-positive rate ships, or the class closes as cosmetic — a wrong name is ugly in the key, since identity is `brandId:reference` and RGB is display-only (D55/D56).
- [ ] **DATA-04 Catalogue data-structure review before finalisation** [sign-off] (2026-08-12)
  Intent: settle the catalogue's shape once, ahead of DATA-03, so finalisation triggers the regeneration cascade a single time. On the table: an honest `provenance` vocabulary (the current field is inaccurate — D161); whether an empty `name` is legal or falls back at display (DATA-01's 21 Finca rows); the shared-hex semantics behind the 3,338 → 2,830 figure quoted in `AGENTS.md`/`architecture.md`, which value changes would shift; the per-brand metadata M12 already anticipates (skein length as catalogue data, not formula branches); `mappedFrom`'s future against ICE-XREF-01's separate long/tidy equivalence table; and whether the generated catalogue carries a data version/date for cache and snapshot hygiene.
  Also on the table (added 2026-08-12, D163): **where the owner CSV's source of truth lives** — in-repo as today, or as a private owner-held master with the repo carrying derived data. The catalogue is owner data either way; the question is what the published artefact is derived *from*, and it must be settled before DATA-03 finalises values.
  Done when: the owner signs the target schema with migration notes, ripple list attached — `build-palette.mjs`, the `Thread` type in core, every catalogue consumer, and palette snapshots inside saved project files (schema v5 embeds ordered thread entries, so new fields cross into user data and meet the byte-identical round-trip rule).
- [ ] **DATA-03 Finalise the catalogue values before publication** [maintainer] (2026-08-11, reshaped 2026-08-11)
  Intent: reshaped by D161's provenance correction — the values are **compiled from publicly circulating reference material, uncalibrated** (the catalogue's `provenance: "measured"` field is inaccurate and gets an honest label here). The owner finalises the values once DATA-01's corrections land; calibrated own-measurement is a distant possibility only if the app ever turns commercial.
  Landing note (D164): the finalisation lands as **one catalogue rebuild** together with DATA-04's schema outcome and DATA-01's corrections — one data revision, one cascade, one commit that says what it is.
  Done when: the owner finalises the values, the provenance label tells the truth, and the regeneration cascade is run with approvals — the acceptance-matrix `p489` rows, the gallery evidence audit, and any catalogue-derived expectations re-pin (golden regeneration needs its stated-reason approval).
  Constraint, standing: manufacturer-published colour lists stay **out of the repo** regardless — the compiled-approximate posture in `THIRD-PARTY-NOTICES.md` is the defensible one, and a committed copy of a brand's own list is what would break it.
- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data + no consumer] [detail] (2026-07-21)
  Owner-reviewed equivalences so "nearest equivalent" answers from published conversions, not colour distance. The real block is the missing consumer — do not start before ICE-EXPLORER-01.
- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  A browse view over the 3,338-thread catalogue with cross-brand equivalents and their provenance. The engine half exists; this is the view.

**Platform and packaging.**

- [ ] **PUB-03 Clean-cut republication — dormant contingency** [blocked: a named trigger] (2026-08-12, demoted 2026-08-12)
  Intent: the D163 plan (publish from a fresh initial commit; this repository goes private as the archive), kept as an option rather than a step. Two triggers wake it: a rights complaint touching anything in this repository's history, or the app turning commercial — at which point the calculus on history changes and, for the catalogue, first-party measurement of physical threads supersedes the compiled values entirely (DATA-03's recorded long-term path).
  Done when: dormant — it closes only by being triggered and executed per D163's steps, or by being cut when publication is behind us and neither trigger ever fired.

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
