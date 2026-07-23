# M5 performance evidence

Permanent measurement reference for the M5 performance programme: the
bv1 baseline, the M5B component audits, and the M5C decisions those
produced. Cite section and workload IDs from here; do not duplicate the
numbers into project memory.

Moved out of `pm_skills/project/tickets/M5-PERF.md` when the M5-PERF item
shipped (2026-07-20, D47) — the item closed but its evidence is still
load-bearing for M5D/M5F. Sibling references: `docs/measurement-contract.md`
(boundary contract — now bv2, workload matrix, report schema) and
`docs/browser-measurement.md` (the browser-only procedure).

Re-measure with `npm run bench` (budgets) or `npm run audit` (component
audits); compare only against reports carrying the same boundary version.
**The comparison base is now bv2** — see "bv2 re-baseline" at the end of
this document; the M5-era sections above it are bv1 history and must not
be diffed against bv2 reports.

**Superseded content has been removed**, not archived: the pre-M5B
"Leads by component" (every lead was verified or overturned — read the
M5B evidence instead), the design-options list, and the pre-synthesis
scope sketch. The owner's provisional decisions below are retained for
provenance and are **superseded where the approved synthesis says so**.

## Dependency and decision map

- Measurement truth (01–03) defines comparable evidence; no component win
  is credible before its workload and boundary are identified.
- Audits 10–19 close unknowns and create concrete bug/optimisation tickets;
  audit code is not implementation.
- This M5C gate approves quality-neutral implementation (20–24) and mode
  contracts (MODE-01); later mode work must not decide its own semantics.
- Backend roles are threshold-based, not winner-takes-all. M5C must decide
  where TS, WASM, canvas, and WebGPU win across workload sizes before deep
  implementation; the TS reference remains correct and available even when
  an accelerated backend owns the production fast path.
- Responsive is conditional. If cut, MODE-03 is removed and MODE-06 keeps
  the existing dither-off draft substitution.
- ACCEPT-04 alone reconciles the protected architecture budget table after
  final evidence; do not edit aspirational numbers during synthesis.

## Synthesis acceptance evidence

For every approved choice cite workload IDs, raw/report locations, output
oracle/tolerance, measured contribution including preparation/boundary cost,
fallback, complexity, and affected downstream tickets. Explicitly list
rejected candidates and why. Publish honest Exact timings even when they do
not meet the Balanced headline budget. No unresolved algorithm, tie rule,
migration default, visual threshold, backend role, or crossover threshold
may be delegated to coding work. Avoid optimising both sides of a crossover
unless the measured routing strategy shows both paths are performance-relevant.

## Measured (dev Mac, 2026-07-19, D43)

| Row | Measured | Budget |
| --- | --- | --- |
| resize 1280→1024 (ts) | 36 ms | 5 ms |
| reduce LUT 1024/64 | 13 ms | 10 ms |
| dither (wasm) 1024/64 | 412 ms | 15 ms |
| whole pipeline 1024 | 452 ms | 100 ms |
| whole pipeline 200 | 29 ms | 10 ms |

## bv1 baseline (M5A, 2026-07-19, Apple M1 Max / node 24.5)

Boundary contract bv1, build `v0.5.0+20260719.4209a09`, 124 rows.
Re-measured under unbiased boundaries; **every D43 figure reproduced
within noise**, so the harness rebuild did not move the ground truth.

| Row | bv1 | D43 | Budget |
| --- | --- | --- | --- |
| resize 1280→1024 (ts) | 37.2 ms | 36 | 5 |
| reduce LUT 1024/64 | 13.6 ms | 13 | 10 |
| dither (wasm) 1024/64 | 424.5 ms | 412 | 15 |
| whole pipeline 1024 | 462.3 ms | 452 | 100 |
| whole pipeline 200 | 28.0 ms | 29 | 10 |

All five still miss. Removing the 6.5 MB `slice()` from the timed
region moved the 200 row by ~1 ms — the bias was real but small, and
it was never the reason the budgets miss.

### Decomposition (the numbers M5B should start from)

**Dither is conversion-bound, not search-bound.** Same workload,
1024²/64, wasm backend: `metric: lab` = 424.5 ms, `metric: rgb` =
125.1 ms. The sRGB→Lab transfer functions account for ~**70%** of
dither cost. Palette-size scaling gives the same answer independently:
1024²/64 = 424.5 ms, 1024²/533 = 1099.1 ms → ~1.44 ms per palette
entry, so extrapolating to zero entries leaves ~332 ms of fixed
per-pixel cost. At 300² the identical model holds (36.4 / 96.7 ms →
~28 ms fixed). **Candidate pruning can therefore address at most
~22% of dither cost and cannot reach the 15 ms row on its own** —
confirming the earlier analysis, and quantifying it.

**Resize is sample-count-bound, and separability may not help.**
1280→200 = 11.4 ms, 1280→300 = 14.1 ms, 1280→1024 = 37.2 ms,
1024→1024 = 19.8 ms. Exact area averaging visits each source pixel
about once when downscaling hard (1280→200 touches ~1.6 M samples for
a 1.6 M-pixel source); the redundancy appears only as the scale ratio
approaches 1, where each source pixel lands in up to four output
cells (1280→1024 ≈ 2.6 visits per source pixel). A separable two-pass
rewrite removes overlap, not visits — at 1.25× it saves little, and
at 6.4× there is nothing to save. **Expect ~1.5–2× from a CPU resize
candidate, not the ~7× the 5 ms row needs.** Verify in M5-PERF-11
before M5-PERF-21 commits to a rewrite; an integral-image (summed-area)
candidate is the better lead than separability.

**Two leads shrank on measurement.** The identity `adjust` clone costs
**0.15 ms** at 1280² (0.03% of the 1024 frame), not a material win;
warm stage-list construction costs **0.01–0.05 ms**. `pipeline-compute`
is within ~1 ms of the sum of its stages, so there is no hidden
orchestration cost at this boundary. Per-stage-call `paletteRgb`/
`paletteLab` rebuilds happen *inside* the backends and are still
unmeasured — M5-PERF-10 owns that.

**Order preset matters enormously.** `reduce-first` at 300²/64 costs
**656 ms** against 51 ms for `resize-first` (dithering 1.6 M source
pixels rather than 90 K grid cells). D3 is emphatically confirmed.

**Content class is irrelevant to dither.** noise 34.6 / gradient 34.8
/ crop 34.6 ms at 300²/64 — no data-dependent branching, so the noise
workload is representative.

