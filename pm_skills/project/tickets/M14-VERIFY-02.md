# M14-VERIFY-02 — Journey & depth verification

## Outcome

Proof that the redesign served both audiences and changed nothing but
the UI: the M14-AUDIT-02 journeys re-walked on the final code with
published step deltas, depth reachability measured against the spec,
and the byte-identity contract demonstrated. Milestone rules per D73.

## Journey re-walk

Same five journeys, same counting rules, cleared storage:

1. Cold start → converted preview, no external instruction — visible
   affordances only, sample route and import route both. Report steps
   vs the audit baseline and vs the spec target.
2. Live capture to the permission boundary as a novice would meet it;
   full loop via the controlled-source route (canvas stream, the
   harness precedent in `docs/browser-measurement.md`) — the
   OS-picker step itself is rehearsed by the owner at M14-ACCEPT-01;
   say so in the record.
3. Palette refinement — including meeting at least one conflict of
   each severity and following its sentence out.
4. Export both chart forms; confirm draft/preview language never
   leaks into export expectations.
5. Save → reload → identical output; shell/disclosure preferences
   survive independently of the project file.

Keyboard-only variant for journeys 1 and 3 end-to-end.

## Depth reachability

From the control inventory (audit) as assigned by the spec: measure
interactions-from-default-surface for every control on final code;
every tier within its stated bound; no control lost (inventory rows
all present or their removal recorded in the spec + decision log).

## UI-only proof

- Reference exports from M14-AUDIT-01 re-produced on final code at
  the recorded settings: PNGs, chart, PDF and saved project
  byte-identical (hash match). Any mismatch is a milestone-rule
  breach — stop and fix before closing, however visually innocent.
- `npm run check` and `npm run bench` green (bench confirms no
  UI-side regression leaked into measured paths).
- Diff audit: no changes under `src/core/`, `src/worker/`,
  `src/backends/`, `src/export/` beyond what D73 allows (read-only
  consumption; none expected).

## Exit criteria

`ui-evidence.md` gains the journey section: five step tables
with baseline → final deltas, friction points resolved/remaining,
keyboard variants, the reachability table, and the byte-identity
attestation with hashes. Remaining friction becomes either a fix
inside this task, a waiver for the end review, or a recorded backlog
proposal — nothing silently dropped.

## Fresh-chat starting point

Read D73, `ui-journeys.md` (baselines and counting rules),
`ui-spec.md` (targets and tier bounds), the audit's export
settings record. Re-walk cold before re-reading implementation code —
the verification is of the experience, not the diff.
