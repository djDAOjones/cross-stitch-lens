# M8-ALG-01 — Implement selected dither algorithms

## Outcome

Implement only the algorithms approved by M8-SPIKE-01 as pure, deterministic
TypeScript reference stages. Every selected method produces valid palette
colours, preserves transparency, has an explicit parameter contract, and remains
correct when accelerated backends are unavailable.

## Current baseline

`DitherParams` currently contains palette, metric, serpentine, optional candidate
table, and a reserved seed. `PipelineConfig` has a Boolean `dither`, so enabled
means Floyd–Steinberg and disabled means nearest-colour reduction. Pipeline
assembly, worker protocol, routing, project persistence, tests, and WASM bindings
all encode that assumption. The WASM backend implements Floyd–Steinberg only;
WebGPU implements reduction, not dither.

## Recommended model boundary

Replace the implicit Boolean with an explicit discriminated algorithm setting,
while retaining a clear `none` state. Keep algorithm parameters scoped to the
algorithm that understands them, for example:

```ts
type DitherConfig =
  | { algorithm: 'none' }
  | { algorithm: 'floyd-steinberg'; serpentine: boolean; strength: number }
  | { algorithm: 'ordered'; matrixSize: 4 | 8; strength: number; phase: number };
```

The exact union must follow the spike decision. Avoid a bag of optional fields
whose invalid combinations require runtime guessing. Persist stable identifiers,
not display labels. A schema migration must translate old `dither: true/false`
and `serpentine` values without changing old projects' rendered output.

## Engine and backend rules

- Each algorithm is a pure function over `PixelBuffer`; never mutate its input or
  allocate objects per pixel.
- Reuse the colour matcher/candidate-table machinery where mathematically valid.
  Do not reuse pruning if it changes a reference result.
- Define transparent-cell and border-error behaviour explicitly for every
  diffusion kernel.
- Any threshold tile is immutable data with documented provenance, dimensions,
  indexing, and phase convention. Runtime randomness is forbidden; a seed must
  fully determine output.
- Backend fallback may substitute another backend for the **same algorithm**. It
  must never silently substitute a different dither method.
- Keep Floyd–Steinberg TypeScript behaviour byte-identical unless an approved
  algorithm change explicitly says otherwise.

## Likely implementation surface

`src/core/pipeline/dither.ts` (or small sibling modules), pipeline config and
identity, `src/core/project.ts`, worker protocol/executor/router, UI state used by
M8-CTRL-01, diagnostics, and backend selection. The Rust/WASM API should remain
Floyd–Steinberg-specific until profiling justifies more work.

## Acceptance evidence

For each selected method cover happy path, empty/transparent input, one-row and
one-column boundaries, tiny palettes, both metrics where supported, deterministic
repeatability, non-default parameters, and strict palette membership. Prove
pipeline order and preview/export agreement. Prove old project JSON migrates to
the same Floyd–Steinberg or no-dither output and new JSON round-trips byte
identically.

Record benchmark rows at representative grids and palette sizes. If a selected
TypeScript algorithm misses the documented budget, stop at evidence and bring a
backend proposal; do not pre-emptively add WASM, WebGPU, or dependencies.

Golden evidence needs an explicit owner decision because `tests/golden/**` is
protected. Until that approval, ordinary deterministic fixtures can prove the
implementation, but the ticket's `[sign-off]` completion requires the agreed
golden strategy.

## Risks and dependencies

- Blocked by M8-SPIKE-01 and its owner-approved method set.
- M8-CTRL-01 consumes the discriminated configuration; settle the data contract
  before building controls.
- M7 palette identity work must not be collapsed back to RGB-only assumptions.
- Larger diffusion kernels increase sequential work and temporary storage.

## References

- Requirements: `docs/requirements.md` §8, §15, §20, and §23.
- Decisions D3, D4, D6, D11, D17, D19, D44, and D48.
- `src/core/pipeline/dither.ts`, `src/core/pipeline/config.ts`,
  `src/core/project.ts`, and `src/worker/backend-select.ts`.
