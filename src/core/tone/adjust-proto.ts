/**
 * CREATIVE-01 prototype — slice-2a adjustment operations and the
 * built-in preset candidates the sign-off sitting owes (~8, with
 * before/afters as evidence).
 *
 * Slice 2a is exactly: black point, white point, tone curve, global
 * saturation — and the decision of record binds the black/white
 * points to the curve's endpoints, so the whole 2a parameter set is
 * one three-point curve (reused from tone-curve.ts) plus one
 * saturation factor. Applied in Lab: L through the curve, a/b scaled.
 * The engine note (ticket → slice-2): the selection source must be
 * the adjusted picture — callers adjust first, select after.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the shipped build populates
 * `AdjustParams` in src/core/pipeline/adjust.ts instead, where the
 * stage already has its slot in the order.
 */

import { labToSrgb, srgbToLab } from '../color/convert.ts';
import { applyCurve, identityCurve, isIdentityCurve, type ToneCurve } from './tone-curve.ts';
import type { PixelBuffer } from '../types.ts';

/** Slice-2a parameters: the curve carries the black/white points. */
export interface AdjustProtoParams {
  curve: ToneCurve;
  /** a/b scale: 1 = untouched, 0 = greyscale. */
  saturation: number;
}

/** True when applying the params would change nothing. */
export function adjustProtoIsIdentity(params: AdjustProtoParams): boolean {
  return params.saturation === 1 && isIdentityCurve(params.curve);
}

/** Apply the 2a operations; alpha rides through untouched. */
export function applyAdjustProto(
  input: PixelBuffer,
  params: AdjustProtoParams,
): PixelBuffer {
  if (adjustProtoIsIdentity(params)) {
    return {
      width: input.width,
      height: input.height,
      data: new Uint8ClampedArray(input.data),
    };
  }
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src.length);
  const lab = new Float32Array(3);
  const sat = Math.max(0, params.saturation);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const alpha = src[i + 3] ?? 0;
    out[i + 3] = alpha;
    if (alpha === 0) continue;
    srgbToLab(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0, lab, 0);
    labToSrgb(
      applyCurve(params.curve, lab[0] ?? 0),
      (lab[1] ?? 0) * sat,
      (lab[2] ?? 0) * sat,
      out,
      i,
    );
  }
  return { width, height, data: out };
}

/** One candidate for the sitting's built-in starter set. */
export interface AdjustPresetCandidate {
  id: string;
  label: string;
  params: AdjustProtoParams;
  /** One line of why — the shape the sitting judges. */
  basis: string;
}

function curve(
  bottom: [number, number],
  mid: [number, number],
  top: [number, number],
): ToneCurve {
  return [
    { in: bottom[0], out: bottom[1] },
    { in: mid[0], out: mid[1] },
    { in: top[0], out: top[1] },
  ];
}

/**
 * The ~8 candidates (plus None as the comparison state). Working
 * names; the sitting signs, renames, cuts and re-tunes — these exist
 * so the before/afters have something to show.
 */
export const ADJUST_PRESET_CANDIDATES: readonly AdjustPresetCandidate[] = [
  {
    id: 'none',
    label: 'None',
    params: { curve: identityCurve(), saturation: 1 },
    basis: 'the mandatory comparison state',
  },
  {
    id: 'contrast',
    label: 'Contrast stretch',
    params: { curve: curve([12, 0], [50, 50], [88, 100]), saturation: 1 },
    basis: 'pins the darkest content to black and the lightest to white before reduction',
  },
  {
    id: 'punch',
    label: 'Punch',
    params: { curve: curve([8, 0], [50, 48], [92, 100]), saturation: 1.2 },
    basis: 'a mild stretch plus saturation: flat photos stop selecting grey threads',
  },
  {
    id: 'faded',
    label: 'Faded',
    params: { curve: curve([0, 14], [50, 55], [100, 90]), saturation: 0.8 },
    basis: 'lifted black, capped white, softened colour — the washed print look',
  },
  {
    id: 'high-key',
    label: 'High key',
    params: { curve: curve([0, 6], [42, 62], [100, 100]), saturation: 0.95 },
    basis: 'mids pushed light so pale palettes carry the picture',
  },
  {
    id: 'low-key',
    label: 'Low key',
    params: { curve: curve([0, 0], [58, 40], [100, 94]), saturation: 1.05 },
    basis: 'mids pulled dark for moody ladders and deep palettes',
  },
  {
    id: 'muted',
    label: 'Muted',
    params: { curve: identityCurve(), saturation: 0.6 },
    basis: 'colour pulled toward neutral so tone carries more of the design',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    params: { curve: curve([4, 0], [50, 52], [96, 100]), saturation: 1.4 },
    basis: 'saturation pushed hard: hue-family palettes get something to bite on',
  },
  {
    id: 'mono-prep',
    label: 'Mono prep',
    params: { curve: curve([10, 0], [50, 50], [90, 100]), saturation: 0 },
    basis: 'greyscale plus a stretch — the natural feed for tone mode and ladders',
  },
];
