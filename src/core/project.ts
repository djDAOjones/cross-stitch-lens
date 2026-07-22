/**
 * Versioned JSON project file (§20 MVP subset): schema, migration,
 * and (de)serialisation. The interfaces below ARE the documented
 * schema — stage params objects are the single source of truth for
 * both UI controls and the project file (conventions.md).
 *
 * v1 persists settings only: the pipeline configuration (palette by
 * name reference, not data), chart/grid styling, and export
 * preferences. The source image is not embedded — a loaded project
 * applies its settings to the next imported image; source references
 * arrive with live capture (M4).
 *
 * Invariants (AGENTS.md): loaders migrate older `schemaVersion`s
 * forward, never fail on them; save → load → save is byte-identical,
 * guaranteed by `serializeProject` emitting a canonical field order
 * and `parseProject` reconstructing exactly that shape.
 */

import type { ColorMetric } from './color/metrics.ts';
import type { CountMode, PalettePolicy, PresetMode } from './palette-policy.ts';
import type { DitherConfig, OrderPreset } from './pipeline/config.ts';
import type { ResizeMode } from './pipeline/resize.ts';
import type { Provenance, Thread, ThreadStatus } from './types.ts';

/** Current project-file schema version. Bump with a forward migration. */
export const SCHEMA_VERSION = 4;

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
}

/**
 * The palette block (schema v3). Two halves, deliberately:
 *
 * - `policy` is the user's **intent** — enabled brands, chosen source,
 *   inventory restriction, count request, locks. It is what the UI
 *   shows and what a "refresh" recomputes from.
 * - `snapshot` is the exact ordered thread data that **rendered** this
 *   project. It is authoritative on reopen.
 *
 * Storing only the policy would mean a project's output changed when
 * the catalogue shipped a new colour, or when the user edited the
 * library palette it names. Storing only the snapshot would lose the
 * intent, so nothing could ever be recomputed. Both, and reopen is
 * reproducible *and* explicable (M7-INV-01, M7-PAL-01).
 */
export interface ProjectPalette {
  policy: PalettePolicy;
  /** Ordered threads exactly as rendered. Empty means "not yet run". */
  snapshot: Thread[];
}

/**
 * Grid/chart styling as stored (§15–§16 subset), in CSS px. The
 * theme-derived tick text colour is intentionally not persisted —
 * it is recomputed from the page colour scheme at render time.
 */
export interface ProjectGridStyle {
  show: boolean;
  /** Stitches between minor lines (≥ 1). */
  minorInterval: number;
  /** Stitches between major lines; 0 disables major lines. */
  majorInterval: number;
  /** `#rrggbb` line colour shared by minor and major lines. */
  color: string;
  minorThickness: number;
  majorThickness: number;
  ticks: boolean;
  tickFontPx: number;
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
  pdf: {
    pageSize: 'a4' | 'letter';
    orientation: 'portrait' | 'landscape';
    marginMm: number;
    title: string;
  };
}

/** The full project file. This shape is schema v3, verbatim. */
export interface ProjectFile {
  schemaVersion: typeof SCHEMA_VERSION;
  pipeline: ProjectPipeline;
  /** `null` = full-RGB mode: no colour reduction, no dithering (§5.1). */
  palette: ProjectPalette | null;
  gridStyle: ProjectGridStyle;
  preview: ProjectPreview;
  export: ProjectExport;
}

/** The v2 preview block a migrated v1 file gets: fit to the space. */
export const DEFAULT_PREVIEW: ProjectPreview = { mode: 'space', cssPxPerStitch: 1 };

