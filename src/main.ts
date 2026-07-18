/**
 * App entry point — M2 shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline, and
 * view it on the worker-rendered preview surface with zoom, pan and
 * fit-to-window. Control panels and the info panel arrive with the
 * remaining M2 items.
 */

import { installGlobalCapture, log } from './diagnostics/log.ts';
import type { PipelineConfig } from './core/pipeline/config.ts';
import { loadDmcPalette } from './core/palette.ts';
import { computeStats } from './core/stats.ts';
import { decodeImageBlob, imageFiles } from './ui/import.ts';
import { PreviewController } from './ui/preview.ts';
import { PipelineClient } from './worker/client.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from './worker/grid.ts';

installGlobalCapture(window);
log.info('boot', `Cross Stitch Lens ${__APP_VERSION__} (${__BUILD_ID__})`);

/** Fixed demo config until the M2 control panels land (D17). */
const DEMO_CONFIG: PipelineConfig = {
  preset: 'resize-first',
  grid: { width: 200, height: 200 },
  resizeMode: 'contain',
  palette: loadDmcPalette(),
  metric: 'lab',
  dither: true,
  serpentine: true,
};

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

  // Preview: toolbar (zoom in/out, fit, zoom readout) + the
  // keyboard-operable canvas host. The canvas itself is worker-owned.
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

  const caption = document.createElement('p');
  caption.className = 'meta';
  caption.id = 'design-stats';

  const client = new PipelineClient();
  client.attachCanvas(canvas);
  const preview = new PreviewController(client, host, zoomLabel);

  // Grid overlay: style state lives here (CSS px); thicknesses and
  // the tick font are scaled to device px at send time so the worker
  // stays DPR-blind, matching the view-transform contract. The tick
  // numbering uses the page's computed text colour so it stays
  // legible in both schemes (the worker is theme-blind). Interim
  // show/hide toggle — the full Carbon grid panel is a separate M2
  // item.
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
  const gridToggle = toolbarButton('Grid', () => {
    gridStyle.show = !gridStyle.show;
    gridToggle.setAttribute('aria-pressed', String(gridStyle.show));
    sendGridStyle();
  });
  gridToggle.setAttribute('aria-pressed', String(gridStyle.show));
  sendGridStyle();

  toolbar.append(
    toolbarButton('Zoom in', () => preview.zoomCentred(1.25)),
    toolbarButton('Zoom out', () => preview.zoomCentred(1 / 1.25)),
    toolbarButton('Fit', () => preview.fit()),
    gridToggle,
    zoomLabel,
  );
  previewSection.append(toolbar, host, caption);
  app.replaceChildren(heading, version, importSection, status, previewSection);
  preview.initSurface();

  client.setOnResult((frame) => {
    previewSection.hidden = false;
    preview.onFrame(frame.buffer.width, frame.buffer.height);
    const total = frame.timings.reduce((sum, t) => sum + t.ms, 0);
    const stats = computeStats(frame.buffer, DEMO_CONFIG.palette ?? undefined);
    caption.textContent =
      `${String(stats.width)} × ${String(stats.height)} · ` +
      `${String(stats.stitchCount)} stitches (${String(stats.emptyCount)} empty) · ` +
      `${String(stats.colorCount)} DMC colours · dithered`;
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
      client.submit(buffer, DEMO_CONFIG);
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
