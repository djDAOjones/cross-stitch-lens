# UI audit — M14-AUDIT-01

Standards & heuristics audit of every UI surface × state against
`UI-STANDARDS.md` (Carbon productive anatomy, Nielsen hard rules,
WCAG 2.2 AAA, the 14-item design review gate). **Read-only**: this
document records; it fixes nothing. Findings feed M14-SPEC-01/02;
closure is verified by M14-VERIFY-01 against this table.

- **Build audited**: v0.5.0 · `v0.5.0+20260723.9758da2` (2026-07-23)
- **Environment**: in-session browser (Chromium 148 / Electron 42.7,
  macOS), dev server `npm run dev`; widths 320 CSS px and desktop
  (1280 CSS px viewport); light and dark schemes.
- **Method**: surfaces enumerated from code (`src/main.ts` `build()`,
  `src/ui/*`), then each surface × state walked in the running app:
  accessibility-tree reads, programmatic target-size and contrast
  sweeps (JS, computed styles), state driving through the real
  controls, screenshots per key state. Live-capture states were driven
  through the real session/pump/dirty-gate code by substituting
  `getDisplayMedia` with a `canvas.captureStream()` source (the OS
  picker cannot be scripted); this is disclosed per finding where it
  matters. Reduced-motion and draft-quality states were verified in
  code (single transition + `prefers-reduced-motion` override;
  draft-badge wiring) rather than emulated.
- **Method caveat**: `getBoundingClientRect` excludes pseudo-elements,
  so the `.toggle` switches report 48 × 24 px although their `::before`
  hit-area extension makes the effective target 48 × 44 px. Target-size
  sweeps (here and in VERIFY-01) must account for this before counting
  a toggle as a failure.

## Surface × state matrix

Surfaces: header/shell bar · source section (import + capture +
crop/thumbnail) · preview host + toolbar · compact status · info panel
· debug panel + diagnostics control · control groups Pattern / Grid /
Colour / Dither / Pipeline / Export / Project.

| State | Visited | Notes |
| --- | --- | --- |
| Empty (no source) | ✓ | a11y tree + screenshot, light + dark |
| Populated (fixture imported) | ✓ | 200×200, 195 colours, both widths |
| Busy / processing | ✓ | "Processing…" → "Preview updated." observed |
| Paused / live / ended capture | ✓ | synthetic stream route |
| Draft quality | code | badge + status wiring reviewed; not load-triggered |
| Error (import, export, diagnostics copy) | partial | diagnostics-copy failure exercised live; import/export error paths reviewed in code (each sets status + log) |
| Conflict (Colour panel) | ✓ | no-brands, owned-empty, over-ask count; each a full sentence in a polite live region |
| Collapsed panel | ✓ | label/aria-expanded/status verified both ways |
| Preview focus | ✓ | focus moves to host, exit control persists, Escape works, compact status only |
| Narrow 320 px | ✓ | zero horizontal overflow; page height 14,495 px (finding 4) |
| Wide ≥ 60 rem | ✓ | side-by-side layout |
| Light / dark | ✓ | contrast sweep both; tick colour re-sent on scheme change |
| Reduced motion | code | one transition total; override present |
| Full-RGB mode | ✓ | colour sub-controls hide; Dither disables (finding 9) |
| Split compare | ✓ | divider, pressed state, native range |

## Findings

Severity: **major** (violates a hard rule or materially blocks a user
class) · **minor** (violates the letter with a workaround) · **polish**
(quality drift, no rule violated). No blockers found: every function is
reachable and operable by keyboard and the accessibility bones (focus
rings, live regions, labels) are in place — this audit is the
completion pass D73 predicted, not a rescue.

