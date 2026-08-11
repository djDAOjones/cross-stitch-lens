# Measurement contract (bv2)

What every Pattern Mapper performance number means, what it is taken
over, and how to reproduce it. Written for M5A (`M5-PERF-01/02/03`) as
bv1; revised to **bv2** by M13-MEAS-01 for the shipped M7/M8 product.
Every later performance claim — audits, optimisations, the M13
synthesis gate — cites this document.

The rule this exists to enforce: **a timing without its boundary and
its workload is not evidence.** Moving a start mark changes whether a
budget passes without changing the product; testing one friendly image
makes a regression look like a win.

- Contract version: **bv2** (`tests/bench/boundaries.ts`)
- Report schema version: **1** (`tests/bench/report.ts` — bv2 only adds
  the `validity` block, so the shape stays backwards-compatible)
- Reports from different contract versions are **not comparable** and
  must not be diffed. **bv1 reports in particular must not be diffed
  against bv2 reports**: the six boundary marks are unchanged, but the
  workload IDs changed meaning — bv1's `dither` token silently meant
  Floyd–Steinberg/serpentine/strength 1, and its `p533` axis named a
  palette size the catalogue never had (the built-in DMC palette has
  489 threads). The bv1 grammar and its recorded baseline stay
  documented in `docs/performance-evidence.md`.

---

## 1. Boundaries (M5-PERF-02)

Six boundaries. Each names exactly what its clock includes.

| Boundary | Start mark | End mark | Surface |
| --- | --- | --- | --- |
| `prepare` | a config exists, nothing derived from it built | stage list, palette derivatives and LUT ready | node + browser |
| `stage` | stage function entry, inputs prepared and immutable | stage function return | node + browser |
| `pipeline-compute` | executable request in hand, input buffer adopted | final `PixelBuffer` returned | node + browser |
| `preview-update` | a captured frame is **accepted** (not dropped) | the preview surface draw for that frame returns | browser |
| `interaction` | the source changes in the captured application | the resulting frame is displayed | browser |
| `export` | the user requests an export | the encoded artefact is ready to write | browser |

### What each one deliberately excludes

- **`prepare`** — no per-pixel stage work. It carries fixture/request
  construction, any input copy, palette flattening and Lab conversion,
  LUT build on a cache miss, and stage-list construction.
- **`stage`** — excludes palette/LUT preparation, worker messaging,
  bitmap creation and drawing. It *includes* the output allocation the
  stage itself owns.
- **`pipeline-compute`** — excludes request construction, the input
  copy, and benchmark assertions. It still includes the executor's own
  stage construction; the `prepare` row on the same workload quantifies
  that, so it can be subtracted rather than guessed at.
- **`preview-update`** — frames dropped by latest-wins coalescing are
  counted, never timed. Timing a dropped frame flatters the median.
- **`interaction`** — the honest user-visible number. It is **never**
  reconstructed as a sum of medians.
- **`export`** — reports pipeline, chart/PDF construction and encode
  separately, plus peak memory and preview contention.

For GPU work, distinguish CPU submission, GPU execution (only where
timestamp queries are supported) and readback/wait. WebGPU timestamp
queries are optional and deliberately reduced in precision, so a
missing GPU-execution figure is reported as `unsupported`, never as
CPU time.

### Approved decisions

These are the three questions M5-PERF-02 existed to settle. Decided
2026-07-19 under an auto-jazz run; M5C revisits them against evidence.

1. **Stage budgets bind to warm, steady-state calls.** Preparation gets
   its own budget line, not a share of a stage's. A stage row is
   measured with its LUT and palette derivatives already built.
2. **The 100 ms whole-pipeline row is warm.** Cache misses are reported
   as their own `prepare`/`cold` rows and published alongside. A cold
   cost is never averaged into a warm median, and never hidden.
3. **Preview completion is the preview surface draw returning** — the
   worker's `setFrame` draw in `src/worker/preview-surface.ts`, the last
   step the app controls before the compositor. Anything after that is
   the browser's, and is reported under `interaction` instead.

M5C resolved this (D47): processing modes were cut, so budgets bind to
the single fidelity — one product promise (≥ 4 preview updates/sec at
≤ 300², in-browser) plus per-stage measured baselines with regression
guards. See `docs/performance-evidence.md` → "M5C synthesis".

### Bias removed in bv1

The pre-bv1 benchmark constructed its request **inside** the timed
closure: a ~6.5 MB `source.data.slice()` plus a fresh 64-colour palette,
on every timed run of the whole-pipeline row. Preparation was charged to
compute. Under bv1 the request is built once, outside the clock, and
preparation is measured as its own boundary. Whole-pipeline numbers from
before bv1 are not comparable with numbers after it.

