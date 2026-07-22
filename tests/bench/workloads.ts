/**
 * The bv2 workload matrix (M13-MEAS-01): the frozen, representative set
 * of inputs every later performance measurement is taken over.
 *
 * The matrix exists because a change can look faster by testing one
 * friendly image, one palette, or only the node path while regressing
 * live capture. It is a small mandatory block (grid × palette × the
 * FS/no-dither pair, plus every shipped M8 method at 300² and 1024²)
 * plus targeted expansions for the axes that carry distinct risk — not
 * every possible combination. Deliberate exclusions are recorded in
 * `docs/measurement-contract.md`.
 *
 * bv1 → bv2 (M13-MEAS-01): the dither axis was a Boolean frozen before
 * M8, so every `dither` row silently meant Floyd–Steinberg, serpentine,
 * strength 1, and the four M8 methods had no coverage at all. The axis
 * is now the engine's own `DitherConfig`, and the ID token names the
 * method and every cost-relevant setting. The `p533` axis value also
 * lied: `loadDmcPalette()` returns the owner catalogue's 489 DMC
 * threads, so the value is renamed `p489`. IDs therefore changed
 * meaning — bv1 and bv2 reports must not be diffed.
 *
 * Workload IDs are derived, stable and unique: a report row is
 * comparable across machines and builds only through its ID.
 */

import type { ColorMetric } from '../../src/core/color/metrics.ts';
import type {
  DitherConfig,
  OrderPreset,
  PipelineConfig,
} from '../../src/core/pipeline/config.ts';
import type { DitherAlgorithm } from '../../src/core/pipeline/dither.ts';
import type { ResizeMode } from '../../src/core/pipeline/resize.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
import { loadCatalogue, threadsForBrands } from '../../src/core/thread-catalogue.ts';
import type { Palette, PixelBuffer } from '../../src/core/types.ts';

/** Source content class — each exercises a different engine behaviour. */
export type SourceClass =
  /** LCG noise: worst-case variation, no flat runs, no dirty-skip. */
  | 'noise'
  /** Smooth gradient: the case dithering is judged on. */
  | 'gradient'
  /** Flat blocks: cache, dirty-skip and run-length behaviour. */
  | 'flat';

/**
 * Source dimensions, recorded separately from grid dimensions because
 * source-resolution work (resize) scales with the source, not the grid.
 */
export type SourceSize =
  /** Source already at grid size — isolates colour work from resize. */
  | 'grid'
  /** 1280×1280 — the D43 baseline source. */
  | 'w1280'
  /** 1512×982 — a realistic Retina screen crop (non-square). */
  | 'crop';

/**
 * Palette axis. 'p489' is the actual built-in DMC palette (489 threads
 * — bv1 called this 'p533' after a count the catalogue never had);
 * 'rgb' is full-RGB mode: no reduction, no dithering.
 */
export type PaletteAxis = 'p64' | 'p489' | 'rgb';

/** Alpha content: opaque, or with a transparent edge region. */
export type AlphaAxis = 'opaque' | 'mixed';

/** Still (single frame) versus live (repeated capture) intent. */
export type PathAxis = 'still' | 'live';

/** One workload: a fully specified, reproducible measurement input. */
export interface Workload {
  /** Derived, stable, unique. Never hand-edit. */
  id: string;
  source: SourceClass;
  sourceSize: SourceSize;
  alpha: AlphaAxis;
  /** Square grid edge in stitches. */
  grid: number;
  palette: PaletteAxis;
  /** Inert when `palette` is 'rgb'. */
  metric: ColorMetric;
  /**
   * The exact dithering the row executes — the engine's own union, so
   * a workload can express every shipped method and setting. Always
   * `{ algorithm: 'none' }` when `palette` is 'rgb'.
   */
  dither: DitherConfig;
  order: OrderPreset;
  resizeMode: ResizeMode;
  path: PathAxis;
  /** Why this row is in the matrix, when it is not part of the core. */
  note?: string;
}

