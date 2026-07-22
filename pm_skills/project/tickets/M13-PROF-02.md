# M13-PROF-02 — Preparation and cache profile

## Outcome

Characterise the complete palette-change path—policy resolution, colour-count
selection, palette flattening, LUT and candidate-table construction, GPU/TS
fallback, cache hit/miss and eviction—under realistic switching patterns. The
deliverable is cold/warm preparation evidence by palette size and a cache
behaviour report, not a cache rewrite.

## Current data flow

The UI resolves one executable palette through `resolveProjectPalette`: brand,
source, inventory and per-thread rules form the permitted set; optional count
selection reads a resized full-RGB `selectionSource`; count is applied last.
`ensureSelectionSource()` obtains that buffer through a full-RGB Worker export
only when a count limit is active, then holds it across live frames until artwork
or geometry/policy invalidates it.

Inside the Worker, no-dither reduction uses an LRU LUT cache keyed by ordered
palette **colour** fingerprint plus metric (8 entries). Cache misses try WebGPU
first, validate plausibility, then fall back to TS. Lab dithering uses a separate
candidate-table LRU keyed by the same ordered colour content (2 entries). A LUT
is 64 KiB; candidate tables are much larger and content-dependent. `paletteRgb`
and `paletteLab` currently allocate/derive typed arrays on each stage call rather
than being cached as their own preparation objects.

## Known semantic hazards

- Thread identity is `brandId:reference`, but colour-derived caches may share
  between palettes with identical ordered RGB because the cached values are
  indices. The **application** must still use the current palette's identities.
- Reordering entries changes tie-breaking and index meaning, so fingerprints and
  tests must include order. Name or length is never a sufficient key.
- The old `p533` benchmark label now feeds 489 DMC entries. Profile actual p489
  and separately justify any multi-brand worst case; all eight brands can expose
  up to 3,338 threads before count selection.
- Count selection must always read resized full RGB, never the pipeline's last
  reduced output, or a previously narrow palette cannot widen again.
- A GPU LUT that never ran can be a structurally valid all-zero buffer; timing
  never substitutes for bin agreement/plausibility checks.

## Measurement cases

Measure each component separately and then the user-observable palette change:

1. catalogue/brand policy resolution with no count, exact count and maximum count;
   owned-only, exclusions, locks/preferences and conflicts;
2. `buildDistribution` and `selectThreads` over 200²/300²/1024² selection sources,
   including duplicate display colours and sparse/flat/gradient/noise art;
3. palette RGB/Lab flattening, TS LUT, GPU LUT, candidate table and stage-list
   construction at p64, p489 and an evidence-approved multi-brand stress size;
4. cold start, warm hit, metric switch, algorithm switch, palette reorder,
   source/count change, A→B→A toggling, and A→B→C churn past both LRU caps;
5. WebGPU unavailable, device loss/invalid result fallback, cache clear and project
   load/library drift. Record which structures legitimately survive each change.

For every row record boundary/version, build, palette identity and entry count,
metric, cache state, backend, raw samples, output bytes and retained cache bytes.
The end-to-end row starts at a user policy change and ends when the first frame
using the resolved palette is displayed; Node component medians do not stand in
for that browser result.

## Questions the profile must answer

- Which preparation dominates first use at p64, p489 and a large multi-brand set?
- Are the current LRU sizes right for realistic toggling, or do they rebuild/
  retain disproportionately? A cache hit must be proven by counters, not inferred
  from a fast time.
- Does palette selection's extra full-RGB export block or race live preview?
- Which changes actually invalidate LUT, candidates, selection source and palette
  derivatives? Are there stale-key correctness defects?
- Is WebGPU LUT construction still a clear end-to-end win after device/pipeline,
  upload, dispatch and readback, and does it remain exact/plausible?

## Likely implementation surface

- `tests/audits/orchestration.audit.test.ts`,
  `tests/audits/lut-reduce.audit.test.ts`, and a focused M13 cache audit.
- `src/core/palette-policy.ts`, `palette-selection.ts`, `palette-resolve.ts`,
  `palette.ts`, `color/lut.ts`, `color/candidates.ts` (profiled, not changed).
- `src/worker/lut-cache.ts`, router/export path, and the selection-source block in
  `src/main.ts` for hit/miss/invalidation counters.
- `tests/lut-cache.test.ts`, palette policy/selection tests and bv2 report helpers
  for deterministic instrumentation checks.

Do not hand-edit catalogue data, add a cache abstraction, or move I/O into
`src/core/` during this ticket. Any discovered correctness bug gets a minimal
reproducer and its own fix ticket.

## Exit criteria

Publish preparation medians/p95/spread and byte counts per actual palette size;
a timeline for common and worst switching flows; hit/miss/eviction/invalidation
counters that conserve; and a ranked list of proven rebuild and retention costs.
Separate facts from candidate changes. Cache sizing, derivative reuse and GPU
roles remain synthesis decisions.

## Fresh-chat starting point

Read architecture “Thread identity” and “Colour reduction strategy”, D46/D48,
D55/D56/D63, then trace `resolveProjectPalette` → `ensureSelectionSource` →
`ensureLut`/`getCandidates`. Verify the completed bv2 palette vocabulary before
constructing cases; never quote `p533` without checking the entry count.
