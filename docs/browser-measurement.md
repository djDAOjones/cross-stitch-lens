# Browser measurement procedure

Three boundaries in `measurement-contract.md` — `preview-update`,
`interaction` and `export` — cannot be observed in node, and the node
matrix records them as explicit `unsupported` rows rather than zeros.
**The current procedure is the bv2 production harness run at the end of
this document (M13-MEAS-02)** — one page, one report, all three
boundaries. The M5-era sections before it are kept as recorded history:
the console-probe procedure (M5-PERF-18), its findings, and the first
production-harness results (M5D). It also covers the two node-invisible
engine questions of that era: GPU LUT build (M5-PERF-12) and the canvas
resize candidate (M5-PERF-11).

## Why a separate procedure

The node matrix is not a safe proxy for the browser. This run measured
the **same TS resize, on the same machine, ~3.5× slower in the browser
than in node**, while TS dither was only ~1.1× slower — so the gap is
stage-dependent and cannot be corrected with a global multiplier. Any
budget bound to a node median is therefore a claim about node, not about
the product. Re-measure here before binding a budget.

## Running it

1. `npm run dev` (or `preview_start` with `.claude/launch.json`).
2. Open `http://localhost:5173` in a Chromium-based browser with
   WebGPU. Confirm `navigator.gpu` exists — several findings below are
   conditional on it.
3. Paste each probe from "Probes" into the console. Vite serves the
   TypeScript sources, so `await import('/src/…/x.ts')` resolves the
   real modules — the probes measure shipped code, not a copy.
4. Record the medians against the build id shown in the diagnostics
   panel.

Timing notes: `performance.now()` here has **0.1 ms** granularity, so
sub-0.1 ms rows are reported as 0 and must not be read as free.
`drawImage` is asynchronous — timing the draw alone always reads 0; the
honest figure includes the `getImageData` readback that forces the sync
point, and that is what the tables below report.

## Probes

- **P1 environment** — `navigator.gpu`, `hardwareConcurrency`,
  `devicePixelRatio`, `OffscreenCanvas`, clock granularity.
- **P2 canvas resize** — `drawImage` into an `OffscreenCanvas` at
  1280→{200, 300, 1024}, timed with and without readback, and diffed
  against `resizeStage.backends.ts` for the same input.
- **P3 render components** — `ImageData` wrap, `createImageBitmap`,
  clear + `drawImage` onto the preview surface, at 1024².
- **P4 worker parity** — the same TS resize/dither run inside a module
  Worker, to separate "browser vs node" from "main thread vs worker".
- **P5 GPU LUT** — `buildLutGpu` vs `buildLut`, timed, and compared
  bin-for-bin. **Always assert the bin agreement, never just the time.**
- **P6 preview-update** — a real `PipelineClient` with an attached
  canvas, timing submit → `onResult` (which the worker posts after the
  bitmap snapshot and surface draw).

Probe sources live in the session record for this milestone; each is a
single self-contained async IIFE with no dependencies beyond the dev
server.

## Results — 2026-07-19, Apple M1 Max, WebGPU (Metal 3)

### preview-update (browser-only boundary, first numbers ever taken)

Source 1280², DMC-64, Lab, serpentine, `resize-first`, TS backend.

| Workload | median ms | p95 ms | updates/sec |
| --- | --- | --- | --- |
| 200² dither | 57.5 | 209.5 | 17.4 |
| 300² dither | 85.9 | 86.8 | 11.6 |
| 300² no dither | 47.9 | 49.8 | 20.9 |
| 1024² dither | 633.7 | 634.6 | 1.6 |

The brief's bar is **≥ 4 preview updates/sec at ≤ 300 × 300**. That is
met with margin (11.6–17.4/sec). The 1024² ceiling misses it at
1.6/sec — consistent with the node pipeline rows, and the case the
adaptive draft governor exists for.

### Preview render components (the ≤ 5 ms budget row)

| Component | median ms |
| --- | --- |
| `ImageData` wrap, 1024² | 0.5 |
| `createImageBitmap`, 1024² | 1.5 |
| clear + `drawImage` bitmap → 1600×1000 surface | < 0.1 |

Total ≈ **2 ms**, inside the 5 ms budget. M5-PERF-02 must still decide
whether the row means "worker canvas draw" or "bitmap-to-visible"; on
these numbers it passes under either reading.

### Canvas resize candidate (M5-PERF-11)

