# CREATIVE-01 — Scope the creative and diagnostic image features

## Outcome

One signed programme for controlling the picture inside the app past
nearest-colour realism: which features ship, in what order, where each
lives (a pure stage, a stage parameter, a profile kind, or a view), how
each persists, and the first build slice. Each signed feature then runs
as an ordinary Track D item with its own done-when. This ticket closes
on the signature, not on the features shipping.

## Why a scoping ticket of its own (owner, 2026-08-23)

The candidates accumulated as separate Icebox lines with separate
rationales (D48, D92, D149, D173) and would otherwise be decided one at
a time at each pick. At the icebox triage (D188) the owner asked for
the scoping to get space and resources of its own — sessions,
prototypes and a sign-off sitting — for two programmes: this one, and
the pixel editor (PAINT-01). The preconditions are now met: stills are
durable (DUR-01, D179), the Must-use seat is closed (D178), the swap is
build-ready and supplies the render palette several candidates consume
(D182), and the app is live with its first user asking for "creative
potential beyond realism".

## The candidate set

Each carries what is already decided; the scoping judges the rest.

1. **Tone-only / weighted matching** (RECOLOUR C1). Lab channel weights
   in the metric (§6): at L-only a curated ladder such as Delft blue or
   Ukiyo-e becomes a two- or three-tone map of the picture's lightness
   with the hue supplied by the profile, whose order already carries
   the gradient (D46). One metric variant and a LUT key; the WebGPU LUT
   routes to TS until it learns the weights (TS is ground truth). The
   signed order puts it straight after the swap (D182-4).
2. **Image adjustments as a third profile kind** (ICE-ADJUST-01, the
   D149 presumptive milestone). Tonal sliders plus colour thresholds as
   presets, remapping the source ahead of reduction with live preview,
   shipped as read-only built-ins plus editable copies. The hook
   exists — `src/core/pipeline/adjust.ts` is an identity stub with an
   empty `AdjustParams`, left out of `buildStages` while inert — and so
   does the home: the editor shell is kind-agnostic through
   `ProfileKindAdapter` (`src/ui/profile-editor.ts`, D116). Open: the
   first slice of §9's sixteen operations (recommend black/white point
   and gamma, brightness and contrast, saturation, and threshold and
   posterisation levels — the ones that change what the quantiser sees);
   source resolution versus grid (§7 puts adjust before resize); the
   cost under live capture against the ≥ 4 updates/s promise (D135).
3. **Target % distribution** (RECOLOUR C2, the owner's idea, "deep
   thought"). Exact at two states — the source's lightness quantile at
   the requested share — and iterative above (a per-entry bias on the
   distance until the histogram lands within tolerance). The scoping
   decides whether the two-state case ships inside the threshold preset
   now and the general case stays parked.
4. **The contact sheet** (ICE-VARIANTS-01). One axis first: the dither
   methods from a frozen still, labelled, a pick adopts. Build it as a
   mechanism — frozen still → N variants → pick — because threshold
   presets and, later, profiles want the same strip. Open: modal versus
   panel, the render budget off the live path, cell size at 400 px.
5. **Tonal provenance view** (ICE-PROVENANCE-01, kept by the owner at
   the triage as the diagnostic half). Where each chosen thread sits on
   the source's light↔dark range — selection-stage introspection an
   upstream editor cannot give. Open: a strip under Colours used, an
   overlay on the contact sheet, or part of the editor's judgement
   preview; labelled as provenance, never offered as a control.
6. **The eyedropper, in-app half** (PICK-01). Pick from the source
   picture or the design; resolve to the nearest threads with ΔE; feed
   Must-use (pins, D178), swap targets (D182) and the inventory. The
   EyeDropper API (Chromium) is a progressive enhancement for picking
   from an editor beside the app; the editor's pick-up tool is
   PAINT-01's.
7. **More built-in profiles** (ICE-PROFILES-02) — a content hook, not a
   feature: once C1 exists, the forty unsigned names are re-judged as
   two-tone maps through the signed-batch process.
8. *Proposed at the triage, unjudged:* a **match-error view** — a ΔE
   heat map over the design showing where the palette serves the
   picture worst, which is where a Must-use, a swap or a painted cell
   earns its place. Diagnostic; a Compare-class decoration (D92).
9. *From the wish-list triage (D197), unjudged:* **re-pick colours from
   the current frame** — a live capture seeds the selection source from
   its first frame (or an earlier still) and holds it until the
   geometry or a colour rule changes, so the palette can be chosen
   against a picture that is no longer the source (COUNT-01).
10. *Likewise:* **recipe-level "render X as Y"** — a profile carrying
    swaps; additive once C1 exists (ICE-RECOLOUR-01 Q5).
11. *Likewise, a view not a control:* **finished-stitch / fabric
    preview** — simulated thread crosses and fabric (§10; §25's fabric
    simulation), the creative sibling of the provenance view.

## Questions the scoping must answer

- Order and slices: what ships first after the swap; which candidates
  fold into one build (thresholds with the two-state distribution; the
  contact sheet with the provenance strip).
- Placement, by the rule that nothing is preview-only: a stage
  (adjust), a stage parameter (C1, C2), a profile kind (adjustment
  presets), or a decoration (contact sheet, provenance, heat map,
  eyedropper). Exports re-run the pipeline; engine purity holds.
- The adjust stage's position and cost under live capture; adjustments
  change the source, not the palette, so the LUT fingerprint (D46) is
  untouched — confirm rather than assume.
- Persistence: each feature's home in the project file (design rule,
  profile, or none), the `.pmproj` round trip byte-identical, and one
  schema bump per round (the D182 rule).
