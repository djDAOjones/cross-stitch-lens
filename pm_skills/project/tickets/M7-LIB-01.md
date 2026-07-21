# M7-LIB-01 — Complete the thread-library UI

## Outcome

The library operations M7-INV-01 and M7-PAL-01 specified but did not
ship: reordering a saved palette, changing ownership in bulk, and
deleting a palette without risking data.

Renamed from M7-PAL-02 at the M7 close triage: the work spans the
inventory as well as palettes, so a `PAL` prefix was too narrow. This
is the one M7 item kept ahead of M8, because each piece is a *missing
operation* on a shipped feature rather than a new capability — a user
can create library palettes but has no route to reorder or remove one,
and can only build an inventory one checkbox at a time.

## Current baseline (what shipped)

`src/ui/palette-panel.ts` gives per-thread lock/prefer/exclude and a
per-thread "Own" checkbox over a searchable, capped list. Library
palettes are created (`Save as palette`), selected, exported and
imported; `LibraryStore.deletePalette` exists and is tested but has no
UI. `LibraryPalette.revision` exists and is persisted but is never
incremented, because nothing edits a palette in place yet.

Order is already identity-significant end to end — it is the
nearest-match tie-break and it is what every LUT stores (D46) — so
reordering is a real edit, not presentation.

## What is missing

- **Reordering.** Needs a keyboard-accessible route, not drag-only
  (UI-STANDARDS). Move-up/move-down buttons per row are the cheap
  Carbon-compatible answer and are inherently keyboard-operable.
  Committing an edit should bump `revision` and write once, not per
  drag tick.
- **Bulk inventory.** "Mark all shown as owned" over a filtered list,
  with a confirmation and a stated count, so building an inventory from
  a brand does not take 489 clicks.
- **Delete with recovery.** Deleting a library palette must be
  confirmable and ideally undoable. It cannot damage saved projects —
  those carry their own snapshot (D55, decision 7) — so the risk is
  losing the reusable record, not the design.

## Behaviour to define

- Does reordering a library palette affect a project currently using
  it? Under D55 the project renders from its snapshot, so: no, until
  the user explicitly refreshes. The UI must make that visible rather
  than leave the user wondering why nothing moved.
- Bulk "mark owned" over a *filtered* list acts on the filter, not the
  catalogue. State the count in the confirmation so a stale filter
  cannot silently mark 3,338 threads.

## Likely implementation surface

- `src/ui/palette-panel.ts` — row controls, bulk action, confirmation.
- `src/library/store.ts` — already has `putPalette`/`deletePalette`; a
  revision bump belongs at the call site.
- Tests: reorder changes the identity fingerprint but not the colour
  fingerprint (`paletteIdentityFingerprint` vs `paletteFingerprint`);
  bulk operations are bounded by the current filter; delete leaves a
  saved project's rendering untouched.

## Acceptance evidence

Reorder by keyboard alone; confirm a bulk mark reports and applies the
right count; delete a palette a saved project uses and prove the
project still reopens pixel-identical with a visible library-drift
note.

## References

- Decisions: D46 (order is cache identity), D55 (snapshot authority).
- Shipped surface: `src/ui/palette-panel.ts`, `src/library/store.ts`.
