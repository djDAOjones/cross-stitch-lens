# BATCH-C0 — Sharpen the tools (the autojazz run sheet)

One ticket file for the whole batch rather than one per item, because
these items ship together in a single gateless run and their tickets
would be created and deleted in the same week. Delete this file when
the batch closes; anything that outlives it moves to its own ticket.

The traced mechanisms below were paid for at the 2026-08-09 combined
acceptance sitting (D148) and by the reorganisation review (D149).
They are the difference between a twenty-minute fix and a two-hour
rediscovery — which is why they are kept in full here while the
backlog lines stay at two lines each.

## Why this batch runs before Track A

Three of its items are preconditions for trusting any gateless run at
all, and they run first, in this order:

1. **RENAME-01** — a large run writes new prose, decision entries and
   identifiers. Every one written under the old name becomes rename
   surface. Cheapest now, annoying later.
2. **The doc-sync pass** (not a backlog item — sign-off debt, see
   `doc-deltas.md`) plus the hot-read drift already fixed in D149.
   Every subsequent task hot-reads `architecture.md`; it claimed
   IndexedDB autosave that does not exist and schema v4 when the code
   is v5.
3. **AUDIT-01 + ROUTE-01** — `npm run audit` is red. A red audit suite
   means the agent has no reliable signal from the audits for the rest
   of the run.

Everything after that is order-free.

---

## RENAME-01 — Rename the product to Pattern Mapper — SHIPPED (D150)

Owner confirmed real at the D149 review; promoted from the wish-list,
where it had been sitting since 2026-07-20. Owner picked **tier 3**
("everything you can") on 2026-08-11 and the agent half shipped the
same day.

**Two deliberate exceptions**, both recorded in code:

- **The IndexedDB database name stays `cross-stitch-lens`.** IndexedDB
  has no rename — changing the string points at a different, empty
  database. Migrating means copying four object stores including the
  owner's hand-curated thread inventory and saved profiles, and keeping
  that copy path forever, to change an identifier no user ever sees. A
  data-copy migration over hand-curated data is not justified by
  tidiness. See the comment on `DB_NAME` in `src/library/store.ts`.
- **The git remote and `package.json` `repository.url` still name the
  old repo**, because the repo has not been renamed yet. Tracked as
  RENAME-02 (owner steps).

The localStorage key *was* renamed, with a legacy fallback read and
five tests — that migration is three lines of pure function and cannot
lose anything, which is the distinction from the database.

Historical record of the tier options as presented:

- **Product name only** — user-facing strings, `<title>`, the app bar,
  export metadata, docs prose. Repo, package name and directory keep
  the old name. Reversible in an afternoon.
