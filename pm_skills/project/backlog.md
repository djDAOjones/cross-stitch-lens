# Backlog

<!-- Generated during project initialization. Edit freely. -->
<!-- OPEN WORK ONLY. Status: [ ] todo  [~] in progress  [-] cut. -->
<!-- Shipped work does NOT stay here. On ship: add one line to
     trajectory.md (the outcome) + an entry to decision-log.md (the why),
     then remove the item from this file. There is no Completed section. -->
<!-- Hot sectional. Agents read the Active section only by default. -->
<!-- See pm_skills/memory-policy.md for limits; run memory-maintenance.md
     (Refactor) when the queue drifts into dated rounds. -->

Milestones ship in order. A milestone is done when its acceptance
line passes and `check` is green. Requirements references are to
`docs/requirements.md`.

## Active

### M5F — Integrated acceptance (§22, §23.5)

- [ ] **M5-ACCEPT-02 Review output quality** [maintainer] [sign-off] [detail] (2026-07-19)
  Intent: judge representative gradients, photographs, hard edges, transparency, and artwork. Narrowed by D47: modes are cut and every M5 change is bit-exact, so this is a confidence review against the current reference, not a cross-mode tolerance judgement. D49 adds one question: whether `reduce-first` should stay user-reachable, given its output is ~98% off-palette (955 colours, 4 with thread references).
  Done when: the reviewed output is accepted, or any rejection is recorded with the artwork that failed.
  Ready: review pack prepared at `docs/acceptance-visual-review.md` (D50).

- [ ] **M5-ACCEPT-03 Rehearse live Photoshop capture** [maintainer] [detail] (2026-07-19)
  Intent: validate update rate, latency, dropped/skipped frames, draft transitions, split compare, and idle CPU during realistic editing.
  Done when: the live acceptance measurements are recorded and any failure is classified as a bug or an approved budget decision.
  Ready: rehearsal checklist at `docs/acceptance-live-rehearsal.md`; the copy-diagnostics affordance it records evidence with now exists (D50).

- [ ] **M5-ACCEPT-04 Reconcile performance budgets and protected docs** [sign-off] [detail] (2026-07-19)
  Intent: resolve the D43/D44/D45 architecture doc-deltas by applying the budget shape approved at M5C (D47) — product promise + regression-guarded measured baselines, each naming its runtime — rather than aspirational numbers. This item alone edits the protected table.
  Done when: the approved budget table and related infrastructure documentation accurately describe enforced behaviour.

- [ ] **M5-ACCEPT-05 Close M5** [sign-off] [detail] (2026-07-19)
  Intent: close the milestone only after automated, benchmark, visual, and live-capture evidence agree.
  Done when: `npm run check`, the approved benchmark suite, parity matrix, and manual gates pass; residual risks and release readiness are recorded.

*Acceptance: the product promise (≥ 4 updates/sec at ≤ 300²) holds
in-browser, the published measurements are honest at every grid, backend
equivalence passes, and live editing feels responsive.*

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

**Parked next (post-MVP, triage from wish-list):** more dithering
algorithms, user-defined palettes, symbols + B/W charts, multi-page
PDF, advanced grid/tick styling presets, thread estimates, Tauri
packaging.

M5 couplings: *more dithering algorithms* ride on the M5 search
structures (M5-PERF-14); with modes cut (D47) they would land as
algorithm choices, not fidelity tiers. *User-defined palettes* are
unblocked on the LUT cache key (fixed, D46) but still need the
M5-PERF-14 evidence on per-palette table build cost for live editing —
note the GPU LUT build is now 59–655× faster than TS (D47), which
changes that calculus.

<!-- Ticket grammar (CANONICAL COPY — prompts and workflows point here,
     they do not restate it): quick items stay one line. Non-trivial or
     sign-off items add two lines so intent survives compression:
       - **ID Short title** [flags]
         Intent: the outcome wanted.
         Done when: the acceptance condition.
     Flags: [sign-off] (scope sign-off first → full mode), [blocked: X],
     [spike] (timeboxed investigation → spike mode in task.md),
     [detail] (has a ticket file), [maintainer] (human-owned, not agent
     work), [security] (live exposure — a leaked credential or open auth
     hole; nothing weaker).
     Standing items — [maintainer], [sign-off], or [blocked] work that
     waits across sessions — carry their creation date (YYYY-MM-DD) so
     Start B can surface their age at the pick and Diagnose can flag the
     stale ones. A [security] item is a standing item by definition and
     additionally prints a one-line session-start banner until closed;
     flag a leaked-credential tracking item [security] on creation
     (tracking is not remediation — rotate first).
     Add optional Scope:/Risks: lines only for sign-off items. -->

<!-- Optional detail file: when an item needs more context than its line
     can hold (research, options explored, acceptance detail, links),
     put it in pm_skills/project/tickets/<ID>.md and add the [detail] flag
     to the item. Cold tier — agents read it ONLY when that item is the
     active task, so Active stays terse. Working context only; the "why"
     still goes to decision-log.md on ship. The file is deleted when the
     item ships or is cut — it does not outlive the item. -->
