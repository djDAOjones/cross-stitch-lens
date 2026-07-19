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

- Additional dithering algorithms: Atkinson, Stucki, Sierra family,
  Jarvis–Judice–Ninke, Burkes, ordered Bayer, blue-noise, random,
  threshold (§8) — Bayer/blue-noise are the natural first WebGPU wins
- User-defined palettes: create/edit/merge/import/export (§5.3)
- Second preset palette; full manufacturer thread data (name, number,
  skein info) from owner's spreadsheet (§5.2)
- Dithering presets: save/load/import/export (§8.2)
- Full custom processing-order editor (advanced mode, §7)
- Cross-stitch symbols + symbol charts + B/W chart mode (§17)
- Advanced grid styling presets (§15) and full tick-mark controls (§16)
- Multi-page PDF: overlap, registration marks, repeated keys, cover
  and overview pages (§18)
- Physical-size calculations from fabric count; thread length and
  skein estimates (§4, §11)
- Colour-reduction extras: CIEDE2000, weighting controls, max
  colours, force-include/exclude, merge-similar, min-usage threshold
  (§6)
- More preview modes: simulated thread crosses, fabric preview,
  grayscale symbol chart (§10)
- Camera / virtual video device input (§3)

## Later (spec §25)

- Image adjustments panel: brightness/contrast/gamma/etc. (§9 — the
  `adjust` stage exists from M1; this is the UI + additional ops)
- Fabric simulation / finished-stitch rendering
- Automatic symbol assignment with similarity avoidance (§17)
- Tauri packaging; native ScreenCaptureKit region capture (D2)
- SVG chart and CSV stitch-data export; TIFF/WebP; print-ready ZIP
  (§19)
- Embroidery machine formats (§19)
- Photoshop integration revisited (only if screen capture proves
  insufficient — see D2)
- Cloud/collaborative projects (§25)
- Export presets system (§21)

## Open questions (spec §26 residue — see decision-log D9/D10)

- Which thread manufacturers beyond DMC? The supplied map carries an
  Anchor cross-reference (and room for per-thread metadata); an Anchor
  preset is a natural second palette.
- Maximum *useful* grid size — revisit the 1024 cap after M5
  benchmarks.
- Optimisation modes (accuracy vs perception vs stitchability, §6) —
  needs real stitching feedback before designing.
- Grid size (width/height) controls UI (§4) — engine supports it since M1; panel slot next to the M2 grid controls (from: 2026-07-19 M2-PANELS)
- Rust lint/format in the gate: clippy -D warnings + rustfmt --check for the stitch-engine crate (needs the components locally + in CI) (from: 2026-07-19 M5-CRATE)
- Browser-mode test runner (@vitest/browser + playwright) so the real-GPU WebGPU suite runs in CI, not just where navigator.gpu exists (from: 2026-07-19 M5-WEBGPU)
- Manual backend override: debug-panel select + ?backend= URL param forcing ts/wasm/webgpu per stage (architecture already anticipates it) (from: 2026-07-19 M5-SELECT)