- **Product + code identity** — adds `package.json` name, the
  `cross-stitch-lens.shell` preferences key (**needs a migration** —
  an existing install must not lose its accordion state), the
  IndexedDB database name (**needs a migration or it orphans the
  user's inventory, palettes and profiles**), `cspell.json`, test
  fixtures.
- **Product + code + platform** — adds the GitHub repo rename, the
  git remote URL, and the OneDrive directory name. **The agent cannot
  do the last three**: renaming the GitHub repo and moving the synced
  directory are the owner's, and the directory move must happen with
  no session running against the path (hostile-filesystem guard).

Watch-outs regardless of tier:

- The IndexedDB and localStorage keys are the only places a rename can
  destroy user data. Migrate or leave them alone; never rename blind.
- `docs/requirements.md` is a reference doc cited by section number
  across the memory files — rename prose inside it, never renumber.
- `AGENTS.md` § Product identity, `README.md` and `brief.md` all open
  with the name. Those carry a doc-delta each.
- The eight-brand thread catalogue, golden fixtures and bench reports
  contain the name in provenance strings. Renaming a *recorded
  measurement* rewrites history — leave `bench-reports/` alone.

## DOCS-01 — Retire or automate the transcript-saving ritual

Absorbs the surviving half of ICE-TRANSCRIPT-01. **Its stated blocker
is already fixed** — `.gitignore:42` now carries `_transcripts/*.md`
with a `!README.md` exception, and the folder and README exist. The
backlog line claiming otherwise was stale.

What remains: `AGENTS.md` and `GUIDE.md` ask for sessions to be saved
to `_transcripts/` and the close ritual reminds you every time, but in
26 days not one transcript has been saved. Either one command saves a
chosen macOS Claude Desktop session as redacted markdown, or the
investigation records that the app's local storage is not a usable
source (location, format, stability across app versions) and the
reminder is retired rather than ignored. A reminder nobody obeys is
worse than no reminder — it trains the reader to skim the close.

## AUDIT-01 — `npm run audit` fails on a stale post-M8 assertion

Confirmed by running it 2026-08-09: **2 files / 2 tests failed, 48
passed** in 46 s. One failure is certain drift: `runtime.audit` → "the
draft governor never reaches exports" asserts
`expect(live.dither).toBe(false)` and gets
`{ algorithm: 'floyd-steinberg', … }`, because M8 turned `dither` from
a boolean into a config object (D61/D62). The assertion tests the
wrong shape; it is not catching a defect. The "533" palette labels for
what is now a 489-thread DMC set are the same class of drift.

Done when `npm run audit` runs clean end to end, every stale assertion
corrected or deleted with its reason. The other failure is ROUTE-01.

## ROUTE-01 — One routing disagreement in the M5-PERF-27 sweep

`routing.audit` sweeps grid × palette × metric on both dither backends
and asserts `routeDither` agrees with the measured winner on every
row; it now reports **1 disagreement**
(`expect(flips).toBe(0)`, `tests/audits/routing.audit.test.ts:125`).

**Do not lump this in with AUDIT-01's stale assertions.** The sweep
picks its winner by measured time, so a near-tie row where noise picks
the loser looks identical to a real routing regression. It matters
because M13-SYNTH-01 (D135) signed off "routing confirmed unchanged".

Done when the row is identified and its `margin` column read — a
near-1.0 margin settles it as noise (and the assertion should then
tolerate ties), a wide margin makes it a real routing defect with its
own fix. Does not block anything else: the app's router is unchanged,
this compares measured timings inside an audit.

## DIAG-01 — Benign browser noise is logged as an uncaught error

Seen at the combined sitting (leg 8): `[global] uncaught error` fired
mid-session with `message: "ResizeObserver loop completed with
undelivered notifications."` — a standard browser notification, not a
failure. `installGlobalCapture` (`src/diagnostics/log.ts:57`) logs
every `error` event at **error** level, so routine noise competes for
space in the bounded diagnostics buffer and can evict the real thing.
It also cost real time at the sitting to establish it was nothing.

Absorbs the wish-list line about uncaught errors being illegible: the
hook does already record `message` and `source` structurally — what it
lacks is a stack and a way to tell noise from a fault.

Done when known-benign notifications (the ResizeObserver loop message
at minimum) are downgraded below error or filtered with their reason
stated in code, a real uncaught error still lands at error level with
message, source and stack, and the buffer keeps faults over noise.

Note: worth checking whether the ResizeObserver loop is itself a
symptom — the preview's fit-to-manual host resize is the suspect in
ZOOM-01, and a layout loop would fit both. Investigate together,
decide separately.

## KEY-01 — The PDF thread key prints the hex twice

Found by inspecting an owner export at the combined sitting (leg 7):
key rows read `Web-safe #cccccc #cccccc`.

Mechanism, fully traced: the export passes `reference: ''` and a
synthetic brand for generated maps (`src/main.ts:1900`), and
`nonThreadLabel` builds that brand as `${mapName} ${entry.name}`
(`src/core/color-sources.ts:216`); where a generated colour has no CSS
name, `entry.name` **is** the hex, so the brand already ends in the
hex and `keyLabel` (`src/export/pdf.ts:56`) appends it again. Real
threads are unaffected — `DMC 310 #000000` reads correctly.

`keyLabel` is unit-tested (`tests/export-pdf.test.ts:134`) and
**passes**, because the fixture uses `Web-safe Lime` — a named colour,
the flattering case. The unnamed majority is the broken one. That is
the whole argument for EXPORT-01.

Done when a key row never prints the same token twice, brand and
reference still show for real threads, and the regression fixture is
an *unnamed* generated colour.

## EXPORT-01 — Assert the exported artefacts, not just the helpers

Owner ask at the combined sitting: checking exports by opening them
and looking is slow and it misses things.

The unit layer already exists and is **not** the gap: 27 tests across
`export-png`, `export-chart` and `export-pdf` all pass, and one of
them covers the exact function that produced KEY-01's wrong output.
What is missing is an **artefact-level** check — run a real pipeline
output through the real export assembly and assert properties of the
bytes produced:

- clean PNG dimensions equal the grid exactly;
- the enlarged PNG is an exact integer multiple with no resampling;
- the chart raster carries grid and numbering;
- the PDF has one page, the expected box, an aspect-preserved image,
  and **every key row well-formed with no repeated token**.

`tests/acceptance-matrix.test.ts` already runs pipeline rows through
the real worker entry — this is that pattern extended to exports, not
a second mechanism.

Done when an export artefact suite runs inside `check` and fails on a
malformed key row, a wrong clean-PNG dimension, or a non-integer
enlargement.

Note: this replaces the *structural* half of an acceptance sitting's
export leg, never the appearance half — whether a dither looks right
or a profile's name predicts its look stays human. The win is a
shorter sitting next time, not no sitting.

## M8-GOLD-02 — Golden fixtures for the four M8 methods

The approved follow-up to M8-GOLD-01: the owner judged all five
methods at the combined sitting and approved pinning the four that
lack fixtures (Atkinson, Jarvis, ordered/Bayer 8×8, blue noise);
Floyd–Steinberg already has its pre-M8 golden. Fixtures pin today's
signed-off output so a future WASM or WebGPU backend cannot drift
silently.

Done when each of the four has an `.input.json`/`.expected.json` pair
under `tests/golden/`, generated by the TS reference, asserted
bit-exactly alongside the existing Floyd–Steinberg case.

**Source decision** (the owner asked for `landscape-1`, then agreed
the reasoning): use a **small crop derived from**
`public/profile-demo/landscape-1.jpg`, committed as a JSON pixel
buffer in the existing 8×8 house style — **not** the JPEG itself. Two
reasons: a golden fixture must be diffable when it fails (a 2048²
expected buffer is four million pixels of unreadable diff), and JPEG
decoding varies across platforms and library versions, which would
break bit-exactness for reasons that have nothing to do with the
dither maths. Real photographic colour, tiny committed artefact.

Note: `tests/golden/**` is protected — this creation is owner-approved
(2026-08-09); any later regeneration needs its own approval with a
stated algorithm reason.

## DATA-01 — Sweep the thread catalogue's colour listings

Detection half only. See `tickets/M15-DATA-01.md`, which survives this
batch: the sweep is re-runnable after each round of owner corrections,
so it outlives the run.

`src/core/palettes/thread-list.csv` is **protected owner data** — the
agent never edits it. Corrections are the owner's, with
`catalogue.json` regenerated by `scripts/build-palette.mjs`.

The batch ships **the two certain classes** and parks the third:

| Class | Count | This batch |
| --- | --- | --- |
| Row has no name at all | 21 (all Finca) | report |
| Same brand, identical hex | 11 pairs | report with evidence |
| Name disagrees with the colour | unknown | **parked — see DATA-02** |
| Duplicate brand + reference | 0 | clean |
| Malformed or missing hex | 0 | clean |

D149's reasoning for the split: a thread's *name* is decoration —
identity is `brandId:reference` and RGB is display-only (D55/D56), so
a wrong name is ugly in the key. A wrong **hex** misrenders the
design, and that class needs published brand values the repo does not
have. The item as originally written chased the cosmetic class and
excluded the consequential one.

Done when the sweep is committed and re-runnable, reports both certain
classes with their rows, and the owner has them as a list to act on.
No test gates on the findings — a failing gate over owner data the
agent may not edit would block every unrelated task.

## UI-06 — Move "Colours used" under the Colour section

Owner ask at the combined sitting: "Colours used" is its own
top-level section sitting between Preview and Stats, but it is a
readout *of* the colour choices made in the Colour section.
Separating them makes the shell longer than it needs to be and splits
one subject across two places, which matters directly to the
narrow-width work (ICE-WIDTH-01).

Done when the colour key reads as part of the Colour section, the
accordion still opens and closes independently of the controls above
it, and nothing about what it lists changes.

## DITH-06 — Name the built-in dither profiles after their method

**Drafted 2026-08-11 (D158), awaiting the owner's signature.** The
method leads; the qualifier is the setting, never a mood word; and per
D149's broader-audience note the qualifier stays in plain words. The
basis lines in `dither-presets.ts` are unchanged and remain the
evidence.

| id | today | drafted name | the fact it states |
| --- | --- | --- | --- |
| `none` | None | **None** | unchanged — not a method |
| `subtle` | Subtle | **Atkinson (half strength)** | `atkinson`, strength 0.5 |
| `balanced` | Balanced | **Floyd–Steinberg** | the plain method at full strength |
| `strong` | Strong | **Blue noise (boosted)** | `blue-noise` at 1.75× base amplitude |
| `photograph` | Photograph | **Jarvis** | the plain method at full strength |
| `graphic` | Graphic | **Ordered (Bayer 8×8)** | `ordered`, the 8×8 Bayer tile |
| `limited-palette` | Very limited palette | **Floyd–Steinberg (damped)** | strength 0.6 — "damped" is the basis line's own word |

Confirmed before drafting: `sameDither`/`matchBuiltInDither`
(`dither-presets.ts:67/:80`) match on config alone — algorithm,
strength, serpentine — never on label or preset id, so a signed rename
is a label-only edit and every existing project or profile reference
still resolves. At apply time, re-check the Processing select's width
at the narrow floor: two drafted names are longer than the mood words
they replace.

Owner ask at the combined sitting: "Subtle", "Balanced", "Strong",
"Photograph", "Graphic", "Very limited palette" hide which algorithm
is running, and the gallery's own naming discipline
(style-descriptive, honest) argues the other way here — the method
*is* the fact.

Lead with the technical name (`atkinson`, `floyd-steinberg`, `jarvis`,
`ordered`/Bayer 8×8, `blue-noise`), and where a preset is not the
plain method — Subtle is Atkinson at strength 0.5, Very limited
palette is Floyd–Steinberg damped to 0.6 — combine the method name
with a qualifier rather than a mood word. Names live in
`src/core/pipeline/dither-presets.ts`; the `basis` lines already carry
the evidence and stay.

**The run drafts, the owner signs.** D149's note: the app now goes to
a broader audience, so a bare `floyd-steinberg` in a select is jargon
to most of them. Draft names that carry both the method and a plain
qualifier and let the owner cut what reads badly.

Done when the owner signs the seven names, the select reads them, and
any project or profile that referenced a built-in by label still
resolves (`matchBuiltInDither`/`sameDither` match on config, not
label — confirm).

## FLICKER-01 — Changing the colour count flickers through the source

Dragging or stepping `Number of colours` shows the original
high-colour picture between values rather than transitioning from one
reduced result to the next. Owner reports it as a smoothness defect,
not a correctness one — output at rest is right.

Suspected but **unconfirmed**: the intermediate frame is the
draft/full-RGB path being shown while the palette re-resolves.
**Confirm the mechanism before proposing a fix**, because holding the
previous reduced frame and swapping on completion is a different
change from suppressing a draft. Conservative default if the
gateless run must choose: hold the previous reduced frame.

Done when stepping through colour counts never shows the un-reduced
source, with no regression to the draft governor's honesty (a draft
must still be labelled as one).

