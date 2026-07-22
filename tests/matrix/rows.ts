/**
 * The M5F correctness and parity matrix (M5-ACCEPT-01).
 *
 * Deliberately separate from `tests/bench/workloads.ts`: that matrix is
 * frozen for *measurement* and its sources are perf-scale (1280²,
 * 1512×982). This one asks a different question — does the composed
 * pipeline stay correct across the axes a user can actually reach — so
 * its grids are small enough to run inside `check` and its palette axis
 * carries adversarial cases a benchmark has no reason to hold
 * (duplicate entries, near-ties, a palette with no near-black).
 *
 * Same shape as the bench matrix, on purpose: a mandatory core
 * cross-product plus targeted expansions that move ONE axis off core,
 * each carrying a `proves` line. Pairwise-plus-risk rather than the full
 * Cartesian product — 2 presets × 4 resize modes × 2 metrics × 2 dither
 * × 2 scans × 7 palettes × 8 grids × 4 alpha classes is 28,672 rows to
 * re-prove what the per-stage suites already hold.
 *
 * `proves` is not decoration: the published coverage table is rendered
 * from these rows by {@link renderCoverageMarkdown}, so a row that
 * cannot say what it proves cannot silently pad the matrix.
 */

import type { ColorMetric } from '../../src/core/color/metrics.ts';
import type { OrderPreset, PipelineConfig } from '../../src/core/pipeline/config.ts';
import type { DitherAlgorithm } from '../../src/core/pipeline/dither.ts';
import type { ResizeMode } from '../../src/core/pipeline/resize.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';
import { thread } from '../helpers/threads.ts';

/**
 * Palette axis. Beyond the size axis the bench matrix carries, these
 * add the adversarial entries: `dup` and `neartie` attack the
 * first-index tie-break, `nodark` is the palette that exposed the empty
 * cell diffusion defect.
 */
export type PaletteAxis =
  /** Full-RGB mode: no reduction, no dithering. */
  | 'rgb'
  /** Black + white — maximal quantisation error, so dither artefacts are loudest. */
  | 'p2'
  /** First 64 DMC threads. */
  | 'p64'
  /** The full 533-entry DMC set. */
  | 'p533'
  /** 64 threads with entry 0 repeated at index 40 — tie-break bait. */
  | 'dup'
  /** Colours one unit apart, so ΔE ties are reachable in f32. */
  | 'neartie'
  /** Nothing near black: an empty cell quantised here carries a huge error. */
  | 'nodark';

/** Alpha content class — what the colour stages meet at the edges. */
export type AlphaAxis =
  /** Fully opaque. */
  | 'opaque'
  /** Opaque source in a mode that leaves empty grid cells around it. */
  | 'letterbox'
  /** Transparent border with a soft ramp — semitransparent cells. */
  | 'ramp'
  /** Entirely transparent: every cell empty. */
  | 'empty';

/** Source content class. */
export type SourceClass = 'noise' | 'gradient' | 'flat';

/** One matrix row: a fully specified, reproducible correctness case. */
export interface MatrixRow {
  /** Derived, stable, unique. Never hand-edit. */
  id: string;
  source: SourceClass;
  grid: { width: number; height: number };
  palette: PaletteAxis;
  metric: ColorMetric;
  dither: boolean;
  /**
   * Dither method for dithered rows (M8). Omitted means the pre-M8
   * default, Floyd–Steinberg — existing row IDs stay stable.
   */
  algorithm?: DitherAlgorithm;
  /** Non-default strength (engine units); omitted means 1. */
  strength?: number;
  serpentine: boolean;
  order: OrderPreset;
  resizeMode: ResizeMode;
  alpha: AlphaAxis;
  /** What pair or invariant this row exists to prove. Required. */
  proves: string;
  /** Ceiling-grid rows, run only under MATRIX_FULL=1 (too slow for `check`). */
  heavy?: boolean;
}

type RowSpec = Omit<MatrixRow, 'id'>;

/** Derive a row ID from its axes: dot-separated, greppable, collision-free. */
export function rowId(spec: RowSpec): string {
  // The colour segment stays 'dither' for the pre-M8 default so
  // existing IDs — quoted in evidence documents — do not move; an M8
  // algorithm names itself, and a non-default strength is suffixed as
  // a percentage.
  const method =
    spec.algorithm === undefined || spec.algorithm === 'floyd-steinberg'
      ? 'dither'
      : spec.algorithm;
  const strength =
    spec.strength === undefined || spec.strength === 1
      ? ''
      : `-s${String(Math.round(spec.strength * 100))}`;
  return [
    spec.source,
    `g${String(spec.grid.width)}x${String(spec.grid.height)}`,
    spec.palette,
    spec.metric,
    spec.dither ? `${method}${strength}` : 'nodither',
    spec.serpentine ? 'serp' : 'raster',
    spec.order,
    spec.resizeMode,
    spec.alpha,
  ].join('.');
}

