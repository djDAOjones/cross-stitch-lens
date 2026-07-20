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

### M6 — Photoshop companion layout

Make Cross Stitch Lens work well in a tall, narrow window beside
Photoshop, preview taking most of the space. Terminology contract:
*pattern resolution* (stitches) / *capture resolution* (source px) /
*preview scale* (screen px per stitch) / *export scale* are four
independent things.

- [ ] **M6-CAPRES-01 Rescale the capture frame independently of pattern resolution** [detail]
  Intent: set the pattern (canvas) resolution explicitly, then resize the on-screen capture frame with its aspect ratio locked to the pattern's — captured pixels rescale onto the fixed stitch grid.
  Done when: resizing the capture frame changes neither the stitch count nor the grid dimensions, and the frame cannot leave the pattern's aspect.

- [ ] **M6-SCALE-01 Separate pattern, capture, preview, and export scale** [detail]
  Intent: one model + UI terminology keeping the four resolutions independently settable and impossible to confuse.
  Done when: changing any one provably leaves the other three untouched, in tests and in the visible labels.

- [ ] **M6-VIEW-01 Preview zoom and fit controls** [detail]
  Intent: fit-to-space / fit-width / fit-height, user zoom, crisp nearest-neighbour enlargement, stitch-dimensions readout, reset view, persisted preview scale.
  Done when: the preview enlarges without changing stitch count, colours, or export output, and the chosen scale survives reload.

- [ ] **M6-NARROW-01 Narrow-window layout** [detail]
  Intent: preview gets most of a tall narrow window; controls reflow; no horizontal scrolling; popovers/dialogs stay visible; targets stay ≥ 44 px.
  Done when: the app is usable at realistic side-by-side widths while live capture runs, with no material responsiveness regression.

- [ ] **M6-PANEL-01 Collapsible configuration panel** [detail]
  Intent: collapse/expand the settings panel (keyboard accessible); preview auto-enlarges; essential status stays visible; collapsed state remembered.
  Done when: collapse works at wide and narrow widths and across resizes without losing settings.

- [ ] **M6-FOCUS-01 Preview-focused mode** [detail]
  Intent: one consistently-named mode hiding most controls; live updates continue with zoom/fit/pan and a compact status line (grid size, palette, colour count, capture/staleness state).
  Done when: entry/exit is fast, no state is lost, and the status line stays legible.

- [ ] **M6-WIN-01 Companion-window sizing spike** [spike] [detail]
  Intent: timebox what the browser can do — resize its own opened window, dedicated companion window, size presets, restore position, multi-monitor — vs. what needs packaging. Feeds ICE-WORKSPACE-01.
  Done when: findings and a promote/park recommendation are recorded; no capability assumed untested.

*Acceptance: Photoshop + Cross Stitch Lens work side by side at a
realistic narrow width; pattern dimensions are independent of capture,
display, and export; the preview enlarges without changing the pattern;
live editing keeps the ≥ 4 updates/sec promise.*

### M7 — Palette & colour strategy

One connected workflow: brands → inventory → palettes → presets →
counts → locks → auto-fill. Rides M5 evidence: LUT cache key fixed
(D46); GPU LUT build 59–655× faster than TS (D47), so per-palette
rebuild during live editing is plausible.

- [ ] **M7-BRAND-01 Thread-brand data model** [detail]
  Intent: keep display colour, brand, reference, name, palette membership, inventory status, and availability distinct; ingest a second brand (Anchor cross-reference already on the DMC map).
  Done when: two brands load with distinct references and near-equal digital colours are never merged.

- [ ] **M7-BRAND-02 Brand selection and restricted conversion** [detail]
  Intent: enable/disable brands; conversion restricted to enabled brands; brand/reference/name visible per colour; brand switching without manual project rebuild.
  Done when: conversion provably uses only enabled-brand references and switching preserves the project.

- [ ] **M7-INV-01 Personal thread inventory** [detail]
  Intent: reusable cross-project inventory — mark owned, add/remove, filter by brand/family/search, import/export; "only use threads I own" as a conversion restriction.
  Done when: an inventory-restricted conversion uses only owned references and the inventory persists across projects.

- [ ] **M7-PAL-01 Named custom palettes** [detail]
  Intent: create/edit/duplicate/delete named palettes seeded from a brand, inventory, or preset; multi-brand; import/export; missing/retired/duplicate references surfaced, not hidden.
  Done when: a project restricted to a saved palette reproduces identically on reopen, including defined missing-reference behaviour.

- [ ] **M7-PRESET-01 Curated colour-scheme presets** [detail]
  Intent: ready-made schemes (pastels, earth tones, monochrome, limited-N…) resolving to real references from enabled brands; previewable; duplicable into a custom palette; strict-palette vs preference application kept distinct.
  Done when: presets apply predictably, degrade visibly when a brand is disabled, and save as personal palettes.

