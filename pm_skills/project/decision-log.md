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
