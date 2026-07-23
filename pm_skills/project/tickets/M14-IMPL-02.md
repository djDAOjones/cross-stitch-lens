# M14-IMPL-02 — Control anatomy upgrade

## Outcome

Every interactive control reaches full Carbon productive anatomy —
label, helper text, validation, disabled and read-only treatments,
error linkage — implemented in project code on the token layer.
Structure and grouping stay as they are (M14-IMPL-03 moves things);
this task upgrades the controls in place. Milestone rules per D73.

## Scope

- `src/ui/controls.ts` builders (toggle / number / colour / select)
  gain the missing anatomy: helper-text slot, invalid state with
  message linked via `aria-describedby`, consistent label/field
  spacing from tokens, Carbon field heights while keeping the ≥ 44 px
  target rule (the existing pseudo-element hit-area trick is the
  house pattern).
- Sweep every control built outside the builders — buttons, file
  input, range/slider, capture toolbar, preview toolbar, shell bar,
  Colour panel's brand/inventory/lock rows, Dither panel selects,
  Export/Project actions — onto the same anatomy or into the
  builders. One control kind = one implementation.
- States: hover, active, focus, disabled, invalid, busy where async
  (Carbon's loading conventions); never colour-only; visible label =
  accessible name everywhere (the D50 rule — no icon-only controls).
- Validation: constrain invalid input at entry (`clampInt` exists),
  message text near the control naming what to do next (final wording
  M14-IMPL-05; structure here).

## Out of scope

Moving, regrouping or re-tiering controls; new controls; copy
rewrites beyond what a state message structurally needs.

## Verification

Per-control-kind checks against the spec's named Carbon component:
anatomy present, states reachable, tree exposes role/name/value,
44 px measured, contrast via the token pairs (script already proves
those). Keyboard operation per kind. Existing UI-adjacent tests
(dither model/panel, palette panel, scales) green; add builder tests
where an invariant is new (e.g. error linkage). Evidence and
screenshots per kind into `ui-evidence.md`.

## Exit criteria

Every inventory row's control shows full anatomy and correct states;
no colour-only state anywhere; builders are the single source for
their kinds; `check` green; evidence recorded; decision-log entry if
any Carbon anatomy was adapted (with the AAA or app-specific reason).

## Fresh-chat starting point

Read D73, `ui-spec.md` control table, `src/ui/controls.ts`,
`src/ui/palette-panel.ts` and `src/ui/dither-panel.ts` (the two big
consumers), then grep `document.createElement` in `src/main.ts` for
the out-of-builder controls. The Carbon reference is the component
pages; adaptation decisions are recorded, not silent.
