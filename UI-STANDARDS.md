# UI Standards

This file contains the full UI, usability, and accessibility rules for
the project. `AGENTS.md` references this file. Read it before any task
that touches UI, controls, layout, text, states, accessibility, or
user-facing behaviour.

---

## Design system

IBM Carbon Design System is the **reference standard** for this
project. Carbon is not installed as a package dependency. All UI
components are implemented in the project's own code to match Carbon's
productive design language: component anatomy, interaction behaviour,
spacing, sizing, and visual conventions.

### Carbon-first UI discipline

- Prefer Carbon components, patterns, tokens, spacing, and interaction
  conventions wherever a suitable Carbon solution exists. Do not invent
  a custom control if Carbon already provides an appropriate one.
- Use Carbon's **productive** UI style for the working interface, not
  expressive or marketing styling.
- Use semantic design tokens for colour, spacing, typography, layer,
  border, and state. Do not hard-code ad hoc UI values unless there is
  no suitable tokenised equivalent.
- Keep layouts modular, consistent, and task-focused. Reuse an existing
  Carbon pattern before creating a new one.
- Where Carbon defaults meet AA but not this project's stricter AAA
  target, adapt them. Carbon is the baseline, not the ceiling.

### Token systems

Two token systems run side by side and must not be collapsed into one:

| System | Governs | Source |
| --- | --- | --- |
| **Project tokens** (`tokens.css`) | App chrome brand/semantic colours, capture-region border states, backend/status indicators | `src/ui/styles/tokens.css` |
| **Carbon conventions** | Spacing scale, typography scale, layout grid, layer tokens, border tokens, interaction state tokens | Implemented in project code to match Carbon spec |

A third, distinct colour concern exists that is **neither** token
system: **thread palette colours and preview pixel colours** are
*content/data*, colour-managed sRGB, and must never be routed through UI
tokens or distorted by CSS filters (see "Colour fidelity" below). When
adding a new token, decide which system owns it; never fold thread
colours into either.

---

## Cross Stitch Lens specifics

A canvas-centric, live image-processing app. These additions cover what
the Carbon/WCAG/Nielsen defaults above do not.

### Layout model

- Single-window app: large preview canvas; Carbon side panel for
  controls grouped as **Pattern / Grid / Colour / Dither / Pipeline /
  Export / Project**; info strip (stitch & colour stats) docked below
  the preview.
- The preview canvas is the product. It collapses like any other
  region — from its own accordion header, disclosure persisted, and
  starting a capture session re-expands it (D107/D110).
- **Preview-first DOM order at every width**, with the settings panel to
  its right above 60 rem and stacked below it under that. Never reorder
  regions with CSS `order`: reading order, visual order, and tab order
  must agree (M6-NARROW-01 / D52). One owner-signed exception
  (M14-FIX-01, D104): while a capture session runs, the Capture region
  section mounts above the preview — a DOM mount, not CSS `order`, so
  the three orders still agree; collapsing or locking the region hands
  the lead back to the preview.
- **Companion-window baseline.** The app must stay usable as a tall
  narrow window beside Photoshop: no page-level horizontal scrolling at
  320 CSS px, wide tables scrolling inside their own container, and the
  preview keeping the majority of the width.

### Shell presentation state

Shell presentation is **app-shell state**, never pipeline
configuration, project data, or the M4 draft-quality state. The shell
model (`src/ui/shell.ts`) reduces to the **cold** entry flag; every
other presentation choice is a per-section accordion disclosure.
Whole-panel collapse and preview focus are both retired (D107/D110) —
do not reintroduce a mode layer. A second independent `hidden` layer
is still the anti-pattern: visibility composes through the one model
plus the disclosure store.

- A collapsed section reopens from its own accordion header, which
  stays visible; any control that reveals something other than its own
  section lives **outside** what it reveals.
- When a state change hides the focused element, move focus
  deliberately (to the toggle, or to the preview host) — never let the
  page lose it.
- Per-disclosure open state persists in the UI-preference store,
  **not** the project file: a shared project must not rearrange a
  collaborator's interface. Deliberate exceptions (the Capture section
  opens expanded every session, unpersisted) are named, never
  accidental (D110).

### Canvas accessibility

- The canvas is excluded from Carbon styling but not from
  accessibility: keyboard zoom (+/−/0), pan (arrow keys), and a visible
  focus ring on the canvas host.