## ZOOM-01 — The canvas jumps on the first wheel zoom

Raised at the combined sitting (leg 6): zooming with the mouse wheel
produces a "glitch" where the canvas moves, as if snapping to a
quantised value. Zoom maths itself is continuous (`zoomAt`,
`src/ui/viewport.ts:115`), so the jump is unlikely to be the scale.

Suspected but **unconfirmed**: a deliberate zoom leaves fit mode
(`src/ui/preview.ts:210`) and manual mode then freezes the host height
at a rounded value (`src/ui/preview.ts:155`, `:165`), so the container
resizes once on the transition and the image appears to leap. Confirm
before fixing — if it is the fit-to-manual handover, the fix is
continuity across that transition, not touching the zoom curve.

Done when a wheel zoom moves the image smoothly about the pointer with
no one-off jump, at any starting fit state, and the existing
engaged-only wheel contract (M14-EXT-27) is unchanged.

## A11Y-01 — The automatable half of the screen-reader pass

Splits A11Y-VO-01, which stays open as the human remainder.

The combined sitting completed leg 9's keyboard half — full
Tab/Shift+Tab traversal, visible focus, 200 % browser zoom and the
~320 px narrow width all passed — and the owner deferred the rest.
This item takes the machine-checkable part: assert that **every
control has an accessible name**, which leaves the human judging only
whether the name is any good. That is the difference between a long
VoiceOver crawl and a short one.

