# TASK-SIZING — Size hint for task scope

> **Status:** Later / minor (kept from roadmap_old.md Next; priority
> lowered by the case study — formalisation, not a fix).
> **Grades:** Impact **Low-Med** · Difficulty **Low** · Risk **Low-Med**
> (normalising bigger default scope) · OpΔ **Low**.
> **Release class:** patch/minor.
> **Case study:** Addendum A B4.

## Intent

Let the maintainer declare appetite: `size: minimal | medium | large`
at task invocation, calibrating how broadly scoping and design-options
think — without touching gates, prohibitions, or the minimal-change
default.

## Done when

`task.md` documents the hint; `scoping.md` (smallest-useful-scope
output) and `design-options.md` (option breadth) consume it; the chosen
size is recorded in the decision entry; default remains minimal.

## Evidence (banked — do not re-research)

- Free-text steering already worked on the Hub — the hint formalises
  it: SUBMIT-1 "maintainer picked **Option B** … steering 'minimal
  aesthetic but a full restructure welcome'"; the REC-2/3/4 arc
  "maintainer chose 'frame the whole REC-2/3/4 arc, do everything
  needed'"; WL-19 chose Option B (foundation + per-page rethink) over
  minimal Option A; countless "smallest useful scope" defaults
  elsewhere.
- No observed failure from its absence — the grade stays low; the win
  is predictability (the agent hears appetite once instead of
  inferring it from phrasing).
- Guardrail evidence for the risk note: the framework's conservative
  defaults ("prefer the smallest useful scope") are load-bearing in
  gateless modes — a sticky `large` would erode exactly what made
  auto-jazz safe.

## Approach

1. `task.md`: a `size` hint parsed from the invocation (default
   `minimal`); one line defining each level — minimal = smallest
   useful change; medium = include adjacent cleanups the scope
   naturally touches; large = restructuring welcome within the stated
   area (and if truly behaviour-preserving, recommend REFACTOR-MODE
   instead).
2. `scoping.md`: output 5 ("smallest useful scope") becomes
   size-aware — at `large` it must still state the minimal alternative
   in one line (so the delta is a visible choice).
3. `design-options.md`: option breadth calibrated (minimal may present
   2 options; large should present a genuinely ambitious option).
4. Decision entry records `size:` when non-default.
5. Per-invocation only — never persisted, never inferred from history.

## Constraints

- Gates and hard prohibitions are size-independent (dependency adds,
  protected files, >5-file rule etc. unchanged; `large` is not
  permission — REFACTOR-MODE owns the prohibition lift).
- Default stays minimal and *unstated* (no nagging "size?" question —
  absence means minimal).
- `[sign-off]` items ignore the hint's shortcuts; their gating is
  mode-driven as today.

## Files touched (framework)

`pm_skills/integrations/task.md`, `pm_skills/prompts/scoping.md`,
`pm_skills/prompts/design-options.md`, GUIDE one-liner. MANIFEST
unchanged.

## Open questions

- Land after REFACTOR-MODE so `large` can point at it cleanly.
- Should quick-task honour `size`? No — quick path IS minimal by
  definition; a sized task takes the 4-stage path.
