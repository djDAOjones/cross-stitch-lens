# M8-CTRL-01 — Dither controls and presets

## Outcome

The Colour panel exposes a compact, accessible algorithm selector and only the
controls meaningful to the selected method. Presets are transparent bundles of
ordinary settings, all values persist, and changing methods gives immediate,
predictable preview feedback.

## Current baseline

The UI has an “Enable dithering” toggle and a serpentine toggle. `main.ts` owns
the mutable `PipelineConfig`, schedules worker reruns, serialises projects, and
updates controls after loading. No algorithm selector, strength concept,
method-specific setting, or dither preset exists. UI work must follow the Carbon
productive language, WCAG 2.2 AAA defaults, 44 × 44 CSS px targets, visible
focus, and intentional disabled/helper/error states.

## Interaction model

Use one labelled selector with `None` plus the M8-SPIKE-01 methods. Place a small
method-specific group directly below it. Do not display irrelevant controls:

- serpentine is meaningful only for directional error diffusion;
- matrix size/phase belongs only to ordered or tiled threshold methods;
- kernel selection is redundant if each algorithm is already a named method;
- seed is visible only if users can intentionally obtain different repeatable
  results;
- “strength” needs an algorithm-specific mathematical definition before it is
  exposed. A shared 0–100 label is misleading if methods interpolate differently.

Selecting `None` should disable dithering while retaining each method's last
settings in UI/session state, unless product testing finds that surprising.
Project persistence should store one canonical active configuration and, only if
needed, a compact per-method preference map. Do not allow hidden stale values to
affect output.

## Preset contract

Presets are immutable named configurations such as “Smooth gradient” or “Crisp
geometry”, selected from spike evidence rather than invented labels. Applying a
preset writes visible ordinary controls; subsequent edits put the UI in a clear
“Custom” state. Presets must not hide backend choices, draft-preview behaviour,
or export-only overrides.

If a preset becomes invalid because an algorithm was removed or a project came
from a newer app, the loader follows the project-version contract; it does not
silently map to a visually different method.

## Likely implementation surface

`src/ui/controls.ts`, the Colour panel construction in `src/main.ts`, CSS in
`index.html`, the discriminated config from M8-ALG-01, project serialisation and
migration, worker scheduling, and diagnostics. Keep algorithm definitions and
preset data outside DOM code so tests can inspect them without a browser.

## Acceptance evidence

Test keyboard and pointer use, programmatic labels/descriptions, focus after
method changes, conditional control visibility, disabled states, preset-to-custom
transitions, rapid changes/frame coalescing, save/load/migration, and exact
config-to-worker messages. Manually verify narrow layout, 200% zoom/reflow,
screen-reader announcements, and that representative images visibly respond to
every control across preview and export.

Use a state matrix rather than one generic UI test: each algorithm × default ×
boundary values × preset/custom × project reload. “Not applicable” controls must
be absent or clearly disabled, never active-looking while ignored.

## Risks and dependencies

- Blocked by M8-SPIKE-01 method/control decisions and M8-ALG-01's stable config.
- Too many knobs contradict the spike's purpose and the companion-window layout.
- UI “strength” can imply comparability that the engine does not provide.
- Schema design must preserve old Boolean dither semantics exactly.

## References

- Requirements: `docs/requirements.md` §8, §15, §20, §22, and §23.
- `UI-STANDARDS.md` and decisions D12, D15, D18, D27, D34, and D36.
- `src/main.ts`, `src/ui/controls.ts`, and `src/core/project.ts`.
