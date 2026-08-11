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

## Active

### Current — M15 Colour & dithering profiles

Both halves signed 2026-08-07: colour at the joint session (D114);
run order, contract gaps and the gallery task at the second look
(D115); dither (D116); a combined review sealing seven seam fixes
(D117). A profile is a composition recipe resolving to the available
colour table, every narrowing explained; a takeover-view editor with
draft-then-Save; the (edited)-copy pattern links designs to named
profiles; presets retire into read-only built-in profiles. Outputs
change and persistence extends here — the M14 constraints lift by
design; schema bumps run under the owner's D114 compatibility waiver
(never crash, snapshot renders, semantics best-effort with a visible
note). No new runtime deps; Carbon hand-built; AAA. Run order
(D115): CORE-01 → CORE-02 → CORE-03 → PERSIST-01 → UI-02 → UI-03 →
UI-04 → UI-01 → ACCEPT-01 → ACCEPT-02 — the editor completes first
behind a dev-only entry, and UI-01's section cutover lands last, on
the section M14's EXT-41/42 leave behind (M14 completes first). The
DITH tasks run after the colour half ships (owner order).

Became Current 2026-08-09 (D148) when M13 shipped. **Both acceptance
gates are closed**: ACCEPT-02 and DITH-05 passed at the combined
sitting, and GALLERY-01 closed at sixteen built-ins on the owner's
call — its forty unbuilt candidates were kept, not cut, as
ICE-PROFILES-02. What remains is the queue below plus the sitting's
own findings, which are iceboxed rather than in the milestone. The
screen-reader half of the access leg was deferred (A11Y-VO-01) and is
an open gap against M15's AAA commitment, recorded as such.

- [ ] **M15-DATA-01 Verify the thread catalogue's colour listings** [detail] (2026-08-09)
  Intent: sweep all 3,338 rows across the eight brands for listings that are wrong or missing rather than merely surprising — the gallery keeps surfacing them one at a time (`ariadna:1650`, `finca:4368`), which is the slowest possible way to find them. A first scan already has numbers: **21 rows carry no name at all** (every one of them Finca, ~10 % of that brand) and **11 same-brand pairs render an identical hex**; every brand+reference pair is unique and every hex is well formed. Name-versus-colour disagreement is the hard class — a crude probe returns 402 hits that are mostly compound names ("Blue Green", "Antique Violet") sitting legitimately between their two words, so it needs a better probe or eyes, not a threshold.
  Done when: a committed sweep reports each defect class with its rows, the certain classes are listed for the owner, and every accepted correction is made by the owner in `thread-list.csv` (protected user data — the agent never edits it) with `catalogue.json` regenerated.
  Note: verifying the measured hexes against each brand's *published* values is deliberately out of this item — all 3,338 rows carry provenance `measured` and no published source is in the repo, so that is its own piece of work.

- [ ] **M15-UI-06 Move "Colours used" under the Colour section** (2026-08-09)
  Intent: owner ask at the combined sitting — "Colours used" is its own top-level section sitting between Preview and Stats, but it is a readout *of* the colour choices made in the Colour section. Separating them makes the shell longer than it needs to be and splits one subject across two places, which matters directly to the narrow-width work (ICE-WIDTH-01).
  Done when: the colour key reads as part of the Colour section, the accordion still opens and closes independently of the controls above it, and nothing about what it lists changes.

- [ ] **M15-DITH-06 Built-in dither profiles: name them after the method** (2026-08-09)
  Intent: owner ask at the combined sitting — "Subtle", "Balanced", "Strong", "Photograph", "Graphic", "Very limited palette" hide which algorithm is running, and the gallery's own naming discipline (style-descriptive, honest) argues the other way here: the method *is* the fact. Lead with the technical name (`atkinson`, `floyd-steinberg`, `jarvis`, `ordered`/Bayer 8×8, `blue-noise`), and where a preset is not the plain method — Subtle is Atkinson at strength 0.5, Very limited palette is Floyd–Steinberg damped to 0.6 — combine the method name with a qualifier rather than a mood word. Names live in `src/core/pipeline/dither-presets.ts`; the `basis` lines already carry the evidence and stay.
  Done when: the owner signs the seven names, the select reads them, and any project or profile that referenced a built-in by label still resolves (`matchBuiltInDither`/`sameDither` match on config, not label — confirm).

