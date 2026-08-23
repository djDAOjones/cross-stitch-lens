/**
 * CREATIVE-01 prototype — the contact-sheet page (contact-proto.html).
 *
 * The mechanism under trial (ticket → candidate 4, agreed prototype
 * plan): freeze the current still at open, render N labelled variants
 * off the live path, a pick adopts. Axis 1 is the seven shipped
 * dither presets (`DITHER_PRESETS`, owner-signed labels D159) through
 * the real pipeline — resize included, because exports re-run the
 * pipeline and the sheet is priced like an export, not a preview.
 *
 * The page trials the three open questions:
 * - modal vs inline panel (one sheet builder, two homes),
 * - the render budget (variants render sequentially with a rAF yield
 *   between each; per-variant ms under every label, total in the
 *   header — the live preview is never blocked more than one variant),
 * - cell size at 400 px (cells-per-row control + a 400 px shell frame).
 *
 * PROTOTYPE on branch creative-01-proto: never merged as production
 * source; the signed build re-derives from the ticket.
 */

import { buildDistribution, selectPalette } from './core/palette-selection.ts';
import type { PermittedSet } from './core/palette-policy.ts';
import {
  buildStages,
  type DitherConfig,
  type PipelineConfig,
} from './core/pipeline/config.ts';
import { DITHER_PRESETS, matchBuiltInDither } from './core/pipeline/dither-presets.ts';
import { runPipeline } from './core/pipeline/index.ts';
import { resizeStage } from './core/pipeline/resize.ts';
import { loadCatalogue } from './core/thread-catalogue.ts';
import {
  ADJUST_PRESET_CANDIDATES,
  applyAdjustProto,
  adjustProtoIsIdentity,
  type AdjustPresetCandidate,
} from './core/tone/adjust-proto.ts';
import type { Palette, PixelBuffer } from './core/types.ts';
import { sampleBuffer, SAMPLE_NAME } from './ui/sample.ts';

// ---------------------------------------------------------------------
// DOM plumbing
// ---------------------------------------------------------------------

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`missing #${id}`);
  return el as unknown as T;
}

const appEl = must<HTMLDivElement>('app');
const sourceSel = must<HTMLSelectElement>('source');
const paletteSel = must<HTMLSelectElement>('palette');
const gridSel = must<HTMLSelectElement>('grid');
const openBtn = must<HTMLButtonElement>('open-sheet');
const axisSel = must<HTMLSelectElement>('axis');
const presentSel = must<HTMLSelectElement>('present');
const perRowSel = must<HTMLSelectElement>('perrow');
const frame400Input = must<HTMLInputElement>('frame400');
const statusEl = must<HTMLDivElement>('status');
const beforeCanvas = must<HTMLCanvasElement>('before');
const currentCanvas = must<HTMLCanvasElement>('current');
const currentCaption = must<HTMLElement>('current-caption');
const panelHost = must<HTMLDivElement>('panel-host');
const sheetDialog = must<HTMLDialogElement>('sheet-dialog');

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  return ctx;
}

function paintBuffer(canvas: HTMLCanvasElement, buffer: PixelBuffer): void {
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  canvas.style.aspectRatio = `${String(buffer.width)} / ${String(buffer.height)}`;
  ctx2d(canvas).putImageData(
    new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height),
    0,
    0,
  );
}

// ---------------------------------------------------------------------
// Sources (the D147 slots, as in tone-proto)
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
// Palette — the production default-policy world (DMC, count-limited)
// ---------------------------------------------------------------------

const catalogue = loadCatalogue();
const dmcThreads = catalogue.threads.filter(
  (t) => t.brandId === 'dmc' && t.status === 'current',
);

function selectionPalette(gridBuffer: PixelBuffer, limit: number): Palette {
  const permitted: PermittedSet = {
    eligible: dmcThreads,
    locks: [],
    preferred: new Set<string>(),
    unresolved: [],
    conflicts: [],
    ok: true,
  };
  const distribution = buildDistribution(gridBuffer);
  return selectPalette(permitted, limit, distribution, `DMC ${String(limit)}`).palette;
}

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

