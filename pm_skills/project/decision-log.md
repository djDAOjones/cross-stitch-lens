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

## D1 — Web platform, not Max/MSP, not native (2026-07-16)

**Decision:** Build as a TypeScript web application.
**Why:** Development is AI-assisted (Windsurf + Anthropic API); LLMs
have maximum leverage in TypeScript and near-zero in Max patching.
Web covers macOS-first now and wider distribution later (URL or
Tauri). Max's prototyping advantage is nullified by AI codegen speed.
**Rejected:** Max/MSP (opaque to LLMs, weak UI/palette/project
management, poor distribution); native Swift (slower iteration,
forecloses easy cross-platform).

## D2 — No Photoshop UXP plugin; capture via getDisplayMedia (2026-07-16)

**Decision:** Capture the source by screen/window capture, not by
integrating into Photoshop.
**Why:** The previous prototype (Photoshop-Live-Ditherer) was slow
largely *because* of UXP: constrained JS runtime, no real Web
Workers, slow pixel transfer out of the document, React re-renders
around pixel loops. Screen capture decouples us from Adobe entirely
and works with any source app.
**Consequence:** Arbitrary-region capture = full-screen/window
capture + our own crop rect. Native ScreenCaptureKit via Tauri is the
future path if browser capture UX becomes annoying.

## D3 — Resize-first pipeline default (2026-07-16)

**Decision:** Default processing order downsizes to the stitch grid
*before* colour reduction and dithering.
**Why:** All expensive per-pixel work then runs on ≤ 1M cells
(usually ~40k), the single biggest performance lever vs. the old
prototype which dithered at document scale. Alternative orders remain
available as data (requirements §7) because they are creatively
different, not because the default is in doubt.

## D4 — TS reference implementation is ground truth (2026-07-16)

**Decision:** Every pipeline stage ships a pure TypeScript
implementation first; WASM/WebGPU are drop-in backends behind the
same interface, adopted per-stage only where profiling shows need.
**Why:** Correctness anchor for golden tests, universal fallback,
and the shape AI tooling handles best (isolated, testable modules).
**Consequence:** The TS backend is never deleted or allowed to rot;
CI runs golden tests against all available backends.

## D5 — Backend split: error diffusion on CPU/WASM, parallel stages on WebGPU (2026-07-16)

**Decision:** Floyd–Steinberg (and future error-diffusion kernels)
run in Rust→WASM with SIMD. Colour-distance/LUT work, ordered/blue-
noise dithering, adjustments and stitch rendering target WebGPU.
**Why:** Error diffusion is inherently sequential (neighbour
dependency) — a bad GPU fit; palette matching is embarrassingly
parallel — an ideal compute-shader fit. "WebGPU everything" is
explicitly rejected.

## D6 — LUT-based colour matching (2026-07-16)

**Decision:** Nearest-palette lookup via a precomputed 15-bit RGB →
palette-index table (32,768 entries), rebuilt on palette/metric
change.
**Why:** Turns per-pixel CIELAB search into an array index; typically
50–100× faster and makes the TS path viable at real-time rates on its
own.
**Trade-off:** 15-bit quantisation error is below one thread-colour
step in practice; the dither stage uses exact error terms so
diffusion quality is unaffected.

## D7 — Carbon Design System for UI chrome (2026-07-16)

**Decision:** Carbon web components for panels/controls (framework
default from PM-Skills); canvas preview is custom.
**Why:** Framework default, accessible (WCAG 2.2 AAA target), and
web components avoid pulling React into the app — keeping the hot
path framework-free (a direct lesson from D2).

## D8 — Versioned JSON project format from day one (2026-07-16)

**Decision:** `schemaVersion` field in every project file; loaders
migrate forward, never reject.
**Why:** Wider distribution later (requirements §26 Q11/Q13) makes
format stability a product feature; retrofitting versioning is
painful.

## D9 — Product name "Cross Stitch Lens"; provisional defaults confirmed (2026-07-16)

**Decision:** Adopt "Cross Stitch Lens" as the product name (replacing
the working title "StitchLive" everywhere). Confirm all four
init-interview (provisional) defaults: (7) MVP ships one
preset palette as a DMC-subset placeholder until the owner's hex
spreadsheet is supplied; (9) alpha below 50% = empty stitch (renders
as fabric colour, excluded from colour counts); (17) chart
coordinates start at 1; (18) tick marks align to grid boundaries.
**Why:** Settled during init — renaming later is not a clean
find-and-replace, and the provisional defaults are the sensible MVP
positions, each revisable post-MVP (0-origin and centre-aligned ticks
are wish-list items).

## D10 — MVP palette: owner DMC/Anchor map, generated to JSON (2026-07-16)

**Decision:** The MVP preset palette is the owner's supplied
DMC/Anchor thread map. The raw CSV is tracked at
`src/core/palettes/dmc-anchor-map.csv` (the source of truth);
`scripts/build-palette.mjs` derives `src/core/palettes/dmc.json`, which
the engine ships. This supersedes the D9 (7) "DMC-subset placeholder".
Generation rules: one entry per unique DMC code (first occurrence
wins, since the CSV lists a DMC once per Anchor equivalent); rows
without a valid `#rrggbb` hex are skipped; Anchor "NA" becomes null;
descriptions kept verbatim. First run: 533 colours from 679 rows
(4 skipped, 142 duplicate DMC codes collapsed).
**Why:** A tracked, mechanically-generated palette is reproducible and
avoids inventing colour data. Keeping the CSV as source lets the map be
re-derived if the owner updates it.
**Provisional:** the JSON schema (`{ code, name, hex, rgb, anchor }`) is
minimal and may be revised by the M1 palette model; the Anchor cross-
reference and per-manufacturer thread metadata are carried but not yet
used.

## D11 — Upgraded pm-skills framework 3.17.1 → 4.0.0 (2026-07-17)

**Decision:** Upgraded pm-skills framework.
**Version:** 3.17.1 → 4.0.0.
**Source:** `https://github.com/djDAOjones/PM-Skills.git` (fresh clone).
**What changed:** Framework sync per the 4.0.0 (DIST-BOUNDARY) upgrade
actions — overwrote `init.md`, `GUIDE.md`, `MANIFEST.md`,
`prompts/upgrade.md`, `integrations/adopt.md`,
`integrations/init-mvp.md`, `VERSION`, `CHANGELOG.md`; added
`pm_skills/templates/` (the three rulebook templates, now shipped
inside the distributable). Root rulebooks untouched (project-owned).
Housekeeping per the same entry — removed framework-source-repo files
never meant for consuming projects: `self/` (maintainer memory),
`CONTRIBUTING.md`, `scripts/gen-file-map.mjs` (source-repo fork; the
scaffold copy at `pm_skills/scaffold/gen-file-map.mjs` is the one
`AGENTS.md` already names), and the dead `self/` ignore rules in
`.gitignore`, `.markdownlintignore`, `.markdownlint-cli2.jsonc`,
`cspell.json`, `.editorconfig-checker.json`. Kept (in active use as
the interim docs-lint gate until M0): `package.json` (renamed
`pm-skills` → `cross-stitch-lens`, repository URL corrected),
`scripts/check-docs.mjs` (path validation now skips framework-class
`pm_skills/` docs, still checks `pm_skills/project/`),
`.github/workflows/lint.yml`, `.githooks/pre-commit`.
`.windsurf/workflows/next.md` rewritten from the source repo's
self-hosted mapping to the standard consuming-project form.
**Local framework customisations:** none found (Step 4 diff clean).
**Gate:** `npm run check` green (all four steps) after the change.
