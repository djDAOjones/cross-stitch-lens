/**
 * Identity stage — the hello-world stage that proves the pipeline
 * contract and golden harness end-to-end (M0 acceptance). It has no
 * params and returns an untouched copy of its input.
 */

import type { PixelBuffer, Stage } from '../types.ts';
import { clonePixelBuffer } from './index.ts';

/** Parameters for {@link identityStage} — none. */
export type IdentityParams = Record<string, never>;

/** Copies input to output unchanged. Purity demo: never returns its input. */
export const identityStage: Stage<IdentityParams> = {
  name: 'identity',
  backends: {
    ts: (input: PixelBuffer): PixelBuffer => clonePixelBuffer(input),
  },
};
