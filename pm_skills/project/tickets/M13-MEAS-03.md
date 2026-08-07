# M13-MEAS-03 — Automate the owner-session legs

## State (2026-08-08, D129)

Tier 1 shipped: `npm run bench:auto` builds, serves, launches a
dedicated flagged Chrome twice, collects and validates the
capture-leg and mem reports (`scripts/bench-auto.mjs` +
`bench-auto-validate.mjs`). Sheet shrunk; variant decision-logged;
D71 answered in mechanism (lazy major GC — forced GC collapses the
idle residue to 11.5 MiB every run). Engineering runs were refused
by the validity gate for hidden windows on an in-use desktop — the
refusal is the gate working, not a defect.

## Remaining

1. **One quiet-desktop run** of `npm run bench:auto` (machine awake,
   both Chrome windows left visible for ~6 minutes) to produce the
   first valid (untainted, visible) capture-leg artefact. Any
   session can run it; the launcher self-validates and exits
   non-zero on anything less.
2. **Owner Part-A′ cross-check** (shrunk sheet,
   `docs/browser-measurement.md`): one manual Part-A run compared
   against the automated capture report on the same build, recorded
   in the decision log. Only after it holds do automated capture
   rows enter canon. Watch item for that comparison: the automated
   interaction run counts protocol misses (a captured frame can
   beat the source's double-rAF paint reply; the then-static
   surface presents nothing until the next change) — expect a
   misses-counted row, not 8/8.

## Probed flag semantics (Chrome 151.0.7922.77, 2026-08-07)

- `--auto-select-window-capture-source-by-title=<substring>` alone:
  `getDisplayMedia` resolves gestureless and pickerless, selecting a
  window by title substring **system-wide** — hence the in-page
  content guard (commanded verification changes, captured pixels
  checked) before any row is measured; it overrides the shipped
  `displaySurface: 'monitor'` hint; `displaySurface` reports
  `window`.
- `--use-fake-ui-for-media-stream`: breaks capture on this release
  (`NotReadableError` ~100 ms) — excluded.
- `window.open` without a gesture needs `--disable-popup-blocking`.
- Semantics vary by release: re-probe on a Chrome update before
  trusting a run (the launcher's validation catches the failure
  modes).

## Tier 2 — CDP driver (needs owner dependency approval first)

Unchanged from scoping: a Playwright/raw-CDP dev dependency would
add programmatic Part-C traces (long tasks, GC pauses), end-to-end
adversarial legs, and true heap-snapshot pairs. Two legs stay
approximate regardless (browser-bar stop, declined re-prompt). Do
not start without the recorded approval.

## What stays human by policy

Perceived feel and pass/fail notes (M13-ACCEPT-02), real-Photoshop
editing as the honest Part B (the `.edit-<class>` rows approximate
it on the controlled source and are never quoted as Photoshop
behaviour), and the SYNTH-01 judgement.
