# ICE-RECOLOUR-01 — Colour swap (layer A)

## The ask (owner, 2026-08-22)

Put up for review "a pixel editor and a colour swap function — or
something that gives users the creative potential to move beyond
realism in the colour mapping", possibly as an additional processing
layer, plus (same day, "for later deep thought rather than solving
now") "optional controls for making an image have a specific %
distribution of palette colours … very useful in 1-bit / 2-state
situations". Context: the first live-app feedback (MUST-01, COUNT-01)
and D149 — a broader audience may have no upstream editor, so
controlling the final picture inside the app is product scope.

The chain is realist end to end: membership → count-limited selection
→ nearest colour in Lab (+ dither). Every lever is indirect, and a
Must-use seat is a palette place, never stitches — D178 closed the
seat half and handed presence here. Nothing lets a user say "*this*
thread, *here*".

## The layers, and where they live now

This item opened with three layers (D173). At the 2026-08-23 icebox
triage (D188) it **narrowed to layer A**, the build-ready swap; the
others moved to scoping tickets of their own:

- **A. Colour swap (thread → thread remap)** — this ticket. A pure
  stage after the colour stage that rewrites the palette-index
  sidecar: "everywhere the mapper chose X, stitch Y". Stitches,
  counts, estimates, the key and symbols follow the sidecar. Reduce
  keeps matching against the *selected* colours — a swap changes what
  a chosen entry renders as, not what the mapper matches to — so the
  LUT fingerprint (D46) is untouched. Cost O(cells). Signed, scoped
  and optioned below.
- **B. Pixel editor (cell overrides)** → `PAINT-01`. The seed
  paragraph and the signed constraints (stills only in v1; after A)
  moved with it.
- **C. Controls inside the quantiser** — C1 tone-only matching and C2
  the target % distribution → `CREATIVE-01`, as candidates beside the
  adjustments, the contact sheet, the provenance view and the
  eyedropper. Threshold levels are ICE-ADJUST-01's slice there.

## Signed 2026-08-23

The owner's answers, relayed through the run coordinator (the owner's
veto stands until this ticket merges). Base: `main` at `f33a3cb` —
DUR-01 merged (schema v10, D179), MUST-01 shipped as auto-pin (D178).

1. **A swap target comes from the whole universe** — every brand, the
   generated maps, custom colours, any other palette entry (a merge).
   A target never enters selection, so it cannot break what the
   profile promises; D178 settled the principle one layer down. The
   browse ignores "only threads I own" — the key lists it to buy.
2. **"Swap…" lives on the Colours-used row** beside Highlight and
   Remove, opening the shared browse table. After X → Y the table
   shows Y's row labelled "swapped from X", and Swap… there
   **re-targets** the same swap — swaps never chain. The swap *state*
   has a second home: a Swaps chip list in the Colour section beside
   Must-use, where a **dangling** swap (X no longer selected) is kept
   and explained. Rows past the 30-row cap get no verb (accepted).
3. **B paints stills only in v1** — import, sample, paused or grabbed
   capture, restored design. Overrides are held across frames; the
   brush is off while frames flow. "Live too" is not v1; revisit on
   demand.
4. **Order A → C1 → B.** B depends on A's render palette; A closes the
   presence half of MUST-01; C1 is params only.
5. **A swap is a design rule** in `palette.design` beside `count`,
   `minDistance` and `mustUse` — never in the recipe for now. `from`
   is the selected entry's id; `to` is a full thread record (snapshot
   semantics, D55). A recipe-level "render X as Y" is an additive
   later option once C1 exists.

## Layer A — scope (approved 2026-08-23)

- **Render palette**: the selected entries (indices unchanged) plus
  render-only targets appended in swap order, derived by one pure
  helper called in the worker and on the main thread. A merge target
  maps to its existing index; the map is applied once.
