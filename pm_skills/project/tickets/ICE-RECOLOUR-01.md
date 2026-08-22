# ICE-RECOLOUR-01 — Creative recolouring: beyond realism in the colour mapping

## The ask (owner, 2026-08-22)

Put up for review "a pixel editor and a colour swap function — or
something that gives users the creative potential to move beyond
realism in the colour mapping", possibly as an additional processing
layer, plus (same day, "for later deep thought rather than solving
now") "optional controls for making an image have a specific %
distribution of palette colours … very useful in 1-bit / 2-state
situations". Context: the first live-app feedback (MUST-01, COUNT-01)
and D149 — a broader audience may have no upstream editor, so
controlling the final picture inside the app is product scope (the
ICE-ADJUST-01 argument, applied to colour).

## What the user can do today

The chain is realist end to end: profile membership → count-limited
selection against the source's distribution → nearest colour in Lab
(+ dither). Every creative lever is indirect — which colours *may* be
used, how many, how far apart — and Must-use buys a seat in the
palette, never a presence in the picture (MUST-01). Nothing lets a
user say "*this* thread, *here*".

## Three candidate layers

**A. Colour swap (thread → thread remap).** A pure stage after the
colour stage that rewrites the palette-index sidecar: "everywhere the
mapper chose X, stitch Y" — Y from the whole browse universe (any
brand, a generated map, a custom colour), or another palette entry (a
merge). Stitches, counts, estimates and the key follow the sidecar
automatically; symbols are identity-keyed (M9), so a swap to a new
thread takes a grant at first need and a merge releases one. Persists
as a thread-keyed table in the project (schema bump, empty default;
the round trip stays byte-identical). UI home: a "Swap…" action on the
Colours-used row beside Highlight and Remove, opening the existing
browse table. Cost O(cells) — invisible against the ≥ 4 updates/sec
promise. Reduce keeps quantising against the *selected* colours: a
swap changes what a chosen entry renders as, not what the mapper
matches to, so the LUT fingerprint (D46) is untouched. A dangling swap
(its source thread drops out of the palette) is kept and explained,
like a Must-use seat.

**B. Pixel editor (cell overrides).** A sparse cell → thread map
applied as the *last* stage (after resize under either preset — it is
cell-addressed, so it must follow the stage that invalidates the
sidecar). Paint one thread, fill a contiguous same-index region, erase
to fabric, undo; exports carry it by construction because they re-run
the pipeline. Persisted sparse (dense worst case 2 MB at 1024²),
cleared on any grid change (cells re-address), held across live frames
on purpose ("fix this stitch" on a frozen design). The real cost is the
surface: hit-testing through the preview's view transform
(`src/ui/viewport.ts`), a tool mode, keyboard painting for AAA
operability, and the engaged-preview contract (M14-EXT-27). It should
not precede DUR-01: hand-placed stitches are exactly the work the app
currently loses on tab close.

**C. Controls inside the quantiser.** The "many cool controls" sphere,
cheaper than either layer above because they are stage params:

- *Tone-only (or weighted) matching* — Lab channel weights in the
  metric (§6 anticipated them). At L-only, a curated ladder such as
  Delft blue or Ukiyo-e becomes a two- or three-tone map of the
  picture's lightness with the hue supplied by the profile; profile
  order already carries the gradient meaning (D46). One metric variant
  and a LUT key; the WebGPU LUT path routes to TS until it learns the
  weights (allowed — TS is ground truth).
- *Target % distribution* (the owner's idea). At 2 states it is exact
  and trivial: the threshold is the source's lightness quantile at the
  requested share. Above two, a per-entry bias on the distance,
  iterated until the histogram lands within tolerance — deterministic,
  cheap at grid size, approximate under dithering. Sits beside the
  Black & white profile and ICE-ADJUST-01's threshold presets.
  Deep-thought item by the owner's framing; not for solving now.
- *Threshold levels (§9's banding)* — ICE-ADJUST-01's slice, named here
  because it pairs with both of the above.

## Recommendation

Ship in order of leverage over cost: **A** (small, and it closes the
presence half of MUST-01 — a swap *is* a guarantee), then **C1**
tone-only matching (least code, widest stylistic reach: sixteen signed
profiles become colouring tools), then **B** after DUR-01 with its
interaction model signed first. C2 stays parked inside this item until
the owner wants it thought through. All three are stages or stage
params, never preview-only; engine purity, exports-re-run-the-pipeline
and the round-trip invariant hold by construction.

## Questions for the sign-off

1. Does a swap target come from the whole universe (recommended — the
   profile governs selection, not the user's explicit will) or only the
   profile?
2. Is the Colours-used row the home for "Swap…"?
3. For B: painting on a frozen or still design only, or under live
   capture too?
4. Order A → C1 → B as above, or B first because it is the ask?
5. Is a swap a *design* rule (saved with the project, like Must-use),
   or may a profile carry one too (a recipe-level "render X as Y")?

## References

- Requirements: §5.1 (full RGB as the path to manual thread
  selection), §6 (force-include, weighting controls), §9
  (posterisation).
- Decisions: D46 (order is identity), D114/D116 (profiles; the preview
  rig's override rule), D135 (the promise that binds), D149 (in-app
  control is product scope), D160/D165 (identity-keyed symbols), D171
  (DUR-01), D173 (this item opens).
- Related items: MUST-01, ICE-ADJUST-01, ICE-SYMBOL-UI-01, DUR-01.
