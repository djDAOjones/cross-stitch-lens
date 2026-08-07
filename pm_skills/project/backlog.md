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

### Current — M14 UI/UX excellence

Novice-first default surface with full control depth deliberately
placed; Carbon productive language, WCAG 2.2 AAA and the Nielsen hard
rules per `UI-STANDARDS.md`. Every task is agent-executable without
maintainer gates: design decisions are recorded (decision log +
`ui-evidence.md`) and judged once at M14-ACCEPT-01 (D73).
UI-only milestone: engine, worker and export outputs stay
byte-identical; no new runtime dependencies; no project-file schema
change. Milestone docs land under `docs/` as they are produced:
`ui-audit.md`, `ui-journeys.md`, `ui-spec.md`, `ui-evidence.md`.

Five owner looks have shipped whole — third (D91–D101), first-pass
fixes (D102–D105), fourth (D106–D108), fifth (D109–D110) — see
trajectory + decision log. The sixth look (owner typed memos on the
shipped fifth-look surface, triaged 2026-08-07 in two batches — D111
memos 1–5, D112 memos 6–8) adds EXT-38..44 below; several supersede
fifth-look decisions on the owner's own authority, having seen them
live (the restored Capture frame button, EXT-34/A's permanent Design
home for Size). Run order: 38 → 39 → 43 (defect before restructure)
→ 40 → 42 → 44 → 41 (the hierarchy pass lands on the final census).

#### Extension — sixth look (D111)

- [ ] **M14-EXT-38 Capture row trims: Capture frame retires, Pause becomes Freeze** (2026-08-07)
  Intent: memos 1+2 — the Capture frame button goes (the owner now names the cut D108 declined for want of exactly that); the pump-death recovery copy re-points at the freeze toggle (unfreeze restarts the pump — verify that leg). "Pause capture" renames to "Freeze"; settle at the gate whether the label flips (Freeze/Unfreeze) or stays constant under aria-pressed, and sweep the paused-state copy for the rename.
  Done when: the row reads Stop capture · Freeze · Lock aspect · Lock region; a dead pump is still recoverable and the copy says how; no orphaned handlers or copy.

- [ ] **M14-EXT-39 Status line moves under the build id; header economised** (2026-08-07)
  Intent: memo 4 — the app's one live region (home of "Source unchanged.", export confirmations, the width guide) relocates from the content column to the header, under the version/build line; same element, still the app's only status region. Then an economy pass over the header block (dead space, wrap behaviour at 380 px). Consequence to record: announcements leave the viewport when scrolled deep at narrow — visible-status loss is the owner's accepted trade, named for ACCEPT-01.
  Done when: status renders under the build id at both postures with no header overflow at 320 px; the content column no longer reserves a status row; the trade is recorded.

- [ ] **M14-EXT-40 Design dissolves into Capture; Stitch size becomes Zoom; Stats gains the row** [detail] (2026-08-07)
  Intent: memo 5 — the Design section is removed; the width × height fields move to the Capture section beside the slider; "Stitch size" renames to **"Zoom"** with a zoom factor; Stats gains a stitch-size readout row. Supersedes D110's EXT-34/A (Size's permanent Design home) on the owner's authority. The ticket carries the three gate questions: the no-session home (the Capture section currently mounts only during sessions), the factor's definition and direction, and the naming collision with the preview's zoom (D52 terminology contract).
  Done when: no Design section; size and zoom edit in one place with or without a session; Stats reads the stitch size; the supersession and the zoom-vocabulary decision are recorded.

- [ ] **M14-EXT-42 Colour section: compress the redundancy** [detail] (2026-08-07)
  Intent: memo 6 — the Colour section spends seven elements on one integer (count switch + slider + number + two steppers + helper + status regions), eight near-identical per-brand helper lines, a summary line overlapping Stats' count row, and six standing library buttons. Rank the redundancies, compress with a design gate (candidates in the ticket); one flagged reversal — the steppers were the owner's own EXT-29 ask. Must not foreclose M15's Colour-profile slot (the source select is its future home).
  Done when: the section's default surface is materially shorter at both postures with no lost capability, before/after evidence recorded; any owner-ask reversal named.

