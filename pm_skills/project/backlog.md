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

The third-look extension set (D91/D92 triage) shipped in full,
2026-08-04/05: EXT-06..14, 17, 18 (D93–D100) and the owner-signed
EXT-15 shape (D101). See trajectory + decision log.

The first-pass review feedback (owner live session 2026-08-05, D102)
shipped in full the same day: FIX-06+03 (D103), FIX-01 (D104),
FIX-05/04/02 (D105).

The fourth look (owner dictated feedback, repaired against the live
UI labels and triaged 2026-08-06, D106) shipped whole the same day:
EXT-19..24, 26..30 in one auto-jazz run (D107), and EXT-25 with the
owner's option-A pick at its sign-off gate (D108). Memo items 14–16
(colour and dithering profiles) route to M15, scoping-first at the
owner's explicit ask.

The fifth look (owner refinements on the shipped fourth-look
surface, triaged 2026-08-06, D109) adds EXT-31..37 below in run
order. Three items supersede same-day decisions on the owner's own
authority, having seen them live: the bar preview toggle (D107 →
EXT-31), option A's Source-carried session (D108 → EXT-33), and the
grid reveal's strip placement (D107 → EXT-35).

#### Extension — fifth look (D109)

- [ ] **M14-EXT-31 Preview gets a header; the bar toggle retires** [detail] (2026-08-06)
  Intent: memos 6+2 — the preview region gains a real accordion-style header ("Preview", bare heading collapsed) and collapses from it; the app bar's Hide/Show preview button (EXT-23) goes. One task: the header is the replacement route.
  Done when: the preview collapses/expands from its own header only; capture start still re-expands; sticky and D103's nothing-scroll-linked rule hold; the bar button is gone.

- [ ] **M14-EXT-32 The settings toggle retires** (2026-08-06)
  Intent: memo 3 — Hide/Show settings leaves the app bar and the whole-panel collapse mode retires with it (M6-PANEL-01 sunset, the EXT-24 pattern): sections already collapse individually to bare headings. Sweep: shell model reduces toward `cold`-only (with EXT-31), `panelCollapsed` preference stops being written, `body.panel-collapsed` and dead branches go.
  Done when: no settings toggle in the bar; no orphaned collapse state, styles, or preferences; the consequence is recorded — at wide layout the 16rem column always stands, reclaim-the-width dies with the mode.

