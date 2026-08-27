# BATCH-E0 — the hardening quick eight (run sheet)

Shared run sheet (the D149 exception, as Batch C0 was): eight
standalone fixes from the 2026-08-26 review; this file dies with the
batch. No product decisions inside; the two wording approvals are
marked. Parallel-safe as a worktree round — the items are disjoint
from `src/` state work and from each other; equally fine as one
serial burst. Review source: `_user-guff/2026-08-26-repo-review.md`
(untracked; PMR references below).

## CI-01 — pin the deploy workflow's supply chain (PMR-08)

`lint.yml:68` pipes an unpinned remote wasm-pack installer into `sh`;
actions float on major tags; Node, Rust and the runner float. Pin
actions to full commit SHAs with version comments beside them, fetch
a fixed wasm-pack release asset with checksum verification (mismatch
fatal), pin exact Node/Rust/runner versions, and record the bump
procedure in DEV-INFRASTRUCTURE.
Done when: a cold-cache CI run is green and a wrong-checksum
rehearsal fails the build.

## TEST-01 — UI baselines fail closed (PMR-11)

The baseline test writes missing fixtures and hashes during the run
and passes — bootstrap-if-absent was deliberate (the test header says
so) but cannot detect the loss it guards. Missing oracle → hard fail;
regeneration becomes a separate explicit generator under the
golden-fixture approval rule.
Done when: removing any fixture or hash in a clean copy turns `check`
red, and CI never runs the generator.

## SCAN-01 — zero-warning secret scan (PMR-14)

Four fixture-shaped warnings print on every green run — permanent
noise that trains warning-blindness. Construct the test tokens at
runtime or add narrow path exceptions.
Done when: a clean tree scans silent and a planted test credential
still trips it.

## DEPS-01 — dev-advisory refresh and a stated cadence (PMR-14)

Six dev-chain advisory nodes (brace-expansion, js-yaml, linkify-it,
nanoid, postcss, markdownlint-cli2). Upgrade in small groups, never
`--force`; run `cargo audit` once and record the result; state the
advisory-triage cadence in DEV-INFRASTRUCTURE — the security baseline
requires one and none is stated.
Done when: `npm audit` is clean or each remainder is accepted in
writing, and the cadence line exists.

## WASM-01 — free WASM results explicitly (PMR-17)

The dither adapter never calls the generated `free()`; Rust-owned
vectors wait on GC finalization. Call it in `finally` after copying
results out; regenerate the missing declaration through the build —
`crates/stitch-engine/pkg` is never-edit.
Done when: a fake result proves exactly one `free()` on success and
on getter failure.

## FONT-01 — the palette page drops Google Fonts (PMR-16)

The standalone palette-candidates page is the only surface making a
third-party request. System fonts, or self-host.
Done when: the page renders with no external request.

## UI-NITS-01 — same-file re-selection; editor selection guard

Clear the file input's value after selection so re-choosing the same
image fires `change`; add a generation guard to the profile editor's
async selection (latent — adapters are synchronous today).
Done when: same-file re-selection works in a browser pass and the
guard has a deferred-adapter test.

## README-PROV-01 — the demo README stops overstating (PMR-07)

`public/profile-demo/README.md` labels all six assets owner-supplied
while PUB-02 records `graphic.jpg` as third-party with unresolved
layers. Correct the wording now — the owner approves it; the asset
replacement stays PUB-02's.
Done when: the README says only what is established.
