/**
 * The six-band hue mixer and the saturation range remap
 * (ADJUST-02, CREATIVE-01 slice 2b).
 *
 * Both work on Lab chroma — the adjust stage is already in Lab, and
 * "which hue is this and how colourful is it" is exactly what a/b
 * answer. This module is the pure half: band centres, the per-pixel
 * band blend, and the range curve. The hot loop that uses them lives
 * in `pipeline/adjust.ts`.
 *
 * ## The band centres are derived, not assumed
 *
 * The classic six are R/Y/G/C/B/M (owner-confirmed, D200), and the
 * obvious thing is to space them 60° apart. That is wrong here: in
 * CIELAB the six sRGB corners sit at
 *
 *     Red 40.0°  Yellow 102.9°  Green 136.0°
 *     Cyan 196.4°  Blue 306.3°  Magenta 328.2°
 *
 * — gaps from 22° (Blue→Magenta) to 110° (Cyan→Blue). Assuming even
 * spacing would put the "green" band's centre in the cyans and make
 * the blue slider mostly a magenta slider. So the centres are computed
 * from this project's own `srgbToLab` at load, and the blend is
 * between whichever two centres actually bracket a pixel — which
 * copes with the uneven spacing by construction.
 */

import { srgbToLab } from './convert.ts';

/** One band's three controls. Defaults are the identity. */
export interface MixerBand {
  /** Hue rotation, degrees. */
  hue: number;
  /** Saturation multiplier; 1 leaves chroma alone. */
  sat: number;
  /** Lightness offset, L\* points. */
  light: number;
}

/** The six bands, in the fixed order of {@link BAND_NAMES}. */
export type MixerBands = readonly [
  MixerBand,
  MixerBand,
  MixerBand,
  MixerBand,
  MixerBand,
  MixerBand,
];

/** Band order — by ascending Lab hue angle, which is also R→M. */
export const BAND_NAMES = ['Red', 'Yellow', 'Green', 'Cyan', 'Blue', 'Magenta'] as const;

/** The control ranges the UI and the schema both enforce. */
export const BAND_LIMITS = {
  hue: { min: -60, max: 60 },
  sat: { min: 0, max: 2 },
  light: { min: -25, max: 25 },
} as const;

/** The sRGB corner whose hue angle defines each band's centre. */
const CORNERS: readonly (readonly [number, number, number])[] = [
  [255, 0, 0], // Red
  [255, 255, 0], // Yellow
  [0, 255, 0], // Green
  [0, 255, 255], // Cyan
  [0, 0, 255], // Blue
  [255, 0, 255], // Magenta
];

function cornerLab(rgb: readonly [number, number, number]): { hue: number; chroma: number } {
  const lab = new Float32Array(3);
  srgbToLab(rgb[0], rgb[1], rgb[2], lab, 0);
  const a = lab[1] ?? 0;
  const b = lab[2] ?? 0;
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return { hue: hue < 0 ? hue + 360 : hue, chroma: Math.hypot(a, b) };
}

const CORNER_LAB = CORNERS.map(cornerLab);

/**
 * Band centres in degrees, ascending. Derived so they can never drift
 * from the colour code; `tests/mixer.test.ts` re-derives them.
 */
export const BAND_CENTRES: readonly number[] = CORNER_LAB.map((c) => c.hue);

/**
 * The nominal full-saturation chroma: the most chromatic colour sRGB
 * can express (blue, C\* ≈ 133.8). "Nominal" is the point — the range
 * slider means the same thing on every picture, so the same setting
 * gives the same result and a re-crop does not move it. The
 * observed-range alternative was considered and declined (D211).
 */
export const NOMINAL_CHROMA: number = Math.max(...CORNER_LAB.map((c) => c.chroma));

/**
 * Below this nominal saturation a pixel's hue is noise, and every
 * hue-dependent operation here fades out across it.
 *
 * Both controls need this, for the same reason. Raising the range's
 * floor must not turn a grey sky lilac; and a *band* must not own a
 * near-grey either, or the "red" slider's lightness offset lands on
 * shadows and neutrals that merely round towards red — the classic
 * H/S/L-mixer artefact. Note that "grey" is not `chroma === 0`: the
 * adjust stage's tabled conversion leaves a nominally neutral pixel
 * with a small non-zero a/b, so an exact-zero test catches nothing.
 */
export const LOW_SAT_KNEE = 0.08;

/** A band with nothing done to it. */
export function identityBand(): MixerBand {
  return { hue: 0, sat: 1, light: 0 };
}

