/**
 * Tone-matching controls (TONE-01, CREATIVE-01 slice 1): the colour ↔
 * tone slider, the ramp strip — control and provenance readout in one
 * (the owner's reference: the DaVinci Resolve qualifier idiom) — with
 * cut handles at the end-stop, Equalise, the three-point lightness
 * curve behind a reveal, re-pick from the current frame, and the
 * colour-use floor.
 *
 * Working labels throughout: the mode's user-facing name, the floor's
 * label and unit, the confetti wording and the ramp's shape are D200
 * in-slice items the owner settles — change strings here, not
 * structure, when they land.
 *
 * The ramp strip is a canvas (histogram over band colours), so every
 * fact it paints also lives in the DOM (UI-STANDARDS → canvas
 * accessibility): the band list under it names each rung with its
 * share, and each cut handle is a labelled slider. Shares shown are
 * always *achieved* — read back from the rendered frame — never
 * restated targets (the D200 build must).
 */

import {
  isIdentityCurve,
  type CurvePoint,
  type LightnessHistogram,
  type ToneConfig,
  type ToneCurve,
} from '../core/color/tone.ts';
import type { FloorRule } from '../core/palette-selection.ts';
import type { ThreadSwap } from '../core/pipeline/swap.ts';
import { toggleField } from './controls.ts';

/** One rung as the ramp shows it: ladder order (darkest first). */
export interface ToneRung {
  id: string;
  hex: string;
  /** The thread's own L*, 0–100. */
  l: number;
  label: string;
}

/** Everything the controls render from. */
export interface ToneControlsState {
  /** False hides the whole group (Threadify off). */
  visible: boolean;
  tone: ToneConfig;
  /** The selected palette in ladder order; empty before a palette exists. */
  rungs: ToneRung[];
  /** Natural cut positions for the current rungs (length − 1). */
  naturalCuts: number[];
  /** Curved-lightness histogram of the held selection source, if any. */
  histogram: LightnessHistogram | null;
  /**
   * Achieved share (0–1) per rung from the last rendered frame; a
   * null entry is a rung whose stitches merged into another selected
   * colour via a swap, so its own share has no honest number. Null
   * overall = no frame yet.
   */
  achieved: (number | null)[] | null;
  /** Whether the rendered frame dithered (wording only). */
  ditherOn: boolean;
  /** The suitability hint, or null (never a block — D200). */
  hint: 'offer-tone' | 'confetti' | null;
  /** Whether re-pick has a live capture to pick from. */
  canRePick: boolean;
  floor: FloorRule;
}

/** Everything the controls call back into the host for. */
export interface ToneControlsActions {
  setWeight(weight: number): void;
  setCurve(curve: ToneCurve): void;
  /** Custom cuts (ascending), or null to return to natural bands. */
  setCuts(cuts: number[] | null): void;
  /** Cuts at equal-share quantiles of the held source. */
  equalise(): void;
  /** Re-seed the selection source from the current frame. */
  rePick(): void;
  setFloor(floor: FloorRule): void;
  /** The hint button: jump to the end-stop. */
  useToneMatching(): void;
}

export interface ToneControls {
  element: HTMLElement;
  update(state: ToneControlsState): void;
}

// ---------------------------------------------------------------------
// Pure halves (exported for tests)
// ---------------------------------------------------------------------

/**
 * Achieved share per rung from a frame's per-thread counts, attributed
 * through the swaps: a rung swapped to a render-only target reads that
 * target's count (the stitches are still the rung's); a rung whose
 * stitches merged into another *selected* colour has no separable
 * count and reads null — the sidecar's honest truth, with the
 * "swapped" note in Colours used carrying the story.
 */
