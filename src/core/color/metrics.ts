/**
 * Colour-distance metrics for palette matching. Both return SQUARED
 * distances — nearest-neighbour search only compares, so the square
 * root is never taken (architecture.md → "Colour reduction strategy").
 */

/** Metric identifiers; the project-file/pipeline serialisable form. */
export type ColorMetric = 'rgb' | 'lab';

/** Squared Euclidean distance in sRGB space (channels 0–255). */
export function euclideanRgbSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Squared CIE76 ΔE between two Lab triples stored in Float32Arrays
 * (L 0–100, D65). CIE76 is the MVP metric; CIEDE2000 is parked on the
 * wish-list (§6).
 */
export function deltaE76Sq(
  lab1: Float32Array,
  offset1: number,
  lab2: Float32Array,
  offset2: number,
): number {
  const dl = (lab1[offset1] ?? 0) - (lab2[offset2] ?? 0);
  const da = (lab1[offset1 + 1] ?? 0) - (lab2[offset2 + 1] ?? 0);
  const db = (lab1[offset1 + 2] ?? 0) - (lab2[offset2 + 2] ?? 0);
  return dl * dl + da * da + db * db;
}