/** Axes of a workload, before the ID is derived. */
type WorkloadSpec = Omit<Workload, 'id'>;

/** Pixel dimensions of a source size, given the grid it feeds. */
export function sourceDimensions(
  size: SourceSize,
  grid: number,
): { width: number; height: number } {
  switch (size) {
    case 'grid':
      return { width: grid, height: grid };
    case 'w1280':
      return { width: 1280, height: 1280 };
    case 'crop':
      return { width: 1512, height: 982 };
  }
}

/** Short, grep-safe ID token per shipped method (no dots — see below). */
const METHOD_TOKEN: Record<DitherAlgorithm, string> = {
  'floyd-steinberg': 'fs',
  atkinson: 'atkinson',
  jarvis: 'jarvis',
  ordered: 'ordered',
  'blue-noise': 'bluenoise',
};

/**
 * The dither axis as an ID token. A method name alone is not an
 * identity — strength and scan direction change the executed cost — so
 * every cost-relevant setting is in the token and two executable
 * configs can never share an ID (M13-MEAS-01).
 *
 * Grammar: `nodither` | `<method>-s<pct>[-serp|-raster]`. Strength is
 * whole percent, zero-padded to three digits (`s050`, `s100`, `s150`),
 * because the workload ID is dot-separated and a fractional strength
 * would inject a field separator. Percent granularity is the contract:
 * the frozen matrix only uses strengths that are exact percents.
 * Serpentine appears only for diffusion, where a scan direction exists.
 */
export function ditherToken(dither: DitherConfig): string {
  if (dither.algorithm === 'none') return 'nodither';
  const strength = `s${String(Math.round(dither.strength * 100)).padStart(3, '0')}`;
  const method = METHOD_TOKEN[dither.algorithm];
  if ('serpentine' in dither) {
    return `${method}-${strength}-${dither.serpentine ? 'serp' : 'raster'}`;
  }
  return `${method}-${strength}`;
}

/**
 * Derive the workload ID from its axes. Dot-separated so it greps and
 * sorts; every axis appears so two rows can never collide silently.
 */
export function workloadId(spec: WorkloadSpec): string {
  return [
    spec.source,
    spec.sourceSize,
    spec.alpha,
    `g${String(spec.grid)}`,
    spec.palette,
    spec.metric,
    ditherToken(spec.dither),
    spec.order,
    spec.resizeMode,
    spec.path,
  ].join('.');
}

function workload(spec: WorkloadSpec): Workload {
  return { id: workloadId(spec), ...spec };
}

/** Core defaults — the axes a targeted expansion varies one of. */
const CORE: Omit<WorkloadSpec, 'grid' | 'palette' | 'dither'> = {
  source: 'noise',
  sourceSize: 'w1280',
  alpha: 'opaque',
  metric: 'lab',
  order: 'resize-first',
  resizeMode: 'stretch',
  path: 'still',
};

/** Grids the budget table and the product care about. */
export const CORE_GRIDS = [200, 300, 1024] as const;

/** Palette sizes: the budget palette and the actual built-in DMC set. */
const CORE_PALETTES = ['p64', 'p489'] as const;

/** No dithering — plain nearest-colour reduction via the LUT. */
export const NO_DITHER: DitherConfig = { algorithm: 'none' };

/** The pre-M8 behaviour: Floyd–Steinberg, serpentine, full strength. */
export const FS_DEFAULT: DitherConfig = {
  algorithm: 'floyd-steinberg',
  serpentine: true,
  strength: 1,
};

/**
 * The four M8 methods at their D61 defaults: diffusion at strength 1
 * with serpentine on, threshold at strength 1.
 */
export const M8_METHOD_DEFAULTS: readonly DitherConfig[] = [
  { algorithm: 'atkinson', serpentine: true, strength: 1 },
  { algorithm: 'jarvis', serpentine: true, strength: 1 },
  { algorithm: 'ordered', strength: 1 },
  { algorithm: 'blue-noise', strength: 1 },
];

/** The grids the mandatory method block covers: the product-promise
 * grid and the export ceiling. */