/** Download name from the grid size, e.g. `project-200x200.json`. */
export function projectFilename(width: number, height: number): string {
  return `project-${width}x${height}.json`;
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

/** Canonical field order for the palette source union, per kind. */
function canonicalSource(source: PalettePolicy['source']): PalettePolicy['source'] {
  if (source.kind === 'library') return { kind: 'library', paletteId: source.paletteId };
  if (source.kind === 'preset') {
    return { kind: 'preset', presetId: source.presetId, mode: source.mode };
  }
  return { kind: 'brands' };
}

/** Canonical field order for the palette block. */
function canonicalPalette(palette: ProjectPalette): ProjectPalette {
  return {
    policy: {
      brands: [...palette.policy.brands],
      source: canonicalSource(palette.policy.source),
      ownedOnly: palette.policy.ownedOnly,
      count: { mode: palette.policy.count.mode, n: palette.policy.count.n },
      locked: [...palette.policy.locked],
      preferred: [...palette.policy.preferred],
      excluded: [...palette.policy.excluded],
    },
    snapshot: palette.snapshot.map(canonicalThread),
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
    pipeline: {
      preset: file.pipeline.preset,
      grid: { width: file.pipeline.grid.width, height: file.pipeline.grid.height },
      resizeMode: file.pipeline.resizeMode,
      metric: file.pipeline.metric,
      dither: canonicalDither(file.pipeline.dither),
    },
    palette: file.palette === null ? null : canonicalPalette(file.palette),
    gridStyle: {
      show: file.gridStyle.show,
      minorInterval: file.gridStyle.minorInterval,
      majorInterval: file.gridStyle.majorInterval,
      color: file.gridStyle.color,
      minorThickness: file.gridStyle.minorThickness,
      majorThickness: file.gridStyle.majorThickness,
      ticks: file.gridStyle.ticks,
      tickFontPx: file.gridStyle.tickFontPx,
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
      pdf: {
        pageSize: file.export.pdf.pageSize,
        orientation: file.export.pdf.orientation,
        marginMm: file.export.pdf.marginMm,
        title: file.export.pdf.title,
      },
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

/** Validate the palette source union. */
function asSource(value: unknown, path: string): PalettePolicy['source'] {
  const raw = asRecord(value, path);
  const kind = asOneOf(raw['kind'], `${path}.kind`, ['brands', 'library', 'preset']);
  if (kind === 'library') {
    return { kind, paletteId: asString(raw['paletteId'], `${path}.paletteId`) };
  }
  if (kind === 'preset') {
    const mode: PresetMode = asOneOf(raw['mode'], `${path}.mode`, ['strict', 'prefer']);
    return { kind, presetId: asString(raw['presetId'], `${path}.presetId`), mode };
  }
  return { kind };
}

/**
 * Validate the v3 palette block. `null` is full-RGB mode.
 *
 * Every list is length-checked before its elements are walked, because
 * a project file arrives from a download folder, not from this app
 * (AGENTS.md → "Correctness & data": project files are user data).
 */
function parsePalette(value: unknown): ProjectPalette | null {
  if (value === null || value === undefined) return null;
  const raw = asRecord(value, 'palette');
  const policyRaw = asRecord(raw['policy'], 'palette.policy');
  const countRaw = asRecord(policyRaw['count'], 'palette.policy.count');
  const mode: CountMode = asOneOf(countRaw['mode'], 'palette.policy.count.mode', [
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
    policy: {
      brands: asIdList(policyRaw['brands'], 'palette.policy.brands'),
      source: asSource(policyRaw['source'], 'palette.policy.source'),
      ownedOnly: asBool(policyRaw['ownedOnly'], 'palette.policy.ownedOnly'),
      count: { mode, n: asInt(countRaw['n'], 'palette.policy.count.n', 1, MAX_PALETTE_ENTRIES) },
      locked: asIdList(policyRaw['locked'], 'palette.policy.locked'),
      preferred: asIdList(policyRaw['preferred'], 'palette.policy.preferred'),
      excluded: asIdList(policyRaw['excluded'], 'palette.policy.excluded'),
    },
    snapshot: snapshotRaw.map((entry, i) => asThread(entry, `palette.snapshot[${String(i)}]`)),
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
    doc = { ...doc, schemaVersion: at };
  }
  return doc;
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
      `schemaVersion ${version} was saved by a newer version of Cross Stitch Lens (this app reads up to ${SCHEMA_VERSION})`,
    );
  }
  const doc = migrateProject(root, version);

  const pipeline = asRecord(doc['pipeline'], 'pipeline');
  const grid = asRecord(pipeline['grid'], 'pipeline.grid');
  const gridStyle = asRecord(doc['gridStyle'], 'gridStyle');
  const preview = asRecord(doc['preview'], 'preview');
  const exportPrefs = asRecord(doc['export'], 'export');
  const pdf = asRecord(exportPrefs['pdf'], 'export.pdf');

  return {
    schemaVersion: SCHEMA_VERSION,
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
    },
    palette: parsePalette(doc['palette']),
    gridStyle: {
      show: asBool(gridStyle['show'], 'gridStyle.show'),
      minorInterval: asInt(gridStyle['minorInterval'], 'gridStyle.minorInterval', 1, 1000),
      majorInterval: asInt(gridStyle['majorInterval'], 'gridStyle.majorInterval', 0, 1000),
      color: asHexColor(gridStyle['color'], 'gridStyle.color'),
      minorThickness: asInt(gridStyle['minorThickness'], 'gridStyle.minorThickness', 1, 16),
      majorThickness: asInt(gridStyle['majorThickness'], 'gridStyle.majorThickness', 1, 16),
      ticks: asBool(gridStyle['ticks'], 'gridStyle.ticks'),
      tickFontPx: asInt(gridStyle['tickFontPx'], 'gridStyle.tickFontPx', 4, 96),
    },
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
      pdf: {
        pageSize: asOneOf(pdf['pageSize'], 'export.pdf.pageSize', ['a4', 'letter']),
        orientation: asOneOf(pdf['orientation'], 'export.pdf.orientation', [
          'portrait',
          'landscape',
        ]),
        marginMm: asInt(pdf['marginMm'], 'export.pdf.marginMm', 0, 100),
        title: asString(pdf['title'], 'export.pdf.title'),
      },
    },
  };
}