| Path | 1280→200 | 1280→1024 |
| --- | --- | --- |
| `drawImage` + `getImageData` | 1.9 ms | 8.1 ms |
| TS reference (browser) | 32.9 ms | 131.0 ms |
| TS reference (node, same machine) | 11.1 ms | 37.2 ms |

Canvas is 16× the TS reference in the browser — and still **misses the
5 ms budget at 1024**. Quality, however, rules it out as a drop-in:

| Comparison vs the TS oracle | mean Δ/channel | max Δ | pixels changed |
| --- | --- | --- | --- |
| 1280→200 opaque | 39.1 | 135 | 100% |
| 1280→200 alpha edges | 31.9 | 184 (α 3) | 77% |
| 1280→1024 opaque | 5.4 | 31 | 99.9% |
| 1280→1024 alpha edges | 4.7 | 254 (α 1) | 77% |

`drawImage` is **not** area averaging at hard downscale ratios, which is
exactly the regime the product uses (a 1512×982 crop → 200² grid). It
can only ever be a distinct creative mode with visibly different output,
never a quality-neutral backend.

### GPU LUT build (M5-PERF-12) — defect, see below

| Palette | GPU ms | TS ms | bins disagreeing with TS |
| --- | --- | --- | --- |
| 64 | 0.4 | 32.6 | 31,550 (96.3%) |
| 533 | 0.3 | 214.4 | 32,763 (100.0%) |

The timings are meaningless: the kernel never ran. See the finding
below. **No GPU LUT speedup has been demonstrated**, and the row stays
open for M5C.

## Defect found by this procedure

**The WebGPU LUT build has never worked, and it silently replaces the
correct one.**

`lutBuildShader` declares `let target = …`, and `target` is a
**reserved keyword in WGSL**. The module fails to compile. WebGPU
reports shader compilation errors *asynchronously* — through
`getCompilationInfo()` and error scopes — so `createShaderModule` and
`createComputePipeline` do not throw, `buildLutGpu`'s `try/catch` never
fires, the dispatch is a no-op, and the zero-initialised result buffer
is read back as a perfectly well-formed all-zeros `Uint16Array`.

`ensureLut()` is GPU-first and caches whatever it gets, in preference to
the TS build. So on the real frame path:

```text
ensureLut (GPU-first) → distinct output colours: ["250,250,250"]
getLut   (TS)         → distinct output colours: ["255,180,150",
                          "250,250,250", "210,82,146", "109,26,43"]
```

Every pixel maps to palette index 0. In any WebGPU-capable browser,
**non-dithered palette reduction renders a solid single-colour image**,
and exports the same. Dithered output is unaffected (dither never uses
the LUT), which is why the app still looked plausible.

Why the suites missed it: the real-GPU block in `tests/webgpu-lut.test.ts`
is `describe.skipIf(!isWebGpuAvailable())`, and CI is node — so it never
runs anywhere. The f32 mirror it falls back to tests the *intended*
arithmetic, not the emitted shader.

Two lessons this procedure now encodes:

1. **Never accept a GPU result on timing alone.** P5 asserts bin
   agreement, and an implausibly fast GPU row is a defect signal.
2. **Always drain error scopes and `getCompilationInfo()`** around
   shader creation. A silent WGSL compile failure is indistinguishable
   from a successful zero-filled dispatch.

Follow-ups: M5-PERF-31 (fix + real-GPU coverage in CI).

## Production-build harness (M5D, 2026-07-20)

The console-probe procedure above runs against the **dev server**, which
serves unminified TypeScript. D47 flagged what that costs: its TS
figures ran 10–16× slower than node, so every TS-vs-GPU ratio taken that
way overstates the GPU. M5-PERF-23 was gated on re-measuring against a
production build, and a console probe cannot do that — the sources are
not served.

`bench.html` + `src/bench-browser.ts` is that harness. It is a real Vite
entry, so `npm run build` minifies it exactly like the app.

```sh
npm run build
npx vite preview --port 4173     # or preview_start "pattern-mapper-preview"
# open http://localhost:4173/bench.html
```

Results land in the page and on `window.__BENCH__` as JSON.

### Results — 2026-07-20, Apple M1 Max, Chromium/Metal-3, production build

Build `v0.5.0+20260720.df0e811`, WebGPU present, 10 cores, DPR 2.

