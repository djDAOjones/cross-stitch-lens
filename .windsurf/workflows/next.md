---
description: Pick and ship the next pm-skills framework item (self-hosted)
---

This repo self-hosts its own development on the standard pm-skills
loops (SELF-HOST, 2026-07-16). Since 3.16.0 the `/next` loop ships as
a distributed workflow — `pm_skills/integrations/next.md` — so this
file defers to it rather than re-copying the steps. The operative
contract is `self/AGENTS.md`: the product/process split, the `self/`
path mapping, and the release checklist all live there.

1. Run `pm_skills/integrations/next.md` with the `self/` path mapping
   from `self/AGENTS.md` applied throughout: wherever it says
   `pm_skills/project/<file>`, read/write `self/project/<file>`; the
   gate and scripts are per `self/DEV-INFRASTRUCTURE.md`.
   `UI-STANDARDS.md` is not applicable here.
2. Verify before trusting (self-host addition): reconcile
   `pm_skills/VERSION`, the top `pm_skills/CHANGELOG.md` entry, and
   `git status` before building on any memory claim. Fix drift first.
3. When the picked item touches **distributed files** (`pm_skills/**`
   or a root template), close per the framework release checklist in
   `self/AGENTS.md` → "End-of-task extension" as well as
   `end-of-task.md`: bump VERSION, prepend a CHANGELOG entry with
   Upgrade actions, sync MANIFEST/GUIDE, and archive the shipped
   ticket to `self/project/archive/tickets/`. The commit is proposed
   with a staged-set echo — never auto-committed.
