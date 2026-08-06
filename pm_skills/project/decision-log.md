# Decision log — Cross Stitch Lens

<!-- Append-only. Newest at the bottom. Don't edit old entries. -->
<!-- Use this during the design phase of each task to record what you chose and why. -->
<!-- Hot sectional. Agents scan the latest 10 HEADINGS by default and
     open only the bodies relevant to the task. -->
<!-- Keep each entry tight: Decision / Rationale / Alternatives, not an essay.
     The live log is budgeted by WORDS as well as entry count (see
     pm_skills/memory-policy.md), so verbose entries trip a prune sooner. -->
<!-- This is the home of the WHY. The backlog/trajectory only point here;
     never paste an entry's prose into those files. -->

## Archived: D1–D10 — see archive/decision-log-2026-07-16.md

## Archived: D11–D45 (2026-07-17 → 2026-07-19) — see archive/decision-log-2026-07-17-to-2026-07-19.md

## D46 — M5B-FIX: four correctness defects closed; the GPU bug had a second half only a real GPU could find (2026-07-20)

**Context:** the M5B audits (D45) filed four defects — two wrong-output
bugs, one latent stall, one silent miss. All four are fixed here.

**Decisions:**

- **WebGPU LUT (M5-PERF-31).** Renamed the reserved WGSL identifier
  (`target` → `probe`), and made shader creation fail loudly: drain
  `getCompilationInfo()` and wrap pipeline creation and the compute pass
  in `pushErrorScope('validation')`, returning `null` so the TS fallback
  takes over. `ensureLut` now sanity-checks any GPU LUT before caching
  it (index in range; not one index for a multi-entry palette) — cheap
  insurance because the failure mode is silent and user-visible.
- **A second defect was hiding behind the first.** With the shader
  compiling for the first time, the real GPU rejected the *bind group*:
  `layout: 'auto'` derives the layout from bindings a shader actually
  **uses**, and the `lab` variant never reads `pal_rgb`. Each metric now
  declares only the palette buffer it reads, with the binding indices in
  one shared constant (`LUT_BINDINGS`) used by both the WGSL emitter and
  the dispatch.
- **LUT cache key (M5-PERF-26).** Keyed on a content fingerprint of the
  entries in order (`paletteFingerprint`, core) plus metric and a schema
  version, replacing `name:length:metric`. Cache is now LRU-bounded at 8.
- **Worker gate (M5-PERF-29).** Routing moved out of the worker entry
  into `src/worker/router.ts` with injected dependencies, so it is
  testable without a Worker. Every `process`/`export` path now posts
  exactly one response; a failed preview bitmap logs and still returns
  the frame, because losing a redraw must not cost the frame.
- **Dirty detection (M5-PERF-30).** The 64×64 downsample destroys small
  edits *before* the hash sees them, so no hash precision fixes it and
  fine-enough sampling costs the readback the skip exists to avoid.
  `DirtyGate` bounds the damage instead: an unchanged-looking source is
  re-processed after `DIRTY_MAX_STALE_MS` (2 s), turning "a small stroke
  never appears" into "it appears within 2 s".

**Why it matters:** the static scans now cover both known GPU classes
without a GPU (reserved words; declared-vs-bound and declared-vs-read
bindings) — but it was **execution on a real GPU that found the second
defect**, exactly as the ticket predicted. Verified in-browser on
Metal-3: GPU LUT 523 distinct indices (was 1) and **0 mismatches across
all 32,768 bins** for both metrics, mapping kernel 0 wrong pixels of
4096, and `ensureLut` now byte-identical to `getLut`. That is well
inside the D41 near-tie tolerance, which is therefore untouched.

**Consequences:** M5B-FIX closes. The real-GPU-in-CI leg of M5-PERF-31
is **not** met — it needs a browser test runner — and is carried forward
as M5-PERF-32 rather than quietly dropped. No golden fixture touched; no
pipeline output changed on a correct configuration.

**Run notes (auto-jazz, all gates skipped):** assumptions — all four
items in one run (shared LUT/worker/capture surface); the browser-runner
promotion was judged out of scope for a correctness fix (new dev-dep +
CI surface), so the GPU-free scans landed instead; 2 s chosen for the
forced refresh (≈3% of one core idle at 200²) without the in-browser
threshold measurement the ticket asked for, because the averaging loss
is analytic, not empirical. Each fix was verified failing before the fix.

## D47 — M5C: processing modes cut; budgets bind to measured reality (2026-07-20)

**Context:** M5C had to choose resize strategy, mode semantics, default
mode, visual thresholds, budget binding, and honest Exact expectations.
The owner's provisional decisions (Q3: budgets bind to Balanced; Q4:
Balanced is the default everywhere) were explicitly subject to
validation against the completed evidence.

**Decision — cut Balanced and Responsive.** Ship one fidelity plus the
existing adaptive draft governor.

**Why:** Balanced had no content left. Its two intended ingredients both
died on M5B evidence — rounded conversion is worth ~0% in situ on the
hoisted TS path while changing **49–53% of output pixels**, and
separable resize is *slower* near 1:1. The only remaining ingredient is
canvas resize, whose output differs from the oracle by mean **39/255 per
channel on 100% of pixels**. For a product whose entire spatial
reduction *is* the resize, that is wrong output, not a controlled
trade-off. Meanwhile the three bit-exact wins give 4.1× on dither and
1.5× on resize with **zero** appearance change, and the brief's actual
bar — ≥ 4 preview updates/sec at ≤ 300² — is already met with margin
(11.6–17.4/sec measured pre-wins). Modes would have cost a 3× parity
matrix, per-mode fixtures, a project-file enum plus migration, a UI
control and a visual sign-off gate, to express a distinction the
evidence could not justify.

**Consequences:**

- **No visual thresholds are needed anywhere in M5** — every approved
  change is bit-exact, so the golden fixtures are untouched.
- **The v1 back-compat waiver is withdrawn.** With no mode enum, v1
  project files render exactly as before; the Q4 appearance-change
  acceptance is moot.
- **M5E is cut** (M5-MODE-01…06, ticket files deleted). M5-ACCEPT-02
  narrows to a single-fidelity confidence review.
- **Budgets change shape**: one product promise (≥ 4 updates/sec at
  ≤ 300², in-browser) plus per-stage measured baselines with regression
  guards, each naming its runtime and workload ID. The aspirational
  table had missed every row except preview-render since it was written,
  and a permanently-red budget trains everyone to ignore it. The 5 ms
  resize and 15 ms dither rows are revised, not met. **M5-ACCEPT-04
  alone edits the protected table.**
- Escalation if the ceiling grid proves unusable at ACCEPT-03: canvas
  resize joins the **draft ladder** (temporary, automatic, visibly
  named, never exported), not a user-facing mode.
- 1024² is stated plainly as an export/finishing grid, not a
  live-editing grid (~1.6/sec pre-wins, ~2.5/sec projected).

**New evidence taken at the gate:** the GPU LUT rows in the evidence
base were measured against a kernel that never ran (D46), so they were
re-taken on the fixed kernel: LUT build 59× (64 colours) and 655× (533)
versus TS on the same runtime, per-pixel map 6.7× at 1024²/64. This
makes WebGPU a real contender for the reduce row — but the dev-server TS
figures run 10–16× slower than node (vs ~3.5× for resize), so they are
flagged as understated and M5-PERF-23 must re-measure on a production
build before wiring `mapPaletteGpu`.

**Housekeeping:** the M5-PERF ticket shipped, so its file was moved to
`docs/performance-evidence.md` rather than deleted — the item closed but
its measured evidence is still load-bearing for M5D/M5F. Superseded
sections (pre-M5B leads, design options, scope sketch) were dropped.

**Run notes (auto-jazz):** the mode question was put to the maintainer
because the item is `[sign-off]` and its acceptance is literally
"approved"; everything else ran gateless. `npm run audit` also caught a
stale M5B audit asserting the M5-PERF-26 collision still reproduces —
inverted to prove it cannot recur. `audit` is AUDIT=1-gated and not part
of `check`, which is why the D46 close missed it.

## D48 — M5D: the wins are real, the attributions were not (2026-07-20)

**Context:** M5D was execution — land M5B's bit-exact wins, cut its
inventoried allocations, re-derive routing, encode D47's budget shape.

**Decision — land all eight items; correct M5B's causal attribution
twice; decline `mapPaletteGpu` on its own gate.**

**Why the attributions changed.** Both audits now measure against
verbatim pre-M5D implementations, because M5-PERF-21/22 landed into the
code the audits used as oracle — timing the shipped stage against itself
reports ~1.0× and proves nothing. The totals then reproduced M5B exactly
(resize 37.2 ms vs its 37.4; dither 858 ms vs its 821–888). The causes
did not:

- **Resize:** M5B credited ~1.5× to hoisted coverage. Actually inlining
  the per-cell `sampleArea` call (1.45×); the hoist is 1.05×.
- **Dither:** M5B credited ~4× to hoisting the Lab scan reads. The hoist
  is worth **0.96–1.11× — nothing**. The large term is inlining the
  `deltaE76Sq(labScratch, 0, …)` call, made 64–533× per pixel and not
  inlined by V8 (2.85–4.31×). Pruning is the real algorithmic win (1.2×
  at 64 colours, 3.38× at 533).

Same error twice: a candidate changing two things, credited to the
interesting one. **Both M5B "algorithmic" wins were call-boundary costs
in a per-pixel loop.** Treat TS micro-optimisation leads as
call-boundary-first, and change one thing per measurement. The audits
keep the pre-M5D baselines, so the decomposition now guards itself.

**Exactness.** Every shipped change is byte-identical to pre-M5D output.
Pruning is an exclusion proof, verified over 138,688 adversarial values
× 5 palettes with 0 mismatches; Rust parity is asserted against the
**pruned** TS path, since that is what ships.

**Routing (M5-PERF-27).** Decided by **metric**, not a grid × palette
threshold: lab → ts (1.79–3.34×; TS prunes, Rust does not), rgb → wasm
(1.46–1.88×; neither prunes). Across 96²–1024² × 64/533 the metric
decided all sixteen, so no size cutoff is applied — inventing one the
evidence does not show is worse than none. D42's calibration is
**removed, not retuned**: routing holds no state, which was D42's actual
failure mode.

**`mapPaletteGpu` declined (M5-PERF-23).** D47 required a
production-build re-measurement and was right to: 6.7× was almost all
dev-server slowdown on the TS side. Production: **~1.4×**
(0.98/1.62/1.45) on a 17 ms stage — ~5 ms/frame, non-dithered path only.
Price is the executor's asyncification, which D46 hardened so every
request answers exactly once. Declined.

**Alternatives rejected:** porting pruning to Rust (routing never
selects that path); a grid/palette threshold (unsupported); keeping D42
alongside routing (two mechanisms, one known wrong).

**Consequences:**

- Per-frame allocation at 1024²: ~26.5 MB → ~8 MB.
- Split compare runs one pipeline per frame, not two; divider drag runs
  none.
- Budgets are measured baselines naming runtime, workload and build,
  with a regression guard (×1.35) and a staleness guard (fires when a
  row runs >2× faster than recorded, so it cannot go slack). The product
  promise stays out of the node suite — it is an in-browser boundary and
  a node proxy would be green-washing.
- `bench.html`: new production-build browser harness; satisfied
  M5-PERF-32 (real GPU, 0 mismatches over 32,768 bins × 3 configs, plus
  an all-zeros trap for the D46 failure mode).
- architecture.md's budget table stays unreconciled — **M5-ACCEPT-04
  alone edits it** (D47) — so this adds a doc-delta instead.

**Run notes (auto-jazz):** gateless throughout; no blocking ambiguity.
Two process corrections. (1) Piping `npm run check` through `tail` made
the harness record *tail's* exit code — two "green" runs were
unverified; the pre-commit hook caught what they missed. (2) The browser
harness first reported 200² six times *slower* than 300², because it was
measured first and absorbed the pipeline's JIT cost; unexamined that
would have shipped as a product-promise failure.

## D49 — M5-ACCEPT-01: the matrix found an engine defect on its first run (2026-07-20)

**Context:** M5F's automated gate. The per-stage suites are strong — 52
files, every stage against its own contract — but nothing exercised the
*composed* pipeline across axes a user reaches together, which is
precisely what M5-ACCEPT-01 exists to do. The ticket predates D47 and
still described processing modes, per-mode fixtures and tolerances; with
modes cut, the matrix reduces to one fidelity and every row is exact.

**Decision — build the matrix, and fix what it found rather than
document it as green.**

### The defect: empty cells were dithering

Fully transparent cells were quantised as if they were opaque black and
**diffused that error into the real stitches beside them**. Resize
writes literal `RGBA(0,0,0,0)` for every grid cell the source does not
cover, so any `contain`/`fit` letterbox band was a strip of phantom
black feeding error into the artwork it framed.

It hid because the obvious test palette contains black: matching
(0,0,0) to black gives **zero** error, so nothing propagates and the
bug is invisible. It needs a palette with no near-black to appear — and
then it is severe, not subtle. Measured: 220-grey against a 200/255
palette, `contain` into a square grid, dithered to **solid 200 across
the entire visible area** — mean level 20 below the source and no
dithering at all, versus a correct 200/255 mix in isolation.

Fixed in both backends (`alpha === 0` takes no part in the scan) with
the TS and Rust rules mirrored line-for-line. Deliberately `=== 0` and
not the D9 `< 128` fabric threshold: alpha 0 provably carries no
colour, whereas a semi-transparent cell has a real one and whether it
should participate is a creative question — parked on the wish-list.
Bit-exact for all-opaque content, so **no golden fixture changed**.

### The characterisation: `reduce-first` is not a stitchable mode

The matrix's palette-membership invariant failed on all five
`reduce-first` rows. Not a defect: that preset maps to threads at source
resolution and only then resizes, and the resize **area-averages**,
blending threads into colours no thread has. Measured at 32²/64: **1006
of 1024 cells off-palette, 955 distinct colours, 4 carrying a thread
reference** — against 14/14 for `resize-first`.

So the §7 order comparison shows what that order *costs*; it is not an
alternative way to produce a design. The invariant is now scoped to
`resize-first` and the reason is **asserted rather than waived** — if
`reduce-first` ever produced palette-membered output, that test fails
and the exemption gets revisited. Worth surfacing at M5-ACCEPT-02:
choosing that preset yields a chart whose colours are mostly not
threads.

### Two MVP invariants were never actually asserted

