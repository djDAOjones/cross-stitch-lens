# Backlog — StitchLive

Milestones ship in order. A milestone is done when its acceptance
line passes and `check` is green. Requirements references are to
`docs/requirements.md`.

## M0 — Scaffold & quality gate

- [ ] Vite + TS strict + ESLint (incl. core-isolation rule) + Vitest
- [ ] `check` script: typecheck + lint + test + build
- [ ] CI workflow running `check`
- [ ] Core types: `PixelBuffer`, `Palette`, `Stage`, `ProjectFile` (v1 schema stub)
- [ ] Golden-test harness (fixture load/compare with per-test tolerance)

*Acceptance: `npm run check` green on a hello-world pipeline test.*

## M1 — Engine core (TS reference, §4–§8)

- [ ] Image import (file picker, drag-drop, clipboard paste)
- [ ] Resize stage: fit/contain/cover/stretch to grid, 1×1–1024×1024
- [ ] Colour: sRGB↔linear↔Lab conversions + Euclidean-RGB and CIELAB metrics (golden-tested against published reference values)
- [ ] Palette model + one preset palette imported from owner's hex spreadsheet (placeholder DMC-subset until supplied)
- [ ] LUT builder (15-bit RGB → palette index) in worker
- [ ] Reduce stage (LUT path + exact path used by dither)
- [ ] Floyd–Steinberg dither stage (serpentine option), seedable
- [ ] Pipeline executor in Worker with configurable stage order; two order presets: adjust→resize→reduce+dither vs adjust→reduce+dither→resize (§7 comparison)
- [ ] Stats: colour count, stitch counts, per-colour counts, % usage (§11 subset)

*Acceptance: import PNG → 200×200, 16-colour dithered output renders
correctly; golden tests for every stage; save→load→save byte-identical.*

## M2 — Preview & info UI (§10 subset)

- [ ] OffscreenCanvas preview in worker; zoom, pan, fit-to-window
- [ ] Grid overlay: show/hide, minor/major interval, line colour/thickness (§15 subset)
- [ ] Basic tick marks + row/column numbering, origin at 1 (§16 subset)
- [ ] Source vs output split compare
- [ ] Info panel bound to stats (live update)
- [ ] Carbon-based control panels for grid, palette/colour mode, dither on/off, pipeline order preset

*Acceptance: 60 fps pan/zoom at 1024×1024; controls update preview
< 150 ms end-to-end at 200×200.*

## M3 — Exports (§12–§14, §18–§19 subsets)

- [ ] Clean PNG at 1 px/stitch; transparent or solid background
- [ ] Enlarged PNG, integer nearest-neighbour scale
- [ ] Styled PNG chart: stitch cells + grid + major lines + numbering
- [ ] Single-page PDF chart (pdf-lib): A4/Letter, portrait/landscape, margins, design title, palette key (colour swatches + hex; symbols are post-MVP)
- [ ] Project save/load as JSON v1 (§20), schema documented

*Acceptance: printed A4 PDF of a 100×100 design is legible and
stitchable; clean PNG pixel-equal to engine output buffer.*

## M4 — Live capture (§3, §22)

- [ ] `getDisplayMedia` screen/window session with permission UX
- [ ] User-drawn crop rectangle over live thumbnail; move/resize/lock
- [ ] Frame pump: `requestVideoFrameCallback`, latest-wins coalescing
- [ ] Dirty-frame skip via 64×64 downsample hash
- [ ] Pause/resume, manual refresh, draft-quality mode under load

*Acceptance: editing in Photoshop at 200×200 grid sustains ≥ 4
preview updates/sec with < 250 ms latency; idle frames cost ~0 CPU.*

## M5 — WASM + WebGPU backends (§22, §23.5)

- [ ] Profiling harness: per-stage timings surfaced in a debug panel
- [ ] Rust crate: Floyd–Steinberg (SIMD), wasm-pack build wired into Vite + `check`
- [ ] WASM backend registered for dither stage; golden tests bit-exact vs TS
- [ ] WebGPU compute: LUT build + palette mapping (WGSL); tolerance-tested
- [ ] Automatic backend selection (feature-detect + profile); TS fallback verified by disabling both in tests
- [ ] Benchmark test asserting architecture.md budgets at 1024×1024

*Acceptance: full pipeline ≤ 100 ms at 1024×1024/64 colours on the
dev Mac; all backends pass the same golden suite.*

---

**Parked next (post-MVP, triage from wish-list):** more dithering
algorithms, user-defined palettes, symbols + B/W charts, multi-page
PDF, advanced grid/tick styling presets, thread estimates, Tauri
packaging.
