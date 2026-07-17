/**
 * Serialisable pipeline configuration → executable stage list.
 *
 * Order is data, not code (§7): the config (not the stage array)
 * crosses the worker boundary and will be stored in the project file.
 * The two MVP presets compare the D3 default (resize before per-pixel
 * colour work) against colour-work-first at source resolution; the
 * fully custom order editor is post-MVP (wish-list §7).
 */

import type { ColorMetric } from '../color/metrics.ts';
import { adjustStage } from './adjust.ts';
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

/** Optional LUT supplier so a host (the worker) can inject its cache. */
export type LutProvider = (palette: Palette, metric: ColorMetric) => Uint16Array;

/**
 * Build the executable stage list for a config.
 *
 * When dithering is on, the dither stage IS the quantiser (it maps to
 * the palette with exact error terms), so reduce is not also run;
 * when off, reduce quantises via the LUT path.
 */
export function buildStages(
  config: PipelineConfig,
  lutProvider?: LutProvider,
): StageInstance[] {
  const stages: StageInstance[] = [stageInstance(adjustStage, {})];

  const resize = stageInstance(resizeStage, {
    width: config.grid.width,
    height: config.grid.height,
    mode: config.resizeMode,
  });

  const colour: StageInstance[] = [];
  if (config.palette !== null) {
    if (config.dither) {
      colour.push(
        stageInstance(ditherStage, {
          palette: config.palette,
          metric: config.metric,
          serpentine: config.serpentine,
        }),
      );
    } else {
      const lut = lutProvider?.(config.palette, config.metric);
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