- [ ] **M7-COUNT-01 Target / maximum colour count** [detail]
  Intent: exact or maximum colour-count requests with automatic reduction; requested vs actual shown with the reason for any gap; edge cases (count > palette, locked > count, indistinguishable threads) defined.
  Done when: limits are never silently violated and every divergence is explained in the UI.

- [ ] **M7-MIX-01 Locked, preferred, and excluded colours with auto-fill** [detail]
  Intent: lock/prefer/exclude colours and let the app pick the rest within the permitted set; re-run keeps manual choices; conflicts explained, never silently overridden.
  Done when: "lock 5, request 15" fills 10 from the permitted palette and each conflict case has a visible explanation.

- [ ] **M7-ACCEPT-01 Palette workflow acceptance** [sign-off] [detail] (2026-07-20)
  Intent: verify the combined workflow's worked examples under live editing, persistence, and export.
  Done when: saved projects reproduce identically, exports carry correct brand + reference only from the permitted set, and live editing has no material regression.

*Acceptance: the §3 workflow examples pass end-to-end (choose DMC and
reduce to 20; owned threads only, best 15; lock 5 and auto-fill;
preset → edit → save as palette).*

### M8 — Dithering expansion

Rides the M5 search structures; algorithms land as user choices, not
fidelity tiers (D47). Bayer/blue-noise are the natural first WebGPU
wins.

- [ ] **M8-SPIKE-01 Dither algorithm evaluation** [spike] [detail]
  Intent: evaluate Atkinson, Jarvis–Judice–Ninke, Stucki, Sierra family, ordered/Bayer, blue-noise on representative content (gradients, photos, flat art, tiny palettes) for quality, cost, and WebGPU fit; pick the committed set and control surface.
  Done when: the committed algorithm set and which controls earn UI exposure are recorded with evidence.

- [ ] **M8-ALG-01 Implement the chosen algorithms** [blocked: M8-SPIKE-01] [detail] (2026-07-20)
  Intent: each chosen algorithm as a deterministic stage variant — TS reference first, parity-gated accelerated path where justified; no silent fallback between methods.
  Done when: each algorithm is golden-tested, deterministic, selectable without losing other settings, and export matches preview.

- [ ] **M8-CTRL-01 Dithering controls and presets** [detail]
  Intent: only controls with understandable visible effects (strength, serpentine, matrix size — as spike evidence supports), plus plain-language presets (None/Subtle/Balanced/Strong/Photograph/Graphic/Very limited palette) mapping to documented settings.
  Done when: every shipped control and preset has a documented, reproducible effect that survives save/reopen.

- [ ] **M8-ACCEPT-01 Comparison view and visual-quality acceptance** [detail]
  Intent: compare against no-dither (split compare exists) and between methods; inspect stitch placement at zoom; judge banding, noise, edge damage, isolated stitches, stitchability on the representative set.
  Done when: the evaluation evidence is recorded and live editing stays usable across all shipped methods.

### Next milestones (stubs — expand into tasks when each becomes Next)

- [ ] **M9 Symbols & B/W charting** — automatic distinct-symbol
  assignment (stable, reassignable, collision-handled), chart modes
  (colour / colour+symbols / B/W / high-contrast), full sortable colour
  key with brand + reference + stitch count.
- [ ] **M10 Multi-page PDF chart export** [blocked: M9 for symbol charts] (2026-07-20) —
  A4/Letter pagination, overlap + registration marks, consistent
  coordinates + overview map, vector grid/symbols, export options.
- [ ] **M11 Grid, ruler & tick styling presets** — minor/major grid
  styling, numbering/rulers, named style presets incl. high-contrast,
  separate screen vs print settings.
- [ ] **M12 Fabric & thread estimates** — fabric count → physical
  size, cut margins, centre point; qualified per-colour thread/skein
  estimates with stated assumptions; recalculates on pattern/palette
  change.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [detail] (2026-07-20)
  Intent: one-button side-by-side arrangement of Photoshop and Cross Stitch Lens — limited companion-window workflow in the browser, fuller OS window control (incl. moving Photoshop via macOS Accessibility) only in a packaged desktop build. Depends on M6-WIN-01 findings and ICE-TAURI-01.
  Done when: the user can select a display and preferred split, arrange both applications predictably, continue live capture, and restore the previous workspace without losing state.

- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] (2026-07-20)
  Intent: timebox Tauri fit — capture permissions, window management, macOS notarisation / Windows signing, project-file compatibility, updates — and whether packaging materially improves the Photoshop workflow. Packaging/release work is backlogged only if this passes.
  Done when: a go/no-go recommendation with a delivery outline is recorded.

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