- **Export isolation** ("preview quality must be unable to leak into
  exported output", an AGENTS.md hard rule) lived only in
  `runtime.audit.test.ts`, which is `AUDIT=1`-gated and therefore **not
  run by `check`**. Nothing stopped a regression reaching main. Promoted
  into the gate against the real executor, including the case that
  matters: a router warmed with draft-quality frames still exports
  byte-identically to a cold one.
- **"A saved project reopens with identical output"** — the brief's
  third success criterion — was nowhere. Byte-identical JSON round-trip
  proves the *file* survives, not that it still means the same picture:
  a dropped field or a parse-time default would round-trip perfectly and
  reopen as different artwork. Now walked end to end (config → file →
  text → parse → config → pixels) across four creative configurations,
  with a control asserting those four differ from each other.

**Matrix shape.** Mirrors the bench matrix idiom (derived IDs, mandatory
core cross-product plus targeted expansions, each row carrying a
`proves` line) but separate from it: the bench matrix is frozen for
measurement and its sources are perf-scale. Pairwise-plus-risk, not
Cartesian — the full product is 28,672 rows to re-prove what the
per-stage suites already hold. 31 rows, 218 assertions, 1.9 s in
`check`; the 1024² ceiling row is `MATRIX_FULL=1` (11.3 s).

**The coverage table is generated, and its staleness is a gate.**
`docs/acceptance-matrix.md` is rendered from the same rows the suite
runs, and the suite fails if the committed copy drifts. `check` never
writes it — `npm run matrix:write` does — so the gate stays
non-mutating. A row that cannot say what it proves cannot pad the
matrix.

**Consequences:**

- `check` is green: 41 files, 540 tests. Rust crate step **skipped
  locally** (no toolchain on this machine) — the crate change and its
  new unit test are verified by CI, and this is recorded as an explicit
  skip in the matrix doc rather than implied as covered.
- The local `crates/stitch-engine/pkg/` is now stale against the crate
  source, and without a toolchain it cannot be rebuilt here. Parked.
- M5-ACCEPT-02 gains a question it did not have: whether `reduce-first`
  should remain user-reachable given what its output is.

**Run notes (auto-jazz):** gateless. One judgement worth naming — on
finding the dither defect the choice was to ticket it or fix it. Fixed,
because M5-ACCEPT-01's own invariant list requires alpha to hold, and
shipping a matrix that documents a broken invariant as green is the
green-washing the project forbids. The maintainer-owned items
(ACCEPT-02/03) were not attempted: they are human gates by definition.

## D50 — The diagnostics affordance was specified three times and never built (2026-07-20)

**Context:** M5F's remaining items are all human gates. Preparing them —
which both maintainer tickets explicitly assign to the chat — meant
answering "how does the rehearsal record its evidence?". It could not.

**The gap.** `recentLogs()` in `src/diagnostics/log.ts` carried the
comment *"the (future) copy-diagnostics affordance reads"* and had **no
callers anywhere in the tree**. Meanwhile the affordance was specified
as present in three protected documents: an AGENTS.md hard rule
("Self-explaining runtime"), a full UI-STANDARDS section governing its
placement and behaviour, and DEV-INFRASTRUCTURE's bundle contract
listing its exact contents. Three documents described a control that did
not exist, and the dead export was the only trace.

**Decision — build it, as the prerequisite for M5-ACCEPT-03.**

**Shape.** `src/diagnostics/bundle.ts` is pure: every environment fact
is passed in rather than read from `window` here. That is what makes the
redaction rules — the part that must never be wrong — testable in node
without a DOM.

**Redaction is fail-closed, and that is the whole design.** The rule is
not "strip what we recognise as secret" but "emit only what we can
positively recognise as safe". Known-safe primitives inside depth,
string-length and entry caps; secret-shaped **keys** withheld by name;
secret-shaped **values** withheld by shape under any key (JWTs, prefixed
keys, long hex/base64 runs) because the dangerous case is a credential
logged under an innocent name; and anything else — a class instance, a
function, a value past the depth cap — **dropped rather than serialised
hopefully**. A class instance is dropped specifically because its
getters may have side effects or fields we cannot reason about.

The eagerness is deliberate and was confirmed by a test failure: a
1000-character string was redacted rather than truncated because it
matched the base64 pattern. That is the correct trade — a false positive
costs one field in a debug bundle, a false negative leaks a key into
someone else's chat log.

**UI deviation, recorded rather than silently taken.** UI-STANDARDS says
*Carbon icon button with a tooltip*, and also that the visible label and
accessible name must match — which a bare icon cannot satisfy. Every
other control in this app is a text button, so this is one too, with
`title` and text identical. Verified live: 159 × 44 px, keyboard
reachable, `role="status"` announcing what was copied **and that it is
redacted**, so the maintainer knows before pasting it somewhere public.
Captured as a doc-delta.

**Verified in the browser, not assumed.** Drove the real button in the
dev server with a seeded secret-shaped log record: status announced
correctly, no raw secret in the payload, `[redacted]` present, build id
resolving to the real commit, capabilities detected, and
`activeBackends` populating from a real frame as `{resize: ts, dither:
ts}` — the Lab routing D48 specifies. Screenshots came back blank in
this environment; the functional read-back is stronger evidence anyway
and is what was recorded.

**Also shipped: the two gate packs** the maintainer tickets ask the chat
to prepare — `docs/acceptance-visual-review.md` and
`docs/acceptance-live-rehearsal.md`. Both are grounded in real
thresholds (the draft governor's 200/100 ms and 2/5-frame hysteresis,
`DIRTY_MAX_STALE_MS`, the ≥ 4 updates/sec promise, 1024² as an
export grid per D47) rather than restating the tickets. The visual pack
carries the two things that actually changed since M4 — the D49
empty-cell fix, visible at letterboxed edges — and the open
`reduce-first` question, so the review has a decision to return rather
than only an impression.

**Consequences:**

- M5-ACCEPT-03 can now record its evidence with one paste instead of
  hand-transcribing build and environment facts.
- The affordance is **dev-only**. Production exposure needs the explicit
  opt-in and redaction review DEV-INFRASTRUCTURE requires; not done, not
  claimed.
- `check` green: 42 files, 560 tests. Rust step skipped locally as ever.

**Run notes (auto-jazz):** gateless. The scope judgement worth naming:
"auto-jazz M5F" had no agent-closable item left, so the batch became
*unblock the human gates* rather than either manufacturing work or
stopping. Building the affordance is not in the backlog — it is a
hard-rule gap that the rehearsal depends on, which is why it was treated
as in scope rather than parked.

## D51 — M5F closed on maintainer acceptance; roadmap restructured M6–M12 (2026-07-20)

**Context:** the maintainer ran the M5F gates and stated the M5 items
are tested and accepted. Separately, the maintainer supplied a
comprehensive product-direction prompt expanding the parked Icebox
themes into roadmap work.

**Decision 1 — close M5F.** All four acceptance items
(M5-ACCEPT-02..05) were human gates; the maintainer's acceptance is the
evidence they were waiting for. Recorded as sign-off, not fabricated
measurements — the gate packs (`docs/acceptance-visual-review.md`,
`docs/acceptance-live-rehearsal.md`) remain the record of what was
judged. Ticket files deleted per lifecycle.

**Decision 2 — roadmap shape.** Milestones M6–M12 added, ordered
companion layout → palette strategy → dithering → charting/export →
cosmetics/estimates. M6 first because the narrow-window Photoshop
workflow is the core product promise; M7 rides the M5 palette evidence
(LUT cache key fixed D46; GPU LUT build 59–655× faster than TS, D47);
M8 rides the M5 search structures with algorithms landing as choices,
not fidelity tiers (D47). Only M6–M8 carry full task breakdowns —
M9–M12 are terse stubs expanded when they become Next — keeping the
Active section inside its 1,500-word/40-item budget while the
maintainer's ticket-detail pass and agent runs work milestone by
milestone.

**Decision 3 — Icebox.** Tauri packaging stays uncommitted as a
feasibility spike (ICE-TAURI-01); a new automated Photoshop companion
workspace item (ICE-WORKSPACE-01, with detail ticket) records the
browser-vs-desktop capability split — browser gets a companion window
at best, OS-level Photoshop window control needs packaging. Wish-list
lines promoted into M6–M12 were drained.

**Consequences:** decision-log live entries now exceed the 20-entry
budget (41 live) — an archive split per `memory-policy.md` should be
proposed at next maintenance; not auto-pruned here.

## D52 — M6 companion layout: four resolutions named, capture aspect locked (2026-07-21)

**Context:** M6 makes the app usable in a tall narrow window beside
Photoshop. The recurring failure it guards against is conceptual, not
visual — "resolution" and "scale" meant four different things across
`config.grid`, `CropRect`, `ViewState`, and `exportState`, and nothing
stopped a future change wiring the wrong two together.

**Decision 1 — four named quantities, independence by reference.**
`src/ui/scales.ts` owns pattern (stitches) / capture (source px) /
preview (CSS px per stitch) / export (output px per stitch); every
field name carries its unit and there is no universal `scale` type.
The `with*` updaters share the three untouched slices *by reference*,
so the 4×4 matrix test asserts identity, not deep equality — a helper
that rebuilt an equal-but-new slice would pass `toEqual` and be the
start of exactly the coupling this exists to prevent. Preview scale is
persisted in CSS px, never device px, so a Retina project reopens the
same size on a 1× display.

**Decision 2 — the capture aspect lock is unconditional.** Every crop
mutation (new session, draw, eight handles, keyboard, source resize,
pattern change) ends in `constrainRect`. The anchor never moves — a
drag past the source edge shrinks the region rather than sliding the
whole selection — and the dragged axis leads, so an edge handle widens
instead of refusing to. Sizes snap to a whole multiple of the reduced
pattern ratio where one fits, making the ratio *exact* rather than
within a pixel; `contain` letterboxes any residue into a visibly empty
row at small region sizes, which is what made "within a pixel"
insufficient. `stitchSpan` was deleted: under the lock its answer is
always the pattern itself.

**Decision 3 — "Fit" is reset view.** The ticket asked for fit-to-space
and a reset view; its own conservative definition of reset *is*
fit-to-space, so shipping both would be two names for one behaviour.
One "Fit" button, plus fit-width and fit-height. "Actual size" stays
unbuilt — 1:1 is ambiguous between CSS px, device px, and physical
fabric size until the owner says which.

**Decision 4 — one shell-state model for two hiding features.** Panel
collapse and preview focus compose through a single `visibility()`
function rather than two layers of `hidden`. Focus mode wins while on
but never overwrites the panel's state, so leaving it restores a
deliberately collapsed panel. Panel state persists in localStorage as a
*shell preference*, not project data — a shared project must not make a
collaborator's controls vanish; preview focus is session-only.

**Decision 5 — preview-first DOM, panel on the right.** Rather than
reorder with CSS `order` (which desynchronises focus order from visual
order), the preview comes first in the DOM at every width and the
settings panel sits to its right above 60 rem. Reading, visual, and tab
order agree at all widths — verified at 320/360/480/800/1000.

**Consequences:** project schema v2 (`preview` block, forward migration
from v1). Three layout bugs were found only by measuring in a real
browser, not by reading CSS: `'center'.includes('e')` silently made
every reframe a north-east anchor; `margin: 0 auto` on `main`
suppressed cross-axis stretch so preview focus made the preview
*smaller*; and `height: 100dvh` without `border-box` clipped focus
mode's only status line under the fold.

## D53 — M6-WIN-01 spike: browser window placement is not worth shipping (2026-07-21)

**Question:** what companion-window workflow can ship in the browser,
and what needs packaging?

**Measured** (Chromium 148 in the Claude in-app browser, macOS,
DPR 2): `window.resizeTo()` on a window the script did not create is
**ignored without error** — no exception, no change, exactly the
"ignored without error" outcome the ticket named as a first-class
result. The `window-management` permission returned `denied`;
`getScreenDetails` exists but is unusable without it, and
`screen.isExtended` was false. `window.open` was blocked even from a
**trusted** user gesture. `outerWidth/Height` disagreed with
`innerWidth/Height` under viewport emulation — which is precisely why
any preset must *measure* the result and report partial failure rather
than trust a return value.

**Not measured:** stable Safari, Chrome, and Firefox on the
maintainer's own macOS setup. An Electron-embedded Chromium result is
not evidence about those, and the popup leg in particular is
browser- and user-setting-dependent.

**Decision — option (A), size guidance only.** Park browser window
placement. The reasoning is that M6-NARROW-01/PANEL-01/FOCUS-01 already
deliver the actual goal: measured at 320–480 CSS px the preview takes
93–95 % of the width with no page-level horizontal scrolling, so the
maintainer resizes the window once by hand and the app fits. Against
that, a companion window buys little and costs a lot — it introduces
cross-window ownership of the Worker, the capture stream, project
state, downloads, and diagnostics, and it cannot preselect Photoshop as
the captured surface, because `getDisplayMedia` requires the user to
choose one every time. The friction that remains is the one window
placement does not touch.

**Consequences:** no production code. ICE-WORKSPACE-01 carries the
finding: browser placement is parked, and the OS-level arrangement it
describes needs ICE-TAURI-01 first. Reopening this needs the
real-browser rehearsal matrix, which is a maintainer task.

## D54 — M6 closed on maintainer acceptance (2026-07-21)

**Verdict:** accepted. The maintainer signed off M6-ACCEPT-01 — the
legs only a human at a real machine can judge: Photoshop side by side
at a realistic narrow width with live capture running, the
aspect-locked crop driven by pointer and keyboard on a Retina display
and against a window resized mid-session, and the ≥ 4 updates/sec
promise under that load.

**Why it is recorded rather than assumed:** M6's agent-side work
shipped 2026-07-21 (D52/D53) but the milestone's acceptance line is a
human gate by construction — the failure modes it guards (a crop that
fights the pointer at DPR 2, a layout that only breaks once Photoshop
is actually beside it) are not reachable from an automated check. The
acceptance is the evidence; nothing about the shipped code changed.

**Consequences:** M6 leaves the backlog; v0.5.0 stands as the shipped
companion-layout release. M7 (palette & colour strategy) becomes
Current.

## D55 — M7: identity is the thread, not the colour (2026-07-21)

**Context:** M7 turns one hard-coded DMC palette into brands,
inventory, saved palettes, presets, colour counts and per-thread rules.
Every one of those is a way of *narrowing* which threads a conversion
may use, and the failure mode they share is narrowing silently.

**Decision 1 — identity is `brandId:reference`; RGB is a display
value.** `PaletteEntry` is gone; a palette is an ordered set of
`Thread`s carrying id, brand, reference, name, provenance and status.
Nothing merges two threads because their colours match. The data makes
this load-bearing rather than theoretical: 3,338 threads render as only
2,830 distinct colours, so RGB de-duplication would delete ~500 real,
separately-buyable threads.

**Decision 2 — a palette-index sidecar, not a reverse lookup.** Once
two brands can hold the same colour, "which thread is this stitch?" has
no answer in the pixels. `PixelBuffer.indices` is set by the stages that
map to a palette and travels the worker boundary as a transferable;
`EMPTY_INDEX` (0xffff) marks fabric so a black first entry is not
reported as stitches. The Rust crate was extended to return it too —
deriving it JS-side from the output RGB would have been exactly the
guess this exists to remove. A stage that invalidates it (resize after
reduce, under `reduce-first`) simply omits it, and stats fall back to
counting colours with no reference rather than inventing one.

**Decision 3 — four restrictions, composed in one place, never
collapsed.** `palette-policy.ts` holds brands (the universe), source
(a strict palette or preset within it), `ownedOnly` (the inventory
overlay) and lock/prefer/exclude. Collapsing any two is how "brand
enabled" quietly starts meaning "brand preferred". The colour-count
limit is deliberately *outside* it, in `palette-selection.ts`, because
it depends on the image — and it is applied **last**, so it selects
from the permitted set and can never widen one.

**Decision 4 — nothing throws; every failure is an explained
conflict.** No brand enabled, an empty inventory under "owned only", a
strict preset that resolved nothing, a lock outside the permitted set:
all are `PaletteConflict` values with a severity and a full sentence
naming the way out. These are states a person reaches by clicking two
checkboxes, and an exception thrown from inside a pixel pipeline is not
a UI. The UI keeps the three per-thread rules disjoint, so the
"locked and excluded" contradiction the resolver reports can only come
from a hand-edited file, never from clicking.

**Decision 5 — selection chooses against the source, never its own
output.** Count-limited selection is constrained quantisation over the
catalogue, seeded from a weighted Lab distribution of the design. The
first implementation fed it the pipeline's *reduced* output, which the
browser check caught: narrowing to 12 colours then asking for 30
returned 16, because the distribution only held the 12 already chosen.
The buffer is now the resized full-RGB twin, fetched once per source or
geometry change through the export route. Under live capture it is
deliberately not refreshed per frame — a palette rebuilt every frame
would make the preview churn.

**Decision 6 — presets ship algorithmic and say so.** Four LCh rules
(Neutrals, Pastels, Earth tones, Deep shades), each carrying its rule
as user-facing copy. A preset named "Pastels" promises taste, and taste
is the owner's to sign off; inventing a curated membership list and
presenting it as authoritative would be the agent putting words in the
product's mouth. The resolver already supports curated presets — a
curated preset is just a rule returning a fixed set.

**Decision 7 — projects store intent *and* the resolved snapshot.**
Schema v3's palette block holds the policy (what was asked for) and the
exact ordered threads that rendered (what happened). Policy alone would
let a catalogue release change a saved design; snapshot alone would
lose the intent. On reopen the snapshot wins and library drift is
reported, never repaired by name.

**Consequences:** project schema v3 with a v2 forward migration;
`PREFERENCE_DISCOUNT = 0.9` is a named product constant whose effect is
reported back as `preferredUsed`; 96 new tests. Deferred to the
acceptance gate: palette reordering UI, bulk inventory operations, and
curated preset membership.

## D56 — The thread data was superseded mid-milestone (2026-07-21)

**Context:** partway through M7 the maintainer replaced the owner data.
`dmc-anchor-map.csv` (a DMC→Anchor cross-reference, 533 DMC rows) is
superseded by `thread_list.csv` — 3,338 threads across eight brands
(Cosmo, DMC, CXC, Sullivans, Anchor, Ariadna, Madeira, Finca), each
carrying that brand's own colours. A second file, `thread_map.csv`,
proposes a cross-reference schema but contains **no data rows**.

**Why the architecture absorbed it:** D55's identity model was designed
for a case that was then an edge (Anchor colours mapped from DMC) and is
now the norm. Nothing in the policy, selection, or sidecar work changed.

**Decision 1 — one generator, CSV in, JSON out.** The source of truth
stays CSV: the owner edits it, it diffs in git, it needs no tooling.
`build-palette.mjs` now emits only `catalogue.json`; `dmc.json` had no
remaining reader and was deleted. Determinism is unchanged (brands
alphabetically by id, threads in source order within a brand).

**Decision 2 — references are normalised, brands are not merged.**
Anchor, CXC and Sullivans repeat their brand name inside the code
column ("Anchor 403"); the brand is already its own field, so the
prefix is stripped — otherwise every label reads "Anchor Anchor 403".
All eight brands are `provenance: "measured"`; the `mapped` variant
stays in the model for the cross-reference data when it lands.

**Decision 3 — nearest-equivalent ships computed, layered under
curated.** With measured colours per brand this is already answerable
from the existing Lab maths, so it ships now — but every result is
labelled, because a computed match is a suggestion and a published
conversion is not. The gap is real and measurable: DMC 310 is recorded
as `#0c0c0c` and Anchor 403 as `#000000`, so the correct answer still
carries ΔE 3.3. That is the argument for curated data, recorded as a
test.

**Recommendation on the map format (not yet acted on):**
`thread_map.csv`'s wide shape — a name/id column pair per brand — makes
every new brand a schema change and already carries ~400 blank rows.
A long form (`group_id,brand,code`, one row per thread per equivalence
group) adds rows instead of columns. Backlogged as M7-BRAND-03.

**Consequences:** the old CSV is retained as owner data but no longer
read; the protected-doc data tables were corrected in-flight because
the docs gate blocks on a path that no longer exists (doc-delta filed);
owner CSVs are excluded from the EditorConfig check, since their BOM
and CRLF are the exporter's, not this repo's, and the generator
normalises both at read time.

## D57 — M7 accepted; the remainder triaged by what blocks it (2026-07-21)

**Verdict:** accepted. The maintainer signed off M7-ACCEPT-01 on the
shipped workflow — brands, inventory, saved palettes, presets, colour
counts, and lock/prefer/exclude.

**The triage question:** three items were still open under M7. Rather
than carry them as one undifferentiated queue, they were sorted by
*what actually blocks each one*, which turned out to split them cleanly.

**Kept ahead of M8 — M7-LIB-01 (renamed from M7-PAL-02).** Every piece
of it is a **missing operation on a shipped feature**, not a new
capability: a user can create library palettes but has no route to
reorder or delete one, and can only build an inventory a checkbox at a
time. Reordering is the sharpest case — D46 makes palette order
identity-significant, so the app documents an edit it provides no way
to perform. Renamed because the work spans the inventory as well as
palettes, so the `PAL` prefix was wrong.

**Moved to the Icebox — ICE-XREF-01 (was M7-BRAND-03).** Blocked twice over: the
curated cross-reference data does not exist (`thread-map-proposed.csv`
is a header with zero rows), *and* nothing in the UI surfaces
equivalents, so even complete data would have no consumer.
ICE-EXPLORER-01 is its natural first one. The engine half already
shipped and is tested, so reactivation is data plus a generator.

**Moved to the Icebox — ICE-PRESET-01 (new).** D55 deferred curated preset
membership to owner review but never gave it a backlog home, which is
how deferred work quietly becomes forgotten work. It is blocked on
taste, not code: the resolver already treats a curated preset as a rule
returning a fixed set.

**Why the split matters:** all three would have read as "M7 leftovers"
in one list, and a next-batch pick would have had to re-derive each
time that two of them cannot be started at all. Sorting by blocker leaves
exactly one item in Active that can be started today, and states the
reactivation condition on the other two.

**Consequences:** M7 closes with one open item; M8 (dithering
expansion) is the next milestone, entered through its spike. The
memory budgets tripped at the M7 ship (trajectory over 2,000 words,
decision log at 46 entries against 20) remain open and are now the
oldest outstanding housekeeping.

## D58 — M7-LIB-01: the library's missing verbs (2026-07-21)

**Context:** M7 shipped a thread library you could add to but not
change. Palettes could be created, never reordered or removed; the
inventory could only be built one checkbox at a time across 3,338
threads. Reordering was the sharpest gap — D46 makes palette order the
nearest-match tie-break, so the app documented an edit it gave no way
to perform.

**Decision 1 — buttons, not drag.** Reordering is move-up/move-down
buttons per entry. A native button is keyboard-operable by
construction; a drag gesture needs a parallel key handler bolted on to
meet the same rule (UI-STANDARDS → "Operable"). Measured 46 × 44 and
92 × 44 CSS px, over the 44 px AAA floor, with `aria-label`s naming the
thread rather than "Move up".

**Decision 2 — bulk acts on the filter, and says how many.** The thread
table renders at most 60 rows, so a bulk action reading the rendered
list would silently do less than its label claims. `filteredThreads`
returns the uncapped match set and the buttons carry the count in their
own label — "Mark 480 shown as owned" — which is error *prevention*
rather than a confirmation after the fact. A no-op button disables
itself and says why ("All shown already owned").

**Decision 3 — confirm only the subtractive direction.** Marking
threads owned is additive and reversible by its own inverse; marking
them not-owned destroys a record the user built by hand. Only the
latter confirms. Symmetric confirmation would have trained the user to
dismiss the dialog that matters.

**Decision 4 — delete gets undo instead of a modal.** UI-STANDARDS
allows confirmation *or* reliable undo. Undo is the better half here
because deletion cannot damage a saved project at all — projects carry
their own palette snapshot (D55) — so the only loss is the reusable
record, and a session-scoped restore returns it exactly, revision
intact. Deleting the palette the policy points at falls back to the
enabled-brand set rather than leaving a dangling reference.

**Decision 5 — the editor is a collapsed disclosure, capped at 60.**
Rendering 489 entries added ~10,600 px to a settings panel already
14,700 px long, and every reorder rebuilds the list. Collapsed by
default, with the palette name and thread count in the summary so the
contents are identifiable without opening. The cap matches the thread
list; past it a note points at the colour-count control, which is the
actual way to get a palette worth reordering by hand.

**A measurement I got wrong:** the first timings suggested a reorder
cost ~2.6 s and I nearly redesigned around it. The figure was my own
polling `sleep`, not the work. Measured properly with a
`MutationObserver`, click-to-repaint is **8 ms**. The cap survives on
the worst-case argument (an eight-brand palette would rebuild ~17,000
elements per click), not on the number that prompted it — recorded
because the wrong figure is now in the git history of this file.

**Consequences:** M7 closes entirely; M8 (dithering expansion) becomes
Current. The memory budgets flagged at the M7 ship are still open and
are now the only outstanding housekeeping.

## D59 — Pruned project memory (2026-07-21)

**Decision:** Archived D11–D45 (2026-07-17 → 2026-07-19, 35 entries,
verbatim) to `archive/decision-log-2026-07-17-to-2026-07-19.md`, and the
six oldest trajectory phases M0–M5 (2026-07-17 → 2026-07-20, verbatim) to
`archive/trajectory/trajectory-0001-2026-07-17-to-2026-07-20.md`. Live
decision-log 48 → 13 entries plus this record (D46–D59); trajectory
3,455 → 985 words (8 → 2 phases, M6–M7 kept). Both live files now under
budget.
**Trigger:** decision-log over the 20-entry budget and trajectory over
the 2,000-word budget (Prune verb, user-requested).
**Not touched:** AGENTS.md (4,223 w, over the 3,500 soft guideline) left
as-is — reference docs are not prune targets. `doc-deltas.md` (17 open,
over the 10 threshold) noted for a Doc-sync pass, not archived. New
archive files are catalogued in `archive/INDEX.md`, not `file-map.md`
(the generator excludes `pm_skills/`).

## D60 — Doc-sync: four protected docs reconciled; requirements.md declared frozen (2026-07-21)

**Decision:** Reconciled the doc-deltas ledger (17 open) in one
sign-off-gated pass. Applied, per maintainer approval:
`architecture.md` (budget table replaced with the measured-baseline
model — product promise ≥ 4 updates/sec at ≤ 300² in-browser, rows
naming runtime/workload/build with regression + staleness guards,
canonical numbers in `docs/measurement-contract.md`; metric-based
backend routing replacing "automatic (profiled)"; the conditional
`adjust` stage note; the dither `alpha === 0` contract),
`DEV-INFRASTRUCTURE.md` (stale pre-M0 comments removed, `check`
composition corrected to its seven steps, `matrix`/`matrix:write` +
staleness gate added, `PORT`/`autoPort` parallel-session note),
`AGENTS.md` (stale `PaletteEntry` entity replaced by `Thread`,
thread-identity terminology contract added beside the four
resolutions, conditional-`adjust` note), and `UI-STANDARDS.md`
(diagnostics control is a text-labelled button, not icon-only, per
D50; new conflict/explanation pattern — `aria-live` list, severity as
a word, disjoint lock/prefer/exclude). Delta #15 (protected-data
tables, D56) needed no edit — the in-flight factual update was
verified current and this pass is its sign-off. 15 deltas ticked.
**Cut, with a policy:** the two `docs/requirements.md` deltas
(M6-VIEW-01, M6-CAPRES-01). `requirements.md` is the original combined
spec, explicitly "reference only": shipped behaviour belongs to
`architecture.md` / `AGENTS.md` / `DEV-INFRASTRUCTURE.md` (Document
ownership), where these facts already live. **requirements.md is
frozen reference** — do not capture future implementation drift
against it.

