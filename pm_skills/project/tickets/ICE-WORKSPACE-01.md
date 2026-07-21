# ICE-WORKSPACE-01 — Automated Photoshop companion workspace

## Outcome

One action creates a predictable side-by-side Photoshop/Lens arrangement on a
chosen display and can restore the previous windows safely. The feature has two
possible tiers: a browser-owned companion window plus manual Photoshop guidance,
and a packaged macOS workflow that may control both applications after explicit
permission. Do not promise the second tier until its spikes pass.

## Current baseline and capability boundary

M6 is building a responsive narrow layout, collapsible controls, focus mode, and
a browser companion-window spike. The app currently runs in an ordinary browser
tab and has no OS window-management or Photoshop integration.

The Screen Capture API deliberately requires the user to choose a capture source
for each permission request; constraints are applied after selection. It does
not grant authority to resize the captured application. Browser `moveTo()` and
`resizeTo()` may be ignored and are generally restricted to script-opened,
single-tab windows. The experimental Window Management API can describe screens
and place new windows with permission, but is not Baseline. Therefore the
browser tier must never claim it can move Photoshop or reliably take over the
user's existing browser window.

## Workspace calculation

Use the selected display's **usable work area**, logical-pixel scale, and stable
display identity. Inputs include:

- Lens side and user split percentage;
- minimum useful Lens width established by M6-NARROW-01;
- minimum Photoshop allocation agreed by owner testing;
- menu bar/Dock/taskbar exclusion and display scaling;
- current panel/focus mode and optionally pattern aspect for preview fitting;
- window states to restore, including display, bounds, maximised/full-screen
  status where the platform exposes it.

Return a pure layout proposal before moving anything. Clamp to both minimums and
show a visible “display too narrow” result rather than overlapping or placing a
window off-screen. Prioritise useful application space over matching the preview
to pattern pixels; preview fit belongs to M6-VIEW-01.

Suggested starting presets are Lens 25%, 30%, or 35%, on either side, plus
separate-monitor placement. Defaults need empirical Photoshop/Lens testing.

## Browser tier

M6-WIN-01 should test and, if reliable, expose “Open companion window” from a
direct user gesture. The child window can request a preset size, enter focus
mode, and remember its own UI preference. Provide plain manual instructions for
placing Photoshop. Detect popup blocking and unsupported multi-screen APIs, then
fall back to opening/using the current tab without data loss.

Do not persist absolute coordinates as the only state: monitors disconnect,
work areas change, and browser chrome changes outer/inner dimensions. Restore by
display preference + side + split, recalculate against current work area, then
clamp on screen.

## Packaged macOS tier

Tauri can manage its own windows and monitors, but Photoshop control still needs
a constrained macOS Accessibility/automation helper and explicit user consent.
The helper should accept only a validated layout command, identify a target
Photoshop window deterministically, and return structured outcomes. It must not
offer arbitrary AppleScript/shell execution.

Test Photoshop absent, no document, multiple documents/windows, full-screen or
minimised, multiple displays, Spaces, changed scaling, permission denied/revoked,
and app-version differences. Windows automation is a separate design; do not
generalise macOS findings.

## Apply and restore transaction

Before moving anything, snapshot each window's resolvable identity, display,
bounds, and state. Validate the proposed arrangement, move Lens first, then
Photoshop only when authorised. If a step fails, report partial state and offer a
safe restore. Restore must be idempotent, clamp missing-display coordinates to a
current screen, and never close windows or documents. A stale snapshot should
expire or require confirmation rather than surprising the user days later.

Persist layout preferences separately from the versioned design project: window
arrangement is device/app-shell state, not artwork state.

## Likely implementation surface

Browser: a small window-capability adapter, focus-mode command, shell preference
storage, accessible status/errors, and M6 layout primitives. Desktop: Tauri
window/monitor adapter plus a narrowly restricted Photoshop automation bridge.
Both consume the same pure layout proposal and structured result types.

## Acceptance evidence

Record a matrix across single/multiple displays, scaling/Dock positions,
supported/unsupported browser APIs, popup blocked, resize/move ignored,
Photoshop states, permission denied/revoked, interrupted apply, display removal,
and restore. Verify live capture continues, no project/settings are lost,
windows remain reachable, diagnostics are redacted, and keyboard/screen-reader
status is clear. The done condition requires a real Photoshop rehearsal, not
only mocked bounds.

## Dependencies

- M6-NARROW-01, M6-FOCUS-01, and M6-WIN-01 for the browser form.
- ICE-TAURI-01 for packaged capture/window feasibility.
- Promote only after the spikes define which tier is credible.

## References

- [Screen Capture specification](https://w3c.github.io/mediacapture-screen-share/).
- [MDN `window.moveTo()` restrictions](https://developer.mozilla.org/en-US/docs/Web/API/Window/moveTo).
- [MDN `window.resizeTo()` restrictions](https://developer.mozilla.org/en-US/docs/Web/API/Window/resizeTo).
- [MDN Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API).
- [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/).
