# M5-PERF-12 — Audit LUT construction and colour reduction

## Question

Separate LUT build, cache behaviour, and per-pixel mapping so TS/WebGPU choices can be
made on complete cost and correctness evidence rather than the current combined story.

## Current implementation

The TS LUT builds 32,768 15-bit RGB bins against every palette entry using RGB or Lab.
Reduction maps each pixel through the resulting `Uint16Array`. `ensureLut()` is async,
GPU-first, and worker-awaited; `getLut()` is the synchronous TS safety net. D41 permits
GPU/TS differences only for near ties and keeps mapping through a fixed LUT bit-exact.

The cache key is `palette.name:entries.length:metric`. Two palettes with the same name
and count but different colours collide, producing stale output. Custom palette editing
is post-MVP, but the key is already a latent correctness hazard and mode work may create
new cache dimensions. Cache hits persist for the worker lifetime with no bound.

## Measurements and checks

- Report palette RGB/Lab preparation, TS/GPU LUT build, GPU submission/execution/readback,
  cache lookup, and 200/300/1024 pixel mapping separately for 64 and 533 colours.
- Test cold miss, warm hit, metric change, equal-name/equal-count content change, device
  unavailable/lost/failure, concurrent ensure calls, and fallback output.
- Compare the complete LUT: disagreement count/rate, distance margin, first-index tie
  behaviour, and downstream output on representative images—not only random bins.
- Record GPU adapter/features and distinguish CPU wall time from GPU timestamps. The
  WebGPU timestamp feature is optional: <https://gpuweb.github.io/gpuweb/#timestamp-query>.

## Candidate decisions

Consider a deterministic palette-content fingerprint plus metric/mode/version in the
key; in-flight promise deduplication; bounded cache or single-active-config ownership;
cached flattened RGB/Lab data; and whether GPU LUT build clears a worthwhile threshold
after readback. Avoid object identity because project load recreates objects, and avoid
weak keys that conceal content changes.

For per-pixel mapping, recommend workload-based TS/WebGPU roles and crossover thresholds
that include dispatch, upload/readback, and result ownership. Do not deeply optimise the
TS mapping loop and then route around it without evidence that both paths retain meaningful
workload ranges; equally, do not route the existing GPU kernel merely because it exists.

## Constraints, files, and exit

TS remains the fallback/oracle; near-tie tolerance must stay documented; preview and
export for one configuration must agree; failures must log and fall back. Trace
`color/lut.ts`, `palette.ts`, `pipeline/reduce.ts`, `worker/lut-cache.ts`, WebGPU files,
worker scheduling, and LUT tests. Exit with cache-correctness proof, cost tables, output
diff evidence, and ranked follow-up tickets.

## Fresh-chat starting point

Read D41/D42, `M5-PERF.md`, LUT/cache/WebGPU tests, and this file. Reproduce the stale-key
case first, then benchmark each boundary; do not route the not-yet-routed GPU map kernel as
part of the audit. Feed the measured routing decision into M5C and M5-PERF-23.
