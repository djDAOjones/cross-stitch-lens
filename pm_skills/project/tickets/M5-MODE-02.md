# M5-MODE-02 — Implement Balanced processing

## Entry conditions

M5C and M5-MODE-01 must approve Balanced's exact parameter bundle, visual tolerance/oracle,
performance budget, backend parity rule, and default semantics. Do not translate provisional
integer-rounded/separable ideas into code without that record.

## Architecture fit

Balanced is a creative processing mode, not a backend. Resolve the persisted semantic enum to
explicit stage params in pure pipeline configuration; the worker can still choose TS/WASM/GPU
automatically. The TS implementation is ground truth. Balanced must not replace or weaken Exact,
and temporary live draft substitutions stay outside the persisted bundle.

Likely algorithm work spans an approved resize reference and/or dither matching/conversion.
Keep each stage pure, deterministic, typed-array based, allocation-free per pixel, and explicit
about rounding/value ranges. Port to Rust only after TS behaviour and fixtures are frozen.

## Tests and evidence

- Independent Balanced fixtures (new files, not regenerated Exact golden fixtures) for gradients,
  photographs, hard edges, transparency, 64/533 palettes, RGB/Lab, both scan directions.
- TS/Rust bit-exact if the approved algorithm is deterministic; any GPU float tolerance must be
  separately documented. Backend unavailable/failure falls back without semantic change.
- Visual difference against Exact: approved metrics plus representative images and first-error/
  propagation evidence; no claim based only on average pixel error.
- Performance matrix at 200/300/1024 including preparation/boundary/end-to-end. Exported output
  matches an independent Balanced full-quality run.

## Likely files and dependencies

Core mode/algorithm params, `pipeline/config.ts`, dither/resize and possibly colour helpers,
Rust crate/adapter, worker selection only if new backend registration is approved, fixtures and
parity/benchmark tests. Persistence/UI are separate tickets 04/05; use internal config defaults
temporarily without conflating ownership.

## Done evidence

Approved fixture/tolerance and budget pass; Exact suite remains unchanged; feature detection
and TS fallback pass; `npm run check` is green; before/after and representative visual evidence
is recorded for maintainer review.

## Fresh-chat starting point

Read M5C/MODE-01 approvals and completed PERF-11/13/14 evidence. State the precise Balanced
oracle before coding. Implement/freeze TS first, then other backends and parity; do not touch
Exact golden expected files.
