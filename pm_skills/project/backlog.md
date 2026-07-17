# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- OPEN WORK ONLY. Status: [ ] todo  [~] in progress  [-] cut. -->
<!-- Shipped work does NOT stay here. On ship: add one line to
     trajectory.md (the outcome) + an entry to decision-log.md (the why),
     then remove the item from this file. There is no Completed section. -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See pm_skills/memory-policy.md for limits; run memory-maintenance.md
     (Refactor) when the queue drifts into dated rounds. -->

Milestones ship in order. A milestone is done when its acceptance
line passes and `check` is green. Requirements references are to
`docs/requirements.md`.

## Active

### M1 — Engine core (TS reference, §4–§8) (current milestone)

- [ ] Image import (file picker, drag-drop, clipboard paste)
- [ ] Pipeline executor in Worker with configurable stage order; two order presets: adjust→resize→reduce+dither vs adjust→reduce+dither→resize (§7 comparison)
- [ ] Stats: colour count, stitch counts, per-colour counts, % usage (§11 subset)

*Acceptance: import PNG → 200×200, 16-colour dithered output renders
correctly; golden tests for every stage; save→load→save byte-identical.*

### M2 — Preview & info UI (§10 subset)

- [ ] OffscreenCanvas preview in worker; zoom, pan, fit-to-window
- [ ] Grid overlay: show/hide, minor/major interval, line colour/thickness (§15 subset)
- [ ] Basic tick marks + row/column numbering, origin at 1 (§16 subset)
- [ ] Source vs output split compare
- [ ] Info panel bound to stats (live update)
- [ ] Carbon-based control panels for grid, palette/colour mode, dither on/off, pipeline order preset

*Acceptance: 60 fps pan/zoom at 1024×1024; controls update preview
< 150 ms end-to-end at 200×200.*

### M3 — Exports (§12–§14, §18–§19 subsets)

- [ ] Clean PNG at 1 px/stitch; transparent or solid background
- [ ] Enlarged PNG, integer nearest-neighbour scale
- [ ] Styled PNG chart: stitch cells + grid + major lines + numbering
- [ ] Single-page PDF chart (pdf-lib): A4/Letter, portrait/landscape, margins, design title, palette key (colour swatches + hex; symbols are post-MVP)
- [ ] Project save/load as JSON v1 (§20), schema documented

*Acceptance: printed A4 PDF of a 100×100 design is legible and
stitchable; clean PNG pixel-equal to engine output buffer.*

### M4 — Live capture (§3, §22)

- [ ] `getDisplayMedia` screen/window session with permission UX
- [ ] User-drawn crop rectangle over live thumbnail; move/resize/lock
- [ ] Frame pump: `requestVideoFrameCallback`, latest-wins coalescing
- [ ] Dirty-frame skip via 64×64 downsample hash
- [ ] Pause/resume, manual refresh, draft-quality mode under load

*Acceptance: editing in Photoshop at 200×200 grid sustains ≥ 4
preview updates/sec with < 250 ms latency; idle frames cost ~0 CPU.*

### M5 — WASM + WebGPU backends (§22, §23.5)

- [ ] Profiling harness: per-stage timings surfaced in a debug panel
- [ ] Rust crate: Floyd–Steinberg (SIMD), wasm-pack build wired into Vite + `check`
- [ ] WASM backend registered for dither stage; golden tests bit-exact vs TS
- [ ] WebGPU compute: LUT build + palette mapping (WGSL); tolerance-tested
- [ ] Automatic backend selection (feature-detect + profile); TS fallback verified by disabling both in tests
- [ ] Benchmark test asserting architecture.md budgets at 1024×1024

*Acceptance: full pipeline ≤ 100 ms at 1024×1024/64 colours on the
dev Mac; all backends pass the same golden suite.*

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

**Parked next (post-MVP, triage from wish-list):** more dithering
algorithms, user-defined palettes, symbols + B/W charts, multi-page
PDF, advanced grid/tick styling presets, thread estimates, Tauri
packaging.

<!-- Ticket grammar (CANONICAL COPY — prompts and workflows point here,
     they do not restate it): quick items stay one line. Non-trivial or
     sign-off items add two lines so intent survives compression:
       - **ID Short title** [flags]
         Intent: the outcome wanted.
         Done when: the acceptance condition.
     Flags: [sign-off] (scope sign-off first → full mode), [blocked: X],
     [spike] (timeboxed investigation → spike mode in task.md),
     [detail] (has a ticket file), [maintainer] (human-owned, not agent
     work), [security] (live exposure — a leaked credential or open auth
     hole; nothing weaker).
     Standing items — [maintainer], [sign-off], or [blocked] work that
     waits across sessions — carry their creation date (YYYY-MM-DD) so
     Start B can surface their age at the pick and Diagnose can flag the
     stale ones. A [security] item is a standing item by definition and
     additionally prints a one-line session-start banner until closed;
     flag a leaked-credential tracking item [security] on creation
     (tracking is not remediation — rotate first).
     Add optional Scope:/Risks: lines only for sign-off items. -->

<!-- Optional detail file: when an item needs more context than its line
     can hold (research, options explored, acceptance detail, links),
     put it in pm_skills/project/tickets/<ID>.md and add the [detail] flag
     to the item. Cold tier — agents read it ONLY when that item is the
     active task, so Active stays terse. Working context only; the "why"
     still goes to decision-log.md on ship. The file is deleted when the
     item ships or is cut — it does not outlive the item. -->