function row(spec: RowSpec): MatrixRow {
  return { id: rowId(spec), ...spec };
}

/** Core defaults; an expansion moves exactly one axis off these. */
const CORE: Omit<RowSpec, 'proves' | 'order' | 'metric' | 'dither'> = {
  source: 'noise',
  grid: { width: 32, height: 32 },
  palette: 'p64',
  serpentine: true,
  resizeMode: 'stretch',
  alpha: 'opaque',
};

/**
 * Mandatory cross-product: preset × metric × dither. These are the axes
 * that change which STAGES run and which backend routes (D48: metric
 * decides dither routing), so every combination has to hold.
 */
function coreMatrix(): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const order of ['resize-first', 'reduce-first'] as const) {
    for (const metric of ['lab', 'rgb'] as const) {
      for (const dither of [false, true]) {
        rows.push(
          row({
            ...CORE,
            order,
            metric,
            dither,
            proves: `${order} × ${metric} × ${dither ? 'dither' : 'reduce'} composes and routes`,
          }),
        );
      }
    }
  }
  return rows;
}

/** One axis off core, chosen where that axis carries its own risk. */
function expansions(): MatrixRow[] {
  const base = { ...CORE, order: 'resize-first' as const, metric: 'lab' as const, dither: true };
  return [
    // ---- geometry ----------------------------------------------------
    row({
      ...base,
      resizeMode: 'contain',
      alpha: 'letterbox',
      proves: 'contain letterboxes with empty cells that take no part in diffusion',
    }),
    row({
      ...base,
      resizeMode: 'cover',
      proves: 'cover crops the overflow and leaves no empty cell',
    }),
    row({
      ...base,
      resizeMode: 'fit',
      alpha: 'letterbox',
      proves: 'fit never enlarges — a smaller source is centred unscaled',
    }),
    row({
      ...base,
      grid: { width: 40, height: 11 },
      resizeMode: 'contain',
      alpha: 'letterbox',
      proves: 'non-square grid with an odd edge — row/column indexing off the square case',
    }),

    // ---- grid boundaries ---------------------------------------------
    row({
      ...base,
      grid: { width: 1, height: 1 },
      proves: 'MIN_GRID: a 1×1 grid is a whole design, not a degenerate buffer',
    }),
    row({
      ...base,
      grid: { width: 1, height: 9 },
      proves: 'single-column grid — serpentine has no horizontal run to reverse',
    }),
    row({
      ...base,
      grid: { width: 9, height: 1 },
      proves: 'single-row grid — no row below to diffuse into',
    }),
    row({
      ...base,
      grid: { width: 200, height: 200 },
      proves: 'the typical live-editing grid from the brief',
    }),
    row({
      ...base,
      grid: { width: 300, height: 300 },
      proves: 'the upper bound of the product promise (≥ 4 updates/sec at ≤ 300²)',
    }),
    row({
      ...base,
      grid: { width: 1024, height: 1024 },
      palette: 'p64',
      heavy: true,
      proves: 'MAX_GRID: the export/finishing ceiling (D47)',
    }),

    // ---- palette -----------------------------------------------------
    row({
      ...base,
      palette: 'rgb',
      dither: false,
      proves: 'full-RGB mode runs no colour stage and keeps source colours',
    }),
    row({ ...base, palette: 'p2', proves: 'two-colour palette — maximal quantisation error' }),
    row({ ...base, palette: 'p533', proves: 'full DMC set — the 533-entry scan and pruning path' }),
    row({
      ...base,
      palette: 'dup',
      proves: 'duplicate palette entries resolve to the FIRST index, both paths',
    }),
    row({
      ...base,
      palette: 'neartie',
      proves: 'near-ties are decided identically by the LUT and exact paths',
    }),
    row({
      ...base,
      palette: 'nodark',
      resizeMode: 'contain',
      alpha: 'letterbox',
      proves: 'the empty-cell diffusion defect: no near-black to absorb a phantom error',
    }),

    // ---- alpha -------------------------------------------------------
    row({ ...base, alpha: 'ramp', proves: 'semitransparent edges survive resize and reduction' }),
    row({
      ...base,
      alpha: 'empty',
      proves: 'a fully transparent source yields a fully empty design, not black',
    }),
    row({
      ...base,
      alpha: 'ramp',
      order: 'reduce-first',
      proves: 'alpha ramp under colour-work-first, where resize runs last',
    }),

    // ---- scan and content --------------------------------------------
    row({ ...base, serpentine: false, proves: 'raster scan — the un-mirrored kernel' }),
    row({
      ...base,
      serpentine: false,
      grid: { width: 16, height: 16 },
      source: 'gradient',
      proves: 'smooth gradient, raster — the content dithering is judged on',
    }),
    row({ ...base, source: 'flat', proves: 'flat blocks — long identical runs' }),
    row({
      ...base,
      source: 'gradient',
      metric: 'rgb',
      proves: 'RGB metric on a gradient — routes to wasm, no Lab conversion',
    }),

    // ---- M8 dither algorithms (D61) -----------------------------------
    row({
      ...base,
      algorithm: 'atkinson',
      source: 'gradient',
      proves: 'Atkinson kernel composes through the executor and stays on-palette',
    }),
    row({
      ...base,
      algorithm: 'jarvis',
      resizeMode: 'contain',
      alpha: 'letterbox',
      proves: 'the three-row Jarvis kernel diffuses no error across empty letterbox cells',
    }),
    row({
      ...base,
      algorithm: 'ordered',
      source: 'gradient',
      proves: 'ordered threshold dithering composes — pointwise, no error feedback',
    }),
    row({
      ...base,
      algorithm: 'blue-noise',
      source: 'gradient',
      proves: 'blue-noise threshold tile composes and repeats deterministically',
    }),
    row({
      ...base,
      algorithm: 'ordered',
      metric: 'rgb',
      proves: 'a non-FS method under rgb routes ts — the FS-only crate is never substituted',
    }),
    row({
      ...base,
      algorithm: 'atkinson',
      strength: 0.5,
      source: 'gradient',
      proves: 'a damped diffusion strength flows from config to output through the executor',
    }),
  ];
}

