# MENU-01 — group the profile menu so it stays scannable

The colour-profile select is a flat list of every profile. It holds 25
built-ins today, 33 if ICE-PROFILES-02's batch three ships, and 125 if
that ticket's whole queue were ever built. Grouping is what keeps the
menu usable as the gallery grows — and it is worth doing at 25.

Scoped 2026-08-24 with the mechanics verified in the tree, and revised
the same day once the fuller picture came out: there are **four**
profile selects, not two. **Every design decision below carries a
recommendation; a build session may proceed on those recommendations
without a further sitting.** Only the taxonomy (decision 1) is worth
the owner's eye before it lands.

## Why now

The gallery grew from 9 to 25 built-ins across M15-GALLERY-01's two
batches without the menu ever being revisited. Nothing is broken, but
the control has quietly become a 25-item flat list whose only
structure is a `(built-in)` suffix. Batch three is the moment it gets
visibly worse, so the grouping wants to land first — retrofitting it
after users notice is the expensive order.

It is also independent: it improves today's menu with no drafting, no
new profiles, and no owner signature on membership.

## Current mechanics — verified, not assumed

**Four selects list profiles.** Only the two colour ones are in this
ticket's scope, but the wider picture matters, because the
option-building is hand-rolled in every one of them:

| Select | Where | Lists |
| --- | --- | --- |
| `#colour-profile` | `ui/colour-section.ts:169` | 25 built-ins + user |
| `#dither-profile` | `main.ts:1932` | 7 built-ins + user |
| `#adjust-profile` | `main.ts:2040` | 9 built-ins + user |
| `#<kind>-profile-switcher` | `ui/profile-editor.ts:130` | the kind's list; one instance per kind |

Each section select sits beside its own "Edit profiles…" button that
opens the takeover editor (M15-UI-02 — "a view swap, not a dialog"),
so a section select and the switcher are **never visible together**.

**In scope: `#colour-profile` and the colour switcher.** The Colour
section's select rebuilds only when a fingerprint moves (`optionsFp`,
`colour-section.ts` ~447), keyed on `[id, name, builtin][]`,
`profileRef`, `edited` and `inventoryEmpty`. The switcher rebuilds in
`renderSwitcher()` (`profile-editor.ts` ~197) and **is shared by all
three kinds**, so it must group *conditionally* — by kind, not by list
length, since a length threshold would make the menu restructure
itself as a user saves profiles.

**The list is built in `main.ts`.** `refreshProfilesCache()` (line
~2176) merges `builtInProfiles(CATALOGUE)` with
`library.listProfiles('colour')`; the section receives the projection
`SectionProfile { id, name, builtin }` (`colour-section.ts:19`) and the
editor `ProfileView { id, name, builtin, revision }`
(`profile-editor.ts:28`). Neither carries a group today.

**The section selects and the switcher are different verbs, and must
stay separate.** A section select *applies a profile to the design* —
it changes the picture. The switcher *opens a profile for editing*,
and guards the move with `confirmDiscard()`, reverting the select when
the user cancels. Merging them would conflate "what my design uses"
with "what I am editing"; the discard guard is the proof they are not
the same control.

**The option-building, though, is duplicated four ways and already
drifting.** `colour-section.ts` builds labels inline and carries the
sentinel, the inventory empty-state and `(edited)`; `main.ts` builds
from pre-computed `[value, label]` pairs twice, with a `Custom`
sentinel and a disabled state; `profile-editor.ts` builds inline with
only the `(built-in)` suffix. That divergence is why the suffix and
the sentinel handling differ between them today, and it is why
grouping would otherwise be written twice.

**Four special cases the option loops already carry.** Any grouping
must preserve all of them:

- `UNLINKED_DESIGN` (`'custom:design'`) — "This design's colours",
  prepended only when `profileRef === null`, so a migrated or orphaned
  design names itself honestly rather than wearing the first option's
  name.
- `MY_INVENTORY_PROFILE` — disabled with an explanatory label when the
  inventory is empty, but kept selectable when a loaded design is
  already linked to it (MYTHREADS-01).
- The `(edited)` suffix, which rides the linked option's label
  (EXT-43).
- The `(built-in)` suffix on every built-in.

## What is NOT affected — the de-risking half

- **No schema change, no migration.** The project file stores only
  `palette.profileRef { id, revision }` (`core/project.ts:147`) — a
  reference, never the profile body. Built-ins are computed from code
  at load. A category on a built-in is therefore invisible to saved
  files, and `SCHEMA_VERSION` does not move.
- **No engine or export risk.** `tests/ui-baseline` pins engine,
  worker and export bytes, not DOM structure. Grouping cannot move
  those hashes.
- **Order is not identity here.** D46 governs *entry* order inside a
  profile; the select's option order is presentation only, and
  `profileRef` resolves by id. Regrouping the menu cannot alter any
  saved design.
- **No selection logic changes.** `<optgroup>` is presentational —
  `select.value`, the `change` handler and the disabled-option
  behaviour are untouched.

## Decisions

### 1. The taxonomy — the one worth the owner's eye

The 25 built-ins are not all the same kind of thing, and that is the
grouping the menu is missing. Recommended, four groups:

| Group | Holds | Today |
| --- | --- | --- |
| **Your threads** | DMC, All threads, My inventory | 3 |
| **Simple sets** | Black & white, Retro 16, Web-safe | 3 |
| **Styles** | Sepia, Pastels, Classic cross stitch, and the sixteen gallery profiles | 19 |
| **Your profiles** | everything from the store | 0+ |

