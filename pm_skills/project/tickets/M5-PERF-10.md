# M5-PERF-10 — Audit pipeline construction and ownership

## Question

Which orchestration, cloning, transfer, and retained-buffer costs occur per frame, and
which are required by ownership invariants versus accidental waste? This is a spike;
append evidence and follow-up tickets rather than landing optimisations.

## Present path and leads

`buildStages()` creates fresh stage instances/param objects per request and always adds
the identity `adjust` stage. `adjustStage` clones the complete source before resize,
although it has no operations. `executeRequest()` then wraps the transferred buffer in
a typed-array view and each pure stage allocates output. Dither builds palette RGB/Lab
arrays and a full float work buffer per call. Reduce and LUT construction also flatten
palette data. Split compare invokes `fullRgbVariant()` as a second pipeline.

The main client transfers preview buffers, but capture first reads pixels into a new
`ImageData`; exports require callers to pass a copy because transfer detaches it.
`pipeline-worker.ts` retains `lastFrame` plus processed/source `ImageBitmap`s for compare.
Audit lifetime carefully: eliminating a copy is unsafe if it aliases mutable input or
uses a detached buffer.

## Measurements

- Count and size typed-array allocations/copies for still preview, live preview, compare
  on/off, dither on/off, cache hit/miss, and export at representative dimensions.
- Time config/stage construction, identity adjust, palette flatten/Lab conversion,
  request copy, transfer/return, and bitmap creation outside stage rows.
- Inspect retained buffers after steady live capture and compare toggles; confirm old
  ImageBitmaps close and export promises clear on success/error.
- Measure `?? 0` bounds-safe read patterns only with an isolated representative loop;
  do not weaken strict TypeScript or safety based on intuition.

## Correctness constraints

Stages remain pure and do not mutate or alias their input; pixel data crosses worker
boundaries as transferables; the TS reference remains authoritative. A config-level
identity-stage skip is safer than making an identity stage return its input if callers
rely on non-aliasing. Palette caching needs content-correct invalidation, not object
identity alone, especially before custom palettes.

## Likely files and exit

Trace `pipeline/config.ts`, `adjust.ts`, `palette.ts`, `execute.ts`, `protocol.ts`,
`client.ts`, `pipeline-worker.ts`, `preview-surface.ts`, dither/reduce, capture, and
relevant tests. Exit with a per-path ownership diagram, allocation/copy table, retained
memory evidence, and separate follow-up tickets for each material safe change or bug.

## Fresh-chat starting point

Read `M5-PERF.md` leads and D34–D43. Instrument counts/times without changing semantics.
Rank findings by measured contribution at both 200² and 1024²; do not bundle fixes into
the audit.