export function rungShares(
  rungIds: readonly string[],
  swaps: readonly ThreadSwap[],
  perThread: ReadonlyMap<string, number>,
): (number | null)[] {
  const selected = new Set(rungIds);
  const targetOf = new Map<string, string>();
  for (const swap of swaps) {
    if (selected.has(swap.from)) targetOf.set(swap.from, swap.to.id);
  }
  // A target receiving more than one source — or one that is itself a
  // selected entry — merges counts, so none of its contributors can
  // be read back separately.
  const receivers = new Map<string, number>();
  for (const [from, to] of targetOf) {
    if (to === from) continue;
    receivers.set(to, (receivers.get(to) ?? 0) + 1);
  }
  let total = 0;
  for (const count of perThread.values()) total += count;
  return rungIds.map((id) => {
    const to = targetOf.get(id) ?? id;
    if (to !== id && (selected.has(to) || (receivers.get(to) ?? 0) > 1)) return null;
    if (to === id && (receivers.get(id) ?? 0) > 0) return null;
    const count = perThread.get(to) ?? 0;
    return total === 0 ? 0 : count / total;
  });
}

/** Clamp cut `k` to stay ascending within its neighbours (equal legal). */
export function clampCut(cuts: readonly number[], k: number, l: number): number {
  const lo = k > 0 ? (cuts[k - 1] ?? 0) : 0;
  const hi = k + 1 < cuts.length ? (cuts[k + 1] ?? 100) : 100;
  const bounded = Math.min(hi, Math.max(lo, l));
  return Math.round(bounded * 10) / 10;
}

/**
 * Move one curve point by (dIn, dOut), keeping inputs non-decreasing
 * and everything in 0–100. The end points' inputs stay put on the
 * vertical-only arrows unless deliberately dragged — but both axes
 * remain legal on every point (the D200 decision of record).
 */
export function nudgeCurvePoint(
  curve: ToneCurve,
  index: 0 | 1 | 2,
  dIn: number,
  dOut: number,
): ToneCurve {
  const points = curve.map((p): CurvePoint => ({ in: p.in, out: p.out }));
  const point = points[index];
  if (point === undefined) return curve;
  const lo = index > 0 ? (points[index - 1]?.in ?? 0) : 0;
  const hi = index < 2 ? (points[index + 1]?.in ?? 100) : 100;
  point.in = Math.min(hi, Math.max(lo, Math.round((point.in + dIn) * 10) / 10));
  point.out = Math.min(100, Math.max(0, Math.round((point.out + dOut) * 10) / 10));
  return [points[0] ?? { in: 0, out: 0 }, points[1] ?? { in: 50, out: 50 }, points[2] ?? { in: 100, out: 100 }];
}

/** Share as a whole-percent label; sub-1 % values keep one decimal. */
export function shareLabel(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return `${pct.toFixed(1)}%`;
  return `${String(Math.round(pct))}%`;
}

// ---------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------

