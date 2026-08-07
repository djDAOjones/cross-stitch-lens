# M15-DITH-05 — Dither acceptance session (absorbs M8-ACCEPT-01)

The maintainer half of the dither-profile acceptance. Absorbs the
M8-ACCEPT-01 session whole (D116): the five methods have shipped
since M8 without complaint, so the visual judgement runs once, on
the final profile surface, closing both gates in one session. This
is verification only: a correctness failure routes to the engine, a
misleading profile to the profile set (or reopens the D61 spike
decision if a method itself fails), an editor failure to
DITH-02/03 fix tasks.

## Already in place (automated half — D62, extended by DITH-04)

- Per-method unit suites (`tests/dither-algorithms.test.ts`):
  determinism, palette membership + truthful indices sidecar,
  transparency, boundary geometry, both metrics, non-default
  strengths, pairwise distinctness, serpentine scoping,
  threshold-tile provenance.
- Acceptance matrix rows for every method through the real worker
  entry (`tests/acceptance-matrix.test.ts`), including the FS-only
  wasm routing guard and letterbox/empty-cell diffusion; schema
  migration proofs; Floyd–Steinberg byte-identical to the pre-M8
  stage (golden suite); bench budgets green.
- DITH-04 adds: profile store round-trips, the no-rebuild
  regression on the dither kind, config-unchanged byte-identity.

## The session

Regenerate the gallery first: `npm run audit` writes
`bench-reports/m8-spike-01-gallery.html` (identical crops:
original, no-dither, every method at 64 spread DMC threads, Lab).
Then:

1. **Gallery review** — per method: banding, noise, edge damage,
   isolated single stitches, directional/worm/repeating artefacts,
   and whether the method's label predicts its look.
2. **Profile judgement** — per built-in profile, in the editor and
   live: does the name predict the look; are the basis lines
   honest; is any profile missing or redundant.
3. **Live capture** — real `getDisplayMedia` + Photoshop editing
   at 200²–300²: switch profiles while editing; the preview stays
   responsive and draft mode recovers.
4. **Editor comprehension** — duplicate a built-in, tune, Save;
   the unnamed/drift states read honestly; full-RGB shows the
   named demonstration palette; settings survive save/reopen.
5. **Exports** — at least one diffusion and one threshold profile;
   confirm they match the preview.
6. **Fallback** — one session with WASM/WebGPU unavailable.
7. **Access** — keyboard-only pass over the section and the
   editor; 200 % zoom; screen-reader labels on the select and the
   form fields.

Record pass/fail notes with inputs, settings, app/build identity,
browser/macOS, and display scaling. A/B between profiles uses
frozen captures or the gallery — live dual processing is not
authorised by this ticket (one processed pipeline per frame).

## References

- `docs/dither-evaluation.md` (the D61 evidence), decision-log
  D61/D62/D114/D116.
- `tests/acceptance-matrix.test.ts`, `tests/matrix/rows.ts`,
  `docs/acceptance-matrix.md`.
