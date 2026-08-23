# Decision log — Pattern Mapper

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

## Archived: D46–D90 (2026-07-20 → 2026-07-23) — see archive/decision-log-2026-07-20-to-2026-07-23.md

## Archived: D91–D105 (2026-08-04 → 2026-08-05) — see archive/decision-log-2026-08-04-to-2026-08-05.md

## Archived: D106–D148 (2026-08-06 → 2026-08-09) — see archive/decision-log-2026-08-06-to-2026-08-09.md

## D149 — Roadmap reorganisation: the output half becomes the critical path, the audience widens, and a fifteen-item batch precedes it (2026-08-11)

**Decision.** A whole-queue review, at the owner's request, with three
outcomes: a restructured backlog, four owner answers that change scope,
and a batch built to be run gatelessly.

**The structural finding.** M13, M14 and M15 all shipped work on the
*input and appearance* side of the app — performance, UI, colour
profiles. Meanwhile M9–M12 (symbols, multi-page charts, grid styling,
fabric and thread estimates) had sat deferred since 2026-07-22 (D63).
The brief's second success criterion — "a stitchable chart PDF can be
printed from a captured design" — is therefore still unmet: today's PDF
is one page, colour cells only, screen-sized, no symbols, and its thread
key prints the hex twice (KEY-01). The app is an excellent lens attached
to an unfinished pattern. Those five milestones become **Track A, the
printable pattern**, ordered M9 → M11 → M16 → M10 → M12, and Track A is
Next.

**M16 demoted from milestone to task.** Its ask — grid lines and major
numbering on by default — *is* an M11 preset choice, and print-ready
defaults cannot be settled before M9 decides whether a chart cell
carries a symbol. It was a defaults change to furniture that does not
exist yet, sitting in front of the milestones that build the furniture.

**Ship order stops tracking milestone number.** M9–M12 now ship after
M13–M15, and M16 after M11. The numbers stay because they are greppable
across ten ticket files and 149 decision entries; renumbering would cost
that for no gain. The backlog states the order explicitly instead.

**Batch C0 precedes Track A**, and is the argument the owner asked for
about running a large gateless (auto-jazz) batch. Fifteen items with
confirmed mechanisms, named acceptance conditions and no taste required:
the 2026-08-09 sitting's findings plus the tooling debt that made that
sitting expensive. Three of them run first because they are
preconditions for *trusting* a gateless run at all:

1. **RENAME-01** — a large run writes prose, decision entries and
   identifiers; every one written under the old name becomes rename
   surface. Cheapest now.
2. **The doc-sync pass**, plus the hot-read drift fixed in this entry.
3. **AUDIT-01 + ROUTE-01** — `npm run audit` is red (2 files / 2
   tests), so the audits currently give the agent no signal.

The general principle, worth keeping: before a long gateless run, fix
the things that make failure legible. A red audit suite, a diagnostics
buffer that evicts real faults for browser noise (DIAG-01), and export
helpers that pass while the artefact is wrong (EXPORT-01) are precisely
the conditions under which an unattended run does damage nobody sees.

**Owner answers that changed scope.**

- **The audience widens.** The owner intends to publish online to a
  broader audience who "could be using it on anything". "macOS-first,
  personal creative use" is no longer the product, only where it was
  built and measured. Recorded in `brief.md`.
- **ICE-ADJUST-01 survives, and the recommendation against it was
  wrong.** The review argued for cutting it: tonal sliders duplicate
  Photoshop, which the user has open beside the app and which does it
  incomparably better. That argument rested entirely on the upstream
  editor being there — and a broader audience may have nothing of the
  kind. The owner also holds that controlling the final image process
  *is* the point of the app, and asked for colour thresholds as presets.
  Rescoped rather than kept as-was: build it as a **third profile kind**
  on M15's kind-agnostic editor shell, beside colour and dither, because
  "available as presets" is exactly what that shell already does and a
  third kind is the shape it was built for. It is the presumptive
  milestone after Track A.
- **DUR-01 opened.** There is no autosave, no session restore and no
  unsaved-work guard; `beforeunload` appears nowhere in `src/`.
  IndexedDB holds *library* data only, localStorage holds accordion
  state, and the design in progress exists only if you save a file —
  mitigated by one sentence at `src/main.ts:1971`. M14-AUDIT-02
  confirmed the silent loss at D75 and it was never opened as work. It
  is the highest-severity open product defect and it was not in the
  backlog at all. Ships with SAVE-01: same subject.
- **The rename is real.** Promoted from the wish-list, where it had sat
  since 2026-07-20, and sequenced first. Its tier is the one blocking
  question — the preferences key and the IndexedDB database name need
  migrations or an existing install loses its accordion state,
  inventory, palettes and profiles, and the repo/remote/directory tier
  is the owner's to perform, not the agent's.

**A dependency nobody had noticed.** M9's ticket makes font and asset
licensing a first-class milestone decision. "Embeddable for personal use
in a local web app" and "redistributed inside a published app" are
different licence answers, so ICE-TAURI-01's distribution intent is now
an *input* to M9 rather than an unrelated spike. Settle it first or pick
symbol assets twice.

**Splits and narrowings.**

- **M15-DATA-01 split three ways.** As written it chased the cosmetic
  class and excluded the consequential one. A thread's *name* is
  decoration (identity is `brandId:reference`, RGB is display-only —
  D55/D56); a wrong **hex** misrenders the design. DATA-01 keeps the two
  machine-certain classes and runs in the batch; DATA-02 holds the
  name-versus-colour probe (402 hits, mostly compound-name false
  positives); DATA-03 holds the published-values data ask, blocked on
  owner data.
- **A11Y-VO-01 split.** A11Y-01 asserts every control *has* an
  accessible name, hand-rolled over `tests/ui-styles.test.ts` with no
  new dependency; A11Y-VO-01 keeps the part a person has to hear —
  whether the announcements are any good. A short VoiceOver crawl
  instead of a long one.
- **ICE-VARIANTS-01 narrowed** from four axes (including a 2→256 sweep)
  to one bounded axis: the five dither methods from a frozen still. It
  is the best idea in the Icebox — it fixes choosing by memory — but a
  grid is many pipelines, so let one axis earn the rest.

**Cuts and corrections.**

- **ICE-AUTOMATE-01 cut.** Its deliverable was the
  automatable/partly/human-only triage, and that triage was already
  written in the item. It has become the ordering rationale for Batch C0
  and this entry; keeping the item would have been keeping a finished
  piece of work in the queue.
- **ICE-TRANSCRIPT-01's stated blocker was already fixed.** The item
  claimed `_transcripts/*.md` was absent from `.gitignore`; it is at
  line 42 with a `!README.md` exception, and the folder and README
  exist. Only the save-or-retire question remains, as DOCS-01. In 26
  days the close ritual has produced zero transcripts, so retiring the
  reminder is a real option: a reminder nobody obeys trains the reader
  to skim the close.
- **Hot-read drift corrected, and this is why item 2 runs early.**
  `architecture.md` claimed "IndexedDB for autosave/session state"
  (there is none) and schema **v4** (the code is v5). `README.md` said
  M15's acceptance was pending and the M13 remainder was next (both
  shipped), and still advertised the settings-panel collapse and
  preview-focus mode (retired at M14), the capture region as
  aspect-locked to the pattern (default-off since D107), and
  lock/**prefer**/exclude (prefer retired, exclude dissolved into
  membership at M15). Every session hot-reads those files; a gateless
  run would have built on all of it.

**Memory maintenance, folded in.** Three of four accreting files were
over budget. `backlog.md` Active: **4,207 words → 2,000** against a
1,500 budget, by moving fifteen items' traced mechanisms into one shared
run sheet (`tickets/BATCH-C0.md` — one file, not fifteen, because they
ship together) and tightening the Icebox to the grammar's two lines.
The residual overrun is honest rather than green-washed: 36 open items
at two lines each has a floor near 1,800, and Batch C0's fifteen lines
evaporate when the run lands. `trajectory.md`: **3,225 → 1,005 words**,
M13's remainder and all of M14 archived to
`archive/trajectory/trajectory-0004-2026-08-04-to-2026-08-09.md`, and
M15's two separate sections — one "in progress", one "agent work
complete" — merged into one **SHIPPED** section, which was itself drift.
`decision-log.md` is at 43 live entries against a 20 budget; the archive
split is **proposed, not performed** — it is the most delicate protected
file, agents read only the latest ten headings, and splitting it in the
same commit as everything else would have buried the diff.

**Alternatives rejected.** Renumbering the milestones into ship order
(breaks greppability across tickets and 149 entries for cosmetic
tidiness). Keeping M16 as a milestone (it cannot be specified before M9
and M11). Cutting ICE-ADJUST-01 (the argument depended on an upstream
editor the new audience may not have — see above). Running the autojazz
batch immediately (the rename, the doc drift and the red audit suite all
get more expensive, not less, once a large run has written over them).
Compressing Batch C0's traced mechanisms away to hit the word budget:
they were paid for at an expensive sitting and are the difference
between a twenty-minute fix and a two-hour rediscovery.

**Scope.** `backlog.md` (rewritten), `trajectory.md`, `brief.md`,
`architecture.md`, `README.md`, `wish-list.md` (triaged, three lines
left), `doc-deltas.md` (+4, now 9 open), `archive/INDEX.md`,
`archive/trajectory/trajectory-0004-*.md` (new),
`tickets/BATCH-C0.md` (new), `tickets/M15-DATA-01.md` →
`tickets/DATA-01.md`. No source changed; `check` green before and after.

**Link:** Batch C0 becomes Current, Track A becomes Next, Track B and a
regrouped Icebox follow. RENAME-01's tier is the one answer needed
before the batch can run.

## D150 — RENAME-01: the product becomes Pattern Mapper; two storage identifiers are treated differently on purpose (2026-08-11)

**Decision.** The rename ships at the owner's chosen tier 3 ("everything
you can"). Every user-facing string, both HTML titles, the diagnostics
bundle and email, three error messages, the Rust crate description,
`package.json`, the launch config, all live docs including the protected
trio, and the localStorage key now read **Pattern Mapper**. Two things
deliberately do not.

**The IndexedDB database name stays `cross-stitch-lens`.** This is the
substantive decision in the entry, and it is a refusal, not an
oversight. IndexedDB has no rename operation: changing `DB_NAME` does
not move a database, it points at a different, empty one. Migrating
would mean opening both connections and copying four object stores —
`inventory`, `palettes`, `profiles`, `user-colors`, which between them
hold the owner's hand-curated thread inventory and every profile they
have signed — then carrying that copy path forever, all to change an
identifier no user will ever see. The value is zero and the downside is
losing curated data to a migration that fails halfway. Storage keys
outliving product names is ordinary practice. The reasoning is written
onto the constant so the next agent does not "finish the job".

