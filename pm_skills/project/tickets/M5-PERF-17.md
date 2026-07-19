# M5-PERF-17 — Audit capture and dirty-frame path

## Question

What does live capture cost when static and changing, and can dirty detection or gate
ordering cause stale frames, collisions, stalls, or avoidable allocation?

## Current path

The pump uses `requestVideoFrameCallback` when available and rAF otherwise. `PumpGate`
permits one grab in flight plus one pending latest frame. Capture draws the selected crop
to a canvas and reads pixels. Dirty detection first draws a 64×64 crop sample and computes
FNV-1a plus a region signature; unchanged frames skip full readback/processing. Draft
governor observes processing duration and temporarily substitutes dither-off under load.

Important dimensions are source video size, crop geometry/device pixel ratio, crop changes,
sample canvas creation/reuse, draw/readback, full `getImageData`, typed-array transfer, and
the two latest-wins gates (pump and worker client). A 32-bit hash can collide; signature
prevents crop-shape reuse but not content collision.

## Measurements and adversarial cases

Report idle/static versus slowly changing versus every-frame-changing costs: callback rate,
sample draw/readback/hash, full draw/readback/copy, accepted/skipped/dropped counts, queue
wait, allocations, CPU, and end-to-end latency. Vary full screen/window sources, crop sizes,
movement, resize/DPR, hidden/background tab, rVFC fallback, pause/resume, track end, permission
loss, and processing errors.

Test crop changes that preserve dimensions, hash collision via injected hash, initial/reset
signature, a frame arriving during dirty sampling, and gate completion on every error path.
Verify a pending newest frame is eventually grabbed and a static source remains cheap.

## Constraints and likely files

Permission remains user-initiated; capture stays on main thread while processing stays in
the worker; dirty sampling cannot mutate crop state; status names unchanged/paused/draft;
diagnostics avoid captured pixels/PII. Trace `capture/pump.ts`, `dirty.ts`, `session.ts`,
`crop.ts`, `draft.ts`, `main.ts`, worker client, diagnostics, and capture tests.

## Exit and fresh-chat start

Exit with idle/active cost breakdown, allocation/lifetime evidence, gate state diagram,
collision/stale/stall findings, and concrete follow-ups. Read D32–D36 and the shared leads
first. Use synthetic/injected browser fakes for deterministic bugs and a real browser for
readback/permission measurements; do not optimise capture in this spike.
