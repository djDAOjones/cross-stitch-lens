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

## D91 — M14 third look: the voice memo triaged — eleven tasks, two icebox promotions (2026-08-04)

**Decision:** the owner's third look (a voice memo, transcribed and
repaired 2026-08-04) triages into eleven extension tasks that gate
ACCEPT-01 again — M14-EXT-06 settings appear with the source, EXT-07
the sample affordance retired, EXT-08 always-auto-fit with Fit
width/height removed, EXT-09 sticky preview, EXT-10 click-to-engage
panning, EXT-11 view controls collapsed/discreet and home to the
grid toggles, EXT-12 capture region to the top, EXT-13 colour limit
as a slider defaulting to eight, EXT-14 "Colours by usage" collapsed
— plus two [sign-off] proposal tasks where the memo asked for
elegance rather than naming a shape: EXT-15 capture-region aspect
handling and EXT-16 Design-size rework (the dictation trailed off on
its destination).

**Routed out of the milestone:** tonal light↔dark transform sliders
and colour-provenance visualization change or extend engine/worker
outputs, which M14 forbids (UI-only, byte-identical) — promoted to
the Icebox as ICE-ADJUST-01 (absorbing the wish-list "Image
adjustments panel" line; the `adjust` stage exists from M1) and
ICE-PROVENANCE-01. Parked deliberately, not dropped.

**Supersessions on the owner's own authority:** capture surfaces
below the preview (D88) → the region section surfaces first and open
when capture is the source (EXT-12); the view-controls fold open on
first run (D89) → collapsed and quieter (EXT-11); the colours table
open by default (D90) → collapsed (EXT-14); the sample route built
by D84 and kept through D88's modal → retired everywhere
user-reachable (EXT-07); M7's default colour policy all/n=20 (D55) →
a default limit of eight (EXT-13). The D86 A16 fit-menu waiver is
settled rather than re-waived: under always-auto-fit the
width/height variants go (EXT-08). M6-CAPRES-01's always-on aspect
lock (D52) is reopened, not reversed — EXT-15 proposes options
first.

**Assumptions flagged for the end review:** the Source modal's "Try
a sample" entry goes with the entry button (same affordance; the
memo named only the button); plain Fit survives as the manual reset
after zoom (only the width/height variants were named); Zoom in/out
and Compare stay per the memo. EXT-06 must keep a project-open route
on the cold surface — hiding the sections must not orphan Load.

**Link:** backlog → M14 "Extension — third-look triage (D91)";
tickets `M14-EXT-10/13/15/16.md`; ACCEPT-01 re-blocked on
EXT-06..16.

## D92 — M14 third look, second pass: the critique applied — one viewport arc, one sign-off, the sample lives in the modal (2026-08-04)

**Decision:** the owner accepted the design critique of the D91
triage in full (2026-08-04) and the extension set is revised
accordingly. Structural changes: EXT-08..11 are one **viewport arc**
landing as a set with a dedicated composition verify, M14-EXT-18 —
the D90 lesson applied in advance rather than learned again; EXT-16
merges into EXT-15 as one "Size, region & aspect" sign-off (the
memo's trailed-off sentence and the aspect options are the same
design decision; the EXT-16 id is retired, never reused); M14-EXT-17
(thread highlight) joins from the re-scoped ICE-PROVENANCE-01 — the
per-stitch index sidecar already reaches the UI (M7-BRAND-01), so
highlighting a thread's stitches is a Compare-class preview
decoration, not an engine change; the icebox item keeps only the
tonal-position half.

