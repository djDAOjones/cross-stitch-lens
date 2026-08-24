# ICE-PICKER-01 — a searchable, taggable profile picker

Raised by the owner 2026-08-24 while MENU-01 was being scoped: *"we
are likely to need many colour profiles, so need a way to filter /
reduce — maybe some highlighted ones come top and the rest are
searchable by name and/or tags, tags selectable."*

Iceboxed, not scheduled. MENU-01 (grouping a native `<select>`) is the
answer up to a few dozen profiles; this is the answer beyond that.

## Why it is not MENU-01

A search field and selectable tag filters cannot live inside a native
`<select>`. Wanting them means replacing the control with a combobox
or a takeover picker — a different thing, not a bigger `<select>`.
Three things keep it separate and unscheduled:

- **UI-STANDARDS prefers native.** Line 212: *"Prefer native HTML form
  controls before custom ARIA widgets"*; line 317: *"Semantic HTML
  before ARIA. No ARIA is better than bad ARIA."* Leaving `<select>`
  forfeits the mobile picker, keyboard type-ahead and screen-reader
  behaviour that are free today. That cost has to be earned by a
  profile count grouping genuinely cannot carry.
- **Grouping is sufficient for now.** 25 built-ins today, 33 if
  ICE-PROFILES-02's batch three ships. Four optgroups handle that
  comfortably. The pressure only becomes real when one group passes
  roughly 25 on its own.
- **Nothing is blocked by waiting.** MENU-01 ships `group`; this ticket
  adds `tags` and `featured` alongside it. They are orthogonal fields,
  so nothing has to be undone.

## The owner's hunch, recorded 2026-08-24

Stated at MENU-01's scope-time, and it is the most important line in
this file:

> *"I think we need tags and groups, and the ability to collapse and
> search for groups and profiles within the menu. I think we'll have
> well over 100 profiles as things progress."*

So the shape wanted is **tags *and* groups, both**, with **collapse**
and **search** over both — not tags instead of groups. And the
expected scale is **100+**, which is a statement of intent rather than
a threshold to wait for.

That changes this ticket's standing. The trigger below was written as
wait-and-see; if the owner expects 100+, the question is no longer
*whether* but *when*, and the honest reading is that MENU-01 buys time
rather than solving the problem. The trigger stands as the signal to
*schedule* it, not as evidence it might never be needed.

**Collapse is new** and was not in the original scope. It is
cheap — see below — but it adds a state question: are groups collapsed
by default, and does that state persist per user? A picker that opens
fully collapsed shows a dozen headings, which is arguably the best
possible answer to a 100-profile list, but it is a real design call.

## The trigger

Wakes on whichever comes first:

- the owner scheduling it, which their hunch above makes likely to be
  the real route; or