| # | Sev | Surface | Criterion | Finding + evidence |
| --- | --- | --- | --- | --- |
| 1 | major | Colour panel | WCAG 2.5.5 AAA target size (44px); UI-STANDARDS "Operable" | 68 native checkboxes render at 13 × 13 px: 8 brand checkboxes + 60 per-thread "Own" boxes. Sweep: 74/180 visible interactive elements under 44 px, of which 4 are toggle false-positives (see method caveat), 68 are these checkboxes, 2 are findings 3a/3b. Labels extend the target slightly but the combined row stays well under 44 px. |
| 2 | major | Colour panel thread list | WCAG 1.3.1 / 2.4.6; UI-STANDARDS "visible label = accessible name" | All 60 "Own" checkboxes share the accessible name "Own" — a screen-reader user tabbing the list hears sixty identical controls with no thread context. The adjacent per-row rule `select` **does** carry `aria-label="Rule for DMC 310 Black"`, so the fix pattern already exists in the same row. |
| 3 | major | Colour panel | WCAG 2.5.5; target-size selector gap | (a) `input[type='search']` is missing from the `index.html` min-height rule (`number/text/select` only): the thread search renders 147 × 22 px. (b) `.palette-editor summary` never got the 44 px rule `.debug-panel summary` has: "Palette contents" disclosure header is 24 px tall. |
| 4 | major | Whole settings panel | Nielsen "Flexibility & efficiency", "Minimalist design"; D73 novice-first intent | The default surface exposes full depth: at 320 px the page is **14,495 px tall** (~16 screens); Export and Project sit at the bottom; the 60-row thread list, per-thread rule selects, and six library buttons are all first-class on the novice surface. This is the central IA finding SPEC-01 exists to resolve. |
| 5 | major | Colour panel | UI-STANDARDS "Empty and no-data states" | The "Palette contents" disclosure renders and opens to **nothing** when the palette source is brands or preset (it only has content for a saved library palette). An openable control that reveals an empty region violates "every state intentional"; either hide it for non-library sources or give it an explanatory empty state. |
| 6 | major | Colour panel actions | Carbon-first (design gate item 1–2) | `window.prompt` names a saved palette ("Save as palette") and `window.confirm` guards bulk disown. Both are functional and keyboard-operable but are unstyled native dialogs, not the Carbon modal pattern the standard requires; prompt() also cannot carry helper text or validation. |
| 7 | major | Capture status | Nielsen "System status" honesty; UI-STANDARDS status rules | `displayLabel` filters only empty and `://`-containing track labels, so machine tokens leak into status copy: observed "Capturing mw8rc91Ytu…==." with a synthetic stream; real capture labels are also sometimes internal identifiers. The heuristic needs to be allow-list shaped (label must look human) rather than deny-list shaped. |
| 8 | major | Crop overlay | WCAG 4.1.2 / status announcement | Keyboard crop **moves** produce no perceivable text change: the readout reports size only ("Capture region 600 × 600 px → …"), never position, and nothing announces the move. A keyboard/AT user gets no feedback that arrows did anything until size changes. |
| 9 | minor | Dither group | Carbon disabled-state guidance; Nielsen "Recognition" | In full-RGB mode every Dither control disables with no local explanation — the reason ("Full RGB — no thread palette.") lives only in the Colour panel's summary line, a full panel away. |
| 10 | minor | Colour panel bulk actions | Copy honesty | "Mark 489 shown as owned" acts (correctly, by design) on the whole filtered set while only 60 rows are rendered — the word "shown" is untrue at counts past the render cap. The behaviour is right; the label lies. |
| 11 | minor | Count summary | Copy honesty (M7-COUNT-01) | While the selection source rebuilds after a policy/geometry change, the summary reads "512 requested — chosen once an image is loaded" even when an image **is** loaded. The transient conflates "no image yet" with "selection rebuilding"; the settled copy ("489 selected of 512 requested" + explanatory note) is honest. |
| 12 | minor | Page structure | WCAG 1.3.1 headings/landmarks | The preview and source `<section>`s are unnamed regions; heading structure is the h1 alone (all grouping is `<legend>`/`<caption>`). Screen-reader region/heading navigation gets one stop. `aside` is correctly labelled "Controls". |
| 13 | minor | Header | Novice-first surface; minimalist design | The version/build line (`v0.5.0 · build v0.5.0+20260723.9758da2`) is the second element on the page. Build identity is required (AGENTS.md) but its **home** for users should be diagnostics/about; on the primary surface it is developer metadata. |
| 14 | minor | Info panel | UI-STANDARDS "Colour fidelity" (hex+name on hover/focus) | Row hex values are exposed only via `title` tooltips — hover-only, unreachable by keyboard and unannounced by AT. The visible label carries brand+reference+name but not hex. |
| 15 | minor | Preview host | ARIA semantics | The canvas host is `role="img"` yet is interactive (focusable; +/−/0/arrow key operations). An img role on an operable widget under-reports its nature; the name also packs usage instructions into the label. Needs an operable role (or `application` like the crop overlay) with instructions in a description, not the name. |
| 16 | minor | Shell / toolbar | Layout economy | At 320 px the preview toolbar wraps to 3 rows; with header + version + shell bar, ~760 px of chrome precedes the canvas (~440 px even in preview-focus — the mode that exists to maximise the canvas). At desktop with Compare on, the dimensions label wraps to a lone second toolbar row. |
| 17 | minor | Grid ticks / preview | Known issue (wish-list), folded in per ticket | FIT_MARGIN (24 CSS px) cannot hold 3-digit row labels: at 320 px fit-space the left labels clip to "00"/"20"/… (screenshot evidence). Wish-list reported it at 420 px fit-width; it reproduces wider than reported. |
| 18 | minor | Live status | Status staleness (cross-ref D70) | When a live source stops emitting frames entirely (static shared window), the status keeps the last event ("Preview updated.") indefinitely — the dirty gate only speaks when frames arrive. Bounded staleness is D46/D70 policy for *processing*; the *status line* has no equivalent bound. |
| 19 | minor | Diagnostics control | Microcopy | Failure status concatenates the raw error's trailing period with the template's: "…denied.. The bundle is unchanged". |
| 20 | polish | Colour panel search | Carbon text-input anatomy | Placeholder "Search threads" duplicates the visible label "Find a thread" in different words (two names for one control); Carbon reserves placeholder for format examples, and it disappears on input. |
| 21 | polish | All surfaces | Carbon productive language (the M1 dev shell, by design) | Global: 1 px `#8d8d8d` borders as the only container treatment, no Carbon type ramp, ad-hoc spacing (see style inventory), buttons without Carbon field heights/tokens, `.meta` 14 px prose carrying most secondary information. This is the umbrella finding IMPL-01 replaces wholesale; individual values are inventoried below rather than itemised as findings. |
| 22 | polish | Export group | Recognition / grouping | Ten controls in one flat fieldset span three exporters; the three buttons sit mid-list after their settings (PNG scale → background → colour → button → chart cell → button → four PDF fields → button). Grouping per exporter (or per output) would let a novice find "export my chart" without reading all ten. |