- All information shown on the canvas must also exist in the DOM: the
  stats panel mirrors counts; grid/tick settings are reflected in
  labelled controls, not only in pixels.
- Never encode meaning in colour alone (Carbon rule) — applies to
  capture-region border states and any backend/status indicators.

### Live-processing UX

- Controls apply immediately (requirements §5.4); no Apply buttons.
  Sliders throttle to the pipeline, never block the UI thread.
- Show processing state honestly: a subtle busy indicator when the
  pipeline is behind; "paused" and "source unchanged" states named
  explicitly.
- Draft-quality preview must be visibly labelled as draft so exports
  are never mistaken for it.
- Destructive actions (palette overwrite, project overwrite) get Carbon
  confirm dialogs; everything else is undoable or regenerable and gets
  none.

### Colour fidelity

- Preview rendering is colour-managed sRGB end-to-end; no CSS filters
  or opacity on the preview canvas that would distort perceived thread
  colours.
- Thread-colour swatches show hex + name on hover/focus (tooltip and
  `aria-label`).

### Capture UX

- Permission prompt is user-initiated (button), never on load.
- Crop rectangle: draggable, resizable via handles and arrow keys,
  lockable. No standing dimensions readout: the Stats section owns the
  headline figures, and gesture ends announce position/size through
  the status region (D107).

### Conflict and explanation pattern (Colour panel)

Palette narrowing can reach states a user creates with two clicks — no
brand enabled, an empty inventory under "owned only", a strict preset
that resolved nothing, a lock outside the permitted set. These are
**not errors and never throw**: each surfaces as a `PaletteConflict`
carrying a severity and a full sentence naming the way out (D55).

- Present conflicts as an **`aria-live` list** so a change announces
  itself programmatically, not only visually.
- Severity is carried by a **word** ("blocked", "warning"), never by
  colour alone — the app-wide no-colour-only rule applies.
- Keep the three per-thread rules (lock / prefer / exclude) **disjoint
  controls** in the UI, so a "locked and excluded" contradiction can
  only come from a hand-edited file, never from clicking.

---

## Usability heuristics

Nielsen's heuristics are **hard rules**, not aspirations.

### Content and form (Carbon rules)

- **Sentence case** for all UI text.
- Every input must have a visible label. No colons after labels.
- Visible label text must match the accessible name.
- Labels: concise, 1–3 words where practical.
- Helper text only when it prevents error, clarifies format, or
  explains consequence.
- Prefer native HTML form controls before custom ARIA widgets.
- Use user language, not implementation terms.

### System status

- Every async action must show status: loading, progress, success,
  or error. The UI must never appear frozen.
- Important status changes must be announced programmatically, not
  only shown visually.
- Auto-save, export, import, and recovery states must be visible.

### Empty and no-data states

- Every panel must have an intentional empty state explaining what
  belongs here and what to do next.
- Distinguish "nothing yet," "filtered out," "failed to load," and
  "not available." No blank panels or silent failures.
- Loading states must preserve layout stability — no content jumps.

### User control and freedom

- Provide cancel, undo, or back-out routes for non-trivial actions.
- Destructive actions require confirmation or reliable undo.
- Do not trap users in modes, overlays, or incomplete flows.

### Consistency

- Same words, icons, patterns, and spacing for the same concepts
  throughout. Do not create synonyms for existing concepts.
- Follow existing Carbon conventions and established design tokens.

### Error prevention and recovery

- Constrain invalid input, validate early, disable impossible actions.
- Prefer safe defaults. No silent propagation of invalid states.
- Error messages must say what happened and what to do next.
- Errors must be specific, human-readable, and linked to the relevant
  control. No vague "Something went wrong" without actionable detail.

### Recognition over recall

- Keep key controls visible. Show current selection, mode, and state
  explicitly. Surface context near the point of action.

### Flexibility and efficiency

- Support novice and repeat use. Expose shortcuts for common actions.
- Provide click, tap, and keyboard alternatives — avoid drag-only
  interactions.

### Minimalist design

- Keep interfaces lean and task-relevant. No decorative chrome,
  redundant copy, or competing calls to action.

### Motion discipline

- Motion must be subtle, purposeful, and easy to ignore.
- Respect `prefers-reduced-motion`. No motion as the only carrier
  of meaning. No content flashing more than 3 times per second.

### Help and contextual guidance

