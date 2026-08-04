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

## M14 — UI/UX excellence (in progress — agent half complete, ACCEPT-01 open)

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

## M8 — Dithering expansion (engine + controls shipped 2026-07-22; maintainer acceptance open)

- M8-CTRL-01 (2026-07-22) — the Dither group: preset + algorithm
  selectors with method-specific controls only where the method defines
  them (strength per family, serpentine diffusion-only), seven
  evidence-based presets, a disabled "Custom" state, and session
  memory of each method's last settings. Pure model in
  `src/ui/dither-model.ts`. See decision-log D62.
- M8-ALG-01 (2026-07-22) — four new deterministic dither methods beside
  Floyd–Steinberg (Atkinson, Jarvis, ordered Bayer 8×8, blue-noise
  32×32) behind one stage; `DitherConfig` union, schema v4 migration
  keeping old projects byte-identical; wasm routing gated FS-only so a
  backend can never substitute a different method; a bench-caught 2.3×
  regression fixed by flattening kernels to typed arrays. See
  decision-log D62.
- M8-SPIKE-01 (2026-07-22) — dither evaluation spike: nine candidates
  measured on tone fidelity, isolated-stitch rate, distinctness and
  cost; committed set of six user choices, matrix size/phase/seed
  earn no control; evidence in `docs/dither-evaluation.md` + audit
  artefact + HTML gallery. See decision-log D61.

## M7 — Palette & colour strategy (shipped 2026-07-21)

- M7-LIB-01 (2026-07-21) — the library operations that never shipped:
  keyboard-operable palette reordering and entry removal (both bump the
  revision), bulk owned/not-owned across the whole filter rather than
  the rendered page, and palette deletion with a session undo. The
  entry list is a collapsed disclosure capped at 60. See decision-log
  D58.
- M7-ACCEPT-01 (2026-07-21) — maintainer accepted the combined
  brands → inventory → palettes → presets → counts → locks workflow.
  Close triage kept one item ahead of M8 (M7-LIB-01, the library
  operations that never shipped) and moved the two that depend on
  owner data to the Icebox (ICE-XREF-01, ICE-PRESET-01). See decision-log D57.
- M7-DATA-01 (2026-07-21) — owner thread data superseded mid-milestone:
  `thread-list.csv` (3,338 threads, 8 brands, each brand's own measured
  colours) replaces the DMC→Anchor cross-reference; `dmc.json` retired,
  `catalogue.json` generated in its place. See decision-log D56.
- M7-BRAND-01 (2026-07-21) — thread identity is `brandId:reference` and
  RGB is display-only: `Thread` replaces `PaletteEntry`, a
  palette-index sidecar runs through reduce, dither, the Rust crate,
  the worker protocol and stats, so ~500 threads sharing a colour with
  another stay distinct. See decision-log D55.
- M7-BRAND-02 (2026-07-21) — brands enable/disable as a checkbox group
  with deterministic union order; no-brand is an explained error, never
  full-RGB. Stats, chart key and PDF carry brand + reference. See
  decision-log D55.
- M7-INV-01 (2026-07-21) — cross-project thread inventory in IndexedDB
  behind a `LibraryStore` interface (memory fallback announced, never
  silent), versioned canonical import/export, additive merge, and an
  "only threads I own" restriction. See decision-log D55.
- M7-PAL-01 (2026-07-21) — named library palettes with revisions;
  project schema v3 stores policy *and* the resolved snapshot, so a
  reopen reproduces the design even after the library palette is edited
  or deleted. See decision-log D55.
- M7-PRESET-01 (2026-07-21) — four algorithmic LCh presets (Neutrals,
  Pastels, Earth tones, Deep shades), each labelled with its rule;
  strict vs preference kept distinct; curated membership deferred to
  owner review. See decision-log D55.
- M7-COUNT-01 (2026-07-21) — exact/maximum colour counts by greedy
  weighted-ΔE selection over real permitted threads, chosen against the
  resized full-RGB source (never the pipeline's own output); selected
  and used counts reported separately. See decision-log D55.
- M7-MIX-01 (2026-07-21) — lock / prefer / exclude as three disjoint
  sets with auto-fill; "lock 5, request 15" fills exactly ten, and
  every conflict is a typed result with a user-facing sentence. See
  decision-log D55.
- M7-EQUIV-01 (2026-07-21) — nearest cross-brand equivalent, curated
  over computed, each labelled; no curated data exists yet, so every
  answer today says "closest by colour" with its ΔE. See decision-log D56.

Outcome: eight brands, 3,338 threads, and one policy layer behind them —
a design can be restricted to a brand, an inventory, a saved palette or
a preset, capped at a colour count, and pinned with locks, with every
narrowing explained in words rather than silently applied.

## M6 — Photoshop companion layout (shipped 2026-07-21)

- M6-ACCEPT-01 (2026-07-21) — maintainer accepted the companion layout
  gate: side-by-side Photoshop workflow, aspect-locked crop under
  pointer and keyboard on Retina, and the live-update rate under that
  load. See decision-log D54.
- M6-SCALE-01 (2026-07-21) — pattern / capture / preview / export scale
  split into four unit-named quantities in `src/ui/scales.ts`, with
  pattern-dimension controls added and a 4×4 matrix test asserting
  independence by reference identity. See decision-log D52.
- M6-CAPRES-01 (2026-07-21) — capture frame aspect-locked to the pattern
  through `constrainRect` on every mutation route; region size no longer
  affects stitch count. `stitchSpan` removed as tautological. See
  decision-log D52.
- M6-VIEW-01 (2026-07-21) — fit-to-space / fit-width / fit-height, zoom,
  stitch-dimensions readout, and preview scale persisted in project
  schema v2 (CSS px per stitch, forward migration from v1). See
  decision-log D52.
- M6-PANEL-01 (2026-07-21) — settings panel collapses from a permanent
  shell bar with `aria-expanded`; preview gains 37 % more area; state
  remembered in a localStorage shell preference, not project data. See
  decision-log D52.
- M6-FOCUS-01 (2026-07-21) — preview focus hides all but the preview,
  its toolbar, and a compact status line derived from one owned
  snapshot; live capture continues; Escape plus a persistent exit
  control. See decision-log D52.
- M6-NARROW-01 (2026-07-21) — preview-first DOM at every width with the
  settings panel to its right above 60 rem; verified at 320/360/480/800/
  1000 CSS px with no page-level horizontal scrolling, no under-44 px
  targets, and preview before controls in tab order. See decision-log D52.
- M6-WIN-01 (2026-07-21) — spike: browser window placement parked
  (option A, size guidance only); `resizeTo` is ignored without error,
  window-management permission denied, popups blocked even from a
  trusted gesture. No production code. See decision-log D53.

Outcome: the app works as a tall companion beside Photoshop — at 320–480
CSS px the preview takes 93–95 % of the width, panel collapse and preview
focus grow it further, and pattern dimensions are provably independent of
capture, display, and export scale.

## Archived: M0–M5 (2026-07-17 → 2026-07-20) — see archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md