### Legacy metrics

- The worker's `StageTiming[]` (`src/worker/protocol.ts`) maps to
  `stage`. It is correct as-is and is the source of the report's
  per-stage distributions.
- `TimingWindow` in `src/ui/debug-panel.ts` aggregates `stage` rows plus
  a whole-frame total. That total is **not** `preview-update`: it omits
  queue wait, transport, bitmap creation and draw. Treat it as
  `pipeline-compute` observed in the browser.

---

## 2. Workload matrix (bv2 — M13-MEAS-01)

Defined in `tests/bench/workloads.ts`. Every row has a derived, stable,
unique ID; a report row is comparable across machines only through it.

### ID grammar

```text
<source>.<sourceSize>.<alpha>.g<grid>.<palette>.<metric>.<dither>.<order>.<resize>.<path>
```

Example:
`noise.w1280.opaque.g1024.p64.lab.fs-s100-serp.resize-first.stretch.still`

The `<dither>` token names the method **and every cost-relevant
setting** — a method name alone is not an identity, and two executable
configs must never share an ID:

```text
nodither | <method>-s<pct>[-serp|-raster]
```

- `method` ∈ `fs`, `atkinson`, `jarvis`, `ordered`, `bluenoise`.
- `s<pct>` is strength as whole percent, zero-padded to three digits
  (`s050`, `s100`, `s150`) — the ID is dot-separated, so a fractional
  strength must not inject a `.`; percent granularity is part of the
  contract and the frozen matrix only uses exact percents.
- `-serp`/`-raster` appears only for diffusion methods, where a scan
  direction exists; threshold methods carry no direction token.

`metric` and `dither` are inert for `rgb` (full-RGB) rows; they stay in
the ID so the grammar is uniform and IDs never collide.

Two pseudo-ID forms exist for rows whose input is not a generated
matrix workload — neither prefix can collide with matrix IDs because
every real ID starts with a source class:

- `prep.<palette>.<metric>` — preparation-stress rows whose palette is
  deliberately not a pipeline workload (currently only
  `prep.pfull.lab`).
- `capture.g<grid>.<palette>.<metric>.<dither>` — browser-harness rows
  whose input is the **user-shared capture surface** (M13-MEAS-02): the
  source is whatever the owner shares, so a matrix ID would lie about
  the input. Actual capture dimensions ride in the row's `meta`. An
  optional `.edit-<class>` tail (M13-MEAS-03) marks a live window in
  which the controlled source was driven in one of the six Part-B
  edit-class approximations (`hands-off`, `pixel-marks`,
  `slow-stroke`, `large-fill`, `transform`, `rapid-scatter`); such
  rows are controlled-source evidence only — never Photoshop
  behaviour, and never budget-bindable.

Comparison and audit legs may additionally publish rows under
**grammar-derived IDs outside the frozen matrix** (M13-PROF-03: the
backend sweep needs `rgb`-metric cells at grids the matrix only has
under `lab`). Such IDs are built by `workloadId` from real axis values,
so they are truthful and collision-free; they are report rows only —
the frozen matrix defines what the bench must never lose, and no budget
row may bind to an off-matrix ID.

Harness-internal carrier IDs (`env`, `dirty-replay`) identify auxiliary
rows whose subject is not a pipeline workload at all — the environment
record and the dirty-detection replay (M13-PROF-04). They collide with
nothing (no source class is named `env` or `dirty-replay`) and never
carry budget-bindable pipeline timings.

### Axes

