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

### M5B-FIX — correctness defects found by the M5B audits (current milestone)

The M5B audits shipped their evidence into `tickets/M5-PERF.md`; these
are the defects they found. Two are wrong-output bugs, not performance
work, so they jump the queue ahead of the M5C decision gate. Reproduce
each with `npm run audit` (node) or the procedure in
`docs/browser-measurement.md` (browser) before changing code.

- [ ] **M5-PERF-31 Fix the WebGPU LUT build and cover it on a real GPU** [detail] (2026-07-19)
  Intent: `lutBuildShader` uses `target`, a reserved WGSL keyword, so the shader never compiles; WebGPU reports that asynchronously, nothing throws, and the zero-filled buffer is cached by `ensureLut` in preference to the correct TS LUT. Non-dithered reduction renders a solid single colour in every WebGPU browser.
  Done when: the shader compiles and its LUT matches the TS build within the D41 near-tie tolerance; shader creation drains `getCompilationInfo()`/error scopes and falls back on any diagnostic; and the real-GPU suite runs somewhere that has a GPU, so this class of defect cannot ship again.

- [ ] **M5-PERF-30 Make dirty detection see small edits**
  Intent: the 64×64 downsample averages ~362 source pixels per sample cell at a realistic Retina crop, so small or low-contrast edits round away and the preview never updates — the core live-capture promise failing silently.
  Done when: the in-browser detection threshold is measured against the real `drawImage` sampler, the chosen fix (higher-precision hash, max-difference sampling, or a periodic forced refresh) detects the measured miss cases, and the idle path stays within its current cost.

- [ ] **M5-PERF-29 Never let a frame wedge the worker gate**
  Intent: the client releases latest-wins only in `handleResponse`, and two paths in `pipeline-worker.ts` can post nothing at all — `await ensureLutFor(…)` and `createImageBitmap(…).then(…)` both sit inside a floating async wrapper with no catch. A single rejection stops live preview permanently.
  Done when: every worker entry path posts either a result or an error, a regression test drives each rejection and proves the coalescer is released, and recovery needs no user action.

- [ ] **M5-PERF-26 Key the LUT cache on palette content**
  Intent: the key is `name:entries.length:metric`, so palettes differing only in colour or order share a LUT that stores palette *indices* — a reordered palette renders a red pixel green.
  Done when: the key is a deterministic content fingerprint plus metric and schema version, the reordering case is a regression test, and cache growth stays bounded.

*Acceptance: each defect has a regression test that fails before the fix,
and no fix changes Exact output on a correct configuration.*

### M5C — Performance and product decision gate (§22, §23.5)

- [ ] **M5-PERF Synthesize the performance strategy** [sign-off] [detail] (2026-07-19)
  Intent: use M5A/M5B evidence to choose quality-neutral work, justify any processing modes, and bind budgets to explicit behaviour. M5B narrowed this considerably: three bit-exact wins need no mode contract at all, and the only two remaining levers (rounded conversion, canvas resize) both change appearance.
  Done when: resize strategy, Exact/Balanced/Responsive semantics if retained, default mode, visual thresholds, budget mode, and honest Exact expectations are approved. In particular the 5 ms resize row and the 15 ms dither row are both unreachable on M5B evidence and must be revised or bound to a mode here.

*Acceptance: implementation tickets carry approved behaviour and
evidence; no unresolved algorithm or budget choice is delegated to a
coding task.*

### M5D — Quality-neutral implementation (§22, §23.5)

- [ ] **M5-PERF-20 Remove proven orchestration waste** [detail]
  Intent: apply approved clone, allocation, cache, and stage-construction reductions without weakening ownership or transfer safety. M5B found nothing material left here beyond M5-PERF-25 — scope accordingly rather than hunting.
  Done when: targeted costs fall by the agreed amount and worker/capture correctness tests pass unchanged or are strengthened for discovered bugs.

- [ ] **M5-PERF-25 Reuse the dither f32 work buffer and skip identity adjust**
  Intent: the 12 MB per-frame f32 work buffer is the only allocation M5B found worth reusing (it is stage-private scratch, never observable), and the identity `adjust` clone can be skipped at config level.
  Done when: both land without weakening stage purity, and the ownership invariant M5B pinned still holds — the response buffer can never alias the retained `lastFrame`, which requires every remaining stage to allocate its own output.

- [ ] **M5-PERF-21 Land the bit-exact hoisted resize** [detail]
  Intent: M5B settled this — the hoisted-coverage variant is byte-identical to the reference and ~1.5× faster on every case in the matrix, while separable is *slower* near 1:1 and summed-area is slower everywhere. Land the hoisted variant; do not rewrite as separable.
  Done when: resize golden fixtures pass unchanged (no tolerance needed), the ~1.5× is reproduced by `npm run audit`, and the 5 ms budget row is resolved by M5C rather than by this ticket.

- [ ] **M5-PERF-22 Implement Exact dither acceleration** [detail]
  Intent: land the two bit-exact wins M5B proved — hoist the query Lab out of the palette scan loop, then per-bin candidate pruning (exactness argued and verified over 138k adversarial values). Together 888 ms → 217 ms at 1024²/64 with byte-identical output. The pruning table is a per-palette one-off and belongs in the LUT cache, not the frame path.
  Done when: TypeScript and Rust are bit-exact across the expanded parity suite, the table build is cached and excluded from frame timings, and the before/after contribution of each of the two changes is recorded separately.

- [ ] **M5-PERF-23 Implement approved boundary/backend improvements** [detail]
  Intent: apply only WASM, WebGPU, or worker-boundary changes whose M5B evidence clears their stated benefit and complexity threshold, with workload-based routing rather than universal replacement. M5B closed the wasm-boundary leads (copies are 0.2% of a call; SIMD is mis-aimed), so this item is now about routing, not about the boundary.
  Done when: measured crossover thresholds select appropriate backends by workload; feature detection and TS fallback remain sound; each change meets its individual target.

- [ ] **M5-PERF-27 Replace one-shot calibration with workload-threshold routing**
  Intent: D42 calibrates once on a 96²/533 frame and applies the winner everywhere, but M5B measured the backend margin varying 2.1–5.4× by workload — and the winner flips entirely once M5-PERF-22 lands (TS 217 ms vs wasm 417 ms at 1024²/64).
  Done when: selection is a threshold over grid × palette size, it is re-derived after M5-PERF-22 rather than before, and the TS reference remains the fallback everywhere.

- [ ] **M5-PERF-28 Recompute the compare pass only when it can change**
  Intent: split compare re-runs `adjust + resize` over the full source every frame (16.4% overhead at 300²) although its result is deterministic for a given source and geometry.
  Done when: the compare bitmap is recomputed only on source or geometry change, cell-for-cell alignment with the output is unchanged, and the second per-frame ImageBitmap allocation is gone.

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