**The localStorage key *was* renamed**, and the asymmetry is the point:
`cross-stitch-lens.shell` → `pattern-mapper.shell` with a legacy
fallback read is three lines inside a pure function whose worst failure
mode is falling back to defaults. A data-copy across four async object
stores is a different kind of change. One is safe, so it happened; the
other is not, so it did not. `loadPreferences` prefers the current key
whenever it holds anything, so a post-rename write is never overridden
by a stale legacy record, and the legacy key is **not deleted** after a
successful read — it costs a few hundred bytes and means a downgrade to
an older build still finds its preferences. Five tests pin all of it:
legacy read, current-wins, forward migration on write, legacy record
left intact, and both-absent falling back to defaults.

**Deliberately untouched.** `pm_skills/project/archive/**` and every
existing `decision-log.md` entry (append-only history — the app *was*
called Cross Stitch Lens, and rewriting that would make the record
lie), and `bench-reports/**` (recorded measurements carry the name in
provenance strings; renaming a measurement rewrites history).
`docs/requirements.md` had its prose renamed and its section numbers
left alone, since the memory files cite it by number.

**The git remote and `repository.url` still name the old repo**, because
the repo has not been renamed. Pointing them at a URL that does not
exist yet would be worse than leaving them accurate. Tracked as
RENAME-02 with the owner's two steps: rename the GitHub repo, and rename
the OneDrive directory with no session running against the path
(hostile-filesystem guard). The agent finishes the remote afterwards.

**Doc-deltas.** Two ticked and applied in the same sitting, as the D149
capture line required: AGENTS.md § Product identity (the name, plus the
audience widening — "macOS-first" retired and the
no-upstream-editor-assumed premise recorded) and the protected-doc
rename sweep, where DEV-INFRASTRUCTURE.md turned out to carry no
occurrence. Two "macOS-first" leads in `README.md` and `brief.md` were
corrected while there, since they now contradicted the widened audience
two paragraphs below them.

**Alternatives rejected.** Renaming the database with a copy migration
(above). Deleting the legacy preferences key after reading it (a
downgrade would then silently reset the user's disclosure choices).
Hand-editing `package-lock.json` (it is a managed file; `npm install
--package-lock-only` regenerated it). Renaming the archives for
consistency (it would make append-only history untrue).

**Scope.** `src/main.ts`, `src/diagnostics/bundle.ts`,
`src/ui/diagnostics-button.ts`, `src/ui/preferences.ts`,
`src/ui/styles/tokens.css`, `src/core/project.ts`,
`src/library/records.ts`, `src/library/store.ts`, `tests/shell.test.ts`
(+5 tests), `tests/diagnostics-bundle.test.ts`,
`tests/debug-menu.test.ts`, `index.html`, `bench.html`,
`bench-source.html`, `crates/stitch-engine/Cargo.toml`, `package.json`,
`package-lock.json`, `.claude/launch.json`, `.gitignore`,
`.windsurf/workflows/next.md`, `AGENTS.md`, `UI-STANDARDS.md`,
`README.md`, `docs/measurement-contract.md`,
`docs/browser-measurement.md`, and the memory files. `check` green.

**Link:** RENAME-02 carries the two owner steps. Batch C0 continues at
the doc-sync pass, then AUDIT-01 → ROUTE-01.

## D151 — The doc-sync drains, AUDIT-01 corrects a stale shape and a slack bound, and ROUTE-01 is settled as noise (2026-08-11)

**Decision.** The three preconditions Batch C0 named for trusting a
gateless run are met: the rename is complete (D150), the hot-read and
protected docs are true again, and `npm run audit` is green.

**The doc-sync pass: 9 open deltas → 1.** Applied, each against the
source entry rather than a stored instruction (the DOC-1 lesson):

- **AGENTS.md § The four resolutions** — the derive-scale control is the
  **Zoom** slider, renamed from "Stitch size" at M14-EXT-40; "Stitch
  size" survives only as the Stats readout of the same ratio. The D52
  collision is now recorded *in the contract* rather than only in
  `scales.ts`: "Zoom" means source px per stitch here and preview CSS px
  per stitch in the view strip, the helper text is the disambiguation,
  and it is explicitly **not** a precedent — a bare `scale` label stays
  banned.
- **AGENTS.md § Performance** — budgets bind at **two** boundaries now,
  and conflating them is the error the entry guards against: `bench`
  asserts node regression baselines (×1.35, staleness-guarded), while
  `bench:auto` asserts the **product promise** in a browser and exits
  non-zero on a missed rate or a dropped frame (D142). Only driven base
  capture rows may bind a target.
- **AGENTS.md § Scope guards** — the committed fence is Batch C0 → Track
  A → Track B, and ship order is not milestone-number order (D149).
- **UI-STANDARDS.md § Layout model** — the controls census was three
  milestones stale. It listed Pattern/Grid/Colour/Dither/Pipeline as
  sections and an info strip docked below the preview; none of that is
  true. Replaced with the real census, each retirement named.
- **UI-STANDARDS.md § Conflict and explanation pattern** — the
  three-disjoint-rules anatomy retired at M15: exclude dissolved into
  profile membership, prefer was removed outright, lock became Must use.
  Recorded so the *principle* survives its shape — M15 made the
  contradiction unrepresentable rather than merely unclickable, which is
  a strengthening, not a loss.
- **DEV-INFRASTRUCTURE.md § `bench:auto`** — the validation summary
  described a report writer; the command now also asserts product
  targets and fails on a missed promise.

Caught in passing and fixed: the command table called `check` **7
non-mutating steps** and listed seven, omitting `check:contrast`. It is
eight. A gate census that cannot count its own steps is exactly the
drift a doc-sync exists to catch.

The one survivor is deferred **by its own terms**: AGENTS.md's
persistence checklist reads as though project state persists
automatically, and DUR-01 is about to change what the true answer is.
Syncing it now would mean syncing it twice.

**AUDIT-01 — two different faults under one item.**

The failing assertion was not catching a defect, it was testing a shape
the app stopped producing. `runtime.audit` hand-simulated the draft
substitution as `{ ...config, dither: false }` and asserted a boolean;
M8 made dither a discriminated `DitherConfig` union (D61/D62). Rather
than fix the literal, the audit now mirrors what `liveConfig()`
*actually does* — `{ algorithm: 'none' }`, behind its real guard (a
palette is set and dithering is on) — and asserts the guard fires before
asserting the invariant, so the audit cannot silently prove nothing on a
workload the substitution declines. The invariant itself is unchanged
and still holds: draft turns dithering off in a **copy**, and the
original the exporter uses is untouched.

The `p533` labels were the same class. `loadDmcPalette()` returns 489
and always has; the bench axis corrected this at bv2 (M13-MEAS-01) and
the matrix and audit axes never followed. Renamed across the live test
surfaces, and the regenerated `docs/acceptance-matrix.md` follows from
`rows.ts`, not by hand.

**One of those labels was load-bearing.** `dither-pruning` asserted
`mean < 533 / 5` on the real DMC palette — a bound ~9 % slacker than
intended, derived from a count the catalogue never had. It is now
`dmc.entries.length / 5`, so it cannot drift again when the catalogue
changes. A mislabel that had quietly become a weaker test is the best
argument for treating label drift as real work.

**ROUTE-01 — settled as noise, with the mechanism identified.** The item
insisted this not be lumped in with AUDIT-01's stale assertions, and it
was right to. Reading the `margin` column, as its Done-when asks:

- **Quiet machine:** all sixteen rows separate by **1.35×–4.02×**, zero
  disagreements. The router's metric-based policy (lab → ts, rgb →
  wasm) is correct across the entire matrix.
- **Under deliberate 10-core load** (the sweep ran 39 % slower): still
  zero disagreements, but the narrowest row — `200²/64/lab` — collapsed
  from **1.77× to 1.24×**. That is the row with the least headroom, and
  it is almost certainly the one that flipped when the failure was first
  seen.

So the disagreement was the measurement, not the router: the sweep picks
its winner by comparing two medians, and a load-inflated median is
indistinguishable from a real regression. The fix is the one ROUTE-01
prescribed — tolerate ties. A disagreement now fails only when the
margin is **≥ 1.25×**; below that the row is reported as a near tie and
not counted. The threshold is evidence-derived (every quiet row clears
1.35×), not picked. Verified both ways: green quiet, and green under the
load that previously broke it, with `200²/64/lab` correctly classified.

This matters beyond the audit: **M13-SYNTH-01 (D135) signed off "routing
confirmed unchanged"**, and that claim now rests on a sweep that no
longer flips with machine load. Near-tie disagreements are still
published in the findings, so nothing is swept away — a genuine policy
break shows the *opposite* winner at a decisive margin and still fails.