- [ ] **M14-EXT-43 Threads dropdown snaps shut — diagnose and fix** [detail] (2026-08-07)
  Intent: memo 7 (a defect) — "Threads to choose from" (and likely every select in the Colour panel) closes before a choice can be made; the dither selects are fine. Hypothesis recorded: `palettePanel.update()` runs on every processed frame and rebuilds controls under the open popup — the dither panel is rebuilt only on algorithm change, which is why it survives. Fix shape: never rebuild an open/focused control; diff-update option lists on a fingerprint instead of wholesale.
  Done when: a select stays open and selectable during live capture and across frame results; a regression test pins the no-rebuild-when-unchanged contract; the fix is evidence-backed live.

- [ ] **M14-EXT-44 Processing order retires; Advanced sunsets** [detail] (2026-08-07)
  Intent: memo 8 — the Processing order select goes and the Advanced section (its only occupant) retires with it (the EXT-32 sunset pattern). Core keeps the `reduce-first` capability for loaded files — the EXT-29 precedent; the recommended conduct (honour + a visible one-line note while a loaded reduce-first project renders) reconciles reopen-identical with honest state; options and the recorded pros/cons in the ticket.
  Done when: no Processing order control, no Advanced section, no orphaned keys; a loaded reduce-first project still reopens byte-identical and says what it is doing; save round-trip unchanged.

- [ ] **M14-EXT-41 Colours used: rename and one section hierarchy everywhere** [detail] (2026-08-07)
  Intent: memo 3 — "Colours by usage" renames to **"Colours used"** and becomes a real accordion section with the same anatomy as Capture and Preview; Stats, Colour and the rest read at the same hierarchy level (the ticket's options: anatomy-only vs flattening the aside's boxed panel treatment; the two-column companion layout itself is load-bearing and stays). Runs after EXT-40 so the equalisation lands on the final section census.
  Done when: one section treatment across every region at both postures; the renamed section collapses to a bare heading with its disclosure persisted (old key seeded by fallback); highlight rows keep reach 2.

#### Phase 4 — Verification & end review

