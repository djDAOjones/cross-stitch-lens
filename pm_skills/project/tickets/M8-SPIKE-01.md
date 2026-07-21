# M8-SPIKE-01 — Alternative-dither research spike

## Outcome

Produce a decision-ready comparison of alternative dithering methods for
cross-stitch output. The spike selects a small set worth shipping, identifies
the controls each genuinely needs, records visual and performance evidence, and
does not change production behaviour.

## Current baseline

`src/core/pipeline/dither.ts` is the TypeScript ground truth for deterministic
Floyd–Steinberg error diffusion. It supports raster or serpentine traversal,
uses explicit typed-array error buffers, preserves transparent cells, and maps
through the configured RGB or Lab metric. The worker can route that same
algorithm to WASM; no alternative algorithm exists in the pipeline, project
schema, worker protocol, or UI. Candidate pruning and the ordered-palette cache
are already important performance infrastructure.

The current golden and matrix suites prove Floyd–Steinberg behaviour. Files in
`tests/golden/**` are protected: do not edit, regenerate, or add assumptions to
that corpus without the owner's explicit approval and stated algorithm reason.

## Candidate families

Research families, not a long undifferentiated menu:

- **Error diffusion:** Atkinson, Jarvis–Judice–Ninke, Stucki, and a compact
  Sierra variant. These retain local error feedback but differ in kernel size,
  tone retention, directional texture, scratch memory, and sequential cost.
- **Ordered dithering:** small Bayer matrices. Each cell is independent once a
  threshold matrix and phase are fixed, so this family is deterministic,
  parallel-friendly, and likely cheaper, but its repeating texture may be too
  mechanical for stitching.
- **Blue-noise threshold pattern:** a fixed, reviewed threshold tile rather than
  runtime randomness. It may reduce obvious periodic structure while retaining
  pointwise execution, but introduces an asset/provenance question and needs a
  defined phase/seed contract.
- **No dither:** retain as the mandatory control condition.

Do not assume every named method deserves a product control. The spike should
recommend the smallest perceptually distinct set.

## Evaluation method

Create a disposable benchmark/gallery harness outside the production dispatch
path. Use fixed source fixtures representing gradients, flat graphic shapes,
skin/organic tones, high-frequency detail, transparent edges, near-palette
colours, and tiny grids. Compare at realistic stitch sizes and palette sizes;
document source, grid, palette, metric, parameters, backend, and build identity.

Record:

- deterministic output and strict membership in the active palette;
- average/perceptual colour error, tonal bias, edge damage, and alpha handling;
- stitch-oriented structure such as isolated single stitches, connected runs,
  directional artefacts, and repeating threshold patterns;
- cold preparation and warm frame time at the existing benchmark boundaries;
- qualitative owner judgement from identical side-by-side crops.

Numeric scores help find regressions but do not decide aesthetic quality. Keep
the original image, no-dither result, current Floyd–Steinberg result, and each
candidate under the same viewing scale.

## Decision gates

The output should answer:

1. Which methods are materially different and useful for this product?
2. Which controls are inherent to each method (kernel, matrix size, strength,
   phase/seed, serpentine) rather than generic-looking knobs?
3. Can each candidate meet the TypeScript live budget at target grids?
4. Which candidates could later use the existing WASM/WebGPU backends without
   changing their output contract?
5. What exact fixtures and tolerance policy would protect each selected method?

Adding a backend is out of scope until a selected TypeScript reference misses a
recorded budget. Scratch implementations must not become hidden production
paths.

## Likely research surface

`tests/audits/candidates/`, `tests/audits/`, the benchmark harness and report,
plus a checked-in Markdown evidence report if the implementation task needs a
durable artefact. Avoid schema, UI, worker-routing, and export changes during the
spike.

## References

- Requirements: `docs/requirements.md` §8 and §23.
- [Floyd and Steinberg paper record](https://isgwww.cs.uni-magdeburg.de/~stefans/npr/entry-Floyd-1976-AAS.html).
- [Jarvis, Judice and Ninke paper](https://www.sciencedirect.com/science/article/pii/S0146664X76800032).
- [Bayer ordered-dither bibliographic record](https://ndlsearch.ndl.go.jp/en/books/R100000136-I1570009749134624128).
- [Digital halftone-method review](https://cv.ulichney.com/papers/2000-halftoning-review.pdf).
