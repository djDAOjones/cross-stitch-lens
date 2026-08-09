# M15-GALLERY-01 — Profile gallery: culture & nature

Owner ask at the D115 second look: "create lots of useful and
interesting profiles from across culture and nature." Absorbs
ICE-PRESET-01 and the D114 placeholder list. No longer blocked:
M15-CORE-02 (the recipe machinery, D122) and M15-UI-04 (the test
preview, D123) both shipped.

## Batches so far

- **Batch 1** — signed 2026-08-09 (D140): Autumn leaves, Golden hour,
  Winter frost, Deep sea, Neon noir (rule-shaped); De Stijl primaries,
  Delft blue, Ukiyo-e woodblock (curated).
- **Batch 2** — drafted 2026-08-09 (D144), **unsigned**: Rainforest,
  Spring meadow, Gemstones, Moorland (rule-shaped); Art deco,
  Mid-century modern, Fair Isle, Fluoro spot print (curated). The last
  of those is the list's "Risograph print" renamed — Risograph is a
  trademark.

Candidates below are the **remaining** ones; a shipped candidate moves
out of the list rather than being ticked, so the list stays a queue.

## Process

- Agent drafts candidates in **batches of roughly 6–10**: a range
  rule where the style is honestly rule-shaped, curated membership
  where it is taste-shaped; each candidate ships with test-image
  evidence (the generated card at minimum; the five slots at three
  resolutions once UI-04 exists).
- The owner curates each batch — names and membership/rules — and
  signs it; only signed batches ship as built-ins.
- **Naming:** style-descriptive, never trademarks ("Cosy pixel
  farm", not a game's name). Nothing placeholder ships in the UI;
  this ticket is where the unshipped candidates live.
- Built-ins are read-only, duplicate-to-edit, distinguished from
  user profiles (CORE-02).

## Candidates — culture

All unsigned; the owner cuts, renames, and reorders freely.

- **Movements and eras:** Impressionist water-lilies, Art nouveau,
  Bauhaus, Pop art (Warhol), Memphis, Baroque gold, Rococo pastel.
- **Design and media:** Technicolor, Vaporwave, Y2K chrome, Rave
  flyer, 8-bit arcade, Cosy pixel farm.
- **Craft and place:** Talavera tile, Batik, Kilim, Sashiko indigo,
  Terracotta and lime, Scandinavian winter.

## Candidates — nature

- **Seasons and light:** Summer coast, Dawn mist, Storm light,
  Aurora.
- **Biomes:** Desert bloom, Coral reef, Alpine, Tundra, Wetland
  reeds.
- **Flora and fauna:** Wildflower verge, Succulents, Butterfly
  wing, Plumage, Beetle shell, Lichen and bark, Autumn fungi,
  Rock pool.
- **Mineral and sky:** Opal fire, Slate and moss, Sandstone canyon,
  Night sky.

## Done when (expanded)

- Each shipped batch: owner-signed membership or rules, honest
  naming, evidence attached; the select never gains an unsigned or
  empty entry.
- The first batch establishes the evidence format the rest follow.
  Batch 2 made that run reproducible — `npm run audit` renders every
  built-in on the sample card at the default limit and writes both the
  table and a JSON artefact
  (`tests/audits/profile-gallery.audit.test.ts`). Quote it; do not
  re-derive it.
