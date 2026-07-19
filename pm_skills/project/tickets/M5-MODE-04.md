# M5-MODE-04 — Persist processing intent

## Purpose

Carry the selected semantic processing mode through pipeline configuration and versioned JSON,
separately from temporary preview draft quality. Balanced is the provisional default for new and
v1 projects; M5-MODE-01 must confirm the enum and migration contract first.

## Current persistence

`PipelineConfig` currently stores preset, grid, resize mode, palette, metric, dither, and serpentine.
`ProjectFile` schema version is validated/migrated and serialization is canonical enough for
save→load→save byte identity. Palette persists by preset name. Adding a mode changes user data and
requires a default, validation, migration, schema bump if shape changes, and round-trip tests.

Adaptive draft currently derives a temporary effective config under load (dither off) and must never
enter project JSON. Likewise the backend selected by calibration is runtime diagnostics, not creative
intent. Export receives the persisted selected mode resolved at full execution quality.

## Implementation choices

Persist one stable enum (approved names likely `exact`, `balanced`, optional `responsive`) in the
project pipeline/config. Centralise mode→parameter resolution so UI, worker, and export cannot drift.
Unknown enum values must produce a path-specific load error unless a future migration handles them.
If Responsive is conditional/absent, decide whether schema accepts it for forward compatibility or
rejects it; do not silently coerce creative intent.

## Tests

- New project default, v1 migration default (Balanced per explicit waiver if confirmed), every retained
  enum, invalid/missing/unknown value, newer schema rejection, and stable validation messages.
- Persistence round-trip: save→load→save byte-identical; source/project fields not lost; repeated load
  migration stable. Exact/Responsive selection survives reload.
- Separation regression: draft transitions/backend calibration do not change serialized mode; export
  resolves saved mode; UI restore reads it.

## Likely files and done evidence

`core/pipeline/config.ts`, `core/project.ts`, `main.ts` default state, project/pipeline tests and sample
test JSON; controls in ticket 05. Do not regenerate golden pixels or destroy unknown user fields.
Done when migration and round-trip suite pass, export/config separation is proven, `npm run check` is
green, and schema/default rationale is recorded.

## Fresh-chat starting point

Read M5-MODE-01, project source/tests, persistence checklist, and the owner’s v1 compatibility waiver
in `M5-PERF.md`. Map every constructor/default/serializer/parser before editing so no state path is missed.