- [ ] **M8-GOLD-02 Golden fixtures for the four M8 methods** (2026-08-09)
  Intent: the approved follow-up to M8-GOLD-01 — the owner judged all five methods at the combined sitting and approved pinning the four that lack fixtures (Atkinson, Jarvis, ordered/Bayer 8×8, blue noise); Floyd–Steinberg already has its pre-M8 golden. Fixtures pin today's signed-off output so a future WASM or WebGPU backend cannot drift silently.
  Done when: each of the four has an `.input.json`/`.expected.json` pair under `tests/golden/`, generated by the TS reference, asserted bit-exactly alongside the existing Floyd–Steinberg case.
  Source decision (owner asked for `landscape-1`, then agreed the reasoning): use a **small crop derived from** `public/profile-demo/landscape-1.jpg`, committed as a JSON pixel buffer in the existing 8×8 house style — **not** the JPEG itself. Two reasons: a golden fixture must be diffable when it fails (a 2048² expected buffer is four million pixels of unreadable diff), and JPEG decoding varies across platforms and library versions, which would break bit-exactness for reasons that have nothing to do with the dither maths. Real photographic colour, tiny committed artefact.
  Note: `tests/golden/**` is protected — this creation is owner-approved (2026-08-09); any later regeneration needs its own approval with a stated algorithm reason.

### Next — M16 Export settings for print

Promoted 2026-08-09 (D147) from the owner's ask at the D134 PROF-04/05
sitting, where they called for it as a milestone rather than a task.
It had been sitting on the wish-list since. Nothing here is designed
yet — the milestone is committed, its scope is not.

- [ ] **M16-SCOPE-01 Scope the print-sized export defaults** [sign-off] (2026-08-09)
  Intent: today's export defaults are sized for the screen; the owner wants them sized for print — an enlarged PNG at least ~2k px on its longest side by default, grid lines and major numbering included rather than opt-in. Establish what "print-ready by default" means across the four exporters (clean PNG, enlarged PNG, chart PNG, PDF) before any of it is built.
  Done when: the owner signs a scope naming the new defaults per exporter, what stays configurable, and how an existing project's saved export settings migrate.
  Note: exports must keep re-running the pipeline at full quality (`AGENTS.md`) — this changes defaults and sizing, never the quality rule.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

Raised 2026-08-09 at the combined acceptance sitting (leg 4); owner
asked for both to be iceboxed for a later review, not fixed in session:

- [ ] **ICE-SAVE-01 A saved project has no name of its own** (2026-08-09)
  Intent: `Save project` names the file from the grid alone — `projectFilename(config.grid.width, config.grid.height)` (`src/main.ts:2032`), so every 200 × 200 design saves as the same filename and a folder of projects is indistinguishable. A `Design title` field already exists (it feeds the chart/PDF), so the question is whether the title should drive the filename, whether there should be a save dialogue, and what happens on load — not whether a name is needed.
  Done when: a saved project carries a name the owner chose, the name survives save/load, and two different designs never collide by default.

- [ ] **ICE-FLICKER-01 Changing the colour count flickers through the un-reduced image** (2026-08-09)
  Intent: dragging or stepping `Number of colours` shows the original high-colour picture between values rather than transitioning from one reduced result to the next. Owner reports it as a smoothness defect, not a correctness one — output at rest is right. Suspected but unconfirmed: the intermediate frame is the draft/full-RGB path being shown while the palette re-resolves; confirm the mechanism before proposing a fix, because holding the previous reduced frame and swapping on completion is a different change from suppressing a draft.
  Done when: stepping through colour counts never shows the un-reduced source, with no regression to the draft governor's honesty (a draft must still be labelled as one).