**Cold LUT build:** 28.1 ms (64 colours), 178.5 ms (533). Budgets bind
warm; these are published separately, never folded in.

## Root-cause analysis (2026-07-19 scoping)

Two distinct causes, two distinct UX surfaces:

1. **Dither hot loop** (dominates the 1024 ceiling). Per pixel:
   full sRGB→Lab (3 × `libm::pow` + 3 × `cbrt`) **plus** a 64-entry
   linear Lab scan — ~3M transcendental operations + ~67M flops per 1M-px
   frame (`crates/stitch-engine/src/lib.rs` `nearest_index` /
   sRGB-to-Lab conversion; TS twin in `src/core/pipeline/dither.ts` +
   `src/core/color/lut.ts` `nearestIndex`). The Lab conversion is
   likely the larger half — candidate pruning alone is insufficient.
2. **Source-resolution work** (dominates the 200×200 miss).
   `resize.ts` `sampleArea` is a non-separable O(kernelW×kernelH)
   area average, and the identity `adjust` stage clones the full
   source buffer (~6.5 MB at 1280²) every frame before resize.

Second-order drags (noted, not primary): `?? 0` per-element reads in
all hot loops (`noUncheckedIndexedAccess` tax); wasm boundary copies
~8 MB/frame; bench times include a 6.5 MB `slice()` inside the timed
region (`tests/benchmark.test.ts` `wholePipelineMs`); `build:wasm`
passes no SIMD flag (moot while transcendental-bound).

## Scope sign-off (2026-07-19)

The maintainer permits algorithm and golden-output changes, while
preferring optimisations that preserve visual quality. Controlled
quality/performance choices may be exposed in the image-processing UI;
they are not limited to dithering. Exports remain full quality.

The user-facing control should express processing intent rather than
backend names. Backend selection remains automatic, with implementation
detail visible only through the dev profiling surface. Persistent
project settings and temporary adaptive preview quality stay separate.

## Synthesis after Codex review (2026-07-19, owner-supplied)

Adopted from Codex: a single semantic **Processing mode** control —
Exact appearance / Balanced / Responsive — resolving to parameter
bundles, replacing raw technical knobs (match-precision, serpentine,
and metric exposure dropped from this item). Persists as one enum
field; adaptive draft preview stays separate and never affects
exports; exports re-run the *chosen mode* at full execution quality.

Mode mapping (initial):

| Mode | Resize | Dither matching |
| --- | --- | --- |
| Exact appearance | reference (current) | exact + candidate pruning |
| Balanced | separable (tolerance-tested) | integer-rounded match |
| Responsive | separable | LUT-quantised match |

This resolves former Q1 (golden regeneration): the reference stays
frozen as the Exact-appearance mode; faster matching paths are modes
with their own fixtures. No regeneration.

Quality-neutral engine work applies to ALL modes: skip identity
adjust; exact-preserving per-bin candidate pruning; bench timed-region
fix. Note: even a separable rewrite of the same area-average may not
be bit-identical (float summation order) — resize golden fixtures need a
documented tolerance decision regardless of mode.

Codex gaps (analysis above stands): no root-cause breakdown — pruning
alone cannot reach the 15 ms row because the per-pixel Lab
transcendental load is ~half the cost; missed the adjust-clone waste
and the bench bias.

## Provisional decisions (owner, 2026-07-19 — M5C gate validates against evidence)

- Q2 RESOLVED: implement + benchmark separable TS resize first; no
  GPU commitment. Revise the 5 ms row to an honest CPU figure unless
  profiling shows a GPU backend is a reliable, worthwhile win.
- Q3 RESOLVED: headline budgets bind to Balanced (the everyday
  experience). Exact keeps honest, slower published timings.
- Q4 RESOLVED: Balanced is the default everywhere — new projects and
  existing v1 files alike; no Exact migration. The owner explicitly
  waived backwards compatibility at this stage (2026-07-19), so the
  appearance-preserving-migration concern is moot. A v1 file loaded
  after this change may render slightly differently (Balanced vs the
  old exact path) — accepted. Save→load→save byte identity and the
  migrate-forward loader mechanics still hold going forward.
- Responsive is contingent: keep only if evidence shows Balanced
  cannot sustain fluid live capture at demanding grids. Dependency:
  if Responsive is cut, adaptive draft (M5-MODE-06) falls back to
  today's dither-off behaviour instead. Candidate note: if Responsive
  IS needed, ordered (Bayer) dithering is a named candidate alongside
  LUT-quantised FS — error diffusion is inherently sequential, while
  ordered dither is a parallel point operation and LUT-matched by
  nature. Other new algorithms stay post-M5 (Icebox) by decision
  (2026-07-19): they multiply the parity matrix and would be ported
  twice if landed before the matching/pruning decisions settle.
- Balanced may carry small, controlled visual differences, validated
  on representative artwork with explicit tolerances (M5-ACCEPT-02).
- Unchanged: automatic selective GPU/WASM (D42); exports use the
  project's selected mode at full execution quality; adaptive draft
  never affects exports.

## M5B component evidence (2026-07-19, Apple M1 Max, node 24.5 + Chromium/Metal-3)

M5B is complete. Audits are code: `npm run audit` (AUDIT=1) reruns every
node measurement below and writes JSON artefacts to `bench-reports`; the
browser numbers and their procedure are in `docs/browser-measurement.md`.
Candidate prototypes live in `tests/audits/candidates/` and are **not**
shipping code.

**Read this section before the leads below — several leads are now
overturned, not merely confirmed.**

### The headline: three bit-exact wins, one shipped correctness bug

| Change | Workload | Before | After | Exact? |
| --- | --- | --- | --- | --- |
| Hoist Lab scan reads out of the palette loop | dither ts 1024²/64 | 821–888 ms | 273–304 ms | **yes** |
| + per-bin candidate pruning | dither ts 1024²/64 | 273 ms | 217 ms | **yes** |
| + per-bin candidate pruning | dither ts 300²/533 | 106 ms | 32 ms | **yes** |
| Hoisted coverage in `sampleArea` | resize 1280→1024 | 37.4 ms | 24.4 ms | **yes** |

None needs a tolerance decision or a golden regeneration. Together they
move the TS dither at the ceiling grid from 888 ms to 217 ms (4.1×) and
the TS resize by ~1.5× everywhere.