This splits on the question a user is actually asking — *where do
colours come from* versus *what should it look like* — and it needs no
per-profile taste call, because membership follows from the recipe
shape.

**The weakness, stated:** Styles holds 19 today and 27 after batch
three, so the biggest group is barely smaller than the flat list is
now. The alternative is to split Styles by territory (art, nature,
industry, early computing…), which is the axis ICE-PROFILES-02's pool
already uses — but at 19 profiles that over-fragments into groups of
two and three. Recommendation: ship the four groups now, and split
Styles only when it passes ~25 on its own.

### 2. Where the unlinked option goes

Recommended: **ungrouped, first**, above every optgroup. "This
design's colours" is not a profile and should not appear to be one; a
bare `<option>` before the first `<optgroup>` is valid HTML and reads
correctly.

### 3. Where user profiles go

Recommended: **last**, in "Your profiles", and the group is omitted
entirely when the store is empty rather than rendered empty. Built-ins
are the common case; a user with 30 saved profiles still finds theirs
at a predictable end.

### 4. The `(built-in)` suffix should go

Once built-ins sit in their own groups and user profiles in "Your
profiles", the suffix is duplicated noise on 25 options. Recommended:
**drop it from the Colour section select**, where the groups now carry
that information. Keep it in the editor switcher wherever that
switcher stays flat (dither, adjust), because there the groups are not
there to say it. `(edited)` stays everywhere — it says something the
groups cannot.

### 5. The shared switcher

Recommended: group the switcher **only for the colour kind**, on an
explicit per-kind flag rather than a length threshold — a threshold
would make the menu restructure itself as a user saves profiles, which
is worse than either shape.

### 6. How far to converge the four option loops

Grouping has to land in two places (`#colour-profile` and the colour
switcher), so writing it twice is the default and the wrong answer.
Recommended: **extract one option-rendering helper covering those two
only**, and leave `#dither-profile` and `#adjust-profile` alone.

That is the minimum that stops grouping being written twice, and it
keeps the blast radius at the two selects the feature actually
touches. Converging all four is a genuine cleanup — they have drifted,
and the drift is why the `(built-in)` suffix and the sentinel handling
differ — but the dither and adjust selects gain nothing from grouping,
and pulling them into a shared helper inside a feature change makes
the diff harder to review and lets the two fail together. **Record the
four-way convergence as its own cleanup item instead of doing it
here.**

The controls themselves stay separate regardless: apply-to-design and
open-for-editing are different verbs (see the mechanics above).

## The build

0. **Extract the option-rendering helper** for the two colour selects
   first (decision 6), so the grouping that follows is a one-place
   change rather than two. Land it as its own commit with no behaviour
   change, so the grouping diff is legible on top of it.
1. **Category on the built-ins.** Add a field to the built-in
   definitions in `core/color-profile.ts`. Keep it off the persisted
   `ColorProfile` shape if possible — a built-ins-only lookup keyed by
   id costs nothing and leaves user profiles alone (decision 3 puts
   them all in one group anyway, so they need no category).
2. **Carry it through.** Add the group to `SectionProfile` and, for
   the colour kind, `ProfileView`; project it in
   `main.ts:refreshProfilesCache()`.
3. **Emit optgroups** in both option loops, preserving all four
   special cases above.
4. **Extend `optionsFp`** to include the group, so a category change
   rebuilds the options. Cheap insurance; the fingerprint already
   exists.
5. **Group the audit table** in `tests/audits/profile-gallery.audit.test.ts`
   to match, so the evidence sheet and the menu tell the same story.
6. **Add a UI-STANDARDS line.** There is currently **no standard on
   long lists or grouping** — this is the first, and the next long
   select should not have to re-derive it.

## Testing

**The option-building code has no DOM-level test today.**
`tests/profile-editor.test.ts` covers pure helpers only
(`parseHexQuery`, `browseUniverse`, the readout fingerprints), and no
test references `#colour-profile` or `#<kind>-profile-switcher`. This
work should bring the first, covering:

- every profile appears exactly once, in the right group;
- the unlinked option appears only when `profileRef === null`, and
  outside every group;
- My inventory keeps its disabled/enabled behaviour when empty, inside
  a group;
- `(edited)` still rides the linked option;
- an empty store renders no "Your profiles" group;
- the dither and adjust switchers stay flat.

**Accessibility:** `<optgroup>` labels are announced by screen readers,
which is the point, but this is exactly the kind of change A11Y-VO-01
exists to check. Add the grouped select to that item's list rather
than claiming the pass here.

## Done when

Both selects group the colour profiles, all four special cases still
behave, the dither and adjust switchers are untouched, the audit table
matches the menu, a UI-STANDARDS line records the rule, and `check` is
green with the new option-structure tests.

## Links

- `src/ui/colour-section.ts` (select + fingerprint + special cases),
  `src/ui/profile-editor.ts` (shared switcher), `src/main.ts`
  (`refreshProfilesCache`), `src/core/color-profile.ts`
  (`builtInProfiles`).
- ICE-PROFILES-02 — the queue that makes this pressing; its batch
  three is the trigger.
- D204 — where per-profile category tags were raised and left
  unscoped; this ticket is that scope.
- A11Y-VO-01 — absorbs the screen-reader check.