- [ ] **M14-ACCEPT-01 Maintainer end review** [maintainer] [detail] [blocked: M14-EXT-38..44] (2026-07-23)
  Intent: the reserved human gate — judge look, feel and taste over the review pack (changes, logged decisions, before/after evidence, waivers) and a live Photoshop companion session. Every triaged look through the fifth (D110) has shipped; the sixth (D111) re-blocks the gate on EXT-38..41. Named for the live session: the real region drag under the unlocked default, the recut in-session capture controls (EXT-33, incl. the consciously surrendered D108 bar-Stop fixed point), the always-open Capture start, the entire-screen picker hint, the D105-copy tension EXT-19 leaves, the EXT-37 chevron waiver, the one-time uncaught-error pair on EXT-36's watch list, and the sixth look's named trades (recovery-without-Capture-frame, off-viewport status at narrow, the Zoom naming beside the preview's zoom).
  Done when: owner pass/fail notes are recorded; failures route to new M14 fix tasks, never silent rework.

### Next — M13 Visual processing performance (remainder)

Displaced from Current 2026-07-23 (D73): the remaining halves are
owner-session-gated (PROF-04/05 rehearsals → the [sign-off]
synthesis), so the machine-executable M14 runs first; banked evidence
(D64–D72) stands. If M13 implementation ships mid-M14, re-capture
M14's reference exports (byte-identity baseline). Re-measure before
optimising (D62/D63); `AGENTS.md` hard rules hold.

#### Phase 2 — Component profiling & defect discovery

Each task files defects for performance-sensitive bugs it uncovers.

- [~] **M13-PROF-04 Live-path profile: capture, scheduling, preview** [detail] (2026-07-22)
  Intent: the live capture→preview path — pump cadence, dirty-detection cost and small-edit misses, coalescing drops, draft governor, split-compare overhead, preview/UI latency, failure recovery.
  Done when: an end-to-end latency decomposition at 200²/300² live capture, with dropped/stale-frame behaviour quantified against the ≥ 4 updates/sec promise.
  Status 2026-07-23: gestureless half published (D70 — dirty replay probability, per-tick cost, stats cost) and the live legs instrumented (dirty/grab medians, long tasks, draft marks, 200² window, mid-stream selection export). Remaining: the owner capture session — rehearsal sheet in `docs/browser-measurement.md`.

- [~] **M13-PROF-05 Memory, GC and export contention** [detail] (2026-07-22)
  Intent: per-frame allocation census, typed-array reuse candidates, live GC pressure, peak export memory, worker blocking during export.
  Done when: allocation/peak/contention figures published, top candidates ranked; export full-quality isolation re-verified.
  Status 2026-07-23: gestureless half published (D71 — census with ranked candidates, isolation EXACT, contention = main-thread starvation not worker queue, peaks incl. the 16,384 px ceiling; M13-DEF-02 filed). Remaining: snapshot pair + GC-pause trace, folded into the PROF-04 owner session (rehearsal sheet Parts C/D).

#### Phase 3 — Synthesis

- [ ] **M13-SYNTH-01 Performance synthesis: targets, roles, go/no-go** [detail] [sign-off] [blocked: M13-PROF-04, M13-PROF-05] (2026-07-22)
  Intent: decide — proven bottlenecks vs measurement artefacts; binding targets (budget rows, 300² promise, 1024² export, the 1024 cap); which quality-neutral changes proceed; whether an appearance-changing trade-off merits exploring; backend roles and crossovers; which Phase-4 tasks are activated, merged or cut.
  Done when: a maintainer-approved synthesis recorded (decision-log + one shared evidence doc later tickets cite); activated tasks cite their evidence; no speculative speedup encoded as acceptance.

#### Phase 4 — Evidence-approved implementation

Conditional: activated, merged or cut by M13-SYNTH-01.

- [ ] **M13-IMPL-01 Quality-neutral optimisations** [detail] [blocked: M13-SYNTH-01] (2026-07-22)
  Intent: land the bit-exact changes the synthesis approves, parity/golden evidence per change.
  Done when: each change shows byte-identical output (or documented GPU tolerance), a bench delta on its named workload, no budget regression.

- [ ] **M13-IMPL-02 Backend routing and budget rebinding** [detail] [blocked: M13-SYNTH-01] (2026-07-22)
  Intent: apply decided backend roles — routing thresholds from end-to-end evidence; budget rows rebound to refreshed baselines.
  Done when: routing matches the decided crossovers; fallback intact (correct with WASM and WebGPU both unavailable); bench green on the rebound rows.

- [ ] **M13-IMPL-03 Appearance-affecting options (exploration)** [detail] [blocked: M13-SYNTH-01] (2026-07-22)
  Intent: only if the synthesis activates it — prototype approved appearance-changing trade-offs, quantified against the reference.
  Done when: quantified difference metrics + maintainer visual sign-off approve or reject each option; nothing appearance-changing ships without both.

#### Phase 5 — Integrated acceptance

- [ ] **M13-ACCEPT-01 Automated integrated acceptance** [detail] [blocked: M13-IMPL-01, M13-IMPL-02, M13-IMPL-03] (2026-07-22)
  Intent: the machine half — refreshed bench budgets, acceptance matrix, backend/feature fallback suites, export correctness, quality gate, green on final code.
  Done when: `npm run check` and `npm run bench` pass on the refreshed rows; matrix, fallback and export byte-identity re-proven.

- [ ] **M13-ACCEPT-02 Maintainer live acceptance** [detail] [maintainer] [blocked: M13-ACCEPT-01] (2026-07-22)
  Intent: the human half — real-browser live Photoshop capture at typical grids, visual review wherever M13 could alter appearance, editing feel against the ≥ 4 updates/sec promise.
  Done when: owner pass/fail notes recorded (failure routes to the synthesis); live editing usable across dither methods and backends.

### Next — M15 Colour & dithering profiles

Colour half signed 2026-08-07 (D114) — the joint session the fourth
look asked for. Profile = composition recipe (libraries, owned
modifier, per-colour pins, H/S/B ranges) resolving to the available
colour table, every narrowing explained; takeover-view editor with
draft-then-Save; exclude dissolves into membership, Must use stays
per-design beside count (+ a new minimum-distance rule), Prefer
retires; the (edited)-copy pattern links designs to named profiles;
presets retire into read-only built-in profiles. Outputs change and
persistence extends here — the M14 constraints lift by design.
Schema bumps run under the owner's compatibility waiver (D114:
never crash, snapshot renders, semantics best-effort with a visible
note). No new runtime deps; Carbon hand-built; AAA. Run order
(D115): CORE-01 → CORE-02 → CORE-03 → PERSIST-01 → UI-02 → UI-03 →
UI-04 → UI-01 → ACCEPT-01 → ACCEPT-02 — the editor completes first
behind a dev-only entry, and UI-01's section cutover lands last,
atomic and wired to a finished editor, on the section M14's
EXT-41/42 leave behind (M14 completes first). Dither half signed
2026-08-07 (D116), before UI-02 as D115 hoped: a dithering profile
is a complete named `DitherConfig`; the seven presets become
read-only built-ins; the dither kind mounts in the same shell and
rig (kind contract in D116); Processing recuts to select + Edit
profiles. The DITH tasks run **after the colour half ships** —
owner order, colour first then dither. Ordering against the M13
remainder is the owner's call at pick time.

