# M15-DITH-02 — Dither editor on the shared shell

Scope parent: D116. The chooser-editor: profile list + judgement
preview + a three-field form, mounted as the second kind in
UI-02's takeover shell with UI-04's preview rig — by this point
both ship colour-first; any generalisation they still need lands
here and is recorded.

## Anatomy

- List: built-ins (read-only, basis lines) then user profiles;
  New/Duplicate/Rename/Delete via the shell's verbs;
  draft-then-Save per D114's §5.4 exception.
- Form: Method (five + none), Strength with the per-family
  semantics and bounds (`strengthBounds` — diffusion 0–100 % of
  error, threshold 0–200 % of base amplitude), Serpentine only
  where the method scans. Controls a method does not define are
  absent, never disabled (M8-CTRL-01).
- Preview: the UI-04 rig against the draft config — last-still
  default, photo slots, test card, three-resolution grid,
  draft-labelled full-quality renders, debounced, never starving a
  live session.
- The editor opens on the design's active profile; the explicit
  act that updates the design (shell verb or a per-kind Use) is
  settled at build against the shipped colour editor.

## Kind-specific rules

- A dither preview needs a resolved thread palette: the design's
  current palette by default; under full-RGB a **named
  demonstration palette** with an honest label — dithering applies
  to thread palettes.
- The palette-context line always names what the preview renders
  with (dither's look depends on palette density — the reason the
  "Very limited palette" built-in exists).
- Frame results never rebuild editor controls (EXT-43; UI-02's
  pinned test extends to this kind).

## Cut line (D116)

In: the above. Deferred: the side-by-side compare grid (one big
preview with fast switching beats small thumbnails at stitch
scale). Dev-only entry until DITH-03's cutover — no dead controls
in the shipped surface at any point.
