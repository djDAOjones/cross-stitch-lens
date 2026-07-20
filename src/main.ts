/**
 * App entry point — M2 shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline, and
 * view it on the worker-rendered preview surface with zoom, pan,
 * fit, grid overlay, split compare, a live stats panel, and a
 * Carbon-style side panel of pipeline controls (UI-STANDARDS →
 * "Layout model").
 */

import {
  buildDiagnosticsBundle,
  formatDiagnosticsBundle,
} from './diagnostics/bundle.ts';
import { installGlobalCapture, log, recentLogs } from './diagnostics/log.ts';
import {
  clampRect,
  fullRect,
  hitTest,
  moveRect,
  resizeRect,
  stitchSpan,
  type CropRect,
  type Handle,
} from './capture/crop.ts';
import { DirtyGate, frameSignature, hashPixels, sampleVideo } from './capture/dirty.ts';
import { DraftGovernor } from './capture/draft.ts';
import { PumpGate, startFramePump } from './capture/pump.ts';
import {
  captureErrorMessage,
  startCapture,
  type CaptureSession,
} from './capture/session.ts';
import type { PipelineConfig } from './core/pipeline/config.ts';
import { loadDmcPalette } from './core/palette.ts';
import {
  parseProject,
  projectFilename,
  SCHEMA_VERSION,
  serializeProject,
  type ProjectFile,
} from './core/project.ts';
import { computeStats } from './core/stats.ts';
import type { PixelBuffer } from './core/types.ts';
import {
  colorField,
  numberField,
  selectField,
  textField,
  toggleField,
} from './ui/controls.ts';
import { chartFilename, chartLayout, encodeChartPng, maxCellPx } from './export/chart.ts';
import {
  buildChartPdf,
  pdfFilename,
  type KeyEntry,
  type PdfOptions,
} from './export/pdf.ts';
import {
  downloadBlob,
  encodePngBlob,
  flattenBackground,
  maxScaleFor,
  pngFilename,
  scaleNearest,
} from './export/png.ts';
import { createDebugPanel } from './ui/debug-panel.ts';
import { createDiagnosticsControl } from './ui/diagnostics-button.ts';
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

  // Screen capture (§3, M4): a live getDisplayMedia session as an
  // alternative source. The permission prompt is user-initiated —
  // button only, never on load (UI-STANDARDS → "Capture UX").
  const captureRow = document.createElement('div');
  captureRow.className = 'toolbar';
  const captureButton = document.createElement('button');
  captureButton.type = 'button';
  captureButton.textContent = 'Start screen capture';
  const captureFrameButton = document.createElement('button');
  captureFrameButton.type = 'button';
  captureFrameButton.textContent = 'Capture frame';
  captureFrameButton.hidden = true;
  const stopCaptureButton = document.createElement('button');
  stopCaptureButton.type = 'button';
  stopCaptureButton.textContent = 'Stop capture';
  stopCaptureButton.hidden = true;
  const lockButton = document.createElement('button');
  lockButton.type = 'button';
  lockButton.textContent = 'Lock region';
  lockButton.setAttribute('aria-pressed', 'false');
  lockButton.hidden = true;
  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.textContent = 'Pause capture';
  pauseButton.setAttribute('aria-pressed', 'false');
  pauseButton.hidden = true;
  // Draft state is a visible, persistent label — never colour-only,
  // never silent (UI-STANDARDS: draft preview must be labelled so
  // exports are never mistaken for it).
  const draftBadge = document.createElement('p');
  draftBadge.className = 'meta';
  draftBadge.textContent = 'Draft quality — dithering off while the pipeline catches up.';
  draftBadge.hidden = true;
  const captureMeta = document.createElement('p');
  captureMeta.className = 'meta';
  captureMeta.hidden = true;

  // Live thumbnail + crop region (§3): the session's own video with
  // a keyboard-operable overlay. Geometry lives in capture/crop.ts;
  // this block only converts pointer CSS px ↔ source px and renders.
  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'capture-thumb';
  thumbWrap.hidden = true;
  const cropOverlay = document.createElement('div');
  cropOverlay.className = 'crop-overlay';
  cropOverlay.tabIndex = 0;
  cropOverlay.setAttribute('role', 'application');
  cropOverlay.setAttribute(
    'aria-label',
    'Capture region. Drag to draw or move it. Move with arrow keys, resize with shift and arrow keys.',
  );
  const cropRectEl = document.createElement('div');
  cropRectEl.className = 'crop-rect';
  for (const h of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const handleEl = document.createElement('div');
    handleEl.className = `crop-handle crop-${h}`;
    cropRectEl.append(handleEl);
  }
  cropOverlay.append(cropRectEl);
  thumbWrap.append(cropOverlay);
  const cropReadout = document.createElement('p');
  cropReadout.className = 'meta';
  cropReadout.hidden = true;
  captureRow.append(captureButton, captureFrameButton, pauseButton, lockButton, stopCaptureButton);
  importSection.append(
    label,
    input,
    hint,
    captureRow,
    captureMeta,
    thumbWrap,
    cropReadout,
    draftBadge,
  );

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

  // Profiling panel (M5 harness): dev-only per UI-STANDARDS →
  // "Diagnostics affordance" — never mounted in a production build.
  const debugPanel = import.meta.env.DEV ? createDebugPanel(document) : null;

  /**
   * Backend that last ran each stage, for the diagnostics bundle. Read
   * off the frame timings rather than asked of the router, because what
   * matters in a bug report is what actually ran, not what routing
   * would choose now.
   */
  const activeBackends: Record<string, string> = {};

  // Copy-diagnostics affordance (AGENTS.md → "Self-explaining
  // runtime"). Dev-only: a production bundle needs the explicit opt-in
  // and redaction review in DEV-INFRASTRUCTURE.md → "Maintainer
  // diagnostics", which has not been done.
  const diagnostics = import.meta.env.DEV
    ? createDiagnosticsControl(document, {
        collect: () => {
          const logs = recentLogs();
          const bundle = buildDiagnosticsBundle(
            {
              appVersion: __APP_VERSION__,
              buildId: __BUILD_ID__,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              view: stopPump === null ? 'still' : 'live',
              userAgent: navigator.userAgent,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                dpr: window.devicePixelRatio,
              },
              capabilities: {
                webgpu: 'gpu' in navigator,
                offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
                displayMedia: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
              },
              activeBackends,
              dev: true,
            },
            logs,
          );
          return { text: formatDiagnosticsBundle(bundle), records: bundle.logs.length };
        },
        copy: async (text) => {
          if (typeof navigator.clipboard?.writeText !== 'function') {
            throw new Error('the clipboard API is unavailable in this context');
          }
          await navigator.clipboard.writeText(text);
        },
      })
    : null;

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

  // Export group (§13 MVP subset): clean PNG at an integer scale,
  // transparent or solid background. The button stays disabled until
  // a frame has processed (error prevention: no impossible actions).
  const exportState = {
    scale: 1,
    background: 'transparent',
    color: '#ffffff',
    chartCell: 10,
  };
  const exportGroup = document.createElement('fieldset');
  const exportLegend = document.createElement('legend');
  exportLegend.textContent = 'Export';
  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.textContent = 'Export PNG';
  exportButton.disabled = true;
  exportButton.addEventListener('click', () => {
    void exportPng();
  });
  const chartButton = document.createElement('button');
  chartButton.type = 'button';
  chartButton.textContent = 'Export chart PNG';
  chartButton.disabled = true;
  chartButton.addEventListener('click', () => {
    void exportChart();
  });
  const pdfOptions: PdfOptions = {
    pageSize: 'a4',
    orientation: 'portrait',
    marginMm: 15,
    title: '',
  };
  const pdfButton = document.createElement('button');
  pdfButton.type = 'button';
  pdfButton.textContent = 'Export PDF';
  pdfButton.disabled = true;
  pdfButton.addEventListener('click', () => {
    void exportPdf();
  });
  exportGroup.append(
    exportLegend,
    numberField(
      document,
      'export-scale',
      'Scale',
      { min: 1, max: 64, value: exportState.scale, helper: 'Pixels per stitch' },
      (value) => {
        exportState.scale = value;
      },
    ),
    selectField(
      document,
      'export-background',
      'Background',
      [
        ['transparent', 'Transparent'],
        ['solid', 'Solid colour'],
      ],
      exportState.background,
      (value) => {
        exportState.background = value;
      },
    ),
    colorField(document, 'export-bg-color', 'Background colour', exportState.color, (value) => {
      exportState.color = value;
    }),
    exportButton,
    numberField(
      document,
      'chart-cell',
      'Chart cell size',
      { min: 4, max: 40, value: exportState.chartCell, helper: 'Pixels per stitch in the chart' },
      (value) => {
        exportState.chartCell = value;
      },
    ),
    chartButton,
    selectField(
      document,
      'pdf-page',
      'Page size',
      [
        ['a4', 'A4'],
        ['letter', 'Letter'],
      ],
      pdfOptions.pageSize,
      (value) => {
        pdfOptions.pageSize = value as PdfOptions['pageSize'];
      },
    ),
    selectField(
      document,
      'pdf-orientation',
      'Orientation',
      [
        ['portrait', 'Portrait'],
        ['landscape', 'Landscape'],
      ],
      pdfOptions.orientation,
      (value) => {
        pdfOptions.orientation = value as PdfOptions['orientation'];
      },
    ),
    numberField(
      document,
      'pdf-margin',
      'Page margin',
      { min: 5, max: 40, value: pdfOptions.marginMm, helper: 'Millimetres' },
      (value) => {
        pdfOptions.marginMm = value;
      },
    ),
    textField(document, 'pdf-title', 'Design title', pdfOptions.title, (value) => {
      pdfOptions.title = value;
    }),
    pdfButton,
  );

  async function exportPng(): Promise<void> {
    if (masterImage === null) return;
    // Clamp so the output canvas stays within browser limits; say so
    // in the status when it bites rather than failing silently.
    const scale = Math.min(exportState.scale, maxScaleFor(config.grid.width, config.grid.height));
    status.textContent = 'Exporting…';
    exportButton.disabled = true;
    try {
      const frame = await client.exportFrame(
        {
          width: masterImage.width,
          height: masterImage.height,
          data: new Uint8ClampedArray(masterImage.data),
        },
        config,
      );
      let out = scale > 1 ? scaleNearest(frame, scale) : frame;
      if (exportState.background === 'solid') out = flattenBackground(out, exportState.color);
      const filename = pngFilename(frame.width, frame.height, scale);
      downloadBlob(document, await encodePngBlob(out), filename);
      status.textContent =
        scale < exportState.scale
          ? `Exported ${filename} (scale limited to ${scale}).`
          : `Exported ${filename}.`;
      log.info('export', 'clean png', {
        filename,
        scale,
        background: exportState.background,
        width: out.width,
        height: out.height,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Export failed (${message}). Try again after the preview updates.`;
      log.error('export', 'clean png failed', { message });
    } finally {
      exportButton.disabled = false;
    }
  }

  async function exportChart(): Promise<void> {
    if (masterImage === null) return;
    // Chart furniture follows the on-screen grid settings (CSS-px
    // thicknesses — the chart's own unit; the DPR scaling is a
    // preview concern). Paper/ink colours are fixed in chart.ts.
    const cell = Math.min(
      exportState.chartCell,
      maxCellPx(config.grid.width, config.grid.height, gridStyle),
    );
    status.textContent = 'Exporting…';
    chartButton.disabled = true;
    try {
      const frame = await client.exportFrame(
        {
          width: masterImage.width,
          height: masterImage.height,
          data: new Uint8ClampedArray(masterImage.data),
        },
        config,
      );
      const filename = chartFilename(frame.width, frame.height);
      downloadBlob(document, await encodeChartPng(frame, gridStyle, cell), filename);
      status.textContent =
        cell < exportState.chartCell
          ? `Exported ${filename} (cell size limited to ${cell}).`
          : `Exported ${filename}.`;
      log.info('export', 'chart png', { filename, cell });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Export failed (${message}). Try again after the preview updates.`;
      log.error('export', 'chart png failed', { message });
    } finally {
      chartButton.disabled = false;
    }
  }

  async function exportPdf(): Promise<void> {
    if (masterImage === null) return;
    status.textContent = 'Exporting…';
    pdfButton.disabled = true;
    try {
      const frame = await client.exportFrame(
        {
          width: masterImage.width,
          height: masterImage.height,
          data: new Uint8ClampedArray(masterImage.data),
        },
        config,
      );
      // Chart raster at print resolution: ~2400 px on the long side
      // (≈300 dpi on an A4 content box), inside the canvas clamp.
      const cell = Math.max(
        4,
        Math.min(
          Math.ceil(2400 / Math.max(frame.width, frame.height)),
          40,
          maxCellPx(config.grid.width, config.grid.height, gridStyle),
        ),
      );
      const chartL = chartLayout(frame.width, frame.height, gridStyle, cell);
      const chartBlob = await encodeChartPng(frame, gridStyle, cell);
      const chartPng = new Uint8Array(await chartBlob.arrayBuffer());
      // Thread key: used colours only; full-RGB mode has no key.
      const entries: KeyEntry[] =
        config.palette === null
          ? []
          : computeStats(frame, config.palette).perColor.map((c) => ({
              hex: c.hex,
              rgb: c.rgb,
              ...(c.code === undefined ? {} : { code: c.code }),
            }));
      const bytes = await buildChartPdf(chartPng, chartL.width, chartL.height, entries, {
        ...pdfOptions,
      });
      const filename = pdfFilename(frame.width, frame.height);
      // pdf-lib returns a fresh non-shared buffer; cast for Blob's sake.
      const part = bytes as Uint8Array<ArrayBuffer>;
      downloadBlob(document, new Blob([part], { type: 'application/pdf' }), filename);
      status.textContent = `Exported ${filename}.`;
      log.info('export', 'pdf chart', {
        filename,
        cell,
        page: pdfOptions.pageSize,
        orientation: pdfOptions.orientation,
        keyEntries: entries.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Export failed (${message}).`;
      log.error('export', 'pdf chart failed', { message });
    } finally {
      pdfButton.disabled = false;
    }
  }

  // Project group (§20): save the current settings as a versioned
  // JSON file; load applies a saved file back onto the controls and
  // reprocesses. The source image is not part of the file — loading
  // into an empty session applies on the next import.
  const projectGroup = document.createElement('fieldset');
  const projectLegend = document.createElement('legend');
  projectLegend.textContent = 'Project';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save project';
  saveButton.addEventListener('click', saveProject);
  const projectLabel = document.createElement('label');
  projectLabel.textContent = 'Load project';
  projectLabel.htmlFor = 'project-file';
  const projectInput = document.createElement('input');
  projectInput.type = 'file';
  projectInput.id = 'project-file';
  projectInput.accept = 'application/json,.json';
  projectInput.addEventListener('change', () => {
    const file = projectInput.files?.[0];
    projectInput.value = '';
    if (file !== undefined) void loadProject(file);
  });
  projectGroup.append(projectLegend, saveButton, projectLabel, projectInput);

  /** Snapshot the live UI state as a schema-v1 project file. */
  function currentProject(): ProjectFile {
    return {
      schemaVersion: SCHEMA_VERSION,
      pipeline: {
        preset: config.preset,
        grid: { width: config.grid.width, height: config.grid.height },
        resizeMode: config.resizeMode,
        palette: config.palette === null ? null : config.palette.name,
        metric: config.metric,
        dither: config.dither,
        serpentine: config.serpentine,
      },
      gridStyle: {
        show: gridStyle.show,
        minorInterval: gridStyle.minorInterval,
        majorInterval: gridStyle.majorInterval,
        color: gridStyle.color,
        minorThickness: gridStyle.minorThickness,
        majorThickness: gridStyle.majorThickness,
        ticks: gridStyle.ticks,
        tickFontPx: gridStyle.tickFontPx,
      },
      export: {
        scale: exportState.scale,
        background: exportState.background === 'solid' ? 'solid' : 'transparent',
        color: exportState.color,
        chartCell: exportState.chartCell,
        pdf: {
          pageSize: pdfOptions.pageSize,
          orientation: pdfOptions.orientation,
          marginMm: pdfOptions.marginMm,
          title: pdfOptions.title,
        },
      },
    };
  }

  function saveProject(): void {
    const filename = projectFilename(config.grid.width, config.grid.height);
    downloadBlob(
      document,
      new Blob([serializeProject(currentProject())], { type: 'application/json' }),
      filename,
    );
    status.textContent = `Saved ${filename}.`;
    log.info('project', 'saved', { filename });
  }

  // Push loaded state back into the control DOM. Values are set
  // directly (no synthetic events) so a load causes exactly one
  // reprocess; toggle state text and dependent disabled states are
  // updated by hand for the same reason.
  function setFieldValue(id: string, value: string): void {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = value;
  }
  function setToggleValue(id: string, on: boolean): void {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) return;
    el.checked = on;
    const state = el.nextElementSibling;
    if (state !== null) state.textContent = on ? 'On' : 'Off';
  }
  function syncControls(): void {
    setFieldValue('order-preset', config.preset);
    setFieldValue('colour-mode', config.palette === null ? 'rgb' : 'dmc');
    setToggleValue('dither-on', config.dither);
    ditherToggle.input.disabled = config.palette === null;
    setToggleValue('grid-show', gridStyle.show);
    setToggleValue('grid-ticks', gridStyle.ticks);
    setFieldValue('grid-minor', String(gridStyle.minorInterval));
    setFieldValue('grid-major', String(gridStyle.majorInterval));
    setFieldValue('grid-color', gridStyle.color);
    setFieldValue('grid-minor-thickness', String(gridStyle.minorThickness));
    setFieldValue('grid-major-thickness', String(gridStyle.majorThickness));
    setFieldValue('export-scale', String(exportState.scale));
    setFieldValue('export-background', exportState.background);
    setFieldValue('export-bg-color', exportState.color);
    setFieldValue('chart-cell', String(exportState.chartCell));
    setFieldValue('pdf-page', pdfOptions.pageSize);
    setFieldValue('pdf-orientation', pdfOptions.orientation);
    setFieldValue('pdf-margin', String(pdfOptions.marginMm));
    setFieldValue('pdf-title', pdfOptions.title);
  }

  async function loadProject(fileBlob: File): Promise<void> {
    try {
      const file = parseProject(await fileBlob.text());
      const name = file.pipeline.palette;
      // v1 knows one palette; refuse rather than silently substitute.
      if (name !== null && name !== DMC.name) {
        status.textContent = `Could not load that project (unknown palette "${name}").`;
        log.error('project', 'unknown palette', { name });
        return;
      }
      config.preset = file.pipeline.preset;
      config.grid = { ...file.pipeline.grid };
      config.resizeMode = file.pipeline.resizeMode;
      config.palette = name === null ? null : DMC;
      config.metric = file.pipeline.metric;
      config.dither = file.pipeline.dither;
      config.serpentine = file.pipeline.serpentine;
      Object.assign(gridStyle, file.gridStyle);
      exportState.scale = file.export.scale;
      exportState.background = file.export.background;
      exportState.color = file.export.color;
      exportState.chartCell = file.export.chartCell;
      pdfOptions.pageSize = file.export.pdf.pageSize;
      pdfOptions.orientation = file.export.pdf.orientation;
      pdfOptions.marginMm = file.export.pdf.marginMm;
      pdfOptions.title = file.export.pdf.title;
      syncControls();
      sendGridStyle();
      reprocess();
      status.textContent =
        masterImage === null
          ? `Loaded ${fileBlob.name} — import an image to see it applied.`
          : `Loaded ${fileBlob.name}.`;
      log.info('project', 'loaded', { filename: fileBlob.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Could not load that project (${message}).`;
      log.error('project', 'load failed', { message });
    }
  }

  controls.append(gridGroup, colourGroup, ditherGroup, pipelineGroup, exportGroup, projectGroup);

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
  if (debugPanel !== null) previewSection.append(debugPanel.element);
  if (diagnostics !== null) previewSection.append(diagnostics.element);

  const content = document.createElement('div');
  content.className = 'content';
  content.append(importSection, status, previewSection);
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  layout.append(controls, content);
  app.replaceChildren(heading, version, layout);
  preview.initSurface();

  client.setOnResult((frame) => {
    // Pump continuation: the returned result frees the gate; grab
    // again if a newer video frame arrived meanwhile.
    if (stopPump !== null && pumpGate.grabDone()) void pumpGrab();
    previewSection.hidden = false;
    exportButton.disabled = false;
    chartButton.disabled = false;
    pdfButton.disabled = false;
    preview.onFrame(frame.buffer.width, frame.buffer.height);
    const total = frame.timings.reduce((sum, t) => sum + t.ms, 0);
    // Draft governor: only live-pump frames inform the load signal
    // (a one-off manual reprocess should not flip preview quality).
    if (stopPump !== null) setDraftMode(draftGovernor.sample(total));
    const stats = computeStats(frame.buffer, config.palette ?? undefined);
    info.update(stats);
    debugPanel?.update(frame.timings, client.droppedFrames);
    for (const timing of frame.timings) activeBackends[timing.stage] = timing.backend;
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

  // Capture session state: one live session at most; ending it (from
  // the app or the browser's own stop-sharing UI) restores the idle
  // controls and says so — never a silent state change.
  let capture: CaptureSession | null = null;
  let cropRect: CropRect | null = null;
  let cropLocked = false;
  const pumpGate = new PumpGate();
  let stopPump: (() => void) | null = null;
  const dirtyGate = new DirtyGate();
  let capturePaused = false;
  const draftGovernor = new DraftGovernor();
  let draftMode = false;

  function setDraftMode(on: boolean): void {
    if (draftMode === on) return;
    draftMode = on;
    draftBadge.hidden = !on;
    // Re-signature so the next tick re-processes at the new quality
    // even when the source itself is unchanged.
    dirtyGate.reset();
    status.textContent = on
      ? 'Preview switched to draft quality (dithering off).'
      : 'Full quality restored.';
    log.info('capture', on ? 'draft quality entered' : 'draft quality exited');
  }

  /** Live config: draft drops dithering; exports never use this. */
  function liveConfig(): PipelineConfig {
    if (draftMode && config.palette !== null && config.dither) {
      return { ...config, dither: false };
    }
    return config;
  }

  function captureBounds(): { width: number; height: number } | null {
    if (capture === null || capture.video.videoWidth === 0) return null;
    return { width: capture.video.videoWidth, height: capture.video.videoHeight };
  }

  /** Source px per CSS px of the displayed thumbnail. */
  function cropScale(): number {
    if (capture === null || capture.video.clientWidth === 0) return 1;
    return capture.video.videoWidth / capture.video.clientWidth;
  }

  function renderCrop(): void {
    const bounds = captureBounds();
    if (bounds === null || cropRect === null) return;
    const scale = cropScale();
    cropRectEl.style.left = `${String(cropRect.x / scale)}px`;
    cropRectEl.style.top = `${String(cropRect.y / scale)}px`;
    cropRectEl.style.width = `${String(cropRect.width / scale)}px`;
    cropRectEl.style.height = `${String(cropRect.height / scale)}px`;
    const span = stitchSpan(cropRect, config.grid);
    cropReadout.textContent = `Region ${String(cropRect.width)} × ${String(cropRect.height)} px → ${String(span.width)} × ${String(span.height)} stitches`;
  }

  function stopPumpNow(): void {
    if (stopPump === null) return;
    log.info('capture', 'frame pump stopped', {
      dropped: pumpGate.droppedCount,
      skipped: dirtyGate.skippedCount,
      forced: dirtyGate.forcedCount,
    });
    stopPump();
    stopPump = null;
    pumpGate.reset();
  }

  function startPumpNow(session: CaptureSession): void {
    stopPump = startFramePump(session.video, () => {
      if (pumpGate.frameArrived()) void pumpGrab();
    });
    log.info('capture', 'frame pump started');
  }

  function endCaptureUi(message: string): void {
    stopPumpNow();
    dirtyGate.reset();
    draftGovernor.reset();
    setDraftMode(false);
    capturePaused = false;
    pauseButton.textContent = 'Pause capture';
    pauseButton.setAttribute('aria-pressed', 'false');
    pauseButton.hidden = true;
    capture?.video.remove();
    capture = null;
    cropRect = null;
    captureButton.hidden = false;
    captureFrameButton.hidden = true;
    stopCaptureButton.hidden = true;
    lockButton.hidden = true;
    captureMeta.hidden = true;
    thumbWrap.hidden = true;
    cropReadout.hidden = true;
    status.textContent = message;
  }

  async function grabCaptureFrame(): Promise<void> {
    if (capture === null) return;
    status.textContent = 'Processing…';
    try {
      const buffer = await capture.grabFrame(cropRect ?? undefined);
      // A manual grab always processes, but records the signature so
      // the pump doesn't immediately re-process the same content.
      dirtyGate.markProcessed(
        frameSignature(
          hashPixels(sampleVideo(capture.video, cropRect ?? undefined)),
          cropRect,
        ),
        Date.now(),
      );
      log.info('capture', 'frame grabbed', {
        width: buffer.width,
        height: buffer.height,
      });
      masterImage = buffer;
      reprocess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Could not capture a frame (${message}).`;
      log.error('capture', 'frame grab failed', { message });
    }
  }

  // Live pump grab: quiet (no per-frame status or logging — the ring
  // buffer must not fill with routine ticks). On failure the pump
  // stops but the session stays usable via Capture frame.
  async function pumpGrab(): Promise<void> {
    if (capture === null) {
      pumpGate.reset();
      return;
    }
    try {
      // Dirty check first: a 64×64 sample readback instead of the
      // full frame. Unchanged content (and unchanged region) skips
      // the expensive path entirely — the "idle frames cost ~0 CPU"
      // acceptance leg. The named state is honest, never silent.
      // The gate also forces a refresh once the source has looked
      // unchanged for DIRTY_MAX_STALE_MS, because the downsample can
      // average a small edit away entirely (see dirty.ts).
      const signature = frameSignature(
        hashPixels(sampleVideo(capture.video, cropRect ?? undefined)),
        cropRect,
      );
      if (!dirtyGate.shouldProcess(signature, Date.now())) {
        if (status.textContent !== 'Source unchanged.') {
          status.textContent = 'Source unchanged.';
        }
        if (pumpGate.grabDone()) void pumpGrab();
        return;
      }
      const buffer = await capture.grabFrame(cropRect ?? undefined);
      masterImage = buffer;
      client.submit(
        { width: buffer.width, height: buffer.height, data: new Uint8ClampedArray(buffer.data) },
        liveConfig(),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stopPump?.();
      stopPump = null;
      pumpGate.reset();
      status.textContent = `Live update stopped (${message}). Capture is still running — use Capture frame.`;
      log.error('capture', 'pump grab failed', { message });
    }
  }

  async function startScreenCapture(): Promise<void> {
    status.textContent = 'Requesting screen capture…';
    captureButton.disabled = true;
    try {
      const session = await startCapture();
      capture = session;
      captureButton.hidden = true;
      captureFrameButton.hidden = false;
      stopCaptureButton.hidden = false;
      lockButton.hidden = false;
      pauseButton.hidden = false;
      captureMeta.hidden = false;
      captureMeta.textContent = `Capturing ${session.label}.`;
      // Mount the live thumbnail with the full frame selected; the
      // video keeps its own aspect (width-driven), so overlay maths
      // stays a single linear scale.
      thumbWrap.prepend(session.video);
      thumbWrap.hidden = false;
      cropReadout.hidden = false;
      cropRect = fullRect({ width: session.video.videoWidth, height: session.video.videoHeight });
      renderCrop();
      // Source dimensions can change mid-session (e.g. the shared
      // window is resized): re-clamp the region rather than let it
      // point off-frame.
      session.video.addEventListener('resize', () => {
        const bounds = captureBounds();
        if (bounds === null || cropRect === null) return;
        cropRect = clampRect(cropRect, bounds);
        renderCrop();
      });
      session.onEnded(() => {
        if (capture !== session) return;
        endCaptureUi('Screen capture ended (sharing was stopped).');
        log.info('capture', 'session ended externally');
      });
      log.info('capture', 'session started', { label: session.label });
      await grabCaptureFrame();
      // Live updates: one grab in flight, newest frame wins — the
      // same policy the worker applies to processing.
      startPumpNow(session);
    } catch (error) {
      const message = captureErrorMessage(error);
      status.textContent = message;
      log.warn('capture', 'session not started', { message });
    } finally {
      captureButton.disabled = false;
    }
  }

  captureButton.addEventListener('click', () => {
    void startScreenCapture();
  });
  captureFrameButton.addEventListener('click', () => {
    void grabCaptureFrame();
  });
  stopCaptureButton.addEventListener('click', () => {
    capture?.stop();
    endCaptureUi('Screen capture stopped.');
    log.info('capture', 'session stopped');
  });
  pauseButton.addEventListener('click', () => {
    if (capture === null) return;
    capturePaused = !capturePaused;
    pauseButton.textContent = capturePaused ? 'Resume capture' : 'Pause capture';
    pauseButton.setAttribute('aria-pressed', String(capturePaused));
    if (capturePaused) {
      stopPumpNow();
      draftGovernor.reset();
      setDraftMode(false);
      status.textContent = 'Capture paused — the preview holds the last frame.';
      log.info('capture', 'paused');
    } else {
      startPumpNow(capture);
      status.textContent = 'Capture resumed.';
      log.info('capture', 'resumed');
    }
  });
  lockButton.addEventListener('click', () => {
    cropLocked = !cropLocked;
    lockButton.setAttribute('aria-pressed', String(cropLocked));
    cropOverlay.classList.toggle('locked', cropLocked);
    status.textContent = cropLocked ? 'Capture region locked.' : 'Capture region unlocked.';
  });

  // Pointer interaction: hit-test decides move / resize-by-handle /
  // draw-new; geometry updates go through the pure crop model. A
  // ≈12 CSS px grab tolerance keeps handles usable; full keyboard
  // operation below is the coarse-pointer alternative (UI-STANDARDS).
  let cropDrag: {
    mode: Handle | 'inside' | 'draw';
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null = null;

  function overlayToSource(event: PointerEvent): { x: number; y: number } {
    const box = cropOverlay.getBoundingClientRect();
    const scale = cropScale();
    return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
  }

  cropOverlay.addEventListener('pointerdown', (event) => {
    const bounds = captureBounds();
    if (cropLocked || bounds === null || cropRect === null) return;
    const point = overlayToSource(event);
    const mode = hitTest(cropRect, point.x, point.y, 12 * cropScale());
    cropDrag = {
      mode: mode ?? 'draw',
      startX: point.x,
      startY: point.y,
      startRect:
        mode === null
          ? { x: Math.round(point.x), y: Math.round(point.y), width: 0, height: 0 }
          : cropRect,
    };
    cropOverlay.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  cropOverlay.addEventListener('pointermove', (event) => {
    const bounds = captureBounds();
    if (cropDrag === null || bounds === null) return;
    const point = overlayToSource(event);
    const dx = point.x - cropDrag.startX;
    const dy = point.y - cropDrag.startY;
    if (cropDrag.mode === 'inside') {
      cropRect = moveRect(cropDrag.startRect, dx, dy, bounds);
    } else if (cropDrag.mode === 'draw') {
      cropRect = clampRect(
        {
          x: Math.min(cropDrag.startX, point.x),
          y: Math.min(cropDrag.startY, point.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
        },
        bounds,
      );
    } else {
      cropRect = resizeRect(cropDrag.startRect, cropDrag.mode, dx, dy, bounds);
    }
    renderCrop();
  });
  cropOverlay.addEventListener('pointerup', (event) => {
    if (cropDrag === null) return;
    cropDrag = null;
    cropOverlay.releasePointerCapture(event.pointerId);
    log.debug('capture', 'crop region set', { ...(cropRect ?? {}) });
  });

  // Keyboard: arrows move by 8 source px, shift+arrows resize the
  // right/bottom edges — the non-pointer route required by
  // UI-STANDARDS → "Capture UX".
  cropOverlay.addEventListener('keydown', (event) => {
    const bounds = captureBounds();
    if (cropLocked || bounds === null || cropRect === null) return;
    const step = 8;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (move === undefined) return;
    cropRect = event.shiftKey
      ? resizeRect(cropRect, 'se', move[0], move[1], bounds)
      : moveRect(cropRect, move[0], move[1], bounds);
    renderCrop();
    event.preventDefault();
  });

  window.addEventListener('resize', renderCrop);

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
