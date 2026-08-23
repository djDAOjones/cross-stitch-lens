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
- Grid style DPR staleness: sendGridStyle premultiplies devicePixelRatio but only re-sends on colour-scheme change — moving the window to a different-DPR display keeps stale thickness/font until the next style edit (from: 2026-08-12 M11)
- M10 fidelity residue: vector tile furniture (grid/numbering as PDF vectors instead of raster), per-page key policy, A3/custom page sizes — raster tiles at recorded effective DPI stand until print tests demand more (from: 2026-08-12 M10, D168)
- M12 estimate residue: per-colour skein column in the PDF key and Colours-used rows, an inches/cm display-unit preference, controls for routing/waste/skein-length, and a stitcher's review of defaults and wording (from: 2026-08-12 M12, D169)
- Stats race: `setOnResult` computes stats against the *current* `config.palette`, not the palette the frame was rendered with — one frame after any palette change under-reports (the import's first frame logged `colours: 2` against a 489-entry render); harmless today, wrong the moment a frame is held (from: 2026-08-22 COUNT-01)
- `setCount` invalidates the selection source although the distribution does not depend on the count — every count step pays a full-RGB refetch plus the FLICKER-01 hold; re-selecting against the held source would be instant (from: 2026-08-22 COUNT-01)
- Live capture seeds the selection source from the first frame (or from a still loaded earlier — `startCapture` does not invalidate it) and holds it until the geometry or a colour rule changes, so the palette can be chosen against a picture that is no longer the source; consider a "Re-pick colours from the current frame" action (from: 2026-08-22 COUNT-01)
- Document-size modal variant (wider layer) for reading dialogs — declined for PUB-01; revisit if a second prose dialog appears (from: 2026-08-23 PUB-01)
- Must-use search: mark rows outside the profile's membership ("not in this profile — will be added"), or offer option (a)'s membership-scoped default with a "Search all colours" toggle, if the universe search proves noisy in the field (from: 2026-08-23 MUST-01)
- Must-use remove after a Remove-from-profile exclusion returns the colour to membership — the pin lifted the exclusion and the undo restores the profile's state, not the intermediate exclusion; acceptable, listed (from: 2026-08-23 MUST-01)
- A `.pmproj` re-zipped by Finder/Explorer is deflate-compressed and refused; `DecompressionStream('deflate-raw')` in an adapter outside core would accept it (from: 2026-08-23 DUR-01)
- Embed the inventory in the project file (a schema v11 candidate) — the other half of the portability question; DUR-01 chose warn-on-load (from: 2026-08-23 DUR-01)
- Preview fit unit mismatch: `fitView` clamps in device px, the schema bounds CSS px, so a collapsed preview on a 2× display fits at 0.025 CSS px; the save path now clamps, the fit still produces it (from: 2026-08-23 DUR-01)
- The Design title's helper text (Export group) should say it also names the saved file (from: 2026-08-23 SAVE-01)
- History management beyond the picker: remove one design, clear the history, and "Keep more designs" reachable outside the near-quota window (from: 2026-08-23 DUR-01)
- A restored capture returns as a still; a "start a new capture of the same window" offer on restore would close the loop (from: 2026-08-23 DUR-01)
- The harness popup path `/bench-source.html` (`src/bench-browser.ts`) is root-relative, so it 404s under any build served from a base path that includes the harness; PUB-06 removed the public-facing symptom, but the latent bug remains for harness builds under a base path — fix with `import.meta.env.BASE_URL` (from: 2026-08-23 PUB-06)
- `verify:deploy` could take a `--fetch` flag to `git fetch` before resolving `origin/main`, so the default target is correct from any machine without a manual fetch or an explicit SHA (from: 2026-08-23 PUB-05)
- Recipe-level "render X as Y" — a profile carrying swaps, additive once C1 (tone-only matching) exists (from: 2026-08-23 ICE-RECOLOUR-01 Q5)
- Swap-to-fabric — erase a thread by swapping it to empty; layer B's territory (from: 2026-08-23 ICE-RECOLOUR-01 scope)
- `check:docs` alone fails in a fresh worktree — `docs/acceptance-matrix.md:46` names `crates/stitch-engine/pkg`, which only exists after `check:wasm`; the full gate orders them correctly, a standalone docs run does not (from: 2026-08-23 recolour-design close)
