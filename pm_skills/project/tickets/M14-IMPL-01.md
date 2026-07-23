# M14-IMPL-01 — Carbon shell & layout

## Outcome

The app sheds its M1 dev shell: styling moves from the `index.html`
inline block to token-driven stylesheets under `src/ui/styles`
(imported through Vite), and the shell chrome — header, shell bar,
panel containers, info strip — takes Carbon productive form. First
consumer of M14-SPEC-02's tokens; layout per M14-SPEC-01. Milestone
rules per D73: UI-only, byte-identical outputs, no new runtime deps.

## Scope

- Extract the `index.html` style block into structured stylesheets
  (e.g. `base.css`, `shell.css`, alongside `tokens.css`); every value
  that maps to a token uses the token. The inline block shrinks to
  nothing or a critical-path minimum with a recorded reason.
- Carbon productive chrome: app header (name + version meta) as a
  proper header bar; the settings column as Carbon side-panel anatomy
  (its container, not yet its controls); info strip and status lines
  on the type scale; spacing rhythm from the spacing tokens.
- Preserve, restated as tests where not already tested: preview-first
  DOM order at every width with no CSS `order`; the 60 rem breakpoint
  behaviour; 320 px companion baseline (no page-level horizontal
  scroll, wide tables scroll inside their panel); preview-focus flex
  chain and its focus/status rules; the `[hidden]` display rule; the
  `dvh` choices and their recorded reasons (keep the CSS comments'
  why-content — they encode M6 lessons).

## Out of scope

Control anatomy (M14-IMPL-02), regrouping (M14-IMPL-03), copy
changes (M14-IMPL-05). The seven groups keep their current membership
this task even if the shell around them changes.

## Verification

Browser pass at 320 px / 60 rem+ / preview focus × light/dark ×
reduced motion; keyboard walk unchanged or improved; existing shell
and preferences tests green; new tests for any invariant this task
had to restate; screenshots into the before/after pack
(`ui-evidence.md` — the milestone evidence doc; created under `docs/`
on first use). Exports untouched by construction — confirm
`npm run check` green and no `src/core`/`src/worker`/`src/export`
diffs.

## Exit criteria

Dev-shell block gone (or minimal with reason); shell surfaces match
the spec's named Carbon patterns; all listed invariants hold with
evidence in `ui-evidence.md`; `check` green; decision-log entry
for the stylesheet structure chosen.

## Fresh-chat starting point

Read D73, `ui-spec.md` (layout + token sections), `index.html`
whole (the comments carry M6 rationale — preserve the why),
`src/ui/shell.ts`, `src/ui/preferences.ts`, and the M6 entries the
spec cites (D52/D53). Vite serves CSS imports from TS entry points —
follow the existing `src/main.ts` import pattern.
