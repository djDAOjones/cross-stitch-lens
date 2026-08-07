# M13-PROF-05 — Memory, GC and export contention

## Outcome

Publish a per-frame allocation census, retained-memory/GC profile and peak export
memory/contention report. Rank reuse candidates by measured bytes and pauses,
and re-prove export full-quality isolation. This ticket profiles ownership and
lifetime; it does not introduce pooling or change export scheduling.

## Current ownership map

Live capture creates/reuses very different resources:

- the 64² dirty-sample canvas/context is module-reused; a full crop grab creates a
  new `OffscreenCanvas` and `ImageData` every time;
- `main.ts` retains `masterImage` and makes another full typed-array copy before
  transferring a live frame, so capture pixels have at least two main-thread
  lifetimes around submission;
- resize allocates grid RGBA; reduce allocates RGBA + `Uint16Array` indices;
  dither allocates RGBA + indices while its 3-channel `Float32Array` work buffer
  grows once and is reused in the single Worker;
- palette RGB/Lab arrays are re-derived per stage call; LUT and candidate tables
  are retained in bounded LRUs; compare can retain a second `ImageBitmap` and
  copies the post-resize RGBA into a donated `ImageData`;
- Worker result transfer detaches its buffers, then the main thread retains the
  newest output for stats/UI until references fall away.

Do not copy the old bv1 allocation row: it still lists an identity-adjust clone
that built pipelines no longer execute and counts only obvious typed arrays.

## Export peak model

Every export first copies the source on the main thread, transfers it to the same
Worker, and receives a full-quality grid RGBA + optional indices. Clean PNG may
allocate integer-scaled RGBA then another flattened RGBA; chart PNG allocates
scaled cells, flattened cells, canvas backing and encoded Blob; PDF also holds
chart Blob/ArrayBuffer, embedded raster, pdf-lib structures and final bytes.

The legal 16,384-pixel canvas edge can still imply a very large buffer. A
16,384² RGBA surface is about 1 GiB before temporary copies or browser backing
overhead, so “within the side limit” is not a safe peak-memory guarantee. Measure
real clamped configurations and stop before destabilising the machine; record
failed allocations as failures, not missing data.

Exports bypass preview coalescing and use the same Worker/cache. The router starts
each async request independently; synchronous pipeline work serialises by
blocking the Worker event loop, while LUT promises and multiple export messages
can overlap in less obvious ways. Measure export queue/wait, preview latency and
drops during clean PNG, chart and PDF, including two rapid export requests.

## Measurement method

1. Count deterministic typed-array/canvas dimensions at each phase for 200²,
   300², 1024² and representative export scales. State whether bytes are newly
   allocated, reused, transferred/detached, retained or graphics-memory estimates.
2. Use Chrome DevTools allocation sampling for low-overhead long live runs,
   allocation instrumentation for focused actions, and before/after heap snapshots
   to find retained objects. Pair with a Performance trace for GC pauses.
3. Repeat a fixed sequence (for example 300 live frames, compare toggle cycles,
   then each export) and check that retained memory reaches a plateau after
   natural GC. Forced-GC snapshots may diagnose reachability but are labelled and
   never presented as production pause behaviour.
4. In Node component audits, `process.memoryUsage().arrayBuffers` can corroborate
   typed-array deltas, but it is process/runtime evidence, not browser peak memory.
5. `measureUserAgentSpecificMemory()` is experimental, Chromium-limited and
   requires cross-origin isolation. This project does not send COOP/COEP today;
   do not change deployment/security headers merely to make a profiling API work.

## Correctness and contention cases

- still/live/draft/paused preview; compare off/on; p64/p489; every dither family;
- transparent/solid clean PNG at small and maximum practical scales; chart at
  practical and clamped cells; A4/Letter PDF with small/large keys;
- export during active capture, during a cache miss, after GPU loss, and two
  exports quickly; navigation/track end while work is pending;
- TS-only fallback and accelerated overlapping paths.

For each export, compare the grid buffer byte-for-byte with an independent
full-quality run under the persisted project config. Draft state, last preview,
cache warmth and concurrent capture must not change it. Check thread indices/key,
alpha/background and save/load output invariants. Peak-memory relief never permits
preview-quality settings to leak into export.

## Likely implementation surface

- instrumentation around `CaptureSession.grabFrame`, `PipelineClient`, Worker
  router/executor/cache and `main.ts` export handlers;
- `src/core/pipeline/{resize,reduce,dither}.ts`, palette derivation and compare
  surface as read-only allocation subjects;
- `src/export/{png,chart,pdf}.ts` and export tests; runtime audit extensions;
- a browser procedure and regenerable JSON summary. Heap snapshots/traces are
  local evidence and should not commit captured artwork or large binary profiles.

## Exit criteria

Publish per-phase bytes/lifetimes, retained plateaus, GC pause evidence, practical
peak memory for each export, preview contention/drops, and ranked candidates whose
potential saving is measured. Re-prove export isolation and classify any failure
as correctness, leak, browser limit or scheduling contention. Pooling, new workers,
streaming encoders and output caps remain synthesis decisions.

## Fresh-chat starting point

Read the export invariant in AGENTS, D48/D49/D63, then trace capture buffer
ownership through transfer and each export handler. Write the ownership table
before opening DevTools; it prevents double-counting transferred views and
missing graphics resources.

## External references

- [Chrome DevTools Memory panel](https://developer.chrome.com/docs/devtools/memory)
  distinguishes heap snapshots, allocation instrumentation and sampling.
- [`measureUserAgentSpecificMemory`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory)
  documents limited support and cross-origin-isolation requirements.
- [`transferToImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/transferToImageBitmap)
  explains that unconsumed graphics resources should be explicitly closed.
- [Node `process.memoryUsage`](https://nodejs.org/api/process.html#processmemoryusage)
  defines `arrayBuffers` and its process/thread interpretation.

## Status 2026-07-23 (D71) — gestureless half done, owner session next

Published: the allocation census (two crop-sized main-thread buffers
are ~93% of 300² per-frame churn — ranked reuse candidates), export
isolation EXACT under idle/pump/draft/rapid-×2, contention (exports
starve the main thread — 527 ms PDF assembly freezes the pump — never
the worker; zero drops), peak probes (chart cell 10 at 1024² ≈ 430 MB
backing twice over; clean ×16 at the 16,384 px edge succeeds, ~2.1 GB
transient), and M13-DEF-02 (chart past the canvas edge dies on a
silently zeroed canvas). Report
`browser-bench-v0.5.0_20260723.5494a8d-mem.json`; evidence in
`docs/performance-evidence.md`.

Remaining — rides the PROF-04 owner session (rehearsal sheet, Parts
C/D): the DevTools snapshot pair for the post-export ~75 MiB idle
residue (lazy GC vs retention), allocation sampling over a live
window, GC pauses off the Part C trace.

## Status 2026-08-07 (D128) — mem leg re-run on the current build

`?auto=mem` re-run on `d7218be`
(`bench-reports/browser-bench-v0.5.0_20260807.d7218be-mem.json`):
isolation EXACT everywhere again; the export step leaves **74.8 MiB**
unreclaimed after 5 s idle — the same number to the decimal as
20260723, so the snapshot-pair question rides Part D unchanged; chart
cell 16 now publishes `not-measured` via the D72 refusal instead of
dying (M13-DEF-02 closed-and-proven); peak probes 1.2–1.6× slower on
single stress runs, read as machine load, not regression (export diff
since the banked build is only the D72 guards + D124 key labels).
Remaining: unchanged — the snapshot pair + GC-pause trace riding
Parts C/D.
