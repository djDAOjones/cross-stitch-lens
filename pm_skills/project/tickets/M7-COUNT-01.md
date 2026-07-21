# M7-COUNT-01 — Target / maximum colour count

## Outcome

Users can request an exact target or a maximum number of thread colours. The
selection is deterministic, honours the permitted/locked set, shows requested
and actual counts, and explains every gap instead of silently violating limits.

## Current baseline

The pipeline maps every stitch independently to the nearest entry in the active
palette. It does not select a source-dependent subset first. `computeStats`
reports the actual number used after conversion. The 15-bit LUT and exact dither
matcher are efficient once a palette is fixed, and D47 shows GPU LUT construction
can make palette changes practical, but palette-subset optimisation itself does
not exist.

## Algorithm boundary

This is constrained colour quantisation over a fixed catalogue, not “take the N
most used colours after a full-palette conversion”. A useful workflow is:

1. resize to the stitch grid first (D3), preserving empty cells;
2. build a weighted colour distribution from non-empty stitch pixels;
3. choose up to/exactly N **real permitted thread identities** under the selected
   colour metric and lock/prefer/exclude policy;
4. run the ordinary reduce/dither stage against that ordered subset;
5. report selected count and actually used count separately.

Median cut and similar image quantisers choose representative RGB colours, which
may not correspond to real threads. They are useful initialisation/research, but
the committed algorithm should select catalogue representatives or project
representatives onto permitted threads. Optimise the same perceptual objective
the mapper uses unless evidence justifies a different selection metric. Keep
deterministic initialisation and tie rules; any randomness needs an explicit seed.

## Exact versus maximum semantics

“Maximum N” means never select more than N and may use fewer. “Exact N” can
select N permissible references, but the rendered design may use fewer if some
selected colours win no stitch, the image has fewer distinguishable colours, or
dither/alpha constraints remove usage. Show both “selected” and “used”. Do not
force meaningless isolated stitches merely to make the displayed used count hit
N unless the owner explicitly chooses that product behaviour.

Define and explain these conflicts before coding:

- request exceeds the permitted palette/inventory;
- locked unique identities exceed N;
- strict preset plus exclusions leaves too few;
- duplicate-display-colour threads cannot both become distinguishable in RGBA;
- full-RGB mode has no thread-count restriction;
- `reduce-first` is off-palette after resize (D49) and should likely be disabled
  for this workflow rather than reported as a valid thread count.

## Likely implementation surface

A pure selector in `src/core/color/` or `src/core/palette-selection.ts`, policy
types shared with M7-MIX-01, worker-side preparation/cache, project schema,
Colour controls/status, stats, and matrix/benchmark coverage. TS is the reference;
do not add GPU/WASM until a recorded profile misses the live budget.

## Acceptance evidence

Use hand-solvable tiny distributions, gradients, photos, flat art, transparent
cells, duplicate RGB identities, tiny permitted sets, locks > N, N=1, N=palette
size, and repeated runs. Assert constraints, deterministic identity order,
selected/used explanations, project-output round trip, and export/preview
agreement. Measure selection preparation separately from warm per-frame mapping
and ensure live changes remain responsive.

## Risks and dependencies

- Selection quality is an optimisation problem; a fast deterministic heuristic
  with visible limitations is preferable to claiming a global optimum.
- Dithering changes which selected colours are used. Evaluate selection with both
  dither states.
- Depends on the M7 brand/palette identity model and shares policy with
  M7-MIX-01.

## References

- Requirements: `docs/requirements.md` §6 and §22.
- [“Color Image Quantization for Frame Buffer Display”](https://publications.ri.cmu.edu/color-image-quantization-for-frame-buffer-display)
  — separates sampling, colour-map choice, nearest mapping, and optional dither.
- [DMC maximum-colour workflow](https://www.dmc.com/US/en/stitch-your-photos/help_and_advice)
  — precedent that a maximum request may produce fewer actual colours.
