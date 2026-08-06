# UI evidence — M14 implementation record

Per-task verification evidence for the M14 implementation phase
(D73: decisions recorded, judged once at M14-ACCEPT-01). Before-state
references are `docs/ui-audit.md` + `docs/ui-journeys.md` (build
`9758da2`); each task section below records what changed, the matrix
run, and any deviation discovered.

## M14-IMPL-01 — Carbon shell & layout (2026-07-23, D81)

**What changed**: the `index.html` dev-shell block (≈450 lines) is
gone; styling lives in `src/ui/styles/` — `tokens.css` (SPEC-02) +
`base.css` (element layer: reset, `[hidden]`, focus, type ramp,
generic fields/buttons/toggle/tables) + `shell.css` (header, columns,
preview host, focus-mode chain, capture surfaces, panel containers) —
imported from `src/main.ts` in cascade order. `index.html` keeps an
8-line critical block (recorded reason: pre-bundle dark-scheme paint;
nothing else can flash unstyled since the DOM is bundle-built).
M6 why-comments ported with their rules.

**Visible changes** (shell only; groups/controls untouched this task):
productive type ramp (body 14 px, h1 28 px — A16 slimming), header
gains a decorative bottom rule, settings column reads as a Carbon
layer (layer-01 surface + subtle border, field-02-style inputs),
table row rules subtle, hover/active states on buttons, spacing on
the Carbon scale throughout.

**Matrix run** (in-session browser, Chromium 148):

| Check | Result |
| --- | --- |
| Desktop light, populated | pass — screenshot in session record; layer panel, ramp, header rule |
| Dark scheme (tokens) | pass — all colours flip at the token layer; tick labels re-colour |
| 320 px | pass — zero horizontal overflow; chrome above canvas ~660 px (was ~760); toolbar wraps 2 rows (was 3) |
| Preview focus at 320 | pass — no page scroll (900 px viewport), host 563 px, h1 → heading-02, compact status only, focus moves to host and returns on exit |
| Reduced motion | pass by construction — durations zeroed at the token layer (`tokens.css`); the only transition consumes the token |
| Keyboard walk | unchanged — tab order untouched (DOM unchanged), focus ring now token-driven at same geometry |
| Engine surfaces | untouched — no diffs under `src/core`, `src/worker`, `src/export`; ui-baseline tripwire green in `check` |

**Invariants restated as tests** (`tests/ui-styles.test.ts`): the
`[hidden] !important` rule; no CSS `order` in any stylesheet; the
dev-shell selectors absent from `index.html` (critical block present);
stylesheet import order in `main.ts`.

**Observed, not a regression**: an abrupt viewport resize can paint
one stretched frame until the next view change redraws (pre-existing
worker resize race; reproduced identically before and after the CSS
move — cross-ref audit A18 territory, M13 remainder).

**Deviation from before-state page height** at 320 px populated:
14,495 → 13,424 px (denser ramp); the structural fix lands at
IMPL-03.

## M14-IMPL-02 — Control anatomy upgrade (2026-07-23, D82)

**What changed**: field builders gained the Carbon linkage anatomy —
helpers carry ids and ride `aria-describedby`; the number field's
snap-back now announces itself ("Adjusted to N — allowed range
min–max.", `role="status"`, linked, `aria-invalid` while showing,
cleared on the next valid entry). Checkboxes are Carbon-drawn
(1.25 rem box, drawn tick — state never colour-only) with the house
pseudo-element hit extension to the 44 px floor (A1); every "Own" box
carries "Own {thread}" as its accessible name (A2); every `summary`
is a ≥ 44 px target (A3b). `window.prompt`/`window.confirm` are gone:
a project-coded Carbon modal (`src/ui/modal.ts`) provides the text
prompt (palette naming) and danger confirmation (bulk disown) with
focus trap, Escape cancel, backdrop cancel, and focus restoration;
the danger default lands on Cancel (A6). The Dither group shows its
local reason when disabled (A9). The preview host and crop overlay
are operable roles with concise names and linked instructions (A15).
Info-panel rows carry the hex in visible text (A14). Inverse-filled
buttons keep their fill under hover/active (an IMPL-01 state-layer
gap caught here).

**Verification** (live, Chromium 148 + jsdom suites):

| Check | Result |
| --- | --- |
| Checkbox hit area | `elementFromPoint` 10 px outside the drawn box resolves to the input; 44 px effective target measured |
| Own names | "Own DMC 3808 Turquoise ultra very dark" observed in-tree |
| Correction announcement | 99999 → "Adjusted to 1024 — allowed range 1–1024." linked via describedby, `aria-invalid` set; clears on valid entry |
| Modal | opens labelled (`aria-modal`, title id), focus lands in seeded input, Escape cancels, focus returns to invoker — all verified live; the trap's decision arithmetic is pure (`trapTarget`) and node-tested |
| Dither disabled reason | visible exactly when full-RGB disables the group |
| Host/crop roles | `application` + concise label + `aria-describedby` help text |
| Suites | pure halves per the house convention (no DOM library): `tests/modal.test.ts` (trap arithmetic + describedby list ops, 10 tests); info-panel assertions updated ×2 for the A14 labels (intended change, stated); palette/dither panels green |

