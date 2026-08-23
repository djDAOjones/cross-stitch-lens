/**
 * CREATIVE-01 prototype — the tone-mode playground page
 * (tone-proto.html). Drives src/core/tone/* directly on the main
 * thread: pick a source and a ladder, walk the colour↔tone slider,
 * drag cut handles on the ramp (two control shapes trialled: gradient
 * strip and histogram-backed), bend the three-point curve, and compare
 * the dither error spaces live.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket. Deliberately main-thread and synchronous — 300² maps in a
 * few ms; the shipped build routes through the worker like every
 * stage.
 */

import {
  builtInProfiles,
  resolveProfileMembership,
} from './core/color-profile.ts';
import { srgbToLab } from './core/color/convert.ts';
import { paletteLab } from './core/palette.ts';
import { buildDistribution } from './core/palette-selection.ts';
import { resizeStage } from './core/pipeline/resize.ts';
import { loadCatalogue } from './core/thread-catalogue.ts';
import {
  achievedShares,
  equalShares,
  ladderOrder,
  lightnessHistogram,
  naturalCuts,
  quantileCuts,
  HIST_BINS,
} from './core/tone/tone-bands.ts';
import { identityCurve, type CurvePoint } from './core/tone/tone-curve.ts';
import { selectWeighted } from './core/tone/tone-metric.ts';
import { toneMap, type ToneDither } from './core/tone/tone-map.ts';
import { makeLadder } from './core/tone/proto-ladders.ts';
import { EMPTY_INDEX, type Palette, type PixelBuffer } from './core/types.ts';
import { sampleBuffer, SAMPLE_NAME } from './ui/sample.ts';

// ---------------------------------------------------------------------
// DOM plumbing
// ---------------------------------------------------------------------

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing #${id}`);
  return el as unknown as T;
}

const statusEl = must<HTMLDivElement>('status');
const sourceSel = must<HTMLSelectElement>('source');
const ladderSel = must<HTMLSelectElement>('ladder');
const gridSel = must<HTMLSelectElement>('grid');
const toneInput = must<HTMLInputElement>('tone');
const toneValue = must<HTMLSpanElement>('tone-value');
const ditherSel = must<HTMLSelectElement>('dither');
const serpentineInput = must<HTMLInputElement>('serpentine');
const rampCanvas = must<HTMLCanvasElement>('ramp');
const rampShapeSel = must<HTMLSelectElement>('ramp-shape');
const naturalBtn = must<HTMLButtonElement>('natural');
const equaliseBtn = must<HTMLButtonElement>('equalise');
const cutInputsEl = must<HTMLSpanElement>('cut-inputs');
const bandsTable = must<HTMLTableElement>('bands');
const curveCanvas = must<HTMLCanvasElement>('curve');
const curveInputsEl = must<HTMLDivElement>('curve-inputs');
const curveResetBtn = must<HTMLButtonElement>('curve-reset');
const beforeCanvas = must<HTMLCanvasElement>('before');
const afterCanvas = must<HTMLCanvasElement>('after');
const afterCaption = must<HTMLElement>('after-caption');
const statsEl = must<HTMLParagraphElement>('stats');

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  return ctx;
}

// ---------------------------------------------------------------------
// Sources — the sample card plus the six-photograph rig (D147 slots)
// ---------------------------------------------------------------------

const PHOTO_SLOTS: readonly { file: string; label: string }[] = [
  { file: 'landscape-1.jpg', label: 'Landscape photo 1' },
  { file: 'landscape-2.jpg', label: 'Landscape photo 2' },
  { file: 'portrait.jpg', label: 'Portrait photo' },
  { file: 'graphic.jpg', label: 'Flat-colour graphic' },
  { file: 'stained-glass.jpg', label: 'Stained glass' },
  { file: 'text.png', label: 'Text sample' },
];

const sourceCache = new Map<string, PixelBuffer>();

