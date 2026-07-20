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

### M5D — Quality-neutral implementation (§22, §23.5)

- [ ] **M5-PERF-20 Remove proven orchestration waste** [detail]
  Intent: apply approved clone, allocation, cache, and stage-construction reductions without weakening ownership or transfer safety. M5B found nothing material left here beyond M5-PERF-25 — scope accordingly rather than hunting.
  Done when: targeted costs fall by the agreed amount and worker/capture correctness tests pass unchanged or are strengthened for discovered bugs.

- [ ] **M5-PERF-25 Reuse the dither f32 work buffer and skip identity adjust**
  Intent: the 12 MB per-frame f32 work buffer is the only allocation M5B found worth reusing (it is stage-private scratch, never observable), and the identity `adjust` clone can be skipped at config level.
  Done when: both land without weakening stage purity, and the ownership invariant M5B pinned still holds — the response buffer can never alias the retained `lastFrame`, which requires every remaining stage to allocate its own output.

- [ ] **M5-PERF-21 Land the bit-exact hoisted resize** [detail]
  Intent: M5B settled this — the hoisted-coverage variant is byte-identical to the reference and ~1.5× faster on every case in the matrix, while separable is *slower* near 1:1 and summed-area is slower everywhere. Land the hoisted variant; do not rewrite as separable.
  Done when: resize golden fixtures pass unchanged (no tolerance needed) and the ~1.5× is reproduced by `npm run audit`. The 5 ms row was revised at M5C (D47) — this ticket does not touch it.

- [ ] **M5-PERF-22 Implement Exact dither acceleration** [detail]
  Intent: land the two bit-exact wins M5B proved — hoist the query Lab out of the palette scan loop, then per-bin candidate pruning (exactness argued and verified over 138k adversarial values). Together 888 ms → 217 ms at 1024²/64 with byte-identical output. The pruning table is a per-palette one-off and belongs in the LUT cache, not the frame path.
  Done when: TypeScript and Rust are bit-exact across the expanded parity suite, the table build is cached and excluded from frame timings, and the before/after contribution of each of the two changes is recorded separately.

- [ ] **M5-PERF-23 Implement approved boundary/backend improvements** [detail]
  Intent: apply only WASM, WebGPU, or worker-boundary changes whose M5B evidence clears their stated benefit and complexity threshold, with workload-based routing rather than universal replacement. M5B closed the wasm-boundary leads (copies are 0.2% of a call; SIMD is mis-aimed), so this item is now about routing, not about the boundary.
  Done when: measured crossover thresholds select appropriate backends by workload; feature detection and TS fallback remain sound; each change meets its individual target. D47 added one candidate: wiring `mapPaletteGpu` (needs executor asyncification) — gate it on re-measuring in-browser on a **production** build, since the D47 dev-server TS figures look understated.

- [ ] **M5-PERF-27 Replace one-shot calibration with workload-threshold routing**
  Intent: D42 calibrates once on a 96²/533 frame and applies the winner everywhere, but M5B measured the backend margin varying 2.1–5.4× by workload — and the winner flips entirely once M5-PERF-22 lands (TS 217 ms vs wasm 417 ms at 1024²/64).
  Done when: selection is a threshold over grid × palette size, it is re-derived after M5-PERF-22 rather than before, and the TS reference remains the fallback everywhere.

- [ ] **M5-PERF-28 Recompute the compare pass only when it can change**
  Intent: split compare re-runs `adjust + resize` over the full source every frame (16.4% overhead at 300²) although its result is deterministic for a given source and geometry.
  Done when: the compare bitmap is recomputed only on source or geometry change, cell-for-cell alignment with the output is unchanged, and the second per-frame ImageBitmap allocation is gone.

- [ ] **M5-PERF-24 Extend performance regression coverage** [detail]
  Intent: encode the approved measurement contract as repeatable, non-mutating checks without hiding machine variance or weakening budgets.
  Done when: the workload matrix reports regressions consistently locally and in CI, encoding the D47 budget shape — one product promise (≥ 4 preview updates/sec at ≤ 300², in-browser) plus per-stage measured baselines with regression guards, each naming its runtime and workload ID.

- [ ] **M5-PERF-32 Run the WebGPU suites on a real GPU** (2026-07-20)
  Intent: the unmet leg of M5-PERF-31. Two GPU defects shipped behind `describe.skipIf(!isWebGpuAvailable())` on a node CI; D46 added GPU-free scans for both known classes, but the bind-group defect was found only by *executing* on a GPU, so the scans cannot be the whole answer.
  Done when: the real-GPU suite runs somewhere with a GPU (browser runner, or a documented manual gate with recorded results), and asserts bin agreement with the TS LUT rather than timing. Note an implausibly fast GPU row is itself a defect signal.

*Acceptance: Exact output remains frozen where promised; approved
quality-neutral improvements pass parity and report their individual
before/after contribution. Implementation follows measured backend
roles: deeply optimise the TS reference only where it remains
performance-relevant, while retaining it as the correctness fallback
everywhere.*

### M5F — Integrated acceptance (§22, §23.5)

- [ ] **M5-ACCEPT-01 Run the correctness and parity matrix** [detail]
  Intent: exercise backend availability, metrics, scan directions, alpha boundaries, resize modes, palette sizes, and fallbacks together (processing modes were cut at M5C — D47).
  Done when: the automated matrix passes without weakening the TypeScript reference or golden-fixture protections.

- [ ] **M5-ACCEPT-02 Review output quality** [maintainer] [sign-off] [detail] (2026-07-19)
  Intent: judge representative gradients, photographs, hard edges, transparency, and artwork. Narrowed by D47: modes are cut and every M5 change is bit-exact, so this is a confidence review against the current reference, not a cross-mode tolerance judgement.
  Done when: the reviewed output is accepted, or any rejection is recorded with the artwork that failed.

- [ ] **M5-ACCEPT-03 Rehearse live Photoshop capture** [maintainer] [detail] (2026-07-19)
  Intent: validate update rate, latency, dropped/skipped frames, draft transitions, split compare, and idle CPU during realistic editing.
  Done when: the live acceptance measurements are recorded and any failure is classified as a bug or an approved budget decision.

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