**Forks decided (owner-accepted recommendations):** a permanent
quiet **view strip** replaces the collapsed-fold shape — D91's
EXT-11 would have demoted E-tier zoom to reach 2, breaking the §1
contract; the strip keeps every view control at reach 1 and retires
the D89 fold. **Focus-unified panning** — pan engagement *is*
canvas-host focus; no second mode machinery beside it.
**The sample survives in the Source modal** — the entry button goes
(the memo's literal ask) but the one zero-permission demo route
stays; supersedes D91's remove-everywhere assumption.
**Colour-limit anatomy** — a "Limit colours" toggle (default on) +
slider with paired number input; "exactly" demotes to depth; a
No-limit end-stop would conflate mode and count. **Fit resolves as
Reset view** — under auto-fit the resting state is fitted, so the
surviving button's job is returning to it; Fit, Fit width and Fit
height all retire and the D86 A16 waiver closes with them.

**Constraints bound into the tasks:** the docked preview carries a
capped height under 60 rem plus scroll-margin clearance so no
focused control sits beneath it (UI-STANDARDS focus non-obscuration;
the 320 px companion posture is the budget); EXT-17 re-proves export
byte-identity on ship, so the decoration reading is enforced rather
than assumed; EXT-06 lands as a shell-model state, never a second
hidden layer; EXT-06 adds a quiet "Open a project" entry action so
hiding the sections cannot orphan Load.

**Link:** backlog → M14 "Extension — third-look triage (D91,
revised D92)"; every task carries a ticket (`M14-EXT-06..15.md`,
`M14-EXT-17.md`, `M14-EXT-18.md`; `M14-EXT-16.md` deleted on
merge); ACCEPT-01 blocked on the full set.

## D93 — M14-EXT-06: cold is a shell state, not a hidden layer (2026-08-04)

**Decision:** the cold surface landed as a third field on the one
shell model — `cold` in `ShellState`, overriding both presentation
preferences in `visibility()` — never a second `hidden` layer. The
entry state's visibility write moved into `applyShell` (the D90
one-writer rule now covers the whole cold composition), and the five
source routes plus project open exit cold one-way for the session.
The entry gained the quiet "Open a project" action (D92 constraint:
Load must not orphan), wired to the panel's own hidden project input.

