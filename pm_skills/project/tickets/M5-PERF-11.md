# M5-PERF-11 — Audit resize

## Question

Which resize implementation best preserves the current creative/alpha contract while
meeting an honest CPU or accelerated budget across source sizes and modes?

## Reference behaviour

`resize.ts` is the pure TS oracle. It maps source rectangles to 1–1024 stitch grids in
stretch/contain/cover/fit modes, performs exact area averaging in premultiplied alpha,
leaves uncovered cells transparent, and rounds through `Uint8ClampedArray`. The current
`sampleArea` nests every covered source pixel for every output cell; downscaling a large
source therefore grows with source footprint. Existing tests cover modes, boundaries,
alpha, purity, and golden output.

## Candidates to compare

- Separable horizontal/vertical area averaging: natural CPU reference candidate, but
  summation order and intermediate rounding/precision can change bytes.
- Summed-area/integral image: attractive for large box regions, but fractional edge
  coverage, four premultiplied channels, memory, and contain/cover geometry complicate it.
- `OffscreenCanvas.drawImage`: browser/GPU-backed and simple, but browser resampling is
  implementation-defined relative to the TS oracle and cannot satisfy the node budget
  row. Measure quality and alpha edges rather than assuming equivalence.
- WebGPU compute: consider only if profile beats CPU including upload/readback and has a
  clear fallback; no speculative backend commitment.

## Experiment matrix and oracle

Measure source smaller/equal/larger than grid, extreme aspect ratios, all four modes,
opaque and translucent hard edges, 200/300/1024 grids, and realistic crop dimensions.
Report cold setup, steady-state time, allocations, and peak memory. Compare exact bytes,
max/mean channel error, alpha-boundary error, and representative visual differences.
Contain/fit centring and transparent letterbox cells must remain exact.

## Decision outputs

Recommend the pure TS reference and the complete runtime backend strategy, including
which workloads remain CPU-relevant, which favour canvas/WebGPU, and measured crossover
thresholds by source/grid size and mode. Include dispatch, transfer, readback, setup, and
fallback costs rather than selecting a backend from kernel time alone. State the approved
equality/tolerance contract and which mode/budget each backend role binds to.
Golden fixtures are protected: the spike may compare against them but must not regenerate
them. Any changed reference or tolerance requires owner decision through M5C/M5-PERF-21.

Do not recommend deep optimisation of both CPU and GPU paths by default. The TS path must
remain correct and maintained as ground truth; optimise it beyond that only where the
measured routing strategy shows it still owns a meaningful workload range.

## Likely files and fresh-chat start

Read `resize.ts`, `tests/resize.test.ts`, resize golden fixtures, D3/D9/D43, and
`M5-PERF.md`. Prototype candidates only in scratch/benchmark code. Append timings,
memory, correctness tables, and recommendation to the shared evidence file; create
concrete follow-ups instead of shipping spike code. M5-PERF-21 must not begin until this
ticket and M5C have approved the reference, accelerated role, and crossover policy.