| Measurement | Result |
| --- | --- |
| reduce (ts, LUT path) 1024²/64 | 17.1 ms |
| reduce (webgpu map) 1024²/64 | 11.8 ms |
| **GPU/TS ratio, production** | **~1.4×** (0.98 / 1.62 / 1.45 over three runs) |
| GPU map vs TS LUT path | **byte-identical** (0 differing bytes) |
| GPU LUT vs TS build, 64/lab | **0 mismatches** / 32,768 bins |
| GPU LUT vs TS build, 64/rgb | **0 mismatches** / 32,768 bins |
| GPU LUT vs TS build, 533/lab | **0 mismatches** / 32,768 bins |
| Pipeline 200²/64/lab | 42.7 ms → 23.4 updates/sec |
| Pipeline 300²/64/lab | 66.5 ms → 15.0 updates/sec |
| Pipeline 1024²/64/lab | 463 ms → 2.2 updates/sec |

**M5-PERF-23 gate: NOT MET — `mapPaletteGpu` stays unwired.** D47's
6.7× was a dev-server artefact almost entirely on the TS side; on a
production build the GPU wins ~1.4× on a 17 ms stage, so roughly 5 ms
per frame, and only on the *non-dithered* reduce path. The price is
the executor's asyncification — the most safety-critical code in
the worker, where D46 established that every request must answer exactly
once or live preview wedges permanently. Five milliseconds on one path
does not buy that risk. Re-open only if the reduce path becomes
dominant.

**M5-PERF-32 satisfied.** The WebGPU suites now execute on a real GPU
against a production build, and assert *bin agreement*, not timing —
including an all-zeros trap, since a kernel that never runs reads back
as a structurally valid all-zeros LUT (the D46 defect). All three
configurations are bit-exact.

**Pipeline rows are a lower bound on frame cost**, not the
preview-update boundary the product promise is stated at: they exclude
the worker round-trip, the `ImageBitmap` snapshot and the surface draw.
They can prove the promise is missed and can show headroom (3.8–5.9×
over the 4/sec bar at ≤ 300²); the end-to-end confirmation is P6 above
and the live rehearsal in M5-ACCEPT-03.

### Warmup artefact — read this before adding probes

The harness's first run reported 200² at **2.45 updates/sec** and 300²
at 15.06 — i.e. the smaller grid apparently six times slower than the
larger one. That was JIT warmup: 200² was measured first and absorbed
the compilation cost of the whole shared pipeline. It would have been
published as a product-promise **failure**. Every grid is now exercised
once before any grid is timed. Any probe added here must do the same.

---

## The bv2 harness run (M13-MEAS-02) — current procedure

One documented run of `/bench.html` on a production build emits
boundary-tagged, build-identified bv2 rows for `preview-update`,
`interaction` and `export`, plus capture cadence, dirty-skip,
forced-stale and both latest-wins drop counters with per-interval
snapshots and conservation checks. It measures the **shipped Worker
route** — `PipelineClient` → worker router → preview-surface draw —
using the worker's absolute-clock phase marks (`FrameMarks` in
`src/worker/protocol.ts`); Window and Worker have different
`performance.timeOrigin`s, so every cross-context mark travels as
`timeOrigin + now()`.

### Procedure

1. **Build and serve the production bundle:**

   ```sh
   npm run bench:browser     # vite build && vite preview (port 4173)
   # open http://localhost:4173/bench.html
   ```

2. **Fix the environment** — one browser window, foreground and
   visible, mains power, no other heavy applications. The report
   records viewport, DPR, visibility, timer resolution, WebGPU/WASM
   capability and build identity; a hidden page during a live window
   taints the run.
