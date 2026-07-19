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

### M5B — Component investigations (§22, §23.5) (current milestone)

Each audit starts from the leads recorded in `tickets/M5-PERF.md`
(verify, don't re-discover) and appends its evidence there. M5A shipped
the bv1 baseline: several leads there are already confirmed, bounded or
challenged by measurement — read those verdicts before re-deriving them.
Measure with `npm run bench`; the contract is
`docs/measurement-contract.md`. The three browser-only boundaries have a
documented rehearsal but **no numbers yet** — M5-PERF-18 owns taking
them.

- [ ] **M5-PERF-10 Audit pipeline construction and ownership** [spike] [detail]
  Intent: quantify identity-adjust cloning, stage ordering, transfers, retained buffers, and repeated palette/config construction.
  Done when: each material orchestration cost has evidence and any discovered bug or safe optimisation has a concrete follow-up ticket.

- [ ] **M5-PERF-11 Audit resize** [spike] [detail]
  Intent: compare area averaging with separable, integral-image, canvas, and GPU candidates across modes, alpha edges, and source sizes.
  Done when: timings and memory are recorded; byte equality or tolerance is established; CPU/GPU roles and crossover thresholds are recommended before either path receives deep optimisation.

- [ ] **M5-PERF-12 Audit LUT construction and colour reduction** [spike] [detail]
  Intent: separate LUT build from pixel mapping and test TS/WebGPU costs, cache behaviour (including the name+count cache key's stale-LUT risk), palette sizes, readback overhead, and near-tie differences.
  Done when: cache correctness and fallback are verified; candidates have build, steady-state, memory, and output-difference evidence; TS/WebGPU mapping roles and crossover thresholds are explicit.

- [ ] **M5-PERF-13 Decompose dither colour conversion** [spike] [detail]
  Intent: measure transfer-function powers, XYZ/Lab conversion, and cube roots independently; evaluate lookup-based reductions against frozen Exact output.
  Done when: each cost is quantified and proposed alternatives include output-difference propagation through error diffusion.

- [ ] **M5-PERF-14 Decompose dither nearest-colour search** [spike] [detail]
  Intent: compare linear scanning, provably exact candidate pruning, spatial search, and LUT-quantised matching for 64- and 533-colour palettes.
  Done when: timings, table-build cost, memory, winner coverage, and first-index tie behaviour are evidenced.

- [ ] **M5-PERF-15 Audit WASM boundary and generated code** [spike] [detail]
  Intent: measure copying, palette conversion, allocation, JS glue, Rust execution, emitted WASM, and calibration representativeness separately.
  Done when: the actual boundary/backend costs are known and SIMD or persistent-memory work is either justified by evidence or rejected.

- [ ] **M5-PERF-16 Audit worker scheduling and split compare** [spike] [detail]
  Intent: trace latest-wins scheduling, bitmap creation, stale-result risks, and compare's second full-RGB pipeline run.
  Done when: throughput, latency, dropped frames, compare overhead, and any race or stale-frame bugs have reproducible evidence.

- [ ] **M5-PERF-17 Audit capture and dirty-frame path** [spike] [detail]
  Intent: measure canvas creation, readback, dirty sampling, copies, crop effects, gates, and allocation under static and changing sources.
  Done when: idle and active costs are separated and any collision, stale-signature, gate-stall, or allocation issue has a follow-up.

- [ ] **M5-PERF-18 Audit preview rendering and UI work** [spike] [detail]
  Intent: measure bitmap conversion, canvas/grid/tick rendering, stats, diagnostics, zoom, and compare redraws apart from worker processing.
  Done when: main-thread responsiveness and the ≤5 ms render row have browser evidence and discovered hot paths or bugs are ticketed.

- [ ] **M5-PERF-19 Audit export isolation** [spike] [detail]
  Intent: verify exports use the chosen creative algorithm but never adaptive draft substitutions, and examine maximum-grid memory, latency, and preview contention.
  Done when: isolation and round-trip expectations are proven; export performance or scheduling defects have follow-ups.

*Acceptance: every material frame path has a cost breakdown, bug
inventory, evidence-ranked optimisation candidates, and explicit
correctness constraints.*

### M5C — Performance and product decision gate (§22, §23.5)

- [ ] **M5-PERF Synthesize the performance strategy** [sign-off] [detail] (2026-07-19)
  Intent: use M5A/M5B evidence to choose quality-neutral work, justify any processing modes, and bind budgets to explicit behaviour.
  Done when: resize strategy, Exact/Balanced/Responsive semantics if retained, default mode, visual thresholds, budget mode, and honest Exact expectations are approved.

*Acceptance: implementation tickets carry approved behaviour and
evidence; no unresolved algorithm or budget choice is delegated to a
coding task.*

### M5D — Quality-neutral implementation (§22, §23.5)

- [ ] **M5-PERF-20 Remove proven orchestration waste** [detail]
  Intent: apply approved clone, allocation, cache, and stage-construction reductions without weakening ownership or transfer safety.
  Done when: targeted costs fall by the agreed amount and worker/capture correctness tests pass unchanged or are strengthened for discovered bugs.

- [ ] **M5-PERF-21 Implement the approved resize reference** [detail]
  Intent: preserve or land the approved pure TypeScript resize reference, deeply optimising it only if M5C shows the CPU path remains performance-relevant.
  Done when: resize tests and fixture tolerances pass and any approved CPU optimisation meets its measured role-specific target; otherwise the correct fallback remains unchanged.

- [ ] **M5-PERF-22 Implement Exact dither acceleration** [detail]
  Intent: accelerate frozen Exact appearance using only transformations proven to preserve its matching and tie behaviour.
  Done when: TypeScript and Rust are bit-exact across the expanded parity suite and the before/after cost contribution is recorded.

- [ ] **M5-PERF-23 Implement approved boundary/backend improvements** [detail]
  Intent: apply only WASM, WebGPU, or worker-boundary changes whose M5B evidence clears their stated benefit and complexity threshold, with workload-based routing rather than universal replacement.
  Done when: measured crossover thresholds select appropriate backends by workload; feature detection and TS fallback remain sound; each change meets its individual target.

- [ ] **M5-PERF-24 Extend performance regression coverage** [detail]
  Intent: encode the approved measurement contract as repeatable, non-mutating checks without hiding machine variance or weakening budgets.
  Done when: the workload matrix reports regressions consistently locally and in CI.

*Acceptance: Exact output remains frozen where promised; approved
quality-neutral improvements pass parity and report their individual
before/after contribution. Implementation follows measured backend
roles: deeply optimise the TS reference only where it remains
performance-relevant, while retaining it as the correctness fallback
everywhere.*

### M5E — Processing modes (§22, §23.5) (conditional on M5C)

- [ ] **M5-MODE-01 Define processing-mode contracts** [sign-off] [detail] (2026-07-19)
  Intent: specify stable user-facing and internal semantics for Exact appearance, Balanced, and Responsive without exposing backend names; modes are a fidelity axis orthogonal to algorithm choice, so future dither algorithms (Icebox) slot in without redefining modes.
  Done when: each retained mode has an approved parameter bundle, quality promise, export meaning, and default/migration behaviour.

- [ ] **M5-MODE-02 Implement Balanced processing** [detail]
  Intent: add the approved near-neutral algorithms as a distinct creative mode rather than replacing the Exact reference.
  Done when: independent fixtures, backend parity, visual-difference evidence, and the Balanced performance budget pass.

- [ ] **M5-MODE-03 Implement Responsive processing** [detail] (contingent)
  Intent: add approved speed-prioritised algorithms with explicit quality limits for large-grid live work — only if M5C evidence shows Balanced cannot sustain fluid live capture at demanding grids; otherwise cut this item.
  Done when: fixtures, parity, representative visual comparisons, and the Responsive performance target pass — or the item is cut with the evidence recorded.

- [ ] **M5-MODE-04 Persist processing intent** [detail]
  Intent: carry the selected mode through pipeline configuration and versioned project JSON without conflating it with temporary preview quality.
  Done when: all projects default to Balanced (v1 files included — back-compat waived 2026-07-19, see ticket); schema defaults, validation, and save→load→save byte identity pass.

- [ ] **M5-MODE-05 Add the Processing control** [detail]
  Intent: expose one Carbon-style mode select while keeping backend selection automatic and dev-only.
  Done when: immediate application, keyboard/accessibility behaviour, project restore, and honest processing status pass UI review.

- [ ] **M5-MODE-06 Improve adaptive draft behaviour** [detail]
  Intent: use Responsive before disabling dithering, reducing disruption when live processing falls behind; if Responsive is cut (M5-MODE-03), keep today's dither-off fallback and close this item with that decision recorded.
  Done when: hysteresis is stable, draft remains visibly named, recovery is automatic, and exports/saved creative intent never inherit the substitution.

*Acceptance: each retained mode has stable semantics, fixtures,
parity, persistence, accessible UI, honest status, and correct export
behaviour.*

### M5F — Integrated acceptance (§22, §23.5)

- [ ] **M5-ACCEPT-01 Run the correctness and parity matrix** [detail]
  Intent: exercise backend availability, processing modes, metrics, scan directions, alpha boundaries, resize modes, palette sizes, and fallbacks together.
  Done when: the automated matrix passes without weakening the TypeScript reference or golden-fixture protections.

- [ ] **M5-ACCEPT-02 Review processing-mode output** [maintainer] [sign-off] [detail] (2026-07-19)
  Intent: judge representative gradients, photographs, hard edges, transparency, and artwork across retained processing modes.
  Done when: accepted differences and any rejection/rework decisions are recorded against the agreed visual thresholds.

- [ ] **M5-ACCEPT-03 Rehearse live Photoshop capture** [maintainer] [detail] (2026-07-19)
  Intent: validate update rate, latency, dropped/skipped frames, draft transitions, split compare, and idle CPU during realistic editing.
  Done when: the live acceptance measurements are recorded and any failure is classified as a bug or an approved budget decision.

- [ ] **M5-ACCEPT-04 Reconcile performance budgets and protected docs** [sign-off] [detail] (2026-07-19)
  Intent: resolve the D43 architecture doc-delta using final measurement boundaries, mode binding, and evidence rather than aspirational numbers.
  Done when: the approved budget table and related infrastructure documentation accurately describe enforced behaviour.

- [ ] **M5-ACCEPT-05 Close M5** [sign-off] [detail] (2026-07-19)
  Intent: close the milestone only after automated, benchmark, visual, and live-capture evidence agree.
  Done when: `npm run check`, the approved benchmark suite, parity matrix, and manual gates pass; residual risks and release readiness are recorded.

*Acceptance: the budget mode meets its targets, Exact has a published
measurement, backend equivalence passes, and live editing feels responsive.*

### Icebox

<!-- Deferred but worth keeping (post-triage). Needs a decision to
     reactivate. Promote into a milestone when committed. -->

**Parked next (post-MVP, triage from wish-list):** more dithering
algorithms, user-defined palettes, symbols + B/W charts, multi-page
PDF, advanced grid/tick styling presets, thread estimates, Tauri
packaging.

M5 couplings: *more dithering algorithms* ride on the M5 mode
contracts and search structures (M5-MODE-01 orthogonality,
M5-PERF-14); *user-defined palettes* must fix the LUT cache key
(stale-LUT lead in M5-PERF-12) and need the M5-PERF-14 evidence on
per-palette table build cost for live editing.

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
