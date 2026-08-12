/**
 * Fabric sizing and thread estimation (M12, requirements §11 subset).
 * Pure arithmetic over stitch counts — no DOM, no I/O, and no hidden
 * constants: every factor in the model is a named, persisted setting,
 * and {@link estimateAssumptions} renders them as the disclosure
 * sentence the UI must show beside any result. An estimate is never a
 * guarantee (the M12 ticket's contract).
 *
 * Model (ticket → code):
 * - fabric count is stitches per inch (Aida terminology), stitching
 *   assumed **over one** fabric square;
 * - front geometry: a full cross is two diagonals, `2·√2 × pitch`;
 * - `routingFactor` multiplies for back travel and path overhead —
 *   an estimate, not measured routing;
 * - `wasteShare` adds start/finish and waste per colour;
 * - working `strands` of six-strand floss convert to purchased length
 *   by `strands / 6`;
 * - skeins round up per colour against `skeinMetres`.
 */

/** One inch in centimetres (exact). */
export const CM_PER_INCH = 2.54;
/** Strands in a standard skein of stranded cotton. */
export const SKEIN_STRANDS = 6;

/** Fabric and estimation settings, persisted per design (schema v9). */
export interface EstimateSettings {
  /** Fabric count, stitches per inch (Aida), over one. */
  fabricCount: number;
  /** Finishing margin added on every side when cutting, cm. */
  marginCm: number;
  /** Working strands stitched from the six in the skein. */
  strands: number;
  /** Multiplier on ideal front length for back travel and overhead. */
  routingFactor: number;
  /** Start/finish and waste share added per colour (0–1). */
  wasteShare: number;
  /** Purchasable six-strand skein length, metres. */
  skeinMetres: number;
}

/**
 * Defaults: 14-count Aida, a 5 cm cut margin, two working strands,
 * a conservative ×1.2 routing overhead, 10 % waste, and the 8 m
 * six-strand skein DMC and Anchor both sell.
 */
export const DEFAULT_ESTIMATES: EstimateSettings = {
  fabricCount: 14,
  marginCm: 5,
  strands: 2,
  routingFactor: 1.2,
  wasteShare: 0.1,
  skeinMetres: 8,
};

/** Physical design and cut dimensions on the chosen fabric. */
export interface PhysicalSize {
  widthCm: number;
  heightCm: number;
  widthIn: number;
  heightIn: number;
  /** Design size plus the finishing margin on every side. */
  cutWidthCm: number;
  cutHeightCm: number;
}

/** Design and cut size for a `gridW`×`gridH` design. */
export function physicalSize(
  gridW: number,
  gridH: number,
  settings: Pick<EstimateSettings, 'fabricCount' | 'marginCm'>,
): PhysicalSize {
  const widthIn = gridW / settings.fabricCount;
  const heightIn = gridH / settings.fabricCount;
  const widthCm = widthIn * CM_PER_INCH;
  const heightCm = heightIn * CM_PER_INCH;
  return {
    widthCm,
    heightCm,
    widthIn,
    heightIn,
    cutWidthCm: widthCm + 2 * settings.marginCm,
    cutHeightCm: heightCm + 2 * settings.marginCm,
  };
}

/**
 * The design's centre, in 1-based stitch coordinates the way charts
 * are counted (§16 numbering): the centre of a 200-wide design is
 * between stitches — this names the stitch the centre falls in,
 * rounding toward the origin for even sizes.
 */
export function centreStitch(gridW: number, gridH: number): { x: number; y: number } {
  return {
    x: Math.max(1, Math.ceil(gridW / 2)),
    y: Math.max(1, Math.ceil(gridH / 2)),
  };
}

/** One colour's qualified thread estimate. */
export interface ThreadEstimate {
  /** Purchased six-strand length, metres. */
  metres: number;
  /** Skeins rounded up (0 for zero stitches). */
  skeins: number;
}

/**
 * Thread for `stitches` full crosses, as purchased six-strand
 * metres and whole skeins. Zero stitches is zero skeins — an unused
 * colour never rounds up to a purchase.
 */
export function threadEstimate(stitches: number, settings: EstimateSettings): ThreadEstimate {
  if (stitches <= 0) return { metres: 0, skeins: 0 };
  const pitchM = CM_PER_INCH / settings.fabricCount / 100;
  const frontPerStitch = 2 * Math.SQRT2 * pitchM;
  const workingMetres =
    stitches * frontPerStitch * settings.routingFactor * (1 + settings.wasteShare);
  const purchasedMetres = workingMetres * (settings.strands / SKEIN_STRANDS);
  return {
    metres: purchasedMetres,
    skeins: Math.max(1, Math.ceil(purchasedMetres / settings.skeinMetres)),
  };
}

/**
 * Totals across per-colour stitch counts. Skeins sum the per-colour
 * round-ups — colours cannot share a skein — so the total is the
 * shopping answer, not `ceil(total metres / skein)`.
 */
export function totalEstimate(
  perColourStitches: readonly number[],
  settings: EstimateSettings,
): ThreadEstimate {
  let metres = 0;
  let skeins = 0;
  for (const stitches of perColourStitches) {
    const one = threadEstimate(stitches, settings);
    metres += one.metres;
    skeins += one.skeins;
  }
  return { metres, skeins };
}

/**
 * The disclosure sentence shown beside any estimate — the model's
 * every assumption in words, so a result can never read as measured.
 */
export function estimateAssumptions(settings: EstimateSettings): string {
  const waste = Math.round(settings.wasteShare * 100);
  return (
    `Estimates assume full crosses over one square at ` +
    `${String(settings.fabricCount)}-count, ` +
    `×${String(settings.routingFactor)} for travel between stitches, ` +
    `${String(waste)}% waste, ${String(settings.strands)} of ` +
    `${String(SKEIN_STRANDS)} strands, and ${String(settings.skeinMetres)} m skeins — ` +
    `plan with them, don't promise by them.`
  );
}
