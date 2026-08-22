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

## Live-app feedback (IN PROGRESS, from 2026-08-22)

**Outcome:** the first reports from the public URL are becoming fixes
with the mechanism confirmed in the running app before anything is
proposed — and the owner's saved project file is the evidence that
names it.

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
(D161), publication proceeds in this repository (D164), and the deploy
pipeline ships the built bundle from a green gate.

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

## Batch C0 — Sharpen the tools (SHIPPED 2026-08-11)

**Outcome:** the whole fifteen-item batch shipped in one day as the
gateless autojazz run it was designed to be (D149–D159): the product
renamed end to end, the memory and protected docs made true again, the
audits green and load-tolerant, the diagnostics buffer honest, the PDF
key fixed with the artefact suite that would have caught it, golden
fixtures for all five dither methods, the catalogue swept into a
diffable worklist, the shell shortened, accessible names machine-
checked, two live-preview defects fixed with mechanisms confirmed
first (one ticket suspect overturned), the staleness reservation
closed as accepted, the transcript ritual turned into one command, and
the dither presets renamed to their methods on the owner's signature.
Closed at `check` 1,148 tests and `audit` 55, both green. Residues, on
record: DATA-01's corrections ([maintainer], worklist in
`docs/catalogue-sweep.md`), A11Y-VO-01's human half, ZOOM-01's
feel-check at the next sitting, and the audit-after-check flake on the
wish-list.

- DITH-06 (2026-08-11) — the seven built-in dither profiles are named
  after their methods, owner-signed: None · Atkinson (half strength) ·
  Floyd–Steinberg · Blue noise (boosted) · Jarvis · Ordered (Bayer
  8×8) · Floyd–Steinberg (damped). Label-only by construction —
  matching is structural (`sameDither`) — and verified live in the
  select with every ref resolving and no overflow at width: 100%. The
  basis lines stay. See D159.
- RENAME-01 (2026-08-11) — the product becomes **Pattern Mapper**
  across user-facing strings, both HTML titles, diagnostics, error
  messages, the Rust crate description, `package.json` (lock
  regenerated by npm), the launch config and all live docs including the
  protected trio. The localStorage key moved with a legacy fallback read
  and five tests; the IndexedDB database name deliberately did **not**
  move — renaming it would mean copying hand-curated user data to change
  a string no user sees. Archives and `bench-reports/` untouched: they
  are history. See D150.
- DOCS-01 (2026-08-11) — the transcript ritual becomes one command:
  `npm run transcript` lists this project's Claude Code sessions
  (`~/.claude/projects/<slug>/*.jsonl` — the investigation found the
  sessions were always locally readable; the *Desktop* app's storage is
  the unusable one) and exports a chosen session to `_transcripts/` as
  redacted markdown. Redaction is applied, not promised — key shapes,
  binary payloads, tool-result truncation, home paths — and pinned by
  6 tests. First transcript ever saved landed during the smoke test,
  which also caught `package.json`'s description still reading "Cross
  Stitch Lens" (the D150 residue). See D158.
- STALE-01 (2026-08-11) — the small-edit staleness reservation closes
  **as accepted**, on the owner's recorded "a bit sluggish but can live
  with". The remedy stays on file — lower `DIRTY_MAX_STALE_MS`
  (`src/capture/dirty.ts:54`) with bench evidence that ≥ 4 updates/sec
  holds — and was deliberately not taken gatelessly. See D158.
- ZOOM-01 (2026-08-11) — the wheel-zoom snap is fixed, and the
  confirmed mechanism was **neither of the ticket's suspects**: every
  processed frame re-derived the view, and manual mode re-centres via
  `scaledView`, so under live capture the next frame (≤ 250 ms) threw
  away the wheel's pointer anchor — and any pan. `onFrame` now
  re-derives only when the stitch dimensions change; resizes stay the
  ResizeObserver's. Engaged-only wheel contract (M14-EXT-27) untouched.
  Feel-check at the next sitting. See D157.
- FLICKER-01 (2026-08-11) — stepping the colour count no longer shows
  the un-reduced picture: `setCount` invalidates the selection source,
  and resolving with no source falls back to the full permitted set —
  the interim frame *was* that wide render. `applyColour` now holds the
  previous palette and frame while the fresh source is in flight; the
  fetch's completion handler swaps old-reduced → new-reduced. Verified
  live: stepping 24→8 samples as `24 · limit 8` → `8 · limit 8`, no
  wide frame between. Source *replacements* keep their documented
  two-step on purpose. See D157.
- A11Y-01 (2026-08-11) — every control's accessible name is now a
  gate assertion: a source-scan tripwire over all 66 raw
  interactive-element creation sites (no DOM environment exists and no
  new dependency was allowed), recognising the codebase's real wiring
  patterns — textContent, aria-label, id↔htmlFor by literal,
  identifier or template, appended named spans. Zero exceptions;
  mutation-verified (an unnamed probe button fails, named by file and
  line). A11Y-VO-01 narrows to announcement *quality* plus the
  colour-only check. See D156.
- UI-06 (2026-08-11) — "Colours used" moves inside the Colour
  section's panel: choices above, readout below, one subject in one
  place, and the shell shortens by a top-level section (the
  ICE-WIDTH-01 pairing). It keeps its own disclosure at headingLevel 3
  (a nested section, so the outline stays honest — `createSection`
  gained the option), and its shell×has-rows visibility writer is
  unchanged. Verified in the running app: nested panel, independent
  toggles, identical rows, zero console errors. See D156.
