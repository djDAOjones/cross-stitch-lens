# Brief — Pattern Mapper

<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->

## What we're building

A web application that converts visual artwork into cross-stitch
designs in real time. The user edits artwork in another application
(typically Photoshop); Pattern Mapper continuously captures a selected
screen region and renders a live cross-stitch interpretation.

Built and measured on macOS first; since D149 that is where it started,
not what it targets — see "Who it's for".

Two core reductions define the product:

- **Spatial reduction** — source image → fixed stitch grid
  (e.g. 200 × 200 stitches, max 1024 × 1024).
- **Colour reduction** — source colours → a selected thread palette,
  with dithering as a first-class creative tool.

Full requirements: `docs/requirements.md` (cite section numbers,
do not duplicate content into memory files).

## Who it's for

Primary user: the project owner (personal creative use on macOS).

**Widened 2026-08-11 (D149).** The owner intends to publish the app
online to a broader audience who "could be using it on anything", which
moves wider distribution from *planned later* to *intended*, and has
three consequences the roadmap must respect:

- **"macOS-first" is no longer the product**, only where it was first
  built and measured. Cross-platform behaviour stops being a
  don't-foreclose-it constraint and becomes a requirement.
- **No upstream editor can be assumed.** Much of the design rests on
  the user editing in Photoshop beside the app; a broader audience may
  have nothing of the kind. This is why controlling the image inside the
  app — adjustments and colour thresholds as presets (ICE-ADJUST-01) —
  is product scope rather than duplication of a better tool.
- **Redistribution changes licence questions**, most immediately M9's
  symbol font or asset choice: embeddable for personal use in a local
  web app and redistributable in a published app are different answers.

Architectural choices must not foreclose it (hence web platform,
offline-capable, Tauri as a future packaging path — ICE-TAURI-01).

## MVP scope (build this, nothing more)

This is the **original** MVP definition, kept as the record of what was
committed first. M0–M5 delivered it; the roadmap since (M6–M12,
restructured in D51) deliberately extends past it — most visibly M7,
which replaced item 1's "one preset thread palette" with an eight-brand
catalogue and a full policy layer. Read it as intent, not as the
current feature list; `README.md` has that.

1. **Engine** — image-file import; custom grid width/height; full-RGB
   mode or one preset thread palette; resize to grid; nearest-colour
   palette reduction (CIELAB via LUT); Floyd–Steinberg dithering
   on/off; comparison of two processing orders.
2. **Preview & info** — zoomable pixel-grid preview with optional grid
   lines, major grid interval, basic tick marks, row/column
   numbering; live colour count, stitch count, per-colour counts.
3. **Exports** — clean PNG (1 stitch = 1 px), enlarged PNG (integer
   nearest-neighbour scale), styled PNG chart, basic single-page PDF
   chart; save/load project as versioned JSON.
4. **Live capture** — screen/window capture via `getDisplayMedia`,
   user-drawn crop rectangle, pause/resume, skip unchanged frames.
5. **Performance backends** — Rust→WASM error diffusion and
   WebGPU colour reduction behind the same stage interface as the
   TypeScript reference implementation, adopted only where profiling
   shows the TS version misses budget.

## Performance bar

Interactive feel while editing in Photoshop: ≥ 4 preview updates/sec
at typical grids (≤ 300 × 300); full pipeline ≤ 100 ms at the
1024 × 1024 maximum. Exports always run at full quality regardless of
preview mode. (The 1024² ≤ 100 ms line was retired at the M13
synthesis — D135: 1024² is an export/finishing grid bound by
correctness and honest published medians, not a live-editing target.
The ≥ 4 updates/sec promise binds at the driven capture leg.)

## Explicitly out of scope for MVP

Multiple dithering algorithms beyond Floyd–Steinberg (since shipped
post-MVP: M8's five-method expansion — D61/D62), user-defined
palettes and palette import/export UI, symbols and pattern keys,
multi-page PDF, advanced grid/tick styling, thread-length estimates,
fabric simulation, image adjustments beyond the pipeline hooks,
Photoshop plugin integration (explicitly rejected — see
decision-log), embroidery machine formats, cloud/collaboration.
These live in `wish-list.md` / requirements §25.

## Success criteria

- Editing in Photoshop with live preview feels responsive (no
  perceptible lag at 200 × 200).
- A stitchable chart PDF can be printed from a captured design.
- A saved project reopens with identical output (golden-test
  guarantee).
