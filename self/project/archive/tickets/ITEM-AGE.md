# ITEM-AGE — Standing-item ageing at the batch pick

<!-- cspell:ignore iceboxed -->

> **Status:** Later / minor.
> **Grades:** Impact **Medium** (SEC-1 would not be 7 weeks old) ·
> Difficulty **Low** · Risk **Low** · OpΔ **Low**.
> **Release class:** patch/minor (prompt wording + template comment).
> **Case study:** §3.6, §6 R5.

## Intent

Human-owned work ages invisibly: the framework keeps `[maintainer]` /
`[sign-off]` / `[blocked]` items *visible*, but visibility without age
decays into wallpaper. Surface age at the moment a human is already
choosing what to do (the next-batch pick), with an escalation flag for
security-critical lines.

## Done when

Backlog grammar records a date on standing items; Start B prints age
for `[maintainer]`/`[sign-off]`/`[blocked]` items ("SEC-1 — open 49
days"); a `[security]` flag escalates to a one-line session-start
banner regardless of Start mode.

## Evidence (banked — do not re-research)

- **SEC-1** (leaked `OPENAI_API_KEY`): standing Active since
  **2026-05-20**, deliberately pinned ("Kept Active (not iceboxed) —
  live exposure") — and still unrotated at HEAD (~7 weeks). Perfect
  visibility, zero pressure.
- Other agers at HEAD: DEP-7 (venue-gated, reasonable), NET-1's
  maintainer half (on-site check + Metered-tier reconfirm, flagged
  2026-07-08), DOC-1 (deferred "to the end of the build phase"
  2026-07-05), DEP-10 ("possibly obsolete — maintainer to confirm or
  cut").
- The mechanism slot already exists: Start B step 3 presents the
  pick + runner-up; adding an "ageing standing items" line costs one grep
  (dates are already conventional in Hub backlog lines, e.g. "Raised
  2026-07-08", "parked from Active 2026-06-23").

## Approach

1. **Grammar:** the backlog template comment adds "standing items carry
   their creation date" (most Hub lines already do informally).
2. **Start B:** after the pick, one compact block — up to 3 oldest
   standing items with age: `SEC-1 [maintainer][security] — 49 d`.
   Nothing else changes; no nagging on Start A (task-focused starts
   stay clean) except `[security]`.
3. **`[security]` flag:** documented in the ticket grammar; any open
   `[security]` item prints a single banner line at every session
   start until closed. Reserved for live exposure (leaked credential,
   open auth hole) — the definition goes in the grammar comment so it
   isn't diluted.
4. **Diagnose:** counts standing items older than a threshold (WARN),
   so the periodic health check also sees them.

## Constraints

- Age is informational; the framework never auto-escalates an item's
  position (ordering stays dependency-driven — the Hub's explicit
  convention).
- One banner line max — a wall of nags gets ignored (the
  permanently-red budget lesson, §3.2).
- No date-parsing dependency: `YYYY-MM-DD` in the line + shell date
  arithmetic, or plain "since `<date>`" if arithmetic is unavailable.

## Files touched (framework)

`pm_skills/prompts/session-start.md` (Start B + banner),
`pm_skills/project/backlog.md` template comment (dates + `[security]`),
`pm_skills/prompts/memory-maintenance.md` (Diagnose row),
`pm_skills/GUIDE.md` one-liner. MANIFEST unchanged.

## Open questions

- Threshold defaults: WARN at 30 days? Put the number in
  `memory-policy.md` (numbers live there) as a soft row.
- Cross-ref SEC-BASE: its playbook should state that a leaked-credential
  item gets `[security]` on creation.
