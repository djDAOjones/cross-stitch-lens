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

1. ~~One quiet-desktop run~~ **Landed 2026-08-08**: the armed
   quiet-gap run (D130) validated both legs first attempt on
   `6e79c78` — canonical reports in `bench-reports/`, headlines
   quoted in `docs/performance-evidence.md` → D129 section. Re-runs
   any time via `npm run bench:auto -- --when-quiet` (canonical
   names stay valid-only; stamped files carry every attempt).
2. **Owner Part-A′ verdict** — the cross-check evidence is captured
   (2026-08-08, build `52300de`, both legs valid attempt 1, fully
   zero-click): picker-granted vs flag-granted medians ratio
   0.98×/0.99×/1.01× (live 300²/200²/interaction), 4.0 updates/sec
   both sides, interaction protocol misses 2 vs 3 (the known
   double-rAF race, both sides). Provenance stated honestly: the
   picker leg used the real picker dialog (grant path independent of
   the flags) with the clicks scripted via System Events
   (Accessibility) — the picker driver's anatomy notes live in
   `scripts/bench-auto.mjs` (`clickPickerWhenUp`; Chrome-151 paths,
   re-probe on Chrome update). What remains is only the owner's
   call: say "holds" (or ask for a hand-clicked run first) — the
   recording session then writes the cross-check to the decision log
   and automated capture rows become canon.

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
- Unflagged, a no-gesture `getDisplayMedia` **shows the picker and
  pends** (proven 2026-08-08: the picker leg waited the full timeout
  with no report) — so the picker-granted cross-check leg works with
  exactly one click, scripted or human.

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
