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

- [ ] 2026-08-23 docs/ui-spec.md § Debug menu (EXT-26) — "Email the dev" is "Report a problem" and leads the menu; it saves the project document and the log, the mailto body names both, the address is a dedicated alias (source: DIAG-02 close / D187)
- [ ] 2026-08-23 UI-STANDARDS.md § Companion-window baseline — the app is designed for 400 px with the 320 px floor kept, and phones are still-image users (mobile browsers have no `getDisplayMedia`); the baseline names only the floor (source: D188/ICE-WIDTH-01)
- [ ] 2026-08-23 AGENTS.md § Scope guards — "the committed fence is now Batch C0 … then Track A … followed by Track B" predates both ships; the fence is the small UI batch → Track D → Track C, with the Print programme (M16, PRINT-01/02/TEST-01) parked in the Icebox (source: D189; D185/D188 for the tracks)
- [ ] 2026-08-23 docs/ui-spec.md § Colours used (EXT-41) and the control inventory — the table carries a Symbol column (visible header; per-row text button "{glyph name}" / "Auto", accessible "{name}: change the symbol for {thread}") opening the symbol picker dialog; grants are live for palettes ≤ 64 entries (source: ICE-SYMBOL-UI-01 / D191)
- [ ] 2026-08-23 docs/ui-spec.md § control inventory (Limit colours) and docs/ui-evidence.md § anatomy — the slider is a log scale 2–512 with 16 at the midpoint (300 positions, `aria-valuetext` speaks the count), not 1–64; helper reads "The slider runs from 2 to 512, finest below 16; type an exact number here." (source: ICE-LIMIT-01 / D192)
- [ ] 2026-08-23 docs/ui-evidence.md § FIX-04 and EXT-39 rows — the width guide ("Window N px wide — works down to 320 px.") renders only under the diagnostics rule (dev builds; production behind `?diag=1`), not in the public header (source: ICE-WIDTH-02 / D193)
- [ ] 2026-08-23 docs/ui-spec.md § control inventory (brand note, row 280) and Export group — the mapped-colour wording is "colour mapped from its DMC equivalent" (no "not measured"); the Design title field carries the helper "Printed on the PDF; also names the saved project file."; the export-size readout's chart figure includes gutter and padding (source: DATA-05 / D194)
- [ ] 2026-08-23 docs/ui-spec.md § Preview region and docs/ui-evidence.md (capture end) — an externally ended share shows a dismissible inline notification above the preview ("Screen capture ended — sharing was stopped. …", role=status, Dismiss returns focus to the preview host) in addition to the status line; the user's own Stop does not (source: CAPTURE-END-01 / D196)
- [ ] 2026-08-23 DEV-INFRASTRUCTURE.md § Canonical scripts and § Utility scripts (`verify:deploy`) — the script takes `--fetch` (runs `git fetch origin` before resolving `origin/main`, for a worktree or another machine); the standalone `check:docs` no longer depends on `check:wasm` having built `crates/stitch-engine/pkg` (source: INFRA-02 / D198)
- [ ] 2026-08-23 AGENTS.md § Core data model (`ProjectFile`) — schema is v11: `palette.design.swaps` (`{ from, to }`, `to` a full thread record) joins count, minimum distance and Must-use; the pipeline's colour group may end in a `swap` stage over the sidecar (source: ICE-RECOLOUR-01 / D199)
- [ ] 2026-08-23 architecture.md § Persistence row and the project-file paragraph ("currently v10") — v11 adds `design.swaps`; the render palette (selected entries + render-only targets) is the sidecar's vocabulary after the swap stage, derived by `renderPalette()` on both threads (source: ICE-RECOLOUR-01 / D199)
- [ ] 2026-08-23 docs/ui-spec.md § Colours used (EXT-41) and the control inventory — a Swap… verb per row ("Swap {thread}" / "Re-target the swap onto {thread}"), a visible "swapped from X" note on a target's row, no Remove on a render-only target; the "Swap X for…" modal over the browse table; a Swaps chip list under Must-use with "Remove the swap of X for Y" (source: ICE-RECOLOUR-01 / D199)
