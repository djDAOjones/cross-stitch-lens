# Interaction architecture & disclosure spec — M14-SPEC-01

The written design M14-IMPL-01..05 build and M14-VERIFY-01/02 measure
against. Inputs: `docs/ui-audit.md` (findings `A#`),
`docs/ui-journeys.md` (journeys `J#`, inventory), `UI-STANDARDS.md`
(binding). Decision entries: D76 (tier scheme), D77 (regrouping), D78
(first-run), D79 (terminology). No code changes in this task.

## 1. Tier scheme and the reach contract (D76)

Every control carries a tier. The tier defines its **maximum reach**
from the app's default populated state — counted in discrete
interactions (clicks/keypresses), scroll excluded, with the default
disclosure state (Design open, everything else collapsed):

| Tier | Who | Reach contract | Mechanism |
| --- | --- | --- | --- |
| **E** essential | first session | visible, ≤ 1 interaction to operate | on the default surface (open section, toolbar, source area) |
| **C** common | returning user | ≤ 2 (open one section, then operate) | Carbon accordion section, collapsed by default |
| **D** deep | designer/power | ≤ 3 (section + one inline disclosure) | inline disclosure *inside* a section |
| **dev** | maintainer | dev builds only | unchanged (debug panel + diagnostics) |

Disclosure state (which sections/disclosures are open) persists in the
**preferences store** (localStorage, `src/ui/preferences.ts`), never
the project file — a shared project must not rearrange an interface
(UI-STANDARDS shell rule). Preview focus and panel collapse semantics
are unchanged.

VERIFY-02 measures the reach column of the control table (§5) against
this contract.

## 2. Regions and DOM order (unchanged macro, D77 internals)

Macro order is **unchanged** (preview-first at every width, no CSS
`order`): header → layout (content column, then settings panel; panel
right of content ≥ 60 rem, stacked below it under 60 rem).

*(Amended M14-EXT-09/11, D95: the preview section is the sticky
unit — view strip · canvas host · compact status — pinned in both
layouts while everything after it scrolls beneath; the info panel
and dev profiling panel sit after it in the content flow, not inside
it. Focus non-obscuration is held by `scroll-padding-top` sized to
the pinned worst case. DOM order is still preview-first with no CSS
`order`.)*

*(Re-amended M14-FIX-03/06, D103 — superseding D95's scroll-linked
dock: the canvas height now **hugs the fitted design** under
auto-fit — fit the width, follow the aspect — clamped to a 10rem
floor and a posture cap (40dvh stacked, 60dvh wide), constant under
scroll. The scrolled-past-caps-to-40dvh behaviour is retired: its
height change fed back through scroll anchoring as a docked↔undocked
flap (owner's live session). Nothing in the layout is scroll-linked;
manual zoom freezes the height where the user left it; preview
focus fills the window by flex as before.)*

*(Amended M14-EXT-12, D97: during a capture session the whole
capture surface — thumb + crop overlay, session controls, readout,
draft badge — lives in a dynamic **Capture region** accordion
section, open on first appearance with persisted collapse; the
source section in the content column serves the cold entry only.
Supersedes D88's below-the-preview placement on the owner's
authority, D91.)*

*(Re-amended M14-FIX-01, D104 — superseding D97's panel-first slot
on the owner's first-pass review: the section mounts **in the
content column above the preview** while a session runs — tweak →
lock → collapse → progress. Session start hands focus to the
section's toggle; collapsing or locking scrolls the preview back
into the lead. The preview-first order gains this one session-time
exception (a DOM mount, never CSS `order`); the section follows the
source region's visibility, so preview focus still strips it, and it
no longer hides with the settings panel.)*

*(Amended M14-EXT-15, D101 — owner-signed A + D + S1: the section
gains an **"Aspect follows design"** toggle button, pressed by
default and reset each session. Unlocked, pins drag freely and the
design height follows the region (`deriveGridHeight`; stitches stay
square, nothing distorts); the height field disables with the reason
in its helper, and the readout appends "(height follows the
region)". Shift-drag frees a pin temporarily while locked — the
keyboard route to a free resize is the toggle itself. The Design
width/height fields join this section for the session (S1 — moved,
never duplicated) and return to Design on session end.)*