**Anatomy adaptations recorded** (D82): error red is an edge marker
only (Carbon's error text red reads ~4.5:1 — under AAA text bars);
message text stays `text-primary`. The number field never *stays*
invalid (snap-back is prevention), so `aria-invalid` marks the
correction moment, not a persistent error state.

## M14-IMPL-03 — Progressive disclosure & IA restructure (2026-07-23, D83)

**What changed**: the seven flat groups became the spec's five
accordion sections (`src/ui/accordion.ts` — real `<h2>` wrapping the
toggle, `aria-expanded`/`aria-controls`, panel out of layout and tab
order via `hidden`, derived closed-state summaries). Depth reveals are
native `<details class="depth-reveal">`: Thread library & rules
(inside Design — brands, inventory, search, 60-row list, bulk,
saved-palette editor, library actions), Grid details, Dither details,
and per-exporter PNG/Chart/PDF options. Export leads with a derived
size readout and its three buttons (A22). The saved-palette editor
renders only for a library source (A5). The version line moved to the
Project foot (A13); the Project section carries the unsaved-work
honesty line (D78). Disclosure state persists per id in the
preferences store (never the project file); first-run defaults are
the spec's (Design open, everything else closed).

**Measured** (live, Chromium 148):

| Metric | Before (audit/journeys) | After |
| --- | --- | --- |
| Default page height, desktop populated | 11,760–14,495 px | **3,877 px** |
| Page height with thread depth open | — | 10,529 px (only while open) |
| Settings-column tab stops, default surface | ~130+ | **11** (focus-probed; closed reveals and hidden panels reject focus — note: `getBoundingClientRect`/`offsetParent` sweeps false-positive on closed `<details>` in Chromium's `content-visibility` implementation; VERIFY-01 must probe focus, not bounding boxes) |
| Export PNG reach | 13-screen scroll + click | 2 interactions (section, button) |
| Thread-depth reach (brand checkbox) | visible in a 16-screen page | 2 interactions (reveal, control) |
| Grid-colour reach | scroll | 3 interactions (section, reveal, control) — D-tier contract ≤ 3 ✓ |

**Behaviour checks**: focus stays on the section header across
toggles; heading structure is now h1 + five h2s (A12); preferences
round-trip verified across reload (Appearance reopened, Design
default-open, Export closed); summaries derive from owned state
("grid on · dithered", "PNG ×1 · chart 10 px · A4", "not saved this
session", "resize first") and refresh on the state paths; the
construction-order TDZ found during this task (applyPolicy →
refreshSections before assembly) is guarded and the app boots clean.
`check` green (938 tests); engine surfaces diff-clean.

## M14-IMPL-04 — First-run & guidance layer (2026-07-23, D84)

**What changed**: cold start presents the entry state (D78) — "Turn a
picture into a cross-stitch pattern", two filled primary actions
(Choose an image / Capture your screen), "Try a sample", the
capture-expectation line ("Your browser will ask which window or
screen to share."), and the drop/paste routes line. After the first
conversion the source area compacts to "Source: {name}" with the
labelled file input as the replace route and the plain capture button
restored (session buttons take over while live). The sample
(`src/ui/sample.ts`) is a drawn deterministic test-card — hue sweep ×
lightness ramp, greyscale band, eight flat swatches — fed through the
normal source path (nothing mocked; 320 colours through the default
palette). The crop readout is now a polite status carrying **size and
position**, updated at end-events only (key press, drag end, session
start, reframe — A8 closed without status flooding). Capture labels
pass an allow-list human-shape test before appearing in status copy
(A7; `displayLabel` rewritten). Thread list distinguishes "no matches
for this search" from "no brands enabled" (filtered-out empty state).
Processing order gained its consequence helper.

**Empty-state matrix** (every panel × variant, per UI-STANDARDS):

| Panel | nothing yet | filtered out | failed | unavailable |
| --- | --- | --- | --- | --- |
| Preview/status | entry state + "No image yet…" | n/a | import errors name cause + retry route | n/a |
| Info panel | "No design yet — stats appear after import." | n/a | n/a (derives from frames) | n/a |
| Thread list | conflict sentences (no brands) + pointer | search-no-match message | n/a (static catalogue) | n/a |
| Saved palettes | editor hidden for non-library sources (A5) | n/a | library errors set status + log | memory-fallback sentence ("storage unavailable…") |
| Capture area | expectation line pre-session | n/a | decline/failure sentences (existing, per-error) | unsupported-browser sentence (existing) |
| Debug panel (dev) | "No frames yet…" | n/a | n/a | n/a |

n/a cells are structural (the state cannot arise), recorded rather
than manufactured.

**Verified live** (cleared storage): entry visible with all three
actions; sample → converted preview in 1 click; compaction shows
"Source: Sample image" and restores replace/capture routes; no
duplicate capture affordance on the cold surface; the labelled input
participates only in the compact state (a hidden input still opens
its picker from the CTA). One unused import caught by the gate and
removed. `check` green (938 tests); engine surfaces diff-clean.

## M14-IMPL-05 — Language & microcopy pass (2026-07-23, D85)

The D79 map applied. Before → after inventory (visible copy only;
control values and the project-file schema untouched):

| Before | After | Where |
| --- | --- | --- |
| Order preset / "Resize first" / "Reduce first" | Processing order / "Resize, then match colours (recommended)" / "Match colours, then resize" (+ consequence helper, landed in IMPL-04) | Advanced |
| Colour mode option "Full RGB" | "Unlimited colours (no threads)" | Design |
| "Full RGB — no thread palette." (summary) | "Unlimited colours — no thread palette." | Design summary |
| "Full RGB" (compact status fallback) | "Unlimited colours" | focus-mode status |
| "Palette source" | "Threads to choose from" | Design |
| "Colour count" / "Every permitted thread" | "Colour limit" / "No limit" | Design |
| placeholder "Search threads" | removed (label "Find a thread" stands alone) | thread depth |
| "Mark N shown as owned / not owned" (+ zero-state variants) | "matching" throughout — the buttons act on the whole filter | thread depth |
| "…chosen once an image is loaded" | "…chosen when the design updates" (honest during selection rebuilds too, A11) | Design summary |
| "Preset" / "Algorithm" (dither) | "Dither style" / "Method" (method names kept — terms of art, D62) | Appearance |
| Serpentine scan (bare) | + helper "Alternate row direction to reduce streaks." (linked) | Dither details |
| "…denied.. The bundle is unchanged" | single full stop (reason trailing period stripped) | diagnostics |

Assertions updated intentionally with the copy (three: count summary
×2, status-line fallback) — behaviour identical, words per the map.

**Residual, deferred with reason**: one core-produced conflict
sentence says "switch to full-RGB mode" (`src/core/palette-policy.ts`).
Harmonising it means editing core strings inside a UI-only milestone;
the sentence stays honest, so it is left for the maintainer review
(ACCEPT-01) to rule on rather than churned silently. UK English and
sentence case swept — no other changes needed (existing copy already
complied). Conflict and status sentences unchanged (D55/D72 honesty
guard). `check` green (938 tests).

## M14-VERIFY-01 — Standards conformance verification (2026-07-23, D86)

**Fixed in-pass** (verify's remit): the Preview and Source `<section>`s
gained their spec'd accessible names — the last unnamed landmarks.

**Machine-checked on final code** (Chromium 148):

| Check | Result |
| --- | --- |
| ARIA reference integrity (aria-controls/describedby/labelledby), cold + everything open | zero dangling ids |
| aria-expanded on every accordion toggle | 5/5 |
| Landmarks | main · header · section:Preview · section:Source · aside:Controls; h1 + five h2s |
| Target sizes, focus-probed, all disclosures open | 176 focusables, **0 under 44 px** (house-extended kinds — toggles, drawn checkboxes — separately hit-proven at 44 in IMPL-02) |
| Rendered contrast spot-probes (dark) | summary/helper 8.86 · titles/rows/messages 13.76 · status/primary 16.45 — all ≥ 7:1; gate script covers both schemes (17 pairs × 2) |
| Matrix: 320 px light populated | 0 horizontal overflow · 3,859 px page |
| Matrix: collapsed panel | controls out of layout/tab order, no overflow |
| Matrix: preview focus | no page scroll, exit control present, compact status carries state |
| Live regions | #status role=status · conflicts aria-live=polite · crop readout role=status |

**Hand/code-verified with method notes**: keyboard operability — every
control kind operated (sections/reveals via Enter/Space as native
buttons/summaries; canvas +/−/0/arrows; crop arrows/shift+arrows;
modal trap + Escape + restore proven in IMPL-02); no Tab interception
exists outside the modal (code-audited — the only keydown handlers
touch arrows, +/−/0, Enter, Escape). Reduced motion is enforced at
the token layer (all duration tokens → 0ms under the media query;
the app's single transition consumes the token) — verified in code,
not emulation, same as the audit. Instrument caveat re-confirmed:
closed `<details>` keep layout boxes under Chromium's
`content-visibility` — focus-probing is the method of record.

**Findings ledger** (all 22 audit findings):

| Finding | Verdict | Evidence |
| --- | --- | --- |
| A1 targets | closed | IMPL-02 anatomy + this pass's 0-under-44 sweep |
| A2 Own names | closed | per-thread names in tree (IMPL-02) |
| A3 selector gaps | closed | search + generic summary rules; sweep clean |
| A4 depth | closed | 3,859–3,877 px page · 11 tab stops · reach 2/2/3 (IMPL-03) |
| A5 empty disclosure | closed | editor library-only (IMPL-03) |
| A6 native dialogs | closed | Carbon modals, trap live-proven (IMPL-02) |
| A7 capture label | closed | allow-list displayLabel (IMPL-04) |
| A8 crop feedback | closed | position status at end-events (IMPL-04) |
| A9 disabled reason | closed | local line (IMPL-02) |
| A10 "shown" | closed | "matching" (IMPL-05) |
| A11 transient copy | closed | "when the design updates" (IMPL-05) |
| A12 landmarks/headings | closed | named regions (this pass) + h2 structure (IMPL-03) |
| A13 version line | closed | Project foot (IMPL-03) |
| A14 hover-only hex | closed | hex in row text (IMPL-02) |
| A15 role=img | closed | application roles + linked descriptions (IMPL-02) |
| A16 toolbar economy | **waived (partial)** | header slimmed + toolbar wraps 2 rows at 320; the spec's Fit-options menu deferred — five passing text buttons vs one menu is a taste call for ACCEPT-01 (spec §5 amended, D86) |
| A17 FIT_MARGIN clip | **waived** | canvas furniture, outside UI-DOM scope (spec §8); stays wish-listed |
| A18 stale live status | **waived** | worker staleness bound — M13 remainder (spec §8) |
| A19 double period | closed | reason join fix (IMPL-05) |
| A20 placeholder | closed | removed (IMPL-05) |
| A21 dev shell | closed | tokens/base/shell + tests (IMPL-01) |
| A22 export grouping | closed | buttons-first + reveals + size readout (IMPL-03) |

Zero unaddressed; the three waivers are the first-class input list
for ACCEPT-01.

**Design-review gate (14 items, consolidated — every surface changed
this milestone, one write-up):** 1 Carbon patterns named per control
in `ui-spec.md` §5 and implemented project-side (accordion, modal,
checkbox, toggle, text/number/select fields, disclosure). 2 Custom
patterns: none beyond the recorded label-not-icon diagnostics
deviation (D50) and the currentColor focus ring (D80). 3 Heuristics
most at risk — consistency and recognition — carried by the
terminology map and one-name-one-concept rule (D79/D85). 4 Contrast:
gate-proven + rendered spot-probes above. 5 Focus visible (3 px
ring), unobscured (no sticky overlays), order = DOM = visual.
6 Targets: sweep above. 7 Visible label = accessible name everywhere
except recorded terse-label rows whose names extend the label ("Own
{thread}", per-row rules). 8 Links: none exist. 9 States: empty/
loading/success/validation/error per the IMPL-04 matrix; none
visual-only. 10 Keyboard/pointer/AT routes verified above. 11 Motion:
token-zeroed. 12 Destructive: bulk disown danger-modal (cancel
default); palette delete undo; exports/saves non-destructive.
13 AAA exceptions: none claimed — adaptations recorded in D80/D82.
14 Diagnostics: dev-only, labelled text button, ≥44 px, announced
result (unchanged; re-checked).

**Tooling note for the end review**: the hand-rolled sweeps
(ARIA-ref integrity, focus-probe targets) would be covered by an
automated checker (e.g. axe-core as a dev dependency) — proposed for
maintainer consideration; needs approval, not required for this
close. `check` green on the final tree.

## M14-VERIFY-02 — Journey & depth verification (2026-07-23, D87)

**Journeys, final code, cleared storage** (baselines: `ui-journeys.md`):

| Journey | Baseline | Final | Notes |
| --- | --- | --- | --- |
| J1 still import | 1 drop / 3 picker; nothing said what next | 1 (drop *or* sample) / 3 picker; 988 ms sample → converted; entry state names every route | keyboard: 3 tabs to "Choose an image", 5 to sample; order shell → entries → Design |
| J2 live capture | 3 (1 + picker); no expectations; crop unexplained | 3 (entry CTA + picker); expectation line pre-prompt; crop status carries size + position | OS-picker leg is rehearsed by the owner at ACCEPT-01 (synthetic route here, as recorded) |
| J3 palette refinement | works once found at 1.1–2.2k px | reveal at reach 2; error conflict ("Problem: no thread brand…") and warning ("Note: you asked for 512…") both met and followed out; summary honest throughout | keyboard variant: whole flow operable — reveal is a native summary, rows are per-thread-named |
| J4 exports | 13-screen scroll | section at reach 2; buttons lead; derived size line answers "how big"; no draft language anywhere near export copy | clean/enlarged/chart/PDF all exercised |
| J5 save/reopen | Save 14 screens deep; silent loss | Project section reach 2 with the honesty line; save/load round trip reproduces identical output (byte proof below); disclosure prefs live in localStorage and survive project operations independently | the no-autosave dead end remains, said out loud (D75/D78) — feature stays a backlog decision |

**Depth reachability** (D76 contract, final code): E visible ≤1 ✓
(entries, pattern/colour essentials, toolbar, statuses); C ≤2 ✓
(sections at 1 header + control; Export buttons at 2 — the recorded
exception); D ≤3 ✓ (reveals at section + summary + control; measured:
thread depth 2, grid colour 3, dither method 3). Fit width/height sit
at reach 1 as toolbar buttons (spec amended at VERIFY-01, D86). No
inventory row lost: every audit-inventory control present at its spec
location (the only relocations — version line, capture CTA — are the
spec's own).

**Byte-identity attestation** (audit baselines → final code, same
settings, same browser build):

| Artefact | Verdict |
| --- | --- |
| `design-200x200.png` | **byte-identical** (sha256 match) |
| `design-200x200@4x.png` | **byte-identical** |
| `chart-200x200.png` | **byte-identical** |
| chart-200x200.pdf | all content streams byte-identical — including the 17,714,700-byte print raster (compressed bytes + inflated sha equal); residual file-level delta is exactly the CreationDate/ModDate strings plus their deflate/xref ripple (±1 byte ObjStm), the class the audit rule anticipated |
| project-200x200.json | field-wise per the audit rule: `preview.cssPxPerStitch` exempt (viewport-derived, 1.92 → 1.24); `palette.policy.count.n` 512 → 20 — an **inert** field behind `mode:'all'` reflecting each walk's history (behaviour-neutral; the pixel proofs above are the arbiter); all other fields identical |
| Node tripwire (`tests/ui-baseline`) | green inside `check` throughout the milestone |
| `npm run bench` | green on final code (22 budget rows) |
| Engine-dir diff (`src/core`, `src/worker`, `src/backends`, `src/export`) | no changes across the whole milestone |

**Remaining friction, none silent**: the OS-picker leg (owner
rehearsal, ACCEPT-01); the Fit-menu taste call (D86 waiver —
**superseded by M14-EXT-03 below**); the core conflict-sentence
wording (D85 deferral); autosave (backlog decision, D75). Everything
else the journeys flagged is resolved above.

## M14-EXT-01..04 — Owner-feedback extension (2026-07-23, D88/D89)

**What changed**: one app bar (title · quiet build id — A13 reversed
on owner call · Source · Hide settings · Preview focus · dev-only
Copy diagnostics + new **Download log**); a Source choice modal
(image / capture / sample + current-source and capture-expectation
note) replacing the compact source row for returning users; the
zoom/fit/compare toolbar behind a persisted **View controls**
disclosure (open first-run) with the % and dimensions readouts
permanently visible; **Design width/height** labels (legend "Size").
Cold-start entry state untouched by construction.

**Verified live** (Chromium 148, cleared storage → sample → walks):

| Check | Result |
| --- | --- |
| Bar composition + order | title, build id, Source, Hide settings, Preview focus, Copy diagnostics, Download log — DOM order = tab order; wraps in rows at 320 px, zero horizontal overflow |
| Source modal | labelled dialog, current-source note, three routes; sample route → converted preview; focus lands on the primary choice; restoration proven by the modal contract (the one false probe was a programmatic click without focus — method artefact, noted) |
| Cold-start guard | entry state intact; J1 still 1 interaction (sample), 3 (picker) |
| View controls | open by default first run; fold **persisted across reload**; readouts remain visible; wheel/keyboard routes unaffected |
| Focus mode | Source + diagnostics leave the bar, exit control stays, no page scroll at a settled viewport (an earlier false reading was pre-settle timing, re-measured clean) |
| Rename | two "Design width/height" labels, "Size" legend; `200 × 200 stitches` language unchanged; stored values untouched |
| Gate | `check` green (938 tests, contrast 19×2 AAA); engine dirs diff-clean; ui-baseline tripwire green |

The D86 A16 waiver is superseded: view controls now fold, which is
strictly more than the deferred Fit-options menu offered.

## M14-EXT-05 — Polish: de-duplication & control feel (2026-07-23, D90)

Answering the owner's second look ("some duplication, some controls
clunky") with a self-review of the running app — nine findings, all
fixed, verified live:

| # | Finding | Fix | Verified |
| --- | --- | --- | --- |
| 1 | Source button duplicated the cold entry state | hidden until a source exists (one composed rule in applyShell) | hidden cold, visible populated |
| 2 | Two stacked empty-state sentences | the global status starts empty; the entry state owns the cold explanation | status `""` cold; announces from first action |
| 3 | Capture expectation said twice | one place: the capture action's linked helper (entry stack + modal choice helper slot) | exactly one instance, `aria-describedby` both sites |
| 4 | View-controls double chrome + readout row | readouts ride the summary row; body drops the indent rule and outer margins | readouts in summary, border 0, no extra row |
| 5 | Ragged bar wrap; status could reflow the bar | bar groups (product / dev cluster) wrap as units; diagnostics status takes a full-width line | two tidy rows at 320 |
| 6 | Ragged entry actions | shared `.action-stack` (entry + modal choices) | 3 equal-width actions, helper indented |
| 7 | Load project was a raw file input | button over hidden input (the app's one pattern) | button present, input hidden |
| 8 | Colours table always-on | persisted fold, open by default; caption visually-hidden (no double heading) | details present, open, persisted id `colours-table` |
| 9 | Chevron could overlap summaries | reserved right padding on accordion toggles | CSS applied |

Gate green (938 tests, contrast 19×2 AAA); engine dirs diff-clean;
tripwire green. Cold-surface before/after: two explanations + six
affordances above the fold → one title, three stacked actions, one
hint.

## M14-EXT-06 — Cold surface as a shell state (2026-08-04, D93)

The memo's ask ("settings hidden until a source is chosen") landed as
a `cold` state in the one shell model — never a second hidden layer —
with the entry stack as the page's only product content and a quiet
"Open a project" action so Load survives the hidden panel.

**Verified live** (Chromium, dev server, cleared storage):

| Check | Result |
| --- | --- |
| Cold start | entry visible; controls panel, info strip, Hide settings, Preview focus, Source button all hidden; status region present and empty |
| Focus-toggle regression | found live: `applyShell` never wrote `focusToggle.hidden`, so cold showed Preview focus; fixed as `!panelToggle && !focusExit` composition |
| Sample route | cold exits; panel + bar controls appear; focus rescued from the vanishing entry action to the Source button; status ends "Sample image loaded — …" |
| Drop route | synthetic PNG `DragEvent` on `window` exits cold; full pipeline runs ("Preview updated."); paste and file picker share `importBlob` with it |
| Capture / project routes | code path review: capture exits on session success only (denied permission stays cold); project open exits quietly via `exitCold(false)` before its own status |
| Reload | lands cold again — session-only by construction, nothing persisted (`serializePreferences` guard test) |
| Keyboard | tab order = DOM order cold (entry actions → dev cluster); no CSS `order` |
| Console | zero errors across all probes |
| Tests | shell suite 18/18 (cold-override sweep, exit-onto-preference, one-status-surface invariant across all 8 states) |

## M14-EXT-07 — Sample demoted to the modal (2026-08-04, D94)

**Verified live** (Chromium, dev server):

| Check | Result |
| --- | --- |
| Cold entry | exactly three actions — Choose an image, Capture your screen, Open a project; no sample |
| Source modal | four buttons — Choose an image, Capture your screen, Try a sample, Cancel |
| Modal sample route | end-to-end: choice click → `loadSample` → normal import path → "Preview updated."; the test-card status sentence rides the route as before |
| Duplicate-affordance rule | holds — entry (cold) and Source button (populated) never coexist, sample now exists only behind the latter |
| Focus restoration | opener-restore contract unchanged; the one null reading was the known programmatic-click-without-focus method artefact (as at D88) |
| Console | zero errors |

## M14-EXT-08..11 — Viewport arc (2026-08-04, D95)

Landed as one set (D92); the composition matrix is EXT-18's pass —
this section records the per-leg functional evidence, live at 375 px
and 1280 px (Chromium, dev server).

| Leg | Check | Result |
| --- | --- | --- |
| EXT-08 | auto-fit → zoom ×2 → host resize | 3% → 4% → 4% (manual survives resize) |
| EXT-08 | Reset view → host resize | 4% → 3% → refit follows the host (auto resumed) |
| EXT-08 | `0` key parity | 270% manual → 216% fitted, same as Reset view |
| EXT-08 | fit inside the dock | docked host 327 px → 139% = exact fit re-derivation |
| EXT-10 | unfocused drag | inert — no pan, no manual entry |
| EXT-10 | focused drag | grabbing state + pan |
| EXT-10 | wheel | no wheel listener remains on the host (deleted, not gated) |
| EXT-10 | Escape ordering | first Escape blurs the host (mode stays), second exits preview focus |
| EXT-09 | narrow dock | pinned at top through full scroll; canvas caps 489→327 px; settings share ~60 % of the viewport under it |
| EXT-09 | wide sticky | preview pinned at 0 while the panel scrolls beneath (stretch fix) |
| EXT-09 | focus non-obscuration (spot) | focused brand control top 687 > dock bottom 581 — clear; full sweep in EXT-18 |
| EXT-11 | strip anatomy | Zoom out · Zoom in · Reset view · Compare[pressed] · Grid[pressed] · Numbers[pressed] + readouts; ghost borders, 44 px minimums |
| EXT-11 | 320-budget | strip height 88 px = exactly 2 rows at 375 px (was 3 before the spacing-03 fix) |
| EXT-11 | Appearance | grid switches gone; summary reads "dithered"/"no dither"; Grid details stays |
| EXT-11 | Compare + split | split slider appears in the strip while pressed, hides on release |
| all | horizontal scroll | none at 375 or 1280 |

**Found live:** the IO dock oscillation (renderer hang), the wedged
rAF gate, the sticky release at the content boundary, and the 3-row
strip — each fixed and re-proven above; details in D95. The D86 A16
waiver ledger closes: Fit width / Fit height are gone, Reset view
survives as the only fit control.

## M14-EXT-18 — Viewport composition verify (2026-08-04, D96)

The arc judged as a whole (the D90 lesson applied in advance): one
session over the landed EXT-08..11 set, Chromium dev server, both
schemes.

**Width matrix** (walk = every reachable focusable with all sections
and disclosures open, focused in DOM order):

| Width | Layout | Keyboard walk | Focus obscured | Strip buttons | Dock | Horizontal scroll |
| --- | --- | --- | --- | --- | --- | --- |
| 320 × 700 | stacked | 188 walked | 0 | 2 rows, all ≥ 44 px | caps to 40dvh pinned | none |
| 800 × 900 | stacked | 188 walked | 0 | 1 row | caps (362 px) pinned | none |
| 1280 × 800 | two-column | 188 walked | 0 | 1 row | pinned, cap inert | none |

**The memo's scenario** (J3 depth, the reason EXT-09 exists): at
320 × 700 with the palette-source select focused, the pinned canvas
keeps 392 px on screen and the control sits fully clear beneath the
dock — a palette change is visible without a scroll-back.

**Journeys re-walk:** J1 cold → drop → converted preview + "Preview
updated." (one gesture; note J1's fastest zero-permission route is
now behind the Source modal since D94 — recorded, not a defect).
J2 capture expectation line unchanged on the entry. Cold surface
composition: entry three actions, bar dev-cluster only.

**Reach re-measure of every moved row:** strip Zoom out / Zoom in /
Reset view / Compare / Grid / Numbers all reach 1 (permanent row —
the fold's reach-2-after-collapse state no longer exists); Grid /
Numbers were reach 2 as Appearance switches, now 1; readouts reach 0
(always visible). Appearance's remaining controls unchanged at 2.

**Interaction cross-products:** focused-canvas pan while docked ✓
(375 px arc evidence); Escape ordering ✓ (blur first, preview-focus
exit second); auto-fit re-derived through dock (327 px → 139 %) and
resize (1280 px → 216 %); Compare's split slider operable in the
strip while docked.

**Duplicate-affordance check (D90):** zero duplicated visible
control names across entry, app bar, strip and sections in both cold
and populated states (programmatic name census, per-row "Own …"
patterns excluded).

**Schemes and motion:** dark-scheme screenshot composes correctly —
pressed strip toggles invert, thread/preview colours stay
colour-managed content; the arc added no transition or animation CSS,
so reduced-motion holds by construction (the dock swap is an instant
height change).

**Named as not re-verified here:** EXT-17's highlight cross-product
(not yet landed — its own ship must prove it against this
composition); real trackpad/touch physics and a live screen-reader
pass (synthetic events only in this rig — both named for the
ACCEPT-01 live session, per the milestone's two-layer testing rule).

## M14-EXT-12 — Capture region section (2026-08-04, D97)

Session driven end-to-end with a canvas `captureStream` standing in
for `getDisplayMedia` at the permission boundary only — the real
session, pump, crop and section code paths throughout.

| Check | Result |
| --- | --- |
| Start capture | section mounts first (above Design), open on first appearance (cleared storage), title "Capture region" |
| Contents | thumb + crop overlay, session buttons, position readout, draft badge — all inside the panel; source section reduced to entry + hidden inputs |
| Collapse | summary carries the region: "600 × 600 px at (100, 0) → 200 × 200 stitches"; crop maths correct for the 800 × 600 fake source |
| Persistence | collapse survives session end → restart (remounts collapsed) and page reload |
| Stop | section unmounts; focus from the in-section Stop button lands on the bar's Source button; preview keeps the last frame (existing behaviour) |
| File sources | no section — first panel child stays Design |
| Duplicate affordance | none — the capture surface exists in exactly one place |
| Announcements | "Capture started — region controls at the top of settings." queued after the cold-exit line; visually transient under frame statuses (accepted, D97) |

## M14-EXT-13 — Colour limit: switch + slider, default eight (2026-08-04, D98)

| Check | Result |
| --- | --- |
| Fresh session | "489 permitted · 8 selected of 8 requested · 8 used in the design."; info panel "· 8 colours"; collapsed Design summary "200 × 200 stitches · DMC · 8 colours (limit)" — the default announced on three surfaces |
| Anatomy | switch role + On/Off text; native range 1–64 (44 px row); paired number 1–512 with helper "The slider reaches 64; type here for more."; exact checkbox at depth |
| Slider keyboard | arrow step 8→9 re-resolves to 9 immediately |
| Above the slider | typed 100 → number 100, slider pegs 64, 100 selected |
| Switch off/on | off hides the pair and resolves unlimited (489); on restores n=100 and mode |
| Exactly mode | depth checkbox flips `max`↔`exact`; survives an off/on cycle; selected-vs-requested strings unchanged (M7-COUNT-01 honesty) |
| Migration | v2→v3 keeps `all/20` (meaning preserved); fresh default pinned by a new test; the one ambient-default fixture made explicit |
| Suites | palette panel/policy/selection/project 123 tests green before the full gate |

## M14-EXT-14 — Colours by usage collapsed by default (2026-08-04, D99)

| Check | Result |
| --- | --- |
| Fresh profile | collapsed, fold line "Colours by usage — 8 · DMC 452 leads" under the default-8 palette |
| Persistence | opened by hand → survives reload over the closed default |
| Live tracking | limit 8 → 3 re-renders the line to "— 3 · DMC 452 leads" with the frame |
| Name said once | one visually-hidden caption (accessible name), the fold line as the disclosure label |
| Pure half | `usageSummaryLabel` unit-tested: thread leader, hex fallback for unidentified, plain name at zero usage |

## M14-EXT-17 — Thread highlight (2026-08-04, D100)

| Check | Result |
| --- | --- |
| Selection anatomy | 8 per-row toggle buttons under the default-8 palette; visible "Highlight", accessible "Highlight DMC 452 Shell Grey medium" (A2 pattern); real (hidden-text) column header |
| Counts | announcement "DMC 452 Shell Grey medium — 14,750 stitches highlighted." equals the row's own Stitches cell |
| Clear routes | reselect clears; Escape inside the table clears (consumed, so canvas/preview-focus Escapes stay two further steps); "Highlight cleared." announced |
| Scrim visual | non-matching stitches dimmed, selected thread's region and fabric untouched (screenshot); mask maths unit-tested (alpha-only, EMPTY untouched, counts match a known fixture) |
| Compose with Compare | scrim draws under the compare half — source side pristine |
| Export byte-identity | export PNG SHA-256 pair identical with/without active highlight, captured on the real export path; tripwire green; `highlight` is not a `PipelineConfig` field (type-level impossibility) |
| Palette change | entries-fingerprint invalidation: limit 8 → 5 cleared the held selection instead of remapping it |
| Perf at 300² | added cost measured: 0.024 ms indices copy + 0.618 ms mask + 0.154 ms put/draw = **0.796 ms/frame** — 0.3 % of the 250 ms/frame budget at 4 fps, ~1 % of the banked baseline frame (D64–D72). Live-pump re-measure impossible headless (rAF-frozen pane) — named for ACCEPT-01's live session |
| Canvas-information rule | the DOM equivalent of the canvas highlight is the selected row + its count — already in the table (noted per ticket) |
| Isolation | mask build and draw both guarded; a throwing decoration drops itself, never the frame (router precedent) |

## M14-EXT-15 — Size, region & aspect: signed shape shipped (2026-08-05, D101)

Owner signed **A + D + S1**. Driven live with a canvas stream at the
permission boundary (Chromium, dev server):

| Check | Result |
| --- | --- |
| Session anatomy | "Aspect follows design" pressed by default; size fields inside the Capture region section (S1); height field enabled with its normal helper |
| Unlock | aria-pressed false; status "Aspect unlocked — pins drag freely…"; height field disables, helper becomes "Follows the region while aspect is unlocked"; section summary appends "· aspect unlocked" |
| Free resize (keyboard) | Shift+ArrowUp ×8: region 600 × 600 → 600 × 536; design 200 × 200 → 200 × 179 (= round(200·536/600)); readout "(height follows the region)"; auto-fit refit to the new shape |
| Field mirror | the disabled height field reads 179 after the derive (found stale at 200 live; applyPattern now mirrors both fields) |
| Re-lock | region re-constrained to the design's aspect (400 × 358 = exact 200:179 ×2 under the centre-anchor room rule); height re-enables; status announced |
| Shift-gesture | a shift gesture while locked produced a free (unconstrained) rect and pointerup adopted its shape into the design — demonstrated via the draw route; toggle stayed pressed |
| Session end | size fields return to Design (first slot); aspect state resets; height re-enabled |
| Crop maths | 52 tests green, incl. the new locked/unlocked split: derive correctness/rounding/clamps, position-independence, the derive↔constrain fixed point (no feedback loop), and the locked D52 invariant unchanged |
| Not driveable in this rig | precise pointer handle-drags — the capture video never lays out in a hidden pane (2 × 2 px box), so overlay↔source mapping has no geometry; the mapping code is unchanged M4/M6 territory, and the real drag is named on ACCEPT-01's live checklist |
| Console | zero errors |

## M14-FIX-06 + FIX-03 — Scroll-neutral, design-hugging preview (2026-08-05, D103)

| Check | Result |
| --- | --- |
| Oscillation mechanism | deleted, not damped: no scroll listener, sentinel, threshold or `preview-docked` class remains (grep-clean); layout height has no scroll input |
| Scroll sweep (380 × 700, capture-scale page) | 8 positions, ONE distinct host height; section pins at top and stays |
| Hug, wide design | 200 × 80 at 380 px → host 173 px = exact aspect derivation + margins (was a fixed 489 px — the owner's blank band gone) |
| Hug, square design | capped at 282 px ≈ 40dvh narrow cap |
| Manual zoom | height frozen where the user left it, through a grid change |
| Reset view | re-hugs immediately |
| Fixed point | `hugHeight` pure, height-independent by signature; unit-tested (aspect follow, caps, floor, degenerate) |
| Preview focus | fills the window by flex — `!important` over the inline hug |

## M14-FIX-01 — Capture region leads the flow (2026-08-05, D104)

| Check | Result |
| --- | --- |
| Mount | in the content column, preceding the preview; open on first appearance; focus lands on the section toggle |
| Collapse gesture | at scrollY 400, collapsing scrolls to 0 — the preview takes the lead |
| Lock gesture | at scrollY 300, locking scrolls to 0 |
| Preview focus | section hidden with the source region; restored on exit |
| Panel collapse | section stays (content geography — D97 consequence reversed, recorded) |
| Session end | unmounted, nothing dangling |
| Order discipline | DOM mount, no CSS `order`; §7 exception recorded in UI-STANDARDS + ui-spec |

## M14-FIX-05 / 04 / 02 — the small three (2026-08-05, D105)

| Fix | Check | Result |
| --- | --- | --- |
| FIX-05 | stats line | "40,000 stitches (0 empty) · 8 colours" — dimensions live only in the strip readout |
| FIX-05 | block height at 380 px | canvas-to-source 128 px at the spec default (stats 20 + fold 44 + status 20 + tightened gaps); the open colours table remains the user's persisted choice |
| FIX-04 | resize burst below 960 px | one debounced line: "Window 380 px wide — works down to 320 px."; silent above 960; zero standing chrome |
| FIX-02 | capture request | `selfBrowserSurface: 'exclude'` + `surfaceSwitching: 'include'` sent; own-tab exclusion is Chromium-verified territory (picker UI — named for the owner's next live run) |
| FIX-02 | expectation copy | both homes read "choose the window you draw in — sharing the whole screen includes this app." |
| all | EXT-18 re-walk under the new geometry | 199 focusables at 380 px, everything open: zero obscured, zero off-viewport |
| all | console | a fresh page runs the full sequence with zero errors (an earlier page's four uncaught errors were stale-HMR module instances — the known rig artefact, reproduced clean) |
| all | suites | typecheck, lint, info-panel 13/13 green before the gate |
