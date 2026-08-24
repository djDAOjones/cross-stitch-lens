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
import { toneEngaged, type ToneConfig } from '../color/tone.ts';
import { adjustIsIdentity, adjustStage, type AdjustParams } from './adjust.ts';
import {
  ditherStage,
  type DiffusionAlgorithm,
  type ThresholdAlgorithm,
} from './dither.ts';
import { reduceStage } from './reduce.ts';
import { resizeStage, type ResizeMode } from './resize.ts';
import { renderPalette, swapStage, type ThreadSwap } from './swap.ts';
import { stageInstance, type Palette, type StageInstance } from '../types.ts';

/** The two §7 comparison presets. 'resize-first' is the D3 default. */
export type OrderPreset = 'resize-first' | 'reduce-first';

/**
 * Dithering as configured — a discriminated union so an invalid
 * combination is unrepresentable rather than runtime-guessed
 * (M8-ALG-01): serpentine exists only where a scan direction does
 * (diffusion), threshold methods carry only their strength, and 'none'
 * carries nothing. Strength units are per-family — diffusion is the
 * fraction of error diffused (0–1), threshold scales a base amplitude
 * (0–2) — which is why no shared percentage label exists (D61).
 * Identifiers are stable and persisted; display labels live in the UI.
 */
export type DitherConfig =
  | { algorithm: 'none' }
  | { algorithm: DiffusionAlgorithm; serpentine: boolean; strength: number }
  | { algorithm: ThresholdAlgorithm; strength: number };

/** The default dithering for a new project: the pre-M8 behaviour. */
export const DEFAULT_DITHER: DitherConfig = {
  algorithm: 'floyd-steinberg',
  serpentine: true,
  strength: 1,
};

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
  /** 'none' = plain nearest via reduce; anything else runs the dither stage. */
  dither: DitherConfig;
  /**
   * Colour swaps over the sidecar (ICE-RECOLOUR-01, D182). Optional so
   * the many configs built before swaps existed stay valid; absent
   * means none. Meaningless without a palette.
   */
  swaps?: ThreadSwap[];
  /**
   * Tone mode (TONE-01, schema v12): the colour ↔ tone weight, the
   * three-point lightness curve, and ladder-mode cuts. Optional so
   * every pre-TONE-01 config stays valid; absent — or disengaged
   * (weight 0, identity curve) — leaves matching, selection and
   * dithering byte-identical to their pre-TONE-01 selves. Engages
   * only under the 'lab' metric (§6). Meaningless without a palette.
   */
  tone?: ToneConfig;
  /**
   * Image adjustments (ADJUST-01, schema v13): the source remap that
   * runs before the resize — one lightness curve carrying the black
   * and white points, plus global saturation. Optional so every
   * pre-ADJUST-01 config stays valid; absent — or the identity —
   * leaves the stage out of the built list exactly as it was.
   *
   * Unlike `tone`, this is meaningful **without** a palette: it
   * changes the picture, so full-RGB output changes with it.
   */
  adjust?: AdjustParams;
}

/**
 * The full-RGB twin of a config: same geometry (preset, grid, resize
 * mode), no colour stage. This is what the "source" half of the
 * split compare (§10) runs — the resized source at grid size, so it
 * aligns cell-for-cell with the reduced output and the difference
 * shown is exactly the colour reduction.
 *
 * The adjustment **rides along** (ADJUST-01, the CREATIVE-01 slice-2
 * engine note): this same twin is what the colour-count selection
 * reads, and selecting threads for the unadjusted picture would pick
 * a palette for an image the design never renders. It keeps compare
 * honest too — the difference on screen stays exactly the colour
 * reduction, not the reduction plus the adjustment.
 */
export function fullRgbVariant(config: PipelineConfig): PipelineConfig {
  return { ...config, palette: null, dither: { algorithm: 'none' }, swaps: [] };
}

/**
 * Optional LUT supplier so a host (the worker) can inject its cache.
 * The tone config is part of the LUT's identity (the key carries the
 * weight, curve and cuts — D46), so the provider receives it whenever
 * it is engaged.
 */
export type LutProvider = (
  palette: Palette,
  metric: ColorMetric,
  tone?: ToneConfig,
) => Uint16Array;

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
  // The adjust stage is left out while it is the identity: including
  // it buys a full-frame clone and nothing else (M5-PERF-25). Since
  // ADJUST-01 its params are real, so it rejoins the order by itself
  // the moment a curve or a saturation departs from default — see
  // `adjustIsIdentity`. Ownership note (M5B): dropping it is only safe
  // because every remaining stage allocates its own output, so a
  // response buffer can never alias the worker's retained `lastFrame`.
  const adjustParams = config.adjust;
  const stages: StageInstance[] =
    adjustParams === undefined || adjustIsIdentity(adjustParams)
      ? []
      : [stageInstance(adjustStage, adjustParams)];

  const resize = stageInstance(resizeStage, {
    width: config.grid.width,
    height: config.grid.height,
    mode: config.resizeMode,
  });

  const colour: StageInstance[] = [];
  if (config.palette !== null) {
    // Tone rides into the colour stages only when it actually changes
    // matching — the engagement gate is what keeps a weight-0 config
    // on the untouched pre-TONE-01 code paths, byte for byte.
    const tone = toneEngaged(config.metric, config.tone) ? config.tone : undefined;
    if (config.dither.algorithm !== 'none') {
      // Pruning is Lab-only; under 'rgb' the stage keeps the full scan.
      // It is valid for both families: diffusion and threshold match
      // through the same exact path. The table is a plain-Lab
      // structure, so an engaged tone skips it (the tone scan is over
      // the selected palette, not the catalogue — small by design).
      const candidates =
        config.metric === 'lab' && tone === undefined
          ? providers.candidates?.(config.palette)
          : undefined;
      colour.push(
        stageInstance(ditherStage, {
          palette: config.palette,
          metric: config.metric,
          algorithm: config.dither.algorithm,
          strength: config.dither.strength,
          // Threshold methods have no scan direction; false is inert.
          serpentine: 'serpentine' in config.dither ? config.dither.serpentine : false,
          ...(candidates === undefined ? {} : { candidates }),
          ...(tone === undefined ? {} : { tone }),
        }),
      );
    } else {
      const lut = providers.lut?.(config.palette, config.metric, tone);
      colour.push(
        stageInstance(reduceStage, {
          palette: config.palette,
          metric: config.metric,
          path: 'lut',
          ...(lut === undefined ? {} : { lut }),
          ...(tone === undefined ? {} : { tone }),
        }),
      );
    }
    // The swap stage belongs to the colour group: it reads the sidecar
    // the quantiser just wrote, so under 'reduce-first' it too runs at
    // source resolution before the resize drops that sidecar. Left out
    // while it could change nothing (the `adjustIsIdentity` precedent —
    // no swap, every swap dangling, or a self-swap), so an unused rule
    // costs no pass and no copy.
    const render = renderPalette(config.palette, config.swaps ?? []);
    if (render.active) colour.push(stageInstance(swapStage, render));
  }

  if (config.preset === 'resize-first') {
    stages.push(resize, ...colour);
  } else {
    stages.push(...colour, resize);
  }
  return stages;
}
