# M13-IMPL-03 — Appearance-affecting options (exploration)

## Activation gate

This is conditional exploration, not assumed implementation. Start only if
M13-SYNTH-01 names a measured user problem, an approved candidate, the reference
output, difference metrics and a maintainer review set. If not activated, cut the
ticket and treat that as successful evidence-led restraint.

## Outcome

Prototype each approved appearance-changing trade-off outside production,
quantify its speed/memory benefit and output difference against the TS reference,
and facilitate owner visual acceptance or rejection. Nothing appearance-changing
ships from this exploration ticket.

## Boundaries

Candidate examples sometimes raised by past evidence—canvas resize, approximate
matching, lower-precision LUT/error terms, reduced live-source processing or a
different dither route—are **not approvals**. D47 rejected canvas resize as a
drop-in after mean differences around 39/255 per channel at hard downscale and
changed pixels across virtually the whole image. New evidence may justify a
clearly named temporary draft technique or creative option, but cannot relabel
different pixels as a backend optimisation.

The current product intentionally has one fidelity plus temporary adaptive draft.
Do not revive Exact/Balanced/Responsive, add a persistent mode, change exports or
regenerate golden fixtures unless synthesis explicitly reopens those product
decisions.
Preview-only draft remains visible, automatic and unable to leak into export.

## Experiment design

For each candidate pre-register:

- bottleneck and target workload from a clean M13 profile;
- reference implementation/config and expected order-of-magnitude benefit;
- deterministic prototype location under `tests/audits/candidates/` or another
  scratch-only surface, never imported by `src/`;
- numeric difference measures suited to the change (byte/pixel change, channel or
  Lab difference, tone blocks, palette membership, isolated stitches, alpha/edge
  errors, thread-index changes) and performance boundaries;
- representative frozen images/crops and the owner verdict options.

Use identical inputs, configs and production-build environment. Include gradients,
organic artwork, flat graphics, hard edges/text-like detail, transparency, high
frequency and the maintainer's real work at 200²/300² plus any synthesis-approved
1024 case. M8 learned that the first-64 DMC chunk has severe colour-family bias;
use a documented spread palette for visual quality and keep timing palettes named
separately.

Numeric metrics aid triage but never approve appearance. Present same-scale,
randomised/blinded comparisons where practical, then a labelled comprehension
pass. Record accept, reject with artefact, workload-limited acceptance, or
inconclusive/retest in the maintainer's substance.

## Non-negotiable oracles

The TS reference remains correct and available. Preserve transparency, deterministic
seed/tiles, pattern geometry, thread identity and project data. Quantify any
off-palette/index ambiguity rather than guessing an identity from RGB. A candidate
that alters export needs a separately signed creative contract; until then export
must continue using the current reference-quality project config.

Do not modify protected golden fixtures. If a later signed product decision adopts
a new creative algorithm, fixture/golden policy is a follow-up with owner approval—not
a way to turn this prototype green.

## Likely implementation surface

- `tests/audits/candidates/` and focused audit/gallery generation, modelled on
  M8-SPIKE-01; generated large artefacts remain under `bench-reports/`.
- bv2 workload/report utilities and the shared M13 evidence document.
- No `src/` changes until a candidate has passed quantified and owner review and
  a separate implementation plan is approved.

No runtime dependency, project schema, UI control or backend route is assumed.

## Exit criteria

Every approved candidate has clean before/after performance distributions,
quantified visual/identity differences, representative side-by-side evidence and
an owner verdict. Rejected candidates are recorded and removed from consideration;
accepted ones become explicit implementation tickets/design decisions with
scope, persistence/export semantics and acceptance thresholds. No prototype is
silently promoted to production.

## Fresh-chat starting point

Read the signed M13-SYNTH-01 appearance section, D47, D61 and
`docs/dither-evaluation.md`. Restate the one approved question and timebox before
prototyping. If the synthesis supplies no candidate or visual contract, stop and
cut this ticket.