async function loadSource(key: string): Promise<PixelBuffer> {
  const cached = sourceCache.get(key);
  if (cached !== undefined) return cached;
  let buffer: PixelBuffer;
  if (key === 'sample') {
    buffer = sampleBuffer();
  } else {
    const base: string = import.meta.env.BASE_URL;
    const response = await fetch(`${base}profile-demo/${key}`);
    if (!response.ok) throw new Error(`fetch ${key}: ${String(response.status)}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error(`${key} is not an image`);
    const bitmap = await createImageBitmap(blob);
    // Cap the working copy: selection and the histogram only need
    // grid-scale structure, and 512² keeps every recompute instant.
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const off = new OffscreenCanvas(w, h);
    const ctx = off.getContext('2d');
    if (ctx === null) throw new Error('no OffscreenCanvas context');
    ctx.drawImage(bitmap, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    buffer = { width: w, height: h, data: new Uint8ClampedArray(img.data) };
  }
  sourceCache.set(key, buffer);
  return buffer;
}

// ---------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------

const catalogue = loadCatalogue();
const profiles = builtInProfiles(catalogue);

function profileLadder(id: string, fallbackName: string): Palette {
  const profile = profiles.find((p) => p.id === id);
  if (profile === undefined) return { name: fallbackName, entries: [] };
  const resolved = resolveProfileMembership(profile.recipe, { catalogue });
  return { name: profile.name, entries: resolved.entries };
}

const DMC8_KEY = 'dmc8';
const fixedLadders = new Map<string, Palette>([
  ['delft', profileLadder('builtin:delft-blue', 'Delft blue')],
  ['ukiyo', profileLadder('builtin:ukiyo-e', 'Ukiyo-e woodblock')],
  ['sepia', makeLadder(catalogue.threads, 'Proto sepia (25–55°)', 25, 55, 6)],
  ['rose', makeLadder(catalogue.threads, 'Proto rose (320–355°)', 320, 355, 6)],
]);

const eligible = catalogue.threads.filter((t) => t.status === 'current');

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

interface State {
  sourceKey: string;
  ladderKey: string;
  grid: number;
  tone: number;
  dither: ToneDither;
  serpentine: boolean;
  curve: [CurvePoint, CurvePoint, CurvePoint];
  /** Ladder-mode cuts; rebuilt as natural cuts when null. */
  cuts: number[] | null;
  rampShape: 'strip' | 'hist';
  activeCut: number;
}

const state: State = {
  sourceKey: 'sample',
  ladderKey: 'delft',
  grid: 300,
  tone: 1,
  dither: 'weighted-error',
  serpentine: true,
  curve: identityCurve(),
  cuts: null,
  rampShape: 'strip',
  activeCut: 0,
};

interface Derived {
  gridBuffer: PixelBuffer;
  palette: Palette;
  order: Uint16Array;
  output: PixelBuffer;
  hist: { counts: Float64Array; total: number };
}

let derived: Derived | null = null;

function currentPalette(gridBuffer: PixelBuffer): Palette {
  if (state.ladderKey !== DMC8_KEY) {
    return fixedLadders.get(state.ladderKey) ?? { name: '?', entries: [] };
  }
  const distribution = buildDistribution(gridBuffer);
  const picks = selectWeighted(eligible, 8, distribution, state.tone);
  return { name: `DMC-wide, 8 by weight t=${state.tone.toFixed(2)}`, entries: picks };
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function paintBuffer(canvas: HTMLCanvasElement, buffer: PixelBuffer): void {
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  ctx2d(canvas).putImageData(
    new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height),
    0,
    0,
  );
}

function luminanceBias(source: PixelBuffer, output: PixelBuffer): number {
  const labA = new Float32Array(3);
  const labB = new Float32Array(3);
  let sum = 0;
  let n = 0;
  const px = source.width * source.height;
  for (let p = 0; p < px; p++) {
    const i = p * 4;
    if ((source.data[i + 3] ?? 255) === 0) continue;
    srgbToLab(source.data[i] ?? 0, source.data[i + 1] ?? 0, source.data[i + 2] ?? 0, labA, 0);
    srgbToLab(output.data[i] ?? 0, output.data[i + 1] ?? 0, output.data[i + 2] ?? 0, labB, 0);
    sum += (labB[0] ?? 0) - (labA[0] ?? 0);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

function ladderModeActive(): boolean {
  return state.tone >= 1;
}

async function recompute(): Promise<void> {
  try {
    const source = await loadSource(state.sourceKey);
    const gridBuffer = resizeStage.backends.ts(source, {
      width: state.grid,
      height: state.grid,
      mode: 'contain',
    });
    const palette = currentPalette(gridBuffer);
    if (palette.entries.length === 0) throw new Error('empty palette');
    const order = ladderOrder(palette);
    if (state.cuts === null || state.cuts.length !== palette.entries.length - 1) {
      state.cuts = naturalCuts(palette, order);
    }
    const useCuts = ladderModeActive();
    const output = toneMap(gridBuffer, {
      palette,
      tone: state.tone,
      curve: state.curve,
      cuts: useCuts ? state.cuts : null,
      order: useCuts ? order : null,
      dither: state.dither,
      serpentine: state.serpentine,
    });
    const hist = lightnessHistogram(gridBuffer, state.curve);
    derived = { gridBuffer, palette, order, output, hist };

    paintBuffer(beforeCanvas, gridBuffer);
    paintBuffer(afterCanvas, output);
    afterCaption.textContent =
      `${palette.name} — t=${state.tone.toFixed(2)}, ${state.dither}` +
      (useCuts ? ', ladder cuts' : ', weighted nearest');
    const bias = luminanceBias(gridBuffer, output);
    let stitched = 0;
    const indices = output.indices ?? new Uint16Array(0);
    for (let p = 0; p < indices.length; p++) {
      if ((indices[p] ?? EMPTY_INDEX) !== EMPTY_INDEX) stitched++;
    }
    statsEl.textContent =
      `${palette.entries.length} rungs · L* bias ${bias.toFixed(2)} · ` +
      `${String(stitched)} stitches`;
    statusEl.textContent = '';
    drawRamp();
    drawBands();
    drawCurve();
    renderCutInputs();
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  }
}

let pending: number | null = null;
function schedule(): void {
  if (pending !== null) window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = null;
    void recompute();
  }, 60);
}

// ---------------------------------------------------------------------
// The ramp — two control shapes over the same cuts
// ---------------------------------------------------------------------

const RAMP_PAD = 12;

function rampXForL(l: number): number {
  return RAMP_PAD + (l / 100) * (rampCanvas.width - 2 * RAMP_PAD);
}

function rampLForX(x: number): number {
  return Math.min(100, Math.max(0, ((x - RAMP_PAD) / (rampCanvas.width - 2 * RAMP_PAD)) * 100));
}

function drawRamp(): void {
  const ctx = ctx2d(rampCanvas);
  const { width, height } = rampCanvas;
  ctx.clearRect(0, 0, width, height);
  if (derived === null) return;
  const { palette, order, hist } = derived;
  const cuts = state.cuts ?? [];
  const active = ladderModeActive();
  const lab = paletteLab(palette);
  const stripTop = 30;
  const stripH = height - stripTop - 14;

  // Histogram-backed shape: the curved-L distribution behind the bands.
  if (state.rampShape === 'hist') {
    ctx.fillStyle = 'rgba(160,160,160,0.55)';
    let peak = 0;
    for (let b = 0; b < HIST_BINS; b++) peak = Math.max(peak, hist.counts[b] ?? 0);
    if (peak > 0) {
      for (let b = 0; b < HIST_BINS; b++) {
        const h = ((hist.counts[b] ?? 0) / peak) * (stripTop - 4);
        const x = rampXForL((b / HIST_BINS) * 100);
        const x2 = rampXForL(((b + 1) / HIST_BINS) * 100);
        ctx.fillRect(x, stripTop - h, Math.max(1, x2 - x), h);
      }
    }
  }

  // The band strip: rung colour between consecutive cuts (the readout
  // half of the DaVinci-qualifier idiom — control and provenance in
  // one strip).
  const bounds = [0, ...cuts, 100];
  for (let band = 0; band < order.length; band++) {
    const entry = palette.entries[order[band] ?? 0];
    ctx.fillStyle = entry?.hex ?? '#000';
    const x0 = rampXForL(bounds[band] ?? 0);
    const x1 = rampXForL(bounds[band + 1] ?? 100);
    ctx.fillRect(x0, stripTop, x1 - x0, stripH);
  }
  // Rung L* markers under the strip.
  ctx.fillStyle = '#999';
  for (let band = 0; band < order.length; band++) {
    const l = lab[(order[band] ?? 0) * 3] ?? 0;
    ctx.fillRect(rampXForL(l) - 1, stripTop + stripH, 2, 6);
  }
  // Cut handles.
  for (let k = 0; k < cuts.length; k++) {
    const x = rampXForL(cuts[k] ?? 0);
    ctx.strokeStyle = active ? '#fff' : '#777';
    ctx.lineWidth = k === state.activeCut ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, stripTop - 6);
    ctx.lineTo(x, stripTop + stripH + 6);
    ctx.stroke();
    ctx.fillStyle = active ? '#fff' : '#777';
    ctx.beginPath();
    ctx.arc(x, stripTop - 8, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  if (!active) {
    ctx.fillStyle = '#b5b5b5';
    ctx.fillText('cuts engage at the tone end-stop (t = 1)', RAMP_PAD, 12);
  }
}

function drawBands(): void {
  if (derived === null) return;
  const { palette, order, output, hist } = derived;
  const cuts = state.cuts ?? [];
  const achieved = achievedShares(output.indices ?? new Uint16Array(0), palette, order);
  // Target share per band from the histogram between its cuts.
  const bounds = [0, ...cuts, 100];
  const targets: number[] = [];
  for (let band = 0; band < order.length; band++) {
    let sum = 0;
    const from = Math.floor(((bounds[band] ?? 0) / 100) * HIST_BINS);
    const to = Math.min(HIST_BINS, Math.ceil(((bounds[band + 1] ?? 100) / 100) * HIST_BINS));
    for (let b = from; b < to; b++) sum += hist.counts[b] ?? 0;
    targets.push(hist.total === 0 ? 0 : sum / hist.total);
  }
  const rows = ['<tr><th>band</th><th>thread</th><th>histogram</th><th>achieved</th></tr>'];
  for (let band = 0; band < order.length; band++) {
    const entry = palette.entries[order[band] ?? 0];
    const name = entry === undefined ? '?' : `${entry.brandId} ${entry.reference}`;
    const hex = entry?.hex ?? '#000';
    rows.push(
      `<tr><td>${String(band + 1)}</td>` +
        `<td><span style="display:inline-block;width:10px;height:10px;background:${hex};margin-right:4px"></span>${name}</td>` +
        `<td>${((targets[band] ?? 0) * 100).toFixed(1)}%</td>` +
        `<td>${((achieved[band] ?? 0) * 100).toFixed(1)}%</td></tr>`,
    );
  }
  bandsTable.innerHTML = rows.join('');
}

function renderCutInputs(): void {
  const cuts = state.cuts ?? [];
  const existing = cutInputsEl.querySelectorAll('input');
  if (existing.length === cuts.length) {
    existing.forEach((input, k) => {
      if (document.activeElement !== input) input.value = (cuts[k] ?? 0).toFixed(1);
    });
    return;
  }
  cutInputsEl.innerHTML = '';
  cuts.forEach((value, k) => {
    const label = document.createElement('label');
    label.append(`cut ${String(k + 1)} `);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
    input.step = '0.5';
    input.setAttribute('aria-label', `cut ${String(k + 1)} lightness`);
    input.value = value.toFixed(1);
    input.addEventListener('input', () => {
      setCut(k, Number(input.value));
    });
    label.append(input);
    cutInputsEl.append(label);
  });
}

function setCut(k: number, value: number): void {
  const cuts = state.cuts;
  if (cuts === null) return;
  const lo = k > 0 ? (cuts[k - 1] ?? 0) : 0;
  const hi = k + 1 < cuts.length ? (cuts[k + 1] ?? 100) : 100;
  cuts[k] = Math.min(hi, Math.max(lo, value));
  state.activeCut = k;
  schedule();
}

let draggingCut = -1;

rampCanvas.addEventListener('pointerdown', (event) => {
  if (state.cuts === null || !ladderModeActive()) return;
  const rect = rampCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * rampCanvas.width;
  let best = -1;
  let bestDist = 10;
  state.cuts.forEach((cut, k) => {
    const d = Math.abs(rampXForL(cut) - x);
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  });
  if (best >= 0) {
    draggingCut = best;
    state.activeCut = best;
    rampCanvas.setPointerCapture(event.pointerId);
    drawRamp();
  }
});

rampCanvas.addEventListener('pointermove', (event) => {
  if (draggingCut < 0) return;
  const rect = rampCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * rampCanvas.width;
  setCut(draggingCut, rampLForX(x));
  drawRamp();
});

rampCanvas.addEventListener('pointerup', () => {
  draggingCut = -1;
});

naturalBtn.addEventListener('click', () => {
  if (derived !== null) state.cuts = naturalCuts(derived.palette, derived.order);
  schedule();
});

equaliseBtn.addEventListener('click', () => {
  if (derived !== null) {
    state.cuts = quantileCuts(derived.hist, equalShares(derived.palette.entries.length));
  }
  schedule();
});

// ---------------------------------------------------------------------
// The curve editor
// ---------------------------------------------------------------------

const CURVE_PAD = 14;

function curveXY(point: CurvePoint): [number, number] {
  const span = curveCanvas.width - 2 * CURVE_PAD;
  return [
    CURVE_PAD + (point.in / 100) * span,
    curveCanvas.height - CURVE_PAD - (point.out / 100) * span,
  ];
}

function drawCurve(): void {
  const ctx = ctx2d(curveCanvas);
  const { width, height } = curveCanvas;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#444';
  ctx.strokeRect(CURVE_PAD, CURVE_PAD, width - 2 * CURVE_PAD, height - 2 * CURVE_PAD);
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.moveTo(CURVE_PAD, height - CURVE_PAD);
  ctx.lineTo(width - CURVE_PAD, CURVE_PAD);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#7cb2ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const [lo, mid, hi] = state.curve;
  const start = curveXY({ in: 0, out: lo.out });
  ctx.moveTo(CURVE_PAD, start[1]);
  for (const p of [lo, mid, hi]) {
    const [x, y] = curveXY(p);
    ctx.lineTo(x, y);
  }
  const end = curveXY({ in: 100, out: hi.out });
  ctx.lineTo(width - CURVE_PAD, end[1]);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const p of state.curve) {
    const [x, y] = curveXY(p);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function renderCurveInputs(): void {
  curveInputsEl.innerHTML = '<span></span><span>in</span><span>out</span>';
  const names = ['bottom', 'mid', 'top'];
  state.curve.forEach((point, k) => {
    const rowLabel = document.createElement('span');
    rowLabel.textContent = names[k] ?? '';
    curveInputsEl.append(rowLabel);
    (['in', 'out'] as const).forEach((axis) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.value = String(point[axis]);
      input.setAttribute('aria-label', `${names[k] ?? ''} ${axis}`);
      input.addEventListener('input', () => {
        setCurvePoint(k, axis, Number(input.value));
      });
      curveInputsEl.append(input);
    });
  });
}

function setCurvePoint(k: number, axis: 'in' | 'out', value: number): void {
  const clamped = Math.min(100, Math.max(0, value));
  const points: [CurvePoint, CurvePoint, CurvePoint] = [
    { ...state.curve[0] },
    { ...state.curve[1] },
    { ...state.curve[2] },
  ];
  const point = points[k];
  if (point === undefined) return;
  if (axis === 'in') {
    // Keep `in` values ordered so the map stays a function.
    const lo = k > 0 ? (points[k - 1]?.in ?? 0) : 0;
    const hi = k < 2 ? (points[k + 1]?.in ?? 100) : 100;
    point.in = Math.min(hi, Math.max(lo, clamped));
  } else {
    point.out = clamped;
  }
  state.curve = points;
  drawCurve();
  schedule();
}

let draggingPoint = -1;

curveCanvas.addEventListener('pointerdown', (event) => {
  const rect = curveCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * curveCanvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * curveCanvas.height;
  let best = -1;
  let bestDist = 14;
  state.curve.forEach((point, k) => {
    const [px, py] = curveXY(point);
    const d = Math.hypot(px - x, py - y);
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  });
  if (best >= 0) {
    draggingPoint = best;
    curveCanvas.setPointerCapture(event.pointerId);
  }
});

curveCanvas.addEventListener('pointermove', (event) => {
  if (draggingPoint < 0) return;
  const rect = curveCanvas.getBoundingClientRect();
  const span = curveCanvas.width - 2 * CURVE_PAD;
  const inVal = (((event.clientX - rect.left) / rect.width) * curveCanvas.width - CURVE_PAD) / span;
  const outVal =
    (curveCanvas.height -
      CURVE_PAD -
      ((event.clientY - rect.top) / rect.height) * curveCanvas.height) /
    span;
  setCurvePoint(draggingPoint, 'in', inVal * 100);
  setCurvePoint(draggingPoint, 'out', outVal * 100);
  renderCurveInputs();
});

curveCanvas.addEventListener('pointerup', () => {
  draggingPoint = -1;
});

curveResetBtn.addEventListener('click', () => {
  state.curve = identityCurve();
  renderCurveInputs();
  drawCurve();
  schedule();
});

// ---------------------------------------------------------------------
// Control wiring
// ---------------------------------------------------------------------

function fillSelectors(): void {
  const addOption = (select: HTMLSelectElement, value: string, label: string): void => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  };
  addOption(sourceSel, 'sample', SAMPLE_NAME);
  for (const slot of PHOTO_SLOTS) addOption(sourceSel, slot.file, slot.label);
  for (const [key, palette] of fixedLadders) {
    addOption(ladderSel, key, `${palette.name} (${String(palette.entries.length)})`);
  }
  addOption(ladderSel, DMC8_KEY, 'Whole catalogue, 8 by weight');
}

sourceSel.addEventListener('change', () => {
  state.sourceKey = sourceSel.value;
  schedule();
});
ladderSel.addEventListener('change', () => {
  state.ladderKey = ladderSel.value;
  state.cuts = null;
  schedule();
});
gridSel.addEventListener('change', () => {
  state.grid = Number(gridSel.value);
  schedule();
});
toneInput.addEventListener('input', () => {
  state.tone = Number(toneInput.value);
  toneValue.textContent = state.tone.toFixed(2);
  if (state.ladderKey === DMC8_KEY) state.cuts = null;
  schedule();
});
ditherSel.addEventListener('change', () => {
  state.dither = ditherSel.value as ToneDither;
  schedule();
});
serpentineInput.addEventListener('change', () => {
  state.serpentine = serpentineInput.checked;
  schedule();
});
rampShapeSel.addEventListener('change', () => {
  state.rampShape = rampShapeSel.value === 'hist' ? 'hist' : 'strip';
  drawRamp();
});

fillSelectors();
renderCurveInputs();
drawCurve();
void recompute();