- [ ] **ICE-TRANSCRIPT-01 Automate collecting session transcripts from Claude Desktop (macOS)** (2026-08-09)
  Intent: `AGENTS.md` and `GUIDE.md` ask for sessions to be saved to `_transcripts/` as evidence for prompt-tuning, and the close ritual reminds you every time — but the saving is manual, so it does not happen: the directory does not exist and no transcript has ever been saved. Investigate whether the macOS Claude Desktop app's local session storage can be read and exported on demand (location, format, stability across app versions), and whether a small script can pull a named session into `_transcripts/` with the redaction pass applied rather than promised.
  Done when: one command saves a chosen session as redacted markdown in `_transcripts/`, or the investigation records that the app's storage is not a usable source and the reminder is retired instead of ignored.
  Blocker to fix regardless of the outcome: `AGENTS.md` states `_transcripts/*.md` is "gitignored by default" and **it is not** — the pattern is absent from `.gitignore`, so the first unredacted transcript anyone saves is committable by accident. That is a one-line fix and should not wait for the rest of this item.

- [ ] **ICE-AUTOMATE-01 Sweep the open queue for what a machine should be doing** (2026-08-09)
  Intent: owner ask after the combined sitting — the sitting was expensive, and ICE-EXPORT-01 showed the general shape of the answer: the unit layer was green while the artefact was wrong, so the missing automation was one level up from where the tests were. Decide, item by item, which open work is machine-checkable and which genuinely needs a person, then build the checks that shrink the next sitting.
  Done when: each open item is marked automatable / partly / human-only with a reason, and the automatable checks that would have caught this sitting's findings exist.
  First pass, from the queue as it stands:
  - **Straightforwardly automatable** — ICE-EXPORT-01 (it *is* the automation); M15-DATA-01 (the certain defect classes are machine-detectable; only the corrections need the owner); M8-GOLD-02 (fixture generation is a script by definition); ICE-AUDIT-01 and ICE-ROUTE-01 (mechanical assertion repair and a margin read); ICE-KEY-01 and ICE-GLOBALERR-01 (code fix plus a regression test each).
  - **Partly** — A11Y-VO-01: an automated pass (axe-core class) can assert that every control *has* an accessible name, which would leave the human judging only whether the name is any good. That is the difference between a long VoiceOver crawl and a short one. ICE-ZOOM-01: the jump can be pinned by a layout test once the mechanism is confirmed.
  - **Human-only, and should stay that way** — M16-SCOPE-01, M15-DITH-06 (naming), ICE-PROFILES-02 (curation), ICE-WIDTH-01, ICE-SAVE-01, ICE-VARIANTS-01. Judgement and taste; automating these would only automate the appearance of a decision.

- [ ] **A11Y-VO-01 Finish the deferred screen-reader pass** [maintainer] (2026-08-09)
  Intent: the combined acceptance sitting completed leg 9's keyboard half — full Tab/Shift+Tab traversal, visible focus, 200 % browser zoom and the ~320 px narrow width all passed — and the owner deferred the rest. Outstanding: VoiceOver announcements on the capture controls, the colour and dither selects, the editor's fields and the export buttons, and the check that no state is carried by colour alone. Deferred deliberately, not skipped: M13 and M15's acceptance closed with this recorded as an open gap rather than a guessed pass.
  Done when: a VoiceOver pass over those controls is recorded with pass/fail per control, and the colour-only check is answered.
  Note: contrast is already machine-checked (`npm run check:contrast`, inside the gate) and label/style baselines are covered by `tests/ui-styles.test.ts` — this item is only the part a person has to hear.

- [ ] **ICE-GLOBALERR-01 Benign browser noise is logged as an uncaught error** (2026-08-09)
  Intent: seen at the combined sitting (leg 8) — `[global] uncaught error` fired mid-session with `message: "ResizeObserver loop completed with undelivered notifications."`, a standard browser notification, not a failure. `installGlobalCapture` (`src/diagnostics/log.ts:57`) logs every `error` event at **error** level, so routine noise competes for space in the bounded diagnostics buffer and can evict the real thing. It also cost real time at the sitting to establish it was nothing. Absorbs the wish-list line about uncaught errors being illegible: the hook does already record `message` and `source` structurally — what it lacks is a stack and a way to tell noise from a fault.
  Done when: known-benign notifications (the ResizeObserver loop message at minimum) are downgraded below error or filtered with their reason stated in code, a real uncaught error still lands at error level with message, source and stack, and the diagnostics buffer keeps faults in preference to noise.
  Note: worth checking whether the ResizeObserver loop is itself a symptom — the preview's fit-to-manual host resize is the suspect in ICE-ZOOM-01, and a layout loop would fit both. Investigate together, decide separately.

