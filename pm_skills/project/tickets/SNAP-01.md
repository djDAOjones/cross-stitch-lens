# SNAP-01 — snap any profile to one manufacturer's range

Raised by the owner 2026-08-24, at the manufacturer split: *"it would
be cool if we have a function that would map any of the colour profiles
to snap to the nearest colours for a given manufacturer."*

Iceboxed, not scheduled. The engine half already exists and is unused,
which makes this much cheaper than it looks — and much more valuable
than a convenience, because it is what finally removes brand privilege
from the gallery rather than just from the menu.

## Why it matters more than it sounds

Every curated built-in in the gallery is a list of **specific threads**,
and all but one are DMC. So Ukiyo-e woodblock, Art deco, Delft blue,
Fair Isle, Heraldic tinctures and the rest are, in practice, DMC
designs. A stitcher who prefers Anchor can select them, but the
shopping list they get is somebody else's brand.

Snapping fixes that at the root: any profile, rendered in the range you
actually buy. Two consequences worth naming:

- **The gallery stops being brand-shaped.** MENU-01 removed DMC's
  billing from the menu; this removes it from the profiles themselves.
- **The High-visibility safety exception could retire.** It is the one
  built-in that spans brands (D206), because DMC's nearest fluoro
  yellow-green is ΔE ≈ 36. With snapping, membership could be authored
  in whatever range carries the style honestly and *resolve* into the
  user's — which is a better answer than either single-brand or
  multi-brand authoring.

## What already exists

`src/core/thread-equivalents.ts` — **built, tested, and wired to
nothing** (only `tests/thread-equivalents.test.ts` imports it). It
answers exactly the question this feature asks:

- `nearestEquivalents()` — nearest in CIELAB over a target brand's own
  measured colours;
- a two-layer model, **curated over computed**, where curated means a
  manufacturer or owner-reviewed cross-reference;
- `describeEquivalent()` for labelling;
- every result carries which layer it came from.

So the work is not the matching. It is the profile-level application,
the UI, and the honesty.

## The honesty constraint, which is the hard part

The module's own doc states the rule, and it should govern this
feature:

> a computed match is a *suggestion*, and presenting it with the same
> authority as a manufacturer's own conversion chart would be a false
> claim about thread the user is about to buy.

**There is no curated data today** — `thread-map-proposed.csv` is a
header with no rows (owner data, DATA-01's territory). So every snap
would currently be computed, i.e. every result is a suggestion. The UI
cannot present a snapped palette as if it were the profile's own
colours; the shopping list is the thing people spend money on.

## Open questions for whoever scopes it

- **Where does it live?** Three quite different products: a control on
  the design ("show me this in Anchor"), a standing preference ("I buy
  Anchor — always resolve into it"), or an export-time option ("chart
  in DMC, shopping list in Anchor"). The preference reading is the one
  that would let the DMC/All-threads shortcuts disappear entirely.
- **Does it change the design or only the list?** Snapping alters the
  rendered colours, so it changes the picture — it is a pipeline
  concern, not a labelling one. Unless it is export-only, in which case
  the chart and the picture disagree, which the project would normally
  refuse.
- **Collisions are the real design problem.** Two distinct colours in a
  profile can snap to the *same* thread in a smaller range. Does the
  palette shrink (honest, but the colour count silently drops), does it
  take the second-nearest (keeps the count, worsens the match), or does
  it refuse and say so? The count-limit machinery and the
  "never-lying" conventions both bear on this. A range with 489 entries
  snapping into one with 200 will collide often.
- **How is a computed match labelled** in the Colours-used table, the
  chart key and the PDF export? KEY-01's provenance-honest labelling is
  the precedent — real threads keep manufacturer identity (D55).
- **Does it interact with Must-use pins and swaps?** A pinned thread
  that snaps to something else is a promise broken.

## Trigger

Wakes on any of: the owner scheduling it; curated cross-reference data
arriving (DATA-01 / `thread-map-proposed.csv` gaining rows, which would
make snapping authoritative rather than suggestive); or a user asking
for a design in a brand other than the one a profile was authored in.

## Done when

Not scoped. A scoping pass answers the questions above — chiefly the
collision rule and where it lives — and produces a build slice.

## Links

- `src/core/thread-equivalents.ts` and its test — the engine half.
- `src/core/palettes/thread-map-proposed.csv` — the empty curated
  layer; owner data, protected.
- D206 — the hi-vis multi-brand exception this could retire.
- MENU-01 / D207 — the manufacturer split, which removed brand
  privilege from the menu but not from the profiles.
- ICE-EXPLORER-01 — carries the curated cross-reference note.
- DATA-01 — owns the catalogue's shape, including cross-reference.
