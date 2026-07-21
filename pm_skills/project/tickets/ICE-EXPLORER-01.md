# ICE-EXPLORER-01 — Colour explorer

## Outcome

A view for *browsing* the thread catalogue rather than converting with
it: find a thread by eye or by search across 3,338 records and eight
brands, and see its nearest equivalents in every other brand side by
side.

Owner-flagged as a later nicety when the eight-brand data landed —
"a dedicated colour explorer might be nice, but this can be a later
icebox feature". Parked accordingly; it needs a decision to reactivate.

## Why it is cheap now

The engine half already exists and is tested:

- `src/core/thread-catalogue.ts` — all brands and threads, indexed by
  identity.
- `src/core/thread-equivalents.ts` — `nearestEquivalents()` across any
  brand pair, curated-over-computed, each answer labelled and carrying
  its ΔE.
- `src/core/palette-presets.ts` — `rgbToLch()`, so sorting or filtering
  by hue / lightness / chroma is already available.

What is missing is only the view.

## Sketch

- A filterable, sortable grid or table over the catalogue: by brand, by
  ownership, by LCh band, by text.
- Selecting a thread opens a detail view: its own record (brand,
  reference, name, hex, provenance) plus one row per other brand
  showing the nearest equivalents with source and ΔE.
- Natural entry point for M7-BRAND-03's curated data — this is where
  "published equivalent" versus "closest by colour" earns its keep.
- Read-only, or read-mostly: marking ownership from here would be a
  convenience, but the explorer must not become a second palette
  editor.

## Open questions

- Does it belong in the companion-narrow shell at all, or is it a
  full-width view the user opens deliberately? The M6 layout is
  preview-first at every width and this is not the preview.
- Sorting a 3,338-row list by computed LCh is fine; computing
  cross-brand equivalents for *every* row is not — the detail view
  should compute on selection, not up front.

## References

- Decisions: D56 (eight-brand data, computed-equivalents layering).
- Related: M7-BRAND-03 (curated cross-reference), which this view is
  the natural consumer of.
