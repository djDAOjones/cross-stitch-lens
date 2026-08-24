/**
 * The built-in adjustment presets (ADJUST-01, CREATIVE-01 slice 2a) —
 * the third profile kind's read-only starter set, and the structural
 * matching that keeps a design honest about which one it is on.
 *
 * The nine are the CREATIVE-01 prototype's candidates, carried over
 * with their working names and their basis lines (the "Why:" the
 * editor shows, the D61/D116 pattern). Each is one three-point curve
 * plus one saturation factor, because that is the whole of slice 2a.
 *
 * **Working names, not signatures.** D200 leaves "the adjustment
 * starter set's final membership and names" open to the owner's
 * sitting; the prototype measured that every non-None candidate
 * changes 3–8 of 8 palette picks on the sample card, which is the
 * evidence the sitting judges — not a signature. Ids are identity and
 * never change with a label, and matching is structural
 * (`sameAdjust`), so a rename cannot orphan a saved reference.
 *
 * Pure data + pure comparison; no UI in here.
 */

import type { LightnessCurve } from '../color/curve.ts';
import { identityCurve } from '../color/curve.ts';
import type { AdjustParams } from './adjust.ts';

export interface AdjustPreset {
  id: string;
  label: string;
  params: AdjustParams;
  /** The one line of why this preset exists (the editor's "Why:"). */
  basis: string;
}

/** Terse three-point curve literal: bottom, mid, top as [in, out]. */
function curve(
  bottom: [number, number],
  mid: [number, number],
  top: [number, number],
): LightnessCurve {
  return [
    { in: bottom[0], out: bottom[1] },
    { in: mid[0], out: mid[1] },
    { in: top[0], out: top[1] },
  ];
}

/** The shipped presets, in display order. */
export const ADJUST_PRESETS: readonly AdjustPreset[] = [
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
    basis: 'greyscale plus a stretch — the natural feed for tone matching and ladders',
  },
];

/** Structural equality: the six curve numbers and the saturation. */
export function sameAdjust(a: AdjustParams, b: AdjustParams): boolean {
  if (a.saturation !== b.saturation) return false;
  for (let i = 0; i < 3; i++) {
    const p = a.curve[i];
    const q = b.curve[i];
    if (p === undefined || q === undefined) return false;
    if (p.in !== q.in || p.out !== q.out) return false;
  }
  return true;
}

/**
 * The built-in adjustment profile matching these params structurally,
 * or null — the honest unnamed state, never silently adopted (D116).
 */
export function matchBuiltInAdjust(params: AdjustParams): string | null {
  const hit = ADJUST_PRESETS.find((p) => sameAdjust(p.params, params));
  return hit === undefined ? null : `builtin:${hit.id}`;
}
