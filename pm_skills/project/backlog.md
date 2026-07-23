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

### Current — M13 Visual processing performance

Re-measure before optimising: M5 evidence is historical input; M8's
dither methods are uncovered by the frozen bench matrix (D62).
`AGENTS.md` hard rules hold — rationale in D63.

#### Phase 2 — Component profiling & defect discovery

Each task files defects for performance-sensitive bugs it uncovers.

- [ ] **M13-DEF-01 StageTiming backend label lies under non-FS wasm delegation** (2026-07-23)
  Intent: a manual override or harness force sending a non-FS dither to the wasm adapter runs the TS reference via the M8-ALG-01 delegation guard, yet `StageTiming.backend` reports `wasm` — diagnostics lie in that corner (found by M13-PROF-03, D69). Unreachable via routing.
  Done when: the reported backend matches the code that ran (or the corner is unrepresentable), with a regression test.

- [ ] **M13-DEF-02 Oversized chart export fails with a browser-internal error** (2026-07-23)
  Intent: at 1024² with chart cell 16 the chart canvas passes the 16,384 px canvas edge; Chrome silently zeroes the `OffscreenCanvas` and `convertToBlob` fails with "size is zero" — no clamp, no user-facing sentence (found by M13-PROF-05, D71). Clean PNG at exactly 16,384² succeeds.
  Done when: oversized exports are preflight-refused (or clamped) with a user-facing message before the canvas exists, with a regression test.

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

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

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
