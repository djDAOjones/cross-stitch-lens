# Brief — StitchLive (working title)

## What we're building

A macOS-first web application that converts visual artwork into
cross-stitch designs in real time. The user edits artwork in another
application (typically Photoshop); StitchLive continuously captures a
selected screen region and renders a live cross-stitch interpretation.

Two core reductions define the product:

- **Spatial reduction** — source image → fixed stitch grid
  (e.g. 200 × 200 stitches, max 1024 × 1024).
- **Colour reduction** — source colours → a selected thread palette,
  with dithering as a first-class creative tool.

Full requirements: `docs/requirements.md` (cite section numbers,
do not duplicate content into memory files).

## Who it's for

Primary user: the project owner (personal creative use on macOS).
Wider distribution planned later — architectural choices must not
foreclose it (hence web platform, offline-capable, Tauri as a future
packaging path).

## MVP scope (build this, nothing more)

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
preview mode.

## Explicitly out of scope for MVP

Multiple dithering algorithms beyond Floyd–Steinberg, user-defined
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
