# M5-ACCEPT-03 — Rehearse live Photoshop capture

## Maintainer gate

This is a real macOS/Photoshop/browser rehearsal owned by the maintainer. An AI chat prepares the run,
checks diagnostics, records measurements and observations, and classifies failures; it cannot simulate
screen-capture permission, real editing feel, or visual latency.

## Setup

Use the canonical runtime recovery command and verify the app shell is ready. Record app/build identity,
Mac model/OS, browser/version, display/DPR, Photoshop document/window/source dimensions, crop/grid/palette,
processing mode, backend diagnostics, compare/grid state, and capture permission state. Use a production
build if the approved procedure supports it; otherwise state dev-build overhead.

Prepare realistic actions: idle document; brush strokes and fills; layer visibility; transforms/pan/zoom;
rapid edits; crop change; mode/control change; split compare toggle/drag; pause/resume; export during capture;
and sustained demanding 1024 work. Repeat typical 200/300 separately from ceiling stress.

## Evidence

Collect preview update throughput, source-to-visible p50/p95 latency under the approved boundary, processed/
skipped/dropped counts at pump and client, queue/compute/render contributions, draft transitions/recovery,
active backend, idle/active CPU and memory, and errors. Pair numbers with maintainer judgement (“keeps up”,
“lag noticeable”, artefact/disruption). `requestVideoFrameCallback` cadence is not itself processed output rate.

## Behaviour checks

Permission remains user initiated; crop stays aligned; static content becomes source-unchanged/cheap; latest
wins without stale flashes; controls remain responsive; compare aligns; draft is visibly named and stable;
pause truly stops work and resumes; selected mode/persistence/export remain correct; failures recover or give
actionable status. Export during draft must use selected creative mode at full execution quality.

## Classification and exit

Classify each miss as correctness bug, measurement defect, performance implementation gap, environment limit,
or approved budget/quality decision—never silently retune the gate. Create reproducible follow-up tickets with
workload/build/trace. Exit only when typical editing feels accepted and ceiling expectations are explicitly
recorded, with residual risks passed to ACCEPT-04/05.

## Fresh-chat starting point

Read completed PERF-16/17/18/19, MODE-06, ACCEPT-01/02, and the browser procedure. Produce a one-page rehearsal
checklist and stay in evidence-recording mode while the maintainer performs actions.
