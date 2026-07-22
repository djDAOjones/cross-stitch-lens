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
