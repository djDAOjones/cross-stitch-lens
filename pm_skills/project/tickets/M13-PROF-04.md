# M13-PROF-04 — Live-path profile: capture, scheduling and preview

## Outcome

Produce an end-to-end latency decomposition for real 200²/300² live capture,
with cadence, stale/dropped behaviour and failure recovery quantified against the
four-updates-per-second promise. The output is a browser trace plus ranked
findings and defect tickets; no capture, scheduler or renderer optimisation lands.

## The current sequence

```text
video frame callback
  → 64² draw/readback/hash → DirtyGate
  → crop draw/full getImageData
  → retained masterImage + explicit typed-array copy
  → PumpGate / PipelineClient Coalescer
  → Worker cache preparation → resize → reduce or dither
  → ImageData → createImageBitmap → worker OffscreenCanvas draw
  → result transfer → main-thread stats/panels/status
```

There are two independent latest-wins gates. `PumpGate` allows one grab in flight
plus one pending video frame; `Coalescer` allows one Worker job plus one pending
job. A frame can be dropped at either layer. The pump advances only after a
processed result; every Worker request must answer once or live preview wedges.

Dirty detection deliberately samples only 64² pixels. Small edits can average
away before hashing, so `DirtyGate` forces a refresh after 2 seconds. This is
bounded staleness, not exact change detection. Draft mode observes the sum of
stage timings—not queue, capture or draw—and disables dithering after two frames
over 200 ms, restoring after five under 100 ms. Profile what that signal misses.

## Timing decomposition

Use M13-MEAS-02's correlated Window/Worker timestamps. Record callback wait,
dirty sample draw/readback/hash, full crop draw/readback, retained copy, time in
each gate/pending slot, Worker message adoption, cache preparation, each stage,
bitmap creation, preview draw, response transfer, stats and DOM update. Report
the measured `preview-update` and controlled-source `interaction` boundaries
directly—never as a sum of these medians.

`requestVideoFrameCallback` metadata characterises source cadence and missed
callbacks, but it is not output throughput. Capture-source `frameRate`, width,
height and `displaySurface` settings belong in the environment record. The app
cannot limit the user's source choice before permission and must not pretend all
window/monitor capture behaves alike.

## Workloads and adversarial cases

- Photoshop window and monitor capture at 200²/300², p64/p489, no dither and all
  shipped methods; typical settings first, 1024² only as synthesis-defined stress.
- Static document, small brush marks, slow continuous strokes, fills, transforms,
  rapid edits and alternating high/low detail. Freeze repeatable cases where
  possible so algorithms see identical pixels.
- Full-size and small crops, crop move/resize, DPR/display changes, compare off/on,
  grid/ticks off/on, profiling surface open/closed and narrow companion layout.
- Pause/resume, capture end, permission decline, rVFC fallback, hidden/background
  page, Worker error, GPU device loss, failed bitmap and export during capture.
- Draft entry/recovery: record source-to-visible latency and output method on every
  transition, confirm the badge/status is truthful, and confirm exports ignore it.

For dirty detection, replay controlled edits from 1 px/subtle through clearly
visible regions and report detection probability/latency plus forced-refresh
rate. Do not “fix” misses by increasing hash size during the profile.

## Counter invariants

Over a fixed interval reconcile source callbacks into dirty skips, pump drops,
full grabs, Worker drops, results and errors. The exact equation depends on stop/
pending state, so snapshot both gates at interval end. Report rates as well as
lifetime totals. Every accepted job ends in result/error; every draft transition
has a triggering run; an unchanged period still has the documented forced refresh.

## Main-thread responsiveness

The engine is Worker-owned, but full capture readback/copy, stats and DOM work are
main-thread. Use a production DevTools Performance trace and feature-detected
PerformanceObserver entries to find long tasks/input delay while the pump runs.
Check zoom, pan and controls during heavy processing. A fast Worker with a blocked
main thread does not meet the product promise.

## Likely implementation surface

- M13-MEAS-02 instrumentation in `src/capture/{pump,dirty,session,draft}.ts`,
  `src/worker/{client,coalesce,router,preview-surface}.ts` and `src/main.ts`.
