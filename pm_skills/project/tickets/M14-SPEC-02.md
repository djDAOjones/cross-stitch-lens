# M14-SPEC-02 — Token system & visual language

## Outcome

The token layer both `UI-STANDARDS.md` and `DEV-INFRASTRUCTURE.md`
already promise but which does not exist: `src/ui/styles/tokens.css`,
landed real but unconsumed (zero visual change this task), plus a
contrast proof script. Milestone rules per D73.

## The two token systems (UI-STANDARDS — never collapse them)

- **Project tokens**: app chrome brand/semantic colours,
  capture-region border states, status indicators. New file, CSS
  custom properties, both schemes via `prefers-color-scheme` (the
  existing `color-scheme: light dark` root stays).
- **Carbon-convention tokens**: spacing scale (Carbon's 2 px-based
  steps as rem), productive type scale (the styles this app actually
  uses — body, label, helper, heading, code/meta), layer/field/border
  tokens, interaction state tokens (hover, active, selected,
  disabled), focus ring, motion durations honouring
  `prefers-reduced-motion`. Implemented to Carbon spec in project
  code — Carbon packages stay uninstalled.

Thread palette colours and preview pixels are **content**, not UI —
they route through neither system (UI-STANDARDS → "Token systems").
The audit's hard-coded-style inventory is the coverage checklist:
every inventoried value maps to a token or is recorded as
intentionally untokenised with a reason.

## Contrast proof

`check-contrast.mjs` (new, under `scripts/`) — dependency-free Node,
same pattern as the existing `scripts/*.mjs`: parses the token file (or imports a
small JSON/JS source of truth the CSS is generated from — implementer's
choice, recorded), computes WCAG contrast for every declared
text/background pair in both schemes, fails under 7:1 (4.5:1 for
pairs explicitly marked large-text). Wire it into `check:docs` or as
its own `check:` step per `DEV-INFRASTRUCTURE.md` → "Quality gate"
conventions — the gate stays non-mutating and under ~2 minutes.

Carbon's own palette meets AA, not AAA, in several pairings — where a
Carbon reference colour misses 7:1, adapt it and record the
adaptation (AGENTS.md: Carbon is the baseline, not the ceiling).

## Exit criteria

`tokens.css` exists with both systems, both schemes, JSDoc-style
header comments naming ownership boundaries; no production file
consumes it yet and the rendered app is pixel-unchanged (spot-check);
the contrast script runs in the gate and passes; `ui-spec.md`
gains the token reference section: the full pair table with computed
ratios, the inventory-to-token mapping, and the type/spacing scales
with their Carbon names. Decision-log entry for the token
architecture (source of truth, naming convention, any AAA
adaptations).

## Fresh-chat starting point

Read D73, `UI-STANDARDS.md` → "Token systems" and the accessibility
section, `ui-audit.md` → style inventory, `index.html` (the
values being replaced), `DEV-INFRASTRUCTURE.md` → "Quality gate" and
"Configuration strategy". Check `scripts/` for the house style of a
check script.

## External references

- [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/),
  [type](https://carbondesignsystem.com/elements/typography/overview/),
  [color tokens](https://carbondesignsystem.com/elements/color/tokens/)
  — the conventions being implemented, not installed.
- [WCAG contrast maths](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio)
  — the formula the script implements.
