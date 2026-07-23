# M14-SPEC-01 — Interaction architecture & disclosure spec

## Outcome

The written design the implementation phase builds and the verify
phase measures against: what a novice sees by default, where every
deeper control lives, and which named Carbon pattern each element
follows. This is the milestone's design-judgement task — normally a
sign-off gate; here every decision is recorded (decision log + spec)
and judged once at M14-ACCEPT-01 (D73). No code changes.

## Inputs

`ui-audit.md` (findings + style inventory), `ui-journeys.md`
(journeys + control-tier inventory), `UI-STANDARDS.md` (binding),
`docs/requirements.md` §5.4 (controls apply immediately), §7 (pipeline
order is user data), §10–11.

## Decisions the spec must make

- **Default surface**: which controls are visible on first run, in
  what grouping and order. The current seven flat groups (Pattern /
  Grid / Colour / Dither / Pipeline / Export / Project) are the
  starting point, not the answer — regroup or reorder only with a
  recorded rationale per change.
- **Disclosure tiers**: for every inventory row, a tier (essential /
  common / deep) and a location; the Carbon mechanism per tier
  (accordion sections, inline "advanced" disclosure, contextual
  reveal) — named per Carbon's patterns, implemented in project code.
  State the maximum interactions-to-reach per tier; VERIFY-02 measures
  it.
- **First-run emphasis**: how the two entry actions (import a still,
  start capture) and the generated sample source are presented; what
  each empty state says and points to (implemented in M14-IMPL-04).
- **Terminology map**: implementation words → user words for every
  label the journeys flagged (processing order, metric, backend,
  draft, the four resolutions...). Backend/runtime names stay truthful
  where they surface (D72) but move to non-default surfaces where the
  spec says so. UK English (conventions.md).
- **Keyboard model**: tab order per region, shortcuts kept/added
  (zoom +/−/0, pan arrows exist), focus behaviour on disclosure
  open/close — the control that reveals a region stays outside it
  (UI-STANDARDS shell rules).
- **What does not change**: preview-first DOM order at every width, no
  CSS `order`, the 320 px companion baseline, preview focus behaviour,
  collapse model semantics, immediate control application (no Apply
  buttons), presentation state in preferences never the project file,
  no pipeline semantics change, no project-file schema change.

## Constraints

Nielsen "Consistency" and "Recognition over recall" bind the
regrouping; "Flexibility and efficiency" binds the depth placement.
Every spec section cites the audit/journey finding it answers or
names itself as unforced design intent. Nothing in the spec may
require a new runtime dependency.

## Exit criteria

`ui-spec.md` (new, under `docs/`) holds: region-by-region layout
description
(wireframe-level, DOM-order explicit); the complete control table —
every inventory row assigned tier, location, Carbon pattern name and
reach count; the terminology map; the keyboard model; an explicit
"unchanged invariants" list; and a decision index. Substantive
decisions (regrouping, tier scheme, sample-source presentation,
terminology policy) each get a decision-log entry so the end review
can audit them. Every audit blocker/major finding is answered by some
spec section or explicitly deferred with a reason.

## Fresh-chat starting point

Read D73, both audit docs whole, `UI-STANDARDS.md` whole. Write the
control table first — the layout prose falls out of it. Where two
placements are genuinely close, pick one, record the alternative in
the decision entry, and move on; the end review is the arbiter.