- [ ] **M15-CORE-01 Colour sources: maps, namespaces, names** [detail] (2026-08-07)
  Intent: synthetic identity namespaces (`map:`, `user:`) that can never collide with threads (D55/D56); the six generated colour maps (D114 list); the embedded CSS/X11 name table; provenance-honest display labels usable by lists and export keys. Pure core, no UI.
  Done when: maps generate deterministically with tests pinning identity, count and ordering; exact-match names render and hex stands otherwise; a non-thread entry carries a label exports can use.

- [ ] **M15-CORE-02 Profile model and resolver** [detail] (2026-08-07)
  Intent: the ColourProfile recipe (libraries on/off, ownedOnly, per-colour in/out pins, H/S/B ranges) and its resolver to the effective ordered table with typed explanations; deterministic composition order (the D46 LUT fingerprint reads it); the built-in profiles incl. Sepia/Pastels/Classic cross stitch; absorbs palette-policy with prefer retired.
  Done when: resolver tests cover every narrowing step with its sentence; ordering contract pinned; built-ins resolve non-empty; core stays pure and consumers compile against the new layer.

- [ ] **M15-CORE-03 Selection recut: count, minimum distance, Must use** (2026-08-07)
  Intent: palette-selection keeps count, gains a minimum perceptual distance (Lab) rule over the chosen set, keeps locks as guaranteed Must-use seats; prefer weighting removed.
  Done when: selection honours distance together with count and explains when they conflict; Must-use seats guaranteed; prefer gone from core with tests updated, not weakened.

- [ ] **M15-PERSIST-01 Profiles persist: store, project file, migration** (2026-08-07)
  Intent: profiles in IndexedDB with revisions plus import/export (the records.ts pattern generalised); the project file's policy half becomes the design's recipe copy plus a profileRef `{id, revision}`; schema bump with best-effort migration under the D114 waiver (visible note, never a crash, snapshot authoritative); existing saved palettes convert 1:1 into explicit-membership profiles (order preserved — D46 identity), never silently dropped; custom `user:` colours persist in the global My-colours library, available to every profile (D115); the store pattern is kind-aware from the start — DITH-01 mounts a second kind on it without rework, and import/export is designed generically or not at all (D116 cut line; D117).
  Done when: save→load→save byte-identical on the new schema; old fixtures load and render via snapshot with the note; a pre-existing saved palette reappears as a profile with its order intact; library round-trip tests green.

- [ ] **M15-UI-02 Takeover editor shell (shared)** (2026-08-07)
  Intent: the shell view swap (not a dialog): header with profile switcher and New/Duplicate/Rename/Delete, draft model with Save/Cancel/Back, focus and a11y anatomy, a capture session surviving underneath; built profile-kind-agnostic — the dither kind's shell contract is signed in D116 (draft opaque to the shell; each kind supplies its form and stage-override mapping); Save on the design's active profile updates the design's copy in the same act, and saving any other profile never touches the design (D117 — DITH-02's Use question inherits this settled answer).
  Done when: open→edit→Save/Cancel/Back all keyboard-clean with focus returned; frame results never rebuild editor controls (regression test — the EXT-43 contract); a second profile kind could mount without shell change.

