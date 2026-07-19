/**
 * App entry point — M2 shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline, and
 * view it on the worker-rendered preview surface with zoom, pan,
 * fit, grid overlay, split compare, a live stats panel, and a
 * Carbon-style side panel of pipeline controls (UI-STANDARDS →
 * "Layout model").
 */

import { installGlobalCapture, log } from './diagnostics/log.ts';
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
  const captureMeta = document.createElement('p');
  captureMeta.className = 'meta';
  captureMeta.hidden = true;
  captureRow.append(captureButton, captureFrameButton, stopCaptureButton);
  importSection.append(label, input, hint, captureRow, captureMeta);

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
    exportButton.disabled = false;
    chartButton.disabled = false;
    pdfButton.disabled = false;
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

  // Capture session state: one live session at most; ending it (from
  // the app or the browser's own stop-sharing UI) restores the idle
  // controls and says so — never a silent state change.
  let capture: CaptureSession | null = null;

  function endCaptureUi(message: string): void {
    capture = null;
    captureButton.hidden = false;
    captureFrameButton.hidden = true;
    stopCaptureButton.hidden = true;
    captureMeta.hidden = true;
    status.textContent = message;
  }

  async function grabCaptureFrame(): Promise<void> {
    if (capture === null) return;
    status.textContent = 'Processing…';
    try {
      const buffer = await capture.grabFrame();
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

  async function startScreenCapture(): Promise<void> {
    status.textContent = 'Requesting screen capture…';
    captureButton.disabled = true;
    try {
      const session = await startCapture();
      capture = session;
      captureButton.hidden = true;
      captureFrameButton.hidden = false;
      stopCaptureButton.hidden = false;
      captureMeta.hidden = false;
      captureMeta.textContent = `Capturing ${session.label}.`;
      session.onEnded(() => {
        if (capture !== session) return;
        endCaptureUi('Screen capture ended (sharing was stopped).');
        log.info('capture', 'session ended externally');
      });
      log.info('capture', 'session started', { label: session.label });
      await grabCaptureFrame();
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
