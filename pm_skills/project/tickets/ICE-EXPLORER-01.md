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
- Related: the curated cross-reference (once M7-BRAND-03, then ICE-XREF-01; now the section below), which this view is
  the natural consumer of.

## Curated cross-reference (absorbed from ICE-XREF-01, 2026-08-23 — D188)

ICE-XREF-01 was cut at the icebox triage: blocked twice over (the
owner's `thread-map-proposed.csv` is a header with zero rows, and
nothing consumes equivalents), and this view is the consumer it was
waiting for. Its design note survives here so the ingestion can start
the day the owner supplies groupings.

**Outcome.** "What is the nearest Anchor equivalent of DMC 310?" is
answered from an owner-reviewed conversion table where one exists, and
from colour distance where it does not — with the user always able to
tell which they are looking at.

**What exists.** `src/core/thread-equivalents.ts` ships the computed
half and the layering: `nearestEquivalents(catalogue, thread, brandId,
limit, curated)` takes a `CuratedMap`, prefers its entries, marks them
`source: 'curated'` with no ΔE, and fills the remaining slots with
computed matches. `NO_CURATED` (an empty map) is the shipped value.

**Shape (D56).** The owner's sketch is **wide** — one name/id column
pair per brand — so every new brand is a schema change to every row,
the file is mostly blank by construction, and a thread in two groups
has nowhere to go. Recommended instead: a **long/tidy** form, one row
per thread per equivalence group (`group_id,brand,code`); a ninth brand
adds rows, never columns, and a bad grouping is a one-line diff. The
one modelling question before ingestion: a true equivalence class
(symmetric) or a directed mapping (DMC 310 → Anchor 403, not
necessarily the reverse). Manufacturer charts are usually directed;
a group is easier to maintain — recommend groups, limitation stated.

**Behaviour to define.** A thread in no group falls through to the
computed answer (the normal case); a group naming a reference this
build's catalogue lacks keeps the entry visible as unresolved, never
silently dropped; curated and computed results are never blended into
one ranking without their labels (`describeEquivalent` already
enforces the wording split); provenance is per answer, not per brand.

**Implementation surface.** `scripts/build-palette.mjs` (or a sibling
generator) ingests the CSV into generated JSON beside the catalogue;
`thread-equivalents.ts` loads it in place of `NO_CURATED`; this view
surfaces it.

**Acceptance.** Every curated reference resolves to a real catalogue
thread; a curated answer outranks a nearer computed one and says so; a
thread outside every group still gets a computed answer; generated
output is deterministic; and the DMC 310 / Anchor 403 case (ΔE 3.3 in
`tests/thread-equivalents.test.ts`) is answered from the table rather
than the maths.

**Risks.** Curated data is the owner's judgement — never invent
groupings to fill the file. A conversion chart is a manufacturer's
claim as much as a measurement; present it as "published equivalent",
not ground truth. DATA-04's `mappedFrom` question refers here.