**P0 defect: the WebGPU LUT has never worked and silently replaces the
correct one.** `lutBuildShader` uses `target`, a reserved WGSL keyword;
the module fails to compile, WebGPU reports that asynchronously so
nothing throws, the dispatch no-ops, and the zero-filled buffer reads
back as a valid all-zeros LUT that `ensureLut` caches in preference to
the TS build. In any WebGPU browser, non-dithered reduction renders a
**solid single colour**. Proven on the real frame path — see
`docs/browser-measurement.md`.

**Fixed 2026-07-20 (D46).** It had a second half: with the shader
compiling for the first time, the real GPU rejected the *bind group*,
because `layout: 'auto'` omits a declared-but-unread buffer. GPU LUT now
matches the TS build exactly (0 mismatches over all 32,768 bins, both
metrics). Real-GPU CI coverage remains open as **M5-PERF-32**.

### Corrections to bv1

- **"Dither is conversion-bound (~70%)" is a WASM statement, not an
  algorithm statement.** bv1 derived it from (lab − rgb)/lab on the wasm
  backend. Measured per backend: wasm 70.1%, TS as-shipped 11.4%, TS
  with the scan reads hoisted **−2% (i.e. nil)**. The Rust port calls
  `libm::pow`/`libm::cbrt` — software routines chosen for bit-exact
  parity with V8 (D39) — while V8 lowers the same maths to builtins.
  M5C must not plan one conversion strategy across both backends.
- **"Pruning can address at most ~22% of dither cost" understated it.**
  Measured 4.1× at 1024²/64 and 15.4× at 300²/533 — because the
  reference's Lab scan carried a loop-invariant Float32Array re-read
  that bv1's palette-size model could not see. Attribution is reported
  separately: the hoist is 84–92% of the saving, pruning the rest.
- **Separability is worse than CHALLENGED — it is actively harmful.**
  Measured against the reference: 1.17–1.27× at hard downscale, but
  **0.51–0.69× (slower)** as the ratio approaches 1. A summed-area table
  is slower everywhere (0.35–0.79×). The bit-exact hoisted variant beats
  both on every case. **Do not rewrite resize as separable.**
- **The `?? 0` bounds-read tax is zero.** Measured ratio 0.985–0.995
  against an assertion-typed loop — V8 elides it. Lead closed; do not
  weaken strict TypeScript for performance.
- **The wasm boundary is not where the time goes.** ~8 MB of in+out
  copying plus the per-call palette flatten is **0.17–0.28%** of a wasm
  dither call. Zero-copy linear memory, persistent allocations and
  cached palette buffers are all premature. SIMD is likewise mis-aimed
  while the residual is `libm` transcendental routines.
- **Node is not a proxy for the browser.** The same TS resize is ~3.5×
  slower in-browser than in node on this machine, while TS dither is
  only ~1.1× slower — stage-dependent, so no global multiplier fixes it.
  Verified inside a Worker too, so it is not a main-thread artefact.

### Per-component verdicts

- **M5-PERF-10 orchestration — nothing material left.** Palette
  derivation per stage call: 0.009 ms (p64) / 0.063 ms (p533), ≤ 0.02%
  of a 200² frame. `?? 0` tax nil. Per 1024² frame the engine allocates
  ~26.5 MB (~4× the source); the 12 MB f32 dither work buffer is the
  only reuse candidate that does not touch stage purity. Ownership
  pinned: skipping identity `adjust` is safe **only** because every
  remaining stage allocates its own output, so a response buffer can
  never alias the retained `lastFrame`. (M5-PERF-25)
- **M5-PERF-11 resize — no CPU path reaches 5 ms; canvas cannot be
  quality-neutral.** Best bit-exact CPU candidate is 24.4 ms at
  1280→1024 (node). Canvas `drawImage` + readback is 8.1 ms in-browser
  but differs from the oracle by mean 39/255 per channel at 6.4×
  downscale (100% of pixels). The 5 ms row is unreachable without a
  visible appearance change. M5C must either revise the row or accept
  canvas as a *mode*, not a backend.
- **M5-PERF-12 LUT/reduce — two defects.** (1) The P0 GPU shader bug
  above. (2) The cache key is `name:entries.length:metric`, so palettes
  differing only in colour **or order** share a LUT — and the LUT stores
  *indices*. Reproduced: a pure-red pixel reduced under a reordered
  palette comes back **green**. Latent until user palettes ship, then a
  live wrong-output bug. (M5-PERF-26) Cost split: the 13.6 ms bv1
  `reduce` row is essentially all per-pixel mapping (12.7 ms at 1024²,
  identical for 64 and 533 colours — memory-bound, not palette-bound),
  so no search-side work can move it. Cold build 26 ms / 179 ms. The
  15-bit LUT disagrees with exact Lab matching on **5.9%** of sampled
  sRGB values, which is why D6 keeps dither off the LUT.
- **M5-PERF-13 conversion — reject candidate B.** Isolated, the three
  `Math.pow` transfer functions are 33% of conversion and the three
  `Math.cbrt` 19%; a 256-entry table halves the pow term. But in situ
  the whole conversion is worth ~0% on the hoisted TS path, while
  rounding the match input changes **49–53% of output pixels** through
  error diffusion. Method caveat recorded: the isolated micro-benchmark
  predicts ~90 ms/frame and the in-situ delta is nil, because V8 keeps
  the Lab triple in registers — quote the in-situ number.
- **M5-PERF-14 search — pruning is exact and it is the win.** Per-bin
  candidate lists derived from a monotone Lab bounding box of each
  15-bit bin, keeping candidates in palette index order. Exactness is
  argued (every step sRGB→f is monotone per channel; the enclosure is
  conservative) and verified: **0 mismatches over 138,304 adversarial
  values** per palette, and byte-identical dither output on every
  workload. Mean candidates 18.0/64 and 34.5/533 (3.6× and 15.4× scan
  reduction). Table build 74 ms / 355 ms, 1.3 MB / 2.3 MB — a per-palette
  one-off that belongs in the LUT cache, not the frame path.
- **M5-PERF-15 wasm boundary — closed as immaterial.** See corrections.
  Emitted module 21.7 KB (19.3 KB code), no `simd128`. Calibration picks
  wasm at every workload today (margins 2.1–5.4×), but the margin varies
  by workload and the winner **flips** once the two bit-exact TS fixes
  land (TS 217 ms vs wasm 417 ms at 1024²/64). The one-shot 96²/533
  calibration cannot see either. Re-derive routing after M5-PERF-22, and
  make selection a workload threshold rather than a global pick.
  (M5-PERF-27)