const NO_ADJUST = ADJUST_PRESET_CANDIDATES[0];
if (NO_ADJUST === undefined) throw new Error('no adjustment candidates');

interface State {
  sourceKey: string;
  limit: number;
  grid: number;
  dither: DitherConfig;
  adjust: AdjustPresetCandidate;
}

const state: State = {
  sourceKey: 'sample',
  limit: 8,
  grid: 300,
  dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
  adjust: NO_ADJUST,
};

let renderToken = 0;

function configFor(palette: Palette, dither: DitherConfig): PipelineConfig {
  return {
    preset: 'resize-first',
    grid: { width: state.grid, height: state.grid },
    resizeMode: 'contain',
    palette,
    metric: 'lab',
    dither,
  };
}

async function refresh(): Promise<void> {
  const token = ++renderToken;
  try {
    const source = await loadSource(state.sourceKey);
    if (token !== renderToken) return;
    // Adjust before resize (§7), and the selection reads the adjusted
    // picture (the ticket's slice-2 engine note).
    const adjusted = applyAdjustProto(source, state.adjust.params);
    const gridBuffer = resizeStage.backends.ts(adjusted, {
      width: state.grid,
      height: state.grid,
      mode: 'contain',
    });
    const palette = selectionPalette(gridBuffer, state.limit);
    const output = runPipeline(adjusted, buildStages(configFor(palette, state.dither)));
    paintBuffer(beforeCanvas, gridBuffer);
    paintBuffer(currentCanvas, output);
    const preset = matchBuiltInDither(state.dither);
    const label =
      DITHER_PRESETS.find((p) => `builtin:${p.id}` === preset)?.label ?? 'unnamed dither';
    const adjustNote = adjustProtoIsIdentity(state.adjust.params)
      ? ''
      : `, ${state.adjust.label}`;
    currentCaption.textContent =
      `current render — ${label}${adjustNote}, ${String(palette.entries.length)} colours`;
    statusEl.textContent = 'Ready.';
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  }
}

// ---------------------------------------------------------------------
// The sheet — one builder, two homes (modal / panel)
// ---------------------------------------------------------------------

