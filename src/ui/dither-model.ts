/**
 * Pure model behind the Dither controls (M8-CTRL-01): algorithm
 * options, per-family strength semantics, preset definitions, and the
 * config ↔ control translations. DOM-free so the state matrix is
 * testable without a browser (conventions.md: UI logic that matters is
 * extracted into pure, tested modules); `main.ts` only mounts it.
 */

import type { DitherConfig } from '../core/pipeline/config.ts';
import type { DitherAlgorithm } from '../core/pipeline/dither.ts';

/** Selector value: a real algorithm or the 'none' state. */
export type AlgorithmChoice = DitherAlgorithm | 'none';

/** Which method-specific controls a choice earns (D61). */
export type ControlFamily = 'none' | 'diffusion' | 'threshold';

/** The family a selector choice belongs to. */
export function familyOf(choice: AlgorithmChoice): ControlFamily {
  if (choice === 'none') return 'none';
  if (choice === 'ordered' || choice === 'blue-noise') return 'threshold';
  return 'diffusion';
}

/**
 * Selector options in display order. Labels are user language
 * (sentence case, no implementation terms); identifiers are the
 * persisted stable ids.
 */
export const ALGORITHM_OPTIONS: readonly (readonly [AlgorithmChoice, string])[] = [
  ['none', 'None'],
  ['floyd-steinberg', 'Floyd–Steinberg'],
  ['atkinson', 'Atkinson'],
  ['jarvis', 'Jarvis'],
  ['ordered', 'Ordered'],
  ['blue-noise', 'Blue noise'],
];

/**
 * Strength is presented as a whole-number percentage but its meaning —
 * and range — is per-family, because a shared 0–100 label would imply
 * a comparability the engine does not provide (M8-CTRL-01): diffusion
 * strength is the share of quantisation error carried to neighbours
 * (0–100%), threshold strength scales the texture amplitude past its
 * calibrated base (0–200%).
 */
export function strengthBounds(family: Exclude<ControlFamily, 'none'>): {
  min: number;
  max: number;
  helper: string;
} {
  return family === 'diffusion'
    ? { min: 0, max: 100, helper: 'Share of colour error carried to neighbouring stitches.' }
    : { min: 0, max: 200, helper: 'Texture amplitude; over 100% helps very small palettes.' };
}

/** Engine strength (0–1 or 0–2) → control percentage. */
export function strengthToPercent(strength: number): number {
  return Math.round(strength * 100);
}

/** Control percentage → engine strength. */
export function percentToStrength(percent: number): number {
  return percent / 100;
}

/**
 * A preset: an immutable named configuration over ordinary settings.
 * Applying one writes the visible controls; it hides nothing else —
 * no backend choice, no draft behaviour, no export override
 * (M8-CTRL-01). Membership comes from the D61 evidence, not invented
 * labels; `basis` records the evidence line so the label stays honest.
 */
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

/** Sentinel selector value for a configuration matching no preset. */
export const CUSTOM_PRESET = 'custom';

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
 * The preset a configuration currently matches, or {@link CUSTOM_PRESET}.
 * Edits after applying a preset therefore land the selector on
 * "Custom" without any hidden state tracking (M8-CTRL-01).
 */
export function presetFor(config: DitherConfig): string {
  return DITHER_PRESETS.find((p) => sameDither(p.config, config))?.id ?? CUSTOM_PRESET;
}

/** Look a preset's config up by id; null for unknown ids or 'custom'. */
export function presetConfig(id: string): DitherConfig | null {
  const preset = DITHER_PRESETS.find((p) => p.id === id);
  return preset === undefined ? null : { ...preset.config };
}

/**
 * Session memory of each method's last settings, so switching
 * algorithms (or off and back on) does not lose tuning. Deliberately
 * session-only: the project file stores exactly one canonical active
 * configuration, and hidden per-method values must never affect output
 * (M8-CTRL-01).
 */
export type DitherMemory = Partial<Record<DitherAlgorithm, DitherConfig>>;

/** Remember a non-none configuration under its algorithm. */
export function remember(memory: DitherMemory, config: DitherConfig): DitherMemory {
  if (config.algorithm === 'none') return memory;
  return { ...memory, [config.algorithm]: config };
}

/**
 * The configuration selecting `choice` should produce: the method's
 * remembered settings, or its defaults — full strength, serpentine on
 * where the method has a scan direction.
 */
export function configForChoice(choice: AlgorithmChoice, memory: DitherMemory): DitherConfig {
  if (choice === 'none') return { algorithm: 'none' };
  const remembered = memory[choice];
  if (remembered !== undefined) return { ...remembered };
  if (choice === 'ordered' || choice === 'blue-noise') return { algorithm: choice, strength: 1 };
  return { algorithm: choice, serpentine: true, strength: 1 };
}
