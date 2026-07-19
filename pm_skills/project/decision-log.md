# Decision log — Cross Stitch Lens

<!-- Append-only. Newest at the bottom. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents scan the latest 10 HEADINGS by default and
     open only the bodies relevant to the task. -->
<!-- Keep each entry tight: Decision / Rationale / Alternatives, not an essay.
     The live log is budgeted by WORDS as well as entry count (see
     pm_skills/memory-policy.md), so verbose entries trip a prune sooner. -->
<!-- This is the home of the WHY. The backlog/trajectory only point here;
     never paste an entry's prose into those files. -->

## Archived: D1–D10 — see archive/decision-log-2026-07-16.md

## D11 — Upgraded pm-skills framework 3.17.1 → 4.0.0 (2026-07-17)

**Decision:** Upgraded pm-skills framework.
**Version:** 3.17.1 → 4.0.0.
**Source:** `https://github.com/djDAOjones/PM-Skills.git` (fresh clone).
**What changed:** Framework sync per the 4.0.0 (DIST-BOUNDARY) upgrade
actions — overwrote `init.md`, `GUIDE.md`, `MANIFEST.md`,
`prompts/upgrade.md`, `integrations/adopt.md`,
`integrations/init-mvp.md`, `VERSION`, `CHANGELOG.md`; added
`pm_skills/templates/` (the three rulebook templates, now shipped
inside the distributable). Root rulebooks untouched (project-owned).
Housekeeping per the same entry — removed framework-source-repo files
never meant for consuming projects: `self/` (maintainer memory),
`CONTRIBUTING.md`, `scripts/gen-file-map.mjs` (source-repo fork; the
scaffold copy at `pm_skills/scaffold/gen-file-map.mjs` is the one
`AGENTS.md` already names), and the dead `self/` ignore rules in
`.gitignore`, `.markdownlintignore`, `.markdownlint-cli2.jsonc`,
`cspell.json`, `.editorconfig-checker.json`. Kept (in active use as
the interim docs-lint gate until M0): `package.json` (renamed
`pm-skills` → `cross-stitch-lens`, repository URL corrected),
`scripts/check-docs.mjs` (path validation now skips framework-class
`pm_skills/` docs, still checks `pm_skills/project/`),
`.github/workflows/lint.yml`, `.githooks/pre-commit`.
`.windsurf/workflows/next.md` rewritten from the source repo's
self-hosted mapping to the standard consuming-project form.
**Local framework customisations:** none found (Step 4 diff clean).
**Gate:** `npm run check` green (all four steps) after the change.

## D12 — M0 toolchain and gate composition (2026-07-17)

