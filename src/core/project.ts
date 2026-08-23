/**
 * Versioned JSON project file (§20 MVP subset): schema, migration,
 * and (de)serialisation. The interfaces below ARE the documented
 * schema — stage params objects are the single source of truth for
 * both UI controls and the project file (conventions.md).
 *
 * The document is settings: the pipeline configuration, the palette
 * (intent plus snapshot), symbols, chart/grid styling, export and
 * estimation preferences. The picture does **not** live in the JSON —
 * since schema v10 (DUR-01, D171) a saved project is a package
 * (`project-package.ts`) holding this document beside the source image
 * verbatim, and the `source` block here only names that entry. A
 * settings-only document (a legacy `.json`, or a design that never had
 * a picture) carries `source: null` and applies to the next import.
 *
 * Invariants (AGENTS.md): loaders migrate older `schemaVersion`s
 * forward, never fail on them; save → load → save is byte-identical,
 * guaranteed by `serializeProject` emitting a canonical field order
 * and `parseProject` reconstructing exactly that shape.
 */

import type { ColorMetric } from './color/metrics.ts';
import type { ColorProfileRecipe, HsbRangeRule } from './color-profile.ts';
import { DEFAULT_ESTIMATES, type EstimateSettings } from './estimates.ts';
import { matchGridPreset } from './grid-presets.ts';
import type { GridStyleValues } from './grid-style.ts';
import type { CountMode } from './palette-policy.ts';
import type { DitherConfig, OrderPreset } from './pipeline/config.ts';
import type { ResizeMode } from './pipeline/resize.ts';
import type { ThreadSwap } from './pipeline/swap.ts';
import type { SymbolPair } from './symbols/assignment.ts';
import type { Provenance, Thread, ThreadStatus } from './types.ts';

/** Current project-file schema version. Bump with a forward migration. */
export const SCHEMA_VERSION = 11;

/**
 * Extension of a saved project (DUR-01): a store-only zip package —
 * see `project-package.ts`. Legacy `.json` settings files keep loading.
 */
export const PROJECT_EXTENSION = '.pmproj';

/** Source-name ceiling — a filename or a capture label, never a paragraph. */
export const MAX_SOURCE_NAME = 255;

/**
 * Hard ceiling on a persisted palette snapshot.
 *
 * Project files are untrusted input — a hand-edited or hostile one must
 * not be able to make the app allocate without bound before a single
 * validation runs. 4096 is four times the whole two-brand catalogue.
 */
export const MAX_PALETTE_ENTRIES = 4096;

/** Grid dimension bounds in stitches (brief: max 1024 per side). */
export const MAX_GRID_SIDE = 1024;

/**
 * Preview scale bounds in CSS px per stitch: 5 % – 6400 % of 1:1, the
 * same window the viewport clamps to. Declared here because the
 * schema is the outer gate — a hand-edited file must not smuggle in a
 * zoom the viewport would silently clamp anyway.
 */
export const MIN_PREVIEW_CSS_PX = 0.05;
export const MAX_PREVIEW_CSS_PX = 64;

/**
 * Pipeline settings as stored. Mirrors `PipelineConfig` minus the
 * palette, which from v3 lives in its own top-level block — a palette
 * is now a policy plus a snapshot, not a name (M7-PAL-01).
 */
export interface ProjectPipeline {
  preset: OrderPreset;
  /** Stitch grid, whole stitches, 1–1024 per side. */
  grid: { width: number; height: number };
  resizeMode: ResizeMode;
  metric: ColorMetric;
  /**
   * Dithering as a discriminated union (schema v4, M8-ALG-01). Stable
   * algorithm identifiers are persisted, never display labels; fields
   * exist only where the algorithm defines them.
   */
  dither: DitherConfig;
  /**
   * The design's link to a named dither profile (M15-DITH-01,
   * additive in v5): the resolved `dither` above stays the
   * authoritative snapshot half (D55); null = unreferenced — the
   * honest unnamed state. Older files attach a built-in at load when
   * the config structurally matches one, and otherwise stay null.
   */
  ditherProfileRef: { id: string; revision: number } | null;
}

/**
 * The palette block (schema v5, M15-PERSIST-01/D114). The D55
 * intent+snapshot pair, recut for profiles:
 *
 * - `profileRef` links the design to a named profile (`{id,
 *   revision}`), or null when the design stands alone.
 * - `recipe` is the design's **own copy** of the composition recipe —
 *   what a refresh re-resolves from, and where design-context edits
 *   land (the (edited)-copy pattern) without touching the library.
 * - `design` carries the design-layer rules beside the recipe:
 *   count, minimum distance, Must-use seats (M15-CORE-03) and, from
 *   v11, colour swaps (ICE-RECOLOUR-01, D182) — `from` a selected
 *   entry's id, `to` a full thread record with the snapshot's
 *   semantics, so the file renders the swap without the catalogue.
 * - `snapshot` is the exact ordered thread data that **rendered**
 *   this project. It is authoritative on reopen.
 */
export interface ProjectPalette {
  profileRef: { id: string; revision: number } | null;
  recipe: ColorProfileRecipe;
  design: {
    count: { mode: CountMode; n: number };
    minDistance: number;
    mustUse: string[];
    swaps: ThreadSwap[];
  };
  /** Ordered threads exactly as rendered. Empty means "not yet run". */
  snapshot: Thread[];
}

/**
 * The symbol-assignment block (schema v6, M9/D160): grants, the
 * unused-symbol queue, and standing overrides, verbatim from
 * `SymbolAssignmentState`. Assignment is **state, not recomputation**
 * — persisting it is what makes symbols deterministic and stable
 * across palette edits and reloads. An empty block is a design that
 * has never granted a symbol; the app reconciles the queue against
 * its own glyph catalogue on load (`reconcileSymbolState`).
 */
export interface ProjectSymbols {
  assigned: SymbolPair[];
  queue: string[];
  overrides: SymbolPair[];
}

