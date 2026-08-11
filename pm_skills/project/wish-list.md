# Wish-list

<!-- Capture inbox for unscoped ideas. Append one line; no structure required. -->
<!-- Cold tier. Agents NEVER auto-read this file. Read it only during an
     explicit triage pass — the next-batch pick (session-start.md Start B),
     or end-of-task.md / memory-maintenance.md when the size check flags
     it. See AGENTS.md → "Before every task". -->
<!-- Boundary: this is PRE-triage — raw, unjudged ideas. The backlog Icebox
     is POST-triage — ideas already judged worth keeping. Promote items INTO
     backlog.md (Current, Next, or Icebox); never treat this as a second backlog. -->
<!-- Triage = promote or cut. Promoting MOVES the item into backlog.md. Cutting
     DELETES the line. No history is kept here — survivors live in the backlog. -->
<!-- Format: one plain bullet per idea, optionally a source. Append at the
     bottom; triage from the top. Example:
     - Idea in one line — (from: 2026-05-30 task) -->
<!-- Soft cap ~25 open items. Over budget → end-of-task flags it and
     memory-maintenance.md (Prune) runs a forced triage pass (not an
     archive). See pm_skills/memory-policy.md. -->

Raw parked ideas. Triage into backlog.md or cut. Section numbers
refer to `docs/requirements.md`.

## Second stage (spec §25)

- Full custom processing-order editor (advanced mode, §7)
- Colour-reduction extras: CIEDE2000, weighting controls,
  merge-similar, min-usage threshold (§6) — max colours and
  force-include/exclude promoted to M7
- More preview modes: simulated thread crosses, fabric preview (§10)
- Camera / virtual video device input (§3)

## Later (spec §25)

- Fabric simulation / finished-stitch rendering
- Native ScreenCaptureKit region capture (D2) — Tauri packaging itself
  promoted to ICE-TAURI-01
- SVG chart and CSV stitch-data export; TIFF/WebP; print-ready ZIP
  (§19)
- Embroidery machine formats (§19)
- Photoshop integration revisited (only if screen capture proves
  insufficient — see D2)
- Cloud/collaborative projects (§25)
- Export presets system (§21)

## Open questions (spec §26 residue — see decision-log D9/D10)

- Optimisation modes (accuracy vs perception vs stitchability, §6) —
  needs real stitching feedback before designing.
- Rust lint/format in the gate: clippy -D warnings + rustfmt --check for the stitch-engine crate (needs the components locally + in CI) (from: 2026-07-19 M5-CRATE)
- Browser-mode test runner (@vitest/browser + playwright) so the real-GPU WebGPU suite runs in CI, not just where navigator.gpu exists (from: 2026-07-19 M5-WEBGPU)
- Manual backend override: debug-panel select + ?backend= URL param forcing ts/wasm/webgpu per stage (architecture already anticipates it) (from: 2026-07-19 M5-SELECT)
- semi-transparent dither participation: whether an alpha 1-127 cell (which renders as fabric per D9) should take part in error diffusion; M5-ACCEPT-01 fixed alpha===0 only
- crates/stitch-engine/pkg can go stale silently: no local Rust toolchain means the wasm parity suite runs against whatever pkg was last built, so a Rust source change is only really verified in CI
- Companion-window rehearsal in stable Safari / Chrome / Firefox on the maintainer's macOS setup — the leg D53 could not measure from an embedded Chromium; only worth doing if browser placement is reconsidered
- bv2 per-row taint attribution: one bad window currently taints the whole report even when the same report carries a clean retake of that leg — row-level validity would let a report separate its own good and bad rows (from: 2026-07-23 M13-MEAS-02 run 3)
- [ ] Remove the retired policy-world resolver (resolvePermitted/resolveProjectPalette in src/core/palette-policy.ts + palette-resolve.ts) and the LCh presets once no migration-era consumer remains — kept post-M15-UI-01 as tested substrate only (D124).
- bench:auto occlusion resilience: evaluate `--disable-backgrounding-occluded-windows` — needs its own visible-vs-occluded equivalence evidence before it could be sanctioned
- Off-main-thread capture (MediaStreamTrackProcessor-class): move the surface-sized grab readback + dirty sample off the main thread — the readback term IMPL-01's reuse cannot remove. Trigger: felt stutter, or a captured surface materially over 6.5 MP (a 5K screen share is ~2×, likely crossing the 100 ms perception line). Architecture change + new API surface; needs its own scope (from: 2026-08-08 M13-SYNTH-01, D135)
- End-of-capture salience: the external-stop status line ("Screen capture ended (sharing was stopped).") is truthful but easy to miss — owner expected a more prominent prompt; consider a toast/banner treatment (from: 2026-08-08 owner sitting, D134 → ACCEPT-02 input)
- Harness capture leg does not model the app's master-image copy: `src/bench-browser.ts`'s pump submits the grab buffer directly and keeps no master image, so the app's per-frame pre-submit copy (D71 census #2) never existed there and its removal cannot be priced on the automated leg — a fidelity gap for any main-thread-ownership change (from: 2026-08-08 M13-IMPL-01)
- Synced-tree churn hygiene: relocate the cargo target dir + Vite/Vitest cache off the OneDrive path (CARGO_TARGET_DIR; `test.cacheDir`) — the secondary multiplier behind D136's QoS mechanism (`check:wasm` rewrites 111 MB in-domain right before `check:test`); unverifiable while the sync client idles, so hygiene not fix (from: 2026-08-08 INFRA-CHECK-01, D136)
- Audit-after-check flake: `npm run audit` intermittently reports 2 failures when run immediately after a full `check` (observed twice, 2026-08-11, both green on the very next run; failing pair never captured — grab `/tmp/audit.log` while red to name it) (from: Batch C0 close)

<!-- Triaged 2026-08-11 (D149): three lines left. The rename promoted to
     RENAME-01 (Current), the colour-limit slider to ICE-LIMIT-01 (Icebox),
     and the FIT_MARGIN tick-label clip absorbed into M11's backlog line.
     Everything above was reviewed and kept parked — none of it belongs in
     Batch C0 or Track A. Closest to promotion next: "End-of-capture
     salience" (a real owner-reported UX defect, held back only because
     toast-versus-banner is a taste call) and the Rust lint/format gate
     line, which the rename will touch anyway. -->
