# M5-ACCEPT-01 — Run the correctness and parity matrix

## Purpose

Exercise the approved processing modes, algorithms, backends, and fallbacks in combination.
This is the integrated automated gate: it does not replace visual judgement or live rehearsal.

## Matrix dimensions

Cover backend availability/selection (TS only, WASM available/unavailable/fails, WebGPU available/
unavailable/device failure), every retained mode, RGB/Lab, dither off/on, raster/serpentine,
64/533 palettes plus duplicate/near-tie colours, resize modes, pipeline orders, 1/200/300/1024
grids, opaque/transparent/semitransparent edges, still/live config paths, compare, and export.

Use pairwise/risk-based combinations plus mandatory adversarial rows rather than an explosive
full Cartesian product. Publish a coverage table showing which pair/invariant each row proves.
Stable semantic mode output is the oracle; backend choice must not change it beyond the approved
per-mode tolerance.

## Invariants

- Exact TS/Rust remains bit-exact and protected golden fixtures are unchanged; strict first-index ties,
  alpha, dimensions, palette membership, and input purity hold.
- Balanced/Responsive use their independent fixtures and approved parity/tolerance; unavailable
  acceleration falls back without silently changing creative mode.
- Project save→load→save is byte-identical after migration; selected mode persists while adaptive
  draft/backend does not. Export equals an independent full-quality selected-mode run.
- Worker latest-wins, split alignment, LUT cache correctness, errors, and feature fallback do not
  create stale output or deadlock.

## Likely files and execution

Extend focused core/backend/worker/project/export tests and a small matrix driver if useful; avoid
one opaque mega-test. Golden expected files remain protected. Run `npm run check`, explicit benchmark
reports for performance (not pass criteria here), and production build with optional backends absent.
Real GPU/capture rows may need the documented browser procedure and must report unsupported distinctly.

## Exit evidence

Matrix coverage report, automated results/build identity, explicit skips and reasons, backend/tolerance
summary, and links to failures/rework tickets. No test may be weakened, skipped silently, or replaced by
snapshots. Green correctness is required before ACCEPT-02/03 sign-off.

## Fresh-chat starting point

Read M5C/MODE-01 contracts, PERF-24 suite/report schema, existing golden/parity/project/export tests,
and protected-file rules. Build the coverage map first, then fill gaps with focused invariant tests.
