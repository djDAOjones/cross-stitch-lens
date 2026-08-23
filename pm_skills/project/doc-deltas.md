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

- [x] 2026-08-12 AGENTS.md § Core data model — symbol assignment arrived as identity-keyed persisted state (schema v6 `symbols` block) and the glyph catalogue's canonical order is append-only once a batch signs (source: D165/M9)
- [x] 2026-08-12 DEV-INFRASTRUCTURE.md § Scripts / Quality gate — new `symbols:evidence` script writes the M9 print-evidence PDF to `bench-reports/`; `check:docs` now exempts `bench-reports/` citations (machine-local output, CI-parity) (source: D165/M9)
- [x] 2026-08-12 AGENTS.md § Core data model — ProjectFile's gridStyle is a screen/print pair with preset provenance since schema v7 (M11); the shape sketch still reads the flat block (source: D167/M11)
- [x] 2026-08-12 AGENTS.md § Core data model — ProjectFile's export.pdf gained pagination fields at schema v8 (M10); the shape sketch predates both v7 and v8 (source: D168/M10)
- [x] 2026-08-12 AGENTS.md § Core data model — ProjectFile gained a top-level estimates block at schema v9 (M12); the sketch now trails v7–v9 (one reconciliation covers all three) (source: D169/M12)
- [x] 2026-08-22 DEV-INFRASTRUCTURE.md § Deployment / § Dev server — deployment is real: CI publishes `dist` to GitHub Pages on a green default-branch push via `vite build --base /<repo>/`; "post-MVP, published by the host" no longer describes it, and `--base` joins `PORT` as a sanctioned override (source: D172/PUB-04)
- [x] 2026-08-23 DEV-INFRASTRUCTURE.md § Maintainer diagnostics — copy-diagnostics is no longer dev-only: a production bundle mounts the Debug menu behind the `?diag=1` URL opt-in (a per-visit parameter, not a `DIAG=1` build flag), the redaction review is recorded in D175, and the log now carries every palette resolution (source: D175/DIAG-02)
- [x] 2026-08-23 docs/ui-spec.md § section census — the Preview section carries a palette banner (Use DMC / Add threads) while no palette applies, and the inventory reveal and built-in profile are named "My inventory" (source: D176/MYTHREADS-01)
- [x] 2026-08-23 UI-STANDARDS.md § Layout model — the header utility row holds Source (product) and Licences (legal); the ghost button (`.button-ghost`: borderless, otherwise the base button — 44 px, hover fill, focus ring) marks an app-level utility that is not a product action; licences and notices open in a Close-only dialog whose texts are imported at build time, never fetched (source: D177/PUB-01)
- [x] 2026-08-23 docs/ui-spec.md § control inventory — new row `Licences | header utility row | ghost button → Close-only dialog | 1`; keyboard model unchanged (source: D177/PUB-01)
- [x] 2026-08-23 docs/ui-evidence.md — PUB-01's live checks (button 91 × 44 px named "Licences"; dialog "Licences and notices" is `aria-modal`, opens at the top with focus on its first `h3`, Tab trap holds, Escape closes and restores focus; dark scheme; no console errors) and two human-remainder items: native Enter/Space activation with in-dialog scrolling, and a VoiceOver pass (A11Y-VO-01 grows by one) (source: D177/PUB-01)
- [x] 2026-08-23 AGENTS.md § Persistence checklist / Core data model — "(and IndexedDB autosave)" is now true in a specific sense: the design history stores the serialised document, so a property that survives save/reload survives the history with no extra step; step 2's "toJSON" is `serializeProject` plus the `.pmproj` package; ProjectFile gains a `source` block at schema v10 (source: D179/DUR-01; supersedes the 2026-08-11 reservation)
- [x] 2026-08-23 docs/ui-spec.md § Project-section census (J5 unsaved-work honesty) — the sentence becomes the history standing line (`#history-line`), with "Recent designs…" and the near-quota "Keep more designs" beside Save/Load; J5's sentence survives only when storage is refused (source: D179/DUR-01)
- [x] 2026-08-23 DEV-INFRASTRUCTURE.md § Canonical scripts / § Utility scripts — new `verify:deploy` (`node scripts/verify-deploy.mjs`): post-deploy check that the live site serves the pushed commit's build id; network-dependent, deliberately outside `check` (source: D180/PUB-05)
- [x] 2026-08-23 DEV-INFRASTRUCTURE.md § Deployment — the "verify the live URL serves the buildId" step is now a command (`npm run verify:deploy`, `--wait` to poll) and is wired into the deploy job after `actions/deploy-pages`; a FAIL reddens the run without un-deploying (source: D180/PUB-05)
- [x] 2026-08-23 DEV-INFRASTRUCTURE.md § Build system — the rollup input list is conditional: `PM_PUBLIC_BUNDLE=1` builds `main` alone (the public Pages bundle omits the measurement harness); the var joins `PORT`/`BASE_PATH` as a sanctioned build-time switch, and `bench.html`/`bench-source.html` stay in every non-public build (source: D181/PUB-06)
- [x] 2026-08-23 DEV-INFRASTRUCTURE.md § Maintainer diagnostics — the Debug menu leads with "Report a problem": one click saves the settings document (`.json`, Save's name) and the redacted log, then opens a prefilled `mailto:` whose body says to attach both; `DEV_EMAIL` is an empty placeholder for a dedicated, retirable alias (source: D183/DIAG-02)
- [x] 2026-08-23 docs/ui-spec.md § control inventory — the Debug menu gains "Report a problem" as its first route (source: D183/DIAG-02)
