/**
 * The three-point lightness curve control, behind a reveal — shared by
 * tone matching (TONE-01) and the adjustment profile editor
 * (ADJUST-01). One interaction model for both, so the owner judges one
 * control at the sitting, not two that drifted apart.
 *
 * Three points — bottom, mid, top — each movable on both axes, so an
 * inverted mapping is legal by construction (the D200 decision of
 * record). The plot is an SVG with `aria-hidden`, because every fact
 * it draws also exists as a real control: each point is a
 * `role="slider"` button (pointer drag + arrow nudge, Shift for bigger
 * steps) and each coordinate additionally has a native number input —
 * the robust route for assistive technology (UI-STANDARDS: prefer
 * native controls before custom ARIA).
 *
 * Ids are prefixed per instance: both curves can be mounted in the DOM
 * at once (the design's tone group and the editor's form), and a
 * hidden twin must not duplicate an id or steal a label's association.
 */

import {
  identityCurve,
  isIdentityCurve,
  type CurvePoint,
  type LightnessCurve,
} from '../core/color/curve.ts';

/** The point names, darkest first — also the slider labels. */
const POINT_NAMES = ['Bottom point', 'Mid point', 'Top point'] as const;

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface CurveControlOptions {
  /** Unique id prefix per mounted control, e.g. `tone` or `adjust`. */
  idPrefix: string;
  /** The reveal's summary, e.g. `"Lightness curve"`. */
  summary: string;
  /** The sentence under the summary: what this curve remaps, and how. */
  helper: string;
  /** Start the reveal open (the editor's form does; the design's does not). */
  open?: boolean;
}

export interface CurveControl {
  /** The `<details>` reveal, ready to append. */
  element: HTMLElement;
  /** Re-render for a curve; `readOnly` disables every input. */
  update(curve: LightnessCurve, readOnly?: boolean): void;
}

/**
 * Move one curve point by (dIn, dOut), keeping inputs non-decreasing
 * and everything in 0–100. The end points' inputs stay put on the
 * vertical-only arrows unless deliberately dragged — but both axes
 * remain legal on every point (the D200 decision of record).
 */
export function nudgeCurvePoint(
  curve: LightnessCurve,
  index: 0 | 1 | 2,
  dIn: number,
  dOut: number,
): LightnessCurve {
  const points = curve.map((p): CurvePoint => ({ in: p.in, out: p.out }));
  const point = points[index];
  if (point === undefined) return curve;
  const lo = index > 0 ? (points[index - 1]?.in ?? 0) : 0;
  const hi = index < 2 ? (points[index + 1]?.in ?? 100) : 100;
  point.in = Math.min(hi, Math.max(lo, Math.round((point.in + dIn) * 10) / 10));
  point.out = Math.min(100, Math.max(0, Math.round((point.out + dOut) * 10) / 10));
  return [
    points[0] ?? { in: 0, out: 0 },
    points[1] ?? { in: 50, out: 50 },
    points[2] ?? { in: 100, out: 100 },
  ];
}

