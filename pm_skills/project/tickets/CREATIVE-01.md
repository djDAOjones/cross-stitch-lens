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

## Scoping state after discussion rounds 1–5 (2026-08-23)

Owner-agreed working state from five discussion rounds; the sitting
signs. Where this contradicts a candidate bullet above, this wins.

### The programme

1. **Slice 1 — tone mode** (schema v12). The colour ↔ tone weighted
   metric as a slider, ladder mode at its end-stop; tone bands with
   cut handles on a lightness ramp — the ramp strip is control and
   provenance readout in one (the owner's reference: the DaVinci
   Resolve qualifier idiom); target shares = cuts at source-lightness
   quantiles (exact at any N undithered, near with); cuts start
   natural with one Equalise button; re-pick from the current frame;
   the colour-use floor. Folds candidates 1, 3, 5, 9 and the new 12.
2. **Slices 2a/2b — adjustments** as the third profile kind (v13).
   2a: black point, white point, tone curve, global saturation.
   2b: the six-band H/S/L colour mixer and the saturation range
   slider, both collapsed by default.
3. **Slice 3 — eyedropper** (PICK-01's in-app half): the preview
   tool-mode pilot PAINT-01 inherits; nearest threads with ΔE feeding
   Must-use, swap targets and the inventory. No bump.
4. **Slice 4 — contact sheet**: a modal over the held still via the
   export route; axis 1 dither methods, later adjustment presets and
   colour profiles; a pick adopts. No bump.
5. **Slice 5 — match-error compare**: the ΔE heat map as a compare
   mode. No bump.

Parked, with triggers: mid-slider shares (the iterative bias; wakes
when the slider proves itself), the L/C/H weight split (advanced
reveal, on ask), posterise (the contact sheet shows the per-hue-
banding gap), recipe-level swaps (a user wants one swap across
designs), finished-stitch preview (the print programme's home), the
N-D distribution case. PROFILES-02 wakes when slice 1 ships. Cut:
brightness, contrast, gamma, threshold, global hue shift — the curve,
the mixer and tone mode cover all five.

### Slice-1 decisions of record

- **Weighted from the start** (the parked weights "need to come
  soon"): the metric carries the weight; the count-limit selection
  uses the same weight as cell matching; the LUT key includes it.
  Dither must diffuse error in the weighted space or hue error leaks
  into lightness — the prototype's central measurement.
- **Tone curve**: exactly three points — top, mid, bottom — each
  adjustable on both axes, so an inverted mapping is legal by
  construction; no free-point spline. Keyboard: Tab through the
  points, arrows nudge.
- **Softness** on a band boundary ships in slice 1 only if it falls
  naturally out of the dither maths (softness = dither confined to
  the falloff zone around a cut); else hard cuts first.
- **Colour-use floor**: after the count — "count up to N, then drop
  the under-earners"; ending below N is accepted. Off by default,
  toggleable. Owner label direction "Minimum colour count threshold"
  or similar; working label "Minimum stitches per colour"; unit lean
  absolute stitches (to confirm). Must-use seats exempt; the drop
  cascade converges — the palette only shrinks.
- **Tone hint and confetti caution**: one suitability heuristic
  (entry count, hue spread, lightness spread), two messages — a
  ladder near the tone end offers a one-click "use tone matching"
  button; a broad multi-hue palette near the tone end shows a subtle
  inline caution (owner's sketch: "may be entering confetti zone").
  Never a silent change, never a block. Full tone + full palette
  stays allowed, unguarded — the ramp readout explains the result.
- **Naming**: "ladder" is project coinage (nodding to the art-class
  value ladder). Established neighbours: gradient map (Photoshop),
  duotone/tritone (print), colour ramp (pixel art), gradient/ombré
  set (yarn). The survey weighs these; the ramp control and a "ramp"
  profile shape must not collide.

### Slice-2 decisions of record

- The curve replaces gamma AND contrast; the black/white point
  sliders bind to the curve's endpoints.
- Saturation range slider: two handles rescaling the picture's
  saturation into a chosen band — levels for the S channel; lives in
  the adjust stage (already first in the chain, the owner's "close
  to the raw image"). Design-options fork: nominal remap with a
  low-S roll-off (lean — raising the floor must not tint near-greys
  whose hue is noise) vs observed-range remap (image-adaptive; needs
  the held source under live capture or it flickers).
- The mixer: six colour bands (owner-confirmed) × H/S/L; the classic
  six R/Y/G/C/B/M as working centres the prototype may tune.
- Engine note: `fullRgbVariant` must keep the adjust params so the
  selection source is the adjusted picture.
- Built-in adjustment presets: the sitting signs the starter set; ~8
  candidates with before/afters from the rig come as evidence.

### Open for the sitting (none block the prototype)

The floor's unit and final label; the user-facing names for tone mode
and ladder-shaped profiles; the confetti-note wording; the
saturation-range remap flavour.

### Prototype plan (agreed)

Two prototypes on a branch, never production source: (1) **tone
mode** — the weighted metric, the ramp with cut handles and the
three-point curve (two or three control shapes trialled), natural
cuts + Equalise, quantile shares; the weighted-dither error question
measured on the bench fixtures; before/afters over the six-photograph
rig and `npm run audit` with two to four ladder profiles. (2) the
**contact-sheet modal** (dither axis). Evidence to `bench-reports/`
or here; then the sign-off sitting signs the programme and the
slices become Track D items.