**Alternatives rejected.** Fixing the audit's literal `dither: false` to
`{ algorithm: 'none' }` without mirroring the real guard (it would keep
a simulation that can drift from `liveConfig()` again). Re-running
ROUTE-01 until it passed and calling it fixed — it *did* pass on the
first re-run, which is precisely the trap: an intermittent assertion
trains you to re-run rather than to look. Renaming `533` inside
`performance-evidence.md`, `browser-measurement.md`, `bench-reports/`
and the archives: those are recorded measurements, and renaming a
measurement rewrites history (D150's principle).

**Scope.** `AGENTS.md`, `UI-STANDARDS.md`, `DEV-INFRASTRUCTURE.md`,
`doc-deltas.md` (9 → 1 open), `tests/audits/runtime.audit.test.ts`,
`tests/audits/routing.audit.test.ts`,
`tests/audits/orchestration.audit.test.ts`,
`tests/audits/dither.audit.test.ts`,
`tests/audits/lut-reduce.audit.test.ts`,
`tests/audits/m8-dither.audit.test.ts`,
`tests/audits/wasm-boundary.audit.test.ts`,
`tests/audits/candidates/dither-candidates.ts`, `tests/matrix/rows.ts`,
`tests/acceptance-matrix.test.ts`, `tests/dither-pruning.test.ts`,
`tests/backend-select.test.ts`, `tests/wasm-dither.test.ts`,
`tests/benchmark.test.ts`, `docs/acceptance-matrix.md` (regenerated).
`check` and `audit` both green.

**Link:** Batch C0's three preconditions are met; the remaining eleven
items are order-free.

## D152 — DIAG-01 and KEY-01: the diagnostics buffer keeps faults, and the PDF key stops repeating itself (2026-08-11)

**Decision.** Two independent defects from the 2026-08-09 sitting, both
with mechanisms already traced, both fixed with the regression fixture
the finding named.

**DIAG-01 — three separate things, not one.** The item read as "downgrade
a noisy message", but its acceptance condition asked for three, and each
needed its own change:

1. **Known-benign notifications are downgraded, not dropped.** The
   ResizeObserver loop message — both wordings, since engines differ —
   is logged at `debug` with its reason stated in code beside a list
   that is explicitly a silencer, so anything added to it must be
   genuinely benign rather than merely inconvenient. Matched by prefix,
   and a real fault whose message merely *contains* the phrase still
   lands at error (there is a test for exactly that, because a silencer
   that over-matches is worse than the noise).
2. **Real faults keep their evidence.** `installGlobalCapture` recorded
   `message` and `source` but no **stack**, so an uncaught error said
   something broke without saying where. Both the error and the
   unhandled-rejection paths now carry one when the payload is an
   `Error`, and omit the field rather than inventing it when it is not.
3. **Eviction prefers noise over faults.** This is the part the item's
   last clause asked for and the one a quick reading would skip. The
   buffer used `shift()`, so a burst of routine chatter evicts the very
   error you opened the diagnostics for — downgrading the ResizeObserver
   message reduces that pressure but does not remove it, because debug
   records still consume slots. `evictOne` now drops the oldest
   **non-error** record and falls back to the oldest only once the
   buffer is all errors. Bounded stays bounded; errors are simply last
   to go.

**KEY-01 — fixed in `keyLabel`, not at the call site.** The traced path
was right: for a generated colour with no CSS name, `entry.name` *is*
the hex, so `nonThreadLabel` returns "Web-safe #cccccc" and `keyLabel`
appended the hex a second time. The tempting fix is to stop passing
`reference: ''` from the export assembly, but that makes `keyLabel`
return the bare hex and throws away the honest "Web-safe" label D114
introduced. Suppressing the trailing hex when the label already carries
one fixes every row regardless of who builds the label, which is what
the acceptance condition ("never prints the same token twice") actually
asks for. Real threads are untouched: "DMC 310" cannot contain its own
hex, so "DMC 310 #000000" still reads correctly, and the suppression is
conditional so a *named* synthetic ("Retro 16 Lime") still gets its hex.

**The fixture is the point.** `keyLabel` was already unit-tested and
green, because the fixture used "Web-safe Lime" — a named colour. The
unnamed majority is the broken one, and that gap is precisely why the
defect reached an owner's printed export. The regression case is an
unnamed generated colour, plus a case-mismatch variant, plus a sweep
asserting no generated-map row repeats its hex. This is the same lesson
EXPORT-01 exists to institutionalise: a green unit test over a
flattering fixture proves less than it appears to.

**Alternatives rejected.** Filtering benign notifications out entirely
(they would vanish from the record, and "it did not happen" is a
different claim from "it happened and was harmless"). Token-level
deduplication in `keyLabel` (it would collapse legitimate repeats in a
brand name; the defect is specifically the appended hex). Bumping
`BUFFER_CAPACITY` instead of prioritising eviction (a bigger buffer
delays the loss, it does not stop it).

**Scope.** `src/diagnostics/log.ts`, `src/export/pdf.ts`,
`tests/diagnostics-log.test.ts` (new, 10 tests),
`tests/export-pdf.test.ts` (+5). `check` and `audit` green.

**Link:** Batch C0 continues; nine items remain, all order-free.

## D153 — EXPORT-01: the artefacts get asserted, and the suite refuses its own flattering fixture (2026-08-11)

**Decision.** An artefact-level export suite (22 tests) now runs inside
`check`. It takes a real pipeline output from `executeRequest` — the
same worker entry `acceptance-matrix` uses, so the LUT cache, candidate
cache and routing are all in the loop — and pushes it through the real
export assembly, asserting properties of what comes out.

**The key assembly moved to make this honest.** It was inline in
`main.ts`, so a test could only *reimplement* it — and two copies
agreeing proves nothing, which is the same failure that let KEY-01
ship. `buildKeyEntries` now lives in `src/export/key-entries.ts` and
both the app and the suite call it. This is the one production change in
the item, and it is what makes the rest of it mean anything.

**What is asserted, and why each earns its place.**

- **Clean PNG** — the frame is the grid exactly, so 1 stitch = 1 px.
- **Enlarged PNG** — dimensions are an exact integer multiple *and*
  every output pixel is a verbatim copy of its source pixel at ×2, ×3
  and ×7. Restated as a property: the enlargement invents no colour the
  frame did not contain. An interpolating resampler would blend across
  cell edges, and a stitch chart that blends is not a stitch chart.
- **Chart raster** — larger than the bare cells (grid and numbering need
  room), growing in both axes with cell size, and its own `maxCellPx`
  stays inside the canvas limit.
- **PDF** — parsed, not string-matched. One page; the requested box in
  points for A4, Letter and landscape; the image drawn with its aspect
  preserved and fitted inside the margins; the title present; and every
  key row carrying **exactly one hex and no repeated token**.

**Node cannot run the canvas encoders, and the suite says so rather
than pretending.** `encodePngBlob` and `encodeChartPng` need
`OffscreenCanvas`. Their *inputs* are pure and are asserted directly;
the PDF assembly is plain pdf-lib and runs whole, which is why the PDF
gets byte-level treatment and the PNGs get input-level treatment. The
test-only PNG encoder (node's built-in `zlib`, no new dependency) exists
solely to hand pdf-lib the bytes a browser would; nothing about the
app's own encoding is asserted through it.

**The suite caught itself repeating the mistake it exists to catch.**
First draft used a DMC palette for the realistic path. Mutation-testing
it — reverting the KEY-01 fix — showed only the *dedicated* guard
failing, because every DMC row is a real thread ("DMC 310 #000000") and
real threads never had the defect. The realistic case was the flattering
case. A second pipeline run over a **generated** colour map (`websafe`,
whose entries are named by their hex) now covers the shape that actually
broke, and the revert fails two tests instead of one.

That is the general lesson worth keeping: an artefact suite is only as
good as the *inputs* it drives, and "realistic" is not the same as
"covers the failure mode". Mutation-testing a new suite against the bug
it was written for is cheap and is the only way to know.

**Alternatives rejected.** Copying the key assembly into the test (two
copies agreeing is not evidence). Adding a PNG-decoding dependency to
assert the chart raster's pixels (the canvas encoders cannot run in Node
at all, so the dependency would buy nothing the layout assertions do not
already give). String-matching `/Type /Page` and the MediaBox numbers in
the PDF bytes — it failed, because pdf-lib compresses the object
structure, and parsing with `PDFDocument.load` is both correct and
robust to that.

**Scope.** `src/export/key-entries.ts` (new), `src/main.ts` (calls it;
`nonThreadLabel` import retired), `tests/export-artefacts.test.ts` (new,
22 tests). `check` and `audit` green, 1133 tests.

**Link:** Batch C0 continues; eight items remain.

## D154 — M8-GOLD-02: the four M8 methods get golden fixtures, over a crop chosen for difficulty (2026-08-11)

**Decision.** Atkinson, Jarvis, ordered (Bayer 8×8) and blue noise now
carry committed golden fixtures under `tests/golden/`, asserted
bit-exactly alongside the Floyd–Steinberg golden that has existed since
M1. They pin today's owner-signed output so a future WASM or WebGPU
backend cannot drift silently — the entire reason the FS golden exists.

Owner-approved 2026-08-09 at the combined sitting, after judging all
five methods: the best-evidenced moment that decision would get.
`tests/golden/**` remains protected — any later regeneration needs its
own approval with a stated algorithm reason, never to make a failing
test pass. `dither-algorithms.test.ts`'s docstring said M8 fixtures
could not be added without that approval; it now records that they were.

**The source, and why it is not the JPEG.** The owner asked for
`landscape-1`, then agreed the reasoning: a small crop *derived from*
`public/profile-demo/landscape-1.jpg`, committed as a JSON pixel buffer
in the existing 8×8 house style. A golden fixture must stay diffable
when it fails — a 2048² expected buffer is four million pixels of
unreadable diff — and JPEG decoding varies across platforms and library
versions, which would break bit-exactness for reasons that have nothing
to do with the dither maths. Real photographic colour, tiny artefact.

**The crop was chosen, not picked.** The first attempt took a plausible
region by eye and produced a nearly flat beige patch: 12 near-identical
colours. Dither methods barely diverge on a flat patch, so those
fixtures would have pinned almost nothing while looking like real
coverage. The committed crop comes from scanning the whole image for the
8×8 window with the widest channel spread — (320, 768), where all 64
pixels are distinct and the range is 6–255. Extracted 1:1 through the
browser (Node cannot decode JPEG without a dependency), so no scaling
filter is in the fixture; the JSON is what ships and the extraction is
not part of the build.

**Proven to discriminate, not merely to exist.** Two extra assertions
carry that: the four fixtures are pairwise distinct (5–11 of 64 pixels
differ between any pair) and every fixture pixel is a palette colour. A
fixture set where two methods agreed would pin nothing about either, and
that failure is invisible unless something checks for it.

**One shared input, four expected buffers.** The ticket says "an
`.input.json`/`.expected.json` pair" per method; committing the same
input bytes four times would be worse in every respect. Each method has
an input and an expected — the input is simply shared, and named
`m8-crop-8x8.input.json` so its role is legible.

**Alternatives rejected.** Committing the JPEG (above). A synthetic
gradient — `dither-algorithms.test.ts` already generates those for its
invariants; the owner asked for real photographic colour, and the
distinction is the point of this item. Regenerating on the fly rather
than committing (that is not a golden, it is a tautology).

**Scope.** `tests/golden/m8-crop-8x8.input.json`,
`tests/golden/m8-{atkinson,jarvis,ordered,blue-noise}-8x8.expected.json`
(all new), `tests/dither-algorithms.test.ts` (+7 tests, docstring).
`check` green, 1139 tests.

**Link:** Batch C0 continues; seven items remain.

## D155 — DATA-01: the sweep becomes a committed audit, and the owner's worklist becomes a diffable document (2026-08-11)

**Decision.** The thread-catalogue sweep ships as
`tests/audits/catalogue.audit.test.ts` — `AUDIT=1`, beside the gallery
audit whose pattern it follows — reporting exactly the two
machine-certain classes from D151's split, with the judgement classes
left to DATA-02/DATA-03 by design. The sweep **validates the ticket's
hand-counted numbers**: 21 unnamed rows, every one Finca (9.6 % of that
brand, one ingest gap rather than 21 slips), and 11 same-brand
identical-hex groups covering 22 rows. Every brand+reference pair is
unique and every hex is well formed.

**Two rankings the ticket did not ask for**, added because "eleven
groups to inspect" is a chore and a ranked list is a decision aid: four
of the eleven pairs are **consecutive references** (45175/45176,
45312/45313, 45199/45200, 45001/45002 — the shape a copied-down
spreadsheet cell makes, and all Sullivans), and 6 of 11 groups sit in
that one brand — the same concentration shape as class 1's Finca rows.
Both point at per-brand ingest defects, not scattered typos, which
changes how the owner should attack the list.

**The worklist is a generated document, not a buried artefact.** The
JSON report lands in `bench-reports/`, which is gitignored — correct for
measurements, useless for a worklist the owner must act on across
sessions. So the sweep also writes `docs/catalogue-sweep.md`: generated,
hand-edit-forbidden, and **deliberately timestamp-free**, so re-running
after a round of corrections produces a byte-identical file unless the
data changed — the delta is a plain git diff. Verified: the audit re-run
regenerated it byte-identical.

**Gating philosophy, stated in the file.** The two data classes are
reported, never gated — a failing assertion over owner data the agent
may not edit would block every unrelated task. What *is* asserted are
the generator's own promises (unique `brandId:reference`, well-formed
lower-case hex): a breach there means `build-palette.mjs` broke, which
is agent-fixable and should fail loudly.

