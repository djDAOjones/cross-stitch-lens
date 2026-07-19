# M5-PERF-22 — Implement Exact dither acceleration

## Entry conditions

Only transformations proven by M5-PERF-13/14 and approved in M5C may enter Exact. Exact
appearance is frozen: TS and Rust output stays bit-exact, including first-index ties and
error propagation. Approximate conversion/search belongs in M5-MODE-02/03.

## Current contract and likely shape

Both backends use a Float32 work buffer, clamp fractional work values, exact RGB/Lab nearest
matching, strict `<` palette-order ties, serpentine Floyd–Steinberg weights, unchanged alpha,
and no per-pixel allocation. Rust uses `libm` to mirror V8 math. D40 parity spans golden,
metrics, scan modes, noise, and the 533-colour palette.

The leading approved candidate is exact candidate pruning/table lookup whose exclusion proof
holds for every value represented and whose candidate iteration preserves palette order.
Do not assume a 15-bit winner LUT is exact for fractional dither values. Shared generated
tables must have deterministic construction, bounded memory, content-correct invalidation,
and equivalent TS/Rust representation.

## Tests

- Expanded parity at tolerance zero: TS versus Rust over 64/533 palettes, RGB/Lab,
  serpentine/raster, gradients/noise/hard edges/alpha, near ties, duplicate colours, and
  adversarial candidate-bin boundaries.
- Exact differential: baseline reference matcher versus accelerated matcher for exhaustive
  bounded domains or a proof-backed adversarial corpus; first-index ties explicit.
- Purity/boundary: empty-invalid palette policy, 1×1, maximum grid, unchanged input/alpha,
  unavailable WASM and stale selection fall back to TS.
- Performance: table build, memory, candidate coverage, steady stage and whole pipeline.

Do not modify protected golden expected files. Add parity/regression fixtures around them.

## Likely files and done evidence

`color/lut.ts` or a narrowly named exact-search module in core, `pipeline/dither.ts`, Rust
`lib.rs`, WASM adapter if preparation crosses the boundary, parity/dither tests, benchmark.
No unsafe Rust or runtime dependency without approval. Done when zero-difference suite and
the agreed cost reduction pass in both backends and `npm run check` is green.

## Fresh-chat starting point

Read D39/D40, completed 13/14 evidence, M5C, and existing parity tests. Implement TS first as
ground truth, then Rust against the same corpus. Stop immediately on unexplained one-byte
drift rather than adjusting tolerance.