## D61 — M8-SPIKE-01: six dither methods earn a slot; matrix size, phase and seed do not (2026-07-22)

**Question:** which dither methods are materially different and useful
for cross-stitch output, and which controls does each genuinely need?

**Method:** a scratch harness in `tests/audits/` (the M5B candidates
pattern, `AUDIT=1`-gated): nine candidates — FS/Atkinson/JJN/Stucki/
Sierra Lite through one kernel-as-data loop asserted byte-identical to
the shipped stage for the FS kernel, Bayer 4×4/8×8, a generated
32×32 void-and-cluster blue-noise tile (seed `0x5eed`), and no-dither —
over seven 300² fixtures, scored on tone ΔE (4×4 box average), isolated-
stitch %, L\* bias, distinctness vs FS, and node timing. Full evidence:
`docs/dither-evaluation.md`, the published audit artefact, and an HTML
side-by-side gallery for the owner's eye.

**Decision — commit none, floyd-steinberg, atkinson, jarvis, ordered
(Bayer 8×8) and blue-noise (32×32); cut Stucki, Sierra Lite and
Bayer 4×4.** Diffusion owns tone fidelity on smooth content (organic
tone ΔE 1.45–2.67 vs none 8.05); Atkinson buys a third of FS's isolated
stitches for a small tone cost; Jarvis is the only large kernel that is
not FS-within-noise (Stucki and Sierra Lite are, and are cut).
Threshold methods leave flat and near-palette content untouched where
diffusion peppers it (flat-art isolation 2.3% vs 18.5%) — the graphic-
content answer; blue-noise halves ordered's isolated stitches with no
periodic texture. Bayer 4 vs 8 is indistinguishable at stitch scale, so
one ordered method ships and **matrix size gets no control**.

**Control surface:** algorithm selector; **strength** everywhere but
none, with per-family definitions (diffusion: fraction of error
diffused 0–1 — at 0.5 it *improves* tiny-palette tone; threshold:
0–2 × a ±48/255 base amplitude — tiny palettes need > 1); **serpentine**
diffusion-only. No phase, no seed — nothing stochastic ships.

**Performance:** every candidate is within ~10–20% of the no-dither
reduce loop (the palette scan dominates); no accelerated backend is
justified by this evidence. Ordered/blue-noise are pointwise and
WebGPU-shaped if a profile ever asks.

**Run notes (auto-jazz):** spike mode, gateless; the committed set is
the conservative numeric pick, explicitly reviewable at the M8-ACCEPT-01
visual session, whose failure routing may reopen this decision. First
run used the bench `palette64()` (first-64 chunk) and drowned quality
in −16 L\* palette-coverage bias; quality rows were re-taken on a
64-thread spread palette — worth remembering for any future perceptual
comparison.

## D62 — M8 shipped: the dither union, FS-only wasm guard, and the flat-kernel lesson (2026-07-22)

**Context:** implementing the D61 set (M8-ALG-01/M8-CTRL-01 plus the
automated half of M8-ACCEPT-01) in one auto-jazz run.

**Decision 1 — dithering is a discriminated union, schema v4.**
`PipelineConfig.dither: boolean` (+ top-level `serpentine`) became
`DitherConfig`: `none` carries nothing, diffusion carries
`serpentine` + `strength` (0–1, fraction of error), threshold carries
`strength` alone (0–2 × a ±48/255 base amplitude). Invalid
combinations cannot be expressed rather than runtime-guessed. The
v3→v4 migration maps `true` to Floyd–Steinberg/full-strength/stored
scan direction — old projects render byte-identically (asserted); the
dropped `serpentine` of a `dither:false` file had no observable effect.
Stage params keep optional `algorithm`/`strength` with FS/1 defaults so
every pre-M8 caller keeps its exact meaning.

**Decision 2 — a backend may never substitute a different method.** The
Rust crate implements exactly FS at strength 1, so `routeDither` routes
everything else to `ts` unconditionally, and the wasm adapter
defensively delegates to the TS reference when params say otherwise —
a stale manual override cannot silently swap algorithms.

**Decision 3 — the readable kernel table needs a hot-loop shape.** The
first generic diffusion loop iterated `readonly [dx, dy, w][]` tuples
per pixel and cost **2.3×** the unrolled pre-M8 FS on the 1024² budget
row (`npm run bench` caught it). Flattening each kernel once into
parallel typed arrays (mirrored dx pair for serpentine) restored the
budget with the kernel-as-data source of truth intact. Lesson: in the
per-pixel loop, tuple destructuring is an allocation-adjacent cost V8
does not forgive; the benchmark gate is what made this visible before
merge.

**Decision 4 — presets are evidence-bearing data.** Each of the seven
presets (None/Subtle/Balanced/Strong/Photograph/Graphic/Very limited
palette) carries a `basis` line quoting its D61 evidence; the UI model
is pure (`src/ui/dither-model.ts`), presets resolve by structural
equality so any edit lands the selector on a disabled "Custom" option,
and per-method last-settings memory is deliberately session-only — the
project file stores exactly one canonical configuration.

**Deferred to the owner:** the visual acceptance session
(M8-ACCEPT-01, maintainer) and the golden-fixture decision
(M8-GOLD-01, `tests/golden/**` is protected); ordinary deterministic
fixtures prove the implementations meanwhile. The frozen bench matrix
was **not** extended with algorithm rows — budgets stay bound to the
FS rows, and the D61 audit artefact carries the per-method timings
(all within ~10–20% of no-dither; a matrix extension would need a
boundary-version bump).

## D63 — Roadmap refactor: M13 visual-processing performance; M8 maintainer gates deferred (2026-07-22)

**Decision:** the backlog's single active milestone is now **M13 —
Visual processing performance**: thirteen tasks in five dependency-ordered
phases (measurement refresh → component profiling → a `[sign-off]`
synthesis → conditional evidence-approved implementation → integrated
automated + maintainer acceptance). No ticket files were created — the
owner will generate each performance ticket pack independently, so no
new task carries `[detail]` yet.

**Deferrals — explicitly not passed, cut, completed or shipped:** the
two open M8 maintainer gates, **M8-ACCEPT-01** (visual-quality
acceptance session) and **M8-GOLD-01** (golden-fixture decision), were
**intentionally deferred** to the Icebox with IDs, wording, dates, flags
and the M8-ACCEPT-01 ticket file preserved. The M9–M12 milestone stubs
moved from "Next milestones" (section removed) to the Icebox verbatim,
ticket files intact. Nothing moved to the trajectory (nothing shipped);
existing ICE-* items are unchanged.

**Rationale:** re-measurement precedes optimisation — the M5 evidence
is historical input (its attributions were overturned once already,
D48), M8 added four dither methods the frozen bench matrix and budget
rows never covered (D62), there is no 300² budget row despite the
product promise binding there, and the browser-only boundaries
(`preview-update`, `interaction`, `export`) are still manual-only. The
synthesis gate (M13-SYNTH-01) keeps implementation conditional on
evidence rather than encoding speculative speedups as acceptance
criteria.

**Alternatives:** running the M8 gates first (rejected by the owner for
now — deferred, not abandoned); splitting the five phases into separate
milestones (rejected: one milestone keeps the dependency chain and the
single synthesis/evidence doc in one place). Wish-list overlap noted and
left in place by owner decision: the browser test-runner idea
(M13-MEAS-02 territory), the manual `?backend=` override (M13-PROF-03),
and the 1024-cap revisit (M13-SYNTH-01).

## D64 — M13-MEAS-01: bv2 — the bench contract now tells the truth about M8 and the palette (2026-07-22)

**Decision — bump the node bench to boundary version bv2.** The six
marks are unchanged; the workload meaning changed, which is the same
comparability break. bv1 and bv2 reports must not be diffed.

- **Dither axis = the engine's `DitherConfig` union.** bv1's Boolean
  froze before M8, so every `dither` row silently meant FS/serpentine/
  strength 1 and the four M8 methods had no coverage. The ID token is
  now `nodither | <method>-s<pct>[-serp|-raster]` — percent-granular so
  the dot-separated grammar survives; two executable configs can never
  share an ID. A mandatory method block covers each M8 method at 300²
  and 1024²; targeted rows cover half strength, raster scan and
  threshold strength 1.5.
