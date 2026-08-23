/**
 * CREATIVE-01 prototype — the three-point tone curve.
 *
 * Slice-1 decision of record: exactly three points — bottom, mid,
 * top — each adjustable on both axes, so an inverted mapping is legal
 * by construction; no free-point spline. Piecewise linear between the
 * points; inputs outside [bottom.in, top.in] clamp to the end outputs.
 * The curve remaps the *picture's* lightness before matching; palette
 * lightness is never curved.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket.
 */

/** One curve point: input → output lightness, both L* 0–100. */
export interface CurvePoint {
  in: number;
  out: number;
}

/** Bottom, mid, top; `in` values non-decreasing (the UI enforces it). */
export type ToneCurve = readonly [CurvePoint, CurvePoint, CurvePoint];

/** The no-op curve: y = x with the mid point on the diagonal. */
export function identityCurve(): [CurvePoint, CurvePoint, CurvePoint] {
  return [
    { in: 0, out: 0 },
    { in: 50, out: 50 },
    { in: 100, out: 100 },
  ];
}

/** True when applying the curve changes nothing. */
export function isIdentityCurve(curve: ToneCurve): boolean {
  const [lo, mid, hi] = curve;
  return (
    lo.in === 0 &&
    lo.out === 0 &&
    hi.in === 100 &&
    hi.out === 100 &&
    mid.in === mid.out
  );
}

/** Curved lightness for `l` (L* 0–100). */
export function applyCurve(curve: ToneCurve, l: number): number {
  const [lo, mid, hi] = curve;
  if (l <= lo.in) return lo.out;
  if (l >= hi.in) return hi.out;
  const a = l <= mid.in ? lo : mid;
  const b = l <= mid.in ? mid : hi;
  const span = b.in - a.in;
  if (span <= 0) return b.out;
  return a.out + ((l - a.in) / span) * (b.out - a.out);
}
