# M7-ACCEPT-01 — Palette workflow acceptance

## Gate purpose

This is the maintainer sign-off for the combined brands → inventory → palettes →
presets → counts → locks → auto-fill workflow. It should verify coherent user
outcomes, not repeat each component's unit tests.

## Entry criteria

All preceding M7 items are implemented, their migrations and failure states are
green, `npm run check` passes, no protected palette data was hand-edited, and
the current DMC/Anchor provenance limitations are visible. The test build must
expose product/build identity and the redacted diagnostics control.

Prepare a fixed representative set: flat graphic, smooth gradient, photograph,
transparent/letterboxed artwork, a tiny-palette stress case, and a design using
same/near-equal cross-brand display colours. Record source checksums or committed
fixture names so later acceptance is comparable.

## Worked scenarios

1. Enable DMC, request maximum 20, live-edit the source, save/reopen, and export
   PNG/chart/PDF. Record selected versus used count and all exported references.
2. Build an inventory across both brands, enable “owned only”, request best 15,
   and prove every output identity is owned.
3. Lock five, request 15, and confirm ten auto-filled identities plus visible
   treatment of a forced conflict.
4. Preview a curated preset, disable one required brand, inspect the degradation,
   duplicate it to a personal palette, edit/reorder it, and save.
5. Save projects, then edit/delete library palette and inventory records; reopen
   and confirm identical pixels/references with an explicit library-drift state.
6. Exercise missing/retired/duplicate-reference imports and corrupt files; no
   user data disappears and no invalid palette reaches the worker.

## Automated evidence expected

- Catalogue identity/provenance, generated-data determinism, and no RGB-based
  merging.
- Every restricted output reference belongs to the resolved permitted set.
- Constraint/conflict result matrix for exact/maximum, lock/prefer/exclude,
  enabled brand, strict preset, and owned-only combinations.
- Palette/inventory import/export validation and IndexedDB upgrade/error paths.
- Project JSON byte round trip **and** config → save/load → output pixel/index
  identity across representative cases.
- Preview/export full-quality agreement and same-RGB reference preservation.
- Bench evidence for cold palette selection/LUT preparation and ≥4 live preview
  updates/sec at typical grids.

## Human review

Judge terminology, visible brand/reference/name, colour-selection plausibility,
preset usefulness, conflict explanations, empty/loading/error/success states,
keyboard/focus behaviour, 44 px targets, narrow-window use, and whether live
changes feel stable. Confirm exports contain the correct brand + reference and
that unavailable or excluded threads never appear.

## Failure rules

Any silent fallback, missing explanation, off-permitted reference, stale-cache
output, non-reproducible reopen, preview/export mismatch, lost library data, or
material live-performance regression fails the gate. Record the failure and file
a concrete defect; do not waive an invariant as “acceptable visual variation”.

## Outputs

Record build ID, environment, scenario results, automated commands, measured
rates, residual risks, and explicit maintainer verdict in the decision log.
Acceptance evidence may live in a dedicated `docs/` pack if it is too large for
the decision entry; this ticket file remains working context and is deleted when
the item ships.

## References

- Milestone acceptance in `pm_skills/project/backlog.md`.
- Requirements: `docs/requirements.md` §§3, 5–6, 11, 17, 20, and 22.
- Decisions: D46–D49 for cache, performance, membership, export isolation, and
  project-output invariants.
