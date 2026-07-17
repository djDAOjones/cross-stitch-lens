# Conventions — pm-skills framework repository

<!-- Hot whole-file read. See pm_skills/memory-policy.md for limits. -->

## Prose style

- en-GB spelling (`cspell.json` sets `en,en-GB`; curated `words`
  dictionary — prefer rewording over growing it).
- Hard-wrap prose at ~72 characters; tables and code blocks may run
  long (MD013 is off).
- Plain English over coinage in distributed docs.

## Naming

- Framework prompts/integrations: lower-case kebab (`end-of-task.md`).
- Backlog item IDs: SCREAMING-KEBAB (`SELF-HOST`, `CODEBASE-AUDIT`);
  ticket files named `<ID>.md`.
- Transcripts: `YYYY-MM-DD-<ITEM-ID-or-topic>.md` (the 3.7.0
  convention), under `self/_transcripts/`.
- Evaluations: `YYYY-MM-DD-<topic>.md`, under `self/evaluations/`.

## Commit messages

`<ITEM-ID>: <summary>` title; body states what/why plus a `Verify:`
line with the gate result; one `-m` per line when composing (shell
safety). Trailers: `Close: lite` only for sanctioned lite closes.
Releases commit VERSION + CHANGELOG + the changed distributed files
together, title `<ID>: <summary> (vX.Y.Z)`.

## Documentation

Canonical-copy discipline: every rule lives in exactly one file;
others cross-reference it. Distributed docs never reference `self/`
or anything source-only. The two scaffold/scripts forks are
deliberate — see `CONTRIBUTING.md` → "Note on deliberate forks".

## Testing

No test runner — the product is docs. The gate's four checks
(markdownlint, docs integrity, cspell, editorconfig) are the safety
net; `scripts/check-docs.mjs` is the regression guard for the main
rot risk (broken cross-references). Behaviour changes to prompts are
"tested" by consuming-project evidence and retrospective evaluations
(`self/evaluations/`).

## Patterns to follow

- Point, don't restate (digest + link to the canonical copy).
- Compress on ship: backlog holds open work only; outcomes go to
  trajectory, the why to the decision log.
- Archive, never delete: shipped tickets and pruned memory move to
  archive tiers verbatim.

## Patterns to avoid

- Repo-specific content in distributed files (the product/process
  boundary in `self/AGENTS.md`).
- Version-pinned snapshots inside memory files — reconcile against
  `pm_skills/VERSION` + CHANGELOG at session start instead.
- Growing the cspell dictionary for scratch or archive content.

## Tooling

See `self/DEV-INFRASTRUCTURE.md` (capability surface) and
`CONTRIBUTING.md` (canonical tooling reference + config rationale).
