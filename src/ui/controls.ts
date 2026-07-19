/**
 * Form-field builders for the control panel, implementing Carbon's
 * productive design language in project code (no Carbon packages —
 * AGENTS.md hard rule). Native HTML controls before ARIA widgets
 * (UI-STANDARDS): toggles are switch-role checkboxes, everything else
 * is a plain labelled input. `clampInt` is the pure, tested half of
 * the number-field behaviour.
 */

/**
 * Parse a number-input string to a whole number inside [min, max];
 * unparseable input falls back rather than propagating NaN
 * (UI-STANDARDS → "Error prevention": constrain invalid input).
 */
export function clampInt(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Math.floor(Number(raw));
  if (raw.trim() === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A built field: the wrapper to mount plus its input for later state. */
export interface ToggleParts {
  element: HTMLElement;
  input: HTMLInputElement;
}

/** Carbon-style toggle: switch-role checkbox with On/Off state text. */
export function toggleField(
  doc: Document,
  id: string,
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): ToggleParts {
  const element = doc.createElement('div');
  element.className = 'field';
  const lab = doc.createElement('label');
  lab.htmlFor = id;
  lab.textContent = label;
  const row = doc.createElement('div');
  row.className = 'toggle-row';
  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.className = 'toggle';
  input.setAttribute('role', 'switch');
  input.checked = checked;
  const state = doc.createElement('span');
  state.className = 'toggle-state';
  state.textContent = checked ? 'On' : 'Off';
  input.addEventListener('change', () => {
    state.textContent = input.checked ? 'On' : 'Off';
    onChange(input.checked);
  });
  row.append(input, state);
  element.append(lab, row);
  return { element, input };
}

/** Bounds and helper copy for a number field. */
export interface NumberFieldOptions {
  min: number;
  max: number;
  value: number;
  /** Optional helper line (only where it prevents error). */
  helper?: string;
}

/** Labelled whole-number input; invalid entries snap back in-range. */
export function numberField(
  doc: Document,
  id: string,
  label: string,
  options: NumberFieldOptions,
  onChange: (value: number) => void,
): HTMLElement {
  const element = doc.createElement('div');
  element.className = 'field';
  const lab = doc.createElement('label');
  lab.htmlFor = id;
  lab.textContent = label;
  const input = doc.createElement('input');
  input.type = 'number';
  input.id = id;
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = '1';
  input.value = String(options.value);
  let lastValid = options.value;
  input.addEventListener('change', () => {
    lastValid = clampInt(input.value, options.min, options.max, lastValid);
    input.value = String(lastValid);
    onChange(lastValid);
  });
  element.append(lab, input);
  if (options.helper !== undefined) {
    const helper = doc.createElement('p');
    helper.className = 'helper';
    helper.textContent = options.helper;
    element.append(helper);
  }
  return element;
}

/** Labelled single-line text input (plain string, no validation). */
export function textField(
  doc: Document,
  id: string,
  label: string,
  value: string,
  onChange: (value: string) => void,
): HTMLElement {
  const element = doc.createElement('div');
  element.className = 'field';
  const lab = doc.createElement('label');
  lab.htmlFor = id;
  lab.textContent = label;
  const input = doc.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value;
  input.addEventListener('change', () => {
    onChange(input.value);
  });
  element.append(lab, input);
  return element;
}

/** Labelled native colour picker (#rrggbb values by construction). */
export function colorField(
  doc: Document,
  id: string,
  label: string,
  value: string,
  onChange: (value: string) => void,
): HTMLElement {
  const element = doc.createElement('div');
  element.className = 'field';
  const lab = doc.createElement('label');
  lab.htmlFor = id;
  lab.textContent = label;
  const input = doc.createElement('input');
  input.type = 'color';
  input.id = id;
  input.value = value;
  input.addEventListener('input', () => {
    onChange(input.value);
  });
  element.append(lab, input);
  return element;
}

/** Labelled select over [value, visible label] pairs. */
export function selectField(
  doc: Document,
  id: string,
  label: string,
  options: readonly (readonly [string, string])[],
  value: string,
  onChange: (value: string) => void,
): HTMLElement {
  const element = doc.createElement('div');
  element.className = 'field';
  const lab = doc.createElement('label');
  lab.htmlFor = id;
  lab.textContent = label;
  const select = doc.createElement('select');
  select.id = id;
  for (const [optionValue, optionLabel] of options) {
    const option = doc.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    select.append(option);
  }
  select.value = value;
  select.addEventListener('change', () => {
    onChange(select.value);
  });
  element.append(lab, select);
  return element;
}
