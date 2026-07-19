# M5-PERF-23 — Implement approved boundary/backend improvements

## Entry conditions

This is a container for individually approved M5B backend/boundary changes. Each change must
name its source evidence, target workload, expected benefit, complexity threshold, fallback,
correctness oracle, and measured crossover against existing backends. If none clears its
threshold, close the ticket with that evidence.

## Current architecture

TS stage backends are mandatory. WASM dither registers asynchronously and is selected only
after calibration; stale/unavailable choices fall back to TS. WebGPU LUT building is async,
GPU-first in worker cache, with TS fallback and documented near-tie tolerance. The GPU mapping
kernel exists but is not routed because the StageFn/executor contract is synchronous.

Possible approved work may include WASM palette/preparation caching or persistent memory,
representative calibration, GPU LUT cache/device-loss improvements, routing GPU mapping via an
explicit async worker path, or an accelerated resize backend. Do not combine unrelated work
or make the pure core Stage contract asynchronous merely to fit WebGPU.

Routing should be threshold-based rather than choosing one universal winner: small grids may
remain on TS/WASM when GPU setup dominates, while larger resize/reduction workloads may cross
to canvas/WebGPU. Exact sequential Floyd–Steinberg may remain WASM-led. These are hypotheses;
implement only the roles and thresholds approved from M5B/M5C, and keep semantic processing
modes independent of backend choice.

## Required checks per change

- Feature detection, registration/init race, unavailable/device-lost/runtime failure, stale
  selection, and automatic TS fallback with human-readable structured diagnostics.
- Same golden/parity suite: bit-exact for Exact diffusion/integer mapping; only the approved
  documented tolerance for GPU float work. Preview/export consistency.
- Boundary bytes, setup, warm/cold, execution, readback, memory, and end-to-end contribution
  measured at 64/533 and 200/300/1024—not kernel time alone.
- Routing tests immediately below/at/above each crossover, with hysteresis or stable selection
  where noisy measurements could otherwise flap; diagnostics report the backend actually used.
- Production build without Rust/WebGPU succeeds; generated paths are never hand-edited.

## Likely files and done evidence

Scope depends on approvals: WASM adapter/Rust crate, WebGPU device/reduce/WGSL, worker cache/
executor/selection/protocol, tests, benchmark, Vite/check infrastructure. Any new command or
dependency requires explicit approval and infrastructure updates. Land/review each backend
improvement separately with its own before/after report. Avoid duplicating deep TS and GPU
optimisation unless evidence shows both serve material workload ranges.

## Fresh-chat starting point

Read completed tickets 11/12/15/16, M5C, D39–D42, and current backend tests. Extract the exact
approved individual change before planning. Preserve automatic selection and TS fallback; decline any
unmeasured “GPU/WASM should be faster” proposal.