/**
 * How chart exports paint each stitch (M9): colour cells, black and
 * white symbols, or symbols over colour. Applies to the chart PNG and
 * the PDF's embedded chart alike.
 */
export type ChartMode = 'color' | 'symbols' | 'color-symbols';

/**
 * One grid-styling half as stored — exactly the core style-values
 * shape (§15–§16 subset). The theme-derived tick text colour is
 * intentionally not persisted — it is recomputed from the page
 * colour scheme at render time.
 */
export type ProjectGridStyle = GridStyleValues;

/**
 * Grid/chart styling as stored (schema v7, M11): a **screen** half in
 * CSS px driving the preview overlay and a **print** half in raster
 * px driving the chart PNG and the PDF's embedded chart — the two
 * surfaces stopped sharing one block because print wants different
 * ink than a live preview. `preset` is provenance only (the built-in
 * both halves last came from; null = custom): the canonical values
 * above always win, so a preset changing in a later release can never
 * restyle a saved design.
 */
export interface ProjectGridBlock {
  screen: ProjectGridStyle;
  print: ProjectGridStyle;
  preset: string | null;
}

/**
 * How the preview chooses its scale. Stored as a mode rather than a
 * bare number because a fit result depends on the viewport, the tick
 * margins, DPR, and whether the settings panel is open — a saved fit
 * *scale* would be stale the moment any of those differed.
 */
export type PreviewFitMode = 'space' | 'width' | 'height' | 'manual';

/**
 * Preview scale as stored (§20, schema v2). Screen-side only: nothing
 * here can change the pattern, the pixels processed, or an export.
 * `cssPxPerStitch` is in CSS pixels, not device pixels, so a project
 * saved on a Retina display reopens the same size on a 1× one. Pan is
 * intentionally absent — restoring a stale offset can reopen a design
 * almost entirely off-screen.
 */
export interface ProjectPreview {
  mode: PreviewFitMode;
  /** Honoured in 'manual' mode; the last fitted value otherwise. */
  cssPxPerStitch: number;
}

/** Export preferences (§13, §14, §18 subsets). */
export interface ProjectExport {
  /** Clean-PNG enlargement, pixels per stitch (integer ≥ 1). */
  scale: number;
  background: 'transparent' | 'solid';
  /** `#rrggbb` solid-background colour. */
  color: string;
  /** Chart-PNG cell size, pixels per stitch. */
  chartCell: number;
  /** How chart exports paint each stitch (schema v6, M9). */
  chartMode: ChartMode;
  pdf: {
    pageSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    marginMm: number;
    title: string;
    /**
     * PDF pagination (schema v8, M10): 'single' fits the whole chart
     * on one page (the pre-M10 behaviour); 'grid' tiles it at
     * `stitchesPerPage` fresh stitches per axis with
     * `overlapStitches` repeated at leading joins.
     */
    pages: 'single' | 'grid';
    stitchesPerPage: number;
    overlapStitches: number;
  };
}

/**
 * Where the design's picture lives beside this document (schema v10,
 * DUR-01): the package entry holding the bytes **verbatim** — never
 * re-encoded, or save → load → save would stop being byte-identical
 * (D171) — the MIME type they decode as, and the name the picture
 * arrived under (a filename or a capture label, shown as the source
 * name). `null` is a settings-only project.
 */
export interface ProjectSource {
  /** Package entry name, e.g. `source.png`: 1–64 safe characters, never a path. */
  entry: string;
  /** MIME type the bytes decode as, e.g. `image/jpeg`. */
  type: string;
  /** The name the picture arrived under; at most {@link MAX_SOURCE_NAME} characters. */
  name: string;
}

/** The full project file. This shape is schema v10, verbatim. */
export interface ProjectFile {
  schemaVersion: typeof SCHEMA_VERSION;
  /**
   * Set by {@link parseProject} when the document was migrated from
   * an older schema — the caller owes the D114 visible note. Never
   * serialised; save → load → save stays byte-identical.
   */
  migratedFrom?: number;
  /** The picture's entry in the package, or null for settings only (schema v10, DUR-01). */
  source: ProjectSource | null;
  pipeline: ProjectPipeline;
  /** `null` = full-RGB mode: no colour reduction, no dithering (§5.1). */
  palette: ProjectPalette | null;
  /** Symbol grants, queue, and overrides (schema v6, M9). */
  symbols: ProjectSymbols;
  /** Screen + print styling and preset provenance (schema v7, M11). */
  gridStyle: ProjectGridBlock;
  preview: ProjectPreview;
  export: ProjectExport;
  /** Fabric and thread-estimation settings (schema v9, M12). */
  estimates: EstimateSettings;
}

/** The v2 preview block a migrated v1 file gets: fit to the space. */
export const DEFAULT_PREVIEW: ProjectPreview = { mode: 'space', cssPxPerStitch: 1 };

/** What names a saved file (SAVE-01), in order of preference. */
export interface ProjectNameParts {
  /** The Design title field — the owner's own name for the design; may be empty. */
  title: string;
  width: number;
  height: number;
  /** The picture's name (a filename or a capture label), or null without one. */
  sourceName: string | null;
  /** A {@link projectStamp} value, used only when neither name exists. */
  stamp: string;
}

/** Longest name stem a download keeps readable; the size suffix follows it. */
const MAX_NAME_STEM = 60;

/**
 * A filename-safe stem from free text: the characters every filesystem
 * refuses (`/ \ : * ? " < > |` and controls) and runs of whitespace
 * become single dashes, letters and digits of any script survive, and
 * trailing dots or dashes go (Windows drops a trailing dot silently).
 * Empty when nothing survives — the caller falls through to its next
 * name, never to a bare dash.
 */
function nameStem(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_NAME_STEM)
    .replace(/[-.]+$/g, '');
}

