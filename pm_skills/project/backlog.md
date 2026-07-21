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

### M7 — Palette & colour strategy

Shipped and accepted 2026-07-21 (D55/D56/D57). One item remains, and it
is here rather than in M8 because it completes operations the shipped
library UI is missing rather than adding anything new: a user can
create library palettes but never reorder or remove one, and can only
build an inventory one checkbox at a time.

- [ ] **M7-LIB-01 Complete the thread-library UI** [detail] (2026-07-21)
  Intent: the library operations deferred at ship — keyboard-accessible palette reordering (order is identity-significant, D46, so its absence means a documented edit cannot be performed at all), bulk owned/not-owned over the current filter with a confirmation, and recoverable palette deletion (no delete route exists today).
  Done when: reordering is reachable by keyboard, a bulk change states its count and is reversible, and no palette deletion can lose a saved project's rendering.

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

- [ ] **M9 Symbols & B/W charting** [detail] — automatic distinct-symbol
  assignment (stable, reassignable, collision-handled), chart modes
  (colour / colour+symbols / B/W / high-contrast), full sortable colour
  key with brand + reference + stitch count.
- [ ] **M10 Multi-page PDF chart export** [blocked: M9 for symbol charts] [detail] (2026-07-20) —
  A4/Letter pagination, overlap + registration marks, consistent
  coordinates + overview map, vector grid/symbols, export options.
- [ ] **M11 Grid, ruler & tick styling presets** [detail] — minor/major grid
  styling, numbering/rulers, named style presets incl. high-contrast,
  separate screen vs print settings.
- [ ] **M12 Fabric & thread estimates** [detail] — fabric count → physical
  size, cut margins, centre point; qualified per-colour thread/skein
  estimates with stated assumptions; recalculates on pattern/palette
  change.

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

- [ ] **ICE-XREF-01 Curated cross-reference ingestion** [blocked: owner data] [detail] (2026-07-21)
  Intent: ingest owner-reviewed thread equivalences so "nearest equivalent" answers from published conversions rather than colour distance alone. The engine half shipped with M7 (`thread-equivalents.ts` already takes a curated map and prefers it); this is data plus a generator.
  Done when: curated equivalences load, override the computed answer, and are visibly labelled as published rather than computed — with the computed path still filling the gaps.
  Blocked twice over: `thread-map-proposed.csv` has a header and zero data rows, and nothing in the UI surfaces equivalents yet — ICE-EXPLORER-01 is its natural first consumer. Reactivate when the owner supplies groupings; the recommended shape is long/tidy (`group_id,brand,code`), not the current wide one-column-pair-per-brand form (D56).

- [ ] **ICE-PRESET-01 Curated colour-scheme presets** [maintainer] (2026-07-21)
  Intent: replace or supplement the four shipped algorithmic LCh presets with owner-reviewed membership lists, so "Pastels" means what a stitcher expects rather than what a chroma threshold selects. The resolver already supports it — a curated preset is a rule returning a fixed set.
  Done when: each curated preset has owner-signed membership and the UI distinguishes curated from algorithmic.
  Blocked on owner taste input, not on code (D55).

- [ ] **ICE-EXPLORER-01 Colour explorer** [detail] (2026-07-21)
  Intent: a dedicated view over the 3,338-thread catalogue for browsing rather than converting — filter and sort by brand, hue/lightness/chroma, ownership; inspect one thread and see its nearest equivalents in every other brand side by side. The engine half already exists (`thread-equivalents.ts`); this is the view. Owner-flagged as a later nicety, not MVP.
  Done when: a thread can be found by eye or by search, and its cross-brand equivalents are readable with their provenance and distance.

- [ ] **ICE-WORKSPACE-01 Automated Photoshop companion workspace** [detail] (2026-07-20)
  Intent: one-button side-by-side arrangement of Photoshop and Cross Stitch Lens. M6-WIN-01 settled the browser half: window placement is parked (D53 — `resizeTo` ignored without error, window-management denied, popups blocked even from a trusted gesture), so this now depends entirely on ICE-TAURI-01 packaging.
  Done when: the user can select a display and preferred split, arrange both applications predictably, continue live capture, and restore the previous workspace without losing state.

- [ ] **ICE-TAURI-01 Tauri desktop packaging feasibility** [spike] [detail] (2026-07-20)
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
