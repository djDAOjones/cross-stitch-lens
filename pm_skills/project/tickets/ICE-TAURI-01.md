# ICE-TAURI-01 — Tauri desktop-packaging feasibility spike

## Outcome

Decide whether a Tauri package materially improves Cross Stitch Lens's
Photoshop-companion workflow enough to justify a second application surface.
Produce a go/no-go recommendation, evidence for the difficult capabilities, and
a delivery/security outline. Do not begin packaging or add dependencies during
the spike without separate approval.

## Current web baseline

The app is a Vite/TypeScript browser application whose core processing runs in a
Web Worker. It uses `getDisplayMedia` for user-selected screen/window capture,
OffscreenCanvas for rendering/export, optional WASM/WebGPU backends, browser file
downloads/imports, and a versioned JSON project schema. That pure core and
worker-message boundary are favourable for reuse inside a webview, but browser
API presence does not prove equivalent permissions or capture behaviour in a
packaged macOS webview.

## Questions the spike must answer

### Capture and permissions

- Does the actual Tauri macOS webview expose the current capture flow, source
  chooser, frame rate, region cropping, and audio-free constraints reliably?
- If not, is a small ScreenCaptureKit bridge required, and can it deliver frames
  as transferables without moving processing onto the main thread?
- What Screen Recording prompts, denial/retry states, app restart, and signed-app
  identity behaviour occur on supported macOS versions?
- Can web and native builds retain one capture-session interface rather than
  branching throughout `main.ts`?

Apple's ScreenCaptureKit is the native reference and can present system capture
selection, but Tauri's official plugin catalogue does not currently provide a
screen-capture plugin. Treat a custom bridge as material native code and ongoing
maintenance, not a configuration toggle.

### Window/workspace value

Prototype Tauri's logical position/size, monitor enumeration, always-on-top if
desired, and window-state restoration. Then test the real ICE-WORKSPACE-01 need:
arranging Lens is straightforward; moving Photoshop requires a separate,
tightly-scoped macOS Accessibility/automation mechanism and permission. Tauri
does not itself grant control over another application's windows.

### Platform and distribution

- Minimum macOS/Windows versions and WebView feature parity.
- Apple signing, hardened runtime, entitlements, notarisation, first-launch
  prompts, and update signing; Windows code signing/SmartScreen equivalents.
- Secure update channel and rollback, with product version plus build identity.
- Project-file byte compatibility between web and desktop builds.
- GPU/WASM availability, benchmark parity, diagnostics, crash/error collection,
  and one-command dev/runtime/quality gates.

## Security boundary

Use Tauri capabilities with least privilege per window. Inventory every command,
filesystem path, shell/automation action, URL, and update permission. No generic
shell execution, arbitrary path access, secret in configuration, or broad remote
content. Photoshop automation, if tested, should accept a constrained layout
request rather than user-supplied script text. Diagnostics remain redacted.

## Spike method and artefacts

Build the smallest throwaway vertical slice on a disposable branch or scratch
area: app window → permission → live captured frame → current worker pipeline →
preview, plus save/open one project and restore one window position. Measure the
same fixtures and build identity as the web app. Record an environment matrix,
permission screenshots/errors, capture/update rates, CPU/memory, package size,
signing/notarisation steps, native-code inventory, and unresolved risks.

Do not copy production source into a fork. The delivery outline should define a
shared web application plus narrow adapters for capture, files, window control,
and updates.

## Go/no-go criteria

Recommend **go** only if the package reliably improves at least one high-value
workflow (capture permission/source selection, stable companion window, or
approved workspace automation), keeps project/output compatibility, meets live
performance, has an acceptable signing/update path, and needs a maintainable
native surface. Recommend **no-go/park** if it merely wraps the same browser
limits, requires an extensive custom capture stack, weakens the security model,
or creates disproportionate release support.

## Dependencies

- M6-WIN-01 supplies the tested browser ceiling.
- ICE-WORKSPACE-01 supplies the window-automation use case.
- This is an icebox spike; it does not block browser milestones M6–M12.

## References

- [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/).
- [Tauri capabilities and permissions](https://v2.tauri.app/security/capabilities/).
- [Tauri official plugins](https://v2.tauri.app/plugin/).
- [Tauri distribution and signing](https://v2.tauri.app/distribute/).
- [Tauri macOS bundles and entitlements](https://v2.tauri.app/distribute/macos-application-bundle/).
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/ScreenCaptureKit?changes=l_4).
- [Apple ScreenCaptureKit sample](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos?changes=_9).
