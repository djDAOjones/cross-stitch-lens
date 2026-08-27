/**
 * Adjust stage — the image adjustments (§9 first slice, ADJUST-01 /
 * CREATIVE-01 slice 2a).
 *
 * The whole 2a parameter set is **one three-point lightness curve plus
 * one saturation factor**: the black and white points ARE the curve's
 * end points (the D200 decision of record), and the curve replaces
 * gamma and contrast, so no separate operation exists for any of them.
 * Applied in Lab — L through the curve, a/b scaled by the saturation
 * factor — because that is where "lightness" and "colour" separate the
 * way the controls promise.
 *
 * Position (§7): first, before the resize, so adjustments act on the
 * picture rather than on the stitch grid. That also means this is the
 * only stage doing per-pixel colour maths at **source** resolution,
 * which is why the hot loop is what it is — see "Cost" below.
 *
 * Two invariants this stage must not break:
 *
 * - **The LUT fingerprint is untouched.** Adjustments change what the
 *   quantiser sees, never which threads it may choose, so nothing here
 *   enters the palette/metric/tone cache key (D46). Asserted by test.
 * - **The selection source is the adjusted picture.** `fullRgbVariant`
 *   keeps these params, so the buffer the colour-count selection reads
 *   has been through this stage (the CREATIVE-01 slice-2 engine note).
 *
 * ## Cost — why the hot loop is hand-rolled
 *
 * Measured on the exhaustive sweep and the 600² noise fixture (node
 * 24, this machine — ADJUST-01 audit): a per-pixel round trip through
 * the exact `srgbToLab`/`labToSrgb` costs **≈ 183 ms per megapixel**,
 * which at a w1280 capture is ~170 ms on top of a ~41 ms frame and
 * would spend most of the ≥ 4 updates/s budget (D135) on one stage.
 * Tabling the two transcendental steps — the 256-entry sRGB→linear
 * table (exact: channels are integers) and interpolated tables for
 * CIE f(t)'s cube root and the inverse transfer curve — brings that to
 * **≈ 55 ms/MP**, with a measured worst case of **1 sRGB level** per
 * channel against the exact converts over 4M+ colours × seven
 * adjustment settings, and exactly 0 for the identity.
 *
 * The rejected alternatives are recorded because they look obvious: a
 * 15-bit nearest-bin LUT is 4.3 ms/MP but bands (max 37 levels), and
 * 32³/64³ trilinear grids are *both* slower (48–57 ms/MP) and less
 * accurate (max 9–14 levels) than the tables. A previous-pixel memo
 * was measured too and rejected: neutral on smooth content, *worse*
 * on noise. Dropping the `?? 0` index guards is worth ~12 % and is
 * left on the table — the codebase's hot loops all read this way.
 *
 * The tolerance is the documented kind (conventions.md): this stage's
 * TS implementation is the reference, the tables are pure and
 * deterministic, and `tests/adjust.test.ts` pins the ≤ 1 level bound.
 */

import {
  linearChannelToSrgb,
  srgbChannelToLinear,
} from '../color/convert.ts';
import {
  applyCurve,
  curveFingerprint,
  identityCurve,
  isIdentityCurve,
  type LightnessCurve,
} from '../color/curve.ts';
import {
  blendBands,
  fadeBand,
  hueConfidence,
  identityMixer,
  identityRange,
  mixerHasNoHueShift,
  mixerIsIdentity,
  NOMINAL_CHROMA,
  rangeIsIdentity,
  remapSaturation,
  type MixerBands,
  type SaturationRange,
} from '../color/mixer.ts';
import type { PixelBuffer, Stage } from '../types.ts';
import { clonePixelBuffer } from './index.ts';

/**
 * Parameters for {@link adjustStage} (schema v14).
 *
 * `curve` remaps lightness (L\* 0–100 on both axes) and carries the
 * black and white points at its end points; `saturation` scales Lab
 * a/b — 1 leaves colour untouched, 0 is greyscale, above 1 pushes.
 * `mixer` and `range` are slice 2b (ADJUST-02), both identity by
 * default and both collapsed in the UI.
 *
 * Order of operations, and why: **curve → mixer → range → saturation**.
 * The curve is the lightness base; the mixer is the per-hue correction
 * on top of it; the range then rescales the saturation *distribution*
 * that results; global saturation is the single final multiplier. Any
 * other order makes one control silently redefine another's units —
 * a global saturation applied before the range, for instance, would
 * move what "50 %" means.
 */
export interface AdjustParams {
  curve: LightnessCurve;
  saturation: number;
  mixer: MixerBands;
  range: SaturationRange;
}

/** Largest saturation factor the controls and the schema allow. */
export const MAX_SATURATION = 2;