- **M5-PERF-16 worker/compare — one confirmed stall defect.** Split
  compare re-runs `adjust + resize` over the full **source** every frame:
  16.3 ms at 300² (16.4% overhead) and 43.8 ms at 1024² (4.2%) — worst
  proportionally where the pipeline is cheapest, and the result is
  deterministic per source+config so it need not be recomputed per frame
  (M5-PERF-28). Confirmed latent stall: the client releases the
  latest-wins gate only in `handleResponse`, and two paths in
  `pipeline-worker.ts` can produce no response at all — both sit inside a
  floating `void (async () => …)()` with no catch: `await ensureLutFor(…)`
  rejecting (WebGPU device loss is the realistic trigger) and
  `createImageBitmap(…).then(…)` rejecting, since the `postMessage` is
  *inside* that callback. Live preview then wedges permanently — every
  later frame is dropped and nothing recovers it. (M5-PERF-29)
- **M5-PERF-17 capture — cheap when idle, but it can miss real edits.**
  Idle cost is a 16 KB readback plus a 0.03 ms hash against a 5.9 MB
  full readback (~362× saved); crop moves correctly read as changes;
  32-bit FNV collisions are a non-issue against the immediately previous
  frame. **But** the 64×64 downsample means one sample cell covers ~362
  source pixels at a realistic Retina crop, and edits whose contribution
  rounds away are invisible — the preview then **never** updates, not
  merely late. Measured misses: a 1 px full-contrast edit, a 1 px Δ8
  edit, a 4×4 Δ8 edit. This is the product's core promise failing
  silently for small strokes. (M5-PERF-30; the exact threshold needs
  re-measuring in-browser because the real sampler uses `drawImage`.)
- **M5-PERF-18 preview/UI — budget met, and the first browser numbers
  exist.** Render components total ≈ 2 ms at 1024² (ImageData wrap 0.5,
  `createImageBitmap` 1.5, surface draw < 0.1) against the 5 ms row.
  `preview-update` end to end: 57.5 ms at 200² (17.4/sec), 85.9 ms at
  300² (11.6/sec), 633.7 ms at 1024² (1.6/sec). The brief's ≥ 4/sec bar
  at ≤ 300² is **met with margin**; the ceiling grid is not, which is
  what the draft governor is for. Procedure: `docs/browser-measurement.md`.
- **M5-PERF-19 export — isolation proven.** `exportFrame` is called with
  the stable project config, never `liveConfig()`; the draft governor
  mutates nothing; export output is **byte-identical** to an independent
  full-quality run at 300² and 1024². Open and browser-only: encode
  time, the 16384 px clamp against real canvas limits, peak memory at
  maximum scale, and worker contention — a 1024² export blocks the
  worker for ~1 s, during which live frames are dropped.

### What M5C should decide first

1. **M5-PERF-31 was not an M5C decision** — a shipped wrong-output bug,
   fixed ahead of the gate along with the other three defects (D46).
   Note the GPU LUT rows in this file were measured against a kernel
   that never ran; re-measure before using them.
2. The three bit-exact wins need no mode contract; they can land as
   quality-neutral work regardless of how Exact/Balanced/Responsive
   resolve.
3. Candidate B (rounded conversion) and canvas resize are the only two
   remaining levers, and **both change appearance** — so the mode
   question is now narrower and sharper than the pre-M5B framing.
4. The 5 ms resize row and the 15 ms dither row are both unreachable on
   the evidence; M5C owns revising them or binding them to a mode.

## M5C synthesis — APPROVED 2026-07-20 (D47)

Approved by the maintainer at the M5C gate. It **supersedes provisional
decisions Q3 and Q4** above: budgets no longer bind to Balanced, and
Balanced is no longer the default, because Balanced is cut.

### New evidence taken at synthesis (2026-07-20)

The GPU LUT rows in this file were measured against a kernel that never
ran (D46). Re-measured in-browser on the fixed kernel, Chromium/Metal-3,
dev server, same-runtime comparison:

| Workload | GPU | TS (same runtime) | Ratio |
| --- | --- | --- | --- |
| LUT build, 64 colours | 3.2 ms | 190.3 ms | 59× |
| LUT build, 533 colours | 4.4 ms | 2883 ms | 655× |
| Per-pixel map, 1024²/64 | 18.4 ms | 122.8 ms | 6.7× |

**Caveat — do not bank the absolute TS figures.** They are dev-server,
unminified, few iterations, and run 10–16× slower than the node numbers
above (vs ~3.5× for resize), so the TS side is likely understating a
production build. The GPU figures are trustworthy (no JIT dependence)
and the *direction* is unambiguous. Re-take under
`docs/browser-measurement.md` on a production build before any budget
row cites these.

### The decision table

| # | Decision | Recommendation | Basis |
| --- | --- | --- | --- |
| 1 | Resize strategy | Land the bit-exact hoisted `sampleArea` (M5-PERF-21) and nothing else. Reject separable, summed-area, and canvas-as-backend. | Hoisted 37.4→24.4 ms byte-identical; separable 0.51–0.69× (slower) near 1:1; summed-area slower everywhere; canvas 8.1 ms but mean 39/255 per channel on 100% of pixels |
| 2 | Exact/Balanced/Responsive | **Cut Balanced and Responsive.** One fidelity + the existing adaptive draft. | Balanced's two ingredients are both dead: rounded conversion ~0% in situ but changes 49–53% of pixels; separable resize slower. Only canvas remains, at 39/255 error |
| 3 | Default mode | Falls away — there is one fidelity. **The v1 back-compat waiver can be withdrawn**: no mode enum means v1 files render unchanged. | Q4 waiver was needed only to default old files to Balanced |
| 4 | Visual thresholds | **None required.** Golden fixtures untouched across all of M5. | Hoist, pruning and hoisted resize are all bit-exact; GPU LUT measured 0 mismatches under D41; GPU map is integer-only |
| 5 | Budget binding | Replace the aspirational per-stage table with (a) one product promise — **≥4 preview updates/sec at ≤300², in-browser** — and (b) per-stage measured baselines with regression guards, each naming its runtime and workload ID. | Every row except preview-render has missed since written; a permanently-red table trains everyone to ignore it |
| 6 | Honest Exact expectations | Publish measured per grid; state plainly that **1024² is an export/finishing grid, not a live-editing grid**. | 200² 17.4/sec, 300² 11.6/sec (both pass the 4/sec bar pre-wins); 1024² 1.6/sec → ~2.5/sec post-wins |

### The two rows the item names

- **5 ms resize row — revise.** Unreachable without an appearance
  change. New row: measured baseline (~24 ms node at 1280→1024; browser
  to be measured), regression-guarded.
