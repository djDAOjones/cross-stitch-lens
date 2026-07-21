# M7-PAL-01 — Named custom palettes

## Outcome

Users can create, edit, duplicate, delete, import, export, and reuse named
multi-brand palettes. A project reopens with identical output even when the
library palette was later edited, deleted, or contains missing/retired/duplicate
references; those conditions are visible rather than silently repaired.

## Current baseline

`Palette` is already an ordered set, and order participates in cache identity
because LUTs store indices. Only bundled DMC is loadable. Schema v1 stores one
palette name rather than entries; an unknown name makes project load fail.
M7-BRAND-01 will introduce durable thread identities and solve same-RGB reference
ambiguity. M7-INV-01 establishes the cross-project storage/import conventions.

## Resource and snapshot model

Treat a library palette and a project's resolved palette as related but distinct:

- Library record: stable palette ID, user-visible name, revision, ordered thread
  identities, provenance/created-from metadata, and schema version.
- Project snapshot: the exact ordered thread records/display values used to
  render, plus optional library ID/revision for update detection.

On reopen, the snapshot is authoritative for identical output. If the library
revision differs or is missing, show the state and offer an explicit refresh;
never substitute by name. Import collisions need a defined duplicate/new-copy
policy. Palette names are labels, not identifiers, and need not be globally
unique if the UI can distinguish copies, though preventing accidental duplicates
may be friendlier.

## Integrity rules

- Duplicate thread identities in one palette should normally be rejected or
  coalesced with an explicit message; duplicate RGB from distinct identities is
  valid and remains visible.
- Missing/retired references stay as unresolved entries with their last-known
  snapshot. Define whether they remain eligible for conversion; the safe default
  is visible but excluded until the user explicitly permits/substitutes them.
- Reordering changes deterministic tie-breaking and output identity even if RGB
  bytes happen to match; it is a real edit.
- Delete is recoverable where practical (undo or confirmation) and cannot damage
  already saved projects because those carry snapshots.

## UI and data flow

Use a Carbon side-panel/modal editing pattern with a structured list, explicit
save/cancel, validation near the field, keyboard reordering alternatives, and
textual brand/reference/name alongside content-colour swatches. Live preview of
an unsaved edit can use a draft palette, but commit it atomically and avoid
writing IndexedDB on every drag/reorder tick.

Library persistence belongs outside core. Validated plain palette snapshots feed
the pure pipeline. On commit or selection, clear/rebuild derived LUT/candidate
caches via content identity and submit one latest-wins reprocess.

## Likely implementation surface

Brand/catalogue types, a palette-library repository, canonical palette-file
parser/serializer, editor/list UI, project schema/migration, worker identity
sidecars, stats/exports, and tests. Avoid changing protected palette source data.

## Acceptance evidence

Cover empty/single/large/multi-brand palettes, duplicate identity, duplicate RGB,
unknown/retired references, name/revision collisions, reorder, import corruption,
delete/undo, cache invalidation, and IndexedDB failures. The critical round trip
is: save project with palette A → edit/delete library A → reopen → byte-identical
project serialisation and pixel/reference-identical output, with a visible library
status. Manual checks cover editor focus, validation, 44 px targets, and live
performance.

## Risks and dependencies

- Name-only references cannot meet the acceptance condition; schema must evolve.
- User palette files are untrusted input: validate sizes, types, colour syntax,
  identity shape, and entry limits before allocation or storage.
- Depends on M7-BRAND-01 and should share M7-INV-01 storage conventions without
  merging their lifecycle semantics.

## References

- Requirements: `docs/requirements.md` §5.3, §20, and §25.
- Decisions: D13 (ordered palette model), D30 (v1 name reference), D46 (cache
  identity), D49 (output reproduction invariant).
