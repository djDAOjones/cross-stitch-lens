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

## D186 — Doc-sync: the five reference docs catch up with the round (2026-08-23)

**Decision.** The ledger held 18 open deltas, every one from this
round or the Track A build; the owner signed all five batches, each
edit derived fresh from its source entry. `AGENTS.md`: the
`ProjectFile` shape at v10 inside a `.pmproj` package (the v6–v10
blocks named) and the Persistence checklist stating the design history
(D165, D167–D169, D179). `DEV-INFRASTRUCTURE.md`: `symbols:evidence`
and `verify:deploy` in the scripts table and under Utility scripts,
the Pages-base preview, the Debug menu with the `?diag=1` opt-in and
the D175 redaction review, `check:docs`'s `bench-reports` exemption,
the conditional rollup inputs, and Deployment rewritten from
"post-MVP" to the live CI pipeline with post-deploy verification (D165,
D172, D175, D180, D181, D183). `UI-STANDARDS.md`: the header utility
row and the ghost button (D177). `docs/ui-spec.md`: the J5 amendment,
"My inventory", and a Live-app amendments subsection (D176, D177, D179,
D183). `docs/ui-evidence.md`: the PUB-01 evidence section (D177).
Applied 18, deferred 0; ticked lines stay until the next prune sweeps
them.

## D187 — DIAG-02's decision record arrives: five owner choices behind the one-click report; DIAG-03 holds the alias (2026-08-23)

**Context.** D183 closed DIAG-02 from the branch's commit record
because the secondary's handoff had not reached the integrator; it
arrived after the round closed. This entry carries the why it held and
applies its backlog instruction: DIAG-02 leaves the backlog as shipped
(all three shapes), its ticket is deleted, and a `[maintainer]` stub,
**DIAG-03**, holds the one remaining act.