*(Amended fourth look, D106/D107 — M14-EXT-20..24, 28..30: the
region↔design coupling recut — the session toggle is **"Lock
aspect"**, default **off**; unlocked, a region drag or the new
**Stitch size** slider (source px per stitch, slider + exact readout
beside the compact one-row Size fields) re-derives **both** design
dimensions through the held scale (`deriveGridSize`), both fields
disabled-with-reason while derived; locked restores the D52 conduct
whole. **Preview focus retired whole** — its button was the mode's
only entry, so the mode went with it (compact status line deleted);
the preview instead **collapses like any region** via a bar
"Hide/Show preview" control — session-only, re-expanded by capture
start. A **Stats** section (design size · total stitches · colours in
use, carrying D98's never-silent limit duty) leads the settings
panel; the standing capture-region readout retired with its
coordinates — gesture ends announce through the status region.
Collapsed folds are **bare headings** (summaries retired app-wide).
**Colour** left Design as its own section; **Appearance renamed
Processing** (dither only), with the grid geometry reveal moved under
the view strip.)*

*(Amended fifth look, D109/D110 — M14-EXT-31..35: the **preview is a
real accordion section** — "Preview" h2-wrapped header, persisted
disclosure like every section, collapsed = bare heading; the whole
section still appears with the first frame, capture start still
re-expands it. The sticky unit gains the header; a **collapsed
heading is not sticky** (the class flips on toggle, never scroll —
D103 intact). The bar's Hide/Show preview and Hide/Show settings
toggles **retired** with their modes — the shell model reduces to
`cold` alone, and the `panelCollapsed` preference stops being
written (older records still parse; the field drops on next write).
Consequence, recorded: at ≥ 60 rem the 16 rem settings column always
stands — reclaim-the-width died with the mode. The capture section
is **"Capture"** (the crop overlay keeps its own "Capture region"
name), starts **every session expanded** — superseding D97's
persisted collapse; its disclosure is deliberately no longer
persisted — and carries the session controls inline again (see §5).
The grid-details reveal under the strip became the **Grid options
modal** (EXT-35, §5).)*

```text
header        h1 · shell bar [Source] · (dev: Debug menu)
content       preview accordion section [header ▸ view strip · canvas host]
              info panel [Colours by usage fold]
              status line (role=status)
              source section [empty state / import]
              (dev: profiling disclosure)
              — during a session, the Capture section mounts above the preview (D104)
panel (aside) accordion (collapsed = bare heading, EXT-22):
              ▸ Stats       (OPEN by default; readout, not controls)
              ▸ Design      (OPEN by default; Size — its permanent home, EXT-34)
              ▸ Colour
              ▸ Processing  (dither only)
              ▸ Export
              ▸ Project
              ▸ Advanced
```

- The **version/build line leaves the header** (A13): it renders as a
  small one-liner at the foot of the Project section ("Version v0.5.0
  · build v0.5.0+…"), still user-reachable (AGENTS.md traceable
  identity) without leading the page.
- The two `<section>`s gain accessible names (A12): "Preview" and
  "Source"; the accordion sections are labelled regions via their
  header buttons. Heading structure: h1 (app) + h2-equivalent section
  headers rendered as the accordion buttons (visually Carbon
  productive heading-01, programmatically real `<h2>` wrapping the
  button per Carbon accordion anatomy).
- Dev surfaces (profiling, diagnostics) stay exactly where they are
  (D50 placement), dev-only.

### Accordion behaviour

Carbon accordion anatomy, project-coded: each section = `<h2>` >
`<button aria-expanded aria-controls>` + panel region. Multiple
sections may be open at once (Carbon default); state persisted per
section (preferences). The header button stays visible when open (the
control that reveals a region lives outside it). Focus stays on the
header after toggle; no focus teleporting. Collapsed sections are out
of the tab order entirely (content unmounted or `hidden` — J3's ~130
tab stops die here).

**Collapsed state summaries** — *retired (M14-EXT-22, D107,
superseding the D93/D98/D99 lineage on the owner's ask): a collapsed
fold is its bare title; no stat or state rides a closed fold anywhere
in the app. The recognition duty moved to the always-readable Stats
section (EXT-21) before the flatten, so nothing went silent.*

*(Amended sixth look, D111/D112 — M14-EXT-38..44: the **status
region moved into the header**, stacked directly under the build id
(EXT-39, superseding the M2-era content placement; the header's
identity line itself returned at D88) — the content column no longer
reserves a status row, and the recorded trade is that deep-scrolled
narrow postures put announcements off-viewport. The **Design section
retired** (EXT-40): the Capture section is a standing settings
section — Zoom (the renamed Stitch size slider) and the Size fields
always, the session machinery only while a session runs; its
disclosure persists under `section-capture`, seeded from the retired
`section-design` key, and the D104 above-the-preview session mount is
unchanged. The **Advanced section retired** with the Processing
order select (EXT-44, the EXT-32 sunset); Processing carries the
reduce-first honour note for loaded legacy files. The info panel's
fold became a real **"Colours used"** accordion section in the
content column under the preview (EXT-41, the owner's rename), and
the settings aside dropped its layer-01 box so every region reads at
one hierarchy level. Panel census: Stats · Capture · Colour ·
Processing · Export · Project; content column: preview section ·
Colours used · source section.)*

## 3. First-run and the content column (D78)

**Empty state** (source section, before any import — answers J1/J2
obstacles, A4's "what next", IMPL-04 implements):

- Title line: "Turn a picture into a cross-stitch pattern".
- Two primary Carbon buttons, equal weight: **"Choose an image"**
  (opens the existing file input) and **"Capture your screen"**
  (existing capture start). *(Amended M14-EXT-07, D94: the "Try a
  sample" entry action is removed on the owner's ask; the sample — a
  deterministic in-code buffer, no asset, not the test fixture —
  survives solely as the Source modal's zero-permission demo route.
  The quiet "Open a project" tertiary from EXT-06 completes the
  stack.)*
- One sentence under the buttons: "You can also drop an image
  anywhere, or paste one." (the existing routes, now visually tied to
  the actions).
- Capture expectation copy (J2): a single line shown with the capture
  button: "Your browser will ask which window or screen to share."
- The status line's honest empty message stays.

**After first conversion**: the source section collapses to a compact
"Source: my-artwork.png · Replace / Capture" row (existing controls,
no new state) so the preview + panel carry the session. The silent
default palette (J1) is answered by the Design section being open with
"Thread palette · DMC" visible, plus the collapsed-summary line
thereafter.

**Capture session**: *(amended M14-EXT-21, D107: the standing
`Capture region … px → … stitches` readout retired — its numbers
live in the Stats section, and the owner cut the coordinates.)*
Gesture ends (drag-end / key-release, never per-move) announce
through the one status region — "Design 200 × 150 stitches from a
800 × 600 px region" while unlocked (naming a clamp at the cap),
"Region 800 × 600 px" while locked — so A8's keyboard feedback
survives the readout. Machine-token labels stay filtered
allow-list-style (A7): show the label only if it looks human, else
"the shared screen". The capture request hints `displaySurface:
'monitor'` (EXT-19) so the picker opens on the entire-screen tab
where honoured — a hint beside D105's exclusions, degrading silently.

**Unsaved-work honesty** (J5): the Project section carries the line
"Nothing is kept unless you save your project." — the M14-scope
answer to the no-autosave dead end; the autosave feature itself stays
out of the milestone (D75).

*(Amended DUR-01, D179: the sentence became the history standing line
(`#history-line`) — the design history restores the latest design on
reopen and the line steers to explicit save, with "Recent designs…" and,
near the storage quota, "Keep more designs" beside Save / Load. J5's
original sentence survives only when storage is refused.)*

### §3 amendment — cold surface as a shell state (M14-EXT-06, D93)

Before any source or project, the entry state is the page's only
product content: the settings panel, info strip, and the bar's
Hide settings / Preview focus toggles are hidden by a `cold` state in
the one shell model (`src/ui/shell.ts`), which overrides both
presentation preferences. Dev-only diagnostics stay (not product
surface). The entry stack gains a quiet fourth action **"Open a
project"** (the panel's Load input, so Load is never orphaned cold).
Exiting cold is one-way and session-scoped, fired by every source
route — file, capture, project open, drop, paste; source-bearing
exits announce "Design ready — settings are on the right/below", the
project route lets its own status speak. A focused entry action that
hides with the entry hands focus to the bar's Source button, never to
the void. Reload without a source lands cold again by construction
(no persistence).

Policy: user language on default surfaces; terms of art kept where the
craft uses them (dither method names — evidence-bearing, D62);
implementation words allowed only at D/dev tiers with an honest
helper; truthful-label rule (D72) unchanged where backends surface
(dev only). UK English throughout. Sentence case; labels 1–3 words;
no colons; visible label = accessible name.

| Current | Spec | Where |
| --- | --- | --- |
| "Order preset" / "Resize first" / "Reduce first" | "Processing order" / "Resize, then match colours (recommended)" / "Match colours, then resize" + helper "Resizing first is faster and usually cleaner." | Advanced |
| "Colour mode" options "Thread palette" / "Full RGB" | options "Thread palette" / "Unlimited colours (no threads)" | Design |
| "Palette source" | "Threads to choose from" | Design |
| "Only threads I own" | unchanged (already user language) | thread depth |
| "Show grid" / "Row and column numbers" | strip context shortens to "Grid" / "Numbers" (EXT-11, D95) — the long names stay here and in Grid details, where geometry is edited | view strip |
| "Colour limit" (select) | "Limit colours" switch + "Colours" slider + "Number of colours" field (EXT-13, D98) | Design |
| "Colour count" modes "Every permitted thread / At most… / Exactly…" | "Colour limit" — "No limit / At most… / Exactly…" | Design |
| "Find a thread" + placeholder "Search threads" | label "Find a thread", **no placeholder** (A20) | thread depth |
| "Mark N shown as owned" | "Mark N matching as owned" (A10 — acts on the filter) | thread depth |
| brand note "mapped colours" (hover only) | visible helper at thread depth: "colours mapped from DMC, not measured" | thread depth |
| "Serpentine scan" | keep + helper "Alternate row direction to reduce streaks" | Dither details |
| "Strength" | keep (helper already per-family) | Dither details |
| "Preset" (dither) | "Dither style" | Appearance |
| "Algorithm" | "Method" (craft term; names kept: Floyd–Steinberg…) | Dither details |
| "Export scale" helper | keep unit helpers; add derived size line "PNG will be 800 × 800 px" near the buttons (answers J4's three-surfaces question with a readout, not a new control) | Export |
| "Design title" (PDF) | unchanged | Export |
| "Capturing {label}." | allow-list rule above (A7) | source |
| "…chosen once an image is loaded" (transient, A11) | "…chosen when the design updates" | Design |
| diagnostics failure "denied.." | join error text without double punctuation (A19) | dev |

Everything not listed keeps its current copy (already sentence-case,
unit-named, honest — the audit's strengths list).

## 5. Control table

Tier/location/pattern per inventory row (`ui-journeys.md` order).
Reach = interactions from default populated state (contract §1).
Carbon patterns are named per Carbon's productive components,
implemented in project code.

| Control | Tier | Location | Carbon pattern | Reach |
| --- | --- | --- | --- | --- |
| Hide/Show settings | C | shell bar | ghost button + aria-expanded | 1 |
| Preview focus / exit | C | shell bar | ghost button, pressed state | 1 |
| Choose an image | E | empty state / source row | primary button + file input | 1 |
| Capture your screen | E | empty state / source row | primary button | 1 |
| Try a sample | E | Source modal only (EXT-07, D94: entry button removed on the memo's ask; the zero-permission demo route survives here) | modal choice button | 2 |
| drag-drop / paste | E | page-wide | (routes named in empty-state copy) | 1 |
| Capture frame / Pause / Lock / Stop | C | source row (live) | button group, pressed states | 1 |
| Crop overlay | E | source row (live) | interactive region (role=application) + status readout | 1+ |
| Zoom in / out | E | view strip (EXT-11, D95: permanent quiet row, fold retired) | ghost text buttons | 1 |
| Reset view | C | view strip (EXT-08, D95: the one surviving fit control under auto-fit; Fit / Fit width / Fit height retired, closing the D86 A16 waiver) | ghost text button | 1 |
| Compare + Split | C | view strip | ghost toggle button + inline slider | 1–2 |
| Grid / Numbers | C | view strip (moved from Appearance, EXT-11; anatomy change: switches → toggle buttons) | ghost toggle buttons, aria-pressed | 1 |
| zoom % · dimensions readouts | E | view strip (row end) | inline text | 0 |
| Design width / height | E | Design (open); during a capture session they join the Capture region section (EXT-15/S1, D101 — moved, never duplicated) and the height field disables while region-derived | number input, full anatomy | 1–2 |
| Aspect follows design | C | Capture region section (EXT-15/A, D101): toggle button, pressed by default, session-only; off frees the pins and the design height follows the region; shift-drag is the temporary exception (D) | toggle button, aria-pressed | 1–2 |
| Colour mode | E | Design | select | 1–2 |
| Threads to choose from (source) | C | Design | select | 1–2 |
| Preset mode (strict/prefer) | D | Design → shown with preset source | select (contextual reveal) | 2 |
| Limit colours (switch + slider + number) | C | Design (EXT-13, D98: switch default **on**, slider 1–64, number to 512; fresh default **at most 8**, named in the Design summary — supersedes D55's unlimited) | switch + native range + number | 1–3 |
| Use exactly this many | D | Design → depth, beside the thread-library disclosure (EXT-13) | checkbox | 2 |
| Thread library & rules (disclosure) | — | Design → inline disclosure | Carbon "read more"-style disclosure button | 2 to open |
| 8 brand checkboxes | C→D | thread depth | checkbox group, 44 px rows | 3 |
| Only threads I own | C→D | thread depth | toggle | 3 |
| Find a thread | D | thread depth | search input (44 px, labelled, no placeholder) | 3 |
| Per-row Own (×60) | D | thread depth | checkbox, per-row name "Own {thread}" (A2) | 3 |
| Per-row rule (×60) | D | thread depth | select (existing per-row names) | 3–4 |
| Bulk own / disown | D | thread depth | buttons + Carbon danger modal for disown (A6) | 3 (+modal) |
| Palette contents editor | D | thread depth, **library source only** (A5) | disclosure + ordered list with move/remove buttons | 3 |
| Save as palette | D | thread depth | button + **Carbon modal** for name (A6, replaces prompt) | 3 (+modal) |
| Delete palette / Undo | D | thread depth | button + inline undo (existing strength) | 3 |
| Export/Import inventory · Export palettes | D | thread depth | buttons + native file input | 3 |
| Show grid / Row & column numbers | — | *retired from Appearance (EXT-11, D95): live on the view strip as Grid / Numbers; the long names survive in this map (§4) and in Grid details, where geometry is edited* | — | — |
| Dither style (preset) | C | Appearance | select | 2 |
| Grid details (intervals, thicknesses, colour) | D | Appearance → "Grid details" | inline disclosure, number/colour inputs | 3 |
| Dither details (method, strength, serpentine) | D | Appearance → "Dither details" | inline disclosure | 3 |
| Export PNG / chart PNG / PDF (buttons) | E* | Export (buttons first in section) | primary buttons | 2 |
| Export scale + background (+colour) | C | Export → "PNG options" | inline disclosure | 3 |
| Chart cell size | C | Export → "Chart options" | inline disclosure | 3 |
| Page size / orientation / margin / title | C | Export → "PDF options" | inline disclosure | 3 |
| derived size line | E (read) | Export section top | inline text, state-derived | 0 |
| Save project / Load project | E | Project | primary button + labelled file input | 2 |
| "Nothing is kept unless you save" | E (read) | Project | inline text | 0 |
| version/build line | C (read) | Project foot | inline text (A13) | 2 |
| Processing order | D | Advanced | select, renamed (D79) | 2 |
| stats summary + colours table | E (read) | info panel — table collapsed by default (EXT-14, D99, flipping D90; persisted choice wins), the fold line carrying count + leading thread ("Colours by usage — 8 · DMC 310 leads"); EXT-17's row selection therefore sits at reach 2, within the C-tier contract | data table, hex visible in row text at depth (A14) | 0 (summary) / 2 (rows) |
| Highlight (per thread row) | C | colours table (EXT-17, D100): toggle per row, one selection, session-only; Escape/reselect clear; announcement carries the stitch count; preview scrim is a Compare-class decoration — exports byte-identical by construction | per-row toggle button, visible "Highlight" + accessible "Highlight {thread}" (A2), aria-pressed | 2 |
| status line / compact status | E (read) | unchanged | role=status | 0 |
| Profiling / Copy diagnostics | dev | unchanged | unchanged (D50) | 1 |

*Export buttons are E-tier actions in a C-tier section: reach 2 —
recorded as the one deliberate exception to "E means visible", because
exporting is never the *first* interaction of a session; the section
header + summary keep it findable at all times. VERIFY-02 measures it
as reach 2.

### §5 amendments — M14-EXT (owner feedback, D88/D89)

- **Top bar** (M14-EXT-01): the header is one app bar — title · quiet
  build id (returned from the Project foot; A13 reversed on owner
  call) · Source · Hide settings · Preview focus · dev-only
  diagnostics cluster (Copy diagnostics + **Download log**, a new
  affordance saving the same redacted bundle). Bar controls hide in
  preview focus except the exit; DOM order = tab order.
- **Source** (M14-EXT-02): top-bar button, E tier, reach 1 to open;
  opens a Carbon choice modal (Choose an image / Capture your screen /
  Try a sample + current-source note). The cold-start entry state
  remains the first-run path; the compact source row is retired;
  capture session surfaces stay below the preview.
- **View controls** (M14-EXT-03): the zoom/fit/compare buttons live in
  a persisted `View controls` disclosure — open on first run, so the
  supersession of the D86 Fit-menu waiver is: all view buttons at
  reach 1 (first run) / 2 (after a user folds it); the zoom % and
  dimensions readouts stay permanently visible.
- **Naming** (M14-EXT-04): "Pattern width/height" → **"Design
  width/height"**; the sub-legend reads "Size" under the Design
  section header. Stored values and schema untouched.

### §5 amendments — fourth look (D106/D107, M14-EXT-19..30)

- **Shell bar**: Preview focus / exit retired with its mode (EXT-24);
  **Hide/Show preview** takes its place (EXT-23) — ghost button,
  aria-expanded, session-only state, capture start re-expands.
- **Stats** (EXT-21): new first section, C-tier readout (reach 0 open
  by default) — design size · total stitches (+empty) · colours in
  use with the limit named; no coordinates, no aspect state.
- **Design** (EXT-20): the Size fields share one compact row (labels,
  helpers and 44 px targets kept); a **Stitch size** slider (label +
  "Source pixels per stitch" helper, slider + exact px readout) rides
  with them — hidden without a session, disabled-with-reason while
  aspect is locked. Both Size fields disable-with-reason while
  unlocked (both derive). The session toggle is **"Lock aspect"**,
  default off, superseding D101's "Aspect follows design" default-on;
  shift-drag and the toggle keep their D101 keyboard roles.
- **Colour** (EXT-28/29): its own section after Design. Anatomy:
  **Threadify colours** switch (the full-RGB↔threads boolean, reading
  A of the memo) → **Constrain number of colours** switch (the count
  limit; `Use exactly this many` retired — the switch means "at most
  n"; core still honours a loaded exact policy, edits write max) →
  Colours slider + number input + **− / + steppers** (aria-labels
  "Fewer/More colours", the ↑/↓ A2 precedent), all in lockstep, the
  steppers announcing through a dedicated polite region → the source
  select (M15's future "Colour profile" slot) → summary, conflicts,
  thread depth.
- **Processing** (EXT-30): Appearance renamed, holding the Dither
  group only; the stored `section-appearance` disclosure preference
  seeds `section-processing` by fallback. **Grid details** moved out
  of the panel to the view strip's reveal (between strip and canvas,
  same `grid-details` key).
- **Debug menu** (EXT-26): the dev cluster's loose buttons gathered
  under one labelled `details` disclosure ("Debug") — Copy
  diagnostics · Download log · **Email the dev** (downloads the
  redacted log, then opens a prefilled mailto whose body says to
  attach it; identity-only content, address a placeholder constant).
- **Trackpad** (EXT-27): while the canvas host is engaged, ctrl-wheel
  pinch zooms about the pointer and plain wheel pans (Safari gesture
  events equivalently); unengaged stays wheel-inert — the EXT-10
  promise verbatim, regression-tested (`wheelIntent`).
- **Session controls** (EXT-25, owner-picked option A, D108): the
  Source button reads **"Capturing — Source"** during a session and
  its modal leads with Stop capture (primary) · Pause/Resume ·
  Capture frame above the source choices; inline, the session row is
  Lock region beside Lock aspect only. Stop is bar-reachable at all
  times; nothing cut — the pump-death recovery copy points at the
  Source menu.

### §5 amendments — fifth look (D109/D110, M14-EXT-31..35)

- **Preview header** (EXT-31): the preview collapses from its own
  accordion header — the bar Hide/Show preview button retired one
  look after it shipped. Disclosure persisted (`preview-section`
  key); capture start re-expands and persists the re-expand.
- **Settings toggle retired** (EXT-32): the whole-panel collapse mode
  is gone (M6-PANEL-01 sunset) — sections already collapse
  individually; `ShellState` reduces to `cold`;
  `body.panel-collapsed` (already consumer-less) and the
  `panelCollapsed` preference die.
- **Capture recut** (EXT-33, superseding D108's option A on the
  owner's authority, live): the section renames to **"Capture"**,
  opens expanded at every session start (superseding D97's persisted
  collapse — the disclosure is deliberately not persisted), and the
  session controls return inline: **Stop capture · Pause/Resume
  capture (aria-pressed) · Capture frame · Lock aspect · Lock
  region** — one row, one owner per control. The Source button reads
  **"Source" at all times**; its modal holds the three source
  choices only (no primary during a session — emphasis would nudge
  replacing the live source). The D108 bar-reachability fixed point
  is consciously given up — named for ACCEPT-01. Pump-death recovery
  copy points at the Capture section.
- **Design never empty** (EXT-34, option A — retiring D101's S1
  reparent; the lock-conduct and derive halves of D101 stand): Size
  lives in Design permanently; only the session-only **Stitch size**
  slider lives in the Capture section. Rationale recorded: Stats
  already shows the design size beside the capture settings, and the
  unlocked default disables the Size fields during sessions anyway —
  reparenting disabled fields was noise that left Design an open
  heading over nothing.
- **Grid options modal** (EXT-35, superseding EXT-30's under-strip
  reveal and EXT-11's strip Numbers toggle): the strip keeps **Grid**
  (on/off) plus a **"Grid options"** trigger; the modal — the new
  live-apply form-modal variant (`formModal`) — holds Minor/Major
  interval, Line colour, Minor/Major thickness, **Numbers** (the
  strip toggle folded in) and **Number size** (`tickFontPx`,
  surfaced for the first time; the chart export shares it). No
  Apply — Close/Escape/backdrop all just close; focus returns to the
  trigger. The `grid-details` disclosure preference retired. Strip
  budget re-measured: controls hold two rows to the 320 px floor
  (readouts take a third line there — pre-existing, identical with
  the old Numbers label).

**Anatomy baseline for every control** (IMPL-02): visible label =
accessible name; helper only where it prevents error; validation +
disabled states with a stated local reason where the reason is not
adjacent (A9: the Dither group, when disabled by Unlimited colours,
shows one line "Dithering applies to thread palettes"); ≥ 44 × 44 px
targets including checkboxes (A1) and the search/summary gaps (A3);
no colour-only state.

### Sixth look amendments (D111/D112, M14-EXT-38..44)

- **Capture row** (EXT-38): **Stop capture · Freeze · Lock aspect ·
  Lock region**. Capture frame retired (the owner named the cut D108
  declined); the session-start grab survives in code. Freeze flips
  its label (Freeze ↔ Unfreeze) with no `aria-pressed` — a flipping
  label is two actions, and the pump-death recovery copy points at
  the literal Unfreeze button (a dead pump enters the frozen state).
- **Zoom** (EXT-40): the Stitch size slider's owner-chosen rename —
  factor unchanged (source px per stitch, "3×"), unit in the helper;
  disabled-with-reason without a session. The vocabulary collision
  with the preview strip's zoom (a different D52 resolution) is
  deliberate, helper-disambiguated, and on ACCEPT-01's list. Stats
  gains a **Stitch size** readout row (the ratio for any source).
- **Colour** (EXT-42): the count cluster packs the slider, exact
  field and steppers side by side with one shared helper; the summary reads
  availability alone ("489 threads available." — selected/used/limit
  are Stats' numbers, EXT-21); brand provenance renders as marked
  exceptions ("mapped colours") plus one shared group note. The
  steppers stay (their cut would reverse the owner's EXT-29 ask);
  the library-button re-home is M15-UI-01's deletion, not refined
  here (D115).
- **Processing order** (EXT-44): the select and the Advanced section
  are retired. Core honours a loaded `reduce-first` file
  byte-identically and says so — a standing note in Processing plus
  a load-status tail; there is no edit route back.
- **Colours used** (EXT-41): the "Colours by usage" fold is a real
  accordion section named **Colours used**, content column, under
  the preview; collapsed-by-default survives as the spec default and
  the old `colours-table` disclosure key seeds the new id. Reach
  unchanged: 0 to the heading, 2 to a highlight row. Flagged for
  ACCEPT-01: the near-twin with Stats' "Colours in use" row.
- **No-rebuild contract** (EXT-43): panel regions rebuild only when
  their structural fingerprint changes; value-only changes land in
  place on existing elements, selected values are never structural,
  and focused controls are never written to. Pinned by the
  palette-panel fingerprint suite — the contract M15's editor
  inherits by name (D114).

### M15 amendments (D122–D125 — the profile world)

- **Colour section census** (M15-UI-01): Threadify colours · Colour
  profile select (+ Edit profiles…) · the (edited) verbs Update
  profile / Save as new / Revert · Constrain + count cluster ·
  Minimum distance · Must-use chips with search-to-add · the
  conflicts list · the My-inventory reveal (My threads until D176; ownership stayed
  its own concern). The Threads-to-choose-from select, brand
  checkboxes, per-thread rule selects, preset mode, saved-palette
  editor and library buttons all retired with `palette-panel.ts`.
  An unlinked design (a migrated old file) names itself "This
  design's colours" — the never-lying sentinel, both kinds.
- **Processing census** (M15-DITH-03): Dithering profile select
  (+ Edit profiles…) only; the Dither style select and details
  reveal retired — the editor absorbs depth. Full-RGB disables the
  surface with "Dithering applies to thread palettes." The section
  name stays "Processing"; the rename is the owner's gate (D117).
- **The takeover editor** (M15-UI-02..04): a view swap over the app
  layout — header and status region stay; switcher + New / Duplicate
  / Rename / Delete; draft-then-Save (the recorded §5.4 exception,
  D114) with a guarded discard; built-ins read-only with
  duplicate-to-edit; the judgement preview renders the real pipeline
  draft-labelled (design still, photo slots with honest offline
  states, test card, ÷1/÷4/÷16 grid). Ids are kind-prefixed — both
  kinds' editors stay mounted once opened.

### Live-app amendments (D176–D183 — MYTHREADS-01, PUB-01, DUR-01, DIAG-02)

- **Preview section** (MYTHREADS-01, D176): while Threadify is on and
  the design's palette is null, a banner beside the picture says no
  palette applies and why, with **Use DMC** (adopts the DMC profile —
  an explicit act, never a silent substitution) and **Add threads**
  (opens the Colour section's inventory reveal, search focused). The
  built-in profile and the reveal are named **My inventory**; while
  the inventory is empty the profile option is disabled with its reason.
- **Control table rows** (PUB-01, D177; DIAG-02, D183):
  `Licences | C | header utility row | ghost button → Close-only dialog | 1`;
  `Report a problem | dev (+ ?diag=1) | Debug menu, first route | button → saves the settings document + the redacted log, opens the compose window | 1`.
  Keyboard model unchanged.
- **Project section census** (DUR-01/SAVE-01, D179): Save / Load (a
  `.pmproj` package; legacy `.json` still loads) · the history standing
  line (`#history-line`) · **Recent designs…** (newest first, with age,
  size and saved state) · **Keep more designs** (near the quota only;
  the `persist()` opt-in) · the version/build line. Save takes the
  Design title as the filename.

## 6. Keyboard model

- Tab order = DOM order = visual order (unchanged rule; no positive
  tabindex, no CSS `order`). Collapsed regions contribute nothing to
  the tab order.
- Accordion/disclosure headers: Enter/Space toggle; focus remains on
  the header; `aria-expanded` + `aria-controls` carried.
- Canvas: `+`/`−` zoom and arrows pan unchanged; `0` is **Reset
  view** (EXT-08 — one rule with the strip button). Pan engagement
  *is* host focus (EXT-10): unfocused, wheel and drag belong to the
  page; a click engages (native focus, the ring is the engaged
  state). *(Amended EXT-27, D107: while engaged, ctrl-wheel pinch
  zooms about the pointer and a plain wheel pans — gestures are an
  addition, never the only route; the unfocused surface keeps the
  EXT-10 wheel-inert promise verbatim.)* Escape on a focused canvas
  blurs it and is consumed — disengaging is one deliberate step
  (preview-focus mode retired at EXT-24).
- Crop overlay: arrows move, shift+arrows resize (unchanged); the
  status readout announces the result (§3).
- Modals (palette name, bulk disown): Carbon modal keyboard contract —
  focus trapped inside while open, Escape cancels, focus returns to
  the invoking control on close. The one sanctioned focus move.
- No new global shortcuts this milestone (candidate list — save,
  section jumps — deferred; recorded as unforced intent for a later
  milestone).

## 7. Unchanged invariants (the "what does not change" list)

Preview-first DOM order at every width *(amended D104: one
owner-signed session-time exception — the Capture region section
precedes the preview while a session runs, as a DOM mount)*; no CSS
`order`; 320 px
companion baseline (no page-level horizontal scroll; preview keeps
the width majority); *(preview-focus semantics retired whole with the
mode, EXT-24/D107; the preview collapse — EXT-23, then EXT-31: the
section's own persisted header, the accordion contract satisfying
"the control lives outside the region" — takes the row)*;
*(panel-collapse semantics retired with the mode, EXT-32/D110 —
section disclosures are the persistence that remains)*; controls
apply immediately — no Apply
buttons; shell/ disclosure state in preferences, never the project
file; no pipeline semantics change; no project-file schema change; no
new runtime dependencies; exports re-run at full quality; thread
colours never routed through UI tokens; conflict sentences remain
full sentences in a polite live region; canvas keyboard operability;
the four resolutions stay four independently-owned quantities (the
derived size line is a readout, not a control). *(Re-amended D107,
superseding D101's height-only split: with aspect unlocked —
M14-EXT-20, now the session default — the region's size writes
**both** design dimensions through the held source-px-per-stitch
scale; the quantities stay independently owned while locked, and the
sanctioned crossing is announced at every gesture end while it is
live.)*

## 8. Audit findings answered (closure index)

| Finding | Answered by |
| --- | --- |
| A1 targets | §5 anatomy baseline (44 px checkboxes/search/summary) |
| A2 Own names | §5 per-row "Own {thread}" |
| A3 selector gaps | §5 anatomy baseline (element-class heights, SPEC-02 tokens) |
| A4 depth | §1 reach contract + §2 accordion + thread-list disclosure |
| A5 empty disclosure | §5 palette editor library-only |
| A6 prompt/confirm | §5 Carbon modals |
| A7 capture label | §3 allow-list rule + D79 row |
| A8 crop feedback | §3 position-bearing status readout |
| A9 disabled reason | §5 anatomy baseline (local reason line) |
| A10 "shown" | D79 "matching" |
| A11 transient copy | D79 "when the design updates" |
| A12 landmarks/headings | §2 named sections + accordion h2s |
| A13 version line | §2 Project-foot placement |
| A14 hover-only hex | §5 stats row (hex in visible text) |
| A15 role=img | §5 crop/preview host roles (operable semantics; IMPL-02 names the exact role + description split) |
| A16 toolbar economy | §5 Fit-options menu; header slimming (A13) |
| A17 FIT_MARGIN clip | **deferred with reason**: canvas-rendered furniture, not DOM UI; stays wish-listed (D73) — out of M14's UI-only DOM scope |
| A18 stale live status | **deferred with reason**: needs a worker/timing change (staleness bound), performance territory — routed to M13 remainder, not a UI restructure |
| A19–A22 | D79 rows + §2/§5 placements (A21 wholesale via IMPL-01, A22 via Export section structure) |

## 9. Token reference (M14-SPEC-02, D80)

`src/ui/styles/tokens.css` is the single source of truth — two
systems, one file, never collapsed: **project tokens** (capture-region
state set; status colours deliberately none — words carry status) and
**carbon-convention tokens** (spacing, type, layer/field/border,
interaction states, focus, motion) under the `--csl-` prefix.
Unconsumed until IMPL-01. `scripts/check-contrast.mjs` (gate step
`check:contrast`) parses the file's `@pair` annotations and enforces
AAA in both schemes; `@exempt` lines are printed decisions.

**AAA adaptations from Carbon** (Carbon is baseline, not ceiling):
helper text shares the secondary colour (Carbon's helper greys read
~5:1); control borders use the strong border token (Carbon's subtle
border is decorative-only here); the focus ring stays `currentColor`
at 3 px rather than Carbon's focus blue (passes every surface in both
schemes with no special case).

### Contrast pair table (computed by the gate, 2026-07-23)

| Pair | Bar | Light | Dark |
| --- | --- | --- | --- |
| text-primary on background | 7:1 | 18.10 | 16.45 |
| text-primary on layer-01 | 7:1 | 16.45 | 13.76 |
| text-primary on background-hover | 7:1 | 14.77 | 13.23 |
| text-primary on background-active | 7:1 | 10.59 | 10.50 |
| text-primary on background-selected | 7:1 | 13.71 | 11.49 |
| text-primary on field-01 | 7:1 | 16.45 | 13.76 |
| text-secondary on background | 7:1 | 7.81 | 10.59 |
| text-secondary on layer-01 | 7:1 | 7.10 | 8.86 |
| text-helper on background | 7:1 | 7.81 | 10.59 |
| text-helper on layer-01 | 7:1 | 7.10 | 8.86 |
| text-inverse on background-inverse | 7:1 | 18.10 | 16.45 |
| heading on background | 4.5:1 (large) | 18.10 | 16.45 |
| border-strong on background | 3:1 (non-text) | 3.32 | 3.60 |
| border-strong on layer-01 | 3:1 (non-text) | 3.02 | 3.01 |
| field-border on field-01 | 3:1 (non-text) | 3.02 | 3.01 |
| interactive on background | 3:1 (non-text) | 5.00 | 5.41 |
| focus on background | 3:1 (non-text) | 18.10 | 16.45 |

Exempt (declared with reasons in the file): `disabled-opacity`
(WCAG 1.4.3 inactive-control exemption), `border-subtle` (decorative
only), the capture-region set (content-adjacent double-ring design).

### Inventory-to-token mapping (audit style inventory → owner)

| Audited value | Token |
| --- | --- |
| `--text` / `--bg` / `--border` (`index.html`) | `text-primary` / `background` / `border-strong` |
| body/field spacing (1rem, 0.75rem, 1.5rem, 0.5rem…) | `spacing-03..07` |
| type sizes 32/16/14/12 px | `heading-04`, `body-01`, `body-compact-01`/`label-01` (the 32 px h1 adopts `heading-04` 28 px at IMPL-01 — deliberate slimming, A16) |
| `min-height: 44px` per-type selectors | `target-min` (2.75 rem) applied by element class; `field-height-lg` 3 rem for fields |
| toggle track/thumb geometry + 0.1 s ease-out | toggle keeps Carbon proportions; motion → `duration-fast-02` + `easing-productive` |
| `:focus-visible` 3 px currentColor | `focus` / `focus-width` / `focus-offset` |
| panel/table 1 px borders | `border-strong` (controls) / `border-subtle` (decorative rules) + layer model at IMPL-01 |
| crop overlay colours, dim, handles | project capture-region set |
| grid default `#666666`, tick 11 px (worker) | **intentionally untokenised** — chart furniture is content-adjacent worker state (`DEFAULT_GRID_STYLE`), not UI chrome |
| preview host `60dvh`/`16rem`, breakpoint `60rem`, panel `16rem`, scroll-padding reserve `40dvh + 12rem` (EXT-36 re-measure: header + three floor-width strip rows) | layout literals defined in IMPL-01's stylesheet; breakpoints cannot read custom properties (CSS limitation) — recorded, not tokenised |
| swatch/table cell paddings | `spacing-02..04` at IMPL-01 |

### Scales (Carbon names)

Spacing `spacing-01..09` = 0.125 / 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 /
2.5 / 3 rem. Type: `code-01`, `label-01`, `helper-text-01`,
`body-compact-01`, `body-01`, `heading-01..04` as size/line/weight
triplets (productive ramp). Motion: `fast-01` 70 ms, `fast-02` 110 ms,
`moderate-01` 150 ms, `easing-productive`; all durations zeroed at the
token layer under `prefers-reduced-motion`.

## 10. Decision index

- **D76** — tier scheme + reach contract (§1), measurable by VERIFY-02.
- **D77** — regrouping 7 → 5 sections with per-change rationale (§2).
- **D78** — first-run emphasis: two equal entries + generated sample +
  capture expectation copy + unsaved-work honesty (§3).
- **D79** — terminology policy + map (§4).
- **D80** — token architecture: single-file source of truth,
  `@pair`/`@exempt` contract in the gate, AAA adaptations (§9).
- Deliberate exceptions recorded: Export-buttons reach 2 (§5 note);
  A17/A18 deferrals (§8).
