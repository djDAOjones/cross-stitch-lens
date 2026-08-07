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

Novice-first default surface, Carbon productive language, WCAG 2.2
AAA and the Nielsen hard rules per `UI-STANDARDS.md`; design
decisions are recorded (decision log + `ui-evidence.md`) and judged
once at M14-ACCEPT-01 (D73). UI-only milestone: engine, worker and
export outputs stay byte-identical; no new runtime dependencies; no
project-file schema change. Milestone docs under `docs/`:
`ui-audit.md`, `ui-journeys.md`, `ui-spec.md`, `ui-evidence.md`.
Looks one to six have shipped whole (see trajectory + decision log
D91–D121); the gate is the milestone's one open item.

#### Phase 4 — Verification & end review

- [ ] **M14-ACCEPT-01 Maintainer end review** [maintainer] [detail] (2026-07-23)
  Intent: the reserved human gate — judge look, feel and taste over the review pack (changes, logged decisions, before/after evidence, waivers) and a live Photoshop companion session. Every look through the sixth (D121) has shipped. The named live-session legs and watch items are listed in the ticket.
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
DITH tasks run after the colour half ships (owner order); ordering
against the M13 remainder is the owner's call at pick time.

- [~] **M15-PERSIST-01 Profiles persist: store, project file, migration** [detail] (2026-08-07)
  Intent: profiles in IndexedDB with revisions (the records.ts pattern generalised, kind-aware from the start — D117); the project file carries the design's recipe copy plus a profileRef; schema bump under the D114 waiver; saved palettes convert 1:1 into explicit-membership profiles; custom `user:` colours live in the global My-colours library (D115). Full scope in the ticket.
  Done when: save→load→save byte-identical on the new schema; old fixtures load and render via snapshot with the note; a pre-existing saved palette reappears as a profile with its order intact; library round-trip tests green.
  Status 2026-08-07: store half shipped (D123 — kind-aware IndexedDB store, generic file format, My colours); the project-file schema half lands with M15-UI-01's atomic cutover.

- [ ] **M15-UI-01 Colour section recut: profile select and the (edited) state** [detail] (2026-08-07)
  Intent: the cutover task, last before acceptance (D115) — profile select + Edit profiles… + the "(edited)" flow (Update profile / Save as new / Revert) + count + minimum distance + Must-use chips with search-to-add + Colours used with a Remove-from-profile row action; the old controls swap out only here, filling the slot EXT-42 protects. Control census in the ticket.
  Done when: every path announces; chips keyboard-operable including add-by-search; non-thread entries render honestly (CORE-01 labels); no shared-library mutation without an explicit Update/Save as new; no dead controls at any point; the section materially no taller than EXT-42's result.

- [ ] **M15-ACCEPT-01 Automated acceptance** (2026-08-07)
  Intent: the machine half — suites over resolver/selection/persistence, the golden and LUT-fingerprint strategy revisited where profiles feed reduction, export keys with non-thread labels, quality gate green.
  Done when: `npm run check` green; export byte-identity re-proven for thread-only profiles; non-thread export-key labelling pinned by test.

- [ ] **M15-ACCEPT-02 Maintainer acceptance session** [maintainer] (2026-08-07)
  Intent: the human half — a live session over the editor: build a profile from scratch, judge the style built-ins, the test preview's usefulness, and the (edited) flow's legibility.
  Done when: owner pass/fail notes recorded; failures route to fix tasks, never silent rework.

- [ ] **M15-GALLERY-01 Profile gallery: culture & nature** [sign-off] [detail] [blocked: M15-CORE-02] (2026-08-07)
  Intent: owner ask (D115) — many useful and interesting built-in profiles from across culture and nature (absorbs ICE-PRESET-01); agent drafts rule- or membership-based candidates in batches with test-image evidence, the owner curates names and membership per batch; shipped names style-descriptive, never trademarks; batches are owner-paced and interleave freely with the dither half — they never block it (D117). Candidate list in the ticket.
  Done when: each shipped batch has owner-signed membership or rules and honest naming, distinguished from user profiles; the candidate list lives in the ticket, never the select.

#### Dither half (D116) — after the colour half ships (owner order)

- [ ] **M15-DITH-01 Dither profile model and store** [detail] [blocked: M15-PERSIST-01] (2026-08-07)
  Intent: the DitherProfile entity (a complete `DitherConfig` + name + revision), the seven presets seeded as read-only built-ins with basis lines kept, the PERSIST-01 store pattern reused under a dither kind, `ditherProfileRef` with load-time built-in matching; schema bump under the D114 waiver. Model and matching rules in the ticket.
  Done when: save→load→save byte-identical; old projects attach the right built-in or stay honestly unreferenced (tests over both); built-in immutability pinned at the store level.

- [ ] **M15-DITH-02 Dither editor on the shared shell** [detail] [blocked: M15-UI-02, M15-UI-04, M15-DITH-01] (2026-08-07)
  Intent: mount the dither kind in the takeover shell — built-in/user profile list, the three-field form with per-family strength semantics and basis lines, duplicate-to-edit, the UI-04 rig with the design's palette (a named demonstration palette under full-RGB), dev-only entry until DITH-03. Anatomy and the cut line are in the ticket.
  Done when: draft edits preview live without rebuilding controls (EXT-43 test extended to this kind); full-RGB shows the labelled demo palette; keyboard-clean per the shell anatomy; any shell change the second kind forced is recorded (the UI-02 goal is none).

- [ ] **M15-DITH-03 Processing section cutover** [detail] [blocked: M15-DITH-02] (2026-08-07)
  Intent: the atomic cutover mirroring UI-01 — a "Dithering profile" select plus Edit profiles… replace the Dither style select and the Dither details reveal; honest unmatched/drifted states; the full-RGB disabled conduct and the Processing → Dithering rename gate per D117. Conducts in the ticket.
  Done when: select and editor are the only dither surface; the honest-state renderings are in place, including the full-RGB disabled state; the section is shorter than today's at both postures.

- [ ] **M15-DITH-04 Automated dither-profile acceptance** [blocked: M15-DITH-03] (2026-08-07)
  Intent: the machine half — store/round-trip suites, the no-rebuild regression on the dither kind, and byte-identity: an unchanged config through the profile layer produces identical engine output.
  Done when: `npm run check` green; byte-identity pinned by test; acceptance-matrix rows updated where the config path moved.

- [ ] **M15-DITH-05 Dither acceptance session (absorbs M8-ACCEPT-01)** [maintainer] [detail] [blocked: M15-DITH-04] (2026-08-07)
  Intent: the human half — the absorbed M8 visual-quality session (gallery, live capture, comprehension, exports, fallback, access) run once on the final profile surface, judging the five methods and whether profiles and their names predict what the eye sees; the session protocol (incl. the M8-GOLD-01 rider) is in the ticket.
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
