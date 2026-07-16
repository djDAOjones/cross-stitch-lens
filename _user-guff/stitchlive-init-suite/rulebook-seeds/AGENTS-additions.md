# AGENTS.md — project-specific invariants for StitchLive

Merge these into the `<!-- CUSTOMISE -->` sections of the PM-Skills
`AGENTS.md` template during init. They are hard rules, not
preferences.

## Engine purity

1. Nothing in `src/core/` may import from outside `src/core/`, touch
   the DOM, `window`, Workers, or perform I/O. If a task seems to
   need it, stop and ask.
2. Pipeline stages are pure: no argument mutation, no hidden state,
   explicit seeds for any randomness. Same input + params → same
   output, always.
3. No per-pixel object allocation inside processing loops. Pixel data
   travels as typed arrays and crosses thread boundaries as
   transferables, never structured-clone copies.

## Backend discipline

4. The TypeScript implementation of a stage is ground truth. It is
   never deleted, stubbed out, or left failing while a WASM/WebGPU
   backend passes.
5. A WASM or WebGPU backend may only be added for a stage after a
   recorded profile shows the TS backend missing its budget, and it
   must pass the same golden suite (bit-exact for error diffusion;
   documented tolerance for GPU float math).
6. Feature-detect and fall back: the app must run correctly with
   WebGPU and WASM both unavailable.

## Performance

7. No processing on the main thread. Main thread = capture + UI.
8. The benchmark test's budgets (architecture.md) are part of
   `check`. A change that regresses a budget does not merge; either
   fix it or bring a decision-log entry proposing the new budget.
9. Never optimise ahead of the profiler. Adding WebAssembly, shaders,
   SharedArrayBuffer, etc. without a profile is out of scope by
   definition.

## Correctness & data

10. Golden fixtures are protected files: regenerating them requires
    explicit owner approval with a stated reason (algorithm change),
    never to make a failing test pass.
11. Project files are user data: loaders migrate old
    `schemaVersion`s forward and never destroy fields they don't
    understand. Export must round-trip: save → load → save is
    byte-identical.
12. Exports always re-run the pipeline at full quality; preview
    quality settings must be unable to leak into exported output.

## Scope guards

13. MVP scope is brief.md; anything else goes to the wish-list via
    "Park it" — including tempting spec sections (§25 second-stage
    features are the main drift risk).
14. No new runtime dependencies without approval. Current allowlist:
    Carbon web components, pdf-lib. (Dev deps per
    DEV-INFRASTRUCTURE.md.)
15. UXP / Photoshop plugin approaches are rejected (decision-log D2);
    do not reintroduce them.
