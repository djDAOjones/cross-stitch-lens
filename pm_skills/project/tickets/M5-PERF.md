# M5-PERF — Close the budget gap (D43)

Working detail for the M5 perf item. Decision rationale goes to
`decision-log.md` on ship; this file is deleted when the item closes.

## How a fresh chat should use this file

This is both the shared evidence base for every M5A/M5B ticket and the
handoff for the M5C synthesis decision. Treat all entries under “Leads by
component” as hypotheses until the named audit verifies them. Treat the
owner’s provisional decisions as strong inputs, not final contracts: M5C
must reconcile them with the completed workload, boundary, diagnostic, and
component evidence before releasing implementation tickets.

M5A shipped (2026-07-19): the workload matrix, boundary contract and
report schema are code, and `docs/measurement-contract.md` is the
canonical prose. Re-measure with `npm run bench`; compare only against
reports carrying the same boundary version.

Read order for synthesis: `docs/measurement-contract.md` → the bv1
baseline below → M5-PERF-10 through 19
evidence → this file’s provisional choices → requirements §§7, 8, 20, 22
and architecture budgets. Produce one decision table covering resize,
Exact acceleration, Balanced/Responsive retention, visual tolerances,
default/migration, budget binding, backends, export, and adaptive draft.

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

## Options (for design-options stage)

- **D-a dither matching:**
  - (i) exact-preserving per-15-bit-bin candidate lists — bit-exact,
    golden fixtures unchanged; must preserve first-min-wins tie-break (strict
    `<`, palette index order) or backends silently diverge.
  - (ii) integer-round the clamped work value before matching →
    256-entry channel→linear table kills the per-pixel `pow`; changes
    the reference (regenerate golden fixtures; ≤ ½ LSB quality effect).
  - (iii) LUT-quantised matching in dither — cheapest, visibly
    relaxes the D6/D14 exactness stance.
  - (i)+(ii) compose and plausibly land near the 15 ms row.
- **D-b resize:** separable two-pass area average (pure TS,
  node-benchable) vs OffscreenCanvas `drawImage` backend
  (browser-only — node bench can never verify the 5 ms row) vs both.
- **D-c budget revision:** any row left honestly out of reach →
  doc-delta for architecture.md (protected doc, owner sign-off).
- **D-d:** skip the identity adjust stage at config level (free win).

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

## Leads by component (for the M5B audits — verify, don't re-discover)

Findings from the 2026-07-19 code analysis, mapped to backlog items.
Each is a lead with a code location. Leads marked **[bv1: …]** were
tested against the M5A baseline above — read that verdict before
spending an audit on them.

- **M5-PERF-02 (bench boundaries):** `wholePipelineMs` times request
  construction — a 6.5 MB `data.slice()` — inside the timed region
  (`tests/benchmark.test.ts`). **[bv1: CLOSED — fixed; worth ~1 ms,
  never the reason budgets miss.]**
- **M5-PERF-10 (orchestration):** identity `adjust` clones the full
  source buffer every frame (`adjust.ts` → `clonePixelBuffer`);
  `paletteRgb`/`paletteLab` rebuilt on every stage call
  (`palette.ts`); cross-loop `?? 0` reads (`noUncheckedIndexedAccess`
  pattern) in every hot loop — measure the tax once, decide a pattern.
  **[bv1: the adjust clone is 0.15 ms and the stage-list build
  0.01–0.05 ms — both immaterial. The palette-rebuild and `?? 0` leads
  are untouched by the baseline and remain this audit's real content.]**
- **M5-PERF-11 (resize):** `sampleArea` is non-separable
  O(kernelW×kernelH) per output cell; area-average is separable.
  Caution: a separable rewrite may not be bit-identical (float
  summation order) — tolerance decision needed.
  **[bv1: CHALLENGED — exact area averaging already visits each source
  pixel ~once under hard downscale, so separability has little to
  remove; redundancy appears only as the scale ratio nears 1. Expect
  ~1.5–2×, not the ~7× the budget needs. Test the integral-image
  candidate before committing to separability.]**
- **M5-PERF-12 (LUT/reduce):** measured 13 ms vs 10 budget (within
  ~30%); LUT cache key is `name:entries.length:metric`
  (`lut-cache.ts`) — a palette edit keeping name+count would serve a
  stale LUT (latent bug once user palettes ship).
- **M5-PERF-13 (dither conversion):** per-pixel sRGB→Lab = 3 `pow` +
  3 `cbrt` (Rust and TS conversion functions) ≈ ~3M transcendental
  operations per frame at 1024² — likely the larger half of 412 ms.
  Lead: integer-rounding the matched value enables an exact 256-entry
  channel→linear table (kills the pows; cbrt remains).
  **[bv1: CONFIRMED and quantified — ~70% of dither cost (424.5 ms lab
  vs 125.1 ms rgb at 1024²/64). This is the highest-value target in
  M5.]**
- **M5-PERF-14 (dither search):** 64-entry linear Lab scan per pixel;
  exact pruning must preserve strict-`<` first-min-wins tie-breaking
  in palette index order or TS/Rust silently diverge.
  **[bv1: BOUNDED — the scan is ~1.44 ms per palette entry, i.e. ~22%
  of cost at 64 colours but the dominant term at 533 (1099 ms). Pruning
  is a large-palette win and a small 64-colour one; size the work
  accordingly.]**
- **M5-PERF-15 (wasm boundary):** ~8 MB copied per 1024² dither call
  (pixels in + out, `backends/wasm/dither.ts`); `build:wasm` passes
  no SIMD flag — moot while transcendental-bound.
- **M5-PERF-16 (worker/compare):** split compare runs a second
  full-RGB pipeline pass per frame (`fullRgbVariant`) — cost scales
  with source size when compare is on.

## Smallest useful scope (revised)

1. Quality-neutral core: adjust skip, separable resize, candidate
   pruning, bench fix — lands regardless of UI decisions.
2. Processing-mode plumbing: one enum in `PipelineConfig` + project
   file (defaulted — loader migrates), mode → param resolution.
3. Balanced + Responsive matching paths in TS + Rust with parity
   fixtures per mode.
4. One "Processing" select in the controls panel with helper text.
5. Re-bench; doc-delta the budget-binding decision (Q2/Q3).

Out of scope: WebGPU dither, SIMD, zero-copy wasm memory, CIEDE2000,
per-param advanced controls (Codex option 3 / original option C),
backend-preference UI.