**Alternatives rejected.** Gating on the findings (above). Committing
the JSON artefact instead of a doc (bench-reports stays untracked by
policy, and JSON is not a worklist). Timestamping the generated doc
(kills the diff signal). Folding the name-versus-colour probe back in
(D151 split it precisely because its 402-hit noise floor needs its own
design or the owner's eyes).

**Lifecycle.** DATA-01 stays open as a `[maintainer]` item in the
Icebox: the detection half is done, the corrections half is the owner's
(`thread-list.csv` → regenerate → re-run the sweep). The ticket file
survives per its own D149 note — the sweep outlives the run that built
it.

**Scope.** `tests/audits/catalogue.audit.test.ts` (new, 5 tests),
`docs/catalogue-sweep.md` (generated). `check` and `audit` green — the
audit suite now runs 55 tests across 12 files.

**Link:** Batch C0 continues; seven items remain. A parallel session's
uncommitted work (cloud-session provisioning + a `check-docs` CI-parity
fix) was found in the tree during this close and deliberately left
unstaged — its own session commits it.

## D156 — UI-06 and A11Y-01: the colour key joins its subject, and accessible names become a tripwire (2026-08-11)

**UI-06.** "Colours used" moves from its top-level home in the content
column into the **Colour section's panel** — it is a readout *of* the
colour choices, and a separate section split one subject across two
places while lengthening the shell (the owner's ask at the 2026-08-09
sitting; pairs with ICE-WIDTH-01). It keeps its own accordion
disclosure, so it still opens and closes independently, and nothing
about what it lists changed. `createSection` gained an optional
`headingLevel` (default 2) and the nested section passes 3, so the
document outline stays honest rather than nesting an h2 inside another
h2's region. The shell×has-rows visibility writer is untouched.
Verified in the running app: the key renders inside
`#section-colour-panel` with an h3, toggles independently, carries the
same rows (`DMC 310 Black …`), and the console is clean. No test
pinned the old placement, so none moved.

**A11Y-01.** The automatable half of the screen-reader pass, split
from A11Y-VO-01 by D149's triage. With no DOM environment installed
and a new dependency forbidden, the honest node-shape is a
**source-scan tripwire** (`tests/a11y-names.test.ts`, the
`ui-styles.test.ts` lineage): every raw
`createElement('button'|'input'|'select'|'textarea')` site — 66 across
the product UI — must carry a recognised name-wiring signal beside it.
The signals were derived from the codebase's real patterns, not
imagined: `textContent`, `aria-label and aria-labelledby`, id↔`htmlFor` association
matched textually so literals, shared identifiers and template
literals all count, appended named spans (the accordion's shape), and
the tree-removing exemptions (`hidden`, `aria-hidden`). Zero
exceptions were needed — every current site's wiring is visible to the
scanner — and the exceptions list is asserted against rot.

Three things keep it from being hollow: a **mutation test** (an
unnamed probe button fails the suite, named by file and line), a
**self-test** floor (a scan matching under 50 sites means the scanner
broke, not that the controls left), and the explicit statement of what
it is: a tripwire that forces new controls to wire a name where the
scanner can see it, never a proof of name *quality* — which is
precisely the half A11Y-VO-01 keeps for VoiceOver.

**Alternatives rejected.** A DOM environment (jsdom/happy-dom — not
installed, and the no-new-dependency rule is A11Y-01's own text). A
window-only heuristic without identifier tracking (the first prototype
flagged 20 of 66 sites; identifier-tracked signals got it to 8, and
reading those 8 by hand showed all were wired — the flags were scanner
blindness, so the scanner learned the patterns rather than the code
gaining exceptions). Asserting builder usage only (main.ts creates
controls raw, legitimately).

**Scope.** `src/main.ts`, `src/ui/accordion.ts`,
`tests/a11y-names.test.ts` (new, 3 tests). Gate green.

**Link:** Batch C0 continues.

## D157 — FLICKER-01 and ZOOM-01: both mechanisms confirmed before fixing, and one ticket suspect was wrong (2026-08-11)

Both items carried the same instruction — confirm the mechanism before
proposing a fix — and the instruction earned its keep twice: one
suspicion confirmed precisely, one overturned.

**FLICKER-01, confirmed as suspected.** `setCount` calls
`invalidateSelectionSource()` and then `applyColour()` resolves
**synchronously with no selection source** while the replacement is
fetched async; `resolveProfilePalette` with no source resolves a count
limit to the **full permitted set** (the documented first-frame
two-step), and `reprocess()` painted it. That interim wide render *is*
the owner's "original high-colour picture between values". Observed
live before fixing: a single count event produced `24 → 17 → 24` in
the Colours-in-use stat — an intermediate frame under a different
palette.

The fix is the run sheet's named conservative option: **hold the
previous reduced frame**. `applyColour` now returns early while
`selectionPending`, keeping the old palette and frame; the fetch's
completion handler re-resolves and reprocesses the moment the source
lands, so the swap is old-reduced → new-reduced and never passes
through wide. Verified live after: stepping 24→8 samples as
`24 · limit 8` → `8 · limit 8` with no intermediate. Deliberately
bypassed by source *replacements* (new artwork reprocesses immediately
with the old palette — showing the new picture beats holding a stale
one, and that two-step stays documented behaviour). The draft
governor's honesty is untouched.

**ZOOM-01, suspect overturned.** The ticket suspected the fit→manual
handover freezing the host height at a rounded value. Reading the
geometry disproved it — `goManual()` never resizes the host,
`zoomAt` is continuous, `clampPan` is loose — and the real mechanism
sat one layer up: **`onFrame` re-derived the view on every processed
frame**, and manual-mode `applyMode` re-derives through `scaledView`,
which **re-centres**. Under live capture (~4 frames/sec), the wheel
zoom landed anchored at the pointer and the next frame threw the
anchor away within ≤ 250 ms — the visible snap. The same mechanism
was quietly discarding **pans** under live capture too, a worse defect
hiding under the same line.

Fix: `onFrame` re-derives only when the stitch dimensions actually
changed (a new pattern has no meaningful anchor to preserve);
same-size frames leave the user's view alone; host resizes were
already the ResizeObserver's job. The engaged-only wheel contract
(M14-EXT-27) is untouched — the acceptance condition names it. The
"moves smoothly by feel" half is a one-line human check at the next
sitting; the mechanism fix is complete.

**Worth keeping.** A traced-and-named suspect is still a hypothesis.
FLICKER's suspect survived contact with the code; ZOOM's did not, and
fixing the named suspect would have shipped a no-op "fix" while the
real defect stayed. The run sheet's confirm-first instruction is the
cheap insurance that caught it.

**Scope.** `src/main.ts` (applyColour), `src/ui/preview.ts` (onFrame).
Gate green; behavioural verification live in the running app for
FLICKER, by mechanism for ZOOM.

**Link:** Batch C0 continues.

## D158 — STALE-01 closes as accepted; DOCS-01 lands as one command instead of a retired reminder (2026-08-11)

**STALE-01.** Closed **as accepted**, the run sheet's conservative
default, on the owner's own recorded words ("a bit sluggish but can
live with", D148). Sub-2 px edits are invisible to dirty detection by
design and surface via the staleness bound; that is the accepted
trade. The remedy stays on file, not taken: lowering
`DIRTY_MAX_STALE_MS` (`src/capture/dirty.ts:54`, 2000 ms) requires
bench evidence that the extra full-frame comparisons keep the
≥ 4 updates/sec promise — a promise that is now *asserted* by
`bench:auto`, which is exactly why a gateless run must not trade it
for a comfort already accepted.

**DOCS-01.** The investigation flipped the expected outcome. The
item's original suspicion — the macOS Claude *Desktop* app's storage
is unusable — is true (Chromium blobs). But these sessions run on
**Claude Code**, whose transcripts persist as plain JSONL under
`~/.claude/projects/<cwd-slug>/`, fully readable: 52 sessions under
the pre-rename slug alone. So the ritual's failure was never a missing
data source — it was the absence of one command. Retiring the
reminder would have recorded the wrong conclusion.

`npm run transcript` now lists the project's sessions and exports a
chosen one to `_transcripts/` as **redacted** markdown. Redaction is
applied, not promised: the check-secrets key shapes are scrubbed (not
merely reported), data-URIs and base64 runs elide, tool results
truncate to a head — the dialogue is the evidence; full tool dumps
are where screen content hides — thinking blocks and sidechains drop
entirely, and the home path collapses to `~`. Six tests pin the scrub
rules, because a redaction regression is a leak into whatever chat
window a transcript gets pasted into. The output stays gitignored
regardless — redaction here is a floor, and the read-before-sharing
rule stands (`_transcripts/README.md`, updated with the command;
DEV-INFRASTRUCTURE's command table gained the row its own standing
rule requires).

The live smoke test exported this project's *other* current session —
the first transcript ever saved — and caught a D150 residue in
passing: `package.json`'s `description` still opened "Cross Stitch
Lens" (the third of that file's three occurrences; D150 fixed name
and repository URL). Fixed. Pre-rename sessions stay reachable via
`--dir` with the old slug.

**DITH-06 drafted, not applied.** The seven method-led names are in
`tickets/BATCH-C0.md` awaiting signature — method first, the setting
as the qualifier, no mood words ("Atkinson (half strength)",
"Floyd–Steinberg (damped)", "Ordered (Bayer 8×8)"…). Confirmed before
drafting: `sameDither`/`matchBuiltInDither` match on config alone, so
a signed rename is label-only and every existing reference resolves.
The one open flag: two drafted names are longer than the mood words
they replace — re-check the Processing select at the narrow floor at
apply time.

**Also parked:** the audit-after-check flake (2 intermittent failures
when `npm run audit` runs immediately after a full `check`; observed
twice, green on every immediate re-run, failing pair not yet captured)
— one wish-list line with the capture instruction, so the next
occurrence gets named instead of re-run.

**Scope.** `scripts/save-transcript.mjs` (new),
`tests/save-transcript.test.ts` (new, 6 tests), `package.json`
(description fix + `transcript` script), `DEV-INFRASTRUCTURE.md`
(command-table row), `_transcripts/README.md`, wish-list. Gate green.

**Link:** Batch C0's queue is empty but for DITH-06's signature. The
batch's close condition (`check` and `audit` green) is met.

## D159 — DITH-06 signs, and Batch C0 closes whole (2026-08-11)

**Decision.** The owner signed the seven drafted names as presented
("great, commit and push" on the drafted table), and they are applied:
**None · Atkinson (half strength) · Floyd–Steinberg · Blue noise
(boosted) · Jarvis · Ordered (Bayer 8×8) · Floyd–Steinberg (damped)**.
The method leads, the parenthetical is the setting in plain words, and
the mood words retire — the gallery's own naming discipline
(style-descriptive, honest) applied to the place where the method *is*
the fact. The `basis` evidence lines are untouched.

**Label-only by construction, and verified anyway.** Ids are identity
and did not change; `sameDither`/`matchBuiltInDither` match on config
alone, so no saved project or profile reference can be orphaned by a
label. Verified live in the running app: the `dither-profile` select
reads all seven new names with each ref resolving to its "(built-in)"
profile, and the page shows no horizontal overflow — the two longer
names truncate inside the `width: 100%` field rather than widening the
narrow column, which was the one flag raised at drafting.

**Batch C0 closes.** Fifteen items in one day, all shipped, both gates
green (`check` 1,148 tests, `audit` 55). The run sheet
(`tickets/BATCH-C0.md`) is deleted per its own lifecycle; everything
that outlives the batch already lives elsewhere — DATA-01's
corrections half ([maintainer], `tickets/DATA-01.md`,
`docs/catalogue-sweep.md`), A11Y-VO-01's human half, ZOOM-01's
one-line feel-check for the next sitting, and the audit-after-check
flake on the wish-list with capture instructions.

**What the batch was for, settled.** It existed to make a gateless run
trustworthy before Track A: the rename happened before the run wrote
prose, the hot-read docs were made true before anything built on them,
and the audits went green before they were needed as a signal. The
close makes **Track A Current**, and its first move is a human one —
M9's scope sitting (symbol language, the licence question that now
depends on distribution intent, manual-override scope).

**Scope.** `src/core/pipeline/dither-presets.ts` (labels + provenance
note), `tickets/BATCH-C0.md` (deleted), backlog (Batch C0 section
retired, Track A promoted), trajectory (batch outcome + DITH-06),
this entry. `check` green.

**Link:** Track A is Current. Next session: Start A on M9's scope
sitting, full mode — it is a [sign-off] milestone.

## D160 — M9's scope signs in-session, and publication gets its licence baseline (2026-08-11)

**M9 scope signed.** The owner accepted the agent's four
recommendations whole ("accepted"), making the async exchange the
scope sitting. The decisions, recorded in full in `tickets/M9.md`:
**app-owned vector glyphs** (a reviewed ~64-set signed in batches
through the gallery process, refusal past the set — no silent reuse);
the **licence question dissolved** by that choice, decoupling M9 from
ICE-TAURI-01; **overrides from the unused pool only** with explicit
swap (collisions unrepresentable — the M15 membership lesson applied);
and **assignment as identity-keyed persisted state**, which dissolves
the stable-algorithm problem into the project-file pattern the app
already has. The standard-font route died on the ticket's own
machine-independence rule (the chart raster renders with *system*
fonts); the embedded-font route on the fontkit runtime dependency plus
a permanent licence surface. What keeps M9 `[sign-off]` is the glyph
batches — printed-evidence signatures, the D139/D146 process.

**PUB-01 opens, on an audit rather than a worry.** The owner's ask —
licences for public use on their website — was grounded the same hour:
one npm runtime dependency (pdf-lib, MIT © 2019 Andrew Dillon), two
crates in the shipped wasm (wasm-bindgen, libm, both MIT/Apache-2.0 —
libm carries the fdlibm lineage its own licence covers), blue noise
generated in-house (D61: nothing stochastic ships), no Carbon code or
copied icon paths, PDF standard fonts referenced not embedded, demo
images owner-supplied (confirmation of rights is one of the three
owner decisions). `Cargo.toml` already declares `UNLICENSED`;
`package.json` now matches, so the proprietary *default* is explicit
everywhere pending the real decision. **The headline finding: the
GitHub repo is public with no licence** — all rights reserved by
default while fully visible, which is a fine holding position only if
it is chosen rather than accidental. That choice, the demo-image
confirmation, and the catalogue's nominative-use posture are PUB-01's
three owner decisions; the notices file and its in-app surface are
agent work the moment the first is made.

**Structural.** Track C — Publication opens as the home for this and
future deploy/hosting work; M9's and ICE-TAURI-01's backlog lines drop
their now-false coupling.

**Scope.** `tickets/M9.md`, `backlog.md`, `package.json`
(`license: "UNLICENSED"`), this entry. `check` green.

**Link:** M9's build can start gateless up to the first glyph batch;
PUB-01 waits on decision (a).

## D161 — The IP is protected today, the graphic becomes the owner's item, and the catalogue's provenance is corrected (2026-08-11)

**Decision (a) executed: proprietary, now.** "Protect the app IP for
now" is the owner's answer to PUB-01's licence question, and it shipped
the same hour: a `LICENSE` declaring all rights reserved with the
source publicly viewable and contributions unacceptable-by-construction
(no licence exists to merge them under), and `THIRD-PARTY-NOTICES.md`
carrying the three bundled components' verbatim MIT texts — pdf-lib
(© 2019 Andrew Dillon), wasm-bindgen (© 2014 Alex Crichton, MIT elected
from the dual), libm (MIT elected) — sourced from the installed
packages, not retyped from memory. `package.json` and `Cargo.toml`
already both said `UNLICENSED`, so every machine-readable field now
agrees with the human-readable one. The choice is the reversible one:
proprietary-now keeps every option open, including open-sourcing later;
the reverse move does not exist. PUB-01's remainder is the small in-app
surface that makes the notices reachable, plus shipping them with the
deploy when deploying becomes real.

**PUB-02 opens as the owner's item.** `graphic.jpg` is fan art of the
Amiga logo by DeviantArt user zgodzinski — the artist's copyright plus
the Amiga mark beneath it, which is not the artist's to license, so
even permission could not fully clear it. The owner replaces rather
than clears, on their own schedule; the slot needs only a flat-colour
hard-edged graphic, the `PHOTO_SLOTS` filename contract makes the swap
a zero-code change, and fixing HEAD without rewriting history is the
proportionate remedy (the D150 principle). The item gates public
deploy. The five photographs' owner-provenance still needs its one
explicit yes — load-bearing twice, since `landscape-1.jpg` seeded the
M8 golden crop.

**The provenance correction, and what it changed.** The owner
corrected the record: the catalogue's colour values are **compiled
from publicly circulating reference material, uncalibrated** — not
owner-measured, despite every row's `provenance: "measured"` field and
this log's own repetitions of that claim (D145/D155 among them, which
stand as written history). Three consequences, all applied:

- The **notices posture** was rewritten before it shipped: approximate
  compiled sRGB representations, not manufacturer specifications, not
  calibrated measurements, check a physical card before buying. That
  posture is honest *and* defensible — facts and approximations carry
  little protectable weight, the use is free and non-competing, and
  nothing manufacturer-published sits in the repo.
- **DATA-03 reshaped** from "verify measured against published"
  (void — the values were never measured) into finalisation: the
  owner finalises the values post-corrections and the provenance
  label is made honest at that point. Any change to the shipped
  values carries a test cascade — the `p489` matrix rows, the
  gallery evidence audit, and any catalogue-derived expectations
  re-pin under the golden-approval rule.
- The **standing constraint** the correction makes sharper:
  manufacturer-published lists stay out of the repo regardless — a
  committed copy of a brand's own colour card is the one thing that
  would turn a defensible posture into an extraction claim.

Calibrated own-measurement stays what the owner called it: a distant
task in the unlikely commercial event — at which point it also becomes
the clean-room answer to this entire paragraph.

**Scope.** `LICENSE` (new), `THIRD-PARTY-NOTICES.md` (new),
`cspell.json` (notices ignored as verbatim third-party text),
`backlog.md` (PUB-01 decided, PUB-02 new, DATA-03 reshaped),
`tickets/DATA-01.md` (correction block). `check` green.

**Link:** PUB-01's remainder is one small UI task; PUB-02 and DATA-03
are owner-paced; M9's build remains the open invitation.

## D162 — DATA-04 opens: the catalogue's structure gets reviewed before its values finalise (2026-08-12)

**Decision.** A bounded data-structure review of the thread catalogue
is added ahead of DATA-03, so the shape is settled before the values
are — one schema decision, one finalisation, one run of the
regeneration cascade instead of two.

**Why now.** DATA-03's finalisation is the natural moment to change
shape and values together, and the structural questions already exist
rather than being invented for the review: the `provenance` field is
recorded-inaccurate (D161) and needs an honest vocabulary; DATA-01's
21 unnamed rows pose a schema question (is an empty `name` legal, or
does display fall back?); the 3,338 → 2,830 distinct-colour figure
quoted in the protected docs is value-dependent and would drift with
any value change; M12's ticket explicitly anticipates per-brand
catalogue metadata (skein length as data, not formula branches);
`mappedFrom` sits null everywhere while ICE-XREF-01 proposes a
separate long/tidy equivalence table; and the generated catalogue
carries no data version for cache and snapshot hygiene.

**The ripple list is the point of doing it as a review.** Any schema
change touches `build-palette.mjs`, the `Thread` type, every
catalogue consumer — and, the subtle one, palette snapshots inside
saved project files: schema v5 embeds the ordered thread entries, so
a new field crosses into user data and meets the byte-identical
round-trip rule, with migration care to match.

**Scope.** `backlog.md` (DATA-04, sequenced before DATA-03), this
entry. Docs gate green.

