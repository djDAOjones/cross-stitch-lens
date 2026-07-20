# Acceptance matrix — M5-ACCEPT-01

The integrated correctness and parity matrix: the automated half of the
M5F acceptance gate. It exists because the per-stage suites each prove
one stage against its own contract and none of them can prove the
*composed* pipeline stays correct across axes a user reaches together.

- **Rows:** `tests/matrix/rows.ts` (definitions, sources, palettes).
- **Driver:** `tests/acceptance-matrix.test.ts` — runs in `npm run check`.
- **This table:** generated from the rows; regenerate with
  `npm run matrix:write` after changing them. The suite fails if the
  committed table drifts, so `check` stays non-mutating.

## What each row asserts

Every row is driven through `executeRequest` — the real worker entry, so
the LUT cache, the candidate cache, workload routing (D48) and the
`?? backends.ts` fallback are all in the loop — and asserts the same
named invariants:

| Invariant | Claim |
| --- | --- |
| Answers | A result, never an error response. |
| Dimensions | Output is exactly the grid, whichever preset ran. |
| Purity | The source buffer is unchanged after the run. |
| Determinism | The same request twice is byte-identical. |
| Palette membership | Every stitch is a palette colour. |
| Empty cells | An empty cell is `RGBA(0,0,0,0)` — never a quantised thread colour. |
| Alpha | The alpha the geometry produced survives the colour stages. |

Two adversarial claims need a bespoke oracle rather than a shared
invariant, because they are about *which* of two equally-good answers is
returned: a duplicated palette entry must resolve to its first index,
and the LUT must agree with the exact scan on every bin of a near-tie
palette.

## Explicit skips

Recorded rather than silently omitted, per the M5-ACCEPT-01 exit
conditions:

| Skipped | Why | Covered instead by |
| --- | --- | --- |
| Ceiling grid (1024²) | `check` must stay under ~2 min; a dithered 1024² row is ~0.9 s alone (D48). | `MATRIX_FULL=1 npm test` |
| Real GPU | node has no `navigator.gpu`. | `bench.html` on real hardware (M5-PERF-32, D48); f32 mirror in `webgpu-lut.test.ts` |
| WASM parity on empty cells | The local `crates/stitch-engine/pkg/` is whatever was last built, and the maintainer's machine has no Rust toolchain. | CI `check:wasm` (crate unit test `transparent_cells_do_not_diffuse_error_into_stitches`) |
| Live capture, latency, editing feel | Not observable in node; not an automated claim. | M5-ACCEPT-03 (maintainer rehearsal) |
| Visual/creative acceptability | Taste is not an assertion. | M5-ACCEPT-02 (maintainer review) |

## Coverage table

<!-- matrix-coverage:begin -->