- UI homes in the M14/M15 shell at 400 px and the 320 px floor
  (ICE-WIDTH-01): which section each feature joins; what a contact
  sheet or a heat map does to the preview-first layout.
- Profiles as colouring tools once C1 lands: does the editor's
  judgement preview gain a weight control; may a profile carry weights
  (the recipe-level option D182-5 keeps open).
- Diagnostics: which views earn their space; honest labels throughout.

## Method and resources

- Runs as a scoping task in full mode — `pm_skills/prompts/scoping.md`
  then `pm_skills/prompts/design-options.md` — budgeted at two or three
  sessions, not one: eight candidates, and the contact sheet and the
  adjustments each want a throwaway prototype.
- Prototypes are allowed on a branch, never copied into production
  source (ICE-TAURI-01's rule), and measured on the bench fixtures;
  evidence goes in `bench-reports/` or here.
- Evidence on real pictures: the six-photograph preview rig (D147) and
  the profile-gallery audit (`npm run audit`) already render every
  profile on the sample card; each candidate shows before/after there.
- Live checks follow the browser repro recipe in the running app.
- A short survey of the vocabulary users bring — the threshold,
  posterisation and gradient-map adjustments they know from Photoshop; the
  contact-sheet idiom from proofing — for naming, not for copying.
- The owner's time: one sign-off sitting per slice (the M15-GALLERY-01
  pattern), not one per question.

## Done when

The owner signs: the feature list with its order and first build slice;
for each feature its placement, persistence, UI home and done-when; the
schema plan; and which candidates are cut or stay parked (C2's general
case; the PROFILES-02 hook). The signed features become Track D items.

## Constraints that already bind

Engine purity (`src/core/` never touches the DOM); every feature a pure
stage, a stage parameter or a decoration; exports re-run the pipeline;
save → load → save byte-identical; the LUT fingerprint changes only when
matching changes (D46); ≥ 4 updates/s at ≤ 300² under live capture
(D135); the engaged-preview contract (M14-EXT-27); UI-STANDARDS' reach
and focus rules; a profile is a composition recipe (D114); design rules
live in `palette.design` (D182-5).

## Dependencies and references

Depends on ICE-RECOLOUR-01 layer A for the render palette (PICK-01's
swap-target verb; the contact sheet's swatches). Shares the eyedropper
and the render palette with PAINT-01. ICE-PROFILES-02 waits on C1.
Requirements §5.1, §6, §9, §10; decisions D46, D48, D92, D114/D116,
D135, D147, D149, D173, D178, D182, D188.
