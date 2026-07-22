# M13-PROF-01 — Stage profile: resize, reduce, every dither family

## Outcome

Publish a bv2 audit that ranks shipped stage costs at 300² and 1024² in Node and
the production browser, names the runtime/backend/workload for every number, and
computes stage-specific Node↔browser ratios. It identifies bottlenecks and files
defects; it makes no optimisation or budget decision.

## What is actually being profiled

- `resize`: TS-only exact area averaging. Cost follows source dimensions, grid,
  resize mode and scale ratio; a `grid` source and a 1280² source are not the same
  1024² workload.
- `reduce`: no-dither LUT mapping. Warm mapping is approximately per-output-cell;
  LUT construction belongs to M13-PROF-02. The output includes RGBA plus the
  palette-index sidecar.
- diffusion: Floyd–Steinberg, Atkinson and Jarvis use one TS scan loop with
  different flattened kernels. Only Floyd–Steinberg at strength 1 has a WASM
  implementation, which M13-PROF-03 compares separately.
- threshold: ordered Bayer and blue-noise are pointwise TS methods. Tile creation
  is memoised and any first-use cost is preparation, not steady-state stage cost.

All dither methods still perform exact nearest-colour matching per stitch. M8's
audit found palette search dominated at 300², but that was exploratory Node
evidence over the old p64/`p533` vocabulary, not a bv2 baseline and not a browser
profile. Re-measure rather than quoting the 10–20% spread as current fact.

## Audit matrix

Use M13-MEAS-01 workload IDs and sample policy. At minimum:

- 300² typical and 1024² finishing/export grids; 200² as a targeted product
  comparison if it changes rankings;
- realistic 1512×982 crop and 1280² sources for resize, plus grid-sized input to
  isolate colour work;
- p64 and actual p489, both Lab and RGB; one multi-brand stress row only where
  MEAS-01 establishes that it represents reachable product use;
- no dither plus all five shipped methods at defaults; non-default strength and
  diffusion serpentine as targeted cases;
- resize modes stretch/contain/cover/fit and alpha only where they change the
  loop/visible-cell count; resize-first is the normal path;
- reduce-first reported separately because its colour stage operates at source
  resolution and its resized output is intentionally off-palette.

Run Node and browser on the same source/config bytes where possible. A ratio is
per stage and workload—M5 measured resize and dither with very different runtime
gaps, so never publish a single “browser multiplier”. Browser figures must come
from the production bundle inside the real Worker. Record p50/p95/max and spread,
not one DevTools screenshot.

## Decomposition method

Start with the executor's `StageTiming[]`, then use CPU profiles/call counts on
the top rows. Change one factor at a time in audit-only candidates. D48 showed why:
two M5 candidates changed an inline call boundary and a more interesting
algorithmic detail together, and the saving was initially attributed to the
wrong cause twice.

Useful subdivisions include resize geometry setup vs sample accumulation; reduce
lookup vs output/sidecar writes; dither work-buffer initialisation, colour
conversion, candidate scan, kernel propagation or threshold offset, and output
writes. Count allocations separately. A component sum is explanatory only; the
measured stage boundary remains authoritative.

Profile first-call/JIT behaviour separately from warmed steady state. Do not
discard slow samples because they are surprising; classify compile, GC,
interruption or defect with evidence. M13-MEAS-01's clean-run rules apply.

## Correctness controls

Every audit candidate runs against the shipped TS stage on identical input.
Quality-neutral candidates require byte equality including alpha and `indices`;
GPU float work uses the pre-existing documented tolerance only where applicable.
Keep transparent-cell isolation, strict first-index ties, deterministic seed/tile,
palette membership and no input mutation under test. Do not regenerate protected
golden fixtures.

## Likely implementation surface

- `tests/audits/resize.audit.test.ts`, `dither.audit.test.ts`,
  `m8-dither.audit.test.ts`, `lut-reduce.audit.test.ts` — extend or add a clearly
  named M13 audit rather than mixing new results into historical prose.
- bv2 harness/workloads from M13-MEAS-01 and the production browser harness from
  M13-MEAS-02.
- read-only profiling of `src/core/pipeline/resize.ts`, `reduce.ts`, `dither.ts`,
  `src/core/color/*`, `src/worker/execute.ts`.
- M13 shared evidence document chosen by M13-SYNTH-01; JSON artefacts remain
  regenerable under `bench-reports/`.

Source engine changes are out of scope. If a performance-sensitive correctness
defect is found, create a focused defect ticket with its reproducer rather than
folding a fix into the profile.

## Exit criteria

The audit ranks stage medians and p95s for every shipped family at 300²/1024²,
records runtime/backend and clean workload IDs, publishes stage-specific
Node↔browser ratios, and gives each claimed cause an isolated measurement. It
ends with a ranked list of proven costs, disproven leads, unmeasured gaps and
defect follow-ups—never a projected speed-up as acceptance.

## Fresh-chat starting point

Read D48, D61–D63, `docs/dither-evaluation.md`, the completed bv2 contract and
the three pipeline stage files. Confirm whether the latest report is clean before
using it. Begin with the full stage ranking, then decompose only the leaders.

## Status (2026-07-22, D66)

Node half published: `tests/audits/m13-stage.audit.test.ts` ranks every
stage × grid × palette × method and decomposes the leader (the exact
match is ~92% of dither at 300²/p64; methods within ±14% everywhere;
pruning 3.0× at p489). Findings in `docs/performance-evidence.md` →
"M13 profiling, node halves". Remaining: the browser half (per-stage
node↔browser ratios) from the MEAS-02 owner run.
