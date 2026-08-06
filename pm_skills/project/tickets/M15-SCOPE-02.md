# M15-SCOPE-02 — Dithering profiles & editor: joint scoping [maintainer] [sign-off]

Memo item 16, the profiles half (fourth look, D106). Same
collaboration contract as M15-SCOPE-01: the owner wants this scoped
together — "we can scope this out more during development." Nothing
signed here.

## The owner's material (repaired transcript)

- `Appearance` renames to "Processing" — **lands earlier as
  M14-EXT-30**, with the grid controls relocated; by the time this
  scope runs, the section holds dither only.
- Dithering gets presets called **"Dithering profiles"**; the section
  surface reduces to selecting the profile.
- A full modal (covering the main UI) hosts the **dithering profile
  editor**. Scope deliberately left open by the owner.

## Grounding — what already exists

- Five methods as user choices (Floyd–Steinberg, Atkinson, Jarvis,
  ordered Bayer 8×8, blue-noise) behind a discriminated config with
  per-family strength and serpentine where a scan direction exists
  (M8; `src/ui/dither-model.ts`, `src/ui/dither-panel.ts`).
- **Seven evidence-based presets already ship** (`DITHER_PRESETS`,
  `docs/dither-evaluation.md`) — "Dithering profiles" starts as a
  rename-and-extend of these, not an invention.
- The panel already has the shape "preset select + `Dither details`
  depth reveal"; a profile system replaces the reveal's role for
  most users.
- M8-ACCEPT-01 (owner visual acceptance of the five methods) is
  **still open in the icebox** — the scoping session should decide
  whether it folds into this work or runs first, rather than leaving
  a stale gate behind a superseding feature.

## Questions for the joint session

1. What is *in* a dithering profile: method + strength + serpentine
   only, or ordered/blue-noise family params too? Is a profile
   complete (fully determines the dither config) or partial?
2. Editable how far: rename/duplicate/delete user profiles over a
   fixed built-in seven? Can built-ins be edited, or only copied?
3. Persistence: same store pattern as colour profiles (IndexedDB +
   project-file reference with a snapshot, mirroring D55's
   policy/snapshot lesson)? A project must reopen with the exact
   dither it was saved with even if a profile was later edited.
4. How much editor machinery is shared with the colour-profile
   editor: the full-modal shell, the test-image preview rig (five
   images, three resolutions), the offline-image state — one shared
   pattern or two bespoke surfaces? (Recommendation: one shell; the
   preview rig is exactly as useful for dither judgement as for
   colour.)
5. Does the `Dither details` reveal survive for depth, or does the
   editor absorb it entirely?
6. Interaction with draft-quality mode (dither off under load): a
   profile promising a look the draft governor suspends must stay
   honestly labelled (existing draft badge covers it — verify, not
   assume).

## Done when

A signed scope + option pick in the decision log; agent-executable
M15 tasks with acceptance lines; this ticket superseded by them.
