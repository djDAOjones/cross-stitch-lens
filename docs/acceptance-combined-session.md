# Combined maintainer acceptance session — M13 + M15

One sitting closes four standing items: **M13-ACCEPT-02**,
**M15-ACCEPT-02**, **M15-DITH-05**, and the **M8-GOLD-01** rider that
DITH-05 carries. They merge because their legs genuinely overlap —
live capture, exports, fallback and accessibility appear in all three
sheets — not to save time on judgement.

This sheet is the **order**. The detail stays where it already lives,
and neither is restated here:

- `docs/acceptance-m13-live.md` — the M13 sheet: setup, six rehearsal
  cases, the four D135 agenda lines, miss classification, record table.
- `pm_skills/project/tickets/M15-DITH-05.md` — the dither/profile
  session protocol and the M8-GOLD-01 rider.

## Build decision — read this first

The M13 sheet pins `v0.5.0+20260809.b4cf665`, because that is the build
M13-ACCEPT-01's automated evidence was taken on. **Run the combined
session on current HEAD instead**, for a checkable reason: no file on
the processing path has changed since that build. The only two changed
source files are `src/core/color-profile.ts` (the built-in profile
list, reached from `main.ts`, never from the worker) and
`src/bench/report.ts` (imported only by the bench entry). Capture,
worker, pipeline stages, backends and export are untouched, so the
pairing with the automated evidence still holds.

Record the build id from the diagnostics bundle either way, and note
in the record that HEAD was used and why. M15 cannot run on the pinned
build at all — batch 2's eight profiles do not exist there.

## Before the sitting

1. **Add the four demo photos** (M15-EVID-01) to `public/profile-demo/`:
   `landscape.png`, `cartoon.png`, `portrait.png`, `text.png`. Without
   them three of the five test-preview slots read "Image offline", and
   M15-ACCEPT-02 asks you to judge that preview's usefulness — judging
   it with three slots dark would produce a false fail. If you have no
   images, skip the preview-usefulness verdict rather than fail it.
2. **Regenerate the dither gallery** — DITH-05 says `npm run audit`;
   **run only the gallery file instead**:

   ```sh
   AUDIT=1 npx vitest run tests/audits/m8-dither.audit.test.ts
   ```

   ~20 s, and it writes `bench-reports/m8-spike-01-gallery.html`. The
   full suite currently fails (checked 2026-08-09: 2 files, 2 tests, in
   46 s) — one stale post-M8 assertion (ICE-AUDIT-01) and one routing
   disagreement (ICE-ROUTE-01). Neither affects what you are judging,
   and neither should eat the start of your sitting.
3. **Build and serve production** —
   `npm run build && npx vite preview --port 4173`. A dev-server figure
   is not a product figure.
4. Quit other heavy applications, mains power, one Chromium window,
   grant screen capture **before** any timing.

## The sequence

Nine legs, in this order. The order matters: the frozen-source legs
come first so the live legs are not the place you discover a labelling
bug, and the judgement legs come before the endurance legs while your
eye is fresh.

| # | Leg | Closes | Source |
| --- | --- | --- | --- |
| 1 | **Still baseline** — frozen source, p64 and p489, no dither then each of the five methods | M13 | M13 sheet case 1 |
| 2 | **Dither gallery review** — per method: banding, noise, edge damage, isolated stitches, worm artefacts; does the label predict the look | DITH-05 | DITH-05 step 1 |
| 3 | **Profile judgement** — all **sixteen** built-ins: does the name predict the look, are the basis lines honest, is any profile redundant or missing | DITH-05 + M15 | DITH-05 step 2 |
| 4 | **Editor comprehension** — build one profile from scratch; duplicate a built-in, tune it, Save; read the unnamed/drift states and the (edited) copy flow; full-RGB shows the named demonstration palette; judge the test preview; settings survive save/reopen | M15 + DITH-05 | M15-ACCEPT-02 intent + DITH-05 step 4 |
| 5 | **Typical live work** — Photoshop at 200² then 300²: brush marks, sustained strokes, fills, layer toggles, transforms; switch profiles and dither methods **while editing** | M13 + DITH-05 | M13 case 2 + DITH-05 step 3 |
| 6 | **Scheduling and recovery** — forced refresh, crop move/resize, compare toggle and drag, zoom/pan, freeze/unfreeze, draft entry and recovery, capture stop and failure recovery | M13 | M13 case 4 |
| 7 | **Exports** — clean/enlarged PNG, chart, PDF; at full quality, while draft is visible, after a palette switch, and for at least one diffusion and one threshold profile | M13 + DITH-05 | M13 case 5 + DITH-05 step 5 |
| 8 | **Fallback and stress** — one TS-only session with WASM/WebGPU unavailable; then the 1024² and memory/export cases | M13 + DITH-05 | M13 cases 3, 6 + DITH-05 step 6 |
| 9 | **Access** — keyboard-only over capture, crop, dither, profiles and the editor; 200 % zoom; screen-reader labels; no meaning by colour alone; 320 CSS px and companion width | M13 + DITH-05 | M13 UX section + DITH-05 step 7 |

Then, off the keyboard: **the M8-GOLD-01 rider** — with the five
methods freshly judged, approve golden fixtures for the four new
methods or decline. Either answer closes it; approval routes to a
follow-up task, and golden regeneration keeps its owner-approval rule
regardless.

## What each item needs before it can close

- **M13-ACCEPT-02** — the M13 record table filled for 200²/300²/1024²,
  plus an explicit verdict on each of the four D135 agenda lines
  (small-stroke feel, PDF freeze, eight-brand cold prep, external-stop
  salience). A performance gap at ≤ 300² cannot be signed off here — it
  reopens M13-SYNTH-01.
- **M15-ACCEPT-02** — pass/fail on: building a profile from scratch,
  the style built-ins, the test preview's usefulness, the (edited)-copy
  flow's legibility.
- **M15-DITH-05** — pass/fail per method and per built-in profile. A
  method failure reopens D61; a misleading profile routes to the
  profile set; an editor failure routes to DITH-02/03.
- **M8-GOLD-01** — approve or decline, recorded.

## Rules that hold for the whole sitting

- **No fixes during the session.** Note it, carry on.
- **Never retune a gate to make a miss disappear.** Classify it with
  the M13 sheet's table.
- **Visual review of M13's changes is no-change mode** — everything M13
  activated is bit-exact, so you are confirming identical output, not
  choosing a favourite. M15's profile judgement is the opposite: there,
  taste is exactly the point.
- **A/B between profiles uses frozen captures or the gallery.** Live
  dual processing is not authorised — one processed pipeline per frame.
- Never record raw pixels, project storage, Photoshop filenames or
  personal content. A screen recording stays local; note that it exists
  and its timestamp.
