/**
 * The three-point lightness curve — the shared primitive behind tone
 * mode's matching curve (TONE-01) and the adjust stage's source remap
 * (ADJUST-01).
 *
 * Exactly three points — bottom, mid, top — each adjustable on both
 * axes, so an inverted mapping is legal by construction and no free-
 * point spline exists to maintain (the D200 decision of record). Both
 * axes are L\* 0–100.
 *
 * The two curves are deliberately **not** folded: tone's remaps the
 * picture's lightness inside the matching metric, adjust's remaps the
 * picture itself before the resize, and they persist in different
 * blocks. What they share is this maths, which is why it lives here
 * rather than in either owner — the CREATIVE-01 prototype split it the
 * same way (`tone-curve.ts` beside `adjust-proto.ts`).
 */

/** One curve point: input → output lightness, both L\* 0–100. */
export interface CurvePoint {
  in: number;
  out: number;
}

/** Bottom, mid, top; `in` values non-decreasing (the UI enforces it). */
export type LightnessCurve = readonly [CurvePoint, CurvePoint, CurvePoint];

/** The no-op curve: y = x with the mid point on the diagonal. */
export function identityCurve(): [CurvePoint, CurvePoint, CurvePoint] {
  return [
    { in: 0, out: 0 },
    { in: 50, out: 50 },
    { in: 100, out: 100 },
  ];
}

/** True when applying the curve changes nothing. */
export function isIdentityCurve(curve: LightnessCurve): boolean {
  const [lo, mid, hi] = curve;
  return (
    lo.in === 0 && lo.out === 0 && hi.in === 100 && hi.out === 100 && mid.in === mid.out
  );
}

/**
 * Curved lightness for `l` (L\* 0–100): piecewise linear through the
 * three points, clamped to the end outputs outside [bottom.in, top.in].
 * A zero-width segment returns its right point's output.
 */
export function applyCurve(curve: LightnessCurve, l: number): number {
  const [lo, mid, hi] = curve;
  if (l <= lo.in) return lo.out;
  if (l >= hi.in) return hi.out;
  const a = l <= mid.in ? lo : mid;
  const b = l <= mid.in ? mid : hi;
  const span = b.in - a.in;
  if (span <= 0) return b.out;
  return a.out + ((l - a.in) / span) * (b.out - a.out);
}

/** Serialisable identity of a curve, for cache keys and fingerprints. */
export function curveFingerprint(curve: LightnessCurve): string {
  return curve.map((p) => `${String(p.in)},${String(p.out)}`).join(';');
}
