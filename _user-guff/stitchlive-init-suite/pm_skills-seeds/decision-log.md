# Decision log — StitchLive

Append-only. Newest at the bottom.

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
