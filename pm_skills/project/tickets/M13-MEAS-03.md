# M13-MEAS-03 — Automate the owner-session legs

## Outcome

Shrink the PROF-04/05 owner session to its genuinely human legs —
real-Photoshop content and feel notes — by automating every
mechanisable leg. Tier 1 uses launch flags only (no new
dependencies); the Tier-2 driver dependency is an explicit owner
decision, not a default. Source: the 2026-08-07 automation
assessment following the D128 re-baseline.

## Tier 1 — flags only, no new dependencies

- **Probe the capture auto-select flags** on the installed Chrome
  (`--auto-select-window-capture-source-by-title`,
  `--use-fake-ui-for-media-stream`) and record exact behaviour and
  version — flag semantics vary by Chrome release, so this is the
  first step and a cheap kill-switch for the whole tier.
- **Capture legs in auto mode**: extend `runAuto` with the
  capture-dependent legs (buttons 5/6/6b/7 equivalents) gated on a
  flag-granted stream sharing the controlled source window. Every
  self-incrimination guard stays load-bearing: visibility in the env
  row, `zeroFrameReason`, the surface-width warning. A dedicated
  flagged instance, never the daily browser.
- **Part D's core question without DevTools**: run the mem leg in a
  Chrome launched with `--js-flags=--expose-gc`; after the 5 s idle
  reading, force GC and re-read the heap. If the 74.8 MiB residue
  drops it was lazy major GC; if it stays it is real retention.
  Labelled diagnostic per the PROF-05 rules — reachability evidence,
  never production pause behaviour.
- **Optional Part-B approximation**: teach `bench-source.html` the
  six edit classes (1 px marks, slow stroke, large fill, transform,
  rapid scatter, hands-off) as commanded repaint patterns.
  Controlled-source numbers only — never presented as Photoshop
  capture behaviour, which is the reason Part B exists.
- **Procedure honesty**: `docs/browser-measurement.md` records
  flag-granted capture as a sanctioned variant noted in each run's
  environment record; the first automated capture report is
  cross-checked against one manual run before its rows are quoted as
  canon; the variant gets a decision-log line.

## Tier 2 — CDP driver (needs owner dependency approval first)

A Playwright (or raw CDP) dev dependency would add: Part C
Performance traces recorded and parsed programmatically (long tasks,
GC pauses from the trace JSON), the in-page adversarial legs driven
end-to-end, and true heap-snapshot pairs plus allocation sampling
for Part D. Two legs stay approximate regardless: ending capture
from the browser bar (page-side `track.stop()` is a proxy) and the
declined re-prompt. Do not start this tier without the recorded
approval — it is a new dev dependency and a maintenance surface the
lean manual sheet deliberately avoided.

## What stays human by policy

Perceived feel and pass/fail notes (M13-ACCEPT-02's gate),
real-Photoshop editing as the honest Part B, and the SYNTH-01
judgement itself. Automated runs need a real visible window on an
awake desktop — this becomes "one command, leave the machine alone
for a few minutes", never headless CI.

## Done when

One command produces valid (untainted, visible-window) capture-leg
and forced-GC reports on an awake desktop; the rehearsal sheet
shrinks to the human legs; the flag-granted variant is
decision-logged with its manual cross-check recorded.
