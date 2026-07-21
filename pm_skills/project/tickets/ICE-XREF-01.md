# ICE-XREF-01 — Curated cross-reference ingestion

> **Icebox — blocked twice over.** Moved out of M7 at the close triage
> (was M7-BRAND-03). It needs data that does not exist yet
> (`thread-map-proposed.csv` is a header with zero rows) *and* a
> consumer that does not exist yet (nothing in the UI surfaces
> equivalents; ICE-EXPLORER-01 is the natural first one). Reactivate
> when the owner supplies groupings.

## Outcome

"What is the nearest Anchor equivalent of DMC 310?" is answered from an
owner-reviewed conversion table where one exists, and from colour
distance where it does not — with the user always able to tell which
they are looking at.

## Current baseline

`src/core/thread-equivalents.ts` ships the computed half and the
layering: `nearestEquivalents(catalogue, thread, brandId, limit,
curated)` takes a `CuratedMap` (`ReadonlyMap<string, readonly
string[]>`), prefers its entries, marks them `source: 'curated'` with no
ΔE, and fills the remaining slots with computed matches. `NO_CURATED` is
the shipped value — an empty map — so today every answer is computed.

`src/core/palettes/thread-map-proposed.csv` is the owner's sketch of the
data: a header (`hex_code,anchor_name,anchor_id,dmc_name,dmc_id,
cosmo_name,cosmo_id,sullivans_name,sullivans_id,madeira_name,madeira_id,
cxc_name,cxc_id,finca_name,finca_id`) and ~400 rows that are entirely
empty. Nothing reads it.

## Why the shape matters (D56)

The proposed layout is **wide**: one `name`/`id` column pair per brand.
That means every new brand is a schema change to every row, the file is
mostly blank by construction, and a thread belonging to two groups has
nowhere to go.

Recommended instead: a **long/tidy** form, one row per thread per
equivalence group.

```csv
group_id,brand,code
g001,DMC,310
g001,Anchor,403
g001,Cosmo,600
```

Adding a ninth brand adds rows, never columns. Groups are explicit, so
membership can be read off the file and a bad grouping is a one-line
diff. The existing generator pattern applies unchanged: CSV in,
deterministic JSON out, no hand-editing of the output.

Whether the group is a true equivalence class (symmetric — everything
in a group is equivalent to everything else) or a directed mapping
(DMC 310 → Anchor 403, but not necessarily the reverse) is the one
modelling question to settle before ingestion. Manufacturer conversion
charts are usually directed and non-symmetric; a group is easier to
maintain. Recommend groups, with the limitation stated in the UI.

## Behaviour to define

- A thread in no group falls through to the computed answer — this is
  the normal case, not an error.
- A group naming a reference this build's catalogue lacks keeps the
  unresolved entry visible (the `unresolvedThread` pattern), never
  silently dropped.
- Curated and computed results are never blended into one ranking
  without their labels; `describeEquivalent` already enforces the
  wording split.
- Provenance is per-answer, not per-brand: the same query can return a
  curated first result and computed remainder.

## Likely implementation surface

- `scripts/build-palette.mjs` (or a sibling generator) — ingest the
  cross-reference CSV into generated JSON alongside `catalogue.json`.
- `src/core/thread-equivalents.ts` — load the generated map in place of
  `NO_CURATED`; the function signature already accommodates it.
- Wherever equivalents surface in the UI (today: nowhere;
  ICE-EXPLORER-01 is the natural first consumer).

## Acceptance evidence

Every curated reference resolves to a real catalogue thread; a curated
answer outranks a nearer computed one and says so; a thread outside
every group still gets a computed answer; generated output is
deterministic; and the DMC 310 / Anchor 403 case (recorded in
`tests/thread-equivalents.test.ts` as ΔE 3.3 — the right thread at a
non-trivial distance) is answered from the table rather than the maths.

## Risks and dependencies

- Curated data is owner-supplied judgement; do not invent groupings to
  fill the file.
- A conversion chart is a manufacturer's marketing claim as much as a
  measurement; the UI should not present it as ground truth beyond
  "published equivalent".

## References

- Decisions: D56 (data supersession, format recommendation), D55
  (identity model).
- `src/core/palettes/thread-map-proposed.csv` — the owner's sketch.
