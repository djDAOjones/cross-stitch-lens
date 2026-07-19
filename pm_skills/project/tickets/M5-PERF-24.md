# M5-PERF-24 — Extend performance regression coverage

## Purpose and entry conditions

Encode the M5-PERF-01 workload matrix, M5-PERF-02 boundaries, M5-PERF-03 report schema,
and M5C budget decisions as repeatable non-mutating regression checks. Do not encode
aspirational or machine-fragile assertions before those inputs are approved.

## Current coverage

`npm run bench` is an explicit BENCH-gated Vitest file: deterministic input, two warm-ups,
small sample medians, architecture thresholds, and ×3 under CI. Plain `npm run check` visibly
skips it. Browser render/live paths are manual. The whole-pipeline row currently includes
request copying and palette creation; reports lack distributions and machine/build metadata.

## Recommended split

- Deterministic correctness/structure checks remain in `npm run check`: workload/report
  schema, boundary math, timing aggregation, allocation-byte accounting, and parity.
- Machine performance stays an explicit benchmark command/report. Use approved baseline or
  threshold policy, raw samples/percentiles, warm/cold labels, and a clear inconclusive/noisy
  result rather than arbitrary multipliers alone.
- Browser suite/procedure covers rendering, capture, GPU and end-to-end rows. Unsupported
  hardware is an explicit skip with reason; fallback correctness still runs.
- CI may report trends or enforce stable broad regressions only if runner variance evidence
  supports it. Never `|| true`, silently skip, or mutate/format during the gate.

## Tests and edge cases

Verify workload axis coverage, report versioning, unknown/missing metrics, backend actually
used, build identity, warm-up exclusion, percentile math, comparison direction, variance
threshold, baseline incompatibility, and non-zero exit on a real enforced regression. Test
without WASM/WebGPU and with browser features unavailable.

## Likely files and done evidence

`tests/benchmark.test.ts`, focused report tests, scripts, `package.json`, CI workflow,
DEV-INFRASTRUCTURE quality gate, diagnostics/browser procedure, and ignore rules for generated
reports. No runtime dependency. Done when the approved matrix reports consistently on repeated
local runs, CI policy matches observed noise, docs describe commands, and `npm run check` stays
green/non-mutating.

## Fresh-chat starting point

Read completed 01–03, M5C/M5-ACCEPT-04, D43, package scripts, and infrastructure quality rules.
First remove timed-boundary bias and freeze report schema; only then encode thresholds.
