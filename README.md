# PM Skills

[![Lint](https://github.com/djDAOjones/PM-Skills/actions/workflows/lint.yml/badge.svg)](https://github.com/djDAOjones/PM-Skills/actions/workflows/lint.yml)

A project-management layer for AI-assisted coding. It gives your AI
agent a **memory** (files that carry your project's context between
chat sessions), a **rulebook** (standards the agent must follow), and
**workflows** (step-by-step procedures for building, fixing, and
shipping). The result: every new chat starts already knowing your
project, and the agent designs before it codes instead of improvising.

Built for solo and small-team builders who own the product direction
but want the AI to handle implementation — without losing context,
drifting off-plan, or wasting tokens.

Defaults: Carbon Design System, WCAG 2.2 AAA accessibility, Nielsen
usability heuristics, JSDoc, and a lean invariant-led testing
doctrine. All customisable.

## The pieces, in plain words

- **Project memory** (`pm_skills/project/`) — living files the agent
  reads and updates: what you're building (`brief.md`), how it's built
  (`architecture.md`), what's next (`backlog.md`), why past choices
  were made (`decision-log.md`), what shipped (`trajectory.md`), raw
  ideas (`wish-list.md`), and what each file does (`file-map.md`).
- **Rulebooks** (`AGENTS.md`, `UI-STANDARDS.md`,
  `DEV-INFRASTRUCTURE.md` in your project root) — the permanent rules:
  coding invariants, UI and accessibility standards, and how the
  project builds, runs, and deploys.
- **Workflows** (`pm_skills/integrations/` and `pm_skills/prompts/`) —
  procedures the agent follows. If your AI tool supports workflows
  (e.g. slash commands), copy `integrations/` into its workflow
  folder; otherwise paste the prompt files into chat.

## Set up (once per project)

1. Copy `pm_skills/` into your project.
2. Copy `AGENTS.md`, `UI-STANDARDS.md`, and `DEV-INFRASTRUCTURE.md` to
   your project root.
3. Fill everything in by following `pm_skills/init.md` — or just tell
   the agent:

   > Run pm_skills/init.md in agent mode.

   It interviews you, drafts each file, and waits for your approval
   before writing anything.

Starting from nothing but an idea? Use
[`pm_skills/integrations/init-mvp.md`](pm_skills/integrations/init-mvp.md)
instead:

> Run init-mvp: I want a web app that tracks my houseplants'
> watering schedules.

You approve two things — the foundation (what it understood, the tech
stack, the task list) and **how far to go** (just build it locally, or
carry on and deploy it) — then it builds the whole first version
without further questions.

Already have a codebase? Use
[`pm_skills/integrations/adopt.md`](pm_skills/integrations/adopt.md)
instead of init:

> Run adopt.md on this repo.

It reverse-engineers your project memory from the source tree and git
history, then asks only for what the repo can't tell it — proposing
edits to your existing docs, never overwriting them.

## Day to day: pick → build → close

### 1. Pick what to work on

Open a fresh chat. Either name the task yourself:

> My task: add a CSV export button to the reports page.

…or let the agent choose from your backlog:

> Pick the next batch.

It will propose the next logical item (triaging any parked ideas
first) and wait for your go-ahead.

### 2. Build it with the task workflow

Run `task.md` (or paste the stage prompts — see the GUIDE). By
default it works in **checkpoint** mode, which interrupts you only
twice:

1. It investigates and presents the **scope** — you approve it.
2. It presents 2–3 **design options** with a recommendation — you
   pick one.

Then it plans, sanity-checks, and implements on its own, telling you
what it assumed. Other modes when you want them:

> Run this as full. — *a check-in at every stage; use for risky work*
>
> Run this as auto-jazz. — *no check-ins at all; it decides, builds,
> and reports*

Small fix or tweak? Say it's a quick task and you get a single
scope-and-plan to approve instead of four stages. Something broken?

> This is a bug: saving a plant with no name crashes the app.

…runs `bugfix.md`, which diagnoses the root cause and gets your OK
before fixing anything.

Whatever the mode, the agent must respect the hard limits: no new
dependencies, no touching protected files, no deleting data, no
weakening tests — it stops and asks instead.

### 3. Close the task

> Run end-of-task.

The agent runs the project's quality check, updates the memory files
(ticks off the backlog item, records why decisions were made, logs
what shipped), and reports. This is what keeps the next session smart
— don't skip it.

## While you're working

One-liners that keep a session on track (full list in
`pm_skills/prompts/session-start.md`):

> Park it. — *captures a side-idea to the wish-list and gets back to
> work*
>
> Tighten scope. / Reset to plan. / Stay in design mode. — *course
> corrections*

## Every so often

- **After an autonomous run** (auto-jazz or an init-mvp build):
  "Run review.md" — a read-only audit of what landed, with a verdict
  and follow-up list, before you accept the work.
- **When the agent says memory is over budget**: approve the
  `memory-maintenance.md` pass it proposes — it archives old content
  losslessly (Prune), health-checks the files (Diagnose), or tidies a
  messy backlog (Refactor).
- **Ready for production**: "Run deploy.md" — pre-flight checks, the
  documented deploy pipeline, live verification, rollback if anything
  fails.
- **New framework version out**: point the agent at the newer
  pm-skills and say "Run upgrade.md" — it applies only what changed,
  never touches your project memory, and never overwrites your
  customisations.

The full guide — folder contents, how the memory tiers work, and the
copy-paste flow for AI tools without workflow support — is
[`pm_skills/GUIDE.md`](pm_skills/GUIDE.md).

## What's in this repo

- **`pm_skills/`** — the framework: templates, prompts, workflows,
  docs. Versioned via `pm_skills/VERSION`, `pm_skills/CHANGELOG.md`,
  and `pm_skills/MANIFEST.md`, which make upgrades a declarative read
  rather than a full-tree diff.
- **`AGENTS.md`**, **`UI-STANDARDS.md`**, **`DEV-INFRASTRUCTURE.md`** —
  distribution templates with `<!-- CUSTOMISE -->` placeholders,
  populated during initialization. Not filled-in contracts for this
  repository.
- **`self/`** — this repo's **own pm-skills deployment** (the
  framework develops itself on its own loops): the operative agent
  contract (`self/AGENTS.md`), living project memory
  (`self/project/`), and archived history. Source-only, never
  distributed — see `CONTRIBUTING.md`.

## Glossary

### Project memory (`pm_skills/project/`)

| File | What it holds |
| --- | --- |
| `brief.md` | What you're building, for whom, and what's out of scope. |
| `architecture.md` | Tech stack, folder structure, key modules. |
| `conventions.md` | Code style, naming, testing and tooling choices. |
| `backlog.md` | Open work only, grouped by milestone. Shipped items leave. |
| `decision-log.md` | Why each design choice was made (append-only). |
| `trajectory.md` | One line per shipped item — the project's history. |
| `wish-list.md` | Raw parked ideas, waiting to be triaged in or cut. |
| `file-map.md` | One line per source file: its role in the codebase. |
| `tickets/<ID>.md` | Optional extra detail for one big backlog item; deleted when it ships. |
| `archive/` | Old memory moved out of the way; created on the first prune. |

### Rulebooks (project root)

| File | What it governs |
| --- | --- |
| `AGENTS.md` | Hard rules and invariants every agent session must follow. |
| `UI-STANDARDS.md` | Design system, usability, and accessibility standards. |
| `DEV-INFRASTRUCTURE.md` | Build, dev server, runtime, diagnostics, quality gate, deploy. |

### Framework files (`pm_skills/`)

| File | What it is |
| --- | --- |
| `GUIDE.md` | The full manual — read this second, after this README. |
| `init.md` | Project setup, step by step (manual or agent-run). |
| `memory-policy.md` | Size budgets for memory files and what to do when they trip. |
| `VERSION` / `CHANGELOG.md` / `MANIFEST.md` | Framework version, release history (doubles as upgrade instructions), and per-file upgrade rules. |
| `scaffold/` | Starter config to copy to your project root: `.editorconfig`, `.gitignore`, `.markdownlint.json`, `check-links.mjs` — plus `gen-file-map.mjs`, which runs in place. |

### Commands — what you say, what runs

| You say | What runs | What happens |
| --- | --- | --- |
| "My task: …" | `integrations/task.md` (checkpoint mode) | Scope → your approval → options → your pick → it plans and builds. |
| "Run this as full / auto-jazz / auto-jazz-lite" | `task.md` in that mode | Same stages; a check-in at every gate / none / none + compressed. |
| "This is a quick task: …" | `prompts/quick-task.md` | One combined scope-and-plan to approve, then build. |
| "This is a bug: …" | `integrations/bugfix.md` | Diagnose root cause first; fix only after your OK. |
| "Pick the next batch" | `prompts/session-start.md` → Start B | Triages the wish-list, proposes the next backlog item, waits. |
| "Run next" | `integrations/next.md` | Picks the next backlog item, builds it auto-jazz, closes it — one item per invocation, no per-item sign-off (`[sign-off]` items escalate to full). |
| "Run end-of-task" | `prompts/end-of-task.md` | Quality gate, memory updates, size check, closing report. |
| "Park it" | (one-liner) | Captures the current side-idea to the wish-list, resumes work. |
| "Run review.md" | `prompts/review.md` | Read-only audit of an autonomous run: verdict + punch list. |
| "Run memory maintenance" | `prompts/memory-maintenance.md` | Diagnose (health check), Prune (archive), or Refactor (tidy backlog). |
| "Run deploy.md" | `prompts/deploy.md` | Pre-flight, documented deploy pipeline, live checks, rollback path. |
| "Run upgrade.md" | `prompts/upgrade.md` | Updates the framework to a newer version; never touches memory. |
| "Run init.md in agent mode" / "Run init-mvp: …" | `init.md` / `integrations/init-mvp.md` | Set up a new project / set up **and** build it, to a signed-off ceiling. |
| "Run adopt.md on this repo" | `integrations/adopt.md` | Retrofit pm-skills onto an existing codebase; reverse-engineer memory, ask only for gaps. |
| `check` | your project's quality gate | One command that answers "did I break anything?" — defined in `DEV-INFRASTRUCTURE.md`. |

Contributing to the framework itself? See
[`CONTRIBUTING.md`](CONTRIBUTING.md).
