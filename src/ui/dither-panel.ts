/**
 * The Dither control group (M8-CTRL-01): one labelled algorithm
 * selector, a preset selector above it, and a method-specific group
 * that holds only the controls the selected method defines — strength
 * with its per-family meaning, serpentine for diffusion only. Controls
 * a method does not define are absent, never disabled-but-visible
 * (the ticket's "not applicable must be absent" rule).
 *
 * All decisions live in the pure model (`dither-model.ts`); this file
 * is mounting and syncing only. The method group is rebuilt only when
 * the algorithm changes, so editing strength never destroys the
 * control that has focus.
 */

import type { DitherConfig } from '../core/pipeline/config.ts';
import { numberField, selectField, toggleField } from './controls.ts';
import {
  ALGORITHM_OPTIONS,
  configForChoice,
  CUSTOM_PRESET,
  DITHER_PRESETS,
  familyOf,
  percentToStrength,
  presetConfig,
  presetFor,
  remember,
  strengthBounds,
  strengthToPercent,
  type AlgorithmChoice,
  type DitherMemory,
} from './dither-model.ts';

/** The mounted group: the fieldset to append plus its sync entry. */
export interface DitherControls {
  element: HTMLFieldSetElement;
  /** Re-sync every control to `config`; disable all when `disabled`. */
  update(config: DitherConfig, disabled: boolean): void;
}

/** Mount the Dither group. `onChange` receives each new configuration. */
export function createDitherControls(
  doc: Document,
  initial: DitherConfig,
  onChange: (next: DitherConfig) => void,
): DitherControls {
  let current: DitherConfig = initial;
  let memory: DitherMemory = remember({}, initial);
  let disabled = false;

  const element = doc.createElement('fieldset');
  const legend = doc.createElement('legend');
  legend.textContent = 'Dither';
  element.append(legend);

  const apply = (next: DitherConfig): void => {
    current = next;
    memory = remember(memory, next);
    sync();
    onChange(next);
  };

  const presetSelect = selectField(
    doc,
    'dither-preset',
    'Preset',
    [
      ...DITHER_PRESETS.map((p) => [p.id, p.label] as const),
      [CUSTOM_PRESET, 'Custom'] as const,
    ],
    presetFor(initial),
    (id) => {
      const next = presetConfig(id);
      if (next !== null) apply(next);
    },
  );
  // "Custom" is a state the user reaches by editing, not an action to
  // pick: it stays visible so the selector never lies, but disabled so
  // it cannot be chosen directly.
  const customOption = presetSelect.querySelector<HTMLOptionElement>(
    `option[value="${CUSTOM_PRESET}"]`,
  );
  if (customOption !== null) customOption.disabled = true;

  const algorithmSelect = selectField(
    doc,
    'dither-algorithm',
    'Algorithm',
    ALGORITHM_OPTIONS,
    initial.algorithm,
    (value) => {
      apply(configForChoice(value as AlgorithmChoice, memory));
    },
  );

  /** Holds the method-specific controls; rebuilt on algorithm change. */
  const methodGroup = doc.createElement('div');
  methodGroup.className = 'dither-method';
  /** The algorithm the method group is currently built for. */
  let builtFor: AlgorithmChoice | null = null;

  function rebuildMethodGroup(): void {
    methodGroup.replaceChildren();
    builtFor = current.algorithm;
    if (current.algorithm === 'none') return;
    const family = familyOf(current.algorithm);
    if (family === 'none') return;
    const bounds = strengthBounds(family);
    methodGroup.append(
      numberField(
        doc,
        'dither-strength',
        'Strength',
        {
          min: bounds.min,
          max: bounds.max,
          value: strengthToPercent(current.strength),
          helper: bounds.helper,
        },
        (percent) => {
          if (current.algorithm === 'none') return;
          apply({ ...current, strength: percentToStrength(percent) });
        },
      ),
    );
    if ('serpentine' in current) {
      methodGroup.append(
        toggleField(doc, 'dither-serpentine', 'Serpentine scan', current.serpentine, (on) => {
          if (current.algorithm === 'none' || !('serpentine' in current)) return;
          apply({ ...current, serpentine: on });
        }).element,
      );
    }
  }

  /** Point every control at `current` without rebuilding what has focus. */
  function sync(): void {
    const preset = presetSelect.querySelector('select');
    if (preset !== null) {
      preset.value = presetFor(current);
      preset.disabled = disabled;
    }
    const algorithm = algorithmSelect.querySelector('select');
    if (algorithm !== null) {
      algorithm.value = current.algorithm;
      algorithm.disabled = disabled;
    }
    if (builtFor !== current.algorithm) rebuildMethodGroup();
    const strength = methodGroup.querySelector<HTMLInputElement>('#dither-strength');
    if (strength !== null && current.algorithm !== 'none') {
      strength.value = String(strengthToPercent(current.strength));
      strength.disabled = disabled;
    }
    const serpentine = methodGroup.querySelector<HTMLInputElement>('#dither-serpentine');
    if (serpentine !== null && 'serpentine' in current) {
      serpentine.checked = current.serpentine;
      serpentine.disabled = disabled;
      const state = serpentine.nextElementSibling;
      if (state !== null) state.textContent = current.serpentine ? 'On' : 'Off';
    }
  }

  rebuildMethodGroup();
  element.append(presetSelect, algorithmSelect, methodGroup);
  sync();

  return {
    element,
    update(config: DitherConfig, nowDisabled: boolean): void {
      current = config;
      memory = remember(memory, config);
      disabled = nowDisabled;
      sync();
    },
  };
}
