# M13-MEAS-04 — Automate Part C: the CDP trace leg

Opened 2026-08-08 on the owner's Tier-2 dependency approval (D132),
porting the Tier-2 notes from the shipped M13-MEAS-03 ticket.

## Outcome

`bench:auto` grows a trace leg: the launcher attaches to its own
flagged Chrome over CDP, records tracing while the harness runs the
driven live-capture windows (plus one mid-window export), and
publishes a validated trace report — GC pauses (M13-PROF-05's
remaining line), long tasks and main-thread accountability under
live load (M13-PROF-04's Part C, trace half). The owner sitting
shrinks to Part B + the genuinely human Part-C residue.

## Dependency stance (D132)

Raw CDP over Node's **built-in WebSocket** first — engines pin
Node ≥ 22.18, so no new package is needed for the socket. The
approved dev dependency (`ws` / `playwright-core`) is held in
reserve and taken only if raw CDP proves insufficient; the approval
is already recorded (D132), so taking it needs no new sitting.

## Design as built (2026-08-08 — probed on Chrome 151, then implemented)

- `launchChrome` gains `--remote-debugging-port=0` on the trace leg;
  the launcher reads `DevToolsActivePort` from the temp profile and
  connects over Node's **global WebSocket** (`scripts/bench-cdp.mjs`
  — zero new dependencies; the D132 approval stays in reserve).
- Tracing runs at the **browser** level, streamed
  (`ReturnAsStream` + `IO.read` — no giant WebSocket frames), with
  the probed-affordable categories
  `devtools.timeline,blink.user_timing,v8`. Probe evidence
  (2026-08-08): `toplevel` costs ~38k events / 9.6 MB per 6 s — an
  observer effect on the measurement instance — so **the trace
  records no task envelopes** and long tasks stay with the in-page
  PerformanceObserver numbers already in the capture rows, quoted
  per window with their source named. `disabled-by-default-v8.gc`
  adds only sub-phase noise (double-counting risk) and is excluded.
- Renderer identification: `TracingStartedInBrowser` frame data was
  **absent** in the probe (and 12 `CrRendererMain` threads existed),
  so the bench renderer **self-identifies from the harness's own
  marks** (majority vote over `bench:` User Timing events).
- Windows: `markWindow` in `src/bench-browser.ts` brackets each live
  window, edit-class window and the interaction run with
  `bench:<workloadId>:<boundary>:<start|end>` marks; pairing is
  strict and unpaired marks are a validation failure, never a
  guessed range.
- GC accounting (pure, `scripts/bench-trace-lib.mjs`, unit-tested):
  three buckets on the bench main thread — `MinorGC` / `MajorGC`
  complete events and `V8.GCIncrementalMarking` step slices —
  reported count/total/max per window and whole-leg, never summed
  into one number (a marking step is main-thread work, not a
  stop-the-world pause). A pause is attributed to the window where
  it **began**; straddlers are never double-counted.
- Report: the leg's page report POSTs as today (env row, visibility,
  content guard all load-bearing); the launcher merges its
  extraction into one `…-trace.json` envelope — stamped +
  canonical-on-valid exactly like the other legs — gated by
  `validateTraceReport` (page half via the capture gate, plus:
  no trace-buffer data loss, renderer identified, all nine windows
  paired, nonzero GC accounting across the leg).
- The raw trace stays **local** (large, may embed window titles) in
  a `traces` subfolder of `bench-reports` (whole dir already
  gitignored); the merged report names it for re-inspection.
- Timing rows recorded under tracing are **cross-context evidence**,
  never capture canon — the report's product is the GC accounting.

## Remaining

One valid quiet-desktop artefact: `npm run bench:trace` (compose
with `-- --when-quiet` once armed the same way as the other legs —
the flag composes; engineering runs on a busy desktop validate the
machinery but their reports stay stamped-only). When it lands,
quote the GC headline in `docs/performance-evidence.md` and update
the PROF-05 status line; PROF-04/05's Part C then carries only the
human residue (Photoshop-content trace, adversarial feel).

## Honesty rules (carried whole from MEAS-03, D129/D131)

- Controlled-source numbers only — never quoted as Photoshop
  behaviour; Photoshop-content traces remain human Part C work.
- The content guard, visibility/env row and `zeroFrameReason` stay
  load-bearing on the trace leg; a tainted page report taints the
  trace report.
- **Rows measured under tracing are labelled and never replace the
  untraced capture canon** — the trace report quotes trace-derived
  numbers (pauses, long tasks); its `preview-update` medians are
  cross-context evidence only.
- Flag semantics re-probe on Chrome update (D129) applies unchanged.

## Second slice (in scope for the item, not necessarily the first PR)

App-UI responsiveness trace: drive `index.html` (not the harness)
under flag-granted capture — zoom/pan/compare/grid toggles via CDP
`Input.dispatchMouseEvent` on the preview canvas, one export
mid-edit — same extraction. This is the automatable remainder of
the sheet's Part C; the human residue after it is Photoshop content
and adversarial feel.

## What stays human regardless (ported Tier-2 notes, D129)

Browser-bar stop and the declined re-prompt stay approximate under
any driver; perceived feel, pass/fail notes and every acceptance
verdict stay with M13-ACCEPT-02 / SYNTH-01. True heap-snapshot
pairs are retired anyway (D129's lazy-GC answer) unless a run
reports real retention.
