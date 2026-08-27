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

## Track E — Hardening (IN PROGRESS)

**Outcome:** opened 2026-08-27 (D208) from the 2026-08-26 external
review; the quick eight cleared first, leaving the state spine and the
public-surface group.

- BATCH-E0 (2026-08-27) — the hardening quick eight, gate green: the
  deploy workflow's supply chain fully pinned (SHAs, runner, Node,
  Rust, and a checksum-verified wasm-pack replacing `curl | sh`); the
  UI baseline fails closed with regeneration moved to
  `npm run baseline:write`; the secret scan reaches zero warnings with
  its patterns untouched; six dev advisories cleared non-breaking and
  an advisory cadence stated; the WASM handle freed in a `finally`;
  the palette page's last third-party request gone; same-file
  re-selection fixed and the editor's async selection guarded; the
  demo README's provenance corrected — see decision-log D209.

## Track D — Creative control of the image (IN PROGRESS)

**Outcome:** opened 2026-08-23 (D188/D189); the gate was made safe for
the worktree round its scoping tickets open before any of them ran.

- CREATIVE-01 (2026-08-23) — the creative programme signed on two
  prototypes' evidence (branch `creative-01-proto`, pushed): five
  slices — tone mode (v12), adjustments 2a/2b (v13), the eyedropper,
  the contact sheet, the match-error compare — with the weighted
  dither space confirmed by measurement and the nine adjustment
  candidates judged on before/afters. The slices are Track D items
  TONE-01, ADJUST-01/02, PICK-01, SHEET-01, COMPARE-ERR-01; PAINT-01
  scopes separately. See D200.
- ADJUST-01 (2026-08-24) — image adjustments as the third profile
  kind at schema v13: the adjust stage wakes as one three-point
  lightness curve (its ends are the black and white points) plus
  saturation, in Lab, ahead of the resize; nine signed built-ins with
  editable copies in the Processing section; the selection source and
  the compare half are the adjusted picture while the LUT fingerprint
  stays untouched. The hot loop is tabled on a recorded profile
  (189 → 70 ms/MP) at a documented 1-level tolerance. Signed and
  keyboard-passed the same day. See D202, D203.
- MENU-01 (2026-08-24) — the colour-profile selects group with
  `<optgroup>`; shipped inside D205's menu split, seven groups after
  the manufacturer round. Needs no further work (D206). See
  D205–D207. (Line back-filled at the D208 refactor — the eviction
  was missed at ship.)
- ICE-RECOLOUR-01 (2026-08-23) — the colour swap, layer A: a pure
  `swap` stage after the colour stage remaps the sidecar through a
  render palette (selected entries + render-only targets); a design
  rule at schema v11; Swap… on the Colours-used row with a picker over
  the whole universe, "swapped from X" on the target's row, a Swaps
  chip list that keeps and explains a dangling swap; stats read
  against the frame's own config. Closes MUST-01's presence half. See
  D199.
- INFRA-02 (2026-08-23) — four gate riders: the bench harness popup
  follows `BASE_URL`, `check:docs` passes on its own in a fresh tree
  (the wasm pkg is generated output), `eslint` ignores
  `bench-reports/`, and `verify:deploy --fetch` refreshes `origin`
  first; the full gate proved green in a fresh worktree. See D198.

## Small UI batch (SHIPPED 2026-08-23)

**Outcome:** the five Icebox promotions of D188 plus three UI defects
the wish-list triage surfaced, run gateless in one sitting in the
owner's order (D189) — eight items, D191–D196.

- ICE-SYMBOL-UI-01 (2026-08-23) — the Colours-used table is the live
  symbol key: a Symbol column with a picker over the unused glyphs,
  live grants for palettes that fit the 64-glyph set, overrides
  persisting through the existing `symbols` block. See D191.
- ICE-LIMIT-01 (2026-08-23) — the colour-limit slider is a log scale
  from 2 to 512 with 16 at its midpoint (two log halves, 300
  positions, `aria-valuetext` in colours); the number input stays the
  exact handle. See D192.
- ICE-WIDTH-01 (2026-08-23) — the shell judged at 400 and 320 px:
  three page-overflow causes fixed (content-box inputs, the table's
  visually-hidden text escaping its scroll box, the fieldset
  min-content default) and the browse-row buttons kept on one line.
  See D193.
