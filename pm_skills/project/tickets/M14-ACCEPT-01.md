# M14-ACCEPT-01 — Maintainer end review

## Outcome

The single human gate the milestone deferred everything to (D73): the
owner judges look, feel and taste over the assembled evidence and a
live session, and the verdict is recorded. Everything before this was
machine-verifiable; this is the part only the owner can do.

## Review pack (assembled by the agent before the session)

One entry point in `ui-evidence.md` linking:

- What changed, phase by phase, in plain language.
- Every M14 decision-log entry (regrouping, tiers, tokens, sample
  design, no-tour, terminology policy, any Carbon/AAA adaptations) —
  the decisions taken without sign-off, listed for audit.
- Before/after screenshots per surface (audit pack vs final).
- The waiver list from M14-VERIFY-01 — explicitly flagged, these are
  the standards calls made on the owner's behalf.
- Journey deltas and reachability results from M14-VERIFY-02.
- The byte-identity attestation.
- Open proposals (e.g. a11y dev-dependency, deferred findings routed
  to M11 or the wish-list).

## The session (owner-run; agent prepares the sheet)

A rehearsal sheet in the pack, M13-style, covering:

- First-run feel: cold start on the owner's machine — does the
  novice surface read as intended to fresh eyes?
- Live companion session: real Photoshop capture at a typical grid,
  the narrow companion layout, preview focus — editing feel with the
  new chrome (the ≥ 4 updates/sec promise is M13's to hold; here it
  is "does the UI get out of the way").
- Depth spot-checks: the owner's own real workflows — brand
  restriction, count limits, locks, dither choices, export — do the
  new locations feel convenient or buried?
- Taste: type, spacing, density, colour temperature of the chrome —
  the genuinely subjective residue.
- The waiver list, read and ruled on.
- Fifth-look legs (D110): the recut in-session capture row (Stop no
  longer bar-reachable — the surrendered D108 fixed point), the
  always-open Capture start, the preview header collapse under real
  use, the Grid options modal mid-capture, the EXT-37 chevron waiver,
  and the EXT-36 watch item (a one-time unreproducible uncaught-error
  pair — watch the console during the live session).

## Verdict handling

Pass/fail notes per area, recorded in the decision log. Failures
route to new M14 fix tasks (backlog items with this ticket's notes as
intent) — never silent rework, never relitigating recorded decisions
without a note saying why. The milestone closes when the owner's
notes say pass and `check` is green on the final tree.

## Fresh-chat starting point (for the pack-assembly agent)

Read D73, both verify sections of `ui-evidence.md`, and the M14
decision-log entries. Assemble the pack, then hand the rehearsal
sheet to the owner — the session itself is theirs.

## Sixth-look additions (D111/D112 — appended 2026-08-07)

Further live-session legs the sixth-look triage named for this gate
(carried here from the backlog line at the D119 refactor):

- The real region drag under the unlocked default (D107's aspect-off
  shape — unit-tested geometry, never yet owner-driven).
- The entire-screen picker hint (EXT-19) and the D105-copy tension
  EXT-19 leaves (choose-a-window expectation copy vs the monitor
  hint).
- The sixth look's named trades, once EXT-38..44 ship:
  recovery-without-Capture-frame (EXT-38), off-viewport status at
  narrow (EXT-39), and the Zoom naming beside the preview's zoom
  (EXT-40).

## Post-ship additions (D121 — appended 2026-08-07)

The sixth look shipped (EXT-38..44); the trades above are now live.
Concrete legs and judgement calls this run added:

- **Freeze live legs** (EXT-38): freeze → unfreeze during a real
  capture; kill the pump (stop sharing from the OS side mid-frame if
  reproducible) and recover via the single Unfreeze press.
- **Zoom live leg** (EXT-40): drag the Zoom slider mid-session
  (unlocked) and judge the "N×" factor + helper against the preview
  strip's zoom percentage one panel away.
- **"Capture" over a still image** (EXT-40/A): the standing section
  holds Zoom + Size for still-image users under the owner's word
  "Capture" — judge whether the name stretches too far without a
  session ("Source & size" was the alternative).
- **"Colours used" vs "Colours in use"** (EXT-41): the section name
  and the Stats row are near-twins naming different things (the
  table vs a count); the owner's wording stands unless it reads as a
  duplicate live.
- **The flattened aside** (EXT-41/B): the settings column now sits
  flat on the page — judge whether the section dividers alone hold
  the column together in both schemes.
- **The parked steppers cut** (EXT-42): removing − / + would reverse
  the owner's own EXT-29 ask; parked as their call, with the count
  cluster now one packed row-set.
