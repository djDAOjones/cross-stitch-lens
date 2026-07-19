# M5-MODE-05 — Add the Processing control

## Purpose and dependencies

Expose one Carbon-style semantic mode select after M5-MODE-01 contracts and M5-MODE-04 persistence
exist. Users choose creative/performance intent; backend selection remains automatic and dev-only.

## Current UI fit

The control sidebar groups Source/Grid/Colour/Dither/Pipeline/Export. Controls apply immediately and
pipeline config flows from main state to worker. Existing native controls follow Carbon-like classes,
visible labels, helper text, focus/target rules, and tests use pure control models/DOM events. Draft,
paused, and unchanged statuses are already distinct concepts. Profiling exposes backend names only in dev.

## Recommended interaction

Use a native labelled `<select>` following the existing Carbon productive pattern, probably in Pipeline
near processing order—not a custom segmented control. Label “Processing”; options use approved plain names.
Helper text should state the selected quality/performance promise without implementation terms. Apply on
change immediately, announce meaningful processing status, persist project intent, and restore it on load.

If Responsive was cut, do not show a disabled ghost option. Exact must not be described as a backend, and
Balanced must not claim identical output if its contract allows differences. Temporary “Draft preview” status
stays separate so a user can see both selected mode and adaptive substitution.

## Accessibility and tests

- Visible label equals accessible name; semantic HTML; logical focus order; visible non-obscured focus;
  ≥44×44 CSS px target; 7:1 normal text contrast; keyboard selection; no colour-only status.
- Happy/restore: each retained option changes resolved config immediately, survives project reload, and is
  reflected in status. Boundary: Responsive absent; invalid load handled before render.
- Regression: backend remains absent from production UI; draft does not change selection; export uses selected
  mode; controls remain usable during processing; production bundle still strips dev profiling.
- Manual Carbon/WCAG review at real viewport and zoom is required.

## Likely files and done evidence

`ui/controls.ts`, `main.ts`, CSS, project/control/UI tests, possibly info/status panel and diagnostics only for
notable mode changes. Follow UI-STANDARDS; no Carbon package. Done when automated behaviour/accessibility
checks, manual design gate, persistence/export integration, production build, and `npm run check` pass.

## Fresh-chat starting point

Read MODE-01/04, UI-STANDARDS, current controls/main/tests, and draft status handling. Inventory existing
tuneable controls first. Implement one select with approved copy; do not expose per-algorithm or backend knobs.