- ICE-WIDTH-02 (2026-08-23) — the width guide announces only under
  the diagnostics rule (dev builds, `?diag=1` in production); the
  public header is two lines shorter. See D193.
- DATA-05 (2026-08-23) — three strings: the mapped-colour tooltip
  names its source instead of "not measured", the Design title's
  helper says it names the saved file, and the chart-size readout
  counts the label gutter (2037, not 2000). See D194.
- FIT-01 (2026-08-23) — the preview's zoom bounds are CSS px per
  stitch at any density: a collapsed preview fits at the schema floor
  and a zoom reaches the ceiling on a 2× display. See D195.
- GRID-DPR-01 (2026-08-23) — a device-pixel-ratio change re-sends the
  grid style and re-derives the preview surface. See D195.
- CAPTURE-END-01 (2026-08-23) — a share ended from outside the app is
  named above the preview in a dismissible inline notification, beside
  the status line. See D196.

## Track B — Durability & identity (SHIPPED 2026-08-23)

**Outcome:** the app no longer loses your work and can tell two designs
apart — saved projects are `.pmproj` packages with the picture inside, a
design history restores the latest design on reopen, and files carry
the design's title.

- DUR-01 (2026-08-23) — work survives closing the tab: `.pmproj`
  project packages (schema v10, the picture embedded verbatim, legacy
  `.json` still loads), a design history in its own IndexedDB database
  that restores the latest design on boot with a Recent designs picker,
  bounded storage with oldest-first eviction and a persist opt-in, and
  a live capture that freezes to a still at save time. See D179.
- SAVE-01 (2026-08-23) — a saved project has a name of its own: the
  Design title names the file, the picture's name stands in, a
  timestamp is the last resort. See D179.

## Live-app feedback (IN PROGRESS, from 2026-08-22)

**Outcome:** the first reports from the public URL are becoming fixes
with the mechanism confirmed in the running app before anything is
proposed — and the owner's saved project file is the evidence that
names it.

- MUST-01 (2026-08-23) — a Must-use picked outside the profile pins
  into the design's recipe copy: the seat is honoured, "(edited)" tells
  the truth, removing the chip undoes the pin, Revert drops it; drifted
  seats stay kept and explained; My-inventory designs render from their
  pins with the inventory warning. See D178.
- DIAG-02 (2026-08-23) — Report a problem: one click saves the settings
  document and the redacted log, then opens a prefilled compose window
  that says to attach both; the project text is a host callback, so
  D179's format change cost one wiring line. `DEV_EMAIL` stays empty
  until the owner's alias lands. See D183, D187.
- ICE-RECOLOUR-01 (2026-08-23) — sign-off: the five questions answered,
  layer A (the colour swap) scoped and its option picked — a design
  rule, a pure stage over the sidecar with a render palette; builds as
  schema v11 in a later round. See D182.
- MYTHREADS-01 (2026-08-23) — the empty-inventory dead end gets an
  exit: "My inventory" (renamed from "My threads", id unchanged) is a
  disabled option with its reason while the inventory is empty, and a
  design already linked to it shows a banner beside the preview with
  Use DMC / Add threads. Verified on the reporter's second file. See
  D176.
- COUNT-01 (2026-08-23) — a profile that resolves to nothing no longer
  masquerades as a render: the Stats line says "no palette applied"
  instead of "· limit N", the estimate refuses to price RGB, the Colour
  section states the consequence beside the cause, an empty inventory
  under My threads is named as such, and the profile-world count
  sentence is grammatical. Reproduced from the owner's project before
  and after. DIAG-02's `?diag=1` opt-in and palette logging shipped
  alongside; MUST-01's wording half too. See D174 (mechanism) and D175
  (fix).

## Track C — Publication (IN PROGRESS, owner-paced)

**Outcome:** the app has a public URL. Licences and notices landed
(D161) and are readable in the app (D177), publication proceeds in
this repository (D164), and the deploy pipeline ships the built bundle
from a green gate and then proves the live site serves it (D180).

- PUB-06 (2026-08-23) — `PM_PUBLIC_BUNDLE=1` drops `bench.html` /
  `bench-source.html` from the public Pages build; every other build
  keeps the harness. See D181.
- PUB-05 (2026-08-23) — `npm run verify:deploy` compares the live build
  id's SHA with the pushed commit (`--wait` polls through the ~4-min
  deploy), and CI runs it after the deploy job. See D180.
