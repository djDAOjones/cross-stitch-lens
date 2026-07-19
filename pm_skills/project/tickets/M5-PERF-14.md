# M5-PERF-14 — Decompose dither nearest-colour search

## Question

Which search structure reduces per-pixel 64/533-colour matching while preserving Exact
winner and first-index tie semantics, and what build/memory costs make it worthwhile?

## Current oracle

`nearestIndex()` scans palette entries in order, computes squared RGB or ΔE76 distance,
and updates only on strict `<`; equal distances therefore keep the first palette index.
Both TS and Rust implement this and D40 proves parity over current fixtures. Dither calls
the exact matcher for fractional evolving work colours; the 15-bit plain-reduction LUT
is not an Exact substitute.

## Candidates

- Provably exact pruning seeded by 15-bit bin or spatial bounds, with candidates retained
  in palette order and a proof that excluded entries cannot win for any value in the bin.
- k-d tree/vantage/spatial search in RGB or Lab; verify exactness, tie traversal, and the
  effect of only three dimensions against small (64) and medium (533) palettes.
- Quantised LUT matching as an explicitly approximate mode, including memory/table-build
  choices and interaction with fractional work values.
- Palette-specific winner/candidate tables. Measure preparation and invalidation; do not
  hide their cost in a warm benchmark.

## Evidence matrix

Use exhaustive or adversarial boundary/near-tie samples plus evolving work values from
gradients, noise, alpha edges, and artwork. Record candidate count distribution, winner
coverage, exact mismatch count, first-index tie cases, build time, memory, steady search,
and end-to-end propagation. Test RGB/Lab, 64/533, serpentine directions, TS/Rust.

## Constraints and dependencies

Exact candidates must be bit-exact, deterministic, allocation-free per pixel, and shared
conceptually across TS/Rust. Approximate search belongs to a processing mode approved by
M5C. Conversion cost from M5-PERF-13 must be reported separately so search speedup is not
mistaken for the whole dither solution.

## Likely files and fresh-chat start

Read `color/lut.ts`, metrics, `pipeline/dither.ts`, Rust `lib.rs`, palette construction,
parity tests, D39/D40, and `M5-PERF.md`. Prototype in scratch and append evidence. Exit
with an exactness argument/test corpus, cost table, and concrete recommendation; do not
land data structures in this spike.