- [ ] **M15-UI-03 Editor content: libraries, pins, ranges, readout** [detail] (2026-08-07)
  Intent: the libraries column (brands with provenance, maps with counts, My threads; browse reusing the capped search table), ownedOnly modifier, per-colour pins, two-pole H/S/B sliders with numeric fields, custom RGB add via hex/code search with name lookup, and the resulting-colours readout carrying every explanation.
  Done when: draft edits update readout and preview live with every narrowing named; all controls AAA-operable; custom colours appear under `user:` identity with honest labels.

- [ ] **M15-UI-04 Editor test preview** [detail] (2026-08-07)
  Intent: the preview strip — default view is the design's last still, four photo slots in a `profile-demo` folder under the Vite public root (created by this task) with honest offline states, the generated test card; the three-resolution grid at equal display size; draft-labelled renders through the real pipeline, debounced, never starving a live session.
  Done when: slots and grid render against the draft recipe; offline states name the missing file and folder; live-session cadence unaffected, measured.

- [ ] **M15-UI-01 Colour section recut: profile select and the (edited) state** (2026-08-07)
  Intent: the cutover task, last before acceptance (D115) — the section becomes profile select (+ Edit profiles… into the finished editor, "(edited)" badge, Update profile / Save as new / Revert) + count + minimum distance + Must-use chips with a search-to-add field (a guaranteed colour need not be in use yet) + Colours used with a Remove-from-profile row action landing on the design's copy; the old controls swap out only here; fills the slot EXT-42 protects.
  Done when: every path announces; chips keyboard-operable including add-by-search; non-thread entries render honestly in Colours used (CORE-01 labels); no shared-library mutation without an explicit Update/Save as new; no dead controls at any point of the milestone; the section is materially no taller than EXT-42's result.

- [ ] **M15-ACCEPT-01 Automated acceptance** (2026-08-07)
  Intent: the machine half — suites over resolver/selection/persistence, the golden and LUT-fingerprint strategy revisited where profiles feed reduction, export keys with non-thread labels, quality gate green.
  Done when: `npm run check` green; export byte-identity re-proven for thread-only profiles; non-thread export-key labelling pinned by test.

- [ ] **M15-ACCEPT-02 Maintainer acceptance session** [maintainer] (2026-08-07)
  Intent: the human half — a live session over the editor: build a profile from scratch, judge the style built-ins, the test preview's usefulness, and the (edited) flow's legibility.
  Done when: owner pass/fail notes recorded; failures route to fix tasks, never silent rework.

- [ ] **M15-GALLERY-01 Profile gallery: culture & nature** [sign-off] [detail] [blocked: M15-CORE-02] (2026-08-07)
  Intent: owner ask (second look, D115) — create lots of useful and interesting built-in profiles drawn from across culture and nature (absorbs ICE-PRESET-01 and the D114 placeholder list); agent drafts rule- or membership-based candidates in batches with test-image evidence, the owner curates names and membership per batch; shipped names style-descriptive, never trademarks; nothing placeholder ships in the UI; batches are owner-paced and interleave freely with the dither half — they never block it (D117).
  Done when: each shipped batch has owner-signed membership or rules and honest naming, distinguished from user profiles; the candidate list lives in the ticket, never the select.

#### Dither half (D116) — after the colour half ships (owner order)

- [ ] **M15-DITH-01 Dither profile model and store** [detail] [blocked: M15-PERSIST-01] (2026-08-07)
  Intent: the DitherProfile entity (complete `DitherConfig` + name + revision), the seven presets seeded as read-only built-ins with basis lines kept, the PERSIST-01 store pattern reused under a dither kind, `ditherProfileRef {id, revision}` beside the already-persisted config with load-time built-in matching; schema bump under the D114 waiver.
  Done when: save→load→save byte-identical; old projects attach the right built-in or stay honestly unreferenced (tests over both); built-in immutability pinned at the store level.

- [ ] **M15-DITH-02 Dither editor on the shared shell** [detail] [blocked: M15-UI-02, M15-UI-04, M15-DITH-01] (2026-08-07)
  Intent: mount the dither kind in the takeover shell — built-in/user profile list, the three-field form with per-family strength semantics and basis lines, duplicate-to-edit, the UI-04 rig rendering the draft config with the design's palette (a named demonstration palette under full-RGB), dev-only entry until DITH-03.
  Done when: draft edits preview live without rebuilding controls (EXT-43 test extended to this kind); full-RGB shows the labelled demo palette; keyboard-clean per the shell anatomy; any shell change the second kind forced is recorded (the UI-02 goal is none).

