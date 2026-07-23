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

/**
 * Attach a helper line to a field and link it for assistive tech.
 * The `aria-describedby` id list is the Carbon anatomy's error/helper
 * linkage; every message a field shows must be in that list or it is
 * visual-only.
 */
function attachHelper(
  doc: Document,
  element: HTMLElement,
  input: HTMLElement,
  id: string,
  helper: string | undefined,
): void {
  if (helper === undefined) return;
  const p = doc.createElement('p');
  p.className = 'helper';
  p.id = `${id}-helper`;
  p.textContent = helper;
  element.append(p);
  addDescribedBy(input, p.id);
}

/**
 * `aria-describedby` list arithmetic, pure (tested in node — the
 * house convention keeps DOM halves for the running app). Returns the
 * new attribute value; null means the attribute should be removed.
 */
export function withDescribedBy(current: string | null, id: string): string {
  const ids = current === null ? [] : current.split(/\s+/).filter((x) => x !== '');
  return ids.includes(id) ? ids.join(' ') : [...ids, id].join(' ');
}

/** Remove an id from a describedby list; null = drop the attribute. */
export function withoutDescribedBy(current: string | null, id: string): string | null {
  if (current === null) return null;
  const ids = current.split(/\s+/).filter((x) => x !== id && x !== '');
  return ids.length === 0 ? null : ids.join(' ');
}

function addDescribedBy(el: Element, id: string): void {
  el.setAttribute('aria-describedby', withDescribedBy(el.getAttribute('aria-describedby'), id));
}

function removeDescribedBy(el: Element, id: string): void {
  const next = withoutDescribedBy(el.getAttribute('aria-describedby'), id);
  if (next === null) el.removeAttribute('aria-describedby');
  else el.setAttribute('aria-describedby', next);
}

/**
 * Labelled whole-number input; invalid entries snap back in-range.
 *
 * The snap-back is error *prevention* (UI-STANDARDS), but silent
 * correction is its own confusion — so a correction is announced in a
 * linked `role="status"` message ("Adjusted to N…") that clears on
 * the next in-range entry. The field is never left invalid, so
 * `aria-invalid` flags only the moment of correction.
 */
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
  const message = doc.createElement('p');
  message.className = 'field-message';
  message.id = `${id}-message`;
  message.setAttribute('role', 'status');
  message.hidden = true;
  let lastValid = options.value;
  input.addEventListener('change', () => {
    const raw = input.value;
    lastValid = clampInt(raw, options.min, options.max, lastValid);
    const corrected = raw.trim() === '' || Number(raw) !== lastValid;
    input.value = String(lastValid);
    if (corrected) {
      message.textContent = `Adjusted to ${String(lastValid)} — allowed range ${String(options.min)}–${String(options.max)}.`;
      message.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      addDescribedBy(input, message.id);
    } else {
      message.hidden = true;
      input.removeAttribute('aria-invalid');
      removeDescribedBy(input, message.id);
    }
    onChange(lastValid);
  });
  element.append(lab, input);
  attachHelper(doc, element, input, id, options.helper);
  element.append(message);
  return element;
}

/** Labelled single-line text input (plain string, no validation). */
export function textField(
  doc: Document,
  id: string,
  label: string,
  value: string,
  onChange: (value: string) => void,
  helper?: string,
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
  attachHelper(doc, element, input, id, helper);
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
  helper?: string,
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
  attachHelper(doc, element, select, id, helper);
  return element;
}