/** `YYYYMMDD-HHMM` in local time — the stamp a nameless design saves under. */
export function projectStamp(date: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${String(date.getFullYear())}${two(date.getMonth() + 1)}${two(date.getDate())}-${two(date.getHours())}${two(date.getMinutes())}`;
}

/**
 * Download name for a saved project (SAVE-01): the Design title names
 * the file; without one the picture's name does (minus its extension);
 * without either the stamp does — so two untitled 200 × 200 designs
 * saved minutes apart never collide, which the old grid-only name
 * guaranteed they would. The grid size always follows, e.g.
 * `Fox-sketch-200x150.pmproj`.
 */
export function projectFilename(parts: ProjectNameParts): string {
  const fromTitle = nameStem(parts.title);
  const fromSource =
    parts.sourceName === null ? '' : nameStem(parts.sourceName.replace(/\.[A-Za-z0-9]{1,5}$/, ''));
  const stem = fromTitle !== '' ? fromTitle : fromSource !== '' ? fromSource : `design-${parts.stamp}`;
  return `${stem}-${String(parts.width)}x${String(parts.height)}${PROJECT_EXTENSION}`;
}

/**
 * Serialise to canonical JSON: fixed field order (the interface
 * order above), 2-space indent, trailing newline. Reconstructing the
 * object here — rather than stringifying the input as-is — is what
 * makes save → load → save byte-identical regardless of the key
 * order the caller assembled.
 */
/** Canonical field order for one persisted thread. */
function canonicalThread(thread: Thread): Thread {
  return {
    id: thread.id,
    brandId: thread.brandId,
    reference: thread.reference,
    name: thread.name,
    hex: thread.hex,
    rgb: [thread.rgb[0], thread.rgb[1], thread.rgb[2]],
    provenance: thread.provenance,
    status: thread.status,
    mappedFrom: thread.mappedFrom,
  };
}

/** Canonical field order for one range rule (only present poles). */
function canonicalRange(rule: HsbRangeRule): HsbRangeRule {
  const out: HsbRangeRule = {};
  if (rule.hue !== undefined) out.hue = [rule.hue[0], rule.hue[1]];
  if (rule.saturation !== undefined) out.saturation = [rule.saturation[0], rule.saturation[1]];
  if (rule.brightness !== undefined) {
    out.brightness = [rule.brightness[0], rule.brightness[1]];
  }
  return out;
}

/** Canonical field order for the palette block (schema v5). */
function canonicalPalette(palette: ProjectPalette): ProjectPalette {
  return {
    profileRef:
      palette.profileRef === null
        ? null
        : { id: palette.profileRef.id, revision: palette.profileRef.revision },
    recipe: {
      libraries: [...palette.recipe.libraries],
      ownedOnly: palette.recipe.ownedOnly,
      include: [...palette.recipe.include],
      exclude: [...palette.recipe.exclude],
      ranges: palette.recipe.ranges.map(canonicalRange),
    },
    design: {
      count: { mode: palette.design.count.mode, n: palette.design.count.n },
      minDistance: palette.design.minDistance,
      mustUse: [...palette.design.mustUse],
      swaps: palette.design.swaps.map((swap) => ({
        from: swap.from,
        to: canonicalThread(swap.to),
      })),
    },
    snapshot: palette.snapshot.map(canonicalThread),
  };
}

/** Canonical field order for one thread → symbol pair. */
function canonicalPairs(pairs: SymbolPair[]): SymbolPair[] {
  return pairs.map((p) => ({ threadId: p.threadId, symbolId: p.symbolId }));
}

/** Canonical field order for the symbols block (schema v6). */
function canonicalSymbols(symbols: ProjectSymbols): ProjectSymbols {
  return {
    assigned: canonicalPairs(symbols.assigned),
    queue: [...symbols.queue],
    overrides: canonicalPairs(symbols.overrides),
  };
}

/** Canonical field order for one grid style-values half (schema v7). */
function canonicalGridValues(values: ProjectGridStyle): ProjectGridStyle {
  return {
    show: values.show,
    minorInterval: values.minorInterval,
    majorInterval: values.majorInterval,
    color: values.color,
    majorColor: values.majorColor,
    minorThickness: values.minorThickness,
    majorThickness: values.majorThickness,
    opacity: values.opacity,
    minorDash: values.minorDash,
    borderThickness: values.borderThickness,
    borderColor: values.borderColor,
    ticks: values.ticks,
    tickFontPx: values.tickFontPx,
  };
}

/** Canonical field order for the dither union, per algorithm family. */
function canonicalDither(dither: DitherConfig): DitherConfig {
  if (dither.algorithm === 'none') return { algorithm: 'none' };
  if ('serpentine' in dither) {
    return {
      algorithm: dither.algorithm,
      serpentine: dither.serpentine,
      strength: dither.strength,
    };
  }
  return { algorithm: dither.algorithm, strength: dither.strength };
}

export function serializeProject(file: ProjectFile): string {
  const canonical: ProjectFile = {
    schemaVersion: file.schemaVersion,
    source:
      file.source === null
        ? null
        : { entry: file.source.entry, type: file.source.type, name: file.source.name },
    pipeline: {
      preset: file.pipeline.preset,
      grid: { width: file.pipeline.grid.width, height: file.pipeline.grid.height },
      resizeMode: file.pipeline.resizeMode,
      metric: file.pipeline.metric,
      dither: canonicalDither(file.pipeline.dither),
      ditherProfileRef:
        file.pipeline.ditherProfileRef === null
          ? null
          : {
              id: file.pipeline.ditherProfileRef.id,
              revision: file.pipeline.ditherProfileRef.revision,
            },
    },
    palette: file.palette === null ? null : canonicalPalette(file.palette),
    symbols: canonicalSymbols(file.symbols),
    gridStyle: {
      screen: canonicalGridValues(file.gridStyle.screen),
      print: canonicalGridValues(file.gridStyle.print),
      preset: file.gridStyle.preset,
    },
    preview: {
      mode: file.preview.mode,
      cssPxPerStitch: file.preview.cssPxPerStitch,
    },
    export: {
      scale: file.export.scale,
      background: file.export.background,
      color: file.export.color,
      chartCell: file.export.chartCell,
      chartMode: file.export.chartMode,
      pdf: {
        pageSize: file.export.pdf.pageSize,
        orientation: file.export.pdf.orientation,
        marginMm: file.export.pdf.marginMm,
        title: file.export.pdf.title,
        pages: file.export.pdf.pages,
        stitchesPerPage: file.export.pdf.stitchesPerPage,
        overlapStitches: file.export.pdf.overlapStitches,
      },
    },
    estimates: {
      fabricCount: file.estimates.fabricCount,
      marginCm: file.estimates.marginCm,
      strands: file.estimates.strands,
      routingFactor: file.estimates.routingFactor,
      wasteShare: file.estimates.wasteShare,
      skeinMetres: file.estimates.skeinMetres,
    },
  };
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

/** Throw a descriptive schema error naming the offending path. */
function fail(path: string, want: string): never {
  throw new Error(`${path}: expected ${want}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object');
  }
  return value as Record<string, unknown>;
}

