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

### Current — M13 Visual processing performance (remainder)

Returned to Current 2026-08-07 (D128, the owner's pick) after M14
closed (D127). Phase 2 profiling is **complete** (D134): gestureless
evidence re-baselined on `d7218be` (D128), automated capture/trace
canon on `6e79c78`/`684811a` (D129–D133), and the owner sitting's
real-Photoshop numbers (D134). The synthesis is next and unblocked.
Re-measure before optimising (D62/D63); `AGENTS.md` hard rules hold.

#### Phase 2 — Component profiling & defect discovery

Profiling shipped (PROF-01..05 — see trajectory); open defects only.

- [ ] **INFRA-CHECK-01 `check` flakes all-timeout under desktop load on the synced path** (2026-08-08)
  Intent: on the OneDrive-synced repo with a loaded desktop (Photoshop + Chrome + the agent app open — and, owner-disclosed, a game active during the aftermath's red runs), full-suite Vitest runs starve — transform/import aggregates inflate 10–25×, heavyweight pipeline tests exceed the 5 s default timeout (16/11/14/8/13 failures across runs, every one a timeout, zero assertion failures; single files green; one full run green at 3.5 s). Composed `check` hits it hardest right after `check:wasm` rewrites `pkg/*`.
  Done when: the mechanism is pinned and one recorded fix lands — candidates: per-suite `testTimeout` raise for the heavyweight pipeline suites (a gate-rule change, needs its own decision entry), a settle/retry between `check:wasm` and `check:test`, Vite/Vitest `cacheDir` moved off the synced tree, or sync exclusions for `node_modules`/`target`/`pkg` — and `check` passes composed, repeatedly, on this machine. Evidence: 2026-08-08 close of PROF-04/05 (D134).

- [ ] **M13-DEF-03 Manual multi-window bench ledger fails conservation** (2026-08-08)
  Intent: `bench-browser.ts` reassigns `counters.clientDrops` (and latently `pumpDrops`) per live window while `submitted`/`results` accumulate, so a second window after nonzero drops taints the report (short by exactly the earlier windows' drops; negative interval deltas). Repro: share a 30 fps surface, buttons 6, 6, 6b, 8. Invisible on automated runs (driven source never drops).
  Done when: cumulative and per-window drop accounting separated so a clean multi-window manual sitting validates untainted; the D134 photoshop report's arithmetic re-checked against the fix. Does not gate SYNTH-01.

#### Phase 3 — Synthesis

- [ ] **M13-SYNTH-01 Performance synthesis: targets, roles, go/no-go** [detail] [sign-off] (2026-07-22)
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

- [ ] **M15-ACCEPT-02 Maintainer acceptance session** [maintainer] (2026-08-07)
  Intent: the human half — a live session over the editor: build a profile from scratch, judge the style built-ins, the test preview's usefulness, and the (edited) flow's legibility.
  Done when: owner pass/fail notes recorded; failures route to fix tasks, never silent rework.
  Status 2026-08-07: deferred by the owner at the D127 acceptance — runs at their choosing.

- [ ] **M15-GALLERY-01 Profile gallery: culture & nature** [sign-off] [detail] (2026-08-07)
  Intent: owner ask (D115) — many useful and interesting built-in profiles from across culture and nature (absorbs ICE-PRESET-01); agent drafts rule- or membership-based candidates in batches with test-image evidence, the owner curates names and membership per batch; shipped names style-descriptive, never trademarks; batches are owner-paced and interleave freely with the dither half — they never block it (D117). Candidate list in the ticket.
  Done when: each shipped batch has owner-signed membership or rules and honest naming, distinguished from user profiles; the candidate list lives in the ticket, never the select.

#### Dither half (D116) — after the colour half ships (owner order)

- [ ] **M15-DITH-05 Dither acceptance session (absorbs M8-ACCEPT-01)** [maintainer] [detail] (2026-08-07)
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
