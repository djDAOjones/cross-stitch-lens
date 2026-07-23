# M14-IMPL-05 — Language & microcopy pass

## Outcome

Every user-facing string speaks user language: the spec's terminology
map applied across all surfaces, Carbon content rules enforced, errors
that say what happened and what to do next. Deliberately last in the
implementation chain so it sweeps the copy the earlier tasks
introduced. Milestone rules per D73.

## Scope

- **Terminology map applied** (from `ui-spec.md`): every flagged
  implementation term replaced on default surfaces — processing
  order, metric, backend names, draft, the four resolutions, palette
  policy vocabulary. Truthful-labels rule holds: where a technical
  surface names a backend or mode it names the one that actually ran
  (D72); dev/debug surfaces keep precise technical language by
  design.
- **Carbon content rules** (UI-STANDARDS): sentence case everywhere;
  labels 1–3 words where practical; no colons after labels; visible
  label = accessible name; helper text only where it earns its place;
  link/button text self-describing.
- **Errors and conflicts**: every error message names what happened
  and the next step, near the relevant control; the `PaletteConflict`
  sentences reviewed against the map (they already carry severity
  words and a way out — D55; keep that contract).
- **UK English** in UI copy and docs; US spelling stays in code
  identifiers (conventions.md).
- **Inventory-driven**: extract every user-facing string first
  (surfaces, states, errors, tooltips, aria-labels, empty states),
  then edit against the map. The before/after table is the evidence.

## Out of scope

Structural changes, control moves, new help surfaces. If a string
cannot be fixed without moving a control, record it as a finding for
the verify phase rather than restructuring here.

## Verification

The before/after inventory covers every string (grep-audit for
leftover flagged terms); sentence-case and label-length sweeps;
accessible-name equality re-checked where labels changed (names are
part of the copy); conflict scenarios re-driven to hear the new
sentences in context; UK-English pass (the cspell domain dictionary
route exists in conventions if useful). `check` green.

## Exit criteria

Copy inventory (before → after → rule applied) complete in
`ui-evidence.md`; no flagged implementation term on a default
surface; every error/conflict message names its next step; labels and
accessible names still equal; `check` green; decision-log entry only
if the terminology map itself changed during application (spec
updated to match).

## Fresh-chat starting point

Read D73, the terminology map in `ui-spec.md`,
`UI-STANDARDS.md` → "Content and form", D55 (conflict sentences) and
D72 (truthful labels). Build the string inventory by sweeping
`src/ui/` and `src/main.ts` for literals plus the empty-state and
status strings; edit in place, no i18n layer — that would be
speculative abstraction.
