# DUR-01 — Work survives closing the tab

## Signed scope (2026-08-12, D171)

Six decisions, owner-signed. Rationale lives in D171; this is the
working detail.

1. Reopening **restores the design in progress** — no explicit save,
   no dialog, no "recover?" prompt. The work is just there.
2. **A history**, not a single slot: several recent designs.
3. **Explicit save stays primary and the UI steers to it.** A file
   survives a storage clear-out and is the sharing unit; the history
   is a safety net, not a replacement.
4. The **source picture is restored** with the settings.
5. The **source picture is embedded in saved files**; a live capture
   **freezes to a still** at save time.
6. Storage is **bounded**, warns **before** evicting a stored picture,
   and offers an **opt-in to keep more**.

## Option picked (2026-08-12): a project package

**A store-only zip container** with its own extension, holding
`project.json` plus the source image verbatim. Chosen over base64-in-
JSON (~+33 % on every save, and the file stops being readable) and a
sidecar pair (two files separate in the wild, defeating decision 5).
Smallest files, one shareable artefact, settings still readable once
unzipped, and **no runtime dependency** — store method means no
compression codec, just headers and CRC32.

Fixed constraints either way:

- **`.json` settings-only files keep loading forever.** Detect by
  magic bytes (`PK\x03\x04` = package, `{` = legacy JSON).
- **Source bytes are stored verbatim, never re-encoded** — the
  save → load → save byte-identity invariant.
- **The zip must be deterministic.** Zip entries carry a modification
  time; writing "now" would make two saves of an unchanged project
  differ byte-for-byte and break the invariant. Timestamps are fixed
  to a constant, not taken from the clock.

## Conservative defaults (assumed unless the owner says otherwise)

- History: ~10 slots plus a total byte budget; evict oldest first.
- Restore is silent. No modal, no confirmation.
- The persist opt-in is offered **near the quota**, not on first use —
  a permission prompt on arrival is the pattern this project rejects.
- Design snapshots live in their **own IndexedDB store**, never mixed
  with library data (inventory, palettes, profiles).
- A restored-but-unsaved design is visibly marked as such.

## Implementation surface

`src/library/store.ts` (a new snapshot store beside the library one),
a new snapshot/quota module, `src/core/project.ts` (the container
format + schema bump + migration), `src/main.ts` (restore on boot, the
save-steering copy, the eviction warning, the persist opt-in), the
capture freeze path, and `src/export/` if the container work lands
next to the exporters.

The standing copy **"Nothing is kept unless you save your project."**
(Project section) becomes false the day this ships — it must be
rewritten in the same change, not after.

## Rides along

**SAVE-01**: `projectFilename` currently names from the grid alone, so
every 200 × 200 design collides. The existing `Design title` field
should drive the filename, with a sane fallback when it is empty.

## Acceptance evidence

Close and reopen returns the design *and its picture*; a capture
session's freeze reopens as a still; a saved file opens on a different
machine with no library present; `.json` files from v9 and earlier
still load; save → load → save stays byte-identical; the quota warning
fires before eviction, not after; the history evicts oldest-first and
never evicts a saved file's contents (it has none — files are on
disk).

## References

- Requirements: `docs/requirements.md` §20 (project files), §3 (sources).
- Decisions: D75/D149 (the no-autosave state this replaces), D171 (scope).
- `architecture.md` persistence row — protected-doc delta on ship
  (ledger line already open).
