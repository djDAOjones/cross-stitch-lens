# M15-PERSIST-01 — Profiles persist: store, project file, migration

Scope parent: D114 (waiver + schema conduct), D115 (My-colours
library), D116/D117 (kind-aware store, generic-or-absent
import/export). Line compressed into this ticket at the 2026-08-07
roadmap refactor (D119); full intent preserved here.

## Store

- Profiles live in IndexedDB with revisions plus import/export — the
  `records.ts` pattern generalised.
- **Kind-aware from the start** (D117 seam fix 1): M15-DITH-01 mounts
  a second profile kind on this store without rework.
- Import/export is designed **generically or not at all** (the D116
  cut line): no colour-only export format the dither kind would have
  to break later.
- Custom `user:` colours persist in the **global My-colours library**,
  available to every profile — never trapped in one profile (D115).

## Project file

- The policy half becomes the **design's recipe copy** plus a
  `profileRef {id, revision}`.
- Schema bump with best-effort migration under the D114 waiver:
  visible note, never a crash, snapshot authoritative.
- Existing saved palettes convert **1:1 into explicit-membership
  profiles** (order preserved — D46 identity), never silently
  dropped.

## Done when (expanded)

- save→load→save byte-identical on the new schema.
- Old fixtures load and render via snapshot with the visible note.
- A pre-existing saved palette reappears as a profile with its order
  intact.
- Library round-trip tests green.
