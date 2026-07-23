# M14-VERIFY-01 — Standards conformance verification

## Outcome

Proof, not assertion, that the finished UI meets the bar the audit
measured it against: the full M14-AUDIT-01 checklist re-run on the
final code, every original finding closed or explicitly waived, no
new violations. Fixing what this pass finds is in scope — it is agent
work; only taste waits for the end review. Milestone rules per D73.

## Method

Re-run the audit protocol surface × state, same matrix, final code:

- Carbon conformance: each surface against its spec-named pattern.
- Nielsen hard rules: the full heuristics section, especially the
  ones implementation churn threatens — consistency (same words and
  patterns for same concepts after the restructure), status
  visibility, error recovery.
- WCAG 2.2 AAA: contrast script green plus spot computation on
  rendered output (tokens can be right while a stray style isn't);
  target sizes measured; focus visible, unobscured, logical order;
  keyboard-only full walk of every function including disclosure,
  dialogs, capture controls, preview (zoom/pan/fit), export and
  project actions — no traps; accessibility-tree review per panel
  (role/name/value/state); announcements fire for status, conflicts,
  copy feedback; headings and landmarks sane.
- Matrix: 320 px / 60 rem+ / preview focus × light / dark × reduced
  motion × collapsed/expanded panel.
- The 14-item design review gate answered in writing per changed
  surface (that is: all of them).
- Diagnostics affordance rules re-checked (dev-only, labelled,
  44 px, feedback announced — UI-STANDARDS → "Diagnostics
  affordance").

## Findings handling

Every M14-AUDIT-01 finding gets a verdict: **closed** (evidence ref)
or **waived** (reason + severity — the waiver list is a first-class
input to M14-ACCEPT-01, not a footnote). New violations found here
are fixed here and re-verified; only genuine taste questions or
out-of-scope discoveries become new backlog items.

## Exit criteria

`ui-evidence.md` gains the conformance section: the re-run
matrix with per-cell outcome, the findings ledger (closed/waived,
zero unaddressed), the gate answers, and the tooling notes (what was
machine-checked vs hand-verified). `check` green on the final tree.
If an automated a11y checker as a dev dependency would have earned
its keep, note it as a proposal for the end review — adding it needs
maintainer approval and is not required to close this task.

## Fresh-chat starting point

Read D73, `ui-audit.md` (the protocol and findings being
re-run), `ui-spec.md` (the pattern names to verify against),
`UI-STANDARDS.md` whole. Drive the real app; where the audit recorded
a measurement method, reuse it exactly — comparability is the point.
