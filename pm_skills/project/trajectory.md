# Trajectory

<!-- Shipped-work narrative. The story of what changed over time, in chunks. -->
<!-- Warm tier. Agents do NOT auto-read this every task. Read it on demand:
     during memory-maintenance.md (Refactor), release.md, or when
     reconstructing what already shipped. See AGENTS.md → "Before every task". -->
<!-- Compress on ship. One line per item: the outcome, not the implementation.
     The WHY lives in decision-log.md; the per-file roles live in file-map.md.
     Never paste a decision-log entry in here. A pointer is enough. -->
<!-- Keep every shipped ID individually greppable: start each line with the
     item ID. When one line covers a group of related sub-items, spell out
     each ID (e.g. WL-19a, WL-19b, ... WL-19h) rather than a range, so an
     ID-level reconcile can find them all. -->
<!-- Structure: newest phase/milestone at the top. Group items by the phase or
     milestone they belong to, with a one-line Outcome per phase. -->
<!-- Budget: see pm_skills/memory-policy.md. Over budget → memory-maintenance.md
     (Prune) moves the oldest phases to archive/trajectory/trajectory-NNNN-<range>.md
     and adds a row to archive/INDEX.md. Archives are append-only; never rewrite. -->

## M15 — Colour & dithering profiles (scoping — colour half signed, build not started)

- M15-SCOPE-01 (2026-08-07) — the joint scoping session signs the
  colour-profile scope: profile = composition recipe (libraries,
  owned modifier, per-colour pins, H/S/B ranges) resolving to the
  available colour table; takeover-view editor with draft-then-Save;
  exclude dissolves into membership, Must use stays per-design,
  Prefer retires; ranges in profile, minimum distance beside count;
  the (edited)-copy pattern links designs to named profiles; presets
  retire into read-only built-in profiles. Build broken into
  M15-CORE-01..03, M15-PERSIST-01, M15-UI-01..04, M15-ACCEPT-01/02.
  See decision-log D114.

## M14 — UI/UX excellence (in progress — agent half complete, ACCEPT-01 open)