/** Build the tone-matching control group. */
export function createToneControls(
  doc: Document,
  initial: ToneControlsState,
  actions: ToneControlsActions,
): ToneControls {
  let state = initial;
  const element = doc.createElement('div');
  element.className = 'tone-controls';

  // --- heading + the balance slider --------------------------------
  const groupLabel = doc.createElement('p');
  groupLabel.className = 'group-label';
  groupLabel.textContent = 'Tone matching';
  const groupHelper = doc.createElement('p');
  groupHelper.className = 'helper';
  groupHelper.id = 'tone-helper';
  groupHelper.textContent =
    'Match stitches by colour, by lightness alone, or in between. At full tone the palette works as a ladder of light to dark.';

  const sliderField = doc.createElement('div');
  sliderField.className = 'field';
  const sliderLabel = doc.createElement('label');
  sliderLabel.htmlFor = 'tone-weight';
  sliderLabel.textContent = 'Colour to tone';
  const slider = doc.createElement('input');
  slider.type = 'range';
  slider.id = 'tone-weight';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.setAttribute('aria-describedby', groupHelper.id);
  const sliderEnds = doc.createElement('div');
  sliderEnds.className = 'tone-slider-ends';
  sliderEnds.setAttribute('aria-hidden', 'true');
  const endColour = doc.createElement('span');
  endColour.textContent = 'Colour';
  const endTone = doc.createElement('span');
  endTone.textContent = 'Tone';
  sliderEnds.append(endColour, endTone);
  slider.addEventListener('input', () => {
    const weight = Number(slider.value) / 100;
    slider.setAttribute('aria-valuetext', weightText(weight));
    actions.setWeight(weight);
  });
  sliderField.append(sliderLabel, slider, sliderEnds);

  function weightText(weight: number): string {
    if (weight === 0) return 'Colour only';
    if (weight === 1) return 'Tone only';
    return `${String(Math.round(weight * 100))}% tone`;
  }

  // --- the suitability hint (one heuristic, two messages — D200) ---
  const hintRow = doc.createElement('p');
  hintRow.className = 'meta tone-hint';
  hintRow.setAttribute('role', 'status');
  const hintText = doc.createElement('span');
  const hintButton = doc.createElement('button');
  hintButton.type = 'button';
  hintButton.textContent = 'Use tone matching';
  hintButton.addEventListener('click', () => {
    actions.useToneMatching();
  });
  hintRow.append(hintText, hintButton);

  // --- the ramp strip ----------------------------------------------
  const rampBlock = doc.createElement('div');
  rampBlock.className = 'tone-ramp';
  const rampLabel = doc.createElement('p');
  rampLabel.className = 'group-label';
  rampLabel.id = 'tone-ramp-label';
  rampLabel.textContent = 'Lightness ramp';
  const rampHelper = doc.createElement('p');
  rampHelper.className = 'helper';
  rampHelper.id = 'tone-ramp-helper';
  rampHelper.textContent =
    'Where the picture’s lightness falls, and which colour each band gets. Drag the cut handles at full tone; shares show what each colour achieved in the last render.';
  const track = doc.createElement('div');
  track.className = 'tone-ramp-track';
  const canvas = doc.createElement('canvas');
  canvas.className = 'tone-ramp-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-labelledby', 'tone-ramp-label');
  canvas.setAttribute('aria-describedby', 'tone-ramp-helper');
  track.append(canvas);
  const handleLayer = doc.createElement('div');
  handleLayer.className = 'tone-ramp-handles';
  track.append(handleLayer);
  const rampEmpty = doc.createElement('p');
  rampEmpty.className = 'meta';
  rampEmpty.textContent = 'The ramp appears once the palette has colours.';
  const bandList = doc.createElement('ul');
  bandList.className = 'tone-bands';
  bandList.setAttribute('aria-label', 'Bands, darkest first, with achieved shares');

  const rampButtons = doc.createElement('div');
  rampButtons.className = 'toolbar';
  const equaliseButton = doc.createElement('button');
  equaliseButton.type = 'button';
  equaliseButton.textContent = 'Equalise';
  equaliseButton.addEventListener('click', () => {
    actions.equalise();
  });
  const resetCutsButton = doc.createElement('button');
  resetCutsButton.type = 'button';
  resetCutsButton.textContent = 'Reset cuts';
  resetCutsButton.addEventListener('click', () => {
    actions.setCuts(null);
  });
  const cutsHelper = doc.createElement('p');
  cutsHelper.className = 'helper';
  cutsHelper.id = 'tone-cuts-helper';
  cutsHelper.textContent =
    'Equal shares by the picture’s lightness. Cut handles and Equalise apply at full tone.';
  equaliseButton.setAttribute('aria-describedby', cutsHelper.id);
  rampButtons.append(equaliseButton, resetCutsButton);
  rampBlock.append(rampLabel, rampHelper, track, rampEmpty, bandList, rampButtons, cutsHelper);

  // --- the three-point curve, behind a reveal ----------------------
  const curveDetails = doc.createElement('details');
  curveDetails.className = 'depth-reveal';
  const curveSummary = doc.createElement('summary');
  curveSummary.textContent = 'Lightness curve';
  const curveBody = doc.createElement('div');
  curveBody.className = 'depth-reveal-body';
  const curveHelper = doc.createElement('p');
  curveHelper.className = 'helper';
  curveHelper.id = 'tone-curve-helper';
  curveHelper.textContent =
    'Remaps the picture’s lightness before matching — three points, each movable on both axes; swap the ends to invert. Tab to a point, arrows nudge, Shift for bigger steps.';
  const svgNs = 'http://www.w3.org/2000/svg';
  const curveSvg = doc.createElementNS(svgNs, 'svg');
  curveSvg.setAttribute('class', 'tone-curve');
  curveSvg.setAttribute('viewBox', '0 0 100 100');
  curveSvg.setAttribute('aria-hidden', 'true');
  const curveGrid = doc.createElementNS(svgNs, 'path');
  curveGrid.setAttribute('class', 'tone-curve-grid');
  curveGrid.setAttribute('d', 'M0 50 H100 M50 0 V100 M0 100 L100 0');
  const curvePath = doc.createElementNS(svgNs, 'path');
  curvePath.setAttribute('class', 'tone-curve-path');
  curveSvg.append(curveGrid, curvePath);
  const curvePointsLayer = doc.createElement('div');
  curvePointsLayer.className = 'tone-curve-points';
  const curvePlot = doc.createElement('div');
  curvePlot.className = 'tone-curve-plot';
  curvePlot.append(curveSvg, curvePointsLayer);

  const POINT_NAMES = ['Bottom point', 'Mid point', 'Top point'] as const;
  const pointButtons = POINT_NAMES.map((name, index) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'tone-curve-point';
    button.setAttribute('role', 'slider');
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-describedby', curveHelper.id);
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
      actions.setCurve(nudgeCurvePoint(state.tone.curve, index as 0 | 1 | 2, dIn, dOut));
    });
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent): void => {
        const rect = curvePlot.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const inL = ((ev.clientX - rect.left) / rect.width) * 100;
        const outL = (1 - (ev.clientY - rect.top) / rect.height) * 100;
        const current = state.tone.curve[index as 0 | 1 | 2];
        actions.setCurve(
          nudgeCurvePoint(
            state.tone.curve,
            index as 0 | 1 | 2,
            inL - current.in,
            outL - current.out,
          ),
        );
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
  curvePointsLayer.append(...pointButtons);

  // Numbers beside the plot: native inputs are the robust route for
  // AT (UI-STANDARDS: prefer native controls before custom ARIA).
  const curveNumbers = doc.createElement('div');
  curveNumbers.className = 'tone-curve-numbers';
  const numberInputs: { inField: HTMLInputElement; outField: HTMLInputElement }[] = [];
  POINT_NAMES.forEach((name, index) => {
    const row = doc.createElement('div');
    row.className = 'tone-curve-number-row';
    const rowLabel = doc.createElement('span');
    rowLabel.className = 'meta';
    rowLabel.textContent = name;
    const makeInput = (axis: 'in' | 'out'): HTMLInputElement => {
      const wrap = doc.createElement('label');
      wrap.className = 'tone-curve-number';
      wrap.textContent = axis === 'in' ? 'In' : 'Out';
      const input = doc.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.setAttribute('aria-label', `${name} ${axis === 'in' ? 'input' : 'output'} lightness`);
      input.addEventListener('change', () => {
        const value = Math.min(100, Math.max(0, Number(input.value) || 0));
        const current = state.tone.curve[index as 0 | 1 | 2];
        actions.setCurve(
          nudgeCurvePoint(
            state.tone.curve,
            index as 0 | 1 | 2,
            axis === 'in' ? value - current.in : 0,
            axis === 'out' ? value - current.out : 0,
          ),
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
    curveNumbers.append(row);
  });
  const resetCurveButton = doc.createElement('button');
  resetCurveButton.type = 'button';
  resetCurveButton.textContent = 'Reset curve';
  resetCurveButton.addEventListener('click', () => {
    actions.setCurve([
      { in: 0, out: 0 },
      { in: 50, out: 50 },
      { in: 100, out: 100 },
    ]);
  });
  curveBody.append(curveHelper, curvePlot, curveNumbers, resetCurveButton);
  curveDetails.append(curveSummary, curveBody);

  // --- re-pick from the current frame ------------------------------
  const rePickRow = doc.createElement('div');
  rePickRow.className = 'field';
  const rePickButton = doc.createElement('button');
  rePickButton.type = 'button';
  rePickButton.textContent = 'Re-pick from current frame';
  const rePickHelper = doc.createElement('p');
  rePickHelper.className = 'helper';
  rePickHelper.id = 'tone-repick-helper';
  rePickButton.setAttribute('aria-describedby', rePickHelper.id);
  rePickButton.addEventListener('click', () => {
    actions.rePick();
  });
  rePickRow.append(rePickButton, rePickHelper);

  // --- the colour-use floor -----------------------------------------
  const floorToggle = toggleField(
    doc,
    'tone-floor',
    'Minimum stitches per colour',
    initial.floor.on,
    (on) => {
      actions.setFloor({ ...state.floor, on });
    },
  );
  const floorField = doc.createElement('div');
  floorField.className = 'field';
  const floorLabel = doc.createElement('label');
  floorLabel.htmlFor = 'tone-floor-n';
  floorLabel.textContent = 'Stitches';
  const floorInput = doc.createElement('input');
  floorInput.type = 'number';
  floorInput.id = 'tone-floor-n';
  floorInput.min = '1';
  floorInput.max = '100000';
  floorInput.step = '1';
  floorInput.addEventListener('change', () => {
    const minStitches = Math.max(1, Math.min(100000, Math.round(Number(floorInput.value) || 1)));
    floorInput.value = String(minStitches);
    actions.setFloor({ ...state.floor, minStitches });
  });
  const floorHelper = doc.createElement('p');
  floorHelper.className = 'helper';
  floorHelper.id = 'tone-floor-helper';
  floorHelper.textContent =
    'After the colour count, colours that earn fewer stitches than this are dropped. Must-use colours are always kept.';
  floorInput.setAttribute('aria-describedby', floorHelper.id);
  floorField.append(floorLabel, floorInput, floorHelper);

  element.append(
    groupLabel,
    groupHelper,
    sliderField,
    hintRow,
    rampBlock,
    curveDetails,
    rePickRow,
    floorToggle.element,
    floorField,
  );

  // --- ramp internals ------------------------------------------------

  /** The cuts in force: custom when they bind, else natural. */
  function effectiveCuts(): number[] {
    const { tone, rungs, naturalCuts } = state;
    if (
      tone.weight === 1 &&
      tone.cuts !== null &&
      rungs.length >= 2 &&
      tone.cuts.length === rungs.length - 1
    ) {
      return [...tone.cuts];
    }
    return [...naturalCuts];
  }

  function customCutsActive(): boolean {
    const { tone, rungs } = state;
    return (
      tone.weight === 1 && tone.cuts !== null && tone.cuts.length === rungs.length - 1
    );
  }

  function rebuildHandles(): void {
    const cuts = effectiveCuts();
    const interactive = state.tone.weight === 1 && state.rungs.length >= 2;
    handleLayer.replaceChildren();
    cuts.forEach((l, k) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'tone-cut-handle';
      button.setAttribute('role', 'slider');
      button.setAttribute('aria-orientation', 'horizontal');
      const below = state.rungs[k]?.label ?? '';
      const above = state.rungs[k + 1]?.label ?? '';
      button.setAttribute('aria-label', `Cut ${String(k + 1)}: ${below} to ${above}`);
      button.setAttribute('aria-valuemin', String(k > 0 ? Math.round((cuts[k - 1] ?? 0) * 10) / 10 : 0));
      button.setAttribute('aria-valuemax', String(k + 1 < cuts.length ? Math.round((cuts[k + 1] ?? 100) * 10) / 10 : 100));
      button.setAttribute('aria-valuenow', String(Math.round(l * 10) / 10));
      button.setAttribute('aria-valuetext', `lightness ${String(Math.round(l * 10) / 10)}`);
      button.style.left = `${String(l)}%`;
      button.disabled = !interactive;
      button.addEventListener('keydown', (event) => {
        if (!interactive) return;
        const step = event.shiftKey ? 5 : 0.5;
        let next: number;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = l + step;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = l - step;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = 100;
        else return;
        event.preventDefault();
        commitCut(k, next);
      });
      button.addEventListener('pointerdown', (event) => {
        if (!interactive) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        const move = (ev: PointerEvent): void => {
          const rect = track.getBoundingClientRect();
          if (rect.width <= 0) return;
          commitCut(k, ((ev.clientX - rect.left) / rect.width) * 100);
        };
        const up = (): void => {
          button.removeEventListener('pointermove', move);
          button.removeEventListener('pointerup', up);
        };
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerup', up);
      });
      handleLayer.append(button);
    });
  }

  /** Apply one cut move: current effective cuts become custom cuts. */
  function commitCut(k: number, l: number): void {
    const cuts = effectiveCuts();
    cuts[k] = clampCut(cuts, k, l);
    actions.setCuts(cuts);
  }

  function drawRamp(): void {
    const width = track.clientWidth;
    const height = 64;
    if (width <= 0) return;
    const dpr = doc.defaultView?.devicePixelRatio ?? 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${String(height)}px`;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const style = doc.defaultView?.getComputedStyle(track);
    const ink = style?.color ?? '#888888';

    const cuts = effectiveCuts();
    const bandTop = height - 18;
    // Band strip: each rung's colour between its cuts.
    if (state.rungs.length > 0) {
      const edges = [0, ...cuts, 100];
      for (let k = 0; k < state.rungs.length; k++) {
        const x0 = ((edges[k] ?? 0) / 100) * width;
        const x1 = ((edges[k + 1] ?? 100) / 100) * width;
        ctx.fillStyle = state.rungs[k]?.hex ?? '#000000';
        ctx.fillRect(x0, bandTop, Math.max(0, x1 - x0), height - bandTop);
      }
    }
    // Histogram of the held source's curved lightness.
    const hist = state.histogram;
    if (hist !== null && hist.total > 0) {
      let peak = 0;
      for (const count of hist.counts) if (count > peak) peak = count;
      if (peak > 0) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.55;
        const bins = hist.counts.length;
        const barW = width / bins;
        for (let b = 0; b < bins; b++) {
          const h = ((hist.counts[b] ?? 0) / peak) * (bandTop - 4);
          if (h <= 0) continue;
          ctx.fillRect(b * barW, bandTop - h, Math.max(barW, 0.75), h);
        }
        ctx.globalAlpha = 1;
      }
    }
    // Cut lines over both zones.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    for (const cut of cuts) {
      const x = (cut / 100) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  function renderBands(): void {
    bandList.replaceChildren();
    state.rungs.forEach((rung, k) => {
      const item = doc.createElement('li');
      item.className = 'tone-band';
      const swatch = doc.createElement('span');
      swatch.className = 'tone-band-swatch';
      swatch.style.backgroundColor = rung.hex;
      swatch.setAttribute('aria-hidden', 'true');
      const text = doc.createElement('span');
      const share = state.achieved?.[k];
      const shareText =
        state.achieved === null
          ? 'no render yet'
          : share === null || share === undefined
            ? 'swapped — see Colours used'
            : shareLabel(share);
      text.textContent = `${rung.label} — ${shareText}`;
      item.append(swatch, text);
      bandList.append(item);
    });
  }

  const resize = doc.defaultView?.ResizeObserver
    ? new (doc.defaultView.ResizeObserver)(() => {
        drawRamp();
      })
    : null;
  resize?.observe(track);

  let lastFp = '';

  function update(next: ToneControlsState): void {
    state = next;
    element.hidden = !next.visible;
    if (!next.visible) return;

    if (doc.activeElement !== slider) {
      slider.value = String(Math.round(next.tone.weight * 100));
      slider.setAttribute('aria-valuetext', weightText(next.tone.weight));
    }

    // Hint: one heuristic, two messages; never a block (D200 —
    // wording is a working label for the owner).
    hintRow.hidden = next.hint === null;
    if (next.hint === 'offer-tone') {
      hintText.textContent = 'This palette reads as a light-to-dark ladder. ';
      hintButton.hidden = false;
    } else if (next.hint === 'confetti') {
      hintText.textContent =
        'Many hues matched by lightness alone — this may be entering confetti zone. The ramp below shows what each band gets. ';
      hintButton.hidden = true;
    }

    const hasRungs = next.rungs.length > 0;
    track.hidden = !hasRungs;
    bandList.hidden = !hasRungs;
    rampEmpty.hidden = hasRungs;
    const atEndStop = next.tone.weight === 1;
    equaliseButton.disabled = !atEndStop || next.rungs.length < 2 || next.histogram === null;
    resetCutsButton.hidden = !customCutsActive();
    cutsHelper.hidden = atEndStop;

    // Re-pick: enabled only with a live capture to pick from; the
    // reason stays visible either way (UI-STANDARDS: disabled
    // controls owe their explanation).
    rePickButton.disabled = !next.canRePick;
    rePickHelper.textContent = next.canRePick
      ? 'Choose the palette against what the capture shows now; it then holds until the next re-pick or geometry change.'
      : 'Available during live capture. A still picture already picks from itself.';

    floorToggle.input.checked = next.floor.on;
    const floorState = floorToggle.input.nextElementSibling;
    if (floorState !== null) floorState.textContent = next.floor.on ? 'On' : 'Off';
    floorField.hidden = !next.floor.on;
    if (doc.activeElement !== floorInput) floorInput.value = String(next.floor.minStitches);

    // Curve: path, point positions, numbers.
    const [lo, mid, hi] = next.tone.curve;
    curvePath.setAttribute(
      'd',
      `M0 ${String(100 - lo.out)} L${String(lo.in)} ${String(100 - lo.out)} L${String(mid.in)} ${String(100 - mid.out)} L${String(hi.in)} ${String(100 - hi.out)} L100 ${String(100 - hi.out)}`,
    );
    curveSummary.textContent = isIdentityCurve(next.tone.curve)
      ? 'Lightness curve'
      : 'Lightness curve (adjusted)';
    next.tone.curve.forEach((point, i) => {
      const button = pointButtons[i];
      if (button === undefined) return;
      button.style.left = `${String(point.in)}%`;
      button.style.top = `${String(100 - point.out)}%`;
      button.setAttribute('aria-valuenow', String(point.out));
      button.setAttribute(
        'aria-valuetext',
        `input ${String(point.in)}, output ${String(point.out)}`,
      );
      const fields = numberInputs[i];
      if (fields !== undefined) {
        if (doc.activeElement !== fields.inField) fields.inField.value = String(point.in);
        if (doc.activeElement !== fields.outField) fields.outField.value = String(point.out);
      }
    });

    // Ramp redraw, fingerprinted so a same-shares frame costs nothing.
    const fp = JSON.stringify([
      next.rungs.map((r) => [r.id, r.hex, Math.round(r.l * 10)]),
      effectiveCuts().map((c) => Math.round(c * 10)),
      next.achieved?.map((s) => (s === null ? -1 : Math.round(s * 1000))) ?? null,
      next.histogram === null ? 0 : next.histogram.total,
      next.tone.weight === 1,
      next.ditherOn,
    ]);
    if (fp !== lastFp) {
      lastFp = fp;
      rebuildHandles();
      drawRamp();
      renderBands();
    }
  }

  update(initial);
  return { element, update };
}
