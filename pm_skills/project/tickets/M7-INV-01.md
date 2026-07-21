# M7-INV-01 — Personal thread inventory

## Outcome

A reusable inventory records which concrete brand/reference threads the user
owns. It supports add/remove, brand/family/search filtering, versioned
import/export, and an “only use threads I own” conversion restriction that
persists across projects.

## Current baseline

The app has no browser storage, autosave, catalogue search, or cross-project
state. Project schema v1 is downloaded/uploaded JSON and stores creative settings
only. The architecture names IndexedDB for autosave/session state, but it has not
been implemented. The offline/no-account posture means inventory must remain
local unless the user explicitly exports it.

M7-BRAND-01 must provide stable thread identities. Hex, name, row index, and
palette position are not durable inventory keys. M7-BRAND-02 must provide the
enabled-brand universe to which “owned only” applies.

## Persistence boundary

Inventory is library data shared across projects, so IndexedDB is the natural
browser store: asynchronous, same-origin, transactional, and suitable for
indexed records. Use a versioned database and object store keyed by
`brandId/reference`, with explicit upgrade steps and `versionchange` handling.
Keep the storage adapter outside `src/core/`; core consumes a plain immutable set
of allowed identities.

Browser storage can be cleared or evicted. Import/export is therefore part of
the safety contract, not a convenience. Export a versioned, canonical JSON file
with catalogue provenance and owned identities. Import should validate first,
then offer/define merge versus replace; replace is destructive and requires
confirmation or undo. Unknown/retired references survive as unresolved records
so user data is never silently discarded.

## Reproducibility decision

A project that says only `ownedOnly: true` can render differently when the
global inventory changes. To meet “saved projects reproduce identically”, save
the exact resolved thread set or palette snapshot used for that project along
with the live restriction intent. On reopen, render the saved snapshot and show
that the current inventory differs; an explicit “refresh from inventory” action
may recompute. Do not silently bind historic output to mutable global state.

## UI and behaviour

Use a searchable/filterable structured list or data table with text identity,
not swatches alone. “Owned” should be an explicit checkbox/toggle per thread and
support bulk operations with confirmation. Family/filter metadata must come from
catalogue data; do not infer official colour families from RGB without naming
the inference. Empty inventory plus “owned only” is an explained invalid
conversion state, never an automatic fallback to all threads.

## Likely implementation surface

- New main-thread inventory repository/storage adapter and pure import/export
  validation; no DOM or IndexedDB in `src/core/`.
- Brand catalogue and palette-policy model, Colour/Inventory UI, project schema
  snapshot fields, diagnostics events, and redaction review (inventory contains
  no secrets but is still user data; do not dump the full library in diagnostics).
- Tests: empty, create/update/delete, transaction error, upgrade, corrupt import,
  merge/replace, unknown references, cross-project persistence, owned-only
  restriction, and project-output round trip.

## Acceptance evidence

Create an inventory, reload the app, open a different project, and prove it is
still present. Restrict conversion and assert every output identity is owned.
Save a project, mutate inventory, reopen, and verify the project reproduces with
an explicit stale-library notice. Test export → clear test database → import and
record byte/canonical equivalence. Storage permission/eviction remains a manual
browser check.

## Risks and dependencies

- IndexedDB upgrades can be blocked by another open tab; surface the blocked
  state and close old connections on `versionchange`.
- Never expose raw inventory data in routine logs or diagnostics.
- Depends on M7-BRAND-01/02; custom palette import/export should reuse schema
  conventions but not share the same object store blindly.

## References

- Requirements: `docs/requirements.md` §§5, §20, and §23.1.
- [W3C IndexedDB 3.0 specification](https://www.w3.org/TR/IndexedDB/) —
  transactional object stores and upgrade semantics.
- [MDN IndexedDB overview](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