/** A fresh untouched adjustment — the schema-v14 default. */
export function defaultAdjust(): AdjustParams {
  return {
    curve: identityCurve(),
    saturation: 1,
    mixer: identityMixer(),
    range: identityRange(),
  };
}

/**
 * Whether these params make the stage a no-op.
 *
 * `buildStages` uses this to leave the stage out while it cannot
 * change anything (M5-PERF-25): running it would buy a full-frame
 * clone and nothing else. The stage is not deleted — it stays the
 * named slot saved projects and both order presets already carry.
 */
export function adjustIsIdentity(params: AdjustParams | undefined): boolean {
  if (params === undefined) return true;
  return (
    params.saturation === 1 &&
    isIdentityCurve(params.curve) &&
    mixerIsIdentity(params.mixer) &&
    rangeIsIdentity(params.range)
  );
}

/**
 * Serialisable identity of an adjustment, for the caches keyed on
 * "what does the resized full-RGB picture look like?" — the selection
 * source and the compare half. Deliberately NOT part of the LUT key.
 */
export function adjustFingerprint(params: AdjustParams | undefined): string {
  if (adjustIsIdentity(params) || params === undefined) return 'off';
  const parts = [`c${curveFingerprint(params.curve)}`, `s${String(params.saturation)}`];
  // Appended only when engaged, so every fingerprint minted before
  // slice 2b keeps its exact string and the caches it keys stay warm.
  if (!mixerIsIdentity(params.mixer)) {
    parts.push(
      `m${params.mixer
        .map((b) => `${String(b.hue)},${String(b.sat)},${String(b.light)}`)
        .join(';')}`,
    );
  }
  if (!rangeIsIdentity(params.range)) {
    parts.push(`r${String(params.range.lo)},${String(params.range.hi)}`);
  }
  return parts.join('|');
}

// ---------------------------------------------------------------------
// The hot loop's tables (pure, deterministic, built once)
// ---------------------------------------------------------------------

/** CIE f(t) linear-segment threshold, (6/29)³ — as in `convert.ts`. */
const EPSILON = 216 / 24389;
/** CIE f(t) linear-segment slope term — as in `convert.ts`. */
const KAPPA = 24389 / 27;
/** D65 reference white (2° observer), Y normalised to 1. */
const XN = 0.95047;
const ZN = 1.08883;

/** Interpolation table resolution; 4096 measured the same worst case
 *  as 8192, so the smaller table ships (66 KB for the pair). */
const TABLE_N = 4096;
/** Upper end of the tabled f(t) domain: XYZ/white never exceeds ~1.1. */
const T_MAX = 1.16;

/** sRGB channel → linear. Exact: the input is an integer 0–255. */
const LINEAR = new Float64Array(256);
/** Cube root over [0, T_MAX], read with linear interpolation. */
const CUBE_ROOT = new Float64Array(TABLE_N + 2);
/** Linear 0–1 → sRGB 0–255, read with linear interpolation. */
const ENCODE = new Float64Array(TABLE_N + 2);
for (let i = 0; i < 256; i++) LINEAR[i] = srgbChannelToLinear(i);
for (let i = 0; i <= TABLE_N + 1; i++) {
  CUBE_ROOT[i] = Math.cbrt((i * T_MAX) / TABLE_N);
  ENCODE[i] = linearChannelToSrgb(i / TABLE_N);
}
const CUBE_ROOT_SCALE = TABLE_N / T_MAX;

/** CIE f(t), tabled above the linear segment. */
function labF(t: number): number {
  if (t <= EPSILON) return (KAPPA * t + 16) / 116;
  if (t >= T_MAX) return Math.cbrt(t);
  const f = t * CUBE_ROOT_SCALE;
  const i = f | 0;
  const a = CUBE_ROOT[i] ?? 0;
  return a + ((CUBE_ROOT[i + 1] ?? a) - a) * (f - i);
}

/** Inverse of {@link labF} — cheap enough to compute exactly. */
function labFInverse(f: number): number {
  const cube = f * f * f;
  return cube > EPSILON ? cube : (116 * f - 16) / KAPPA;
}

/** Linear 0–1 → sRGB 0–255, tabled; the array clamps the ends. */
function encode(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  const f = v * TABLE_N;
  const i = f | 0;
  const a = ENCODE[i] ?? 0;
  return a + ((ENCODE[i + 1] ?? a) - a) * (f - i);
}

/**
 * Apply the adjustment to a buffer, allocating the output (stages
 * never alias or mutate their input).
 *
 * Fully transparent cells are copied through untouched, exactly as
 * the dither scan skips them (D9/D49): they carry no colour, so
 * curving a nominal black would invent one.
 */