- [ ] **M15-DITH-03 Processing section cutover** [blocked: M15-DITH-02] (2026-08-07)
  Intent: the atomic cutover mirroring UI-01 — a "Dithering profile" select plus Edit profiles… replace the Dither style select and the Dither details reveal; unmatched or drifted configs name themselves honestly; no dead controls at any point; under full-RGB the select disables with the shipped sentence "Dithering applies to thread palettes." (the A9 conduct carried forward — D117); whether the section renames (Processing → Dithering) once the select is its only content is the owner's call at the gate — EXT-30 named it Processing on the owner's own authority (D117).
  Done when: select and editor are the only dither surface; the honest-state renderings are in place, including the full-RGB disabled state; the section is shorter than today's at both postures.

- [ ] **M15-DITH-04 Automated dither-profile acceptance** [blocked: M15-DITH-03] (2026-08-07)
  Intent: the machine half — store/round-trip suites, the no-rebuild regression on the dither kind, and byte-identity: an unchanged config through the profile layer produces identical engine output.
  Done when: `npm run check` green; byte-identity pinned by test; acceptance-matrix rows updated where the config path moved.

- [ ] **M15-DITH-05 Dither acceptance session (absorbs M8-ACCEPT-01)** [maintainer] [detail] [blocked: M15-DITH-04] (2026-08-07)
  Intent: the human half — the absorbed M8 visual-quality session (gallery, live capture, comprehension, exports, fallback, access) run once on the final profile surface, judging the five methods and whether profiles and their names predict what the eye sees.
  Done when: owner pass/fail notes per method and per built-in profile are recorded; failures route per the ticket (a method failure reopens D61), never silent rework.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

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

- [ ] **M8-GOLD-01 Golden fixtures for the M8 methods** [maintainer] [sign-off] (2026-07-22)
  Intent: decide whether the four new algorithms join `tests/golden/**` (protected — owner approval with a stated algorithm reason required). Ordinary deterministic fixtures already prove the implementations; golden fixtures would pin them against future backends. Rides M15-DITH-05's session as an agenda line (D117) — the owner is already judging the five methods there.
  Done when: the owner approves (and fixtures land) or declines (and the decision is recorded).

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
  Intent: ingest owner-reviewed thread equivalences so "nearest equivalent" answers from published conversions rather than colour distance alone. The engine half shipped with M7 (`thread-equivalents.ts` already takes a curated map and prefers it); this is data plus a generator.
  Done when: curated equivalences load, override the computed answer, and are visibly labelled as published rather than computed — with the computed path still filling the gaps.
  Blocked twice over: `thread-map-proposed.csv` has a header and zero data rows, and nothing in the UI surfaces equivalents yet — ICE-EXPLORER-01 is its natural first consumer. Reactivate when the owner supplies groupings; the recommended shape is long/tidy (`group_id,brand,code`), not the current wide one-column-pair-per-brand form (D56).

- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  Intent: a dedicated view over the 3,338-thread catalogue for browsing rather than converting — filter and sort by brand, hue/lightness/chroma, ownership; inspect one thread and see its nearest equivalents in every other brand side by side. The engine half already exists (`thread-equivalents.ts`); this is the view. Owner-flagged as a later nicety, not MVP.
  Done when: a thread can be found by eye or by search, and its cross-brand equivalents are readable with their provenance and distance.

- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [detail] (2026-07-20)
  Intent: one-button side-by-side arrangement of Photoshop and Cross Stitch Lens. M6-WIN-01 settled the browser half: window placement is parked (D53 — `resizeTo` ignored without error, window-management denied, popups blocked even from a trusted gesture), so this now depends entirely on ICE-TAURI-01 packaging.
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
     put it in pm_skills/project/tickets/<ID>.md and add the [detail] flag
     to the item. Cold tier — agents read it ONLY when that item is the
     active task, so Active stays terse. Working context only; the "why"
     still goes to decision-log.md on ship. The file is deleted when the
     item ships or is cut — it does not outlive the item. -->
