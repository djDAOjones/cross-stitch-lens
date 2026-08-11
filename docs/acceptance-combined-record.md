# Combined acceptance sitting — record (2026-08-09)

The evidence record for the sitting whose order is
`docs/acceptance-combined-session.md`. The detail sheets it drew on
were `docs/acceptance-m13-live.md` and the M15-DITH-05 ticket; that
ticket was deleted when the item shipped, so this file is now the
surviving record of what the maintainer decided.

## Build

- **Build id:** `v0.5.0+20260809.0642be5` — HEAD (`0642be5`), **not**
  the pinned `v0.5.0+20260809.b4cf665`.
- **Why HEAD:** no file on the processing path changed since `b4cf665`
  (only `src/core/color-profile.ts`, main bundle only, and
  `src/bench/report.ts`, bench entry only), so the pairing with
  M13-ACCEPT-01's automated evidence holds. M15 cannot run on the
  pinned build at all — batch 2's eight profiles do not exist there.
- **Served:** `npm run build && npx vite preview --port 4173`
  (production build; a dev-server figure is not a product figure).
- **WASM:** `crates/stitch-engine/pkg` present, so the WASM backend is
  real in this session (relevant to leg 8's fallback case).

## Prep

- Dither gallery regenerated 2026-08-09 18:51 via
  `AUDIT=1 npx vitest run tests/audits/m8-dither.audit.test.ts`
  (7 tests passed, 20.6 s) → `bench-reports/m8-spike-01-gallery.html`.
  The full `npm run audit` remains red on ICE-AUDIT-01 / ICE-ROUTE-01;
  neither touches what is judged here.
- All six demo images verified served and rendered through the real
  pipeline in the editor's preview at 200²: landscape-1 (252 colours),
  landscape-2 (233), portrait (144), graphic (199), stained-glass
  (329), text (29). The Preview select offers nine views.
- Working tree clean at session start and after prep.

## Environment (maintainer records — the bundle cannot see these)

**Not recorded this sitting.** Mac model and OS, display scaling,
Photoshop document size and captured window dimensions were never
supplied, and no screen recording was reported. A repeat sitting
should capture them before the first leg — they are the part no log
can reconstruct afterwards.

## Diagnostics bundle

**Not captured — not available on the build the sitting required.** The
run sheet's setup step 5 asks for it, but the control is dev-only and
step 2 mandates a production build (see "A defect in the run sheet
itself" below). Build identity was read from the app's own version
line instead; browser was Chrome on macOS with one wallet extension
injecting into the page (its content-script noise appears in every console
capture, and is not the app's).

## Leg verdicts

| # | Leg | Closes | Verdict | Notes |
| --- | --- | --- | --- | --- |
| 1 | Still baseline (p489, then p64) | M13 | **pass** | Both palettes; all seven built-in dither profiles distinct and settling |
| 2 | Dither gallery review | DITH-05 | **pass** | All five shipped methods. `stucki`, `sierra-lite`, `bayer-4` are unshipped spike candidates and out of scope |
| 3 | Profile judgement (16 built-ins) | DITH-05 + M15 | **pass** | No profile named as misleading, none named redundant |
| 4 | Editor comprehension | M15 + DITH-05 | **pass** | From-scratch build, duplicate-tune-save, (edited) flow, save/reopen all pass |
| 5 | Typical live work (200², 300²) | M13 + DITH-05 | **pass** | 300² "about the same, absolutely fine". Mid-edit profile and dither switching pass |
| 6 | Scheduling and recovery | M13 | **pass with notes** | Zoom glitch → ICE-ZOOM-01. Draft entry not forced at this workload |
| 7 | Exports | M13 + DITH-05 | **pass with notes** | Invariants held; thread-key defect → ICE-KEY-01 |
| 8 | Fallback and stress | M13 + DITH-05 | **pass** | WASM-off confirmed; WebGPU-off not achieved (see below). 1024² ~1 s, exports correct |
| 9 | Access | M13 + DITH-05 | **part-deferred** | Keyboard, focus, 200 % zoom, ~320 px all pass. Screen reader + colour-only deferred → A11Y-VO-01 |

### Leg 8 — what was and was not proven

WASM was genuinely absent: the TS-only bundle carries no
`stitch_engine` chunk and logged `pkg not built — dither stays on the
ts backend`. Measured 124–130 ms per frame — about **8 updates/sec**,
double the promise, on the pure TypeScript path.

WebGPU was **not** disabled — `!!navigator.gpu` stayed `true` across
two relaunch attempts with `--disable-features=WebGPU`. Recorded as
not achieved. One observation in its favour, not offered as proof: no
`[webgpu]` line appeared anywhere in the session — not "device ready",
not "LUT built on gpu", not "not available" — suggesting the GPU path
was never reached. The WebGPU-off half rests on the automated
evidence, not on a human check.

## M13 record table

Numeric columns are quoted from M13-ACCEPT-01's signed automated
evidence (D143), **not** measured here: the production build exposes
no updates/sec, latency, drop or backend readout, and the diagnostics
bundle is dev-only. This session's contribution is the Verdict column
— the question the machine cannot answer.

| Grid | Palette | Dither | Verdict |
| --- | --- | --- | --- |
| 200² | DMC 489, then 64 | all seven built-ins | **pass** — responsive, no lag while editing |
| 300² | DMC | switched mid-edit | **pass** — "about the same, and it's absolutely fine" |
| 1024² | DMC | Strong | **pass** — ~1 s/frame, expected for a finishing grid (D135 retired the 100 ms line); exports correct |

## The four D135 agenda lines

| Line | Verdict | Note |
| --- | --- | --- |
| Small-stroke latency feel | **accept** | 1 px pencil dot surfaced at the full ~2 s bound. "A bit sluggish but can live with" — reservation kept as ICE-STALE-01 |
| PDF-freeze acceptability | **accept** | Observed 0.5–1 s, slightly above D135's ~0.5 s estimate |
| Eight-brand cold prep | **accept at this workload only** | Measured **6 s** with all eight brands — roughly double the 1.3–3.3 s estimate. Now a triggered line, not hypothetical. Owner assented to the recommended wording; confirm if in doubt |
| External-stop prompt salience | **accept** | The same line the owner found too subtle at D134 now reads as acceptable — the wish-list toast idea becomes a nicety, not a fix |

## Per-method verdicts (DITH-05)

All **pass**; D61 stays closed. Judged in the gallery at 64 spread DMC
threads and live in the editor.

| Gallery tile | Ships as | Verdict |
| --- | --- | --- |
| `floyd-steinberg` | Balanced (and Very limited palette, damped to 0.6) | pass |
| `atkinson` | Subtle (strength 0.5) | pass |
| `jarvis` | Photograph | pass |
| `bayer-8` | Graphic (ordered) | pass |
| `blue-noise-32` | Strong (strength 1.75) | pass |

## Per-profile verdicts (16 built-ins)

All sixteen **pass** — Autumn leaves, Golden hour, Winter frost, Deep
sea, Neon noir, De Stijl primaries, Delft blue, Ukiyo-e woodblock,
Rainforest, Spring meadow, Gemstones, Moorland, Art deco, Mid-century
modern, Fair Isle, Fluoro spot print. None named as misleading; none
named as redundant or missing. Judged against the six demo images with
Portrait and Stained glass as the anchors.

## M15-ACCEPT-02

| Question | Verdict |
| --- | --- |
| Building a profile from scratch | **pass** |
| The style built-ins | **pass** |
| The test preview's usefulness | **pass** |
| The (edited)-copy flow's legibility | **pass** |

Not verifiable as built: DITH-05 step 4's "full-RGB shows the named
demonstration palette". That message lives only in the dither editor
(`src/main.ts:2620`), whose entry button is disabled whenever the
design is full-RGB (`src/main.ts:1255`) — so the state it describes
cannot be reached. Routes to DITH-02/03.

## M8-GOLD-01 rider

**Approved.** Fixtures for the four unpinned methods (Atkinson,
Jarvis, ordered, blue noise) become M8-GOLD-02. Source: a small crop
derived from `landscape-1.jpg`, committed as a JSON pixel buffer in
the existing 8×8 house style — not the JPEG, which would be
impossible to diff and platform-dependent.

## Findings raised

All iceboxed; none fixed during the sitting. M15-UI-05 was fixed
**after** the legs completed.

| ID | Finding |
| --- | --- |
| ICE-ZOOM-01 | Canvas jumps on the first wheel zoom |
| ICE-KEY-01 | PDF thread key prints the hex twice on generated palettes |
| ICE-EXPORT-01 | Assert exported artefacts, not just export helpers |
| ICE-GLOBALERR-01 | Benign browser noise logged as an uncaught error |
| ICE-STALE-01 | Tiny edits wait the full 2 s staleness bound |
| ICE-SAVE-01 | A saved project has no name of its own |
| ICE-FLICKER-01 | Colour-count changes flash the un-reduced image |
| ICE-VARIANTS-01 | A contact sheet of variations for choosing by eye |
| ICE-WIDTH-01/02 | Decide the designed window width; a low-height readout for it |
| A11Y-VO-01 | The deferred screen-reader pass |

### A defect in the run sheet itself

`docs/acceptance-m13-live.md` setup step 5 instructs the maintainer to
press **Copy diagnostics** and paste the bundle. That control, and the
debug panel, are dev-only (`src/main.ts:800`, `src/main.ts:814`) — and
the same sheet's step 2 mandates a production build. The two steps
contradict each other. Worth fixing before the sheet is used again.
