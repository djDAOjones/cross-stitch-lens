# Project Brief — pm-skills framework

<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->

## What are we building?

The pm-skills framework itself: a project-management layer for
AI-assisted coding, distributed as Markdown (memory templates,
rulebooks, prompt workflows) plus two dependency-free Node scaffold
scripts. `README.md` is the canonical product description; this brief
governs the *development* of that product.

## Who is it for?

- **Consuming projects** — solo and small-team builders who own
  product direction and let AI agents implement. Primary evidence
  base: the Digital Art Audience Hub (first real deployment, ~200
  shipped items).
- **This repository** — the framework's own development runs on the
  framework (self-hosted since 2026-07-16, SELF-HOST).

## Platform and deployment

A git repository of Markdown. "Deployment" is a consuming project
copying `pm_skills/` + the root templates, then tracking releases via
`pm_skills/prompts/upgrade.md`. Public source:
`https://github.com/djDAOjones/PM-Skills`.

## Core product surfaces

- Project memory templates (`pm_skills/project/`) + tiered read policy.
- Rulebook templates (root `AGENTS.md`, `UI-STANDARDS.md`,
  `DEV-INFRASTRUCTURE.md`).
- Workflows: task/bugfix/init/adopt integrations, session-start,
  end-of-task, memory-maintenance, release, upgrade, review prompts.
- Release machinery: `pm_skills/VERSION`, `pm_skills/CHANGELOG.md`
  (upgrade instruction set), `pm_skills/MANIFEST.md` (per-path upgrade
  classes).

## Constraints

- Overwhelmingly Markdown; zero runtime dependencies; minimal dev
  tooling (lint gate only).
- Distributed tree stays pristine — repo-specific content lives in
  `self/` (see `self/AGENTS.md` → "Product identity").
- Every distributed change ships as a versioned release with upgrade
  actions; consuming projects must upgrade declaratively.
- Checkout often lives on a cloud-synced path (OneDrive) — tooling
  must not depend on `node_modules/` being present or fresh.

## Out of scope (for now)

- A website, viewer, or any UI surface.
- Programmatic/tooling enforcement of backlog grammar (declined
  2026-07-16, FMT-CONV — see decision log).
- Data-migration guidance until a consuming project has persistent
  user data (deferred with trigger — see backlog Icebox).

## Open questions

- (none — the `/next` distribution question was resolved by promoting
  NEXT-CMD to the backlog Current milestone, 2026-07-16.)