- **15 ms dither row — revise.** Best bit-exact is 217 ms at 1024²/64
  and 32 ms at 300²/533. New row: measured baseline, regression-guarded.

Neither row is edited here — **M5-ACCEPT-04 owns the protected table**.

### Backend routing (forced by the evidence)

- D42's one-shot 96²/533 calibration is wrong: the winner **flips** after
  M5-PERF-22 (TS 217 ms vs wasm 417 ms at 1024²/64). M5-PERF-27 must
  re-derive as a workload threshold and must run **after** M5-PERF-22.
- WebGPU now genuinely wins reduce. LUT build is already wired through
  `ensureLut` and works. Wiring `mapPaletteGpu` needs executor
  asyncification (M5-PERF-23) — gate that on a production-build
  re-measurement, per the caveat above.

### Consequences if approved

- **M5E is cut** (MODE-01…06). MODE-06 resolves per its own stated
  contingency: keep today's dither-off draft.
- **M5-ACCEPT-02 narrows** from cross-mode review to single-fidelity
  output review.
- Escalation path if ACCEPT-03's live rehearsal finds the ceiling grid
  unusable: add canvas resize to the **draft ladder** (temporary,
  automatic, visibly named, never exported) — not a user-facing mode.
- Sequence: 21 → 22 → 25 → 28 → 27 (after 22) → 23 → 24 → 32 → M5F.

### The alternative, if the owner prefers to keep modes

Balanced = canvas resize only (8.1 ms, mean 39/255 error), Exact =
today's path. That buys real browser-side time at the ceiling grid but
makes the product's core spatial reduction visibly wrong in its default
mode, and reinstates the full mode cost: 3× parity matrix, per-mode
fixtures, project-file enum + migration, UI control, ACCEPT-02 sign-off.

---

## bv2 re-baseline (M13-MEAS-01, 2026-07-22, D64)

Everything above this line is **bv1 evidence** — still load-bearing as
history, no longer the comparison base. bv2 re-baselined the node
matrix for the shipped M7/M8 product: the dither axis became the
engine's `DitherConfig` union (bv1's `dither` token only ever meant
Floyd–Steinberg/serpentine/strength 1), `p533` was renamed to the
truthful `p489`, every shipped M8 method gained mandatory rows at 300²
and 1024², and reports now carry a run-validity verdict. Grammar and
rules: `docs/measurement-contract.md`.

Recorded run: build `v0.5.0+20260722.33d021b`, node 24.5.0, Apple
M1 Max, macOS (darwin 25.5.0), wasm built, untainted, 150 rows
(`bench-reports/bench-v0.5.0_20260722.33d021b.json` — regenerable,
gitignored; medians quoted below).

### bv1 → bv2 continuity (same rows, renamed IDs)

| Row | bv1 baseline (2026-07-20) | bv2 (2026-07-22) | Drift |
| --- | --- | --- | --- |
| resize 1280→1024 (ts) | 24.4 ms | 24.5 ms | none |
| reduce LUT 1024²/64 | 12.4 ms | 13.5 ms | +9% |
| dither FS 1024²/64 (ts) | 231.9 ms | 296.7 ms | **+28%** |
| whole pipeline 1024² | 256.3 ms | 321.4 ms | **+25%** |
| whole pipeline 200² | 17.0 ms | 19.8 ms | +16% |

**The FS drift is the run's headline finding.** All rows stayed inside
the ×1.35 regression guard — D62's flat-kernel fix restored *tolerance*
after the 2.3× kernel-as-tuples regression, not parity — but the
1024² dither row has quietly absorbed ~65 ms since the pre-M8 baseline.
Decomposing where (M8 union dispatch, kernel generalisation, machine
state) is M13-PROF-01's job; the bv2 baselines record today's truth
rather than hiding it behind a green guard.

### New bv2 coverage (no prior baseline exists)

Per-method dither at 1024²/p64/lab, all TS (the crate implements only
FS at strength 1 — D62): Atkinson 337.9 ms, Jarvis 331.5 ms, ordered
290.8 ms, blue-noise 289.8 ms. D61's "within ~10–20% of no-dither"
held at 300² with pruning; at 1024² every method lands within ±14% of
FS — the palette scan dominates, and no method is an outlier.

Whole pipeline at 300² (the product-promise grid): 37.0 ms — a node
component baseline, not a proxy for the in-browser ≥ 4 updates/sec
promise (that stays with `bench.html` and M13-MEAS-02).

Cold preparation (previously unpublished beyond LUT builds):
candidate-table build 27.3 ms (p64) / 179.8 ms (p489) /
**3,295.7 ms (pfull — the 3,338-thread eight-brand union)**; LUT build
8.8 / 37.2 / 206.4 ms on the same palettes (lab); threshold-tile first
use: Bayer 8×8 0.02 ms, blue-noise 32×32 generation 12.1 ms. The pfull
candidate table is the standout: a user enabling every brand pays ~3.5 s
of preparation on first dithered use — M13-PROF-02 owns whether that
path is reachable enough to matter.

## M13 profiling, node halves (M13-PROF-01/02, 2026-07-22, D66)

Artefacts: `bench-reports/audit-m13-prof-01-*.json` /
`audit-m13-prof-02-*.json` (regenerate with `npm run audit`). Browser
halves — per-stage node↔browser ratios, GPU LUT end-to-end, whether the
selection-source export blocks live preview — await the M13-MEAS-02
harness run and are explicit gaps in both artefacts, never node-derived
guesses.

### Stage profile (PROF-01, node)

- **Dither dominates every ranked cell**, and the match — not the
  kernel — is the cost. At 300²/p64 the pruned candidate scan alone is
  27.8 ms of the 30.3 ms Floyd–Steinberg stage (~92%), of which
  sRGB→Lab conversion is ~10.5 ms; the diffusion-vs-pointwise delta
  (FS 30.3 vs ordered 29.2 ms) puts kernel propagation + serpentine at
  ~1 ms; work-buffer init is 0.05 ms.
- **Method spread is small at every grid/palette**: all five methods
  land within ±14% of each other (1024²/p489: ordered/blue-noise
  ~414 ms, FS 433, Atkinson 447, Jarvis 471 ms). No method is an
  optimisation target on its own — the shared exact match is.
- **Pruning is the palette-size lever**: exact scan 121.8 ms vs pruned
  40.9 ms at 300²/p489 (3.0×); at p64 the gap is 30.6 vs 27.8 ms
  (pruning near-neutral on small palettes, as D48 found).
