# M13-ACCEPT-02 — Maintainer live acceptance

## Maintainer gate

This is the human half of M13: real macOS/browser/Photoshop capture, editing feel
against the signed 300² promise, and visual judgement wherever an activated M13
change can alter appearance. An AI chat prepares the build and checklist, watches
diagnostics, records evidence and classifies failures. It cannot approve feel or
taste for the owner.

## Entry conditions and setup

M13-ACCEPT-01 is green and identifies the exact build. Use the documented
production-build measurement command from M13-MEAS-02, not the unminified dev
server unless the session explicitly records why. Verify readiness before asking
for capture permission.

Record app/build/commit, Mac model/macOS, browser/version, power state, display
and DPR, viewport/companion width, Photoshop document/window/capture-surface
dimensions, track settings, crop, pattern grid, palette entry count/identity,
dither config, resize/order, grid/compare state, backend diagnostics and whether
the run is warm/cold. Do not save captured artwork in committed diagnostics.

The browser requires a fresh user choice for `getDisplayMedia`; permission and
Photoshop actions are performed by the maintainer. Confirm the visible capture
indicator and recovery if sharing ends.

## Rehearsal sequence

1. **Still baseline:** import a frozen source and compare preview/export on p64
   and p489, no dither and each shipped method. Confirm labels/settings match what
   appears and the same build produced automated evidence.
2. **Typical live work:** Photoshop capture at 200² then 300². Make small brush
   marks, sustained strokes, fills, layer toggles, transforms and rapid edits.
   Judge whether output keeps up while recording visible-update rate and p50/p95
   interaction latency from the harness.
3. **Methods/backends:** switch Floyd–Steinberg, Atkinson, Jarvis, ordered and
   blue-noise; exercise only backend routes that implement the same operation;
   verify the TS-only fallback session. Backend detail stays diagnostic, not a
   creative control.
4. **Scheduling:** static source/forced refresh, crop move/resize, compare toggle/
   drag, zoom/pan, settings changes, pause/resume, draft entry/recovery, capture
   stop and failure recovery. Watch both drop counters and stale-frame behaviour.
5. **Export during capture:** clean/enlarged PNG, chart and PDF while full quality,
   while draft is visible, and after a cache-changing palette switch. Confirm
   output matches persisted creative config, not temporary preview quality.
6. **Stress:** use only the 1024 and memory/export cases approved at synthesis.
   They test the stated finishing expectation, not an invented live promise.

## Visual review

If M13 ships only byte-exact quality-neutral changes, verify identical frozen
outputs/checksums and look for integration artefacts; do not manufacture a taste
decision. If an appearance-changing option was separately approved, use its
pre-registered side-by-side set and thresholds. Review gradients/banding, noise,
edge damage, transparency, isolated stitches, flat graphics, high-frequency
detail, thread plausibility and the maintainer's own artwork.

Show identical crop/config at stitch-level 1:1 and useful zoom. Randomise/blind
where practical, then run a labelled comprehension pass. Numeric difference
metrics assist but never replace the owner's verdict. Record accept, reject with
observed artefact, workload-limited acceptance or inconclusive/retest.

## UX and accessibility checks

At 320 CSS px and normal companion width, keep preview primary and controls
usable. Keyboard-only: capture controls/crop, dither selects/strength, zoom/pan,
compare, pause and exports; visible focus and ≥44 px targets. Check 200% zoom,
status announcements, paused/unchanged/draft wording, processing/error recovery
and no colour-only backend/status meaning. Routine live updates must not flood
the screen reader or bounded diagnostics buffer.

## Evidence record

For each case capture workload/config ID, action, p50/p95/max or sustained update
rate, callbacks/grabs/skips/forced refreshes/pump drops/Worker drops/results,
draft transitions, active backend, export time/peak observations, owner note and
pass/fail. Numbers without editing judgement do not settle feel; judgement without
build/workload evidence is not reproducible.

Use the redacted diagnostics bundle plus the browser report. Never include raw
pixels, project storage, Photoshop filenames or personal content. A screen
recording may remain local evidence; record its existence and timestamp rather
than committing it by default.

## Failure routing and exit

Classify misses as correctness defect, measurement defect, performance gap,
appearance rejection, environment/browser limit or target decision. Correctness,
valid product-target misses and rejected appearance route back to M13-SYNTH-01 or
the owning implementation; they cannot be signed off by retuning the gate.

Exit only when typical 200²/300² Photoshop editing meets the signed quantitative
target **and** the maintainer accepts the feel, all shipped dither methods remain
usable, fallbacks/recovery/exports pass, and any visual delta has an explicit
owner verdict. Record pass/fail notes and final decision-log sign-off.

## Synthesis agenda additions (M13-SYNTH-01 — D135, 2026-08-08)

Four owner-judgement lines the synthesis deferred here rather than encoding as
code changes; each gets an explicit pass/fail note in the evidence record:

- **Small-stroke latency feel** — ≤ 2 px edits are invisible to dirty
  detection and appear only via the 2 s staleness bound (D70/D128). If the
  feel fails, the first candidate is lowering `DIRTY_MAX_STALE_MS`, not a
  hash redesign.
- **PDF-freeze acceptability** — PDF export blocks the main thread ~0.5 s
  (preview freeze, nothing lost — D71). If rejected, a worker-side PDF
  assembly task is scoped then.
- **Eight-brand cold prep** — if the owner's practice enables many brands
  with lab dither, the first dithered use pays ~1.3–3.3 s of candidate-table
  build (D64/D66). Only judge if the path is actually reached.
- **External-stop prompt salience** — the truthful status line the owner
  found easy to miss (D134; wish-list carries the toast/banner idea).

Visual review runs in no-change mode: everything M13 activated is bit-exact.

## Fresh-chat starting point

Read M13-SYNTH-01, final shared evidence, M13-ACCEPT-01 and the production browser
procedure. Prepare a one-page run sheet and one exact build before involving the
maintainer. Guide one controlled case at a time; do not implement fixes in the
acceptance session.
