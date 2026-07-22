# M13-MEAS-01 — Node bench refresh: M8-era workloads and re-baseline

## Outcome

Produce the first truthful Node benchmark contract for the shipped M7/M8
product. The result is a reproducible bv2 report with raw samples and spread,
covering every dither family, the 300² product workload, actual palette sizes,
and separate warm/cold/preparation costs. This ticket gathers baseline evidence;
it does not approve an optimisation or silently relax a budget.

## Why bv1 is no longer sufficient

The existing matrix in `tests/bench/workloads.ts` freezes dithering as a Boolean.
Every `dither` row therefore means only Floyd–Steinberg, serpentine, strength 1.
M8 shipped Atkinson, Jarvis, ordered Bayer and blue-noise, each with strength,
but none has a budget row. The workload ID grammar cannot distinguish them.

There is also a post-M7 semantic mismatch: the axis and IDs say `p533`, while
`loadDmcPalette()` now returns the owner catalogue's **489** DMC threads. The
matrix test knowingly expects 489, but `expectedMs()` still estimates 533 and
docs/comments still describe 533. A fresh chat must resolve this explicitly:
rename the real workload to `p489`, and decide whether a separate large-palette
stress row should use all 3,338 catalogue threads or a smaller realistic
multi-brand palette. Do not keep an ID that lies about its input.

Current preparation coverage is incomplete. bv1 publishes cold LUT builds, but
not cold candidate-table builds, palette resolution/selection, cache switching,
or M8 threshold-tile first use. The `pipeline-compute` warm-ups usually hide a
candidate-table miss, which is correct for a warm row but leaves the cold cost
unreported. Its allocation notes also still claim an identity-adjust clone even
though D48 removed that stage from built pipelines.

## Contract changes to settle first

- Bump `BOUNDARY_VERSION` to bv2 so no report is diffed against bv1 as though the
  workload meaning were unchanged. Keep report schema version 1 only if the JSON
  shape remains backwards-compatible.
- Extend IDs with dither algorithm and all cost-relevant settings. A method name
  is mandatory; strength and serpentine may be named values or stable preset
  tokens, but two executable configs must never share an ID.
- Preserve the six boundaries. Warm `stage` and `pipeline-compute` rows exclude
  cache construction; cold LUT/candidate/palette work is published under
  `prepare`, never averaged into a warm median.
- Add an explicit 300² regression row. The product promise is browser-only, so
  this Node row is a component baseline, not a proxy for four visible updates/sec.
- Record the backend actually used. Non-Floyd methods must report TS; the Rust
  crate supports only Floyd–Steinberg at strength 1.

## Minimum representative matrix

Keep the mandatory cross-product small enough to rerun, then add targeted risk
rows rather than a Cartesian explosion:

- grids 200, 300 and 1024; source sizes `grid`, 1280² and realistic crop where
  the source-size distinction matters;
- no dither, Floyd–Steinberg, Atkinson, Jarvis, ordered and blue-noise at default
  settings, with non-default strength/serpentine as targeted rows;
- p64, actual DMC p489, full RGB, and one explicitly justified multi-brand
  preparation stress; Lab and RGB where the path supports both;
- resize-first as the product path, plus targeted reduce-first characterisation,
  alpha/contain, crop/cover, fit, gradient and live steady-state rows.

The M8 quality audit used a colour-spread p64 for visual judgement but the first
64 catalogue entries for timing. Keep performance and perceptual palettes named
separately so neither is mistaken for the other.

## Measurement hygiene

Use fixed warm-up/run plans and preserve raw samples, median, p90/p95, standard
deviation and relative spread. Interleave direct backend candidates when order
could bias them. Record Node, OS, CPU, memory, power state, build identity, WASM
availability and the exact command.

A research run at `e703ed4` is a warning, not a baseline: a single
reduce-first sample lasted about 5.8 million ms, the 15-minute hook timed out,
and several old budget rows missed. The cause was not established (sleep,
suspension, machine contention and a genuine stall remain possibilities).
bv2 should detect implausible elapsed gaps or environmental interruption and
mark the run invalid/tainted; it must never delete an inconvenient sample or
publish the remaining median as clean evidence. Re-run in a controlled session
before rebasing.

## Likely implementation surface

- `tests/bench/boundaries.ts`, `workloads.ts`, `run-node.ts`, `harness.ts`,
  `report.ts` — bv2 identity, axes, preparation rows and validity metadata.
- `tests/benchmark.test.ts`, `tests/bench-matrix.test.ts`,
  `tests/bench-report.test.ts` — completeness, uniqueness, raw-sample and
  invalid-run guards.
- `docs/measurement-contract.md` — the authoritative bv2 marks, IDs, workload
  rationale and comparison rules.
- `docs/performance-evidence.md` or the M13 evidence document chosen by
  M13-SYNTH-01 — recorded report and interpretation, not projected wins.
- `DEV-INFRASTRUCTURE.md` only if command semantics or generated outputs change.

No source engine, routing, budget binding, protected golden or palette data is
part of this ticket.

## Acceptance evidence

1. Matrix tests prove unique derived IDs and required coverage for every shipped
   family, 300², actual palette semantics, both metrics and cold/warm rows.
2. A clean `npm run bench` writes the report before assertions, with raw samples,
   spread, build/runtime identity and no unexplained zero/unsupported value.
3. Old and new reports cannot be compared without an explicit bv1→bv2 warning.
4. Existing budget misses remain visible. Any changed baseline is accompanied by
   a decision-log rationale; product target choices wait for M13-SYNTH-01 and
   committed rebinding waits for M13-IMPL-02.

## Fresh-chat starting point

Read D47, D48, D62 and D63; `docs/measurement-contract.md`;
`docs/performance-evidence.md`; then the five files under `tests/bench/` listed
above. Inspect the latest generated report but classify it before quoting it.
Start by proving the `p533`→489 mismatch and writing the bv2 matrix contract;
do not optimise a stage in this ticket.

## External reference

[Node's performance measurement APIs](https://nodejs.org/api/perf_hooks.html)
provide the stable timing primitives; Cross Stitch Lens still owns the boundary,
workload, warm-up and interruption-validity contract around them.
