# PRINT-02 — Assembly and sequence: join, work page by page, a key per page

Scoped 2026-08-23 with PRINT-01; builds after it, end of cycle.

## Why

A tiled chart is used two ways, and the app serves neither well: taped
into one sheet (the planner gives overlap, trim lines, corner marks and
a footer range — but slivers, no tabs, no instructions), or stitched
page by page (nothing: no continuity cues, no per-page key). Most
stitchers do the second.

## What exists

`src/export/pages.ts` plans leading-edge overlap in row-major order;
`src/export/pdf.ts` draws a cover (title, overview map with the tiling
dashed on, the key once, capped at 40 % of the page) and one page per
tile at one shared scale with L-shaped alignment marks, dashed trim
lines where overlap repeats, and an 8 pt footer "page N of M (chart i,
row r, column c) — columns a–b · rows c–d".

## Scope

- **Join** mode: balanced tiles lettered like a map grid (B3), a glue-tab
  margin on trailing edges, registration marks, and an **assembly page**
  — a diagram of the layout, the tape order, which edge to trim.
- **Sequence** mode: the overlap rows and columns printed *shaded* so the
  join is checked twice, edge labels ("continues on page 7 →"), page
  order following the stitching direction from a chosen corner, and a
  **per-page key** listing only the colours on that page, at the preset's
  text size.
- **Key placement** for both: with the chart/cover, separate page(s), or
  per page; the hex leaves the rich rows so names survive (the M16
  pack's item 9); a "fit the key on N pages" stepper scales rows down to
  the Compact floor and no further. One honest line stays: colours on
  paper are display-only — the symbol and the thread id carry identity
  (D55).
- Cover text tells the user which mode the document is in and how to
  use it.

## Done when

Both modes print from the plan; the cover explains assembly; a
per-page key lists exactly the colours on the page; the pages tape
together by the marks in a tape-up rehearsal (the M10 test, D168); the
proof set covers both modes.