| Axis | Values | Why it is in the matrix |
| --- | --- | --- |
| `source` | `noise`, `gradient`, `flat` | worst-case variation; the content dithering is judged on; cache and dirty-skip behaviour |
| `sourceSize` | `grid`, `w1280`, `crop` | source-resolution work (resize) scales with the source, not the grid |
| `alpha` | `opaque`, `mixed` | alpha edges change resize and dither behaviour at empty cells |
| `grid` | 200, 300, 1024 | the typical grid, the product-promise grid, the maximum |
| `palette` | `p64`, `p489`, `rgb` | the budget palette, the actual built-in DMC set (489 threads — bv1's `p533` was a count the catalogue never had), and no colour stage at all |
| `metric` | `lab`, `rgb` | isolates the per-pixel transcendental load |
| `dither` | the engine's `DitherConfig` union | every shipped method and setting is expressible; bv1's Boolean could only mean pre-M8 Floyd–Steinberg |
| `order` | `resize-first`, `reduce-first` | the §7 order comparison; colour work at source resolution |
| `resizeMode` | `stretch`, `contain`, `cover`, `fit` | letterboxing, crop overflow, and the never-enlarge path |
| `path` | `still`, `live` | first-frame versus steady-state cost |

### Mandatory blocks

Two blocks must never lose a cell (`tests/bench-matrix.test.ts` fails
if they do):

1. **Core cross-product** — grid × palette size × {no-dither,
   Floyd–Steinberg default}, under core defaults (`noise`, `w1280`,
   `opaque`, `lab`, `resize-first`, `stretch`, `still`) — 12 rows,
   bv1's block kept for continuity.
2. **Method block** — every shipped M8 method (`atkinson`, `jarvis`,
   `ordered`, `bluenoise`) at its D61 defaults, at 300² (the
   product-promise grid) and 1024² (the export ceiling), p64 — 8 rows.
   bv1 had no coverage of these methods at all (D62 deferred the
   extension to this boundary bump).

Everything else is a targeted expansion moving one axis off core, and
each carries a `note` saying why it earns its place — including one row
each for non-default strength (`fs-s050-serp`, `ordered-s150`) and
raster scan (`fs-s100-raster`).

### Deliberate exclusions

- **Full cross-product.** Combinatorially large and mostly redundant:
  resize-mode behaviour does not interact with palette size, and source
  class does not interact with resize mode. One axis is moved at a time.
- **Non-square grids.** The grid axis is square-only; a non-square grid
  changes cell count, which the 200/300/1024 axis already covers.
- **`p489` expansions.** Palette size is exercised across the whole core
  block; repeating it on every expansion multiplies runtime without
  adding a distinct risk.
- **Method × palette-size cross-product.** Method cost scales with the
  same palette scan the FS rows already exercise across p64/p489; a
  per-method p489 block multiplies the slowest rows without a distinct
  risk.
- **A full-catalogue pipeline row.** The eight-brand union (3,338
  threads, `paletteFull()`) is the justified multi-brand *preparation*
  stress — cold LUT and candidate-table builds only. A per-frame
  pipeline row over the whole catalogue is an exact-scan of every
  thread a user could ever enable and measures no product path.
- **WebGPU stage rows.** The mapping kernel is not routed by the
  executor (D41, declined again at D48); only the GPU LUT build is
  reachable, and it is covered by the cold `prepare` row.

### Timing versus perceptual palettes

`palette64()` (the first 64 DMC threads) is a **performance** palette:
stable, cheap, representative of scan cost. It is not the colour-spread
palette perceptual comparisons need — D61's first quality run drowned
in its −16 L\* coverage bias — so quality work must use a named spread
palette instead, and neither may be mistaken for the other.

---

## 3. Reproducible reports (M5-PERF-03)

`npm run bench` runs the whole matrix once, writes a JSON report to
`bench-reports` (gitignored — regenerated, never committed), logs a
human summary, and only then asserts budgets. A missed budget therefore
still leaves complete evidence on disk. This is deliberate: D43's rule
is to record the signal, not green-wash it.

Every report records:

- schema version, **boundary version**, run timestamp;
- build identity — app version, build id, git sha, whether the wasm pkg
  was built;
- environment — runtime and version, OS, arch, CPU model and count,
  memory, CI flag, budget multiplier;
- a **run-validity verdict** (bv2 — see below);
- per row — workload ID, boundary, label, backend actually used, cache
  state, warm-up count, **raw samples**, and a summary of
  count/min/median/p90/p95/max/mean/stdDev/relative spread;
- countable allocations where known (typed-array byte lengths), not GC
  guesses.

### Cold preparation rows (extended in bv2)

Cold costs are published as their own `prepare` rows, never averaged
into a warm median: LUT builds per palette+metric pair the matrix
reaches, **candidate-table builds** per lab palette (the pruning
structure is 20–35× a LUT's size and bv1 never published its build),
the **threshold-tile first use** (Bayer 8×8 and the blue-noise 32×32
void-and-cluster generation, via the pure builders), and the
full-catalogue preparation stress under `prep.pfull.lab`. Deeper
palette-change-path profiling (policy/selection, cache switching
patterns) is M13-PROF-02's scope.

### Run validity (bv2 — M13-MEAS-01)

A research run at `e703ed4` carried a single ~5.8-million-ms sample —
sleep, suspension, contention or a stall, never established. bv2
therefore assesses every run (`assessValidity` in
`tests/bench/report.ts`) and stamps the verdict into the report:

- **Environment interruption** — wall clock (`Date.now`) and monotonic
  clock (`performance.now`) bracket the run; disagreement beyond 5 s
  means the machine slept or was suspended mid-run.
- **Implausible samples** — any single sample over 120 s is beyond what
  any legitimate matrix row can cost.
- **Stall-shaped outliers** — a worst sample over 5 s that is also
  \>20× its row median points at contention.

A finding marks the run **tainted** and fails the bench loudly with the
findings listed. Samples are never deleted and the report is written
before the assertions run — a tainted run is classified evidence of an
invalid session, not evidence about the code. Re-run in a controlled
session.

Two invariants the schema enforces, both covered by
`tests/bench-report.test.ts`:

- **A measurement that could not be taken is `unsupported` or
  `not-measured`, with a reason — never zero.** Browser-only boundaries
  appear in every node report as explicit gaps, so the matrix shows
  where it is blind.
- **Raw samples survive to the JSON.** A later run compares
  distributions, not two isolated medians.

Warm-up is fixed and recorded per row (`planFor` in
`tests/bench/harness.ts`): 2 warm-ups / 7 runs for cheap rows, 2 / 5 for
moderate, 1 / 3 for rows over ~250 ms; `live` rows add 2 warm-ups and 3
runs to reach steady state. Fixed rather than warm-until-stable because
a fixed policy reproduces across machines — the recorded relative spread
is what exposes an under-warmed row. Backend candidates are measured
interleaved round-robin (`measureInterleaved`) so thermal drift and GC
pauses land on both, not on whichever ran second.

`bench` is **not** part of `npm run check`: it is noisy and slow by
nature, and a machine-variance failure must never block the gate. The
deterministic parts — matrix coverage, percentile math, warm-up
exclusion, schema round-trip — do run in the gate.

### Budget bindings (bv2 baselines, 2026-08-09)

Budgets attach to one workload at one boundary (`BUDGETS` in
`tests/bench/run-node.ts`). An unattached budget number is exactly the
ambiguity this contract removes.

Two kinds of bound row exist, and they are never interchangeable:

- **Regression baselines** — what the code does today on a named
  runtime and workload, guarded ×1.35 (D47). They answer "did this get
  worse?", not "is this good enough". Every node row is one of these.
- **Product targets** — a promise the product makes to its user,
  asserted at a browser boundary. Only the capture-leg rows below are
  targets. Node never asserts a browser promise through a multiplier.

The node figures were re-taken on 2026-08-09 on the implementation
build (node 24.5, Apple M1 Max, `v0.5.0+20260808.08545db` —
M13-IMPL-02, applying D135's rebinding clause). They replace the
2026-07-22 figures (D64), which were green under guard but predated
~3k churned lines. Every row moved 1.7–4.3 % faster and none by more
than that — a uniform environment/JIT drift, not a win in any stage.
The bv1→bv2 comparison stays in `docs/performance-evidence.md`.

Core defaults elided from the IDs below:
`noise.w1280.opaque.…lab….resize-first.stretch.still`.

| Baseline | Bound to |
| --- | --- |
| Resize 23.9 ms | `stage`/`resize` on `g1024.p64` `fs-s100-serp` |
| Reduce via LUT 12.9 ms | `stage`/`reduce` on `g1024.p64` `nodither` |
| Floyd–Steinberg 287.5 ms | `stage`/`dither` on `g1024.p64` `fs-s100-serp` |
| Atkinson 326.6 ms | `stage`/`dither` on `g1024.p64` `atkinson-s100-serp` |
| Jarvis 320.0 ms | `stage`/`dither` on `g1024.p64` `jarvis-s100-serp` |
| Ordered 284.6 ms | `stage`/`dither` on `g1024.p64` `ordered-s100` |
| Blue-noise 284.9 ms | `stage`/`dither` on `g1024.p64` `bluenoise-s100` |
| Whole pipeline 311.2 ms | `pipeline-compute` on the 1024² `fs-s100-serp` workload — an export/finishing grid. The brief's "≤ 100 ms at 1024²" line was **retired** at D135; this median is published and guarded, never a target |
| Whole pipeline 35.9 ms | `pipeline-compute` on the 300² `fs-s100-serp` workload (the grid the product promise binds at, as a node component baseline, **not** a proxy for the in-browser promise) |
| Whole pipeline 19.0 ms | `pipeline-compute` on the 200² `fs-s100-serp` workload |
| Preview render | not node-measurable — see the product targets below |

Budgets stretch ×3 under `CI=true`. The multiplier is recorded in the
report, so a CI number is never mistaken for a local one. A CI
tolerance can never turn a local baseline into a target.

**Take these on a quiet machine.** Every row above has a relative
spread ≤ 0.07. An earlier take of this same build, run minutes after a
full `check` and `matrix`, put `reduce` at 21.1 ms with a spread of
2.32 (one 65 ms sample) — enough to fail its own ×1.35 guard. The
validity gate did not taint it, and should not have: nothing about a
65 ms sample is implausible, it was just contention. The remedy is a
settled machine, never a widened tolerance.

### Product targets and the capture-row bindability amendment (bv2, 2026-08-09)

Signed at M13-SYNTH-01 (D135 — `docs/performance-evidence.md` →
"M13-SYNTH-01 — the synthesis"), applied by M13-IMPL-02. Asserted in
`BROWSER_TARGETS` / `CADENCE_TARGET` (`scripts/bench-auto-validate.mjs`)
and enforced by `npm run bench:auto`, which exits non-zero on a miss.

**The amendment.** Before it, no browser row could carry a product
target: the browser numbers of the day came from hand-run rehearsals
whose environment nobody could re-establish. The automated capture leg
changed that — a driven **base** window is reproducible (a controlled
same-origin source painting on a fixed schedule, content-verified
before any row is measured, on a quiet-gated desktop with visibility
asserted). Those rows, and only those, may bind. Permanently
unbindable, enforced in code rather than by convention:

- `.edit-<class>` rows — driven at the class's own cadence, so their
  medians answer a different question;
- anything measured against real Photoshop — content and timing nobody
  controls. Those figures stay M13-ACCEPT-02 corroboration.

| Target | Bound to |
| --- | --- |
| ≥ 4 updates/sec sustained, zero missed callbacks and zero pump/client drops | `preview-update` on both driven base windows. This *is* the product promise; a fast median with dropped frames fails |
| Median 41.0 ms ×1.35 | `preview-update` on `capture.g300.p64.lab.fs-s100-serp` |
| Median 31.2 ms ×1.35 | `preview-update` on `capture.g200.p64.lab.fs-s100-serp` |
| `interaction` | **published, not bound** — the double-rAF protocol race (2–3 of 8 attempts missed) and the absence of a real start mark would make a bound p95 noise (D135) |

Medians taken on `v0.5.0+20260808.3bfe7ef` (Chrome, Apple M1 Max), the
IMPL-01 build whose clean before/after pair closed D141. A missing
counter fails rather than passes: the promise is not "no misses were
reported", it is "misses were counted and there were none".

---

## 4. Browser measurement

`preview-update`, `interaction` and `export` cannot be measured in
node. **The primary source is the bv2 production harness**
(`npm run bench:browser` → `/bench.html`) — one documented run emits
boundary-tagged bv2 rows for all three, with capture counters and a
validity verdict; procedure and interpretation limits in
`docs/browser-measurement.md` → "The bv2 harness run". Its
`interaction` rows use a controlled same-origin source window with a
real paint mark; interaction against **real Photoshop** has no
programmatic start mark and stays a manual rehearsal (below), owned by
M13-PROF-04 / M13-ACCEPT-02.

### Manual rehearsal (live Photoshop legs)

Run this by hand on the development Mac and attach the result to the
ticket.

1. **Build for production** — `npm run build`, then serve `dist/`. Never
   measure the dev server: HMR and unminified modules are not the
   product.
2. **Fix the environment** — one browser window, foreground and visible
   (a backgrounded tab is throttled), fixed viewport, no other heavy
   applications, mains power, and a clean reload (empty cache) before
   the first sample.
3. **Grant capture once** before timing, so the permission prompt is not
   inside a measured interval.
4. **Choose a workload** from the matrix and configure the app to match
   it — grid, palette, metric, dither, order, resize mode. Record the
   workload ID with the result.
5. **Warm up** for at least 30 s of live capture before sampling, then
   sample for at least 60 s of continuous editing in the captured
   application.
6. **Read the numbers** from the dev profiling panel (stage rows and the
   whole-frame total) and the dropped-frame count. Remember the panel's
   total is `pipeline-compute`, not `preview-update` — see "Legacy
   metrics" above.
7. **Record** browser and version, build id, backend actually selected,
   grid, palette, sample duration, dropped/skipped frames, and the
   observed update rate. Missing figures are written as `not measured`,
   never as zero.
8. **Export diagnostics** via the diagnostics bundle
   (`src/diagnostics/log.ts`) and attach it alongside.

For allocation and peak-memory evidence, use repeatable DevTools
procedures (heap snapshot before/after a fixed number of frames;
retained-object check on the preview surface). Do not force GC and then
claim the result is production-representative — if GC was forced, say so
on the row.
