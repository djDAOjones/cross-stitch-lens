# M13-ACCEPT-02 — maintainer live acceptance run sheet

The one-page sheet for the M13 owner session. An agent prepares it and
records the evidence; only the maintainer can grant capture, edit in
Photoshop, and judge feel. Sibling sheet for the M5 rehearsal:
`docs/acceptance-live-rehearsal.md` (still useful for the per-action
table); the classification and agenda below are M13's own.

**Before you start, know what is being claimed.**

- The promise is **≥ 4 preview updates/sec at ≤ 300²**, in-browser, and
  since M13-IMPL-02 it is a machine-asserted gate, not a sentence —
  `bench:auto` already fails if the driven leg misses it. This session
  asks the different question the machine cannot: *does it feel right
  while you actually work?*
- **1024² is an export/finishing grid.** The brief's "≤ 100 ms at
  1024²" line was **retired** at D135. Slowness there is an expected
  limit to confirm, not a failure to chase.
- **Visual review runs in no-change mode.** Everything M13 activated is
  bit-exact. You are confirming identical output and looking for
  integration artefacts — not making a taste decision. If anyone asks
  you to pick a favourite, the premise is wrong.

## Setup

1. **Same build as M13-ACCEPT-01: `v0.5.0+20260809.b4cf665`.** Confirm
   it in the diagnostics bundle before you start — a different build
   invalidates the pairing, and the automated evidence this session
   corroborates was all taken on that one.
2. `npm run build && npx vite preview --port 4173` — production build
   only. A dev-server figure is not a product figure (~3.5× slower TS
   resize under Vite dev).
3. Chromium-based browser, one window, foreground and visible, mains
   power, no other heavy applications.
4. Grant screen capture **before** timing, so the prompt is not inside
   a measured interval. Confirm the visible capture indicator.
5. Let one frame process, then press **Copy diagnostics** and paste the
   bundle into the record. It carries build id, browser, viewport/DPR,
   capabilities and the backend that actually ran each stage — do not
   transcribe by hand.

Record separately, because the bundle cannot see them: Mac model + OS,
display and scaling, Photoshop document size, and the source window
dimensions you are capturing. **Never** commit raw pixels, project
storage, Photoshop filenames or personal content. A screen recording
stays local evidence — record that it exists and its timestamp.

## Rehearsal sequence

Work through in order. One controlled case at a time; no fixes during
the session.

| # | Case | The question |
| --- | --- | --- |
| 1 | **Still baseline** — frozen source, p64 and p489, no dither then each of the five methods | Do labels and settings match what appears? Same build as the automated evidence? |
| 2 | **Typical live work** — Photoshop at 200² then 300²: brush marks, sustained strokes, fills, layer toggles, transforms, rapid edits | Does output keep up while you work? |
| 3 | **Methods and backends** — switch all five dither methods; run one TS-only fallback session | All five usable live? Backend detail stays diagnostic, never a creative control |
| 4 | **Scheduling** — static source, forced refresh, crop move/resize, compare toggle and drag, zoom/pan, settings changes, freeze/unfreeze, draft entry and recovery, capture stop and failure recovery | Any stale frame after a newer one? Does a failure recover or stall silently? |
| 5 | **Export during capture** — clean/enlarged PNG, chart, PDF: at full quality, while draft is visible, and after a palette switch | Does output match persisted config, never temporary preview quality? |
| 6 | **Stress** — the 1024² and memory/export cases only | Does the stated finishing expectation hold? |

## The four agenda lines (D135 deferred these to you)

Each needs an explicit pass/fail note — they are the reason this
session exists rather than being a formality.

| Line | What to judge | If it fails |
| --- | --- | --- |
| **Small-stroke latency feel** | Edits ≤ 2 px are invisible to dirty detection and surface only via the 2 s staleness bound. Make deliberate tiny marks and see whether the wait registers as broken | First candidate is lowering `DIRTY_MAX_STALE_MS` — **not** a hash redesign |
| **PDF-freeze acceptability** | PDF export blocks the main thread ~0.5 s: the preview freezes, nothing is lost | A worker-side PDF assembly task gets scoped |
| **Eight-brand cold prep** | Only judge if your real practice reaches it: many brands + lab dither pays ~1.3–3.3 s of candidate-table build on first dithered use | Recorded as a triggered defer, then scoped |
| **External-stop prompt salience** | You found the truthful status line easy to miss when sharing ended externally | Wish-list carries a toast/banner idea |

## UX and accessibility checks

At 320 CSS px and at normal companion width: preview stays primary,
controls stay usable. Keyboard-only through capture controls and crop,
dither selects and strength, zoom/pan, compare, freeze, exports —
visible focus, ≥ 44 px targets. Check 200 % zoom, status
announcements, the paused/unchanged/draft wording, processing and
error recovery, and that no backend or status meaning is carried by
colour alone. Routine live updates must not flood the screen reader or
the bounded diagnostics buffer.

## Classifying a miss

Never retune the gate to make a miss disappear.

| Class | Meaning | Goes to |
| --- | --- | --- |
| Correctness defect | Wrong pixels, indices, or a stale/torn frame | Owning implementation; gate blocked |
| Measurement defect | The number is wrong, not the behaviour | Measurement ticket; re-run |
| Performance gap | Real, and below the promise at ≤ 300² | **M13-SYNTH-01 reopened** — cannot be signed off here |
| Appearance rejection | A visual delta you reject | Owner decision, recorded; never agent acceptance |
| Environment/browser limit | Machine, browser or display bound | Recorded; not a code defect |
| Target decision | Slower than hoped but accepted | Explicit owner decision, recorded |

## Record

Paste the diagnostics bundle, then one row per configuration.

| Grid | Palette | Metric | Dither | Updates/sec | Latency p50 / p95 | Drops (pump / worker) | Draft? | Backend | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 200² | | | | | | | | | |
| 300² | | | | | | | | | |
| 1024² | | | | | | | | | |

Agenda verdicts — small-stroke: `____` · PDF freeze: `____` ·
cold prep: `____` (or `not reached`) · stop salience: `____`.

Each verdict is one of: **accept** / **reject** (with the observed
artefact) / **accept at this workload only** / **inconclusive, retest**.

**Maintainer note (verbatim):**

## Exit

Exit only when typical 200²/300² Photoshop editing meets the signed
quantitative target **and** you accept the feel, all five dither
methods remain usable, fallback, recovery and exports pass, and any
visual delta carries an explicit owner verdict. Then the decision-log
sign-off closes M13.
