/**
 * App entry point — M2 shell: import an image (file picker,
 * drag-drop, or paste), process it through the worker pipeline, and
 * view it on the worker-rendered preview surface with zoom, pan,
 * fit, grid overlay, split compare, a live stats panel, and a
 * Carbon-style side panel of pipeline controls (UI-STANDARDS →
 * "Layout model").
 */

// Stylesheets (M14-IMPL-01): tokens first, then the element layer,
// then shell chrome — import order is the cascade order.
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/shell.css';

import {
  buildDiagnosticsBundle,
  formatDiagnosticsBundle,
} from './diagnostics/bundle.ts';
import { installGlobalCapture, log, recentLogs } from './diagnostics/log.ts';
import {
  clampRect,
  constrainRect,
  deriveClamped,
  deriveGridSize,
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
import { liveBuffer } from './capture/master-image.ts';
import { PumpGate, startFramePump } from './capture/pump.ts';
import {
  captureErrorMessage,
  startCapture,
  type CaptureSession,
} from './capture/session.ts';
import {
  DEFAULT_DITHER,
  fullRgbVariant,
  type DitherConfig,
  type PipelineConfig,
} from './core/pipeline/config.ts';
import {
  builtInProfiles,
  emptyRecipe,
  paletteToProfile,
  type ColorProfileRecipe,
} from './core/color-profile.ts';
import { generateColorMap, userColor } from './core/color-sources.ts';
import type { CountMode, PaletteConflict } from './core/palette-policy.ts';
import { paletteOf } from './core/palette.ts';
import { resolveProfilePalette } from './core/palette-resolve.ts';
import type { ProfileInputs } from './core/color-profile.ts';
import { loadCatalogue } from './core/thread-catalogue.ts';
import { createColourSection, type ColourSectionState } from './ui/colour-section.ts';
import { createBrowseTable } from './ui/browse-table.ts';
import { createProfileEditor } from './ui/profile-editor.ts';
import {
  browseRowsFor,
  browseUniverse,
  createColourKindAdapter,
  entryLabel,
} from './ui/profile-editor-colour.ts';
import { createEditorPreview, fetchSlot } from './ui/profile-editor-preview.ts';
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
  type LibraryPalette,
  type ProfileRecord,
} from './library/records.ts';
import { openLibrary, MemoryStore, type LibraryStore } from './library/store.ts';
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
import { buildKeyEntries } from './export/key-entries.ts';
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
import {
  DITHER_PRESETS,
  matchBuiltInDither,
  sameDither,
} from './core/pipeline/dither-presets.ts';
import { asDitherConfig, createDitherKindAdapter } from './ui/profile-editor-dither.ts';
import { decodeImageBlob, imageFiles } from './ui/import.ts';
import { createInfoPanel } from './ui/info-panel.ts';
import { createSection, type AccordionSection } from './ui/accordion.ts';
import { choicesModal, formModal, textPromptModal } from './ui/modal.ts';
import { SAMPLE_NAME, sampleBuffer } from './ui/sample.ts';
import { loadPreferences, savePreferences, type ShellPreferences } from './ui/preferences.ts';
import { PreviewController } from './ui/preview.ts';
import {
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
import { defaultShellState, visibility, type ShellState } from './ui/shell.ts';
import { PipelineClient } from './worker/client.ts';
import { DEFAULT_GRID_STYLE, type GridStyle } from './worker/grid.ts';

installGlobalCapture(window);
log.info('boot', `Pattern Mapper ${__APP_VERSION__} (${__BUILD_ID__})`);

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
  heading.textContent = 'Pattern Mapper';

  const version = document.createElement('p');
  version.className = 'meta';
  version.textContent = `${__APP_VERSION__} · build ${__BUILD_ID__}`;

  // The four resolutions (M6 terminology contract, src/ui/scales.ts):
  // pattern in stitches, capture in source px, preview in CSS px per
  // stitch, export in output px per stitch. This model owns pattern,
  // preview, and export; `config.grid` below is *derived* from
  // `scales.pattern`, and `scales.capture` mirrors the crop rect.
  let scales = defaultScales();

  // Shell presentation state — since M14-EXT-31/32 just the cold
  // flag; every collapsible region owns its own header instead.
  let shell: ShellState = defaultShellState();
  const preferenceStore = (() => {
    try {
      return window.localStorage;
    } catch {
      return null; // storage blocked — preferences simply aren't kept
    }
  })();
  let preferences: ShellPreferences = loadPreferences(preferenceStore);

  /** Stored disclosure state, falling back to the spec default. */
  function disclosureOpen(id: string, specDefault: boolean): boolean {
    return preferences.disclosures[id] ?? specDefault;
  }

  /** Persist one disclosure's state (accordion section or reveal). */
  function setDisclosure(id: string, open: boolean): void {
    preferences = {
      ...preferences,
      disclosures: { ...preferences.disclosures, [id]: open },
    };
    savePreferences(preferenceStore, preferences);
  }

  /**
   * True once the section list exists. Construction-time calls into
   * `refreshSections` (applyPolicy runs during assembly) must be
   * no-ops: the summaries they would compute are rendered by the
   * assembly's own first refresh.
   */
  let sectionsReady = false;

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
    dither: { ...DEFAULT_DITHER },
  };
  let masterImage: PixelBuffer | null = null;
  /**
   * How to re-materialise {@link masterImage} once its pixels have
   * been transferred away (M13-IMPL-01, D135 candidate 2). Set only by
   * the live capture pump, whose grab buffer goes to the worker
   * *without* a pre-submit copy; the frame survives on the session's
   * retained grab surface, so the copy is paid at most once, by
   * whoever actually reads the master image. Null for every still
   * source (import, sample, project) — those buffers are never
   * transferred and so never need refilling.
   */
  let masterRefill: (() => PixelBuffer | null) | null = null;

  /**
   * The master image, refilled first if its buffer was transferred.
   *
   * A transferred `Uint8ClampedArray` detaches to length 0 while its
   * `width`/`height` stay truthful, so a bare `masterImage` read would
   * hand a consumer a correctly-sized, entirely empty picture. Every
   * consumer of the *pixels* goes through here; the null-checks and
   * the `width`-only readouts can stay on the field itself.
   */
  function master(): PixelBuffer | null {
    // A refill can legitimately fail — the session stopped, or nothing
    // has been grabbed yet — and `liveBuffer` reports no source rather
    // than an empty one. Cache what it recovers so a burst of readers
    // pays one copy, not one each.
    const live = liveBuffer(masterImage, masterRefill);
    if (live !== null) masterImage = live;
    return live;
  }

  /** Point the master image at a still buffer that is never transferred. */
  function setStillMaster(buffer: PixelBuffer): void {
    masterImage = buffer;
    masterRefill = null;
  }

  /**
   * A detach-proof copy of the master image for the profile editors'
   * "design" preview. Unlike every other consumer — each of which
   * copies in the same synchronous breath as its `master()` call — the
   * editor preview holds the buffer across awaits and repaints, and
   * under live capture the pump can transfer the live one away in
   * between (M13-IMPL-01, D135 candidate 2). Copying here costs one
   * allocation per preview render, on a debounced editor path.
   */
  function designStill(): PixelBuffer | null {
    const still = master();
    if (still === null) return null;
    return {
      width: still.width,
      height: still.height,
      data: new Uint8ClampedArray(still.data),
    };
  }

  // --- M15 profile-world colour state (M15-UI-01, D114) ------------
  // The design carries its OWN recipe copy plus a link to a named
  // profile — the (edited)-copy pattern: design-context edits land on
  // the copy, never the shared library. `config.palette` is the
  // resolved result; exactly one function — `resolvePalette` — turns
  // the recipe + design rules into the ordered palette the pipeline
  // runs against.
  let designRecipe: ColorProfileRecipe = { ...emptyRecipe(), libraries: ['dmc'] };
  let profileRef: { id: string; revision: number } | null = { id: 'builtin:dmc', revision: 0 };
  let designEdited = false;
  let designRules: { count: { mode: CountMode; n: number }; minDistance: number; mustUse: string[] } = {
    count: { mode: 'max', n: 8 },
    minDistance: 0,
    mustUse: [],
  };
  let paletteMode = true;
  let paletteConflicts: PaletteConflict[] = [];
  let eligibleCount = 0;
  let owned = new Set<string>();
  let libraryPalettes: LibraryPalette[] = [];
  let userColorsMap = new Map<string, Thread>();
  /** Built-ins + stored profiles, for the select and the copies. */
  let colourProfiles: { id: string; name: string; builtin: boolean; revision: number }[] = [];
  const profileRecipes = new Map<string, ColorProfileRecipe>();
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
  /** Empty cells in the last frame, for the Stats total line. */
  let lastEmptyCount: number | null = null;

  /** Error → message, for status text and log data. */
  function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Assemble the resolver's inputs from the current library state. */
  function profileInputs(): ProfileInputs {
    return { catalogue: CATALOGUE, owned, userColors: userColorsMap };
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
  /** Set once the info panel exists; resolvePalette runs earlier. */
  let highlightInvalidated: (() => void) | null = null;
  /** Set once the capture section exists; applyShell runs earlier. */
  let captureSectionElement: HTMLElement | null = null;
  let paletteEntriesFingerprint = '';

  function resolvePalette(): void {
    if (!paletteMode) {
      config.palette = null;
      paletteConflicts = [];
      eligibleCount = 0;
    } else {
      const resolved = resolveProfilePalette({
        recipe: designRecipe,
        design: designRules,
        inputs: profileInputs(),
        source: selectionSource ?? undefined,
        name: paletteName(),
      });
      config.palette = resolved.ok ? resolved.palette : null;
      paletteConflicts = resolved.conflicts;
      eligibleCount = resolved.eligibleCount;
    }
    // A thread highlight is keyed by palette index (M14-EXT-17); when
    // the entry list changes the indices remap, and a held selection
    // would silently point at a different thread — clear it instead.
    const nextFingerprint = (config.palette?.entries ?? []).map((e) => e.id).join('|');
    if (nextFingerprint !== paletteEntriesFingerprint) {
      paletteEntriesFingerprint = nextFingerprint;
      highlightInvalidated?.();
    }
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
    if (masterImage === null || !paletteMode || designRules.count.mode === 'all') return;
    const wanted = selectionGeometryKey();
    if (selectionPending || (selectionSource !== null && selectionGeometry === wanted)) return;
    const still = master();
    if (still === null) return;
    selectionPending = true;
    const copy: PixelBuffer = {
      width: still.width,
      height: still.height,
      data: new Uint8ClampedArray(still.data),
    };
    client.exportFrame(copy, fullRgbVariant(config)).then(
      (buffer) => {
        selectionPending = false;
        selectionSource = buffer;
        selectionGeometry = wanted;
        resolvePalette();
        colourSection.update(sectionState());
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

  /** A display name for the resolved palette, from its profile. */
  function paletteName(): string {
    if (profileRef === null) return 'This design';
    const linked = colourProfiles.find((p) => p.id === profileRef?.id);
    const base = linked?.name ?? 'Profile';
    return designEdited ? `${base} (edited)` : base;
  }

  // Import controls: labelled native file input; drop and paste are
  // alternatives to it, never the only route (UI-STANDARDS).
  const importSection = document.createElement('section');
  importSection.setAttribute('aria-label', 'Source');
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
    'You can also drop an image anywhere on the page, or paste one.';

  // First-run entry state (M14-IMPL-04, D78/D84): the two entry
  // actions and the sample, visible before any source exists. Inline
  // affordances, never a tour overlay (D84). Compacts to a one-line
  // source note once a conversion exists.
  const entryState = document.createElement('div');
  entryState.className = 'entry-state';
  const entryTitle = document.createElement('p');
  entryTitle.className = 'entry-title';
  entryTitle.textContent = 'Turn a picture into a cross-stitch pattern';
  const entryActions = document.createElement('div');
  entryActions.className = 'action-stack';
  const chooseButton = document.createElement('button');
  chooseButton.type = 'button';
  chooseButton.className = 'button-primary';
  chooseButton.textContent = 'Choose an image';
  chooseButton.addEventListener('click', () => {
    input.click();
  });
  // No sample on the entry (M14-EXT-07, the memo's ask): the Source
  // modal keeps the one zero-permission demo route, and loadSample
  // stays for it. With the settings hidden cold (M14-EXT-06), Load
  // would be orphaned without an entry route; this quiet action opens
  // the same hidden project input the panel's Load button uses. Its
  // listener attaches beside that input, where the wiring lives.
  const openProjectButton = document.createElement('button');
  openProjectButton.type = 'button';
  openProjectButton.textContent = 'Open a project';
  /** What feeds the pipeline right now, for the Source modal's note. */
  let sourceName: string | null = null;
  /** True once any source exists; applyShell composes it (F1). */
  let sourceExists = false;

  /** Entry state before any source; a compact note after. */
  function updateSourceEntry(): void {
    sourceExists = masterImage !== null || capture !== null;
    // The compact source row retired at M14-EXT-02: the top-bar
    // Source modal is the switcher, statuses carry the source name,
    // and the file input serves both routes from behind `hidden` (a
    // hidden input still opens its picker on click()).
    label.hidden = true;
    input.hidden = true;
    // A source arriving is a cold exit with the ready line; the panel
    // appears in place and the status says where (never a focus steal).
    if (sourceExists) exitCold(true);
    applyShell();
  }

  /**
   * Leave the cold surface for good (M14-EXT-06). One-way and
   * session-permanent: fired by every source route and by project
   * open — a loaded project's settings matter even before an image.
   * `withReadyLine` announces where the panel landed; project open
   * passes false because its own status already carries the guidance.
   */
  function exitCold(withReadyLine: boolean): void {
    if (!shell.cold) return;
    shell = { ...shell, cold: false };
    applyShell();
    if (withReadyLine) {
      const wide = window.matchMedia('(min-width: 60rem)').matches;
      status.textContent = `Design ready — settings are ${wide ? 'on the right' : 'below'}.`;
    }
  }

  /** Load the deterministic sample through the normal source path. */
  function loadSample(): void {
    const buffer = sampleBuffer();
    log.info('import', 'sample generated', { width: buffer.width, height: buffer.height });
    setStillMaster(buffer);
    sourceName = SAMPLE_NAME;
    invalidateSelectionSource();
    ensureSelectionSource();
    updateSourceEntry();
    // A source replacement re-enters auto-fit (M14-EXT-08): a zoom
    // held for the old picture is meaningless on the new one.
    preview.resetView();
    reprocess();
    status.textContent = 'Sample image loaded — this is a generated test card, not your artwork.';
  }

  // Screen capture (§3, M4): a live getDisplayMedia session as an
  // alternative source. The permission prompt is user-initiated —
  // button only, never on load (UI-STANDARDS → "Capture UX").
  // The session controls live inline in the Capture section
  // (M14-EXT-33, recut at M14-EXT-38 on the owner's sixth look):
  // Stop capture and Freeze beside the two region toggles — one row,
  // one owner per control; the Source modal holds source choices only
  // and the bar button reads "Source" at all times. Capture frame is
  // retired (the cut D108 declined for want of the owner naming it —
  // now named): the initial grab still runs on session start, and the
  // freeze toggle owns every later "hold this frame" gesture. Freeze
  // flips its label (Freeze ↔ Unfreeze) with no aria-pressed — a
  // changing label under aria-pressed is the ARIA-APG anti-pattern,
  // and the pump-death recovery copy needs a literal Unfreeze button
  // to point at. The section mounts only while a session runs, so the
  // session verbs need no per-session hidden dance.
  const captureRow = document.createElement('div');
  captureRow.className = 'toolbar';
  const stopCaptureButton = document.createElement('button');
  stopCaptureButton.type = 'button';
  stopCaptureButton.textContent = 'Stop capture';
  stopCaptureButton.addEventListener('click', () => {
    stopSession();
  });
  const freezeButton = document.createElement('button');
  freezeButton.type = 'button';
  freezeButton.textContent = 'Freeze';
  freezeButton.addEventListener('click', () => {
    toggleFreeze();
  });
  const lockButton = document.createElement('button');
  lockButton.type = 'button';
  lockButton.textContent = 'Lock region';
  lockButton.setAttribute('aria-pressed', 'false');
  lockButton.hidden = true;
  // Aspect toggle (M14-EXT-20, superseding the D101 shape): "Lock
  // aspect", default off — unlocked, the region's shape drives the
  // design size through the held stitch size; locked restores the D52
  // conduct whole. Distinct from "Lock region", which freezes the
  // whole rect against any drag.
  const aspectButton = document.createElement('button');
  aspectButton.type = 'button';
  aspectButton.textContent = 'Lock aspect';
  aspectButton.setAttribute('aria-pressed', 'false');
  aspectButton.hidden = true;
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
  // Concise name; the how-to lives in a linked description (A15
  // pattern, same as the preview host).
  cropOverlay.setAttribute('aria-label', 'Capture region');
  const cropHelp = document.createElement('p');
  cropHelp.id = 'crop-help';
  cropHelp.className = 'visually-hidden';
  cropHelp.textContent =
    'Drag to draw or move the region. Move with the arrow keys; resize with shift and the arrow keys.';
  cropOverlay.setAttribute('aria-describedby', cropHelp.id);
  const cropRectEl = document.createElement('div');
  cropRectEl.className = 'crop-rect';
  for (const h of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const handleEl = document.createElement('div');
    handleEl.className = `crop-handle crop-${h}`;
    cropRectEl.append(handleEl);
  }
  cropOverlay.append(cropRectEl, cropHelp);
  thumbWrap.append(cropOverlay);
  // The standing `Capture region … px → … stitches` readout retired
  // at M14-EXT-21 — its numbers live in the Stats section; gesture
  // ends announce through the status region instead (the A8 keyboard
  // feedback survives the readout).
  // What the permission prompt will do, said before it is triggered
  // (UI-STANDARDS: user-initiated, never on load; D78 expectation
  // copy). Shown only while no session runs.
  // One place only (M14-EXT-05): the expectation is the capture
  // action's linked helper, not a second paragraph.
  const captureExpectation = document.createElement('p');
  captureExpectation.className = 'helper';
  captureExpectation.id = 'capture-expectation';
  captureExpectation.textContent =
    'Your browser will ask what to share — choose the window you draw in; sharing the whole screen includes this app.';
  const captureCta = document.createElement('button');
  captureCta.type = 'button';
  captureCta.className = 'button-primary';
  captureCta.textContent = 'Capture your screen';
  captureCta.addEventListener('click', () => {
    void startScreenCapture();
  });
  captureCta.setAttribute('aria-describedby', captureExpectation.id);
  entryActions.append(chooseButton, captureCta, captureExpectation, openProjectButton);
  entryState.append(entryTitle, entryActions, hint);
  // Session verbs first, region toggles after (M14-EXT-33): stopping
  // is the row's primary reach, and the locks pair at the end. The
  // row is session machinery in a standing section (M14-EXT-40), so
  // it hides whole outside a session.
  captureRow.append(stopCaptureButton, freezeButton, aspectButton, lockButton);
  captureRow.hidden = true;
  // The source section carries the cold entry only (M14-EXT-06/12):
  // the capture surfaces live in the Capture region section, mounted
  // in the settings panel for the duration of a session.
  importSection.append(entryState, label, input);

  // Status is text in an aria-live region — never colour-only, never
  // silent (UI-STANDARDS → "System status"). It lives in the header
  // under the build id (M14-EXT-39, superseding the M2-era content
  // placement): the app's one status region, on the chrome's own
  // line. The recorded trade: scrolled deep at narrow, announcements
  // sit off-viewport — accepted by the owner, named for ACCEPT-01.
  const status = document.createElement('p');
  status.id = 'status';
  status.setAttribute('role', 'status');
  // Cold start says nothing here: the entry state carries the
  // explanation, and two stacked empty-state sentences was the
  // duplication the owner flagged (M14-EXT-05). The region announces
  // from the first action onward.
  status.textContent = '';

  // Preview: a real accordion section (M14-EXT-31, retiring the bar
  // toggle) over the view strip and the keyboard-operable canvas
  // host. The canvas itself is worker-owned. The collapse is the
  // header's own — persisted like every other section disclosure —
  // and the whole section appears with the first frame, exactly as
  // the bare region did. Same anatomy as the settings sections: the
  // panel is the named region landmark, so "Preview" is said once
  // (the EXT-31 carry of audit A12's named-landmark rule).
  const previewAccordion = createSection(document, {
    id: 'preview-section',
    title: 'Preview',
    open: disclosureOpen('preview-section', true),
    onToggle: (open) => {
      setDisclosure('preview-section', open);
      syncPreviewSticky();
    },
  });
  const previewSection = previewAccordion.element;
  previewSection.id = 'preview-section';
  previewSection.hidden = true;
  /** True once any frame has processed; the preview means nothing before. */
  let frameExists = false;
  /**
   * Sticky only while open (M14-EXT-31): a pinned bare heading is
   * chrome without a job. The class flips on toggle — a user action,
   * never scroll — so D103's no-scroll-input rule holds.
   */
  function syncPreviewSticky(): void {
    previewSection.classList.toggle('preview-collapsed', !previewAccordion.isOpen());
  }
  syncPreviewSticky();
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
  // The host is an operable widget, not an image (audit A15): it takes
  // focus and keyboard commands, so it carries an interactive role
  // with a concise name; the usage instructions live in a linked
  // description rather than the name.
  const host = document.createElement('div');
  host.className = 'preview-host';
  host.tabIndex = 0;
  host.setAttribute('role', 'application');
  host.setAttribute('aria-label', 'Stitch preview');
  const hostHelp = document.createElement('p');
  hostHelp.id = 'preview-help';
  hostHelp.className = 'visually-hidden';
  hostHelp.textContent =
    'Zoom with plus and minus, reset the view with zero, pan by dragging or with the arrow keys. Escape releases the preview.';
  host.setAttribute('aria-describedby', hostHelp.id);
  const canvas = document.createElement('canvas');
  host.append(canvas, hostHelp);

  const info = createInfoPanel(
    document,
    BRAND_NAMES,
    // The section wrapper (built below) hides while the table is
    // empty — an open heading over nothing is the blank-panel
    // anti-pattern (M14-EXT-41).
    (hasRows) => {
      coloursHasRows = hasRows;
      syncColoursSection();
    },
    // Thread highlight (M14-EXT-17): rows map to palette indices via
    // the entry order — the sidecar's own vocabulary. Session state,
    // never project data.
    {
      indexFor: (usage) => {
        const id = usage.thread?.id;
        if (id === undefined || config.palette === null) return null;
        const index = config.palette.entries.findIndex((entry) => entry.id === id);
        return index === -1 ? null : index;
      },
      onChange: (selection) => {
        client.setHighlight(selection === null ? null : selection.index);
        status.textContent =
          selection === null
            ? 'Highlight cleared.'
            : `${selection.label} — ${selection.count.toLocaleString('en-GB')} stitches highlighted.`;
      },
      // Remove-from-profile (M15-UI-01): the exclusion lands on the
      // design's copy — the shared library is never touched from here.
      onRemove: (index, label) => {
        const id = config.palette?.entries[index]?.id;
        if (id === undefined) return;
        if (!designRecipe.exclude.includes(id)) designRecipe.exclude.push(id);
        status.textContent = `${label} removed from this design's colours.`;
        designRecipeEdited();
      },
    },
  );
  highlightInvalidated = () => {
    info.clearHighlight();
  };

  // "Colours used" as a real accordion section (M14-EXT-41, the
  // owner's rename of "Colours by usage" and the one-hierarchy pass):
  // the D99 fold anatomy retires, its collapsed-by-default choice
  // survives as the spec default, and a remembered fold choice seeds
  // the new key (the EXT-30 fallback precedent). Since UI-06 (D156) it
  // lives INSIDE the Colour section's panel — it is a readout *of* the
  // colour choices, and a separate top-level home split one subject
  // across two places and lengthened the shell (owner ask at the
  // 2026-08-09 sitting). It keeps its own disclosure (headingLevel 3:
  // nested, so the outline stays honest); visibility composes shell
  // state with has-rows through one writer below.
  let coloursHasRows = false;
  const coloursSection = createSection(document, {
    id: 'colours-used-section',
    title: 'Colours used',
    open: disclosureOpen('colours-used-section', disclosureOpen('colours-table', false)),
    onToggle: (open) => {
      setDisclosure('colours-used-section', open);
    },
    headingLevel: 3,
  });
  coloursSection.panel.append(info.element);
  coloursSection.element.hidden = true;

  /** One writer for the section's visibility: shell × content. */
  function syncColoursSection(): void {
    coloursSection.element.hidden = !visibility(shell).info || !coloursHasRows;
  }

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
        // "Download the log" (M14-EXT-01): the same redacted bundle as
        // the copy path, saved as a file through the app's one
        // download route.
        download: (text, filename) => {
          downloadBlob(document, new Blob([text], { type: 'text/plain' }), filename);
        },
        // "Email the dev" (M14-EXT-26): identity is non-secret by the
        // versioning rule; the mailto hand-off stays offline.
        identity: { appVersion: __APP_VERSION__, buildId: __BUILD_ID__ },
        openMail: (url) => {
          window.location.href = url;
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
    const still = master();
    if (still === null) return;
    status.textContent = 'Processing…';
    client.submit(
      {
        width: still.width,
        height: still.height,
        data: new Uint8ClampedArray(still.data),
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
    // The fields mirror the applied value whatever drove the change —
    // a region-derived height (M14-EXT-15/A) must not leave a stale
    // number in a disabled input. Field-originated calls rewrite the
    // same string, which is a no-op for the caret.
    setFieldValue('pattern-width', String(pattern.widthStitches));
    setFieldValue('pattern-height', String(pattern.heightStitches));
    reframeCrop();
    refreshSections();
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
   *
   * While aspect is unlocked (M14-EXT-20, the default) the region
   * leads instead: it is never reshaped to the design; both design
   * dimensions re-derive from the region at the held stitch size. One
   * bounce at most — the derive is a fixed point, so the recursive
   * applyPattern lands in the equal branch and stops.
   */
  function reframeCrop(): void {
    const bounds = captureBounds();
    if (bounds === null || cropRect === null) return;
    if (!aspectLocked) {
      const derived = deriveGridSize(stitchSizePx, cropRect, MAX_PATTERN_SIDE);
      if (
        derived.width !== scales.pattern.widthStitches ||
        derived.height !== scales.pattern.heightStitches
      ) {
        applyPattern({ widthStitches: derived.width, heightStitches: derived.height });
      }
      return;
    }
    cropRect = constrainRect(cropRect, bounds, config.grid, 'center');
    renderCrop();
    syncStitchSize();
    updateStitchSizeUi();
  }

  /**
   * Adopt the region's size as the design size (M14-EXT-20,
   * superseding D101's height-only adopt) — called at the end of any
   * free gesture. Both dimensions derive through the held
   * source-px-per-stitch scale; the equality guard makes it idempotent
   * so a gesture that changed nothing changes nothing. A clamp at the
   * 1024-stitch cap is announced, never silent.
   */
  function adoptRegionSize(): void {
    if (capture === null || cropRect === null) return;
    const derived = deriveGridSize(stitchSizePx, cropRect, MAX_PATTERN_SIDE);
    if (derived.width === config.grid.width && derived.height === config.grid.height) return;
    applyPattern({ widthStitches: derived.width, heightStitches: derived.height });
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

  // Pattern group: the design's own resolution, in stitches. Its one
  // home is the Capture section (M14-EXT-40, superseding EXT-34/A's
  // permanent Design home on the owner's authority — the Design
  // section itself is removed): size and zoom edit in one place, with
  // or without a session.
  const patternGroup = document.createElement('fieldset');
  const patternLegend = document.createElement('legend');
  // "Size" under the Capture section header — repeating the section
  // name in the legend would say the word twice in one breath
  // (M14-EXT-04).
  patternLegend.textContent = 'Size';
  // Compact footprint (M14-EXT-20): the two fields share one row with
  // a decorative × between them — visible labels and 44 px targets
  // unchanged, only the stacked height goes.
  const sizeRow = document.createElement('div');
  sizeRow.className = 'size-row';
  const sizeSep = document.createElement('span');
  sizeSep.className = 'size-sep meta';
  sizeSep.textContent = '×';
  sizeSep.setAttribute('aria-hidden', 'true');
  sizeRow.append(
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
    sizeSep,
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
  // Zoom (M14-EXT-20's stitch-size slider, renamed at M14-EXT-40):
  // the region↔design scale made visible — a slider plus an exact
  // "N×" readout. The factor is source pixels per stitch (the same
  // number the slider always held); the helper carries the meaning
  // and disambiguates from the preview strip's zoom, which is a
  // different resolution in the D52 contract (capture px per stitch
  // vs preview CSS px per stitch) — the collision is the owner's
  // chosen word, named for ACCEPT-01, never silently renamed.
  // Always present in the section; enabled only during a session
  // (disabled-with-reason otherwise, the A9 pattern).
  const stitchSizeField = document.createElement('div');
  stitchSizeField.className = 'field';
  const stitchSizeLabel = document.createElement('label');
  stitchSizeLabel.htmlFor = 'stitch-size';
  stitchSizeLabel.textContent = SCALE_LABELS.stitchSize;
  const stitchSizeRow = document.createElement('div');
  stitchSizeRow.className = 'stitch-size-row';
  const stitchSizeRange = document.createElement('input');
  stitchSizeRange.type = 'range';
  stitchSizeRange.id = 'stitch-size';
  stitchSizeRange.min = '1';
  stitchSizeRange.max = '64';
  stitchSizeRange.step = '0.5';
  const stitchSizeValue = document.createElement('span');
  stitchSizeValue.className = 'meta';
  stitchSizeValue.id = 'stitch-size-value';
  const stitchSizeHelper = document.createElement('p');
  stitchSizeHelper.className = 'helper';
  stitchSizeHelper.id = 'stitch-size-helper';
  stitchSizeHelper.textContent = SCALE_LABELS.stitchSizeHelper;
  stitchSizeRange.setAttribute('aria-describedby', stitchSizeHelper.id);
  stitchSizeRow.append(stitchSizeRange, stitchSizeValue);
  stitchSizeField.append(stitchSizeLabel, stitchSizeRow, stitchSizeHelper);
  stitchSizeRange.addEventListener('input', () => {
    stitchSizePx = Number(stitchSizeRange.value);
    updateStitchSizeUi();
    // Same region, new resolution: both dimensions re-derive at the
    // slider's scale (the M14-EXT-20 coupling row).
    adoptRegionSize();
  });
  stitchSizeRange.addEventListener('change', () => {
    const clampNote =
      cropRect !== null && deriveClamped(stitchSizePx, cropRect, MAX_PATTERN_SIDE)
        ? ` — clamped to the ${String(MAX_PATTERN_SIDE)}-stitch maximum`
        : '';
    status.textContent =
      `Zoom ${formatStitchSize(stitchSizePx)}× — ` +
      `design ${patternSummary(scales.pattern)}${clampNote}.`;
  });
  patternGroup.append(patternLegend, sizeRow);

  // Grid options live in a modal opened from the view strip
  // (M14-EXT-35, superseding EXT-30's under-strip reveal one look
  // later): the full existing GridStyle surface — the Numbers toggle
  // folds in from the strip, and the tick font size surfaces for the
  // first time. Live-apply per §5.4 — the modal houses controls, it
  // has no Apply, and Close is its only action. Bounded to what the
  // worker and chart renderer already do (new rendering capability is
  // M11's): identical settings produce identical chart bytes. The
  // 'grid-details' disclosure preference retired with the reveal — a
  // modal has no persisted open state; stale stored keys are ignored.
  function openGridOptions(): Promise<void> {
    return formModal(document, {
      title: 'Grid options',
      build: (body) => {
        body.append(
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
          toggleField(document, 'grid-ticks', 'Numbers', gridStyle.ticks, (on) => {
            gridStyle.ticks = on;
            sendGridStyle();
          }).element,
          numberField(
            document,
            'grid-tick-font',
            'Number size',
            { min: 6, max: 32, value: gridStyle.tickFontPx, helper: 'Pixels — the chart export uses it too' },
            (value) => {
              gridStyle.tickFontPx = value;
              sendGridStyle();
            },
          ),
        );
        return body.querySelector<HTMLElement>('input');
      },
    });
  }

  // The Processing section's dither surface (M15-DITH-03, D116): a
  // "Dithering profile" select plus Edit profiles… — the Dither
  // style select and details reveal retired (the editor absorbs
  // depth). No inline tuning: divergence arises only from load-time
  // unmatched configs and later library edits, both rendered
  // honestly through the never-lying Custom entry. The section keeps
  // the name "Processing" — renaming to "Dithering" is the owner's
  // call (D117 seam 5: EXT-30 named it on their authority).
  let ditherRef: { id: string; revision: number } | null =
    matchBuiltInDither(config.dither) === null
      ? null
      : { id: matchBuiltInDither(config.dither) ?? '', revision: 0 };
  let ditherProfiles: { id: string; name: string; builtin: boolean; revision: number }[] = [];
  const ditherConfigs = new Map<string, DitherConfig>();

  async function refreshDitherProfiles(): Promise<void> {
    ditherConfigs.clear();
    for (const preset of DITHER_PRESETS) {
      ditherConfigs.set(`builtin:${preset.id}`, preset.config);
    }
    let stored: ProfileRecord[] = [];
    try {
      stored = await library.listProfiles('dither');
    } catch (error) {
      log.error('library', 'could not list dither profiles', {
        message: describeError(error),
      });
    }
    for (const r of stored) ditherConfigs.set(r.id, asDitherConfig(r.payload));
    ditherProfiles = [
      ...DITHER_PRESETS.map((p) => ({
        id: `builtin:${p.id}`,
        name: p.label,
        builtin: true,
        revision: 0,
      })),
      ...stored.map((r) => ({ id: r.id, name: r.name, builtin: false, revision: r.revision })),
    ];
  }

  const ditherGroupEl = document.createElement('fieldset');
  const ditherField = document.createElement('div');
  ditherField.className = 'field';
  const ditherLabel = document.createElement('label');
  ditherLabel.htmlFor = 'dither-profile';
  ditherLabel.textContent = 'Dithering profile';
  const ditherSelect = document.createElement('select');
  ditherSelect.id = 'dither-profile';
  ditherField.append(ditherLabel, ditherSelect);
  const ditherEditButton = document.createElement('button');
  ditherEditButton.type = 'button';
  ditherEditButton.textContent = 'Edit profiles…';
  ditherEditButton.addEventListener('click', () => {
    void openProfileEditor('dither', ditherRef?.id);
  });
  const ditherRow = document.createElement('div');
  ditherRow.className = 'toolbar profile-row';
  ditherRow.append(ditherField, ditherEditButton);
  // Full-RGB conduct (D117 seam 4): disabled with the A9 sentence,
  // never silent inertness.
  const ditherModeNote = document.createElement('p');
  ditherModeNote.className = 'helper';
  ditherModeNote.id = 'dither-profile-helper';
  ditherSelect.setAttribute('aria-describedby', ditherModeNote.id);
  ditherGroupEl.append(ditherRow, ditherModeNote);

  /** The never-lying Custom sentinel: config matches no profile. */
  const DITHER_CUSTOM = 'custom:design';

  function syncDitherSection(): void {
    const options: [string, string][] = ditherProfiles.map((p) => [
      p.id,
      p.builtin ? `${p.name} (built-in)` : p.name,
    ]);
    const matched =
      ditherRef !== null && ditherConfigs.has(ditherRef.id)
        ? sameDither(ditherConfigs.get(ditherRef.id) ?? { algorithm: 'none' }, config.dither)
        : false;
    if (!matched) {
      options.unshift([DITHER_CUSTOM, 'Custom (this design)']);
    }
    ditherSelect.replaceChildren();
    for (const [value, label] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      ditherSelect.append(option);
    }
    ditherSelect.value = matched && ditherRef !== null ? ditherRef.id : DITHER_CUSTOM;
    const fullRgb = config.palette === null;
    ditherSelect.disabled = fullRgb;
    ditherEditButton.disabled = fullRgb;
    ditherModeNote.textContent = fullRgb ? 'Dithering applies to thread palettes.' : '';
  }

  ditherSelect.addEventListener('change', () => {
    const id = ditherSelect.value;
    if (id === DITHER_CUSTOM) return;
    const chosen = ditherConfigs.get(id);
    if (chosen === undefined) return;
    config.dither = structuredClone(chosen);
    const view = ditherProfiles.find((p) => p.id === id);
    ditherRef = { id, revision: view?.revision ?? 0 };
    status.textContent = `Dithering profile "${view?.name ?? id}" applied.`;
    syncDitherSection();
    refreshSections();
    reprocess();
  });

  /** The old ditherControls surface, kept as a shim for call sites:
   *  the profile select re-syncs wherever the panel once updated. */
  const ditherControls = {
    element: ditherGroupEl,
    update: (): void => {
      syncDitherSection();
    },
  };

  /** The section's view of the design's colour state (M15-UI-01). */
  function sectionState(): ColourSectionState {
    return {
      paletteMode,
      profiles: colourProfiles,
      profileRef: profileRef?.id ?? null,
      edited: designEdited,
      count: designRules.count,
      minDistance: designRules.minDistance,
      mustUse: designRules.mustUse,
      conflicts: paletteConflicts,
      eligibleCount,
    };
  }

  /** Re-resolve, refresh the section, and run the pipeline once. */
  function applyColour(): void {
    ensureSelectionSource();
    // FLICKER-01 (D158): while a fresh selection source is in flight,
    // hold the previous palette and frame instead of resolving against
    // nothing. A count limit with no source resolves to the full
    // permitted set (the documented first-frame two-step), and
    // reprocessing with it painted the near-unreduced picture between
    // two limited values — the owner's flicker. The fetch's completion
    // handler re-resolves and reprocesses the moment the source lands,
    // so the swap is old-reduced → new-reduced, never through wide.
    // Source *replacements* (new artwork) bypass this on purpose: they
    // reprocess directly, because showing the new picture with the old
    // palette beats holding a stale picture.
    if (selectionPending) {
      colourSection.update(sectionState());
      refreshSections();
      return;
    }
    resolvePalette();
    // Dithering only applies when reducing to a palette.
    ditherControls.update();
    colourSection.update(sectionState());
    refreshSections();
    reprocess();
  }

  /** Rebuild the profiles cache from built-ins + the store. */
  async function refreshProfilesCache(): Promise<void> {
    profileRecipes.clear();
    const builtins = builtInProfiles(CATALOGUE);
    for (const b of builtins) profileRecipes.set(b.id, b.recipe);
    let stored: ProfileRecord[] = [];
    try {
      stored = await library.listProfiles('colour');
    } catch (error) {
      log.error('library', 'could not list profiles', { message: describeError(error) });
    }
    for (const r of stored) {
      const payload = r.payload as Partial<ColorProfileRecipe> | null;
      profileRecipes.set(r.id, {
        ...emptyRecipe(),
        ...(typeof payload === 'object' && payload !== null ? payload : {}),
      });
    }
    colourProfiles = [
      ...builtins.map((b) => ({ id: b.id, name: b.name, builtin: true, revision: b.revision })),
      ...stored.map((r) => ({ id: r.id, name: r.name, builtin: false, revision: r.revision })),
    ];
    // A linked design re-derives its edited flag against the live
    // library (drift is reported by the flag, never repaired — D55).
    if (profileRef !== null) {
      const base = profileRecipes.get(profileRef.id);
      designEdited = base === undefined || JSON.stringify(base) !== JSON.stringify(designRecipe);
    }
  }

  /** A design-context edit landed on the copy (the D114 pattern). */
  function designRecipeEdited(): void {
    designEdited = profileRef !== null;
    applyColour();
  }

  const colourSection = createColourSection(document, {
    paletteMode,
    profiles: colourProfiles,
    profileRef: profileRef?.id ?? null,
    edited: designEdited,
    count: designRules.count,
    minDistance: designRules.minDistance,
    mustUse: designRules.mustUse,
    conflicts: paletteConflicts,
    eligibleCount,
  }, {
    setPaletteMode: (on) => {
      paletteMode = on;
      applyColour();
    },
    selectProfile: (id) => {
      const recipe = profileRecipes.get(id);
      if (recipe === undefined) return;
      const view = colourProfiles.find((p) => p.id === id);
      designRecipe = structuredClone(recipe);
      profileRef = { id, revision: view?.revision ?? 0 };
      designEdited = false;
      status.textContent = `Profile "${view?.name ?? id}" applied.`;
      applyColour();
    },
    updateProfile: () => {
      void (async () => {
        if (profileRef === null) return;
        const view = colourProfiles.find((p) => p.id === profileRef?.id);
        if (view === undefined || view.builtin) return;
        const stored = (await library.listProfiles('colour')).find(
          (r) => r.id === profileRef?.id,
        );
        if (stored === undefined || profileRef === null) return;
        const record: ProfileRecord = {
          ...stored,
          revision: stored.revision + 1,
          payload: structuredClone(designRecipe),
        };
        await library.putProfile(record);
        await refreshProfilesCache();
        profileRef = { id: record.id, revision: record.revision };
        designEdited = false;
        status.textContent = `Updated "${record.name}" — every design using it follows.`;
        applyColour();
      })();
    },
    saveAsNew: () => {
      void (async () => {
        const name = await textPromptModal(document, {
          title: 'Save as new profile',
          label: 'Profile name',
          initial: '',
          confirmLabel: 'Save',
        });
        if (name === null || name.trim() === '') return;
        const record: ProfileRecord = {
          kind: 'colour',
          id: `p-${Date.now().toString(36)}-${String(colourProfiles.length)}`,
          name: name.trim(),
          revision: 1,
          createdFrom: profileRef === null ? 'design' : `copy:${profileRef.id}`,
          payload: structuredClone(designRecipe),
        };
        await library.putProfile(record);
        await refreshProfilesCache();
        profileRef = { id: record.id, revision: 1 };
        designEdited = false;
        status.textContent = `Saved "${record.name}" as a new profile.`;
        applyColour();
      })();
    },
    revert: () => {
      if (profileRef === null) return;
      const base = profileRecipes.get(profileRef.id);
      if (base === undefined) return;
      designRecipe = structuredClone(base);
      designEdited = false;
      status.textContent = 'Reverted to the profile’s own colours.';
      applyColour();
    },
    setCount: (mode, n) => {
      designRules.count = { mode, n };
      // A count change re-selects against the source distribution.
      invalidateSelectionSource();
      applyColour();
    },
    setMinDistance: (value) => {
      designRules.minDistance = value;
      applyColour();
    },
    addMustUse: (id) => {
      if (!designRules.mustUse.includes(id)) designRules.mustUse.push(id);
      status.textContent = `${labelForId(id)} will always be in the palette.`;
      applyColour();
    },
    removeMustUse: (id) => {
      designRules.mustUse = designRules.mustUse.filter((m) => m !== id);
      status.textContent = `${labelForId(id)} is no longer guaranteed.`;
      applyColour();
    },
    openEditor: () => {
      void openProfileEditor('colour', profileRef?.id);
    },
    browseRows: (query) => browseRowsFor(CATALOGUE, [...userColorsMap.values()], null, query),
    labelFor: labelForId,
    mountInventory: (container) => {
      mountInventoryUi(container);
    },
  });
  const colourGroup = colourSection.element;

  /** Display label for any id — thread, map entry or custom colour. */
  function labelForId(id: string): string {
    const entry =
      CATALOGUE.byId.get(id) ??
      userColorsMap.get(id) ??
      browseUniverse(CATALOGUE, [], null).find((e) => e.id === id);
    return entry === undefined ? id : entryLabel(entry, CATALOGUE);
  }

  /** The My-threads inventory manager (ownership stays its own
   *  concern — the UI-03 rule; this is its post-cutover home). */
  function mountInventoryUi(container: HTMLElement): void {
    const note = document.createElement('p');
    note.className = 'meta';
    note.textContent = library.persistent
      ? 'Your inventory is stored in this browser. Export it to keep a copy.'
      : 'Browser storage is unavailable, so your inventory lasts only until you reload. Export it to keep it.';
    const table = createBrowseTable(document, {
      searchId: 'inventory-search',
      searchLabel: 'Find a thread',
      rowsFor: (query) => {
        const q = query.trim().toLowerCase();
        const matches = CATALOGUE.threads.filter(
          (t) => q === '' || entryLabel(t, CATALOGUE).toLowerCase().includes(q),
        );
        return {
          rows: matches.slice(0, 60).map((t) => ({
            id: t.id,
            label: entryLabel(t, CATALOGUE),
            hex: t.hex,
          })),
          total: matches.length,
        };
      },
      rowActions: (row) => {
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = owned.has(row.id);
        box.setAttribute('aria-label', `Own ${row.label}`);
        box.addEventListener('change', () => {
          if (box.checked) owned.add(row.id);
          else owned.delete(row.id);
          persistOwned();
          applyColour();
        });
        const label = document.createElement('span');
        label.className = 'meta';
        label.textContent = 'Own';
        label.setAttribute('aria-hidden', 'true');
        return [box, label];
      },
      emptyText: 'No threads here.',
    });
    const actionRow = document.createElement('div');
    actionRow.className = 'toolbar';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Export inventory';
    exportButton.addEventListener('click', () => {
      downloadBlob(
        document,
        new Blob([serializeInventory(owned, 'thread-list')], { type: 'application/json' }),
        'thread-inventory.json',
      );
      status.textContent = `Exported ${String(owned.size)} owned threads.`;
    });
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.textContent = 'Import inventory';
    importButton.addEventListener('click', () => {
      inventoryInput.click();
    });
    actionRow.append(exportButton, importButton);
    container.append(table.element, actionRow, note);
  }

  // Resolve once up front so the section opens showing a real palette
  // rather than an empty one that only fills in after the library
  // loads asynchronously.
  refreshProfilesCache()
    .then(() => {
      applyColour();
    })
    .catch(() => {
      applyColour();
    });

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
      applyColour();
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

  // The saved-palette editor retired with the policy world
  // (M15-UI-01): palettes convert 1:1 into explicit-membership
  // profiles at library open (PERSIST-01/D115), and every edit route
  // is the profile editor's.

  const ditherGroup = ditherControls.element;

  // Processing order retires from the UI (M14-EXT-44, the owner's
  // call — assessment recorded at D112: reduce-first is slower by
  // construction, kills the stats sidecar, and its softer look is
  // the dither surface's job now). Core keeps `preset` whole, so a
  // loaded reduce-first project renders byte-identically from its
  // file — and says so while active (visible state, the A conduct):
  // this line mounts in the Processing section for exactly that
  // state. There is no edit route back; fresh designs are always
  // resize-first (D3).
  const orderNote = document.createElement('p');
  orderNote.className = 'meta';
  orderNote.id = 'order-note';
  orderNote.textContent =
    'Rendering with the retired “match colours first” order, kept from this project file.';
  orderNote.hidden = true;

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
  // The Export/Project fieldsets carry no legend: each is
  // its section's only group, so the accordion header is the name
  // (a legend would say it twice — D83).
  const exportGroup = document.createElement('fieldset');
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
  // Export section structure (ui-spec §5, A22): a derived size
  // readout and the three actions lead; per-exporter options sit
  // behind one reveal each. The readout answers "how big will it be"
  // where exports happen without adding a fifth resolution control.
  const exportSize = document.createElement('p');
  exportSize.className = 'meta';
  exportSize.id = 'export-size';

  function makeReveal(id: string, label: string, ...children: HTMLElement[]): HTMLDetailsElement {
    const details = document.createElement('details');
    details.className = 'depth-reveal';
    const summaryEl = document.createElement('summary');
    summaryEl.textContent = label;
    const body = document.createElement('div');
    body.className = 'depth-reveal-body';
    body.append(...children);
    details.append(summaryEl, body);
    details.open = disclosureOpen(id, false);
    details.addEventListener('toggle', () => {
      setDisclosure(id, details.open);
    });
    return details;
  }

  const exportActions = document.createElement('div');
  exportActions.className = 'toolbar';
  exportActions.append(exportButton, chartButton, pdfButton);

  exportGroup.append(
    exportSize,
    exportActions,
    makeReveal(
      'png-options',
      'PNG options',
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
          refreshSections();
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
    ),
    makeReveal(
      'chart-options',
      'Chart options',
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
          refreshSections();
        },
      ),
    ),
    makeReveal(
      'pdf-options',
      'PDF options',
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
          refreshSections();
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
    ),
  );

  async function exportPng(): Promise<void> {
    const still = master();
    if (still === null) return;
    // Clamp so the output canvas stays within browser limits; say so
    // in the status when it bites rather than failing silently.
    const wanted = scales.export.cleanPxPerStitch;
    const scale = Math.min(wanted, maxScaleFor(config.grid.width, config.grid.height));
    status.textContent = 'Exporting…';
    exportButton.disabled = true;
    try {
      const frame = await client.exportFrame(
        {
          width: still.width,
          height: still.height,
          data: new Uint8ClampedArray(still.data),
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
    const still = master();
    if (still === null) return;
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
          width: still.width,
          height: still.height,
          data: new Uint8ClampedArray(still.data),
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
    const still = master();
    if (still === null) return;
    status.textContent = 'Exporting…';
    pdfButton.disabled = true;
    try {
      const frame = await client.exportFrame(
        {
          width: still.width,
          height: still.height,
          data: new Uint8ClampedArray(still.data),
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
      // Thread key: used colours only; full-RGB mode has no key. The
      // assembly lives in export/key-entries.ts so the artefact suite
      // drives this exact code rather than a copy (EXPORT-01, D153).
      const entries: KeyEntry[] = buildKeyEntries(frame, config.palette, BRAND_NAMES);
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
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save project';
  saveButton.addEventListener('click', saveProject);
  // A real button over a hidden input (the Choose-an-image pattern,
  // M14-EXT-05) — the last raw file input leaves the panel.
  const loadButton = document.createElement('button');
  loadButton.type = 'button';
  loadButton.textContent = 'Load project';
  const projectInput = document.createElement('input');
  projectInput.type = 'file';
  projectInput.id = 'project-file';
  projectInput.accept = 'application/json,.json';
  projectInput.hidden = true;
  loadButton.addEventListener('click', () => {
    projectInput.click();
  });
  // The cold surface's project route (M14-EXT-06): same input, same
  // change handler, so both doors lead through one load path.
  openProjectButton.addEventListener('click', () => {
    projectInput.click();
  });
  projectInput.addEventListener('change', () => {
    const file = projectInput.files?.[0];
    projectInput.value = '';
    if (file !== undefined) void loadProject(file);
  });
  // Unsaved-work honesty (D78/D75): the app has no autosave, and the
  // one place that says so is here, with the save action. Final
  // wording lands in the M14-IMPL-05 sweep.
  const keepNote = document.createElement('p');
  keepNote.className = 'meta';
  keepNote.textContent = 'Nothing is kept unless you save your project.';
  // Build identity moves off the primary surface to the Project foot
  // (audit A13): still user-reachable, no longer the page's second
  // line. `version` is created with the header block above.
  projectGroup.append(keepNote, saveButton, loadButton, projectInput);

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
        ditherProfileRef: ditherRef,
      },
      // The design's recipe copy *and* the exact threads that
      // rendered it (schema v5, M15-PERSIST-01): reopening must
      // reproduce this design even if the profile it links has been
      // edited or deleted (D55 carried into the profile world).
      palette: paletteMode
        ? {
            profileRef,
            recipe: designRecipe,
            design: designRules,
            snapshot: config.palette?.entries ?? [],
          }
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
  function syncControls(): void {
    setFieldValue('pattern-width', String(scales.pattern.widthStitches));
    setFieldValue('pattern-height', String(scales.pattern.heightStitches));
    // The Threadify switch mirrors paletteMode inside
    // colourSection.update below — no field write needed here.
    ditherControls.update();
    colourSection.update(sectionState());
    gridToggle.setAttribute('aria-pressed', String(gridStyle.show));
    // The Grid options fields need no sync here: the modal is
    // transient and builds fresh from gridStyle on every open
    // (M14-EXT-35) — and nothing can load a project while it is up.
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
      designRecipe = { ...emptyRecipe(), libraries: ['dmc'] };
      profileRef = { id: 'builtin:dmc', revision: 0 };
      designEdited = false;
      config.palette = null;
      paletteConflicts = [];
      return;
    }
    paletteMode = true;
    designRecipe = structuredClone(loaded.recipe);
    profileRef = loaded.profileRef === null ? null : { ...loaded.profileRef };
    designRules = {
      count: { ...loaded.design.count },
      minDistance: loaded.design.minDistance,
      mustUse: [...loaded.design.mustUse],
    };
    // The edited flag re-derives against the live library; drift is
    // reported by the flag, never repaired (D55).
    void refreshProfilesCache().then(() => {
      colourSection.update(sectionState());
    });
    if (loaded.snapshot.length > 0) {
      const snapshotPalette = { name: paletteName(), entries: loaded.snapshot };
      config.palette = snapshotPalette;
      eligibleCount = loaded.snapshot.length;
      paletteConflicts = driftConflicts(loaded.snapshot);
      // The display name resolves properly once the profiles cache
      // lands; refresh it only if nothing has replaced the loaded
      // palette meanwhile (review of D124, punch item 3).
      void refreshProfilesCache().then(() => {
        if (config.palette === snapshotPalette) {
          config.palette = { ...snapshotPalette, name: paletteName() };
          colourSection.update(sectionState());
        }
      });
    } else {
      // A file that never ran carries no snapshot; resolving from the
      // recipe is the only option, and exactly what it meant.
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
      // Adopt the saved reference, or match a built-in structurally
      // (M15-DITH-01): an old file whose config equals a preset
      // attaches that profile; anything else stays honestly
      // unreferenced as Custom.
      ditherRef =
        file.pipeline.ditherProfileRef ??
        (matchBuiltInDither(config.dither) === null
          ? null
          : { id: matchBuiltInDither(config.dither) ?? '', revision: 0 });
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
      // While unlocked (M14-EXT-20) the region leads instead: honour
      // the loaded width by re-seeding the stitch size from it, and
      // let reframeCrop derive the height from the region's shape —
      // the D101 semantics carried into the two-dimension world.
      if (capture !== null && !aspectLocked && cropRect !== null) {
        stitchSizePx = cropRect.width / Math.max(1, scales.pattern.widthStitches);
        updateStitchSizeUi();
      }
      reframeCrop();
      preview.setScale(file.preview);
      refreshSections();
      reprocess();
      // A loaded project's settings matter before any image, so this
      // route exits cold too (M14-EXT-06) — quietly: the line below
      // already says what happened and what to do next.
      exitCold(false);
      // The retired order is named at the moment it starts rendering
      // (M14-EXT-44) — the standing line in Processing carries it
      // from here on.
      const orderTail =
        config.preset === 'reduce-first'
          ? ' This project uses the retired “match colours first” order — kept as saved.'
          : '';
      // The D114 waiver's visible note: an older file's colour
      // settings migrated best-effort; the snapshot renders.
      const migrateTail =
        file.migratedFrom !== undefined && file.migratedFrom < 5 && file.palette !== null
          ? ' Colour settings were migrated from an older format — the design renders from its saved colours.'
          : '';
      status.textContent =
        masterImage === null
          ? `Loaded ${fileBlob.name} — import an image to see it applied.${orderTail}${migrateTail}`
          : `Loaded ${fileBlob.name}.${orderTail}${migrateTail}`;
      log.info('project', 'loaded', { filename: fileBlob.name });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = `Could not load that project (${message}).`;
      log.error('project', 'load failed', { message });
    }
  }

  controls.id = 'controls-panel';

  // The section architecture (ui-spec §2, D77): Stats and Design open
  // by default, everything else a bare heading until opened
  // (M14-EXT-22 — collapsed folds carry no summary line; the numbers
  // that must stay visible live in Stats).
  const sections: AccordionSection[] = [];

  function section(
    id: string,
    title: string,
    specDefaultOpen: boolean,
    ...content: HTMLElement[]
  ): AccordionSection {
    const built = createSection(document, {
      id,
      title,
      open: disclosureOpen(id, specDefaultOpen),
      onToggle: (open) => {
        setDisclosure(id, open);
      },
    });
    built.panel.append(...content);
    sections.push(built);
    return built;
  }

  /** Recompute the section-adjacent readouts (Stats, export size). */
  function refreshSections(): void {
    if (!sectionsReady) return;
    refreshStats();
    exportSize.textContent = exportSizeLine();
    // Only a loaded file can set reduce-first (M14-EXT-44); the note
    // stands exactly while it renders.
    orderNote.hidden = config.preset !== 'reduce-first';
  }

  /** "PNG 800 × 800 px · chart 2,000 px wide" — the derived output
   *  size, from the four-resolutions model (a readout, never a fifth
   *  control). */
  function exportSizeLine(): string {
    const w = config.grid.width;
    const h = config.grid.height;
    const s = scales.export.cleanPxPerStitch;
    const cell = scales.export.chartCellPx;
    return `PNG ${String(w * s)} × ${String(h * s)} px · chart ${String(w * cell)} × ${String(h * cell)} px`;
  }

  // Stats (M14-EXT-21): the design's headline numbers, first in the
  // panel and readable with or without a session — design size, total
  // stitches, colours in use. Owns the figures the retired
  // capture-region readout and info summary carried, and takes over
  // D98's never-silent colour-limit duty from the Design fold line
  // (EXT-22 flattens fold lines app-wide). Deliberately no region
  // coordinates and no aspect state — the owner excluded both.
  const statsList = document.createElement('dl');
  statsList.className = 'stats-list';
  function statsRow(label: string): HTMLElement {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    statsList.append(dt, dd);
    return dd;
  }
  const statsSize = statsRow('Design size');
  // Stitch size joins Stats as a readout (M14-EXT-40): the Zoom
  // slider owns the input during a session; this row shows the
  // source-px-per-stitch ratio whenever any source defines one.
  const statsStitch = statsRow('Stitch size');
  const statsTotal = statsRow('Total stitches');
  const statsColours = statsRow('Colours in use');

  /** Colours-in-use value, carrying D98's never-silent limit duty. */
  function colourInUseLine(): string {
    if (lastColorCount === null) return 'none yet';
    const used = String(lastColorCount);
    if (!paletteMode) return `${used} · unlimited`;
    if (designRules.count.mode !== 'all') return `${used} · limit ${String(designRules.count.n)}`;
    return used;
  }

  /** Refresh the Stats values from owned state — never recomputed
   *  from pixels here; the worker's stats land via setOnResult. */
  function refreshStats(): void {
    statsSize.textContent = patternSummary(scales.pattern);
    // The live scale during a session; the still image's own ratio
    // otherwise (M14-EXT-40 — the readout exists whenever a source
    // defines one, not only under capture).
    const ratio =
      capture !== null && stitchSizePx > 0
        ? stitchSizePx
        : masterImage !== null && scales.pattern.widthStitches > 0
          ? masterImage.width / scales.pattern.widthStitches
          : null;
    statsStitch.textContent =
      ratio === null ? 'none yet' : `${formatStitchSize(ratio)} source px per stitch`;
    const total = scales.pattern.widthStitches * scales.pattern.heightStitches;
    statsTotal.textContent =
      lastEmptyCount !== null && lastEmptyCount > 0
        ? `${total.toLocaleString('en-GB')} (${lastEmptyCount.toLocaleString('en-GB')} empty)`
        : total.toLocaleString('en-GB');
    statsColours.textContent = colourInUseLine();
  }

  section('section-stats', 'Stats', true, statsList);

  // No Design section (M14-EXT-40, the owner's sixth look): size and
  // zoom live in the Capture section, whose element is inserted into
  // Design's old slot — after Stats — once it is built below.
  // Colour stands alone (M14-EXT-28): its own section, the group
  // moved whole. Spec default closed — the default-8 conversion needs
  // no colour decision first, and Stats carries the count.
  const colourAccordion = section('section-colour', 'Colour', false, colourGroup, inventoryInput);
  // The colour key mounts at the foot of the Colour panel (UI-06,
  // D156): choices above, readout of those choices below, one subject
  // in one place. Its own disclosure and its shell×has-rows visibility
  // writer are unchanged.
  colourAccordion.panel.append(coloursSection.element);
  // "Processing" (M14-EXT-30): the Appearance rename, reduced to the
  // Dither group — the grid geometry moved to the view strip's
  // reveal. The stored open/closed preference migrates by fallback:
  // a remembered 'section-appearance' choice seeds the new id.
  section(
    'section-processing',
    'Processing',
    disclosureOpen('section-appearance', false),
    orderNote,
    ditherGroup,
  );
  section('section-export', 'Export', false, exportGroup);
  section('section-project', 'Project', false, projectGroup);
  // No Advanced section (M14-EXT-44): the Processing order select was
  // its only occupant, and it retired with the select — the EXT-32
  // sunset pattern. The stale `section-advanced` disclosure key is
  // harmless (the EXT-35 precedent).
  controls.append(...sections.map((s) => s.element));
  // sectionsReady flips after the Capture section joins the panel
  // below — refreshStats reads the session state it carries
  // (M14-EXT-40), so the first refresh must not run before those
  // declarations exist.

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
    // Saved palettes convert 1:1 into explicit-membership profiles
    // (PERSIST-01, D115) — idempotent by id, order intact (D46); the
    // palette records stay untouched as the user's own data.
    const existing = new Set((await library.listProfiles('colour')).map((r) => r.id));
    for (const palette of libraryPalettes) {
      if (existing.has(palette.id)) continue;
      const profile = paletteToProfile(palette);
      await library.putProfile({
        kind: 'colour',
        id: profile.id,
        name: profile.name,
        revision: profile.revision,
        createdFrom: profile.createdFrom,
        payload: profile.recipe,
      });
    }
    const storedColors = await library.listUserColors();
    userColorsMap = new Map(
      storedColors.map((c) => {
        const entry = userColor(c.id, c.rgb);
        return [entry.id, entry];
      }),
    );
    await refreshProfilesCache();
    await refreshDitherProfiles();
    syncDitherSection();
    log.info('library', 'opened', {
      persistent: library.persistent,
      owned: owned.size,
      palettes: libraryPalettes.length,
      profiles: colourProfiles.length,
    });
    applyColour();
  })().catch((error: unknown) => {
    log.error('library', 'could not be opened', { message: describeError(error) });
  });

  // Shell bar: the Source chooser on a permanent surface at the top
  // of the app. The collapse toggles that shared it retired with
  // their modes (M14-EXT-31/32): every region now collapses from its
  // own accordion header, which survives its own collapse — the
  // UI-STANDARDS "control lives outside the region" rule is satisfied
  // by the header anatomy itself.
  const shellBar = document.createElement('div');
  shellBar.className = 'toolbar shell-bar';
  // Source chooser (M14-EXT-02): the returning user's switcher. The
  // cold-start entry state stays the first-run path; this button is
  // the permanent affordance once a source exists.
  const sourceButton = document.createElement('button');
  sourceButton.type = 'button';
  sourceButton.id = 'source-button';
  sourceButton.textContent = 'Source';
  sourceButton.addEventListener('click', () => {
    // Source choices only (M14-EXT-33, superseding D108's session
    // block): the session verbs live inline in the Capture section,
    // so this modal never mixes "switch source" with "stop the one
    // running". During a session no choice is primary — the emphasis
    // would read as a nudge to replace the live source.
    void choicesModal(document, {
      title: 'Source',
      note: sourceName === null ? 'No source yet.' : `Current: ${sourceName}`,
      choices: [
        { id: 'file', label: 'Choose an image', primary: capture === null },
        {
          id: 'capture',
          label: 'Capture your screen',
          helper:
            'Your browser will ask what to share — choose the window you draw in; sharing the whole screen includes this app.',
        },
        { id: 'sample', label: 'Try a sample' },
      ],
    }).then((choice) => {
      if (choice === 'file') input.click();
      else if (choice === 'capture') void startScreenCapture();
      else if (choice === 'sample') loadSample();
    });
  });
  shellBar.append(sourceButton);

  // The profile editor's entry is the Colour section's Edit
  // profiles… button (M15-UI-01 — the dev-only bar entry retired
  // with the cutover, D115's staging complete).

  /**
   * Push the shell state onto the DOM. One function, one source of
   * truth: every `hidden` the shell owns is written here and nowhere
   * else. Since M14-EXT-31/32 the only transition is the one-way cold
   * exit, so no focus rescue is needed for the regions it reveals —
   * nothing can be focused inside a region that has never been shown.
   */
  function applyShell(): void {
    const show = visibility(shell);
    // The entry hides when a source lands (M14-EXT-06: the shell is
    // the one writer for the cold composition). If focus was on an
    // entry action, hand it to the chooser that replaces it — the bar
    // Source button — rather than letting the page lose it.
    if (sourceExists && entryState.contains(document.activeElement)) {
      sourceButton.focus();
    }
    entryState.hidden = sourceExists;
    controls.hidden = !show.controls;
    importSection.hidden = !show.source;
    // The preview section shows once a frame exists (M14-EXT-31); its
    // collapse belongs to its own header, so the shell has no say.
    previewSection.hidden = !frameExists;
    // The capture section lives in the content column (M14-FIX-01);
    // it is source machinery and follows the source region's
    // visibility while mounted. Late-bound: the section is created
    // after the first apply.
    if (captureSectionElement !== null) captureSectionElement.hidden = !show.source;
    // The entry state IS the chooser while it shows (M14-EXT-05): a
    // bar button opening a modal that repeats the on-screen actions
    // was duplication. One composed rule, one writer — the shell owns
    // this line.
    sourceButton.hidden = !show.source || !sourceExists;
    syncColoursSection();
    if (debugPanel !== null) debugPanel.element.hidden = !show.debug;
    if (diagnostics !== null) diagnostics.element.hidden = !show.debug;
    status.hidden = !show.status;
  }

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

  // The view strip (M14-EXT-11): one quiet, permanent row of ghost
  // text buttons on the preview edge — the D89 fold retires, because
  // a collapsed fold demoted E-tier zoom to reach 2 and broke the §1
  // contract. "Discreet" is delivered by visual weight, not burial.
  // The grid toggles move in from Appearance (same state, one owner,
  // never duplicated); the readouts keep riding the row end.
  // "Reset view" is the one surviving fit control (M14-EXT-08): under
  // auto-fit the resting state is fitted, so the button's job is
  // returning to it. The `0` key does the same (§6, one rule).
  const gridToggle = toolbarButton('Grid', () => {
    gridStyle.show = !gridStyle.show;
    gridToggle.setAttribute('aria-pressed', String(gridStyle.show));
    sendGridStyle();
  });
  gridToggle.setAttribute('aria-pressed', String(gridStyle.show));
  // The Numbers toggle retired into the Grid options modal
  // (M14-EXT-35); the trigger beside Grid is the strip's one other
  // grid word — the cost of one owner per setting.
  const gridOptionsButton = toolbarButton('Grid options', () => {
    void openGridOptions();
  });
  const viewReadouts = document.createElement('span');
  viewReadouts.className = 'meta view-readouts';
  viewReadouts.append(zoomLabel, dimensionsLabel);
  toolbar.classList.add('view-strip');
  toolbar.append(
    toolbarButton('Zoom out', () => preview.zoomCentred(1 / 1.25)),
    toolbarButton('Zoom in', () => preview.zoomCentred(1.25)),
    toolbarButton('Reset view', () => preview.resetView()),
    compareToggle,
    splitWrap,
    gridToggle,
    gridOptionsButton,
    viewReadouts,
  );
  // The strip and canvas dock together (M14-EXT-09) — "how I look at
  // it" belongs with the picture; the info panel and everything else
  // scroll beneath and are appended at the content level below. All
  // of it lives in the accordion panel (M14-EXT-31), under the
  // section's own header; the grid geometry that rode between strip
  // and canvas moved into the Grid options modal (M14-EXT-35).
  previewAccordion.panel.append(toolbar, host);

  // Preview first in the DOM at every width (M6-NARROW-01). The
  // settings panel sits to its right when there is room, so the
  // reading order, the visual order, and the tab order agree — rather
  // than being reordered by CSS into disagreement.
  const content = document.createElement('div');
  content.className = 'content';
  // No scroll-linked geometry (M14-FIX-06): the D95 dock threshold —
  // scrolled past a sentinel, cap the canvas — changed the page
  // height on its own trigger's axis, and scroll anchoring / bottom
  // clamping fed the change back across the threshold as a visible
  // docked↔undocked flap (owner's live session, 2026-08-05). The
  // preview is simply sticky now; its height comes from the design
  // (the hug in PreviewController, M14-FIX-03) and never from scroll.
  content.append(previewSection, importSection);
  if (debugPanel !== null) content.append(debugPanel.element);
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  layout.append(content, controls);

  // The takeover editor host (M15-UI-02): a view swap, not a dialog —
  // opening hides the app layout and mounts the editor in its place;
  // the header (and the app's one status region) stays, and a capture
  // session keeps running underneath. Built lazily on first open.
  const editorHost = document.createElement('div');
  editorHost.className = 'editor-host';
  editorHost.hidden = true;
  let profileEditor: import('./ui/profile-editor.ts').ProfileEditor | null = null;
  let ditherEditor: import('./ui/profile-editor.ts').ProfileEditor | null = null;
  let openEditorKind: 'colour' | 'dither' = 'colour';

  function closeProfileEditor(): void {
    editorHost.hidden = true;
    layout.hidden = false;
    // Focus returns to the section's own entry (the invoker).
    document
      .getElementById(openEditorKind === 'colour' ? 'colour-profile' : 'dither-profile')
      ?.focus();
    status.textContent = 'Back to the design.';
    // Library edits made inside the editor surface immediately.
    void refreshProfilesCache().then(() => {
      applyColour();
    });
    void refreshDitherProfiles().then(() => {
      syncDitherSection();
    });
  }

  async function openProfileEditor(
    kind: 'colour' | 'dither' = 'colour',
    profileId?: string,
  ): Promise<void> {
    openEditorKind = kind;
    if (kind === 'dither') {
      if (ditherEditor === null) {
        const ditherKind = createDitherKindAdapter(document, {
          store: () => library,
          paletteContextLine: () =>
            config.palette === null
              ? 'Demonstration palette — Retro 16 (the design is full-RGB)'
              : `the design's palette (${config.palette.name})`,
        });
        ditherEditor = createProfileEditor(document, {
          adapter: {
            ...ditherKind,
            mountPreview: (container) => {
              const rig = createEditorPreview(document, {
                idPrefix: 'dither',
                render: (buffer, previewConfig) =>
                  client.exportFrame(
                    {
                      width: buffer.width,
                      height: buffer.height,
                      data: new Uint8ClampedArray(buffer.data),
                    },
                    previewConfig,
                  ),
                designStill,
                baseConfig: () => ({ ...config }),
                // The kind contract (D116): the pipeline with a
                // draft-overridden dither stage; a resolved palette is
                // required, so full-RGB borrows the named demo palette.
                overrideConfig: (draft, base) => ({
                  ...base,
                  palette:
                    base.palette ??
                    paletteOf(
                      'Demonstration palette — Retro 16',
                      generateColorMap('retro16').entries,
                    ),
                  dither: ditherKind.resolveDraftConfig(draft),
                }),
                loadSlot: (file) => fetchSlot(file, decodeImageBlob),
              });
              container.append(rig.element);
              return rig;
            },
          },
          design: {
            activeProfileId: () => ditherRef?.id ?? null,
            onActiveProfileSaved: (id, draft) => {
              config.dither = asDitherConfig(draft);
              void refreshDitherProfiles().then(() => {
                const view = ditherProfiles.find((p) => p.id === id);
                if (view !== undefined) ditherRef = { id, revision: view.revision };
                syncDitherSection();
                refreshSections();
                reprocess();
              });
            },
          },
          announce: (text) => {
            status.textContent = text;
          },
          onClose: closeProfileEditor,
        });
        editorHost.append(ditherEditor.element);
      }
      layout.hidden = true;
      editorHost.hidden = false;
      profileEditor?.element.setAttribute('hidden', '');
      ditherEditor.element.removeAttribute('hidden');
      await ditherEditor.open(profileId);
      return;
    }
    if (profileEditor === null) {
      const colourKind = createColourKindAdapter(document, {
        catalogue: CATALOGUE,
        store: () => library,
        owned: () => owned,
      });
      profileEditor = createProfileEditor(document, {
        adapter: {
          ...colourKind,
          mountPreview: (container) => {
            const rig = createEditorPreview(document, {
              idPrefix: 'colour',
              render: (buffer, previewConfig) =>
                client.exportFrame(
                  {
                    width: buffer.width,
                    height: buffer.height,
                    data: new Uint8ClampedArray(buffer.data),
                  },
                  previewConfig,
                ),
              designStill,
              baseConfig: () => ({ ...config }),
              overrideConfig: (draft, base) => {
                const entries = colourKind.resolveDraft(draft);
                return {
                  ...base,
                  palette: entries.length === 0 ? null : paletteOf('Draft profile', entries),
                };
              },
              loadSlot: (file) => fetchSlot(file, decodeImageBlob),
            });
            container.append(rig.element);
            return rig;
          },
        },
        // The D117 editor-Save contract: Save on the design's active
        // profile updates the design's copy in the same act; saving
        // any other profile never touches the design.
        design: {
          activeProfileId: () => profileRef?.id ?? null,
          onActiveProfileSaved: (id, draft) => {
            designRecipe = structuredClone(draft) as ColorProfileRecipe;
            designEdited = false;
            void refreshProfilesCache().then(() => {
              const view = colourProfiles.find((p) => p.id === id);
              if (profileRef !== null && view !== undefined) {
                profileRef = { id, revision: view.revision };
              }
              applyColour();
            });
          },
        },
        announce: (text) => {
          status.textContent = text;
        },
        onClose: closeProfileEditor,
      });
      editorHost.append(profileEditor.element);
    }
    layout.hidden = true;
    editorHost.hidden = false;
    ditherEditor?.element.setAttribute('hidden', '');
    profileEditor.element.removeAttribute('hidden');
    await profileEditor.open(profileId);
  }
  const header = document.createElement('header');
  header.className = 'app-header';
  // Build identity returns to the chrome as quiet meta text — the
  // owner's call at the D88 triage, reversing A13's Project-foot
  // placement. The status region stacks directly under it
  // (M14-EXT-39): one identity-and-state block between the title and
  // the utility controls. The dev diagnostics cluster is its own bar
  // group so it wraps as a unit and its status line never squeezes
  // the product controls (M14-EXT-05).
  const headerId = document.createElement('div');
  headerId.className = 'header-id';
  headerId.append(version, status);
  header.append(heading, headerId, shellBar);
  if (diagnostics !== null) header.append(diagnostics.element);
  app.replaceChildren(header, layout, editorHost);
  applyShell();
  preview.initSurface();

  client.setOnResult((frame) => {
    // Pump continuation: the returned result frees the gate; grab
    // again if a newer video frame arrived meanwhile.
    if (stopPump !== null && pumpGate.grabDone()) void pumpGrab();
    if (!frameExists) {
      frameExists = true;
      applyShell();
    }
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
    lastEmptyCount = stats.emptyCount;
    colourSection.update(sectionState());
    refreshStats();
    status.textContent = 'Preview updated.';
    log.info('pipeline', 'frame processed', {
      timings: frame.timings,
      totalMs: Math.round(total * 100) / 100,
      colours: stats.colorCount,
    });
  });

  async function importBlob(blob: Blob, source: string, name?: string): Promise<void> {
    status.textContent = 'Processing…';
    try {
      const buffer = await decodeImageBlob(blob);
      log.info('import', `image from ${source}`, {
        width: buffer.width,
        height: buffer.height,
      });
      setStillMaster(buffer);
      sourceName = name ?? source;
      invalidateSelectionSource();
      ensureSelectionSource();
      updateSourceEntry();
      // Source replacement → auto-fit (M14-EXT-08).
      preview.resetView();
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
  /**
   * The refill {@link master} uses while a capture session owns the
   * master image (M13-IMPL-01, D135 candidate 2). Reads the last
   * grabbed frame back off the session's retained surface — no new
   * `drawImage`, so a frozen session refills the frozen frame exactly.
   * Null once the session ends, which is also when `masterImage` stops
   * being refillable and the app correctly reports no source.
   */
  const captureRefill = (): PixelBuffer | null => capture?.snapshot() ?? null;
  let cropRect: CropRect | null = null;
  let cropLocked = false;
  /**
   * "Lock aspect" (M14-EXT-20, superseding D101's default-on follow).
   * Session-only, default **off** each session — never project data.
   * Unlocked, free pins re-derive both design dimensions from the
   * region at the held stitch size (stitches stay square); locked
   * restores D52 whole, with shift-drag freeing a pin temporarily.
   * The keyboard route to a free resize while locked is the toggle
   * itself.
   */
  let aspectLocked = false;
  /**
   * Source px per stitch — the one number coupling region size to
   * design size while aspect is unlocked (M14-EXT-20). Held fixed
   * across region drags (a drag trades area for stitches at this
   * resolution); re-synced from the region and design whenever a
   * locked-path change moves their ratio. 0 = no session.
   */
  let stitchSizePx = 0;
  const pumpGate = new PumpGate();
  let stopPump: (() => void) | null = null;
  const dirtyGate = new DirtyGate();
  let captureFrozen = false;
  const draftGovernor = new DraftGovernor();
  let draftMode = false;

  // Capture section (M14-EXT-33 rename; permanent home at M14-EXT-40
  // — the crop overlay keeps its own "Capture region" name, it names
  // the rectangle): Zoom and the Size fields always, plus the session
  // machinery — verbs row, thumb + crop overlay, draft badge — shown
  // only while a session runs. The section replaces Design in the
  // settings panel (naming tension over a still image recorded for
  // ACCEPT-01 — the owner's memo names this section, so "Capture" it
  // is). Standing section, standing disclosure: persisted under its
  // own key, seeded from the retired Design key so a remembered
  // choice survives the merge; a session start still force-opens it
  // (the EXT-33 conduct, now persisted like the preview's re-expand).
  // The mid-session collapse still hands the lead back (M14-FIX-01);
  // in the panel, collapse is just a section collapsing.
  const captureSection = createSection(document, {
    id: 'section-capture',
    title: 'Capture',
    open: disclosureOpen('section-capture', disclosureOpen('section-design', true)),
    onToggle: (open) => {
      setDisclosure('section-capture', open);
      // Collapsing mid-session is the "done with the region" gesture
      // (M14-FIX-01): the preview takes the lead back. Instant
      // scroll — reduced motion by construction.
      if (!open && capture !== null) window.scrollTo(0, 0);
    },
  });
  captureSection.panel.append(
    captureRow,
    stitchSizeField,
    patternGroup,
    captureMeta,
    thumbWrap,
    draftBadge,
  );
  sections.push(captureSection);
  captureSectionElement = captureSection.element;
  // Design's old slot: directly after Stats, ahead of Colour.
  controls.insertBefore(captureSection.element, colourAccordion.element);
  sectionsReady = true;
  refreshSections();
  // First paint of the size/zoom conducts (M14-EXT-40): the fields
  // enabled, the zoom slider disabled with its no-session reason.
  syncSizeDerivedState();
  updateStitchSizeUi();

  /**
   * Move the capture section above the preview for the session
   * (M14-FIX-01, superseding EXT-12's panel-first slot on the
   * owner's ask): tweak → lock → collapse → progress, with the
   * region leading the page while it is the task at hand. The move
   * is a DOM mount, never CSS `order`, so reading, visual and tab
   * order stay one thing. Collapsing or locking hands the lead back
   * to the preview (scroll to top — instant, reduced-motion safe).
   */
  function showCaptureSection(): void {
    content.insertBefore(captureSection.element, previewSection);
    captureRow.hidden = false;
    // Expanded at every session start (M14-EXT-33, memo 1) —
    // persisted, as the preview's session re-expand is.
    captureSection.setOpen(true);
    setDisclosure('section-capture', true);
    refreshSections();
  }

  /** Return the section to its panel slot on session end
   *  (M14-EXT-40 — the section is permanent; only the session
   *  machinery leaves). Focus rescue is endCaptureUi's job: by the
   *  time this runs, hiding the session buttons has already dropped
   *  focus to body, so a contains() check here sees nothing. */
  function hideCaptureSection(): void {
    captureRow.hidden = true;
    controls.insertBefore(captureSection.element, colourAccordion.element);
  }

  // First paint of the source area: cold start shows the entry state
  // and leaves capture to its CTA (placed here, after the capture
  // state exists, because updateSourceEntry reads it).
  updateSourceEntry();

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
    if (draftMode && config.palette !== null && config.dither.algorithm !== 'none') {
      return { ...config, dither: { algorithm: 'none' } };
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
    scales = withCapture(scales, { widthPx: cropRect.width, heightPx: cropRect.height });
  }

  /**
   * Announce a region gesture's outcome (audit A8: keyboard moves
   * must not be silent; the standing readout retired at M14-EXT-21).
   * Called at end-events — key press, drag end — never per
   * pointer-move, so the status region does not flood a screen
   * reader mid-drag. No coordinates: the owner cut them.
   */
  function announceRegion(): void {
    if (cropRect === null) return;
    const region = `${String(cropRect.width)} × ${String(cropRect.height)} px`;
    if (aspectLocked) {
      status.textContent = `Region ${region}.`;
    } else {
      // While unlocked the design size is region-driven, and the
      // announcement says so the moment it derives (the EXT-15 rule
      // kept through EXT-20: a derived dimension is named, never
      // silent) — including a clamp at the stitch cap.
      const clampNote = deriveClamped(stitchSizePx, cropRect, MAX_PATTERN_SIDE)
        ? ` — clamped to the ${String(MAX_PATTERN_SIDE)}-stitch maximum`
        : '';
      status.textContent = `Design ${patternSummary(scales.pattern)} from a ${region} region${clampNote}.`;
    }
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
    // Read before anything hides: the click that ends a session comes
    // from a button inside the capture section, and hiding it drops
    // focus to body before the section is unmounted.
    const focusWasInCapture = captureSection.element.contains(document.activeElement);
    stopPumpNow();
    dirtyGate.reset();
    draftGovernor.reset();
    setDraftMode(false);
    captureFrozen = false;
    freezeButton.textContent = 'Freeze';
    aspectButton.hidden = true;
    aspectLocked = false;
    aspectButton.setAttribute('aria-pressed', 'false');
    stitchSizePx = 0;
    updateStitchSizeUi();
    // Rescue the last live frame into a still *before* the session
    // goes (M13-IMPL-01, D135 candidate 2). Under the pump the master
    // image's pixels live on the session's grab surface, not in
    // `masterImage`; without this, stopping capture would take the
    // design with it and the surviving still would be an empty
    // correctly-sized picture. `master()` refills or, if the frame
    // cannot be recovered at all, leaves no source — which is the
    // honest report, never a blank one.
    masterImage = master();
    masterRefill = null;
    capture?.video.remove();
    capture = null;
    // After `capture` clears: the derived-state check reads it, and
    // running earlier would leave the Size fields disabled for good.
    syncSizeDerivedState();
    cropRect = null;
    lockButton.hidden = true;
    captureMeta.hidden = true;
    thumbWrap.hidden = true;
    hideCaptureSection();
    updateSourceEntry();
    status.textContent = message;
    // Hand focus to whichever chooser now exists — the bar's Source
    // button, or the entry's first action when the session was the
    // only source and the entry state has returned (M14-EXT-12).
    if (focusWasInCapture) (sourceButton.hidden ? chooseButton : sourceButton).focus();
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
      masterRefill = captureRefill;
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
  // stops and the session enters the frozen state, so the one
  // documented exit — Unfreeze — restarts it (M14-EXT-38).
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
      masterRefill = captureRefill;
      // Seeds the palette from the first live frame, then holds: a
      // palette rebuilt every frame would make the preview churn.
      // Runs *before* the submit that detaches `buffer`, so on the
      // seeding frame it copies from live pixels rather than paying a
      // refill.
      ensureSelectionSource();
      // No pre-submit copy (M13-IMPL-01, D135 candidate 2): the grab
      // buffer itself is transferred, and `masterRefill` re-reads the
      // frame off the session's retained surface if anything asks.
      // That trades one guaranteed 5.9 MB copy per frame for one paid
      // only when a consumer appears.
      client.submit(buffer, liveConfig());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stopPump?.();
      stopPump = null;
      pumpGate.reset();
      draftGovernor.reset();
      setDraftMode(false);
      // A dead pump and a frozen one are the same observable state
      // (preview holds, capture runs), so the button tells the truth
      // and the recovery is its single documented exit (M14-EXT-38,
      // superseding the EXT-33 Capture-frame route).
      captureFrozen = true;
      freezeButton.textContent = 'Unfreeze';
      status.textContent = `Live update stopped (${message}). Capture is still running — press Unfreeze in the Capture section to restart live updates.`;
      log.error('capture', 'pump grab failed', { message });
    }
  }

  async function startScreenCapture(): Promise<void> {
    status.textContent = 'Requesting screen capture…';
    try {
      const session = await startCapture();
      capture = session;
      lockButton.hidden = false;
      // Each session starts unlocked — the M14-EXT-20 default,
      // superseding D101's follow-by-default; session-only, never
      // persisted.
      aspectLocked = false;
      aspectButton.setAttribute('aria-pressed', 'false');
      aspectButton.hidden = false;
      // The Size fields live in this very section (M14-EXT-40,
      // superseding EXT-34/A): under the unlocked default they show
      // disabled-with-reason while the region drives them.
      captureMeta.hidden = false;
      captureMeta.textContent = `Capturing ${session.label}.`;
      // Mount the live thumbnail with the full frame selected; the
      // video keeps its own aspect (width-driven), so overlay maths
      // stays a single linear scale.
      thumbWrap.prepend(session.video);
      thumbWrap.hidden = false;
      sourceName = `Screen capture (${session.label})`;
      // A capture session re-opens a collapsed preview (the EXT-23
      // rule, carried to the section header at M14-EXT-31): the
      // session exists to watch the design update. Persisted, exactly
      // as the header toggle would persist it.
      previewAccordion.setOpen(true);
      setDisclosure('preview-section', true);
      syncPreviewSticky();
      updateSourceEntry();
      // Source replacement → auto-fit (M14-EXT-08).
      preview.resetView();
      // The capture surface mounts above the preview (M14-FIX-01);
      // the user chose capture, so the context change is expected —
      // said after the cold-exit line so the specific wins, and focus
      // hands to the section's own toggle: the user's gesture was
      // "set up a capture", and this is where that happens.
      showCaptureSection();
      status.textContent = 'Capture started — region controls above the preview.';
      document.getElementById('section-capture-toggle')?.focus();
      // Largest region with the pattern's aspect, centred — a gentle
      // start even unlocked: the derive from this region is the design
      // size already on the fields, so nothing jumps until the user
      // drags. The held stitch size seeds from this ratio.
      cropRect = fullAspectRect(
        { width: session.video.videoWidth, height: session.video.videoHeight },
        config.grid,
      );
      syncStitchSize();
      updateStitchSizeUi();
      syncSizeDerivedState();
      renderCrop();
      // Source dimensions can change mid-session (e.g. the shared
      // window is resized): re-fit the region rather than let it point
      // off-frame — keeping the aspect on the way while locked; while
      // unlocked, clamp to the new bounds and adopt any forced size
      // change (M14-EXT-20).
      session.video.addEventListener('resize', () => {
        const bounds = captureBounds();
        if (bounds === null || cropRect === null) return;
        if (aspectLocked) {
          cropRect = constrainRect(cropRect, bounds, config.grid, 'center');
          syncStitchSize();
          updateStitchSizeUi();
        } else {
          cropRect = clampRect(cropRect, bounds);
          adoptRegionSize();
        }
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
    }
  }

  /** End the session from the section's own Stop (M14-EXT-33). */
  function stopSession(): void {
    capture?.stop();
    endCaptureUi('Screen capture stopped.');
    log.info('capture', 'session stopped');
  }

  /** Freeze/unfreeze the live pump — a named state, never silent.
   *  The flipping label is the state carrier (M14-EXT-38); unfreeze
   *  restarts the pump, which is also the pump-death recovery leg. */
  function toggleFreeze(): void {
    if (capture === null) return;
    captureFrozen = !captureFrozen;
    freezeButton.textContent = captureFrozen ? 'Unfreeze' : 'Freeze';
    if (captureFrozen) {
      stopPumpNow();
      draftGovernor.reset();
      setDraftMode(false);
      status.textContent = 'Frozen — the preview holds the last frame; capture is still running.';
      log.info('capture', 'frozen');
    } else {
      startPumpNow(capture);
      status.textContent = 'Unfrozen — live updates resumed.';
      log.info('capture', 'unfrozen');
    }
  }
  lockButton.addEventListener('click', () => {
    cropLocked = !cropLocked;
    lockButton.setAttribute('aria-pressed', String(cropLocked));
    cropOverlay.classList.toggle('locked', cropLocked);
    status.textContent = cropLocked ? 'Capture region locked.' : 'Capture region unlocked.';
    // Locking is the other "done with the region" gesture
    // (M14-FIX-01): the preview takes the lead back.
    if (cropLocked) window.scrollTo(0, 0);
  });

  /**
   * Both Size fields are region-driven while aspect is unlocked
   * (M14-EXT-20): a value any drag overwrites must not be editable —
   * disable them and say why in their own helpers (A9 adjacency).
   * The stitch-size slider inverts: editable while unlocked (it is
   * the resolution control), a disabled readout while locked (there
   * the ratio is a consequence of region and design, not an input).
   */
  function syncSizeDerivedState(): void {
    const derived = capture !== null && !aspectLocked;
    for (const [id, helperText] of [
      ['pattern-width', SCALE_LABELS.patternHelper],
      ['pattern-height', SCALE_LABELS.patternHeightHelper],
    ] as const) {
      const input = document.getElementById(id);
      const helper = document.getElementById(`${id}-helper`);
      if (input instanceof HTMLInputElement) input.disabled = derived;
      if (helper !== null) {
        helper.textContent = derived
          ? 'Follows the region while aspect is unlocked'
          : helperText;
      }
    }
    // Zoom stays visible without a session (M14-EXT-40 — the section
    // is the one home for size and zoom), disabled with its reason.
    stitchSizeRange.disabled = capture === null || aspectLocked;
    stitchSizeHelper.textContent =
      capture === null
        ? 'Applies during screen capture — a still image is sized by the fields below'
        : aspectLocked
          ? 'Follows the region and design while aspect is locked'
          : SCALE_LABELS.stitchSizeHelper;
  }

  /** Re-derive the held scale from the current region and design. */
  function syncStitchSize(): void {
    if (cropRect === null || scales.pattern.widthStitches <= 0) return;
    stitchSizePx = cropRect.width / scales.pattern.widthStitches;
  }

  /** One decimal at most, no trailing zero: "5.4", "8". */
  function formatStitchSize(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return String(Number.isInteger(rounded) ? rounded : rounded.toFixed(1));
  }

  /** Mirror the held scale onto the slider and its exact readout. */
  function updateStitchSizeUi(): void {
    if (stitchSizePx <= 0) {
      // No session holds a scale: the readout says so rather than
      // showing a stale factor under a disabled slider (M14-EXT-40).
      stitchSizeValue.textContent = '—';
      return;
    }
    stitchSizeRange.value = String(Math.min(64, Math.max(1, stitchSizePx)));
    stitchSizeValue.textContent = `${formatStitchSize(stitchSizePx)}×`;
  }

  aspectButton.addEventListener('click', () => {
    aspectLocked = !aspectLocked;
    aspectButton.setAttribute('aria-pressed', String(aspectLocked));
    if (aspectLocked) {
      // Snapping to the design's aspect is idempotent here: the
      // unlocked state kept design size derived from the region, so
      // the constrain is a snap at most, never a jump.
      const bounds = captureBounds();
      if (bounds !== null && cropRect !== null) {
        cropRect = constrainRect(cropRect, bounds, config.grid, 'center');
        renderCrop();
        syncStitchSize();
        updateStitchSizeUi();
      }
      status.textContent = 'Aspect locked — the region keeps the design’s shape.';
    } else {
      syncStitchSize();
      updateStitchSizeUi();
      status.textContent =
        'Aspect unlocked — the region shape and stitch size drive the design size.';
    }
    syncSizeDerivedState();
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
    /** Whether the last move ran the free geometry (M14-EXT-20):
     *  only a free gesture's end adopts the region size — a
     *  constrained end while locked must never change stitch counts
     *  (D52), it re-syncs the held stitch size instead. */
    free: boolean;
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
      free: false,
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
    // A move changes no dimension, so it needs no re-aspecting. Every
    // shape-changing route constrains to the design's aspect — unless
    // the aspect is unlocked (the default), or shift frees the pin for
    // this gesture while locked (M14-EXT-20); the free size is adopted
    // as the design size at pointerup, not per move.
    const free = !aspectLocked || event.shiftKey;
    cropDrag.free = free;
    if (cropDrag.mode === 'inside') {
      cropRect = moveRect(cropDrag.startRect, dx, dy, bounds);
    } else if (cropDrag.mode === 'draw') {
      const drawn = {
        x: Math.min(cropDrag.startX, point.x),
        y: Math.min(cropDrag.startY, point.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
      cropRect = free
        ? clampRect(drawn, bounds)
        : constrainRect(
            drawn,
            bounds,
            config.grid,
            drawAnchor(cropDrag.startX, cropDrag.startY, point.x, point.y),
          );
    } else {
      cropRect = free
        ? resizeRect(cropDrag.startRect, cropDrag.mode, dx, dy, bounds)
        : constrainRect(
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
    const wasFree = cropDrag.free;
    cropDrag = null;
    cropOverlay.releasePointerCapture(event.pointerId);
    // A free gesture's size becomes the design size at the gesture end
    // (M14-EXT-20); a constrained end while locked changes resolution,
    // not stitches, so the held stitch size re-syncs instead.
    if (wasFree) {
      adoptRegionSize();
    } else if (aspectLocked) {
      syncStitchSize();
      updateStitchSizeUi();
    }
    announceRegion();
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
    // Shift+arrows resize; with aspect unlocked (the default) the
    // resize is free and each press adopts the size (a press is one
    // deliberate act, so per-press is the keyboard's gesture end —
    // M14-EXT-20). The locked keyboard route to a free resize is the
    // aspect toggle.
    cropRect = event.shiftKey
      ? aspectLocked
        ? constrainRect(resizeRect(cropRect, 'se', move[0], move[1], bounds), bounds, config.grid, 'nw')
        : resizeRect(cropRect, 'se', move[0], move[1], bounds)
      : moveRect(cropRect, move[0], move[1], bounds);
    if (event.shiftKey) {
      if (aspectLocked) {
        syncStitchSize();
        updateStitchSizeUi();
      } else {
        adoptRegionSize();
      }
    }
    renderCrop();
    announceRegion();
    event.preventDefault();
  });

  window.addEventListener('resize', renderCrop);

  input.addEventListener('change', () => {
    const file = imageFiles(input.files ?? []).at(0);
    if (file) void importBlob(file, 'file picker', file.name);
  });

  // Window-width guide (M14-FIX-04): while the window is being
  // narrowed toward the companion posture, one debounced line in the
  // existing status region names the floor — zero standing chrome,
  // one announcement per resize burst, silent at roomy widths.
  let widthGuideTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(widthGuideTimer);
    widthGuideTimer = window.setTimeout(() => {
      if (window.innerWidth >= 960) return;
      status.textContent =
        window.innerWidth < 320
          ? `Window ${String(window.innerWidth)} px — narrower than the supported 320 px floor.`
          : `Window ${String(window.innerWidth)} px wide — works down to 320 px.`;
    }, 350);
  });

  window.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = imageFiles(event.dataTransfer?.files ?? []).at(0);
    if (file) void importBlob(file, 'drop', file.name);
    else status.textContent = 'That drop had no image file.';
  });
  window.addEventListener('paste', (event) => {
    const file = imageFiles(event.clipboardData?.files ?? []).at(0);
    if (file) void importBlob(file, 'paste', file.name);
  });
}

const app = document.getElementById('app');
if (app === null) {
  log.error('boot', 'missing #app mount point');
} else {
  build(app);
}
