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

*(Amended M14-EXT-09/11, D95: the preview section is now the sticky
dock unit — view strip · canvas host · compact status — pinned in
both layouts while everything after it scrolls beneath; the info
panel and dev profiling panel sit after it in the content flow, not
inside it. At the companion width, scrolling past the preview's
natural position caps the canvas to 40dvh; scrolling back restores
it. Focus non-obscuration is held by `scroll-padding-top` sized to
the docked worst case. DOM order is still preview-first with no CSS
`order`.)*

*(Amended M14-EXT-12, D97: during a capture session the whole
capture surface — thumb + crop overlay, session controls, readout,
draft badge — lives in a dynamic **Capture region** accordion
section mounted first in the settings panel, open on first
appearance with persisted collapse; the source section in the
content column serves the cold entry only. Supersedes D88's
below-the-preview placement on the owner's authority, D91.)*

```text
header        h1 · shell bar [Hide/Show settings · Preview focus]
content       preview section [toolbar · canvas host · compact status · info panel]
              status line (role=status)
              source section [empty state / import + capture + crop]
              (dev: profiling disclosure · copy diagnostics)
panel (aside) accordion:
              ▸ Design      (OPEN by default)
              ▸ Appearance
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

**Collapsed state summaries** (recognition over recall): each closed
section header carries a derived one-line summary of its live state —
Design: "200 × 200 · DMC · all colours"; Appearance: "grid on ·
Balanced dither"; Export: "PNG ×1 · chart 10 px · A4"; Project:
"unsaved changes" / "saved as …". Derived from state at render, never
scraped from DOM (status-line precedent).

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

**Capture session**: crop readout gains position and becomes a polite
status ("Region 600 × 600 px at (100, 40) → 200 × 200 stitches"),
updated at drag-end / key-release, answering A8 without per-move
flooding. Machine-token labels are filtered allow-list-style (A7):
show the label only if it looks human (has a space or is a known
surface word), else "the shared screen".

**Unsaved-work honesty** (J5): the Project section carries the line
"Nothing is kept unless you save your project." — the M14-scope
answer to the no-autosave dead end; the autosave feature itself stays
out of the milestone (D75).

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
| Pattern width / height | E | Design (open) | number input, full anatomy | 1–2 |
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

**Anatomy baseline for every control** (IMPL-02): visible label =
accessible name; helper only where it prevents error; validation +
disabled states with a stated local reason where the reason is not
adjacent (A9: the Dither group, when disabled by Unlimited colours,
shows one line "Dithering applies to thread palettes"); ≥ 44 × 44 px
targets including checkboxes (A1) and the search/summary gaps (A3);
no colour-only state.

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
  state); wheel never moves the canvas in either state. Escape on a
  focused canvas blurs it and is consumed; preview-focus mode exits
  on the *next* Escape (its exit button remains the guaranteed
  route).
- Crop overlay: arrows move, shift+arrows resize (unchanged); the
  status readout announces the result (§3).
- Modals (palette name, bulk disown): Carbon modal keyboard contract —
  focus trapped inside while open, Escape cancels, focus returns to
  the invoking control on close. The one sanctioned focus move.
- No new global shortcuts this milestone (candidate list — save,
  section jumps — deferred; recorded as unforced intent for a later
  milestone).

## 7. Unchanged invariants (the "what does not change" list)

Preview-first DOM order at every width; no CSS `order`; 320 px
companion baseline (no page-level horizontal scroll; preview keeps
the width majority); preview-focus semantics (exit control persistent,
compact status only, session-only state); panel-collapse semantics +
persistence; controls apply immediately — no Apply buttons; shell/
disclosure state in preferences, never the project file; no pipeline
semantics change; no project-file schema change; no new runtime
dependencies; exports re-run at full quality; thread colours never
routed through UI tokens; conflict sentences remain full sentences in
a polite live region; canvas keyboard operability; the four
resolutions stay four independently-owned quantities (the derived
size line is a readout, not a control).

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
| preview host `60dvh`/`16rem`, breakpoint `60rem`, panel `16rem` | layout literals defined in IMPL-01's stylesheet; breakpoints cannot read custom properties (CSS limitation) — recorded, not tokenised |
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
