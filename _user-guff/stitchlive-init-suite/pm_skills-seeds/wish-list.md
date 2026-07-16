# Wish list — StitchLive

Raw parked ideas. Triage into backlog.md or cut. Section numbers
refer to `docs/requirements.md`.

## Second stage (spec §25)

- Additional dithering algorithms: Atkinson, Stucki, Sierra family,
  Jarvis–Judice–Ninke, Burkes, ordered Bayer, blue-noise, random,
  threshold (§8) — Bayer/blue-noise are the natural first WebGPU wins
- User-defined palettes: create/edit/merge/import/export (§5.3)
- Second preset palette; full manufacturer thread data (name, number,
  skein info) from owner's spreadsheet (§5.2)
- Dithering presets: save/load/import/export (§8.2)
- Full custom processing-order editor (advanced mode, §7)
- Cross-stitch symbols + symbol charts + B/W chart mode (§17)
- Advanced grid styling presets (§15) and full tick-mark controls (§16)
- Multi-page PDF: overlap, registration marks, repeated keys, cover
  and overview pages (§18)
- Physical-size calculations from fabric count; thread length and
  skein estimates (§4, §11)
- Colour-reduction extras: CIEDE2000, weighting controls, max
  colours, force-include/exclude, merge-similar, min-usage threshold
  (§6)
- More preview modes: simulated thread crosses, fabric preview,
  grayscale symbol chart (§10)
- Camera / virtual video device input (§3)

## Later (spec §25)

- Image adjustments panel: brightness/contrast/gamma/etc. (§9 — the
  `adjust` stage exists from M1; this is the UI + additional ops)
- Fabric simulation / finished-stitch rendering
- Automatic symbol assignment with similarity avoidance (§17)
- Tauri packaging; native ScreenCaptureKit region capture (D2)
- SVG chart and CSV stitch-data export; TIFF/WebP; print-ready ZIP
  (§19)
- Embroidery machine formats (§19)
- Photoshop integration revisited (only if screen capture proves
  insufficient — see D2)
- Cloud/collaborative projects (§25)
- Export presets system (§21)

## Open questions (spec §26 residue — see docs/init-answers.md)

- Which thread manufacturers beyond the first palette? Depends on
  owner's spreadsheet data.
- Maximum *useful* grid size — revisit the 1024 cap after M5
  benchmarks.
- Optimisation modes (accuracy vs perception vs stitchability, §6) —
  needs real stitching feedback before designing.
