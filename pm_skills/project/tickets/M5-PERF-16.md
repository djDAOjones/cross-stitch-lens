# M5-PERF-16 — Audit worker scheduling and split compare

## Question

Does the latest-wins worker path minimise latency without stale results or hidden duplicate
work, especially when split compare, LUT preparation, exports, and view redraws overlap?

## Current scheduling

`PipelineClient` allows one preview request in flight and one latest pending job. Pixel
buffers transfer to the worker; results transfer back. The worker awaits LUT preparation,
runs synchronously, creates an ImageBitmap, draws, then posts the result. It retains the
last source buffer/config. Enabling compare or processing while compare is enabled runs a
second `fullRgbVariant()` pipeline and creates a second bitmap. View/grid/resize messages
redraw the retained frame without reprocessing. Exports bypass coalescing but share the
same worker event loop.

Async closures inside `onmessage` can overlap at await boundaries. The client policy normally
serialises preview requests, but exports, LUT awaits, compare messages, and bitmap promises
need explicit ordering analysis. Result IDs protect client matching, not necessarily which
bitmap becomes the visible worker surface.

## Trace matrix

Instrument source-presented, capture accepted, client queued/posted, worker received, LUT
wait, compute start/end, bitmap requested/resolved, draw complete, result received, and UI
status. Record throughput, end-to-end p50/p95, queue time, drops, and stale-result checks.
Run compare off/on/toggled mid-flight; view/zoom churn; LUT hit/miss; fast and slow grids;
export during live capture; pause/resume; and worker errors.

For video cadence, `requestVideoFrameCallback()` is intended for per-presented-frame video
work: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback>.
Do not confuse callback cadence with visible processed-update latency.

## Correctness constraints and outputs

Latest wins; no unbounded queue; stale work must not replace a newer visible frame; exports
are one-to-one and do not alter preview state; split source/output align cell-for-cell;
buffers are transferred safely; errors release the coalescer. Quantify compare's extra
resize/adjust work and whether the full-RGB result can be reused safely.

Trace `client.ts`, `coalesce.ts`, `pipeline-worker.ts`, protocol, executor, LUT cache,
preview surface, capture pump, and tests. Exit with an event timeline/state diagram,
race reproductions or proof, compare overhead, and separate bug/optimisation tickets.

## Fresh-chat starting point

Read D34/D38/D41/D42, `M5-PERF.md`, and scheduling tests. Add diagnostic correlation IDs
only if needed and keep logs bounded/redacted. This is an audit: do not restructure the
worker while investigating.
