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

/**
 * Whether these params make the stage a no-op.
 *
 * Today that is always true — the stage is a pure identity, so running
 * it costs a full-frame clone (≈4 MB per frame at 1024²) to produce a
 * copy of its input. `buildStages` uses this to leave the stage out
 * while it cannot change anything (M5-PERF-25).
 *
 * When the §9 operations land they will populate {@link AdjustParams},
 * and this returns false as soon as any is set — so the stage
 * reappears in the order by itself, with no caller to remember to
 * change. The stage is NOT deleted: it stays a named slot that saved
 * projects and both order presets already carry.
 */
export function adjustIsIdentity(params: AdjustParams): boolean {
  return Object.keys(params).length === 0;
}

/** Identity hook; returns an untouched copy (stages never alias input). */
export const adjustStage: Stage<AdjustParams> = {
  name: 'adjust',
  backends: {
    ts: (input: PixelBuffer): PixelBuffer => clonePixelBuffer(input),
  },
};