**Assumptions at the skipped gates:** dev-only chrome (diagnostics
cluster, profiling panel) is exempt from "entry only" — it is not
product surface, and a cold boot error is precisely when Copy
diagnostics earns its keep. Source-bearing exits announce "Design
ready — settings are on the right/below" (layout-aware via
`matchMedia`, the 60 rem breakpoint); the project route exits quietly
because its own status line already directs ("import an image to see
it applied"). Focus rescue for an entry action that hides under the
user's finger goes to the bar's Source button — chooser hands to
chooser. A denied capture permission keeps the page cold: the route
never completed, nothing exists to configure.

**Found and fixed in verification:** `applyShell` had never written
`focusToggle.hidden` (the toggle predates cold and was always
visible); cold showed a Preview-focus button for a preview that
cannot exist. Composed from the model as `!panelToggle && !focusExit`
— true exactly when no mode control is meaningful — rather than a new
visibility field.

**Link:** ticket M14-EXT-06 (deleted on ship); ui-spec §3 amendment;
evidence in `docs/ui-evidence.md`; shell tests extended to 18
(cold-override sweep, exit-onto-preference, no-persistence guard).

## D94 — M14-EXT-07: the sample keeps one door (2026-08-04)

**Decision:** the entry state's "Try a sample" is removed — the
memo's literal ask — and the Source modal keeps the sample as the one
zero-permission demo route (the D92 fork, superseding D91's
remove-everywhere assumption). Entry stack is now Choose an image /
Capture your screen / Open a project. `loadSample()` and the sample
buffer stay: the modal calls them, tests and bench rely on the
deterministic buffer.

**Consequence accepted:** with the Source button hidden cold (D90
composition) and the entry sample gone, the cold surface has no
sample route at all — a first-run novice must bring a source or open
a project before the demo becomes reachable at all. That is the
owner's stated preference; ACCEPT-01 judges it, and the ticket noted
reversal is one modal choice away.

**Link:** ticket M14-EXT-07 (deleted on ship); ui-spec §3 amendment +
§5 row (sample now reach 2, modal only); evidence in
`docs/ui-evidence.md`.

## D95 — M14-EXT-08..11: the viewport arc — fitting stops being the user's job (2026-08-04)

**Decision:** the four legs landed as one set, per the D92 revision.
**Auto-fit (EXT-08):** the existing mode machine tightened to two
states — 'space' (auto, the default; refits on source change, host
resize, dock transitions) and 'manual' (any deliberate zoom or pan;
left by Reset view, `0`, or a source replacement). Fit width/height
retired with their buttons; **Reset view** is the one surviving fit
control, closing the D86 A16 waiver. A loaded project opens in auto
regardless of its stored preview scale — predictability over
restoration; the schema field still round-trips in core, it just no
longer drives the opening view. **Docked preview (EXT-09):** the
preview unit (strip · canvas · compact status) is `position: sticky`
in both layouts; at the companion width, scrolling past its natural
position caps the canvas to 40dvh via a scroll-threshold class.
The info panel moved out of the preview section to the content flow —
it scrolls, the picture doesn't. **Focus-unified panning (EXT-10):**
pan engagement *is* host focus — unfocused wheel/drag belong to the
page, the wheel-zoom handler was deleted outright, Escape blurs and
is consumed so preview-focus exits on the next press. The host shows
its ring on `:focus` (not `:focus-visible`): the ring is the engaged
state the memo described, so pointer engagement must show it too.
**View strip (EXT-11):** the D89 fold retired for a permanent quiet
row of ghost text buttons — Zoom out · Zoom in · Reset view ·
Compare · Grid · Numbers + readouts — tighter padding than panel
buttons but the same 44 px minimum targets; the grid pair moved from
Appearance switches to strip toggle buttons, and the Appearance
summary re-derives from what remains (dither state only).

**Found live and fixed:** (1) an IntersectionObserver dock trigger
oscillates — docking shrinks the page, which moves the trigger back
into view — and hung the renderer at 375 px; replaced with a
scroll-position threshold against the sentinel's *static* document
offset, which the dock state cannot move. (2) A rAF-gated scroll
handler freezes in a hidden tab with its pending flag wedged; the
work is one comparison, so it is synchronous now. (3) `position:
sticky` released mid-scroll because `.content` ends before the
settings do: at the companion width `.content` becomes
`display: contents` so the sticky containing block is the full
column; at wide the row is `align-items: stretch` for the same
reason. (4) The strip wrapped to 3 rows at 375 px; strip buttons use
spacing-03 padding, restoring the ≤ 2-row budget (88 px measured).

**Link:** tickets M14-EXT-08/09/10/11 (deleted on ship); ui-spec §2
amendment, §5 rows, §6 keyboard model, §4 strip terminology;
composition evidence lands with M14-EXT-18.

## D96 — M14-EXT-18: the composition holds (2026-08-04)

**Decision:** the viewport arc passes as a whole. 188-control
keyboard walks at 320/800/1280 with zero focus-obscuration
violations; the memo's palette scenario proven at 320 × 700 (392 px
of pinned canvas while the colour select holds focus); zero
duplicated affordances; both schemes; reduced motion by construction.
The one deviation from the EXT-11 budget is within its own named
fallback: at 320 px the six strip buttons hold two rows but the
readouts wrap to a third quiet text line — accepted as the ticket's
"inline text under the strip" shape, ACCEPT-01 judges the taste.
J1's fastest zero-permission route now sits behind the Source modal
(D94 consequence) — recorded for the end review rather than
re-litigated here. EXT-17's cross-product and the live SR/trackpad
half are named exclusions, owned by that ship and ACCEPT-01
respectively.

**Link:** ticket M14-EXT-18 (deleted on ship); evidence matrix in
`docs/ui-evidence.md`; §2/§4/§5/§6 amendments confirmed in place.

## D97 — M14-EXT-12: the capture surface moves into the settings (2026-08-04)