- **Resize is source-bound, exactly as documented**: 1280²→1024²
  28.1 ms vs grid-sized 1024² input 13.9 ms; crop→300² 10.6 ms.
  Reduce via LUT stays trivial at 300² (1.3 ms).

### Preparation & cache profile (PROF-02, node)

- **Selection, not policy, is the palette-change heavyweight below the
  candidate table**: `resolveProjectPalette` with no count is 0.18 ms
  (DMC) / 0.65 ms (all brands), but a count limit costs 20 ms at DMC
  and **121 ms over the eight-brand union** (`selectThreads` 30-from-
  3,338 = 116 ms of it). `buildDistribution` is 3.9 ms at 300² /
  34.3 ms at 1024².
- **Candidate tables re-confirmed as the dominant cold cost**: 30.7 /
  549.9 / 1,325.6 ms at p64/p489/pfull in this run. The p489 figure
  disagrees with the bench cold row (179.8–207 ms) by ~2.7× —
  flagged as measurement sensitivity (heap/GC state differs between
  harnesses); the synthesis must not quote either number without the
  spread and both artefacts.
- **Cache behaviour proven by counters, not timings** (new
  `lutCacheStats` diagnostics): A→B→A toggling hits (1 hit/2 misses);
  metric is part of the LUT key; a reorder rebuilds by design (D46); a
  rename never rebuilds (content keying). **The candidate cap of 2
  rebuilds on any 3-palette cycle** (A→B→C→A = 4 misses, 2 evictions)
  — whether real switching reaches that is a synthesis question.
- `paletteRgb`/`paletteLab` are allocated per stage call today
  (0.006–0.42 ms and 0.2–40 KB per call by palette size) — real but
  small; a reuse candidate for the synthesis list, not a proven
  bottleneck.

## M13 profiling, browser halves (M13-PROF-01/02, 2026-07-23, D68)

Artefact: `bench-reports/browser-bench-v0.5.0_20260723.170dcba-auto.json`
(regenerable: `bench.html?auto=still,stage,gpu,lut,contention` on a
production build — procedure in `docs/browser-measurement.md`). Chrome
150, M1 Max, foreground and visible, untainted, 70 rows, timer
resolution 0.1 ms. Same dirty-tree caveat as D67: the report is stamped
`170dcba` and the close commit lands the harness code it measured.
Node comparison base: `bench-v0.5.0_20260722.33d021b.json` (D64), same
machine. Still `preview-update` anchors reproduce run-3 within ~6%
(22.2/40.0 ms vs 21.2/37.4 ms at 200²/300²), so the two browser runs
are comparable.

**A hidden page is not a measurement surface.** The first attempt ran
in the in-app preview pane, which always reports
`visibilityState: 'hidden'`: the whole renderer — worker included — was
CPU-throttled to 10–20× inflated samples (resize 442.8 ms vs 11.7 ms
visible, still preview 200² 465.7 ms vs 22.2 ms). That run was
discarded; the harness's unattended auto mode exists so the gestureless
legs can run in a real foreground window, and the env row records
visibility so a background run is self-incriminating.

### Stage ratios (PROF-01) — there is still no single browser multiplier

Browser÷node median ratios over the shared bv2 workload IDs
(18 workloads: core grids × palettes, all five methods, both resize
isolations):

- **dither: browser ≈ node** — 1.00–1.11 across every method, grid and
  palette (e.g. FS 300²/p64: 27.1 vs 26.6 ms; FS 1024²/p64: 300.2 vs
  293.5 ms). The M5-era "dither ~1.1×" holds post-M8.
- **resize: 1.12–1.28×** — far below the M5-era 3.5×. On today's
  production build the browser resize gap has collapsed (1024² from
  1280²: 29.8 vs 24.3 ms). The 3.5× figure is superseded as a current
  planning number; it remains true that the ratio is stage-specific.
- **reduce (LUT map): browser ~2.2–2.5× FASTER than node** (0.40–0.46
  ratio; 1024²/p64: 5.4 vs 13.5 ms). Chrome's V8 wins this loop
  outright — a node reduce median must never be read as a browser cost.
- `pipeline-compute` lands 0.92–1.18 accordingly. Method spread stays
  within ±14% in the browser (300²/p64: blue-noise/ordered ~25.5,
  FS 27.1, Jarvis 30.1, Atkinson 30.5 ms) — the shared exact match, not
  any method, remains the only optimisation target (consistent with the
  node half, D66).

### Preparation and contention (PROF-02)

- **GPU LUT build is a clear end-to-end win, already wired**
  (`ensureLut` is GPU-first): webgpu steady 3.6 ms (p64) / 2.4 ms
  (p489) vs TS 8.3 / 39.7 ms — 2.3× at p64, ~16× at p489, and the GPU
  cost is dispatch/readback-bound (p489 no dearer than p64) so the win
  grows with palette size. Agreement EXACT on all five GPU rows,
  all-zeros traps clear. First call in this page context measured
  2.4 ms — read as shader-cache-warm (Chrome caches compiled shaders on
  disk), not as a cold-device figure.
- **`mapPaletteGpu` stays unwired**: end-to-end 8.0 ms vs TS 5.5 ms
  (page) / 5.4 ms (worker) at 1024²/p64 — the GPU map loses here where
  run-3 saw near-parity (5.3 vs 5.0 ms). The M5-PERF-23 verdict stands
  on production data.
- **The selection-source export blocks briefly, and never races or
  starves** (worker-side answer; the worker is FIFO so frame origin
  cannot change it): under a 250 ms still pump at 300²/p64/FS, baseline
  preview-update is 40.7 ms median (n=39); frames overlapping one of
  five interleaved full-RGB selection exports rise to 48.1 ms median /
  72.1 ms p95 (n=10) — bounded by roughly one export duration
  (51.3 ms median). 49/49 submits settled, zero drops, zero worker
  errors, no wedge. At the 4 updates/sec promise cadence a one-off
  ≤ ~50 ms displacement is invisible. The capture-path confirmation
  (pump-side grab contention) rides with M13-PROF-04's live leg.

## M13 backend end-to-end comparison (M13-PROF-03, 2026-07-23, D69)

