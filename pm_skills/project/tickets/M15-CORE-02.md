# M15-CORE-02 — Profile model and resolver

Scope parent: D114. The central core task: the recipe type, its
resolution to the effective colour table, and the built-ins. Absorbs
`palette-policy.ts`; `src/core/` purity holds throughout.

## Recipe shape (serialisable)

- `libraries` — on/off over brand ids + map ids + `mine` (the
  inventory as a library).
- `ownedOnly` — modifier intersecting with the inventory.
- `pins` — explicit per-colour include/exclude by id. Include wins
  over a range rule; exclude wins over everything.
- `ranges` — optional two-pole H/S/B rules, applied to library
  content, not to explicit includes.
- `name`, `id`, `revision`, `builtin` flag, `createdFrom`
  provenance — the LibraryPalette pattern (records.ts) generalised.

## Resolution order (the contract)

1. Union the enabled libraries — brands in catalogue order, then
   maps in declared order, then user entries; within a library,
   catalogue/generator order.
2. `ownedOnly` intersects — **thread-library content only**:
   generated (`map:`) and `user:` entries are not ownable and pass
   through, the explanation sentence naming the distinction (D115 —
   without this, a profile with a map and owned-only enabled
   empties silently).
3. Ranges filter library content.
4. Exclude pins remove.
5. Include pins add back (or append if absent).

Deterministic; the LUT fingerprint (D46) reads the resolved order.
Every step emits its explanation sentence through the conflicts
machinery; nothing throws.

## Built-ins (read-only, duplicate-to-edit)

DMC (default), All threads, My threads, Black & white, Retro 16,
Web-safe, Sepia (range rule), Pastels (range rule), Classic cross
stitch (an initial, honest agent-chosen DMC subset — a real, usable
profile from day one, per the no-placeholder rule; owner refinement
and the wider gallery tracked by M15-GALLERY-01, which absorbs
ICE-PRESET-01).

## Policy absorption map

| Old policy field | New home |
| --- | --- |
| `brands[]` | `libraries` |
| `ownedOnly` | `ownedOnly` modifier |
| `source` (brands/preset/library) | `libraries`/`pins`, best-effort under the D114 waiver (visible note) |
| `excluded[]` | `pins` exclude |
| `locked[]` | design layer — Must use (M15-CORE-03) |
| `preferred[]` | retired |
| `count` | design layer, untouched here |

## Cutover

The old `PalettePolicy` maps through a pure policy→recipe function —
the same primitive PERSIST-01's migration uses — so the existing
panel keeps driving the pipeline unchanged until M15-UI-01 swaps the
surface (last in the run order, D115). One model underneath, no dual
paths, no dead period.

## Done when (expanded)

- Resolver tests per step including the explanation sentences;
  ordering contract pinned; empty results explained, never thrown.
- Built-ins resolve non-empty against the shipped catalogue.
- All palette-policy consumers compile against the new layer;
  prefer gone; tests updated, never weakened.
