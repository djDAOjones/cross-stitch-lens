# M5-ACCEPT-05 — Close M5

## Sign-off purpose

Close the milestone only when automated correctness, reproducible performance, visual judgement, realistic
live capture, export isolation, and documentation tell the same story. This ticket coordinates evidence and
release readiness; it must not fix substantive failures inline.

## Preconditions

- M5A/B evidence complete; M5C and MODE-01 decisions approved; conditional Responsive explicitly retained
  or cut; all approved implementation tickets closed with attributable before/after results.
- ACCEPT-01 correctness/parity matrix green without weakened tests; ACCEPT-02 visual output accepted;
  ACCEPT-03 live Photoshop rehearsal accepted or limits explicitly approved; ACCEPT-04 docs/budgets reconciled.
- Exact reference/golden fixtures intact, TS fallback sound, selected-mode export/persistence/draft isolation proven,
  and residual bugs triaged rather than hidden.

## Final run

From a clean, known-good runtime/build state record commit/build identity and run `npm run check`, approved
benchmark suite/report, production build with optional backend fallback checks, correctness matrix, and any
release-specific doc/link/security checks. Re-run a concise smoke path: still import, live capture/crop,
controls/mode restore, compare, pause/draft, PNG/chart/PDF, save/load, diagnostics, and error recovery.

The maintainer reviews the evidence index, residual risk, platform/toolchain assumptions, performance promises,
and real editing feel. Any red required gate reopens its owning ticket. “Known limitation” requires explicit
owner acceptance and honest documentation; it is not an automatic waiver.

## Close outputs

One evidence index linking build ID, gate outputs, benchmark report, parity matrix, visual review, live rehearsal,
budget decision, and residual risks. Then update backlog/trajectory/decision log/file map per end-of-task,
remove shipped cold ticket files, resolve doc deltas, choose the M5 product version/tag per infrastructure rules,
and recommend a rollback-friendly commit—never auto-commit unless asked.

## Fresh-chat starting point

Read all ACCEPT results, M5C decision, active backlog, release/version infrastructure, and end-of-task/memory
maintenance procedures. Begin with a precondition checklist. Do not run milestone eviction or delete ticket
files until the maintainer signs off that every required evidence source is accepted.
