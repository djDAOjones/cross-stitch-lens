# PRINT-TEST-01 — The proof set: one command prints every case with a checklist

Scoped 2026-08-23 with PRINT-01. Separate by the owner's instruction:
print testing should be push-button, and every later print change
re-runs it. The M16 sitting pack (`bench-reports/m16-sitting/`, built
by hand from the in-app browser) is the prototype; this makes it a
script.

## Shape

`npm run print:proof` renders, from a fixed design (the demo
`landscape-1.jpg` at 200², plus 100² and a 1024² stress case), every
chart style × print-size preset × paper (A4, Letter) × mode (single,
join, sequence, large format) into `bench-reports/print-proof/`
(machine-local, gitignored, like every report). Each sheet carries a
**proof strip**: proof id (`P-07`), what it is, the settings, the
expected mm per stitch, the build id, and a **50 mm scale bar** so a
ruler proves the print ran at 100 %. The same run writes
`CHECKLIST.md`: one line per sheet, cross-referenced by id, saying what
to look for — numbers readable at arm's length, symbols distinct (the
known pairs), trim lines aligning between named sheets, the key
matching the chart, the accessibility floors measured against the
standard — with tick boxes. Verdicts go to the decision log (the
pack's convention), never into the folder.

## Implementation notes

- Runs under Node if PRINT-01 takes the vector chart path (the real
  planner and PDF builders already run under Node — the pack's
  `geometry.mjs` proved it); otherwise it drives the browser harness the
  way `bench:auto` does (downloads intercepted).
- A dev-only Debug-menu route "Print proof set" is a one-line
  follow-up once the script exists; the script is the button first.
- New script → a `DEV-INFRASTRUCTURE.md` scripts-table delta; stays
  outside `check` (it writes artefacts and takes minutes).
- The matrix is data, so a preset or paper added later appears in the
  set without touching the script.

## Done when

The set renders from one command; every sheet identifies itself and
its expected measurements; the checklist covers every sheet and the
accessibility floors; a ruler on the scale bar proves 100 %; the M16
sitting can be repeated from it in one sitting.
