# M8 dither evaluation evidence

Findings of M8-SPIKE-01: which dither methods are materially different
and useful for cross-stitch output, and which controls each genuinely
needs. The decision this evidence produced is recorded in the
decision-log (M8-SPIKE-01 entry); this file holds the durable detail
the implementation tickets (M8-ALG-01, M8-CTRL-01, M8-ACCEPT-01) build
against. Cite from here; do not duplicate the numbers into project
memory.

Re-generate with `npm run audit` (the `M8-SPIKE-01` block in
`tests/audits/m8-dither.audit.test.ts`); the run publishes a JSON
artefact and a side-by-side HTML gallery
(`bench-reports/m8-spike-01-gallery.html`) for visual judgement.
Evidence below was taken at commit `0983b0a`, node 24, Apple-silicon
macOS; timing rows are node medians under the bv1 harness plan.

## Method

- **Candidates.** Error diffusion (Floyd–Steinberg, Atkinson,
  Jarvis–Judice–Ninke, Stucki, Sierra Lite) through one generic
  kernel-as-data loop that reproduces the shipped stage byte-for-byte
  when given the FS kernel (asserted); ordered dithering (Bayer 4×4,
  8×8); a blue-noise threshold tile (32×32, void-and-cluster, seed
  `0x5eed` — generated, not an asset); and the mandatory no-dither
  control.
- **Fixtures** at 300² grid size: two-axis gradient, organic radial
  blends (skin/earth tones), flat graphic shapes, high-frequency
  detail, seeded noise, a transparent letterbox + hole, and
  near-palette colours (entries ± 6).
- **Palettes.** Quality metrics use 64 DMC threads sampled evenly
  across the catalogue (the bench `palette64()` is the first 64
  entries — a colour-family chunk whose poor coverage drowned quality
  signals in ≈ −16 L\* systematic bias on the first run; timing rows
  keep the bench palettes for comparability). Tiny-palette rows use an
  8-thread spread.
- **Metrics.** Pixel ΔE76 (added noise — dithered output is *expected*
  to score worse), tone ΔE76 over 4×4 box averages (what dithering
  buys: local average colour fidelity), signed L\* bias, isolated-stitch
  % (cells whose 4-neighbours all hold a different palette index — the
  stitchability cost), % pixels changed vs FS (distinctness), and
  timing at 300² × {p64, p533}.

## Findings

1. **Diffusion wins tone fidelity on smooth content.** Organic tone ΔE:
   FS 1.45, Sierra Lite 1.45, Stucki 1.55, Jarvis 1.75, Atkinson 2.67
   vs none 8.05 and ordered/blue-noise ≈ 5.85. The cost is isolated
   stitches: FS 36–50% on smooth fixtures.
2. **Atkinson is the calm outlier.** Roughly a third of FS's isolated
   stitches (gradient 16.7% vs 35.7%; organic 21.6% vs 49.6%) at a
   small tone cost, with the documented lightening bias (it sheds 2/8
   of the error) measurable but mild on real-range content.
3. **Stucki and Sierra Lite are redundant.** Both track FS/Jarvis
   within noise on every quality metric while sharing their isolation
   cost. Jarvis is the one large kernel that earns a slot (visibly
   smoother texture, consistently lower isolation than FS).
4. **Bayer 4×4 and 8×8 are indistinguishable at stitch scale** —
   identical metrics to 2 d.p. and near-identical pixels at these
   amplitudes. One ordered method suffices; **matrix size does not
   earn a control**.
5. **Blue-noise is ordered's better sibling on organic content.** Same
   pointwise cost, no periodic texture, and a half-to-quarter of
   ordered's isolated stitches (gradient 9.2% vs 24.4%; organic 16.0%
   vs 41.7%).
6. **Threshold methods respect flat and near-palette content;
   diffusion cannot.** Near-palette fixture: FS changes 0.45% of cells
   into isolated stitches, ordered ~15% (its fixed offset kicks
   near-matches across thread boundaries — the reason strength must be
   adjustable), none/Atkinson ≈ 0. On flat art, ordered isolation is
   2.3% vs FS 18.5%. Threshold methods are the graphic-content answer;
   diffusion is the photographic one.
7. **Cost does not differentiate.** All candidates land within
   ~10–20% of the no-dither reduce loop (node medians, noise 300²:
   25.8–34.1 ms at p64; 101–113 ms at p533); the palette scan
   dominates every method. **No accelerated backend is justified**;
   ordered/blue-noise are pointwise and WebGPU-shaped if a profile
   ever asks (D47 routing note stands).
8. **Strength is a real, visible control for every method.**
   Diffusion (fraction of error diffused, 0–1): 0.5 sharply cuts
   isolation (Atkinson 10.6→6.3, FS 29.5→24.6 on the p8 gradient) and
   *improves* tiny-palette tone (FS 27.9→23.9 — full diffusion
   oscillates across distant threads when the palette is sparse).
   Threshold (amplitude scale over a ±48/255 base offset): trades
   banding against noise, and tiny palettes want more than 1.0 (the
   base amplitude cannot bridge sparse-palette gaps).
9. **Serpentine remains diffusion-only; phase/seed earns no
   exposure.** The blue-noise tile is fixed and generated
   (void-and-cluster, seed `0x5eed`, provenance in
   `tests/audits/candidates/m8-dither-candidates.ts`); nothing
   stochastic ships.

## Decision (recorded in the decision-log)

Committed set — six user choices, each perceptually distinct:

| Method | Family | Why it ships |
| --- | --- | --- |
| none | control | mandatory comparison state |
| floyd-steinberg | diffusion | shipped default; best general tone |
| atkinson | diffusion | calm texture, few isolated stitches |
| jarvis | diffusion | smoothest large-kernel texture |
| ordered (Bayer 8×8) | threshold | mechanical/graphic look; flat-safe |
| blue-noise (32×32) | threshold | organic grain, no periodicity |

Cut: Stucki, Sierra Lite, Bayer 4×4 (each indistinguishable from a
kept method on this evidence).

Control surface: algorithm selector; per-method **strength** with the
per-family definitions above (diffusion 0–1 of error; threshold 0–2 ×
base amplitude); **serpentine** for diffusion methods only. No matrix
size, no phase, no seed.

Golden/fixture policy expectation for M8-ALG-01: deterministic
fixtures per method (kernel + threshold-tile hashes, boundary cases);
`tests/golden/**` remains protected and any addition there needs the
owner's explicit approval with the algorithm reason stated.
