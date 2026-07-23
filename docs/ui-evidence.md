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
rehearsal, ACCEPT-01); the Fit-menu taste call (D86 waiver); the
core conflict-sentence wording (D85 deferral); autosave (backlog
decision, D75). Everything else the journeys flagged is resolved
above.
