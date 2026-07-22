# M13-IMPL-02 — Backend routing and budget rebinding

## Activation gate

Conditional on M13-SYNTH-01. This ticket applies the signed backend roles,
crossover thresholds and target/baseline policy. It does not choose them. If the
synthesis confirms current routing and declines all rebinding, cut or narrow the
ticket to evidence/document updates.

## Outcome

Make runtime backend selection match proven end-to-end crossovers while keeping
correct TS fallback, then bind bv2 regression rows to refreshed clean baselines
and the exact product targets approved at synthesis. Routing and budgets remain
explainable, testable and independent of creative project state.

## Routing contract

- Selection is per **stage/operation and workload**, not one global “GPU mode”.
  A stage with no alternative stays TS.
- A backend is eligible only for the same algorithm/params. The current Rust
  backend is Floyd–Steinberg, strength 1 only; no override may turn Atkinson,
  Jarvis, ordered or blue-noise into Floyd–Steinberg.
- Thresholds need measurements on both sides and should carry hysteresis only if
  routing can oscillate frame to frame. Do not add a size threshold when a
  categorical rule explains every measured row.
- Feature detection and all error paths fall back to TS and answer the Worker
  request exactly once. Device loss/failed init is normal fallback, not a wedged
  gate.
- Backend selection is runtime/diagnostic state. It never persists in a project
  file or changes the user's chosen dither method.

If WebGPU mapping is activated, first close the post-M7 contract gap: return
palette indices with RGBA, preserve alpha/empty cells/strict ties, and keep the
same ordered palette semantics. Making the executor/router asynchronous must
preserve process/export ordering, compare observation and the response invariant. A warm
GPU stage win that excludes upload/readback or loses the sidecar is not eligible.

Any dev-only force control is visibly labelled in diagnostics, non-persistent,
excluded from production by default and safe when the requested backend is
unavailable. It exists to verify routes, not as a user performance control.

## Budget model

Encode the synthesis distinction:

- **Product target rows** use browser-only `preview-update`/`interaction`/`export`
  boundaries and named 300²/1024 workloads. State percentile/rate and environment
  policy explicitly.
- **Regression baselines** bind warm/cold stage/preparation rows to a clean bv2
  report, exact runtime/workload/build and tolerance. Preserve the “too much
  faster means stale” guard or its approved replacement.
- Node never asserts a browser promise through a multiplier. CI tolerance is
  recorded and cannot make a local baseline silently become a target.

Do not weaken a row merely to make `npm run bench` green. A legitimate baseline
change needs the synthesis/decision-log rationale and a report taken on final
code. Reports from bv1 and bv2 are not directly diffed.

## Likely implementation surface

- `src/worker/backend-select.ts`, `execute.ts`, router/protocol and backend adapters
  named by the signed decision.
- backend routing/parity/fallback tests and the production browser harness.
- `tests/bench/run-node.ts`, bv2 budget bindings/report tests and browser target
  assertions or documented gate chosen by synthesis.
- architecture performance budgets, measurement contract, infrastructure command
  table and shared M13 evidence/decision log as required by the approved policy.

No new backend, algorithm, dependency, project schema or appearance option belongs
here. Protected golden fixtures and palette data are untouched.

## Test and failure matrix

Cover each threshold just below/above, exact crossover, p64/p489, 300/1024,
metrics, all dither families/strengths, missing WASM, missing WebGPU, device loss,
shader rejection, invalid GPU result, manual dev force and export. Assert actual
backend in timings plus output parity/sidecar. Test old stale selections fall back
when a backend is unregistered.

Run clean before/after production rows and `npm run bench`; retain reports even
when a target misses. `npm run check` must remain non-mutating and fast—if browser
timing is not CI-stable, deterministic harness/schema/route tests belong in
`check` while timing remains a separate explicit gate.

## Exit criteria

Every routing rule cites M13-PROF-03 crossover evidence, every unavailable/failure
case produces correct TS output, and no method or thread identity is substituted.
Every bound row cites a final bv2 report and approved target/baseline type. Bench,
matrix, fallback and full quality gate are green or the task remains open with the
miss recorded.

## Fresh-chat starting point

Read the signed synthesis backend/target tables, M13-PROF-03 and D46/D48/D62.
Write tests for the decided rules before changing selection. If a sidecar or async
response design was not approved, stop and return it to synthesis rather than
inventing one here.
