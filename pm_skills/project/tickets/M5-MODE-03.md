# M5-MODE-03 — Implement Responsive processing

## Contingency gate

Proceed only if M5C/M5-MODE-01 retain Responsive because Balanced cannot meet the approved
live-capture target at demanding grids. Otherwise cut this ticket with evidence and ensure
M5-MODE-06 retains the current dither-off draft fallback.

## Contract constraints

Responsive is an explicit user-selected creative mode with an honest quality limit, not the
temporary adaptive-draft state. It applies to export when selected. The TS reference remains
mandatory and deterministic; automatic backend selection stays invisible. Define whether the
approved algorithm is LUT-quantised Floyd–Steinberg, ordered/Bayer dithering, or another measured
candidate—do not combine candidates casually.

Ordered dither is parallel and LUT-friendly but is a new creative algorithm, expands UI/fixture/
parity acceptance, and must take an explicit deterministic matrix/phase. Quantised FS preserves
the broad error-diffusion style but approximate winner changes propagate. M5B evidence must compare
visual behaviour and full boundary cost, not just kernel speed.

## Tests and evidence

- Independent Responsive fixtures across gradients, artwork, hard edges, alpha, 64/533 palettes,
  metrics and relevant scan/matrix settings; Exact/Balanced fixtures remain untouched.
- TS/backend parity under the approved exact/tolerance rule; feature-unavailable fallback produces
  the same mode semantics rather than silently switching creative mode.
- Representative visual comparisons against thresholds, including patterns/artefacts and stitch-
  colour distribution—not only aggregate error.
- 200/300/1024 live and export performance; end-to-end responsiveness, drops, idle/active costs;
  selected Responsive export equals independent full-quality Responsive run.

## Likely files and done evidence

Mode parameter resolver, narrowly scoped core stage/helper, Rust/WebGPU backend only if justified,
fixtures/tests/benchmark, exports via config. UI/persistence/adaptive wiring remain 04–06. No runtime
dependency. Done only when the conditional business case, fixtures/parity, visual review inputs,
and performance target all pass with `npm run check` green.

## Fresh-chat starting point

First read the M5C/MODE-01 retain-or-cut decision. If retained, use the named algorithm and oracle;
if missing, stop. Implement TS ground truth before acceleration and do not make adaptive draft the
only way Responsive can run.