3. **Buttons 1–3b need no capture**: still-input `preview-update` rows
   (200², 300², via real worker submits), the M13-PROF-01 stage matrix
   (per-stage `StageTiming` rows over the shared bv2 workload IDs,
   through the real worker route), the M5-era GPU gates (LUT agreement
   plus the `mapPaletteGpu` comparison, now bv2 rows), the M13-PROF-02
   LUT-build timing (TS vs WebGPU end-to-end, first-call cold row
   separated), the `export` rows (composite clean-PNG/chart/PDF spans
   plus their pipeline/scale/encode/assembly children), the
   selection-source contention probe (a 250 ms still-submit pump with
   full-RGB `exportFrame` calls interleaved — the worker-side half of
   "does palette selection block live preview?"; the capture-path
   confirmation stays with M13-PROF-04), and the backend end-to-end
   comparison (M13-PROF-03, button 2c): TS↔WASM Floyd–Steinberg forced
   through the shipped worker route on the routing rules' own axes
   (metric × palette × grid, interleaved, byte equality of pixels and
   the palette-index sidecar asserted per cell), the TS-vs-`mapPaletteGpu`
   sweep, cold wasm/GPU initialisation rows, the export-boundary
   comparison on the routed-wasm workload, and the fallback probes
   (unregistered backend, non-FS delegation guard, GPU device loss —
   destructive, so it runs last). The force channel is harness-only:
   it rides on the worker *request* (`force` in
   `src/worker/protocol.ts`), never on `PipelineConfig`, so it cannot
   reach a project file.

   **Unattended form**:
   `bench.html?auto=still,stage,backend,livepath,gpu,lut,contention`
   runs the listed no-capture legs on load (`livepath` is the
   gestureless dirty-replay + stats pair, button 3c; `mem` — button
   3d's plateau/isolation/contention/peak set — is also a valid token,
   with its ~2 GiB transient peak probe in mind before running it
   unattended; `capture` and `editclasses` are the flag-granted
   capture legs — valid only under the sanctioned flagged launch, see
   "Automated owner-session legs" below);
   `&post=http://127.0.0.1:<port>/report` POSTs the finished bv2 JSON
   to a local collector. This exists so an agent can run the
   gestureless half in a real, foreground browser window it cannot
   script. **The page must be visible for the whole run**: a hidden or
   backgrounded page is CPU-throttled to the point of 10–20× inflated
   samples (measured 2026-07-23 — the in-app preview pane always
   reports `hidden` and can never be a measurement surface). The env
   row records visibility, so a background run is self-incriminating.
4. **Button 4 opens the controlled source window**
   (`/bench-source.html`) — the repeatable stand-in for "an edit in
   Photoshop". It repaints on command and reports its own paint
   timestamp over a same-origin `BroadcastChannel`, giving
   `interaction` a genuine start mark. Real Photoshop interaction
   remains the manual M13-ACCEPT-02 leg — never reconstructed here.
   Keep this window at least partially visible for the whole run: a
   fully occluded window has its `requestAnimationFrame` throttled, so
   its paint confirmations arrive seconds late or not at all.
5. **Button 5 starts capture** — the browser's picker requires the
   owner to choose the shared surface each run. **Share the controlled
   source window from button 4 for both capture legs**: capture frame
   delivery is damage-driven, so a surface that never repaints presents
   no frames at all — the first run (2026-07-23) shared the harness's
   own window and recorded 30 s of zeros. The harness warns at capture
   start if the shared surface matches this window's own width. A
   declined prompt is recorded as a `not-measured` row, never a zero.
6. **Button 6 measures a 30 s live window** — the shipped
   pump → dirty-gate → latest-wins → worker loop at a 300² grid, with
   counters snapshotted every 5 s, rvfc cadence metadata
   (`presentedFrames`) where the browser supports it, and
   counter-conservation violations reported as findings. While it
   runs, the harness drives the source window at 4 changes/sec (the
   product-promise cadence); commanded and confirmed paint counts ride
   in the row's `meta`. A window in which no frame ever arrives is
   published as `not-measured` with a tainting finding — never as
   0 updates/sec.
7. **Button 7 runs the controlled interaction sequence** (8 changes,
   each span: source paint mark → preview draw return of the first job
   started after it; misses are counted, not invented).
8. **Button 8 assembles the report** — bv2 JSON (schema 1, additive
   row `meta`), validity-assessed (clock drift, implausible samples,
   findings), downloadable and on `window.__BENCH__`. No captured
   pixels, surface names or source-window content enter it.

### Row identity

Still rows use bv2 matrix IDs. Rows whose input is the user-shared
surface use the `capture.g<grid>.<palette>.<metric>.<dither>` pseudo-ID
(the source is not a generated matrix class, and an ID must not lie
about its input — see `docs/measurement-contract.md`); actual capture
dimensions ride in the row's `meta`.

### Failure signature: zero-sample capture rows (2026-07-23)

The first owner run produced valid still/GPU/export rows but zero
samples on both capture legs: `callbacks: 0` across the whole 30 s
window, all 8 interaction changes missed **with** their source paints
confirmed, and a captured width equal to the harness viewport × DPR —
the shared surface was the harness's own (static) window, and the
then-current step 5 said "any surface" was fine. Two consequences are
now encoded above: the run document names the source window as the
surface to share, and the harness itself both warns at capture start
and refuses to publish a zero-frame window as a measured row
(`zeroFrameReason`, `src/bench/counters.ts`).

