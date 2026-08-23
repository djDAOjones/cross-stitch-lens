# PAINT-01 — Scope the pixel editor

## Outcome

A signed design for painting stitches in a design — the tools, the
interaction model by pointer, keyboard and touch, what persists and
when it clears, undo, how painting composes with the swap's render
palette and the profile, and the v1 slice — so the editor builds as a
sequence of ordinary Track D items. Closes on the signature.

## The ask

Owner, 2026-08-22: "a pixel editor … something that gives users the
creative potential to move beyond realism in the colour mapping".
Owner, 2026-08-23 (the icebox triage, D188): "a pixel editor so users
can effectively paint pixels in a design" — the word is *effectively*:
an editor a stitcher can work in, not a demo brush. The scoping gets
its own sessions, a prototype and a sign-off sitting.

## Already decided (D182 — the seed moved here from ICE-RECOLOUR-01)

- Cell overrides are a **sparse cell → thread map applied as the last
  stage** — cell-addressed, so after resize under either preset.
- **Stills only in v1**: import, sample, paused or grabbed capture,
  restored design. Overrides are held across frames; the brush is off
  while frames flow. "Live too" is not v1; revisit on demand.
- **After layer A**: a painted thread may be outside the palette, so
  the editor needs the render palette; the order is A → C1 → B.
- Exports carry edits because they re-run the pipeline; the sidecar
  drives stats, the key, estimates and symbols (identity-keyed grants,
  D160/D165).
- Persisted sparse (dense worst case ~2 MB at 1024²); cleared on any
  grid change because cells re-address.
- Seed tools: paint a thread, fill a contiguous same-index region,
  erase to fabric, undo. The cost is the surface: hit-testing through
  the preview's view transform (`src/ui/viewport.ts`), a tool mode,
  keyboard painting for AAA operability, the engaged-preview contract
  (M14-EXT-27).

## Questions the scoping must answer

1. **Tool vocabulary for v1.** Stitch-pattern editors share an idiom —
   pencil, fill, line, rectangle and ellipse (outline and filled),
   select and move, mirror and flip, replace colour, pick-up (the
   eyedropper). Which are v1, which later; backstitch and fractional
   stitches are outside the model and stay out.
2. **The paint palette.** The render palette (selected entries plus
   swap targets), "add a thread from the universe" through the shared
   browse table, and fabric (erase). How a painted thread enters
   Colours used, the key and the estimates — by construction if
   overrides rewrite the sidecar index — and takes a symbol.
3. **Interaction model.** Pointer (mouse, pen, touch) through the view
   transform at any zoom; a tool mode with an explicit enter and exit
   so the engaged-preview contract (wheel and pan) and painting never
   fight; keyboard painting (a cursor cell, arrows, Enter or Space to
   paint, Shift to extend for fill and rectangle) for AAA operability;
   the cursor cell and its thread announced to assistive technology
   (A11Y-VO-01 grows); touch at 400 px without stealing the scroll.
4. **Undo and redo.** A bounded stroke-level history in session, and
   how it sits beside the design history's 2 s tick (D179): undo is
   within a session, the history is across sessions.
5. **The stage and the sidecar.** `overrides` as the last pure stage
   over the sidecar (the swap's precedent: omitted when empty,
   O(cells)). A grid change clears — warn first, DUR-01's rule of
   warning before loss. A profile change leaves overrides referencing
   threads by id: a dangling override is kept, explained and rendered
   from its snapshot, mirroring dangling swaps (D178's drift rule).
6. **Persistence.** `design.overrides` sparse (cell index → thread
   record or render-palette id), a cap, its own schema bump in its own
   round, a byte-identical round trip, the `.pmproj` container
   untouched.
7. **Live capture.** What the UI says while frames flow; freeze as the
   entry to painting (a capture already freezes at save time, D179).
8. **Performance.** A stroke must not re-run the whole pipeline: the
   override stage alone re-runs over the held frame (the FLICKER-01
   hold); target a stroke rendered within one frame at 300². Painting
   is off the live path, so the ≥ 4 updates/s promise is untouched —
   confirm with the prototype.
9. **Where it lives.** A tool strip in the view strip (D92's permanent
   quiet strip) and an "Edited stitches: N · Clear" readout in the
   Colour section; the profile editor's preview rig ignores overrides.
10. **Swap-to-fabric** (wish-list: erase a thread by swapping it to
    empty) — this editor's erase, or the swap's territory.

## Method and resources

- A scoping task in full mode — `pm_skills/prompts/scoping.md` then
  `pm_skills/prompts/design-options.md` — budgeted at two or three
  sessions plus a throwaway prototype of the hit-testing and the
  one-stroke render path, measured before the sitting.
- A short survey of the idiom users bring: stitch-pattern editors for
  the tool set, pixel editors for keyboard conventions — vocabulary
  and expectations, not code.
- The accessibility pass planned in from the start: keyboard and
  VoiceOver on the prototype, not after.
- The owner's sign-off sitting with the prototype in hand; one sitting
  per slice after that.

## Done when

The owner signs the v1 tool set, the interaction model (pointer,
keyboard, touch), persistence and clearing rules, undo, the UI home,
and the build slices — for example v1a pencil + pick-up + undo +
persistence, v1b fill + erase, v1c line, rectangle and select. Each
slice becomes a Track D item.

## Constraints that already bind

Stills only in v1 (D182-3); layer A first (D182-4); engine purity; a
pure last stage, never preview-only; exports re-run the pipeline; a
byte-identical round trip; one schema bump per round; AAA operability
for every tool; the engaged-preview contract (M14-EXT-27);
UI-STANDARDS' reach and focus rules; design state in `palette.design`
or a sibling block, never in a profile.

## Dependencies and references

ICE-RECOLOUR-01 layer A (the render palette); PICK-01 (the pick-up
tool is the eyedropper's editor half); CREATIVE-01 (shared homes).
Requirements §5.1, §10, §20; decisions D92, D135, D160/D165, D171/D179,
D178, D182, D188; `src/ui/viewport.ts`, `src/ui/preview.ts`,
`src/core/pipeline/`.
