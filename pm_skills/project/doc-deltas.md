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

- [x] 2026-08-07 AGENTS.md § The four resolutions — the '"Stitch size" slider' reference is now the Zoom slider (owner rename, D52 collision recorded) (source: D121/M14-EXT-40) — applied at D151
- [x] 2026-08-07 UI-STANDARDS.md § Layout model — controls census stale: Design and Advanced retired, Capture is a standing section, the colours table is a "Colours used" content section, the aside box flattened (source: D121/M14-EXT-40/41/44) — applied at D151
- [x] 2026-08-07 UI-STANDARDS.md § Conflict and explanation pattern — the three-disjoint-rules anatomy (lock/prefer/exclude) retired by M15: exclude is profile membership, prefer is gone, lock is Must-use; the aria-live sentence pattern itself stands (source: D124/review) — applied at D151
- [x] 2026-08-09 AGENTS.md § Performance — budgets are no longer asserted by `npm run bench` alone: the product promise is now a `bench:auto` gate (rate + zero misses) and only driven base capture rows may bind (source: D142/M13-IMPL-02) — applied at D151
- [x] 2026-08-09 DEV-INFRASTRUCTURE.md § `bench:auto` — the validation summary ("untainted, visible page, all legs measured") is stale: the leg also asserts product targets and exits non-zero on a miss (source: D142/M13-IMPL-02) — applied at D151
- [ ] 2026-08-11 AGENTS.md § Persistence checklist / Core data model — no autosave or session restore exists; the checklist reads as though project state persists automatically. DUR-01 will change the answer, so sync after it ships, not before (source: D149/DUR-01)
- [ ] 2026-08-12 AGENTS.md § Core data model — symbol assignment arrived as identity-keyed persisted state (schema v6 `symbols` block) and the glyph catalogue's canonical order is append-only once a batch signs (source: D165/M9)
- [ ] 2026-08-12 DEV-INFRASTRUCTURE.md § Scripts / Quality gate — new `symbols:evidence` script writes the M9 print-evidence PDF to `bench-reports/`; `check:docs` now exempts `bench-reports/` citations (machine-local output, CI-parity) (source: D165/M9)
- [x] 2026-08-11 AGENTS.md § Scope guards — the committed-milestone list is stale: M13/M14/M15 shipped, ship order is no longer number order, and the fence is now Batch C0 → Track A (source: D149) — applied at D151
- [x] 2026-08-11 AGENTS.md § Product identity — "macOS-first" and the edits-in-Photoshop premise both widen: the owner intends to publish online to a broader audience on any platform, so no upstream editor can be assumed (source: D149/brief.md) — applied at D150
- [x] 2026-08-11 AGENTS.md + UI-STANDARDS.md — product name renamed to Pattern Mapper; DEV-INFRASTRUCTURE.md carried no occurrence (source: D150/RENAME-01) — applied at D150
