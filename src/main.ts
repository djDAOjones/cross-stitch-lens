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
  constrainRect,
  fullAspectRect,
  hitTest,
  moveRect,
  oppositeAnchor,
  resizeRect,
  type Anchor,
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
import { fullRgbVariant, type PipelineConfig } from './core/pipeline/config.ts';
import {
  defaultPolicy,
  type PaletteConflict,
  type PalettePolicy,
  type PolicyInputs,
} from './core/palette-policy.ts';
import { findPreset, resolvePreset } from './core/palette-presets.ts';
import { resolveProjectPalette } from './core/palette-resolve.ts';
import { loadCatalogue } from './core/thread-catalogue.ts';
import {
  parseProject,
  projectFilename,
  SCHEMA_VERSION,
  serializeProject,
  type ProjectFile,
} from './core/project.ts';
import { computeStats } from './core/stats.ts';
import type { PixelBuffer, Thread } from './core/types.ts';
import {
  mergeOwned,
  parseInventory,
  serializeInventory,
  serializePalettes,
  type LibraryPalette,
} from './library/records.ts';
import { openLibrary, MemoryStore, type LibraryStore } from './library/store.ts';
import {
  createPalettePanel,
  moveEntry,
  type PalettePanelState,
} from './ui/palette-panel.ts';
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
import { loadPreferences, savePreferences, type ShellPreferences } from './ui/preferences.ts';
import { PreviewController } from './ui/preview.ts';
import {
  captureSummary,
  defaultScales,
  MAX_PATTERN_SIDE,
  MIN_PATTERN_SIDE,
  patternSummary,
  SCALE_LABELS,
  withCapture,
  withExport,
  withPattern,
  withPreview,
  type PatternResolution,
} from './ui/scales.ts';
import {
  defaultShellState,
  FOCUS_ENTER_LABEL,
  FOCUS_EXIT_LABEL,
  panelToggleLabel,
  visibility,
  type ShellState,
} from './ui/shell.ts';
import {
  statusLine,
  type CaptureState,
  type SourceFreshness,
} from './ui/status-line.ts';
import { PipelineClient } from './worker/client.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from './worker/grid.ts';

installGlobalCapture(window);
log.info('boot', `Cross Stitch Lens ${__APP_VERSION__} (${__BUILD_ID__})`);

