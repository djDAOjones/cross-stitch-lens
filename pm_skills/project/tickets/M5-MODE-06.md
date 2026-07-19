# M5-MODE-06 — Improve adaptive draft behaviour

## Conditional behaviour

If Responsive ships, adaptive draft should temporarily use Responsive before disabling dithering. If
Responsive is cut, retain today’s dither-off substitution and close with that decision recorded. In both
cases the user’s selected processing mode remains unchanged and exports never inherit the substitution.

## Current governor

`capture/draft.ts` observes processing duration against a target, enters draft after sustained overload,
and recovers with hysteresis after sustained fast frames. Main derives an effective config that disables
dither while draft is active; UI visibly names draft. Pause/resume and capture restart must reset or preserve
state according to current tested lifecycle. There are two load gates (capture and worker), so duration alone
may omit queue/drop pressure.

## Design questions from evidence

Define overload signal (compute duration, end-to-end latency, drops/queue, or approved combination), thresholds,
entry/recovery sample counts, minimum dwell, and transition order. If selected mode is already Responsive, decide
whether draft disables dither next or makes no further substitution. Exact/Balanced users must recover to their
selected mode automatically; manual mode changes during draft must update the recovery target safely.

Keep adaptive state runtime-only. Log transitions and reason through the structured logger without per-frame spam;
diagnostics should show selected mode, effective mode/substitution, thresholds, and recent counters, never pixels.

## Tests

- State-machine boundaries: just below/above thresholds, consecutive evidence, oscillation, dwell, recovery,
  reset/pause/resume, changing selected mode while draft, Responsive absent/already selected.
- Integration: effective preview config follows the approved substitution ladder; serialized project config and
  export config never change; status/ARIA announcement accurately names draft and recovery.
- Live manual: sustained overload and recovery on representative capture, dropped frames and visual disruption,
  no rapid flapping, idle CPU, export during draft.

## Likely files and done evidence

`capture/draft.ts`, `main.ts`, pipeline mode resolver, info/status UI, diagnostics, draft/integration/project/export
tests. Done when hysteresis is stable under synthetic and live loads, substitution is honest, persistence/export
isolation passes, `npm run check` is green, and before/after live evidence is recorded.

## Fresh-chat starting point

Read MODE-01/03, PERF-16/17 evidence, D36, draft source/tests, and UI live-processing rules. Confirm Responsive’s
retain/cut status before planning; do not invent a new creative mode inside the governor.
