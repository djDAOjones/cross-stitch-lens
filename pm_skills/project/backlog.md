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
closed (D127). Phase 2 profiling complete (D134); the synthesis is
**signed** (D135): promise bound to the driven capture leg, the
1024² 100 ms line retired (cap stays), routing confirmed unchanged,
IMPL-03 cut. Phase 4 runs the two activated items in order; the
signed scope and matrix live in `docs/performance-evidence.md` →
"M13-SYNTH-01 — the synthesis". `AGENTS.md` hard rules hold.
Phase 2 is closed out (D137): the bench ledger conserves across
manual windows, so IMPL-01's before/after rests on sound bookkeeping.

#### Phase 2 — Component profiling & defect discovery

Profiling shipped (PROF-01..05 — see trajectory); defects closed
(DEF-03 — D137). Nothing open.

#### Phase 4 — Evidence-approved implementation (activated by D135)

- [~] **M13-IMPL-01 Quality-neutral optimisations** [detail] (2026-07-22)
  Intent: land the two D135-approved bit-exact candidates — persistent grab surface and pre-submit copy elimination (D71 census #1/#2; allocator confirmed D134 Part C) — one candidate per measurement, byte-equality incl. the indices sidecar.
  Done when: each change shows byte-identical output, a before/after on the automated capture + mem legs, no budget regression. Every other candidate class in the ticket stays unapproved.
  Status 2026-08-08 (D138): both candidates implemented, correctness-proven, `check` green — the code half is done. Open on evidence only: the owner runs the bv2 pair (baseline from the parent commit as a detached checkout so the build id is honest, then the implementation build). Note candidate 2 is **not** measurable on the capture leg — the harness pump never had the pre-submit copy (wish-listed).

- [ ] **M13-IMPL-02 Backend routing and budget rebinding** [detail] [blocked: M13-IMPL-01] (2026-07-22)
  Intent: apply D135 — routing confirmed unchanged (record only; no thresholds); re-take node bv2 on the implementation build and rebind all rows; add the browser product-target rows (driven capture leg, bv2 amendment) and the env browser-version field.
  Done when: bench green on the rebound rows; the capture-leg target rows assert; contract text updated; fallback intact (correct with WASM and WebGPU both unavailable).

#### Phase 5 — Integrated acceptance

- [ ] **M13-ACCEPT-01 Automated integrated acceptance** [detail] [blocked: M13-IMPL-01, M13-IMPL-02] (2026-07-22)
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

- [~] **M15-GALLERY-01 Profile gallery: culture & nature** [sign-off] [detail] (2026-08-07)
  Intent: owner ask (D115) — many useful and interesting built-in profiles from across culture and nature (absorbs ICE-PRESET-01); agent drafts rule- or membership-based candidates in batches with test-image evidence, the owner curates names and membership per batch; shipped names style-descriptive, never trademarks; batches are owner-paced and interleave freely with the dither half — they never block it (D117). Candidate list in the ticket.
  Done when: each shipped batch has owner-signed membership or rules and honest naming, distinguished from user profiles; the candidate list lives in the ticket, never the select.
  Status 2026-08-09 (D139): batch 1 drafted and reviewed — 5 rule-shaped (Autumn leaves, Golden hour, Winter frost, Deep sea, Neon noir) + 3 curated (De Stijl primaries, Delft blue, Ukiyo-e woodblock), `check` green, evidence format set. Review follow-ups folded in: Neon noir retuned twice, Delft's duplicate white cut, the count bound now measures distinct colours. **Awaiting owner signature.** Two questions carried with it: all-brands vs DMC-only for rule-shaped profiles (left as all-brands, one word per profile to flip), and whether Neon noir's grey floor is dark enough. The photo-slot half of the evidence format is blocked — `public/profile-demo/` has no owner images. The ticket's "blocked on M15-CORE-02" line is stale — CORE-02 (D122) and UI-04 (D123) both shipped.

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
