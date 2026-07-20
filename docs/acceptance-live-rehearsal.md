# Live capture rehearsal — M5-ACCEPT-03

The one-page checklist for the maintainer-owned live rehearsal. An agent
cannot run this: screen-capture permission, real editing feel and
visible latency are not observable from node. What an agent *can* do is
prepare the run and record the evidence, which is what this page is.

**Before you start**, know what is being claimed. The product promise is
**≥ 4 preview updates/sec at ≤ 300²**, in-browser. 1024² is stated
plainly as an **export/finishing grid, not a live-editing grid** (D47,
~2.5 updates/sec projected) — so slowness there is an expected limit to
confirm, not a failure to chase.

## Setup

1. `npm run build && npx vite preview --port 4173` — rehearse on a
   **production build**. A dev-server figure is not a product figure:
   the same TS resize measured ~3.5× slower under Vite dev than in node
   (`browser-measurement.md`).
2. Open in a Chromium-based browser. Grant screen capture when asked.
3. Import or capture, let one frame process, then press **Copy
   diagnostics** and paste the bundle into the record below. That single
   paste covers build id, browser, viewport/DPR, capabilities and the
   backend that actually ran each stage — do not transcribe them by
   hand.
4. Open the debug panel (dev build only) if you want live per-stage
   medians while you work.

Record separately, because the bundle cannot see them: Mac model + OS,
display and scaling setting, Photoshop document size, and the source
window dimensions you are capturing.

## Actions to perform

Run each at **200²** and **300²** (the promise range), then repeat the
demanding ones at **1024²** to confirm the ceiling behaves as stated.

| # | Action | Watching for |
| --- | --- | --- |
| 1 | Idle document, no edits | Source-unchanged skipping; CPU should fall to near-idle |
| 2 | Continuous brush strokes | Update rate; does the preview keep up with the stroke |
| 3 | Large fills / layer visibility toggles | Whole-frame changes, no partial or torn output |
| 4 | Transform, pan, zoom in Photoshop | Crop stays aligned to the region you drew |
| 5 | Rapid successive edits | Latest-wins: no stale frame flashing, no queue backlog |
| 6 | Change the crop region | Realignment without a stuck or duplicated frame |
| 7 | Change grid / palette / metric mid-capture | Controls stay responsive; new config takes effect |
| 8 | Toggle and drag split compare | Halves stay aligned; dragging alone runs no pipeline |
| 9 | Pause, then resume | Pause truly stops work (CPU drops); resume recovers |
| 10 | Export PNG/chart/PDF **while capturing** | Export is full quality even if preview is in draft |
| 11 | Sustained demanding work at 1024² | Draft entry/exit, and that it recovers |

## Evidence to capture per configuration

- **Update rate** — processed frames/sec. Not `requestVideoFrameCallback`
  cadence: that is how often a frame *arrives*, not how often one is
  processed.
- **Latency**, source edit → visible change, p50 and p95. Judgement
  matters as much as the number: "keeps up" / "lag noticeable".
- **Frame accounting** — processed vs skipped (source unchanged) vs
  dropped (arrived while busy). The debug panel shows dropped; the
  bundle's log tail carries per-frame timings.
- **Draft transitions** — the badge reads *"Draft quality — dithering
  off while the pipeline catches up."* It enters after
  `DRAFT_ENTER_COUNT` (2) frames over `DRAFT_ENTER_MS` (200 ms) and
  exits after `DRAFT_EXIT_COUNT` (5) under `DRAFT_EXIT_MS` (100 ms).
  Note whether it is stable or oscillates.
- **Active backend per stage** — from the bundle. Expect `dither: ts`
  under the Lab metric and `dither: wasm` under RGB (D48); anything else
  means routing did not do what it claims.
- **Idle and active CPU**, and memory over a sustained run.
- **Errors** — the bundle lifts these into their own `errors` array.

## Behaviour checks (pass/fail, not measured)

- Capture permission stays user-initiated; nothing auto-starts.
- Static content becomes cheap rather than reprocessing every frame —
  but is still refreshed within `DIRTY_MAX_STALE_MS` (2 s), which is
  bounded staleness by design, not a missed frame.
- No stale frame is ever shown after a newer one.
- Export during draft uses full quality. This is asserted in `check`,
  but confirm it end to end at least once.
- A failure recovers or gives actionable status — never a silent stall.

## Classifying a miss

Never retune the gate to make a miss disappear. Classify it:

| Class | Meaning | Goes to |
| --- | --- | --- |
| Correctness bug | Wrong output or stale/torn frame | New backlog item, with the workload + build id |
| Measurement defect | The number is wrong, not the behaviour | Fix the measurement, re-run |
| Performance gap | Real, and below the promise at ≤ 300² | New item; M5 cannot close on it |
| Environment limit | Machine, browser or display bound | Record; not a code defect |
| Approved budget decision | Slower than hoped but accepted | Needs an explicit owner decision, recorded |

## Record

Paste the diagnostics bundle, then one row per configuration.

| Grid | Palette | Metric | Dither | Updates/sec | Latency p50 / p95 | Dropped | Draft? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 200² | | | | | | | | |
| 300² | | | | | | | | |
| 1024² | | | | | | | | |

**Maintainer note (verbatim):**

**Exit:** typical editing (≤ 300²) is accepted, ceiling behaviour is
explicitly recorded, and every miss is classified above. Residual risks
carry forward to M5-ACCEPT-04 and -05.
