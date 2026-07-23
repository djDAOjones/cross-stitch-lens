# M14-AUDIT-02 — Novice journeys & control-depth map

## Outcome

An honest record of what a first-time user meets, and a complete
inventory of the app's control depth — the two inputs M14-SPEC-01
designs from. Read-only: no fixes, no redesign here. Milestone rules
per D73.

## The two audiences

- **Novice**: a stitcher opening the app for the first time, no docs,
  no Photoshop running. They should reach a converted preview and
  understand what they're looking at.
- **Depth user**: the returning designer using brand filters, owned
  threads, locks, count limits, dither families, four resolutions,
  split compare. Their controls must be findable and efficient, not
  buried.

## Journeys to walk (as-is, no charity)

1. Cold start → still image import → converted preview understood.
2. Cold start → live capture → crop → edit loop with a source app.
3. Palette refinement: restrict brands, set a colour count, lock a
   thread, exclude a thread, understand every conflict sentence met.
4. Export: chart PNG and PDF from a finished pattern; find the four
   resolutions; understand what export quality means vs draft preview.
5. Save → close → reopen → same output; understand autosave vs file.

Per journey record: numbered steps (every click/keypress), where the
next action is not visible or not named in user language, jargon met
(e.g. "resize-first", "LUT", backend names), status gaps (did the app
say what it was doing?), dead ends and recovery routes, and the
keyboard-only variant. Note where the current UI is already good —
the spec must not regress named strengths.

## Control-depth inventory

Every interactive control and readout in the app, one row each:
surface, current label, what it does (one line), audience tier
(essential / common / deep — first-pass judgement, SPEC-01 decides),
current findability (visible / behind collapse / dev-only), and
interactions-from-default-surface count. Include the preview toolbar,
capture controls, shell bar, diagnostics and debug panel. This is the
checklist VERIFY-02 re-measures.

## Method notes

Drive the real app with the browser tools. For journey 2 the
`getDisplayMedia` picker cannot be scripted past — walk to the
permission boundary, then continue with a controlled source (the
harness's canvas-stream route, `docs/browser-measurement.md`) and say
so in the record. Count steps from a cleared origin (fresh profile /
cleared storage) so first-run state is genuine.

## Exit criteria

`ui-journeys.md` (new, under `docs/`) holds: five journey tables with step counts,
friction points and keyboard variants; the control inventory with
tier and findability columns complete; a short ranked list of the
worst novice obstacles and the worst depth burials. No solutions —
pointers only.

## Fresh-chat starting point

Read D73, `UI-STANDARDS.md` → "Cross Stitch Lens specifics",
`docs/requirements.md` §2 (core workflow), §5.4, §10–11, and
`pm_skills/project/brief.md` → "Who it's for". Then run the app cold
with storage cleared and walk journey 1 before reading any more code —
the first walk is the honest one.