- DATA-01 detection half (2026-08-11) — the catalogue sweep ships as a
  committed `AUDIT=1` audit plus a generated, deliberately timestamp-free
  worklist (`docs/catalogue-sweep.md`), so a re-run after corrections
  shows the delta as a plain git diff. Confirmed the ticket's hand
  numbers exactly: 21 unnamed rows (all Finca, 9.6% of the brand) and 11
  same-brand identical-hex pairs — with two rankings the ticket did not
  ask for: four pairs are **consecutive** references (the copied-down
  spreadsheet-cell shape, all Sullivans) and 6 of 11 groups are one
  brand, the same single-ingest shape as class 1. Findings reported,
  never gated; only the generator's own promises (unique identity,
  well-formed hex) assert. Corrections stay open as [maintainer]. See
  D155.
- M8-GOLD-02 (2026-08-11) — the four unpinned M8 methods gain committed
  golden fixtures (Atkinson, Jarvis, ordered/Bayer 8×8, blue noise),
  asserted bit-exactly beside the pre-M8 Floyd–Steinberg case. Source is
  an 8×8 JSON crop of `landscape-1.jpg` taken 1:1, **not** the JPEG —
  a golden must stay diffable when it fails, and JPEG decoding varies by
  platform. The crop was chosen by scanning for the widest channel
  spread: all 64 pixels distinct, 6–255. Fixtures proven pairwise
  distinct and strictly palette-valid, so they discriminate between the
  methods rather than merely existing. See D154.
- EXPORT-01 (2026-08-11) — the exported artefacts get asserted, not
  just their helpers: 22 tests driving a real `executeRequest` frame
  through the real export assembly. The clean PNG is the grid exactly;
  the enlarged PNG is proven pixel-verbatim at ×2/×3/×7 and invents no
  colour; the chart reserves its furniture and stays inside the canvas
  limit; and the **PDF is parsed as bytes** — one page, the right box in
  points, aspect preserved, and every key row carrying exactly one hex
  with no repeated token. The key assembly moved out of `main.ts` into
  `export/key-entries.ts` so the suite drives production code rather
  than a copy of it. Mutation-verified: reverting the KEY-01 fix fails
  two of these tests. See D153.
- KEY-01 (2026-08-11) — the PDF thread key stops printing the hex
  twice. `keyLabel` now suppresses the trailing hex when the label
  already carries one, which is the case for every generated colour
  with no CSS name (`nonThreadLabel` names those by their hex). Real
  threads unaffected. The regression fixture is an **unnamed**
  generated colour — the old green test used the flattering named case,
  which is why the defect shipped. See D152.
- DIAG-01 (2026-08-11) — the diagnostics buffer stops losing faults to
  noise: the ResizeObserver loop notification (both engines' wordings)
  is downgraded to debug with its reason in code, real uncaught errors
  and unhandled rejections now carry a **stack**, and buffer eviction
  drops the oldest non-error first so chatter cannot evict the error you
  opened the bundle for. 10 tests. See D152.
- ROUTE-01 (2026-08-11) — the routing disagreement is **noise, not a
  defect**: on a quiet machine all sixteen rows separate by 1.35×–4.02×
  with zero disagreements, and under deliberate 10-core load the
  narrowest row (200²/64/lab) collapses 1.77× → 1.24× — the row with the
  least headroom, and the one that flipped. The sweep now tolerates
  near-ties below 1.25× (reported, not failed) and still fails a
  decisive disagreement. D135's "routing confirmed unchanged" stands.
  See D151.
- AUDIT-01 (2026-08-11) — `npm run audit` goes green: the draft-governor
  assertion stopped testing the pre-M8 boolean and now mirrors
  `liveConfig()`'s real `DitherConfig` substitution and its guard, and
  the `p533` axis label became the truthful `p489` across the matrix and
  audit surfaces — including one genuinely slack bound
  (`533 / 5` → `dmc.entries.length / 5`, ~9% tighter). Recorded evidence
  and archives left alone. See D151.
- Doc-sync (2026-08-11) — the protected-doc ledger drains 9 open → 1:
  the four-resolutions Zoom rename and its named D52 collision, the
  two-boundary performance contract, the ship-order fence, the UI
  section census, the retired three-disjoint-rules anatomy, and
  `bench:auto`'s target assertion. Caught in passing: `check` was
  documented as 7 steps and is 8. The survivor is deferred by its own
  terms until DUR-01 decides it. See D151.
- RENAME-02 (2026-08-11) — the platform half closes: the owner renamed
  the GitHub repo and the OneDrive directory, the agent repointed the
  git remote and `package.json`. The repo survived the synced-path move
  intact — clean tree, no conflict copies, `fsck` showing only ordinary
  dangling objects. No new decision; the why is D150.

## Archived: M15 (2026-08-07 → 2026-08-09) — see archive/trajectory/trajectory-0005-2026-08-07-to-2026-08-09.md

## Archived: M13 remainder + M14 (2026-08-04 → 2026-08-09) — see archive/trajectory/trajectory-0004-2026-08-04-to-2026-08-09.md

## Archived: M13 phases 1–2 (2026-07-22 → 2026-07-23) — see archive/trajectory/trajectory-0003-2026-07-22-to-2026-07-23.md

## Archived: M6–M8 (2026-07-21 → 2026-07-22) — see archive/trajectory/trajectory-0002-2026-07-21-to-2026-07-22.md

## Archived: M0–M5 (2026-07-17 → 2026-07-20) — see archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md