- PUB-01 (2026-08-23) — the notices are reachable from the app: a ghost
  "Licences" button in the header's utility row opens a Close-only
  dialog carrying `LICENSE` and `THIRD-PARTY-NOTICES.md`, imported at
  build time so the bundle carries the documents and nothing is
  fetched. Human remainder: native activation, in-dialog scrolling, a
  VoiceOver pass. See D177.
- PUB-04 (2026-08-22) — GitHub Pages serves the built app, not the
  raw branch: a green `check` on `main` rebuilds with
  `--base /pattern-mapper/`, uploads `dist` and deploys it, Rust engine
  included; the one root-baked runtime path (the profile-demo loader)
  now follows the base, pinned by a regression test. See D172.

## Track A — The printable pattern (IN PROGRESS)

**Outcome:** the chart became a printable pattern. Four milestones
shipped in one day — symbols and B/W charting, grid styling presets,
multi-page pagination, and fabric/thread estimates — carrying the
project file from schema v5 to v9. The brief's second success
criterion (a stitchable chart printed from a captured design) is
mechanically met; what remains of the track is M16's owner sitting.

- M16 (2026-08-23) — sitting pack prepared, no product change: the
  defaults table, the M9 inspection checklist, the M12 wording list, a
  sign-off form with 14 proposed defaults, 13 export artefacts and
  regenerated symbol evidence under `bench-reports/m16-sitting/`
  (machine-local); the sitting decides.
- M9 (2026-08-12) — symbols and black-and-white charting close on the
  owner's signature: 64 app-owned vector glyphs in four signed
  batches, identity-keyed assignment persisted as state (schema v6),
  three chart modes across both chart artefacts, a symbol/name/count
  key, and refusal rather than silent repetition past the set. The
  override UI deferred to ICE-SYMBOL-UI-01; the print inspection
  folded into M16. See D165 (build) and D170 (signature, close).
- M12 (2026-08-12) — fabric sizing and thread estimates ship
  disclosed: a pure estimator (front geometry, named routing and
  waste factors, strands-of-six conversion, per-colour skein
  round-up — colours cannot share a skein), Stats rows for fabric
  size, cut size, centre, and total thread beside a Fabric fieldset,
  and the assumptions sentence rendered wherever a result shows.
  Schema v9 persists the whole model. Verified against hand
  calculation live. See D169.
- M10 (2026-08-12) — the chart PDF paginates: a pure, exhaustively
  tested page planner (half-open bounds, leading-edge overlap,
  row-major), tiles rendered through the one chart encoder with
  **global** grid classification and numbering, a cover page with the
  tiling drawn over a colour overview map plus the key, one shared
  scale so a taped assembly is ruler-true, alignment marks, dashed
  trim lines, and range-naming footers. Schema v8 adds `single`/`grid`
  paging to `export.pdf` (single stays the default). Verified live:
  200×200 at 60/page → 17 pages. See D168.
- M11 (2026-08-12) — grid, ruler & tick styling ships preset-led: six
  built-ins over paired screen + print style blocks (schema v7,
  appearance-preserving migration), per-class colour, opacity, dashed
  minors, an outer border, and the label gutter sized from the
  numbering font — closing the A17 `FIT_MARGIN` clip in preview and
  the chart's own 4-digit variant. Custom is a computed state; the
  file stores canonical values with the preset id as provenance only.
  Verified live including an in-app save→load round trip. See D167.

## Archived: Batch C0 (2026-08-11) — see archive/trajectory/trajectory-0006-2026-08-11.md

## Archived: M15 (2026-08-07 → 2026-08-09) — see archive/trajectory/trajectory-0005-2026-08-07-to-2026-08-09.md

## Archived: M13 remainder + M14 (2026-08-04 → 2026-08-09) — see archive/trajectory/trajectory-0004-2026-08-04-to-2026-08-09.md

## Archived: M13 phases 1–2 (2026-07-22 → 2026-07-23) — see archive/trajectory/trajectory-0003-2026-07-22-to-2026-07-23.md

## Archived: M6–M8 (2026-07-21 → 2026-07-22) — see archive/trajectory/trajectory-0002-2026-07-21-to-2026-07-22.md

## Archived: M0–M5 (2026-07-17 → 2026-07-20) — see archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md