**The five choices** (the owner's, through the coordinator, or forced
by the round). `DEV_EMAIL` is a **dedicated, retirable alias** — over
"route kept with no recipient" and "downloads only" — because DIAG-02
exists because the first reports arrived with nothing attached, and
every step that asks a tester to find or type an address loses
evidence; exposure is bounded (no secret; a string in the bundle built
into a `mailto:` at click time, never a DOM href; retirable in one
line; the public repository already carries an author address on the
owner's domain). Rejected: a build-time variable (hides the address
from the repo, not the bundle) and a GitHub-Issues link (needs an
account, cannot attach, makes a tester's project public). **One route,
not two** — a tester sent a `?diag=1` link sees exactly one button.
**Two files, not one** — the project document must stay loadable as-is
(D174's workflow); the cost is Chrome's multiple-downloads prompt, so
the project goes first and the status line names both. **The document,
never the package** — D179's `.pmproj` carries the picture, the
tester's screen, which a one-click report must not send unknowingly;
on load the app says the picture the document names was not inside.
**A callback, not an import** — DUR-01 changed the model and the format
underneath it mid-round and the merge needed one line. "Every conflict"
in the Done-when is met by the palette record's per-conflict kind list;
ids and sentences are not logged (wish-listed).

**Verification (the stream's).** Gate green at 1,362 tests (+10); a
production-shaped `vite build` + `vite preview` under `?diag=1`: one
click produced the settings document (schema 10, the 8-thread snapshot,
the source descriptor) and `pattern-mapper-log.txt` (12 records, the
palette record complete), the status line named both, the JSON loaded
back with the picture-missing sentence, leak probes clean. Human
remainder: the mail client opening with the prefilled body, Chrome's
prompt, the route on the live URL.

**Link:** D183 (the reconstruction) stands; DIAG-03 is the alias.

## D188 — Icebox triage: the creative programme gets scoping of its own, a small UI batch promotes, three items go (2026-08-23)

**Context.** The owner asked for a whole-icebox triage — every item
judged worth doing or not, chunked, the yes/no and the order theirs.
It landed after the 2026-08-23 parallel run merged (D176–D183) and the
prune, refactor and doc-sync that followed (D184–D187), so it judged
the queue as it now stands: MUST-01, DUR-01 and SAVE-01 shipped,
ICE-RECOLOUR-01 signed with layer A build-ready. Nineteen items in six
chunks; the owner agreed the calls with three amendments. The print
scoping (PRINT-01, PRINT-02, PRINT-TEST-01; M16 re-aimed — `838f3e7`)
landed beside it from the Integrator chat and is not re-judged here.

**Decision.**

- **Track D — Creative control of the image opens**, the owner's major
  ask: tickets that give *space and resources* to scoping two
  programmes rather than deciding each candidate at a pick.
  CREATIVE-01 scopes the creative and diagnostic image features —
  tone-only matching, adjustments as a third profile kind, the contact
  sheet as a mechanism, the tonal provenance view, the eyedropper's
  in-app half, the distribution control, the PROFILES-02 hook — and
  PAINT-01 scopes the pixel editor as an editor a stitcher can work
  in. Each is `[sign-off]` with a ticket naming its candidates, the
  questions, the method (two or three sessions, throwaway prototypes,
  evidence on real pictures, a survey of the idiom users bring) and
  what a signature delivers; signed features become Track D items.
  ICE-RECOLOUR-01 narrows to layer A, the build-ready swap; its B and
  C layers moved into the two tickets. ICE-ADJUST-01, ICE-VARIANTS-01
  and ICE-PROVENANCE-01 leave the Icebox as CREATIVE-01's candidates —
  their IDs stay on its line, their intent in its ticket.
- **PICK-01, the eyedropper**, on the owner's ask: pick from the
  picture, the design or (the EyeDropper API, where present) the
  screen; resolve to the nearest threads; feed Must-use, swap targets
  and the inventory. Scoped in CREATIVE-01; its pick-up half in
  PAINT-01.
- **A small UI batch promotes to Next**, gateless-able:
  ICE-SYMBOL-UI-01 (UI only — model and persistence verified),
  ICE-LIMIT-01 with its scale signed (floor 2, ceiling 512, log,
  midpoint ≈ 16 — D149's own words), ICE-WIDTH-01 decided — the floor
  stays 320 px, the app is **designed for 400 px**, and phones are
  still-image users because mobile browsers lack `getDisplayMedia` —
  with the judging left as the item, ICE-WIDTH-02 reshaped (the public
  header drops the width sentence; the readout moves behind `?diag=1`)
  and DATA-05, one tooltip string that implies the catalogue is
  measured (D161).
- **Owner-paced, yes:** A11Y-VO-01 (pairs with M16's sitting) and the
  DATA-01 → DATA-04 → DATA-03 cascade, unchanged.
- **Parked with a named trigger:** ICE-PROFILES-02 (tone-only matching
  ships, or a user asks), ICE-EXPLORER-01 (a user asks), ICE-TAURI-01
  (users want an installable app, or browser capture proves
  insufficient), PUB-03 (as before).
- **Cut:** DATA-02 — closed as cosmetic (a name is decoration, D55/D56;
  real cases surface in DATA-03); ICE-XREF-01 — blocked twice with zero
  data rows, its long/tidy-form design note absorbed into
  ICE-EXPLORER-01's ticket; ICE-WORKSPACE-01 — built for the
  Photoshop-beside-the-app workflow D149 retired, and D53 already
  delivered the real goal.

**Order.** M16's sitting signs the print standard · the small UI batch
· ICE-RECOLOUR-01 layer A · CREATIVE-01 and PAINT-01 scoping (beside the
swap in a parallel worktree) · their signed slices · the Print
programme builds at the end of the cycle, as its scoping says; Track C
and the owner sittings alongside. Nothing waits on DUR-01 any more.

**Alternatives.** Cutting ICE-PROVENANCE-01 (recommended; the owner
kept it). One scoping ticket for everything (the editor would crowd
the features out). Folding the scoping into ICE-RECOLOUR-01 (layer A
must not wait on a programme). Keeping the absorbed items as Icebox
lines (one home, and the word budget).

**Scope.** `backlog.md`; tickets CREATIVE-01 and PAINT-01 new,
ICE-RECOLOUR-01 narrowed, ICE-EXPLORER-01 absorbing XREF, DATA-01 and
ICE-TAURI-01 re-pointed, ICE-XREF-01 and ICE-WORKSPACE-01 deleted;
`doc-deltas.md` (the width posture). No product code; the wish-list
untouched at 52 lines, over its cap — the owner's Start B.

**Link:** Track D's first build is ICE-RECOLOUR-01 layer A; CREATIVE-01
and PAINT-01 close on signatures, not ships.

## D189 — The queue re-orders on the owner's word: the small UI batch, then Track D, then Track C; the print programme parks (2026-08-23)

**Context.** The owner set the order directly, the day D188's triage
landed: the small UI batch first, creative control of the image
second, publication third, and printing into the Icebox. D188's order
had M16's sitting signing the print standard first and the Print
programme building at the end of the cycle.

**Decision.** `backlog.md` Active now reads Current — the small UI
batch (ICE-SYMBOL-UI-01, ICE-LIMIT-01, ICE-WIDTH-01, ICE-WIDTH-02,
DATA-05, unchanged) · Next — Track D (ICE-RECOLOUR-01 layer A,
CREATIVE-01, PAINT-01, PICK-01, unchanged) · Then — Track C (PUB-02,
DIAG-03, both the owner's). The **Print programme parks in the
Icebox** as its own group: PRINT-01, PRINT-02, PRINT-TEST-01 **and
M16** — the sitting is the print standard's signature, its form's
items 2–9 and 13 are already superseded by PRINT-01's model, and the
programme "builds to" the sitting's evidence, so the four move
together. No wake trigger is invented: the group returns to Active
when the owner schedules it. **Track A stays build-complete with its
close deferred** — D170's "on the signed standard, or on PRINT-01
shipping" now waits with the group. The owner's scoping calls (preset
sizes stand, one type scale, no backward compatibility for print
settings, the sitting signs first) live in PRINT-01's ticket; the
backlog lines compress to the Icebox idiom. The duplicated
"Milestones ship in order" header lines are folded to one.

**Alternatives.** Keeping M16 in Current as an owner-gated standing
item (rejected: it would sit above the batch the owner put first, and
a sitting that signs print presets is print work). Track C
"alongside" rather than third (the owner numbered it; its two items
remain owner-owned either way).

**Scope.** `backlog.md`; `doc-deltas.md` gains one line for
`AGENTS.md` § Scope guards, whose "committed fence" sentence predates
both Batch C0's and Track B's ships. No product code.

**Link:** the order stands until the owner moves it; ICE-SYMBOL-UI-01's
"before M16's sitting" is now satisfied by construction.

## D190 — Pruned project memory: the ledger's nineteen ticked lines swept; nothing archived (2026-08-23)

**Decision.** Full sweep against `memory-policy.md`, six entries after
D184. Green: the live log at 17 entries (oldest D172, today), the
trajectory at 1,341 words, `file-map.md` at 4,293 against 293 × 35 =
10,255, every reference doc under its soft guideline bar
`DEV-INFRASTRUCTURE.md` at 3,637 (not a prune target). Over:
**backlog Active** at 2,017 words (23 items) — the D189 refactor took
it to 1,863 by compressing the four parked print lines to their
tickets; the rest is D182/D188-signed wording left verbatim, and the
five small-batch ships will clear it; **`doc-deltas.md`** carried 19
ticked lines from the D186 doc-sync — swept, the 3 open lines kept
verbatim and one added (D189); the **wish-list** at 53 against 25 —
a triage, the owner's Start B, not a prune; **D188** at 659 words
against the ~600 per-entry guard, the newest entry so it cannot archive — noted;
the seven `[detail]` tickets over their soft ~600 words shrink only by
lifecycle eviction. No archive file created; `archive/INDEX.md`
unchanged.

## D191 — ICE-SYMBOL-UI-01 ships: the Colours-used table is the live symbol key, with a picker over the unused pool (2026-08-23)

**Context.** M9 left the manual override as a v1-optional slice
(D170): `setOverride` / `clearOverride` existed in
`src/core/symbols/assignment.ts` with nothing calling them, and
symbols reached the user only inside a symbol-chart export. The owner
ran the small UI batch gateless (`auto-jazz-lite`, D188/D189); the
assumptions below were stated, not gated.

**Decision.** The Colours-used row gains a **Symbol** column — the
key the chart will print, as data, so its header is visible unlike the
control-only Highlight and Remove columns. Each cell is a text button
(the glyph inline in `currentColor` beside its name; accessible name
"{name}: change the symbol for {thread}", the A2 pattern) opening a
Carbon dialog over `runModal`: a grid of every **unused** glyph in
catalogue order (D160-3 — a collision is as unrepresentable from the
UI as from the model), "Let the app choose" when an override is
recorded, Cancel. **Grants happen live** as frames arrive, in palette
order, **only while every palette entry could hold a symbol**
(`entries.length ≤ 64`): past that, live grants would let threads that
came and went exhaust the queue and turn a later export into a refusal
the export-time grant would never have made, so larger palettes keep
D160's "export is the moment of need" and read "Auto". The column is
absent — not full of "Auto" — without a thread palette or per-stitch
identities. An override is project data in the `symbols` block, so
the history and a save carry it with no new wiring (D179). The table
rebuild now restores focus to the same row and slot — the picker's
return-to-invoker was landing on a replaced button, and a Highlight
pressed mid-capture had the same hole.

**Not built.** The explicit swap (taking another thread's symbol)
needs a model verb; wish-listed. Catalogue order, not queue order, for
the pool: the queue reshuffles as symbols are released.

**Verification.** Gate green (+8 tests: the pool, the row's glyph
before and after a grant, save → load → grant with the override
winning). In the running app: live key on the sample picture, pick →
row and status update with focus kept, "Let the app choose" clears the
override, a real `.pmproj` save → disturb → load restored the chosen
glyph, Threadify off hides the column and on brings the grants back.

**Scope.** `src/ui/symbol-picker.ts` (new), `info-panel.ts`,
`modal.ts` (exports `runModal`), `main.ts`, `shell.css`;
`tests/symbol-picker.test.ts`. No schema change.

## D192 — ICE-LIMIT-01 ships: the colour-limit slider is a log scale, 2–512 with 16 at the midpoint (2026-08-23)

**Context.** The slider stopped at 64 with a "type here for more"
helper, linear, while the number input reached 512 (EXT-13, D98). D188
signed the scale in D149's words — floor 2, ceiling 512, log, midpoint
near 16 — with the stored `n` unchanged so old projects load as they
were. Gateless run; the choices below are assumptions.

**Decision.** The range's value is a **position** (0–300) on two log
segments meeting at 16 — 2→16 across the left half, 16→512 across the
right — so the region most designs live in gets half the travel and
the midpoint is exactly 16 (a single log scale 2→512 would put 32
there). `sliderToCount` / `countToSlider` are pure exports of
`colour-section.ts`; the number input stays the exact handle (its
1–512 bounds untouched — "the number input already reaches 512"), the
helper now says so, and `aria-valuetext` speaks the count, never the
position. **300 steps**, not thousands: every whole count below ~40
is one position apart and an arrow key still moves ≈ 1.4 % low /
2.3 % high; a finer grid would make the keyboard crawl from 2 to 3
through dozens of presses for a control whose exact handle sits
beside it. A position that rounds to the count already set does not
re-select — the wish-list's per-step refetch cost (COUNT-01) would
otherwise be paid many times at the low end, where many positions
share one count.

**Verification.** +5 tests pin the anchors (0→2, 150→16, 300→512),
the geometric quarter points (6, 91), monotonicity, an exact round
trip for 2–40 and one-step tolerance above, and clamping (a loaded
`n` of 1 shows at the floor). In the app: 8 sat at position 100, the
midpoint produced 16, a typed 157 moved the handle to 249.

**Scope.** `src/ui/colour-section.ts`; `tests/count-scale.test.ts`.
`docs/ui-spec.md` and `docs/ui-evidence.md` still say 1–64 — a
doc-deltas line.

## D193 — ICE-WIDTH-01 and ICE-WIDTH-02 ship: the shell judged at 400 and 320 px, three overflow causes fixed; the width guide goes behind the diagnostics rule (2026-08-23)

**Context.** D188 decided the posture — the floor stays 320 px, the
app is *designed for* 400 px, phones are still-image users — and left
the judging as the item; ICE-WIDTH-02 reshaped the header's width
sentence as a maintainer aid. Gateless run, judged in the automated
browser on the sample picture with every section and reveal opened.

**What failed, and the fixes.** At 400 px the page scrolled
horizontally for three independent reasons, none of them layout
design: (1) `width: 100%` text, number and search inputs were
`content-box`, so their 1 px borders ran 2 px past every panel —
`box-sizing: border-box` on that rule; (2) the Colours-used table's
visually-hidden header text (absolutely positioned) escaped the
scrolling `.info-panel` and stretched the document to the table's
619 px — the panel is now `position: relative`, the containing block
the scroll box was assumed to be; (3) the browser default
`fieldset { min-inline-size: min-content }` let one long nowrap thread
name in a browse row widen the whole Colour fieldset to 430 px, so the
rows' `min-width: 0` + ellipsis never applied — reset to 0. At 320 px,
with those in, nothing overflowed and every pointer target held 44 px;
the one visible fault was the browse rows' "Must use" buttons wrapping
to two uneven lines — `flex: none; white-space: nowrap` on the row's
buttons sends the squeeze to the name's ellipsis instead. The preview
keeps 298 of 320 px.

**The width guide** (M14-FIX-04, a status-line announcement on a
resize burst below 960 px) now registers only when the diagnostics
control does — D175's rule: every dev build, production only behind
`?diag=1` — so the public header is the two lines shorter. Verified on
the built bundle: silent at `/`, "Window 400 px wide — works down to
320 px." at `/?diag=1`.

**Left as is.** The Colours-used table scrolls inside its panel at
every width by design (UI-STANDARDS → companion-window baseline); no
new ticket.

**Scope.** `src/ui/styles/base.css`, `src/ui/styles/shell.css`,
`src/main.ts`. No tests: CSS containment is browser-verified; the
a11y and contrast gates are unchanged. `docs/ui-evidence.md` FIX-04 /
EXT-39 rows predate the gate — a doc-deltas line.

## D194 — DATA-05 ships as three strings: the mapped-colour tooltip stops implying a measured catalogue; the Design title says it names the file; the chart readout counts the gutter (2026-08-23)

**Context.** DATA-05 was one tooltip — "colour mapped, not measured"
on generated colours, which implied the catalogue rows *were* measured
(they are compiled and uncalibrated, D161; DATA-03 relabels the
provenance vocabulary later). The wish-list triage surfaced two more
strings of the same size and the owner's gateless batch took them
together.

**Decision.** The tooltip now says where a mapped colour came from —
"colour mapped from its DMC equivalent" — and nothing about
measurement; the `Provenance` type's `'measured'` label is DATA-03's
to rename and is untouched here. The Design title field gains the
helper "Printed on the PDF; also names the saved project file." — its
second job (SAVE-01, D179) was invisible from the field. The
export-size readout's chart figure is now the file's real canvas:
`chartLayout` with the cell clamped as the export clamps it, so label
gutter and edge padding are counted — the M16 pack read "chart
2000 × 2000 px" beside a 2037 px file. Because the print half of the
grid style sizes that gutter, print-half edits and grid presets now
refresh the section readouts.

**Verification.** `info-panel.test.ts` asserts the new wording and
the absence of "measured"; in the app the readout said 2037 × 2037
and the exported PNG decoded at 2037 × 2037; the helper is wired by
`aria-describedby`.

**Scope.** `src/ui/info-panel.ts`, `src/main.ts`,
`tests/info-panel.test.ts`. `docs/ui-spec.md` § 280 still quotes the
old mapped-colour helper — a doc-deltas line.

## D195 — FIT-01 and GRID-DPR-01 ship: the zoom bounds are CSS px at any density; the grid style and the preview surface follow a device-pixel-ratio change (2026-08-23)

**Context.** Two wish-list defects from DUR-01 and M11, promoted into
the gateless batch. `viewport.ts` clamped its scale in device px
(0.05–64) while the schema bounds `cssPxPerStitch` in CSS px with the
same numbers, so on a 2× display a collapsed preview fitted at
0.025 CSS px — below what `parseProject` accepts; the save path
clamped it, the fit kept producing it — and the zoom ceiling halved
to 32 CSS px. Separately `sendGridStyle` premultiplied
`devicePixelRatio` but re-sent only on a colour-scheme change, so a
window moved to a display of another density kept stale line
thickness and tick font until the next style edit.

**Decision.** The viewport's bounds are declared **CSS px per stitch**
and every clamp (`fitView`, `scaledView`, `zoomAt`, `clampScale`)
takes the ratio, defaulting to 1 so the module stays pure and its
existing tests stand; the controller passes
`window.devicePixelRatio` at its five call sites. A test pins
`MIN_SCALE`/`MAX_SCALE` equal to the schema's constants so the two
modules cannot drift apart again. For the ratio change: there is no
DPR event, so a media query for the current ratio
(`(resolution: <ratio>dppx)`) fires once when it stops matching and is
re-armed for the new one; it re-sends the grid style and calls a new
`PreviewController.displayChanged()` (re-size the backing store,
re-derive the device-px view from the CSS values the controller
keeps — a manual zoom re-centres, which a display move can bear).

**Verification.** +3 viewport tests (a collapsed fit lands at the CSS
floor at 2×, a zoom reaches the CSS ceiling at 2×, the constants
match). In the app at DPR 2: forty Zoom-in presses read 6400 % and
forty Zoom-out presses 5 % (3200 % and 3 % before). The DPR change
itself is a human check — drag the window between displays of
different density and watch the grid's line weight hold.

**Scope.** `src/ui/viewport.ts`, `src/ui/preview.ts`, `src/main.ts`;
`tests/viewport.test.ts`.

## D196 — CAPTURE-END-01 ships: an externally ended capture is named above the preview, not only in the status line (2026-08-23)

**Context.** The owner's sitting (D134) found "Screen capture ended
(sharing was stopped)." truthful but easy to miss — a one-line status
in the header while the eye is on the preview, which keeps showing
the last frame as if nothing happened. The wish-list carried it as a
toast-versus-banner taste call; the gateless batch took it.

**Decision.** A project-coded **Carbon inline notification**
(`src/ui/notification.ts`): one sentence, an informational left edge
in the interactive blue (a non-text pair on layer-01, now registered
in the contrast contract), a text **Dismiss** button, `role="status"`
so showing it announces once without stealing focus. It mounts above
the preview beside the palette banner — the region the user is
looking at — and shows only when the share ends **from outside the
app** (the browser's stop control, the shared window closing): "Screen
capture ended — sharing was stopped. The last frame is kept as a
still; choose Source to capture again." The user's own Stop needs no
notice. It hides on Dismiss (focus to the preview host, never to
body) and when the next design begins. A toast was rejected: it moves
and times out, which is the failure mode being fixed; an inline
notification stays until acknowledged and costs the header nothing.

**Verification.** Gate green; in the app the element mounts hidden in
the right place, and the component shows, announces, dismisses and
returns focus as designed, driven through the dev server's module
graph. The trigger itself — a share ended from the browser's own
control — is a human check.

**Scope.** `src/ui/notification.ts` (new), `src/main.ts`,
`src/ui/styles/shell.css`, `src/ui/styles/tokens.css` (one `@pair`).
`docs/ui-spec.md` / `ui-evidence.md` describe the status line alone —
a doc-deltas line.

## D197 — Wish-list triage: 48 lines promoted or cut, the inbox empty; the gate riders queue ahead of the next worktree round (2026-08-23)

**Context.** The wish-list stood at 52 against its cap of 25 through
two prunes (D188, D190) that deferred the triage to the owner's Start
B. This session's Start B presented every line in seven chunks with a
call each; the owner ran the UI work first and then asked for
everything tied up for a fresh chat, which takes the calls as
presented — each below is reversible by re-adding a line.

**Cut (25).** The twelve **spec §25 / "later" lines** — order editor,
CIEDE2000 and weighting, preview modes, camera input, fabric
simulation, ScreenCaptureKit, SVG/CSV/ZIP, embroidery formats,
Photoshop revisited, cloud, export presets, optimisation modes — were
a copy of `docs/requirements.md` §25, which remains their home; two
ideas in them were worth carrying (below). Gate and bench lines with
no trigger: clippy/rustfmt in the gate, the browser-mode runner, the
manual `?backend=` override, bv2 per-row taint, the occlusion flag,
the harness master-image gap, the synced-tree cache relocation.
Retired premises or accepted behaviour: the companion-window
rehearsal (D149), semi-transparent dither participation, the
document-size modal, Must-use membership marking and
remove-after-exclusion (D178), the `resolvePalette` log widening, the
retired policy-world resolver (D124 keeps the record), and the M10
residue (A3, true-size page, per-page key are PRINT-01/02's).

**Promoted.** To **Current**, ahead of Track D: **INFRA-02**, four
gate one-liners (`bench-source.html` base path, `check:docs` standing
alone, `eslint` over `bench-reports/`, `verify:deploy --fetch`) — each
bites the worktree round Track D's scoping opens. To the **Icebox**, a
parked-follow-ups group with a trigger each: INFRA-03 (audit flake,
stale wasm pkg), CAPTURE-OMT-01 (off-main-thread capture, D135),
COUNT-02 (re-select against the held source), DUR-02 (deflate
`.pmproj`), DUR-03 (history management, re-capture on restore),
DIAG-04 (one-file report), SYMBOL-SWAP-01 (D191's swap verb). Into
**tickets**: CREATIVE-01 gains re-pick-from-frame, recipe-level
"render X as Y" and the finished-stitch view as candidates 9–11;
PRINT-01 absorbs the M12 key residue, print-from-phone, the
accessibility face, SVG/CSV/ZIP and vector furniture;
ICE-RECOLOUR-01 takes the stats race as a build-time must-fix and the
inventory-in-file as a plan-gate question. Swap-to-fabric was already
PAINT-01's Q10. Seven lines shipped in the batch (D191–D196).

**Cost.** Backlog Active rises to ~1,900 words / 26 items against
1,500 — the parked group is terse by design and the Refactor D190
proposed stands; the wish-list is at 0 against 25.

**Scope.** `wish-list.md`, `backlog.md`, three tickets. One handoff
from the Icebox-triage chat at its close: the generated
`docs/catalogue-sweep.md` still named DATA-02 as a parked class — its
writer (`tests/audits/catalogue.audit.test.ts`) now says "closed as
cosmetic (D188)" and the sweep was re-run; the data half is unchanged.

## D198 — INFRA-02 ships: four gate riders fixed and proved green in a fresh worktree (2026-08-23)

**Context.** D197 queued four one-liners ahead of Track D because
each bites the worktree round its scoping tickets open: the bench
harness popup was root-relative, `check:docs` on its own failed in a
fresh tree, `eslint .` linted gitignored `bench-reports/`, and
`verify:deploy` resolved `origin/main` from whatever the checkout last
saw. Run gateless (auto-jazz) as the item's line allows.

**Decision.** (1) `src/bench-browser.ts` opens
`${import.meta.env.BASE_URL}bench-source.html` (the `SOURCE_PAGE`
constant, also named in the popup-blocked messages) — identical at
base `/`, where `bench:auto` serves, and `/pattern-mapper/bench-source.html`
in a `--base` harness build. (2) `scripts/check-docs.mjs` adds
`crates/stitch-engine/pkg` to its generated-output ignore class beside
`bench-reports/`: the folder is gitignored and `check:wasm` builds it
only where a Rust toolchain exists, so citing it is a statement about
the build, not a reference that can rot; the alternative — rewording
`docs/acceptance-matrix.md` — was rejected because `matrix:write`
generates that file. (3) `eslint.config.js` ignores `bench-reports/**`
(the `m16-sitting/geometry.mjs` probe was in the lint set; 226 → 225
files). (4) `verify:deploy --fetch` runs `git fetch --quiet origin`
before resolving the target, an ERROR with git's stderr when the fetch
fails; `--fetch=value` is a usage error. Assumption stated at the
skipped gate: the remote is always `origin` — a non-origin target
(`upstream/main`) would still resolve locally; derive the remote from
the ref if that day comes.

**Verification.** Stock HEAD in a fresh worktree reproduced rider 2
(`docs/acceptance-matrix.md:46 missing path`); with the patch applied
the full `check` ran green there — `cargo test` + `wasm-pack`, 1,378
tests, build, docs — and a `--base /pattern-mapper/` build carries the
base-prefixed popup path with no root-relative leftover. Live:
`verify:deploy --fetch` → PASS against `92405d8`. Worktree and branch
removed afterwards.

**Scope.** `src/bench-browser.ts`, `scripts/check-docs.mjs`,
`eslint.config.js`, `scripts/verify-deploy.mjs` + `.d.mts`,
`tests/verify-deploy.test.ts`, one stale phrase in `vite.config.ts`'s
bundle-inputs comment. `DEV-INFRASTRUCTURE.md`'s `verify:deploy` rows
do not yet name `--fetch` — a doc-deltas line.

## D199 — ICE-RECOLOUR-01 ships: the colour swap is a pure stage over the sidecar, a design rule at schema v11, and a verb on the Colours-used row (2026-08-23)

**Context.** Signed and optioned at D182, narrowed to layer A at
D188; built in full mode from the plan gate, the owner approving the
plan's four defaults and its validation in one sitting. Closes
MUST-01's presence half: a user can now say "*this* thread, *here*"
for every stitch the mapper gave one colour.

**Built.** `src/core/pipeline/swap.ts`: `renderPalette()` derives the
render palette — the selected entries, indices unchanged, then every
render-only target appended by id in swap order — plus an index map
applied exactly once per cell, which is the no-chain rule by
construction (an appended target can never be a `from`); a target
already selected is a merge. `buildStages` appends the stage to the
colour group only while the map changes something (the
`adjustIsIdentity` precedent), so under `reduce-first` it runs at
source resolution before the resize drops the sidecar.
`PipelineConfig.swaps` is optional (absent = none) so the twenty-eight
config literals in tests and bench stayed untouched; the persisted
`design.swaps` is required at v11 — `{ from, to }` with `to` a full
record (D55), unique `from` refused on read, the list capped at
`MAX_PALETTE_ENTRIES`, v10 → v11 seeding `[]`. `config.palette` stays
the selected palette: LUT, candidates, both backends and every golden
hash unmoved; only the `projectJson` baseline pin moved. Every
sidecar reader in `main.ts` — stats, key, highlight `indexFor`,
symbol grants and sync, `symbolTableFor` — goes through one
`renderPaletteOf()`; a frame's stats read against the config *it ran
with* (`FrameResult.config`), which is the D197 stats-race fix.

**UI.** Swap… is the third verb on the Colours-used row; a target's
row reads "swapped from X" as visible text and Swap… there
re-targets every swap onto it (a merge target's own swap needs the
chip removed first — the signed wording taken literally); a
render-only target has no Remove. The picker is a `runModal` over the
shared browse table, the whole universe, ownership ignored. A Swaps
chip list sits under Must-use, shown only once a swap exists; a
dangling swap reads "(X is not in the palette now — kept)". Focus
follows a swapped thread's stitches to the target row after the
frame rebuild (found in the browser pass, fixed in the panel).

**Verification.** 1,407 tests (29 new: stage, config placement,
executor render-space sidecar, v11 round trip / migration / refusals,
swap through the real export route, row notes); gate green. In the
app: merge and render-only swaps, re-target, highlight on a target,
`.pmproj` save → load with the swap, the design history restoring
it, dangling on a count change, Threadify off/on, a symbol-mode PDF
keyed against the render palette (8 entries, no refusal), the swap
stage at ~2 % of a frame. Human remainder: the modal's Escape and
focus return under a real keyboard, VoiceOver over the chips.

**Assumptions at the gates.** Inventory-in-file stays out (its own
bump); the cap is on the list, the render palette bounded by
construction; a multi-source target re-targets all its sources at
once.

**Scope.** `swap.ts` (new), `config.ts`, `project.ts`, `client.ts`,
`main.ts`, `info-panel.ts`, `colour-section.ts`; seven test files +
`tests/swap.test.ts`; `hashes.json`. Deltas ledgered for `AGENTS.md`,
`architecture.md` and `docs/ui-spec.md`; README updated. The ticket
is deleted with the item.

## D200 — CREATIVE-01 signed: the creative programme is five slices, tone mode first (2026-08-23)

**Context.** The scoping ran five discussion rounds (2026-08-23),
then two prototypes on the worktree branch `creative-01-proto`
(`7897ff2` → `9041fae`, pushed to origin): tone mode, and the
contact sheet grown to a second axis carrying the nine slice-2a
adjustment-preset candidates. The owner signed the programme on that
evidence the same night; findings live in the ticket's two
"Prototype findings" sections, artefacts in the worktree's
`bench-reports/`.

**Signed.** The programme exactly as consolidated in the ticket's
"Scoping state after discussion rounds 1–5": slice 1 **tone mode**
(schema v12; folds C1, C2's two-state case, the provenance strip,
re-pick-from-frame and the colour-use floor); slices 2a/2b
**adjustments** as the third profile kind (v13); slice 3 the
**eyedropper** (PICK-01, no bump); slice 4 the **contact sheet** (no
bump); slice 5 the **match-error compare** (no bump). Parked with
triggers: mid-slider shares, the L/C/H split, posterise,
recipe-level swaps, finished-stitch preview, the N-D distribution;
PROFILES-02 wakes when slice 1 ships. Cut: brightness, contrast,
gamma, threshold, global hue shift — the curve, the mixer and tone
mode cover all five.

**The prototypes' calls stand as decisions.**

- Tone-mode dither diffuses error in the weighted space (curved L,
  w·a, w·b). Measured: reusing the sRGB error path leaks hue into
  lightness at 6.88 L\* column spread vs 2.28 weighted (σ 2.42 vs
  0.32) on the constant-L hue sweep; L\* bias 7.31 vs 0.03 on
  landscape-1.
- Quantile shares are exact undithered up to flat-region ties (2–3 %
  on the sample card); dithered they drift 12–32 % — so the ramp
  readout shows **achieved** shares whenever dither is on, never a
  restated target.
- The count-limit selection carries the same weight as matching: the
  prototype's greedy copy at t = 0 equals production selection
  exactly, and at t = 1 it discovers a lightness ladder (L\* 9–92)
  from the whole catalogue.
- The contact sheet is a mechanism: the second axis cost one
  variant-list branch; each adjustment cell re-selects its palette
  from the adjusted picture, and every candidate changes 3–8 of the
  8 picks (Mono prep re-picks all eight as near-greys). Budget:
  30–60 ms per cell at 300², selection included.
- Two constraints for the shipped sheet: an occluded window suspends
  `requestAnimationFrame`, so the render loop must not yield on
  frames alone; and a backgrounded renderer QoS-throttles ~30×
  (D136's effect seen live) — together the case for the worker
  route.

**Open, owned by the building slice** (none reopen the signature):
tone mode's user-facing name and the ladder naming (survey
neighbours: gradient map, duotone, colour ramp, ombré set); the
floor's unit and final label; the confetti-note wording; the ramp
control shape (the histogram-backed strip read better on
photographs); modal vs panel for the sheet (modal fits the 400 px
shell); ADJUST-02's saturation-range remap flavour; the adjustment
starter set's final membership and names (the nine candidates are
evidence, not signatures).

**Bookkeeping.** CREATIVE-01 closes on the signature, as its
done-when says. TONE-01, ADJUST-01, ADJUST-02, SHEET-01 and
COMPARE-ERR-01 join Track D in slice order; PICK-01's line becomes
slice 3. The ticket file stays as the five items' shared spec (the
D149 shared-file exception) and is deleted with the last slice.
PAINT-01 still scopes separately.

## D201 — TONE-01 builds: tone mode is one weighted metric through matching, selection and dither, at schema v12 (2026-08-24)

**Context.** Slice 1 of the signed creative programme (D200); the
scope and design were signed in CREATIVE-01, so the checkpoint gates
were pre-satisfied by the ticket and the build ran gateless against
its decisions of record. The prototype's central call — dither must
diffuse error in the weighted space — is now production behaviour.
The item stays open ([~]) on its owner half: mode name, floor
label/unit, confetti wording and ramp shape are working labels until
the sitting settles them.

**Built.** One weighted metric, engaged only under 'lab' and only
when the weight or curve departs from default — disengaged tone runs
none of the tone code, which is what keeps t = 0 byte-identical
(engine baseline hashes unmoved; only the projectJson pin moved, the
v10/v11 precedent). `src/core/color/tone.ts` owns the space: w = 1−t
scales a/b, the three-point curve remaps picture lightness only,
ladder order is L*-ascending with natural cuts at rung midpoints,
custom cuts bind at the end-stop alone and degrade to natural on a
palette-size mismatch. Matching, LUT build (key carries the tone
fingerprint — D46 made literal), count-limit selection and both
dither families all work in that one space; the candidates table is
skipped under tone (plain-Lab proof), the GPU LUT routes to TS, and
wasm dither is routed *and* clamped away. Threshold dither perturbs
curved L at 100/255 of the sRGB amplitude — a stated working
assumption, published in the audit, not asserted. Selection curves
the distribution's lightness too (the prototype did not — the
decision of record's "same objective as the render" argument wins);
the minimum-distance rule deliberately stays in plain Lab: it
promises perceptual spacing of bought threads, and the scaled space
would call two same-lightness hues distance zero. The colour-use
floor drops the worst under-earner one at a time over the selection
distribution (locks exempt, never below one colour, works with and
without a count limit) and its sentence names the count dropped and
both ways out. Schema v12: `pipeline.tone` {weight, curve, cuts} and
`palette.design.floor`, v11 files seeded disengaged/off.

**UI.** The tone group mounts in the Colour section after Minimum
distance (the inventory's host-owns-plumbing pattern): the colour↔tone
slider; the ramp strip — histogram over band colours on canvas, cut
handles as 44 px sliders live at the end-stop, the band list as the
DOM mirror with *achieved* shares from the rendered frame (never
targets; a merge-swapped rung honestly reads "swapped"); Equalise and
Reset cuts; the three-point curve behind a reveal (pointer + arrows +
native number inputs); re-pick from current frame (disabled with its
reason outside live capture); the floor toggle + stitches input; one
suitability heuristic driving the ladder offer and the confetti
caution, never a block. The selection source is now fetched whenever
the count limit, the floor or tone needs it, and re-pick is
invalidate + refetch of the same buffer.

**Verification.** `check` green (1,450 tests; 62 new). The production
audit reproduces the prototype's numbers on the shipped paths
bit-for-bit — hue-sweep FS spread 2.28 L*, σ 0.32, bias −0.01 (the
sRGB error space measured ~6.9); Equalise 2.3 % drift undithered,
29.2 % under FS; catalogue selection at t = 1 spans L* 8–92 —
artefacts `bench-reports/audit-tone-01-<sha>.json` +
`tone-01-gallery-<sha>.html`. Live in the app: end-stop re-selection
to a ladder, Equalise, the floor drop with its sentence, curve
inversion, and a `.pmproj` round trip restoring weight, curve, cuts
and floor. Human checks left: keyboard activation of handles/points
and the four naming items.
