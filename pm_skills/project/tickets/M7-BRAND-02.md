# M7-BRAND-02 — Brand selection and restricted conversion

## Outcome

Users can enable one or more thread brands. Every converted stitch is assigned
to a reference from the enabled set, brand/reference/name remain visible, and a
brand change updates the project without forcing a manual rebuild or losing
other settings.

## Current baseline

The Colour panel offers only “DMC palette” or “Full RGB”. `PipelineConfig`
contains one `Palette | null`, while schema v1 stores the palette by one name.
Changing that selection immediately reprocesses the retained source. LUT and
candidate caches are already content-keyed and bounded, so a newly composed
enabled-brand palette can be handled safely if its ordered entries are stable.

Stats and PDF keys currently infer thread references from RGB, which is
insufficient once two brands can contain equal display colours. M7-BRAND-01's
identity-preserving processing result is therefore a prerequisite, not optional
cleanup.

## State and ordering contract

Persist enabled brand IDs as project intent and persist the exact resolved
ordered palette (or an equivalent immutable catalogue/version snapshot) needed
to reproduce output. A bare list such as `["dmc", "anchor"]` is not enough if
catalogue data later changes. New catalogue releases must not silently alter a
saved design.

Define deterministic union ordering. A safe rule is enabled-brand order followed
by catalogue order, with no RGB deduplication. Brand toggles rebuild derived LUT
and candidate structures once, then reprocess latest-wins. The cache fingerprint
must incorporate identity if cached data returns identities; RGB-only derived
math may continue sharing only where that cannot mislabel a result.

The UI should use a checkbox group or multi-select pattern with clear selected
count and an error state when no brand is enabled. “No brand” is not Full RGB;
it is an invalid restricted-palette state. Never silently re-enable DMC.

## Behaviour to define

- When a current locked/preferred/custom-palette thread belongs to a disabled
  brand, preserve the user's choice as unresolved and explain the conflict; do
  not delete it.
- Brand switching should retain grid, capture, view, dither, export, inventory,
  and palette-policy settings.
- If a saved project's catalogue snapshot contains a brand unavailable in the
  current app, render from the snapshot where safe and show the missing catalogue
  state; refusing or substituting requires an explicit migration decision.
- Keep “brand enabled” (allowed conversion universe) separate from “strict
  palette selected” and “brand preferred”. M7-PRESET-01 depends on that split.

## Likely implementation surface

- M7-BRAND-01 catalogue/identity model and generated brand data.
- `PipelineConfig` palette construction, project schema/migration, and worker
  cache invalidation.
- Colour controls in `src/main.ts` or a new focused palette panel module.
- Stats/info panel and export keys for brand + reference + name.
- Tests across core palette construction, cache identity, project round trips,
  UI constraint states, worker output, and exports.

## Acceptance evidence

For DMC-only, Anchor-only, and combined selections, assert every output identity
belongs to an enabled brand. Toggle brands over a still and during live capture;
verify one visible reprocess, no stale LUT, no lost settings, and an explained
empty selection. Save/reopen each case against a changed in-memory catalogue to
prove the reproducibility contract. Manually inspect labels, keyboard operation,
loading/error states, and the ≥4 updates/sec M7 acceptance bar.

## Risks and dependencies

- Large combined palettes raise cold LUT/candidate preparation cost, especially
  for dithering. Measure the actual two-brand size; do not infer from D47's DMC
  figures.
- Same-RGB threads make reference identity impossible to reconstruct after the
  fact; M7-BRAND-01 must land first.
- A catalogue update is a data migration, not merely a UI refresh.

## References

- Requirements: `docs/requirements.md` §§5–6 and §20.
- Decisions: D24 (immediate controls), D30 (name-reference limitation), D46
  (ordered-content cache keys), D47 (palette rebuild evidence).