function asBool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'true or false');
  return value;
}

function asInt(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(path, `a whole number between ${min} and ${max}`);
  }
  return value;
}

/**
 * A finite (possibly fractional) number in range. Distinct from
 * {@link asInt} because preview scale is a continuous zoom, not a
 * count — rounding it to whole pixels per stitch would quantise the
 * zoom to 100 % steps.
 */
function asNumber(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(path, `a number between ${min} and ${max}`);
  }
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'a string');
  return value;
}

function asHexColor(value: unknown, path: string): string {
  const text = asString(value, path);
  if (!/^#[0-9a-f]{6}$/i.test(text)) fail(path, 'a #rrggbb colour');
  return text;
}

function asOneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(path, allowed.map((v) => `"${v}"`).join(' or '));
  }
  return value as T;
}

/** An array of strings, each within a sane length. */
function asIdList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, 'an array of thread ids');
  if (value.length > MAX_PALETTE_ENTRIES) {
    fail(path, `at most ${String(MAX_PALETTE_ENTRIES)} entries`);
  }
  return value.map((entry, i) => {
    const id = asString(entry, `${path}[${String(i)}]`);
    if (id.length === 0 || id.length > 128) {
      fail(`${path}[${String(i)}]`, 'a thread id of 1–128 characters');
    }
    return id;
  });
}

/**
 * Validate the v11 swap list. Each `from` must be unique — the UI
 * re-targets a swap rather than adding a second rule for the same
 * entry, so a duplicate can only mean a hand-edited file, and refusing
 * it beats guessing which rule wins. The list shares the snapshot's
 * ceiling; the render palette it can produce is bounded by the
 * selected entries plus these targets, far below the sidecar's
 * `EMPTY_INDEX`.
 */
function asSwaps(value: unknown, path: string): ThreadSwap[] {
  if (!Array.isArray(value)) fail(path, 'an array of colour swaps');
  if (value.length > MAX_PALETTE_ENTRIES) {
    fail(path, `at most ${String(MAX_PALETTE_ENTRIES)} entries`);
  }
  const seen = new Set<string>();
  return value.map((entry, i) => {
    const raw = asRecord(entry, `${path}[${String(i)}]`);
    const from = asString(raw['from'], `${path}[${String(i)}].from`);
    if (from.length === 0 || from.length > 128) {
      fail(`${path}[${String(i)}].from`, 'a thread id of 1–128 characters');
    }
    if (seen.has(from)) fail(`${path}[${String(i)}].from`, 'a thread id swapped only once');
    seen.add(from);
    return { from, to: asThread(raw['to'], `${path}[${String(i)}].to`) };
  });
}

/** Validate one persisted thread record. */
function asThread(value: unknown, path: string): Thread {
  const raw = asRecord(value, path);
  const rgb = raw['rgb'];
  if (!Array.isArray(rgb) || rgb.length !== 3) fail(`${path}.rgb`, 'three channel values');
  const provenance: Provenance = asOneOf(raw['provenance'], `${path}.provenance`, [
    'measured',
    'mapped',
  ]);
  const status: ThreadStatus = asOneOf(raw['status'], `${path}.status`, [
    'current',
    'retired',
    'unresolved',
  ]);
  const mappedFrom = raw['mappedFrom'];
  if (mappedFrom !== null && typeof mappedFrom !== 'string') {
    fail(`${path}.mappedFrom`, 'a thread id or null');
  }
  return {
    id: asString(raw['id'], `${path}.id`),
    brandId: asString(raw['brandId'], `${path}.brandId`),
    reference: asString(raw['reference'], `${path}.reference`),
    name: asString(raw['name'], `${path}.name`),
    hex: asHexColor(raw['hex'], `${path}.hex`),
    rgb: [
      asInt(rgb[0], `${path}.rgb[0]`, 0, 255),
      asInt(rgb[1], `${path}.rgb[1]`, 0, 255),
      asInt(rgb[2], `${path}.rgb[2]`, 0, 255),
    ],
    provenance,
    status,
    mappedFrom,
  };
}

/** Validate one optional two-pole range pair. */
function asPole(
  value: unknown,
  path: string,
  max: number,
): [number, number] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== 2) fail(path, 'a two-number range');
  return [asNumber(value[0], `${path}[0]`, 0, max), asNumber(value[1], `${path}[1]`, 0, max)];
}

/** Validate one H/S/B range rule. */
function asRangeRule(value: unknown, path: string): HsbRangeRule {
  const raw = asRecord(value, path);
  const rule: HsbRangeRule = {};
  const hue = asPole(raw['hue'], `${path}.hue`, 360);
  const saturation = asPole(raw['saturation'], `${path}.saturation`, 100);
  const brightness = asPole(raw['brightness'], `${path}.brightness`, 100);
  if (hue !== undefined) rule.hue = hue;
  if (saturation !== undefined) rule.saturation = saturation;
  if (brightness !== undefined) rule.brightness = brightness;
  return rule;
}

