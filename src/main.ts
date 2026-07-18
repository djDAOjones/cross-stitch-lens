/**
 * App entry point — M2 shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline, and
 * view it on the worker-rendered preview surface with zoom, pan,
 * fit, grid overlay, split compare, a live stats panel, and a
 * Carbon-style side panel of pipeline controls (UI-STANDARDS →
 * "Layout model").
 */

import { installGlobalCapture, log } from './diagnostics/log.ts';
import type { PipelineConfig } from './core/pipeline/config.ts';
import { loadDmcPalette } from './core/palette.ts';
import { computeStats } from './core/stats.ts';
import type { PixelBuffer } from './core/types.ts';
import {
  colorField,
  numberField,
  selectField,
  toggleField,
} from './ui/controls.ts';
import { decodeImageBlob, imageFiles } from './ui/import.ts';
import { createInfoPanel } from './ui/info-panel.ts';
import { PreviewController } from './ui/preview.ts';
import { PipelineClient } from './worker/client.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from './worker/grid.ts';

installGlobalCapture(window);
log.info('boot', `Cross Stitch Lens ${__APP_VERSION__} (${__BUILD_ID__})`);

const DMC = loadDmcPalette();

function toolbarButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function build(app: HTMLElement): void {
  const heading = document.createElement('h1');
  heading.textContent = 'Cross Stitch Lens';

  const version = document.createElement('p');
  version.className = 'meta';
  version.textContent = `${__APP_VERSION__} · build ${__BUILD_ID__}`;

  // Current pipeline config: controls mutate it and reprocess the
  // retained master image. Grid-style changes bypass this — they are
  // view-only worker messages, no pipeline run.
  const config: PipelineConfig = {
    preset: 'resize-first',
    grid: { width: 200, height: 200 },
    resizeMode: 'contain',
    palette: DMC,
    metric: 'lab',
    dither: true,
    serpentine: true,
  };
  let masterImage: PixelBuffer | null = null;

  // Import controls: labelled native file input; drop and paste are
  // alternatives to it, never the only route (UI-STANDARDS).
  const importSection = document.createElement('section');
  const label = document.createElement('label');
  label.textContent = 'Source image';
  label.htmlFor = 'source-file';
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'source-file';
  input.accept = 'image/*';
  const hint = document.createElement('p');
  hint.className = 'meta';
  hint.textContent =
    'Choose a file, drag and drop one anywhere on the page, or paste an image.';
  importSection.append(label, input, hint);

  // Status is text in an aria-live region — never colour-only, never
  // silent (UI-STANDARDS → "System status").
  const status = document.createElement('p');
  status.id = 'status';
  status.setAttribute('role', 'status');
  status.textContent = 'No image yet — the preview appears here after import.';

  // Preview: toolbar (zoom, fit, compare) + the keyboard-operable
  // canvas host. The canvas itself is worker-owned.
  const previewSection = document.createElement('section');
  previewSection.hidden = true;
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'meta';
  zoomLabel.setAttribute('aria-label', 'Zoom level');
  const host = document.createElement('div');
  host.className = 'preview-host';
  host.tabIndex = 0;
  host.setAttribute('role', 'img');
  host.setAttribute(
    'aria-label',
    'Cross-stitch preview. Zoom with plus and minus, fit with zero, pan with arrow keys.',
  );
  const canvas = document.createElement('canvas');
  host.append(canvas);

  const info = createInfoPanel(document);

  const client = new PipelineClient();
  client.attachCanvas(canvas);
  const preview = new PreviewController(client, host, zoomLabel);

  function reprocess(): void {
    if (masterImage === null) return;
    status.textContent = 'Processing…';
    client.submit(
      {
        width: masterImage.width,
        height: masterImage.height,
        data: new Uint8ClampedArray(masterImage.data),
      },
      config,
    );
  }

  // Grid overlay: style state lives here (CSS px); thicknesses and
  // the tick font are scaled to device px at send time so the worker
  // stays DPR-blind, matching the view-transform contract. The tick
  // numbering uses the page's computed text colour so it stays
  // legible in both schemes (the worker is theme-blind).
  const gridStyle: GridStyle = { ...DEFAULT_GRID_STYLE };
  function sendGridStyle(): void {
    const dpr = window.devicePixelRatio;
    client.setGridStyle({
      ...gridStyle,
      minorThickness: gridStyle.minorThickness * dpr,
      majorThickness: gridStyle.majorThickness * dpr,
      tickFontPx: Math.round(gridStyle.tickFontPx * dpr),
      tickColor: getComputedStyle(document.body).color,
    });
  }
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', sendGridStyle);
  sendGridStyle();

  // Control panel: Grid / Colour / Dither / Pipeline groups
  // (UI-STANDARDS layout model). Controls apply immediately — no
  // Apply buttons (§5.4).
  const controls = document.createElement('aside');
  controls.className = 'controls';
  controls.setAttribute('aria-label', 'Controls');

  const gridGroup = document.createElement('fieldset');
  const gridLegend = document.createElement('legend');
  gridLegend.textContent = 'Grid';
  const gridShow = toggleField(document, 'grid-show', 'Show grid', gridStyle.show, (on) => {
    gridStyle.show = on;
    sendGridStyle();
  });
  const gridTicks = toggleField(
    document,
    'grid-ticks',
    'Row and column numbers',
    gridStyle.ticks,
    (on) => {
      gridStyle.ticks = on;
      sendGridStyle();
    },
  );
  gridGroup.append(
    gridLegend,
    gridShow.element,
    gridTicks.element,
    numberField(
      document,
      'grid-minor',
      'Minor interval',
      { min: 1, max: 50, value: gridStyle.minorInterval },
      (value) => {
        gridStyle.minorInterval = value;
        sendGridStyle();
      },
    ),
    numberField(
      document,
      'grid-major',
      'Major interval',
      { min: 0, max: 100, value: gridStyle.majorInterval, helper: '0 hides major lines' },
      (value) => {
        gridStyle.majorInterval = value;
        sendGridStyle();
      },
    ),
    colorField(document, 'grid-color', 'Line colour', gridStyle.color, (value) => {
      gridStyle.color = value;
      sendGridStyle();
    }),
    numberField(
      document,
      'grid-minor-thickness',
      'Minor thickness',
      { min: 1, max: 4, value: gridStyle.minorThickness },
      (value) => {
        gridStyle.minorThickness = value;
        sendGridStyle();
      },
    ),
    numberField(
      document,
      'grid-major-thickness',
      'Major thickness',
      { min: 1, max: 6, value: gridStyle.majorThickness },
      (value) => {
        gridStyle.majorThickness = value;
        sendGridStyle();
      },
    ),
  );

  const colourGroup = document.createElement('fieldset');
  const colourLegend = document.createElement('legend');
  colourLegend.textContent = 'Colour';
  const ditherToggle = toggleField(document, 'dither-on', 'Dithering', config.dither, (on) => {
    config.dither = on;
    reprocess();
  });
  colourGroup.append(
    colourLegend,
    selectField(
      document,
      'colour-mode',
      'Colour mode',
      [
        ['dmc', 'DMC palette'],
        ['rgb', 'Full RGB'],
      ],
      'dmc',
      (mode) => {
        config.palette = mode === 'dmc' ? DMC : null;
        // Dithering only applies when reducing to a palette.
        ditherToggle.input.disabled = mode === 'rgb';
        reprocess();
      },
    ),
  );

  const ditherGroup = document.createElement('fieldset');
  const ditherLegend = document.createElement('legend');
  ditherLegend.textContent = 'Dither';
  ditherGroup.append(ditherLegend, ditherToggle.element);

  const pipelineGroup = document.createElement('fieldset');
  const pipelineLegend = document.createElement('legend');
  pipelineLegend.textContent = 'Pipeline';
  pipelineGroup.append(
    pipelineLegend,
    selectField(
      document,
      'order-preset',
      'Order preset',
      [
        ['resize-first', 'Resize first'],
        ['reduce-first', 'Reduce first'],
      ],
      config.preset,
      (preset) => {
        config.preset = preset as PipelineConfig['preset'];
        reprocess();
      },
    ),
  );

  controls.append(gridGroup, colourGroup, ditherGroup, pipelineGroup);

  // Split compare (§10): source (full-RGB resize) left of the
  // divider, reduced output right. Native range slider = keyboard
  // and pointer operable for free; shown only while comparing.
  let compareOn = false;
  const splitWrap = document.createElement('span');
  splitWrap.className = 'split-control';
  splitWrap.hidden = true;
  const splitLabel = document.createElement('label');
  splitLabel.textContent = 'Split';
  splitLabel.htmlFor = 'split-position';
  const splitRange = document.createElement('input');
  splitRange.type = 'range';
  splitRange.id = 'split-position';
  splitRange.min = '0';
  splitRange.max = '100';
  splitRange.value = '50';
  splitRange.addEventListener('input', () => {
    client.setCompare(compareOn, Number(splitRange.value) / 100);
  });
  splitWrap.append(splitLabel, splitRange);
  const compareToggle = toolbarButton('Compare', () => {
    compareOn = !compareOn;
    compareToggle.setAttribute('aria-pressed', String(compareOn));
    splitWrap.hidden = !compareOn;
    client.setCompare(compareOn, Number(splitRange.value) / 100);
  });
  compareToggle.setAttribute('aria-pressed', 'false');

  toolbar.append(
    toolbarButton('Zoom in', () => preview.zoomCentred(1.25)),
    toolbarButton('Zoom out', () => preview.zoomCentred(1 / 1.25)),
    toolbarButton('Fit', () => preview.fit()),
    compareToggle,
    splitWrap,
    zoomLabel,
  );
  previewSection.append(toolbar, host, info.element);

  const content = document.createElement('div');
  content.className = 'content';
  content.append(importSection, status, previewSection);
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  layout.append(controls, content);
  app.replaceChildren(heading, version, layout);
  preview.initSurface();

  client.setOnResult((frame) => {
    previewSection.hidden = false;
    preview.onFrame(frame.buffer.width, frame.buffer.height);
    const total = frame.timings.reduce((sum, t) => sum + t.ms, 0);
    const stats = computeStats(frame.buffer, config.palette ?? undefined);
    info.update(stats);
    status.textContent = 'Preview updated.';
    log.info('pipeline', 'frame processed', {
      timings: frame.timings,
      totalMs: Math.round(total * 100) / 100,
      colours: stats.colorCount,
    });
  });

  async function importBlob(blob: Blob, source: string): Promise<void> {
    status.textContent = 'Processing…';
    try {
      const buffer = await decodeImageBlob(blob);
      log.info('import', `image from ${source}`, {
        width: buffer.width,
        height: buffer.height,
      });
      masterImage = buffer;
      reprocess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Could not read that image (${message}). Try a PNG or JPEG.`;
      log.error('import', 'decode failed', { source, message });
    }
  }

  input.addEventListener('change', () => {
    const file = imageFiles(input.files ?? []).at(0);
    if (file) void importBlob(file, 'file picker');
  });

  window.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = imageFiles(event.dataTransfer?.files ?? []).at(0);
    if (file) void importBlob(file, 'drop');
    else status.textContent = 'That drop had no image file.';
  });
  window.addEventListener('paste', (event) => {
    const file = imageFiles(event.clipboardData?.files ?? []).at(0);
    if (file) void importBlob(file, 'paste');
  });
}

const app = document.getElementById('app');
if (app === null) {
  log.error('boot', 'missing #app mount point');
} else {
  build(app);
}