- [ ] **ICE-EXPORT-01 Assert the exported artefacts, not just the export helpers** (2026-08-09)
  Intent: owner ask at the combined sitting — checking exports by opening them and looking is slow and it misses things. The unit layer already exists and is not the gap: 27 tests across `export-png`, `export-chart` and `export-pdf` all pass, and one of them covers the exact function that produced ICE-KEY-01's wrong output — it passes because its fixture is a hand-made flattering case. What is missing is an **artefact-level** check: run a real pipeline output through the real export assembly and assert properties of the bytes produced. Clean PNG dimensions equal the grid exactly; the enlarged PNG is an exact integer multiple with no resampling; the chart raster carries grid and numbering; the PDF has one page, the expected box, an aspect-preserved image, and **every key row well-formed with no repeated token**. `tests/acceptance-matrix.test.ts` already runs pipeline rows through the real worker entry — this is that pattern extended to exports, not a second mechanism.
  Done when: an export artefact suite runs inside `check` and fails on a malformed key row, a wrong clean-PNG dimension, or a non-integer enlargement.
  Note: this replaces the *structural* half of an acceptance sitting's export leg, never the appearance half — whether a dither looks right or a profile's name predicts its look stays human. The win is a shorter sitting next time, not no sitting.

- [ ] **ICE-KEY-01 The PDF thread key prints the hex twice** (2026-08-09)
  Intent: found by inspecting an owner export at the combined sitting (leg 7) — key rows read `Web-safe #cccccc #cccccc`. Mechanism, traced: the export passes `reference: ''` and a synthetic brand for generated maps (`src/main.ts:1900`), and `nonThreadLabel` builds that brand as `${mapName} ${entry.name}` (`src/core/color-sources.ts:216`); where a generated colour has no CSS name, `entry.name` **is** the hex, so the brand already ends in the hex and `keyLabel` (`src/export/pdf.ts:56`) appends it again. Real threads are unaffected — `DMC 310 #000000` reads correctly.
  Note: `keyLabel` is unit-tested (`tests/export-pdf.test.ts:134`) and passes, because the fixture uses `Web-safe Lime` — a named colour, the flattering case. The unnamed majority is the broken one. Worth remembering when choosing the fixture for the fix.
  Done when: a key row never prints the same token twice, with brand and reference still shown for real threads, and the regression fixture is an *unnamed* generated colour. Fold into M16 if that lands first — same exporter.

- [ ] **ICE-ZOOM-01 The canvas jumps on the first wheel zoom** (2026-08-09)
  Intent: raised at the combined acceptance sitting (leg 6) — zooming with the mouse wheel produces a "glitch" where the canvas moves, as if snapping to a quantised value. Zoom maths itself is continuous (`zoomAt`, `src/ui/viewport.ts:115`), so the jump is unlikely to be the scale. Suspected but **unconfirmed**: a deliberate zoom leaves fit mode (`src/ui/preview.ts:210`) and manual mode then freezes the host height at a rounded value (`src/ui/preview.ts:155`, `:165`), so the container resizes once on the transition and the image appears to leap. Confirm the mechanism before fixing — if it is the fit-to-manual handover, the fix is continuity across that transition, not touching the zoom curve.
  Done when: a wheel zoom moves the image smoothly about the pointer with no one-off jump, at any starting fit state, and the existing engaged-only wheel contract (M14-EXT-27) is unchanged.

- [ ] **ICE-STALE-01 Tiny edits wait the full staleness bound** (2026-08-09)
  Intent: the owner's recorded reservation when accepting D135's small-stroke line at the combined sitting — a 1 px pencil dot appeared after the full ~2 s, described as "a bit sluggish but can live with". Accepted, not a gap: sub-2 px edits are invisible to dirty detection by design and surface only via the staleness bound. D135 already named the remedy if it is ever wanted — lower `DIRTY_MAX_STALE_MS` (`src/capture/dirty.ts:54`, currently 2000) — and explicitly **not** a hash redesign.
  Done when: either the bound is lowered with bench evidence that the extra full-frame comparisons do not cost the ≥ 4 updates/sec promise at ≤ 300², or the reservation is reviewed and closed as accepted.