export function applyAdjust(input: PixelBuffer, params: AdjustParams): PixelBuffer {
  if (adjustIsIdentity(params)) return clonePixelBuffer(input);
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const curve = params.curve;
  const flat = isIdentityCurve(curve);
  const sat = Number.isFinite(params.saturation) ? Math.max(0, params.saturation) : 1;
  // Slice 2b, both off by default. When both are off the arithmetic
  // below is byte-for-byte the slice-2a loop — `a0 * sat` evaluates
  // exactly as the old `500 * (fx - fy) * sat` did, and nothing else
  // is touched. That matters: nine shipped presets and every saved
  // adjustment profile must render identically after this change.
  const mixer = params.mixer;
  const range = params.range;
  const mixerOn = !mixerIsIdentity(mixer);
  const rangeOn = !rangeIsIdentity(range);
  // Hue rotation is the only part needing sin/cos per pixel; a mixer
  // that only moves saturation and lightness skips both.
  const rotates = mixerOn && !mixerHasNoHueShift(mixer);
  for (let i = 0; i < src.length; i += 4) {
    const alpha = src[i + 3] ?? 0;
    out[i + 3] = alpha;
    if (alpha === 0) {
      // Copied through rather than left at zero: the identity path
      // preserves these bytes, so this one does too. Nothing
      // downstream reads them (resize premultiplies, dither skips),
      // but a stage that quietly rewrites pixels it declares
      // untouched is a trap for the next reader.
      out[i] = src[i] ?? 0;
      out[i + 1] = src[i + 1] ?? 0;
      out[i + 2] = src[i + 2] ?? 0;
      continue;
    }
    const rl = LINEAR[src[i] ?? 0] ?? 0;
    const gl = LINEAR[src[i + 1] ?? 0] ?? 0;
    const bl = LINEAR[src[i + 2] ?? 0] ?? 0;
    // Linear sRGB → XYZ (D65) → CIE f(t), whitepoint folded in.
    const fx = labF((0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / XN);
    const fy = labF(0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl);
    const fz = labF((0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / ZN);
    const l = 116 * fy - 16;
    let a0 = 500 * (fx - fy);
    let b0 = 200 * (fy - fz);
    let lOut = flat ? l : applyCurve(curve, l);

    if (mixerOn) {
      // Blend the two bands bracketing this pixel's hue, then apply
      // all three of their controls at that blended strength — faded
      // by how much the hue can be trusted, so a neutral is
      // untouchable. `chroma > 0` would not do it: the tabled
      // conversion leaves a nominally grey pixel with a small
      // non-zero a/b, which is enough to pick a band and take its
      // full lightness offset.
      const chroma = Math.hypot(a0, b0);
      const confidence = hueConfidence(chroma / NOMINAL_CHROMA);
      if (confidence > 0) {
        const hue = (Math.atan2(b0, a0) * 180) / Math.PI;
        const band = fadeBand(blendBands(mixer, hue < 0 ? hue + 360 : hue), confidence);
        if (rotates && band.hue !== 0) {
          const t = (band.hue * Math.PI) / 180;
          const cos = Math.cos(t);
          const sin = Math.sin(t);
          const rotated = a0 * cos - b0 * sin;
          b0 = a0 * sin + b0 * cos;
          a0 = rotated;
        }
        if (band.sat !== 1) {
          a0 *= band.sat;
          b0 *= band.sat;
        }
        // Lightness offset applies to every pixel in the band, so it
        // sits outside the chroma guard's intent — but a pixel with
        // no chroma has no band, and tinting a grey by "the red
        // slider" is exactly what the guard exists to prevent.
        if (band.light !== 0) lOut += band.light;
      }
    }

    if (rangeOn) {
      const chroma = Math.hypot(a0, b0);
      if (chroma > 0) {
        const s0 = Math.min(1, chroma / NOMINAL_CHROMA);
        const scale = remapSaturation(s0, range) / s0;
        a0 *= scale;
        b0 *= scale;
      }
    }

    const a = a0 * sat;
    const b = b0 * sat;
    // Back through Lab with the curved lightness. The clamp is on the
    // mixer path only: a band's lightness offset is the sole thing
    // that can push L\* out of range, and clamping unconditionally
    // would risk changing a slice-2a result in its last bit wherever
    // the tabled `labF` lands a hair outside 0–100.
    const gy = ((mixerOn ? (lOut < 0 ? 0 : lOut > 100 ? 100 : lOut) : lOut) + 16) / 116;
    const x = labFInverse(gy + a / 500) * XN;
    const y = labFInverse(gy);
    const z = labFInverse(gy - b / 200) * ZN;
    out[i] = encode(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
    out[i + 1] = encode(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
    out[i + 2] = encode(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
  }
  return { width: input.width, height: input.height, data: out };
}

/** The adjust stage: one curve plus one saturation factor, in Lab. */
export const adjustStage: Stage<AdjustParams> = {
  name: 'adjust',
  backends: {
    ts: (input: PixelBuffer, params: AdjustParams): PixelBuffer =>
      applyAdjust(input, params),
  },
};