const CATALOGUE = loadCatalogue();
/** Brand id → display name, for thread labels in stats and exports. */
const BRAND_NAMES = new Map(CATALOGUE.brands.map((b) => [b.id, b.name]));

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

  // The four resolutions (M6 terminology contract, src/ui/scales.ts):
  // pattern in stitches, capture in source px, preview in CSS px per
  // stitch, export in output px per stitch. This model owns pattern,
  // preview, and export; `config.grid` below is *derived* from
  // `scales.pattern`, and `scales.capture` mirrors the crop rect.
  let scales = defaultScales();

  // Shell presentation state (panel collapsed / preview focus) — one
  // model for both, so they cannot fight over what is hidden.
  let shell: ShellState = defaultShellState();
  const preferenceStore = (() => {
    try {
      return window.localStorage;
    } catch {
      return null; // storage blocked — preferences simply aren't kept
    }
  })();
  let preferences: ShellPreferences = loadPreferences(preferenceStore);
  shell = { ...shell, panelCollapsed: preferences.panelCollapsed };

  // Current pipeline config: controls mutate it and reprocess the
  // retained master image. Grid-style changes bypass this — they are
  // view-only worker messages, no pipeline run.
  const config: PipelineConfig = {
    preset: 'resize-first',
    grid: {
      width: scales.pattern.widthStitches,
      height: scales.pattern.heightStitches,
    },
    resizeMode: 'contain',
    // Filled by the first `resolvePalette()` below; null is full-RGB.
    palette: null,
    metric: 'lab',
    dither: true,
    serpentine: true,
  };
  let masterImage: PixelBuffer | null = null;

  // --- M7 palette policy state -------------------------------------
  // `policy` is intent; `config.palette` is the resolved result. They
  // are kept separate because every M7 feature (brands, inventory,
  // presets, counts, locks) edits intent, and exactly one function —
  // `resolvePalette` — turns intent into the ordered palette the
  // pipeline runs against.
  let policy: PalettePolicy = defaultPolicy();
  let paletteMode = true;
  let paletteConflicts: PaletteConflict[] = [];
  let eligibleCount = 0;
  let owned = new Set<string>();
  let libraryPalettes: LibraryPalette[] = [];
  /** Last palette deleted this session — the undo route's only copy. */
  let deletedPalette: LibraryPalette | null = null;
  let library: LibraryStore = new MemoryStore();
  /**
   * The resized, **un-reduced** grid buffer that colour-count selection
   * chooses against.
   *
   * It must not be the pipeline's output: selecting from an already
   * reduced image feeds the selector its own previous answer, so a
   * design narrowed to 12 colours can never be widened back to 30 —
   * the distribution only contains the 12 it already picked. This is
   * the full-RGB twin of the current config, run once per source or
   * geometry change through the export route (which bypasses the
   * preview and its coalescing), never per frame.
   */
  let selectionSource: PixelBuffer | null = null;
  /** Geometry `selectionSource` was produced for; '' when there is none. */
  let selectionGeometry = '';
  let selectionPending = false;
  /**
   * Distinct colours the last frame actually used. Declared here, with
   * the palette state it belongs to, because the Colour panel reports
   * "selected vs used" and is built long before the capture block that
   * also reads it.
   */
  let lastColorCount: number | null = null;

  /** Error → message, for status text and log data. */
  function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Assemble the resolver's inputs from the current library state. */
  function policyInputs(): PolicyInputs {
    const inputs: PolicyInputs = { catalogue: CATALOGUE, owned };
    // Bound to a const first: `policy` is mutable, so a narrowing on
    // `policy.source` does not survive into the callbacks below.
    const source = policy.source;
    if (source.kind === 'library') {
      const found = libraryPalettes.find((p) => p.id === source.paletteId);
      if (found !== undefined) {
        inputs.libraryPalette = { name: found.name, threadIds: found.threadIds };
      }
    } else if (source.kind === 'preset') {
      const preset = findPreset(source.presetId);
      if (preset !== undefined) {
        inputs.preset = resolvePreset(preset, CATALOGUE, policy.brands, source.mode);
      }
    }
    return inputs;
  }

  /**
   * Resolve the policy into `config.palette`.
   *
   * The last processed output feeds count-limited selection, which is
   * why this is called again after each frame: the first frame has no
   * distribution to select against, so a count limit resolves to the
   * full permitted set and narrows on the next pass. That is a visible
   * two-step, not a silently violated limit — the palette shown and the
   * palette used are always the same one.
   */
  function resolvePalette(): void {
    if (!paletteMode) {
      config.palette = null;
      paletteConflicts = [];
      eligibleCount = 0;
      return;
    }
    const resolved = resolveProjectPalette({
      policy,
      inputs: policyInputs(),
      source: selectionSource ?? undefined,
      name: paletteName(),
    });
    config.palette = resolved.ok ? resolved.palette : null;
    paletteConflicts = resolved.conflicts;
    eligibleCount = resolved.eligibleCount;
  }

  /** Everything the resized full-RGB grid buffer depends on. */
  function selectionGeometryKey(): string {
    return [config.preset, config.grid.width, config.grid.height, config.resizeMode].join(':');
  }

  /** Drop the cached selection source (new artwork, new geometry). */
  function invalidateSelectionSource(): void {
    selectionSource = null;
    selectionGeometry = '';
  }

  /**
   * Ensure the selection source exists and matches the current
   * geometry, then re-resolve and reprocess once it lands.
   *
   * Only fetched when a colour-count limit is actually in force —
   * without one there is nothing to select, so the extra pipeline run
   * would be pure cost. Under live capture it is deliberately NOT
   * refreshed per frame: a palette that churned every frame would make
   * the preview unusable, so the selection holds until the geometry or
   * the policy changes.
   */
  function ensureSelectionSource(): void {
    if (masterImage === null || !paletteMode || policy.count.mode === 'all') return;
    const wanted = selectionGeometryKey();
    if (selectionPending || (selectionSource !== null && selectionGeometry === wanted)) return;
    selectionPending = true;
    const copy: PixelBuffer = {
      width: masterImage.width,
      height: masterImage.height,
      data: new Uint8ClampedArray(masterImage.data),
    };
    client.exportFrame(copy, fullRgbVariant(config)).then(
      (buffer) => {
        selectionPending = false;
        selectionSource = buffer;
        selectionGeometry = wanted;
        resolvePalette();
        palettePanel.update(panelState());
        reprocess();
      },
      (error: unknown) => {
        selectionPending = false;
        log.error('palette', 'could not build the selection source', {
          message: describeError(error),
        });
      },
    );
  }

  /** A display name for the resolved palette, from its source. */
  function paletteName(): string {
    const source = policy.source;
    if (source.kind === 'library') {
      return libraryPalettes.find((p) => p.id === source.paletteId)?.name ?? 'Palette';
    }
    if (source.kind === 'preset') {
      return findPreset(source.presetId)?.name ?? 'Preset';
    }
    return policy.brands.map((id) => BRAND_NAMES.get(id) ?? id).join(' + ') || 'Threads';
  }

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
  zoomLabel.setAttribute('aria-label', SCALE_LABELS.previewScale);
  // Stitch dimensions beside the preview scale, so "how big is the
  // design" and "how big does it look" are never read off one number.
  const dimensionsLabel = document.createElement('span');
  dimensionsLabel.className = 'meta';
  dimensionsLabel.setAttribute('aria-label', 'Pattern dimensions');
  dimensionsLabel.textContent = patternSummary(scales.pattern);
  // Compact status for preview focus: one derived line, shown only in
  // that mode. Polite, not assertive — routine frame updates must not
  // interrupt a screen reader.
  const compactStatus = document.createElement('p');
  compactStatus.className = 'meta compact-status';
  compactStatus.setAttribute('role', 'status');
  compactStatus.hidden = true;
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

  const info = createInfoPanel(document, BRAND_NAMES);

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
  // The controller reports its mode and CSS-px-per-stitch back into the
  // scale model; nothing it reports can run the pipeline.
  const preview = new PreviewController(client, host, zoomLabel, (previewScale) => {
    scales = withPreview(scales, previewScale);
  });

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

  /**
   * Set the pattern resolution — the one change that legitimately
   * alters the output stitch count. It re-aspects the capture frame
   * (M6-CAPRES-01) but chooses no new capture *size*, no preview
   * scale, and no export scale on the user's behalf.
   */
  function applyPattern(pattern: PatternResolution): void {
    scales = withPattern(scales, pattern);
    config.grid = { width: pattern.widthStitches, height: pattern.heightStitches };
    dimensionsLabel.textContent = patternSummary(pattern);
    reframeCrop();
    updateCompactStatus();
    // A new grid is a new geometry, so the buffer the colour-count
    // selection chooses against has to be rebuilt at that size.
    ensureSelectionSource();
    reprocess();
  }

  /**
   * Re-fit the live capture frame to the pattern's aspect, keeping its
   * centre and as much of the selection as the source allows. The
   * region signature includes all four crop fields, so a changed frame
   * already reads as dirty — no gate reset needed.
   */
  function reframeCrop(): void {
    const bounds = captureBounds();
    if (bounds === null || cropRect === null) return;
    cropRect = constrainRect(cropRect, bounds, config.grid, 'center');
    renderCrop();
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

  // Pattern group: the design's own resolution, in stitches. Kept in
  // its own group above Grid because "how many stitches" and "how the
  // grid lines look" are different questions that shared a legend
  // before M6 and invited exactly the confusion M6-SCALE-01 exists to
  // remove.
  const patternGroup = document.createElement('fieldset');
  const patternLegend = document.createElement('legend');
  patternLegend.textContent = 'Pattern';
  patternGroup.append(
    patternLegend,
    numberField(
      document,
      'pattern-width',
      SCALE_LABELS.patternWidth,
      {
        min: MIN_PATTERN_SIDE,
        max: MAX_PATTERN_SIDE,
        value: scales.pattern.widthStitches,
        helper: SCALE_LABELS.patternHelper,
      },
      (value) => {
        applyPattern({ ...scales.pattern, widthStitches: value });
      },
    ),
    numberField(
      document,
      'pattern-height',
      SCALE_LABELS.patternHeight,
      {
        min: MIN_PATTERN_SIDE,
        max: MAX_PATTERN_SIDE,
        value: scales.pattern.heightStitches,
        helper: SCALE_LABELS.patternHeightHelper,
      },
      (value) => {
        applyPattern({ ...scales.pattern, heightStitches: value });
      },
    ),
  );

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

  const ditherToggle = toggleField(document, 'dither-on', 'Dithering', config.dither, (on) => {
    config.dither = on;
    reprocess();
  });

  /** The panel's view of the current policy, library, and resolution. */
  function panelState(): PalettePanelState {
    return {
      policy,
      paletteMode,
      conflicts: paletteConflicts,
      eligibleCount,
      selectedCount: config.palette?.entries.length ?? 0,
      usedCount: lastColorCount,
      awaitingSource: selectionSource === null,
      owned,
      library: libraryPalettes,
      selectedIds: new Set(config.palette?.entries.map((t) => t.id) ?? []),
      libraryPersistent: library.persistent,
      deletedPalette,
    };
  }

  /** Re-resolve, refresh the panel, and run the pipeline once. */
  function applyPolicy(): void {
    ensureSelectionSource();
    resolvePalette();
    // Dithering only applies when reducing to a palette.
    ditherToggle.input.disabled = config.palette === null;
    palettePanel.update(panelState());
    reprocess();
  }

  const palettePanel = createPalettePanel(document, CATALOGUE, panelState(), {
    setPaletteMode: (on) => {
      paletteMode = on;
      applyPolicy();
    },
    setPolicy: (next) => {
      policy = next;
      applyPolicy();
    },
    setOwned: (id, isOwned) => {
      if (isOwned) owned.add(id);
      else owned.delete(id);
      persistOwned();
      applyPolicy();
    },
    setOwnedBulk: (ids, isOwned) => {
      for (const id of ids) {
        if (isOwned) owned.add(id);
        else owned.delete(id);
      }
      persistOwned();
      status.textContent = isOwned
        ? `Marked ${String(ids.length)} thread(s) as owned.`
        : `Removed ${String(ids.length)} thread(s) from your inventory.`;
      applyPolicy();
    },
    savePaletteToLibrary: () => {
      void saveCurrentPalette();
    },
    movePaletteEntry: (paletteId, index, delta) => {
      void editPalette(paletteId, (ids) => moveEntry(ids, index, delta), 'Reordered');
    },
    removePaletteEntry: (paletteId, index) => {
      void editPalette(
        paletteId,
        (ids) => ids.filter((_, i) => i !== index),
        'Removed a thread from',
      );
    },
    deletePalette: (paletteId) => {
      void removePalette(paletteId);
    },
    undoDeletePalette: () => {
      void restoreDeletedPalette();
    },
    exportInventory: () => {
      downloadBlob(
        document,
        new Blob([serializeInventory(owned, 'thread-list')], {
          type: 'application/json',
        }),
        'thread-inventory.json',
      );
      status.textContent = `Exported ${String(owned.size)} owned threads.`;
    },
    importInventory: () => {
      inventoryInput.click();
    },
    exportPalettes: () => {
      downloadBlob(
        document,
        new Blob([serializePalettes(libraryPalettes)], { type: 'application/json' }),
        'thread-palettes.json',
      );
      status.textContent = `Exported ${String(libraryPalettes.length)} saved palettes.`;
    },
  });
  const colourGroup = palettePanel.element;
  // Resolve once up front so the panel opens showing a real palette
  // rather than an empty one that only fills in after the library
  // loads asynchronously.
  applyPolicy();

  // Inventory import is a file input rather than a bare button so the
  // native picker (and its keyboard route) does the work; it is merged
  // into the existing inventory, never replacing it — replace can lose
  // threads marked on another machine and needs its own confirmation
  // (M7-INV-01).
  const inventoryInput = document.createElement('input');
  inventoryInput.type = 'file';
  inventoryInput.accept = 'application/json,.json';
  inventoryInput.hidden = true;
  inventoryInput.addEventListener('change', () => {
    const file = inventoryInput.files?.[0];
    inventoryInput.value = '';
    if (file !== undefined) void importInventoryFile(file);
  });

  async function importInventoryFile(file: File): Promise<void> {
    try {
      const parsed = parseInventory(await file.text());
      const before = owned.size;
      owned = mergeOwned(owned, parsed.owned);
      await library.saveOwned(owned);
      const unknown = parsed.owned.filter((id) => !CATALOGUE.byId.has(id)).length;
      // Unknown references are kept, not dropped: they may be threads
      // a later catalogue restores, and deleting a user's record of
      // what they own is not ours to do.
      status.textContent =
        `Imported ${String(owned.size - before)} new owned threads (${String(parsed.owned.length)} in the file)` +
        (unknown > 0
          ? `. ${String(unknown)} are not in this build's catalogue and are kept but unusable.`
          : '.');
      applyPolicy();
    } catch (error) {
      const message = describeError(error);
      status.textContent = `Could not read that inventory file (${message}).`;
      log.error('library', 'inventory import failed', { message });
    }
  }

  /** Write the inventory back to the library, reporting any failure. */
  function persistOwned(): void {
    void library.saveOwned(owned).catch((error: unknown) => {
      log.error('library', 'inventory save failed', { message: describeError(error) });
      status.textContent = 'Could not save your inventory to browser storage.';
    });
  }

  /**
   * Apply an edit to a saved palette's ordered thread ids.
   *
   * Every edit commits once and bumps `revision`, which is what lets a
   * reopened project detect that the library palette it named has moved
   * on (D55). The live design changes immediately — the policy resolves
   * against the library record, and order is the nearest-match
   * tie-break (D46) — while projects already saved keep their own
   * snapshot until explicitly refreshed.
   */
  async function editPalette(
    paletteId: string,
    edit: (ids: string[]) => string[],
    verb: string,
  ): Promise<void> {
    const existing = libraryPalettes.find((p) => p.id === paletteId);
    if (existing === undefined) return;
    const next: LibraryPalette = {
      ...existing,
      revision: existing.revision + 1,
      threadIds: edit([...existing.threadIds]),
    };
    if (next.threadIds.length === 0) {
      status.textContent =
        'A palette needs at least one thread — remove the palette itself if you no longer want it.';
      return;
    }
    try {
      await library.putPalette(next);
      libraryPalettes = await library.listPalettes();
      status.textContent = `${verb} "${next.name}" (revision ${String(next.revision)}).`;
      applyPolicy();
    } catch (error) {
      const message = describeError(error);
      status.textContent = `Could not save that palette change (${message}).`;
      log.error('library', 'palette edit failed', { message });
    }
  }

  /**
   * Delete a saved palette, keeping it in memory for an undo.
   *
   * No confirmation dialog: the undo is the recovery route
   * (UI-STANDARDS → destructive actions need confirmation *or* reliable
   * undo), and it is the honest one here because deletion cannot damage
   * a saved project at all — those carry their own snapshot (D55).
   */
  async function removePalette(paletteId: string): Promise<void> {
    const existing = libraryPalettes.find((p) => p.id === paletteId);
    if (existing === undefined) return;
    try {
      await library.deletePalette(paletteId);
      libraryPalettes = await library.listPalettes();
      deletedPalette = existing;
      // Fall back to the whole enabled-brand set rather than leaving the
      // policy pointing at a palette that no longer exists.
      if (policy.source.kind === 'library' && policy.source.paletteId === paletteId) {
        policy = { ...policy, source: { kind: 'brands' } };
      }
      status.textContent = `Deleted "${existing.name}". Saved projects that used it are unaffected — you can undo this until you reload.`;
      applyPolicy();
    } catch (error) {
      const message = describeError(error);
      status.textContent = `Could not delete that palette (${message}).`;
      log.error('library', 'palette delete failed', { message });
    }
  }

  /** Put the last deleted palette back, exactly as it was. */
  async function restoreDeletedPalette(): Promise<void> {
    const restoring = deletedPalette;
    if (restoring === null) return;
    try {
      await library.putPalette(restoring);
      libraryPalettes = await library.listPalettes();
      deletedPalette = null;
      policy = { ...policy, source: { kind: 'library', paletteId: restoring.id } };
      status.textContent = `Restored "${restoring.name}".`;
      applyPolicy();
    } catch (error) {
      const message = describeError(error);
      status.textContent = `Could not restore that palette (${message}).`;
      log.error('library', 'palette restore failed', { message });
    }
  }

  /** Freeze the resolved palette as a new named library palette. */
  async function saveCurrentPalette(): Promise<void> {
    const entries = config.palette?.entries ?? [];
    if (entries.length === 0) {
      status.textContent = 'There is no resolved palette to save yet.';
      return;
    }
    const name = window.prompt('Name for this palette', paletteName());
    if (name === null || name.trim() === '') return;
    const palette: LibraryPalette = {
      id: `pal-${String(Date.now())}`,
      name: name.trim(),
      revision: 1,
      createdFrom: sourceProvenance(),
      threadIds: entries.map((t) => t.id),
    };
    try {
      await library.putPalette(palette);
      libraryPalettes = await library.listPalettes();
      // Switch to the saved palette so what is on screen is what was
      // saved — copying then silently staying on the preset is the
      // kind of divergence M7-PRESET-01 calls out.
      policy = { ...policy, source: { kind: 'library', paletteId: palette.id } };
      status.textContent = `Saved palette "${palette.name}" (${String(entries.length)} threads).`;
      applyPolicy();
    } catch (error) {
      const message = describeError(error);
      status.textContent = `Could not save that palette (${message}).`;
      log.error('library', 'palette save failed', { message });
    }
  }

  /** Where a saved palette came from, recorded on the library record. */
  function sourceProvenance(): string {
    if (policy.source.kind === 'preset') return `preset:${policy.source.presetId}`;
    if (policy.source.kind === 'library') return `copy:${policy.source.paletteId}`;
    return policy.ownedOnly ? 'inventory' : 'brands';
  }

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
  // Export *scale* lives in the scale model (it is one of the four);
  // background and colour are export preferences, not resolutions, and
  // stay here.
  const exportState = {
    background: 'transparent',
    color: '#ffffff',
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
      SCALE_LABELS.exportScale,
      {
        min: 1,
        max: 64,
        value: scales.export.cleanPxPerStitch,
        helper: SCALE_LABELS.exportHelper,
      },
      (value) => {
        scales = withExport(scales, { ...scales.export, cleanPxPerStitch: value });
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
      SCALE_LABELS.chartCell,
      {
        min: 4,
        max: 40,
        value: scales.export.chartCellPx,
        helper: SCALE_LABELS.chartHelper,
      },
      (value) => {
        scales = withExport(scales, { ...scales.export, chartCellPx: value });
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
    const wanted = scales.export.cleanPxPerStitch;
    const scale = Math.min(wanted, maxScaleFor(config.grid.width, config.grid.height));
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
        scale < wanted
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
    const wantedCell = scales.export.chartCellPx;
    const cell = Math.min(
      wantedCell,
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
        cell < wantedCell
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
              ...(c.thread === undefined
                ? {}
                : {
                    brand: BRAND_NAMES.get(c.thread.brandId) ?? c.thread.brandId,
                    reference: c.thread.reference,
                  }),
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

  /** Snapshot the live UI state as a schema-v2 project file. */
  function currentProject(): ProjectFile {
    return {
      schemaVersion: SCHEMA_VERSION,
      pipeline: {
        preset: config.preset,
        grid: { width: config.grid.width, height: config.grid.height },
        resizeMode: config.resizeMode,
        metric: config.metric,
        dither: config.dither,
        serpentine: config.serpentine,
      },
      // Intent *and* the exact threads that rendered it: reopening
      // must reproduce this design even if the library palette it came
      // from is later edited or deleted (M7-PAL-01).
      palette: paletteMode
        ? { policy, snapshot: config.palette?.entries ?? [] }
        : null,
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
      // Preview scale is project data from v2 (M6-VIEW-01): screen
      // size only, and asked of the controller so a live zoom is not
      // saved one action out of date.
      preview: preview.scale(),
      export: {
        scale: scales.export.cleanPxPerStitch,
        background: exportState.background === 'solid' ? 'solid' : 'transparent',
        color: exportState.color,
        chartCell: scales.export.chartCellPx,
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
    setFieldValue('pattern-width', String(scales.pattern.widthStitches));
    setFieldValue('pattern-height', String(scales.pattern.heightStitches));
    setFieldValue('order-preset', config.preset);
    setFieldValue('colour-mode', paletteMode ? 'threads' : 'rgb');
    setToggleValue('dither-on', config.dither);
    ditherToggle.input.disabled = config.palette === null;
    palettePanel.update(panelState());
    setToggleValue('grid-show', gridStyle.show);
    setToggleValue('grid-ticks', gridStyle.ticks);
    setFieldValue('grid-minor', String(gridStyle.minorInterval));
    setFieldValue('grid-major', String(gridStyle.majorInterval));
    setFieldValue('grid-color', gridStyle.color);
    setFieldValue('grid-minor-thickness', String(gridStyle.minorThickness));
    setFieldValue('grid-major-thickness', String(gridStyle.majorThickness));
    setFieldValue('export-scale', String(scales.export.cleanPxPerStitch));
    setFieldValue('export-background', exportState.background);
    setFieldValue('export-bg-color', exportState.color);
    setFieldValue('chart-cell', String(scales.export.chartCellPx));
    setFieldValue('pdf-page', pdfOptions.pageSize);
    setFieldValue('pdf-orientation', pdfOptions.orientation);
    setFieldValue('pdf-margin', String(pdfOptions.marginMm));
    setFieldValue('pdf-title', pdfOptions.title);
  }

  /**
   * Restore a loaded project's palette.
   *
   * The **snapshot wins**: a project reopens rendering exactly the
   * threads it was saved with, even if the library palette it names
   * has since been edited or deleted, and even if the catalogue has
   * moved on. The policy is restored alongside it as intent, so the
   * panel still shows what was asked for and a later edit recomputes
   * from there — but nothing is silently substituted by name
   * (M7-PAL-01, M7-INV-01).
   */
  function applyLoadedPalette(loaded: ProjectFile['palette']): void {
    if (loaded === null) {
      paletteMode = false;
      policy = defaultPolicy();
      config.palette = null;
      paletteConflicts = [];
      return;
    }
    paletteMode = true;
    policy = loaded.policy;
    if (loaded.snapshot.length > 0) {
      config.palette = { name: paletteName(), entries: loaded.snapshot };
      eligibleCount = loaded.snapshot.length;
      paletteConflicts = driftConflicts(loaded.snapshot);
    } else {
      // A migrated v2 file carries no snapshot — there was nothing to
      // save. Resolving from the policy is the only option, and it is
      // exactly what the v2 file meant.
      resolvePalette();
    }
  }

  /**
   * Compare a loaded snapshot against the current catalogue and
   * library, and say so. Library drift is reported, never repaired:
   * the user decides whether to refresh.
   */
  function driftConflicts(snapshot: readonly Thread[]): PaletteConflict[] {
    const missing = snapshot.filter((t) => !CATALOGUE.byId.has(t.id));
    if (missing.length === 0) return [];
    return [
      {
        kind: 'unresolved-entries',
        severity: 'warning',
        ids: missing.map((t) => t.id),
        message: `${String(missing.length)} thread(s) saved with this project are not in this build's catalogue. The project is rendering from its saved copy of them, so the design is unchanged.`,
      },
    ];
  }

  async function loadProject(fileBlob: File): Promise<void> {
    try {
      const file = parseProject(await fileBlob.text());
      config.preset = file.pipeline.preset;
      config.grid = { ...file.pipeline.grid };
      config.resizeMode = file.pipeline.resizeMode;
      applyLoadedPalette(file.palette);
      config.metric = file.pipeline.metric;
      config.dither = file.pipeline.dither;
      config.serpentine = file.pipeline.serpentine;
      Object.assign(gridStyle, file.gridStyle);
      scales = withPattern(scales, {
        widthStitches: file.pipeline.grid.width,
        heightStitches: file.pipeline.grid.height,
      });
      scales = withExport(scales, {
        cleanPxPerStitch: file.export.scale,
        chartCellPx: file.export.chartCell,
      });
      scales = withPreview(scales, file.preview);
      exportState.background = file.export.background;
      exportState.color = file.export.color;
      pdfOptions.pageSize = file.export.pdf.pageSize;
      pdfOptions.orientation = file.export.pdf.orientation;
      pdfOptions.marginMm = file.export.pdf.marginMm;
      pdfOptions.title = file.export.pdf.title;
      syncControls();
      sendGridStyle();
      dimensionsLabel.textContent = patternSummary(scales.pattern);
      // A loaded pattern re-aspects the live capture frame the same way
      // an edited one does — the load must not leave a stale ratio.
      reframeCrop();
      preview.setScale(file.preview);
      updateCompactStatus();
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

  controls.id = 'controls-panel';
  controls.append(
    patternGroup,
    gridGroup,
    colourGroup,
    inventoryInput,
    ditherGroup,
    pipelineGroup,
    exportGroup,
    projectGroup,
  );

  // Open the cross-project library (inventory + saved palettes). It is
  // async, so the app starts on an empty in-memory store and adopts
  // the persisted one when it arrives — the alternative is blocking
  // first paint on IndexedDB, which can be slow or refused entirely.
  void (async () => {
    library = await openLibrary(
      typeof indexedDB === 'undefined' ? undefined : indexedDB,
    );
    owned = await library.loadOwned();
    libraryPalettes = await library.listPalettes();
    log.info('library', 'opened', {
      persistent: library.persistent,
      owned: owned.size,
      palettes: libraryPalettes.length,
    });
    applyPolicy();
  })().catch((error: unknown) => {
    log.error('library', 'could not be opened', { message: describeError(error) });
  });

  // Shell bar: the two presentation-mode controls, on a permanent
  // surface at the top of the app. The collapse button lives *outside*
  // the region it collapses (otherwise it hides with it), and the exit
  // route from preview focus is always in this same place —
  // UI-STANDARDS → "User control and freedom": never trap a mode.
  const shellBar = document.createElement('div');
  shellBar.className = 'toolbar shell-bar';
  const panelToggle = document.createElement('button');
  panelToggle.type = 'button';
  panelToggle.id = 'panel-toggle';
  panelToggle.setAttribute('aria-controls', 'controls-panel');
  const focusToggle = document.createElement('button');
  focusToggle.type = 'button';
  focusToggle.id = 'focus-toggle';
  shellBar.append(panelToggle, focusToggle);

  /**
   * Push the shell state onto the DOM. One function, one source of
   * truth: every `hidden` in the shell is written here and nowhere
   * else, so "collapsed" and "preview focus" cannot leave a region in
   * a state neither of them intended.
   */
  function applyShell(): void {
    const show = visibility(shell);
    // Move focus out before hiding its container, or the page loses
    // the focus position entirely (WCAG 2.4.3).
    if (!show.controls && controls.contains(document.activeElement)) panelToggle.focus();
    if (!show.source && importSection.contains(document.activeElement)) focusToggle.focus();
    controls.hidden = !show.controls;
    importSection.hidden = !show.source;
    info.element.hidden = !show.info;
    if (debugPanel !== null) debugPanel.element.hidden = !show.debug;
    if (diagnostics !== null) diagnostics.element.hidden = !show.debug;
    status.hidden = !show.status;
    compactStatus.hidden = !show.compactStatus;
    panelToggle.hidden = !show.panelToggle;
    panelToggle.textContent = panelToggleLabel(shell.panelCollapsed);
    panelToggle.setAttribute('aria-expanded', String(!shell.panelCollapsed));
    focusToggle.textContent = shell.previewFocus ? FOCUS_EXIT_LABEL : FOCUS_ENTER_LABEL;
    focusToggle.setAttribute('aria-pressed', String(shell.previewFocus));
    document.body.classList.toggle('preview-focus', shell.previewFocus);
    document.body.classList.toggle('panel-collapsed', shell.panelCollapsed);
    if (show.compactStatus) updateCompactStatus();
  }

  /**
   * Enter or leave preview focus. Presentation only: it changes no
   * pipeline config, no capture quality, no project data, and is not
   * the M4 draft-quality state — the pump keeps running throughout.
   */
  function setPreviewFocus(on: boolean): void {
    if (shell.previewFocus === on) return;
    shell = { ...shell, previewFocus: on };
    applyShell();
    // The preview host is the thing the mode is about, so it takes
    // focus on entry; on exit, focus returns to the control that did it.
    if (on) host.focus();
    else focusToggle.focus();
    log.info('shell', on ? 'preview focus entered' : 'preview focus exited');
  }

  panelToggle.addEventListener('click', () => {
    shell = { ...shell, panelCollapsed: !shell.panelCollapsed };
    preferences = { ...preferences, panelCollapsed: shell.panelCollapsed };
    savePreferences(preferenceStore, preferences);
    applyShell();
    status.textContent = shell.panelCollapsed
      ? 'Settings hidden — the preview has the space.'
      : 'Settings shown.';
    log.info('shell', shell.panelCollapsed ? 'settings collapsed' : 'settings expanded');
  });
  focusToggle.addEventListener('click', () => {
    setPreviewFocus(!shell.previewFocus);
  });
  // Escape is a convenience, never the only exit route.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.previewFocus) {
      event.preventDefault();
      setPreviewFocus(false);
    }
  });

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

  // View controls. "Fit" *is* reset view — fit-to-space, centred,
  // automatic refitting back on — so there is one control for one
  // behaviour rather than two names for it (UI-STANDARDS →
  // "Consistency": no synonyms). The `0` key does the same.
  toolbar.append(
    toolbarButton('Zoom in', () => preview.zoomCentred(1.25)),
    toolbarButton('Zoom out', () => preview.zoomCentred(1 / 1.25)),
    toolbarButton('Fit', () => preview.resetView()),
    toolbarButton('Fit width', () => preview.fit('width')),
    toolbarButton('Fit height', () => preview.fit('height')),
    compareToggle,
    splitWrap,
    zoomLabel,
    dimensionsLabel,
  );
  previewSection.append(toolbar, host, compactStatus, info.element);
  if (debugPanel !== null) previewSection.append(debugPanel.element);
  if (diagnostics !== null) previewSection.append(diagnostics.element);

  // Preview first in the DOM at every width (M6-NARROW-01). The
  // settings panel sits to its right when there is room, so the
  // reading order, the visual order, and the tab order agree — rather
  // than being reordered by CSS into disagreement.
  const content = document.createElement('div');
  content.className = 'content';
  content.append(previewSection, status, importSection);
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  layout.append(content, controls);
  const header = document.createElement('header');
  header.className = 'app-header';
  header.append(heading, version, shellBar);
  app.replaceChildren(header, layout);
  applyShell();
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
    lastColorCount = stats.colorCount;
    lastFreshness = 'changing';
    palettePanel.update(panelState());
    updateCompactStatus();
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
      invalidateSelectionSource();
      ensureSelectionSource();
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

  // Compact-status inputs, owned here rather than read back out of
  // rendered DOM strings — a status line assembled from several
  // rendered surfaces goes stale silently, and in preview focus it is
  // the only thing reporting whether capture is still running.
  let sessionEnded = false;
  let lastFreshness: SourceFreshness = 'changing';

  function captureState(): CaptureState {
    if (capture === null) return sessionEnded ? 'ended' : 'off';
    return capturePaused ? 'paused' : 'live';
  }

  /** Refresh the compact line from owned state (preview focus only). */
  function updateCompactStatus(): void {
    if (!shell.previewFocus) return;
    compactStatus.textContent = statusLine({
      pattern: scales.pattern,
      paletteName: config.palette?.name ?? null,
      colorCount: lastColorCount,
      capture: captureState(),
      freshness: lastFreshness,
      draft: draftMode,
    });
  }

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
    updateCompactStatus();
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
    // `capture` is a projection of the crop, not a second owner of it.
    // The readout can name the pattern directly rather than deriving a
    // stitch span, because the aspect lock guarantees they agree.
    scales = withCapture(scales, { widthPx: cropRect.width, heightPx: cropRect.height });
    cropReadout.textContent = captureSummary(scales);
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
    sessionEnded = true;
    updateCompactStatus();
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
      invalidateSelectionSource();
      ensureSelectionSource();
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
      const skippedBefore = dirtyGate.skippedCount;
      if (!dirtyGate.shouldProcess(signature, Date.now())) {
        if (status.textContent !== 'Source unchanged.') {
          status.textContent = 'Source unchanged.';
        }
        // Two skips in a row means the forced refresh is what will
        // break the tie next — say so rather than repeat "unchanged".
        lastFreshness =
          dirtyGate.skippedCount > skippedBefore + 1 ? 'refresh-pending' : 'unchanged';
        updateCompactStatus();
        if (pumpGate.grabDone()) void pumpGrab();
        return;
      }
      const buffer = await capture.grabFrame(cropRect ?? undefined);
      masterImage = buffer;
      // Seeds the palette from the first live frame, then holds: a
      // palette rebuilt every frame would make the preview churn.
      ensureSelectionSource();
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
      sessionEnded = false;
      // Largest region with the pattern's aspect, centred — the source
      // rarely shares the design's proportions, so a full-frame default
      // would start the session outside the lock.
      cropRect = fullAspectRect(
        { width: session.video.videoWidth, height: session.video.videoHeight },
        config.grid,
      );
      renderCrop();
      // Source dimensions can change mid-session (e.g. the shared
      // window is resized): re-fit the region rather than let it point
      // off-frame, keeping the aspect on the way.
      session.video.addEventListener('resize', () => {
        const bounds = captureBounds();
        if (bounds === null || cropRect === null) return;
        cropRect = constrainRect(cropRect, bounds, config.grid, 'center');
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
    updateCompactStatus();
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

  /**
   * The corner a freshly drawn rectangle pivots about: wherever the
   * drag began. Without this a draw would re-aspect about its centre
   * and slide out from under the pointer.
   */
  function drawAnchor(startX: number, startY: number, x: number, y: number): Anchor {
    return `${y >= startY ? 'n' : 's'}${x >= startX ? 'w' : 'e'}` as Anchor;
  }

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
    // A move changes no dimension, so it needs no re-aspecting; every
    // route that *can* change one ends in constrainRect.
    if (cropDrag.mode === 'inside') {
      cropRect = moveRect(cropDrag.startRect, dx, dy, bounds);
    } else if (cropDrag.mode === 'draw') {
      cropRect = constrainRect(
        {
          x: Math.min(cropDrag.startX, point.x),
          y: Math.min(cropDrag.startY, point.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
        },
        bounds,
        config.grid,
        drawAnchor(cropDrag.startX, cropDrag.startY, point.x, point.y),
      );
    } else {
      cropRect = constrainRect(
        resizeRect(cropDrag.startRect, cropDrag.mode, dx, dy, bounds),
        bounds,
        config.grid,
        oppositeAnchor(cropDrag.mode),
      );
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
      ? constrainRect(
          resizeRect(cropRect, 'se', move[0], move[1], bounds),
          bounds,
          config.grid,
          'nw',
        )
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