### Design-review-gate sweep (the 14 items, current UI)

Passing today: 3 (heuristic risks known), 4 (contrast: uniform 18.1:1
light / 16.45:1 dark; single text colour), 5 (focus visible: 3 px
currentColor outline, verified in screenshots; nothing obscures it),
7 (labels = accessible names except finding 2), 11 (motion: one 0.1 s
transition, reduced-motion override), 12 (destructive actions: palette
delete has undo; bulk disown confirms; project overwrite is a
download, not destructive), 14 (diagnostics control: dev-only,
labelled text button, 44 px, announced result — placement inside the
debug region per D50 deviation note).
Failing / at risk: 1–2 (Carbon component mapping absent for prompt/
confirm, finding 6; dev-shell chrome, finding 21), 6 (target sizes,
findings 1/3), 8 (n/a — no links exist), 9 (empty states: finding 5;
otherwise strong — every panel has an intentional empty line), 10
(keyboard route gap: finding 8), 13 (no AAA exceptions are documented
anywhere yet — SPEC-02's contrast table becomes that record).

## Hard-coded style inventory (feeds M14-SPEC-02)

Everything below lives in the `index.html` `<style>` block (the "M1
dev-shell styling" its own comment declares temporary). Inline styles
in TS are geometry or content only (crop-rect position/size in px;
swatch `background` = thread colour = content by rule) and correctly
stay out of the token system.

| Current value(s) | Where | Token that should own it |
| --- | --- | --- |
| `--text #161616/#f4f4f4`, `--bg #ffffff/#161616`, `--border #8d8d8d/#6f6f6f` | `:root` | project tokens `text-primary`, `background`, `border-subtle` (Carbon gray ramp equivalents) |
| body padding `1rem 0.75rem`; gaps `1.5rem`/`0.5rem`; field margin `0.75rem` | layout | Carbon spacing scale (`$spacing-03/05/06/07`) |
| font: `system-ui`; sizes 32 px h1 / 16 px body / 14 px `.meta` / 12 px labels / 11 px ticks | type | Carbon type ramp (`heading-04`, `body-01`, `label-01`, `helper-text-01`) |
| control heights `min-height: 44px` (buttons, number/text/select/file — **search missing**, finding 3a) | controls | Carbon field height token (48 px lg satisfies AAA) applied by element class, not per-type selectors |
| toggle: 3 rem × 1.5 rem track, 1 rem thumb, 0.1 s ease-out | `.toggle` | Carbon toggle anatomy tokens + motion token (productive, 70–110 ms) |
| focus: `outline: 3px solid currentColor; offset 2px` | `:focus-visible` | focus tokens (Carbon uses 2 px `focus` colour; keep ≥ 3 px for AAA visibility — document as deliberate) |
| borders: `1px solid var(--border)` on panels/controls/tables | throughout | border-subtle token + Carbon layer model (panels should be layers, not outlines) |
| crop overlay: `#ffffff`/`#161616` double dashed ring, `rgb(0 0 0 / 0.35)` dim, 0.75 rem handles | capture thumb | capture-region state tokens (project token system — these are UI state colours, not content) |
| `.crop-handle` 12 px squares | capture thumb | handle-size token; note pointer-only affordance (keyboard route exists) |
| grid default `#666666`, tick font 11 px | `DEFAULT_GRID_STYLE` (worker) | **content/furniture, not UI tokens** — stays out of tokens.css by the three-system rule; record only |
| preview host `60dvh` / `min-height 16rem`; breakpoint `60rem`; panel `16rem` | layout | layout tokens (companion-mode geometry) |
| dark scheme via `prefers-color-scheme` media only | `:root` | scheme architecture: tokens must support both schemes and the `data-theme` override pattern |

## Baseline artefacts (byte-identity proof for M14-VERIFY-02)

**Source fixture**: `tests/ui-baseline/source-gradient-256.png` —
256 × 256, generated from stated constants (LCG seed `0x9e3779b9`,
gradient + noise ±15 + flat 64 px centre block) by
`tests/ui-baseline/source.ts`. Never regenerated by CI.

**Node-side pins** (`tests/ui-baseline/baseline.test.ts`, runs in
`check` on every task): SHA-256 of the fixture PNG file, of the
reference-pipeline output pixels + palette-index sidecar for the
app-default config (200 × 200 resize-first contain, default DMC
palette 489, lab, Floyd–Steinberg serpentine strength 1, TS backend
forced per stage), and of the serialized default project file.
Committed in `tests/ui-baseline/hashes.json`. A mismatch during M14
is a defect in the milestone's UI-only promise, never a fixture to
refresh.

**Browser-side captures** (`tests/ui-baseline/exports/`), produced
through the real UI on the audited build (Chromium 148 / Electron
42.7): fixture imported by drop, defaults untouched except where
stated, each export via its button.

| File | Settings | SHA-256 |
| --- | --- | --- |
| `design-200x200.png` | export scale 1, transparent | `dced27ddce6300ce557f172f1f68c3faa8044f7c2b3037a70327a79a8afdce94` |
| `design-200x200@4x.png` | export scale 4, transparent | `a563c43089086873d992bb2a118432b885b816a32d01b91065a21277243a3451` |
| `chart-200x200.png` | chart cell 10, grid defaults | `bcae7c7f3796925ee3664310eb13d470335a5677654c523ff34cdb0732d105cb` |
| `chart-200x200.pdf` | A4 portrait, margin 15 mm, no title | `0ef9458c2b8e983a21c9b04ee2b8657be3baa3db00294018501064aa5a6acb2b` |
| `project-200x200.json` | Save project at defaults | `e29e4fd96047669fb9e7b5e92e1a867d8ebb1f786a8237a4e0075e670f2328b3` |

**Cross-proof**: the browser clean PNG's decoded pixels hash-match the
Node reference pin exactly
(`4607af4b8bb99b7d1e818b820e9f841cfd51ce38658772f47434a6b4ace33a46`),
welding the UI route (import → worker with automatic backend routing →
export encode) to the TS reference.

**Re-run rules for VERIFY-02**:

- PNG re-captures compare **decoded pixels** first (environment-free);
  file-hash equality additionally holds when the same browser build
  re-encodes.
- The PDF is **not** byte-stable across runs: pdf-lib stamps
  `CreationDate`/`ModDate` at build time. Compare after normalising
  those two fields (or compare the embedded chart PNG object + text
  content). Everything else must be identical.
- The saved project compares **field-wise**: `preview.cssPxPerStitch`
  is viewport-derived (1.92 at this capture's window) and may differ
  legitimately; every other field must be identical. Schema stability
  itself is pinned Node-side.

## Notes for SPEC-01 (strengths not to regress)

Recorded so the redesign keeps what already works: one composed shell
model (collapse/focus cannot fight, exit always visible, focus moved
deliberately and returned on exit); every conflict a full sentence in
a polite live region with the way out named; count summary's
selected-vs-used honesty (settled state); per-row rule selects with
proper per-thread names; palette deletion undo instead of a modal;
capped lists that say what the cap hid; brand provenance stated at the
point of choice; draft/paused/unchanged states named in words; the
four resolutions never sharing a label; zero page-level horizontal
scroll at 320 px; DOM order = visual order = tab order by construction
(no positive tabindex, no CSS `order`).
