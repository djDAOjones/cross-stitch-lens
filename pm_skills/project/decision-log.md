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

## Archived: D149–D171 (2026-08-11 → 2026-08-12) — see archive/decision-log-2026-08-11-to-2026-08-12.md

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

## D177 — PUB-01 ships: the licences and notices are reachable from the app (2026-08-23)

**Context.** D161 committed `LICENSE` and `THIRD-PARTY-NOTICES.md`; D172
gave the app a deploy to ship them with. What remained was placement
and mechanism; the owner picked the placement, relayed through the
coordinator of the 2026-08-23 parallel run (branch `pub-01`).

**Decision.** A ghost (borderless) **Licences** button after Source in
the shell bar — Carbon's header anatomy, no added height because it
sits in the existing 44 px utility row, and borderless keeps a legal
link subordinate to the product action beside it; visible on first
landing because `applyShell` hides the Source button, never the bar.
It opens a Close-only `formModal`, "Licences and notices", whose first
`h3` takes initial focus so the dialog opens at the top. The two root
files arrive by `?raw` import, so the bundle carries the documents: no
fetch, nothing root-relative, base-path-proof by construction (the
D172 lesson), still fully offline. A ~25-line pure parser renders
headings and wrapped paragraphs, not a `<pre>` dump — the hard-wrapped
MIT texts would force sideways scrolling at 320 px. A test pins each
shipped text byte-for-byte to its repo file; a source guard rejects
`fetch(` and `/LICENSE`-style paths.

**Alternatives.** Beside the build id inside `.header-id` (the header
grows a line at wide widths — the dead space fought at M14-EXT-39 /
ICE-WIDTH-02); an inline link-styled control in the version sentence
(the first non-button control against D50); the Project-section foot
(identity left it at D88); the Debug menu (opt-in only). Declined: a
wide modal variant, and a generic `.button-ghost` in `base.css` —
scoped under `.app-header` until a second ghost earns it.

**Verification.** Gate green at merge (1,276 tests); live in dev and a
Pages-base build: a 91 × 44 px target, an `aria-modal` dialog opening
at the top, Tab trap, Escape restoring focus, dark scheme, no console
errors. Human remainder: native Enter/Space activation, in-dialog
scrolling, a VoiceOver pass (A11Y-VO-01 grows by one).

**Scope.** `src/ui/notices.ts` and `tests/notices.test.ts` (new),
`src/main.ts`, `src/ui/styles/shell.css`, README's licence line,
memory; deltas ledgered for `UI-STANDARDS.md`, `docs/ui-spec.md` and
`docs/ui-evidence.md`.

**Link:** merged as `6b3d839`; Track C's open items are PUB-02 (the
rights gate) and the promoted PUB-05/PUB-06.

## D178 — MUST-01 ships: a Must-use outside the profile pins into the design's colours (2026-08-23)

**Context.** D175 made the seat honest — a Must-use outside the
profile's membership stayed a kept-and-explained Note — and left the
seat semantics to the owner. Picked on the `must-01` branch of the
2026-08-23 parallel run; both decisions relayed through the coordinator.

