# M7-BRAND-01 — Thread-brand data model

## Outcome

Thread identity, display colour, brand, catalogue reference, name, palette
membership, ownership, and availability are separate concepts. At least DMC and
Anchor load as distinct brands, and visually identical or near-identical threads
are never merged merely because their RGB values match.

## Current baseline

- `PaletteEntry` is a flat `{ code, name, hex, rgb, manufacturer }` object.
  Identity is implicit in `manufacturer + code`; no stable IDs, availability,
  source provenance, aliases, or palette-membership objects exist.
- The protected owner CSV has 679 rows with `DMC,Anchor,Hex,Description` and a
  populated Anchor cell on every row. The generator collapses it to 533 unique
  DMC entries, first occurrence wins, and stores only the first Anchor
  cross-reference in generated data.
- `loadDmcPalette()` discards even that Anchor field and hard-codes manufacturer
  “DMC”. The CSV is a cross-reference map, not proven independent digital colour
  measurements for Anchor. Reusing the DMC hex for an Anchor code must therefore
  be labelled as mapped/derived data, not manufacturer-authoritative colour.
- `computeStats` reconstructs a reference from output RGB and keeps the first
  palette entry for a duplicate RGB. A plain `PixelBuffer` therefore cannot tell
  two same-RGB thread references apart after reduction.
- LUTs and candidate tables correctly key on ordered palette RGB content (D46),
  but equal RGB arrays with different thread identities can intentionally share
  colour math while still requiring different output references.

## Recommended domain separation

Use a stable compound thread identity such as `brandId + reference`, with brand
metadata held once. A thread record should distinguish catalogue identity from
its sRGB display approximation and carry provenance/status explicitly. A palette
then contains ordered thread identities or snapshots; inventory and availability
are separate overlays keyed by identity. Do not overload `Palette.name` with a
brand filter.

The processing path needs an index-preserving result alongside RGBA. Mapping to
RGB and later reverse-looking-up the reference is ambiguous. The architecture
already permits index buffers “where noted”; M7 should decide whether the reduce
and dither stages return a palette-index sidecar, whether the worker derives it
without a second colour match, and how stats/exports receive it. The RGBA
`PixelBuffer` remains the visual pipeline currency and TS reference ground truth.

Tie-breaking must stay deterministic. If two enabled entries have the same
display RGB, palette order may choose one, but the UI must expose that choice and
must not collapse the records. Reordering is therefore identity-significant even
when rendered pixels do not change.

## Data ingestion questions

Before calling Anchor a second supported brand, validate the owner CSV's licence,
meaning of one-to-many rows, `NA` semantics, duplicate Anchor references, retired
codes, and whether names/hex values describe DMC or Anchor. Record data-source
version/provenance. The build script should generate deterministic brand records
from the protected source; generated files are never hand-edited.

## Likely implementation surface

- `src/core/types.ts` / a focused `src/core/thread-catalogue.ts` — brand, thread,
  identity, provenance, and palette-reference contracts.
- `scripts/build-palette.mjs` plus generated outputs — deterministic two-brand
  ingestion after the data meaning is confirmed.
- `src/core/palette.ts`, reduce/dither output contracts, worker protocol, stats,
  chart/PDF keys, and project persistence.
- Existing palette, reduce, dither, stats, LUT-cache, worker, project, and export
  tests need same-RGB/different-reference and near-equal-reference fixtures.

## Acceptance evidence

Prove two brands load with stable distinct IDs; every `(brand, reference)` is
unique; duplicate/near-equal RGB values remain separate; generated counts and
provenance are deterministic; reduction returns the chosen reference without a
reverse RGB guess; stats and exports show the same identity; and save → load →
save/output round trips. Golden image bytes need not change if only identity
sidecars are added.

## Risks and dependencies

- Treating a cross-reference as an independent colour catalogue can create false
  accuracy. Surface provenance.
- Adding identity sidecars crosses core, worker, stats, exports, and schema; scope
  this foundational change before building brand UI.
- Never edit the owner CSV or generated `dmc.json` by hand.

## References

- Requirements: `docs/requirements.md` §§5–6, §11, §17, and §20.
- Decisions: D13 (palette model), D29 (thread key), D46 (content/order cache
  identity), D49 (palette-membership acceptance).
- [DMC official numerical colour list](https://www.dmc.com/media/color_charts/DMC_Embroidery_Floss_Numerical_List_2021.pdf).
- [Anchor official stranded-cotton range](https://anchorcrafts.com/products/anchor-stranded-cotton-mouline-2).
