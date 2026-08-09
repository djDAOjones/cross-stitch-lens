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
IMPL-03 cut. Phases 2 and 4 are both closed out (D137, D141, D142);
the signed scope and matrix live in `docs/performance-evidence.md` →
"M13-SYNTH-01 — the synthesis". `AGENTS.md` hard rules hold. Only
Phase 5 acceptance remains, and ACCEPT-01 is now unblocked.

#### Phase 2 — Component profiling & defect discovery

Profiling shipped (PROF-01..05 — see trajectory); defects closed
(DEF-03 — D137). Nothing open.

#### Phase 4 — Evidence-approved implementation (activated by D135)

IMPL-01 shipped (D138 code, D141 evidence); IMPL-02 shipped (D142 —
the promise is now an assertion). Phase 4 is complete; nothing open.

#### Phase 5 — Integrated acceptance

ACCEPT-01 shipped (D143 — every leg valid first time; see trajectory).

- [ ] **M13-ACCEPT-02 Maintainer live acceptance** [detail] [maintainer] (2026-08-09)
  Intent: the human half — real-browser live Photoshop capture at typical grids, visual review wherever M13 could alter appearance, editing feel against the ≥ 4 updates/sec promise.
  Done when: owner pass/fail notes recorded (failure routes to the synthesis); live editing usable across dither methods and backends.
  Status 2026-08-09: **unblocked, and the only thing left in M13.** Run sheet prepared at `docs/acceptance-m13-live.md`, pinned to the passing build `v0.5.0+20260809.b4cf665` — use that build or the pairing with the automated evidence breaks. Carries D135's four owner-judgement lines (small-stroke feel, PDF freeze, eight-brand cold prep, external-stop salience), each needing an explicit pass/fail. Visual review runs in **no-change mode**: everything M13 activated is bit-exact, so it is a confirmation, not a taste decision.

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
  Status 2026-08-09 (D144): **batch 1 signed, batch 2 drafted and awaiting signature.** Batch 1 (D140) shipped 5 rule-shaped + 3 curated; its two owner answers stand — rule-shaped profiles keep all-brands, and Neon noir keeps its named grey-floor residual (a rename was declined; do not "fix" it without asking). **Batch 2 is in code, unsigned:** 4 rule-shaped (Rainforest, Spring meadow, Gemstones, Moorland) + 4 curated (Art deco, Mid-century modern, Fair Isle, Fluoro spot print), picked against the gaps batch 1 left (no greens, nothing narrowing on chroma, nothing muted). Curation sheet published; two items want an owner call — Art deco's chrome takes 43.8 % of the sample card, and the ticket's own "Risograph print" is a trademark, so it ships renamed. The evidence run is now reproducible: `npm run audit` → `tests/audits/profile-gallery.audit.test.ts`. Item stays open for later batches against the ticket's remaining ~41 candidates. Carry-overs, neither gating: the photo-slot half of the evidence format needs owner images in `public/profile-demo/`, and the two bad catalogue rows it surfaced (`ariadna:1650`, `finca:4368`) are now M15-DATA-01's, not this item's. The ticket's "blocked on M15-CORE-02" line is stale — CORE-02 (D122) and UI-04 (D123) both shipped.

- [ ] **M15-DATA-01 Verify the thread catalogue's colour listings** [detail] (2026-08-09)
  Intent: sweep all 3,338 rows across the eight brands for listings that are wrong or missing rather than merely surprising — the gallery keeps surfacing them one at a time (`ariadna:1650`, `finca:4368`), which is the slowest possible way to find them. A first scan already has numbers: **21 rows carry no name at all** (every one of them Finca, ~10 % of that brand) and **11 same-brand pairs render an identical hex**; every brand+reference pair is unique and every hex is well formed. Name-versus-colour disagreement is the hard class — a crude probe returns 402 hits that are mostly compound names ("Blue Green", "Antique Violet") sitting legitimately between their two words, so it needs a better probe or eyes, not a threshold.
  Done when: a committed sweep reports each defect class with its rows, the certain classes are listed for the owner, and every accepted correction is made by the owner in `thread-list.csv` (protected user data — the agent never edits it) with `catalogue.json` regenerated.
  Note: verifying the measured hexes against each brand's *published* values is deliberately out of this item — all 3,338 rows carry provenance `measured` and no published source is in the repo, so that is its own piece of work.

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
