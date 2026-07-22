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