**Hand-rolled, no new dependency.** An axe-core-class library would
do it, but the project builds its own Carbon rather than installing
it, and `tests/ui-styles.test.ts` already walks the control inventory
— extend that pattern.

Done when every focusable control is asserted to carry an accessible
name inside `check`, and the remaining VoiceOver work in A11Y-VO-01 is
narrowed to announcement quality and the colour-only check.

Note: contrast is already machine-checked
(`npm run check:contrast`, inside the gate).

## STALE-01 — Close the small-edit staleness reservation

The owner's recorded reservation when accepting D135's small-stroke
line: a 1 px pencil dot appeared after the full ~2 s, described as "a
bit sluggish but can live with". **Accepted, not a gap** — sub-2 px
edits are invisible to dirty detection by design and surface only via
the staleness bound.

D135 already named the remedy if it is ever wanted — lower
`DIRTY_MAX_STALE_MS` (`src/capture/dirty.ts:54`, currently 2000) — and
explicitly **not** a hash redesign.

**Conservative default for a gateless run: close it as accepted**, on
the owner's own "can live with", and record that lowering the bound
remains available with bench evidence. Do not lower the bound
gatelessly — it trades a measured promise (≥ 4 updates/sec at ≤ 300²,
now asserted in `bench:auto`) for a comfort the owner already
accepted.

---

## Closing the batch

`npm run check` green **and** `npm run audit` green — the second is
new as a batch condition, and is the point of AUDIT-01/ROUTE-01
running first. Then one decision-log entry for the batch, the
trajectory lines, and this file deleted.