- [ ] **M14-EXT-33 Capture section recut: rename, always-open start, session controls return** [detail] (2026-08-06)
  Intent: memos 1+4+5 — "Capture region" renames to "Capture"; the section starts every session expanded (supersedes D97's persisted collapse at mount); Stop/Pause/Capture frame move from the Source modal back into the section and the Source button reads "Source" at all times (supersedes D108's option A on the owner's authority — the bar-reachability fixed point is consciously given up).
  Done when: the renamed section opens expanded at every session start with the session controls inline; the Source modal holds source choices only; one owner per control throughout.

- [ ] **M14-EXT-34 The Design section is never empty** [detail] (2026-08-06)
  Intent: memo 8 — diagnose and fix the empty Design section (EXT-28 took Colour out; D101's S1 reparents the remaining Size group into the capture section during sessions). Recommendation: retire the S1 reparent — Size lives in Design permanently, the Stitch size slider moves to the Capture section; options in the ticket.
  Done when: Design is never an open heading over nothing, with or without a session; size editing keeps one home; the S1 supersession (if picked) is recorded.

- [ ] **M14-EXT-35 Grid details becomes a modal; Numbers folds in** [detail] (2026-08-06)
  Intent: memo 7 — the under-strip reveal (EXT-30 destination A) becomes a live-apply form modal opened from a strip button; the Numbers toggle retires into it; the modal surfaces the full existing GridStyle capability (incl. the never-exposed tick font size) — simple over exhaustive; new rendering capability stays M11's.
  Done when: one strip toggle (Grid) plus one modal trigger; numbering and geometry edit live from the modal; identical settings still produce identical chart bytes; the 320 px two-row strip budget re-measured.

- [ ] **M14-EXT-36 Look, feel, ergonomics & intuitiveness pass** [detail] (2026-08-06)
  Intent: memo 9 — the EXT-05-pattern polish pass over the settled fifth-look surface: walk both postures and schemes, rank findings across look/feel/ergonomics/intuitiveness, fix the agent-executable ones with before/after evidence, park the rest with reasons.
  Done when: the ranked list exists with every finding fixed or parked; gate green; residue named for ACCEPT-01.

- [ ] **M14-EXT-37 Full Carbon conformance review** [detail] (2026-08-06)
  Intent: memo 10 — a component-by-component conformance table against Carbon's productive spec (anatomy, tokens, type ramp, interaction states, both schemes); each deviation fixed or waived on record; sanctioned deviations (text buttons D50, AAA over AA) re-affirmed, not re-litigated. Runs after EXT-36 so conformance is checked on the final surface.
  Done when: the table covers every component class; zero unexplained deviations; gate green.

#### Phase 4 — Verification & end review

- [ ] **M14-ACCEPT-01 Maintainer end review** [maintainer] [detail] [blocked: M14-EXT-31..37] (2026-07-23)
  Intent: the reserved human gate — judge look, feel and taste over the review pack (changes, logged decisions, before/after evidence, waivers) and a live Photoshop companion session. The first pass (2026-08-05) produced six findings, all shipped (D103–D105); the fourth look shipped whole 2026-08-06 (D107/D108); the fifth look (D109) re-blocks the gate on EXT-31..37, and the formal pass/fail session follows the set. Named for the live session: the real region drag under the unlocked default, the recut in-session capture controls (EXT-33), the entire-screen picker hint, and the D105-copy tension EXT-19 leaves.
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

### Next — M15 Colour & dithering profiles (owner-collaboration scoping first)

The fourth look's memo items 14–16 concentrate here (D106): "Colour
profile" as the one selector replacing `Colour mode` + `Threads to
choose from`, a full-surface profile editor (colour libraries, tech
colour maps, user thread collections, test-image preview), and
"Dithering profiles" with their own editor. Out of M14 by constraint,
not preference: profiles change which colours are available (outputs
not byte-identical) and user libraries add persistence — M14 forbids
both. Scoping is deliberately a joint owner+agent session per the
owner's ask; nothing is built before the signed scope. Ordering
against the M13 remainder is the owner's call at pick time.

- [ ] **M15-SCOPE-01 Colour profiles & editor — joint scoping** [maintainer] [sign-off] [detail] (2026-08-06)
  Intent: scope the colour-profile concept with the owner — profile = editable preset of the available colour table; the section anatomy ("Colour profile" select, "Colours in use"), the editor surface (libraries incl. brands and tech colour maps, user collections with code/hex search and custom RGB, the five-image test preview with offline placeholders), and where the advanced constraints (minimum colour distance, hue/saturation/brightness ranges) live — the owner explicitly wants that placement discussed.
  Done when: a signed scope and option pick are recorded (decision log) and the build is broken into agent-executable tasks; no code before that.

- [ ] **M15-SCOPE-02 Dithering profiles & editor — joint scoping** [maintainer] [sign-off] [detail] (2026-08-06)
  Intent: scope "Dithering profiles" with the owner — the Processing section reduced to profile selection (EXT-30 lands the rename first), a full-surface editor over the five methods and seven evidence-based presets, and how much editor machinery it shares with M15-SCOPE-01's.
  Done when: same bar as M15-SCOPE-01.

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

- [ ] **M8-ACCEPT-01 Visual-quality acceptance session** [maintainer] [detail] (2026-07-22)
  Intent: the human half of the M8 gate — judge the five shipped methods on the audit gallery and on live Photoshop capture: banding, noise, edge damage, isolated stitches, stitchability, and whether the labels/presets predict what the eye sees.
  Done when: owner pass/fail notes are recorded per method (failure routing per the ticket) and live editing stays usable across all shipped methods.
  The automated matrix, per-method suites, bench evidence, and the regenerable gallery (`npm run audit` → `bench-reports/m8-spike-01-gallery.html`) are already in place — see the ticket for the session checklist.

- [ ] **M8-GOLD-01 Golden fixtures for the M8 methods** [maintainer] [sign-off] (2026-07-22)
  Intent: decide whether the four new algorithms join `tests/golden/**` (protected — owner approval with a stated algorithm reason required). Ordinary deterministic fixtures already prove the implementations; golden fixtures would pin them against future backends.
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

- [ ] **ICE-PRESET-01 Curated colour-scheme presets** [maintainer] (2026-07-21)
  Intent: replace or supplement the four shipped algorithmic LCh presets with owner-reviewed membership lists, so "Pastels" means what a stitcher expects rather than what a chroma threshold selects. The resolver already supports it — a curated preset is a rule returning a fixed set.
  Done when: each curated preset has owner-signed membership and the UI distinguishes curated from algorithmic.
  Blocked on owner taste input, not on code (D55).

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
