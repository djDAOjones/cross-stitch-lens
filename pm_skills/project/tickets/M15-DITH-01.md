# M15-DITH-01 — Dither profile model and store

Scope parent: D116. Runs after the colour half (owner order); the
PERSIST-01 pattern is the dependency, not just the precedent.

## Model

- `DitherProfile`: id, name, revision, and a **complete**
  `DitherConfig` (method + per-family strength + serpentine where
  the method scans). Never partial — a profile fully determines the
  dither stage (M8-CTRL-01's no-hidden-state rule at the profile
  layer). No new engine parameters: the D61 surface is the whole
  surface.
- The seven `DITHER_PRESETS` (`src/ui/dither-model.ts`) seed the
  read-only built-ins, basis lines kept for the editor's "Why:"
  display. Built-ins are immutable at the store level; Duplicate is
  the only edit path.

## Persistence

- Store: the PERSIST-01 records pattern reused under a dither kind;
  user profiles carry revisions. Import/export only if the pattern
  provides it generically (D116 cut line).
- Project file: the resolved `DitherConfig` already persists — that
  is the D55 snapshot half and it stays authoritative. Add
  `ditherProfileRef {id, revision}` (additive; schema bump under
  the D114 waiver).
- Load-time matching: a config structurally equal to a built-in
  (`sameDither`) attaches that reference; anything else stays
  unreferenced and renders as the honest unnamed state. Library
  drift (revision mismatch) is reported, never repaired by name.

## Done when (expanded)

- Save→load→save byte-identical on the new schema; old fixtures
  load with the right built-in attached or honestly unreferenced
  (tests over both paths); store round-trip suites green; built-in
  immutability pinned by test.