/** Validate the v5 recipe block. */
function asRecipe(value: unknown, path: string): ColorProfileRecipe {
  const raw = asRecord(value, path);
  const ranges = raw['ranges'];
  if (!Array.isArray(ranges)) fail(`${path}.ranges`, 'an array of range rules');
  if (ranges.length > 64) fail(`${path}.ranges`, 'at most 64 range rules');
  return {
    libraries: asIdList(raw['libraries'], `${path}.libraries`),
    ownedOnly: asBool(raw['ownedOnly'], `${path}.ownedOnly`),
    include: asIdList(raw['include'], `${path}.include`),
    exclude: asIdList(raw['exclude'], `${path}.exclude`),
    ranges: ranges.map((rule, i) => asRangeRule(rule, `${path}.ranges[${String(i)}]`)),
  };
}

/**
 * Validate the v5 palette block. `null` is full-RGB mode.
 *
 * Every list is length-checked before its elements are walked, because
 * a project file arrives from a download folder, not from this app
 * (AGENTS.md → "Correctness & data": project files are user data).
 */
function parsePalette(value: unknown): ProjectPalette | null {
  if (value === null || value === undefined) return null;
  const raw = asRecord(value, 'palette');
  const refRaw = raw['profileRef'];
  let profileRef: { id: string; revision: number } | null = null;
  if (refRaw !== null && refRaw !== undefined) {
    const ref = asRecord(refRaw, 'palette.profileRef');
    profileRef = {
      id: asString(ref['id'], 'palette.profileRef.id'),
      revision: asInt(ref['revision'], 'palette.profileRef.revision', 0, Number.MAX_SAFE_INTEGER),
    };
  }
  const designRaw = asRecord(raw['design'], 'palette.design');
  const countRaw = asRecord(designRaw['count'], 'palette.design.count');
  const mode: CountMode = asOneOf(countRaw['mode'], 'palette.design.count.mode', [
    'all',
    'max',
    'exact',
  ]);
  const snapshotRaw = raw['snapshot'];
  if (!Array.isArray(snapshotRaw)) fail('palette.snapshot', 'an array of threads');
  if (snapshotRaw.length > MAX_PALETTE_ENTRIES) {
    fail('palette.snapshot', `at most ${String(MAX_PALETTE_ENTRIES)} entries`);
  }
  return {
    profileRef,
    recipe: asRecipe(raw['recipe'], 'palette.recipe'),
    design: {
      count: {
        mode,
        n: asInt(countRaw['n'], 'palette.design.count.n', 1, MAX_PALETTE_ENTRIES),
      },
      minDistance: asNumber(designRaw['minDistance'], 'palette.design.minDistance', 0, 200),
      mustUse: asIdList(designRaw['mustUse'], 'palette.design.mustUse'),
      swaps: asSwaps(designRaw['swaps'], 'palette.design.swaps'),
    },
    snapshot: snapshotRaw.map((entry, i) => asThread(entry, `palette.snapshot[${String(i)}]`)),
  };
}

/** Validate one thread → symbol pair list (grants or overrides). */
function asSymbolPairs(value: unknown, path: string): SymbolPair[] {
  if (!Array.isArray(value)) fail(path, 'an array of thread–symbol pairs');
  if (value.length > MAX_PALETTE_ENTRIES) {
    fail(path, `at most ${String(MAX_PALETTE_ENTRIES)} entries`);
  }
  return value.map((entry, i) => {
    const raw = asRecord(entry, `${path}[${String(i)}]`);
    const threadId = asString(raw['threadId'], `${path}[${String(i)}].threadId`);
    const symbolId = asString(raw['symbolId'], `${path}[${String(i)}].symbolId`);
    if (threadId.length === 0 || threadId.length > 128) {
      fail(`${path}[${String(i)}].threadId`, 'a thread id of 1–128 characters');
    }
    if (symbolId.length === 0 || symbolId.length > 128) {
      fail(`${path}[${String(i)}].symbolId`, 'a symbol id of 1–128 characters');
    }
    return { threadId, symbolId };
  });
}

/** Validate one v7 grid style-values half. */
function parseGridValues(value: unknown, path: string): ProjectGridStyle {
  const raw = asRecord(value, path);
  return {
    show: asBool(raw['show'], `${path}.show`),
    minorInterval: asInt(raw['minorInterval'], `${path}.minorInterval`, 1, 1000),
    majorInterval: asInt(raw['majorInterval'], `${path}.majorInterval`, 0, 1000),
    color: asHexColor(raw['color'], `${path}.color`),
    majorColor: asHexColor(raw['majorColor'], `${path}.majorColor`),
    minorThickness: asInt(raw['minorThickness'], `${path}.minorThickness`, 1, 16),
    majorThickness: asInt(raw['majorThickness'], `${path}.majorThickness`, 1, 16),
    opacity: asNumber(raw['opacity'], `${path}.opacity`, 0, 1),
    minorDash: asBool(raw['minorDash'], `${path}.minorDash`),
    borderThickness: asInt(raw['borderThickness'], `${path}.borderThickness`, 0, 16),
    borderColor: asHexColor(raw['borderColor'], `${path}.borderColor`),
    ticks: asBool(raw['ticks'], `${path}.ticks`),
    tickFontPx: asInt(raw['tickFontPx'], `${path}.tickFontPx`, 4, 96),
  };
}

/**
 * Validate the v7 grid block. The preset id is forward-friendly: any
 * sane string is kept (a file from a newer release may name a preset
 * this build lacks — the UI shows it as Custom), only shape abuse is
 * refused.
 */
