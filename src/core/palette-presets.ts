/**
 * Built-in colour-scheme presets (M7-PRESET-01).
 *
 * Every preset shipped here is **algorithmic**: membership is a stated
 * rule in CIE LCh, applied to whatever threads the enabled brands
 * provide, and it is labelled as such in the UI. That is a deliberate
 * limit. A preset called "Pastels" promises taste, and taste is the
 * owner's to sign off — inventing a curated membership list and
 * presenting it as authoritative would be the agent putting words in
 * the product's mouth. Curated presets can be added later as explicit
 * id lists once reviewed; the resolver below already supports them,
 * because a curated preset is just a rule that returns a fixed set.
 *
 * Presets are immutable, versioned, and identified by a stable id — not
 * by a name that could quietly mean something different next release.
 * The project stores the *resolved snapshot*, so a change to a rule
 * here can never alter a design somebody already saved.
 */

import { srgbToLab } from './color/convert.ts';
import type { PresetMode, ResolvedPresetRef } from './palette-policy.ts';
import { threadsForBrands, type ThreadCatalogue } from './thread-catalogue.ts';

/** Bumped when a rule changes meaning, so saved ids stay honest. */
export const PRESET_SCHEMA_VERSION = 1;

/** Polar Lab: lightness, chroma, hue angle in degrees 0–360. */
export interface Lch {
  l: number;
  c: number;
  h: number;
}

/** A built-in scheme: a stable id plus a pure membership rule. */
export interface PresetDefinition {
  id: string;
  name: string;
  /** One line, shown in the UI, stating how membership is decided. */
  rule: string;
  /** Pure predicate over the thread's display colour. */
  matches: (lch: Lch) => boolean;
}

/** Convert an sRGB triple to polar Lab. */
export function rgbToLch(r: number, g: number, b: number): Lch {
  const lab = new Float32Array(3);
  srgbToLab(r, g, b, lab, 0);
  const a = lab[1] ?? 0;
  const bb = lab[2] ?? 0;
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  return {
    l: lab[0] ?? 0,
    c: Math.sqrt(a * a + bb * bb),
    h: hue < 0 ? hue + 360 : hue,
  };
}

/** Inclusive hue-range test that copes with wrapping through 0°. */
function hueBetween(h: number, from: number, to: number): boolean {
  return from <= to ? h >= from && h <= to : h >= from || h <= to;
}

/**
 * The shipped presets. Thresholds are round numbers in perceptual
 * units, chosen to be explicable rather than tuned: they are the
 * sentence in `rule` expressed as arithmetic.
 */
export const PRESETS: readonly PresetDefinition[] = [
  {
    id: 'neutral',
    name: 'Neutrals',
    rule: 'Threads with almost no colour: chroma at or below 8.',
    matches: (lch) => lch.c <= 8,
  },
  {
    id: 'pastel',
    name: 'Pastels',
    rule: 'Light, soft threads: lightness 78 or above with chroma between 8 and 38.',
    matches: (lch) => lch.l >= 78 && lch.c > 8 && lch.c <= 38,
  },
  {
    id: 'earth',
    name: 'Earth tones',
    rule: 'Warm browns, ochres and olives: hue 15°–95°, chroma 8–60, lightness 15–85.',
    matches: (lch) =>
      hueBetween(lch.h, 15, 95) && lch.c >= 8 && lch.c <= 60 && lch.l >= 15 && lch.l <= 85,
  },
  {
    id: 'deep',
    name: 'Deep shades',
    rule: 'Dark threads: lightness at or below 35.',
    matches: (lch) => lch.l <= 35,
  },
];

/** Look up a preset by id. */
export function findPreset(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * Resolve a preset to concrete thread ids over the enabled brands, in
 * catalogue order.
 *
 * Resolution deliberately operates only over enabled brands, so
 * disabling a brand *visibly* shrinks a preset rather than silently
 * re-enabling it to keep the preset whole (M7-PRESET-01).
 */
export function resolvePreset(
  preset: PresetDefinition,
  catalogue: ThreadCatalogue,
  brandIds: readonly string[],
  mode: PresetMode,
): ResolvedPresetRef {
  const threadIds = threadsForBrands(catalogue, brandIds)
    .filter((t) => preset.matches(rgbToLch(t.rgb[0], t.rgb[1], t.rgb[2])))
    .map((t) => t.id);
  return { name: preset.name, threadIds, mode };
}
