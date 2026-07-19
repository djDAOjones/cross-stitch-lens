/**
 * WGSL compute kernels for the colour-reduction path (architecture.md
 * → "Colour reduction strategy"): LUT build (32,768 15-bit bins →
 * nearest palette index) and per-pixel palette mapping via that LUT.
 *
 * GPU colour maths runs in f32 (vs the TS reference's f64), so LUT
 * indices may differ from the reference on **near-ties** — two palette
 * entries at almost identical distance. That divergence is the
 * documented tolerance (decision-log D41), quantified by the f32
 * mirror in tests/helpers/lut-f32.ts. The mapping kernel is pure
 * integer lookup — bit-exact given the same LUT.
 */

/** Shared WGSL: sRGB → Lab (D65, L 0–100) in f32. */
const COLOR_LIB = /* wgsl */ `
// CIE f(t) linear-segment threshold (6/29)^3 and slope (29/6)^2 * 3,
// same constants as src/core/color/convert.ts, at f32 precision.
const EPSILON: f32 = 0.0088564516;
const KAPPA: f32 = 903.2963;
const XN: f32 = 0.95047;
const ZN: f32 = 1.08883;

fn srgb_channel_to_linear(channel: f32) -> f32 {
  let c = channel / 255.0;
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return pow((c + 0.055) / 1.055, 2.4);
}

fn lab_f(t: f32) -> f32 {
  if (t > EPSILON) {
    return pow(t, 1.0 / 3.0);
  }
  return (KAPPA * t + 16.0) / 116.0;
}

fn srgb_to_lab(r: f32, g: f32, b: f32) -> vec3f {
  let rl = srgb_channel_to_linear(r);
  let gl = srgb_channel_to_linear(g);
  let bl = srgb_channel_to_linear(b);
  let x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  let y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
  let z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl;
  let fx = lab_f(x / XN);
  let fy = lab_f(y);
  let fz = lab_f(z / ZN);
  return vec3f(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));
}
`;

/**
 * LUT-build kernel: one invocation per 15-bit bin. The metric is baked
 * at pipeline-creation time (`lab` converts the bin representative and
 * matches against pal_lab; `rgb` matches against pal_rgb directly).
 * Nearest search uses strict `<` — first minimum wins, matching the TS
 * reference's tie-breaking.
 */
export function lutBuildShader(metric: 'lab' | 'rgb'): string {
  const target =
    metric === 'lab'
      ? 'let target = srgb_to_lab(r, g, b);'
      : 'let target = vec3f(r, g, b);';
  const entry =
    metric === 'lab'
      ? `let entry = vec3f(pal_lab[i * 3u], pal_lab[i * 3u + 1u], pal_lab[i * 3u + 2u]);`
      : `let entry = vec3f(pal_rgb[i * 3u], pal_rgb[i * 3u + 1u], pal_rgb[i * 3u + 2u]);`;
  return /* wgsl */ `
${COLOR_LIB}

@group(0) @binding(0) var<storage, read> pal_rgb: array<f32>;
@group(0) @binding(1) var<storage, read> pal_lab: array<f32>;
@group(0) @binding(2) var<storage, read_write> lut: array<u32>;
@group(0) @binding(3) var<uniform> pal_count: u32;

// 5-bit bin -> representative 8-bit channel via bit replication,
// matching src/core/color/lut.ts binToChannel.
fn bin_to_channel(bin: u32) -> f32 {
  return f32((bin << 3u) | (bin >> 2u));
}

@compute @workgroup_size(64)
fn build_lut(@builtin(global_invocation_id) gid: vec3u) {
  let key = gid.x;
  if (key >= 32768u) {
    return;
  }
  let r = bin_to_channel((key >> 10u) & 31u);
  let g = bin_to_channel((key >> 5u) & 31u);
  let b = bin_to_channel(key & 31u);
  ${target}

  var best = 0u;
  var best_dist = 3.40282e38;
  for (var i = 0u; i < pal_count; i = i + 1u) {
    ${entry}
    let d = target - entry;
    let dist = dot(d, d);
    if (dist < best_dist) {
      best_dist = dist;
      best = i;
    }
  }
  lut[key] = best;
}
`;
}

/**
 * Palette-mapping kernel: one invocation per pixel. Pixels arrive as
 * packed RGBA u32s (little-endian byte order, i.e. a Uint32Array view
 * over the RGBA bytes); output palette colours are repacked the same
 * way with the source alpha carried through. Integer-only — bit-exact
 * vs the TS LUT path given the same LUT.
 */
export const MAP_SHADER = /* wgsl */ `
@group(0) @binding(0) var<storage, read> pixels: array<u32>;
@group(0) @binding(1) var<storage, read> lut: array<u32>;
@group(0) @binding(2) var<storage, read> pal_rgb: array<f32>;
@group(0) @binding(3) var<storage, read_write> out_pixels: array<u32>;
@group(0) @binding(4) var<uniform> pixel_count: u32;

@compute @workgroup_size(64)
fn map_palette(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= pixel_count) {
    return;
  }
  let px = pixels[i];
  let r = px & 0xffu;
  let g = (px >> 8u) & 0xffu;
  let b = (px >> 16u) & 0xffu;
  let a = (px >> 24u) & 0xffu;
  let key = ((r >> 3u) << 10u) | ((g >> 3u) << 5u) | (b >> 3u);
  let idx = lut[key] * 3u;
  let pr = u32(pal_rgb[idx]);
  let pg = u32(pal_rgb[idx + 1u]);
  let pb = u32(pal_rgb[idx + 2u]);
  out_pixels[i] = pr | (pg << 8u) | (pb << 16u) | (a << 24u);
}
`;
