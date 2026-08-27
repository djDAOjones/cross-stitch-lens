# STATE-01 — the state and lifecycle design (sitting)

The review's structural repair as a signed programme (the CREATIVE-01
pattern): one design signed once, then slices. Everything here is
proposal until the sitting signs it. Sources: PMR-01/02/03/04/09 in
`_user-guff/2026-08-26-repo-review.md` (untracked); the programme
artifact carries the critique and the full cut.

## The design to sign

- **Immutable request snapshots** — config, symbols, grid and paging
  are snapshotted at submission, travel with the request and return
  with the result; results are interpreted only against their
  snapshot. Today `worker/client.ts` retains the live config
  reference in its in-flight bookkeeping, and export reads live state
  after awaiting.
- **A source generation token** — every async continuation checks its
  generation; stale continuations drop.
- **One `transitionSource(next)`** — settles and stops the outgoing
  source (tracks, pump, video state) before installing the next;
  acquisition wraps in cleanup-on-failure.
- **One `clearSourceState()`** — bitmap, worker source, preview,
  capture state, names, origins and source-bearing export fields in
  one atomic clear, invoked on every source-less, missing or failed
  load.
- **One terminal settlement path per operation** — success, error,
  cancellation; worker `error` / `messageerror` / termination reject
  pending work, release the pump, and recreate or disable the worker
  explicitly.

## Proposed slices (the sitting may recut)

1. **STATE-02 — snapshots (PMR-01).** Done when a request held
   pending while every relevant control is mutated completes against
   its submitted snapshot, and a duplicate-RGB thread test proves
   identity follows the submitted palette.
2. **STATE-03 — source transitions and capture release
   (PMR-02 + 04).** Done when capture→file / sample / project /
   capture, late picker completion and `video.play()` failure each
   stop the superseded tracks exactly once (mocked); source-less and
   corrupt loads leave no previous image in preview, worker input,
   history bytes or package contents; verified live in Chrome plus
   one non-Chromium browser with the OS indicator observed off.
   Closes the live capture-retention privacy defect — first, if the
   owner wants it sooner.
3. **STATE-04 — worker settlement (PMR-09).** Done when every
   submitted operation reaches exactly one terminal state under fake
   `ProcessError` / `error` / `messageerror` / termination, and the
   app recovers or says plainly that it can't.
4. **STATE-05 — history queue (PMR-03).** Done when snapshots capture
   synchronously into immutable values, enqueue returns a promise
   resolving on commit-or-supersede (a real flush barrier), and rapid
   design switching under deferred image bytes never mixes JSON,
   image, title or ID across generations.

## Scope and risks

`src/main.ts` (5,677 lines — the hub; serial, no parallel streams),
`src/worker/client.ts`, `src/capture/session.ts`,
`src/capture/pump.ts`. No schema change. Prototypes on a worktree
branch (the creative-01-proto precedent). Each slice lands gated with
fake-worker / controlled-promise suites; the review's §9 test-gap
table is the test list.

## Sitting agenda

1. Sign or amend the five design elements.
2. Sign or recut the slice order — including whether STATE-03's
   capture-stop half is pulled forward.
3. Name the snapshot type and where it lives (core vs main).
4. Confirm STORE-01's seam: its `main.ts` adoption wiring lands after
   STATE-03.
