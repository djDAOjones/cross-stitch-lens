# M13-ACCEPT-01 — Automated integrated acceptance

## Outcome

Prove the final M13 code and measurement policy as one system: refreshed bv2
bench rows, composed-pipeline correctness, backend routing/fallback, export
isolation, memory/counter invariants and the non-mutating quality gate. This is
the machine half. A failure routes back to the owning M13 finding; it is never
waived or hidden by rebasing.

## Entry conditions

M13-SYNTH-01 is signed and every conditional implementation ticket is **resolved**:
shipped, merged into another item, or explicitly cut. The backlog's literal
blocker list names all three IMPL items, but a synthesis decision not to explore
appearance must not leave acceptance waiting forever on M13-IMPL-03.

The shared M13 evidence document identifies final build, bv2 contract, product
targets, regression baselines and backend roles. All correctness defects found by
profiles are fixed or explicitly block this gate. No benchmark report used here
is tainted by sleep/interruption, dev-server code or invalid backend output.

## Required commands and artefacts

- `npm run check` — types, lint, Rust/WASM step, ordinary Vitest, production build,
  docs/paths/spelling/editorconfig and secret scan.
- `npm run matrix` — full composed correctness matrix including the 1024 row;
  regenerate `docs/acceptance-matrix.md` only via `npm run matrix:write` if rows
  intentionally changed, then re-run the non-mutating gate.
- `npm run bench` — clean bv2 Node report and all final regression bindings.
- production browser harness — final `preview-update`, controlled `interaction`,
  `export`, WebGPU correctness and counter report on the target Mac.
- focused backend/audit commands activated by synthesis, with JSON output carrying
  final build/environment identity.

Do not call a command green from piped/truncated output; preserve its real exit
status. A timing miss still writes evidence before failing. Do not use CI's wider
noise multiplier as proof that the target development machine passes.

## Integrated correctness matrix

Cover pairwise-plus-risk rather than an unbounded Cartesian product, while proving
every risk introduced by M13:

- 200/300/1024; p64, actual p489, any approved multi-brand stress and full RGB;
  Lab/RGB; all shipped dither methods, non-default strengths and serpentine scope;
- resize-first plus reduce-first characterisation, resize modes, alpha/empty cells,
  near ties, duplicate RGB identities and source/grid size distinctions;
- each eligible backend route on both sides of thresholds, forced dev verification,
  missing WASM/WebGPU, device loss, shader/backend rejection and TS fallback;
- warm/cold palette changes, A→B→A and LRU churn; palette indices and strict tie
  ordering after every cache/backend path;
- preview live/draft/compare and export idle/live/draft/cache-miss; clean/enlarged
  PNG, chart PNG and PDF; two export requests if scheduling changed;
- project save→load→save plus config→pixels round trip after any routing/creative
  schema change (none should be needed for a pure backend change).

## Invariants

Assert TS reference availability and purity; no input mutation; deterministic
output; dimensions; palette membership where the contract promises it; truthful
`EMPTY_INDEX`/thread identity; transparent cells do not diffuse; exact or approved
GPU tolerance; every Worker request answers once; latest-wins newest-only; cache
keys include ordered content; and pattern/capture/preview/export scales remain
independent.

Exports are compared byte-for-byte with an independent full-quality run under
persisted project config. Preview draft, last displayed frame, active capture,
backend fallback and cache warmth cannot change export pixels/indices. No
protected golden is regenerated to make a failure pass.

## Performance/report integrity

Check bv2/report schema, workload uniqueness/coverage, raw samples, spread,
unsupported reasons, interruption validity, actual palette entry counts, actual
backends and build identity. Product targets bind only to their approved browser
boundaries; Node baselines bind to named Node rows. Staleness guards should fail
when a baseline has become too loose.

Counter tests reconcile callbacks, dirty skips/forced refreshes, both drop layers,
results and errors. Allocation/retention tests are deterministic where possible;
real GC/peak/browser limits remain a manual evidence leg, not a hollow unit test.

## Failure routing

- wrong pixels/indices/persistence → correctness owner, gate blocked;
- backend mismatch/fallback/wedge → M13-IMPL-02 or focused defect;
- budget/product miss with valid output → synthesis reopened; do not rebase here;
- tainted/noisy report → measurement ticket rerun/fix;
- appearance difference → M13-IMPL-03 decision/review, never agent acceptance;
- browser-only manual gap → explicitly pending M13-ACCEPT-02, not “passed”.

## Likely files

Primarily tests, generated acceptance table (through its writer), shared evidence
and ticket/decision records. Runtime code changes indicate a discovered defect and
should be handled as a focused fix before rerunning this gate. Protected golden
fixtures, catalogue data and generated WASM output are not hand-edited.

## Exit criteria

All required commands exit zero on final code; Node and browser reports match the
signed bv2/target policy; matrix/fallback/export/counter invariants pass; every
skip is expected and explained; and the shared evidence links exact artefacts and
build identity. Then hand the same build and rehearsal sheet to M13-ACCEPT-02.

## Fresh-chat starting point

Read the signed synthesis decision, final shared evidence and each activated
implementation outcome. Build an acceptance-to-evidence checklist before running
commands. Stop on the first real failure, preserve its artefact, classify it and
route it—do not weaken the gate.