/** The matrix. Order is stable; IDs are unique (asserted in the suite). */
export const MATRIX: readonly MatrixRow[] = [...coreMatrix(), ...expansions()];

/** Rows that run in `check`; the ceiling grid is opt-in via MATRIX_FULL=1. */
export function activeRows(full: boolean): readonly MatrixRow[] {
  return full ? MATRIX : MATRIX.filter((r) => r.heavy !== true);
}

/** First 64 DMC threads. */
function palette64(): Palette {
  return { name: 'dmc-64', entries: loadDmcPalette().entries.slice(0, 64) };
}

/** Build a small synthetic palette from RGB triples. */
function synthetic(name: string, rgb: [number, number, number][]): Palette {
  return {
    name,
    entries: rgb.map((value, i) => thread(`S${String(i)}`, `${name}-${String(i)}`, value)),
  };
}

/** The palette a row runs against; null in full-RGB mode. */
export function paletteFor(spec: Pick<MatrixRow, 'palette'>): Palette | null {
  switch (spec.palette) {
    case 'rgb':
      return null;
    case 'p2':
      return synthetic('p2', [
        [0, 0, 0],
        [255, 255, 255],
      ]);
    case 'p64':
      return palette64();
    case 'p533':
      return loadDmcPalette();
    case 'dup': {
      // Entry 0 repeated at index 40. Every pixel that matches it must
      // still report index 0 — strict `<` in `nearestIndex`.
      const base = palette64();
      const entries = [...base.entries];
      entries[40] = { ...(entries[0] as (typeof entries)[number]) };
      return { name: 'dmc-64-dup', entries };
    }
    case 'neartie':
      // One unit apart per channel: after sRGB→Lab in f32 the two
      // distances can land within rounding of each other.
      return synthetic('neartie', [
        [100, 100, 100],
        [101, 101, 101],
        [40, 90, 160],
        [41, 91, 161],
        [255, 255, 255],
      ]);
    case 'nodark':
      return synthetic('nodark', [
        [200, 200, 200],
        [255, 255, 255],
        [220, 190, 170],
      ]);
  }
}