function parseGridBlock(value: unknown): ProjectGridBlock {
  const raw = asRecord(value, 'gridStyle');
  const presetRaw = raw['preset'];
  let preset: string | null = null;
  if (presetRaw !== null && presetRaw !== undefined) {
    const id = asString(presetRaw, 'gridStyle.preset');
    if (id.length === 0 || id.length > 64) {
      fail('gridStyle.preset', 'a preset id of 1–64 characters or null');
    }
    preset = id;
  }
  return {
    screen: parseGridValues(raw['screen'], 'gridStyle.screen'),
    print: parseGridValues(raw['print'], 'gridStyle.print'),
    preset,
  };
}

/** Validate the v6 symbols block. */
function parseSymbols(value: unknown): ProjectSymbols {
  const raw = asRecord(value, 'symbols');
  return {
    assigned: asSymbolPairs(raw['assigned'], 'symbols.assigned'),
    queue: asIdList(raw['queue'], 'symbols.queue'),
    overrides: asSymbolPairs(raw['overrides'], 'symbols.overrides'),
  };
}

/** Package entry names: one segment of safe characters, never a path. */
const ENTRY_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
/** A MIME type's shape (`image/png`); the decoder, not this, judges the bytes. */
const MIME_TYPE = /^[a-z0-9][a-z0-9.+-]{0,63}\/[a-z0-9][a-z0-9.+-]{0,63}$/i;

/**
 * Validate the v10 source block; `null` (or absent, the forward-
 * friendly reading) is a settings-only project. The entry name is the
 * one field that reaches the package reader by value, so it is the one
 * that must never carry a path.
 */
function parseSource(value: unknown): ProjectSource | null {
  if (value === null || value === undefined) return null;
  const raw = asRecord(value, 'source');
  const entry = asString(raw['entry'], 'source.entry');
  if (!ENTRY_NAME.test(entry)) {
    fail('source.entry', 'an entry name of 1–64 letters, digits, dots, dashes or underscores');
  }
  const type = asString(raw['type'], 'source.type');
  if (!MIME_TYPE.test(type)) fail('source.type', 'a MIME type such as "image/png"');
  const name = asString(raw['name'], 'source.name');
  if (name.length > MAX_SOURCE_NAME) {
    fail('source.name', `a name of at most ${String(MAX_SOURCE_NAME)} characters`);
  }
  return { entry, type, name };
}

