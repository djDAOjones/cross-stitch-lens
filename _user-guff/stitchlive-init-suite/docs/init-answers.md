# Answers to requirements §26 — input for init interview

Decisions marked **(provisional)** should be confirmed by the owner
during init; everything else is settled.

1. **Platform:** macOS primary; web platform keeps Windows/Linux open
   for later distribution.
2. **Capture region:** arbitrary rectangle, implemented as
   screen/window capture + user-drawn crop rect (D2).
3. **Real time:** ≥ 4 preview updates/sec at ≤ 300×300 grids,
   < 250 ms capture-to-preview latency. Video frame rates are
   explicitly not required.
4. **Resize vs dithering order:** resize first by default (D3);
   alternative order available as a pipeline preset for comparison.
5. **Palette reduction vs dithering:** reduction and error-diffusion
   dithering are one fused stage (diffusion needs palette error
   terms); "dither before reduction" variants are post-MVP presets.
6. **Fully custom processing order:** post-MVP (advanced mode). MVP
   ships two comparable presets.
7. **Thread systems:** one preset palette in MVP, imported from the
   owner's existing hex spreadsheet **(provisional: DMC-subset
   placeholder until the spreadsheet is supplied — owner to attach it
   during init)**.
8. **Palette contents:** hex + RGB + thread name + number +
   manufacturer per entry (spec §5.2); symbols post-MVP.
9. **Transparency:** alpha below a threshold (default 50%) = empty
   stitch; empty stitches render as fabric colour in preview and are
   excluded from stitch counts' colour totals **(provisional)**.
10. **Printable chart:** yes — single-page PDF chart is in MVP (M3).
11. **Audience:** personal use first; wider distribution later —
    versioned formats and offline operation from day one.
12. **Offline:** fully offline at runtime.
13. **Project-version compatibility:** yes — `schemaVersion` + forward
    migration from v1 (D8).
14. **Max grid:** 1024 × 1024 technical cap, revisited after M5
    benchmarks.
15. **Unchanged-frame detection:** yes — downsample hash, skip
    identical frames (M4).
16. **Colour-matching priority:** perceptual (CIELAB) default;
    Euclidean RGB selectable in MVP; optimisation modes post-MVP.
17. **Chart coordinates:** start at 1 (cross-stitch convention);
    0-origin as an option later **(provisional)**.
18. **Tick alignment:** grid boundaries by default; centre alignment
    later **(provisional)**.
19. **Essential chart features for v1:** grid lines, major divisions
    every 10, row/column numbering, palette key with swatches, design
    title, dimensions.
20. **Clean PNG default:** 1 stitch = 1 pixel, plus integer-scale
    enlarged export. Non-integer scaling deliberately unsupported in
    clean export.