- **Persistence**: `palette.design.swaps: [{ from, to }]`, empty
  default; v10 → v11 seeds `[]`; validated like `snapshot`, capped so
  the render palette stays under `MAX_PALETTE_ENTRIES`; canonical
  order after `mustUse`. The `projectJson` baseline hash re-pins
  (intended, the D165 precedent); the engine hashes must not move.
- **Inert cases**: the stage is omitted (the `adjustIsIdentity`
  precedent) with no palette, no active swap or no sidecar — zero
  cost when unused, never aliasing a retained frame. Dangling swaps
  are inert. A loaded `reduce-first` file runs it after the colour
  stage at source resolution, as that stage already does.
- **Dithering**: error diffuses against X; Y renders — the effect.
- **Consumers that switch to the render palette** (`src/main.ts`):
  stats, key entries, highlight `indexFor`, `syncSymbolsToPalette`;
  `highlightInvalidated` fires on any swap change.
- **Out of scope**: recipe-level swaps and swap-to-fabric (both
  wish-list); full-RGB mode (no sidecar — chips stay, inert); the
  profile editor's preview rig applying design swaps; swap-set
  import/export; an undo stack (Remove is the undo); layers B and C1.
- **Files**: new `src/core/pipeline/swap.ts` (`ThreadSwap`,
  `renderPalette()`, the stage); `src/core/pipeline/config.ts`
  (`PipelineConfig.swaps`, `buildStages`, the full-RGB twin drops
  them); `src/core/project.ts` (v11); `src/main.ts`;
  `src/ui/info-panel.ts` (`onSwap` column, provenance label);
  `src/ui/colour-section.ts` (chips, `removeSwap`, helper text);
  `shell.css` only if a chip rule is needed. Tests: new
  `tests/swap.test.ts` (remap, merge, no-chain, empty cells, dangling
  inert, omitted when inert) plus additions to `pipeline-config`,
  `worker-executor` (render-space sidecar), `project` (migration,
  byte-identical round trip, refusals), `stats` / `export-artefacts`
  (Y counted and keyed; a `map:` / `user:` target keeps its
  provenance label), `symbols-assignment` (a target takes a grant at
  export), `info-panel`; `tests/ui-baseline/hashes.json` (re-pin).
- **Close-time flags**: runtime lifecycle n/a; swap set/removed logged
  through the structured logger (ids only); gate unchanged; doc-delta
  lines for the UI spec's census and `architecture.md`'s project-file
  paragraph.

## Layer A — option (picked 2026-08-23)

**Option 1: a pure `swap` stage after the colour stage, over the
sidecar, with the render palette.** `config.swaps` → `buildStages`
derives `{ renderPalette, map }` and appends the stage when active; it
rewrites each cell's index through the map and repaints the RGB from
the render palette, alpha untouched. Rejected: folding the remap into
reduce/dither (touches the protected colour stages, both backend
adapters and the golden/parity signatures, for one fewer O(cells)
pass), and resolving at the palette layer (the mapper would match
against Y — a membership edit in disguise; the merge case is already
Remove). **Picker**: a modal, "Swap X for…", hosting the shared browse
table; a pick applies and closes; focus returns to the row's Swap…
button. Unchanged: selection and resolution, the LUT cache and both
backends, `stats.ts` / `key-entries.ts` / `assignment.ts`, the
profile editor and its rig, the `.pmproj` container, the golden
fixtures.

**Build note**: ready to build; next free schema is **v11**; the only
bump in its round. Full mode from the plan gate — stages 3–4 not run.

## References

- Requirements: §5.1, §6, §9, §20.
- Decisions: D46, D114/D116, D135, D149, D160/D165, D171/D179
  (DUR-01), D173 (this item opens), D178 (MUST-01's seat half;
  presence is here), D182 (the signature), D188 (narrowed to layer A).
- Related items: CREATIVE-01, PAINT-01, PICK-01, ICE-SYMBOL-UI-01.
