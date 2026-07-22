# M13-MEAS-02 — Browser/Worker measurement harness

## Outcome

Extend the production-build browser harness so one documented run emits
boundary-tagged, build-identified rows for `preview-update`, `interaction` and
`export`, plus capture cadence, skipped/stale frames and both latest-wins drop
counters. The harness must measure the shipped Worker route, not call core stages
on the page and label that end to end.

## Confirmed starting point

`bench.html` is already a separate Vite entry and `src/bench-browser.ts` runs in
a production bundle. It currently has an ad-hoc `{name, medianMs, samples}` row
shape, does not use the bv1 report schema/workload IDs, calls stages directly on
the window, and labels its pipeline throughput as only an upper bound on visible
updates. It covers a narrow TS/GPU comparison and real-GPU correctness, not the
three browser-only boundaries.

The real path is split across contexts. Main-thread capture draws a crop into an
`OffscreenCanvas`, reads it back, copies it for retained `masterImage`, and
transfers it through `PipelineClient`. The Worker prepares caches, runs stages,
creates an `ImageBitmap`, draws it on the transferred preview surface, then posts
pixels back. The main thread computes stats and updates DOM status. Pump and
client each have a latest-wins gate; only the client exposes a drop count today.

## Boundary instrumentation

- **Preview update:** start when `PipelineClient.submit` actually starts a job,
  not when a frame merely replaces a pending one. End at the Worker preview draw
  return, matching the current contract; record the later main-thread result/DOM
  completion as a separate diagnostic phase rather than moving the mark silently.
- **Interaction:** a source change in Photoshop is outside the app and has no
  programmatic timestamp. Use a controlled, user-selected capture surface for
  repeatable numbers (a second same-origin window that changes on command), then
  keep real Photoshop interaction as the manual M13-PROF-04/M13-ACCEPT-02 leg.
  Never reconstruct interaction by summing medians.
- **Export:** start at the export request and end when the encoded PNG/chart/PDF
  artefact is ready. Report worker queue/preparation/pipeline, scale/draw, encode
  and PDF assembly as children. `ExportResult` currently omits timings, so the
  protocol or harness needs an additive measurement channel.

Main and Worker have separate `performance.timeOrigin` values. Send absolute
monotonic timestamps as `performance.timeOrigin + performance.now()` (or convert
at collection) before placing them on one timeline. Keep timer resolution in the
environment record; browsers may coarsen it. Use User Timing marks/measures or a
small typed record, clear stored entries between cases, and do not route routine
benchmark samples through the app's bounded diagnostics log.

## Capture counters and metadata

Change `startFramePump` so the harness can observe the `requestVideoFrameCallback`
timestamp and metadata without changing product policy. `presentedFrames` can
show missed callbacks; `expectedDisplayTime` and `presentationTime` characterise
capture cadence. They do not prove that Cross Stitch Lens displayed its result.
Feature-detect metadata and record unsupported values rather than zero.

For every interval report: callbacks, full grabs, accepted processing jobs,
dirty skips, forced-stale refreshes, pump drops, worker-client drops, results,
errors, draft transitions and elapsed duration. Counters need interval snapshots,
not only lifetime totals. A request error must still close its timing span and
release both gates.

## Harness flow

1. Build the production entries and serve them locally; record app/build ID,
   browser/OS, viewport/DPR, visibility, track settings, WebGPU/WASM capability
   and timer resolution.
2. Use a visible Start button for `getDisplayMedia`; the browser must let the
   owner choose a surface each time, so the run cannot auto-select Photoshop.
3. Warm every workload before timing. Run still-input preview rows separately
   from controlled capture rows, then exports while idle and while capture is live.
4. Emit one JSON report compatible with the bv2 vocabulary and a readable table.
   Offer download/copy; do not include captured pixels, filenames or source-window
   content in the report or diagnostics bundle.
5. Mark permission decline, missing WebGPU, unsupported timestamp query, hidden
   page and interrupted run explicitly. No result is encoded as zero.

## Dependency and architecture choices

Prefer native browser APIs and the existing Vite entry. An automated browser
runner would be a new dev dependency and must be proposed separately, with a
clear gain over the user-initiated capture step it cannot remove. Do not add a
server, change port 5173, or expose Vite on the network.

Shared benchmark types currently live under `tests/bench/`; production `src/`
should not casually import test modules. The implementation chat should choose
between moving truly shared, dependency-free report types to a neutral module or
adapting browser output at the edge. Avoid two drifting copies of bv2.

## Likely implementation surface

- `bench.html`, `src/bench-browser.ts` — run UI, workloads and report output.
- `src/worker/protocol.ts`, `client.ts`, `router.ts`, `execute.ts`,
  `preview-surface.ts` — correlation IDs and phase marks, only if needed.
- `src/capture/pump.ts`, `dirty.ts`, `draft.ts` and their tests — observable
  counters/metadata without policy changes.
- shared benchmark report/boundary modules and their unit tests.
- `docs/measurement-contract.md`, `docs/browser-measurement.md`,
  `DEV-INFRASTRUCTURE.md` — production-build command, readiness signal and
  interpretation limits.

## Acceptance evidence

A fresh maintainer can follow one document, reach a visibly ready production
harness, perform the user gesture, and obtain a report containing valid rows for
all three boundaries and the counter conservation checks. Controlled interaction
rows have a known source-change mark; Photoshop rows are honestly manual. Errors,
unsupported features and dropped frames remain visible, and `npm run check`
continues to exercise deterministic schema/counter tests without running noisy
browser timing.

## Fresh-chat starting point

Read `docs/measurement-contract.md`, `docs/browser-measurement.md`, D46/D48/D63,
then trace `PipelineClient.submit` → Worker router → `setFrame` and
`startFramePump` → `pumpGrab`. First draw a timestamp/counter sequence diagram.
Do not start by installing a browser runner or timing direct core calls.

## External references

- [High Resolution Time](https://www.w3.org/TR/hr-time-3/) explains monotonic
  clocks, coarsening and translating timestamps between Window and Worker origins.
- [User Timing](https://www.w3.org/TR/user-timing/) exposes marks and measures in
  both Window and Worker contexts.
- [Screen Capture](https://www.w3.org/TR/screen-capture/) requires the user to
  choose the shared surface and applies constraints only after that choice.
- [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
  documents cadence and `presentedFrames` metadata, and warns that callbacks do
  not strictly guarantee display synchronisation.