- Existing capture/gate tests for deterministic counter and error paths.
- Browser harness/report and a documented Photoshop rehearsal sheet.
- Read-only DevTools traces; captured pixels and Photoshop content stay out of
  committed reports and diagnostics.

## Exit criteria

Publish p50/p95/max end-to-end latency at 200²/300², an accountable phase
decomposition, source/accepted/displayed rates, both drop rates, dirty miss/stale
figures, draft behaviour, main-thread responsiveness and failure recovery. Pair
real Photoshop numbers with the maintainer's observed editing feel but reserve
acceptance for M13-ACCEPT-02. File reproducible defects; do not tune policy here.

## Fresh-chat starting point

Read D46/D48/D53/D63, architecture “Worker & scheduling”, the bv2 browser
contract, and the four capture modules. Draw the two-gate state sequence before
instrumenting. Use a controlled capture surface first, then Photoshop; never use
callback rate or stage time as a visible-update proxy.

## External references

- [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
  defines frame metadata and its synchronisation limits.
- [Screen Capture](https://www.w3.org/TR/screen-capture/) defines surface choice,
  post-selection constraints, frame decimation and track settings.
- [Long Tasks API](https://www.w3.org/TR/longtasks-1/) provides a main-thread
  blocking signal; feature-detect it and keep the trace authoritative.

## Carried in from M13-PROF-02 (2026-07-23, D68)

Confirm selection-source contention on the real capture path: the
worker-side answer is published (still-pump probe — an overlapping
full-RGB export delays a frame by ≤ one export, ~51 ms, zero drops),
but the pump-side half (grab/dirty-sample cost racing the export on the
main thread during live capture) needs this ticket's live leg. One
targeted window with `ensureSelectionSource` triggered mid-stream is
enough.

## Status 2026-07-23 (D70) — gestureless half done, owner session next

Published: dirty-detection probability by edit size (size-blind knee at
16–32 px, contrast irrelevant), per-tick sample cost (< 0.1 ms), and
`computeStats` at 2.0 ms/frame — report
`browser-bench-v0.5.0_20260723.c68e2c3-livepath.json`, evidence in
`docs/performance-evidence.md`. The harness live legs now record the
main-thread decomposition (dirty/grab medians), long tasks, timestamped
draft transitions, track `frameRate`/`displaySurface`, a 200² window
(button 6b), and one mid-stream selection-source export with overlap
analysis (the D68 carry-in).

Remaining — needs the owner's capture gesture: the rehearsal sheet in
`docs/browser-measurement.md` → "The M13-PROF-04 owner session"
(controlled-source windows at 300²/200², Photoshop content cases, the
DevTools-trace app-side half, adversarial/recovery checks). Close the
item on that session's numbers plus owner notes; acceptance stays
M13-ACCEPT-02.

## Status 2026-08-07 (D128) — re-validated on the current build; owner session is the sole remainder

M14/M15 churned ~3k lines through the live-path surfaces after the
D70 report, so the gestureless legs were re-run on `d7218be`
(`bench-reports/browser-bench-v0.5.0_20260807.d7218be-auto.json`;
evidence in `docs/performance-evidence.md` → the D128 section): every
load-bearing figure replicates (dirty knee 16–32 px, per-tick
< 0.1 ms, stats 2.2 ms, selection-source export 50.6 ms mid-pump),
GPU agreement/device-loss/export byte-identity re-proven, and the D72
fixes show up truthfully in the rows. The rehearsal sheet is repaired
against the shipped M14 surface (pause/resume is now Freeze/Unfreeze;
harness buttons 4–8/3d verified unchanged). Remaining: unchanged —
the owner capture session above.

## Status 2026-08-08 (D129–D133) — sitting shrunk to Parts B + C residue

The sheet's automation landed after D128: the capture legs and edit
classes are `bench:auto` canon (D129; Part A′ held at D131), and
Part C's trace half is `bench:trace` (D133 — per-window GC with
observer long tasks quoted, controlled-source only). Remaining: the
owner sitting — Part B (Photoshop content) and Part C's human
residue (the Photoshop-content app trace, adversarial/recovery
checks). Close on that session's numbers plus owner notes;
acceptance stays M13-ACCEPT-02.
