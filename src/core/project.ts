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
import type { OrderPreset } from './pipeline/config.ts';
import type { ResizeMode } from './pipeline/resize.ts';

/** Current project-file schema version. Bump with a forward migration. */
export const SCHEMA_VERSION = 1;

/** Grid dimension bounds in stitches (brief: max 1024 per side). */
export const MAX_GRID_SIDE = 1024;

/**
 * Pipeline settings as stored. Mirrors `PipelineConfig` except that
 * `palette` is a name reference (e.g. "DMC") resolved by the app on
 * load — palette data is never embedded. `null` = full-RGB mode.
 */
export interface ProjectPipeline {
  preset: OrderPreset;
  /** Stitch grid, whole stitches, 1–1024 per side. */
  grid: { width: number; height: number };
  resizeMode: ResizeMode;
  palette: string | null;
  metric: ColorMetric;
  dither: boolean;
  serpentine: boolean;
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

/** The full project file. This shape is schema v1, verbatim. */
export interface ProjectFile {
  schemaVersion: typeof SCHEMA_VERSION;
  pipeline: ProjectPipeline;
  gridStyle: ProjectGridStyle;
  export: ProjectExport;
}

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
export function serializeProject(file: ProjectFile): string {
  const canonical: ProjectFile = {
    schemaVersion: file.schemaVersion,
    pipeline: {
      preset: file.pipeline.preset,
      grid: { width: file.pipeline.grid.width, height: file.pipeline.grid.height },
      resizeMode: file.pipeline.resizeMode,
      palette: file.pipeline.palette,
      metric: file.pipeline.metric,
      dither: file.pipeline.dither,
      serpentine: file.pipeline.serpentine,
    },
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

/**
 * Migrate a raw parsed document from `version` up to SCHEMA_VERSION.
 * v1 is the first schema, so this is currently a pass-through; each
 * future bump adds its forward step here (loading older files must
 * migrate, never fail — AGENTS.md).
 */
function migrateProject(raw: Record<string, unknown>, version: number): Record<string, unknown> {
  let doc = raw;
  let at = version;
  while (at < SCHEMA_VERSION) {
    // No migrations yet: v1 is the first shipped schema.
    at += 1;
    doc = { ...doc, schemaVersion: at };
  }
  return doc;
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
  const paletteRaw = pipeline['palette'];
  if (paletteRaw !== null && typeof paletteRaw !== 'string') {
    fail('pipeline.palette', 'a palette name or null');
  }
  const gridStyle = asRecord(doc['gridStyle'], 'gridStyle');
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
      palette: paletteRaw,
      metric: asOneOf(pipeline['metric'], 'pipeline.metric', ['rgb', 'lab']),
      dither: asBool(pipeline['dither'], 'pipeline.dither'),
      serpentine: asBool(pipeline['serpentine'], 'pipeline.serpentine'),
    },
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