### Automated owner-session legs (M13-MEAS-03) — one command

```sh
npm run bench:auto
```

builds and serves the production bundle, then launches the installed
Chrome twice with a **dedicated throwaway profile** (never the daily
browser) and collects two validated bv2 reports into `bench-reports`:

- **`…-capture.json`** — the old Part A plus the six edit-class
  approximations: canonical live windows (300²/200², 30 s), the
  interaction run, and one 15 s window per Part-B edit class
  (`hands-off`, `pixel-marks`, `slow-stroke`, `large-fill`,
  `transform`, `rapid-scatter`) driven on the controlled source.
- **`…-mem.json`** — button 3d's memory leg in a
  `--js-flags=--expose-gc` Chrome: after the 5 s idle reading the
  harness forces a GC and re-reads, answering the D71 residue
  question (lazy major GC vs real retention) without DevTools.
- **`…-trace.json`** (`npm run bench:trace`, M13-MEAS-04 — D132's
  raw-CDP driver, Node built-in WebSocket, zero new dependencies) —
  the capture workloads re-run under browser-level tracing: GC
  pauses per measured window in three honest buckets (minor / major
  / incremental-marking, never summed — a marking step is
  main-thread work, not a stop-the-world pause), with the in-page
  PerformanceObserver long-task numbers quoted alongside, source
  named. Windows are located by the harness's own
  `bench:<workloadId>:<boundary>` User Timing marks, and the bench
  renderer self-identifies from those marks. **A trace-leg timing
  row is cross-context evidence** — recorded under tracing, it
  never replaces the untraced capture canon; the report's product
  is the GC accounting. The raw trace (large, may embed window
  titles) stays local in a `traces` subfolder of `bench-reports`.
  First canonical artefact: 2026-08-08 on `684811a` (D133) — GC
  ~0.4 % of wall time, max pause 12.5 ms, zero observer long tasks;
  see `docs/performance-evidence.md` → D133.

**Flag-granted capture is a sanctioned variant.** The launch flag
`--auto-select-window-capture-source-by-title` (probed on Chrome
151.0.7922.77, 2026-08-07: resolves `getDisplayMedia` with no gesture
and no picker, even against the shipped `displaySurface: 'monitor'`
hint; `--use-fake-ui-for-media-stream` breaks capture on that release
and is not used) replaces the owner's picker gesture; everything
after the grant is the shipped pump → dirty → latest-wins → worker
loop, unchanged. Honesty rules:

- Every self-incrimination guard stays load-bearing: visibility in
  the env row, `zeroFrameReason`, the surface-width warning — plus a
  new one, the **content guard**: the flag matches *any* window on
  the system whose title contains the substring, so before a single
  row is measured the harness commands verification changes and
  checks the captured pixels really show the controlled source.
  Close other windows whose title contains "controlled capture
  source" (an editor showing `bench-source.html`, for instance)
  before a run.
- Flag semantics vary by Chrome release — on a Chrome update, re-run
  the probe expectation (no gesture, no picker, content verified)
  before trusting a run; the launcher's validation catches the
  failure modes as non-zero exits.
- Edit-class rows carry the `.edit-<class>` ID tail and are
  **controlled-source numbers only** — never quoted as Photoshop
  capture behaviour, which is what the human Part B remains for.
- **Cross-check before canon**: the first automated capture report
  needed one picker-granted twin run confirming its canonical rows
  before any automated row could be quoted. Status: **held
  2026-08-08 (D131)** on the `52300de` pair — ratios 0.98–1.01×
  across the live and interaction rows, both reports untainted. A
  validated `bench:auto` capture report is now quotable without a
  manual twin. The check re-arms only when a Chrome update changes
  flag behaviour (re-run the probe expectation, then Part A′ below).
- Runs need an **awake desktop with both Chrome windows left at
  least partially visible** for the few minutes they take — "one
  command, hands off", never headless, never CI. A hidden page
  taints the run and the launcher refuses it.
- **`npm run bench:auto -- --when-quiet` automates the quiet-desktop
  precondition instead of bending it**: the launcher waits until the
  machine has seen no user input for `BENCH_IDLE_SECS` (default
  60 s), wakes and holds the display awake (`caffeinate`, macOS
  built-in — no user input is ever faked), runs, and — when a failed
  attempt's failures are wholly environmental (hidden windows,
  throttled source) — re-arms for the next quiet gap, up to
  `BENCH_ATTEMPTS` tries. Structural failures never retry. Arm it
  before stepping away; the artefact is waiting when you return.
