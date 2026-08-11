# Decision log — Cross Stitch Lens

<!-- Append-only. Newest at the bottom. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents scan the latest 10 HEADINGS by default and
     open only the bodies relevant to the task. -->
<!-- Keep each entry tight: Decision / Rationale / Alternatives, not an essay.
     The live log is budgeted by WORDS as well as entry count (see
     pm_skills/memory-policy.md), so verbose entries trip a prune sooner. -->
<!-- This is the home of the WHY. The backlog/trajectory only point here;
     never paste an entry's prose into those files. -->

## Archived: D1–D10 — see archive/decision-log-2026-07-16.md

## Archived: D11–D45 (2026-07-17 → 2026-07-19) — see archive/decision-log-2026-07-17-to-2026-07-19.md

## Archived: D46–D90 (2026-07-20 → 2026-07-23) — see archive/decision-log-2026-07-20-to-2026-07-23.md

## Archived: D91–D105 (2026-08-04 → 2026-08-05) — see archive/decision-log-2026-08-04-to-2026-08-05.md

## D106 — M14 fourth look: dictated feedback triaged — twelve tasks, one new milestone (2026-08-06)

**Decision:** the owner's fourth look (dictated feedback, transcript
repaired against the live UI labels, 2026-08-06) triages into twelve
extension tasks that gate ACCEPT-01 again, ids in run order —
EXT-19 the capture picker prefers the entire screen
(`displaySurface: 'monitor'`, a hint beside D105's exclusions);
EXT-20 the region↔design coupling recut ("Lock aspect", default off,
drags rederiving **both** dimensions through a visible
source-px-per-stitch scale slider, compact Size fields); EXT-21 a
Stats section pinned above the capture settings (design size, stitch
total, colours in use — the owner excludes coordinates and aspect
state) with the capture-region readout retired; EXT-22 collapsed
folds showing bare headings; EXT-23 a collapsible preview (default
expanded, re-opened by capture); EXT-24 Preview focus retired whole
with its button; EXT-25 [sign-off] the session controls rationalised
with Stop capture moving to the app bar (plausibly a Source-button
state — options-first, the owner picks); EXT-26 a Debug menu over
the diagnostics affordance (copy JSON / download JSON / email-dev
via mailto); EXT-27 engaged-only trackpad pinch-zoom and two-finger
pan; EXT-28 Colour as its own section out of Design; EXT-29 the
colour anatomy recut ("Threadify colours" leading, count
slider+input+steppers, `Use exactly this many` retired, a separate
constrain switch); EXT-30 Appearance renamed "Processing" with the
grid geometry relocated (recommendation: the view strip's grid
reveal, where D92 already homed the toggles).

**Routed out of the milestone:** memo items 14–16 — "Colour profile"
replacing `Colour mode` + `Threads to choose from`, the profile
editor (colour libraries incl. tech colour maps, user collections
with code/hex search and custom RGB, five-image test preview,
advanced min-distance and H/S/B-range constraints), and "Dithering
profiles" with their editor — become **M15**, scoping-first as two
[maintainer] [sign-off] joint sessions (M15-SCOPE-01/02) at the
owner's explicit ask ("needs more scoping work that would benefit
from us both"). Out of M14 by constraint, not preference: profiles
change which colours are available (outputs not byte-identical) and
user libraries add persistence — M14 forbids both. The scope tickets
carry the repaired memo text, the M7 machinery it maps onto (named
palettes, inventory, policy layer), the D55 identity question
non-thread colours raise, and the D53 evidence against a real second
browser window.

**Supersessions on the owner's own authority:** D101's
aspect-follows-by-default and height-only derive → free by default,
both dimensions through one scale (EXT-20; the D52 conduct survives
whole behind "Lock aspect" on). The informative fold lines — the
section summaries and D98's never-silent limit line, D99's
Colours-by-usage lead → bare headings (EXT-22), with the
never-silent duty moving to Stats first (EXT-21 precedes EXT-22 for
exactly this). UI-STANDARDS' "the canvas never does [collapse]" and
the Capture-UX dimensions readout → EXT-23/EXT-21, protected-doc
deltas to ledger at ship. M6-FOCUS-01's Preview focus mode → retired
with its only entry (EXT-24). M14-EXT-10's "no wheel handler — do
not reintroduce it" → reopened for the engaged state only, the
unfocused surface keeping the promise verbatim (EXT-27). D92's
colour-limit anatomy → EXT-29's two-switch recut.

**Assumptions flagged for the pick gates:** "Threadify colours" is
read as the full-RGB↔threads boolean (today's `Colour mode`) with
"Constrain number of colours" as the count switch — the literal
rename-Limit-colours reading is inconsistent but recorded in the
EXT-29 ticket for the owner to rule on; Stats' "resolution" = design
size in stitches; "Colours in use" vs the shipped `Colours by usage`
fold, and the "five test images" against four named presets, resolve
at M15-SCOPE-01; exact-count's fate is named at EXT-29's gate.

**Link:** backlog → M14 "Extension — fourth look (D106)" + "Next —
M15"; tickets M14-EXT-20/21/25/26/27/29/30, M15-SCOPE-01/02;
ACCEPT-01 re-blocked on EXT-19..30.

## D107 — M14-EXT-19..24, 26..30: the fourth-look extension lands in one auto-jazz run (2026-08-06)

**Decision:** eleven of the twelve fourth-look tasks shipped as one
gateless run (auto-jazz, per the owner's "autojazz the backlog"
instruction — conservative picks at every skipped gate, each named
here). EXT-19: `displaySurface: 'monitor'` rides inside the `video`
constraints beside D105's exclusions; D105's choose-a-window
expectation copy deliberately stays (still the honest warning — the
tension is ACCEPT-01's to judge). EXT-20: "Lock aspect" defaults
off; `deriveGridSize` replaces `deriveGridHeight` (both dimensions
through one held source-px-per-stitch scale, fixed-point-proven);
the slider ships as **"Stitch size"** + "Source pixels per stitch"
helper (the unit-in-helper idiom — a bare "scale" label is D52-banned
and "Detail" inverts); both Size fields disable-with-reason while
unlocked (the ticket's pick for the open field-edit question — the
user's handles are region and slider); a mid-session project load
re-seeds the scale from the loaded width, keeping D101's
width-honoured semantics. EXT-21: Stats leads the panel (not the
page — the ticket's recommendation); the info panel's summary line
retired with the region readout (Stats owns every headline figure —
the "no third copy" duty), and gesture-end status announcements keep
A8's keyboard feedback without a standing readout; coordinates die
unmourned. EXT-22: the accordion summary machinery deleted whole,
not emptied — `usageSummaryLabel`, `captureSummary` and the Design/
capture fold lines went with it. EXT-23/24: preview collapse is a
third shell-model field, **session-only** (a working gesture, not a
preference — reopening into a hidden canvas is a bad first second);
preview focus retired whole — `status-line.ts`, the compact status,
the CSS flex chain, and the Escape-exit listener all deleted, none
idled. EXT-26: the Debug menu is a `details` disclosure (the house
pattern); Email the dev downloads the redacted log then opens an
identity-only mailto (redaction boundary unit-tested); the address
ships as an empty placeholder constant — the owner names what a
public bundle exposes. EXT-27: the engaged/unengaged split lives in
a pure `wheelIntent` (the unfocused-inert promise is a regression
test); pinch is exponential (`e^(−Δy/100)`, in/out cancels exactly);
Safari's gesture events covered. EXT-28: Colour defaults closed
(every non-Design section does; Stats carries the count). EXT-29:
reading A shipped — Threadify colours = the mode boolean, Constrain
number of colours = the count switch; exact mode cut from the
surface, kept in core for loaded files (edits write 'max'); steppers
announce via a dedicated polite region because a button press is
natively silent where slider and input are not. EXT-30: destination
A — the grid reveal mounts between strip and canvas; the
`section-appearance` disclosure preference seeds `section-processing`
by fallback, nothing stranded.

**Verified:** typecheck/lint 0, 964 tests (54 crop, 28 viewport, 7
debug-menu; shell/info-panel/scales suites rewritten to the new
contracts — approved behaviour changes, not weakening); live sweep at
1280×720 and 380×700 (evidence table in `docs/ui-evidence.md`):
Stats honest pre- and post-frame, wheel contract exact (192%→522% =
e¹), lockstep count controls, zero horizontal overflow, zero app
console errors. Live capture legs are unit-tested geometry plus
ACCEPT-01's checklist — same rig limitation as D101.

**Supersessions land as triaged (D106):** D101's default-on and
height-only derive; D93/D98/D99's informative fold lines; M6-FOCUS-01
whole; M14-EXT-10's no-wheel rule for the engaged state only;
UI-STANDARDS' capture readout and never-collapsing canvas plus
AGENTS' four-resolutions split text → ledgered in `doc-deltas.md`,
never auto-edited.

**Link:** backlog → EXT-25 is the set's one survivor ([sign-off] —
options prepared in its ticket, the pick is the owner's); ACCEPT-01
re-blocks on it alone; tickets M14-EXT-20/21/26/27/29/30 deleted on
ship; ui-spec §2/§3/§5/§6/§7 amended; evidence in
`docs/ui-evidence.md`.

## D108 — M14-EXT-25: the Source button carries the session (2026-08-06)

**Decision:** the owner picked **option A** at the sign-off gate
(structured in-session answer, 2026-08-06; the pack is preserved in
this entry's losers). During a capture session the bar's Source
button reads **"Capturing — Source"** (label = accessible name, so
the state is announced to whoever reads the control) and its modal
leads with a session block — **Stop capture** (primary while
capturing) · **Pause/Resume capture** (label derived from the pump
state) · **Capture frame** — above the unchanged source choices, so
switching source never hides behind the same click that stops.
Inline, the session row reduces to the two region toggles that pair
naturally: **Lock region** beside **Lock aspect**. Nothing is cut:
pause and frame-grab demoted to the modal, and the pump-death
recovery copy now points there ("use Capture frame in the Source
menu"). Stop is reach 2 (bar → modal) but reachable from the bar at
all times — the fixed point the backlog demanded. The vestigial
"Start screen capture" button (hidden since the EXT-02 modal took
over) went with the row.

**Losers recorded:** B (a dedicated bar Stop during sessions) kept
the unjustified inline row and paid a fourth bar control at
companion width; C (bar Stop + Capture frame cut) removed a shipped
recovery route — the owner did not name the cut.

**Verified:** typecheck/lint 0, 957 tests; live: the no-session
modal unchanged (three choices, current-source note), the inline row
reduced to the two locks by construction. The in-session modal block
and the label swap ride code paths a headless pane cannot drive
(getDisplayMedia) — named for ACCEPT-01's live session with the
region-drag legs.

**Link:** ticket M14-EXT-25 (deleted on ship — the option pack lives
in its D107/D108 trail); ui-spec §5 amended; ACCEPT-01 is now
unblocked — the milestone's one remaining item, and it is the
owner's.

## D109 — M14 fifth look: refinements on the fourth-look surface triaged — seven tasks (2026-08-06)

**Decision:** the owner's fifth look (ten typed refinements on the
just-shipped fourth-look surface, 2026-08-06) triages into seven
extension tasks that gate ACCEPT-01 again, ids in run order —
EXT-31 the preview gains a real accordion-style header and collapses
from it, the bar toggle retiring with the move (memos 6+2, one task
because the header is the replacement route); EXT-32 the settings
toggle retires and the whole-panel collapse mode with it (memo 3 —
the M6-PANEL-01 sunset, EXT-24's pattern; after 31+32 the shell
model tends to `cold` alone); EXT-33 the capture section recut
(memos 1+4+5: rename to "Capture", every session starts expanded,
and the session controls return from the Source modal to the
section — the Source button reads "Source" always); EXT-34 the
empty-Design fix (memo 8 — diagnosed as EXT-28 plus D101's S1
reparent composing into an open heading over nothing during
sessions; recommendation: retire S1, options in the ticket); EXT-35
grid details as a live-apply form modal from the strip, Numbers
folding into it (memo 7 — bounded to existing GridStyle capability,
tick font size finally surfaced; new rendering capability stays
M11's); EXT-36 the look/feel/ergonomics/intuitiveness polish pass
(memo 9, the EXT-05 method scaled up); EXT-37 the full Carbon
conformance review (memo 10, VERIFY-01's table discipline over
every component class, after EXT-36 so the audit sees the final
surface).

**Supersessions on the owner's own authority, same day, having seen
them live:** D107's bar Hide/Show preview → the section header
(EXT-31); D108's option A — the Source button carrying the session
and its bar-reachability fixed point → session controls inline in
the Capture section (EXT-33); D107's under-strip grid-reveal
placement and D95's strip Numbers toggle → the modal (EXT-35);
D97's persisted-collapse-at-mount → always-open session start
(EXT-33). EXT-34's recommendation would touch D101's S1 half only —
the lock conduct and derive halves stand.

**Memo repair note:** "capturing source" (memo 4) is matched to the
shipped **"Capturing — Source"** bar-button state — the only surface
by that name — and "move" read as relocating the session affordance
whole; the narrower label-only reading is recorded in the EXT-33
ticket for the gate.

**Link:** backlog → M14 "Extension — fifth look (D109)"; tickets
M14-EXT-31/33/34/35/36/37 (EXT-32 is line-only); ACCEPT-01
re-blocked on EXT-31..37. Nothing implemented in this triage.

## D110 — M14-EXT-31..37: the fifth look lands in one auto-jazz run (2026-08-07)

**Decision:** all seven fifth-look tasks shipped as one gateless run
(auto-jazz, the owner's "autojazz the backlog until the colour/dither
profile editors" instruction — the run stops exactly at M15-SCOPE-01/
02, which are owner-collaboration by design). Conservative picks at
every skipped gate: EXT-31 — the preview accordion reuses
`createSection` with the settings-section anatomy exactly (outer
section unnamed, the panel is the named region, so "Preview" is said
once); the disclosure joins the persisted store (`preview-section`),
capture-start re-expand persists too; a collapsed heading is not
sticky (class flips on toggle, never scroll — D103 re-proven live).
EXT-32 — `ShellState` reduces to `cold`; the `panelCollapsed`
preference is dropped without a version bump (a bump would discard
disclosure records over a dead field; old records parse, the field
drops on next write — unit-pinned); the recorded consequence: the
16 rem column always stands at wide. EXT-33 — ticket order Stop ·
Pause · Frame · Lock aspect · Lock region; Pause keeps the shipped
label-flip + aria-pressed pair; no primary among source choices
during a session (emphasis would nudge replacing the live source);
the session verbs skip the per-session hidden dance (the section
mount is the visibility gate). EXT-34 — option A as recommended: S1
retired (D101's lock/derive halves stand), only the Stitch size
slider travels with the session. EXT-35 — trigger label "Grid
options" (the Export "… options" idiom; "details" was the retired
`<details>` species); modal field order = old reveal order with the
numbering block appended; Number size bounds 6–32 px; `formModal`
resolves void — Close/Escape/backdrop are one path because live-apply
leaves nothing to cancel. EXT-36 — two fixes (scroll-padding reserve
408→`40dvh + 12rem` against the measured 427 px unit — a real
focus-obscuration risk; the stale two-row strip comment corrected to
measured reality), five checked-no-change, three parks (floor-width
readout line — pre-existing and contract-shaped; logger console
stringification — dev chrome; one unreproducible uncaught-error pair
— ACCEPT-01 watch). EXT-37 — ten-row conformance table, zero
unexplained deviations: D50 text-buttons and AAA-over-AA re-affirmed;
one new waiver (accordion chevron ▸/▾ over Carbon's ▾/▴ — one
disclosure language with native details, D83).

**Supersessions land as triaged (D109):** D107's bar preview toggle →
the header; D108's option A whole (the bar-reachability fixed point
consciously given up — named for ACCEPT-01); D97's persisted capture
collapse → always-open, unpersisted; D101's S1 → retired; D107's
under-strip reveal + D95's strip Numbers → the modal.

**Verified:** typecheck/lint/contrast/build/docs/secrets green; 953
tests serialised (parallel runs tripped 5 s timeouts on heavy engine
suites — rig contention (another session's dev server + synced I/O),
every file green in isolation, no engine code in the diff); live
sweep on this session's own server at 1280 and 380/320 × 700, both
schemes, error-catcher armed: evidence tables in `docs/ui-evidence.md`.
The in-session capture legs ride getDisplayMedia (not driveable in this
rig, D101's limitation) — named for ACCEPT-01's live checklist.

**Link:** backlog → fifth-look section removed, ACCEPT-01 unblocked
(the milestone's one remaining item, the owner's); tickets
M14-EXT-31/33/34/35/36/37 deleted on ship; ui-spec §2/§5/§7/§9
amended; UI-STANDARDS deltas ledgered in `doc-deltas.md`, never
auto-edited.

## D111 — M14 sixth look: five memos on the fifth-look surface triaged — four tasks (2026-08-07)

**Decision:** the owner's sixth look (five typed memos on the
just-shipped fifth-look surface, 2026-08-07) triages into four
extension tasks that gate ACCEPT-01 again, ids in run order —
EXT-38 the capture-row trims (memos 1+2: Capture frame retires —
the cut D108 declined precisely because the owner had not named it
is now named; "Pause capture" renames to Freeze; the pump-death
recovery copy re-points at the freeze toggle, whose resume leg
restarts the pump); EXT-39 the status line relocates under the
header's build id with an economy pass (memo 4 — the off-viewport
announcement trade at narrow recorded, not hidden); EXT-40 Design
dissolves into Capture, Stitch size becomes **Zoom**, Stats gains
the readout row (memo 5 [detail] — the ticket carries the
no-session-home question with the permanent-Capture-section
recommendation, the factor definition with the same-number "3×"
recommendation, and the named collision with the preview's zoom
vocabulary that D52 exists to police); EXT-41 "Colours by usage" →
**"Colours used"** as a real accordion section plus the
one-hierarchy pass (memo 3 [detail] — anatomy promotion as the
floor, aside-box flattening as the recommendation, the two-column
companion layout explicitly not in question; runs last so the
equalisation lands on the final census).

**Supersessions on the owner's own authority, having seen them
live:** D110's EXT-33-restored Capture frame button → cut (EXT-38);
D110's EXT-34/A — Size's permanent Design home, held one day → the
fields' only home is the Capture section (EXT-40); D99's fold-line
placement of the colours table → section anatomy, its
collapsed-by-default choice surviving (EXT-41); the M2-era content
placement of the status region → header (EXT-39).

**Memo repair notes:** "moe" read as "move" (memo 5); "resolution
integer controls" matched to the Design width/height number fields —
the only integer size controls in the live UI; "the 'source
unchanged' dialogue" matched to the one status live region (that
string is its most persistent occupant during capture), so EXT-39
moves the region, not one message.

**Link:** backlog → M14 "Extension — sixth look (D111)"; tickets
M14-EXT-40/41 (38/39 are line-only); ACCEPT-01 re-blocked on
EXT-38..41 and its live-session list extended with the sixth look's
trades. Nothing implemented in this triage.

## D112 — M14 sixth look, second batch: memos 6–8 triaged — three tasks (2026-08-07)

**Decision:** the sixth look's second batch (three typed memos, same
day) triages into EXT-42..44, extending the D111 set; the whole
sixth-look run order is restated in the backlog (38 → 39 → 43 → 40 →
42 → 44 → 41: the dropdown defect runs before the Colour compression
that would churn the same panel; the hierarchy pass stays last).
EXT-42 [detail] — the Colour section's redundancy census (seven
elements for one integer, eight near-identical brand helper lines, a
summary overlapping Stats, six standing library buttons) compresses
with a gate; the steppers cut would reverse the owner's own EXT-29
ask and is flagged as such, and the compression must not foreclose
M15's Colour-profile slot. EXT-43 [detail] — a defect, bug mode:
the "Threads to choose from" popup collapses because
`palettePanel.update()` fires on every processed frame and rebuilds
controls under it (hypothesis; the dither panel — rebuilt only on
algorithm change — surviving is the confirming contrast); fix shape
is diff-update on an option fingerprint, never rebuilding a focused
or open control. EXT-44 [detail] — Processing order retires and the
Advanced section sunsets with it (the EXT-32 pattern).

**The memo-8 question, answered on record:** reduce-first is not
literally redundant (its output differs) but no longer earns UI:
slower by construction (per-pixel work before the resize lever,
D3), stats degrade while active (the sidecar dies under
resize-after-reduce, so no thread references), and its one virtue —
a softer look — is served deliberately by the M8 dither surface.
Loaded-file conduct recommended: honour + say so (core keeps the
preset, the UI states it while active) — the only shape satisfying
both reopen-identical and visible-state; coerce-on-load and
honour-silently each break one hard rule and are rejected in the
ticket.

**Link:** backlog → sixth-look section extended to EXT-38..44,
ACCEPT-01 re-blocked on the full range; tickets M14-EXT-42/43/44.
Nothing implemented in this triage.

## D113 — Pruned project memory (2026-08-07)

Decision-log D46–D90 (45 entries, 2026-07-20 → 2026-07-23, 14,341
words, incl. both per-entry-guard offenders D49/D50) moved verbatim to
archive/decision-log-2026-07-20-to-2026-07-23.md. Trajectory phases
M6–M8 moved verbatim to
archive/trajectory/trajectory-0002-2026-07-21-to-2026-07-22.md; live
trajectory keeps M13 + M14 at 1,900 words. Live log is D91–D112 plus
this entry (23 entries) — over the 20-entry budget by agreed exception:
August is the live month, next natural cut at month end. Lossless
splits proven by diff against the intact originals before each swap;
environment preflight clean, OneDrive sync paused for the surgery.
file-map.md untouched on record: its generator maps the source tree
only, so archive/INDEX.md remains the archive's map.

## D114 — M15-SCOPE-01: colour-profile scope signed — recipe model, takeover editor, rules split by meaning (2026-08-07)

**Decision:** the joint scoping session the fourth look asked for
(D106) ran 2026-08-07 and signs the colour-profile scope. A
**profile is a composition recipe, never a flat list**: which colour
libraries are enabled (thread brands; generated colour maps; "My
threads" — the inventory), an "only colours I own" modifier,
per-colour in/out pins, and hue/saturation/brightness **range
rules** — resolved on demand to the effective ordered colour table
with every narrowing explained (the M7 conflicts machinery
extends). Profiles absorb the brand toggles, `ownedOnly` and the
source select whole. The editor is an **in-app takeover view** (a
shell view swap, not a dialog — D53's evidence against real windows
stands), editing a **draft committed by explicit Save** — a
deliberate, recorded exception to §5.4 live-apply, because a saved
profile edit ripples into every design that uses it; the editor's
own test preview does apply live, and frame results never rebuild
editor controls (the EXT-43 contract, pinned by test).

**Owner picks at the gate (all three on the recommendation):**

- **Rules split by meaning.** Exclude dissolves into profile
  membership (a colour is in the recipe or it is not — no second
  exclusion mechanism); lock survives per-design as **Must use**
  chips beside the count; **Prefer retires** (its taste half is
  membership, its steering half a weak lock). Supersedes the
  three-disjoint-rules anatomy (M7's surface, recut in D92/D107)
  at build time; the disjointness invariant survives trivially
  with one rule remaining.
- **Ranges live in the profile; minimum distance lives with the
  design.** A style profile wants to be rule-based ("Rave" over
  whatever libraries are on, recomposing when brands change), so
  H/S/B two-pole ranges are recipe content. Minimum perceptual
  distance is a rule about the *chosen few*, not membership — it
  sits beside count in the Colour section and extends
  palette-selection as a pure rule.
- **The (edited)-copy pattern** reconciles profile-side membership
  with per-design reachability: the project file's policy half
  becomes the design's own recipe copy plus an `{id, revision}`
  link to a named profile; edits from design context land on the
  copy — the select shows "(edited)", actions Update profile /
  Save as new / Revert — so a one-off "kill that green" never
  mutates the shared library and never forces fork clutter. This
  extends D55's policy+snapshot pair, not forks it.

**Identity and data:** synthetic namespaces `map:<mapId>:<code>`
and `user:<id>` for non-thread colours — Thread-shaped records,
never merged with real threads (D55/D56 upheld), provenance-honest
labels everywhere including export keys (a chart row with nothing
to buy says so). Maps v1, all generated in code, no data files:
black & white (2), greys (4), 1-bit RGB (8), retro 16,
2-bit/channel (64), web-safe (216); 4-bit/channel (4,096)
deliberately skipped. A ~150-entry CSS/X11 colour-name table
embeds as a code constant (public-standard data, no dependency,
not an owner-protected file): exact matches display names,
otherwise hex stands.

**Presets end as a concept.** The four algorithmic LCh presets
retire; shipped taste returns as **read-only built-in profiles**
(duplicate-to-edit): DMC (default), All threads, My threads, Black
& white, Retro 16, Web-safe, and three buildable styles — Sepia,
Pastels, Classic cross stitch. ICE-PRESET-01 is re-scoped to
style-profile curation and carries the placeholder list (Memphis,
Rave, Mondrian, Bauhaus, Art nouveau, Warhol, Monet, cosy pixel
farm — shipped names style-descriptive, never trademarks). Nothing
placeholder ships in the UI: a "coming soon" select entry is a
dead control.

**Test preview:** five slots — four owner-supplied photos under
`public/profile-demo/` (folder created with the feature; per-slot
"image offline" states name the missing file; the owner adds the
files later) plus the generated test card, with the **live design
(last still) as the default view**; the three-row grid renders
every populated slot at equal display size with the stitch grid
divided (÷1/÷4/÷16 — divisor settled at build). Renders go through
the real pipeline, draft-labelled, debounced, and must not starve
a live session.

**The owner's compatibility waiver, scoped:** "backwards
compatibility is irrelevant" (owner, at the constraints gate) is
recorded as: loaders still never crash and the D55 snapshot keeps
any old design rendering byte-identical, but old policy semantics
— preset strict/prefer modes, exact count, the prefer rule —
migrate best-effort or reset **with a visible note**, and no
effort is spent preserving them. Round-trip integrity of the new
schema stays a hard rule.

**Cut line:** v1 intent is the full model + persistence + section
recut + editor (libraries, pins, ranges, readout, custom RGB) +
preview slots/grid; nearest-thread hints and custom-colour naming
wait. Recorded as intent with adaptive licence (owner grant), not
a fence. The dithering-profile editor (M15-SCOPE-02, still
scoping-first) inherits the takeover shell — UI-02 builds it
kind-agnostic.

**Link:** backlog → M15 build tasks M15-CORE-01..03,
M15-PERSIST-01, M15-UI-01..04, M15-ACCEPT-01/02 (SCOPE-01 ships;
its ticket is superseded by tickets CORE-01/CORE-02/UI-03/UI-04);
ICE-PRESET-01 re-scoped; M14-EXT-42's protected slot is UI-01's
landing site.

## D115 — M15 second look: run order inverts, three contract gaps closed, the profile gallery becomes a task (2026-08-07)

**Decision:** an owner-asked second look over the D114 breakdown
lands seven adjustments, all backlog/ticket-level; D114 itself
stands as written. (1) The UI run order inverts to UI-02 → UI-03
→ UI-04 → UI-01: the editor completes first behind a dev-only
entry and the section cutover lands last, atomic and wired to a
finished editor — the drafted order shipped a dead "Edit
profiles…" button and a half-migrated section. (2) SCOPE-02
ideally runs before UI-02 so the kind-agnostic shell is designed
against both known kinds (dither scoping already in progress in a
parallel session); failing that, UI-02 builds colour-first and
generalises at the dither build. (3) `ownedOnly` binds to
thread-library content only — `map:` and `user:` entries are not
ownable, and without the carve-out a profile with a map and
owned-only enabled empties silently (CORE-02 contract). (4)
Existing saved palettes convert 1:1 into explicit-membership
profiles, order preserved — the D114 waiver covers semantics,
never library data (PERSIST-01). (5) Custom `user:` colours
persist in the global My-colours library, available to every
profile, not trapped in the one that pinned them (PERSIST-01 /
UI-03). (6) "Classic cross stitch" ships as an initial, honest
agent-chosen subset, not a placeholder — the no-placeholder rule
applies to built-ins too (CORE-02). (7) M14-EXT-42's ticket now
names what M15-UI-01 deletes wholesale (brand helper lines,
library buttons), capping compression there at cheap wins.
M15-UI-01 additionally gains the Must-use search-to-add affordance
and non-thread Colours-used rendering in its acceptance.

**The gallery:** the owner upgrades the curation ask — "lots of
useful and interesting profiles from across culture and nature" —
so ICE-PRESET-01 is absorbed into **M15-GALLERY-01** [sign-off]
[blocked: M15-CORE-02]: agent-drafted candidate batches (6–10 a
batch, rule- or membership-based, test-image evidence), owner-
curated names and membership per batch, style-descriptive naming,
the candidate list living in the ticket and never the select.

**Link:** backlog → M15 reordered, M15-GALLERY-01 added,
ICE-PRESET-01 removed (absorbed); tickets M15-CORE-02, M15-UI-03,
M15-GALLERY-01 (new), M14-EXT-42.

## D116 — M15-SCOPE-02: dithering-profile scope signed — complete configs on the shared shell, colour builds first (2026-08-07)

**Decision:** the dither half of the D106 scoping ask ran 2026-08-07
(a design session in parallel with D114's colour session, landing
before UI-02 starts — the D115 hope) and signs the dithering-profile
scope. A **dithering profile is a complete named `DitherConfig`** —
method, per-family strength, serpentine where the method has a scan
direction — never partial: a profile fully determines the dither
stage, extending M8-CTRL-01's no-hidden-state rule to the profile
layer. The D61 control surface is the whole surface; no new engine
parameters. The seven shipped presets (`DITHER_PRESETS`) become
**read-only built-in profiles** (duplicate-to-edit, evidence basis
lines kept) — D114's "presets end as a concept" extends to dither —
and the never-lying Custom sentinel carries over: an unmatched
configuration renders as an honest unnamed state, never silently
adopted by a profile.

**Editor:** the dither kind mounts in the kind-agnostic takeover
shell (M15-UI-02) with the UI-04 preview rig inherited whole —
last-still default view, photo slots, generated test card,
three-resolution grid, draft-labelled real-pipeline renders,
draft-then-Save (D114's recorded §5.4 exception), the EXT-43
no-rebuild contract. The chooser-editor reading is signed: profile
list + judgement preview + the three-field form; the editor opens
on the design's active profile, and an explicit act (a shell verb
or a per-kind Use — settled at build against the shipped colour
editor) updates the design. The kind contract UI-02/UI-04 build
against: the draft is **opaque to the shell** (each kind supplies
its form and its pipeline stage-override mapping — the rig renders
"the pipeline with a draft-overridden stage", never "a draft colour
recipe"), and a dither preview needs a resolved thread palette —
the design's current palette by default, a **named demonstration
palette when the design is full-RGB** (dithering applies to thread
palettes; the label always names what the preview renders with,
because dither's look depends on palette density).

**Section:** Processing recuts to a "Dithering profile" select plus
an Edit profiles… button — the owner's minimal pick; the Dither
style select and the Dither details reveal retire (the editor
absorbs depth). With no inline tuning, divergence arises only from
load-time unmatched configs and later library edits, both rendered
honestly. Persistence extends D55 the cheap way: the project file
already stores the resolved config (the snapshot half), so
`ditherProfileRef {id, revision}` is additive — old projects attach
a built-in reference on structural match and otherwise stay
unreferenced; no migration beyond the bump. Unlike colour, an
unchanged config through the profile layer changes no engine
output, so byte-identity is assertable at acceptance — the dither
half's risk is persistence, not appearance.

**Owner picks at the gate:** complete profiles; built-ins immutable
with Duplicate; store + snapshot + reference persistence; the
chooser-editor on the shared shell; the minimal section; the
interaction contract and live preview inherited from the colour
editor by name; **colour builds first, dither second** — the
owner's call, reversing the agent's prove-the-shell-on-the-small-
kind recommendation, recorded so UI-02/UI-04 design against both
kinds from this entry rather than generalising later. M8-ACCEPT-01
**folds into the dither acceptance session** (M15-DITH-05 absorbs
its checklist whole; the five methods have shipped since M8 without
complaint, so the visual judgement runs once, on the final profile
surface — agent licence to unfold if that stops making sense). The
v1 cut line is owner-delegated: in — built-ins + user profiles
with duplicate/rename/delete, one judgement preview with content
and scale selection, the palette-context line; deferred — the
side-by-side compare grid; import/export ships only if the
PERSIST-01 pattern provides it generically.

**Link:** backlog → M15 "Dither half (D116)" M15-DITH-01..05
(after the colour half, owner order); tickets M15-DITH-01/02/05;
M15-SCOPE-02 ships (ticket superseded, deleted); M8-ACCEPT-01
absorbed into M15-DITH-05 (icebox line removed); M15-UI-02's
backlog line and M15-UI-04's ticket carry the kind pointer.

## D117 — Combined M15 review: seven seam fixes ahead of development (2026-08-07)

**Decision:** with both halves signed (D114–D116), an owner-asked
combined review checked the joined queue against the code and the
cross-half seams. The halves join cleanly — UI-02/UI-04 design
against both signed kinds, and the feared unnamed legacy state
dissolved in code: the seven dither presets include `none`, so a
no-dither project matches a named built-in at load. Seven seam
fixes land, all backlog/ticket-level. (1) PERSIST-01 is kind-aware
from the start — DITH-01 mounts a second kind on it without
rework; import/export generic or absent (the D116 cut line). (2)
The editor-Save contract is settled on UI-02: Save on the design's
active profile updates the design's copy in the same act; saving
any other profile never touches the design — DITH-02's Use
question inherits the answer. (3) UI-03 extracts the capped browse
table to a shared module rather than borrowing from
`palette-panel.ts`, which UI-01 deletes later in the run order.
(4) DITH-03 carries the shipped full-RGB conduct forward by name —
the profile select disables with "Dithering applies to thread
palettes." (the A9 sentence), never silent inertness. (5) DITH-03
gains a rename gate: Processing → Dithering once the select is the
section's only content is the owner's call — EXT-30 named it
Processing on the owner's own authority, so no silent re-rename.
(6) GALLERY-01 batches are owner-paced and interleave freely with
the dither half — they never block it. (7) M8-GOLD-01 rides
DITH-05's session as an agenda line; the owner is already judging
the five methods there. Explicitly unchanged, so a development
session does not "fix" them: the divergence asymmetry between the
halves (colour's three section verbs vs dither's no inline tuning)
is D116's signed pick, and DITH-01's [blocked: M15-PERSIST-01]
stays formally weaker than the owner's colour-first prose order,
which governs at pick time.

**Link:** backlog M15-PERSIST-01 / M15-UI-02 / M15-DITH-03 /
M15-GALLERY-01 lines + the M8-GOLD-01 icebox line; tickets
M15-UI-03, M15-DITH-05.

## D118 — Doc-sync: ten deltas reconciled across five protected docs (2026-08-07)

**Decision:** the doc-deltas ledger reached its 10-open threshold and
this maintenance session reconciled all ten in one signed batch, each
edit derived fresh from its source entry. UI-STANDARDS (5): the
Capture UX standing dimensions readout retired in favour of Stats +
gesture-end status announcements (D107); the Layout model's "the
canvas never collapses" replaced by the preview's own persisted
accordion header (D107, then D110); "Shell presentation modes" recast
as "Shell presentation state" — cold-only shell model, per-disclosure
persistence, whole-panel collapse and preview focus both retired
(D107/D110). AGENTS (3): the bench-budgets-in-`check` claim corrected
to `npm run bench` (`BENCH=1`, outside the gate — D43/D44); the MVP
scope guard reframed around committed milestones with the M8 dither
expansion named (D61/D62); the four-resolutions split text updated to
the shipped shape — "Lock aspect" defaults off, both dimensions derive
via `deriveGridSize` (D107). brief.md (same delta): the out-of-scope
dithering line tagged as since-shipped (M8). architecture.md (1):
`dither.ts` described as the five-method `DitherConfig` union with
`threshold-tiles.ts` in the tree and the FS-only wasm routing guard
(D61/D62). DEV-INFRASTRUCTURE (1): both `?backend=` URL-override
claims removed — no such wiring exists in `src/` (`setSelectedBackend`
is test/audit-only; the override idea stays on the wish-list). No
delta deferred; all ten ticked in the ledger.

**Link:** `pm_skills/project/doc-deltas.md` (all open lines ticked);
sources D43/D44, D61/D62, D107, D110.

## D119 — Roadmap refactor: backlog Active compressed, detail moved to tickets (2026-08-07)

**Decision:** Active stood at 4,196 words / 43 open items against the
1,500-word budget — verbosity, not structural drift (no done-work, no
stale rounds, tickets 1:1). The repair: milestone preambles compressed
to constraint-plus-pointer form (the shipped-look narration and the
M15 scope summary live in D91–D117, not the queue); four overlong
un-ticketed items gained ticket files carrying their full intent
(M15-PERSIST-01, M15-UI-02, M15-UI-01, M15-DITH-03 — all now
[detail]); the other [detail] lines compressed to the ticket grammar
after verifying each ticket carries the detail — one gap found and
fixed first (M14-ACCEPT-01's ticket lacked the region-drag,
picker-hint, EXT-19-tension and sixth-look-trade session legs; they
were appended before the line compressed). No item added, cut, merged
or reordered; all 43 IDs, flags, dates and dependencies verified
identical before/after. Active lands at 3,705 words. The residual
overrun is accepted and item-count-driven: three scoped milestones in
flight (M13 remainder with live status lines, M14 tail, M15 both
halves) plus an 11-item icebox put the grammar floor near 2,600, and
the two next-up items (EXT-38/39) keep full lines as their own
working spec. Relief is structural — M14's close removes eight items;
revisit then rather than gutting signed scope now.

**Link:** `pm_skills/project/backlog.md` (Active); new tickets
M15-PERSIST-01 / M15-UI-02 / M15-UI-01 / M15-DITH-03; M14-ACCEPT-01
ticket appended.

## D120 — Pruned project memory (2026-08-07)

**Decision:** the maintenance session's prune, all splits
diff-verified lossless before swap. Decision-log D91–D105 (15
entries, the third-look-and-fixes era 2026-08-04 → 2026-08-05) moved
verbatim to archive/decision-log-2026-08-04-to-2026-08-05.md, leaving
D106+ live (15 entries including this one). The trajectory's M13
phase (profiling evidence, 2026-07-22 → 2026-07-23) moved verbatim to
archive/trajectory/trajectory-0003-2026-07-22-to-2026-07-23.md with
the milestone remainder still open in the backlog — the live file
lands at 1,660 words. doc-deltas swept of its 25 ticked lines (the
D60 and D118 sync residue), leaving zero open deltas at 230 words.
INDEX.md carries the two new rows; the file map is untouched by
design (the generator excludes pm_skills/ — INDEX.md is the archive
map). Environment note: the repo lives on a OneDrive-synced path;
preflight found no conflict artefacts before surgery, and the
standing pause-sync advice repeats at session start.

**Link:** archive/INDEX.md; the D118 doc-sync and D119 refactor
entries this session precede it.

## D121 — M14-EXT-38..44: the sixth look lands in one auto-jazz run (2026-08-07)

**Decision:** all seven sixth-look tasks shipped as one gateless run
(auto-jazz, the owner's "autojazz M14 and M15" instruction — this is
the M14 half; M13 deferred to its own session by the same
instruction). Conservative picks at every skipped gate: EXT-38 — the
Freeze label flips (Freeze ↔ Unfreeze) and aria-pressed is dropped (a
flipping label under aria-pressed is the ARIA-APG anti-pattern the
shipped Pause/Resume pair carried; the two lock toggles keep
constant-label + pressed); a dead pump enters the frozen state — same
observable state, honest button — so the documented recovery is the
single Unfreeze press and the copy names it (verified: the resume leg
calls startPumpNow). EXT-39 — the status stacks under the build id in
a `.header-id` block taking the slack width, with a one-line
min-height reserve so announcements never reflow the page; two
economy fixes (the unscoped `.shell-bar` margin rule silently lost
the cascade to the later generic `.toolbar` margins — 24 px of dead
space; the ≤60 rem `flex-basis: 100%` utility rows collapse to one
shared row): header 225 → 165 px at 380. The off-viewport-when-
scrolled-deep trade is recorded for ACCEPT-01. EXT-43 — the D112
hypothesis confirmed exactly (per-frame `update()` rebuilt the source
select under its open popup via replaceChildren; the
algorithm-change-only dither panel was the surviving contrast); fix
is structural fingerprints per region (source/editor/threads/
conflicts) with value-only changes landing in place, selected values
excluded from structure (keyboard arrowing fires change per step),
focused count controls never written, and focus restored by id →
aria-label → summary on structural rebuilds; five pure tests pin
unchanged ⇒ identical fingerprints (vitest env is node, so the
contract pins at the pure level per the house convention — DOM legs
proven live: element identity preserved across source swaps for all
five probed controls). EXT-40 — option A with the section title
unchanged ("Capture" is the owner's own word in the memo; the
still-image naming stretch is recorded for ACCEPT-01, not silently
retitled); zoom factor (i) — the same number as "N×", unit in the
helper; the D52 zoom-vocabulary collision helper-disambiguated and
named, never silently renamed; the Capture section becomes a
standing panel section in Design's old slot, its disclosure seeded
from the retired `section-design` key, force-opened per session —
D110's named unpersisted-disclosure exception dissolves because the
section is no longer session-scoped; `sectionsReady` now flips after
the capture declarations so the first Stats refresh can read the
session state. EXT-42 — cheap wins per the D115 cap: the count
cluster packs (five stacked blocks → three packed rows at 16 rem),
the summary trims to availability alone, brand provenance to marked
exceptions plus one shared group note; the retired panel-state
fields (selectedCount/usedCount/awaitingSource) leave the interface;
the steppers cut is parked (it reverses the owner's own EXT-29 ask)
alongside the library-button re-home (M15-UI-01 deletes those
wholesale). EXT-44 — conduct A, honour + say so: a standing note in
Processing plus a load-status tail; no edit route back; proven
end-to-end through the app's own save → flip → load. EXT-41 —
option B: the fold promotes to a real "Colours used" section (old
`colours-table` key seeds the new id), the settings aside drops its
layer-01 box so every region reads at one level; an empty table
hides the whole section (shell × content composed by one writer);
the "Colours in use"/"Colours used" near-twin is flagged with the
owner's wording standing.

**Supersessions land as triaged (D111/D112):** D110's EXT-33-restored
Capture frame → cut; D110's EXT-34/A permanent Design home → the
standing Capture section is the fields' only home and Design retires;
the M2-era content-column status region → header; D99's fold
placement of the colours table → section anatomy (its
collapsed-by-default choice surviving); EXT-30's Processing-order
seat and the Advanced section → retired whole.

**Verified:** full gate green — typecheck, lint, 955 tests (5 new
fingerprint tests; the scales label and countSummary suites updated
with the approved renames, not weakened), wasm, build, contrast AAA,
docs, secrets. Live sweep on this session's own dev server at
1280 × 800 and 380/320 × 700, both schemes, error catcher armed —
evidence tables in `docs/ui-evidence.md` ("Sixth look"). The
in-session capture legs (freeze toggle live, zoom slider live, the
session mount) ride getDisplayMedia — not driveable in this rig
(D101's limitation) — and are named for ACCEPT-01's live checklist.

**Link:** backlog → sixth-look section removed, ACCEPT-01 unblocked
(again the milestone's one remaining item, the owner's); tickets
M14-EXT-40/41/42/43/44 deleted on ship (38/39 were line-only);
ui-spec §2/§5 amended; ui-evidence extended; AGENTS/UI-STANDARDS
deltas ledgered in `doc-deltas.md`, never auto-edited.

## D122 — M15-CORE-01..03: the colour core lands — sources, resolver, selection recut (2026-08-07)

**Decision:** the three pure-core tasks of the M15 colour half ship
in the continuing auto-jazz run (the owner's "autojazz M14 and M15").
CORE-01 — `src/core/color-sources.ts`: the six generated maps
(2/4/8/16/64/216 entries, deterministic, R-major where computed;
Retro 16 is the HTML4/VGA named set in VGA index order) as
Thread-shaped records under `map:<mapId>:<code>` (`brandId` carries
`map:<mapId>`, so the D55 id grammar holds unchanged); codes are
corner/CSS names where a map defines them, uppercase hex otherwise;
the ~140-entry CSS name table embeds as a constant with alias pairs
collapsed one-per-value (cyan and magenta win; grey spelt UK-style
for display, CSS spellings kept as identity codes); naming is exact
match only — `#00ff00` is "Lime", never a guess. CORE-02 —
`src/core/color-profile.ts`: the recipe (`libraries` incl. `mine`,
`ownedOnly`, include/exclude pins, union-of-bands two-pole H/S/B
ranges with hue wrap), the five-step resolution order pinned by
test with a sentence per narrowing (new ConflictKinds extend the M7
machinery); include wins over ranges (library position kept),
exclude wins over everything (M7-MIX-01 conduct on contradiction);
ownedOnly passes `map:`/`user:` entries through with the D115
sentence; nine built-ins resolve non-empty, "Classic cross stitch"
shipping as a real 25-thread DMC starter (honest, never
placeholder); `policyToRecipe` is the shared PERSIST-01/UI-01
bridge (strict presets and saved palettes become explicit
membership; a prefer-mode preset keeps its open universe and loses
only its retired steering half). CORE-03 — selection keeps count,
gains `minDistance` (ΔE76, squared-compare in the hot loop): every
auto-filled pick clears every seat already chosen, locks are exempt
(a hard promise beats a spacing preference) and guaranteed as the
Must-use seats; the take-everything shortcut is guarded so an
over-generous target still spaces its picks; `distanceLimited`
surfaces as the `distance-limits-count` sentence naming both dials.
The prefer machinery (PREFERENCE_DISCOUNT, preferredUsed) is
deleted from selection.

**Sequencing assumption (stated at the skipped gate):** the live
policy path is not rewired at CORE-02 — `resolvePermitted` keeps its
exact shipped semantics and the panel keeps driving it until the
UI-01 cutover later this run, where the surface and the model swap
together. Same end state as the ticket's cutover note, no interim
behaviour change to a surface UI-01 deletes; `policyToRecipe` exists
from today. Interim honesty note: with prefer removed from
selection, the panel's Prefer role stops steering until UI-01
retires the control — acceptable only because both land in this same
run. `PalettePolicy.minDistance` is optional and unset anywhere
until UI-01, so project files are byte-stable until PERSIST-01 bumps
the schema deliberately.

**Verified:** full suite 1002 green (47 new tests across
color-sources / color-profile / selection); policy, panel and
acceptance-matrix suites untouched and green.

**Link:** backlog → CORE-01..03 removed; tickets M15-CORE-01/02
deleted on ship; file-map roles added.

## D123 — M15-PERSIST-01 (store half) + M15-UI-02/03/04: the profile editor lands behind its dev entry (2026-08-07)

**Decision:** the persistence store and the whole takeover editor
ship in the continuing auto-jazz run. PERSIST-01's store half —
`records.ts` gains the generic, kind-opaque profile file format
(one shape for every kind, payloads bounded and uninterpreted — the
D116 generic-or-absent line honoured) plus the My-colours format;
`store.ts` gains kind-aware profile and user-colour stores
(IndexedDB v3, keyPath `[kind, id]`; a dev-session v2 intermediate
is healed by the idempotent upgrade), with built-in immutability
pinned at the store level (a `builtin:` put rejects — D116) and at
import. **The schema half of PERSIST-01 deliberately rides the
UI-01 cutover** (stated assumption): bumping the project file while
the app still thinks in policy would demand a reverse recipe→policy
adapter — the dual model D117 warns against — so the file format
pivots atomically with the surface, the D115 atomicity principle
applied to persistence. UI-02 — `profile-editor.ts`, the
kind-agnostic takeover shell: view swap over the app layout (header
and the one status region stay; a capture session keeps running
underneath), switcher + New/Duplicate/Rename/Delete, draft-then-Save
with a JSON-snapshot dirty model, discard guarded by a danger modal,
Escape = Back, focus to the view heading on open and back to the
invoker on close; the D117 editor-Save contract is wired in the Save
path (active-profile saves update the design through the host link —
the link itself activates at UI-01, when a design can carry an
active profile); the EXT-43 contract holds **by construction** — the
shell exposes no frame-facing API at all, so no frame can rebuild
it (proven live: element identity across a source replacement and
its frames). UI-03 — `profile-editor-colour.ts` + the extracted
shared `browse-table.ts` (D117 seam 3: the editor never imports
from `palette-panel.ts`, which UI-01 deletes; the old panel keeps
its own copy until then rather than churning a dying file): the
libraries column (8 brands with mapped-only provenance marks, 6
maps with counts, My threads), per-library Browse scoping into the
shared capped table with disjoint Pin in/Pin out row toggles
(M7-MIX-01 conduct), ownedOnly, one two-pole H/S/B rule with
slider + numeric pairs (hue wraps; full-span start), hex-search
custom add into the global My-colours library (D115) pinned as
`user:` identity, and the resulting-colours readout (count +
conflict sentences + capped swatch grid) refreshed on EXT-43-style
fingerprints. UI-04 — `profile-editor-preview.ts`: design-still
default, four photo slots under `public/profile-demo/` with honest
"Image offline — add the file" states (a content-type guard tells
Vite's index.html fallback from a real image), the generated test
card, and the ÷1/÷4/÷16 grid (floor 8); renders run the real
pipeline via the worker export route, debounced 150 ms and
latest-wins, draft-labelled (the M4 rule). Dev-only entry: a
"Profiles (dev)" shell-bar button, dev builds only (D115 — the real
entry ships with UI-01).

**Verified live** (this session's dev server): nine built-ins list
and resolve (DMC 489); duplicate → edit → Save → reload →
IndexedDB round-trip intact (491 with the added map); range rule
narrows live (491 → 198); custom `#00ff88` lands as "Custom —
`#00ff88`" pinned in; offline slot states render with the real path;
grid mode renders 6 cells through the pipeline; editor control
identity preserved across a source drop and its frames; Back with
a dirty draft guards, discard returns to the design with focus and
a status line. 13 new pure tests (browse rows, hex parsing,
fingerprints, grid divisors, the absent-vs-broken slot guard) +
the store/records suite from the same phase; full suite green.

**Link:** backlog → UI-02/03/04 removed, PERSIST-01 annotated
(store half shipped, schema half rides UI-01); tickets
M15-UI-02/03/04 deleted on ship; file-map roles added.

## D124 — M15-UI-01 + PERSIST-01 schema half + ACCEPT-01: the colour half ships whole (2026-08-07)

**Decision:** the atomic cutover lands, completing the M15 colour
half's agent work. Schema v5 (PERSIST-01's deferred half, on the
D115 atomicity principle): the palette block becomes `profileRef` +
the design's `recipe` copy + `design` rules (count, minDistance,
mustUse) + the authoritative snapshot; v4 → v5 migrates under the
D114 waiver — brands policies map straight, library and
strict-preset sources become explicit membership **from the
snapshot** (exactly what rendered; the brands universe when the file
never ran), prefer's steering half retires, locks become Must-use
seats — and `parseProject` reports `migratedFrom` so the load status
carries the visible note; save → load → save is byte-identical at v5
(pinned, incl. a migrated-then-saved file). The default project's
baseline hash re-pinned for the schema change (the recorded
exception the waiver sanctions — pixel and export hashes stayed
green untouched). UI-01: `colour-section.ts` replaces
`palette-panel.ts` (deleted with its suite — its no-rebuild contract
lives on in the editor and section fingerprints): profile select
with "(edited)" on the linked option + Edit profiles… into the
finished editor; Update profile / Save as new / Revert (Update
disabled with its reason on a built-in link); count cluster +
Minimum distance beside it; Must-use chips with browse-table
search-to-add; the conflicts list; and the My-threads inventory
reveal (ownership stayed its own concern — Own boxes, import/export
survive there). Colours used gains the Remove-from-profile row
action, landing an exclude on the design's copy — no shared-library
mutation without an explicit Update/Save as new (proven live: a
built-in edit renders "(edited)" and the built-in stays whole).
Saved palettes convert 1:1 into explicit-membership profiles at
library open (idempotent by id, order intact); custom colours load
into the resolver's inputs; the D117 editor-Save design link is
live (active-profile saves update the design's copy in the same
act). The PDF key keeps provenance-honest labels for non-thread
entries via `nonThreadLabel` — "Web-safe Lime #00ff00", never a raw
namespace (`keyLabel` extracted and pinned). ACCEPT-01's machine
half closes with this entry: resolver/selection/persistence suites
green (1,067 tests), export byte-identity for thread-only profiles
re-proven by the untouched ui-baseline pixel pins, and the D46 LUT
strategy needed no revisit — profile membership materialises as
ordered Thread entries, which the content fingerprint already keys.

**Retained, ticketed as cleanup:** the policy-world resolver
(`resolvePermitted`, `resolveProjectPalette`) and the LCh presets
stay in core as tested migration-era substrate this release; nothing
in src consumes them post-cutover — a wish-list line marks the
removal pass.

**Verified live:** the recut section renders the census exactly (no
old control anywhere); Retro 16 adopt → 16 available; the
remove-row action → "Retro 16 (edited)" + edited verbs + 15;
Revert restores; distance at 25/30 spaces the selection (used 7
of limit 8) with the sentence path node-pinned; a v5 save → Open
round-trip reopens on the same profile, distance intact; v4 loads
migrate with the visible note (code path proven, node-pinned).

**Link:** backlog → PERSIST-01/UI-01/ACCEPT-01 removed (colour half
complete; GALLERY-01 owner-paced and ACCEPT-02 maintainer remain);
tickets M15-PERSIST-01/M15-UI-01 deleted; file-map regenerated;
wish-list gains the resolver-cleanup line.

## D125 — M15-DITH-01..04: the dither half ships on the shared shell (2026-08-07)

**Decision:** the dither half lands whole, closing M15's agent work.
DITH-01 — the canonical presets and `sameDither` moved to
`src/core/pipeline/dither-presets.ts` (core cannot import ui;
`dither-model.ts` re-exports so consumers hold), with
`matchBuiltInDither` as the load-time attach; `ditherProfileRef`
joins schema v5 additively (the same unreleased cycle as D124, so no
v6 — the baseline project hash re-pinned once more under the same
waiver); the resolved `DitherConfig` stays the authoritative
snapshot half (D55). The kind-aware store carries dither profiles
with no store change — the PERSIST-01 kind-awareness paying off
exactly as D117 intended. DITH-02 — `profile-editor-dither.ts`
mounts the dither kind in the takeover shell with **zero shell
changes** (the D116 design goal, verified live): the three-field
form (method select, per-family strength with its semantics in the
helper, serpentine only where the method scans), built-ins carrying
their D61 basis lines as "Why:", the UI-04 rig inherited whole with
the D116 palette-context line — the design's palette by name, or
"Demonstration palette — Retro 16" when the design is full-RGB.
DITH-03 — the Processing section recuts to a "Dithering profile"
select + Edit profiles…; the Dither style select and details reveal
retire (`dither-panel.ts` deleted; the pure `dither-model.ts`
survives as the form's vocabulary); adopting a profile applies its
complete config live (no inline tuning — D116); the never-lying
Custom entry appears exactly when the config matches no profile;
full-RGB disables the surface with the A9 sentence ("Dithering
applies to thread palettes."); the section keeps the name
"Processing" — the rename to "Dithering" stays the owner's call
(D117 seam 5). DITH-04 — matching pinned over every preset (incl.
the None built-in for no-dither projects — D117's dissolved legacy
state), tweaked configs stay honestly unreferenced, and the
byte-identity leg holds by identity: an adopted built-in hands the
engine a config deep-equal to the preset's own.

**Verified live:** seven built-ins list in Processing; Graphic
adopts and renders; the editor opens on the design's active profile
read-only with its basis line; duplicate → strength edit → Save
lands on the copy and **not** the design (the D117 contract
observed); Back restores the section with the user profile listed.
Full suite 996 green; no shell file touched by the second kind.

**Link:** backlog → DITH-01..04 removed; M15-DITH-05 unblocked (the
absorbed M8 acceptance session, the owner's); tickets
M15-DITH-01/02/03 deleted; file-map regenerated.

## D126 — Review follow-ups: editor id uniqueness, the unlinked sentinel, three small honesties (2026-08-07)

**Decision:** the punch list from the D121–D125 review runs as its
own fix task (review.md rule: approved fixes are a task, not review
edits). (1) Editor ids are kind-prefixed — both kinds' editors stay
mounted in the host once opened, and the hidden twin duplicated
`#profile-switcher` and `#preview-view`, breaking id uniqueness and
label association; the shell derives its switcher id from
`adapter.kind` and the preview rig takes an `idPrefix` dep (proven
live: zero duplicate ids with both editors mounted). (2) The colour
select gains the `UNLINKED_DESIGN` sentinel — "This design's
colours" — so a migrated old file with no profile link never wears
the first option's name; picking the sentinel is a no-op (it names
a state, it is not adoptable); the dither select's never-lying
conduct, mirrored (proven live over a synthesised v4 library-source
file). (3) The loaded-snapshot palette display name refreshes once
the profiles cache lands, guarded by object identity so a
faster-fingered edit is never overwritten. (4) The built-in-linked
Update button's reason is a visible helper sentence wired by
aria-describedby, not a hover-only title. (5) The `\\u2019` escape
becomes a literal. ui-spec §5 gains the M15 amendment block (Colour
and Processing censuses, the takeover editor). Left deliberately for
the acceptance walk: re-capturing the browser-side baseline project
fixture (it needs the capture protocol's reference environment).

**Verified:** typecheck, lint, 996 tests, docs green; live — zero
duplicate ids with both editors mounted; the migrated file renders
the sentinel selected.

**Link:** the D124 review (session report); ui-spec §5 amended.

## D127 — M14-ACCEPT-01 accepted: M14 closes; M15-ACCEPT-02 deferred (2026-08-07)

**Decision:** the owner accepts M14-ACCEPT-01 — the maintainer end
review over the six looks (D74–D121), the review pack and this
session's evidence — with no failures routed to fix tasks, so **M14
UI/UX excellence closes whole**: the acceptance line has passed and
`check` is green on the final code. The watch items and live-session
legs the ticket carried (the getDisplayMedia legs, the Zoom naming
beside the preview's zoom, the "Capture"-over-a-still stretch, the
"Colours used"/"Colours in use" near-twin, the parked steppers
question, the off-viewport status trade) are accepted as shipped by
this verdict; anything the owner later wants changed arrives as a
new item, never silent rework. **M15-ACCEPT-02 is deferred** on the
owner's word: the colour half stays agent-complete with the human
acceptance session to run at a time of their choosing; the item
stays open in the backlog with its deferral dated. M15-DITH-05 and
M15-GALLERY-01 are unchanged by this entry.

**Link:** backlog → the M14 section removed whole (no Current
milestone until the next pick); M15-ACCEPT-02 line dated deferred;
ticket M14-ACCEPT-01 deleted on ship; trajectory M14 phase closed;
README status refreshed.

## D128 — M13 returned to Current; gestureless evidence re-baselined on the post-M14/M15 build (2026-08-07)

**Decision:** the owner's "autojazz M13" is the pick that returns the
M13 remainder to Current (M14 closed at D127). Because the live-path
surfaces churned ~3k lines through M14/M15 after the 2026-07-23
packs, every gestureless leg was re-run on `d7218be` before the owner
session — the D62/D63 re-measure rule applied to the profile evidence
itself. Node bench green (22 rows); the browser auto legs
(`still,stage,backend,livepath,gpu,lut,contention`) and the mem leg
re-run in a visible production Chrome window, both untainted
(`bench-reports/browser-bench-v0.5.0_20260807.d7218be-{auto,mem}.json`,
quoted in `docs/performance-evidence.md` → the D128 section). Every
load-bearing 2026-07-23 figure replicates — dirty knee, stats, still
preview-update, the ~51 ms selection export, isolation EXACT, GPU
agreement EXACT, device-loss PASS, and the post-export idle residue
to the decimal (74.8 MiB) — so the owner session lands on
known-good instrumentation. The D72 fixes are visible and truthful
in the rows (the non-FS clamp reports `ts`; the oversized chart
publishes `not-measured` via the refusal). TS reduce runs ~2.5×
faster with `reduce.ts` untouched — environment/JIT drift, recorded
so the synthesis binds to current-build baselines; the bv2 env row's
missing browser-version field is noted as the one attribution the
comparison wanted. The rehearsal sheet is repaired against the
shipped M14 surface (pause/resume → Freeze/Unfreeze; the documented
auto-token list gains `livepath` and names `mem` with its ~2 GiB
peak-probe caveat). The owner capture session (Parts A–D) is now the
sole input left for M13-SYNTH-01's gate; PROF-04/05 stay `[~]` on
exactly that remainder.

**Link:** backlog → M13 returned to Current with the note refreshed
and both PROF status lines re-dated; tickets M13-PROF-04/05 status
appended; evidence `docs/performance-evidence.md` → D128 section;
procedure `docs/browser-measurement.md` auto-list + Part C repairs.

## D129 — M13-MEAS-03: the owner session shrinks to its human legs; flag-granted capture sanctioned; D71 answered in mechanism (2026-08-08)

**Decision:** Tier 1 only — launch flags, no new dependencies; the
Tier-2 CDP driver stays untaken pending explicit owner dependency
approval. The probe (the ticket's kill-switch) passed on Chrome
151.0.7922.77: `--auto-select-window-capture-source-by-title` alone
resolves `getDisplayMedia` gestureless and pickerless, overriding
even the shipped monitor hint; `--use-fake-ui-for-media-stream`
breaks capture on that release and is excluded. Because the flag
matches any window system-wide by title substring, the automated
legs measure nothing until an in-page content guard proves the
captured pixels are the controlled source — joining visibility,
`zeroFrameReason` and the width warning as load-bearing
self-incrimination. `npm run bench:auto` is the one command
(dedicated throwaway profile, CORS-correct collector, validated
reports; invalid runs exit non-zero). Back-to-back automated windows
exposed two real harness ledger defects the manual flow's human
pauses had hidden — jobs settling after the books closed, and
latest-wins client drops leaving phantom in-flight entries — fixed
by a drain plus a drop-retirement cursor, so conservation now holds
at machine cadence. The six Part-B edit classes ride the controlled
source as seeded commanded patterns (`.edit-<class>` rows,
controlled-source evidence only). The forced-GC probe
(`--js-flags=--expose-gc`) answered D71: the idle residue collapses
to 11.5 MiB on forced GC in every run — lazy major GC, not
retention; the snapshot-pair Part D retires unless a run reports
otherwise. Engineering runs were refused by the validity gate
(hidden windows on an in-use desktop) — the gate working as built;
the first valid capture artefact awaits a quiet-desktop run, and its
rows enter canon only after the one-time manual cross-check
(Part A′), still owner work.

**Link:** ticket M13-MEAS-03 (remaining slivers); backlog status
lines; procedure `docs/browser-measurement.md` → "Automated
owner-session legs" + the shrunk rehearsal sheet; evidence
`docs/performance-evidence.md` → D129 section; scripts table
`DEV-INFRASTRUCTURE.md`.

## D130 — bench:auto --when-quiet: the quiet-desktop precondition automated, not bent (2026-08-08)

**Decision:** the owner's "take another look at automating" lands as
scheduling automation, deliberately not environment modification.
The alternative — Chrome's throttle-disabling flags
(`--disable-backgrounding-occluded-windows` et al.) — would let runs
survive occlusion but changes the scheduler on a measurement
instance and makes the env row's `visible` mean something weaker;
it stays a wish-list item requiring visible-vs-occluded equivalence
evidence before it could ever be sanctioned. Instead the launcher
automates the precondition the sheet already states: `--when-quiet`
polls `ioreg` HIDIdleTime until the desktop has been input-free for
`BENCH_IDLE_SECS` (60 s default), wakes and holds the display via
the macOS built-in `caffeinate` (`-u -t 1` then `-di` — display
wake and hold only; user input is never faked), runs, and re-arms
for the next quiet gap when an attempt's failures are wholly
environmental — a tested signature gate, so structural failures
(conservation, missing forced-GC) never burn retries. Artefact
naming becomes clobber-safe: every attempt writes a timestamped
file; only a validated leg is copied to the canonical unstamped
name, closing the run-6 hole where an invalid rerun overwrote run
5's valid mem report. Pure logic (idle parsing, naming,
retry gate) lives in `scripts/bench-auto-lib.mjs` under unit test.
If idleness is unreadable the gate degrades to a warning and the
validity gate remains the backstop — a wasted attempt is possible,
a quietly wrong report is not.

**Link:** launcher `scripts/bench-auto.mjs` + `bench-auto-lib.mjs`
(+ tests); `DEV-INFRASTRUCTURE.md` scripts table + utility entry;
procedure `docs/browser-measurement.md` → "Automated owner-session
legs"; ticket M13-MEAS-03 + backlog status (armed 2026-08-08).

## D131 — the Part-A′ cross-check holds: automated capture rows are canon; M13-MEAS-03 ships (2026-08-08)

**Decision:** the owner's verdict on the Part-A′ cross-check is
**holds** — given with the provenance stated plainly: the
picker-granted leg used the real picker dialog (a grant path fully
independent of the launch flags) with its two clicks scripted via
System Events, not a human hand. The evidence is the `52300de` pair
(`bench-reports/browser-bench-v0.5.0_20260808.52300de-{capture,picker}.json`,
both untainted, zero findings, verified against the ticket's table
in this session): live 300² median 38.5 → 37.7 ms (0.98×), live 200²
30.6 → 30.2 ms (0.99×), interaction 76.5 → 77.3 ms (1.01×), 4.0
updates/sec both sides, protocol misses 2 vs 3 (the known double-rAF
race, both sides). Consequence: **automated capture rows are canon**
— a `bench:auto` capture report that passes validation is quotable
evidence without a manual twin, starting with the D130 artefacts on
`6e79c78`; Part A′ retires from the rehearsal sheet and re-arms only
when a Chrome update changes flag behaviour (the probe expectation
re-run stays mandatory on update, per D129). The owner session
shrinks to Parts B and C exactly as designed, and M13-MEAS-03 closes
on this verdict — its remaining lines were only this call and this
recording.

**Link:** evidence `docs/performance-evidence.md` → D131 section
(the comparison table); procedure `docs/browser-measurement.md` →
"Cross-check before canon" status + Part A′ retirement; backlog →
M13-MEAS-03 removed, PROF-04/05 statuses re-cut; trajectory →
M13-MEAS-03 line; ticket M13-MEAS-03 deleted on ship (Tier-2 scope
ported to M13-MEAS-04's ticket — see D132).

## D132 — Tier-2 approved: the CDP trace leg opens as M13-MEAS-04, zero-dep raw CDP first (2026-08-08)

**Decision:** the owner grants the Tier-2 dependency approval D129
left pending — a CDP driver for the bench Chrome is sanctioned, and
the Part-C trace half becomes agent work as **M13-MEAS-04**. Design
stance chosen conservatively: **raw CDP over Node's built-in
WebSocket first** (engines pin Node ≥ 22.18, so a WebSocket client
ships with the runtime — the approved dev dependency is held in
reserve, taken only if raw CDP proves insufficient; the approval
covers `ws`/`playwright-core` if needed, recorded here so no future
session re-asks). Scope: record tracing during driven live capture
on the controlled source — GC pauses (serving PROF-05's remaining
line), long tasks and input responsiveness (serving PROF-04's Part
C) — published as a validated report next to the capture leg. The
MEAS-03 honesty rules carry over whole: controlled-source numbers
only (never quoted as Photoshop behaviour), the content guard stays
load-bearing, validity gates refuse tainted runs, a forced or
scripted anything is labelled. What stays human shrinks to: the
Photoshop-content trace, adversarial feel checks (browser-bar stop
and declined re-prompt stay approximate under any driver — D129),
perceived responsiveness, and every acceptance verdict
(M13-ACCEPT-02, SYNTH-01).

**Link:** backlog → M13-MEAS-04 opened in Phase 2 with [detail];
ticket `pm_skills/project/tickets/M13-MEAS-04.md` (design sketch,
honesty rules, the ported Tier-2 notes); this entry is the recorded
dependency approval D129 required.

## D133 — M13-MEAS-04 ships: the canonical trace run lands; GC closed as a non-source under driven capture (2026-08-08)

**Decision:** the canonical quiet-desktop artefact landed on the
first armed attempt — `bench:trace --when-quiet`, build
`v0.5.0+20260808.684811a` (the committed machinery build, clean
tree), validated whole: page half untainted with zero findings, all
nine windows paired, renderer self-identified, no trace-buffer data
loss, and the per-window GC accounting conserving exactly against
the whole leg. Verdict quoted to the evidence doc: **GC is not a
pause source on the driven live-capture path** — ~0.4 % of wall
time, a single 12.5 ms worst pause in 162 s (every other window's
major max ≤ 1.4 ms), zero observer long tasks in all eight observed
windows; major-GC frequency tracks allocation rate by edit class,
the same lazy-major mechanism as D129. M13-PROF-05's last automated
line (live GC pressure) closes on it; PROF-04/05 now carry only the
owner sitting. The ticket's second slice — an app-UI responsiveness
trace driving `index.html` itself under flag-granted capture —
deliberately does not ship with the item: the Done-when is met
without it, and whether that extra controlled-source evidence is
worth taking is a synthesis-time call, so it is parked on the
wish-list rather than silently dropped. M13-MEAS-04 closes.

**Link:** evidence `docs/performance-evidence.md` → D133 section
(the per-window GC table + honesty notes); procedure
`docs/browser-measurement.md` → trace-leg bullet (canon status
line); machinery, honesty rules and sheet shrink shipped under
D132's design in commit `684811a`; backlog → M13-MEAS-04 removed,
PROF-04/05 statuses re-cut; trajectory → M13-MEAS-04 line;
wish-list → second-slice line; ticket M13-MEAS-04 deleted on ship.

## D134 — the owner sitting closes M13-PROF-04 and M13-PROF-05 (2026-08-08)

**Decision:** both remaining halves close on the sitting's numbers
plus owner notes, exactly as the shrunk sheet designed. Part B
(Photoshop window, human by policy): the promise holds on real
content — 4.7–7.5 updates/sec at 300², 4.1 at 200², draft governor
truthfully silent, zero pump drops/errors — and every cost scales
with captured-surface pixels, not grid (×1.62 surface → ×1.6–1.76
everywhere; grab surface-sized at both grids). The discovery is
main-thread long-task density under a 6.5 MP window (11–18 % of
wall vs zero on the controlled source), the headline SYNTH-01
input. The report is formally tainted by two conservation findings
explained to the frame as harness bookkeeping — per-window drop
counters against cumulative submits — filed as **M13-DEF-03**
(repro: buttons 6, 6, 6b on a 30 fps surface; invisible on
automated runs where drops are zero; does not gate the synthesis,
whole-sitting totals conserve). Part C (the owner's real whole
screen + crop geometry, 156 s DevTools trace): GC is not a pause
source on the real path either — max pause 3.92 ms, 0.71 % of wall,
major frequency identical to the driven leg (3.2/s), allocation-
rate mechanism confirmed; long tasks 14.4 % of wall, max 82 ms,
matching the harness density; the D71 census's two crop-sized
main-thread copies keep the #1 reuse ranking. All adversarial
checks passed ("all seemed ok"; export full-quality and the
external-stop status line individually confirmed); the owner's
expectation of a louder end-of-capture prompt is a salience note
for ACCEPT-02, not a defect. Schedule enactment is human-infeasible
in-window (owner verbatim) — D129's automation of the edit classes
vindicated. M13-SYNTH-01 unblocks; acceptance stays M13-ACCEPT-02.
The close itself surfaced a second infrastructure finding: composed
`check` runs flake all-timeout on this synced path under the
post-sitting desktop load (every failure a 5 s timeout, zero
assertion failures, single files and one full run green) — filed as
INFRA-CHECK-01 rather than green-washed; the gate for this close
runs on a settled desktop. The owner disclosed afterwards that a
game was open in the background throughout — paused during both
measured legs, actively played only in the aftermath (overlapping
red gate runs, no measurement) — recorded as the evidence section's
environment-provenance note rather than hidden.

**Link:** evidence `docs/performance-evidence.md` → D134 section
(comparison table, GC table, taint arithmetic); procedure
`docs/browser-measurement.md` → Parts B/C status lines; backlog →
PROF-04/05 removed, M13-DEF-03 filed, SYNTH-01 unblocked;
trajectory → PROF-04/05 lines; wish-list → export-settings default
line; tickets M13-PROF-04/05 deleted on ship. Artefacts local
(untracked): `bench-reports/…da5d80b-photoshop.json`,
`bench-reports/traces/…owner-partC.json.gz`.

## D135 — M13-SYNTH-01 signed: the promise binds to the driven capture leg, the 1024² 100 ms line retires, Phase 4 narrows to two bit-exact candidates (2026-08-08)

**Decision:** all four rows signed on the recommendations at the
sign-off meeting; the evidence-quality gate passed with no
route-backs (Part B's formal taint adjudicated as M13-DEF-03 harness
bookkeeping — window 1 balances, the sitting conserves, medians
unaffected). (1) **Promise:** binds as sustained rate at
`preview-update` on the automated driven capture leg — zero cadence
misses at 4 /sec, medians 40.6/30.7 ms guarded ×1.35 — with a bv2
amendment (IMPL-02's to make) letting driven *base* capture rows
carry product targets; `.edit-<class>` and real-Photoshop rows never
bind. Interaction stays published-not-bound (double-rAF race, no
Photoshop start mark — a p95 bound would encode noise). (2)
**1024²:** the brief's "≤ 100 ms" line is retired — 1024² is an
export/finishing grid bound by correctness/robustness plus honest
medians; no quality-neutral ~3× exists. The 1024 cap stays (closes
the D9/D10-era wish-list question; ×16 export is already ~2.1 GB
transient). (3) **Phase 4:** IMPL-01 activates narrowed to two
bit-exact candidates — persistent grab surface, pre-submit copy
elimination (census #1/#2, allocator confirmed in Part C) — one
candidate per measurement, capture+mem legs as before/after;
IMPL-02 activates narrowed — routing **confirmed unchanged** (no
size/palette thresholds invented; `mapPaletteGpu` stays unwired),
scope = node bv2 rebind on the implementation build + browser
target rows + env browser-version field; **IMPL-03 is cut** — the
appearance gate is not met, no material user problem lacks a
quality-neutral answer, D47 stands; the cut resolves ACCEPT-01's
third blocker. (4) **Deferrals:** small-stroke feel and PDF-freeze
acceptability become ACCEPT-02 agenda lines; eight-brand cold prep
defers behind a use trigger; the D133 app-UI trace slice is cut;
off-main-thread capture is wish-listed behind a named surface-size
trigger (> ~6.5 MP or felt stutter). Headline finding driving
IMPL-01: main-thread long tasks scale with captured-surface pixels
(zero at 4.1 MP → 11–18 % of wall at 6.5 MP), not with grid.

**Link:** evidence `docs/performance-evidence.md` → "M13-SYNTH-01 —
the synthesis" (gate verdicts, targets, decision table, IMPL-01
activation block, signed acceptance matrix, residual risks); backlog
→ SYNTH-01 removed, Phase 4 re-cut (IMPL-03 line removed, IMPL-02
blocked on IMPL-01), ACCEPT-01 blockers now IMPL-01/02; tickets →
IMPL-01/02 updated with the signed scope, ACCEPT-02 agenda appended,
IMPL-03 + SYNTH-01 deleted on ship; wish-list → three lines resolved
(1024 cap, env browser-version, trace slice), off-main capture line
added; `brief.md` performance bar annotated;
`docs/measurement-contract.md` pointer sentence updated.

## D136 — INFRA-CHECK-01: the gate's test timeouts become 30 s liveness bounds; the starved-desktop flake closes (2026-08-08)

**Decision:** raise Vitest `testTimeout`/`hookTimeout` from the 5 s
default to 30 s config-wide (`vite.config.ts`), and raise the matching
explicit floor in `tests/acceptance-matrix.test.ts` (its per-row
`Math.max(5 s, grid/100)` overrides the config exactly where it hurt).
Timeouts in `check` are liveness guards, not perf assertions — the
perf budgets live in `bench`, deliberately outside the gate (D43/D44)
— so a loaded desktop must slow the gate, never fail it. Assertions
are untouched; a genuine hang still dies at 30 s.

**Mechanism (pinned by controlled legs on this machine):** healthy
suite 3.2 s wall, slowest test 889 ms — only ~5.6× tail headroom
against 5 s. Default-QoS 2× core oversubscription inflates just ~2.9×
(green). Clamping the run to the **utility QoS band** under the same
load — where macOS puts background work while a foreground app/game
owns the machine — reproduces the sitting's exact signature:
timeout-only failures, zero assertion failures, transform/import
aggregates 32×/35×; at the background band the suite exceeds 187×.
The sitting's 10–25× sits inside that QoS envelope, and the moving
failure set (8–16 across runs) is whichever tests' inflated wall
crossed 5 s. The synced-path coupling (`check:wasm` rewriting the
111 MB `target/` + `pkg/` into the OneDrive File Provider domain just
before `check:test`) is a secondary multiplier only — unobservable
today: the sync client sat at 0 % CPU through a 100 MB in-domain
write storm, so it is recorded as unexercised, not asserted. Its
hygiene fix (churn relocation off the synced tree) goes to the
wish-list.

**Verification:** post-fix the full suite is green at utility-band
starvation (1052/1052; transform 60×, import 47×, tests 19×; 86 s
wall) and composed `check` is green quiet (16.4 s). Residual:
pathological starvation (saturated cores + a foreground game) can
exceed any finite bound — the operational rule stays "gate on a
settled desktop" (D134's practice).

**Link:** backlog → INFRA-CHECK-01 removed; trajectory → one line;
wish-list → synced-tree churn-relocation line;
`DEV-INFRASTRUCTURE.md` → Quality gate liveness-bound note;
`docs/performance-evidence.md` → residual-risks line closed.

---

## D137 — M13-DEF-03: the multi-window drop ledger folds by delta; a silent missed-callback clamp falls with it (2026-08-08)

**Decision:** drop counts fold into the cumulative `CaptureCounters`
ledger **by delta** via a new `DropLedger` (`src/bench/counters.ts`),
and each live window publishes its own totals separately
(`window pump drops` / `window client drops` beside `window
callbacks`, with the `counter …` block cumulative throughout). The
harness no longer assigns a window value into a cumulative field.

**Why it looked right:** the two drop sources run on different
clocks. `PumpGate` is constructed per measurement window, so its
count restarts at zero and the `pumpDropsBefore` subtraction was
always a no-op; the worker client outlives every window and only
grows. Subtracting a "before" reading from each therefore *looks*
symmetrical while producing a per-window number for a field whose
siblings (`submitted`, `results`, `callbacks`) accumulate. From
window 2 the conservation identity was short by exactly the earlier
windows' drops, and each later window's first interval delta went
negative. Automated runs never showed it: the driven source drops no
frames, so `pumpDrops` carried the identical defect purely latently.

**The D134 arithmetic is unchanged.** Re-checked against the fixed
ledger: 720 submitted = 491 results + 229 drops + 0 errors + 0 in
flight, and the per-window drops (49 / 122 / 58) are what the fold
now computes. The sitting's two conservation findings and its
−22 / −106 interval deltas were artefacts of the reset and are gone;
no measured quantity moves, so every D134 conclusion — and the D135
synthesis resting on it — stands as signed.

**A sibling, found by the same review and worth more than the
original:** `rvfc missed callbacks` compared a per-window
`presentedFrames` delta against the *cumulative* callback total, so
`Math.max(0, …)` clamped it to zero for every window after the
first. D134 published 0 missed callbacks for windows 2 and 3 where
119 and 81 were true — a wrong number presented as a good one, where
the drop defect at least announced itself as a taint. Now measured
against `windowCallbacks`. Raw meta only: no narrative or target
cited it, and window 1's 52 was always correct.

**Scope:** harness-only. Nothing in `src/core/`, `src/worker/` or the
app path is touched, so no measured row and no budget moves. The
manual multi-window sitting is unblocked; validating it against a
real 30 fps surface (share, then buttons 6, 6, 6b, 8) is human by
policy and rides the next owner sitting.

**Link:** backlog → M13-DEF-03 removed; trajectory → one line;
`docs/performance-evidence.md` → the D137 section plus the closed
residual-risks line; tests → `tests/bench-counters.test.ts` (the
D134 numbers as a regression fixture).

---

## D138 — M13-IMPL-01: both signed candidates land; the before/after pair does not (2026-08-08)

**Decision:** the two D135-approved candidates are implemented and
correctness-proven; the item stays **open** on its evidence half. No
run made while implementing them is quoted.

**What landed.** Candidate 1: one `OffscreenCanvas` per session
(`src/capture/surface.ts`), resized in place on a crop change, instead
of a fresh canvas + context per accepted frame (census #1). Candidate
2: the pump's pre-submit `new Uint8ClampedArray` is gone — the grab
buffer is transferred (census #2). They land together because
candidate 2 is only safe *because of* candidate 1: the retained
surface still holds the frame after its buffer detaches, so
`snapshot()` re-reads it with no `drawImage` and the copy is paid only
when a consumer appears. The one-candidate-per-**measurement** rule is
untouched.

**Two things the census did not say.** A reused surface composites
`source-over` by default — a no-op only while the source is opaque.
Capture video is, but exactness must not rest on that, so the draw is
explicit `globalCompositeOperation = 'copy'`. And a transferred array
keeps its geometry while losing its bytes, so a bare read returns a
correctly-sized *blank* picture; one pure rule
(`src/capture/master-image.ts`) now guards every pixel read, and a
refill that cannot deliver reports no source rather than an empty one.

**Two hazards found while implementing, neither in the ticket:**
ending a capture session would have taken the design with it (the
pixels live on the grab surface, not in `masterImage`) — `endCaptureUi`
now rescues the last frame into a still first, and `snapshot()`
survives `stop()` so the browser's own stop-sharing path can too; and
the profile editors hold the design still across awaits, unlike every
other consumer, so their hook returns a detach-proof copy.

**Why no before/after.** The material reason: the automated capture
leg *cannot* price candidate 2. `src/bench-browser.ts`'s pump submits
its grab buffer directly and keeps no master image, so the app's
per-frame copy never existed in the harness; a zero delta there
reported as "no regression" would be measuring the wrong workload.
Candidate 1 shares the app's `grabFrame` and is priced honestly.
Closing that fidelity gap is a harness change and must not ride the
same run as a candidate — wish-listed. The practical reason: of five
attempts, one pair came back valid, and it measured neither the
baseline nor the final source and carried the parent commit's build id
(the work was uncommitted). It proves the legs run on this desktop and
nothing about the change. The owner runs the pair later.

**Scope:** `src/capture/` plus the master-image reads in `src/main.ts`;
nothing in `src/core/` or `src/worker/`. `check` green (1,070 tests, 15
new); boot check clean. Live capture is browser-only and rides the
owner's measurement pair.

**Link:** backlog → M13-IMPL-01 `[~]`; `docs/performance-evidence.md`
→ the D138 section; wish-list → the harness-fidelity line; tests →
`tests/capture-surface.test.ts`, `tests/capture-master-image.test.ts`.

---

## D139 — M15-GALLERY-01 batch 1: eight candidates drafted and reviewed, unsigned (2026-08-09)

**Decision:** eight built-in profiles are drafted into
`builtInProfiles()` — five rule-shaped (Autumn leaves, Golden hour,
Winter frost, Deep sea, Neon noir) and three curated (De Stijl
primaries, Delft blue, Ukiyo-e woodblock). They ship as code but are
**unsigned**: the owner curates names and membership per batch (D115).
This batch establishes the evidence format the rest follow. A review
pass ran before signature and its follow-ups are folded in here.

**The split is a claim, not a convenience.** Rule-shaped where the
style genuinely is a band of colour space; curated where a rule would
misdescribe it. No HSB band produces "red, blue, yellow, black,
white" without dragging in every neighbouring shade.

**A stated criterion was wrong and is corrected.** Scoping proposed
"roughly 8–60 entries" as the acceptance band, which would have
rejected every shipped range profile (Sepia 346, Pastels 965). A range
profile is the *eligible universe* the colour-count limit selects
from. The bound now counts **distinct colours**, not entries — 3,338
threads render as 2,830 distinct colours (D55/D56) — and is recorded
in `conventions.md`, because the wrong intuition is specific and
repeatable.

**Evidence format, set here:** each candidate rendered through the
real pipeline on the sample card at the default eight-colour limit,
reported as its selected colours with each colour's share of the
image. The eligible count alone cannot say whether the style reads —
and twice here it did not.

**Two candidates changed under that evidence.** Neon noir was retuned
twice: its cyan pole started at hue 170, which is sea green, and won
the image at 43 % while the dark floor gave 9 % — tropical, not noir.
Loosening the floor to saturation 35 then handed 30 % to a dark olive
— swampy, no better. The floor has to stay genuinely neutral to read
as black, so it is saturation ≤ 12 taken deeper (brightness ≤ 35): 32
near-neutral darks with no greens among them. Delft blue lost B5200,
a second white one step from 3865, which freed the slot its ladder
needed.

**A test was written and removed, which is the more useful finding.**
"No two colours the eye cannot separate" is not expressible as a
distance threshold: the duplicate white was 21 apart in RGB, but the
shipped Classic set has two greens at 18 and Delft's own navies sit at
15. Every threshold that catches the duplicate condemns a deliberate
tonal rung. The difference is intent — which is what owner curation is
for, and a gate there would have been theatre.

**The naming guard nearly became the thing it guards against.** A
second review caught the widened trademark list matching as
substrings: `ral` sits inside "Coral reef" — a candidate in this very
ticket — and `lego` inside "Allegory". It was whole-word anchored, and
the test now asserts in both directions, because a guard that rejects
a legitimate name is worse than none: the fix looks like renaming the
profile.

**Left deliberately:** rule-shaped profiles keep `libraries: allBrands`,
following Sepia/Pastels. Restricting only the gallery to DMC would
make these behave differently from the two profiles beside them in the
same menu; it is one word per profile and it is the owner's call.

**Scope:** `src/core/color-profile.ts`, its test, and a
`conventions.md` line. No UI change, no change to
`resolveProfileMembership`, no protected file touched. `check` green.

**Link:** backlog → M15-GALLERY-01 batch 1 pending signature;
curation sheet published; the photo-slot half of the evidence format
is blocked on owner-supplied images (`public/profile-demo/` is empty);
the catalogue oddity is wish-listed.

---

## D140 — M15-GALLERY-01 batch 1 signed as-is; two open questions closed by the owner (2026-08-09)

**Decision:** the owner signed all eight batch-1 candidates unchanged
— Autumn leaves, Golden hour, Winter frost, Deep sea, Neon noir, De
Stijl primaries, Delft blue, Ukiyo-e woodblock. Names and membership
stand as drafted (D139). They are now shipped built-ins, not
provisional, and batch 2 may start.

**All-brands stands.** Rule-shaped profiles keep
`libraries: allBrands`, matching shipped Sepia/Pastels. The known
cost is accepted: one eight-colour design can call for thread from
five brands. The reasoning is that the multi-brand shopping list is a
*selection* concern — which threads get picked from the eligible set —
not a membership one, so narrowing the gallery would be working around
the symptom. It also keeps these eight behaving like the two profiles
beside them in the same menu.

**Neon noir signed with its residual named.** Its largest area is a
mid grey-taupe rather than true darkness, after two retunes. A rename
was recommended and **declined**: the neon poles do read, and the
catalogue holds too few near-blacks to carry the name any harder. This
is recorded because the next reader will see the grey and take it for
an oversight — it is a decision. Changing it needs the owner, not a
tidy-up.

**Left standing from D139:** the photo-slot half of the evidence
format is still blocked on owner-supplied images
(`public/profile-demo/` holds only its README), and the catalogue's
`ariadna:1650` row — a cyan-white named "heather very light" — is
still wish-listed for an owner call. Neither gates the signature.

**Scope:** comment text in `src/core/color-profile.ts` recording the
signature and the Neon noir decision; memory. No recipe, no rule and
no membership changed — the signature is the whole change. `check`
green.

**Link:** backlog → M15-GALLERY-01 batch 1 signed, item stays open for
later batches; trajectory → one line; D139 is the drafting and review
record and stands unamended.

---

## D141 — M13-IMPL-01 closes: the pair is clean, the grab term moves, the end-to-end span does not (2026-08-09)

**Decision:** both candidates are **kept**, and M13-IMPL-01 closes.
The persistent grab surface is priced and pays; the pre-submit copy
elimination stays unpriced by construction (D138) and is kept on its
correctness proof plus the D71 census, not a measured delta.

**The pair.** Baseline `138cd0f` → after `3bfe7ef`, both **valid on
attempt 1**, same shared surface (2080 × 1948) and driven cadence.
Each leg was built in its own detached worktree: a build from an
uncommitted tree carries the parent commit's sha, which would have
stamped both reports identically. Full tables in
`docs/performance-evidence.md` → the D141 section.

**What moved.** `grab median ms` — the term candidate 1 owns — fell in
**8 of 8** windows, mean −2.9 ms (canonical −16 % and −13 %). One pair
of runs proves little; eight independent windows moving together is
what carries it.

**What did not, and why that is the honest headline.**
`preview-update` medians went the other way by a hair: +0.20 to
+1.20 ms across seven rows (interaction −2.90). The sign is
consistent, which is not nothing — but per-row standard deviation is
~9.5 ms, so half a millisecond is not separable from drift on one
pair. Recorded as **flat**, neither claimed as a regression nor
explained away.

**Why a 3 ms saving buys no latency.** At the driven 250 ms cadence
the path is not grab-bound: long tasks 0 in both runs, drops 0 in
both, submitted = results = 120 with nothing in flight. The span is
owned by worker processing and the drive interval, so removing
main-thread allocation returns **headroom, not latency** — precisely
the term the D135 surface-size trigger worried about growing with the
crop.

**Two things the pair does not measure.** The mem leg's plateau
verdict is identical across it, but that leg's workload is synthetic
noise and never calls `grabFrame`, so the census-scale allocation
claim still rests on the D71 arithmetic and the deterministic test —
only candidate 1's *time* half is measured here. And candidate 2
remains unpriced: the harness pump never carried the copy (D138), a
gap that stays wish-listed rather than being closed on the same run as
a candidate.

**No regression elsewhere:** 4.0 updates/sec on every row before and
after, `npm run bench` green at 22 passed, nothing in `src/core/` or
`src/worker/` touched.

**Link:** backlog → M13-IMPL-01 removed, M13-IMPL-02 unblocked;
trajectory → one line; `docs/performance-evidence.md` → the D141
measured section; D138 is the implementation record and stands
unamended.

## D142 — M13-IMPL-02: the promise becomes an assertion; bindability is enforced in code, not convention (2026-08-09)

**Decision:** M13-IMPL-02 closes. The routing half is **record-only**
as D135 signed it — categorical `lab → ts` / `rgb → wasm`, no
thresholds, no selection code touched. The budget half lands in full.

**The promise is now asserted.** Until now "≥ 4 preview updates/sec"
was a sentence in the brief. It is now a gate: `bench:auto` fails when
the driven capture leg's sustained rate drops below 4/sec, or any
frame is missed or dropped. It binds as a **rate with zero misses**,
never a latency percentile — a fast median while frames are dropped is
not the promise being kept. A **missing** counter fails rather than
passes: the claim is not "no misses were reported", it is "misses were
counted and there were none", which is the only version D43's
no-green-washing rule can hold.

**Bindability is enforced, not documented.** The bv2 amendment lets
driven *base* capture rows carry a target, because that environment is
reproducible. `.edit-<class>` rows (driven at their own cadence) and
anything measured against real Photoshop (content and timing nobody
controls) never can. `assertBindable` checks this against the key
rather than trusting the table, so a future edit cannot quietly bind an
unbindable row. `interaction` stays published-not-bound (D135).

**The node rebinding is drift, not a win.** All ten rows re-took
1.7–4.3 % faster on the implementation build — uniformly, so it is
environment/JIT, not any stage. Nothing here is an IMPL-01 effect: no
node row observes the capture path (D141). The take is only as good as
the machine: an earlier one of the same build, minutes after a full
`check`, put `reduce` at 21.1 ms on a single 65 ms sample — enough to
fail its own guard, and correctly *not* tainted, since nothing about
that sample was implausible. The remedy is a settled machine, never a
widened tolerance.

**Link:** backlog → M13-IMPL-02 removed, M13-ACCEPT-01 unblocked;
trajectory → one line; ticket deleted; two doc-deltas captured
(AGENTS.md, DEV-INFRASTRUCTURE.md).

## D143 — M13-ACCEPT-01 passes: the machine half is done, every leg valid first time (2026-08-09)

**Decision:** M13-ACCEPT-01 closes on build
`v0.5.0+20260809.b4cf665`. M13-ACCEPT-02 is unblocked and is the only
thing left in M13.

**What passed.** Node: `check` (1090), `matrix` (267), `bench` (22) on
the rebound baselines. Browser: capture, mem, trace and backend legs
all VALID on **attempt 1**. The promise measured 37.6 ms at 300² and
29.5 ms at 200², both at 4.0 updates/sec with zero missed callbacks and
zero drops — the first time a miss would have failed the command rather
than needed a reader to notice. GC re-confirmed as a non-source: 0.30 %
of wall over 163 s, worst pause 1.8 ms, zero observer long tasks.
Backend: 66 cells EXACT, indices sidecar EXACT in all of them, both
fallback probes PASS with M13-DEF-01 not regressed.

**A leg became a command.** The backend comparison had no one-command
path — the leg list was hardcoded to capture/mem/trace — so
`bench:auto -- --backend` was added with `validateBackendReport`. This
is ACCEPT-01's own "focused backend commands activated by synthesis",
not new scope. Its third check earns its place: mismatches already
taint via the leg's findings, but a suite that measured **zero** cells
would otherwise look identical to one where everything agreed, so a
zero-comparison report now fails.

**Attribution is honest about its limit.** The new env `browser` field
reads `Chrome 151.0.0.0` because Chromium serves a reduced UA with
minor/patch frozen. That answers what D128 asked — which *release* —
and the full version would need an async high-entropy call, making
report assembly async for a digit nobody has needed. Recorded rather
than dressed up.

**Alternatives rejected:** re-running the browser legs in an embedded
browser (not a legitimate measurement surface); accepting D69's
backend evidence as still-current rather than re-taking it (ACCEPT-01
says green on *final* code).

**Link:** backlog → ACCEPT-01 removed, ACCEPT-02 unblocked and now
M13's only open item; trajectory → one line; ticket deleted; run sheet
`docs/acceptance-m13-live.md` prepared and pinned to the passing build;
evidence `docs/performance-evidence.md` → the M13-ACCEPT-01 section.

---

## D144 — M15-GALLERY-01 batch 2: eight candidates drafted, unsigned; the evidence run becomes reproducible (2026-08-09)

**Decision:** eight more built-in profiles are drafted into
`builtInProfiles()` — four rule-shaped (Rainforest, Spring meadow,
Gemstones, Moorland) and four curated (Art deco, Mid-century modern,
Fair Isle, Fluoro spot print). They ship as code but are **unsigned**:
the owner curates names and membership per batch (D115). Curation
sheet published.

**The batch was picked against gaps, not down the ticket's list.**
After batch 1 the gallery had no greens at all, nothing that narrows
on chroma rather than hue, nothing muted, and a culture half entirely
of pre-war Europe and Japan. Rainforest and Spring meadow are one hue
arc split at brightness 52 — canopy greens, meadow greens — so neither
carries a band the other lacks. Gemstones narrows on saturation alone
and Moorland is its mirror; those two are the first rules in the
gallery with no hue band, which is the honest shape for "defined by
chroma".

**Batch 1's evidence could not be regenerated, so it was rebuilt and
then committed.** D139 set the format but not the method, and the
published numbers matched none of the obvious readings until dithering
was included: the app's default Floyd–Steinberg is what turns an edge
into a mix, so undithered shares describe an image nobody sees. With
resize → select at the default eight → full pipeline with dither, the
batch-1 sheet reproduces to within a few tenths of a point on every
row. That run is now
`tests/audits/profile-gallery.audit.test.ts`, `AUDIT=1`-gated beside
the perf audits: batch 3 quotes numbers instead of re-deriving them.

**A trademark nearly shipped from the ticket itself.** The candidate
list says "Risograph print"; Risograph is Riso Kagaku's mark, and it
reads as a printing technique, which is exactly the good-faith failure
D115's naming rule is for. It ships as **Fluoro spot print** and
`riso` joins the guard list — whole-word anchored, asserted in both
directions so it bites "Risograph print" and still passes "Risotto
cream", per the D139 anchoring lesson.

**Left for the owner, both named on the sheet:** Art deco's Pearl Grey
takes 43.8 % of the card because that card carries a greyscale ramp a
photograph would not — chrome is a real deco colour, so this may be
the card flattering it rather than a fault, and the alternative (415 →
3799) costs Black, which falls to 2.6 %. And `finca:4368` (`#2d6153`)
has an **empty name** in the catalogue: a second bad row beside
`ariadna:1650`, surfaced by Rainforest. Owner data, protected,
wish-listed.

**Scope:** `src/core/color-profile.ts`, its test's naming guard, and a
new audit file. No UI change, no change to
`resolveProfileMembership`, no protected file touched. `check` green
(1091 tests).

**Link:** backlog → M15-GALLERY-01 batch 2 pending signature;
trajectory → one line on signature, not before; D139 and D140 stand
unamended.

---

## D145 — M15-DATA-01 opens: the catalogue gets swept once instead of a row per batch (2026-08-09)

**Decision:** the owner's ask for a verification pass over the colour
listings becomes M15-DATA-01, and the two wish-listed bad rows are
promoted into it. Rule-shaped profiles read all 3,338 rows, so every
gallery batch turns up another one — finding them singly is the
slowest possible route to a clean list.

**A first scan is in the ticket so the item starts with evidence.**
Two classes are certain: **21 rows carry no name at all**, and every
one is Finca — about a tenth of that brand, so it reads as one gap in
that ingest rather than 21 slips. The name column is empty in the
owner CSV itself, so the generator is innocent. **11 same-brand pairs
share a hex**; across brands that is normal and deliberate (D55/D56),
within one brand it is likelier a transcription slip. Every brand+reference pair is
unique and every hex is well formed.

**The class that matters resists automation, which is the finding.** A
crude name-versus-hue probe returns 402 hits and is mostly false
positives: compound names — "Blue Green", "Antique Violet" — sit
legitimately between their two words, and a near-neutral row's hue
means little. `ariadna:1650` (a cyan-white named "heather") is
qualitatively different. So the sweep reports evidence for judgement;
it must not auto-flag, and it must not gate `check` over data the
agent may not edit.

**Out of scope, deliberately:** checking the measured hexes against
each brand's published values. All 3,338 carry provenance `measured`
and no published source is in the repo — that is its own work, with
ICE-XREF-01's data problem.

**Link:** backlog → M15-DATA-01 under M15 Next with a `[detail]`
ticket; wish-list → the two rows promoted out; D144 recorded them as
wish-listed and stands unamended.

---

## D146 — M15-GALLERY-01 batch 2 signed as-is; the gallery reaches sixteen (2026-08-09)

**Decision:** the owner signed all eight batch-2 candidates unchanged —
Rainforest, Spring meadow, Gemstones, Moorland, Art deco, Mid-century
modern, Fair Isle, Fluoro spot print. Names and membership stand as
drafted (D144). They are shipped built-ins, not provisional, and batch
3 may start.

**Art deco is signed with its residual named**, the same conduct Neon
noir got at D140. Pearl Grey takes 43.8 % of the evidence card because
that card carries a full greyscale ramp and hands the mid grey area no
photograph would. The alternative was offered and not taken: 415 →
3799 buys a deeper shadow and drops Black to 2.6 %. The next reader
will see the grey and take it for an oversight — it is a decision, and
changing it needs the owner.

**The rename stands.** "Fluoro spot print" ships in place of the
ticket's "Risograph print", and `riso` stays in the naming guard.

**Two findings left the wish-list for the queue**, at the owner's ask
that findings live in the backlog rather than the inbox: the missing
profile-demo photos become **M15-EVID-01** (owner action — three of
the five test-preview slots render "Image offline", so every batch so
far has been judged on the generated card alone, and a style that
reads on a synthetic hue sweep is not proof it reads on a face), and
the audit suite's post-M8 drift becomes **ICE-AUDIT-01**, surfaced
again when batch 2 added an audit file and ran only that one.

**Scope:** comment text in `src/core/color-profile.ts` recording the
signature and the Art deco decision; memory. No recipe, no rule and no
membership changed — the signature is the whole change. `check` green.

**Link:** backlog → batches 1 and 2 both signed, item stays open for
batch 3; two items added; trajectory → one line; D144 is the drafting
record and stands unamended.

---

## D147 — Six demo images land, the slot list grows to six, and M16 opens (2026-08-09)

**Decision:** the owner supplied six 2048² demo images; they are in
`public/profile-demo/` and `PHOTO_SLOTS` grows from four to six to use
all of them. M15-EVID-01 closes.

**The slot list was a guess and the images are the fact.** The four
slots were named before any image existed — `landscape.png`,
`cartoon.png`, `portrait.png`, `text.png`. What arrived is two
landscapes, a portrait, a flat-colour graphic, stained glass and text,
five of them JPEG. Bending six images into four slots would have
thrown away the two that test a profile hardest: a second landscape is
what stops one lucky picture reading as proof, and stained glass —
saturated colour against black leading — is the case a rule-shaped
profile fails first. So the list took the images' names, extensions
included, rather than the reverse.

**Verified rather than assumed:** all six fetch with an `image/*`
content type (the loader's guard rejects anything else, which is how a
missing file stays an honest "Image offline"), and each renders
through the real pipeline in the editor — six canvases, no offline
state. The repo grows 5.3 MB; the images are owner data and were not
recompressed.

**A defect fell out of looking.** In the editor's Libraries list each
`Browse` button sits after a variable-width brand name in a flex row,
so eight buttons start at eight different left edges (129–157 px at
1280 px wide). Filed as M15-UI-05 — it is the first thing visible in
the editor the acceptance sitting judges.

**M16 is committed, not scoped.** The owner's export-settings ask from
the D134 sitting — print-sized defaults, grid lines and numbering on —
was called a milestone at the time and had been sitting on the
wish-list since. It becomes **M16**, opening with a `[sign-off]`
scoping item, because "print-ready by default" spans four exporters
and a migration and should not be guessed at.

**Scope:** `src/ui/profile-editor-preview.ts`, its test, the
profile-demo README, six images, memory. `check` green.

**Link:** backlog → M15-EVID-01 removed, M15-UI-05 and the M16 section
added; wish-list → the export-settings line promoted out; trajectory →
one line.

## D148 — M13 ships on its maintainer gate; M15's acceptance closes with it (2026-08-09)

**Context.** The combined sitting (`docs/acceptance-combined-session.md`)
ran nine legs in one sitting to close M13-ACCEPT-02, M15-ACCEPT-02,
M15-DITH-05 and the M8-GOLD-01 rider. It ran on HEAD
(`v0.5.0+20260809.0642be5`), not the sheet's pinned `b4cf665`: no file
on the processing path had changed since that build, so the pairing
with ACCEPT-01's automated evidence held, and M15 could not run on the
pinned build at all.

**Decisions.**

- **M13 ships.** Live editing at 200² and 300² was judged responsive;
  no gap at or below 300², so M13-SYNTH-01 was never reopened. All four
  D135 agenda lines signed — three accepted outright, cold prep
  **accepted at this workload only** at a measured **6 s**, roughly
  double D135's 1.3–3.3 s estimate. The estimate was wrong, not the
  behaviour; the line is now triggered rather than hypothetical.
- **The gallery closes at sixteen**, and its forty unbuilt candidates
  are *kept*, not cut — the owner asked for them to survive the close,
  so they became ICE-PROFILES-02 with the signed-batch process attached.
  Closing an item does not have to destroy its queue.
- **Golden fixtures approved** (M8-GOLD-01, standing since 2026-07-22)
  — with all five methods freshly judged, this was the best-evidenced
  moment the decision would get. The owner's suggested source
  (`landscape-1.jpg`) was declined *as a file* and kept *as content*: a
  golden fixture must stay diffable when it fails, and JPEG decoding
  varies across platforms, which would break bit-exactness for reasons
  unrelated to the dither maths. M8-GOLD-02 carries a small JSON crop
  in the existing 8×8 house style.
- **The access leg was part-deferred** rather than guessed. Keyboard,
  focus, 200 % zoom and the narrow width passed; the screen-reader half
  became A11Y-VO-01. An open gap recorded honestly beats a pass nobody
  performed.

**The sitting's own findings.** Nine were captured, all iceboxed:
ICE-ZOOM-01 (canvas jump on first wheel zoom), ICE-KEY-01 (the PDF key
prints the hex twice), ICE-EXPORT-01, ICE-GLOBALERR-01, ICE-STALE-01,
ICE-SAVE-01, ICE-FLICKER-01, ICE-VARIANTS-01, ICE-WIDTH-01/02. Two are
worth remembering together: **ICE-KEY-01's function was already unit
tested and green**, because the fixture used a *named* web-safe colour
while the broken majority are named by their hex — which is the whole
argument for ICE-EXPORT-01, asserting the artefact rather than the
helper. And the run sheet's own step 5 turned out unrunnable: it asks
for the diagnostics bundle on a build its step 2 requires be
production, where that control is dev-only.

**Scope.** `src/ui/styles/base.css` (M15-UI-05), backlog, trajectory,
decision-log, wish-list, three ticket files deleted, one added,
`docs/acceptance-combined-record.md` added.

**Link:** M15 becomes Current, M16 becomes Next. M15-DATA-01 and
M16-SCOPE-01 were queued for this session and did not run — the sitting
took it.

## D149 — Roadmap reorganisation: the output half becomes the critical path, the audience widens, and a fifteen-item batch precedes it (2026-08-11)

**Decision.** A whole-queue review, at the owner's request, with three
outcomes: a restructured backlog, four owner answers that change scope,
and a batch built to be run gatelessly.

**The structural finding.** M13, M14 and M15 all shipped work on the
*input and appearance* side of the app — performance, UI, colour
profiles. Meanwhile M9–M12 (symbols, multi-page charts, grid styling,
fabric and thread estimates) had sat deferred since 2026-07-22 (D63).
The brief's second success criterion — "a stitchable chart PDF can be
printed from a captured design" — is therefore still unmet: today's PDF
is one page, colour cells only, screen-sized, no symbols, and its thread
key prints the hex twice (KEY-01). The app is an excellent lens attached
to an unfinished pattern. Those five milestones become **Track A, the
printable pattern**, ordered M9 → M11 → M16 → M10 → M12, and Track A is
Next.

**M16 demoted from milestone to task.** Its ask — grid lines and major
numbering on by default — *is* an M11 preset choice, and print-ready
defaults cannot be settled before M9 decides whether a chart cell
carries a symbol. It was a defaults change to furniture that does not
exist yet, sitting in front of the milestones that build the furniture.

**Ship order stops tracking milestone number.** M9–M12 now ship after
M13–M15, and M16 after M11. The numbers stay because they are greppable
across ten ticket files and 149 decision entries; renumbering would cost
that for no gain. The backlog states the order explicitly instead.

**Batch C0 precedes Track A**, and is the argument the owner asked for
about running a large gateless (auto-jazz) batch. Fifteen items with
confirmed mechanisms, named acceptance conditions and no taste required:
the 2026-08-09 sitting's findings plus the tooling debt that made that
sitting expensive. Three of them run first because they are
preconditions for *trusting* a gateless run at all:

1. **RENAME-01** — a large run writes prose, decision entries and
   identifiers; every one written under the old name becomes rename
   surface. Cheapest now.
2. **The doc-sync pass**, plus the hot-read drift fixed in this entry.
3. **AUDIT-01 + ROUTE-01** — `npm run audit` is red (2 files / 2
   tests), so the audits currently give the agent no signal.

The general principle, worth keeping: before a long gateless run, fix
the things that make failure legible. A red audit suite, a diagnostics
buffer that evicts real faults for browser noise (DIAG-01), and export
helpers that pass while the artefact is wrong (EXPORT-01) are precisely
the conditions under which an unattended run does damage nobody sees.

**Owner answers that changed scope.**

- **The audience widens.** The owner intends to publish online to a
  broader audience who "could be using it on anything". "macOS-first,
  personal creative use" is no longer the product, only where it was
  built and measured. Recorded in `brief.md`.
- **ICE-ADJUST-01 survives, and the recommendation against it was
  wrong.** The review argued for cutting it: tonal sliders duplicate
  Photoshop, which the user has open beside the app and which does it
  incomparably better. That argument rested entirely on the upstream
  editor being there — and a broader audience may have nothing of the
  kind. The owner also holds that controlling the final image process
  *is* the point of the app, and asked for colour thresholds as presets.
  Rescoped rather than kept as-was: build it as a **third profile kind**
  on M15's kind-agnostic editor shell, beside colour and dither, because
  "available as presets" is exactly what that shell already does and a
  third kind is the shape it was built for. It is the presumptive
  milestone after Track A.
- **DUR-01 opened.** There is no autosave, no session restore and no
  unsaved-work guard; `beforeunload` appears nowhere in `src/`.
  IndexedDB holds *library* data only, localStorage holds accordion
  state, and the design in progress exists only if you save a file —
  mitigated by one sentence at `src/main.ts:1971`. M14-AUDIT-02
  confirmed the silent loss at D75 and it was never opened as work. It
  is the highest-severity open product defect and it was not in the
  backlog at all. Ships with SAVE-01: same subject.
- **The rename is real.** Promoted from the wish-list, where it had sat
  since 2026-07-20, and sequenced first. Its tier is the one blocking
  question — the preferences key and the IndexedDB database name need
  migrations or an existing install loses its accordion state,
  inventory, palettes and profiles, and the repo/remote/directory tier
  is the owner's to perform, not the agent's.

**A dependency nobody had noticed.** M9's ticket makes font and asset
licensing a first-class milestone decision. "Embeddable for personal use
in a local web app" and "redistributed inside a published app" are
different licence answers, so ICE-TAURI-01's distribution intent is now
an *input* to M9 rather than an unrelated spike. Settle it first or pick
symbol assets twice.

**Splits and narrowings.**

- **M15-DATA-01 split three ways.** As written it chased the cosmetic
  class and excluded the consequential one. A thread's *name* is
  decoration (identity is `brandId:reference`, RGB is display-only —
  D55/D56); a wrong **hex** misrenders the design. DATA-01 keeps the two
  machine-certain classes and runs in the batch; DATA-02 holds the
  name-versus-colour probe (402 hits, mostly compound-name false
  positives); DATA-03 holds the published-values data ask, blocked on
  owner data.
- **A11Y-VO-01 split.** A11Y-01 asserts every control *has* an
  accessible name, hand-rolled over `tests/ui-styles.test.ts` with no
  new dependency; A11Y-VO-01 keeps the part a person has to hear —
  whether the announcements are any good. A short VoiceOver crawl
  instead of a long one.
- **ICE-VARIANTS-01 narrowed** from four axes (including a 2→256 sweep)
  to one bounded axis: the five dither methods from a frozen still. It
  is the best idea in the Icebox — it fixes choosing by memory — but a
  grid is many pipelines, so let one axis earn the rest.

**Cuts and corrections.**

- **ICE-AUTOMATE-01 cut.** Its deliverable was the
  automatable/partly/human-only triage, and that triage was already
  written in the item. It has become the ordering rationale for Batch C0
  and this entry; keeping the item would have been keeping a finished
  piece of work in the queue.
- **ICE-TRANSCRIPT-01's stated blocker was already fixed.** The item
  claimed `_transcripts/*.md` was absent from `.gitignore`; it is at
  line 42 with a `!README.md` exception, and the folder and README
  exist. Only the save-or-retire question remains, as DOCS-01. In 26
  days the close ritual has produced zero transcripts, so retiring the
  reminder is a real option: a reminder nobody obeys trains the reader
  to skim the close.
- **Hot-read drift corrected, and this is why item 2 runs early.**
  `architecture.md` claimed "IndexedDB for autosave/session state"
  (there is none) and schema **v4** (the code is v5). `README.md` said
  M15's acceptance was pending and the M13 remainder was next (both
  shipped), and still advertised the settings-panel collapse and
  preview-focus mode (retired at M14), the capture region as
  aspect-locked to the pattern (default-off since D107), and
  lock/**prefer**/exclude (prefer retired, exclude dissolved into
  membership at M15). Every session hot-reads those files; a gateless
  run would have built on all of it.

**Memory maintenance, folded in.** Three of four accreting files were
over budget. `backlog.md` Active: **4,207 words → 2,000** against a
1,500 budget, by moving fifteen items' traced mechanisms into one shared
run sheet (`tickets/BATCH-C0.md` — one file, not fifteen, because they
ship together) and tightening the Icebox to the grammar's two lines.
The residual overrun is honest rather than green-washed: 36 open items
at two lines each has a floor near 1,800, and Batch C0's fifteen lines
evaporate when the run lands. `trajectory.md`: **3,225 → 1,005 words**,
M13's remainder and all of M14 archived to
`archive/trajectory/trajectory-0004-2026-08-04-to-2026-08-09.md`, and
M15's two separate sections — one "in progress", one "agent work
complete" — merged into one **SHIPPED** section, which was itself drift.
`decision-log.md` is at 43 live entries against a 20 budget; the archive
split is **proposed, not performed** — it is the most delicate protected
file, agents read only the latest ten headings, and splitting it in the
same commit as everything else would have buried the diff.

**Alternatives rejected.** Renumbering the milestones into ship order
(breaks greppability across tickets and 149 entries for cosmetic
tidiness). Keeping M16 as a milestone (it cannot be specified before M9
and M11). Cutting ICE-ADJUST-01 (the argument depended on an upstream
editor the new audience may not have — see above). Running the autojazz
batch immediately (the rename, the doc drift and the red audit suite all
get more expensive, not less, once a large run has written over them).
Compressing Batch C0's traced mechanisms away to hit the word budget:
they were paid for at an expensive sitting and are the difference
between a twenty-minute fix and a two-hour rediscovery.

**Scope.** `backlog.md` (rewritten), `trajectory.md`, `brief.md`,
`architecture.md`, `README.md`, `wish-list.md` (triaged, three lines
left), `doc-deltas.md` (+4, now 9 open), `archive/INDEX.md`,
`archive/trajectory/trajectory-0004-*.md` (new),
`tickets/BATCH-C0.md` (new), `tickets/M15-DATA-01.md` →
`tickets/DATA-01.md`. No source changed; `check` green before and after.

**Link:** Batch C0 becomes Current, Track A becomes Next, Track B and a
regrouped Icebox follow. RENAME-01's tier is the one answer needed
before the batch can run.

## D150 — RENAME-01: the product becomes Pattern Mapper; two storage identifiers are treated differently on purpose (2026-08-11)

**Decision.** The rename ships at the owner's chosen tier 3 ("everything
you can"). Every user-facing string, both HTML titles, the diagnostics
bundle and email, three error messages, the Rust crate description,
`package.json`, the launch config, all live docs including the protected
trio, and the localStorage key now read **Pattern Mapper**. Two things
deliberately do not.

**The IndexedDB database name stays `cross-stitch-lens`.** This is the
substantive decision in the entry, and it is a refusal, not an
oversight. IndexedDB has no rename operation: changing `DB_NAME` does
not move a database, it points at a different, empty one. Migrating
would mean opening both connections and copying four object stores —
`inventory`, `palettes`, `profiles`, `user-colors`, which between them
hold the owner's hand-curated thread inventory and every profile they
have signed — then carrying that copy path forever, all to change an
identifier no user will ever see. The value is zero and the downside is
losing curated data to a migration that fails halfway. Storage keys
outliving product names is ordinary practice. The reasoning is written
onto the constant so the next agent does not "finish the job".

**The localStorage key *was* renamed**, and the asymmetry is the point:
`cross-stitch-lens.shell` → `pattern-mapper.shell` with a legacy
fallback read is three lines inside a pure function whose worst failure
mode is falling back to defaults. A data-copy across four async object
stores is a different kind of change. One is safe, so it happened; the
other is not, so it did not. `loadPreferences` prefers the current key
whenever it holds anything, so a post-rename write is never overridden
by a stale legacy record, and the legacy key is **not deleted** after a
successful read — it costs a few hundred bytes and means a downgrade to
an older build still finds its preferences. Five tests pin all of it:
legacy read, current-wins, forward migration on write, legacy record
left intact, and both-absent falling back to defaults.

**Deliberately untouched.** `pm_skills/project/archive/**` and every
existing `decision-log.md` entry (append-only history — the app *was*
called Cross Stitch Lens, and rewriting that would make the record
lie), and `bench-reports/**` (recorded measurements carry the name in
provenance strings; renaming a measurement rewrites history).
`docs/requirements.md` had its prose renamed and its section numbers
left alone, since the memory files cite it by number.

**The git remote and `repository.url` still name the old repo**, because
the repo has not been renamed. Pointing them at a URL that does not
exist yet would be worse than leaving them accurate. Tracked as
RENAME-02 with the owner's two steps: rename the GitHub repo, and rename
the OneDrive directory with no session running against the path
(hostile-filesystem guard). The agent finishes the remote afterwards.

**Doc-deltas.** Two ticked and applied in the same sitting, as the D149
capture line required: AGENTS.md § Product identity (the name, plus the
audience widening — "macOS-first" retired and the
no-upstream-editor-assumed premise recorded) and the protected-doc
rename sweep, where DEV-INFRASTRUCTURE.md turned out to carry no
occurrence. Two "macOS-first" leads in `README.md` and `brief.md` were
corrected while there, since they now contradicted the widened audience
two paragraphs below them.

**Alternatives rejected.** Renaming the database with a copy migration
(above). Deleting the legacy preferences key after reading it (a
downgrade would then silently reset the user's disclosure choices).
Hand-editing `package-lock.json` (it is a managed file; `npm install
--package-lock-only` regenerated it). Renaming the archives for
consistency (it would make append-only history untrue).

**Scope.** `src/main.ts`, `src/diagnostics/bundle.ts`,
`src/ui/diagnostics-button.ts`, `src/ui/preferences.ts`,
`src/ui/styles/tokens.css`, `src/core/project.ts`,
`src/library/records.ts`, `src/library/store.ts`, `tests/shell.test.ts`
(+5 tests), `tests/diagnostics-bundle.test.ts`,
`tests/debug-menu.test.ts`, `index.html`, `bench.html`,
`bench-source.html`, `crates/stitch-engine/Cargo.toml`, `package.json`,
`package-lock.json`, `.claude/launch.json`, `.gitignore`,
`.windsurf/workflows/next.md`, `AGENTS.md`, `UI-STANDARDS.md`,
`README.md`, `docs/measurement-contract.md`,
`docs/browser-measurement.md`, and the memory files. `check` green.

**Link:** RENAME-02 carries the two owner steps. Batch C0 continues at
the doc-sync pass, then AUDIT-01 → ROUTE-01.

## D151 — The doc-sync drains, AUDIT-01 corrects a stale shape and a slack bound, and ROUTE-01 is settled as noise (2026-08-11)

**Decision.** The three preconditions Batch C0 named for trusting a
gateless run are met: the rename is complete (D150), the hot-read and
protected docs are true again, and `npm run audit` is green.

**The doc-sync pass: 9 open deltas → 1.** Applied, each against the
source entry rather than a stored instruction (the DOC-1 lesson):

- **AGENTS.md § The four resolutions** — the derive-scale control is the
  **Zoom** slider, renamed from "Stitch size" at M14-EXT-40; "Stitch
  size" survives only as the Stats readout of the same ratio. The D52
  collision is now recorded *in the contract* rather than only in
  `scales.ts`: "Zoom" means source px per stitch here and preview CSS px
  per stitch in the view strip, the helper text is the disambiguation,
  and it is explicitly **not** a precedent — a bare `scale` label stays
  banned.
- **AGENTS.md § Performance** — budgets bind at **two** boundaries now,
  and conflating them is the error the entry guards against: `bench`
  asserts node regression baselines (×1.35, staleness-guarded), while
  `bench:auto` asserts the **product promise** in a browser and exits
  non-zero on a missed rate or a dropped frame (D142). Only driven base
  capture rows may bind a target.
- **AGENTS.md § Scope guards** — the committed fence is Batch C0 → Track
  A → Track B, and ship order is not milestone-number order (D149).
- **UI-STANDARDS.md § Layout model** — the controls census was three
  milestones stale. It listed Pattern/Grid/Colour/Dither/Pipeline as
  sections and an info strip docked below the preview; none of that is
  true. Replaced with the real census, each retirement named.
- **UI-STANDARDS.md § Conflict and explanation pattern** — the
  three-disjoint-rules anatomy retired at M15: exclude dissolved into
  profile membership, prefer was removed outright, lock became Must use.
  Recorded so the *principle* survives its shape — M15 made the
  contradiction unrepresentable rather than merely unclickable, which is
  a strengthening, not a loss.
- **DEV-INFRASTRUCTURE.md § `bench:auto`** — the validation summary
  described a report writer; the command now also asserts product
  targets and fails on a missed promise.

Caught in passing and fixed: the command table called `check` **7
non-mutating steps** and listed seven, omitting `check:contrast`. It is
eight. A gate census that cannot count its own steps is exactly the
drift a doc-sync exists to catch.

The one survivor is deferred **by its own terms**: AGENTS.md's
persistence checklist reads as though project state persists
automatically, and DUR-01 is about to change what the true answer is.
Syncing it now would mean syncing it twice.

**AUDIT-01 — two different faults under one item.**

The failing assertion was not catching a defect, it was testing a shape
the app stopped producing. `runtime.audit` hand-simulated the draft
substitution as `{ ...config, dither: false }` and asserted a boolean;
M8 made dither a discriminated `DitherConfig` union (D61/D62). Rather
than fix the literal, the audit now mirrors what `liveConfig()`
*actually does* — `{ algorithm: 'none' }`, behind its real guard (a
palette is set and dithering is on) — and asserts the guard fires before
asserting the invariant, so the audit cannot silently prove nothing on a
workload the substitution declines. The invariant itself is unchanged
and still holds: draft turns dithering off in a **copy**, and the
original the exporter uses is untouched.

The `p533` labels were the same class. `loadDmcPalette()` returns 489
and always has; the bench axis corrected this at bv2 (M13-MEAS-01) and
the matrix and audit axes never followed. Renamed across the live test
surfaces, and the regenerated `docs/acceptance-matrix.md` follows from
`rows.ts`, not by hand.

**One of those labels was load-bearing.** `dither-pruning` asserted
`mean < 533 / 5` on the real DMC palette — a bound ~9 % slacker than
intended, derived from a count the catalogue never had. It is now
`dmc.entries.length / 5`, so it cannot drift again when the catalogue
changes. A mislabel that had quietly become a weaker test is the best
argument for treating label drift as real work.

**ROUTE-01 — settled as noise, with the mechanism identified.** The item
insisted this not be lumped in with AUDIT-01's stale assertions, and it
was right to. Reading the `margin` column, as its Done-when asks:

- **Quiet machine:** all sixteen rows separate by **1.35×–4.02×**, zero
  disagreements. The router's metric-based policy (lab → ts, rgb →
  wasm) is correct across the entire matrix.
- **Under deliberate 10-core load** (the sweep ran 39 % slower): still
  zero disagreements, but the narrowest row — `200²/64/lab` — collapsed
  from **1.77× to 1.24×**. That is the row with the least headroom, and
  it is almost certainly the one that flipped when the failure was first
  seen.

So the disagreement was the measurement, not the router: the sweep picks
its winner by comparing two medians, and a load-inflated median is
indistinguishable from a real regression. The fix is the one ROUTE-01
prescribed — tolerate ties. A disagreement now fails only when the
margin is **≥ 1.25×**; below that the row is reported as a near tie and
not counted. The threshold is evidence-derived (every quiet row clears
1.35×), not picked. Verified both ways: green quiet, and green under the
load that previously broke it, with `200²/64/lab` correctly classified.

This matters beyond the audit: **M13-SYNTH-01 (D135) signed off "routing
confirmed unchanged"**, and that claim now rests on a sweep that no
longer flips with machine load. Near-tie disagreements are still
published in the findings, so nothing is swept away — a genuine policy
break shows the *opposite* winner at a decisive margin and still fails.

**Alternatives rejected.** Fixing the audit's literal `dither: false` to
`{ algorithm: 'none' }` without mirroring the real guard (it would keep
a simulation that can drift from `liveConfig()` again). Re-running
ROUTE-01 until it passed and calling it fixed — it *did* pass on the
first re-run, which is precisely the trap: an intermittent assertion
trains you to re-run rather than to look. Renaming `533` inside
`performance-evidence.md`, `browser-measurement.md`, `bench-reports/`
and the archives: those are recorded measurements, and renaming a
measurement rewrites history (D150's principle).

**Scope.** `AGENTS.md`, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`,
`doc-deltas.md` (9 → 1 open), `tests/audits/runtime.audit.test.ts`,
`tests/audits/routing.audit.test.ts`,
`tests/audits/orchestration.audit.test.ts`,
`tests/audits/dither.audit.test.ts`,
`tests/audits/lut-reduce.audit.test.ts`,
`tests/audits/m8-dither.audit.test.ts`,
`tests/audits/wasm-boundary.audit.test.ts`,
`tests/audits/candidates/dither-candidates.ts`, `tests/matrix/rows.ts`,
`tests/acceptance-matrix.test.ts`, `tests/dither-pruning.test.ts`,
`tests/backend-select.test.ts`, `tests/wasm-dither.test.ts`,
`tests/benchmark.test.ts`, `docs/acceptance-matrix.md` (regenerated).
`check` and `audit` both green.

**Link:** Batch C0's three preconditions are met; the remaining eleven
items are order-free.

## D152 — DIAG-01 and KEY-01: the diagnostics buffer keeps faults, and the PDF key stops repeating itself (2026-08-11)

**Decision.** Two independent defects from the 2026-08-09 sitting, both
with mechanisms already traced, both fixed with the regression fixture
the finding named.

**DIAG-01 — three separate things, not one.** The item read as "downgrade
a noisy message", but its acceptance condition asked for three, and each
needed its own change:

1. **Known-benign notifications are downgraded, not dropped.** The
   ResizeObserver loop message — both wordings, since engines differ —
   is logged at `debug` with its reason stated in code beside a list
   that is explicitly a silencer, so anything added to it must be
   genuinely benign rather than merely inconvenient. Matched by prefix,
   and a real fault whose message merely *contains* the phrase still
   lands at error (there is a test for exactly that, because a silencer
   that over-matches is worse than the noise).
2. **Real faults keep their evidence.** `installGlobalCapture` recorded
   `message` and `source` but no **stack**, so an uncaught error said
   something broke without saying where. Both the error and the
   unhandled-rejection paths now carry one when the payload is an
   `Error`, and omit the field rather than inventing it when it is not.
3. **Eviction prefers noise over faults.** This is the part the item's
   last clause asked for and the one a quick reading would skip. The
   buffer used `shift()`, so a burst of routine chatter evicts the very
   error you opened the diagnostics for — downgrading the ResizeObserver
   message reduces that pressure but does not remove it, because debug
   records still consume slots. `evictOne` now drops the oldest
   **non-error** record and falls back to the oldest only once the
   buffer is all errors. Bounded stays bounded; errors are simply last
   to go.

**KEY-01 — fixed in `keyLabel`, not at the call site.** The traced path
was right: for a generated colour with no CSS name, `entry.name` *is*
the hex, so `nonThreadLabel` returns "Web-safe #cccccc" and `keyLabel`
appended the hex a second time. The tempting fix is to stop passing
`reference: ''` from the export assembly, but that makes `keyLabel`
return the bare hex and throws away the honest "Web-safe" label D114
introduced. Suppressing the trailing hex when the label already carries
one fixes every row regardless of who builds the label, which is what
the acceptance condition ("never prints the same token twice") actually
asks for. Real threads are untouched: "DMC 310" cannot contain its own
hex, so "DMC 310 #000000" still reads correctly, and the suppression is
conditional so a *named* synthetic ("Retro 16 Lime") still gets its hex.

**The fixture is the point.** `keyLabel` was already unit-tested and
green, because the fixture used "Web-safe Lime" — a named colour. The
unnamed majority is the broken one, and that gap is precisely why the
defect reached an owner's printed export. The regression case is an
unnamed generated colour, plus a case-mismatch variant, plus a sweep
asserting no generated-map row repeats its hex. This is the same lesson
EXPORT-01 exists to institutionalise: a green unit test over a
flattering fixture proves less than it appears to.

**Alternatives rejected.** Filtering benign notifications out entirely
(they would vanish from the record, and "it did not happen" is a
different claim from "it happened and was harmless"). Token-level
deduplication in `keyLabel` (it would collapse legitimate repeats in a
brand name; the defect is specifically the appended hex). Bumping
`BUFFER_CAPACITY` instead of prioritising eviction (a bigger buffer
delays the loss, it does not stop it).

**Scope.** `src/diagnostics/log.ts`, `src/export/pdf.ts`,
`tests/diagnostics-log.test.ts` (new, 10 tests),
`tests/export-pdf.test.ts` (+5). `check` and `audit` green.

**Link:** Batch C0 continues; nine items remain, all order-free.

## D153 — EXPORT-01: the artefacts get asserted, and the suite refuses its own flattering fixture (2026-08-11)

**Decision.** An artefact-level export suite (22 tests) now runs inside
`check`. It takes a real pipeline output from `executeRequest` — the
same worker entry `acceptance-matrix` uses, so the LUT cache, candidate
cache and routing are all in the loop — and pushes it through the real
export assembly, asserting properties of what comes out.

**The key assembly moved to make this honest.** It was inline in
`main.ts`, so a test could only *reimplement* it — and two copies
agreeing proves nothing, which is the same failure that let KEY-01
ship. `buildKeyEntries` now lives in `src/export/key-entries.ts` and
both the app and the suite call it. This is the one production change in
the item, and it is what makes the rest of it mean anything.

**What is asserted, and why each earns its place.**

- **Clean PNG** — the frame is the grid exactly, so 1 stitch = 1 px.
- **Enlarged PNG** — dimensions are an exact integer multiple *and*
  every output pixel is a verbatim copy of its source pixel at ×2, ×3
  and ×7. Restated as a property: the enlargement invents no colour the
  frame did not contain. An interpolating resampler would blend across
  cell edges, and a stitch chart that blends is not a stitch chart.
- **Chart raster** — larger than the bare cells (grid and numbering need
  room), growing in both axes with cell size, and its own `maxCellPx`
  stays inside the canvas limit.
- **PDF** — parsed, not string-matched. One page; the requested box in
  points for A4, Letter and landscape; the image drawn with its aspect
  preserved and fitted inside the margins; the title present; and every
  key row carrying **exactly one hex and no repeated token**.

**Node cannot run the canvas encoders, and the suite says so rather
than pretending.** `encodePngBlob` and `encodeChartPng` need
`OffscreenCanvas`. Their *inputs* are pure and are asserted directly;
the PDF assembly is plain pdf-lib and runs whole, which is why the PDF
gets byte-level treatment and the PNGs get input-level treatment. The
test-only PNG encoder (node's built-in `zlib`, no new dependency) exists
solely to hand pdf-lib the bytes a browser would; nothing about the
app's own encoding is asserted through it.

**The suite caught itself repeating the mistake it exists to catch.**
First draft used a DMC palette for the realistic path. Mutation-testing
it — reverting the KEY-01 fix — showed only the *dedicated* guard
failing, because every DMC row is a real thread ("DMC 310 #000000") and
real threads never had the defect. The realistic case was the flattering
case. A second pipeline run over a **generated** colour map (`websafe`,
whose entries are named by their hex) now covers the shape that actually
broke, and the revert fails two tests instead of one.

That is the general lesson worth keeping: an artefact suite is only as
good as the *inputs* it drives, and "realistic" is not the same as
"covers the failure mode". Mutation-testing a new suite against the bug
it was written for is cheap and is the only way to know.

**Alternatives rejected.** Copying the key assembly into the test (two
copies agreeing is not evidence). Adding a PNG-decoding dependency to
assert the chart raster's pixels (the canvas encoders cannot run in Node
at all, so the dependency would buy nothing the layout assertions do not
already give). String-matching `/Type /Page` and the MediaBox numbers in
the PDF bytes — it failed, because pdf-lib compresses the object
structure, and parsing with `PDFDocument.load` is both correct and
robust to that.

**Scope.** `src/export/key-entries.ts` (new), `src/main.ts` (calls it;
`nonThreadLabel` import retired), `tests/export-artefacts.test.ts` (new,
22 tests). `check` and `audit` green, 1133 tests.

**Link:** Batch C0 continues; eight items remain.
