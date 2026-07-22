# M13-SYNTH-01 — Performance synthesis: targets, roles and go/no-go

## Outcome

A maintainer-approved decision that turns five profile packs into a bounded M13
implementation programme—or decides no implementation is justified. It records
binding product targets, regression baselines, backend roles/crossovers, the
1024-grid position, quality-neutral work, whether appearance-changing exploration
is warranted, and which Phase-4 tickets are activated, merged or cut.

This is a `[sign-off]` review. An AI chat assembles evidence and recommendations;
the maintainer chooses. No engine or routing code changes during synthesis.

## Required inputs

Do not begin the decision meeting until all five predecessor reports exist:

- M13-PROF-01: Node/browser stage ranking for every shipped dither family;
- M13-PROF-02: palette resolution, cold preparation, cache churn and retained bytes;
- M13-PROF-03: valid end-to-end backend crossovers and fallback costs;
- M13-PROF-04: live capture→visible latency, drops/staleness/draft behaviour;
- M13-PROF-05: allocations, GC, export peak memory/contention and isolation proof.

Each quoted number must name bv2 boundary, workload ID, runtime, actual backend,
build/environment, cache state, distribution and run validity. Reject or retake
tainted/interrupted, dev-build, direct-stage-as-end-to-end, invalid-output or
mislabelled-palette evidence. M5 is historical context, not a substitute.

## Keep three kinds of target separate

1. **Product promise:** editing feels live at typical grids—currently at least
   four visible updates/sec at ≤300². Decide whether this binds to sustained rate,
   p95 interaction latency, or both; write the exact boundary and workload.
2. **Regression baselines:** observed warm/cold component rows guarded against
   code drift. These are not aspirations and must name runtime/build/workload.
3. **Ceiling/export expectations:** 1024² is currently described as finishing/
   export rather than typical live editing, while the original brief also says
   full pipeline ≤100 ms at 1024². Resolve that tension explicitly rather than
   letting two standards coexist.

Decide practical export peak-memory/latency limits and whether the 1024 grid cap
stays, changes or needs a separate follow-up. Browser and Node targets never share
an unexplained multiplier.

## Decision table

For every proven issue, complete one row:

| Finding | User impact | Evidence strength | Proposed action | Appearance | Risk | Ticket |
| --- | --- | --- | --- | --- | --- | --- | --- |

Possible actions are: fix correctness defect first; quality-neutral optimisation;
backend/routing change; appearance exploration; target/baseline clarification;
defer with trigger; or no action. Projected speed-ups are not evidence strength.

Quality-neutral candidates need a byte-equality/tolerance oracle and same-workload
before/after path. Prefer the smallest proven bottleneck set; split unrelated
optimisations so D48's compounded-attribution error cannot recur. If the 300²
promise already passes comfortably and no export/memory defect matters to users,
“no implementation” is a valid successful synthesis.

## Backend role questions

- Does Floyd–Steinberg routing remain Lab→TS and RGB→WASM across current browser
  workloads, or do crossovers require size/palette thresholds?
- Does WebGPU remain LUT-build-only? If mapping is activated, how will async
  response safety, palette indices, alpha and device-loss fallback be preserved?
- Are cold setup and resource retention paid often enough to matter? A warm stage
  crossover alone cannot decide a route.
- Is a dev-only force mechanism required for acceptance? It is diagnostics state,
  never project/creative state.

Every rule states its crossover evidence on both sides and what happens when the
backend is unavailable. TS remains the reference and universal fallback.

## Appearance-changing gate

Activate M13-IMPL-03 only if a measured, material user problem cannot be addressed
quality-neutrally and a named candidate has plausible benefit of the right order.
Define the reference, difference metrics, representative visual set and owner
review before exploration. D47 already rejected canvas resize as a drop-in because
it changed almost every output pixel; do not reintroduce “Balanced/Responsive” or
new modes without new evidence and an explicit product decision.

## Deliverables

- One shared M13 evidence document holding measurements, clean-run metadata,
  findings and before/after deltas. Pick its path once; later tickets cite rather
  than duplicate it.
- One decision-log entry recording targets, backend roles, activated/merged/cut
  tickets, rejected alternatives and owner sign-off.
- Updated Phase-4 backlog blockers/status. A cut conditional ticket counts as
  resolved for M13-ACCEPT-01; do not leave acceptance blocked on work deliberately
  declined.
- Precise acceptance matrix for automated and maintainer gates.

## Sign-off protocol

Present: evidence-quality checklist; current product status; target choices;
ranked action table; backend decision; appearance gate; Phase-4 disposition; and
residual risks. Ask for a decision on each unresolved row, record it in substance,
then update the shared evidence/decision log. Do not ask the maintainer to approve
raw timings without interpretation or to accept taste on behalf of an agent.

## Fresh-chat starting point

Read D47/D48/D63, the completed bv2 contract and all five predecessor ticket
outputs. Build the evidence-quality table first. If any load-bearing row is
missing or tainted, stop and route it back to the owning profile ticket; synthesis
must not fill gaps with estimates.