Artefact: `bench-reports/browser-bench-v0.5.0_20260723.0042e73-backend.json`
(regenerable: `bench.html?auto=backend` on a production build —
procedure in `docs/browser-measurement.md`). Chrome, M1 Max, foreground
and visible, untainted, zero findings. Both backends are **forced
through the shipped worker route** via the harness-only request `force`
channel (`src/worker/protocol.ts`), interleaved run-for-run, so wasm
boundary copies, sidecar adoption and the worker transport sit inside
the marks on both sides. **Every timed cell carries an output oracle:
pixels and the palette-index sidecar byte-exact between backends in all
12 cells, and on both export runs.** Same dirty-tree caveat as
D67/D68: the report is stamped `0042e73`; this close commit lands the
force channel and leg it measured.

### Capability table (what a three-column chart would lie about)

| Operation | ts | wasm | webgpu |
| --- | --- | --- | --- |
| Exact area resize | yes | — | — |
| LUT construction | yes | — | yes (wired GPU-first, D68: 2.3–16× win) |
| LUT palette map | yes | — | implemented, unrouted, **no indices sidecar** |
| Floyd–Steinberg s=1 | yes | yes | — |
| Other M8 methods / strengths | yes | — (adapter delegates to ts) | — |

Cold once-per-context costs: wasm module fetch+compile+init 90.3 ms
(page context; the worker pays the same shape at startup,
fire-and-forget); GPU device acquisition 8.1 ms.

### Rule 1 — `lab → ts`: **CONFIRMED, every cell** (stage medians, ms)

| Cell | forced ts | forced wasm | wasm/ts |
| --- | --- | --- | --- |
| 200²/p64 | 11.7 | 15.6 | 1.33 |
| 300²/p64 | 25.1 | 35.0 | 1.39 |
| 1024²/p64 | 285.1 | 437.6 | 1.53 |
| 200²/p489 | 15.8 | 38.7 | 2.46 |
| 300²/p489 | 37.0 | 89.8 | 2.43 |
| 1024²/p489 | 362.8 | 1045.6 | 2.88 |

No crossover anywhere in range; the TS margin *grows* with palette
size (per-bin candidate pruning is Lab-only and Rust keeps the full
scan with software `libm` transcendentals — the M5-PERF-27 rationale,
now proven end-to-end in the browser). The `preview-update` twins of
every row move in lockstep (transport adds a near-constant ~9–12 ms),
so the stage verdict survives the user-visible boundary.

### Rule 2 — `rgb → wasm`: **CONFIRMED, every cell** (stage medians, ms)

| Cell | forced ts | forced wasm | ts/wasm |
| --- | --- | --- | --- |
| 200²/p64 | 9.3 | 4.1 | 2.26 |
| 300²/p64 | 22.6 | 9.4 | 2.41 |
| 1024²/p64 | 303.4 | 110.0 | 2.76 |
| 200²/p489 | 54.4 | 27.0 | 2.01 |
| 300²/p489 | 126.7 | 61.4 | 2.06 |
| 1024²/p489 | 1495.9 | 711.0 | 2.10 |

At the **export boundary** the win survives whole: the routed-wasm
export of 1024²/p64/rgb runs 138.0 ms vs 329.1 ms forced ts (2.39×),
byte-exact both ways. Categorical metric routing needs no size or
palette threshold — the metric decided all 12 cells, exactly as
M5-PERF-27 recorded; adding a threshold would still be inventing a
rule the evidence does not show.

### Rule 3 — `mapPaletteGpu` stays unwired: **CONFIRMED** (grid-sized source, lab, ms)

| Cell | ts LUT path | webgpu end-to-end |
| --- | --- | --- |
| 200²/p64 | 0.20 | 1.80 |
| 300²/p64 | 0.40 | 1.95 |
| 1024²/p64 | 5.25 | 5.45 |
| 200²/p489 | 0.20 | 1.80 |
| 300²/p489 | 0.40 | 2.00 |
| 1024²/p489 | 4.90 | 5.55 |

The GPU curve is flat (~1.8–2.0 ms dispatch/readback floor, palette
size immaterial) but TS never costs more than ~5 ms even at the 1024²
ceiling — the GPU map loses **every** cell inside the product's grid
range, so no crossover exists to route on. Pixels are byte-exact, but
the kernel also returns **no palette-index sidecar**, so wiring it
as-is would erase thread identity (D55) even if it were fast. Verdict:
M5-PERF-23 stands, now on complete evidence; re-open only if an
executor asyncification lands for other reasons *and* the kernel
learns to emit indices. GPU pass time via `timestamp-query` was not
taken: the shared device is created without the optional feature and
requesting it would edit shipped code, which this ticket forbids —
CPU wall time settles the wiring question regardless.

### Counter-proven candidate and fallback validity

- **Caching the wasm adapter's per-call palette flatten is not worth
  it**: `paletteLab` costs 0.0 ms (p64) / 0.1 ms (p489) per call on
  this machine — recorded so nobody "optimises" it later.
- **Fallback probes, all PASS, each answered exactly once (D46):**
  a forced unregistered backend (webgpu on dither) falls back to ts
  and answers; a forced-wasm non-FS method returns output byte-exact
  to ts via the adapter's delegation guard (M8-ALG-01); destroying the
  GPU device mid-session recovers on the next call with an EXACT
  rebuilt LUT.
- **Defect found (M13-DEF-01):** in the delegation case above,
  `StageTiming.backend` reports `wasm` while TS reference code
  actually executed — the diagnostics label lies. Reachable only via
  a recorded override or the harness force, never via routing.
  *Closed by D72*: the executor now clamps an unimplementable wasm
  request to ts before the label is stamped.

## M13 live-path gestureless rows (M13-PROF-04 partial, 2026-07-23, D70)

Artefact:
`bench-reports/browser-bench-v0.5.0_20260723.c68e2c3-livepath.json`
(regenerable: `bench.html?auto=livepath`). Chrome, M1 Max, foreground,
untainted. The live half needs the owner's capture gesture — the
rehearsal sheet in `docs/browser-measurement.md` is that session's
script; the rows below are what needed no gesture.