export const METHOD_BLOCK_GRIDS = [300, 1024] as const;

/**
 * Mandatory cross-product: every grid × palette size × the no-dither /
 * Floyd–Steinberg pair under core defaults. This is the bv1 core kept
 * for continuity — the block that must never lose a cell, and what
 * makes a "faster" claim comparable.
 */
function coreMatrix(): Workload[] {
  const rows: Workload[] = [];
  for (const grid of CORE_GRIDS) {
    for (const palette of CORE_PALETTES) {
      for (const dither of [NO_DITHER, FS_DEFAULT]) {
        rows.push(workload({ ...CORE, grid, palette, dither }));
      }
    }
  }
  return rows;
}

/**
 * Mandatory method block: every shipped M8 method at its defaults, at
 * the 300² product-promise grid and the 1024² export ceiling, p64.
 * bv1 had no coverage of these methods at all (D62 deferred the matrix
 * extension to this boundary bump); losing one of these cells fails
 * the matrix test just like losing a core cell.
 */
function methodBlock(): Workload[] {
  const rows: Workload[] = [];
  for (const grid of METHOD_BLOCK_GRIDS) {
    for (const dither of M8_METHOD_DEFAULTS) {
      rows.push(
        workload({
          ...CORE,
          grid,
          palette: 'p64',
          dither,
          note: `M8 method coverage — ${dither.algorithm} at D61 defaults`,
        }),
      );
    }
  }
  return rows;
}

/**
 * Targeted expansions: one axis moved off core at a time, chosen where
 * the axis carries risk the core block cannot expose.
 */
function expansions(): Workload[] {
  return [
    workload({
      ...CORE,
      grid: 1024,
      palette: 'p64',
      dither: FS_DEFAULT,
      metric: 'rgb',
      note: 'RGB metric — no Lab conversion, isolates the transcendental load',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      order: 'reduce-first',
      note: 'colour work at source resolution — the §7 order comparison',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'rgb',
      dither: NO_DITHER,
      note: 'full-RGB mode — resize and orchestration with no colour stage',
    }),
    workload({
      ...CORE,
      grid: 1024,
      palette: 'p64',
      dither: FS_DEFAULT,
      sourceSize: 'grid',
      note: 'source already at grid size — isolates colour work from resize',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      sourceSize: 'crop',
      note: 'realistic non-square Retina screen crop',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      source: 'gradient',
      note: 'smooth gradient — the content dithering is judged on',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: NO_DITHER,
      source: 'flat',
      note: 'flat blocks — cache and dirty-skip behaviour',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      alpha: 'mixed',
      resizeMode: 'contain',
      note: 'alpha edges against letterboxed empty cells',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      sourceSize: 'crop',
      resizeMode: 'cover',
      note: 'aspect-preserving crop overflow',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      sourceSize: 'grid',
      resizeMode: 'fit',
      note: 'fit never enlarges — centred unscaled source',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: FS_DEFAULT,
      path: 'live',
      note: 'live cadence — repeated frames through the same config',
    }),
    workload({
      ...CORE,
      grid: 1024,
      palette: 'p64',
      dither: FS_DEFAULT,
      path: 'live',
      note: 'live cadence at the ceiling grid — the adaptive-draft trigger',
    }),
    // Non-default dither settings, one row each (M13-MEAS-01): strength
    // and scan direction change the executed cost, so each earns one
    // targeted row rather than a cross-product.
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 0.5 },
      note: 'diffusion below the exact-identity strength — the non-trivial multiply path',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: { algorithm: 'floyd-steinberg', serpentine: false, strength: 1 },
      note: 'raster scan — serpentine off is a distinct executable config',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: { algorithm: 'ordered', strength: 1.5 },
      note: 'threshold above base amplitude — the tiny-palette setting (D61)',
    }),
  ];
}

/** The frozen matrix. Order is stable; IDs are unique (asserted in tests). */
export const WORKLOADS: readonly Workload[] = [
  ...coreMatrix(),
  ...methodBlock(),
  ...expansions(),
];

