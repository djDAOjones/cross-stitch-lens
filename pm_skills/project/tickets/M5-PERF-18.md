# M5-PERF-18 — Audit preview rendering and UI work

## Question

Can the browser prove responsive main-thread behaviour and an honest preview-render cost
when bitmap conversion, canvas drawing, overlays, stats, diagnostics, zoom, and compare
redraws are separated from worker compute?

## Current path

After processing, the worker wraps returned pixels in `ImageData`, awaits
`createImageBitmap`, stores/closes bitmaps, and draws on a transferred OffscreenCanvas.
`draw()` clears the entire surface, draws output and optional compare, recomputes/draws grid
lines/ticks, and divider. View, grid, surface resize, compare, or frame changes trigger full
redraw. The worker then transfers pixels back so the main thread can compute/render stats
and update the rolling profiling panel. Node tests cover geometry/models, not real draw cost.

## Browser trace

Measure separately: ImageData wrapper, bitmap creation wait, clear/output draw, compare draw,
grid geometry and fills, ticks/text, divider, bitmap close, result return, stats calculation,
DOM updates, profiling aggregation/render, ResizeObserver/view messages, and input latency.
Run 200/300/1024, zoomed in/out, grid/ticks off/on, compare off/on, static redraw and live
frames, profiling panel closed/open, high DPR, and rapid zoom/pan/control input.

Report p50/p95/max, long tasks/input responsiveness, draw frequency, CPU utilisation, and
whether the ≤5 ms budget means worker canvas draw only or bitmap-to-visible completion
(M5-PERF-02 must decide). Do not use worker compute timings as a render proxy.

## Correctness and UX constraints

Stitches remain crisp (`imageSmoothingEnabled=false`); overlays retain pixel snapping,
adaptive hiding/thinning, correct compare seam, and sRGB fidelity. The canvas and controls
remain keyboard operable, focus-visible, ≥44 px targets, and honest about paused/unchanged/
draft state. Diagnostics are dev-only and bounded; no scattered console logging.

## Likely files and exit

Trace `preview-surface.ts`, `grid.ts`, `ui/preview.ts`, viewport, info/debug panels,
`main.ts`, stats, worker client/protocol, CSS, and tests. Exit with a written production-build
browser procedure, per-component timing table, responsiveness evidence, and ranked hot-path
or bug tickets. No rendering rewrite belongs in the audit.

## Fresh-chat starting point

Read D19–D23, D38, UI-STANDARDS live/canvas/diagnostics rules, ticket 02, and shared leads.
Use real-browser profiling; node cannot validate OffscreenCanvas compositor behaviour.
