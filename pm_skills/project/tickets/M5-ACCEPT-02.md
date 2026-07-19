# M5-ACCEPT-02 — Review processing-mode output

## Maintainer gate

This is a human visual decision facilitated by an AI chat, not an agent-owned coding task. The chat
should prepare deterministic comparisons, guide review against pre-approved thresholds, capture the
maintainer’s acceptance/rejection verbatim in substance, and ticket rework. It must not approve taste.

## Review set

Use representative gradients (smooth and narrow), photographs/skin/natural texture, hard geometric
edges/text-like detail, transparency/semitransparent edges, flat artwork, high-frequency patterns, and
the maintainer’s real artwork. Include 64 and 533 colours, RGB/Lab where user-reachable, 200/300/1024,
resize modes that expose alpha/geometry, and both scan directions where relevant.

For each retained mode show the same source/crop/config at stitch-level 1:1 and useful zoom, labelled
without backend names. Include Exact as reference, Balanced, and Responsive only if retained. Provide
pixel/distance/change summaries as aids, not substitutes for viewing spatial artefacts and stitchability.

## Protocol

Use a production build on a colour-managed sRGB display with browser zoom/display settings recorded.
Randomise or blind ordering where practical to reduce expectation bias, while retaining a labelled pass
for contract comprehension. Review gradients, edge integrity, patterning/worms, detail, transparency,
palette plausibility, and overall creative acceptability against MODE-01 thresholds.

Capture for each case: accept; reject with observed artefact; acceptable only under named workload; or
inconclusive/retest. Record screen/output files, config/workload ID, app/build ID, browser/display hints,
and exact maintainer note. Never move thresholds after seeing failures without a new sign-off decision.

## Exit

Every retained mode has accepted representative coverage and documented differences, or a rework/cut
decision. Rejections become concrete tickets tied to fixtures/workloads. No protected golden is changed
during review. Final decision-log entry cites the approved visual threshold and evidence location.

## Fresh-chat starting point

Read M5C/MODE-01 visual contracts and completed ACCEPT-01. Prepare the review sheet/assets and ask the
maintainer to judge one controlled comparison at a time. Do not begin implementation while facilitating.
