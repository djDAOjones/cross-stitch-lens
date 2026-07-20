# Measurement contract (M5)

What every Cross Stitch Lens performance number means, what it is taken
over, and how to reproduce it. Written for M5A (`M5-PERF-01/02/03`);
every later M5 claim — audits, optimisations, the M5C decision gate —
cites this document.

The rule this exists to enforce: **a timing without its boundary and
its workload is not evidence.** Moving a start mark changes whether a
budget passes without changing the product; testing one friendly image
makes a regression look like a win.

- Contract version: **bv1** (`tests/bench/boundaries.ts`)
- Report schema version: **1** (`tests/bench/report.ts`)
- Reports from different contract versions are **not comparable** and
  must not be diffed.

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

## 2. Workload matrix (M5-PERF-01)

Defined in `tests/bench/workloads.ts`. Every row has a derived, stable,
unique ID; a report row is comparable across machines only through it.

### ID grammar

```text
<source>.<sourceSize>.<alpha>.g<grid>.<palette>.<metric>.<dither>.<order>.<resize>.<path>
```

Example:
`noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still`

`metric` and `dither` are inert for `rgb` (full-RGB) rows; they stay in
the ID so the grammar is uniform and IDs never collide.

### Axes

| Axis | Values | Why it is in the matrix |
| --- | --- | --- |
| `source` | `noise`, `gradient`, `flat` | worst-case variation; the content dithering is judged on; cache and dirty-skip behaviour |
| `sourceSize` | `grid`, `w1280`, `crop` | source-resolution work (resize, the identity adjust clone) scales with the source, not the grid |
| `alpha` | `opaque`, `mixed` | alpha edges change resize and dither behaviour at empty cells |
| `grid` | 200, 300, 1024 | the typical grid, the stated interactive ceiling, the maximum |
| `palette` | `p64`, `p533`, `rgb` | the budget palette, the full built-in DMC set, and no colour stage at all |
| `metric` | `lab`, `rgb` | isolates the per-pixel transcendental load |
| `dither` | on, off | dither and reduce are different quantisers, not a flag on one |
| `order` | `resize-first`, `reduce-first` | the §7 order comparison; colour work at source resolution |
| `resizeMode` | `stretch`, `contain`, `cover`, `fit` | letterboxing, crop overflow, and the never-enlarge path |
| `path` | `still`, `live` | first-frame versus steady-state cost |

### Mandatory core

Grid × palette size × dither, under core defaults (`noise`, `w1280`,
`opaque`, `lab`, `resize-first`, `stretch`, `still`) — 12 rows. This
block must never lose a cell; `tests/bench-matrix.test.ts` fails if it
does. Everything else is a targeted expansion moving one axis off core,
and each carries a `note` saying why it earns its place.

### Deliberate exclusions

- **Full cross-product.** Combinatorially large and mostly redundant:
  resize-mode behaviour does not interact with palette size, and source
  class does not interact with resize mode. One axis is moved at a time.
- **Non-square grids.** The grid axis is square-only; a non-square grid
  changes cell count, which the 200/300/1024 axis already covers.
- **`p533` expansions.** Palette size is exercised across the whole core
  block; repeating it on every expansion multiplies runtime without
  adding a distinct risk.
- **WebGPU stage rows.** The mapping kernel is not routed by the
  executor yet (D41); only the GPU LUT build is reachable, and it is
  covered by the cold `prepare` row.

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
- per row — workload ID, boundary, label, backend actually used, cache
  state, warm-up count, **raw samples**, and a summary of
  count/min/median/p90/p95/max/mean/stdDev/relative spread;
- countable allocations where known (typed-array byte lengths), not GC
  guesses.

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

### Budget bindings

Budgets attach to one workload at one boundary (`BUDGETS` in
`tests/bench/run-node.ts`). An unattached budget number is exactly the
ambiguity this contract removes.

| Budget | Bound to |
| --- | --- |
| Resize ≤ 5 ms | `stage`/`resize` on `noise.w1280.opaque.g1024.p64.lab.dither.resize-first.stretch.still` |
| Reduce via LUT ≤ 10 ms | `stage`/`reduce` on the same workload with `nodither` |
| Floyd–Steinberg ≤ 15 ms | `stage`/`dither` on the `dither` workload |
| Whole pipeline ≤ 100 ms | `pipeline-compute` on the 1024 `dither` workload |
| Whole pipeline ≤ 10 ms | `pipeline-compute` on the 200 `dither` workload |
| Preview render ≤ 5 ms | not node-measurable — browser rehearsal below |

Budgets stretch ×3 under `CI=true`. The multiplier is recorded in the
report, so a CI number is never mistaken for a local one.

---

## 4. Browser rehearsal procedure

`preview-update`, `interaction` and `export` cannot be measured in node.
Run this by hand on the development Mac and attach the result to the
ticket; it is the only source for those three boundaries and for the
preview-render budget row.

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
