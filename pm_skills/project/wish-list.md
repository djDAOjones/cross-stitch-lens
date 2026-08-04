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

- Thorough rename of app/ repository to Pattern Mapper, renaming across files and platforms
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

- Maximum *useful* grid size — revisit the 1024 cap after M5
  benchmarks.
- Optimisation modes (accuracy vs perception vs stitchability, §6) —
  needs real stitching feedback before designing.
- Rust lint/format in the gate: clippy -D warnings + rustfmt --check for the stitch-engine crate (needs the components locally + in CI) (from: 2026-07-19 M5-CRATE)
- Browser-mode test runner (@vitest/browser + playwright) so the real-GPU WebGPU suite runs in CI, not just where navigator.gpu exists (from: 2026-07-19 M5-WEBGPU)
- Manual backend override: debug-panel select + ?backend= URL param forcing ts/wasm/webgpu per stage (architecture already anticipates it) (from: 2026-07-19 M5-SELECT)
- semi-transparent dither participation: whether an alpha 1-127 cell (which renders as fabric per D9) should take part in error diffusion; M5-ACCEPT-01 fixed alpha===0 only
- crates/stitch-engine/pkg can go stale silently: no local Rust toolchain means the wasm parity suite runs against whatever pkg was last built, so a Rust source change is only really verified in CI
- Tick-numbering margin: FIT_MARGIN (24 CSS px) clips 3-digit row labels at fit-width on a narrow window — the labels are drawn centred on the row so they overhang the reserved margin (seen at 420 px, M6-NARROW-01 rehearsal; M11 territory)
- Companion-window rehearsal in stable Safari / Chrome / Firefox on the maintainer's macOS setup — the leg D53 could not measure from an embedded Chromium; only worth doing if browser placement is reconsidered
- tests/audits carry stale post-M8 assertions (a Boolean-dither draft-isolation check in runtime.audit; "533" labels for the 489-thread DMC palette) — sweep next time the audits run under AUDIT=1 (from: 2026-07-22 M13-MEAS-01)
- bv2 per-row taint attribution: one bad window currently taints the whole report even when the same report carries a clean retake of that leg — row-level validity would let a report separate its own good and bad rows (from: 2026-07-23 M13-MEAS-02 run 3)
- Global error capture logs ErrorEvents as "[object Object]" in the console mirror (seen while diagnosing an M14 boot error 2026-07-23) — stringify message/stack in src/diagnostics/log.ts's global hook for legible uncaught errors.