- Every attempt writes a **timestamped** report file; only a leg
  that passed validation is also copied to the canonical unstamped
  name — the canonical artefact can never hold a tainted run, and a
  failed rerun can never clobber earlier valid evidence.

### The M13-PROF-04 owner session (rehearsal sheet, shrunk to the human legs)

What `bench:auto` cannot do is what remains. One sitting; keep every
shared window at least partially visible.

**Part A′ — one-time cross-check of the automated capture leg.
RETIRED 2026-08-08 (D131): the cross-check held** (ratios
0.98–1.01×, both reports untainted — see
`docs/performance-evidence.md` → D131). Kept as the rerun procedure
for when a Chrome update changes flag behaviour: one command runs
the whole thing on one build — `npm run bench:auto -- --crosscheck`
— the flag-granted leg, then a **picker-granted** leg in an
unflagged Chrome (the real picker appears; the launcher clicks the
controlled-source tile and Share itself via System Events where
Accessibility allows, and otherwise asks for that one human click),
then the side-by-side comparison table. Make the call yourself; the
next agent session records it in the decision log. The
clicked-buttons manual path (4 → 5 → 6 → 6b → 7 → 8, then
`npm run bench:crosscheck -- <downloaded report.json>`) remains
equivalent.

**Part B — Photoshop content (stays human by policy). DONE
2026-08-08 (D134)** — real-Photoshop rows banked
(`…da5d80b-photoshop.json`, local) and quoted in
`docs/performance-evidence.md` → D134; the taint in that report is
the filed harness ledger defect M13-DEF-03, not frame loss. The
procedure below stays for reruns. Button 5,
share the Photoshop window, rerun 6 and 6b while performing in order:
10 s hands-off (expect dirty skips plus a forced refresh at most every
2 s), 1 px pencil marks (expect up to ~2 s latency — the measured
detection floor, see the dirty replay rows), a slow continuous stroke,
a large fill, a transform drag, rapid scattered edits. Note perceived
latency, stalls and the draft badge per case; run button 8 again for a
second report. The automated edit-class rows approximate these cases
on the controlled source — useful for regressions, never a
substitute: real-Photoshop capture behaviour is the reason this part
exists.

**Part C — app-side responsiveness (DevTools trace), shrunk by
M13-MEAS-04. DONE 2026-08-08 (D134)** — a 156 s owner trace over the
real whole-screen + crop geometry (local under
`bench-reports/traces/`), GC/long-task numbers quoted in
`docs/performance-evidence.md` → D134; all adversarial checks
passed. The procedure below stays for reruns.
The GC-pause half is automated: `npm run bench:trace`
publishes per-window GC buckets on the controlled source (D132
approved the CDP driver; controlled-source numbers only). What
stays human: in the *app* (not the harness), capture Photoshop,
record a ~30 s Performance trace while editing, zooming/panning,
and toggling compare and the grid. Then the adversarial checks:
crop move/resize mid-capture, Freeze/Unfreeze (the capture pause
control's M14 name), end capture from the browser bar, a declined
re-prompt, the narrow companion layout, one export mid-edit.
Expected: no wedge, truthful status, clean recovery, export
unaffected by draft mode. Read Photoshop-content GC pauses off the
same trace if wanted — the automated leg already answers the
controlled-source question (M13-PROF-05). Traces and owner notes
stay out of committed reports if they show artwork; acceptance
itself stays with M13-ACCEPT-02.

**Part D — memory snapshot pair, now conditional (M13-PROF-05).**
The forced-GC reading in `…-mem.json` answers the D71 question first.
Only if it reports **real retention** does the manual snapshot pair
still matter: DevTools Memory → heap snapshot, button **3d**,
snapshot again, compare, and name the retained path. On a lazy-GC
verdict this part retires. Optionally run allocation sampling across
one button-6 live window for the churn profile.

### Interpretation limits

- The still `preview-update` rows start at the client's job post, not
  at a capture event — they exclude grab and dirty-sample cost. The
  live rows include the full path; compare like with like.
- `interaction` spans include the capture pipeline's own cadence
  (rvfc tick → grab → dirty check), which is the point: it is the
  user-visible number, never a sum of medians.
- The draft governor runs during live windows; its transitions are
  counted in the row meta, so a draft-mode window cannot pass as a
  full-quality figure.
