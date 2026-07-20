/**
 * Serialisable pipeline configuration → executable stage list.
 *
 * Order is data, not code (§7): the config (not the stage array)
 * crosses the worker boundary and will be stored in the project file.
 * The two MVP presets compare the D3 default (resize before per-pixel
 * colour work) against colour-work-first at source resolution; the
 * fully custom order editor is post-MVP (wish-list §7).
 */

import type { CandidateTable } from '../color/candidates.ts';
import type { ColorMetric } from '../color/metrics.ts';
import { adjustIsIdentity, adjustStage, type AdjustParams } from './adjust.ts';
import { ditherStage } from './dither.ts';
import { reduceStage } from './reduce.ts';
import { resizeStage, type ResizeMode } from './resize.ts';
import { stageInstance, type Palette, type StageInstance } from '../types.ts';

/** The two §7 comparison presets. 'resize-first' is the D3 default. */
export type OrderPreset = 'resize-first' | 'reduce-first';

/**
 * Everything needed to build the stage list; plain serialisable data
 * (safe over postMessage and into the project file).
 */
export interface PipelineConfig {
  preset: OrderPreset;
  grid: { width: number; height: number };
  resizeMode: ResizeMode;
  /** null = full-RGB mode: no colour reduction, no dithering (§5.1). */
  palette: Palette | null;
  metric: ColorMetric;
  /** Dithered quantisation (dither stage) vs plain nearest (reduce). */
  dither: boolean;
  serpentine: boolean;
}

/**
 * The full-RGB twin of a config: same geometry (preset, grid, resize
 * mode), no colour stage. This is what the "source" half of the
 * split compare (§10) runs — the resized source at grid size, so it
 * aligns cell-for-cell with the reduced output and the difference
 * shown is exactly the colour reduction.
 */
export function fullRgbVariant(config: PipelineConfig): PipelineConfig {
  return { ...config, palette: null, dither: false };
}

/** Optional LUT supplier so a host (the worker) can inject its cache. */
export type LutProvider = (palette: Palette, metric: ColorMetric) => Uint16Array;

/**
 * Optional candidate-table supplier, same idea as {@link LutProvider}:
 * both structures are per-palette one-offs far too expensive to build
 * per frame, and both are pure performance hints that cannot change
 * output. Only consulted for the 'lab' metric.
 */
export type CandidateProvider = (palette: Palette) => CandidateTable;

/** Cache suppliers a host may inject into {@link buildStages}. */
export interface StageProviders {
  lut?: LutProvider;
  candidates?: CandidateProvider;
}

/**
 * Build the executable stage list for a config.
 *
 * When dithering is on, the dither stage IS the quantiser (it maps to
 * the palette with exact error terms), so reduce is not also run;
 * when off, reduce quantises via the LUT path.
 */
export function buildStages(
  config: PipelineConfig,
  providers: StageProviders = {},
): StageInstance[] {
  // The adjust hook is left out while it is the identity: including it
  // buys a full-frame clone and nothing else (M5-PERF-25). It returns
  // to the order automatically once §9 populates its params — see
  // `adjustIsIdentity`. Ownership note (M5B): dropping it is only safe
  // because every remaining stage allocates its own output, so a
  // response buffer can never alias the worker's retained `lastFrame`.
  const adjustParams: AdjustParams = {};
  const stages: StageInstance[] = adjustIsIdentity(adjustParams)
    ? []
    : [stageInstance(adjustStage, adjustParams)];

  const resize = stageInstance(resizeStage, {
    width: config.grid.width,
    height: config.grid.height,
    mode: config.resizeMode,
  });

  const colour: StageInstance[] = [];
  if (config.palette !== null) {
    if (config.dither) {
      // Pruning is Lab-only; under 'rgb' the stage keeps the full scan.
      const candidates =
        config.metric === 'lab' ? providers.candidates?.(config.palette) : undefined;
      colour.push(
        stageInstance(ditherStage, {
          palette: config.palette,
          metric: config.metric,
          serpentine: config.serpentine,
          ...(candidates === undefined ? {} : { candidates }),
        }),
      );
    } else {
      const lut = providers.lut?.(config.palette, config.metric);
      colour.push(
        stageInstance(reduceStage, {
          palette: config.palette,
          metric: config.metric,
          path: 'lut',
          ...(lut === undefined ? {} : { lut }),
        }),
      );
    }
  }

  if (config.preset === 'resize-first') {
    stages.push(resize, ...colour);
  } else {
    stages.push(...colour, resize);
  }
  return stages;
}