- Provide contextual help (tooltips, helper text, inline guidance)
  for non-obvious controls and workflows.
- Help content must be task-focused, concrete, and brief.

---

## Accessibility — WCAG 2.2 AAA by default

Target **WCAG 2.2 AAA** for all applicable UI. Document exceptions
explicitly. Where a criterion cannot reasonably apply, record it in
implementation notes.

### Perceivable

- Text contrast: **7:1** (large text may use **4.5:1** where WCAG
  permits).
- Do not rely on colour alone for state, status, or meaning.
- Link text must make sense on its own — no "click here."
- Use headings and landmarks for substantial content. Provide text
  alternatives for meaningful non-text content.

### Operable

- All functionality must be keyboard operable without traps.
- Focus order must be logical. Focus indicators must be visible and
  not obscured by sticky headers or overlays.
- Pointer targets: **≥ 44 × 44 CSS px** unless a WCAG exception
  applies.
- Do not require path-based gestures or fine motor precision when a
  simpler alternative exists.
- Provide pause/stop/hide for moving or auto-updating content.
- Warn before timeouts that could cause data loss.

### Understandable

- Predictable behaviour. No unexpected context changes on focus or
  input.
- Form instructions and validation near the relevant control.
- Visible labels and accessible names must match for speech input.

### Robust

- Semantic HTML before ARIA. No ARIA is better than bad ARIA.
- Dynamic updates (loading, validation, errors) exposed
  programmatically. Custom widgets must expose role, name, value,
  and state correctly.

---

## Diagnostics affordance

The "copy diagnostics" control is how a maintainer hands the app's own
diagnostic snapshot to an AI agent. The underlying logger, the bundle
contents, and the redaction rules live in `DEV-INFRASTRUCTURE.md` →
"Maintainer diagnostics"; this section governs how the control looks and
behaves. It applies to any project with meaningful UI. A Tier 0 project
with no UI has no affordance — it still logs errors legibly.

### Placement

Do not drop a floating debug wart over the working UI. Prefer, in order:

- An existing dev or status toolbar, if the app has one.
- An app-shell utility menu, if there is a permanent header or sidebar.
- A small floating debug button only if no suitable permanent surface
  exists. Allow a position token: `bottom-right` (default),
  `bottom-left`, `top-right`, or `relative`.

Never let it cover primary navigation, submit buttons, chat inputs,
toasts, or critical status.

### Behaviour and styling

- **Dev-only by default.** Hidden in production unless an explicit
  opt-in is set (gated per `DEV-INFRASTRUCTURE.md` → "Maintainer
  diagnostics"); production exposure requires a redaction review.
- **Carbon button with a visible text label** (not icon-only), naming
  the action in sentence case (e.g. "Copy diagnostics"). A bare icon
  cannot satisfy this project's rule that the visible label and
  accessible name match, and every other control in this app is a text
  button, so this is one too — `title` and text identical (D50).
- **≥ 44 × 44 CSS px** target, visible focus ring, fully keyboard
  operable.
- **Feedback after copy.** Announce success or failure programmatically,
  not by colour alone (e.g. an inline status or toast) — never a silent
  copy. Say what was copied (a redacted bundle) so expectations are set.
- Honour `prefers-reduced-motion` for any reveal or animation.

---

## Design review gate

Before sign-off on any UI-affecting change, verify:

1. Which Carbon component or pattern this change follows.
2. Why a custom pattern was necessary if Carbon was not used.
3. Which Nielsen heuristics were most at risk.
4. Text contrast meets **7:1** for normal text and **4.5:1** for large
   text where permitted.
5. Focus order, focus visibility, and focus non-obscuration still work.
6. All pointer targets meet **44 × 44 CSS px** unless a documented WCAG
   exception applies.
7. Visible labels match accessible names.
8. Link text is self-describing without surrounding context.
9. Empty, loading, success, validation, and error states were all
   considered and are not visual-only.
10. Keyboard, pointer, and assistive-technology routes all still work.
11. Motion can be reduced or disabled where non-essential.
12. Critical submissions or destructive actions support validation,
    confirmation, undo, or reversal as appropriate.
13. Any exception to the AAA-by-default rule is documented explicitly.
14. If a diagnostics affordance is present: it is dev-only by default,
    Carbon-styled, ≥ 44 × 44 CSS px, keyboard operable, gives copy
    feedback, and sits on a permanent surface without covering primary
    controls.
