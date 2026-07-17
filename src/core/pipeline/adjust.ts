/**
 * Adjust stage — the image-adjustments pipeline hook (§7 step 3).
 *
 * MVP ships the hook only: it is a named slot in the processing order
 * so saved projects and both order presets already carry it. The
 * actual operations (brightness/contrast/gamma, §9) are post-MVP
 * (wish-list) and will populate {@link AdjustParams} without moving
 * the stage. Until then it is the identity.
 */

import type { PixelBuffer, Stage } from '../types.ts';
import { clonePixelBuffer } from './index.ts';

/** Parameters for {@link adjustStage} — empty until §9 ops land. */
export type AdjustParams = Record<string, never>;

/** Identity hook; returns an untouched copy (stages never alias input). */
export const adjustStage: Stage<AdjustParams> = {
  name: 'adjust',
  backends: {
    ts: (input: PixelBuffer): PixelBuffer => clonePixelBuffer(input),
  },
};
