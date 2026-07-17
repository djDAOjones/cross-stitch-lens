/**
 * Colour-space conversions: sRGB ↔ linear RGB ↔ CIE XYZ ↔ CIELAB.
 *
 * Conventions: sRGB channels are 0–255; linear RGB and XYZ are 0–1
 * floats; Lab is D65/2° (L 0–100). The sRGB transfer curve and the
 * sRGB→XYZ matrix are the IEC 61966-2-1 definitions; Lab uses the
 * CIE 1976 formulae. Golden tests pin these against published
 * reference values.
 */

/** D65 reference white (2° observer), Y normalised to 1. */
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

/** CIE f(t) linear-segment threshold: (6/29)^3. */
const EPSILON = 216 / 24389;
/** CIE f(t) linear-segment slope term: (29/6)^2 / 3 · t + 4/29. */
const KAPPA = 24389 / 27;

/** One sRGB channel 0–255 → linear 0–1 (IEC 61966-2-1 EOTF). */
export function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** One linear channel 0–1 → sRGB 0–255 (inverse EOTF), unrounded. */
export function linearChannelToSrgb(linear: number): number {
  const c =
    linear <= 0.0031308
      ? linear * 12.92
      : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return c * 255;
}

/**
 * sRGB 0–255 → Lab (D65, L 0–100), written into `out` at `offset`.
 * The out-parameter form avoids per-pixel allocation in loops
 * (AGENTS.md → "Engine purity").
 */
export function srgbToLab(
  r: number,
  g: number,
  b: number,
  out: Float32Array,
  offset = 0,
): void {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  // Linear sRGB → XYZ (D65), IEC 61966-2-1 matrix.
  const x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
  const z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl;

  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);

  out[offset] = 116 * fy - 16;
  out[offset + 1] = 500 * (fx - fy);
  out[offset + 2] = 200 * (fy - fz);
}

/** CIE 1976 f(t): cube root above ε, linear segment below. */
function labF(t: number): number {
  return t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

/** Inverse of {@link labF}. */
function labFInv(f: number): number {
  const f3 = f * f * f;
  return f3 > EPSILON ? f3 : (116 * f - 16) / KAPPA;
}

/**
 * Lab (D65, L 0–100) → sRGB 0–255, written into `out` at `offset`.
 * Out-of-gamut colours are clamped per channel; values are rounded to
 * integers (the buffer currency is 8-bit sRGB).
 */
export function labToSrgb(
  l: number,
  a: number,
  bStar: number,
  out: Uint8ClampedArray,
  offset = 0,
): void {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - bStar / 200;

  const x = labFInv(fx) * XN;
  const y = labFInv(fy) * YN;
  const z = labFInv(fz) * ZN;

  // XYZ → linear sRGB (inverse of the matrix above).
  const rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gl = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  // Uint8ClampedArray clamps and rounds on store.
  out[offset] = linearChannelToSrgb(rl);
  out[offset + 1] = linearChannelToSrgb(gl);
  out[offset + 2] = linearChannelToSrgb(bl);
}