/** Six untouched bands — the schema default. */
export function identityMixer(): MixerBands {
  return [
    identityBand(),
    identityBand(),
    identityBand(),
    identityBand(),
    identityBand(),
    identityBand(),
  ];
}

/** True when no band would change a pixel. */
export function mixerIsIdentity(mixer: MixerBands | undefined): boolean {
  if (mixer === undefined) return true;
  return mixer.every((b) => b.hue === 0 && b.sat === 1 && b.light === 0);
}

/** True when no band rotates hue — lets the hot loop skip sin/cos. */
export function mixerHasNoHueShift(mixer: MixerBands): boolean {
  return mixer.every((b) => b.hue === 0);
}

/** The saturation range: an output band on the nominal 0–1 scale. */
export interface SaturationRange {
  lo: number;
  hi: number;
}

/** The full nominal range — the identity. */
export function identityRange(): SaturationRange {
  return { lo: 0, hi: 1 };
}

/** True when the remap is the identity map. */
export function rangeIsIdentity(range: SaturationRange | undefined): boolean {
  if (range === undefined) return true;
  return range.lo === 0 && range.hi === 1;
}

/** Hermite smoothstep on an already-clamped 0–1 input. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * How much this pixel's hue can be trusted: 0 for a neutral, 1 once
 * saturation clears {@link LOW_SAT_KNEE}. Every hue-dependent effect
 * is scaled by it, so a grey is untouchable by construction rather
 * than by a guard that has to be remembered at each call site.
 */
export function hueConfidence(nominalSaturation: number): number {
  if (nominalSaturation >= LOW_SAT_KNEE) return 1;
  if (nominalSaturation <= 0) return 0;
  return smoothstep(nominalSaturation / LOW_SAT_KNEE);
}

/**
 * Blend the two bands bracketing `hue` (degrees, 0–360).
 *
 * Exactly two bands ever contribute and their weights sum to 1, so
 * six identity bands are the identity for any hue — the property the
 * hot loop's fast path depends on. Smoothstep rather than a linear
 * ramp so a band's influence arrives and leaves without a crease at
 * the centres.
 */
export function blendBands(mixer: MixerBands, hue: number): MixerBand {
  const n = BAND_CENTRES.length;
  let i = n - 1; // the wrap segment, until proven otherwise
  for (let k = 0; k < n; k++) {
    const start = BAND_CENTRES[k] ?? 0;
    const end = BAND_CENTRES[(k + 1) % n] ?? 0;
    const within = k === n - 1 ? hue >= start || hue < end : hue >= start && hue < end;
    if (within) {
      i = k;
      break;
    }
  }
  const j = (i + 1) % n;
  const start = BAND_CENTRES[i] ?? 0;
  const end = BAND_CENTRES[j] ?? 0;
  // The final segment wraps past 360°, so measure both in its frame.
  const span = i === n - 1 ? end + 360 - start : end - start;
  const offset = i === n - 1 && hue < end ? hue + 360 - start : hue - start;
  const s = span <= 0 ? 0 : smoothstep(Math.min(1, Math.max(0, offset / span)));
  const lo = mixer[i] ?? identityBand();
  const hi = mixer[j] ?? identityBand();
  return {
    hue: lo.hue + (hi.hue - lo.hue) * s,
    sat: lo.sat + (hi.sat - lo.sat) * s,
    light: lo.light + (hi.light - lo.light) * s,
  };
}

/**
 * Remap one nominal saturation (0–1) through the range, with the
 * low-saturation roll-off.
 *
 * Nominal, not observed: `s` is chroma over {@link NOMINAL_CHROMA}, so
 * the mapping does not depend on what is in the picture. The roll-off
 * fades the whole remap towards the identity as `s` approaches 0, so
 * a raised floor lifts colours that have a hue and leaves near-greys
 * where they are.
 */
export function remapSaturation(s: number, range: SaturationRange): number {
  const target = range.lo + s * (range.hi - range.lo);
  return s + hueConfidence(s) * (target - s);
}

/**
 * A band's controls faded by hue confidence — the form the hot loop
 * applies. At `confidence` 0 this is exactly the identity band, so a
 * neutral pixel cannot be moved by any band's setting.
 */
export function fadeBand(band: MixerBand, confidence: number): MixerBand {
  if (confidence >= 1) return band;
  return {
    hue: band.hue * confidence,
    sat: 1 + (band.sat - 1) * confidence,
    light: band.light * confidence,
  };
}
