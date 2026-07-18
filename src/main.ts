/**
 * App entry point — the M1 dev shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline at a
 * fixed demo config, and render the dithered result 1:1. The M2
 * milestone replaces this with the Carbon panel layout and the real
 * preview; the import plumbing and worker wiring carry forward.
 */

import { installGlobalCapture, log } from './diagnostics/log.ts';
import type { PipelineConfig } from './core/pipeline/config.ts';
import { loadDmcPalette } from './core/palette.ts';
import { decodeImageBlob, imageFiles } from './ui/import.ts';
import { renderPixelBuffer } from './ui/render.ts';
import { PipelineClient } from './worker/client.ts';

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

  const figure = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.className = 'preview';
  const caption = document.createElement('figcaption');
  caption.className = 'meta';
  figure.append(canvas, caption);
  figure.hidden = true;

  app.replaceChildren(heading, version, importSection, status, figure);

  const client = new PipelineClient();
  client.setOnResult((frame) => {
    renderPixelBuffer(canvas, frame.buffer);
    canvas.setAttribute(
      'aria-label',
      `Dithered cross-stitch preview, ${String(frame.buffer.width)} by ${String(frame.buffer.height)} stitches`,
    );
    figure.hidden = false;
    const total = frame.timings.reduce((sum, t) => sum + t.ms, 0);
    caption.textContent = `${String(frame.buffer.width)} × ${String(frame.buffer.height)} stitches · DMC palette · dithered`;
    status.textContent = 'Preview updated.';
    log.info('pipeline', 'frame processed', {
      timings: frame.timings,
      totalMs: Math.round(total * 100) / 100,
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
