# DEPREC-SHIM — Deprecation shims on consolidation

<!-- cspell:ignore Autojazz -->

> **Status:** Later / minor.
> **Grades:** Impact **Low-Med** · Difficulty **Low** · Risk **Low** ·
> OpΔ **None**.
> **Release class:** patch (upgrade.md wording + a release.md rule).
> **Case study:** §3.7, §6 R11.

## Intent

File consolidations break muscle memory: users keep invoking removed
workflow names/paths long after an upgrade. Make removals leave a
pointer behind — in the AI tool's workflow directory and in the user's
habits — instead of a dead path.

## Done when

`upgrade.md` Step 6's delete handling offers, per removed
workflow-class file: (a) clean the AI tool's workflow dir copy, and
(b) optionally leave a one-line tombstone ("moved to `task.md` modes")
where a copy existed; `release.md` requires consolidation releases to
list the old→new name map in Upgrade actions.

## Evidence (banked — do not re-research)

- **The incident:** after 3.0.0 deleted `auto-jazz.md`, the Hub's
  MOD-LIGHTS-1 session (2026-07-06, transcript in
  `_user files/chat trajectories/Implement MOD-LIGHTS-1.md`) was
  invoked as `@[…archive/upgrade-backup-2026-07-04-1400/pm_skills/
  integrations/auto-jazz.md]` — the user reached into an **upgrade
  backup** to summon the removed workflow. It worked (the old prompt
  text still ran), which is worse: the session executed pre-3.x
  instructions, silently missing 3.0.0's improvements.
- Several other July invocations used bare mode names ("MOD-LIGHTS-1
  … auto-jazz", "Source Management Autojazz Mode") — the *spoken* names
  survived as task.md modes by design (3.0.0 did this right); it is the
  *file path* habit that had no shim.
- 3.0.0's upgrade actions did say "if your AI tool's workflow directory
  contains copies of the removed workflows, replace them with task.md"
  — but as a passive instruction inside a long list; nothing verified
  it happened, and upgrade backups (which the framework itself creates)
  keep pristine old copies within @-mention reach.

## Approach

1. **upgrade.md Step 6, deletions:** for each removed
   `integrations/`/`prompts/` file, (a) ask once whether to sweep the
   AI tool's workflow dir (path prompted once, remembered in the
   report), replacing old copies with their successors; (b) offer
   tombstones — a 3-line file at the old workflow-dir name:
   "Removed in `<version>`. Use `task.md` (mode: auto-jazz). This shim
   can be deleted." Never tombstone inside `pm_skills/` itself (the
   tree must match MANIFEST).
2. **Backup hygiene note:** upgrade backups are for recovery, not
   invocation — one line in the backup step + the report ("do not run
   workflows from `archive/upgrade-backup-*`").
3. **release.md rule:** any release that removes/renames a
   user-invocable file MUST include an old→new mapping table in its
   Upgrade actions (3.0.0's prose had this implicitly; make it a
   checklist item in step 6's verify).

## Constraints

- `pm_skills/` stays byte-faithful to MANIFEST — shims live only in
  the tool's workflow dir, which the user owns.
- Tombstones are optional and self-describing as deletable; never
  regenerate them on later upgrades.
- No tooling assumptions: "workflow dir" location is asked, not
  guessed (varies per AI tool).

## Files touched (framework)

`pm_skills/prompts/upgrade.md` (Step 6 + report),
`pm_skills/prompts/release.md` (verify rule). MANIFEST unchanged.

## Open questions

- Should session-start warn when an @-mentioned prompt path resolves
  inside `archive/upgrade-backup-*`? Cheap and directly targets the
  observed failure — lean yes, one line in session-start's context
  step (pairs with ENV-PREFLIGHT's detection theme).
