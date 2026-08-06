# M15-SCOPE-01 — Colour profiles & editor: joint scoping [maintainer] [sign-off]

Memo items 14 and 15 (fourth look, D106). The owner's explicit ask:
do this last, as a collaboration — "this needs more scoping work that
would benefit from us both." Nothing here is signed; this ticket
preserves the material and the questions so the joint session starts
warm.

## The owner's material (repaired transcript)

**Memo 14.** `Colour mode` and `Threads to choose from` are replaced
with just **"Colour profile"** — editable presets of colour tables.
Colour profile presets are effectively the available colours. The
`Thread library & rules` section goes — it becomes part of the colour
profile editor. Keep a **"Colours in use"** section showing the
colours currently used in the design, after all palette constraints.

**Memo 15.** The colour profile editor is not a section but a new
browser window or modal with extensive palette-editing UI — "maybe it
temporarily replaces the whole window until done." It shows:

- A design preview at the top, with a toggle between the live capture
  and four presets to help judge the colour: photo landscape, cartoon
  object, profile photo, text in three fonts.
- A button displaying all five test images in three rows: full res,
  1/4 res, 1/16 res.
- An "image offline" state when a demo picture is missing — the owner
  will add the files manually later; identify a good hard-coded
  folder location.
- A **"Colour libraries"** area: toggleable lists including colour
  brands and major tech/computer colour maps — 2-bit RGB, 3-bit RGB,
  4-bit RGB, etc., "whichever make sense".
- **User libraries** nearby: people pop in their thread collection by
  toggling individual colours, searching threads by manufacturer code
  or hex, or adding their own RGB values.
- **Advanced controls**: limiting the minimum distance between
  allocated colours; limiting the total colour range in hue,
  saturation, and brightness (maybe two-pole sliders with upper and
  lower limits) — the owner is unsure where these live ("maybe in the
  colour section rather than the colour profile presets or preset
  editing areas — let me know what you think during the scoping").

## Grounding — what already exists

Much of this maps onto shipped M7 machinery rather than green field:

- **Availability policy** is one pure layer (`palette-policy.ts` →
  brands ∩ source ∩ ownedOnly − excluded + locks → `PermittedSet`);
  a "profile" is close to a named, saved policy+set.
- **Named library palettes** and the **thread inventory** already
  persist in IndexedDB (`src/library/store.ts`); `Threads to choose
  from` already lists saved palettes; a saved-palette editor with
  per-thread Own toggles and thread search ("Find a thread") exists
  in `src/ui/palette-panel.ts`.
- **Test-card generation** exists (`src/ui/sample.ts` renders the
  sample; a generated card, not a photo).
- **Modal machinery** exists (`src/ui/modal.ts`, Source chooser).
- M14-EXT-29 (lands first) leaves the section as: Threadify switch,
  constrain switch, Colours count — the profile select slots beside
  them; `Colours by usage` (info fold) is the nearest thing to
  "Colours in use".

## Hard constraints the scope must respect

- **Thread identity is `brandId:reference`, never RGB** (D55/D56).
  Tech colour maps and user-added RGB values are *not threads*: they
  need an identity scheme (e.g. a synthetic brand namespace per map,
  `user:` for custom entries) that never collides with or merges real
  threads. This is the single biggest model question in the feature.
- **Outputs change** ⇒ outside M14 by construction; golden strategy,
  acceptance fixtures and the LUT fingerprint cache key (D46) must be
  revisited where profiles feed reduction.
- **Persistence checklist** applies: profiles as user data, schema
  versioned, save→load→save byte-identical; the project file's
  `policy` + `snapshot` pair (D55) must extend, not fork.
- **No new runtime dependencies**; colour pickers and search UI are
  hand-built to Carbon patterns.
- **Offline app**: test images ship local. Candidate folder: a
  profile-demo directory under a Vite `public` root, neither existing
  yet — created with the feature; Vite serves `public` statically at
  the site root, and the "image offline" state covers absent files.
  Decide and hard-code the location at scoping.
- **Protected files** stay protected: `thread-list.csv`,
  `catalogue.json` (generated) are inputs to profiles, never edited
  by them.
- **New browser window is hostile territory** (D53: popups blocked
  even from trusted gestures, window placement ignored) — recommend
  the full-viewport modal reading of "temporarily replaces the whole
  window", not `window.open`.

## Questions for the joint session

1. Identity for non-thread colours (the D55 question above) — and do
   tech-map colours appear in "Colours in use" tables that otherwise
   list threads?
2. Which tech maps make sense: the memo's "2-bit RGB" reads as bits
   **per channel** (2/2/2 = 64, 3/3/3 = 512, 4/4/4 = 4096) or as
   classic total-bit palettes (8-colour 3-bit, 16-colour CGA/EGA,
   web-safe 216…)? Big maps also stress the swatch UI and the LUT.
3. Does "Colour profile" replace the brand toggles *and* owned-only
   *and* presets — i.e. is every current policy control re-homed as
   profile content — and what do existing saved palettes migrate to?
4. "Colours in use" vs the existing `Colours by usage` fold: same
   surface re-homed, or a second, sortable palette listing?
5. The five test images: four are named (photo landscape, cartoon
   object, profile photo, text in three fonts) — is the fifth the
   live capture, or a fifth file? (The three-row grid is "all five".)
6. Advanced constraints placement — recommendation to bring: they are
   **per-design intent, not profile content** — they belong in the
   Colour section beside the count constraint (a profile says what
   *could* be used; constraints say what *this design* may do), and
   they extend `palette-selection.ts` as pure selection rules.
7. Editor v1 cut line: which of libraries / user collections / search
   / custom RGB / constraints / test-preview ship first, and what is
   deliberately later.
8. Live-capture preview inside the editor while a session runs:
   feasible (the pipeline is running anyway) but it doubles preview
   surfaces — worth it in v1?

## Done when

A signed scope + option pick in the decision log; the build broken
into agent-executable M15 tasks with their own acceptance lines; this
ticket superseded by those tasks.
