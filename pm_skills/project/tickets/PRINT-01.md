# PRINT-01 — The print plan: size presets with floors, a planner that fits the paper

Scoped 2026-08-23 (the round's integrator chat, on the owner's brief).
Builds at the end of the current cycle; M16's sitting signs the
standard on paper first and is the evidence this builds to.

## Why

The PDF path renders the chart as a raster (12–40 px cells) and scales
it to fit the page, so the physical stitch is a consequence of page
fit, never a setting: a 200² design on one A4 page is 0.89 mm per
stitch, and because the furniture is sized in raster px against the
chart PNG's 10 px cell, row numbers print at ≈ 2.3 pt and minor lines
at 0.2 pt at every paging. The planner tiles at a fixed "stitches per
page", leaves slivers (200 at 60 = 60/60/60/20), and the key truncates
names. None of that is readable by construction.

## Owner decisions at scoping (2026-08-23)

- The preset sizes below stand as starting values (signed on paper at
  M16's sitting).
- **Every print size derives from one type scale**, so a later "+2 pt
  everything" is one edit and one proof run — a `PRINT_SCALE` table in
  core: per preset one base pt; key rows = base, row/column numbers =
  base − 2, footer = base − 3, title = base + 2, and the cell floor
  derived from the glyph height (symbol ≈ 0.7 × cell). Nothing else
  may hold a pt value.
- **No backward compatibility for print settings.** Old files still
  load (never refused; the round trip holds), but `export.pdf` is
  replaced by the print-plan model and old files reset to the new
  defaults with the D114 migrated note.
- Printing smaller stays available but user-directed; nothing below
  Compact is offered.

## The standard

| Preset | Text (key, footer) | Numbers | Cell floor | Who |
| --- | --- | --- | --- | --- |
| Readable (default) | 12 pt | ≥ 10 pt | ≥ 3.5 mm | most people, arm's length, no magnifier (the 12–14 pt clear-print guidance) |
| Large print | 16 pt | ≥ 13 pt | ≥ 5 mm | low vision, poor light |
| Compact | 9 pt | ≥ 8 pt | 2.5 mm (the M9 evidence's floor) | fewer pages, deliberately |

Furniture in the PDF becomes ratios of the cell with pt floors (lines
0.3 / 0.6 pt minimum — hairlines drop out on many printers).

## Controls (the Export section's PDF options, replaced)

Paper (A4 · Letter · A3 · Tabloid; default from locale) · Orientation
(auto · portrait · landscape; auto picks per design, uniform across the
document) · Print size (the preset) · Pages (a stepper over the cell
sizes that tile cleanly, reading "17 pages · 2.9 mm per stitch";
stepping below the preset's floor offers Compact in a sentence, never
silently) · Key (with the chart · separate · per page — PRINT-02) ·
Large format (one page at true size, e.g. 57 × 57 cm for 200² Readable,
for an A3 printer or a print shop). Advanced: margin (≥ 10 mm), overlap.
Removed: stitches per page. The section shows the alternatives the
planner computed ("17 portrait · 13 landscape · 6 on A3 · 1 sheet") with
the best preselected.

## Planner

Balanced tiles (equal fresh spans, no slivers); page count derived from
paper, orientation and cell; the 1024² case names its page count and
steers to large format or Compact rather than printing 300 pages.

## Typeface — an option for the design gate

The owner's pixel fonts in `_user-guff/demo images/fonts/`: Press Start
2P (OFL 1.1), Pixel Operator (CC0), a bitmap family with permissive
terms in its LICENSE file, and m5x7 (no licence file — confirm before
use). Pixel faces have no
hairlines, so a digit survives small sizes and draft ink where
Helvetica's thin strokes vanish, and the chart is a pixel grid anyway.
Options: (A) Helvetica at the preset sizes; (B) a pixel face for
numbers and tile labels only, **baked to vector paths at build time**
the way the M9 glyphs are drawn (a dev-only script, no runtime
dependency, works under Node for the proof set; key prose stays
Helvetica); (C) embed an accessibility text face (Atkinson's, or IBM Plex Sans) for the key — needs
`@pdf-lib/fontkit`, a new runtime dependency, approval required. Decide
at the design gate with proof prints of A and B.

## The other design decision

Raster tiles (today) versus a vector chart path — raster colour fill
with vector grid, numbers and symbols. Vector prints crisper and makes
PRINT-TEST-01 fully runnable under Node; the cost is file size at 1024²
(a rect per stitch). Hybrid is the likely answer.

## Model and schema

A print-plan block replaces `export.pdf`; schema bump — one per round:
ICE-RECOLOUR-01's layer A holds v11, so share it or take v12. Migration
resets and labels; `gridStyle.print`'s meaning changes from raster px
to ratios (doc delta for M11).

## Risks

Page explosion at large grids; Helvetica is Latin-1 (`?` for non-Latin
titles); printer unprintable margins; a dependency if (C) is chosen.

## Done when

A 200² design prints at ≥ 3.5 mm per stitch with ≥ 10 pt numbers by
default; the Export section shows the alternatives and picks the best;
the plan model replaces `export.pdf` with old files loading under the
migrated note; save → load → save byte-identical; PRINT-TEST-01 green
at every preset.