**Decision:** during a session the whole capture surface — live
thumb + crop overlay, session controls, position readout, draft
badge — lives in a **Capture region** accordion section mounted at
first position in the settings panel; the source section carries the
cold entry only. Open on first appearance, persisted collapse
thereafter (per-session remount honours the stored choice). The
placement supersedes D88's below-the-preview arrangement on the
owner's own authority (D91), and pays off in both layouts: beside
the preview at wide, first under the docked preview at narrow.
Aspect semantics untouched — EXT-15 owns them.

**Consequences accepted:** the capture surfaces now hide with the
panel (they are settings geography; the preview keeps rendering), and
the wide-layout thumb is panel-width — both routed to ACCEPT-01 as
taste. The capture-start announcement lands after the cold-exit line
and is then overwritten by the first frame's "Preview updated." —
queued for a screen reader, transient visually; accepted.

**Found in verification:** the focus-rescue contains() check ran
after the session buttons were hidden, when focus had already
dropped to body — the flag is now read at the top of `endCaptureUi`,
and the rescue targets the Source button, falling back to the
entry's first action for a stop-before-any-frame session. Stopping
normally keeps the last grabbed frame as the source (existing
behaviour), so the entry does not return and Source is the right
target.

**Link:** ticket M14-EXT-12 (deleted on ship); ui-spec §2/§3
amendment; evidence in `docs/ui-evidence.md`.

## D98 — M14-EXT-13: limit colours by switch and slider; eight is the new default (2026-08-04)

**Decision:** the Colour-limit mode select + number field became a
**"Limit colours" switch (default on) + slider (1–64) with paired
number input (1–512)** — the D92 anatomy: a slider "No limit"
end-stop was rejected as conflating mode and count, and "exactly"
demoted to a depth checkbox beside the thread-library disclosure
("Use exactly this many"), remembered across an off/on cycle. The
fresh-session default is **at most 8 colours** — `defaultPolicy()`
count `{mode:'max', n:8}`, superseding D55's unlimited default on
the owner's authority (D91/D92). Never silent: the collapsed Design
summary reads "… · DMC · 8 colours (limit)" and the count summary
"489 permitted · 8 selected of 8 requested · 8 used in the design."