- **`p533` → `p489`.** `loadDmcPalette()` returns the catalogue's 489
  DMC threads; the old ID named a count that never existed. The
  large-palette stress is the full eight-brand union (3,338 threads) as
  `pfull` — **preparation rows only** (`prep.pfull.lab`): a per-frame
  pipeline row over the whole catalogue measures no product path.
- **Preparation coverage extended.** Cold candidate-table builds
  (27 / 180 / 3,296 ms at p64 / p489 / pfull — the pfull figure is the
  standout, M13-PROF-02's territory), threshold-tile first use (Bayer
  0.02 ms, blue-noise generation 12.1 ms), pfull LUT 206 ms.
- **Run validity.** Every run is assessed — wall-vs-monotonic clock
  drift (sleep/suspension), samples over 120 s, stall-shaped outliers —
  and a tainted run fails loudly with findings; samples are never
  deleted. This is the e703ed4 lesson (a ~5.8 M ms sample of unknown
  cause) made mechanical.
- **Re-baseline: ten budget rows** at `v0.5.0+20260722.33d021b`, node
  24.5, M1 Max. Headline finding: FS dither 1024²/p64 is 231.9 →
  296.7 ms (**+28 %**, inside the ×1.35 guard) — D62's flat-kernel fix
  restored *tolerance*, not parity. Recorded, not rebased away;
  decomposing the cause is M13-PROF-01's job. New guards: the 300²
  pipeline row (37.0 ms — a node component baseline, never a proxy for
  the in-browser promise) and per-method 1024² dither rows (290–338 ms,
  all TS; no method is an outlier vs FS).

**Run notes (auto-jazz):** gateless; the audits' bv1 workload IDs were
mechanically renamed so they still resolve; their pre-existing stale
post-M8 assertions were parked on the wish-list, not fixed here.

## D65 — M13-MEAS-02: the browser harness measures the shipped route, and shared bv2 types moved into src (2026-07-22)

**Decision — the bv2 vocabulary lives in `src/bench/`.** The harness
must emit real bv2 rows, production code must not import test modules,
and two drifting copies of the schema is the worse failure — so the
pure modules (`boundaries`, `report`, `harness`, `workloads`) moved
from `tests/bench/` to `src/bench/`; node-only `env-node`/`run-node`
stay in tests. Only the bench entries import them, so the app bundle is
unchanged.

**Decision — boundaries are measured where they happen.** The worker
now stamps additive absolute-clock `FrameMarks` (received / compute /
bitmap / preview-draw-return) on each `ProcessResult` — Window and
Worker have different `timeOrigin`s, so marks travel as
`timeOrigin + now()`. `PipelineClient` gains an optional job observer
(job actually posted / settled). `preview-update` = post → draw-return,
per the contract; main-thread receipt is a separate diagnostic phase.
Marks are attached only when the draw happened — a failed snapshot must
not report a preview it never made — and the D46 answer-exactly-once
invariant is untouched.

**Decision — `interaction` gets a controlled start mark.** A Photoshop
edit has no programmatic timestamp, so repeatable interaction rows use
a same-origin `bench-source.html` window that repaints on
BroadcastChannel command and replies with its own double-rAF paint
timestamp; the owner shares it in the capture picker. Real-Photoshop
interaction stays manual (M13-PROF-04/M13-ACCEPT-02). Capture-input
rows use a `capture.g<grid>.…` pseudo-ID — a matrix ID would lie about
the input.

**Also:** a pure `CounterTracker` ledger (interval deltas +
conservation checks, gate-tested) for the pump/dirty/coalescing
counters; `startFramePump` passes rvfc metadata through untouched;
`npm run bench:browser` is the documented run command. **Remaining
leg:** the maintainer's browser run itself — `getDisplayMedia` needs
the owner's gesture, so the item stays open at "code complete,
evidence pending".

## D66 — M13-PROF-01/02 node halves: the match is the cost, selection is the sleeper (2026-07-22)

**Decision — publish the node halves now, hold the browser halves.**
Both audits (`npm run audit` → `m13-stage`, `m13-prep`) publish ranked,
artefact-backed node evidence and record the browser questions as
explicit gaps: per-stage node↔browser ratios, GPU LUT end-to-end and
selection-source/live-preview contention all need the M13-MEAS-02
harness run, which requires the owner's capture gesture. Nothing
node-side is extrapolated to the browser (M5 measured resize ~3.5× vs
dither ~1.1× — there is no single multiplier).

**Stage findings (node):** dither dominates every ranked cell, and the
per-stitch exact match is ~92% of it (pruned scan 27.8 ms of a 30.3 ms
FS stage at 300²/p64; conversion ~10.5 ms of that; kernel propagation
~1 ms). The five methods sit within ±14% of each other everywhere —
the shared match, not any method, is the only meaningful target.
Pruning is worth 3.0× at p489 and near-nothing at p64 (consistent with
D48). Resize follows the source (28.1 ms from 1280², 13.9 ms from a
grid-sized 1024² input).

**Preparation findings (node):** below the candidate table, the
count-limited selection path is the sleeper — 121 ms to resolve
"30 from all eight brands" (116 ms in `selectThreads`) vs 0.65 ms
without a count. Candidate tables stay the dominant cold cost (30.7 /
549.9 / 1,325.6 ms at p64/p489/pfull), but the p489 figure disagrees
with the bench cold row by ~2.7× — recorded as measurement
sensitivity, both artefacts carry it. Cache behaviour is now proven by
counters (`lutCacheStats`, additive diagnostics in
`src/worker/lut-cache.ts`): content keying and reorder-rebuilds behave
as designed; **the candidate cap of 2 rebuilds on any 3-palette
cycle**.

