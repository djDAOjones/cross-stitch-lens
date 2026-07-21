# M8-ACCEPT-01 — Alternative-dither acceptance gate

## Outcome

Provide owner-sign-off evidence that the selected dither methods are useful,
correct, comprehensible, and fast in the real capture workflow. The gate is a
verification task, not a place to add another method or tune algorithms without
returning to the relevant implementation ticket.

## Preconditions

M8-SPIKE-01 has a recorded recommendation, M8-ALG-01 implements only that set,
and M8-CTRL-01 exposes the approved controls. All methods pass their automated
correctness suites and the repository quality gate before manual evaluation.

## Automated matrix

Extend the existing acceptance matrix with rows that prove:

- every method and `none`, all supported metrics, default and boundary settings;
- transparent, empty, single-row/column, tiny-grid, gradient, flat-art, and
  high-detail inputs;
- strict membership in the selected palette and stable thread identity after M7;
- deterministic repeat runs, project save/load/migration, worker routing, backend
  fallback, and preview/export agreement;
- current Floyd–Steinberg output remains byte-identical for equivalent old
  settings;
- live and export paths use full-quality method settings, never draft leakage.

Golden fixtures are protected. Agree the new/changed golden set with the owner
and record the algorithm reason before touching `tests/golden/**`.

## Visual acceptance session

Use a fixed, versioned gallery with original, no-dither, current
Floyd–Steinberg, and each selected method at identical grid/palette/zoom. Include
at least one live Photoshop capture and imported fixtures. Review:

- tonal range and colour impression;
- edge/detail retention at stitch scale;
- isolated-stitch noise and stitchable clusters;
- directional, worm-like, repeating, or interference artefacts;
- whether labels/presets predict the visible result;
- whether changing controls remains understandable in a narrow companion window.

Record inputs, settings, app/build identity, browser/macOS, display scaling, and
owner pass/fail notes. Do not declare one method universally “best”; accept that
methods serve different image classes only when the difference is clear and
repeatable.

## Performance and interaction gate

Run the benchmark matrix at documented grid and palette boundaries. Record cold
setup, warm frame processing, end-to-end visible update rate, memory behaviour,
rapid setting changes, stale-frame suppression, and worker responsiveness. A
method that misses budget remains unavailable by default until fixed or a
decision-log proposal changes the budget.

Current live comparison caches one non-dither reference and runs one processed
pipeline. A dither-method A/B view would require two processed outputs or a
frozen comparison. This ticket does not implicitly authorise doubling continuous
worker work. For sign-off, use frozen, repeatable captures or a deliberate test
harness unless a separate design approves live dual processing.

## Manual-only checks

- Real `getDisplayMedia` permission and Photoshop edit-to-preview feedback.
- Visual judgement on representative artwork and calibrated/typical displays.
- Keyboard-only, screen-reader, 200% zoom/reflow, and reduced-motion behaviour.
- PNG, chart, and PDF export inspection against the on-screen selection.
- Browser without WASM/WebGPU availability, proving TypeScript fallback.

## Failure routing

Correctness failures return to M8-ALG-01; misleading controls/presets to
M8-CTRL-01; an unhelpful selected method reopens the spike decision. Record a
budget mismatch as evidence rather than weakening tests or silently routing to a
different algorithm.

## References

- Requirements: `docs/requirements.md` §20 and §23.
- `tests/acceptance-matrix.test.ts`, `tests/matrix/rows.ts`, and
  `tests/bench/boundaries.ts`.
- Decisions D43–D49 and the performance budgets in `architecture.md`.