**Decision.** (b) auto-pin: a Must-use chosen outside membership is
written into the design's recipe copy as an include pin — D114's
"(edited)" copy pattern, "kill that green" mirrored by "I need this
red" — so the resolver's M15-CORE-03 rule changes nowhere. The reversal
is confined to the pick: a *chosen* seat no longer stays outside, while
a seat that *drifts* out (a profile edit, a moved profile on load,
adopting another profile, Revert) is still kept and explained. Built as
pure recipe helpers with thin wiring: `pinIntoRecipe` (include once,
exclusion lifted) and `unpinFromRecipe` measured against the linked
profile's base (drop the include unless the base has it, restore a base
exclusion, never add a base include the copy lacks; no base →
unchanged), so the pick and its undo are one gesture and "(edited)"
stays honest after a remove. Folded, all the owner's: adopting a
profile does not re-pin; Revert stays recipe-only; the empty-inventory
warning is judged once the table is known, so a My-inventory design
resolving through its pins alone still says so (auto-pin would
otherwise hide D176's banner); membership is asked of the resolver
before resolving, never read back from `paletteConflicts` (stale under
FLICKER-01's gate); D175's "unseated" status branch goes as superseded.

**Alternatives.** (a) a membership-scoped search with a "Search all
colours" reveal — a strict superset in code, wish-listed; wiring-only
(a removed seat's pin stayed as residue); a resolver-derived implicit
pin (reverses CORE-03 everywhere, silently widening loaded files);
load-time pinning of legacy seats (indistinguishable from drift).

**Verification.** Resolver and helper tests (DMC and Pastels pins, the
Revert shape, My-inventory + pins with the warning, an unowned pin under
`ownedOnly`), a byte-identical round trip, and the ticket's table live
before and after (Anchor 403 on DMC: 490 colours, no Note, "(edited)",
4,339 stitches reaching Colours used and the key). Gate green on the
merged tree: 1,285 tests.

**Scope.** `src/core/color-profile.ts`, `src/main.ts`,
`src/ui/colour-section.ts`, `tests/color-profile.test.ts`,
`tests/palette-resolve.test.ts`; the MUST-01 ticket deleted; memory. No
doc-delta; the save format is unchanged.

**Link:** merged as `1a2dc42`; presence itself stays ICE-RECOLOUR-01's
swap; DIAG-02 is unaffected.

## D179 — DUR-01 and SAVE-01 ship: `.pmproj` packages, a design history that restores on reopen, title-named files (2026-08-23)

**Context.** DUR-01 as signed at D171, built on the `dur-01` branch of
the 2026-08-23 parallel run; the store-only package was picked at the
option gate and the plan decisions were the owner's, relayed through
the coordinator. The branch owns schema v10.

**The file.** A saved project is a `.pmproj`: a store-only zip holding
canonical `project.json` beside the picture's bytes verbatim (a JPEG
stays a JPEG; a capture frame becomes a PNG once). Fixed 1980 stamps
and a fixed layout keep save → load → save byte-identical. v10 adds the
`source` block `{ entry, type, name }`; v1–v9 `.json` files still load
by magic-byte detection and migrate with `source: null`. The reader
treats a package as untrusted input — sizes checked from the central
directory before any copy, CRCs verified; compressed, encrypted, zip64,
multi-disk and truncated packages refused with a sentence — which is
why `project-package.ts` runs 402 lines against the ~250 trigger.

**The history.** Designs live in their own IndexedDB database,
`pattern-mapper-designs` (never the library's), payloads apart from
metadata so a listing never loads a picture; the memory fallback
announces itself. A 2 s tick observes the serialised state rather than
hooking controls, so no path is missed and no other stream's region is
touched. The latest design returns silently on boot, marked
restored-but-unsaved; a Recent designs picker lists the rest. Bounds:
10 designs / 150 MB, or 25 / 600 MB once `persist()` is granted ("Keep
more designs", offered only near the quota), clamped to half the
reported free space; eviction oldest-first, a never-saved design named
before it goes, no modal — the moment arrives asynchronously. Explicit
save stays the act that means something. Saving a live capture freezes
the frame to PNG while the session stays live; a restored capture
returns as a still and says so.

**SAVE-01.** The Design title names the file
(`Fox-sketch-200x150.pmproj`), the picture's name stands in, a local
timestamp is the last resort.

**Portability.** A loaded design drawing on My inventory gets a
warning naming how many snapshot threads this browser lacks and renders
from its saved colours; embedding the inventory is wish-listed. Found
at the boundary: a fit against a collapsed preview on a 2× display
saved `cssPxPerStitch: 0.025` and the parser refused the file;
`currentProject()` now clamps into the schema's range.

**Alternatives.** Base64-in-JSON and a sidecar pair; a store in the
library database; a confirm modal before eviction; hooking every
control.

**Verification.** Gate green on the merged tree (1,341 tests); live:
byte-identical package round trip, legacy v9 load, naming, the tick,
silent restore after a reload, the picker, a capture saving a PNG entry
while staying live. Human remainder: IndexedDB in Firefox/Safari, the
persist prompt, private mode, eviction at 10+ designs, a `.pmproj` on
another machine, VoiceOver on three new controls.

**Scope.** Five new files (`project-package.ts`, `library/snapshots.ts`,
two suites, a fixture), `project.ts`, `library/store.ts`, `main.ts`,
`tests/project.test.ts`, the ui-baseline pin; the DUR-01 ticket deleted;
`architecture.md` and README updated; deltas ledgered for `AGENTS.md`
and `docs/ui-spec.md`.

**Link:** merged as `fb1aabf`; Track B closes with it.

## D180 — PUB-05 ships: `verify:deploy` proves the live site serves the pushed commit (2026-08-23)

**Context.** D172 left "verify the live URL serves the buildId" as a
manual step. Promoted from the wish-list for the 2026-08-23 parallel
run and built on the `infra` branch; the three delegated decisions
(`--wait` kept, the `.d.mts` sibling, CI wiring) were the owner's,
relayed through the coordinator.

**Decision.** `scripts/verify-deploy.mjs` (`npm run verify:deploy`).
The live `index.html` carries no build id — `__BUILD_ID__` is a Vite
define, so the id lives in the content-hashed entry asset: the script
fetches the index cache-busted (Pages serves it `max-age=600` behind a
CDN), resolves its single `<script type="module">`, fetches that asset
and reads the id; the hashed name means it can never be a stale copy.
SHAs compare by prefix (`git --short` auto-abbreviates and can grow).
The default target is `origin/main` resolved locally — current after a
local push; pass a SHA or fetch elsewhere — and `--wait N` polls every
15 s because a deploy takes ~4 min, which makes
`git push && npm run verify:deploy -- --wait 600` genuinely one
command. One stdout line; exit 0/1/2 = PASS/FAIL/ERROR. Kept out of
`check` (it needs the network); the pure helpers are exported and
unit-tested with the network off, and `main()` runs only when the file
is the process entry. CI runs it in the deploy job after
`actions/deploy-pages` (`--wait 300` against `$GITHUB_SHA`), so a
mismatch reddens the run without un-deploying; no `npm ci` there — the
script has no dependencies.

**Alternatives.** Reading the id from the index (it is not there); a
fetch in the default path (a local push already makes `origin/main`
current — a `--fetch` flag is wish-listed).

**Scope.** `scripts/verify-deploy.mjs`, `scripts/verify-deploy.d.mts`,
`tests/verify-deploy.test.ts` (new), `package.json`,
`.github/workflows/lint.yml`; `DEV-INFRASTRUCTURE.md` deltas ledgered.

**Link:** merged as `1a5efdb` with PUB-06 (D181); first live run
`PASS` from the worktree against the deployed `72d9db7`.

## D181 — PUB-06: the public bundle drops the bench harness; every other build keeps it (2026-08-23)

**Context.** The harness rode into the public bundle because
`bench.html` / `bench-source.html` are unconditional rollup inputs
(D172 parked the question). At a public URL it was a maintainer
instrument with a broken root-relative popup (`/bench-source.html`
404s under `/<repo>/`, confirmed) and a ~2 GiB `?auto=mem` probe.

**Decision.** Option 2, the owner's through the coordinator:
`vite.config.ts` builds `main` alone when `PM_PUBLIC_BUNDLE=1`, set by
the CI Pages-build step; the default `vite build` — the gate's compile
proof and what `bench:auto` / `bench:browser` serve at base `/` — still
carries the harness. Keyed on an explicit env, not `--mode`:
`import.meta.env.MODE` / `DEV` are written into bench reports and gate
the debug panel, whereas the env changes nothing but the input list.
Verified by building both ways and listing `dist/`. For the record, in
D172's framing: the gate's build stays a compile proof, not a
byte-identical artefact proof — the public bundle's chunk graph differs
(shared chunks fold into `main`).

**Alternatives.** Keep shipping it (a partly broken maintainer page at
a public URL); exclude it from all builds (not viable — the harness
exists to measure the production build; dev-server figures are what
M5-PERF-23 gated out after D47).

**Scope.** `vite.config.ts` (`bundleInputs()`),
`.github/workflows/lint.yml`; the latent root-relative popup path is
wish-listed.

**Link:** merged as `1a5efdb` with PUB-05 (D180); the first deploy
after this merge is the first to exclude the harness —
`/pattern-mapper/bench.html` starts 404-ing on Pages by design.

## D182 — ICE-RECOLOUR-01 signs: a swap is presence, a design rule, and a pure stage over the sidecar (2026-08-23)

**Context.** D173 opened the item with three layers and five questions.
The sign-off ran on the `recolour-design` branch of the 2026-08-23
parallel run against `f33a3cb`, after two things moved under the
ticket: DUR-01 merged (D179, schema v10) and MUST-01 shipped as
auto-pin (D178), which closed the seat half and handed presence here.
Every answer was the owner's, relayed through the coordinator.

**Signed.** (1) A swap target comes from the whole universe — every
brand, the generated maps, custom colours, any other palette entry (a
merge) — because a target never enters selection, so it cannot break
what the profile promises, and D178 settled the principle one layer
down; the browse ignores "only threads I own". (2) "Swap…" is the third
verb on the Colours-used row beside Highlight and Remove, opening the
shared browse table in a modal; after X → Y the table shows Y's row
labelled "swapped from X" and Swap… there re-targets — swaps never
chain; a Swaps chip list beside Must-use is the state's second home,
where a dangling swap is kept and explained (D178's drift rule). (3)
The pixel editor paints stills only in v1 — overrides held across
frames, the brush off while frames flow — because cell edits need a
stable picture and DUR-01 made "still" the durable state. (4) Order
A → C1 → B: B depends on A's render palette, A closes MUST-01's
presence half, C1 is stage params only. (5) A swap is a design rule in
`palette.design` beside count, minimum distance and Must-use, never in
the recipe for now — a profile is a composition recipe (D114) and a
recipe-level swap would dangle in every design but the one it was made
for; `from` is the selected entry's id, `to` a full thread record (D55
snapshot semantics).

**Layer A, scoped and picked.** `config.swaps` → `buildStages` derives
a render palette (selected entries, indices unchanged, plus render-only
targets appended in swap order) and an index map, and appends a pure
swap stage after the colour stage only when a swap is active (the
`adjustIsIdentity` precedent — zero cost unused). The stage rewrites
each cell's index through the map and repaints its RGB;
`config.palette` stays the selected palette, so the LUT fingerprint
(D46) is untouched and error diffusion still runs against the matched
colour. The sidecar thereafter indexes the render palette: stats, key
entries, highlight and symbol sync switch to it through one helper.
Persistence is `palette.design.swaps`, schema v11, empty default,
byte-identical round trip; the projectJson baseline re-pins, the engine
hashes must not move.

**Alternatives.** Folding the remap into reduce/dither (touches the
protected colour stages, both backend adapters and the golden/parity
signatures for one fewer O(cells) pass); resolving at the palette layer
(a membership edit in disguise); a reveal under the Colours-used table
for the picker (rebuilt around every frame); B first (the largest
surface, solving the render palette ad hoc).

**Scope.** `tickets/ICE-RECOLOUR-01.md` only (commit `1f8dbe4`); no
product code. Ready to build as schema v11 — the only bump in its round
— in full mode from the plan gate.

**Link:** merged as `86a36e8`; presence closes MUST-01's other half
when A ships; layers B and C1 scope at their own pick.

## D183 — DIAG-02 ships its report: one click saves the settings document and the redacted log, then opens the email route (2026-08-23)

**Context.** D174 opened DIAG-02 from the first live-app reports; D175
shipped the `?diag=1` opt-in and the palette log. The remainder was the
one-click report, waiting on the `DEV_EMAIL` placeholder. Built on the
`diag-02` branch of the 2026-08-23 parallel run. This entry is the
integrator's reconstruction from the branch's commit record and module
documentation — no handoff block reached it.

**Decision.** "Report a problem" leads the Debug menu: one click saves
the project file — the palette half of any report, since its snapshot
is the palette the pipeline actually ran with (D174) — then the
redacted log, then opens a prefilled `mailto:` compose window whose
subject carries the version and build identity and whose body says to
attach both files; `mailto:` cannot attach, so the flow is
download-then-email and the copy says so, and the app stays offline.
The project text reaches the diagnostics module through a host
callback, never an import, so the module never depends on the project
model or its save format: when D179 changed the format underneath, the
only adjustment was in the wiring block — the **settings document
alone** (never the `.pmproj` package with its picture, which is the
tester's screen and must not travel on a click made for a log), under
Save's name (SAVE-01's parts) with a `.json` extension for the person
reading the email. The status line names every file the tester has to
attach — a browser that rations automatic downloads may hold the
second one back, and a named file that did not arrive is noticed.
Failures are stated: a project failure before anything is saved, a
download failure without opening mail. `DEV_EMAIL` stays empty (a
compose window with no recipient still works as a hand-off) until the
owner's **dedicated, retirable alias** lands: the address ships in a
public bundle, so it is never a personal address and never a secret —
a harvested alias is switched off and one line changes.

**Alternatives.** Reaching into the project model from the diagnostics
module (the save format would have broken it mid-round); sending the
package (the tester's picture on a log click); log content in the mail
body (the redaction boundary — a test pins that neither project nor
log content enters the URL).

**Verification.** Gate green on the merged tree (1,362 tests); nine
new tests cover the route order, the log-only case, the redaction
boundary and both failure paths, plus a guard that `DEV_EMAIL` is empty
or well-formed.

**Scope.** `src/ui/diagnostics-button.ts`, `src/main.ts` (the wiring
block), `tests/debug-menu.test.ts`; deltas ledgered for
`DEV-INFRASTRUCTURE.md` and `docs/ui-spec.md`. Open: the alias, the
owner's.

**Link:** merged as `d014e48`; DIAG-02 stays open for the
`[maintainer]` alias only.

## D184 — Pruned project memory: D149–D171 and the Batch C0 phase go to the archive (2026-08-23)

**Decision.** With the round's nine streams merged the live log stood
at 35 entries (budget 20) and the trajectory at 2,763 words (2,000).
Archived verbatim, byte-checked before the swap: decision-log
**D149–D171** (23 entries, 11,544 words — the roadmap reorganisation,
Batch C0, Track C's opening and Track A's build, up to DUR-01's scope
signature) to `archive/decision-log-2026-08-11-to-2026-08-12.md`,
and the **Batch C0** trajectory phase (1,472 words) to
`archive/trajectory/trajectory-0006-2026-08-11.md`; `archive/INDEX.md`
gained both rows. Live: 12 entries (D172 onward — the publication and
live-app era) and 1,299 trajectory words; every trajectory pointer
still resolves. Nothing rewritten.

## D185 — Roadmap refactor: the live-app section folds into Track C and the queue tightens (2026-08-23)

**Decision.** Structural repair, no re-prioritisation. The dated
"Reported from the live app (2026-08-22)" section — by now one
`[maintainer]` item and a narrative that lives in D173/D174 — is
dropped and DIAG-02 moves under Track C (testers on the live build are
a publication concern); the Track A and Track C intros state the
present instead of the past; PUB-02, DATA-01/03/04 and ICE-RECOLOUR-01
are tightened with intent and done-when preserved; the unblock order is
named on the Icebox groups; A11Y-VO-01 records the controls PUB-01 and
DUR-01 added to its list; the file-top paragraph names what remains
(M16 and Track C). Active 1,678 → 1,497 words, 22
items unchanged, no cuts, no merges, no promotions — the wish-list
triage stays the owner's at Start B. No ticket files affected.