**Link:** order of operations in the data cluster is now DATA-01
corrections → DATA-04 schema sign-off → DATA-03 finalisation, all
owner-paced; DATA-02 remains independent.

## D163 — PUB-03 opens: publication cuts from a clean initial commit, and DATA-04 gains the source-of-truth question (2026-08-12)

**Decision.** Two additions shaping how the project goes public.

**PUB-03.** At publication, the public repository will start from its
release state — one fresh initial commit of the finished tree — and
this repository, with its full development history, goes **private as
the permanent archive**. Privatise, never delete: the history remains
the owner's working record, including every decision entry's commit
references, which become archaeology rather than public links. This is
a common release pattern for projects developed personally and
published deliberately, and it has a concrete side benefit: PUB-02's
history residue (the encumbered demo image in old commits) ends at the
cut, because the new repository never contains it — which is exactly
why PUB-02 is a hard blocker: cutting first would re-inherit the
problem into the clean start.

Division of labour mirrors RENAME-02: the owner privatises the old
repository and creates the new one; the agent prepares the release
tree, cuts the initial commit, swaps `origin`, and verifies push and
gate from the unchanged working directory.

**DATA-04 widens by one question**: where the owner CSV's source of
truth lives — in-repo as today, or as a private owner-held master with
the repository carrying derived data. Owner data is owner data either
way; the question is what the published artefact derives from, and the
protected-files list and generator contract would both follow the
answer. It must be settled before DATA-03 finalises values, which is
already DATA-04's position in the cluster.

**Sequencing across the cluster and Track C now reads:** DATA-01
corrections → DATA-04 schema + source-of-truth sign-off → DATA-03
finalisation → PUB-02 image replacement → PUB-03 clean cut →
deploy-when-real. Owner-paced throughout; the agent halves of PUB-03
are mechanical once the owner's two steps are done.

**Scope.** `backlog.md` (PUB-03 new, DATA-04 widened), this entry.
Docs gate green.

**Link:** Track C is now a complete path from today's tree to a
publishable one.

## D164 — Publication stays in this repository; the clean cut becomes a dormant contingency (2026-08-12)

**Decision.** The owner weighed D163's clean-cut republication against
keeping this repository as the one continuous public record, and chose
continuity. PUB-03 is demoted from a Track C step to a dormant Icebox
contingency; PUB-02 and DATA-03 — which were always the items that fix
the tree itself — carry the publication path unchanged.

**The reasoning, on the record.** Three things tipped it. The
development history has real portfolio value: a hundred and seventy
commits of decision-logged, gate-verified work is a public
demonstration of how the project is built, and the cut would hide it.
Operationally, one repository is simpler than a swap. And the
protections that matter for the app's data and assets rest where they
have rested since D161 — on the stated posture in
`THIRD-PARTY-NOTICES.md` and on the replacement items themselves,
which fix what repository visitors and the deployed app actually see.
The residual that the cut would have addressed — that history remains
history — is accepted knowingly, as proportionate for a free personal
application, rather than overlooked.

**Two triggers wake the contingency**, named in the item so the
decision does not need re-deriving under pressure: a rights complaint
touching anything in this repository's history, or the app turning
commercial. On the commercial trigger the catalogue has its own
recorded endgame — first-party measurement of physical threads, which
supersedes the compiled values entirely and retires the provenance
question at the source.

**DATA-03 gains a landing note**: the finalisation lands as one
catalogue rebuild together with DATA-04's schema outcome and DATA-01's
corrections — one data revision, one regeneration cascade, one commit
that says what it is.

**Scope.** `backlog.md` (Track C intro, PUB-03 demoted to Icebox,
DATA-03 landing note), this entry. Docs gate green.

**Link:** Track C now reads: PUB-01 remainder (in-app notices surface)
→ PUB-02 → DATA-01/04/03 in cluster order → deploy-when-real. No cut
on the path.

## D165 — M9's build lands whole: one fill-only geometry model, need-based grants, schema v6 (2026-08-12)

**The build half of M9 shipped in one gateless run**, as D160's
signing intended: the 64-glyph draft catalogue, the assignment model,
project-file persistence, three chart modes across both chart
artefacts, the enriched key, the refusal paths, and the print-evidence
generator. What keeps M9 open is exactly what D160 said would: the
owner's batch signatures on printed evidence.

**Geometry: one path, no stroke.** Every glyph is a single fill-only
SVG path (M/L/C/Z, nonzero winding) with outlines carried as
reverse-wound inner contours — line weight is geometry, so canvas
`Path2D` and pdf-lib `drawSvgPath` cannot disagree about it, at any
scale, with zero renderer configuration. That is the strongest
possible reading of D160's "one geometry model", and it is why the
evidence sheet (vector, through the same `drawSvgPath` consumer the
key uses) signs what the artefacts draw.

**Grants happen at first need, not palette arrival.** "First need
takes the next unused symbol" is read literally: the moment of need is
a symbol-mode export, sequenced in palette order so frame content
never steers assignment. A 100-thread palette whose design uses 30
still exports; the queue only spends on threads that appear. Two
consequences got their deterministic shape here: departures release to
the queue **back** in grant order, and D160's "cross-brand replacement
resets" triggers on **zero surviving grants** — incremental edits
always have survivors, wholesale replacement never does, so no
heuristic and no UI wiring is needed.

**Persistence is schema v6**: a `symbols` block carrying grants, the
queue order (release history is state — it cannot be derived), and
overrides; plus `export.chartMode`. Migration seeds the empty state.
The M14 ui-baseline `projectJson` pin moved for the bump — an intended
schema change, not engine drift; the three engine hashes stand
untouched, which is the tripwire doing its job.

**Key discipline extended, not restated**: rows gained the glyph,
thread name, and stitch count; KEY-01's lesson (D152) now also
suppresses a name that repeats the label (DMC "White" named "White"),
and truncation spends the name before it may touch identity or count.

**Verification**: 1,198 tests green including the new suites (glyph
grammar + pinned canonical order, assignment semantics, v5→v6, chart
coverage refusals, enriched key); live app run confirmed symbol PNG +
PDF exports and the full-RGB refusal sentence. `check` green.

**Parallel note**: D162–D164 (Track C) landed from a parallel session
mid-run; this session's claim (symbols, exporters, schema, M9 memory)
never overlapped, and this entry took the next free number.

**Scope.** `src/core/symbols/*`, `src/core/project.ts` (v6),
`src/core/stats.ts` (STITCH_ALPHA export), `src/export/{chart,pdf,key-entries}.ts`,
`src/main.ts`, `scripts/gen-symbol-evidence.mjs` + `symbols:evidence`
script, tests, `tests/ui-baseline/hashes.json` (projectJson re-pin),
ticket, backlog, two doc-delta captures.

**Link:** M9 remains `[~]` until the batches sign; M10's page planner
can start against the same glyph model.

## D166 — Memory close-out ahead of Track A's next phase (2026-08-12)

**Pruned project memory** on the owner's close-out ask, clearing the
three budget trips the M9 close reported. The live decision log kept
D149–D165 — the current arc, from the roadmap reorganisation onward —
and archived D106–D148 verbatim (43 entries, M14 looks four onward
through the M15 build and the combined M13/M15 close) to
`archive/decision-log-2026-08-06-to-2026-08-09.md`; 60 → 17 live
entries. The trajectory archived its M15 phase verbatim to
`archive/trajectory/trajectory-0005-2026-08-07-to-2026-08-09.md`,
keeping Batch C0 live; 2,477 → 1,700 words. Both splits
diff-verified lossless before the swap.

**The backlog Active tightened** 2,700 → 1,631 words without touching
the queue: all 26 open items, their flags, dates, and Intent/Done-when
lines survive; what left was narrative duplicating decision-log prose
(the Track C audit story, D149 recaps, item asides), and the two
canonical template comments moved from the file's tail to the header
block so the Active count measures the queue, not documentation.
Nothing was cut, merged, promoted, or reordered. The residual ~130
over budget is deliberate: 26 items of mandated ticket grammar is the
floor, per the strip-noise-not-signal rule — the number recovers as
the sign-off-heavy items ship.

**Swept in passing**: the seven ticked doc-delta lines (applied at
D150/D151) deleted per ledger rules, leaving three open; and the
decision log's own title still read the pre-rename product name —
live-file metadata RENAME-01 missed, fixed (archived history stays
untouched, per D150).

**Scope.** `decision-log.md` (split + title), `trajectory.md` (split),
`backlog.md` (tightened), `doc-deltas.md` (sweep), two new archive
files, `archive/INDEX.md`. `check` green.

**Link:** the next session's Start B picks up a lean queue: M9 waits
only on glyph signatures; M11 is the next unstarted build.

## D167 — M11 ships: preset-led grid styling with a screen/print split (2026-08-12)

**M11 shipped in one checkpoint run** — scope and the option pick
signed in-session, stages 3–4 gateless per the mode. Grid furniture is
now preset-led: six built-ins (No grid, Fine, Every 5, Every 10,
Traditional, High-contrast print) applying paired **screen + print**
style blocks, with "Custom" a computed state, never a choice — the
option stays disabled and provenance recomputes on every edit, so
values landing back on a built-in relabel honestly.

**The shape that won (Option A):** flat extension of the one style
model plus immutable in-code presets — over B (grouped model with
per-target overrides: generality M11 didn't need, at real migration
risk) and C (a third kind on the M15 profile shell: disproportionate
for cheap per-design state, and it would widen the draft-then-save
§5.4 exception). Presets live in `src/core/grid-presets.ts` so the
migration can label a file whose values byte-match a built-in; the
project file always stores canonical values — the preset id is
provenance only, so a preset changing in a later release can never
restyle a saved design.

**Schema v7:** `gridStyle` splits into `{ screen, print, preset }`;
migration seeds both halves from the one v6 block (appearance
preserved exactly; untouched files label Every 10). The print half
ends the unit conflation — chart and PDF now read persisted raster-px
style, never DPR-scaled screen values. New fields: per-class colour,
opacity, dashed minors (one batched stroke), an outer border that owns
the boundary (edge-tagged lines).

**A17 closed:** the fixed 24 px preview gutter became `labelGutterPx`
(font size + digit count), shared with the chart margin — which was
itself one digit short at 1024².

**Verification:** `check` green at 1,219 tests (21 new: geometry,
presets-as-signing, v6→v7, layout); ui-baseline `projectJson`
re-pinned for the intended bump with the engine hashes untouched; live
run verified preset application, dash rendering, and a full in-app
save→load round trip carrying `fine` provenance.

