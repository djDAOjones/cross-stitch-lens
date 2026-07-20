# Doc-deltas

<!-- Capture-only ledger of pending protected-doc reconciliations. Append one
     line per delta; the edit detail is derived fresh at sync time. -->
<!-- Cold tier. Agents NEVER auto-read this file beyond the open-count line
     surfaced at session start. Read it in full only during a doc-sync pass
     (memory-maintenance.md → Doc-sync) or when the size check flags it.
     See AGENTS.md → "Before every task". -->
<!-- What belongs here: a protected doc (SPEC, ADR, or its kin — edit-on-request
     only) no longer describes current behaviour, and reconciling it needs
     explicit maintainer sign-off. This is sign-off DEBT, not work to pick —
     never mix it into backlog.md (the backlog/wish-list boundary precedent). -->
<!-- Capture, don't rewrite: append ONE line naming the doc and the delta; do
     NOT write edit instructions here. Inventories balloon when they hold the
     fix (the DOC-1 lesson) — the fix is regenerated from the source entry when
     the doc-sync pass runs. ADR status closures (Proposed → Accepted) are a
     first-class delta type. -->
<!-- Format: one checkbox line, oldest at the top. Tick (`[x]`) when the
     doc-sync pass applies the edit; delete ticked lines at the next prune.
     Example:
     - [ ] 2026-07-16 SPEC §6 — entity model is 11 not 9 (source: PERF-1e) -->
<!-- Threshold: WARN past ~10 open or oldest > 30 days → propose a doc-sync
     pass. See pm_skills/memory-policy.md. -->

## Open

- [ ] 2026-07-17 DEV-INFRASTRUCTURE — pre-M0 comments stale (full gate now
  live); scripts table missing the shipped script surface (source: M0)
- [ ] 2026-07-19 DEV-INFRASTRUCTURE — dev server port now env-overridable
  (`PORT` + launch.json `autoPort`) for parallel sessions (source: D27)
- [ ] 2026-07-19 architecture — performance-budget table assumes GPU-backed
  resize and a LUT-accelerated dither; implementation uses CPU box-average
  resize and exact-search dither, and misses every budget (measured: D43) —
  budgets and/or implementation strategy need an owner decision (source: D43)
- [ ] 2026-07-19 architecture — budget table states no measurement boundary;
  each row now binds to one workload at one boundary under contract bv1
  (`docs/measurement-contract.md`), and the preview-render row is
  browser-only (source: D44)
- [ ] 2026-07-19 architecture — the preview-render ≤ 5 ms row now has browser
  evidence for the first time (components total ~2 ms at 1024²; it passes),
  and the resize ≤ 5 ms and dither ≤ 15 ms rows are unreachable on M5B
  evidence (best bit-exact CPU resize 24.4 ms; canvas 8.1 ms but not
  area-averaging). M5C/ACCEPT-04 owns revising them (source: D45)
- [ ] 2026-07-19 architecture — budget rows are stated without a runtime, but
  the same TS resize measures ~3.5× slower in-browser than in node on one
  machine while TS dither is only ~1.1× slower; a node median is not a
  browser claim and the table should say which runtime binds (source: D45)
- [ ] 2026-07-20 `architecture.md` → "Performance budgets" — the table still
      states the aspirational 5/10/15/100 ms rows. M5D replaced them in the
      test suite with measured baselines naming runtime + workload + build
      (D47 shape, D48). M5-ACCEPT-04 owns this edit.
- [ ] 2026-07-20 `architecture.md` → "Stage backends" — says backend selection
      is "automatic by default (profiled)". D42's startup calibration is gone;
      selection is per-workload routing by metric (D48, M5-PERF-27).
- [ ] 2026-07-20 `AGENTS.md` → "Processing pipeline" / `architecture.md` — the
      default order is documented as `adjust → resize → reduce(+dither)`, but
      the identity `adjust` is now omitted from the built stage list until §9
      populates its params (D48, M5-PERF-25). The slot is unchanged; only its
      presence in a run is conditional.
- [ ] 2026-07-20 `architecture.md` → "Core contracts" — the dither stage now
  excludes fully transparent cells from the scan and from error diffusion; no
  contract states it (source: D49)
- [ ] 2026-07-20 DEV-INFRASTRUCTURE — scripts table missing `matrix` /
  `matrix:write`, and the generated-doc staleness gate they back (source: D49)
