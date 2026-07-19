# M5-PERF-13 — Decompose dither colour conversion

## Question

How much of Exact Floyd–Steinberg time is spent converting each evolving work colour
from sRGB to Lab, and which lookup/approximation candidates preserve or deliberately
bound their effect after error propagation?

## Current path

Every dithered pixel clamps three `Float32Array` work values, then `nearestIndex()` calls
The sRGB-to-Lab conversion performs three sRGB transfer functions (`Math.pow` above
the linear threshold), an XYZ matrix, and up to three cube roots. The Rust port mirrors
this with `libm` to achieve D40's bit-exact TS/WASM parity. Unlike plain reduction,
dither work values are fractional because prior error is diffused, so a 256-entry table
is not Exact unless matching inputs are first rounded.

## Experiments

- Isolate clamp, three transfer functions, matrix, Lab `f(t)`/cube roots, and the rest
  of nearest search using representative evolving work values captured from Exact runs.
- Compare TS and Rust at 200/300/1024, RGB and Lab metrics, 64/533 palettes, serpentine
  both ways. Attribute cost; do not infer it only from operation counts.
- Candidate A: exact-preserving transformations/caching for repeated values, if any.
  Candidate B: integer-round before match + 256-entry channel→linear table. Candidate C:
  denser interpolation/quantisation tables. State which changes the creative algorithm.
- Measure local Lab error, selected-index changes, first divergence, final pixel/channel
  differences, spatial propagation, and representative visual thresholds. Error diffusion
  means a tiny first change can alter many later pixels; aggregate Δ alone is insufficient.

## Correctness constraints

Exact appearance is frozen and must keep bit-exact TS/Rust output. Approximate conversion
belongs only to an approved Balanced/Responsive contract with independent fixtures.
Strict first-minimum tie behaviour and Float32 work-buffer semantics must remain explicit.
Do not regenerate protected golden fixtures during the spike.

## Likely files and exit

Trace `core/color/convert.ts`, `color/lut.ts`, `pipeline/dither.ts`, Rust `lib.rs`, colour
conversion/dither/WASM tests, and the benchmark. Exit with per-suboperation timings,
candidate cost/quality tables, propagation examples, and a recommendation into M5C.

## Fresh-chat starting point

Read D39/D40/D43 and the shared leads. Build measurement around values captured from the
real dither loop rather than uniformly random RGB alone. Keep experimental algorithms in
scratch; record enough evidence for M5-PERF-22 or M5-MODE-02 to implement safely.
