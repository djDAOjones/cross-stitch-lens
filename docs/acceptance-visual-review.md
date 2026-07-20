# Visual output review — M5-ACCEPT-02

The maintainer-owned confidence review. An agent prepares the
comparisons and records the verdicts; it **must not approve taste**.

## What this review is, after D47

Narrower than the ticket originally assumed. Processing modes were cut
(D47) and every M5 change is bit-exact, so this is **not** a cross-mode
tolerance judgement. There is one fidelity, and the question is simply:
*is the output of the current engine good enough to stitch?*

Two things did change output since the M4 build you last looked at, and
both deserve specific attention:

1. **Empty cells no longer dither** (D49). Fully transparent cells were
   being quantised as opaque black and diffusing that error into the
   stitches beside them, so a `contain`/`fit` letterbox band wrecked the
   dither of the artwork it framed. Look hard at **letterboxed edges** —
   that is where the visible change is.
2. Nothing else. Every other M5 change is byte-identical to M4 output.

## The decision this review owes an answer to

**Should `reduce-first` stay user-reachable?** Measured at 32²/64
colours, its output is **1006 of 1024 cells off-palette across 955
distinct colours, 4 of which carry a thread reference** — against 14/14
for `resize-first` (D49). That is inherent: it maps to threads at source
resolution, then the resize area-averages them back off the palette.

It is a legitimate §7 *comparison* — it shows what the wrong order costs
— but it is not a way to produce a stitchable chart. Options: keep it
and label it clearly as a comparison, or cut it from the UI. Your call;
record it either way.

## Review set

Cover each content class. The first six are reproducible; the last is
the one that actually decides it.

| Class | Why it is in the set |
| --- | --- |
| Smooth wide gradient | The case dithering is judged on — banding and worms |
| Narrow / subtle gradient | Where too few threads shows up first |
| Photograph, skin and natural texture | Palette plausibility on real subject matter |
| Hard geometric edges, text-like detail | Edge integrity; detail surviving the grid |
| Transparency and semitransparent edges | The D49 change; empty-cell boundaries |
| Flat artwork, high-frequency pattern | Flat-area stability; pattern aliasing |
| **Your own real artwork** | The only one that can actually accept the engine |

Across the set, vary: **64 and 533 colours**, **RGB and Lab**, grids
**200 / 300 / 1024**, both **scan directions**, and the resize modes
that expose geometry (`contain` and `fit` for letterboxing, `cover` for
crop overflow).

## Protocol

- **Production build**, on a colour-managed sRGB display. Record browser
  zoom and display scaling — a chart judged at 90% zoom is not the chart.
- View each case at **stitch-level 1:1** and at a useful zoom. Artefacts
  that matter are spatial; a pixel-difference number is an aid, never a
  substitute for looking.
- Judge one controlled comparison at a time. Where practical, look
  before reading the label — expectation bias is real.
- Press **Copy diagnostics** for each case and keep the bundle with the
  verdict, so a rejection can be reproduced against an exact build.
- **Never move a threshold after seeing a failure** without recording
  that as its own decision.

## What to look for

Gradient smoothness and banding · directional worms or patterning ·
edge integrity and detail retention · transparency boundaries (D49) ·
palette plausibility — do the chosen threads look like the artwork ·
overall stitchability.

## Record

One row per case. Verdicts: **accept** · **reject** (name the artefact)
· **accept only under** (name the workload) · **inconclusive, retest**.

| Case | Palette | Metric | Grid | Resize | Scan | Verdict | Observed artefact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

**`reduce-first` decision:**

**Maintainer note (verbatim):**

## Exit

Representative coverage is accepted, or each rejection is recorded with
the artwork and config that produced it and becomes a concrete backlog
item. No protected golden fixture is regenerated during review — a
golden changes only with owner approval and a stated algorithm reason
(AGENTS.md). The closing decision-log entry cites the evidence location.
