# M7-MIX-01 — Locked, preferred, and excluded colours with auto-fill

## Outcome

Users can lock required threads, prefer desirable threads, exclude forbidden
threads, and let the app fill the remaining slots from the permitted universe.
Manual choices survive recomputation; conflicts are deterministic and visible,
never silently overridden.

## Current baseline

There is one active palette and no selection-policy layer. Palette order is the
nearest-match tie-break and is semantically significant. M7-COUNT-01 introduces
source-dependent subset selection; this ticket supplies its hard and soft
constraints. M7 brand, inventory, preset, and custom-palette tickets define the
permitted universe and durable thread identities.

## Recommended policy model

Keep three disjoint identity sets plus the requested count mode:

- **Locked:** hard inclusion in the selected palette, even when current source
  usage is zero.
- **Excluded:** hard removal from the eligible universe.
- **Preferred:** soft benefit during auto-fill, never a guarantee.

Resolve contradictory edits at the interaction that creates them. A thread
cannot remain both locked and excluded; ask/announce which state wins rather than
letting backend precedence decide. Disabled-brand, missing, retired, or unowned
locked threads remain unresolved conflicts and are not silently substituted.

Auto-fill should start with unique valid locks, then choose the remaining
`target - lockCount` entries by the M7-COUNT-01 objective over eligible threads,
with a documented preference weight/tie rule. “Preferred” must not destroy image
quality without a visible trade-off; expose its effect in selection evidence.

Persist policy identities and the resolved ordered palette snapshot. Re-running
for source edits preserves the policy while allowing auto-filled entries to
change deterministically. If the product should freeze auto-fill too, that is a
separate “lock selected palette” action; do not make it an accidental consequence
of saving.

## Conflict catalogue

- locks > exact/maximum count;
- locked and excluded same identity;
- lock outside enabled brands, inventory-only restriction, or strict preset;
- no eligible candidates after exclusions;
- preferred entry missing/retired;
- target exceeds eligible unique identities;
- two identities share display RGB and cannot both be visibly distinguished;
- source has fewer used colours than selected entries.

Every case needs a user-facing explanation and a machine-testable result type,
not thrown strings from inside a pixel loop.

## Likely implementation surface

A pure policy resolver and structured conflict/result types in core; Colour
panel chips/table actions; M7-COUNT selector integration; project schema and
snapshot; worker preparation; stats/key labelling; diagnostics summaries that
contain counts/IDs only where safe. Tests should exercise the resolver separately
from expensive image selection.

## Acceptance evidence

The canonical case is “lock 5, request 15”: exactly five valid unique locks seed
the selection and auto-fill supplies ten eligible identities. Also test every
conflict above, repeated runs, source changes, brand/inventory changes, project
reload, and export. Manual UI checks cover discoverability, undo/removal,
keyboard selection, empty/error states, and non-colour state indicators.

## Risks and dependencies

- Avoid encoding policy through palette array position alone; position is also a
  rendering tie-break.
- Preference weight is a product decision and needs evidence, not a hidden magic
  constant.
- Depends on M7-BRAND-01/02, M7-COUNT-01, and the relevant inventory/palette/
  preset sources.

## References

- Requirements: `docs/requirements.md` §6 (force, exclude, maximum count) and
  §20 (project persistence).
- Decisions: D46 (ordered palette identity) and D49 (palette-membership/output
  reproduction invariants).
