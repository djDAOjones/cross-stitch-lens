/**
 * f32 mirror of the WGSL LUT-build arithmetic (src/backends/webgpu/
 * wgsl.ts): every intermediate rounded to f32 via Math.fround, the
 * same operation order, strict-`<` first-min-wins. Used to quantify —
 * in plain node, without a GPU — how far f32 colour maths can diverge
 * from the f64 TS reference: only on near-ties, where two palette
 * entries sit at almost identical distance. GPU hardware may round
 * differently again (FMA, pow approximation), but the divergence
 * class is the same and the near-tie bound is what the tolerance
 * test asserts.
 */

import { binToChannel } from '../../src/core/color/lut.ts';
import type { ColorMetric } from '../../src/core/color/metrics.ts';
import { paletteLab, paletteRgb } from '../../src/core/palette.ts';
import type { Palette } from '../../src/core/types.ts';

const F = Math.fround;

/** WGSL constants at f32 precision. */
const EPSILON = F(0.0088564516);
const KAPPA = F(903.2963);
const XN = F(0.95047);
const ZN = F(1.08883);

function srgbChannelToLinear(channel: number): number {
  const c = F(channel / 255);
  if (c <= F(0.04045)) return F(c / 12.92);
  return F(Math.pow(F(F(c + F(0.055)) / F(1.055)), 2.4));
}

function labF(t: number): number {
  if (t > EPSILON) return F(Math.pow(t, 1 / 3));
  return F(F(F(KAPPA * t) + 16) / 116);
}

/** sRGB 0–255 → Lab in f32 steps, mirroring the WGSL evaluation order. */
export function srgbToLabF32(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);
  const x = F(F(F(0.4124564 * rl) + F(0.3575761 * gl)) + F(0.1804375 * bl));
  const y = F(F(F(0.2126729 * rl) + F(0.7151522 * gl)) + F(0.072175 * bl));
  const z = F(F(F(0.0193339 * rl) + F(0.119192 * gl)) + F(0.9503041 * bl));
  const fx = labF(F(x / XN));
  const fy = labF(y);
  const fz = labF(F(z / ZN));
  return [F(F(116 * fy) - 16), F(500 * F(fx - fy)), F(200 * F(fy - fz))];
}

function distSqF32(
  t0: number,
  t1: number,
  t2: number,
  e0: number,
  e1: number,
  e2: number,
): number {
  const d0 = F(t0 - e0);
  const d1 = F(t1 - e1);
  const d2 = F(t2 - e2);
  return F(F(F(d0 * d0) + F(d1 * d1)) + F(d2 * d2));
}

/** Nearest palette index for one 15-bit bin, in f32 arithmetic. */
export function nearestBinF32(
  key: number,
  metric: ColorMetric,
  palRgb: Uint8ClampedArray,
  palLab: Float32Array,
): number {
  const r = binToChannel((key >> 10) & 31);
  const g = binToChannel((key >> 5) & 31);
  const b = binToChannel(key & 31);
  const target: [number, number, number] =
    metric === 'lab' ? srgbToLabF32(r, g, b) : [F(r), F(g), F(b)];
  const count = palRgb.length / 3;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i++) {
    const dist =
      metric === 'lab'
        ? distSqF32(
            target[0],
            target[1],
            target[2],
            palLab[i * 3] ?? 0,
            palLab[i * 3 + 1] ?? 0,
            palLab[i * 3 + 2] ?? 0,
          )
        : distSqF32(
            target[0],
            target[1],
            target[2],
            F(palRgb[i * 3] ?? 0),
            F(palRgb[i * 3 + 1] ?? 0),
            F(palRgb[i * 3 + 2] ?? 0),
          );
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Flattened palette data for the mirror (same arrays the WGSL sees). */
export function mirrorPalette(palette: Palette): {
  palRgb: Uint8ClampedArray;
  palLab: Float32Array;
} {
  return { palRgb: paletteRgb(palette), palLab: paletteLab(palette) };
}
