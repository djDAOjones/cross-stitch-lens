# M8-ACCEPT-01 — Visual-quality acceptance session (maintainer)

## Outcome

Owner sign-off evidence that the five shipped dither methods —
Floyd–Steinberg, Atkinson, Jarvis, ordered (Bayer 8×8), blue-noise —
are useful, comprehensible, and fast in the real capture workflow.
This is verification only: a correctness failure routes back to the
engine, a misleading control/preset to the controls, an unhelpful
method reopens the D61 spike decision.

## Already in place (automated half, shipped with D62)

- Per-method unit suites (`tests/dither-algorithms.test.ts`):
  determinism, palette membership + truthful indices sidecar,
  transparency, boundary geometry, both metrics, non-default strengths,
  pairwise distinctness, serpentine scoping, threshold-tile provenance.
- Acceptance matrix rows for every method through the real worker entry
  (`tests/acceptance-matrix.test.ts`), including the FS-only wasm
  routing guard and letterbox/empty-cell diffusion.
- Schema v4 migration proofs: old Boolean projects reopen with
  byte-identical Floyd–Steinberg / no-dither output; new configs
  round-trip byte-identically.
- Floyd–Steinberg remains byte-identical to the pre-M8 stage (golden
  suite) and the benchmark budgets pass (`npm run bench`).
- Control model state matrix (`tests/dither-model.test.ts`): preset ↔
  custom transitions, per-method session memory, per-family strength.

## The session

Regenerate the gallery first: `npm run audit` writes
`bench-reports/m8-spike-01-gallery.html` (identical crops: original,
no-dither, and every method at 64 spread DMC threads, Lab). Then:

1. **Gallery review** — per method, note banding, noise, edge damage,
   isolated single stitches, directional/worm/repeating artefacts, and
   whether the method's label predicts its look.
2. **Live capture** — real `getDisplayMedia` + Photoshop editing at
   200²–300²: switch methods and presets while editing; confirm the
   preview stays responsive and draft mode recovers.
3. **Controls comprehension** — in a narrow companion window: preset →
   custom flow, strength effect visible for every method, serpentine
   only on diffusion methods, settings survive save/reopen.
4. **Exports** — clean/enlarged PNG, chart PNG, PDF for at least one
   diffusion and one threshold method; confirm they match the preview.
5. **Fallback** — one session with WASM/WebGPU unavailable (TS path).
6. **Access** — keyboard-only pass over the Dither group; 200% zoom;
   screen-reader labels on the two selects and strength field.

Record per-method pass/fail notes with inputs, settings, app/build
identity, browser/macOS, and display scaling. A/B between methods uses
frozen captures or the gallery — live dual processing is not
authorised by this ticket (one processed pipeline per frame).

## References

- `docs/dither-evaluation.md` (the D61 evidence), decision-log D61/D62.
- `tests/acceptance-matrix.test.ts`, `tests/matrix/rows.ts`,
  `docs/acceptance-matrix.md` (regenerated coverage table).