**Scope.** `worker/grid.ts`, new `core/grid-style.ts` +
`core/grid-presets.ts`, both renderers, `ui/preview.ts` gutter, the
grid modal in `main.ts`, `core/project.ts` (v7), `shell.css` modal
scroll, tests, ticket deleted.

**Link:** M10 must decide dash phase and repeated numbering across
tiled pages; §16's residue (origins, edges, tick facing, fonts) stays
in requirements for a later slice.

## D168 — M10 ships: the chart PDF paginates from a pure planner (2026-08-12)

**M10 shipped in the autojazz run**, planner-first exactly as its
ticket drew the boundary. `planPages` (new `src/export/pages.ts`) is
pure and exhaustively tested: half-open global bounds, leading-edge
overlap repeated from the previous page, row-major order, impossible
settings returned as user-facing sentences — never thrown.

**Global coordinates, one geometry model:** `gridLines`/`tickLabels`
gained a `startStitch` origin and the chart encoder an `origin`, so a
tile classifies majors and numbers rows by **global** stitch — pages
agree at their joins, and `chartLayout` sizes margins for the largest
global label a tile can carry.

**Assembly:** a cover page (title, colour overview map with the
tiling drawn over it and page numbers in grey, thread key once — the
key drawing extracted to one shared `drawKey`), then one page per
tile at **one shared scale** so a taped-up assembly is ruler-true,
with corner alignment marks, dashed trim lines where leading overlap
repeats, and footers naming page, position, and global range.

**Modes:** `single` (the unchanged default) and `grid` (fixed fresh
stitches per page). Fixed-physical-mm scale is deferred to M16, which
owns print sizing. Schema **v8** adds the paging fields to
`export.pdf`; migration seeds `single`. The `[blocked: M9 for symbol
charts]` qualifier was treated as mechanism-satisfied per D165's own
Link line — glyph signatures affect artwork, never assembly; symbol
tiles reuse `drawSymbols` verbatim.

**Deferred, on record:** vector tile furniture (raster tiles stand),
per-page key policy, A3/custom sizes, fixed-mm scale (M16).

**Verification:** `check` green at 1,240 tests (+21: planner, global
offsets, assembly parsed under node, v8 migration); live run exported
a 200×200 design at 60/page as 17 pages (16 tiles + cover) and the
saved v8 file carries the paging; ui-baseline `projectJson` re-pinned
for the intended bump, engine hashes untouched.

**Scope.** `export/pages.ts` (new), `export/pdf.ts`, `worker/grid.ts`,
`export/chart.ts`, `main.ts`, `core/project.ts` (v8), five test
suites, ticket deleted.

**Link:** the physical tape-and-ruler assembly rehearsal folds into
M16's sign-off sitting; M12 is Track A's remainder.

## D169 — M12 ships: fabric sizing and qualified thread estimates (2026-08-12)