- **Dirty detection probability is a function of edit size, and
  contrast is nearly irrelevant** (canvas replay over a 1512×982
  gradient document, 20 seeded trials per cell, shipped `hashPixels`
  over the sampler's exact 64² draw+readback): ≤ 2 px edits are
  essentially invisible at *any* contrast (1 px full-contrast: 0/20 —
  confirming the D46-era recorded miss), 4–8 px detect at 0–25%,
  16 px at 55–70%, and 32 px+ at 100%. The knee sits between 16 and
  32 px edge at a realistic Retina crop. The 64² averaging destroys
  the signal before the hash sees it, so the 2 s forced refresh
  (`DIRTY_MAX_STALE_MS`) is what makes small strokes appear — "up to
  2 s latency for a 1 px mark" is the number the owner session should
  expect to *feel*.
- **The per-tick dirty cost is below the 0.1 ms timer floor**
  (median 0.00 ms for draw+readback+hash on the realistic source) —
  the idle path is as cheap as designed; the gate's cost argument
  holds.
- **`computeStats` costs 2.0 ms per displayed 300²/p64 frame** on the
  main thread — real but small against a ~40 ms preview update; the
  DOM half of the app's per-frame work is measured by the owner
  session's DevTools trace, not here.
- **Live-window instrumentation landed for the owner session**: the
  harness live legs now record dirty-sample/grab medians, long tasks
  (`PerformanceObserver`, feature-detected), draft transitions with
  window timestamps, capture-track `frameRate`/`displaySurface`, a
  200² window variant (6b), and one mid-stream selection-source
  export with overlap analysis — the pump-side half of the D68
  contention carry-in.

## M13 memory, GC and export contention (M13-PROF-05, 2026-07-23, D71)

### Allocation census (deterministic dimension arithmetic, code-traced)

One accepted live frame at a 1512×982 Retina crop, 300² grid, dither
on (`resize-first`):

| Phase | Bytes | Lifetime |
| --- | --- | --- |
| dirty sample, per *presented* frame | 16 KB readback | canvas+context module-reused |
| `grabFrame` OffscreenCanvas | ~5.9 MB (graphics estimate) | fresh per accepted frame |
| `grabFrame` `getImageData` | 5,941,344 B | becomes the retained `masterImage` |
| `main.ts` pre-submit copy | 5,941,344 B | transferred/detached to the worker |
| worker resize output | 360,000 B | consumed by dither, then GC |
| worker dither output | 360,000 B + 180,000 B indices | transferred back to main |
| dither error rows | 3 × width × 4 B | grows once, worker-reused |
| preview `ImageBitmap` | ~360 KB (graphics) | closed on replacement |
| palette flatten per colour-stage call | ≤ 7.3 KB at p489 | transient (cost counter-proven, D69) |

Retained set: `masterImage` (5.9 MB), the newest output for stats/UI
(0.54 MB at 300²), LUTs (64 KB per palette+metric, LRU-bounded),
candidate tables (LRU cap 2 — D66).

**The headline: ≥ 11.9 MB of fresh main-thread allocation per accepted
frame — two crop-sized buffers — is ~93% of per-frame churn at 300².**
At 15 updates/sec that is ~180 MB/s of allocation traffic. Ranked
reuse candidates (sizing only — pooling and ownership changes are
M13-SYNTH-01 decisions):

1. `grabFrame`'s fresh canvas + `ImageData` every accepted frame
   (5.9 MB + graphics) — a persistent grab surface.
2. The pre-submit copy (5.9 MB) — transfer the grab buffer directly
   and re-copy only when `masterImage` is actually consumed
   (re-render without a new frame, selection source).
3. Worker stage outputs at the 1024² ceiling (10.5 MB/frame across
   resize + dither + indices) — engine-purity rules make this a
   pooling question for the synthesis, not a local fix.

Export peak model at 1024² (census; measured confirmations below):
clean ×4 allocates 67.1 MB scaled RGBA + a canvas backing + an
`ImageData` copy inside the encode (~200 MB transient); chart at cell
10 backs a ~10.3k px canvas (~430 MB + copies); clean ×16 is 1.07 GB
raw + the same again in canvas backing — at the legal 16,384 px edge,
"within the side limit" is not a safe peak-memory guarantee.

### Measured (browser, `bench.html?auto=mem`)

Artefact: `bench-reports/browser-bench-v0.5.0_20260723.5494a8d-mem.json`
(Chrome, M1 Max, foreground, untainted; heap readings are Chrome's
JS-heap number — see the row caveat).

- **Export full-quality isolation: EXACT everywhere, re-proven.** The
  300²/p64/FS export is byte-identical — pixels *and* indices —
  whether the worker is idle, mid-pump, serving draft-quality preview
  configs, or answering two rapid exports fired together.
- **Retained-heap sequence: frames plateau, the export step does
  not.** 150 worker-route frames + 10 compare cycles moved the heap
  only 15.7 → 34.9 MiB, but the one clean-PNG + chart export step
  jumped it to 109.7 MiB and **5 s of idle reclaimed nothing**. The
  buffers are unreachable by construction (block-scoped), so this is
  either lazy major GC or genuine retention — classified per the
  ticket as *needs a DevTools snapshot pair*, added to the owner
  session. A first (discarded) probe without the idle tail read the
  same sequence as +94 MiB "growth" — an end-of-churn reading alone
  cannot tell GC lag from a leak.
- **Artefact exports do not displace the worker; they starve the main
  thread.** Against a 250 ms still pump (baseline 54.8 ms, n=36,
  zero drops): clean ×4 and chart cell 10 each overlapped one span
  with no measurable delta (53.8/37.5 ms), and the 527 ms PDF export
  overlapped **zero** spans — its encode/pdf-lib assembly blocks the
  main thread, so the pump simply stops submitting for ~0.5 s. The
  user-visible symptom is a brief preview freeze during PDF export,
  not dropped frames or a worker queue. A cold-LUT export
  (p489 nodither, `ensureLut` miss mid-pump) cost 21.7 ms; two rapid
  exports both resolved, byte-identical (84.4 ms for the pair).
- **Peak probes at 1024²**: clean ×4 162 ms (4.0 MB PNG); chart
  cell 10 1.70 s (11.4 MB PNG, heap 99.7 → 835.8 MiB — the ~430 MB
  backing plus copies, twice over); clean ×16 at the exact 16,384 px
  edge **succeeds** — 2.18 s, 9.6 MB PNG, ~2.1 GB transient.
- **Defect (M13-DEF-02)**: chart at cell 16 on a 1024² grid exceeds
  the canvas edge; Chrome silently zeroes the `OffscreenCanvas` and
  the export dies with "The size of OffscreenCanvas is zero" — no
  clamp, no user-facing sentence. Reproduced twice. *Closed by D72*:
  both encoders now refuse with a user-facing sentence before the
  canvas exists (the UI's `maxCellPx`/`maxScaleFor` clamps already
  prevented it from the app itself).
- Not measurable from the harness: export after *worker-side* GPU
  loss (the worker owns its device; the D46 suites cover `ensureLut`
  rejection answering once), and GC pauses (the owner session's
  Performance trace).
