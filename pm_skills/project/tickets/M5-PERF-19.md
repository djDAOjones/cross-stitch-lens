# M5-PERF-19 — Audit export isolation

## Question

Prove exports use the project's chosen creative algorithm at full execution quality and
characterise maximum-grid latency, memory, encoding, and contention with live preview.

## Current path

`PipelineClient.exportFrame()` transfers a caller-supplied buffer to an export request that
bypasses coalescing. The same worker awaits LUT preparation and calls the normal executor, but bypasses
preview draw and `lastFrame`. Export results have no timings. Main-thread exporters then
scale/flatten/encode PNG, render a styled chart, or assemble a PDF. `MAX_OUTPUT_SIDE=16384`
clamps PNG/chart dimensions; large scale factors can allocate very large typed arrays and
canvas backing stores. Exports share worker time/cache with live preview.

The current adaptive draft substitution is applied before config submission in live paths;
export callers must use stable project config, never the temporary draft config. Processing
modes will add a second distinction: selected creative mode persists and applies to export,
while adaptive execution substitutions do not.

## Audit matrix

- Exact/Balanced/Responsive when available, dither on/off, RGB/Lab, 64/533 palettes,
  200/300/1024 grids, alpha, each resize/order, backend availability/fallback.
- Export while preview idle/live/draft/paused and with compare on; multiple export requests;
  failure/cancel-like navigation; LUT miss/device loss; maximum legal PNG/chart/PDF sizes.
- Report queue wait, pipeline, scaling, flattening, chart draw, PNG encode, PDF assembly,
  download readiness, peak memory, retained objects, and preview latency/drops separately.

## Oracles and constraints

Compare exported grid pixels to an independent full-quality pipeline run under the selected
mode. Preview draft state must not change bytes. Save/load must preserve selected intent;
export must not mutate config/source; palette counts/key stay consistent; transparent and
solid alpha handling remain correct. Browser-only canvas limits/failures need actionable UI
errors and structured diagnostics without image data.

## Likely files and exit

Trace worker client/protocol/entry/executor, draft/main config selection, project persistence,
`export/png.ts`, `chart.ts`, `pdf.ts`, UI handlers, and export/project tests. Exit with an
isolation proof matrix, latency/memory breakdown, contention findings, and concrete follow-ups.

## Fresh-chat starting point

Read export invariants in AGENTS, M5 mode provisional decisions, D24–D31, and shared leads.
Instrument without altering scheduling. Any change to export semantics waits for M5C/MODE
contracts; this spike reports facts and defects.
