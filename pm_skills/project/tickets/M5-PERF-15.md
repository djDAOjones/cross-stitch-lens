# M5-PERF-15 — Audit WASM boundary and generated code

## Question

What portion of a WASM dither call is JS preparation/copy/allocation/glue versus Rust
execution, and is persistent memory or SIMD justified after algorithmic costs are known?

## Current boundary

`src/backends/wasm/dither.ts` flattens palette RGB per call and invokes wasm-bindgen with
the input byte view, dimensions, palette bytes, metric flag, and serpentine flag. Generated
glue copies inputs into WASM linear memory and returns an output vector that becomes a new
JS `Uint8ClampedArray`; at 1024², pixel input plus output alone is roughly 8 MB. The Rust
implementation allocates output, a three-channel float work buffer, and palette Lab data.
Registration is async/fire-and-forget; one-shot calibration uses 96² DMC and may not
represent 1024² boundary costs.

## Measurements

Separate adapter palette conversion, JS→WASM copies, wasm allocation/growth, Rust setup,
hot loop, output handoff/copy, and JS wrapping. Record first-call module/JIT cost apart
from warm calls. Compare 200/300/1024, 64/533, both metrics/scan modes, and repeated calls
with stable versus changing palettes. Inspect emitted `.wasm` size/opcodes and memory
growth, but never edit generated `pkg` output.

Repeat calibration workloads and compare their backend winner with representative matrix
rows. Test unavailable/stub/module-init failure and memory pressure. Algorithmic findings
from M5-PERF-13/14 should land before attributing residual cost to the boundary.

## Candidate thresholds

Evaluate cached palette buffers, persistent reusable WASM allocations/views, direct writes,
and `simd128` only when measured boundary/residual loop cost is material. Account for view
invalidation when `WebAssembly.Memory` grows and preserve safe ownership; SharedArrayBuffer
or threads require separate cross-origin-isolation complexity and are out of scope absent
profile evidence.

## Constraints, files, and exit

Keep `#![forbid(unsafe_code)]`, bit-exact parity, TS fallback, feature detection, and the
toolchain-aware check. Trace the adapter, generated glue read-only, Rust crate, Vite alias,
check script, calibration, and WASM tests. Exit with a boundary timeline/byte table,
representative calibration recommendation, emitted-code findings, and justified follow-ups.

## Fresh-chat starting point

Read D39/D40/D42/D43 and tickets 13/14. Build without hand-editing `crates/stitch-engine/pkg`.
Measure copies explicitly before proposing zero-copy or SIMD; keep any inspection scripts
non-mutating and outside generated paths.