/** The pipeline config a row runs under. */
export function configFor(spec: MatrixRow): PipelineConfig {
  // A dithered row runs its named M8 algorithm, defaulting to the
  // pre-M8 behaviour: Floyd–Steinberg, full strength, the row's scan
  // direction. Threshold methods have no scan direction to carry.
  const algorithm = spec.algorithm ?? 'floyd-steinberg';
  const strength = spec.strength ?? 1;
  const dithered = spec.palette !== 'rgb' && spec.dither;
  return {
    preset: spec.order,
    grid: { ...spec.grid },
    resizeMode: spec.resizeMode,
    palette: paletteFor(spec),
    metric: spec.metric,
    dither: !dithered
      ? { algorithm: 'none' }
      : algorithm === 'ordered' || algorithm === 'blue-noise'
        ? { algorithm, strength }
        : { algorithm, serpentine: spec.serpentine, strength },
  };
}

/** Deterministic LCG channel stream — seeded, so runs are reproducible. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state >>> 24;
  };
}

/** Alpha for one source pixel under the row's alpha class. */
function alphaAt(alpha: AlphaAxis, x: number, y: number, w: number, h: number): number {
  switch (alpha) {
    case 'opaque':
    case 'letterbox':
      // 'letterbox' is opaque SOURCE — the empty cells come from the
      // resize mode leaving grid area the source does not cover.
      return 255;
    case 'empty':
      return 0;
    case 'ramp': {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const band = Math.max(2, Math.floor(Math.min(w, h) / 8));
      if (edge < band / 2) return 0;
      if (edge < band) return Math.round((255 * (edge - band / 2)) / (band / 2));
      return 255;
    }
  }
}

/**
 * Source dimensions for a row. Deliberately not a multiple of the grid,
 * and 2:1 for the letterbox classes so `contain`/`fit` actually leave
 * empty cells to prove something about.
 */
export function sourceDimensions(spec: MatrixRow): { width: number; height: number } {
  if (spec.alpha === 'letterbox' || spec.resizeMode === 'fit') {
    return { width: 2 * Math.max(4, spec.grid.width), height: Math.max(4, spec.grid.height) };
  }
  return { width: Math.max(5, spec.grid.width + 3), height: Math.max(5, spec.grid.height + 1) };
}

/** Build a row's source buffer. Pure and seeded — byte-identical anywhere. */
export function sourceBuffer(spec: MatrixRow): PixelBuffer {
  const { width, height } = sourceDimensions(spec);
  const data = new Uint8ClampedArray(width * height * 4);
  const next = lcg(0x5eed1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      switch (spec.source) {
        case 'noise':
          data[i] = next();
          data[i + 1] = next();
          data[i + 2] = next();
          break;
        case 'gradient':
          data[i] = Math.round((255 * x) / Math.max(1, width - 1));
          data[i + 1] = Math.round((255 * y) / Math.max(1, height - 1));
          data[i + 2] = 128;
          break;
        case 'flat': {
          const block = 8;
          const v = ((Math.floor(x / block) + Math.floor(y / block)) % 2) * 255;
          data[i] = v;
          data[i + 1] = 255 - v;
          data[i + 2] = 64;
          break;
        }
      }
      data[i + 3] = alphaAt(spec.alpha, x, y, width, height);
    }
  }
  return { width, height, data };
}

/**
 * Render the published coverage table (M5-ACCEPT-01 exit evidence).
 *
 * Generated from {@link MATRIX} rather than maintained by hand, and
 * compared against the committed copy by the suite, so the document
 * cannot drift from the rows that actually ran. Build identity is
 * deliberately absent: it changes every commit and belongs in the
 * per-run evidence, not in a file whose staleness is a gate.
 */
export function renderCoverageMarkdown(rows: readonly MatrixRow[]): string {
  const header = [
    '| Row ID | Grid | Palette | Metric | Colour | Scan | Order | Resize | Alpha | Proves |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const body = rows.map((r) =>
    [
      '',
      `\`${r.id}\``,
      `${String(r.grid.width)}×${String(r.grid.height)}`,
      r.palette,
      r.palette === 'rgb' ? '—' : r.metric,
      r.palette === 'rgb'
        ? 'none'
        : !r.dither
          ? 'reduce'
          : `${r.algorithm ?? 'floyd-steinberg'}${
              r.strength !== undefined && r.strength !== 1
                ? ` @${String(Math.round(r.strength * 100))}%`
                : ''
            }`,
      r.serpentine ? 'serpentine' : 'raster',
      r.order,
      r.resizeMode,
      r.alpha,
      `${r.proves}${r.heavy === true ? ' *(MATRIX_FULL only)*' : ''}`,
      '',
    ].join(' | ').trim(),
  );
  return [...header, ...body].join('\n');
}
