# M13-IMPL-01 — Quality-neutral optimisations

## Activation gate

Conditional on M13-SYNTH-01. Before touching source, copy into this ticket the
exact approved candidates, their evidence rows, target workloads and expected
invariants. If synthesis activates none, cut this item; do not invent work to
satisfy the ticket title.

## Outcome

Land only changes that preserve output byte-for-byte (or the already documented
GPU float tolerance where genuinely applicable), each with an isolated
before/after distribution on its named workload and no regression elsewhere.
TS reference correctness, thread identity, Worker scheduling and full-quality
export remain intact.

## Implementation discipline

Treat each independent optimisation as its own small change and evidence block:

1. freeze the bv2 baseline and correctness oracle before editing;
2. implement the smallest candidate, without unrelated cleanup;
3. prove byte equality including RGBA, alpha and palette-index sidecar over the
   relevant matrix and adversarial ties/transparency;
4. measure the same clean production/Node workload before and after, preserving
   raw samples/spread and backend/cache state;
5. keep or revert on evidence, then move to the next candidate.

D48 is the warning: two earlier candidates changed an inline call boundary and an
algorithmic detail together, and the speed-up was credited to the wrong cause.
Do not land compounded candidates or extrapolate savings from component sums.

## Candidate classes—not approvals

The source audit exposes plausible places to measure, but none is authorised
until named by synthesis: palette RGB/Lab derivative reuse; safe canvas/buffer
reuse at capture/export boundaries; removal of a redundant retained copy after
an ownership proof; per-frame allocation reduction; exact hot-loop hoisting/
inlining; compare redraw avoidance; or bounded export scheduling.

Reject candidates that optimise an already immaterial term, rely on forced GC,
mutate input, allocate per pixel, move processing to the main thread, weaken a
test, change visible output, or introduce WASM/WebGPU without its profile. Shared
mutable buffers are especially risky across transfer/detachment and concurrent
export/preview messages.

## Invariants to prove

- Pure stages: no argument mutation/hidden state; same input+params = same output.
- TS remains ground truth and available when WASM/WebGPU are absent.
- Exact first-index ties, transparent-cell isolation, palette membership and
  truthful `indices` survive every optimised path.
- Every Worker request responds exactly once; latest-wins remains newest-only.
- Pattern/capture/preview/export resolutions stay independent.
- Export re-runs persisted creative config at full quality; draft never leaks.
- Project save/load output remains byte-identical. Protected golden fixtures are
  not regenerated to bless a changed result.

## Test plan

For each change add one regression test that would fail on the pre-fix performance
structure only where deterministic (for example allocation count/cache reuse),
plus existing correctness/parity matrices. Cover happy path, empty/transparent,
boundaries 1 and 1024, error/fallback, repeated reuse and export isolation as
applicable. Performance assertions bind to bv2 rows, not isolated benchmarks
invented for the candidate.

Manual browser verification is required for capture/canvas/GC changes even when
Node tests pass. A retained-buffer change also needs repeated live/export memory
traces and explicit detached-buffer checks.

## Likely files

Only the synthesis-approved modules plus focused tests/audits and the shared M13
evidence document. Potential domains are `src/core/pipeline`/`color`,
`src/capture`, `src/worker`, or `src/export`; a single candidate should not sprawl
across all of them. If approved work exceeds five unrelated files, split it into
subtasks rather than using this ticket as a refactor umbrella.

Do not edit protected palette/golden/generated files, add dependencies, or rebind
backend/budget policy (M13-IMPL-02 owns that). Appearance-changing prototypes
belong only to M13-IMPL-03.

## Exit criteria

Every retained change names its preceding profile, exactness proof and measured
delta; every rejected candidate is recorded with evidence. `npm run check`, the
relevant full acceptance matrix and clean bv2 before/after rows pass. No product
target or unrelated row regresses. Update the shared evidence with measured facts,
not the candidate's expected speed-up.

## Fresh-chat starting point

Read the signed M13-SYNTH-01 decision and only the profile sections it activates.
Restate one candidate, invariant set and workload before coding. If the synthesis
did not name it, stop rather than treating this background brief as approval.
