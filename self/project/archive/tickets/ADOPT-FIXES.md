# ADOPT-FIXES — adopt.md fixes from its first real run

> **Status:** Next milestone.
> **Grades:** Impact **Low-Med** · Difficulty **Low** · Risk **Low** ·
> OpΔ **None**.
> **Release class:** patch/minor per finding that ships; some findings
> may close as record-why-not.
> **Origin:** SELF-HOST (2026-07-16) — the first real execution of
> `pm_skills/integrations/adopt.md`, against this repository (the
> docs-only tier, self-hosting edge case).

## Intent

Triage each finding from adopt.md's first real run: fix in the
distributed flow, or record why it stays as-is.

## Findings

1. **Step-0 detection misfires on the framework repo itself.**
   Step 0 routes to upgrade.md when `pm_skills/VERSION` exists — on
   this repo it exists because it is the *product*, not a prior
   deployment. SELF-HOST proceeded by maintainer direction. Lean: one
   line in Step 0 distinguishing "framework source tree" from "prior
   deployment" (cheap, prevents a confusing route for anyone else
   self-hosting a framework fork).
2. **File-map generator scope assumption.** The scaffold
   `gen-file-map.mjs` `IGNORE` list excludes `pm_skills/**` ("framework
   files: classed in MANIFEST, not source") — correct for consuming
   projects, wrong where the product tree IS the source. Resolved via
   the documented copy-it-out path (`scripts/gen-file-map.mjs`, tuned).
   Lean: no distributed change needed; the knob worked as designed —
   record-why-not.
3. **Memory-home assumption.** adopt.md (and init/session prompts)
   assume the memory home is `pm_skills/project/`. Self-hosting needed
   a parallel home (`self/`) plus a path-mapping rule in the repo
   contract. Lean: leave the prompts as-is (the mapping rule is a
   repo-contract concern, and this repo is the only known case);
   revisit only if a second self-hosted deployment appears.

## Done when

Each finding is either shipped as a release or closed with the
why-not recorded in the decision log.

## Constraints

- Fixes are normal releases (VERSION bump + CHANGELOG entry each).
- Keep adopt.md's read-cost and brevity discipline — no new phases.