**Decision:** M0 shipped on current majors — Vite 8, TypeScript 6
(strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`),
ESLint 10 flat config, Vitest 4, `@types/node`, Prettier (format only,
never the gate). All dev dependencies; zero runtime dependencies.
`check` composes six non-mutating steps: typecheck, ESLint, Vitest,
production build, the docs-lint baseline (markdownlint, check-docs,
cspell, editorconfig), and a report-only secret scan
(`scripts/check-secrets.mjs`). CI (`.github/workflows/lint.yml`) runs
`npm run check` on Node 22 — local green = CI green.
**Why (notable calls):**

- Core isolation is enforced with `no-restricted-imports` (layer-dir
  patterns + a regex banning package imports) plus
  `no-restricted-globals` in `src/core/` — tsc cannot express the
  boundary; ESLint can.
- `Stage<P>` is invariant in `P`, so heterogeneous pipelines use a
  `stageInstance()` helper that erases `P` only after stage+params are
  verified together — the one sanctioned erasure; `any` stays banned.
- Initial golden fixtures were generated (not regenerated) by the
  committed `scripts/gen-golden-hello.mjs`; the protected-file rule
  applies from this commit forward.
- `check-docs` no longer validates paths in the decision log: an
  append-only record legitimately references paths that later vanish
  (same class as the framework CHANGELOG exclusion).
- `no-console` is on app-wide; `src/diagnostics/log.ts` carries the
  single sanctioned disable, and Node CLI scripts are exempt.
- Product version v0.1.0 (M0); build identity injected at build via
  Vite `define` (`v0.1.0+YYYYMMDD.shortsha`).

## D13 — Colour-reduction vertical: conversions, palette, LUT, reduce (2026-07-18)

**Decision:** Shipped the M1 colour-reduction foundation as one batch:
`src/core/color/` (conversions + metrics), the palette model over the
generated DMC data, the 15-bit LUT builder, and the reduce stage with
LUT and exact paths.
**Why (notable calls):**

- Conversions use the IEC 61966-2-1 sRGB curve/matrix and CIE 1976 Lab
  (D65/2°), pinned by golden tests against published reference values
  (tolerance 0.1) and a 1/255 round-trip invariant. Out-parameter API
  (`Float32Array` + offset) keeps hot loops allocation-free.
- Metrics return SQUARED distances — nearest-neighbour search only
  compares, so sqrt is never taken. CIE76 is the MVP metric; CIEDE2000
  stays on the wish-list (§6).
- LUT bins map to representative colours by bit replication
  ((v<<3)|(v>>2)) so pure black/white are exact; LUT[key] is computed
  against those representatives, making LUT↔exact agreement on bin
  centres a testable invariant. The LUT builder is pure core; hosting
  it in the worker belongs to the executor item.
- Reduce keeps both paths behind one params contract
  (`path: 'lut' | 'exact'`, optional precomputed `lut`): LUT for
  preview speed, exact for dither error terms and full-quality export.
  Alpha passes through untouched.
- The reduce golden fixture is hand-derived (2x2 vs an unambiguous
  4-colour palette, verifiable by inspection) rather than generated,
  so no generator script duplicates the algorithm under test.
- `ReduceParams` carries the palette object for now; palette-by-name
  serialisation is deferred to the project-file work (M3).

## D14 — Floyd–Steinberg dither: exact errors, serpentine, schema-level seed (2026-07-18)

**Decision:** Dither runs error diffusion in a `Float32Array` working
buffer with exact palette matching (never the LUT), a serpentine
option that mirrors both scan direction and kernel offsets, and alpha
excluded from diffusion (passthrough). `DitherParams.seed` exists in
the schema but is unused: Floyd–Steinberg is deterministic, and the
field is reserved so stochastic variants (wish-list §8) won't bump the
project-file schema.
**Why:** Exact error terms are the D6 trade-off's other half — LUT
quantisation is acceptable for plain reduction precisely because
diffusion quality never depends on it. Bit-exact determinism is the
reference bar future WASM backends must clear (backend discipline).
Working values are clamped to 0–255 before matching and the error is
computed from the clamped value, bounding runaway accumulation at
saturated edges.
**Tests:** golden 8x8 fixture (generated by the TS reference via a
temporary vitest file, then committed; generator deleted), a
hand-derived 1x4 diffusion trace, palette membership, cross-metric
determinism, mean preservation on a uniform field (±3), serpentine ≠
raster, alpha/purity.

## D15 — Resize: pure area-average reference, grid-always output (2026-07-18)

**Decision:** The resize TS reference is a pure exact-area resampler
(premultiplied alpha) — no canvas/drawImage in core. Output is always
grid-sized; uncovered cells are RGBA(0,0,0,0) empty stitches (D9),
placement centred. Modes: stretch / contain / cover, and `fit` defined
as scale-down contain (never enlarges — CSS scale-down semantics),
since plain aspect-fit is already `contain`. Grid dimensions validate
as integers 1–1024 (`RangeError` otherwise).
**Why:** Core purity forbids the GPU `drawImage` path in the budget
table — that arrives later as an accelerated backend behind the same
stage contract, exactly like WASM/WebGPU elsewhere (D4/D5). Area
averaging is deterministic and golden-testable where bilinear kernels
vary by implementation; premultiplication stops transparent pixels
bleeding colour into edges, which matters when alpha means "empty
stitch". Manual positioning/padding within the grid stay post-MVP
(§4 extras, wish-list).
**Tests:** committed golden (9x5 → contain 4x4, translucency included)
plus hand-derived exact cases: checkerboard average, letterbox rows,
symmetric crop, unscaled centring, no-bleed premultiply, bounds,
determinism/purity.

## D16 — Worker executor: config over stages, thin shell, latest-wins (2026-07-18)

**Decision:** The serialisable `PipelineConfig` — not a stage array —
crosses the worker boundary; `buildStages()` in core turns it into the
executable list, with both §7 presets (`resize-first` default per D3,
`reduce-first` for comparison). The `adjust` stage ships as the
identity hook (brief excludes ops beyond the hook; the slot exists so
presets and future project files already carry it). When dithering is
on, the dither stage IS the quantiser — reduce is not also run. The
worker entry is a two-line postMessage shell; executeRequest,
the LUT cache (one build per palette+metric), and the latest-wins
`Coalescer` are plain modules tested hermetically. Frames fail as
error *responses*, never worker crashes. Pixel data crosses as
transferred ArrayBuffers both ways.
**Why:** Config-as-data keeps order in the project file (§7,
non-destructive), keeps postMessage payloads serialisable, and lets
the worker own LUT lifetime (the D13 deferral, now closed). A thin
shell means the only untested code is two lines of glue — the real-
browser pass is named a manual-gate item for M2's preview UI.
**LUT cache key** is palette name + entry count: sufficient while
palettes are built-in presets; user-defined palettes (post-MVP) must
revisit it.

## D17 — Image import + minimal M1 dev shell (2026-07-18)

**Decision:** All three import routes (§3: file picker, drag-drop,
clipboard paste) funnel one decode path — `createImageBitmap` →
`OffscreenCanvas` → `PixelBuffer` — into the worker client at a fixed
demo config (200×200 contain, DMC, Lab, serpentine dither,
resize-first). The shell renders the result 1:1 with CSS pixelated
upscale; thread colours stay unfiltered content. The pure half
(file-list filtering) is hermetically tested; decode/render were
verified in the running browser, which also exercised the worker
round-trip with transferred buffers — the D16 manual-gate item, now
closed.
**Documented deviation (UI-STANDARDS):** this is the minimal M1 dev
shell — plain semantic HTML honouring the AAA basics (visible label,
7:1 text contrast both schemes, focus rings, ≥44px file-input target,
role="status" live region, drop/paste never the only route). The
Carbon panel layout, controls, and real preview are M2's own backlog
items, not a gap.
**Why:** M1's acceptance line requires the dithered output to
*render*, so a render surface is in scope now; keeping it deliberately
throwaway (one canvas, no zoom) avoids pre-building M2. Fixed config
because controls without Carbon panels would be rework.

## D18 — Stats subset + M1 milestone close (2026-07-18, v0.2.0)

**Decision:** `computeStats` runs one pass over an OUTPUT buffer:
stitch/empty partition at alpha ≥ 128 (the D9 50% rule; empty cells'
colours are ignored), distinct-colour count, per-colour counts and
percentage OF STITCHES (not cells), sorted by count with a hex
tiebreak for determinism; thread references attach when the colour
matches the active palette, so full-RGB mode simply carries none.
Runs on the main thread over the returned frame for now — M2's "info
panel bound to stats" decides whether it moves into the worker.
Physical dimensions / thread length / skeins stay post-MVP (§11
remainder, wish-list).
**M1 closes at v0.2.0** (milestone MINOR bump). Verified in-browser:
320×240 PNG → 200×150 in a 200×200 grid = 30,000 stitches + 10,000
empty (sums to the cell count), 111 DMC colours, dithered.
**Acceptance caveats (seed-backlog drift, for maintainer sign-off):**
(1) "16-colour" output — MVP scope is one preset palette (DMC 533) or
full RGB; no 16-colour palette exists by design (D9/D10). (2)
"save→load→save byte-identical" — the project file is M3's own item;
that clause is deferred to M3, not silently claimed. (3) Golden
fixtures cover resize/reduce/dither/identity; the adjust hook shares
the identity implementation and gets its own fixtures when §9 ops
land.

## D19 — Preview surface: worker-owned canvas, main-owned viewport (2026-07-18)

**Decision:** The preview canvas transfers control to the processing
worker (`transferControlToOffscreen`) — the architecture's "one
worker owns the pipeline and an OffscreenCanvas". The worker keeps an
ImageBitmap of the last processed frame (snapshotted before the
pixels transfer back for stats) and redraws on view/resize messages
without reprocessing; smoothing is off, so stitches stay square. All
viewport mathematics — fit-to-window, cursor-anchored zoom clamped to
5%–6400%, pan clamped to keep ≥32 device px visible — lives main-side
in pure, hermetically tested functions; the worker applies a finished
transform blindly. Input per UI-STANDARDS canvas accessibility:
focusable host with visible ring, `+`/`−`/`0` keys, arrow-key pan
(Shift ×4), wheel zoom anchored at the cursor, drag pan with pointer
capture, 44px toolbar buttons with a zoom readout. Auto-fit applies
per new image and disengages on any manual view change.
**Why:** Worker-side redraw makes pan/zoom independent of pipeline
cost (the 60 fps acceptance bar); main-side maths keeps the testable
logic out of the untestable-in-node worker context; device-pixel
transforms keep the surface DPR-crisp.
**Verified in-browser:** auto-fit 296%, buttons ×1.25² → 462%, `0`
refits, focus lands on the host, crisp pixel squares at 1127%.

## D20 — Grid overlay: pure geometry, worker draw, legibility auto-hide (2026-07-18)

**Decision:** The grid overlay (§15 subset) renders worker-side in
`preview-surface.ts`, above the stitches, in device space — line
thickness is zoom-independent, matching chart convention. Geometry
lives in a pure module (`src/worker/grid.ts`, D19 pattern: testable
maths + a blind drawing shell): lines on cell boundaries at minor/major
intervals, both outer edges always present, minor never duplicating
major, spans snapped to whole device pixels. A line class auto-hides
when its spacing falls under 4× its thickness, so a zoomed-out preview
never smears into a solid wash. `GridStyle` (show, minor/major
interval, one line colour, per-class thickness) crosses the protocol as
a `grid` message with thicknesses pre-scaled to device px by the main
thread — the worker stays DPR-blind, same contract as the view
transform. Interim UI is a toolbar "Grid" toggle (aria-pressed +
inverted-fill on state); the full Carbon grid panel and the remaining
§15 controls (opacity, border, above/below, dashed, empty-cell
visibility) stay with their own backlog items. GridStyle joins
`ProjectFile` when M3 save/load lands.
**Why:** Device-space drawing keeps grid redraw on the existing
view-message path (no reprocessing, 60 fps bar intact); the legibility
rule makes the default grid safe at any zoom without a control.
**Verified in-browser:** majors-only at 216%, minors appear at 422%,
toggle hides/shows instantly, console clean.

## D21 — Tick marks + numbering: boundary labels, origin 1, thinning (2026-07-18)

**Decision:** Basic §16 subset: outward tick marks with numbers on
the top and left edges only, aligned to grid boundaries at the major
interval, counting whole stitches with origin at 1 (the boundary
after stitch 10 reads "10"; the 0 edge is never labelled). Geometry
joins the pure grid module: `labelInterval` doubles the major
interval until neighbouring labels sit ≥ 48 device px apart, so
zoomed-out numbering thins (10 → 20 → 40…) instead of colliding.
Ticks ride the existing `GridStyle` message and the interim Grid
toggle — one switch for all chart furniture until the Carbon panel
splits controls. Label text uses the page's computed text colour,
sent from main and re-sent on a `prefers-color-scheme` change (the
worker stays theme-blind); tick strokes reuse the grid line colour.
`fitView` gained an optional margin (24 CSS px × DPR at the call
site) reserving room for the furniture — it changes only the scale;
centring symmetry leaves the offsets untouched, so existing viewport
behaviour is preserved. The rest of §16 (per-edge placement, fonts,
directions, centre alignment, presets) stays parked; tick settings
join `ProjectFile` with M3 save/load alongside GridStyle.
**Why:** Boundary-aligned numbering at the major interval is the
cross-stitch chart convention; the thinning rule keeps the default
legible at any zoom with zero controls.
**Verified in-browser:** full 10-step numbering at 286% fit, thinned
to 20s at 146%, white labels in dark scheme, console clean.

## D22 — Split compare: full-RGB twin pass, clip-free draw (2026-07-18)

**Decision:** The split compare (§10) shows the *resized, unreduced*
source — `fullRgbVariant(config)` strips the palette, keeping preset,
grid and resize mode — not the native-resolution original. Both
halves then share grid dimensions and one transform, aligning
cell-for-cell, so the difference on screen is exactly what colour
reduction does. The worker caches the last source frame (stages are
pure, the request buffer survives processing) and reruns the cheap
full-RGB pass on frame arrival while comparing, or once on a late
compare-enable — no main-thread round-trip. Split position crosses
the protocol as a design-width fraction; UI is a Compare toggle plus
a native labelled range slider (keyboard-operable for free), shown
only while comparing. **Hard-won constraint: no `ctx.clip()` on the
transferred OffscreenCanvas.** The first implementation clipped the
source half; enabling compare then stalled Chromium's compositor —
page rAF stopped entirely (screenshots/scroll hung; worker and main
JS stayed alive) and recovered the instant compare was disabled,
reproduced in two tabs. The draw now uses a source-rect `drawImage`
(no clip, no save/restore) and the stall is gone.
**Why:** Comparing at grid scale isolates the reduction decision the
user is actually tuning; the twin-config approach reuses the whole
executor rather than growing a second render path.
**Verified in-browser:** smooth source left / dithered DMC right at
50%, divider tracks the slider to 25%, rAF probe healthy with
compare on, console clean.

## D23 — Info panel: pure row model, capped table, content swatches (2026-07-18)

**Decision:** The stats info panel (§11 bound to the preview) is a
summary line plus a colours-by-usage table docked below the canvas,
re-rendered per processed frame. The module splits per the project's
test convention: `buildRows` / `formatPercent` / `summaryText` are
pure and node-tested; `createInfoPanel` is the thin DOM half,
verified in-browser. The table caps at the top 30 colours with an
aggregated "+N more colours · M stitches" row — full-RGB mode can
emit thousands of distinct colours, and an unbounded per-frame table
rebuild would be both unreadable and slow. Swatches are decorative
(`aria-hidden`) beside the text label (thread "code name", else hex);
the hex always rides the row tooltip (colour-fidelity rule); swatch
backgrounds are content colours, never UI tokens. No `aria-live` on
the table — per-frame announcements would be noise; the existing
status line covers state changes. Counts use a fixed en-GB locale for
deterministic tests; singular/plural handled ("1 colour").
**Why:** Binding the already-computed M1 stats to a real panel closes
the §11 display loop before the Carbon panels land; the cap keeps the
live-update path frame-rate-safe by construction.
**Verified in-browser:** 95-colour gradient shows 30 DMC rows + "+65
more · 4,804 stitches" (sums check), black square updates live to
"1 colour", empty state renders after reload, console clean.

## D24 — Control panels: native fields, Carbon-productive, master-copy reprocess (2026-07-18)

**Decision:** The M2 control panel is a side `aside` of four
`fieldset` groups — Grid / Colour / Dither / Pipeline (UI-STANDARDS layout
model) — built from native form controls styled to Carbon's
productive language in project code (no Carbon packages, per the
hard rule): switch-role checkboxes drawn as toggle tracks with
On/Off state text (never colour-only), labelled number inputs whose
values snap back in-range via a pure tested `clampInt`, a native
colour picker, and selects for colour mode (DMC / full RGB) and the
§7 order preset. Controls apply immediately — no Apply buttons
(§5.4). Pipeline-affecting changes reprocess by cloning a main-side
**master copy** of the decoded image into the existing latest-wins
submit path — chosen over a worker-side reconfigure message because
it reuses coalescing wholesale at the cost of one buffer copy per
change (~ms at MVP sizes; profile before optimising). Grid-style
changes stay view-only worker messages (no pipeline run). The dither
toggle disables in full-RGB mode (disable impossible actions).
"Grid" here means the §15 overlay styling; grid *dimensions* UI (§4)
is parked to the wish-list, not silently dropped.
**Why:** Native-first controls meet the accessibility bar for free
and the Carbon look is CSS; the master-copy path keeps the worker
protocol small while M4 live capture will naturally replace it with
a frame stream.
**Verified in-browser:** full RGB → 1,410 hex colours + disabled
dither; DMC without dithering → 45; reduce-first → 1,034 (quantise-then-
resize blending, the §7 comparison working); pipeline 3.3 ms
(< 150 ms acceptance); major-interval 5 redraws instantly; zero
uncaught errors.

## D25 — M2 milestone close: acceptance evidence, v0.3.0 (2026-07-19)

**Decision:** M2 closes with both acceptance legs verified and the
product version bumped to v0.3.0 (milestone = MINOR, per
DEV-INFRASTRUCTURE → "Version management"; lock synced via
`npm install --package-lock-only`, 0 advisories). Evidence:
controls-to-preview latency **3.3 ms** end-to-end at 200×200 (bar:
150 ms), measured through the real pipeline via the timings the
worker already reports. The 60 fps pan/zoom leg was measured by
driving the **real `preview-surface` draw code** (dev-server module
import, main-thread instance of the same module) with a 1024×1024
bitmap on a 2800×1800 device-pixel surface: worst case **0.32
ms/full redraw** (deep zoom, dense minor grid + ticks), 0.07 ms at
fit — ~52× inside the 16.7 ms frame budget. Caveat recorded: the
probe times the draw path, not the worker's message loop; message
overhead is micro-scale and the headroom absorbs it. README status
rewritten (was still "M0 not yet landed"); M3 (exports) becomes the
current milestone.
**Why:** The one unmeasured acceptance leg needed real-code evidence
before calling the milestone done; a probe through the actual module
beats a synthetic canvas benchmark and needed no instrumentation
code.

## D26 — Pruned project memory (2026-07-19)

**Decision:** Archived D1–D10 (the 2026-07-16 founding decisions,
verbatim) to `archive/decision-log-2026-07-16.md` and created
`archive/INDEX.md`; live log 25 → 15 entries plus this record.
Trigger: entry count over the 20-entry budget (Diagnose check 1).

## D27 — Clean/enlarged PNG export: worker re-run + pure NN expansion (2026-07-19)

**Decision:** Exports go through a dedicated worker `export` message
that re-runs the pipeline from the retained master image and is
answered one-to-one by id (a promise on the client), bypassing both
the preview surface and latest-wins coalescing — so the "exports
always re-run at full quality" invariant holds by construction and
survives M4's draft-quality preview. Enlargement is pure TS
nearest-neighbour block replication (`scaleNearest`) followed by a
1:1 OffscreenCanvas PNG encode — no `drawImage` resampling in the
export path, so output is deterministic and hermetically testable.
Transparent background passes engine alpha through untouched; solid
background is a straight-alpha composite over an opaque colour.
Scale is clamped to the ~16384 px canvas side limit, with the clamp
surfaced in the status line. Auto-jazz assumptions: scope held to
the two backlog items (§13 extras — custom dimensions, metadata,
sidecar palette, intermediate stages — stay parked); the export UI
is a fifth fieldset (Scale / Background / Background colour /
Export PNG) with the button disabled until a frame exists. Dev
infra: `vite.config.ts` honours a `PORT` env var and launch.json
sets `autoPort`, so a second session's dev server coexists with a
running one.
**Why:** Reusing the last preview frame was simpler but would
silently break the full-quality invariant the moment draft mode
lands; the worker re-run costs one extra pipeline pass per export
(milliseconds) and makes the invariant structural rather than
disciplinary.

## D28 — Styled PNG chart: preview geometry reuse, print-fixed colours (2026-07-19)

**Decision:** The chart export reuses the preview's pure grid
geometry (`worker/grid.ts` — `gridLines`/`tickLabels`/`snapSpan` at
scale = cell px) and the clean-PNG transforms (`scaleNearest` +
`flattenBackground`) rather than growing a parallel chart-furniture
implementation. Furniture follows the user's on-screen grid settings
(intervals, colour, CSS-px thicknesses — the chart's native unit),
so the only new control is a chart cell-size field (4–40 px, clamped
to the canvas side limit with margins included). Paper is fixed
white and label ink fixed dark regardless of app theme — the
preview's page-text-colour labels would vanish on white paper.
Empty (transparent) stitches flatten to paper rather than exporting
holes. The chart re-runs the pipeline via the M3-PNG export message
(full-quality invariant). Assumptions at skipped gates: the chart
respects the show/ticks toggles (furniture-off charts are
deliberately possible); §14 extras (symbols, palette key, titles,
page furniture) stay parked for the PDF item and post-MVP.
**Why:** One geometry implementation means the chart and the preview
can never disagree about where lines and numbers fall — the tested
pure layer stays the single source of truth; fixed print colours
stop a dark-theme session silently producing an unreadable chart.

## D29 — Single-page PDF chart: embedded raster + vector key (2026-07-19)

**Decision:** The PDF (pdf-lib 1.17.1 — first use of the allowlisted
dependency, 0 advisories) embeds the chart.ts raster at print
resolution (~2400 px long side ≈ 300 dpi on A4) and draws the title
and thread key as native vector text, so furniture geometry stays
single-sourced in grid.ts/chart.ts rather than reimplemented in PDF
space. A pure bottom-up layout (`pdfLayout`) computes page size
(A4/Letter, portrait/landscape), mm margins, the title block, an
aspect-preserving chart fit, and a column-wrapped key of **used**
colours (computeStats.perColor: swatch + code + hex) capped at 40 %
of content height with a "+N more colours" note; full-RGB mode omits
the key. Standard PDF fonts are WinAnsi-only, so titles degrade
non-Latin characters to '?' instead of throwing. `buildChartPdf` is
plain pdf-lib and runs under Node — tests parse the produced PDF.
Assumptions at skipped gates: the key lists used colours only (a
533-swatch DMC key would be unusable); counts and symbols stay
parked (§17, post-MVP).
**Why:** Embedding the tested raster keeps one furniture
implementation and makes the PDF show exactly what the chart PNG
shows; vector title/key stay crisp at any print size. The milestone
acceptance leg — a printed A4 of a 100×100 design is legible — is a
manual print check by design: named here, not silently skipped.

## D30 — Project file v1: settings-only schema, canonical serialisation (2026-07-19)

**Decision:** Schema v1 (§20 MVP subset) persists settings only —
pipeline config with the palette as a **name reference** ("DMC" /
null, never embedded data), grid/chart styling (minus the
theme-derived tick text colour, recomputed at render), and export
preferences. The source image is not stored; a loaded project applies
to the next import (source references arrive with capture, M4). The
schema, migration switch, and (de)serialisation live together in
`src/core/project.ts` — the v1 stub moved out of `types.ts` so the
version and its logic have one owner and no type cycle through the
stage modules. `serializeProject` reconstructs a canonical field
order (2-space indent, trailing newline) and `parseProject` validates
with path-named errors, ignores unknown extra fields, refuses a newer
`schemaVersion` explicitly, and migrates older ones forward — making
save → load → save byte-identical (AGENTS.md invariant, asserted in
tests). On load the UI writes state objects first, then syncs control
DOM values silently (no synthetic events) so a load costs exactly one
reprocess. Assumptions at skipped gates: an unknown palette name
refuses the load rather than substituting; validation ranges are
broad sanity bounds (grid 1–1024 per the brief), not duplicates of
the control bounds.
**Why:** Name-referencing the palette keeps project files small and
human-readable and lets future preset palettes resolve by name;
canonical serialisation makes the byte-identical guarantee structural
rather than accidental.

## D31 — M3 milestone close: print check waived, v0.4.0 (2026-07-19)

**Decision:** M3 closed at v0.4.0 with one acceptance leg verified
and one waived. The clean-PNG leg — export pixel-equal to the engine
output buffer — holds structurally (the worker export message re-runs
the pipeline at full quality and the encoder writes that buffer
directly, D27) and is covered by the export test suites (39 export +
project tests). The printed-A4 legibility leg (D29's named manual
check) was **waived at close by the maintainer** — recorded here as
the residual risk of the milestone: chart print legibility at 100×100
has not been physically verified. If a first real print shows a
legibility problem, treat it as an M3 defect (PATCH), not new scope.
Also tagged the missing `v0.3.0` on the M2 close commit (`fc2294c`) —
the tag ritual was skipped at that close; DEV-INFRASTRUCTURE requires
every product version to carry its git tag.
**Why:** The maintainer chose shipping the milestone over blocking on
a printer; naming the waived check here keeps the acceptance line
honest rather than silently green.

## D32 — M4 capture session: main-thread wrapper, one-shot grab included (2026-07-19)

**Decision:** M4's first item ships as `src/capture/session.ts` — a
small main-thread wrapper over `getDisplayMedia` exposing a session
object (label, `grabFrame()`, `stop()`, `onEnded`) plus two pure,
hermetically tested helpers (`captureErrorMessage`, `displayLabel`),
mirroring the `ui/import.ts` pure/browser split. The session includes a
**one-shot frame grab** (a detached muted `<video>` + `OffscreenCanvas`
draw) feeding the existing `masterImage → reprocess` path, and the UI
gets Start/Capture frame/Stop buttons in the source section — so the
session is visibly useful before the crop rect and frame pump land.
"Manual refresh" from the M4 item-5 line therefore shipped early as
the Capture frame button; item 5 was trimmed accordingly.
**Why:** A session with no frame path is not a shippable unit; the
one-shot grab is the smallest slice that proves permission UX, stream
handling, and external-end recovery (browser stop-sharing UI) end to
end. `ImageCapture.grabFrame()` was rejected as less portable than the
video-element draw. Capture stays off the worker per architecture
("main thread: capture + UI only"). Auto-jazz assumptions: scope as
above; buttons reuse existing dev-shell styles (44 px met); declined
permission treated as a normal status, not an error.

## D33 — Crop rectangle: pure geometry model, video-element thumbnail (2026-07-19)

**Decision:** The M4 crop rectangle ships as a pure geometry module
(`src/capture/crop.ts`: clamp/move/resize-by-handle/hit-test +
`stitchSpan` for the readout, all in source-video pixels,
hermetically tested) driven by a thin DOM overlay in `main.ts`. The
live thumbnail **is the session's own `<video>` element** mounted
width-driven (height auto), so overlay maths is one linear scale —
no second render path. `grabFrame` takes an optional region, clamped
session-side. Lock is a pressed-state toggle button that disables
pointer/keyboard edits and hides handles (solid border as the shape
cue). Keyboard: arrows move 8 source px, shift+arrows resize the se
edge — the non-pointer route UI-STANDARDS requires. Source-dimension
changes mid-session re-clamp the rect (`video` `resize` event).
**Why:** The pure/DOM split mirrors D32 and keeps the interaction
maths testable without a browser; a canvas-drawn overlay was
rejected as a second renderer with no benefit at thumbnail scale.
Handles are 12 px visuals with a generous hit tolerance; the WCAG
44 px target rule is met by the documented keyboard alternative.
Outside-region dimming (box-shadow) is a thumbnail affordance only —
the preview canvas stays unfiltered (colour-fidelity rule). Auto-jazz
assumptions: full frame selected on session start; stitches readout
assumes contain mapping; frame pump stays out of scope.

## D34 — Frame pump: rVFC ticks, latest-wins gate at the grab (2026-07-19)

**Decision:** Live updates ship as `src/capture/pump.ts`: a pure
`PumpGate` (busy/pending/dropped — the worker `Coalescer` policy,
payload-free) plus `startFramePump`, a `requestVideoFrameCallback`
subscription with a `requestAnimationFrame` fallback. The gate sits
**at the grab**, not just at processing: at most one
grab-readback+pipeline run is in flight; new video frames only set a
pending flag, and the worker's result callback triggers the next grab.
Pump grabs are quiet (no per-frame status or ring-buffer logging);
grab failure stops the pump but keeps the session usable via Capture
frame. The pump stops with the session and its drop count is logged.
**Why:** `getImageData` readback is the expensive main-thread step, so
gating only at the worker (which already coalesces) would still pay a
readback per 60 Hz tick; gating the grab holds main-thread cost to the
pipeline's own rate. A shared `Coalescer<T>` reuse was rejected — its
payload slot is meaningless when "pending" always means "the newest
frame". Auto-jazz assumptions: pump starts automatically with the
session (pause/resume is the remaining M4 item); worker results from
manual reprocesses may advance the gate early — harmless, latest-wins
holds; per-frame logging omitted by design.

## D35 — Dirty-frame skip: pre-readback 64×64 FNV hash + region signature (2026-07-19)

**Decision:** The dirty check ships as `src/capture/dirty.ts` and runs
**before** the full-resolution readback in the pump path: each tick
draws the crop to a reused 64×64 OffscreenCanvas (a fixed 16 KB
readback), hashes it with FNV-1a 32-bit, and combines it with the crop
region into a string signature. A matching signature skips the grab
and pipeline run entirely, releases the pump gate, and names the state
("Source unchanged.") in the status region. Moving or resizing the
crop changes the signature, so region edits always re-process even
over static content. Manual Capture frame bypasses the skip but
records the signature; the skip counter is logged at pump stop.
**Why:** Hashing after the grab (or in the worker) would already have
paid the full readback + transfer — the acceptance leg is "idle frames
cost ~0 CPU", which only the pre-readback sample delivers. FNV-1a over
16 K bytes is deterministic and cheap; a hash collision merely delays
one update until the next change. Auto-jazz assumptions: 64×64 is the
architecture-specified sample size; a same-hash different-region frame
must re-process (hence the composite signature); skipped frames are
counted, not logged per-tick.

## D36 — Pause/resume + draft mode: pump lifecycle toggle, dither-drop governor (2026-07-19)

**Decision:** Pause/resume ships as a pressed-state toggle that stops
and restarts the frame pump only — the session, thumbnail, crop rect,
and manual Capture frame stay live, and the preview holds the last
frame (named "Capture paused" state). Draft mode ships as a pure
`DraftGovernor` (`src/capture/draft.ts`): hysteresis over per-frame
pipeline times (enter after 2 consecutive frames > 200 ms, exit after
5 consecutive < 100 ms) that drops **dithering only** from the live
config, with a persistent visible "Draft quality" label plus a status
announcement. Only live-pump results feed the governor; manual
reprocesses never flip quality. Mode flips clear the dirty signature
so the new quality applies even over static content. Exports keep the
untouched config — full quality by construction.
**Why:** Dithering is the priciest stage and dropping it degrades
gracefully; downscaling the grid instead was rejected because it
changes the stitch geometry the user is designing against. Hysteresis
with a 2:1 threshold gap prevents flapping at the boundary. Pausing
resets the governor so a stale draft state can't survive a pause.
Auto-jazz assumptions: thresholds 200/100 ms and 2/5 counts are
starting values (tunable constructor params, revisit with M5
profiling); pause holds the last frame rather than blanking.

## D37 — M4 milestone close: acceptance measurement waived, v0.5.0 (2026-07-19)

**Decision:** M4 closed at v0.5.0 with all five feature items shipped
(session D32, crop D33, pump D34, dirty-skip D35, pause/draft D36) and
the quality gate green (186 tests). The acceptance line — ≥ 4 preview
updates/sec at a 200×200 grid with < 250 ms latency while editing in
Photoshop, and ~0 CPU on idle frames — was **waived at close by the
maintainer** ("close out M4" without the live measurement): recorded
here as the residual risk of the milestone. The structural case is
strong (dirty-skip caps idle cost at one 16 KB readback per tick; M2
measured the pipeline at 3.3 ms/frame at 200×200, far inside the
250 ms bar) but no live Photoshop session has been measured. If a real
session misses the bar, treat it as an M4 defect (PATCH), not new
scope. The M4-ACCEPT tracking item was removed with this waiver. M5
(WASM + WebGPU backends) becomes the current milestone; its profiling
harness is the natural place to capture the live numbers this close
waived.
**Why:** The maintainer chose shipping over blocking on a manual
measurement, same trade as the M3 print check (D31); naming the waived
leg keeps the acceptance line honest rather than silently green.

## D38 — Profiling harness: rolling timing window, dev-only disclosure panel (2026-07-19)

**Decision:** The M5 profiling harness reuses the per-stage timings the
worker already returns with every processed frame (`StageTiming[]`,
wired since the M1 executor) — no new instrumentation, no protocol
change. A pure `TimingWindow` (`src/ui/debug-panel.ts`) aggregates
last / median / max per stage plus a whole-frame total over a rolling
120-frame window, and **resets when the stage list changes** so the
aggregates always describe one comparable pipeline configuration. The
DOM half is a native `<details>` "Profiling" disclosure below the info
panel — keyboard operable for free, 44 px summary target — mounted only
under `import.meta.env.DEV` per UI-STANDARDS → "Diagnostics affordance"
and verified stripped from the production bundle. The meta line carries
frames-sampled and the client's dropped-frame count. Export runs are
not profiled (they return no timings; preview timings are the
optimisation target).
**Why:** M5's backend items need a place to read TS-reference numbers
before and after each WASM/WebGPU drop-in, and D37 named this harness
as where the waived M4 live numbers get captured. Median-over-window
resists one-off GC spikes; the stage-change reset keeps windows honest
across preset flips.
**Run notes (auto-jazz via /next):** assumptions — dev-only panel
(diagnostics rule), preview-only timings, `info-panel.ts` pure-model
pattern. No gates were stopped at; gate green (194 tests).

## D39 — stitch-engine crate: libm for bit-exact parity, toolchain-aware gate step (2026-07-19)

**Decision:** The M5 Rust crate (`crates/stitch-engine`) is a
line-for-line port of the TS dither reference: f32 storage widened to
f64 for arithmetic (mirroring Float32Array semantics), strict-`<`
first-min-wins nearest search, exact-binary kernel weights, and
**libm** (fdlibm lineage — the same ancestry as V8's `Math.pow` /
`Math.cbrt`) instead of platform intrinsics, so bit-exactness vs the
TS backend is credible by construction; the next item's golden suite
verifies it. Cargo deps approved by the maintainer: wasm-bindgen +
libm (they compile into the shipped `.wasm`, so they follow the
runtime-dependency approval rule — allowlist recorded in
DEV-INFRASTRUCTURE). SIMD lands as `+simd128` codegen via a
crate-local cargo config (wasm target only, IEEE semantics unchanged);
explicit hand-vectorisation is deferred until the benchmark item
demands it. The gate gains `check:wasm` (`scripts/check-wasm.mjs`):
`cargo test` + `wasm-pack build`, **skipping with a visible warning
when the toolchain is absent locally but hard-failing in CI**, which
now installs rustup's wasm target + wasm-pack — this preserves the
existing "check passes without Rust" rule without letting the skip
green-wash a break. The Rust toolchain was installed on the dev Mac
this task (rustup stable 1.97.1, wasm-pack 0.15 via Homebrew).
**Why:** Bit-exactness is the milestone's hardest constraint; choosing
fdlibm-lineage math up front avoids discovering ULP drift after the
adapter lands. The toolchain-aware skip keeps the gate honest on
machines without Rust while CI stays the backstop.
**Run notes (auto-jazz via /next):** stopped at two gates — the
missing toolchain (user chose install) and the Cargo dependency
approval (user approved both). Clippy/rustfmt in the gate parked to
the wish-list.

## D40 — WASM dither registered: alias/stub feature detection, parity proven (2026-07-19)

**Decision:** The wasm dither backend registers by assignment —
`src/backends/wasm/dither.ts` sets `ditherStage.backends.wasm` after
async module init — so core stays untouched and the executor's
`?? backends.ts` fallback covers not-yet-ready and unavailable alike.
The worker fires registration at startup (never blocking a frame).
Feature detection is build-time: a `stitch-engine-wasm` Vite alias
resolves to the wasm-pack pkg when built, else to a committed stub,
with a `__WASM_AVAILABLE__` define gating the adapter — verified by
building with the pkg renamed away (tsc, vite build, and the test
suite all pass; the parity suite skips visibly). Ambient types for the
alias keep `tsc` independent of the generated pkg. The gate reordered
(`check:wasm` before `check:test`) so Vitest always sees a fresh pkg.
**Parity result: bit-exact.** Six golden tests match wasm against TS
at tolerance 0 — the committed 8×8 fixture, both metrics × both scan
modes, and 64×64 seeded noise against the full 533-colour DMC palette
under CIELAB and RGB — confirming D39's libm/fdlibm bet on
`pow`/`cbrt` parity with V8. Registration routes nothing by itself:
stage instances still default to `ts`; routing arrives with the
automatic-selection item.
**Why:** Assignment-registration keeps the core dependency arrow
one-way (backends import core, never the reverse); the alias/stub
pattern makes the "builds succeed without the toolchain" promise real
instead of aspirational.
**Run notes (auto-jazz via /next):** no gates stopped at; assumptions —
per-call palette flattening (cache deferred to the selection item),
node tests init the module from disk bytes via an optional adapter
parameter.

## D41 — WebGPU LUT build + palette map: cache-layer wiring, near-tie tolerance (2026-07-19)

**Decision:** The WebGPU kernels (WGSL, `src/backends/webgpu/`) land
as **async functions**, not sync StageFn backends: GPU readback cannot
satisfy the synchronous stage contract, so core and the executor stay
untouched. The LUT build — the actually expensive part per
architecture ("WASM/WebGPU accelerate LUT construction") — wires into
the worker cache as `ensureLut` (GPU-first, TS on any failure),
awaited by the worker before frames that need a LUT; cache hits cost
nothing. The palette-map kernel is implemented and GPU-tested but not
yet routed — the backend-selection item owns any executor
asyncification. **Tolerance, documented:** GPU colour maths is f32, so
a GPU LUT may disagree with the f64 TS reference only on *near-ties*
(two threads at almost identical distance). The automated suite
quantifies this in node via an f32 mirror of the WGSL arithmetic
(≤ 1% of bins, and every disagreement within a 0.5% relative distance
margin — visually equivalent picks); a real-GPU suite runs the same
assertions wherever `navigator.gpu` exists and skips visibly in
node/CI. Mapping through a given LUT is integer-only and asserted
bit-exact. Consequence accepted: non-dithered output can differ on
near-tie bins between GPU and non-GPU machines; within one session
preview and export share one cached LUT, so they always agree.
`@webgpu/types` added as a types-only devDependency (user-approved).
**Why:** The cache-layer wiring gets the GPU win where profiling says
it lives without destabilising the pure sync pipeline; the f32 mirror
makes "tolerance-tested" a real, CI-run assertion rather than a
browser-only claim.
**Run notes (auto-jazz via /next):** stopped once (types package
approval). Assumption: real-GPU CI coverage via a browser-mode runner
is parked to the wish-list, not scoped here.

## D42 — Automatic backend selection: one-shot calibration, hysteresis, ts safety net (2026-07-19)

**Decision:** Selection lives in the worker layer
(`src/worker/backend-select.ts`) — core's `runPipeline` and the Stage
contract are untouched. Resolution order in the executor: explicit
instance backend > automatic selection > 'ts', and a requested backend
missing from the stage's map always falls back to the TS reference, so
a stale selection can never break a frame. Feature-detect *is*
registration (an unregistered backend can never be picked); the profile is a
**one-shot calibration** at worker startup after the wasm module
registers: ts vs wasm dither on a 96×96 synthetic frame against the
real DMC palette, alternating runs, median compared with a **10%
hysteresis margin** — the pipeline leaves ground truth only for a
clear win, never on JIT noise or a near-tie. WebGPU is not selected
here (async kernels; the LUT build already auto-selects GPU-first in
the cache — D41). `StageTiming` gained a `backend` field: the
profiling panel labels rows "dither (wasm)" and its stage-key reset
starts a fresh window on a backend switch, so a selection change is
visible and measurable. The backlog's acceptance clause is tested
directly: with wasm unregistered and no `navigator.gpu` (node), a
stale wasm selection still runs and reports 'ts', and `ensureLut`
resolves the TS-built LUT.
**Why:** Calibration-at-startup is the cheapest honest "profiled"
implementation: it measures the real machine once, off the frame
path, and the hysteresis margin plus the fallback chain mean the
worst possible outcome is the status quo (everything on ts).
**Run notes (auto-jazz via /next):** no gates stopped at. Assumptions —
dither is the only sync-selectable stage today; a user-facing override
(debug panel / ?backend=) stays future work.

## D43 — Benchmark shipped; every budget missed — recorded as signal, not green-washed (2026-07-19)

**Decision:** The benchmark (`tests/benchmark.test.ts`, `npm run
bench`) asserts the architecture.md budget table directly: per-stage
medians (5 timed runs after warmup) at 1024×1024 / 64 DMC colours,
whole pipeline at 1024 and 200 grids, ×3 budget stretch under CI.
It is gated behind `BENCH=1` — visible skip in the plain gate — since
a perf assertion in `check` would make every commit hostage to
machine noise. The preview-render row is browser-only (profiling
panel), not benchable in node.
**Measured on the dev Mac (2026-07-19):** resize 36 ms (budget 5),
reduce-LUT 13 ms (10), dither-wasm 412 ms (15), whole pipeline
452 ms (100), 200×200 grid 29 ms (10). **All five miss.** The bench
is red by design until the gap is closed — it was NOT weakened to
pass. Probable causes, in order: exact per-pixel palette search in
the dither hot loop (64 lab distances × 1M px; the budget row
implies LUT-style acceleration), CPU box-average resize (the budget
row assumes GPU `drawImage`), and reduce being within ~30% (closest
to its budget). The 15 ms dither figure needs either a candidate-
pruning structure (e.g. LUT-seeded search) or a budget revision.
**Consequences:** M5's acceptance line (≤ 100 ms full pipeline) is
NOT met — the milestone stays open with a new scoped perf item; the
budget-vs-implementation drift in architecture.md is captured as a
doc-delta for owner sign-off (never auto-edited). At the typical
200×200 grid the app measures 29 ms/frame — interactive in practice
(the M2 draft governor covers capture), so this is a budget breach,
not a UX emergency.
**Run notes (auto-jazz via /next):** no gates stopped at. Assumption:
shipping the honest red benchmark and scoping the fix separately is
the correct reading of "a failure is signal" — the alternative
(tuning budgets myself) would be green-washing a protected doc.

## D44 — M5A measurement truth: bv1 boundary contract, frozen workload matrix, reproducible reports (2026-07-19)

**Decision:** Ship the M5A trio as one coupled measurement layer rather
than three sequential items — a boundary contract without a workload
matrix measures nothing, and a matrix without a report schema is not
reproducible. Three artefacts: `docs/measurement-contract.md` (the
canonical prose), `tests/bench/` (contract, matrix, harness, schema and
runner as code), and `npm run bench` (runs the matrix, writes a JSON
report, *then* asserts budgets).

**Boundary contract bv1** defines six boundaries — `prepare`, `stage`,
`pipeline-compute`, `preview-update`, `interaction`, `export` — each
with an explicit start mark, end mark and exclusion list. The three
sign-off questions M5-PERF-02 existed to settle were decided
conservatively under auto-jazz: (1) budgets bind to **warm,
steady-state** calls, with preparation budgeted separately; (2) the
100 ms whole-pipeline row is **warm**, and cache misses are published as
their own cold rows rather than averaged in or hidden; (3) preview
completion is the **preview surface draw returning** — the last step the
app controls. M5C revisits all three against evidence.

**Why a version stamp:** moving a start mark changes whether a budget
passes without changing the product. Every report carries
`boundaryVersion`, and reports across versions must not be diffed. The
pre-bv1 benchmark timed a 6.5 MB `slice()` and a fresh palette *inside*
the whole-pipeline closure; bv1 builds the request once, outside the
clock. That bias was real but worth only ~1 ms — it was never why the
budgets miss.

**Why raw samples and explicit gaps:** the schema keeps every timed
sample plus median/p90/p95/stdDev/spread, and forces an unmeasurable row
to be `unsupported`/`not-measured` **with a reason, never zero**. A
median without its distribution cannot be compared; a zero silently
reads as "fast". The three browser-only boundaries therefore appear in
every node report as visible holes.

**Measured (Apple M1 Max, 124 rows):** every D43 figure reproduced
within noise, so the harness rebuild did not move ground truth. All five
budgets still miss. The decomposition is the real deliverable, and it
overturned two standing leads:

- **Dither is conversion-bound, not search-bound.** `metric: lab`
  424.5 ms vs `metric: rgb` 125.1 ms at 1024²/64 → sRGB→Lab is ~70% of
  dither cost. Palette scaling agrees independently (~1.44 ms per
  palette entry; ~332 ms fixed). Candidate pruning alone can address at
  most ~22% and cannot reach the 15 ms row.
- **Separable resize is challenged.** Exact area averaging already
  visits each source pixel ~once under hard downscale; redundancy
  appears only as the scale ratio nears 1. Expect ~1.5–2× from a CPU
  candidate, not the ~7× the 5 ms row needs. Integral-image is the
  better lead — M5-PERF-11 verifies before M5-PERF-21 commits.
- **Two leads shrank:** the identity `adjust` clone is 0.15 ms and warm
  stage-list construction 0.01–0.05 ms — both immaterial, not the "free
  win" the analysis assumed.
- **D3 emphatically confirmed:** `reduce-first` at 300²/64 costs 656 ms
  against 51 ms for `resize-first`.

**Consequences:** M5B audits start from confirmed/bounded/challenged
verdicts instead of unverified hypotheses, and M5-PERF-13 is now the
highest-value target in M5. `bench` stays out of `check` (noisy by
nature), but matrix coverage, percentile math, warm-up exclusion and
schema round-trip are unit-tested in the gate — 28 new tests. Reports go
to gitignored `bench-reports`. No pipeline behaviour changed; no golden
fixture touched.

**Run notes (auto-jazz, all gates skipped):** assumptions — ship M5A as
one run because the three items are one deliverable; the M5-PERF-01
spike output ships as code rather than throwaway because M5-PERF-03
consumes it directly; the M5-PERF-02 sign-off decisions were taken
conservatively and are flagged for M5C rather than deferred. **No
browser numbers were taken** — the rehearsal procedure is written and
M5-PERF-18 owns executing it; M5A's claim to cover transport and
rendering latency is therefore procedural, not measured.

## D45 — M5B audits: three bit-exact wins, four bv1 leads overturned, one shipped GPU bug (2026-07-19)

**Context:** M5A left ten component audits (M5-PERF-10…19) with a bv1
baseline and a set of leads. The instruction was to verify, not
re-discover — and to take the browser-only boundary numbers that had
never been measured.

**Decision:** ship the audits as code. `npm run audit` (AUDIT=1, gated
exactly like `bench`) reruns every node measurement and writes JSON
artefacts beside the bench reports; candidate prototypes live in
`tests/audits/candidates/` and are explicitly not shipping code. The
browser work is a written, repeatable procedure with recorded results
(`docs/browser-measurement.md`) rather than a one-off session.

**What the evidence changed:**

- **Three bit-exact wins, none needing a mode contract or a golden
  regeneration.** (1) The reference Lab scan re-reads its query from a
  `Float32Array` on every palette iteration via `deltaE76Sq(labScratch,
  0, …)`; hoisting those reads is a pure loop-invariant fix worth
  888 → 273 ms at 1024²/64. (2) Per-bin candidate pruning, derived from
  a monotone Lab bounding box per 15-bit bin and verified over 138,304
  adversarial values with zero mismatches, takes it to 217 ms (and
  15.4× at 300²/533). (3) A hoisted-coverage `sampleArea` is
  byte-identical to the resize reference and ~1.5× faster on every case.
- **"Dither is conversion-bound (~70%)" is a WASM statement.** Measured
  per backend: wasm 70.1%, TS-as-shipped 11.4%, TS-hoisted ~0%. The
  Rust port uses `libm` for bit-exact V8 parity (D39); V8 uses
  builtins. One conversion strategy across both backends would be wrong.
- **Separable resize is not merely challenged, it is harmful** — 0.51×
  to 0.69× (slower) as the scale ratio approaches 1. Summed-area is
  slower everywhere. M5-PERF-21 must not rewrite resize as separable.
- **Closed as immaterial:** the wasm boundary (~8 MB of copies is
  0.17–0.28% of a call, so zero-copy/persistent-memory/SIMD work is
  premature) and the `?? 0` bounds-read tax (ratio 0.985–0.995 — V8
  elides it, so strict TypeScript is not a performance cost).
- **Node is not a proxy for the browser.** The same TS resize is ~3.5×
  slower in-browser than in node on one machine while TS dither is only
  ~1.1× slower — stage-dependent, verified inside a Worker. No global
  multiplier fixes this; budgets must be re-measured in the browser.
- **P0 defect found: the WebGPU LUT has never worked.**
  `lutBuildShader` uses `target`, a reserved WGSL keyword. WebGPU
  reports shader compilation errors asynchronously, so nothing throws,
  the dispatch no-ops, and the zero-filled buffer reads back as a valid
  all-zeros LUT that `ensureLut` caches **in preference to** the correct
  TS build. Non-dithered reduction therefore renders a solid single
  colour in every WebGPU browser, preview and export alike. Proven on
  the real frame path. The real-GPU suite that would have caught it is
  `skipIf(!isWebGpuAvailable())` and CI is node, so it has never run
  anywhere.
- **Three further defects:** the LUT cache key (`name:count:metric`)
  collides on reordered palettes and serves indices — a red pixel comes
  back green (M5-PERF-26); two floating async paths in the worker can
  post no response at all and wedge the latest-wins gate permanently
  (M5-PERF-29); and dirty detection's 64×64 downsample averages ~362
  source pixels per cell, so small or low-contrast edits are never
  detected — the live-capture promise failing silently (M5-PERF-30).

**Consequences:** M5B closes and a new **M5B-FIX** milestone jumps the
queue ahead of the M5C decision gate, because two of its four items are
wrong-output bugs rather than performance work. M5C is narrowed: the
three bit-exact wins land regardless of mode decisions, and the only
remaining levers (rounded conversion, canvas resize) both change
appearance — canvas `drawImage` differs from the oracle by mean 39/255
per channel at the downscale ratios the product actually uses, so it can
never be a quality-neutral backend. Both the 5 ms resize row and the
15 ms dither row are unreachable on this evidence and M5C owns revising
them. First browser numbers recorded: `preview-update` is 57.5 ms at
200² and 85.9 ms at 300² (11.6–17.4 updates/sec), so the brief's ≥ 4/sec
bar at ≤ 300² is met with margin; 1024² runs at 1.6/sec. Preview render
components total ~2 ms against the 5 ms row. No pipeline behaviour
changed in this batch and no golden fixture was touched.

**Run notes (auto-jazz, all gates skipped):** assumptions — the audits
ship as committed code rather than scratch, following M5A's precedent,
because M5C needs to rerun them; the ten per-ticket detail files were
deleted on close per the tickets policy and their evidence folded into
`tickets/M5-PERF.md`, which is the M5C handoff; audits 16/17/19 were
combined into one file because they share the frame-path surface; the
browser probes were run against the dev server on one machine, so the
node-vs-browser discrepancy is flagged for confirmation rather than
treated as settled. The GPU LUT defect was found during M5-PERF-12's
"record the boundaries node cannot observe" step and is reported as
found — it was not in scope to fix, and fixing it inside an audit would
have violated the spike boundary.