- [ ] **ICE-PROFILES-02 More built-in colour profiles: the unbuilt candidates** [detail] (2026-08-09)
  Intent: M15-GALLERY-01 closed at sixteen built-ins on the owner's call, but the forty unbuilt candidate names it had queued were kept rather than cut, at the owner's request, for a later review. They are unsigned ideas — no rule, no membership, no evidence — and the ticket carries them plus the batch process that shipped the first sixteen.
  Done when: reactivated as a milestone item and run through the signed-batch process, or reviewed and cut.

- [ ] **ICE-WIDTH-01 Decide what the app's width is designed for** (2026-08-09)
  Intent: owner ask — the shell currently declares "works down to 320 px" and reflows continuously, but no one has decided what width it is *for*. The goal the owner states is: as narrow as possible while still fully functional, since the app lives beside Photoshop. Settle whether that is a fixed working width, a preferred band with a hard floor, or something measured off the preview's needs — and what "fully functional" excludes at the floor.
  Done when: a stated width target with its rationale is recorded, and the narrow-width behaviour is judged against it rather than against 320 px alone. Pairs with M15-UI-06, which shortens the shell.

- [ ] **ICE-WIDTH-02 A low-height readout for judging window width** [blocked: ICE-WIDTH-01] (2026-08-09)
  Intent: owner ask — help the user judge how wide to drag the window. Today's header line ("Window 500 px wide — works down to 320 px.") is the right idea but costs two lines of vertical space at exactly the widths where space is scarcest. Wanted: something low-impact in height that still tells you where you are against the designed width. Blocked on ICE-WIDTH-01, because a readout cannot show you where you are until there is a target to be somewhere against.
  Done when: the readout costs materially less height than today's line, is legible at the narrow floor, and carries no meaning by colour alone.

- [ ] **ICE-VARIANTS-01 A contact sheet: the design under many variations at once** (2026-08-09)
  Intent: owner ask — choosing a setting by stepping one value at a time makes you compare against memory. Instead show the design rendered under a spread of values side by side and pick by eye: the five dither methods; colour count swept across a range (2 → 256, as a scrollable page); pattern resolution / stitch count, so the owner can judge how many stitches the image actually needs for the clarity they want; and the same shape for any other bounded choice. The editor's existing "All at three resolutions" preview view is this idea in miniature and is the precedent to build from, not a second mechanism.
  Done when: a variation sweep over at least one axis renders as a comparable grid from a frozen still, each cell labelled with its value, and picking a cell adopts that value.
  Note: this runs off a frozen still, never live capture — one processed pipeline per frame is a standing rule, and a grid is many pipelines. Cost and cancellation need scoping before any of it is built.

- [ ] **ICE-AUDIT-01 `npm run audit` fails on a stale post-M8 assertion** (2026-08-09)
  Intent: confirmed by running it 2026-08-09 — the suite is **2 files / 2 tests failed, 48 passed** in 46 s. One failure is certain drift: `runtime.audit` → "the draft governor never reaches exports" asserts `expect(live.dither).toBe(false)` and gets `{ algorithm: 'floyd-steinberg', … }`, because M8 turned `dither` from a boolean into a config object (D61/D62). The assertion is testing the wrong shape, not catching a defect. The "533" palette labels for what is now a 489-thread DMC set are the same class of drift.
  Done when: `npm run audit` runs clean end to end, with every stale assertion corrected or deleted with its reason. The other failure is ICE-ROUTE-01, not this item.

- [ ] **ICE-ROUTE-01 One routing disagreement in the M5-PERF-27 sweep** (2026-08-09)
  Intent: `routing.audit` sweeps grid × palette × metric on both dither backends and asserts `routeDither` agrees with the measured winner on every row; it now reports **1 disagreement** (`expect(flips).toBe(0)`, `tests/audits/routing.audit.test.ts:125`). Unknown severity and not to be lumped in with ICE-AUDIT-01's stale assertions: the sweep decides its winner by measured time, so a near-tie row where noise picks the loser looks identical to a real routing regression. It matters because M13-SYNTH-01 (D135) signed off "routing confirmed unchanged".
  Done when: the row is identified and its `margin` column read — a near-1.0 margin settles it as noise (and the assertion should then tolerate ties), a wide margin makes it a real routing defect with its own fix.
  Note: does not block the acceptance sitting — the app's router is unchanged; this compares measured timings inside an audit.

