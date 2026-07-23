# M14-IMPL-04 — First-run & guidance layer

## Outcome

A cold start becomes self-explanatory: every panel has an intentional
empty state, the two entry actions (import, capture) plus a generated
sample source make the first conversion reachable through visible
affordances alone, and non-obvious controls carry contextual help.
Milestone rules per D73.

## Scope

- **Empty states** (UI-STANDARDS demands them; the audit lists the
  gaps): every panel distinguishes "nothing yet" / "filtered out" /
  "failed to load" / "not available", says what belongs here and what
  to do next, and keeps layout stable. The Colour panel's conflict
  list pattern (aria-live, severity as words) is the house style for
  announced state.
- **First-run path**: on cold start the preview region presents the
  entry actions per the spec's first-run section — import a still,
  start capture (with what the permission prompt will ask, before it
  is user-triggered; never on load), and "try a sample".
- **Sample source**: a deterministic generated image (drawn
  programmatically — gradient/test-card with enough hue and detail
  range to show palette reduction and dithering visibly; explicit
  seed if randomness is used). Lives in `src/ui/` (not `src/core/`),
  feeds the normal import route as a `PixelBuffer`, is labelled as a
  sample, and adds no asset or dependency. It exercises the true
  pipeline — nothing mocked.
- **Contextual help**: helper text/tooltips per the spec for the
  controls the journeys flagged (dither strength, count limit, owned
  only, the four resolutions, processing order...). Carbon tooltip
  anatomy, keyboard-reachable, `aria-describedby`-linked; helper text
  only where it prevents error, clarifies format or explains
  consequence.
- **Status honesty check**: paused, source unchanged, draft-labelled
  preview, busy — present and announced per UI-STANDARDS
  "Live-processing UX" (most exist; close the audit's gaps).

## Out of scope

A modal tour or overlay walkthrough — rejected: it traps, it ages, it
violates minimalist design; inline affordances are the pattern.
(Record this in the decision log.) Final copywriting (M14-IMPL-05 —
this task lands structure with reasonable text).

## Verification

Cold-start walk with cleared storage: journey 1 completes with no
external instruction, sample route included, at the spec's step
target. Every panel visited in every empty-state variant (drive
"failed" via the existing error paths, e.g. library store fallback).
Tooltips keyboard-reachable; announcements fire (tree + live-region
check). Persistence untouched: project files round-trip byte-identical.
`check` green.

## Exit criteria

No blank or ambiguous panel state anywhere; the three entry actions
visible and honest on cold start; sample conversion works offline and
deterministically; help present per spec; evidence + screenshots in
`ui-evidence.md`; decision-log entries for the sample design and
the no-tour decision; `check` green.

## Fresh-chat starting point

Read D73, `ui-spec.md` first-run section, `ui-audit.md`
empty-state findings, `src/ui/import.ts` (the route the sample
feeds), `src/capture/session.ts` (permission flow),
`UI-STANDARDS.md` → "Empty and no-data states" and "Capture UX".
