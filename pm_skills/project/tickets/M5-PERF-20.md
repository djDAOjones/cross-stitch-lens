# M5-PERF-20 — Remove proven orchestration waste

## Entry conditions

Implement only quality-neutral findings approved from M5-PERF-10 (and cache findings from
12). Every change needs a named before/after workload and ownership proof. Do not bundle
algorithm changes, mode semantics, or speculative micro-optimisation.

## Candidate surface (evidence required)

Current leads are: omit the empty identity-adjust stage at config construction; avoid
rebuilding palette RGB/Lab/config data when content is unchanged; remove proven redundant
copies/allocations; correct weak cache keys; and reduce retained buffers. A lead is not
approval. Returning the same input from `adjustStage` would violate the non-aliasing stage
contract; skipping the stage when params are empty is the safer likely shape.

Palette/config caching must use content-correct invalidation and remain bounded. Transfer
optimisation must account for detached buffers, retained compare source, preview result used
for stats, and export caller ownership. Preserve fresh output buffers wherever a stage runs.

## Likely files

Depending on approved findings: `pipeline/config.ts`, `adjust.ts`, `palette.ts`, dither/
reduce, `worker/execute.ts`, `lut-cache.ts`, `pipeline-worker.ts`, `client.ts`, capture, and
their focused tests. Avoid a broad buffer-pool abstraction unless more than one measured
call site needs it. No runtime dependency.

## Invariants and tests

- Regression: byte-identical outputs for all existing pipeline/golden/parity cases; input
  immutability; backend fallback; compare alignment; no stale LUT after equal-name edits.
- Boundary/error: transferred/detached buffers, palette/metric/config changes, empty/full-RGB
  pipelines, worker/export failure, compare toggles, cache clear/bounds.
- Performance: approved workload contribution drops by the agreed amount, with raw before/
  after reports and no allocation/retention regression at 200² or 1024².
- Existing worker/capture tests pass unchanged or become stricter for a discovered bug.

## Done evidence

For each optimisation record original cost, new cost, delta, workload/build/machine, and why
ownership remains safe. `npm run check` passes; relevant benchmark rows are run without
weakening budgets. If a lead is immaterial, leave it unchanged and record rejection.

## Fresh-chat starting point

Read the completed M5-PERF-10/12 evidence, M5C decision, this file, and current ownership
tests. Implement one measured cost at a time so attribution survives. Stop if the required
change would weaken core purity, transfer safety, or protected fixtures.