**M12 shipped in the autojazz run**, closing Track A's build half. A
pure estimator (`src/core/estimates.ts`) carries the ticket's model
verbatim: fabric count as stitches per inch over one square, front
geometry `2·√2 × pitch`, a named ×1.2 routing factor for back travel,
a 10% waste share, working strands purchased as `strands/6` of
six-strand floss, and 8 m skeins rounded up **per colour** — colours
cannot share a skein, so the total is the shopping answer, not
`ceil(total/skein)`. No magic constants: every factor is a persisted
setting, and `estimateAssumptions` renders them as the disclosure
sentence the Stats panel shows beside the results ("plan with them,
don't promise by them").

**Surface:** the Stats section gains Fabric size, Cut size, Centre,
and Thread estimate rows plus a Fabric fieldset (count, cut margin,
working strands — routing/waste/skein persist with documented
defaults, hand-editable until a sitting asks for controls). Full-RGB
output says "needs the palette applied" rather than pricing fictional
identities. Per-colour counts ride the existing stats pass.

**Schema v9** adds the `estimates` block; migration seeds the
documented defaults. Deferred, on record: per-colour skeins in the
PDF key and Colours-used rows, an inches/cm display preference, and a
stitcher's review of defaults and wording.

**Verification:** `check` green at 1,255 tests (+15: hand-calculated
sizes, skein boundaries, the per-colour round-up invariant, v9
migration); live run confirmed 200×200 at 18-count reads 28.2 cm and
≈70.2 m — matching the hand calculation — updating live with the
count, and the v9 file carries the block.

**Scope.** `core/estimates.ts` (new), `core/project.ts` (v9),
`main.ts` (Stats rows + Fabric fieldset), tests, ticket deleted.

**Link:** Track A's remainder is human: M9's glyph signatures and
M16's print-defaults sitting — where the estimator's wording review
belongs too.

## D170 — M9 closes on the owner's signature; Track A is build-complete (2026-08-12)

**The owner signed all four glyph batches** on printed evidence
(`bench-reports/m9-symbol-evidence.pdf`, four batch pages plus the
all-64 distinctness page at 3.5 mm). That was the `[sign-off]` D160
reserved and the last gate on M9, so **M9 closes** — and with M11,
M10 and M12 already shipped today, **Track A is build-complete**. The
64 glyph ids and their canonical order were already permanent from
D165; the signature makes the *shapes* final too.

**Two declared residues, placed rather than dropped:**

- The **override UI** was named a v1-optional slice at scope
  (D160-3) and is deferred whole to the Icebox as ICE-SYMBOL-UI-01.
  The model, persistence and swap semantics all exist — only the
  picker is missing, so this is a UI-alone item, not a reopening.
- The **manual print inspection** (every chart mode at minimum and
  typical cell sizes, grayscale/low-ink, key↔chart agreement) folds
  into **M16's sitting** rather than standing alone. M16 is already a
  print-judgement sitting with paper in hand, and it now has real
  multi-page output (M10) and estimate wording (M12) to judge in the
  same pass — three inspections that want one printer session, not
  three.

**PUB-02 gained the owner's replacement plan** (not yet executed):
render the flat-graphic slot as a Blender cube lit by three RGB lights
aimed at the visible corners. That yields both a hue spread and a
luminance ramp across flat faces — precisely the banding-and-
posterisation case the slot exists to test — and being built from
primitives it is wholly self-produced, so the two-layer rights problem
(artist's copyright plus the underlying mark) dissolves rather than
being exchanged for a different one.

**Scope.** `backlog.md` (M9 removed, Track A note rewritten, M16
absorbs the inspection, PUB-02 plan, ICE-SYMBOL-UI-01 opened),
`trajectory.md`, `tickets/M9.md` deleted.

**Link:** what remains of Track A is one owner sitting (M16). Track B
opens next — DUR-01's scope signed the same day (D171).

## D171 — DUR-01's scope signs: restore quietly, steer to save, and put the picture in the file (2026-08-12)

**The owner signed DUR-01's shape**, answering the four scope
questions and adding a fifth the questions had not reached. Track B's
premise — "the app loses your work" — is now a committed change, not
an accepted state.

**Signed:**

1. **Reopening restores the design in progress.** No explicit save
   required, no dialog — the work is simply there.
2. **A history, not one slot** — several recent designs, recoverable.
3. **Explicit save stays the primary act, and the UI steers to it.**
   The owner's reasoning is the durable part and is why the history
   does not make saving redundant: a saved file **survives a system
   clear-out** (the OS may evict browser storage; a file on disk it
   cannot touch) and **is the sharing unit**. Restore is a safety net;
   saving is the act that means something.
4. **The source picture is restored too** — settings alone would
   return a design that cannot be re-rendered.
5. **The picture becomes part of saved files** (the addition): a
   project file carries its own source, so it opens the same design
   anywhere. **A live screen capture freezes** to a still at save time
   — a capture has no file to reference, so the frame becomes one.
6. **Storage is bounded and honest about it**: a limit per project,
   a **warning before a stored picture is evicted**, and an **opt-in
   to keep more** (persistent storage) rather than silent loss.

**Consequences recorded, not yet decided.** Embedding a source changes
what a project file *is* — today it is small readable settings JSON
(§20's premise). The format question is deliberately left to the
option gate: it is user-visible, it is what people hand to each other,
and it is the hard-to-reverse half. One constraint is already fixed by
an existing invariant: **source bytes are stored verbatim, never
re-encoded**, or save → load → save stops being byte-identical.

**Architecture note:** design snapshots get their own IndexedDB store,
separate from library data. `architecture.md`'s persistence row states
the current no-autosave contract and is a protected-doc delta once
this ships — captured, not edited (the existing DUR-01 ledger line
already reserves it).

**Scope.** `backlog.md` (DUR-01 rewritten, `[detail]` added),
`tickets/DUR-01.md` (new).

**Link:** SAVE-01 ships with it (a design's title names its file).
Build starts at the option gate — the file-format pick.

## D172 — PUB-04: GitHub Pages serves the built bundle, not the raw branch (2026-08-22)

**The owner switched GitHub Pages on** to share the app (2026-08-22,
"Deploy from a branch": `main`, `/(root)`) and the live URL served
an empty shell. The raw repository is not the app: `index.html` asks
the browser for `/src/main.ts` — TypeScript, resolved against the
domain root — so nothing loads. The branch deploy also published the
whole tree (docs, project memory, tests, the demo photos) at a public
URL.

**Decision.** Publish the production bundle from CI instead. On a push
to the default branch, a green `npm run check` is followed by a second
`vite build --base /<repo>/` — a project site lives under
`/pattern-mapper/`, and the gate's own build at base `/` stays a build
proof, not the shipped artefact — then `dist` is uploaded as the Pages
artifact and a `deploy` job publishes it. The bundle carries the Rust
engine because `check:wasm` has already built the pkg in the same job.
One runtime string had the domain root baked in — the profile-demo
slot loader — and now reads `import.meta.env.BASE_URL`, pinned by a
regression test under a non-root base. `npm run build` and `vite
preview` keep base `/`, so `bench:auto` and local preview are
untouched. The Pages source must be **GitHub Actions**: a branch
source keeps its own build running and races the workflow on every
push.

**Alternatives.** A committed `gh-pages` branch (build output in git —
the history the D150 posture avoids); a separate deploy workflow
chained by `workflow_run` (a second toolchain install, and a run the
owner correlates by hand); Vite `base: './'` (fragile for the worker
and wasm asset URLs).

**Gates recorded, not waived.** PUB-02 gates public deploy and is
still open — `graphic.jpg` was already live under the branch deploy,
so this change narrows the public surface to `dist` rather than
widening it; the owner's replacement is now the pressing Track C act.
PUB-01's "reachable from the app" clause has a real deploy to ship
with. The bench harness (`bench.html`) rides along in the bundle;
whether it should is parked.

**Scope.** `.github/workflows/lint.yml`, `src/ui/profile-editor-preview.ts`,
`tests/profile-editor.test.ts`, `.claude/launch.json` (a base-path
preview config), `README.md` (live URL), memory files.

**Link:** `DEV-INFRASTRUCTURE.md` § Deployment still reads "post-MVP,
published by the host" — captured in `doc-deltas.md` for the next
doc-sync.

## D173 — ICE-RECOLOUR-01 opens, and the first live-app reports are diagnosed (2026-08-22)

**Context.** The first user feedback since the site went live (D172)
arrived through the owner: "the number of colours limitation is not
honoured" and "must have colours not working". The same message asked
for a review of creative colouring — a pixel editor, a colour swap,
"something that gives users the creative potential to move beyond
realism" — and, later in the session, a target % distribution of
palette colours, strongest at 1-bit.

**Diagnosis, confirmed in the running app before anything was
proposed** (the D157 rule). The count limit was *honoured* on every
path reachable in-session: constraint off → 252 of 489 colours used,
8 → 8, 3 → 3, 12 → 12, a switch to Pastels → 8 of 965; the live pump,
grab, sample, pattern-change and project-load paths read correct. The
report is therefore not reproduced (COUNT-01, blocked on the
reporter's steps or a diagnostics bundle); the named candidates are the
editor's design preview, which renders the whole profile by design
(D116), Must-use seats exceeding the limit, and the one-frame two-step.

Must-use, by contrast, has a mechanism: the search-to-add offers the
entire build, so a thread outside the profile's membership can be
chosen, after which the resolver keeps the seat and emits a Note rather
than filling it — Anchor 403 on the DMC profile, and both seats after a
switch to Pastels, reproduced exactly. That is a contradiction
validated after the fact, the shape UI-STANDARDS says to make
unrepresentable. A second, semantic half: a seat guarantees a palette
entry, never stitches (DMC 666 took 701 stitches with dithering and
157 without; on a picture with nothing near it, none). Both halves are
MUST-01.

**Decision.** Open ICE-RECOLOUR-01 as a `[sign-off]` review item with
the exploration in its ticket: a thread-for-thread **swap layer** (a
pure stage over the index sidecar — presence, which Must-use cannot
promise), a **pixel editor** of cell overrides (after DUR-01: hand
edits must survive the tab), and quantiser controls — tone-only
matching so curated ladders work as two-tone maps, and the owner's
distribution target, exact at two states (a quantile threshold) and
iterative above. Recommended order: swap → tone-only → editor; the
distribution control stays deep-thought. No code changed.

**Alternatives.** Fixing Must-use by scoping its search to the profile
(smaller, but a user who wants a colour the profile lacks is left with
nothing) versus auto-pinning every Must-use into the design's recipe
copy (the D114 (edited)-copy pattern; recommended). Building the pixel
editor first (the largest surface, and premature while the app still
loses work on tab close).

**Scope.** `backlog.md` (MUST-01, COUNT-01, ICE-RECOLOUR-01), three
ticket files, `wish-list.md` (three findings from the trace), this
entry. No product code.

**Link:** ICE-RECOLOUR-01's swap is the presence half of MUST-01;
MUST-01's own fix is the seat half.

## D174 — The owner's project file names the mechanism; DIAG-02 opens (2026-08-23)

**Context.** The owner could reproduce both live-app reports and sent
the saved project (`project-120x60.json`). Its palette block was the
diagnosis: profile `builtin:my-threads`, six Anchor/Ariadna Must-use
seats, `count.n = 8`, and `snapshot: []` — the snapshot is
`config.palette?.entries` at save time, so the palette was null with
Threadify on.

**Mechanism, confirmed by loading the file into the dev build.** My
threads resolves over the inventory of the browser it runs in — not in
the file, and empty here. An empty membership fails resolution,
`resolvePalette` maps failure to `config.palette = null`, and the
pipeline runs full-RGB: the picture not reduced, no seats. The readouts
then mislead by omission: "Colours in use: 3305 · limit 8" (the suffix
keys on `paletteMode`, not the palette), "≈ 12.2 m · 3305 skeins" (the
M12 guard keys on the mode too), six live chips, and one "Problem:"
line carrying the generic profile-empty sentence rather than "your
inventory is empty in this browser". Owning one seat's thread gave
"1 · limit 8" — and exposed a grammar slip in the profile-world count
sentence. The two complaints are one state. COUNT-01 is therefore
reproduced and re-titled; MUST-01 keeps the seat semantics, with the
My-threads variant added. Yesterday's "not reproduced" verdict stood
on the DMC path, where nothing is wrong — the file supplied the path.

**Decision.** DIAG-02 opens, on the owner's instruction: the Debug menu
behind a `?diag=1` opt-in on the live build (the `DIAG=1` flag the
diagnostics contract reserves, after its redaction review), palette
resolutions logged, and a one-click report bundling the project JSON
with the redacted log — the saved file proved to be the evidence, and a
tester would not know to send it. No code changed; the fixes wait on
the owner's pick (state the failure where the picture is, or refuse to
render — the ticket recommends the former).

**Scope.** `backlog.md` (COUNT-01 rewritten and unblocked, DIAG-02
new), `tickets/COUNT-01.md` (rewritten), `tickets/MUST-01.md` (update),
`tickets/DIAG-02.md` (new), `wish-list.md` (one line: My-threads
designs are not portable), this entry.

**Link:** COUNT-01's fix is the presentation of a failed resolution;
MUST-01's is the seat; DIAG-02 is how the next report arrives whole.

## D175 — COUNT-01 ships: a failed resolution stops looking like a render; DIAG-02's opt-in and palette log ship with it (2026-08-23)

**Decision.** The owner asked for "all the quick fixes" from D174, and
they landed as one batch, each a minimal upstream change:

- A profile that resolves to nothing still renders full-RGB — the
  fallback stays, the owner's pick being the recommended "state it
  where the picture is" over refusing to render — but it can no longer
  pass as a palette render: the Stats line reads "3305 · no palette
  applied" instead of "· limit 8" (`colourInUseLine` now tests the
  palette, not the mode), the thread estimate says "needs the palette
  applied" rather than pricing 3,305 skeins (the same correction to
  the M12 guard), and the Colour section's summary states the
  consequence — the picture is shown without threads, and the limit
  and Must-use do not apply — beside the Problem line that states the
  cause.
- The cause is now the right one: `resolveProfileMembership` names an
  empty inventory under My threads ("your inventory has no threads in
  this browser…") — an error when that is the whole profile, a warning
  when other libraries carry it — instead of the generic profile-empty
  sentence whose three remedies were all wrong.
- The profile-world count sentence is grammatical ("resolves 1 colour,
  so it is being used").
- MUST-01's honesty half: the status line after a pick outside
  membership says so, and the Must-use group explains seat versus
  presence. The seat semantics stay the owner's — the item is now
  `[sign-off]`, because auto-pinning reverses M15-CORE-03's "kept and
  explained" rule.
- DIAG-02 shapes 1 and 2: the Debug menu mounts in a production bundle
  behind `?diag=1` — a per-visit URL parameter, not a build flag,
  because the live site is one bundle for everyone — after the
  redaction review the contract reserved (every logger call read:
  sizes, timings, backend names, export options, user-chosen
  filenames, the capture's display label, crop coordinates, browser
  error messages; nothing from storage, no credentials); and
  `resolvePalette` logs every resolution, so the next bundle carries
  the profile, rule, seats, membership, selection and conflicts.

**Verification.** `check` green at 1,262 tests (+6: the inventory
sentences, the opt-in rule, and a first direct suite for the
profile-world resolver, which had none). The owner's
`project-120x60.json` re-run live before and after; a `vite preview`
of the production build shows the Debug menu with `?diag=1` and not
without.

**Alternatives.** Refusing to render on a failed resolution (honest,
but hides the picture the user just loaded); a `DIAG=1` build flag
(would expose the menu to every visitor of the one public bundle).

**Scope.** `src/main.ts`, `src/core/color-profile.ts`,
`src/core/palette-resolve.ts`, `src/ui/colour-section.ts`,
`src/ui/diagnostics-button.ts`, three test files (one new), memory
files, one doc-delta (the diagnostics contract).

**Link:** DIAG-02's remaining shape is the one-click report, on the
`DEV_EMAIL` decision; MUST-01 waits on the seat sign-off.

## D176 — MYTHREADS-01 ships: the empty-inventory dead end gets an exit, and "My threads" becomes "My inventory" (2026-08-23)

**Context.** The reporter's second save (`project-120x60 (1).json`) was
the same null-palette state as the first with the Must-use colours
removed: D175 had made the state honest, not escapable. The owner
signed the ticket's recommendation ("yes, patch it").

**Decision.** Three changes, together:

- **A disabled option with the reason.** While the inventory is empty,
  the profile select lists "My inventory (built-in) — empty: mark
  threads as owned first" as non-selectable; a design already linked to
  it (a loaded file) keeps its option selectable, labelled "— empty in
  this browser". One new fact in the section state (`inventoryEmpty`),
  fingerprinted with the options.
- **A banner beside the picture.** While Threadify is on and the
  design's palette is null, the Preview section shows "No palette
  applies — *the error sentence* The picture is shown as it is." with
  **Use DMC** (adopts the DMC profile through the same `adoptProfile`
  routine as the select — an explicit act, never a silent substitution)
  and **Add threads** (opens the Colour section and the inventory
  reveal, focusing its search; shown only when the recipe draws on the
  inventory). One writer, synced from every palette-changing path:
  `resolvePalette` and both branches of `applyLoadedPalette`.
- **The rename.** The built-in is "My inventory" (id
  `builtin:my-threads` unchanged — saved files reference ids), the
  reveal is "My inventory", the editor's library row reads "My
  inventory — threads you own", and the two D175 sentences follow.

**Verification.** Types, lint, 1,262 tests; live on the reporter's
file: the banner and its sentence appear on load and with a picture
("3305 · no palette applied"), Add threads opens the reveal with the
search focused, Use DMC gives "8 · limit 8" and hides the banner, and
a fresh session shows the option disabled with its reason.

**Alternatives.** Rendering nothing while the palette is null — kept in
reserve if the banner proves insufficient in the field; a silent
fallback to DMC on load (forbidden by D55: nothing is substituted by
name without the user's act).

**Scope.** `src/main.ts`, `src/ui/colour-section.ts`,
`src/core/color-profile.ts`, `src/ui/profile-editor-colour.ts`,
`src/ui/styles/shell.css`, memory; one doc-delta (`docs/ui-spec.md`,
the Preview section's census).

**Link:** both reporter files now open to a one-click way out; MUST-01's
seat semantics and DIAG-02's report half remain open.