/**
 * Yield until the next frame — or 50 ms, whichever comes first. The
 * timeout half is not cosmetic: an occluded window suspends
 * requestAnimationFrame entirely, and a sheet that renders nothing
 * while its window is covered is a broken instrument. (Found live:
 * the render loop parked forever behind a hidden pane.)
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(finish);
    window.setTimeout(finish, 50);
  });
}

interface SheetHome {
  root: HTMLElement;
  close: () => void;
}

function sheetHome(): SheetHome {
  if (presentSel.value === 'panel') {
    panelHost.innerHTML = '';
    return {
      root: panelHost,
      close: () => {
        panelHost.innerHTML = '';
      },
    };
  }
  sheetDialog.innerHTML = '';
  sheetDialog.showModal();
  return {
    root: sheetDialog,
    close: () => {
      sheetDialog.close();
      sheetDialog.innerHTML = '';
    },
  };
}

async function openSheet(): Promise<void> {
  const token = ++renderToken;
  const source = await loadSource(state.sourceKey);
  if (token !== renderToken) return;
  // The freeze: the still — and, on the dither axis, the current
  // adjustment and its palette — are fixed at open; nothing the live
  // controls do after this changes what the sheet renders.
  const still = source;
  const axis = axisSel.value === 'adjust' ? 'adjust' : 'dither';
  const gridFor = (buffer: PixelBuffer): PixelBuffer =>
    resizeStage.backends.ts(buffer, {
      width: state.grid,
      height: state.grid,
      mode: 'contain',
    });

  interface SheetVariant {
    label: string;
    render: () => PixelBuffer;
    adopt: () => void;
  }

  let variants: SheetVariant[];
  let axisNote: string;
  if (axis === 'dither') {
    const adjusted = applyAdjustProto(still, state.adjust.params);
    const palette = selectionPalette(gridFor(adjusted), state.limit);
    axisNote = `dither, ${String(palette.entries.length)} colours frozen`;
    variants = DITHER_PRESETS.map((preset) => ({
      label: preset.label,
      render: () => runPipeline(adjusted, buildStages(configFor(palette, preset.config))),
      adopt: () => {
        state.dither = { ...preset.config };
      },
    }));
  } else {
    // Each adjustment re-selects its palette: the selection source is
    // the adjusted picture (the ticket's slice-2 engine note), and
    // showing anything else would hide the presets' main effect.
    axisNote = 'adjustments, palette re-selected per cell';
    variants = ADJUST_PRESET_CANDIDATES.map((cand) => ({
      label: cand.label,
      render: () => {
        const adjusted = applyAdjustProto(still, cand.params);
        const palette = selectionPalette(gridFor(adjusted), state.limit);
        return runPipeline(adjusted, buildStages(configFor(palette, state.dither)));
      },
      adopt: () => {
        state.adjust = cand;
      },
    }));
  }

  const home = sheetHome();
  const head = document.createElement('div');
  head.className = 'sheet-head';
  const title = document.createElement('strong');
  title.textContent = `Contact sheet — ${axisNote}`;
  const totalEl = document.createElement('span');
  totalEl.className = 'cell-ms';
  totalEl.textContent = 'rendering…';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    home.close();
  });
  head.append(title, totalEl, closeBtn);
  home.root.append(head);

  const sheetGrid = document.createElement('div');
  sheetGrid.className = 'sheet-grid';
  sheetGrid.style.gridTemplateColumns = `repeat(${perRowSel.value}, 1fr)`;
  home.root.append(sheetGrid);

  const cellFor = (variant: SheetVariant): { cell: HTMLButtonElement; canvas: HTMLCanvasElement; ms: HTMLElement } => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'sheet-cell';
    cell.setAttribute('aria-label', `adopt ${variant.label}`);
    const canvas = document.createElement('canvas');
    const label = document.createElement('div');
    label.className = 'cell-label';
    label.textContent = variant.label;
    const ms = document.createElement('div');
    ms.className = 'cell-ms';
    ms.textContent = '…';
    cell.append(canvas, label, ms);
    cell.addEventListener('click', () => {
      variant.adopt();
      if (presentSel.value === 'modal') home.close();
      // After the re-render, or the refresh's "Ready." eats the
      // sentence — STATUS-01's mechanism in miniature.
      void refresh().then(() => {
        statusEl.textContent = `Adopted: ${variant.label}.`;
      });
    });
    return { cell, canvas, ms };
  };

  const cells = variants.map((variant) => {
    const made = cellFor(variant);
    sheetGrid.append(made.cell);
    return { variant, ...made };
  });

  // Off the live path: one variant per frame, a rAF yield between.
  const sheetToken = renderToken;
  let total = 0;
  for (const { variant, canvas, ms } of cells) {
    await nextFrame();
    if (sheetToken !== renderToken || !home.root.isConnected) return;
    if (presentSel.value === 'modal' && !sheetDialog.open) return;
    const t0 = performance.now();
    const output = variant.render();
    const elapsed = performance.now() - t0;
    total += elapsed;
    paintBuffer(canvas, output);
    ms.textContent = `${elapsed.toFixed(0)} ms`;
  }
  totalEl.textContent = `${variants.length.toString()} variants in ${total.toFixed(0)} ms`;
}

// ---------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------

for (const [value, label] of [
  ['sample', SAMPLE_NAME] as const,
  ...PHOTO_SLOTS.map((s) => [s.file, s.label] as const),
]) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  sourceSel.append(option);
}

sourceSel.addEventListener('change', () => {
  state.sourceKey = sourceSel.value;
  void refresh();
});
paletteSel.addEventListener('change', () => {
  state.limit = Number(paletteSel.value);
  void refresh();
});
gridSel.addEventListener('change', () => {
  state.grid = Number(gridSel.value);
  void refresh();
});
openBtn.addEventListener('click', () => {
  void openSheet();
});
frame400Input.addEventListener('change', () => {
  appEl.classList.toggle('frame-400', frame400Input.checked);
});

void refresh();
