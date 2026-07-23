# M14-IMPL-03 — Progressive disclosure & IA restructure

## Outcome

The spec's information architecture becomes real: the novice-first
default surface, depth behind the spec's Carbon disclosure
mechanisms, panels regrouped/reordered where the spec says so —
with disclosure state persisting in the preferences store and focus
managed deliberately. Milestone rules per D73.

## Scope

- Restructure the settings column to the spec's grouping and order;
  move every control to its assigned tier and location. The spec's
  control table is the work order — no unrecorded placements.
- Disclosure mechanics per the spec (accordion sections / inline
  advanced reveals / contextual surfacing), implemented to Carbon
  anatomy on the token layer. Native disclosure elements first where
  they fit (the debug panel's `<details>` is the precedent); ARIA
  only where semantics demand it.
- Shell rules bind (UI-STANDARDS): the control that reveals a region
  lives outside it; focus moves deliberately on open/close and never
  drops; tab order equals visual order; no CSS `order`.
- Persistence: per-section disclosure state joins
  `src/ui/preferences.ts` (localStorage, safe-parse fallback — the
  existing pattern). Never the project file; no schema change.
  First-run defaults are the spec's, not "all open".
- Reach guarantee: every control reachable within its tier's stated
  interaction count from the default surface — this is what
  M14-VERIFY-02 measures.

## Out of scope

Empty states and guidance copy (M14-IMPL-04); wording (M14-IMPL-05);
any change to what a control does. Pipeline semantics, stage params
and project files are untouched by definition.

## Verification

Journey spot-checks (full re-walk is VERIFY-02): journey 1 against
the spec's step target, one depth route per tier. Keyboard pass over
every disclosure: reveal, reach, collapse, focus landing. Preferences
round-trip test (set → reload → same surface). Reduced-motion pass on
any disclosure animation. Screenshots per group into the evidence
doc. `check` green; no `src/core`/`src/worker`/`src/export` diffs.

## Exit criteria

Settings column matches the spec table exactly (or the divergence is
recorded with a reason in the decision log and the spec is updated);
disclosure state survives reload; focus rules verified; reach counts
measured and within spec; evidence in `ui-evidence.md`; `check`
green.

## Fresh-chat starting point

Read D73, `ui-spec.md` whole, `src/ui/shell.ts` (the one
hidden-state model — extend, don't duplicate), `src/ui/preferences.ts`,
and the `build()` assembly in `src/main.ts`. If `build()`'s size makes
the restructure hazardous, extracting panel-assembly modules under
`src/ui/` is in scope as pure reorganisation — behaviour-preserving,
stated in the commit, no logic edits in the move.