| Row ID | Grid | Palette | Metric | Colour | Scan | Order | Resize | Alpha | Proves |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `noise.g32x32.p64.lab.nodither.serp.resize-first.stretch.opaque` | 32×32 | p64 | lab | reduce | serpentine | resize-first | stretch | opaque | resize-first × lab × reduce composes and routes |
| `noise.g32x32.p64.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | resize-first × lab × dither composes and routes |
| `noise.g32x32.p64.rgb.nodither.serp.resize-first.stretch.opaque` | 32×32 | p64 | rgb | reduce | serpentine | resize-first | stretch | opaque | resize-first × rgb × reduce composes and routes |
| `noise.g32x32.p64.rgb.dither.serp.resize-first.stretch.opaque` | 32×32 | p64 | rgb | dither | serpentine | resize-first | stretch | opaque | resize-first × rgb × dither composes and routes |
| `noise.g32x32.p64.lab.nodither.serp.reduce-first.stretch.opaque` | 32×32 | p64 | lab | reduce | serpentine | reduce-first | stretch | opaque | reduce-first × lab × reduce composes and routes |
| `noise.g32x32.p64.lab.dither.serp.reduce-first.stretch.opaque` | 32×32 | p64 | lab | dither | serpentine | reduce-first | stretch | opaque | reduce-first × lab × dither composes and routes |
| `noise.g32x32.p64.rgb.nodither.serp.reduce-first.stretch.opaque` | 32×32 | p64 | rgb | reduce | serpentine | reduce-first | stretch | opaque | reduce-first × rgb × reduce composes and routes |
| `noise.g32x32.p64.rgb.dither.serp.reduce-first.stretch.opaque` | 32×32 | p64 | rgb | dither | serpentine | reduce-first | stretch | opaque | reduce-first × rgb × dither composes and routes |
| `noise.g32x32.p64.lab.dither.serp.resize-first.contain.letterbox` | 32×32 | p64 | lab | dither | serpentine | resize-first | contain | letterbox | contain letterboxes with empty cells that take no part in diffusion |
| `noise.g32x32.p64.lab.dither.serp.resize-first.cover.opaque` | 32×32 | p64 | lab | dither | serpentine | resize-first | cover | opaque | cover crops the overflow and leaves no empty cell |
| `noise.g32x32.p64.lab.dither.serp.resize-first.fit.letterbox` | 32×32 | p64 | lab | dither | serpentine | resize-first | fit | letterbox | fit never enlarges — a smaller source is centred unscaled |
| `noise.g40x11.p64.lab.dither.serp.resize-first.contain.letterbox` | 40×11 | p64 | lab | dither | serpentine | resize-first | contain | letterbox | non-square grid with an odd edge — row/column indexing off the square case |
| `noise.g1x1.p64.lab.dither.serp.resize-first.stretch.opaque` | 1×1 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | MIN_GRID: a 1×1 grid is a whole design, not a degenerate buffer |
| `noise.g1x9.p64.lab.dither.serp.resize-first.stretch.opaque` | 1×9 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | single-column grid — serpentine has no horizontal run to reverse |
| `noise.g9x1.p64.lab.dither.serp.resize-first.stretch.opaque` | 9×1 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | single-row grid — no row below to diffuse into |
| `noise.g200x200.p64.lab.dither.serp.resize-first.stretch.opaque` | 200×200 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | the typical live-editing grid from the brief |
| `noise.g300x300.p64.lab.dither.serp.resize-first.stretch.opaque` | 300×300 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | the upper bound of the product promise (≥ 4 updates/sec at ≤ 300²) |
| `noise.g1024x1024.p64.lab.dither.serp.resize-first.stretch.opaque` | 1024×1024 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | MAX_GRID: the export/finishing ceiling (D47) *(MATRIX_FULL only)* |
| `noise.g32x32.rgb.lab.nodither.serp.resize-first.stretch.opaque` | 32×32 | rgb | — | none | serpentine | resize-first | stretch | opaque | full-RGB mode runs no colour stage and keeps source colours |
| `noise.g32x32.p2.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | p2 | lab | dither | serpentine | resize-first | stretch | opaque | two-colour palette — maximal quantisation error |
| `noise.g32x32.p533.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | p533 | lab | dither | serpentine | resize-first | stretch | opaque | full DMC set — the 533-entry scan and pruning path |
| `noise.g32x32.dup.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | dup | lab | dither | serpentine | resize-first | stretch | opaque | duplicate palette entries resolve to the FIRST index, both paths |
| `noise.g32x32.neartie.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | neartie | lab | dither | serpentine | resize-first | stretch | opaque | near-ties are decided identically by the LUT and exact paths |
| `noise.g32x32.nodark.lab.dither.serp.resize-first.contain.letterbox` | 32×32 | nodark | lab | dither | serpentine | resize-first | contain | letterbox | the empty-cell diffusion defect: no near-black to absorb a phantom error |
| `noise.g32x32.p64.lab.dither.serp.resize-first.stretch.ramp` | 32×32 | p64 | lab | dither | serpentine | resize-first | stretch | ramp | semitransparent edges survive resize and reduction |
| `noise.g32x32.p64.lab.dither.serp.resize-first.stretch.empty` | 32×32 | p64 | lab | dither | serpentine | resize-first | stretch | empty | a fully transparent source yields a fully empty design, not black |
| `noise.g32x32.p64.lab.dither.serp.reduce-first.stretch.ramp` | 32×32 | p64 | lab | dither | serpentine | reduce-first | stretch | ramp | alpha ramp under colour-work-first, where resize runs last |
| `noise.g32x32.p64.lab.dither.raster.resize-first.stretch.opaque` | 32×32 | p64 | lab | dither | raster | resize-first | stretch | opaque | raster scan — the un-mirrored kernel |
| `gradient.g16x16.p64.lab.dither.raster.resize-first.stretch.opaque` | 16×16 | p64 | lab | dither | raster | resize-first | stretch | opaque | smooth gradient, raster — the content dithering is judged on |
| `flat.g32x32.p64.lab.dither.serp.resize-first.stretch.opaque` | 32×32 | p64 | lab | dither | serpentine | resize-first | stretch | opaque | flat blocks — long identical runs |
| `gradient.g32x32.p64.rgb.dither.serp.resize-first.stretch.opaque` | 32×32 | p64 | rgb | dither | serpentine | resize-first | stretch | opaque | RGB metric on a gradient — routes to wasm, no Lab conversion |

<!-- matrix-coverage:end -->