Promoted 2026-08-04 (D91) from the owner's third look — both change
or extend engine/worker outputs, so they sit outside M14's UI-only
constraint; candidates for the next UI-capability milestone:

- [ ] **ICE-ADJUST-01 Image adjustment sliders** (2026-08-04)
  Intent: owner-requested light↔dark tonal sliders in the colour section — the first concrete slice of the §9 adjustments panel (the `adjust` stage exists from M1; absorbs the wish-list line).
  Done when: tonal sliders remap the source ahead of reduction with live preview, and the adjustment survives project save/load.

- [ ] **ICE-PROVENANCE-01 Tonal provenance view** (2026-08-04)
  Intent: re-scoped by D92 — the where-on-the-picture half became M14-EXT-17 (the index sidecar already reaches the UI); what remains is the tonal half: show where each chosen thread sits in the source's light↔dark range, which needs new selection-stage introspection from the engine. Pairs with ICE-ADJUST-01.
  Done when: the palette's tonal coverage is visible against the source's range, labelled as provenance.

Deferred 2026-07-22 (D63) for M13 — intentionally deferred, not
passed, cut or shipped:

- [ ] **M9 Symbols & B/W charting** [detail] — automatic distinct-symbol
  assignment (stable, reassignable, collision-handled), chart modes
  (colour / colour+symbols / B/W / high-contrast), full sortable colour
  key with brand + reference + stitch count.
- [ ] **M10 Multi-page PDF chart export** [blocked: M9 for symbol charts] [detail] (2026-07-20) —
  A4/Letter pagination, overlap + registration marks, consistent
  coordinates + overview map, vector grid/symbols, export options.
- [ ] **M11 Grid, ruler & tick styling presets** [detail] — minor/major grid
  styling, numbering/rulers, named style presets incl. high-contrast,
  separate screen vs print settings.
- [ ] **M12 Fabric & thread estimates** [detail] — fabric count → physical
  size, cut margins, centre point; qualified per-colour thread/skein
  estimates with stated assumptions; recalculates on pattern/palette
  change.

- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data] [detail] (2026-07-21)
  Intent: ingest owner-reviewed thread equivalences so "nearest equivalent" answers from published conversions rather than colour distance alone; the engine half shipped with M7 (`thread-equivalents.ts` prefers a curated map) — this is data plus a generator. Blocked twice over (no data rows, no UI consumer yet — ICE-EXPLORER-01 is the natural first one); the recommended long/tidy data shape and the baseline are in the ticket (D56).
  Done when: curated equivalences load, override the computed answer, and are visibly labelled as published rather than computed — with the computed path still filling the gaps.

- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  Intent: a dedicated browse view over the 3,338-thread catalogue — filter and sort by brand, hue/lightness/chroma, ownership; inspect one thread and see its nearest cross-brand equivalents with provenance. The engine half exists (`thread-equivalents.ts`); this is the view. Owner-flagged as a later nicety, not MVP.
  Done when: a thread can be found by eye or by search, and its cross-brand equivalents are readable with their provenance and distance.

- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [detail] (2026-07-20)
  Intent: one-button side-by-side arrangement of Photoshop and Cross Stitch Lens. Browser window placement is parked (D53 — `resizeTo` ignored, window-management denied, popups blocked), so this depends entirely on ICE-TAURI-01 packaging; tiers and safety rules in the ticket.
  Done when: the user can select a display and preferred split, arrange both applications predictably, continue live capture, and restore the previous workspace without losing state.

- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] (2026-07-20)
  Intent: timebox Tauri fit — capture permissions, window management, macOS notarisation / Windows signing, project-file compatibility, updates — and whether packaging materially improves the Photoshop workflow. Packaging/release work is backlogged only if this passes.
  Done when: a go/no-go recommendation with a delivery outline is recorded.

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
     item ships or is cut — it does not outlive the item. -->
