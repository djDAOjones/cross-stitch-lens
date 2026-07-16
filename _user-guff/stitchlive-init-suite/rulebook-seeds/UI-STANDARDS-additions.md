# UI-STANDARDS.md — project-specific additions for StitchLive

The PM-Skills defaults (Carbon Design System, WCAG 2.2 AAA, Nielsen
heuristics) stand. These additions cover what a canvas-centric
image-processing app needs beyond them.

## Layout model

- Single-window app: large central preview canvas; Carbon side panel
  for controls grouped as **Source / Grid / Colour / Dither /
  Pipeline / Export**; info strip (stitch & colour stats) docked
  below the preview.
- The preview canvas is the product. Panels collapse; the canvas
  never does.

## Canvas accessibility

- The canvas itself is excluded from Carbon styling but not from
  accessibility: keyboard zoom (+/−/0), pan (arrow keys), and a
  visible focus ring on the canvas host.
- All information shown visually on the canvas must also exist in
  DOM: the stats panel mirrors counts; grid/tick settings are
  reflected in labelled controls, not only in pixels.
- Never encode meaning in colour alone (Carbon rule) — applies to the
  capture-region border states and any backend/status indicators.

## Live-processing UX rules

- Controls apply immediately (requirements §5.4); no Apply buttons.
  Sliders throttle to the pipeline, never block the UI thread.
- Show processing state honestly: a subtle busy indicator when the
  pipeline is behind, "paused" and "source unchanged" states named
  explicitly.
- Draft-quality preview must be visibly labelled as draft so exports
  are never mistaken for it.
- Destructive actions (palette overwrite, project overwrite) get
  Carbon confirm dialogs; everything else is undoable or
  regenerable and gets none.

## Colour fidelity

- Preview rendering is colour-managed sRGB end-to-end; no CSS filters
  or opacity on the preview canvas that would distort perceived
  thread colours.
- Thread-colour swatches show hex + name on hover/focus (tooltip and
  `aria-label`).

## Capture UX

- Permission prompt is user-initiated (button), never on load.
- Crop rectangle: draggable, resizable via handles and arrow keys,
  lockable; dimensions readout in source pixels and resulting
  stitches.