- one group passing ~25 profiles on its own (MENU-01's largest is 8
  today, drifting to ~16 after ICE-PROFILES-02's batch three); or
- a user asking to find a profile by anything other than scrolling; or
- user-created profiles becoming numerous enough that "Your profiles"
  is itself a scrolling problem.

## What already exists — the reason this is cheaper than it looks

`src/ui/browse-table.ts` is **the shared capped search table**
(M15-UI-03, D117 seam fix 3). It already owns:

- a search field with a pure `rowsFor(query)` row model;
- a row cap with an honest count line — *"Showing 40 of 3338 — search
  to narrow"*;
- a distinct empty state for "nothing matches your search" versus "this
  universe is genuinely empty";
- the "add as custom" offer hook, which a picker would not need.

It drives the colour browse over the 3,338-thread catalogue, so it is
already proven at a scale far past anything the profile list will
reach — 100+ profiles is not a large list by this codebase's
standards. A profile picker should **reuse it, not reimplement it** —
the work is a row model plus the tag filters, not a search control.

`src/ui/accordion.ts` is the other half. It is the project-coded
Carbon accordion (M14-IMPL-03, D83) already used across the shell,
`preferences.ts` and `info-panel.ts`: a real heading wrapping the
toggle, `aria-expanded`/`aria-controls`, and a panel that leaves both
layout and the tab order when closed. **Collapsible groups are a
solved pattern here, not new work.**

So both halves the owner asked for — search and collapse — exist as
proven, accessible modules. That materially changes the cost estimate:
this is closer to assembling two existing components against a new row
model than to building a custom widget from scratch. The remaining
risk is concentrated in what neither module covers: the *combined*
keyboard model (moving between a search field, tag filters and a
grouped list), and whether the thing replaces the native `<select>` or
sits behind a button.

## The three axes, which are genuinely different

The owner's sketch names three things that must not be collapsed into
one field:

| Axis | Cardinality | What it is for | Where it lands |
| --- | --- | --- | --- |
| **group** | exactly one | which optgroup an option sits in | MENU-01, shipped first |
| **tags** | many | selectable filters — "show me the industrial ones" | here |
| **featured** | boolean | the highlighted few that come top | here |

`group` cannot be derived from `tags` (an `<option>` lives in exactly
one `<optgroup>`, so it would need an arbitrary tiebreak), and
`featured` is not a group — approximating it by ordering one group
first would be a lie the moment a featured profile belongs elsewhere.
MENU-01 is instructed not to pre-build tags for exactly this reason.

## Open questions for whoever scopes this properly

- **Do user profiles get tags?** Built-in tags are free — built-ins are
  computed from code, so a tag on one is invisible to saved files.
  User-profile tags are **persisted**, so they cost a schema version
  and a migration. That is the single biggest scoping fork here, and
  it is the reason MENU-01 deliberately kept user profiles out of the
  category model.
- **Who assigns tags?** Agent-drafted and owner-signed per batch, like
  membership (D115)? Or user-editable on their own profiles? The first
  is consistent with how the gallery is governed; the second is what
  "tags selectable" might imply.
- **Does it replace the `<select>` or sit beside it?** A takeover
  picker behind a "Browse profiles…" button keeps the native select
  for the common case and is the smaller change; a combobox replaces
  it outright and is the better end state. **This is the question that
  decides how much of MENU-01 survives**, and it is worth answering
  before MENU-01 is built rather than after: if the picker replaces the
  select, MENU-01's optgroup rendering, its option-renderer extraction
  and its DOM tests are all thrown away, while its `group` field, its
  audit-table grouping and its UI-STANDARDS line are kept either way.
  If the picker sits beside the select, all of MENU-01 keeps its value.
  MENU-01 is one session, so the exposure is bounded — but it is a free
  decision to make early and an avoidable waste to make late.
- **Are groups collapsed by default, and does that state persist?**
  New with the owner's hunch. Opening fully collapsed shows a dozen
  headings, which may be the best answer to a 100-profile list; opening
  expanded is friendlier at 30. Persisting the state per user means
  storing it somewhere, which is a small but real decision.
- **What is "featured"?** Owner-chosen per release, usage-derived, or
  a fixed starter set? Usage-derived means telemetry the app does not
  have and should not grow for this.
- **Does it serve all four selects** (`#colour-profile`,
  `#dither-profile`, `#adjust-profile`, the editor switcher), or only
  colour? Dither has 7 built-ins and adjust 9 — neither will ever need
  it. See ICE-SELECTS-01.

## Done when

Not scoped. A scoping pass answers the open questions above and
produces a build slice; the trigger decides when that pass happens.

## Links

- MENU-01 — the native-`<select>` grouping this supersedes at scale;
  ships `group` and deliberately leaves `tags` and `featured` unbuilt.
- ICE-SELECTS-01 — the four hand-rolled option loops; a picker would
  want them converged first.
- ICE-PROFILES-02 — the candidate queue that would create the pressure
  (100 unsigned candidates; 125 built-ins if it were ever all built).
- `src/ui/browse-table.ts` — the search table to reuse.
- UI-STANDARDS lines 212 and 317 — the native-first rule this has to
  argue against.
