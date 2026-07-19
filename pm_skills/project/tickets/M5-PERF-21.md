# M5-PERF-21 — Implement the approved resize reference

## Entry conditions

M5-PERF-11 and M5C must name the selected pure TS algorithm, equality/tolerance contract,
budget expectation, runtime backend role, crossover policy, and whether it replaces Exact
or belongs only to another processing mode. Do not infer these choices from the provisional
separable-resize preference.

## Current contract

`resizeStage.backends.ts` is pure, deterministic, grid-bounded, premultiplied-alpha area
averaging for stretch/contain/cover/fit. Transparent letterbox cells, centring/cropping,
input immutability, and 1–1024 validation are observable behaviour. Engine code cannot use
DOM/canvas/worker APIs. The TS implementation remains the universal reference even if an
accelerated backend is later added.

Correctness and maintainability are mandatory; deep CPU optimisation is conditional. If
M5C assigns production-sized resize work to canvas/WebGPU and evidence shows the existing
TS fallback is adequate for its remaining workload range, preserve it rather than building
a sophisticated CPU implementation that the router immediately bypasses.

## Implementation shape

Keep geometry and sampling responsibilities explicit. A separable implementation likely
needs reusable row/intermediate typed arrays and fractional edge weights; document precision,
premultiplication, and when rounding occurs. No per-pixel objects. Avoid a generic resampling
framework for one algorithm. If modes need different resize semantics, resolve params in
pipeline configuration rather than reading UI/global state in the stage.

## Tests

- Happy/boundary: all four resize modes, 1×1, maximum grid, up/downscale, extreme aspect,
  odd centring, fractional boundaries, opaque/transparent/semitransparent hard edges.
- Regression: current golden and focused cases under the approved exact/tolerance oracle;
  input immutability; output dimensions/length; uncovered cells remain zero.
- Differential/property: old approved oracle versus new over deterministic random sizes;
  document max/mean channel tolerance and alpha rules if not byte exact.
- Performance/memory: M5 matrix rows at 200/300/1024 and realistic sources, with individual
  before/after contribution and no source-size cliff.

Golden fixtures are protected; any regeneration requires explicit owner approval and a
stated algorithm change. Prefer adding non-golden differential fixtures where sufficient.

## Likely files and done evidence

Primary: `src/core/pipeline/resize.ts`, `tests/resize.test.ts`, benchmark/report inputs, and
possibly config/mode tests. Do not add canvas/WebGPU to core. Done when correctness contract,
all resize tests, `npm run check`, and the approved role-specific performance expectation
pass with recorded evidence. “No deep CPU rewrite required” is a valid implementation
outcome when M5C supports it; record the retained fallback contract and close the ticket.

## Fresh-chat starting point

Read completed ticket 11 evidence, M5C decision, resize code/tests/golden fixtures, D3/D9, and this
file. Restate the approved tolerance, backend role, and crossover threshold before coding;
if any is absent, return to the decision gate.
