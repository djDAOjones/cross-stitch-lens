/**
 * The canonical dither presets and structural config equality
 * (M15-DITH-01, moved from `src/ui/dither-model.ts`): the seven
 * shipped presets seed the read-only built-in dither profiles, basis
 * lines kept for the editor's "Why:" display (D61/D116), and
 * load-time built-in matching is `sameDither` over the discriminated
 * union. Pure data + pure comparison; no UI in here.
 */

import type { DitherConfig } from './config.ts';

export interface DitherPreset {
  id: string;
  label: string;
  config: DitherConfig;
  /** The D61 evidence line this preset stands on. */
  basis: string;
}

/** The shipped presets, in display order. */
export const DITHER_PRESETS: readonly DitherPreset[] = [
  {
    id: 'none',
    label: 'None',
    config: { algorithm: 'none' },
    basis: 'the mandatory comparison state',
  },
  {
    id: 'subtle',
    label: 'Subtle',
    config: { algorithm: 'atkinson', serpentine: true, strength: 0.5 },
    basis: 'Atkinson at half strength: calmest texture, fewest isolated stitches',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    config: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
    basis: 'the pre-M8 default: best general tone fidelity',
  },
  {
    id: 'strong',
    label: 'Strong',
    config: { algorithm: 'blue-noise', strength: 1.75 },
    basis: 'blue-noise past its base amplitude: pronounced grain everywhere',
  },
  {
    id: 'photograph',
    label: 'Photograph',
    config: { algorithm: 'jarvis', serpentine: true, strength: 1 },
    basis: 'Jarvis: smoothest tone on organic content, fewer isolated stitches than FS',
  },
  {
    id: 'graphic',
    label: 'Graphic',
    config: { algorithm: 'ordered', strength: 1 },
    basis: 'ordered leaves flat and near-palette areas untouched (isolation 2.3% vs FS 18.5%)',
  },
  {
    id: 'limited-palette',
    label: 'Very limited palette',
    config: { algorithm: 'floyd-steinberg', serpentine: true, strength: 0.6 },
    basis: 'damped diffusion improves tiny-palette tone (FS 27.9 → 23.9 tone ΔE at p8)',
  },
];

/** Structural equality over the discriminated union. */
export function sameDither(a: DitherConfig, b: DitherConfig): boolean {
  if (a.algorithm !== b.algorithm) return false;
  if (a.algorithm === 'none' || b.algorithm === 'none') return true;
  if (a.strength !== b.strength) return false;
  const aSerp = 'serpentine' in a ? a.serpentine : null;
  const bSerp = 'serpentine' in b ? b.serpentine : null;
  return aSerp === bSerp;
}

/**
 * The built-in dither profile matching a config structurally, or
 * null — the honest unnamed state (never silently adopted, D116).
 */
export function matchBuiltInDither(config: DitherConfig): string | null {
  const hit = DITHER_PRESETS.find((p) => sameDither(p.config, config));
  return hit === undefined ? null : `builtin:${hit.id}`;
}