/** Validate the optional dither profile reference (absent = null). */
function parseDitherRef(value: unknown): { id: string; revision: number } | null {
  if (value === null || value === undefined) return null;
  const raw = asRecord(value, 'pipeline.ditherProfileRef');
  return {
    id: asString(raw['id'], 'pipeline.ditherProfileRef.id'),
    revision: asInt(
      raw['revision'],
      'pipeline.ditherProfileRef.revision',
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}

/**
 * Validate the v4 dither union. Strength bounds are per-family: a
 * diffusion strength is a fraction of the error (0–1), a threshold
 * strength scales the base amplitude (0–2) — see `DitherConfig`.
 */
function parseDither(value: unknown): DitherConfig {
  const raw = asRecord(value, 'pipeline.dither');
  const algorithm = asOneOf(raw['algorithm'], 'pipeline.dither.algorithm', [
    'none',
    'floyd-steinberg',
    'atkinson',
    'jarvis',
    'ordered',
    'blue-noise',
  ]);
  if (algorithm === 'none') return { algorithm };
  if (algorithm === 'ordered' || algorithm === 'blue-noise') {
    return {
      algorithm,
      strength: asNumber(raw['strength'], 'pipeline.dither.strength', 0, 2),
    };
  }
  return {
    algorithm,
    serpentine: asBool(raw['serpentine'], 'pipeline.dither.serpentine'),
    strength: asNumber(raw['strength'], 'pipeline.dither.strength', 0, 1),
  };
}

/**
 * Migrate a raw parsed document from `version` up to SCHEMA_VERSION.
 * Each bump adds its forward step here — loading an older file must
 * migrate, never fail (AGENTS.md).
 */
function migrateProject(raw: Record<string, unknown>, version: number): Record<string, unknown> {
  let doc = raw;
  let at = version;
  while (at < SCHEMA_VERSION) {
    at += 1;
    // v1 → v2: preview scale became project data (M6-VIEW-01). v1
    // files reopened at whatever the view happened to be; fitting to
    // the space is that behaviour named rather than changed.
    if (at === 2) doc = { ...doc, preview: { ...DEFAULT_PREVIEW } };
    // v2 → v3: `pipeline.palette` was a bare name ("DMC" or null).
    // That name becomes an enabled-brand policy with no snapshot: a v2
    // file only ever meant "every DMC thread", which the policy states
    // exactly. The empty snapshot is honest — the file never carried
    // the thread data, so there is nothing to reproduce from, and the
    // first resolve fills it.
    if (at === 3) doc = migrateV2Palette(doc);
    // v3 → v4: the Boolean `dither` (+ top-level `serpentine`) became
    // the discriminated DitherConfig (M8-ALG-01). `true` only ever
    // meant Floyd–Steinberg at full strength with the stored scan
    // direction, which the union states exactly — rendered output is
    // unchanged. `false` becomes 'none'; its stored serpentine had no
    // effect and is dropped.
    if (at === 4) doc = migrateV3Dither(doc);
    // v4 → v5: the policy half becomes the design's recipe copy plus
    // design-layer rules (M15-PERSIST-01, under the D114 waiver:
    // semantics best-effort, snapshot authoritative, caller shows the
    // note). Brands-sourced policies map straight across; library and
    // strict-preset sources become explicit membership from the
    // snapshot — exactly what rendered — falling back to the enabled
    // brands when the file never ran; a prefer-mode preset keeps its
    // open universe (the steering half retired with the prefer rule).
    if (at === 5) doc = migrateV4Palette(doc);
    // v5 → v6: symbol assignment and the chart mode arrive (M9). Older
    // files never granted a symbol, which the empty block states
    // exactly — the app's reconcile fills the queue from its own
    // catalogue. Charts painted colour cells, so that is the mode.
    if (at === 6) doc = migrateV5Symbols(doc);
    // v6 → v7: the single grid style splits into screen + print
    // halves with preset provenance (M11).
    if (at === 7) doc = migrateV6GridStyle(doc);
    // v7 → v8: PDF pagination arrives (M10). Older files exported one
    // fitted page, which 'single' states exactly; the grid-mode
    // numbers are the UI defaults, inert until the mode is chosen.
    if (at === 8) doc = migrateV7PdfPages(doc);
    // v8 → v9: fabric and thread-estimation settings arrive (M12).
    // Older files never chose a fabric; the documented defaults are
    // exactly the model the readouts would have shown.
    if (at === 9 && doc['estimates'] === undefined) {
      doc = { ...doc, estimates: { ...DEFAULT_ESTIMATES } };
    }
    // v9 → v10: the picture joins the saved file (DUR-01). Older files
    // never carried one, which `source: null` states exactly — they
    // keep applying their settings to the next imported image.
    if (at === 10 && doc['source'] === undefined) doc = { ...doc, source: null };
    // v10 → v11: colour swaps join the design rules (ICE-RECOLOUR-01).
    // Older files never swapped a thread, which the empty list states
    // exactly; a full-RGB file (`palette: null`) has no rules to seed.
    if (at === 11) doc = migrateV10Swaps(doc);
    doc = { ...doc, schemaVersion: at };
  }
  return doc;
}

/** Seed `palette.design.swaps` as empty where a palette block exists. */
function migrateV10Swaps(doc: Record<string, unknown>): Record<string, unknown> {
  const palette = doc['palette'];
  if (palette === null || typeof palette !== 'object') return doc;
  const paletteRaw = palette as Record<string, unknown>;
  const design = paletteRaw['design'];
  if (design === null || typeof design !== 'object') return doc;
  const designRaw = design as Record<string, unknown>;
  if (designRaw['swaps'] !== undefined) return doc;
  return { ...doc, palette: { ...paletteRaw, design: { ...designRaw, swaps: [] } } };
}

/** Add the v8 PDF pagination fields, filling only what is absent. */
function migrateV7PdfPages(doc: Record<string, unknown>): Record<string, unknown> {
  const exportPrefs = asRecord(doc['export'], 'export');
  const pdf = {
    pages: 'single',
    stitchesPerPage: 60,
    overlapStitches: 2,
    ...asRecord(exportPrefs['pdf'], 'export.pdf'),
  };
  return { ...doc, export: { ...exportPrefs, pdf } };
}

/**
 * Split the v6 flat grid style into the v7 screen/print pair (M11).
 * Both halves seed from the one block that previously drove both
 * surfaces, and the new fields take their appearance-preserving
 * identities (full opacity, solid, no border, major sharing the line
 * colour) — a migrated file renders exactly as it did. The preset
 * label attaches only when the seeded values byte-match a built-in
 * (an untouched v6 file is exactly "Every 10"); anything else is
 * honestly Custom. Field values pass through raw — the validator
 * after migration is the judge, and a mismatch simply never matches
 * a preset.
 */
function migrateV6GridStyle(doc: Record<string, unknown>): Record<string, unknown> {
  const old = asRecord(doc['gridStyle'], 'gridStyle');
  const half = (): Record<string, unknown> => ({
    show: old['show'],
    minorInterval: old['minorInterval'],
    majorInterval: old['majorInterval'],
    color: old['color'],
    majorColor: old['color'],
    minorThickness: old['minorThickness'],
    majorThickness: old['majorThickness'],
    opacity: 1,
    minorDash: false,
    borderThickness: 0,
    borderColor: old['color'],
    ticks: old['ticks'],
    tickFontPx: old['tickFontPx'],
  });
  const screen = half();
  const print = half();
  const preset = matchGridPreset(
    screen as unknown as GridStyleValues,
    print as unknown as GridStyleValues,
  );
  return { ...doc, gridStyle: { screen, print, preset } };
}

/** Lift the v4 policy palette block into the v5 recipe shape. */
function migrateV4Palette(doc: Record<string, unknown>): Record<string, unknown> {
  const paletteRaw = doc['palette'];
  if (paletteRaw === null || paletteRaw === undefined) return doc;
  const raw = asRecord(paletteRaw, 'palette');
  const policy = asRecord(raw['policy'], 'palette.policy');
  const count = asRecord(policy['count'], 'palette.policy.count');
  const source = asRecord(policy['source'], 'palette.policy.source');
  const kind = source['kind'];
  const snapshot = Array.isArray(raw['snapshot']) ? raw['snapshot'] : [];
  const snapshotIds = snapshot
    .map((t) => (typeof t === 'object' && t !== null ? (t as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string');
  const brands = Array.isArray(policy['brands']) ? (policy['brands'] as string[]) : [];
  const explicit =
    (kind === 'library' || (kind === 'preset' && source['mode'] === 'strict')) &&
    snapshotIds.length > 0;
  const recipe = {
    libraries: explicit ? [] : [...brands],
    ownedOnly: policy['ownedOnly'] === true,
    include: explicit ? snapshotIds : [],
    exclude: Array.isArray(policy['excluded']) ? [...(policy['excluded'] as string[])] : [],
    ranges: [],
  };
  return {
    ...doc,
    palette: {
      profileRef: null,
      recipe,
      design: {
        count: { mode: count['mode'], n: count['n'] },
        minDistance: 0,
        mustUse: Array.isArray(policy['locked']) ? [...(policy['locked'] as string[])] : [],
      },
      snapshot,
    },
  };
}

/**
 * Add the v6 symbols block and chart mode to a v5 document. Defaults
 * fill only what is absent, so a document that somehow already carries
 * either field keeps it (and the validator then judges it).
 */
function migrateV5Symbols(doc: Record<string, unknown>): Record<string, unknown> {
  const exportPrefs = { chartMode: 'color', ...asRecord(doc['export'], 'export') };
  return {
    symbols: { assigned: [], queue: [], overrides: [] },
    ...doc,
    export: exportPrefs,
  };
}

/** Lift the v3 Boolean dither + serpentine pair into the v4 union. */
function migrateV3Dither(doc: Record<string, unknown>): Record<string, unknown> {
  const pipeline = { ...asRecord(doc['pipeline'], 'pipeline') };
  const on = asBool(pipeline['dither'], 'pipeline.dither');
  const serpentine = asBool(pipeline['serpentine'], 'pipeline.serpentine');
  delete pipeline['serpentine'];
  pipeline['dither'] = on
    ? { algorithm: 'floyd-steinberg', serpentine, strength: 1 }
    : { algorithm: 'none' };
  return { ...doc, pipeline };
}

/** Lift a v2 `pipeline.palette` name into the v3 palette block. */
function migrateV2Palette(doc: Record<string, unknown>): Record<string, unknown> {
  const pipeline = { ...asRecord(doc['pipeline'], 'pipeline') };
  const name = pipeline['palette'];
  delete pipeline['palette'];
  const palette =
    name === null || name === undefined
      ? null
      : {
          policy: {
            brands: ['dmc'],
            source: { kind: 'brands' },
            ownedOnly: false,
            count: { mode: 'all', n: 20 },
            locked: [],
            preferred: [],
            excluded: [],
          },
          snapshot: [],
        };
  return { ...doc, pipeline, palette };
}

/**
 * Parse and validate a project-file JSON string. Unknown extra
 * fields are ignored (forward-friendly); wrong types, out-of-range
 * values, and unknown enum members throw an `Error` whose message
 * names the offending path. A `schemaVersion` newer than this app
 * fails with a clear message rather than misreading the file.
 */
export function parseProject(json: string): ProjectFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = asRecord(raw, 'project');
  const version = asInt(root['schemaVersion'], 'schemaVersion', 1, Number.MAX_SAFE_INTEGER);
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion ${version} was saved by a newer version of Pattern Mapper (this app reads up to ${SCHEMA_VERSION})`,
    );
  }
  const doc = migrateProject(root, version);
  const migratedFrom = version < SCHEMA_VERSION ? version : undefined;

  const pipeline = asRecord(doc['pipeline'], 'pipeline');
  const grid = asRecord(pipeline['grid'], 'pipeline.grid');
  const preview = asRecord(doc['preview'], 'preview');
  const exportPrefs = asRecord(doc['export'], 'export');
  const pdf = asRecord(exportPrefs['pdf'], 'export.pdf');
  const estimates = asRecord(doc['estimates'], 'estimates');

  return {
    schemaVersion: SCHEMA_VERSION,
    ...(migratedFrom === undefined ? {} : { migratedFrom }),
    source: parseSource(doc['source']),
    pipeline: {
      preset: asOneOf(pipeline['preset'], 'pipeline.preset', ['resize-first', 'reduce-first']),
      grid: {
        width: asInt(grid['width'], 'pipeline.grid.width', 1, MAX_GRID_SIDE),
        height: asInt(grid['height'], 'pipeline.grid.height', 1, MAX_GRID_SIDE),
      },
      resizeMode: asOneOf(pipeline['resizeMode'], 'pipeline.resizeMode', [
        'stretch',
        'contain',
        'cover',
        'fit',
      ]),
      metric: asOneOf(pipeline['metric'], 'pipeline.metric', ['rgb', 'lab']),
      dither: parseDither(pipeline['dither']),
      ditherProfileRef: parseDitherRef(pipeline['ditherProfileRef']),
    },
    palette: parsePalette(doc['palette']),
    symbols: parseSymbols(doc['symbols']),
    gridStyle: parseGridBlock(doc['gridStyle']),
    preview: {
      mode: asOneOf(preview['mode'], 'preview.mode', ['space', 'width', 'height', 'manual']),
      cssPxPerStitch: asNumber(
        preview['cssPxPerStitch'],
        'preview.cssPxPerStitch',
        MIN_PREVIEW_CSS_PX,
        MAX_PREVIEW_CSS_PX,
      ),
    },
    export: {
      scale: asInt(exportPrefs['scale'], 'export.scale', 1, 1024),
      background: asOneOf(exportPrefs['background'], 'export.background', [
        'transparent',
        'solid',
      ]),
      color: asHexColor(exportPrefs['color'], 'export.color'),
      chartCell: asInt(exportPrefs['chartCell'], 'export.chartCell', 1, 256),
      chartMode: asOneOf(exportPrefs['chartMode'], 'export.chartMode', [
        'color',
        'symbols',
        'color-symbols',
      ]),
      pdf: {
        pageSize: asOneOf(pdf['pageSize'], 'export.pdf.pageSize', ['a4', 'letter']),
        orientation: asOneOf(pdf['orientation'], 'export.pdf.orientation', [
          'portrait',
          'landscape',
        ]),
        marginMm: asInt(pdf['marginMm'], 'export.pdf.marginMm', 0, 100),
        title: asString(pdf['title'], 'export.pdf.title'),
        pages: asOneOf(pdf['pages'], 'export.pdf.pages', ['single', 'grid']),
        stitchesPerPage: asInt(pdf['stitchesPerPage'], 'export.pdf.stitchesPerPage', 1, 1024),
        overlapStitches: asInt(pdf['overlapStitches'], 'export.pdf.overlapStitches', 0, 50),
      },
    },
    estimates: {
      fabricCount: asNumber(estimates['fabricCount'], 'estimates.fabricCount', 1, 60),
      marginCm: asNumber(estimates['marginCm'], 'estimates.marginCm', 0, 50),
      strands: asInt(estimates['strands'], 'estimates.strands', 1, 6),
      routingFactor: asNumber(estimates['routingFactor'], 'estimates.routingFactor', 1, 5),
      wasteShare: asNumber(estimates['wasteShare'], 'estimates.wasteShare', 0, 1),
      skeinMetres: asNumber(estimates['skeinMetres'], 'estimates.skeinMetres', 1, 100),
    },
  };
}