**Scope note:** engine untouched beyond the additive cache counters
(explicitly in the ticket's surface). Both items stay `[~]` until the
browser halves land.

## D67 — M13-MEAS-02 shipped: the harness earns its evidence over three runs (2026-07-23)

**Decision:** accept the run-3 report
(`bench-reports/browser-bench-v0.5.0_20260723.8adb5d2-run3.json`) as
the MEAS-02 evidence, with its first live row discarded. The report is
formally tainted by a "page hidden during the live window" finding,
but the taint is fully attributed to that discarded row
(`page visible: false`, three zero intervals) and the same report
carries a clean retake (119 samples, counters conserving). The taint
system flagging exactly the window that went wrong is the contract
working. A pristine re-run stays cheap if the maintainer wants an
artefact with no caveat.

**What three runs taught:** Run 1 shared the harness's own window
(capture width = viewport × DPR) because the run doc said "any
surface" — and the harness published 30 s of zeros as a clean measured
row. Fixes: the `zeroFrameReason` verdict (zero-callback window →
`not-measured` + tainting finding, never 0 updates/sec), a
wrong-surface width warning at capture start, button 6 driving the
source at 4 changes/sec (it repaints only on command), and the doc
naming the button-4 source window. Run 2 landed the live leg but froze
at interaction change 3: the span timeout nulled the shared settle
waiter on a null check, so a stale 5 s timer from a fast change stole
the active change's waiter, which could then never resolve — fixed
with an identity-guarded waiter token, reachable only once spans
settle fast (why run 1 never hit it). Run 3 completed all three
boundaries.

**Headline numbers (M1 Max, production build, worker route):** still
preview-update 21.1/37.3 ms at 200²/300²; live capture 30.3 ms median
at a driven 4 changes/sec (pipeline keeps pace, zero drops/skips);
interaction 53.7 ms median source-paint → preview-draw (7/8, one
counted miss); GPU LUT agreement EXACT ×3; reduce 1024²/p64 ts 5.0 ms
vs webgpu map 5.3 ms end-to-end — near parity, so PROF-03's question
now has production data. Caveat: runs 2–3 measured the fixed harness
from a dirty tree still stamped 8adb5d2; the close commit lands the
code the reports measured.

**Unblocks:** M13-PROF-03/04/05; the browser halves of PROF-01/02.

## D68 — M13-PROF-01/02 browser halves: ratios are stage-specific both ways, and a hidden page is not a measurement surface (2026-07-23)

**Decision:** publish the browser halves from an unattended foreground
Chrome run and close both PROF items. The harness gained three
gestureless legs — a worker-route stage matrix over 18 shared bv2
workload IDs (the executor's own `StageTiming[]`, so browser stage rows
pair with node rows by ID + label), timed GPU-vs-TS LUT builds, and a
selection-source contention probe — plus an `?auto=<legs>&post=<url>`
mode so an agent can run the gestureless half in a real browser window
it cannot script. Evidence: `docs/performance-evidence.md` → "M13
profiling, browser halves";
`bench-reports/browser-bench-v0.5.0_20260723.170dcba-auto.json`.

**Findings:** dither browser ≈ node (1.00–1.11 across all five methods,
grids, palettes); resize 1.12–1.28× (the M5-era 3.5× is superseded on a
production build); reduce ~2.3× **faster** in browser — so node medians
must be translated per stage, in both directions. GPU LUT build is a
clear wired-in win (3.6/2.4 ms vs TS 8.3/39.7 ms at p64/p489,
dispatch-bound, EXACT ×5). `mapPaletteGpu` loses end-to-end here
(8.0 vs 5.4 ms) — M5-PERF-23 stands. The selection-source export blocks
overlapping frames by ≤ one export (~51 ms) with zero drops/errors —
bounded, no race, no wedge; the capture-path confirmation moves to
M13-PROF-04's live leg.

**The lesson:** the first attempt ran in the in-app preview pane, which
always reports `hidden`; the whole renderer — worker included — was
CPU-throttled to 10–20× inflated samples. Discarded. The auto mode and
a doc warning encode it; the env row's visibility field makes a
background run self-incriminating.

**Auto-jazz assumptions:** scope = browser halves via harness extension
(no engine changes — additive bench entry only); design = executor
timings over page-context stage calls; contention measured worker-side
under a synthetic 250 ms still pump, caveat named in the row labels.
Same dirty-tree caveat as D67: the report is stamped `170dcba`, this
close commit lands the measured harness code.

## D69 — M13-PROF-03: every routing rule confirmed end-to-end; a request-level force makes both sides measurable (2026-07-23)

**Decision:** publish the backend comparison and close M13-PROF-03. The
worker gained a **harness-only per-stage backend force** riding on the
request (`force`, `src/worker/protocol.ts`) — top of the executor's
precedence, TS fallback when the forced backend is unregistered,
deliberately not on `PipelineConfig` so it can never reach a project
file. The harness gained a `backend` auto leg: cold-init rows, the
12-cell forced TS↔WASM Floyd–Steinberg matrix through the shipped
worker route (interleaved, byte-equality oracle on pixels **and**
indices per cell), the TS-vs-`mapPaletteGpu` sweep, the export-boundary
comparison, and fallback probes. Evidence:
`docs/performance-evidence.md` → "M13 backend end-to-end comparison";
`bench-reports/browser-bench-v0.5.0_20260723.0042e73-backend.json`.

**Findings:** all three routing rules **confirmed, no crossover in
range** — `lab → ts` (TS wins 1.33–2.88×, margin grows with palette:
pruning is Lab-only and Rust's `libm` transcendentals are software),
`rgb → wasm` (wasm wins 2.0–2.8× and holds 2.39× at the full export
boundary), `mapPaletteGpu` stays unwired (TS wins every cell including
the 1024² ceiling, and the kernel still emits no indices sidecar —
unroutable under D55 regardless of speed). Categorical metric routing
needs no size threshold: the metric decided all 12 cells. Counter-
proven: caching the wasm adapter's per-call palette flatten
(0.0/0.1 ms at p64/p489). Every fallback probe answered exactly once
(D46); GPU device loss recovers with an EXACT rebuilt LUT. One defect
filed: **M13-DEF-01** — `StageTiming.backend` reports `wasm` while the
adapter's non-FS delegation guard actually ran the TS reference
(reachable only via override/force).

**Auto-jazz assumptions:** scope = harness + force channel only (the
surface the ticket names), no adapter or routing edits;
`timestamp-query` GPU pass time deferred — requesting the feature
means editing shipped `device.ts`, which the ticket forbids, and CPU
wall time settles the wiring question; off-matrix rgb cells published
under grammar-derived IDs (contract note added to
`docs/measurement-contract.md`). Same dirty-tree caveat as D67/D68:
the report is stamped `0042e73`; this close commit lands the force
channel and leg it measured.

## D70 — M13-PROF-04 gestureless half: the dirty gate is size-blind, not contrast-blind (2026-07-23)

**Decision:** publish the gestureless live-path rows, land the
owner-session instrumentation, and hold the live half for the owner's
capture gesture — the rehearsal sheet
(`docs/browser-measurement.md` → "The M13-PROF-04 owner session") is
that session's script. PROF-04 stays `[~]`. Evidence:
`docs/performance-evidence.md` → "M13 live-path gestureless rows";
`bench-reports/browser-bench-v0.5.0_20260723.c68e2c3-livepath.json`.

**Findings:** detection probability is a function of **edit size
alone** — ≤ 2 px invisible at any contrast (1 px full-contrast 0/20),
the knee between 16 px (55–70%) and 32 px (100%) at a realistic
Retina crop. The 64² averaging destroys the signal before the hash
sees it, so the 2 s forced refresh is the user-visible latency for
small strokes — the owner session should *feel* that number, not
discover it. Per-tick sample cost sits below the 0.1 ms timer floor;
`computeStats` adds 2.0 ms per displayed 300² frame on the main
thread. Instrumentation added to the live legs: dirty/grab medians,
long tasks, timestamped draft transitions, track
`frameRate`/`displaySurface`, a 200² window (6b), and one mid-stream
selection export with overlap analysis (the D68 carry-in).

**Auto-jazz assumptions:** the replay mirrors the sampler's canvas
ops (the shipped `sampleVideo` is video-only) with the shipped hash —
caveat on every row; no `main.ts` instrumentation (the DevTools trace
owns the app-side DOM half); no policy tuning (the ticket forbids it).
Dirty-tree caveat as D67–D69: report stamped `c68e2c3`, this commit
lands the leg that produced it.

## D71 — M13-PROF-05 gestureless half: the capture copies dominate, exports starve the main thread, not the worker (2026-07-23)

**Decision:** publish the census, isolation re-proof, contention and
peak rows; hold the snapshot-pair and GC-pause reads for the same
owner session PROF-04 already needs (rehearsal sheet Parts C/D).
PROF-05 stays `[~]`. Evidence: `docs/performance-evidence.md` → "M13
memory, GC and export contention";
`bench-reports/browser-bench-v0.5.0_20260723.5494a8d-mem.json`.

**Findings:** the census puts **~93% of per-frame churn at 300² in two
crop-sized main-thread buffers** (grab `ImageData` + pre-submit copy,
≥ 11.9 MB per accepted frame, ~180 MB/s at 15 updates/sec) — the top
reuse candidates, ranked; worker outputs matter only at the 1024²
ceiling. Export isolation is EXACT everywhere (idle / pump / draft /
rapid ×2). Artefact exports never displaced the worker measurably and
never dropped a frame; the 527 ms PDF export instead **blocks the
main thread** (~0.5 s preview freeze, zero worker queue) — encode and
assembly, not pipeline, are the contention. Peaks: chart cell 10 at
1024² backs ~430 MB twice over; clean ×16 at the exact 16,384 px edge
succeeds (2.18 s, ~2.1 GB transient). Two defects/questions:
**M13-DEF-02** (chart past the canvas edge dies on a silently zeroed
`OffscreenCanvas` with no clamp or user-facing message, reproduced
twice) and the **post-export ~75 MiB that 5 s of idle does not
reclaim** (lazy GC vs retention — the snapshot pair decides; a first
probe without the idle tail was discarded for conflating the two).

**Auto-jazz assumptions:** heap readings are Chrome's JS-heap number,
labelled as such; node `arrayBuffers` corroboration skipped (the
census is dimension arithmetic, the browser run corroborates end to
end); worker-side GPU-loss export unreachable from the page (D46
suites own it); no pooling or scheduling changes (ticket forbids).
Dirty-tree caveat as D67–D70: report stamped `5494a8d`, this commit
lands the leg.

## D72 — M13-DEF-01/02: labels only name code that ran; exports refuse before the canvas can lie (2026-07-23)

**Decision:** fix both profiling-filed defects as quick tasks.
**DEF-01** — the crate's capability fact now lives once, in
`wasmDitherImplements` (`backend-select.ts`); routing consults it and
the executor clamps a forced or recorded `wasm` through it before the
timing label is stamped, so `StageTiming.backend` can only name code
that actually ran. The adapter's internal delegation (M8-ALG-01)
stays as unreachable defence in depth. Regression tests cover both
reachable routes (harness force, recorded selection); the harness
probe now treats a `wasm` label there as a regression finding.
**DEF-02** — the app UI already clamped (`maxCellPx`, `maxScaleFor`),
so the fix is the module boundary: `oversizeMessage` (`png.ts`) gives
both encoders a user-facing refusal thrown **before** any canvas
exists — which is also what makes the guard node-testable (the
browser's own failure mode is a silently zeroed canvas and "size of
OffscreenCanvas is zero"). The chart refusal names the largest cell
that fits. Regression tests reproduce the 1024²/cell-16 case.

**Auto-jazz assumptions:** both items were unblocked one-line defects
(quick-task path, not evidence-gated by SYNTH); no behaviour change
reachable from today's UI — the clamp corner was force/override-only
and the refusal corner was module-direct-call-only.

## D73 — M14 UI/UX excellence: novice-first milestone, gates deferred to one end review (2026-07-23)

**Decision:** created milestone M14 — and, on the owner's direction
later the same session, made it **Current**, moving M13's remainder
to Next — a UI/UX excellence pass optimising the default surface for
first-time users while keeping full control depth deliberately
placed. Twelve tasks in
four phases (audit → spec → implementation → verification), every one
agent-executable without maintainer sign-off, per the owner's
directive (2026-07-23 session). Design judgement is deferred, not
removed: each substantive decision is recorded (decision log +
`docs/ui-evidence.md`) and judged once at M14-ACCEPT-01, the only
[maintainer] item.

**Constraints encoded in the milestone preamble:** UI-only — engine,
worker and export outputs stay byte-identical (reference exports
captured at audit, hash-matched at verify); no new runtime
dependencies (Carbon implemented in project code, per UI-STANDARDS);
presentation/disclosure state in the preferences store, never the
project file; no project-file schema change. `UI-STANDARDS.md` binds
throughout (Carbon productive, WCAG 2.2 AAA, Nielsen as hard rules,
the 14-item design review gate).

**Why now:** the shell still wears its M1 dev styling by design
(`index.html` says so itself); `src/ui/styles/tokens.css` — promised
by both UI-STANDARDS and DEV-INFRASTRUCTURE — does not exist; controls
are Carbon-informed but not Carbon-complete; there is no first-run
guidance. The accessibility bones (44 px targets, 7:1 contrast, focus
rings, reduced motion) are already in place, so this is a completion
pass, not a rescue.

**Alternatives rejected:** folding UX work item-by-item into the
feature milestones (M9–M12) — the novice-first restructure is
cross-cutting and would be relitigated per milestone. **Sequencing:**
M14 was first slotted as Next, then promoted to Current at the
owner's direction: M13's remaining halves are owner-session-gated
(PROF-04/05 rehearsals → the [sign-off] synthesis) while M14 is
machine-executable, so agent capacity goes to M14 meanwhile; M13's
banked evidence (D64–D72) stands. The don't-disturb concern is
carried by the UI-only invariant plus a re-capture rule — if M13
implementation ships mid-M14, M14's reference exports are
re-captured.

**Link:** backlog → "Current — M14"; tickets `M14-*.md`; wish-list UX
overlaps deliberately left parked (rename, adjustments panel, preview
modes, processing-order editor — feature work, not this milestone);
the FIT_MARGIN tick-label clip stays wish-listed but is folded into
the audit's known findings.

## D74 — M14-AUDIT-01: a completion pass confirmed — 22 findings, none blocking; byte-identity gets a tripwire (2026-07-23)

**Decision:** the standards audit (`docs/ui-audit.md`) records 22
ranked findings — 8 major, 11 minor, 3 polish, no blockers — from a
full surface × state walk (a11y-tree reads, programmatic target-size
and contrast sweeps, real-control state driving, synthetic
`canvas.captureStream` route for capture states). D73's "completion
pass, not a rescue" framing held: contrast is uniformly 18.1:1/16.45:1,
focus and live-region bones are in place. The majors cluster where the
milestone already aims: 68 sub-target checkboxes and 60 identical
"Own" accessible names in the thread list, two selector gaps in the
44 px rule, the 16-screen default surface at 320 px, an
opens-to-nothing disclosure, native prompt/confirm dialogs, a
machine-token capture label, and silent keyboard crop moves.

**Baseline design (the byte-identity spine):** a vitest tripwire
(`tests/ui-baseline/baseline.test.ts`, runs inside `check`) pins
SHA-256 of the seeded fixture PNG, the reference-pipeline output
(pixels + indices, TS forced), and the serialized default project
file; browser-side export captures are committed under
`tests/ui-baseline/exports/` with hashes in the audit doc. The browser
clean PNG's decoded pixels hash-match the Node pin exactly, welding
the UI route to the reference. Rules recorded: PDFs compare after
normalising pdf-lib's creation dates; the saved project compares
field-wise (`preview.cssPxPerStitch` is viewport-derived); a pin
mismatch during M14 is a defect, never a fixture refresh.

**Assumptions at skipped gates:** scope = ticket as written, read-only
plus sanctioned baseline artefacts; before/after pack = the audit
doc's state recipes + hashes (no committed screenshot binaries).
Incidental: `architecture.md`'s "currently v3" corrected to v4
(observed `schemaVersion: 4` in the saved project).

**Link:** `docs/ui-audit.md`; `tests/ui-baseline/`; backlog M14 →
SPEC-01/02 unblocked.

## D75 — M14-AUDIT-02: the depth numbers name the redesign — 1-drop conversion, 13-screen exports, silent loss on close (2026-07-23)

**Decision:** the journey walk (`docs/ui-journeys.md`) records the
five as-is journeys with step counts and a complete control-tier
inventory. The mechanics are strong where they exist: 1 drop → 1.3 s →
converted preview with honest statuses; live capture reaches a
pre-drawn aspect-locked region in one in-app click; palette
refinement's summary/conflict honesty holds under every degenerate
state driven. The failures are placement and guidance, quantified:
Dither/Export/Project sit at ~10.1k/10.7k/11.6k px on an 11.8k px
default page (the 60-row thread list inflates the panel ~8k px; ~130
tab stops for a keyboard user); the four resolutions span three
surfaces at three depths; capture starts with an unexplained OS prompt;
the first preview is thread-mapped to DMC without the user choosing
threads.

**Confirmed dead end:** no autosave exists in src/ (the architecture
stack line is aspiration) — close/reload silently discards everything;
a novice who never found Save (13+ screens deep) loses the session.
M14-scope remedy is placement + honest copy (SPEC-01/IMPL-04);
building autosave is new behaviour, outside the UI-only milestone —
left to a future backlog decision.

**Method:** cleared origin (localStorage + IndexedDB) before the first
walk; journey 2 crossed the un-scriptable OS picker via a
`canvas.captureStream` substitute at the `getDisplayMedia` boundary,
disclosed inline; real-route step counts include the picker decisions.

**Assumptions at skipped gates:** scope = ticket as written; tier
judgements are first-pass (E/C/D/dev), explicitly SPEC-01's to decide.

**Link:** `docs/ui-journeys.md`; audit findings cross-refs `A#` →
`docs/ui-audit.md` (D74). Phase 1 complete — SPEC-01/02 unblocked.

## D76 — M14 tier scheme: three tiers with a measurable reach contract (2026-07-23)

**Decision:** every control gets a tier with a hard reach ceiling from
the default populated state — E visible/≤1 interaction, C ≤2 (one
section open), D ≤3 (section + one inline disclosure), dev unchanged —
with disclosure state in the preferences store only (`ui-spec.md` §1).
Collapsed regions leave the tab order, which is what converts J3's
~130 tab stops and 10–12k px depths (D75) into bounded numbers
VERIFY-02 re-measures. One recorded exception: the three export
buttons are E-tier actions at reach 2 (exporting is never a session's
first act; the section summary keeps them findable). **Alternative
rejected:** a modal "advanced settings" surface — hides depth behind a
context switch and breaks the live-preview editing loop (§5.4
immediate application).

## D77 — M14 regrouping: seven flat groups become five stateful sections (2026-07-23)

**Decision:** Pattern+Colour essentials → **Design** (open by
default); Grid+Dither → **Appearance**; Export and Project keep their
names as sections; Pipeline → **Advanced** (renamed control, D79);
the thread list, rules, inventory and library actions move behind one
"Thread library & rules" disclosure inside Design (`ui-spec.md` §2/§5).
Rationale per change: Pattern and Colour are the two decisions that
define a design (J1's "what next"); Grid and Dither are both
appearance of the same preview; the thread list is the measured cause
of the depth pathology (D75) and only renders when opened; Export
buttons lead their section (A22). Collapsed headers carry derived
state summaries (recognition over recall; status-line precedent —
derived from owned state, never scraped). Version/build line moves to
the Project foot (A13). **Alternatives rejected:** Save duplicated in
the shell bar (two homes for one action breaks consistency); a
single-open accordion (punishes cross-section work during live
editing).

## D78 — M14 first-run: two equal entries, a generated sample, and unsaved-work honesty (2026-07-23)

**Decision:** the empty state becomes a Carbon-pattern entry point —
"Choose an image" and "Capture your screen" as equal primary buttons,
"Try a sample" secondary (deterministic in-code buffer through the
normal import path; no asset, no dependency, not the test fixture),
drop/paste named in one line, and a capture-expectation sentence
("Your browser will ask which window or screen to share") answering
J2's unexplained prompt. After first conversion the source section
compacts to one row. The no-autosave dead end (D75) is answered in
scope by honesty, not feature: "Nothing is kept unless you save your
project." in the Project section; autosave itself stays a future
backlog decision. Crop readout gains position and becomes a polite
status at drag-end/key-release (A8).

## D79 — M14 terminology: user words on default surfaces, craft terms kept, truth preserved (2026-07-23)

**Decision:** the map in `ui-spec.md` §4 binds IMPL-05: implementation
words leave default surfaces ("Order preset" → "Processing order" with
an honest trade-off helper; "Full RGB" → "Unlimited colours (no
threads)"; "Every permitted thread" → "No limit"); craft terms of art
stay (dither method names — evidence-bearing per D62; "Serpentine"
with a plain helper); D72's truthful-label rule is untouched (backend
names surface only in dev). Copy fixes ride the map: "shown" →
"matching" (A10), the transient count sentence names the rebuild not a
missing image (A11), capture labels pass an allow-list human-shape
test (A7), placeholders that duplicate labels are dropped (A20).
UK English; sentence case; visible label = accessible name throughout.

## D80 — M14-SPEC-02 token architecture: one CSS file is the truth, and the gate reads it (2026-07-23)

**Decision:** `src/ui/styles/tokens.css` lands as the single source of
truth — no JSON/generator indirection — with the two token systems
(project capture-region set; carbon-convention spacing/type/layer/
state/focus/motion under `--csl-`) in documented sections, both
schemes, unconsumed until IMPL-01 (zero visual change verified: no
import exists and the built bundle carries no `csl-`). The contrast
contract is machine-readable in the file itself: `@pair fg on bg
[large|nontext]` lines checked by `scripts/check-contrast.mjs`
(new gate step `check:contrast`, dependency-free, exits 1 on failure)
at 7:1 / 4.5:1 / 3:1 in both schemes — 17 pairs × 2 schemes all pass;
`@exempt token reason` lines are printed decisions (disabled opacity,
decorative border, the content-adjacent capture double-ring).

**AAA adaptations recorded** (Carbon = baseline, not ceiling): helper
text shares the secondary colour (Carbon helper greys ~5:1); control
borders bind to border-strong (≥3:1; Carbon subtle is decorative
here); focus stays 3 px `currentColor` (18.1/16.45:1) over Carbon's
focus blue. Status colour tokens: deliberately none — status is words
in live regions; the file says where one would start.

**Alternative rejected:** a JS/JSON token source generating the CSS —
a build step and a second artefact for zero current consumers; the
annotation contract keeps one file honest instead.

**Link:** `ui-spec.md` §9 (pair table, inventory mapping, scales);
`DEV-INFRASTRUCTURE.md` gate table row.

## D81 — M14-IMPL-01 stylesheet structure: tokens → base → shell, and an 8-line critical block (2026-07-23)

**Decision:** the dev shell extracts into three Vite-imported sheets —
`tokens.css` (SPEC-02), `base.css` (element layer), `shell.css`
(layout/chrome) — imported from `main.ts` in cascade order; deeper
splits (per-panel files) wait until a panel owns enough CSS to earn
one. `index.html` keeps an 8-line critical block whose only job is
pre-bundle dark-scheme paint (the DOM is bundle-built, so nothing
else can flash); reason recorded in the block itself. Carbon
productive adoption in the same move: body-01 base, heading-04 h1
(A16), settings column as a layer-01 surface with field-02-style
inputs, decorative rules on border-subtle, hover/active state fills,
spacing tokens throughout. M6 why-comments ported verbatim with their
rules; reduced-motion handling moved wholly to the token layer.
Structural invariants restated as greps in `tests/ui-styles.test.ts`
([hidden]!important, no CSS order, dev-shell absence, import order).
Evidence + matrix in `docs/ui-evidence.md`; engine surfaces untouched
(ui-baseline tripwire green).

**Alternative rejected:** CSS modules / per-component sheets now —
premature while IMPL-02/03 will still move rules between surfaces.

## D82 — M14-IMPL-02: anatomy in the builders, dialogs in project code, prevention announced (2026-07-23)

**Decision:** control anatomy landed at the builder layer so one
implementation serves every consumer: helper/error linkage via
`aria-describedby` in `controls.ts`; the snap-back number field now
announces its correction in a linked `role="status"` message rather
than silently rewriting input (prevention stays, silence goes).
Checkboxes are Carbon-drawn with the pseudo-element hit extension to
44 px (the toggle's house pattern, A1) and per-thread accessible
names (A2); a generic `summary` target rule closes A3b.
`window.prompt`/`confirm` are replaced by `src/ui/modal.ts` — Carbon
modal anatomy with focus trap, Escape/backdrop cancel, focus
restoration, danger default on Cancel (A6) — tested in jsdom
(`tests/modal.test.ts` — pure halves). Dither carries its disabled reason locally
(A9); preview host and crop overlay take operable roles with linked
instructions (A15); info rows carry hex visibly (A14 — two test
assertions updated to the intended labels, stated).

**Adaptations recorded:** the error red (`--csl-support-error`,
paired non-text ≥ 3:1 both schemes) marks edges only; error/correction
message text stays `text-primary` because Carbon's error-text red
misses the 7:1 AAA bar. `aria-invalid` flags the correction moment
only — the field never persists invalid by design. Also fixed in
passing: inverse-filled buttons (pressed/modal-primary) keep their
fill under hover/active — IMPL-01's generic hover would have put
inverse text on a light ground.

**Link:** evidence in `docs/ui-evidence.md`; spec rows `ui-spec.md`
§5 anatomy baseline.

## D83 — M14-IMPL-03: five sections, one reveal per depth, and the numbers that motivated them (2026-07-23)

**Decision:** the spec architecture (D76/D77) is implemented as a
project-coded Carbon accordion (`src/ui/accordion.ts`) whose headers
are the page's h2 structure — real `<h2>` wrapping the toggle button,
panels leaving layout and the tab order via `hidden`, closed headers
carrying state summaries derived from owned state. Native `<details>`
was rejected for sections only because `summary` cannot be a heading;
it *is* the mechanism for every inline depth reveal (thread library,
grid/dither details, per-exporter options — the debug-panel
precedent). Disclosure state persists per id in the preferences store
with spec defaults for unknown ids. Legends dropped where a fieldset
is its section's only child (Export/Project/Advanced) — the header
already names it.

**Measured effect:** default page 14,495 → 3,877 px; settings tab
stops ~130 → 11; Export reach 2, thread depth 2, grid depth 3 — all
inside the D76 contract. Verification instrument note recorded:
Chromium hides closed `<details>` via `content-visibility`, so rect/
offsetParent sweeps false-positive — focus-probing is the honest
measure (bound into VERIFY-01's method).

**Also decided:** coarse Project save-state summary ("not saved this
session" / "saved …") over live dirty-diffing — a real dirty tracker
means serialising the 489-thread snapshot per refresh or new state
machinery; rejected as outside the milestone's UI-only remit. One
boot defect found and fixed in-task (construction-order TDZ:
applyPolicy → refreshSections before assembly; guarded, boots clean).

**Link:** evidence table in `docs/ui-evidence.md`; spec `ui-spec.md`
§1/§2/§5.

## D84 — M14-IMPL-04: inline first-run, a drawn sample, and no tour (2026-07-23)

**Decision:** the first-run layer is inline affordances only — an
entry state (title, Choose an image / Capture your screen as filled
primaries, Try a sample, capture-expectation line, routes line) that
compacts to a one-line source row after the first conversion. A
modal tour/overlay walkthrough is **rejected on record**: it traps
(user control & freedom), it ages with every UI change, and it
violates minimalist design — the surfaces must explain themselves.

**Sample design:** `src/ui/sample.ts` draws a deterministic 256²
test-card (hue sweep × lightness ramp / greyscale band / eight flat
swatches) chosen so reduction, dithering, neutral mapping and stats
each have something visible to do; no asset, no dependency, no
randomness; it feeds the normal source path and is labelled a sample
in status and the source row.

**Also closed here:** A8 — the crop readout is a polite status with
size *and position*, updated at end-events (never per pointer-move,
so no SR flooding); A7 — `displayLabel` is allow-list shaped (word
structure required; token-shaped labels fall back to "the shared
screen"); thread-list filtered-out state distinguishes an empty
search from an empty brand set; processing order carries its
consequence helper (wording from the D79 map).

**Link:** evidence + empty-state matrix in `docs/ui-evidence.md`;
spec `ui-spec.md` §3.

## D85 — M14-IMPL-05: the map applied; derived strings follow; one core sentence deferred on record (2026-07-23)

**Decision:** the D79 terminology map is applied verbatim (inventory
in `docs/ui-evidence.md`), with one extension the map implied but did
not list: strings *derived from* the renamed concepts follow them —
the count summary's "Full RGB — no thread palette." and the compact
status's "Full RGB" fallback both read "Unlimited colours" now, so
one concept keeps one name across surfaces (Nielsen consistency).
Select *values* and the project-file schema are untouched
(`resize-first`, `rgb` et al. remain the stored identifiers).

**Deferred on record:** the conflict sentence "…or switch to full-RGB
mode" is produced in `src/core/palette-policy.ts`. It stays honest,
and editing core strings inside the UI-only milestone trades churn
for consistency — ACCEPT-01 rules on it; if approved it is a
one-line follow-up.

**Test policy:** three assertions updated with the copy they assert
(count summary ×2, status fallback) — stated, intended, behaviour
identical.

**Link:** inventory table `docs/ui-evidence.md`; map D79.

## D86 — M14-VERIFY-01: conformance re-proven; three waivers stand as the review's input (2026-07-23)

**Decision:** the audit protocol re-run on final code closes 19 of 22
findings with evidence and waives three on record (`ui-evidence.md`
ledger): A16 partially — the spec's Fit-options menu is deferred
(five passing text buttons vs one menu is taste, ACCEPT-01's call;
spec §5 amended); A17 FIT_MARGIN (canvas furniture, wish-listed);
A18 status staleness bound (M13 remainder). Machine sweeps on final
code: zero dangling ARIA references cold and fully-open; 176
focusables with zero sub-44 targets under the focus-probe method;
rendered contrast probes 8.86–16.45:1; matrix cells green (320/
collapsed/focus). Fixed in-pass per the ticket's remit: the last two
unnamed landmarks (Preview/Source sections). The 14 gate items are
answered consolidated — every surface changed, so per-surface
repetition would say the same things eight times.

**Method bound forward:** focus-probing is the target/tab instrument
of record (Chromium's content-visibility keeps layout boxes in closed
details); reduced motion is verified at the token layer. Proposed,
not added: an automated a11y checker dev-dependency (axe-core class)
for the maintainer to approve or decline.

**Link:** conformance section + ledger in `docs/ui-evidence.md`.

## D87 — M14-VERIFY-02: the journeys hold, the bytes hold, the milestone's agent half is done (2026-07-23)

**Decision:** the five journeys re-walked on final code close the
loop the audits opened: 1 interaction to a converted preview with
every route named (sample 988 ms); capture met with expectations and
a position-bearing crop status; both conflict severities followed
out; exports and save at reach 2 with the honesty line in place. The
D76 reach contract measures within bounds tier-wide; no inventory
control was lost. Byte-identity attested: three PNGs sha-identical to
the audit baselines; the PDF's content streams identical including
the 17.7 MB print raster (residual = date strings + their
deflate/xref ripple, per the audit rule); the saved project clean
field-wise with two explained fields (exempt viewport scale; an inert
`count.n` behind `mode:'all'` — walk-order history, pixels identical);
node tripwire green in every close; bench green; engine dirs
diff-clean across the milestone.

**Open for ACCEPT-01, on record:** the owner OS-picker rehearsal;
the Fit-menu waiver (D86); the core conflict-sentence wording (D85);
autosave as a future backlog decision (D75); the axe-core dev-dep
proposal (D86).

**Link:** journey tables + attestation in `docs/ui-evidence.md`;
M14 backlog now holds only M14-ACCEPT-01 [maintainer].

## D88 — M14 extension: the owner's UI feedback triaged — four new tasks, six already delivered, three calls settled (2026-07-23)

**Decision:** the owner's UI feedback (written against the pre-M14
build, confirmed) triages into four agreed extension tasks now gating
ACCEPT-01 — M14-EXT-01 top-bar consolidation (title, quiet build id,
dev-only diagnostics cluster with a new log-download affordance,
Source, both shell controls), M14-EXT-02 source chooser modal
(returning-user switcher; cold-start entry state preserved),
M14-EXT-03 view-controls disclosure (open first-run, persisted;
retires the A16 waiver), M14-EXT-04 "Design width/height" rename.

**Already delivered by M14, listed for re-check at the end review:**
preview-first placement; colour mode ordered above the in-use counts;
collapsible colour settings (Design section + thread reveal);
collapsible palette contents (disclosure, library-source-only, A5);
collapsible dimensions (Design section); the suggested hierarchy
(five sections with summaries ≈ the requested four plus Project).

**Owner calls recorded:** Hide settings and Preview focus stay two
controls, both in the bar (distinct functions — persisted layout
preference vs session mode; a merged control would cycle three
states); "Design width/height" over "Canvas…" (fabric/M12 and
preview-surface collisions) and over "Pattern canvas…" (label length);
capture surfaces stay below the preview — the modal is a chooser,
never the session home. Build-id-in-chrome reverses A13's placement
on the owner's authority, recorded here.

**Link:** backlog → M14 "Extension — owner feedback triage"; tickets
`M14-EXT-01/02.md`; ACCEPT-01 now [blocked: EXT-01..04].

## D89 — M14-EXT shipped: the bar, the chooser, the fold, the name (2026-07-23)

**Decision:** the four D88 extension tasks landed as one coherent
change set (EXT-01+02 share the header rebuild; EXT-03/04 rode the
same verification pass). Outcomes: one app bar carrying title, quiet
build id, Source, both shell modes and the dev-only diagnostics
cluster — including the new Download log affordance, which saves the
same redacted bundle as the copy path through the app's one download
route (never the raw ring buffer); a Carbon choice modal
(`choicesModal` joins `modal.ts`) as the returning user's source
switcher, with the cold-start entry state and the below-preview
capture surfaces untouched by construction; view controls behind a
persisted disclosure open on first run — which supersedes the D86
A16 waiver outright; and "Design width/height" via the SCALE_LABELS
single source of truth (legend "Size"; stored values and schema
untouched).

**Verification:** live walk on cleared storage (bar order/wrap at
320 px, modal flows incl. the sample route end-to-end, fold
persistence across reload, focus-mode hiding with a settled-viewport
no-scroll re-measure, rename sweep); `check` green (938 tests,
19×2 contrast pairs); engine dirs diff-clean; ui-baseline tripwire
green. The compact source row and its `sourceNote` element were
removed rather than left dead.

**Link:** `ui-evidence.md` extension section; `ui-spec.md` §5
amendments; triage rationale in D88. ACCEPT-01 is now unblocked —
the milestone's one remaining item.

## D90 — M14-EXT-05: the polish pass — nine findings, nine fixes, one lesson (2026-07-23)

**Decision:** the owner's second look was answered with a self-review
of the running app rather than a defence of the shipped one: nine
findings (cold-surface duplication ×3, view-controls double chrome,
ragged bar and entry wrapping, a raw file input, the always-on
colours table, chevron overlap), all fixed in one pass
(`ui-evidence.md` table). Notables: the Source button now composes
shell × source state in applyShell (one visibility writer — the
shell rule held); the expectation sentence lives in exactly one
place as a linked helper (the modal choice slot was added for it);
the entry actions and modal choices share one `.action-stack`
pattern; the colours table joined the persisted-disclosure system
(`colours-table`, open by default) with its caption visually hidden
so the name isn't said twice.

**Lesson recorded:** EXT-01..04 landed feature-complete but
composition-blind — each new affordance was verified alone, not
against what already occupied the surface (the Source button next to
an entry state offering the same actions). "No duplicate affordance
on any surface" joins the review checklist for UI work; ACCEPT-01
judges the result.

**Link:** ticket M14-EXT-05 (deleted on ship); evidence table in
`docs/ui-evidence.md`; ACCEPT-01 unblocked again.

## D91 — M14 third look: the voice memo triaged — eleven tasks, two icebox promotions (2026-08-04)

**Decision:** the owner's third look (a voice memo, transcribed and
repaired 2026-08-04) triages into eleven extension tasks that gate
ACCEPT-01 again — M14-EXT-06 settings appear with the source, EXT-07
the sample affordance retired, EXT-08 always-auto-fit with Fit
width/height removed, EXT-09 sticky preview, EXT-10 click-to-engage
panning, EXT-11 view controls collapsed/discreet and home to the
grid toggles, EXT-12 capture region to the top, EXT-13 colour limit
as a slider defaulting to eight, EXT-14 "Colours by usage" collapsed
— plus two [sign-off] proposal tasks where the memo asked for
elegance rather than naming a shape: EXT-15 capture-region aspect
handling and EXT-16 Design-size rework (the dictation trailed off on
its destination).

**Routed out of the milestone:** tonal light↔dark transform sliders
and colour-provenance visualization change or extend engine/worker
outputs, which M14 forbids (UI-only, byte-identical) — promoted to
the Icebox as ICE-ADJUST-01 (absorbing the wish-list "Image
adjustments panel" line; the `adjust` stage exists from M1) and
ICE-PROVENANCE-01. Parked deliberately, not dropped.

**Supersessions on the owner's own authority:** capture surfaces
below the preview (D88) → the region section surfaces first and open
when capture is the source (EXT-12); the view-controls fold open on
first run (D89) → collapsed and quieter (EXT-11); the colours table
open by default (D90) → collapsed (EXT-14); the sample route built
by D84 and kept through D88's modal → retired everywhere
user-reachable (EXT-07); M7's default colour policy all/n=20 (D55) →
a default limit of eight (EXT-13). The D86 A16 fit-menu waiver is
settled rather than re-waived: under always-auto-fit the
width/height variants go (EXT-08). M6-CAPRES-01's always-on aspect
lock (D52) is reopened, not reversed — EXT-15 proposes options
first.

**Assumptions flagged for the end review:** the Source modal's "Try
a sample" entry goes with the entry button (same affordance; the
memo named only the button); plain Fit survives as the manual reset
after zoom (only the width/height variants were named); Zoom in/out
and Compare stay per the memo. EXT-06 must keep a project-open route
on the cold surface — hiding the sections must not orphan Load.

**Link:** backlog → M14 "Extension — third-look triage (D91)";
tickets `M14-EXT-10/13/15/16.md`; ACCEPT-01 re-blocked on
EXT-06..16.

## D92 — M14 third look, second pass: the critique applied — one viewport arc, one sign-off, the sample lives in the modal (2026-08-04)

**Decision:** the owner accepted the design critique of the D91
triage in full (2026-08-04) and the extension set is revised
accordingly. Structural changes: EXT-08..11 are one **viewport arc**
landing as a set with a dedicated composition verify, M14-EXT-18 —
the D90 lesson applied in advance rather than learned again; EXT-16
merges into EXT-15 as one "Size, region & aspect" sign-off (the
memo's trailed-off sentence and the aspect options are the same
design decision; the EXT-16 id is retired, never reused); M14-EXT-17
(thread highlight) joins from the re-scoped ICE-PROVENANCE-01 — the
per-stitch index sidecar already reaches the UI (M7-BRAND-01), so
highlighting a thread's stitches is a Compare-class preview
decoration, not an engine change; the icebox item keeps only the
tonal-position half.

**Forks decided (owner-accepted recommendations):** a permanent
quiet **view strip** replaces the collapsed-fold shape — D91's
EXT-11 would have demoted E-tier zoom to reach 2, breaking the §1
contract; the strip keeps every view control at reach 1 and retires
the D89 fold. **Focus-unified panning** — pan engagement *is*
canvas-host focus; no second mode machinery beside it.
**The sample survives in the Source modal** — the entry button goes
(the memo's literal ask) but the one zero-permission demo route
stays; supersedes D91's remove-everywhere assumption.
**Colour-limit anatomy** — a "Limit colours" toggle (default on) +
slider with paired number input; "exactly" demotes to depth; a
No-limit end-stop would conflate mode and count. **Fit resolves as
Reset view** — under auto-fit the resting state is fitted, so the
surviving button's job is returning to it; Fit, Fit width and Fit
height all retire and the D86 A16 waiver closes with them.

**Constraints bound into the tasks:** the docked preview carries a
capped height under 60 rem plus scroll-margin clearance so no
focused control sits beneath it (UI-STANDARDS focus non-obscuration;
the 320 px companion posture is the budget); EXT-17 re-proves export
byte-identity on ship, so the decoration reading is enforced rather
than assumed; EXT-06 lands as a shell-model state, never a second
hidden layer; EXT-06 adds a quiet "Open a project" entry action so
hiding the sections cannot orphan Load.

**Link:** backlog → M14 "Extension — third-look triage (D91,
revised D92)"; every task carries a ticket (`M14-EXT-06..15.md`,
`M14-EXT-17.md`, `M14-EXT-18.md`; `M14-EXT-16.md` deleted on
merge); ACCEPT-01 blocked on the full set.

## D93 — M14-EXT-06: cold is a shell state, not a hidden layer (2026-08-04)

**Decision:** the cold surface landed as a third field on the one
shell model — `cold` in `ShellState`, overriding both presentation
preferences in `visibility()` — never a second `hidden` layer. The
entry state's visibility write moved into `applyShell` (the D90
one-writer rule now covers the whole cold composition), and the five
source routes plus project open exit cold one-way for the session.
The entry gained the quiet "Open a project" action (D92 constraint:
Load must not orphan), wired to the panel's own hidden project input.

**Assumptions at the skipped gates:** dev-only chrome (diagnostics
cluster, profiling panel) is exempt from "entry only" — it is not
product surface, and a cold boot error is precisely when Copy
diagnostics earns its keep. Source-bearing exits announce "Design
ready — settings are on the right/below" (layout-aware via
`matchMedia`, the 60 rem breakpoint); the project route exits quietly
because its own status line already directs ("import an image to see
it applied"). Focus rescue for an entry action that hides under the
user's finger goes to the bar's Source button — chooser hands to
chooser. A denied capture permission keeps the page cold: the route
never completed, nothing exists to configure.

**Found and fixed in verification:** `applyShell` had never written
`focusToggle.hidden` (the toggle predates cold and was always
visible); cold showed a Preview-focus button for a preview that
cannot exist. Composed from the model as `!panelToggle && !focusExit`
— true exactly when no mode control is meaningful — rather than a new
visibility field.

**Link:** ticket M14-EXT-06 (deleted on ship); ui-spec §3 amendment;
evidence in `docs/ui-evidence.md`; shell tests extended to 18
(cold-override sweep, exit-onto-preference, no-persistence guard).

## D94 — M14-EXT-07: the sample keeps one door (2026-08-04)

**Decision:** the entry state's "Try a sample" is removed — the
memo's literal ask — and the Source modal keeps the sample as the one
zero-permission demo route (the D92 fork, superseding D91's
remove-everywhere assumption). Entry stack is now Choose an image /
Capture your screen / Open a project. `loadSample()` and the sample
buffer stay: the modal calls them, tests and bench rely on the
deterministic buffer.

**Consequence accepted:** with the Source button hidden cold (D90
composition) and the entry sample gone, the cold surface has no
sample route at all — a first-run novice must bring a source or open
a project before the demo becomes reachable at all. That is the
owner's stated preference; ACCEPT-01 judges it, and the ticket noted
reversal is one modal choice away.

**Link:** ticket M14-EXT-07 (deleted on ship); ui-spec §3 amendment +
§5 row (sample now reach 2, modal only); evidence in
`docs/ui-evidence.md`.

## D95 — M14-EXT-08..11: the viewport arc — fitting stops being the user's job (2026-08-04)

**Decision:** the four legs landed as one set, per the D92 revision.
**Auto-fit (EXT-08):** the existing mode machine tightened to two
states — 'space' (auto, the default; refits on source change, host
resize, dock transitions) and 'manual' (any deliberate zoom or pan;
left by Reset view, `0`, or a source replacement). Fit width/height
retired with their buttons; **Reset view** is the one surviving fit
control, closing the D86 A16 waiver. A loaded project opens in auto
regardless of its stored preview scale — predictability over
restoration; the schema field still round-trips in core, it just no
longer drives the opening view. **Docked preview (EXT-09):** the
preview unit (strip · canvas · compact status) is `position: sticky`
in both layouts; at the companion width, scrolling past its natural
position caps the canvas to 40dvh via a scroll-threshold class.
The info panel moved out of the preview section to the content flow —
it scrolls, the picture doesn't. **Focus-unified panning (EXT-10):**
pan engagement *is* host focus — unfocused wheel/drag belong to the
page, the wheel-zoom handler was deleted outright, Escape blurs and
is consumed so preview-focus exits on the next press. The host shows
its ring on `:focus` (not `:focus-visible`): the ring is the engaged
state the memo described, so pointer engagement must show it too.
**View strip (EXT-11):** the D89 fold retired for a permanent quiet
row of ghost text buttons — Zoom out · Zoom in · Reset view ·
Compare · Grid · Numbers + readouts — tighter padding than panel
buttons but the same 44 px minimum targets; the grid pair moved from
Appearance switches to strip toggle buttons, and the Appearance
summary re-derives from what remains (dither state only).

**Found live and fixed:** (1) an IntersectionObserver dock trigger
oscillates — docking shrinks the page, which moves the trigger back
into view — and hung the renderer at 375 px; replaced with a
scroll-position threshold against the sentinel's *static* document
offset, which the dock state cannot move. (2) A rAF-gated scroll
handler freezes in a hidden tab with its pending flag wedged; the
work is one comparison, so it is synchronous now. (3) `position:
sticky` released mid-scroll because `.content` ends before the
settings do: at the companion width `.content` becomes
`display: contents` so the sticky containing block is the full
column; at wide the row is `align-items: stretch` for the same
reason. (4) The strip wrapped to 3 rows at 375 px; strip buttons use
spacing-03 padding, restoring the ≤ 2-row budget (88 px measured).

**Link:** tickets M14-EXT-08/09/10/11 (deleted on ship); ui-spec §2
amendment, §5 rows, §6 keyboard model, §4 strip terminology;
composition evidence lands with M14-EXT-18.

## D96 — M14-EXT-18: the composition holds (2026-08-04)

**Decision:** the viewport arc passes as a whole. 188-control
keyboard walks at 320/800/1280 with zero focus-obscuration
violations; the memo's palette scenario proven at 320 × 700 (392 px
of pinned canvas while the colour select holds focus); zero
duplicated affordances; both schemes; reduced motion by construction.
The one deviation from the EXT-11 budget is within its own named
fallback: at 320 px the six strip buttons hold two rows but the
readouts wrap to a third quiet text line — accepted as the ticket's
"inline text under the strip" shape, ACCEPT-01 judges the taste.
J1's fastest zero-permission route now sits behind the Source modal
(D94 consequence) — recorded for the end review rather than
re-litigated here. EXT-17's cross-product and the live SR/trackpad
half are named exclusions, owned by that ship and ACCEPT-01
respectively.

**Link:** ticket M14-EXT-18 (deleted on ship); evidence matrix in
`docs/ui-evidence.md`; §2/§4/§5/§6 amendments confirmed in place.

## D97 — M14-EXT-12: the capture surface moves into the settings (2026-08-04)

**Decision:** during a session the whole capture surface — live
thumb + crop overlay, session controls, position readout, draft
badge — lives in a **Capture region** accordion section mounted at
first position in the settings panel; the source section carries the
cold entry only. Open on first appearance, persisted collapse
thereafter (per-session remount honours the stored choice). The
placement supersedes D88's below-the-preview arrangement on the
owner's own authority (D91), and pays off in both layouts: beside
the preview at wide, first under the docked preview at narrow.
Aspect semantics untouched — EXT-15 owns them.

**Consequences accepted:** the capture surfaces now hide with the
panel (they are settings geography; the preview keeps rendering), and
the wide-layout thumb is panel-width — both routed to ACCEPT-01 as
taste. The capture-start announcement lands after the cold-exit line
and is then overwritten by the first frame's "Preview updated." —
queued for a screen reader, transient visually; accepted.

**Found in verification:** the focus-rescue contains() check ran
after the session buttons were hidden, when focus had already
dropped to body — the flag is now read at the top of `endCaptureUi`,
and the rescue targets the Source button, falling back to the
entry's first action for a stop-before-any-frame session. Stopping
normally keeps the last grabbed frame as the source (existing
behaviour), so the entry does not return and Source is the right
target.

**Link:** ticket M14-EXT-12 (deleted on ship); ui-spec §2/§3
amendment; evidence in `docs/ui-evidence.md`.

## D98 — M14-EXT-13: limit colours by switch and slider; eight is the new default (2026-08-04)

**Decision:** the Colour-limit mode select + number field became a
**"Limit colours" switch (default on) + slider (1–64) with paired
number input (1–512)** — the D92 anatomy: a slider "No limit"
end-stop was rejected as conflating mode and count, and "exactly"
demoted to a depth checkbox beside the thread-library disclosure
("Use exactly this many"), remembered across an off/on cycle. The
fresh-session default is **at most 8 colours** — `defaultPolicy()`
count `{mode:'max', n:8}`, superseding D55's unlimited default on
the owner's authority (D91/D92). Never silent: the collapsed Design
summary reads "… · DMC · 8 colours (limit)" and the count summary
"489 permitted · 8 selected of 8 requested · 8 used in the design."

**Boundaries held:** the v2→v3 project migration keeps its own
inline `all/20` literal — an old file meant "no limit" when saved,
and the migration preserves meaning, not the current taste. Stored
policies (schema v3) are untouched. The one test fixture that read
the ambient default in its no-limit branch now pins `mode:'all'`
explicitly (the ticket's named risk, found in the right direction),
and a new test pins the eight-default deliberately.

**Verified live:** fresh drop resolves 8; slider arrow → 9 resolves
9; typing 100 pegs the slider at 64 and resolves 100; switch off →
unlimited (489, controls hidden); switch on → n and exactness
remembered; exact checkbox flips mode with the same honest
selected-vs-requested strings.

**Tripwire resolution:** the ui-baseline tripwire fired on the
default flip — correctly, but for the wrong reason: it derived its
pinned config from `defaultPolicy()`, so an intended UI-policy
decision read as engine drift. The tripwire now freezes the
audit-time reference policy inline and keeps every committed hash
untouched — engine byte-identity stays proven over the same config
as at audit time, and default changes can no longer masquerade as
engine changes (or vice versa). No hash was refreshed.

**Link:** ticket M14-EXT-13 (deleted on ship); ui-spec §4/§5 rows;
evidence in `docs/ui-evidence.md`.

## D99 — M14-EXT-14: the colours table folds, the fold line informs (2026-08-04)

**Decision:** the colours-by-usage disclosure defaults **closed**
(flipping D90's open default on the memo's ask; the persisted choice
still wins), and the fold line grows a derived readout so the table
still informs collapsed: "Colours by usage — 8 · DMC 310 leads" —
count plus leading thread, derived from owned stats at render
(`usageSummaryLabel`, pure and unit-tested), never scraped from the
DOM. The D90 name-once rule survives: the visually-hidden caption
keeps the table's accessible name; the fold line is the disclosure's
label.

**Tension on record (from the ticket):** the default-8 palette makes
this table the novice's best feedback, and the owner still wants it
folded — the summary carries the load, and EXT-17's highlight gives
the table a reason to open. EXT-17's row selection lands at reach 2
under this default, inside the C-tier contract (§5 row updated).

**Link:** ticket M14-EXT-14 (deleted on ship); evidence in
`docs/ui-evidence.md`.

## D100 — M14-EXT-17: where a thread lives, shown without touching a pixel that ships (2026-08-04)

**Decision:** selecting a thread row in Colours by usage highlights
its stitches on the preview as a **Compare-class decoration**: a new
`highlight` worker message (deliberately not a `PipelineConfig`
field, so processing, exports and project files cannot see it by
construction) sets a palette index on the preview surface, which
dims every non-matching stitch under a uniform scrim (alpha 150) —
matching stitches and fabric stay untouched, because thread colours
are content and absence of scrim IS the highlight. The scrim draws
under Compare, so the source half stays pristine and the two
decorations compose. Selection is keyed by palette index (the
sidecar's vocabulary), owned by the info panel as session state; a
changed entry list (an entries fingerprint in `resolvePalette`)
clears it rather than letting it silently point at a different
thread. Rows carry the A2 per-row anatomy ("Highlight" visible,
"Highlight DMC 310 Black" accessible, `aria-pressed`); reselect and
Escape clear; announcements carry the table's own count.

**Costs accepted:** the router copies the index sidecar to the
surface before the response transfer detaches it — unconditional
(~180 KB at 300², 0.024 ms measured), so a highlight engages
instantly on a static image with no re-run. Full added cost with a
highlight active: 0.796 ms/frame at 300² (copy + mask + draw) —
0.3 % of the 4 fps budget, ~1 % of the banked 57–86 ms baseline
frames (D64–D72), so the ≥ 4 updates/sec promise holds by margin.
The live-pump rate could not be re-measured headless (rAF-frozen
hidden pane); named for the ACCEPT-01 live session.

**Byte-identity enforced, not assumed (D92):** export PNG SHA-256
identical with and without an active highlight on the real export
path; the ui-baseline tripwire stays green; the type system keeps
the highlight out of every processing request shape.

**Link:** ticket M14-EXT-17 (deleted on ship); ICE-PROVENANCE-01
keeps the tonal half; evidence in `docs/ui-evidence.md`; mask
invariants unit-tested (`tests/highlight.test.ts`).

## D101 — M14-EXT-15: the signed shape ships — aspect follows by default, frees on demand (2026-08-05)

**Decision:** the owner signed **A + D + S1** (structured in-session
answer, 2026-08-05; pack in the D91–D100 commit) and the shape is
implemented. An **"Aspect follows design"** toggle joins the capture
session controls — pressed by default, session-only, reset each
session, never project data (schema untouched). Unlocked, every
shape-changing gesture runs the free geometry (`resizeRect`/
`clampRect`) and the gesture end adopts the region's shape as the
design height (`deriveGridHeight` — width stays the user's, stitches
stay square, nothing distorts). Shift-drag frees a pin temporarily
while locked; the keyboard route to a free resize is the toggle
itself, with shift+arrows staying aspect-locked until it is off
(recorded as D's keyboard answer). S1: the Design size fields join
the Capture region section for the session and return to Design on
end — moved, never duplicated, focus preserved across the reparent.

**The independence promise, split as signed:** locked keeps D52
whole (constrainRect the only route; region chooses which pixels,
never how many stitches — existing suites stand). Unlocked is the
one sanctioned crossing: region shape → design height, one
direction, announced in the readout ("(height follows the region)")
while the derived height field disables with the reason in its
helper (A9 adjacency). AGENTS.md's invariant updated to the split;
ui-spec §3/§5/§7 amended. The derive/constrain pair is a proven
fixed point (no feedback loop) in the crop suite.

**Losers recorded:** B (resample) distorts stitches — carried as the
strawman and rejected; C (letterbox) buys freedom at a third concept
(silent blank bands + D9 fabric semantics without source
transparency); S2 invents a compound control; S3 moves size edits to
reach 2 when the complaint was chunkiness, not reach.

**Found in verification:** a region-derived height left a stale
number in the disabled field — `applyPattern` now mirrors both
fields whatever drove the change. Pointer-drag geometry could not be
driven in the headless pane (the capture video never lays out — same
rig class as the frozen pump); the keyboard route proved the full
derive chain, the shift-gesture free/adopt path was demonstrated via
draw, the geometry is unit-tested (52 crop tests incl. the new
locked/unlocked split), and the real drag sits on ACCEPT-01's live
checklist.

**Link:** ticket M14-EXT-15 + `docs/ext15-options.md` +
`docs/ext15-mockups.html` (all deleted on this ship — conclusions
live here); evidence in `docs/ui-evidence.md`; ACCEPT-01 is now
unblocked — the milestone's one remaining item, and it is the
owner's.

## D102 — ACCEPT-01 first pass: six findings routed to fix tasks (2026-08-05)

**Decision:** the owner's first live Photoshop companion run
(2026-08-05, narrow window beside Photoshop 2026, real capture)
produced six findings, routed to M14-FIX-01..06 per ACCEPT-01's own
rule — fix tasks, never silent rework. ACCEPT-01 re-blocks on the
set; the formal pass/fail session follows.

**The findings, ordered as they will run:** FIX-06 first — a
scroll-time oscillation of the preview at companion width during
capture, a defect in my D95 dock/sticky mechanics (prime suspect:
the dock's page-shortening crossing its own scroll threshold near a
short page's bottom — the exact loop class D95 dismissed for tall
pages; a page with everything collapsed is short). Then FIX-01 —
capture region leading the session flow, which collides with the
preview-first §7 invariant and carries a reorder-vs-guidance option
set (the owner explicitly left mechanic latitude); FIX-03 — the
canvas host hugging the fitted design's height instead of a flat
60dvh; FIX-05 — the stats block compressed, dropping the
strip-readout duplication; FIX-04 — a discreet window-width guide
for the narrow posture; FIX-02 — `selfBrowserSurface: 'exclude'` +
window-share copy, with the platform's full-screen limit recorded
("not essential if not viable" is the owner's stated tolerance).

**Also observed in the session artefacts:** the owner shared a
screen containing the app itself (the design stitched the app's own
UI) — the motivating reproduction for FIX-02's copy nudge; and the
shipped extension surfaces (default-8 announced in the Design
summary, the informative colours fold line, the aspect toggle in
the capture section) all visible working in the real posture.

**Link:** backlog → "First-pass review feedback"; tickets
M14-FIX-01/02/03/04/06 (FIX-05 is line-only); owner screenshots in
the session transcript.

## D103 — M14-FIX-06 + FIX-03: nothing in the layout is scroll-linked (2026-08-05)

**Decision:** the two findings are one geometry decision, landed as
one change. The D95 scroll-threshold dock is **deleted** — its class
toggle changed the page height on its own trigger's axis, and scroll
anchoring / bottom clamping fed the change straight back across the
threshold as the docked↔undocked flap the owner filmed. The cure is
categorical, not tuned: no hysteresis, no re-measure — layout height
simply has no scroll input left. The canvas instead **hugs the
fitted design** under auto-fit (`hugHeight`, pure: fit the width,
follow the aspect, clamp to a 10rem floor and a posture cap — 40dvh
stacked, 60dvh wide). Height depends only on host width and design
shape — never on the height it replaces — so the ResizeObserver
settles in one pass; the fixed point is unit-tested, not assumed.
Manual zoom freezes the height where the user left it; Reset view
re-hugs; preview focus fills the window by flex (`!important` over
the inline hug). The D97-era "scroll back restores full height"
behaviour is retired with the mechanism — under hugging there is no
unnecessary height to restore (the FIX-03 ask).

**Verified live (380 × 700):** wide 200×80 design → host 173 px
(derivation exact, was a fixed 489); square design → capped 282 px;
an 8-position scroll sweep holds ONE height with clean sticky
pinning; manual zoom froze 173 through a grid change; Reset re-hugged
to the cap. Nothing in src listens to scroll any more (grep-clean).

**Link:** tickets M14-FIX-06/03 (deleted on ship); ui-spec §2
re-amended (supersedes D95's dock paragraph); evidence in
`docs/ui-evidence.md`; EXT-18's dock legs re-walked under the new
geometry at close of the FIX set.

## D104 — M14-FIX-01: the region leads while it is the task (2026-08-05)

**Decision:** during a capture session the Capture region section
mounts in the content column **above the preview** — the owner's
tweak → lock → collapse → progress flow made literal, superseding
D97's panel-first slot on the first-pass review. Session start hands
focus to the section's own toggle (the user's gesture was "set up a
capture"); collapsing or locking scrolls the preview back into the
lead (instant — reduced-motion by construction). The preview-first
invariant gains exactly one owner-signed session-time exception,
recorded in UI-STANDARDS and ui-spec §2/§7 — a DOM mount, never CSS
`order`, so reading, visual and tab order remain one thing.

**Composition kept honest:** the section now follows the *source*
region's visibility in applyShell (late-bound — the shell applies
before the section exists), so preview focus still strips it; and it
no longer hides with the settings panel — D97's "settings geography"
consequence reverses to content geography, which matches the flow
(collapse the settings, keep region + preview). The wide-layout
thumb gains the content column's width in the bargain.

**Verified live:** mount precedes the preview, open, focus on the
toggle; collapse at scroll 400 → 0; lock at scroll 300 → 0; preview
focus hides / exit restores; panel collapse leaves it visible; stop
unmounts clean.

**Link:** ticket M14-FIX-01 (deleted on ship); UI-STANDARDS layout
rule + ui-spec §2/§7 amendments; evidence in `docs/ui-evidence.md`.

## D105 — M14-FIX-05/04/02: the small three from the first pass (2026-08-05)

**Decision:** the remaining first-pass findings landed as one pass.
**FIX-05:** the stats line drops its dimensions — the strip readout
already says "200 × 200 stitches" a few lines up, and the duplicate
was height the companion posture pays for; the info block's text
margins tighten to spacing-02 and the stacked-layout gap to
spacing-03. Measured at 380 px: canvas-to-source spans 128 px at the
spec default with every fact kept. **FIX-04:** a window-width guide
with zero standing chrome — a debounced (350 ms) line in the
existing status region during a resize burst below 960 px: "Window
380 px wide — works down to 320 px." / "narrower than the supported
320 px floor."; silent at roomy widths; the claim is the supported
floor, not an aesthetic optimum. **FIX-02:** `selfBrowserSurface:
'exclude'` + `surfaceSwitching: 'include'` on the capture request
(the app's own tab leaves its picker on Chromium; unknown members
ignored elsewhere), and the expectation copy now says the honest
thing in both of its homes: "choose the window you draw in — sharing
the whole screen includes this app." The platform limit is on
record: no web API removes a window from a monitor share, so
window-sharing is the 100 % answer — the owner's "not essential if
not viable" tolerance is answered with "partially viable, done".

**Link:** tickets M14-FIX-04/02 (deleted on ship; FIX-05 was
line-only); evidence in `docs/ui-evidence.md`. With these, all six
first-pass findings are closed — ACCEPT-01 unblocks for the formal
pass/fail session.

## D106 — M14 fourth look: dictated feedback triaged — twelve tasks, one new milestone (2026-08-06)

**Decision:** the owner's fourth look (dictated feedback, transcript
repaired against the live UI labels, 2026-08-06) triages into twelve
extension tasks that gate ACCEPT-01 again, ids in run order —
EXT-19 the capture picker prefers the entire screen
(`displaySurface: 'monitor'`, a hint beside D105's exclusions);
EXT-20 the region↔design coupling recut ("Lock aspect", default off,
drags rederiving **both** dimensions through a visible
source-px-per-stitch scale slider, compact Size fields); EXT-21 a
Stats section pinned above the capture settings (design size, stitch
total, colours in use — the owner excludes coordinates and aspect
state) with the capture-region readout retired; EXT-22 collapsed
folds showing bare headings; EXT-23 a collapsible preview (default
expanded, re-opened by capture); EXT-24 Preview focus retired whole
with its button; EXT-25 [sign-off] the session controls rationalised
with Stop capture moving to the app bar (plausibly a Source-button
state — options-first, the owner picks); EXT-26 a Debug menu over
the diagnostics affordance (copy JSON / download JSON / email-dev
via mailto); EXT-27 engaged-only trackpad pinch-zoom and two-finger
pan; EXT-28 Colour as its own section out of Design; EXT-29 the
colour anatomy recut ("Threadify colours" leading, count
slider+input+steppers, `Use exactly this many` retired, a separate
constrain switch); EXT-30 Appearance renamed "Processing" with the
grid geometry relocated (recommendation: the view strip's grid
reveal, where D92 already homed the toggles).

**Routed out of the milestone:** memo items 14–16 — "Colour profile"
replacing `Colour mode` + `Threads to choose from`, the profile
editor (colour libraries incl. tech colour maps, user collections
with code/hex search and custom RGB, five-image test preview,
advanced min-distance and H/S/B-range constraints), and "Dithering
profiles" with their editor — become **M15**, scoping-first as two
[maintainer] [sign-off] joint sessions (M15-SCOPE-01/02) at the
owner's explicit ask ("needs more scoping work that would benefit
from us both"). Out of M14 by constraint, not preference: profiles
change which colours are available (outputs not byte-identical) and
user libraries add persistence — M14 forbids both. The scope tickets
carry the repaired memo text, the M7 machinery it maps onto (named
palettes, inventory, policy layer), the D55 identity question
non-thread colours raise, and the D53 evidence against a real second
browser window.

**Supersessions on the owner's own authority:** D101's
aspect-follows-by-default and height-only derive → free by default,
both dimensions through one scale (EXT-20; the D52 conduct survives
whole behind "Lock aspect" on). The informative fold lines — the
section summaries and D98's never-silent limit line, D99's
Colours-by-usage lead → bare headings (EXT-22), with the
never-silent duty moving to Stats first (EXT-21 precedes EXT-22 for
exactly this). UI-STANDARDS' "the canvas never does [collapse]" and
the Capture-UX dimensions readout → EXT-23/EXT-21, protected-doc
deltas to ledger at ship. M6-FOCUS-01's Preview focus mode → retired
with its only entry (EXT-24). M14-EXT-10's "no wheel handler — do
not reintroduce it" → reopened for the engaged state only, the
unfocused surface keeping the promise verbatim (EXT-27). D92's
colour-limit anatomy → EXT-29's two-switch recut.

**Assumptions flagged for the pick gates:** "Threadify colours" is
read as the full-RGB↔threads boolean (today's `Colour mode`) with
"Constrain number of colours" as the count switch — the literal
rename-Limit-colours reading is inconsistent but recorded in the
EXT-29 ticket for the owner to rule on; Stats' "resolution" = design
size in stitches; "Colours in use" vs the shipped `Colours by usage`
fold, and the "five test images" against four named presets, resolve
at M15-SCOPE-01; exact-count's fate is named at EXT-29's gate.

**Link:** backlog → M14 "Extension — fourth look (D106)" + "Next —
M15"; tickets M14-EXT-20/21/25/26/27/29/30, M15-SCOPE-01/02;
ACCEPT-01 re-blocked on EXT-19..30.

## D107 — M14-EXT-19..24, 26..30: the fourth-look extension lands in one auto-jazz run (2026-08-06)

**Decision:** eleven of the twelve fourth-look tasks shipped as one
gateless run (auto-jazz, per the owner's "autojazz the backlog"
instruction — conservative picks at every skipped gate, each named
here). EXT-19: `displaySurface: 'monitor'` rides inside the `video`
constraints beside D105's exclusions; D105's choose-a-window
expectation copy deliberately stays (still the honest warning — the
tension is ACCEPT-01's to judge). EXT-20: "Lock aspect" defaults
off; `deriveGridSize` replaces `deriveGridHeight` (both dimensions
through one held source-px-per-stitch scale, fixed-point-proven);
the slider ships as **"Stitch size"** + "Source pixels per stitch"
helper (the unit-in-helper idiom — a bare "scale" label is D52-banned
and "Detail" inverts); both Size fields disable-with-reason while
unlocked (the ticket's pick for the open field-edit question — the
user's handles are region and slider); a mid-session project load
re-seeds the scale from the loaded width, keeping D101's
width-honoured semantics. EXT-21: Stats leads the panel (not the
page — the ticket's recommendation); the info panel's summary line
retired with the region readout (Stats owns every headline figure —
the "no third copy" duty), and gesture-end status announcements keep
A8's keyboard feedback without a standing readout; coordinates die
unmourned. EXT-22: the accordion summary machinery deleted whole,
not emptied — `usageSummaryLabel`, `captureSummary` and the Design/
capture fold lines went with it. EXT-23/24: preview collapse is a
third shell-model field, **session-only** (a working gesture, not a
preference — reopening into a hidden canvas is a bad first second);
preview focus retired whole — `status-line.ts`, the compact status,
the CSS flex chain, and the Escape-exit listener all deleted, none
idled. EXT-26: the Debug menu is a `details` disclosure (the house
pattern); Email the dev downloads the redacted log then opens an
identity-only mailto (redaction boundary unit-tested); the address
ships as an empty placeholder constant — the owner names what a
public bundle exposes. EXT-27: the engaged/unengaged split lives in
a pure `wheelIntent` (the unfocused-inert promise is a regression
test); pinch is exponential (`e^(−Δy/100)`, in/out cancels exactly);
Safari's gesture events covered. EXT-28: Colour defaults closed
(every non-Design section does; Stats carries the count). EXT-29:
reading A shipped — Threadify colours = the mode boolean, Constrain
number of colours = the count switch; exact mode cut from the
surface, kept in core for loaded files (edits write 'max'); steppers
announce via a dedicated polite region because a button press is
natively silent where slider and input are not. EXT-30: destination
A — the grid reveal mounts between strip and canvas; the
`section-appearance` disclosure preference seeds `section-processing`
by fallback, nothing stranded.

**Verified:** typecheck/lint 0, 964 tests (54 crop, 28 viewport, 7
debug-menu; shell/info-panel/scales suites rewritten to the new
contracts — approved behaviour changes, not weakening); live sweep at
1280×720 and 380×700 (evidence table in `docs/ui-evidence.md`):
Stats honest pre- and post-frame, wheel contract exact (192%→522% =
e¹), lockstep count controls, zero horizontal overflow, zero app
console errors. Live capture legs are unit-tested geometry plus
ACCEPT-01's checklist — same rig limitation as D101.

**Supersessions land as triaged (D106):** D101's default-on and
height-only derive; D93/D98/D99's informative fold lines; M6-FOCUS-01
whole; M14-EXT-10's no-wheel rule for the engaged state only;
UI-STANDARDS' capture readout and never-collapsing canvas plus
AGENTS' four-resolutions split text → ledgered in `doc-deltas.md`,
never auto-edited.

**Link:** backlog → EXT-25 is the set's one survivor ([sign-off] —
options prepared in its ticket, the pick is the owner's); ACCEPT-01
re-blocks on it alone; tickets M14-EXT-20/21/26/27/29/30 deleted on
ship; ui-spec §2/§3/§5/§6/§7 amended; evidence in
`docs/ui-evidence.md`.

## D108 — M14-EXT-25: the Source button carries the session (2026-08-06)

**Decision:** the owner picked **option A** at the sign-off gate
(structured in-session answer, 2026-08-06; the pack is preserved in
this entry's losers). During a capture session the bar's Source
button reads **"Capturing — Source"** (label = accessible name, so
the state is announced to whoever reads the control) and its modal
leads with a session block — **Stop capture** (primary while
capturing) · **Pause/Resume capture** (label derived from the pump
state) · **Capture frame** — above the unchanged source choices, so
switching source never hides behind the same click that stops.
Inline, the session row reduces to the two region toggles that pair
naturally: **Lock region** beside **Lock aspect**. Nothing is cut:
pause and frame-grab demoted to the modal, and the pump-death
recovery copy now points there ("use Capture frame in the Source
menu"). Stop is reach 2 (bar → modal) but reachable from the bar at
all times — the fixed point the backlog demanded. The vestigial
"Start screen capture" button (hidden since the EXT-02 modal took
over) went with the row.

**Losers recorded:** B (a dedicated bar Stop during sessions) kept
the unjustified inline row and paid a fourth bar control at
companion width; C (bar Stop + Capture frame cut) removed a shipped
recovery route — the owner did not name the cut.

**Verified:** typecheck/lint 0, 957 tests; live: the no-session
modal unchanged (three choices, current-source note), the inline row
reduced to the two locks by construction. The in-session modal block
and the label swap ride code paths a headless pane cannot drive
(getDisplayMedia) — named for ACCEPT-01's live session with the
region-drag legs.

**Link:** ticket M14-EXT-25 (deleted on ship — the option pack lives
in its D107/D108 trail); ui-spec §5 amended; ACCEPT-01 is now
unblocked — the milestone's one remaining item, and it is the
owner's.

## D109 — M14 fifth look: refinements on the fourth-look surface triaged — seven tasks (2026-08-06)

**Decision:** the owner's fifth look (ten typed refinements on the
just-shipped fourth-look surface, 2026-08-06) triages into seven
extension tasks that gate ACCEPT-01 again, ids in run order —
EXT-31 the preview gains a real accordion-style header and collapses
from it, the bar toggle retiring with the move (memos 6+2, one task
because the header is the replacement route); EXT-32 the settings
toggle retires and the whole-panel collapse mode with it (memo 3 —
the M6-PANEL-01 sunset, EXT-24's pattern; after 31+32 the shell
model tends to `cold` alone); EXT-33 the capture section recut
(memos 1+4+5: rename to "Capture", every session starts expanded,
and the session controls return from the Source modal to the
section — the Source button reads "Source" always); EXT-34 the
empty-Design fix (memo 8 — diagnosed as EXT-28 plus D101's S1
reparent composing into an open heading over nothing during
sessions; recommendation: retire S1, options in the ticket); EXT-35
grid details as a live-apply form modal from the strip, Numbers
folding into it (memo 7 — bounded to existing GridStyle capability,
tick font size finally surfaced; new rendering capability stays
M11's); EXT-36 the look/feel/ergonomics/intuitiveness polish pass
(memo 9, the EXT-05 method scaled up); EXT-37 the full Carbon
conformance review (memo 10, VERIFY-01's table discipline over
every component class, after EXT-36 so the audit sees the final
surface).

**Supersessions on the owner's own authority, same day, having seen
them live:** D107's bar Hide/Show preview → the section header
(EXT-31); D108's option A — the Source button carrying the session
and its bar-reachability fixed point → session controls inline in
the Capture section (EXT-33); D107's under-strip grid-reveal
placement and D95's strip Numbers toggle → the modal (EXT-35);
D97's persisted-collapse-at-mount → always-open session start
(EXT-33). EXT-34's recommendation would touch D101's S1 half only —
the lock conduct and derive halves stand.

**Memo repair note:** "capturing source" (memo 4) is matched to the
shipped **"Capturing — Source"** bar-button state — the only surface
by that name — and "move" read as relocating the session affordance
whole; the narrower label-only reading is recorded in the EXT-33
ticket for the gate.

**Link:** backlog → M14 "Extension — fifth look (D109)"; tickets
M14-EXT-31/33/34/35/36/37 (EXT-32 is line-only); ACCEPT-01
re-blocked on EXT-31..37. Nothing implemented in this triage.

## D110 — M14-EXT-31..37: the fifth look lands in one auto-jazz run (2026-08-07)

**Decision:** all seven fifth-look tasks shipped as one gateless run
(auto-jazz, the owner's "autojazz the backlog until the colour/dither
profile editors" instruction — the run stops exactly at M15-SCOPE-01/
02, which are owner-collaboration by design). Conservative picks at
every skipped gate: EXT-31 — the preview accordion reuses
`createSection` with the settings-section anatomy exactly (outer
section unnamed, the panel is the named region, so "Preview" is said
once); the disclosure joins the persisted store (`preview-section`),
capture-start re-expand persists too; a collapsed heading is not
sticky (class flips on toggle, never scroll — D103 re-proven live).
EXT-32 — `ShellState` reduces to `cold`; the `panelCollapsed`
preference is dropped without a version bump (a bump would discard
disclosure records over a dead field; old records parse, the field
drops on next write — unit-pinned); the recorded consequence: the
16 rem column always stands at wide. EXT-33 — ticket order Stop ·
Pause · Frame · Lock aspect · Lock region; Pause keeps the shipped
label-flip + aria-pressed pair; no primary among source choices
during a session (emphasis would nudge replacing the live source);
the session verbs skip the per-session hidden dance (the section
mount is the visibility gate). EXT-34 — option A as recommended: S1
retired (D101's lock/derive halves stand), only the Stitch size
slider travels with the session. EXT-35 — trigger label "Grid
options" (the Export "… options" idiom; "details" was the retired
`<details>` species); modal field order = old reveal order with the
numbering block appended; Number size bounds 6–32 px; `formModal`
resolves void — Close/Escape/backdrop are one path because live-apply
leaves nothing to cancel. EXT-36 — two fixes (scroll-padding reserve
408→`40dvh + 12rem` against the measured 427 px unit — a real
focus-obscuration risk; the stale two-row strip comment corrected to
measured reality), five checked-no-change, three parks (floor-width
readout line — pre-existing and contract-shaped; logger console
stringification — dev chrome; one unreproducible uncaught-error pair
— ACCEPT-01 watch). EXT-37 — ten-row conformance table, zero
unexplained deviations: D50 text-buttons and AAA-over-AA re-affirmed;
one new waiver (accordion chevron ▸/▾ over Carbon's ▾/▴ — one
disclosure language with native details, D83).

**Supersessions land as triaged (D109):** D107's bar preview toggle →
the header; D108's option A whole (the bar-reachability fixed point
consciously given up — named for ACCEPT-01); D97's persisted capture
collapse → always-open, unpersisted; D101's S1 → retired; D107's
under-strip reveal + D95's strip Numbers → the modal.

**Verified:** typecheck/lint/contrast/build/docs/secrets green; 953
tests serialised (parallel runs tripped 5 s timeouts on heavy engine
suites — rig contention (another session's dev server + synced I/O),
every file green in isolation, no engine code in the diff); live
sweep on this session's own server at 1280 and 380/320 × 700, both
schemes, error-catcher armed: evidence tables in `docs/ui-evidence.md`.
The in-session capture legs ride getDisplayMedia (not driveable in this
rig, D101's limitation) — named for ACCEPT-01's live checklist.

**Link:** backlog → fifth-look section removed, ACCEPT-01 unblocked
(the milestone's one remaining item, the owner's); tickets
M14-EXT-31/33/34/35/36/37 deleted on ship; ui-spec §2/§5/§7/§9
amended; UI-STANDARDS deltas ledgered in `doc-deltas.md`, never
auto-edited.
