# NEXT-CMD — Distributed next-item trigger

> **Status:** Current milestone (promoted from the wish-list
> 2026-07-16; two captures merged).
> **Grades:** Impact **Med-High** · Difficulty **Low-Med** · Risk
> **Low-Med** · OpΔ **Medium**.
> **Release class:** minor (one new distributed workflow file +
> wiring).
> **Full original capture:** archived ROADMAP Inbox
> (`self/archive/user_crud/ROADMAP.md`).

## Intent

Consuming projects get the proven `/next` loop as a distributed
workflow instead of a repo-local pointer: one word picks the next
backlog item (session-start Start B), runs it auto-jazz, and closes it
per `end-of-task.md` — rapid progress through a trusted backlog
without re-stating the ritual each session. This repo's
`.windsurf/workflows/next.md` is the working prototype.

## Done when

A framework workflow file ships (likely a new `integrations/` file
named `next.md`, inheriting the `framework` class), GUIDE/README
command tables are wired, the release lands, and this repo's `/next`
defers to the distributed copy plus the `self/` path mapping.

## Approach sketch (design not settled — scope at pick-up)

1. Compose existing pieces, add no new mechanism: Start B pick →
   `task.md` auto-jazz → `end-of-task.md` close. The file is mostly
   pointers, like this repo's `/next`.
2. Honour the existing gates it composes: `[sign-off]` items escalate
   to full mode; wish-list triage still runs at the pick; hard
   prohibitions apply unchanged.
3. Decide: single-item per invocation (recommended — bounded, matches
   "batch" semantics) vs burn-down-until-stopped.

## Constraints

- Never weakens the `[sign-off]` escalation or the hard-prohibition
  stop-and-ask list — the risk of this feature is normalising gateless
  runs; the guardrail wording is most of the work.
- Close mode stays full by default; lite only if the user says so
  (existing task.md rule).

## Open questions

- `integrations/` (workflow frontmatter, copied into tool dirs) vs
  `prompts/` (pasted into chat)? Lean integrations — it is invoked,
  not pasted.
- Does Start B's stop-for-go-ahead survive inside a one-word trigger,
  or does the invocation itself count as the go-ahead? (Prototype says:
  invocation is the go-ahead; state the pick in one line and continue.)