/** Look a workload up by ID; throws on an unknown ID (typo protection). */
export function workloadById(id: string): Workload {
  const found = WORKLOADS.find((w) => w.id === id);
  if (found === undefined) throw new Error(`unknown workload id: ${id}`);
  return found;
}

/**
 * First 64 DMC threads — the budget table's 64-colour palette. This is
 * a **performance** palette (stable, cheap, first-64 chunk); it is not
 * the colour-spread palette perceptual comparisons need (D61) and must
 * never be used for one.
 */
export function palette64(): Palette {
  const dmc = loadDmcPalette();
  return { name: 'dmc-64-bench', entries: dmc.entries.slice(0, 64) };
}

/**
 * The full eight-brand catalogue union (3,338 threads) — the justified
 * multi-brand **preparation stress** (M13-MEAS-01). Used only for cold
 * `prepare` rows (LUT and candidate-table builds): a per-frame pipeline
 * row over 3,338 threads is an exact-scan of the whole catalogue and
 * measures no product path, so it is deliberately not a matrix row.
 */
export function paletteFull(): Palette {
  const catalogue = loadCatalogue();
  return {
    name: 'catalogue-union-bench',
    entries: threadsForBrands(
      catalogue,
      catalogue.brands.map((brand) => brand.id),
    ),
  };
}

/** The palette a workload runs against; null in full-RGB mode. */
export function paletteFor(workload: Workload): Palette | null {
  switch (workload.palette) {
    case 'p64':
      return palette64();
    case 'p489':
      return loadDmcPalette();
    case 'rgb':
      return null;
  }
}

/** The pipeline config a workload runs under. */
export function configFor(workload: Workload): PipelineConfig {
  return {
    preset: workload.order,
    grid: { width: workload.grid, height: workload.grid },
    resizeMode: workload.resizeMode,
    palette: paletteFor(workload),
    metric: workload.metric,
    // Full-RGB mode has no colour stage; the axis invariant (asserted
    // in tests) is that such rows are built with 'none' already.
    dither: workload.palette === 'rgb' ? NO_DITHER : workload.dither,
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

/**
 * Alpha for a pixel: opaque everywhere, or (for 'mixed') a transparent
 * border and a soft ramp, so resize and dither meet real alpha edges.
 */
function alphaAt(alpha: AlphaAxis, x: number, y: number, w: number, h: number): number {
  if (alpha === 'opaque') return 255;
  const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
  const band = Math.max(1, Math.floor(Math.min(w, h) / 8));
  if (edge < band / 2) return 0;
  if (edge < band) return Math.round((255 * (edge - band / 2)) / (band / 2));
  return 255;
}

/**
 * Build a workload's source buffer. Pure and seeded: the same workload
 * always produces byte-identical pixels, on any machine.
 */
export function sourceBuffer(workload: Workload): PixelBuffer {
  const { width, height } = sourceDimensions(workload.sourceSize, workload.grid);
  const data = new Uint8ClampedArray(width * height * 4);
  const next = lcg(0xbe7c4);
  /** Flat-block edge in px — coarse enough to leave long identical runs. */
  const block = 32;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      switch (workload.source) {
        case 'noise':
          data[i] = next();
          data[i + 1] = next();
          data[i + 2] = next();
          break;
        case 'gradient':
          data[i] = Math.round((255 * x) / Math.max(1, width - 1));
          data[i + 1] = Math.round((255 * y) / Math.max(1, height - 1));
          data[i + 2] = Math.round((255 * (x + y)) / Math.max(1, width + height - 2));
          break;
        case 'flat': {
          const cell = Math.floor(y / block) * 3 + Math.floor(x / block);
          data[i] = (cell * 53) % 256;
          data[i + 1] = (cell * 97) % 256;
          data[i + 2] = (cell * 151) % 256;
          break;
        }
      }
      data[i + 3] = alphaAt(workload.alpha, x, y, width, height);
    }
  }
  return { width, height, data };
}
