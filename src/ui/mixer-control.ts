/**
 * The two slice-2b controls for the adjustment editor (ADJUST-02):
 * the six-band H/S/L mixer and the saturation range.
 *
 * **Both collapsed by default** — the D200 decision of record. Slice
 * 2a's curve and saturation are the everyday controls; these two are
 * depth, and an editor that opens with twenty sliders showing is an
 * editor nobody reads. Same `<details class="depth-reveal">` idiom the
 * curve control uses, so the editor has one reveal pattern, not two.
 *
 * Native inputs throughout (UI-STANDARDS: prefer native controls
 * before custom ARIA). The mixer is eighteen `<input type="range">`
 * in a labelled grid; the saturation range is two, because a native
 * two-thumb slider does not exist and two labelled sliders are
 * operable by keyboard and screen reader on the first try, where a
 * custom dual-thumb widget is a bug farm.
 *
 * Ids are prefixed per instance for the same reason the curve
 * control's are: nothing here may collide if a second editor mounts.
 */

import {
  BAND_LIMITS,
  BAND_NAMES,
  identityMixer,
  type MixerBand,
  type MixerBands,
  type SaturationRange,
} from '../core/color/mixer.ts';

export interface MixerControl {
  /** The `<details>` reveal, ready to append. */
  element: HTMLElement;
  /** Re-render for a mixer; `readOnly` disables every input. */
  update(mixer: MixerBands, readOnly: boolean): void;
}

export interface RangeControl {
  element: HTMLElement;
  update(range: SaturationRange, readOnly: boolean): void;
}

/** The three controls each band carries, in display order. */
const AXES = [
  {
    key: 'hue' as const,
    label: 'Hue',
    unit: '°',
    step: 1,
    /** How the value reads when the control is untouched. */
    neutral: 0,
  },
  { key: 'sat' as const, label: 'Saturation', unit: '%', step: 5, neutral: 1 },
  { key: 'light' as const, label: 'Lightness', unit: '', step: 1, neutral: 0 },
];

/** Saturation is stored as a factor and shown as a percentage. */
function toDisplay(axis: (typeof AXES)[number], value: number): number {
  return axis.key === 'sat' ? Math.round(value * 100) : Math.round(value);
}

function fromDisplay(axis: (typeof AXES)[number], value: number): number {
  return axis.key === 'sat' ? Math.round(value) / 100 : Math.round(value);
}

function limitsFor(axis: (typeof AXES)[number]): { min: number; max: number } {
  const limit = BAND_LIMITS[axis.key];
  return axis.key === 'sat'
    ? { min: limit.min * 100, max: limit.max * 100 }
    : { min: limit.min, max: limit.max };
}

function reveal(doc: Document, summaryText: string, helperText: string, helperId: string) {
  const details = doc.createElement('details');
  details.className = 'depth-reveal';
  // Deliberately NOT `details.open = true` — see the file header.
  const summary = doc.createElement('summary');
  summary.textContent = summaryText;
  const body = doc.createElement('div');
  body.className = 'depth-reveal-body';
  const helper = doc.createElement('p');
  helper.className = 'helper';
  helper.id = helperId;
  helper.textContent = helperText;
  body.append(helper);
  details.append(summary, body);
  return { details, body };
}

/**
 * Build the six-band mixer reveal. `onChange` fires with the whole new
 * mixer, matching the curve control's contract — the host holds the
 * draft, this control never does.
 */
