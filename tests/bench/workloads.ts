/**
 * The M5 workload matrix (M5-PERF-01): the frozen, representative set
 * of inputs every later M5 measurement is taken over.
 *
 * The matrix exists because a change can look faster by testing one
 * friendly image, one palette, or only the node path while regressing
 * live capture. It is a small mandatory cross-product (grid × palette ×
 * dither) plus targeted expansions for the axes that carry distinct
 * risk — not every possible combination. Deliberate exclusions are
 * recorded in `docs/measurement-contract.md`.
 *
 * Workload IDs are derived, stable and unique: a report row is
 * comparable across machines and builds only through its ID.
 */

import type { ColorMetric } from '../../src/core/color/metrics.ts';
import type { OrderPreset, PipelineConfig } from '../../src/core/pipeline/config.ts';
import type { ResizeMode } from '../../src/core/pipeline/resize.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
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
 * source-resolution work (resize, the identity adjust clone) scales
 * with the source, not the grid.
 */
export type SourceSize =
  /** Source already at grid size — isolates colour work from resize. */
  | 'grid'
  /** 1280×1280 — the D43 baseline source. */
  | 'w1280'
  /** 1512×982 — a realistic Retina screen crop (non-square). */
  | 'crop';

/** Palette axis. 'rgb' is full-RGB mode: no reduction, no dithering. */
export type PaletteAxis = 'p64' | 'p533' | 'rgb';

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
  /** Always false when `palette` is 'rgb'. */
  dither: boolean;
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
    spec.dither ? 'dither' : 'nodither',
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

/** Palette sizes: the budget palette and the full built-in DMC set. */
const CORE_PALETTES = ['p64', 'p533'] as const;

/**
 * Mandatory cross-product: every grid × palette size × dither state
 * under core defaults. This is the block that must never lose a cell —
 * it is what makes a "faster" claim comparable.
 */
function coreMatrix(): Workload[] {
  const rows: Workload[] = [];
  for (const grid of CORE_GRIDS) {
    for (const palette of CORE_PALETTES) {
      for (const dither of [false, true]) {
        rows.push(workload({ ...CORE, grid, palette, dither }));
      }
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
      dither: true,
      metric: 'rgb',
      note: 'RGB metric — no Lab conversion, isolates the transcendental load',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      order: 'reduce-first',
      note: 'colour work at source resolution — the §7 order comparison',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'rgb',
      dither: false,
      note: 'full-RGB mode — resize and orchestration with no colour stage',
    }),
    workload({
      ...CORE,
      grid: 1024,
      palette: 'p64',
      dither: true,
      sourceSize: 'grid',
      note: 'source already at grid size — isolates colour work from resize',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      sourceSize: 'crop',
      note: 'realistic non-square Retina screen crop',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      source: 'gradient',
      note: 'smooth gradient — the content dithering is judged on',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: false,
      source: 'flat',
      note: 'flat blocks — cache and dirty-skip behaviour',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      alpha: 'mixed',
      resizeMode: 'contain',
      note: 'alpha edges against letterboxed empty cells',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      sourceSize: 'crop',
      resizeMode: 'cover',
      note: 'aspect-preserving crop overflow',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      sourceSize: 'grid',
      resizeMode: 'fit',
      note: 'fit never enlarges — centred unscaled source',
    }),
    workload({
      ...CORE,
      grid: 300,
      palette: 'p64',
      dither: true,
      path: 'live',
      note: 'live cadence — repeated frames through the same config',
    }),
    workload({
      ...CORE,
      grid: 1024,
      palette: 'p64',
      dither: true,
      path: 'live',
      note: 'live cadence at the ceiling grid — the adaptive-draft trigger',
    }),
  ];
}

/** The frozen matrix. Order is stable; IDs are unique (asserted in tests). */
export const WORKLOADS: readonly Workload[] = [...coreMatrix(), ...expansions()];

/** Look a workload up by ID; throws on an unknown ID (typo protection). */
export function workloadById(id: string): Workload {
  const found = WORKLOADS.find((w) => w.id === id);
  if (found === undefined) throw new Error(`unknown workload id: ${id}`);
  return found;
}

/** First 64 DMC threads — the budget table's 64-colour palette. */
export function palette64(): Palette {
  const dmc = loadDmcPalette();
  return { name: 'dmc-64-bench', entries: dmc.entries.slice(0, 64) };
}

/** The palette a workload runs against; null in full-RGB mode. */
export function paletteFor(workload: Workload): Palette | null {
  switch (workload.palette) {
    case 'p64':
      return palette64();
    case 'p533':
      return loadDmcPalette();
    case 'rgb':
      return null;
  }
}

/** The pipeline config a workload runs under. */
export function configFor(workload: Workload): PipelineConfig {
  // The matrix's dither axis is Boolean by design: it froze before M8,
  // and its dithered rows mean the pre-M8 behaviour — Floyd–Steinberg,
  // serpentine, full strength — which the union states exactly.
  const dithered = workload.palette !== 'rgb' && workload.dither;
  return {
    preset: workload.order,
    grid: { width: workload.grid, height: workload.grid },
    resizeMode: workload.resizeMode,
    palette: paletteFor(workload),
    metric: workload.metric,
    dither: dithered
      ? { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 }
      : { algorithm: 'none' },
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
