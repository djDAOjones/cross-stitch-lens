# M13-PROF-03 — Backend end-to-end comparison: TS, WASM and WebGPU

## Outcome

Measure overlapping backends on production browser workloads with every setup,
copy, dispatch and readback cost included. Publish crossovers and validity results
that confirm or contradict each current routing rule. This is a comparison and
defect-discovery ticket; it does not wire a backend.

## Backend coverage is not symmetric

Do not produce a misleading “TS vs WASM vs WebGPU” table for algorithms they do
not all implement:

| Operation | TS reference | WASM | WebGPU |
| --- | --- | --- | --- |
| Exact area resize | yes | no | no |
| LUT construction | yes | no | yes, GPU-first in cache |
| LUT palette map | yes | no | implemented but not routed |
| Floyd–Steinberg, strength 1 | yes | yes | no |
| Other M8 methods / strengths | yes | no | no |

The meaningful comparisons are therefore TS↔WASM for exact Floyd–Steinberg,
TS↔WebGPU for LUT build, and TS↔WebGPU for no-dither LUT mapping. Resize and the
other M8 methods provide TS baselines only. A missing backend is “not implemented”
or “unsupported”, never zero.

## Current routing and blockers

`routeDither` is categorical: Floyd–Steinberg/strength 1 with Lab → TS, RGB →
WASM; all other algorithms/strengths → TS. It takes precedence over the recorded
selection map, so `setSelectedBackend` is not a complete manual force mechanism.
The dev docs mention `?backend=`, but no production URL override is wired.

WebGPU LUT build is already selected inside `ensureLut`. `mapPaletteGpu` remains
an async standalone probe because M5 measured only about a 1.4× warm win on a
17 ms stage and declined executor asyncification. Post-M7 it has another hard
gap: it returns RGBA pixels **without `PixelBuffer.indices`**. Routing it as-is
would erase thread identity even if its colours were byte-identical. Any future
candidate must return the exact palette-index sidecar and preserve empty-cell
semantics before speed is relevant.

## Cost boundaries

For WASM separate module fetch/init/compile, palette flatten/Lab derivation,
wasm-bindgen input copies, Rust execution, result/getter copies and sidecar
adoption. M5 found boundary copies immaterial relative to old Rust execution, but
that predates the M8 surface and must be rechecked only on the overlapping path.

For WebGPU separate device acquisition, shader/pipeline creation, palette/LUT/
pixel buffer creation and upload, bind/encode/submit, GPU execution, staging
copy, `mapAsync`/readback, result conversion and resource destruction. Warm rows
must reuse only resources the proposed production design would actually retain;
do not hide per-frame setup by hand-caching it in the harness.

Measure CPU wall time end to end. Where `timestamp-query` is supported, also
report GPU pass time, after requesting the optional feature. Timestamp queries
are optional and precision-reduced; absence is `unsupported`. Never replace the
user-visible wall boundary with GPU execution time.

## Matrix and comparison rules

- Production build, real Worker and real GPU/WASM on the target Mac; Node may
  explain Rust/TS components but cannot settle browser crossovers.
- Grids around plausible crossovers (for example 96, 200, 300, 512, 1024), p64
  and actual p489, both metrics, opaque/alpha and realistic source/config.
- Cold and warm LUT cases; first backend initialisation separately from steady
  frames. Interleave candidates to share thermal and GC noise.
- Compare complete preview-update and export boundaries as well as isolated
  operation cost. A 5 ms stage win may disappear in queue/copy/draw overhead.
- Run unavailable/device-lost/compile-error/invalid-result paths and confirm TS
  fallback answers each request exactly once.

Every timing row carries output validation. WASM Floyd–Steinberg must be bit
exact to TS including indices and transparent cells. GPU mapping with the same
LUT should be byte exact including indices; GPU LUT construction must pass the
established bin-agreement/tie tolerance and all-zero trap. A fast invalid kernel
is a defect, not a win.

## Override design for the audit

Prefer an explicit harness-only backend selector carried in the measurement
request or direct candidate call. If a dev-only app override is justified, it
must be visible in diagnostics, non-persistent, unable to affect project files,
and still fall back safely. Do not add user-facing backend controls or let an
override substitute a different dither algorithm.

## Likely implementation surface

- `src/bench-browser.ts`, bv2 browser report utilities and `bench.html` controls.
- `src/backends/wasm/dither.ts`, `src/backends/webgpu/{device,reduce,wgsl}.ts`
  as measurement subjects; no production edits unless a separate defect is filed.
- `src/worker/backend-select.ts`, executor/router/protocol for harness forcing and
  phase timings only.
- backend parity suites, routing audit, `tests/wasm-dither.test.ts` and
  `tests/webgpu-lut.test.ts` for validity guards.

## Exit criteria

Publish end-to-end distributions and crossovers on both sides of every proposed
threshold, a backend capability/validity table, and a verdict for each current
rule: confirmed, contradicted or insufficient evidence. Call out sidecar,
async-response or fallback defects separately. No routing change lands here.

## Fresh-chat starting point

Read D39/D46/D48/D62/D63, `docs/browser-measurement.md`, then trace executor
routing and both adapters. Start by writing the operation-overlap table and
validity oracles; do not begin with a three-column speed chart.

## External references

- [WebGPU](https://gpuweb.github.io/gpuweb/) defines queue completion,
  map/readback, optional timestamp queries and reduced timer precision.
- [`GPUSupportedFeatures`](https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures)
  documents feature detection and the `timestamp-query` opt-in requirement.