/** Build the curve reveal; `onChange` fires with the whole new curve. */
export function createCurveControl(
  doc: Document,
  options: CurveControlOptions,
  onChange: (curve: LightnessCurve) => void,
): CurveControl {
  const prefix = options.idPrefix;
  let curve: LightnessCurve = identityCurve();
  let readOnly = false;

  const details = doc.createElement('details');
  details.className = 'depth-reveal';
  if (options.open === true) details.open = true;
  const summary = doc.createElement('summary');
  summary.textContent = options.summary;
  const body = doc.createElement('div');
  body.className = 'depth-reveal-body';
  const helper = doc.createElement('p');
  helper.className = 'helper';
  helper.id = `${prefix}-curve-helper`;
  helper.textContent = options.helper;

  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'curve-plot-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const grid = doc.createElementNS(SVG_NS, 'path');
  grid.setAttribute('class', 'curve-grid');
  grid.setAttribute('d', 'M0 50 H100 M50 0 V100 M0 100 L100 0');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'curve-path');
  svg.append(grid, path);
  const pointsLayer = doc.createElement('div');
  pointsLayer.className = 'curve-points';
  const plot = doc.createElement('div');
  plot.className = 'curve-plot';
  plot.append(svg, pointsLayer);

  /** Apply a nudge and hand the whole curve back to the host. */
  function nudge(index: 0 | 1 | 2, dIn: number, dOut: number): void {
    if (readOnly) return;
    onChange(nudgeCurvePoint(curve, index, dIn, dOut));
  }

  const pointButtons = POINT_NAMES.map((name, index) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'curve-point';
    button.setAttribute('role', 'slider');
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-describedby', helper.id);
    button.setAttribute('aria-valuemin', '0');
    button.setAttribute('aria-valuemax', '100');
    button.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 5 : 1;
      let dIn = 0;
      let dOut = 0;
      if (event.key === 'ArrowUp') dOut = step;
      else if (event.key === 'ArrowDown') dOut = -step;
      else if (event.key === 'ArrowRight') dIn = step;
      else if (event.key === 'ArrowLeft') dIn = -step;
      else return;
      event.preventDefault();
      nudge(index as 0 | 1 | 2, dIn, dOut);
    });
    button.addEventListener('pointerdown', (event) => {
      if (readOnly) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent): void => {
        const rect = plot.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const inL = ((ev.clientX - rect.left) / rect.width) * 100;
        const outL = (1 - (ev.clientY - rect.top) / rect.height) * 100;
        const current = curve[index as 0 | 1 | 2];
        nudge(index as 0 | 1 | 2, inL - current.in, outL - current.out);
      };
      const up = (): void => {
        button.removeEventListener('pointermove', move);
        button.removeEventListener('pointerup', up);
      };
      button.addEventListener('pointermove', move);
      button.addEventListener('pointerup', up);
    });
    return button;
  });
  pointsLayer.append(...pointButtons);

  // Numbers beside the plot: native inputs are the robust route for
  // AT (UI-STANDARDS: prefer native controls before custom ARIA).
  const numbers = doc.createElement('div');
  numbers.className = 'curve-numbers';
  const numberInputs: { inField: HTMLInputElement; outField: HTMLInputElement }[] = [];
  POINT_NAMES.forEach((name, index) => {
    const row = doc.createElement('div');
    row.className = 'curve-number-row';
    const rowLabel = doc.createElement('span');
    rowLabel.className = 'meta';
    rowLabel.textContent = name;
    const makeInput = (axis: 'in' | 'out'): HTMLInputElement => {
      const wrap = doc.createElement('label');
      wrap.className = 'curve-number';
      wrap.textContent = axis === 'in' ? 'In' : 'Out';
      const input = doc.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.setAttribute('aria-label', `${name} ${axis === 'in' ? 'input' : 'output'} lightness`);
      input.addEventListener('change', () => {
        const value = Math.min(100, Math.max(0, Number(input.value) || 0));
        const current = curve[index as 0 | 1 | 2];
        nudge(
          index as 0 | 1 | 2,
          axis === 'in' ? value - current.in : 0,
          axis === 'out' ? value - current.out : 0,
        );
      });
      wrap.append(input);
      row.append(wrap);
      return input;
    };
    row.prepend(rowLabel);
    const inField = makeInput('in');
    const outField = makeInput('out');
    numberInputs.push({ inField, outField });
    numbers.append(row);
  });

  const resetButton = doc.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = 'Reset curve';
  resetButton.addEventListener('click', () => {
    if (readOnly) return;
    onChange(identityCurve());
  });

  body.append(helper, plot, numbers, resetButton);
  details.append(summary, body);

  return {
    element: details,
    update(next: LightnessCurve, nextReadOnly = false): void {
      curve = next;
      readOnly = nextReadOnly;
      const [lo, mid, hi] = next;
      // The flat leader and trailer are the clamping made visible:
      // input below the bottom point holds its output, and likewise
      // above the top. The plot's y axis is inverted (SVG 0 is the top).
      path.setAttribute(
        'd',
        `M0 ${String(100 - lo.out)} L${String(lo.in)} ${String(100 - lo.out)} L${String(mid.in)} ${String(100 - mid.out)} L${String(hi.in)} ${String(100 - hi.out)} L100 ${String(100 - hi.out)}`,
      );
      summary.textContent = isIdentityCurve(next)
        ? options.summary
        : `${options.summary} (adjusted)`;
      next.forEach((point, i) => {
        const button = pointButtons[i];
        if (button !== undefined) {
          button.style.left = `${String(point.in)}%`;
          button.style.top = `${String(100 - point.out)}%`;
          button.setAttribute('aria-valuenow', String(point.out));
          button.setAttribute(
            'aria-valuetext',
            `input ${String(point.in)}, output ${String(point.out)}`,
          );
          button.disabled = nextReadOnly;
        }
        const fields = numberInputs[i];
        if (fields === undefined) return;
        if (doc.activeElement !== fields.inField) fields.inField.value = String(point.in);
        if (doc.activeElement !== fields.outField) fields.outField.value = String(point.out);
        fields.inField.disabled = nextReadOnly;
        fields.outField.disabled = nextReadOnly;
      });
      resetButton.disabled = nextReadOnly;
    },
  };
}
