# DIAG-02 — Diagnostics for testers on the live build

## Why

The first live-app reports (MUST-01, COUNT-01) arrived as two
sentences with nothing attached, because the Debug menu — Copy
diagnostics, Download log, Email the dev — is compiled out of
production builds (`src/main.ts`, `import.meta.env.DEV`). The owner's
saved project file turned out to carry the whole mechanism; a tester
would not have known to send it.

## Shape

1. **Opt-in on the live build.** Mount the Debug menu in production
   when the URL carries `?diag=1` (the `DIAG=1` flag
   `DEV-INFRASTRUCTURE.md` → "Maintainer diagnostics" already
   reserves), after the redaction review that section asks for. The
   bundle's `dev` flag then reads `false`, which is what it was
   designed for. The profiling panel stays dev-only.
2. **Log the palette.** `resolvePalette` logs each resolution at
   `info`: profile id, count rule, Must-use ids, membership size,
   selected size, conflict kinds, whether a selection source was
   present, and `null` when resolution failed — the facts COUNT-01
   needed and the bundle could not give.
3. **One-click report.** "Report a problem" saves the project JSON
   (the palette snapshot *is* the palette half of any report) and the
   redacted log together, then opens the email route. Needs the
   `DEV_EMAIL` placeholder decided — it ships in a public bundle.

## Done when

A tester on the live URL can open `?diag=1`, press Report a problem,
and the result names the build, the profile, the count rule, the
seats, the resolved palette size and every conflict — without a
screen share.

## References

`src/diagnostics/bundle.ts` (redaction, the `dev` flag),
`src/ui/diagnostics-button.ts` (the three routes, `DEV_EMAIL`),
`src/diagnostics/log.ts` (200-record ring buffer, 80 in a bundle).

## Shipped 2026-08-23 (D175)

Shapes 1 and 2. `diagnosticsRequested(search)` in
`src/ui/diagnostics-button.ts` is the rule (`?diag=1`, literal); the
mount in `src/main.ts` is `import.meta.env.DEV || diagnosticsRequested(…)`
and the bundle's `dev` flag now reports the build truthfully. The
redaction review (every logger call read): sizes, timings, backend
names, export options, user-chosen filenames, the capture's display
label, crop coordinates, browser error messages — nothing from
storage, no credentials. `resolvePalette` logs each resolution at
`info` with profile, count rule, Must-use ids, membership, selected,
locked, conflict kinds and whether a selection source was present, or
"resolved to nothing". Remaining: shape 3, the one-click report.