- M14-EXT-31..37 (2026-08-07) — the fifth look lands in one auto-jazz
  run: the preview becomes a real accordion section (bar toggle
  retired, disclosure persisted, collapsed heading unpinned); the
  settings toggle and whole-panel collapse retire (shell model =
  cold alone); the Capture section renames, opens every session, and
  takes the session controls back inline (Source reads "Source"
  always — D108's fixed point consciously surrendered); Size keeps
  one permanent home in Design (S1 retired); Grid options becomes a
  live-apply form modal (Numbers folded in, tick font size surfaced);
  the EXT-36 polish pass fixes the focus-obscuration reserve and
  parks three named residues; the EXT-37 Carbon table closes with
  zero unexplained deviations (one new chevron waiver). See
  decision-log D110.
- M14-EXT-25 (2026-08-06) — owner picked option A at the sign-off
  gate: the Source button carries the session ("Capturing — Source";
  Stop/Pause/Capture frame lead its modal, primary Stop), the inline
  row reduces to Lock region beside Lock aspect, nothing cut. See
  decision-log D108.
- M14-EXT-19, M14-EXT-20, M14-EXT-21, M14-EXT-22, M14-EXT-23,
  M14-EXT-24, M14-EXT-26, M14-EXT-27, M14-EXT-28, M14-EXT-29,
  M14-EXT-30 (2026-08-06) — the fourth look lands in one auto-jazz
  run: entire-screen picker hint; "Lock aspect" default-off with
  both dimensions deriving through a visible Stitch size scale and a
  compact Size row; a Stats section takes every headline figure while
  the region readout and all fold summaries retire (bare headings
  app-wide); the preview collapses like any region and preview focus
  retires whole; a Debug menu gathers copy/download/email; engaged
  trackpad pinch and pan; Colour stands alone with the
  Threadify/constrain recut; Appearance becomes Processing with the
  grid geometry under the view strip. EXT-25 survives as the one
  owner pick. See decision-log D107.
- M14-FIX-05, M14-FIX-04, M14-FIX-02 (2026-08-05) — stats line loses
  its duplicated dimensions and the block tightens to 128 px; a
  debounced zero-chrome window-width guide in the status region; the
  app's own tab excluded from its capture picker with honest
  window-share copy. See decision-log D105.
- M14-FIX-01 (2026-08-05) — capture region mounts above the preview
  during a session; focus hands to it, collapse/lock return the lead.
  One signed exception to preview-first order. See decision-log D104.
- M14-FIX-06+03 (2026-08-05) — the scroll-linked dock deleted (its
  height change fed back through scroll anchoring as the owner's
  docked↔undocked flap); the canvas now hugs the fitted design under
  auto-fit with posture caps — scroll-neutral by construction. See
  decision-log D103.
- M14-EXT-15 (2026-08-05) — owner signed A + D + S1 and the shape
  shipped: aspect-follows toggle (default on, session-only), free
  pins derive design height, shift-drag exception, size fields join
  the capture section per session; crop suite gains the
  locked/unlocked split. AGENTS.md invariant updated. See
  decision-log D101.
- M14-EXT-17 (2026-08-04) — thread highlight as a Compare-class
  preview decoration over the index sidecar: per-row toggles, scrim
  over non-matching stitches, export bytes re-proven identical,
  +0.8 ms/frame at 300². See decision-log D100.
- M14-EXT-14 (2026-08-04) — colours table collapsed by default, the
  fold line carrying count + leading thread; persisted choice wins.
  See decision-log D99.
- M14-EXT-13 (2026-08-04) — colour limit as "Limit colours" switch +
  slider (1–64, number to 512); exact demoted to depth; fresh default
  now at-most-8, announced on three surfaces (supersedes D55's
  unlimited). See decision-log D98.
- M14-EXT-12 (2026-08-04) — capture surface moved into a first-position
  "Capture region" accordion section, open first appearance, persisted
  collapse; source section is the cold entry only. See decision-log
  D97.
- M14-EXT-18 (2026-08-04) — viewport composition verified whole:
  188-control walks at 320/800/1280 with zero focus obscuration, the
  memo's palette scenario proven at 320, zero duplicate affordances,
  both schemes. See decision-log D96.
- M14-EXT-08..11 (2026-08-04) — the viewport arc as one set: auto-fit
  until touched with Reset view as the only fit control (D86 waiver
  closed), sticky/docked preview in both layouts, pan engagement =
  host focus (wheel-zoom deleted), permanent quiet view strip with
  the grid toggles moved in. Composition verify is EXT-18. See
  decision-log D95.
- M14-EXT-07 (2026-08-04) — entry sample removed on the memo's ask;
  the Source modal keeps the one zero-permission demo route (sample
  now reach 2, modal only). See decision-log D94.
- M14-EXT-06 (2026-08-04) — cold surface as a shell state: entry-only
  page before any source, `cold` in the one shell model overriding
  both preferences, five exit routes + quiet "Open a project", focus
  handed to the Source button on exit. See decision-log D93.
- M14-EXT-05 (2026-07-23) — polish pass from the owner's second
  look: nine findings (cold-surface duplication, view-controls double
  chrome, ragged wrapping, raw Load input, always-on colours table),
  nine fixes, one recorded lesson — verify composition, not just each
  new affordance alone. See D90.
- M14-EXT-01..04 (2026-07-23) — owner-feedback extension shipped as
  one set: app bar (title, build id, Source, shell modes, dev
  diagnostics + Download log), Source choice modal with cold-start
  entry preserved, persisted View-controls fold (supersedes the D86
  A16 waiver), Design width/height rename. See D88 (triage) + D89
  (ship); evidence in `docs/ui-evidence.md`.

- M14-VERIFY-02 (2026-07-23) — journeys re-walked on final code (1
  interaction to converted preview; both conflict severities followed
  out; reach contract measured within bounds); byte-identity attested
  (3 PNGs sha-identical; PDF content streams identical incl. the
  17.7 MB raster; project field-wise clean); bench green; engine dirs
  diff-clean across the milestone. See D87.
- M14-VERIFY-01 (2026-07-23) — conformance re-proven on final code:
  19/22 findings closed with evidence, 3 waived on record (Fit menu
  taste call, FIT_MARGIN, staleness bound); zero dangling ARIA refs;
  zero sub-44 targets over 176 focusables; gate items answered. See
  D86; ledger in `docs/ui-evidence.md`.
- M14-IMPL-05 (2026-07-23) — D79 map applied end-to-end with derived
  strings following ("Unlimited colours" everywhere one concept
  surfaces); one core conflict sentence deferred to ACCEPT-01 on
  record; before/after inventory in the evidence doc. See D85.
- M14-IMPL-04 (2026-07-23) — first-run layer: entry state with three
  visible actions + capture expectations, drawn deterministic sample
  through the real pipeline, source-row compaction, crop status with
  position at end-events (A8), allow-list capture labels (A7),
  filtered-out thread state; no tour, on record. See D84.
- M14-IMPL-03 (2026-07-23) — the five-section architecture is live:
  default page 14,495 → 3,877 px, settings tab stops ~130 → 11,
  every reach inside the D76 contract; disclosure state persisted in
  preferences; summaries derived from owned state. See D83.
- M14-IMPL-02 (2026-07-23) — full Carbon anatomy in place: linked
  helpers + announced snap-back corrections, drawn 44 px checkboxes
  with per-thread names, project-coded Carbon modals replacing
  prompt/confirm, local disabled reasons, operable canvas/crop roles,
  hex in info rows. Live-verified; pure halves node-tested. See D82.
- M14-IMPL-01 (2026-07-23) — dev shell shed: styling moved to
  tokens/base/shell sheets under `src/ui/styles`, index.html down to
  an 8-line critical block; Carbon productive ramp + layer panel
  live; all shell invariants held (matrix in `docs/ui-evidence.md`);
  engine surfaces diff-clean. See D81.
- M14-SPEC-02 (2026-07-23) — tokens.css landed (two systems, both
  schemes, unconsumed — zero visual change proven) with the
  `check:contrast` gate step: 17 @pair rows × 2 schemes all ≥ AAA
  bars; AAA adaptations from Carbon recorded. See D80; pair table in
  `docs/ui-spec.md` §9.
- M14-SPEC-01 (2026-07-23) — interaction architecture decided: 3-tier
  reach contract, 7 groups → 5 stateful accordion sections with derived
  summaries, thread depth behind one lazy disclosure, first-run entry
  state + generated sample, terminology map. Every audit major answered
  or deferred with a reason. See D76–D79; spec in `docs/ui-spec.md`.

- M14-AUDIT-02 (2026-07-23) — five journeys walked from a cleared
  origin with step counts and a full control-tier inventory: 1-drop
  conversion is strong; Dither/Export/Project buried at 10–12k px
  (~130 tab stops); no autosave — silent loss on close confirmed. See
  decision-log D75; record in `docs/ui-journeys.md`.
- M14-AUDIT-01 (2026-07-23) — standards & heuristics audit: 22 ranked
  findings (8 major, no blockers) across every surface × state;
  byte-identity tripwire landed (`tests/ui-baseline/` — fixture,
  Node-pinned hashes in `check`, browser export captures welded to the
  reference pin). See decision-log D74; findings in `docs/ui-audit.md`.

## M13 — Visual processing performance (in progress)

- M13-MEAS-01 (2026-07-22) — bv2 node bench contract: the dither axis
  became the `DitherConfig` union with method-and-settings ID tokens,
  `p533` renamed to the truthful `p489`, a mandatory M8 method block at
  300²/1024², cold candidate-table / threshold-tile / full-catalogue
  preparation rows, run-validity tainting (clock drift, implausible
  samples, stalls), and a ten-row re-baseline — the FS 1024² +28 % drift
  since pre-M8 recorded as evidence for M13-PROF-01. See decision-log
  D64.
- M13-MEAS-02 (2026-07-23) — bv2 browser harness evidence complete over
  three owner runs: still preview-update 21.1/37.3 ms (200²/300²), live
  capture 30.3 ms median at a driven 4 changes/sec (119 samples,
  counters conserve, zero drops), interaction 53.7 ms median
  source-paint → preview-draw (7/8), GPU LUT agreement EXACT ×3 runs,
  six export rows. Zero-frame verdict, wrong-surface warning, source
  drive and the settle-waiter token fix landed en route. See
  decision-log D67.
- M13-PROF-01/02 browser halves (2026-07-23) — harness gained three
  gestureless legs (worker-route stage matrix, timed GPU-vs-TS LUT
  builds, selection-source contention probe) plus an unattended
  `?auto=` mode; a clean foreground Chrome run published the ratios:
  dither browser ≈ node (1.00–1.11), resize 1.12–1.28× (M5's 3.5×
  superseded), reduce ~2.3× faster in browser; GPU LUT build 2.3×/16×
  win at p64/p489, EXACT; selection-source export delays overlapping
  frames by ≤ one export (~51 ms), zero drops. Both PROF items closed.
  See decision-log D68.
- M13-PROF-03 (2026-07-23) — backend end-to-end comparison through the
  shipped worker route via a harness-only request-level backend force:
  `lab → ts` confirmed (TS wins 1.33–2.88×), `rgb → wasm` confirmed
  (wasm wins 2.0–2.8×, 2.39× at the export boundary), `mapPaletteGpu`
  stays unwired (loses every cell, still no indices sidecar); all 12
  cells byte-exact including indices; fallback probes all PASS;
  M13-DEF-01 filed (StageTiming label lies under non-FS delegation).
  See decision-log D69.
- M13-PROF-04/05 gestureless halves (2026-07-23) — dirty gate proven
  size-blind (≤ 2 px invisible at any contrast, knee 16–32 px; the 2 s
  forced refresh is the small-stroke latency); allocation census puts
  ~93% of 300² per-frame churn in two crop-sized main-thread buffers;
  export isolation re-proven EXACT under pump/draft/rapid exports;
  artefact exports starve the main thread (~0.5 s PDF freeze), never
  the worker; M13-DEF-02 filed (chart past the canvas edge). Both
  items `[~]` — one owner capture session remains (rehearsal sheet in
  `docs/browser-measurement.md`). See decision-log D70/D71.
- M13-DEF-01/02 (2026-07-23) — both profiling-filed defects fixed:
  the executor clamps unimplementable wasm dither requests so
  `StageTiming.backend` only names code that ran, and both export
  encoders refuse oversized outputs with a user-facing sentence
  before the canvas exists; regression tests on every reachable
  route. See decision-log D72.

## Archived: M6–M8 (2026-07-21 → 2026-07-22) — see archive/trajectory/trajectory-0002-2026-07-21-to-2026-07-22.md

## Archived: M0–M5 (2026-07-17 → 2026-07-20) — see archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md
