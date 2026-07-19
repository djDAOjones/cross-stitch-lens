# M5-ACCEPT-04 — Reconcile performance budgets and protected docs

## Sign-off purpose

Resolve the D43 protected architecture doc-delta only after final measurement boundaries, mode semantics,
implementation results, and live/visual evidence exist. This is documentation reconciliation, not permission
to make failing numbers look green.

## Required inputs

Approved M5-PERF-02 boundary contract; reproducible matrix/reports from 01/03/24; M5C budget-mode decision;
per-change before/after results; MODE-01 promises; correctness/visual/live acceptance; final Exact measured
expectation; CI/local variance policy; and current `doc-deltas.md` entry. Every number needs workload ID,
boundary version, statistic/sample policy, environment class, and whether enforced or informational.

## Reconciliation decisions

Define which mode headline stage/whole/live budgets bind to (provisionally Balanced), hot versus cold/cache
conditions, source/grid/palette/metric/order, browser versus node, CPU/GPU timing boundary, local versus CI
policy, and what Exact publishes without promising. Preview render must use the approved browser-visible
boundary rather than a node proxy. Distinguish latency, throughput, and user-perceived acceptance.

Update protected/reference docs only through the project’s doc-sync/memory-maintenance process after owner
sign-off. Align architecture, DEV-INFRASTRUCTURE benchmark/quality commands, README status/run guidance, and
requirements references without duplicating evidence tables everywhere. Close the doc-delta rather than
leaving both old and new claims.

## Validation

Search the whole tree for obsolete budget/mode/backend wording. Check Markdown links/spelling, commands,
matrix names, and that `npm run check` reflects the documented enforced surface while explicit benchmarks
remain honestly separate if so decided. A new contributor should be able to tell what is guaranteed, what
is measured, and how to reproduce both.

## Exit and fresh-chat start

Exit with owner-approved budget table/wording, reconciled protected docs, closed D43 delta, decision-log
rationale, green doc/full gate, and no contradictory numbers. Read the completed evidence set and
`pm_skills/prompts/memory-maintenance.md` doc-sync instructions first; do not edit architecture from an
unfinished optimisation chat.
