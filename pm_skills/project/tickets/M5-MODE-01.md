# M5-MODE-01 — Define processing-mode contracts

## Decision purpose

Approve stable user-facing and internal semantics for Exact appearance, Balanced, and
conditionally Responsive. This is a sign-off specification task, not implementation. Modes
express creative/performance intent; backend names remain automatic and dev-only.

## Existing provisional direction

`M5-PERF.md` provisionally maps Exact to the frozen resize/matcher plus quality-neutral
acceleration; Balanced to an approved near-neutral resize and integer-rounded matching;
Responsive to a faster approved matcher/possibly another dither algorithm. Balanced is
provisionally the default, including v1 files, with backwards-appearance compatibility waived.
Responsive exists only if M5C evidence shows Balanced cannot sustain demanding live work.

These are inputs, not final contracts. M5C must supply algorithm evidence, visual thresholds,
and honest budgets. If Responsive is cut, adaptive draft keeps today's dither-off fallback.

## Contract questions to resolve

For each retained mode specify: stable enum/name and plain-language helper text; parameter
bundle (resize, matching, dither semantics); quality promise/oracle; grid/workload budget;
TS/Rust/GPU parity rule and fallback; selected-mode export behaviour; default for new/migrated
projects; unavailable-backend behaviour; status wording; and whether future versions may tune
the bundle without changing the persisted enum.

Prefer semantic stability: if bundle tuning could visibly alter output, either version the
mode contract/project schema or define an explicit tolerance promise. Exact means frozen output,
not “currently slow backend”. Balanced cannot claim “same result” if evidence permits changes.

## Acceptance/review material

Provide representative output comparisons and performance distributions from M5B, plus a
one-page table of promises and non-promises. Review ambiguous terms (“quality”, “responsive”,
“full quality”) and replace them with observable statements. Confirm export uses the selected
creative mode at full execution quality, while adaptive draft is temporary and never persisted.

## Likely downstream surface

The approved contract feeds `PipelineConfig`, mode resolution, TS/Rust algorithms, project
schema/migration, controls/status, draft governor, exports, fixtures, diagnostics, and acceptance.
No code should land in this ticket; record the rationale in decision log and update backlog
dependencies.

## Fresh-chat starting point

Read completed M5A/B evidence, M5C decision, brief §§1/22, requirements §§7/8/20/22, UI-STANDARDS,
and `M5-PERF.md`. Present contract options and ask the maintainer to approve names, promises,
default/migration, Responsive retention, and export meaning.
