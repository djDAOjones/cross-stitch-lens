# M14-AUDIT-01 — Standards & heuristics audit

## Outcome

A ranked, evidence-backed findings record of everywhere the current UI
falls short of `UI-STANDARDS.md` — Carbon productive anatomy, the
Nielsen sections (hard rules, not aspirations), WCAG 2.2 AAA, and the
14-item design review gate — plus the baseline artefacts later tasks
verify against. Read-only: no fixes land here. Milestone rules per D73:
agent-executable, decisions recorded not gated, UI-only.

## Method

Enumerate surfaces from the code, then walk each in the running app
(dev server + the in-session browser):

- Surfaces: header/shell bar, source section (import + capture +
  crop/thumbnail), preview host + toolbar, compact status, info panel,
  debug panel + diagnostics button, and the seven control groups —
  Pattern, Grid, Colour, Dither, Pipeline, Export, Project.
- States per surface: empty (no source), populated, busy/paused/draft,
  error, conflict (Colour panel), collapsed, preview focus, narrow
  (320 CSS px), wide (≥ 60 rem), light/dark, reduced motion.
- Checks per surface × state: Carbon component match (name which
  component/pattern the element should be, note divergence); every
  Nielsen rule in `UI-STANDARDS.md` → "Usability heuristics"; WCAG 2.2
  AAA — contrast computed from actual styles (7:1, 4.5:1 large),
  target sizes, focus visibility/obscuration, keyboard operability and
  traps, labels vs accessible names, status announcement
  (`aria-live`), headings/landmarks; the design review gate items.
- Keyboard-only full pass and an accessibility-tree read of every
  panel (roles, names, values).
- Hard-coded-style inventory: every value in the `index.html` style
  block and any inline styles in `src/ui/*` / `src/main.ts`, tagged
  with which future token should own it (feeds M14-SPEC-02).
- Fold in known findings: FIT_MARGIN clips 3-digit row labels at
  fit-width in narrow windows (wish-list, seen at 420 px) — record,
  don't fix.

## Baseline artefacts (for later byte-identity proof)

Capture and commit a small reference set the verify phase re-runs:
clean PNG, enlarged PNG, chart PNG, PDF, and a saved project file,
produced from a deterministic source (a committed fixture image or a
generated buffer with a stated seed) at stated settings. Record the
exact settings and hashes in the audit doc. Screenshot each surface ×
key state for the before/after pack.

## Exit criteria

`ui-audit.md` (new, under `docs/`) holds: the surface × state matrix with every cell
visited; a findings table ranked by severity (blocker / major / minor
/ polish), each with the violated criterion, evidence (measured value,
tree excerpt, or screenshot ref) and affected surface; the hard-coded
style inventory; the baseline export hashes and settings. No fixes, no
opinions without a criterion.

## Fresh-chat starting point

Read `UI-STANDARDS.md` whole, D73, `index.html`, `src/main.ts`
(`build()` — the panel assembly), `src/ui/` per the file map. Run the
app with the browser preview tools; resize to 320 px and 60 rem+;
toggle `prefers-color-scheme` and `prefers-reduced-motion`. The app is
fully offline; `npm run dev` serves it.

## External references

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — criterion text for AAA.
- [Carbon components](https://carbondesignsystem.com/components/overview/)
  — anatomy to name per control (implemented in project code, never
  installed).