**Boundaries held:** the v2→v3 project migration keeps its own
inline `all/20` literal — an old file meant "no limit" when saved,
and the migration preserves meaning, not the current taste. Stored
policies (schema v3) are untouched. The one test fixture that read
the ambient default in its no-limit branch now pins `mode:'all'`
explicitly (the ticket's named risk, found in the right direction),
and a new test pins the eight-default deliberately.

**Verified live:** fresh drop resolves 8; slider arrow → 9 resolves
9; typing 100 pegs the slider at 64 and resolves 100; switch off →
unlimited (489, controls hidden); switch on → n and exactness
remembered; exact checkbox flips mode with the same honest
selected-vs-requested strings.

**Tripwire resolution:** the ui-baseline tripwire fired on the
default flip — correctly, but for the wrong reason: it derived its
pinned config from `defaultPolicy()`, so an intended UI-policy
decision read as engine drift. The tripwire now freezes the
audit-time reference policy inline and keeps every committed hash
untouched — engine byte-identity stays proven over the same config
as at audit time, and default changes can no longer masquerade as
engine changes (or vice versa). No hash was refreshed.

**Link:** ticket M14-EXT-13 (deleted on ship); ui-spec §4/§5 rows;
evidence in `docs/ui-evidence.md`.

## D99 — M14-EXT-14: the colours table folds, the fold line informs (2026-08-04)

**Decision:** the colours-by-usage disclosure defaults **closed**
(flipping D90's open default on the memo's ask; the persisted choice
still wins), and the fold line grows a derived readout so the table
still informs collapsed: "Colours by usage — 8 · DMC 310 leads" —
count plus leading thread, derived from owned stats at render
(`usageSummaryLabel`, pure and unit-tested), never scraped from the
DOM. The D90 name-once rule survives: the visually-hidden caption
keeps the table's accessible name; the fold line is the disclosure's
label.

**Tension on record (from the ticket):** the default-8 palette makes
this table the novice's best feedback, and the owner still wants it
folded — the summary carries the load, and EXT-17's highlight gives
the table a reason to open. EXT-17's row selection lands at reach 2
under this default, inside the C-tier contract (§5 row updated).

**Link:** ticket M14-EXT-14 (deleted on ship); evidence in
`docs/ui-evidence.md`.

## D100 — M14-EXT-17: where a thread lives, shown without touching a pixel that ships (2026-08-04)

**Decision:** selecting a thread row in Colours by usage highlights
its stitches on the preview as a **Compare-class decoration**: a new
`highlight` worker message (deliberately not a `PipelineConfig`
field, so processing, exports and project files cannot see it by
construction) sets a palette index on the preview surface, which
dims every non-matching stitch under a uniform scrim (alpha 150) —
matching stitches and fabric stay untouched, because thread colours
are content and absence of scrim IS the highlight. The scrim draws
under Compare, so the source half stays pristine and the two
decorations compose. Selection is keyed by palette index (the
sidecar's vocabulary), owned by the info panel as session state; a
changed entry list (an entries fingerprint in `resolvePalette`)
clears it rather than letting it silently point at a different
thread. Rows carry the A2 per-row anatomy ("Highlight" visible,
"Highlight DMC 310 Black" accessible, `aria-pressed`); reselect and
Escape clear; announcements carry the table's own count.

**Costs accepted:** the router copies the index sidecar to the
surface before the response transfer detaches it — unconditional
(~180 KB at 300², 0.024 ms measured), so a highlight engages
instantly on a static image with no re-run. Full added cost with a
highlight active: 0.796 ms/frame at 300² (copy + mask + draw) —
0.3 % of the 4 fps budget, ~1 % of the banked 57–86 ms baseline
frames (D64–D72), so the ≥ 4 updates/sec promise holds by margin.
The live-pump rate could not be re-measured headless (rAF-frozen
hidden pane); named for the ACCEPT-01 live session.

**Byte-identity enforced, not assumed (D92):** export PNG SHA-256
identical with and without an active highlight on the real export
path; the ui-baseline tripwire stays green; the type system keeps
the highlight out of every processing request shape.

**Link:** ticket M14-EXT-17 (deleted on ship); ICE-PROVENANCE-01
keeps the tonal half; evidence in `docs/ui-evidence.md`; mask
invariants unit-tested (`tests/highlight.test.ts`).

## D101 — M14-EXT-15: the signed shape ships — aspect follows by default, frees on demand (2026-08-05)

**Decision:** the owner signed **A + D + S1** (structured in-session
answer, 2026-08-05; pack in the D91–D100 commit) and the shape is
implemented. An **"Aspect follows design"** toggle joins the capture
session controls — pressed by default, session-only, reset each
session, never project data (schema untouched). Unlocked, every
shape-changing gesture runs the free geometry (`resizeRect`/
`clampRect`) and the gesture end adopts the region's shape as the
design height (`deriveGridHeight` — width stays the user's, stitches
stay square, nothing distorts). Shift-drag frees a pin temporarily
while locked; the keyboard route to a free resize is the toggle
itself, with shift+arrows staying aspect-locked until it is off
(recorded as D's keyboard answer). S1: the Design size fields join
the Capture region section for the session and return to Design on
end — moved, never duplicated, focus preserved across the reparent.

**The independence promise, split as signed:** locked keeps D52
whole (constrainRect the only route; region chooses which pixels,
never how many stitches — existing suites stand). Unlocked is the
one sanctioned crossing: region shape → design height, one
direction, announced in the readout ("(height follows the region)")
while the derived height field disables with the reason in its
helper (A9 adjacency). AGENTS.md's invariant updated to the split;
ui-spec §3/§5/§7 amended. The derive/constrain pair is a proven
fixed point (no feedback loop) in the crop suite.

**Losers recorded:** B (resample) distorts stitches — carried as the
strawman and rejected; C (letterbox) buys freedom at a third concept
(silent blank bands + D9 fabric semantics without source
transparency); S2 invents a compound control; S3 moves size edits to
reach 2 when the complaint was chunkiness, not reach.

**Found in verification:** a region-derived height left a stale
number in the disabled field — `applyPattern` now mirrors both
fields whatever drove the change. Pointer-drag geometry could not be
driven in the headless pane (the capture video never lays out — same
rig class as the frozen pump); the keyboard route proved the full
derive chain, the shift-gesture free/adopt path was demonstrated via
draw, the geometry is unit-tested (52 crop tests incl. the new
locked/unlocked split), and the real drag sits on ACCEPT-01's live
checklist.

**Link:** ticket M14-EXT-15 + `docs/ext15-options.md` +
`docs/ext15-mockups.html` (all deleted on this ship — conclusions
live here); evidence in `docs/ui-evidence.md`; ACCEPT-01 is now
unblocked — the milestone's one remaining item, and it is the
owner's.

## D102 — ACCEPT-01 first pass: six findings routed to fix tasks (2026-08-05)

**Decision:** the owner's first live Photoshop companion run
(2026-08-05, narrow window beside Photoshop 2026, real capture)
produced six findings, routed to M14-FIX-01..06 per ACCEPT-01's own
rule — fix tasks, never silent rework. ACCEPT-01 re-blocks on the
set; the formal pass/fail session follows.

**The findings, ordered as they will run:** FIX-06 first — a
scroll-time oscillation of the preview at companion width during
capture, a defect in my D95 dock/sticky mechanics (prime suspect:
the dock's page-shortening crossing its own scroll threshold near a
short page's bottom — the exact loop class D95 dismissed for tall
pages; a page with everything collapsed is short). Then FIX-01 —
capture region leading the session flow, which collides with the
preview-first §7 invariant and carries a reorder-vs-guidance option
set (the owner explicitly left mechanic latitude); FIX-03 — the
canvas host hugging the fitted design's height instead of a flat
60dvh; FIX-05 — the stats block compressed, dropping the
strip-readout duplication; FIX-04 — a discreet window-width guide
for the narrow posture; FIX-02 — `selfBrowserSurface: 'exclude'` +
window-share copy, with the platform's full-screen limit recorded
("not essential if not viable" is the owner's stated tolerance).

**Also observed in the session artefacts:** the owner shared a
screen containing the app itself (the design stitched the app's own
UI) — the motivating reproduction for FIX-02's copy nudge; and the
shipped extension surfaces (default-8 announced in the Design
summary, the informative colours fold line, the aspect toggle in
the capture section) all visible working in the real posture.

**Link:** backlog → "First-pass review feedback"; tickets
M14-FIX-01/02/03/04/06 (FIX-05 is line-only); owner screenshots in
the session transcript.

## D103 — M14-FIX-06 + FIX-03: nothing in the layout is scroll-linked (2026-08-05)

**Decision:** the two findings are one geometry decision, landed as
one change. The D95 scroll-threshold dock is **deleted** — its class
toggle changed the page height on its own trigger's axis, and scroll
anchoring / bottom clamping fed the change straight back across the
threshold as the docked↔undocked flap the owner filmed. The cure is
categorical, not tuned: no hysteresis, no re-measure — layout height
simply has no scroll input left. The canvas instead **hugs the
fitted design** under auto-fit (`hugHeight`, pure: fit the width,
follow the aspect, clamp to a 10rem floor and a posture cap — 40dvh
stacked, 60dvh wide). Height depends only on host width and design
shape — never on the height it replaces — so the ResizeObserver
settles in one pass; the fixed point is unit-tested, not assumed.
Manual zoom freezes the height where the user left it; Reset view
re-hugs; preview focus fills the window by flex (`!important` over
the inline hug). The D97-era "scroll back restores full height"
behaviour is retired with the mechanism — under hugging there is no
unnecessary height to restore (the FIX-03 ask).

**Verified live (380 × 700):** wide 200×80 design → host 173 px
(derivation exact, was a fixed 489); square design → capped 282 px;
an 8-position scroll sweep holds ONE height with clean sticky
pinning; manual zoom froze 173 through a grid change; Reset re-hugged
to the cap. Nothing in src listens to scroll any more (grep-clean).

**Link:** tickets M14-FIX-06/03 (deleted on ship); ui-spec §2
re-amended (supersedes D95's dock paragraph); evidence in
`docs/ui-evidence.md`; EXT-18's dock legs re-walked under the new
geometry at close of the FIX set.

## D104 — M14-FIX-01: the region leads while it is the task (2026-08-05)

**Decision:** during a capture session the Capture region section
mounts in the content column **above the preview** — the owner's
tweak → lock → collapse → progress flow made literal, superseding
D97's panel-first slot on the first-pass review. Session start hands
focus to the section's own toggle (the user's gesture was "set up a
capture"); collapsing or locking scrolls the preview back into the
lead (instant — reduced-motion by construction). The preview-first
invariant gains exactly one owner-signed session-time exception,
recorded in UI-STANDARDS and ui-spec §2/§7 — a DOM mount, never CSS
`order`, so reading, visual and tab order remain one thing.

**Composition kept honest:** the section now follows the *source*
region's visibility in applyShell (late-bound — the shell applies
before the section exists), so preview focus still strips it; and it
no longer hides with the settings panel — D97's "settings geography"
consequence reverses to content geography, which matches the flow
(collapse the settings, keep region + preview). The wide-layout
thumb gains the content column's width in the bargain.

**Verified live:** mount precedes the preview, open, focus on the
toggle; collapse at scroll 400 → 0; lock at scroll 300 → 0; preview
focus hides / exit restores; panel collapse leaves it visible; stop
unmounts clean.

**Link:** ticket M14-FIX-01 (deleted on ship); UI-STANDARDS layout
rule + ui-spec §2/§7 amendments; evidence in `docs/ui-evidence.md`.

## D105 — M14-FIX-05/04/02: the small three from the first pass (2026-08-05)

**Decision:** the remaining first-pass findings landed as one pass.
**FIX-05:** the stats line drops its dimensions — the strip readout
already says "200 × 200 stitches" a few lines up, and the duplicate
was height the companion posture pays for; the info block's text
margins tighten to spacing-02 and the stacked-layout gap to
spacing-03. Measured at 380 px: canvas-to-source spans 128 px at the
spec default with every fact kept. **FIX-04:** a window-width guide
with zero standing chrome — a debounced (350 ms) line in the
existing status region during a resize burst below 960 px: "Window
380 px wide — works down to 320 px." / "narrower than the supported
320 px floor."; silent at roomy widths; the claim is the supported
floor, not an aesthetic optimum. **FIX-02:** `selfBrowserSurface:
'exclude'` + `surfaceSwitching: 'include'` on the capture request
(the app's own tab leaves its picker on Chromium; unknown members
ignored elsewhere), and the expectation copy now says the honest
thing in both of its homes: "choose the window you draw in — sharing
the whole screen includes this app." The platform limit is on
record: no web API removes a window from a monitor share, so
window-sharing is the 100 % answer — the owner's "not essential if
not viable" tolerance is answered with "partially viable, done".

**Link:** tickets M14-FIX-04/02 (deleted on ship; FIX-05 was
line-only); evidence in `docs/ui-evidence.md`. With these, all six
first-pass findings are closed — ACCEPT-01 unblocks for the formal
pass/fail session.

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