export function createMixerControl(
  doc: Document,
  idPrefix: string,
  onChange: (mixer: MixerBands) => void,
): MixerControl {
  let mixer: MixerBands = identityMixer();
  let readOnly = false;

  const { details, body } = reveal(
    doc,
    'Colour mixer',
    'Six bands by hue, each with its own hue, saturation and lightness. A band fades out on near-greys, so these never tint a neutral.',
    `${idPrefix}-mixer-helper`,
  );

  const grid = doc.createElement('div');
  grid.className = 'mixer-grid';

  interface Cell {
    input: HTMLInputElement;
    value: HTMLSpanElement;
    band: number;
    axis: (typeof AXES)[number];
  }
  const cells: Cell[] = [];

  BAND_NAMES.forEach((name, band) => {
    const group = doc.createElement('fieldset');
    group.className = 'mixer-band';
    const legend = doc.createElement('legend');
    legend.textContent = name;
    group.append(legend);

    for (const axis of AXES) {
      const id = `${idPrefix}-mixer-${String(band)}-${axis.key}`;
      const field = doc.createElement('div');
      field.className = 'field mixer-axis';
      const label = doc.createElement('label');
      label.htmlFor = id;
      label.textContent = axis.label;
      const row = doc.createElement('div');
      row.className = 'stitch-size-row';
      const input = doc.createElement('input');
      input.type = 'range';
      input.id = id;
      const { min, max } = limitsFor(axis);
      input.min = String(min);
      input.max = String(max);
      input.step = String(axis.step);
      // The accessible name must carry the band: eighteen sliders all
      // called "Hue" is a screen-reader listing with no information.
      input.setAttribute('aria-label', `${name} ${axis.label.toLowerCase()}`);
      const value = doc.createElement('span');
      value.className = 'meta';
      input.addEventListener('input', () => {
        if (readOnly) return;
        const next = mixer.map((b, i): MixerBand =>
          i === band ? { ...b, [axis.key]: fromDisplay(axis, Number(input.value)) } : b,
        ) as unknown as MixerBands;
        mixer = next;
        onChange(next);
      });
      row.append(input, value);
      field.append(label, row);
      group.append(field);
      cells.push({ input, value, band, axis });
    }
    grid.append(group);
  });

  // One escape hatch: eighteen sliders need a way back to nothing.
  const resetRow = doc.createElement('div');
  resetRow.className = 'field';
  const reset = doc.createElement('button');
  reset.type = 'button';
  reset.id = `${idPrefix}-mixer-reset`;
  reset.textContent = 'Reset the mixer';
  reset.addEventListener('click', () => {
    if (readOnly) return;
    mixer = identityMixer();
    onChange(mixer);
  });
  resetRow.append(reset);

  body.append(grid, resetRow);

  function update(next: MixerBands, nextReadOnly: boolean): void {
    mixer = next;
    readOnly = nextReadOnly;
    for (const cell of cells) {
      const band = next[cell.band] ?? { hue: 0, sat: 1, light: 0 };
      const raw = band[cell.axis.key];
      const shown = toDisplay(cell.axis, raw);
      if (doc.activeElement !== cell.input) cell.input.value = String(shown);
      cell.value.textContent = `${String(shown)}${cell.axis.unit}`;
      cell.input.disabled = nextReadOnly;
    }
    reset.disabled = nextReadOnly;
    // The summary says whether anything is set, so a collapsed reveal
    // is not a hiding place — a moved band must be visible closed.
    const moved = next.filter(
      (b) => b.hue !== 0 || b.sat !== 1 || b.light !== 0,
    ).length;
    const summary = details.querySelector('summary');
    if (summary !== null) {
      summary.textContent =
        moved === 0
          ? 'Colour mixer'
          : `Colour mixer — ${String(moved)} band${moved === 1 ? '' : 's'} set`;
    }
  }

  update(identityMixer(), false);
  return { element: details, update };
}

/**
 * Build the saturation range reveal: two sliders, a floor and a
 * ceiling, on the nominal 0–100 % scale.
 *
 * Nominal and not observed-range (D211): the same setting means the
 * same thing on every picture, and a re-crop does not silently move
 * the result. The helper says so, because "100 %" meaning "the most
 * colourful thing sRGB can express" rather than "the most colourful
 * thing in your photo" is the one fact a user must have to predict it.
 */
export function createRangeControl(
  doc: Document,
  idPrefix: string,
  onChange: (range: SaturationRange) => void,
): RangeControl {
  let range: SaturationRange = { lo: 0, hi: 1 };
  let readOnly = false;

  const { details, body } = reveal(
    doc,
    'Saturation range',
    'Squeezes the picture’s colourfulness into a band. 0–100 % leaves it alone. The scale is fixed, not measured from the picture, so the same setting gives the same result on any image — and near-greys stay grey however high the floor.',
    `${idPrefix}-range-helper`,
  );

  function slider(key: 'lo' | 'hi', labelText: string): {
    input: HTMLInputElement;
    value: HTMLSpanElement;
    field: HTMLElement;
  } {
    const id = `${idPrefix}-range-${key}`;
    const field = doc.createElement('div');
    field.className = 'field';
    const label = doc.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const row = doc.createElement('div');
    row.className = 'stitch-size-row';
    const input = doc.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = '0';
    input.max = '100';
    input.step = '1';
    const value = doc.createElement('span');
    value.className = 'meta';
    input.addEventListener('input', () => {
      if (readOnly) return;
      const v = Number(input.value) / 100;
      // The handles push rather than cross: an inverted range is not
      // an operation this stage has, and the schema refuses one, so
      // the control must not be able to express it.
      const next: SaturationRange =
        key === 'lo'
          ? { lo: v, hi: Math.max(v, range.hi) }
          : { lo: Math.min(v, range.lo), hi: v };
      range = next;
      onChange(next);
    });
    row.append(input, value);
    field.append(label, row);
    return { input, value, field };
  }

  const lo = slider('lo', 'Least colourful');
  const hi = slider('hi', 'Most colourful');
  body.append(lo.field, hi.field);

  function update(next: SaturationRange, nextReadOnly: boolean): void {
    range = next;
    readOnly = nextReadOnly;
    for (const [key, control] of [
      ['lo', lo],
      ['hi', hi],
    ] as const) {
      const percent = Math.round(next[key] * 100);
      if (doc.activeElement !== control.input) control.input.value = String(percent);
      control.value.textContent = `${String(percent)}%`;
      control.input.disabled = nextReadOnly;
    }
    const summary = details.querySelector('summary');
    if (summary !== null) {
      const touched = next.lo !== 0 || next.hi !== 1;
      summary.textContent = touched
        ? `Saturation range — ${String(Math.round(next.lo * 100))}–${String(Math.round(next.hi * 100))}%`
        : 'Saturation range';
    }
  }

  update({ lo: 0, hi: 1 }, false);
  return { element: details, update };
}
