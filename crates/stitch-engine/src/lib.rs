//! Floyd–Steinberg error diffusion — the WASM backend for the dither
//! stage. A line-for-line port of the TS reference
//! (`src/core/pipeline/dither.ts` + `lut.ts` `nearestIndex` +
//! `convert.ts` `srgbToLab`): it must stay **bit-exact** vs that
//! reference (AGENTS.md invariant), so every arithmetic step mirrors
//! the JS semantics — f32 storage widened to f64 for maths, `libm`
//! (fdlibm lineage, same as V8) for `pow`/`cbrt`, strict `<`
//! first-min-wins nearest search, exact-binary kernel weights.
//!
//! The palette's Lab values are computed on the TS side
//! (`paletteLab`, Float32Array) and passed in, so both backends match
//! against identical palette data by construction.

use wasm_bindgen::prelude::*;

/// D65 reference white (2° observer), Y normalised to 1.
const XN: f64 = 0.95047;
const ZN: f64 = 1.08883;
/// CIE f(t) linear-segment threshold: (6/29)^3.
const EPSILON: f64 = 216.0 / 24389.0;
/// CIE f(t) linear-segment slope term.
const KAPPA: f64 = 24389.0 / 27.0;

/// One sRGB channel 0–255 → linear 0–1 (IEC 61966-2-1 EOTF).
fn srgb_channel_to_linear(channel: f64) -> f64 {
    let c = channel / 255.0;
    if c <= 0.04045 {
        c / 12.92
    } else {
        libm::pow((c + 0.055) / 1.055, 2.4)
    }
}

/// CIE 1976 f(t): cube root above ε, linear segment below.
fn lab_f(t: f64) -> f64 {
    if t > EPSILON {
        libm::cbrt(t)
    } else {
        (KAPPA * t + 16.0) / 116.0
    }
}

/// sRGB 0–255 → Lab (D65, L 0–100), stored to f32 exactly as the TS
/// reference stores into its Float32Array scratch.
fn srgb_to_lab(r: f64, g: f64, b: f64) -> [f32; 3] {
    let rl = srgb_channel_to_linear(r);
    let gl = srgb_channel_to_linear(g);
    let bl = srgb_channel_to_linear(b);

    // Linear sRGB → XYZ (D65), IEC 61966-2-1 matrix (same literals as
    // the TS reference).
    let x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
    let y = 0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl;
    let z = 0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl;

    let fx = lab_f(x / XN);
    let fy = lab_f(y); // YN = 1.0
    let fz = lab_f(z / ZN);

    [
        (116.0 * fy - 16.0) as f32,
        (500.0 * (fx - fy)) as f32,
        (200.0 * (fy - fz)) as f32,
    ]
}

/// Exact nearest palette index (strict `<`, first minimum wins —
/// identical tie-breaking to the TS reference).
fn nearest_index(r: f64, g: f64, b: f64, use_lab: bool, pal_rgb: &[u8], pal_lab: &[f32]) -> usize {
    let count = pal_rgb.len() / 3;
    let mut best = 0usize;
    let mut best_dist = f64::INFINITY;
    if use_lab {
        let lab = srgb_to_lab(r, g, b);
        for i in 0..count {
            // Float32Array reads widen to f64 in JS; mirror that.
            let dl = lab[0] as f64 - pal_lab[i * 3] as f64;
            let da = lab[1] as f64 - pal_lab[i * 3 + 1] as f64;
            let db = lab[2] as f64 - pal_lab[i * 3 + 2] as f64;
            let d = dl * dl + da * da + db * db;
            if d < best_dist {
                best_dist = d;
                best = i;
            }
        }
    } else {
        for i in 0..count {
            let dr = r - pal_rgb[i * 3] as f64;
            let dg = g - pal_rgb[i * 3 + 1] as f64;
            let db = b - pal_rgb[i * 3 + 2] as f64;
            let d = dr * dr + dg * dg + db * db;
            if d < best_dist {
                best_dist = d;
                best = i;
            }
        }
    }
    best
}

/// Clamp a working value to displayable sRGB range.
fn clamp255(v: f64) -> f64 {
    if v < 0.0 {
        0.0
    } else if v > 255.0 {
        255.0
    } else {
        v
    }
}

/// Diffuse `error * weight` into the f32 working buffer at (x, y),
/// widening to f64 for the addition exactly as JS does.
#[allow(clippy::too_many_arguments)]
fn diffuse(
    work: &mut [f32],
    width: i64,
    height: i64,
    x: i64,
    y: i64,
    err_r: f64,
    err_g: f64,
    err_b: f64,
    weight: f64,
) {
    if x < 0 || x >= width || y >= height {
        return;
    }
    let i = ((y * width + x) * 3) as usize;
    work[i] = (work[i] as f64 + err_r * weight) as f32;
    work[i + 1] = (work[i + 1] as f64 + err_g * weight) as f32;
    work[i + 2] = (work[i + 2] as f64 + err_b * weight) as f32;
}

/// Sidecar value for a cell that was never matched to a thread — the
/// empty stitches the loop skips. Mirrors `EMPTY_INDEX` in
/// `src/core/types.ts`; the two must agree or the TS side reads
/// fabric as palette entry 0.
const EMPTY_INDEX: u16 = 0xffff;

/// Dither output: the RGBA buffer plus the palette-index sidecar.
///
/// The indices are not a convenience — they are the only unambiguous
/// answer to "which thread is this stitch?" once a palette can hold
/// two brands' threads at the same display colour (M7-BRAND-01).
/// Reconstructing them from the output RGB on the JS side would
/// silently pick whichever entry came first.
#[wasm_bindgen]
pub struct DitherResult {
    pixels: Vec<u8>,
    indices: Vec<u16>,
}

#[wasm_bindgen]
impl DitherResult {
    /// RGBA bytes, `width * height * 4`.
    #[wasm_bindgen(getter)]
    pub fn pixels(&self) -> Vec<u8> {
        self.pixels.clone()
    }

    /// Palette index per cell, `width * height`; `0xffff` = empty.
    #[wasm_bindgen(getter)]
    pub fn indices(&self) -> Vec<u16> {
        self.indices.clone()
    }
}

/// Floyd–Steinberg dither of an RGBA buffer against a palette.
///
/// * `pixels` — RGBA bytes, `width * height * 4`.
/// * `pal_rgb` — palette RGB triples (`paletteRgb` on the TS side).
/// * `pal_lab` — palette Lab triples as f32 (`paletteLab`); may be
///   empty when `use_lab` is false.
/// * Returns a new RGBA buffer plus its palette-index sidecar; alpha
///   passes through undiffused.
#[wasm_bindgen]
pub fn dither_floyd_steinberg(
    width: u32,
    height: u32,
    pixels: &[u8],
    pal_rgb: &[u8],
    pal_lab: &[f32],
    use_lab: bool,
    serpentine: bool,
) -> DitherResult {
    let (out, indices) = dither_impl(width, height, pixels, pal_rgb, pal_lab, use_lab, serpentine);
    DitherResult {
        pixels: out,
        indices,
    }
}

/// The dither itself, returning plain Rust values so the crate's own
/// tests do not have to go through `wasm_bindgen` types.
#[allow(clippy::too_many_arguments)]
fn dither_impl(
    width: u32,
    height: u32,
    pixels: &[u8],
    pal_rgb: &[u8],
    pal_lab: &[f32],
    use_lab: bool,
    serpentine: bool,
) -> (Vec<u8>, Vec<u16>) {
    let w = width as i64;
    let h = height as i64;
    let px = (width as usize) * (height as usize);
    let mut out = vec![0u8; pixels.len()];
    let mut indices = vec![EMPTY_INDEX; px];

    // Float working copy of the RGB channels; alpha never diffuses.
    let mut work = vec![0f32; px * 3];
    for p in 0..px {
        work[p * 3] = pixels[p * 4] as f32;
        work[p * 3 + 1] = pixels[p * 4 + 1] as f32;
        work[p * 3 + 2] = pixels[p * 4 + 2] as f32;
    }

    for y in 0..h {
        let rightward = !serpentine || y % 2 == 0;
        let (x_start, x_end, x_step): (i64, i64, i64) = if rightward {
            (0, w, 1)
        } else {
            (w - 1, -1, -1)
        };
        // Horizontal kernel offsets mirror with the scan direction.
        let ahead = x_step;

        let mut x = x_start;
        while x != x_end {
            let oi = ((y * w + x) * 4) as usize;
            // Mirrors the TS reference: a fully transparent cell is the
            // empty stitch (D9), carries no colour, and must neither be
            // quantised nor diffuse error into the real stitches around
            // it. See `dither.ts` for the defect this closes.
            if pixels[oi + 3] == 0 {
                x += x_step;
                continue; // out stays RGBA(0,0,0,0)
            }

            let wi = ((y * w + x) * 3) as usize;
            let r = clamp255(work[wi] as f64);
            let g = clamp255(work[wi + 1] as f64);
            let b = clamp255(work[wi + 2] as f64);

            let entry = nearest_index(r, g, b, use_lab, pal_rgb, pal_lab);
            indices[(y * w + x) as usize] = entry as u16;
            let idx = entry * 3;
            let pr = pal_rgb[idx];
            let pg = pal_rgb[idx + 1];
            let pb = pal_rgb[idx + 2];

            out[oi] = pr;
            out[oi + 1] = pg;
            out[oi + 2] = pb;
            out[oi + 3] = pixels[oi + 3];

            let err_r = r - pr as f64;
            let err_g = g - pg as f64;
            let err_b = b - pb as f64;

            diffuse(&mut work, w, h, x + ahead, y, err_r, err_g, err_b, 7.0 / 16.0);
            diffuse(&mut work, w, h, x - ahead, y + 1, err_r, err_g, err_b, 3.0 / 16.0);
            diffuse(&mut work, w, h, x, y + 1, err_r, err_g, err_b, 5.0 / 16.0);
            diffuse(&mut work, w, h, x + ahead, y + 1, err_r, err_g, err_b, 1.0 / 16.0);

            x += x_step;
        }
    }

    (out, indices)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Black + white palette, RGB triples.
    const BW_RGB: [u8; 6] = [0, 0, 0, 255, 255, 255];

    /// The RGBA half of a dither run — what most assertions look at.
    #[allow(clippy::too_many_arguments)]
    fn dither_floyd_steinberg(
        width: u32,
        height: u32,
        pixels: &[u8],
        pal_rgb: &[u8],
        pal_lab: &[f32],
        use_lab: bool,
        serpentine: bool,
    ) -> Vec<u8> {
        dither_impl(
            width, height, pixels, pal_rgb, pal_lab, use_lab, serpentine,
        )
        .0
    }

    fn grey_rgba(width: usize, height: usize, value: u8) -> Vec<u8> {
        let mut px = Vec::with_capacity(width * height * 4);
        for _ in 0..width * height {
            px.extend_from_slice(&[value, value, value, 255]);
        }
        px
    }

    #[test]
    fn output_pixels_are_palette_colours_with_alpha_passthrough() {
        let pixels = grey_rgba(4, 4, 128);
        let out = dither_floyd_steinberg(4, 4, &pixels, &BW_RGB, &[], false, true);
        assert_eq!(out.len(), pixels.len());
        for p in 0..16 {
            let rgb = [out[p * 4], out[p * 4 + 1], out[p * 4 + 2]];
            assert!(rgb == [0, 0, 0] || rgb == [255, 255, 255], "pixel {p}: {rgb:?}");
            assert_eq!(out[p * 4 + 3], 255);
        }
    }

    #[test]
    fn transparent_cells_do_not_diffuse_error_into_stitches() {
        // Palette with no near-black, so quantising a transparent
        // RGBA(0,0,0,0) cell would carry a −200/channel error.
        let pal: [u8; 6] = [200, 200, 200, 255, 255, 255];
        // Row of 220-grey with two transparent cells leading.
        let mut padded = vec![0u8, 0, 0, 0, 0, 0, 0, 0];
        padded.extend_from_slice(&grey_rgba(6, 1, 220));
        let out = dither_floyd_steinberg(8, 1, &padded, &pal, &[], false, false);

        // The empty cells stay empty and pick up no thread colour.
        assert_eq!(&out[0..8], &[0, 0, 0, 0, 0, 0, 0, 0]);

        // The stitches match the same content dithered on its own.
        let isolated = grey_rgba(6, 1, 220);
        let iso = dither_floyd_steinberg(6, 1, &isolated, &pal, &[], false, false);
        assert_eq!(&out[8..], &iso[..]);
    }

    #[test]
    fn deterministic_same_input_same_output() {
        let pixels = grey_rgba(8, 8, 100);
        let a = dither_floyd_steinberg(8, 8, &pixels, &BW_RGB, &[], false, true);
        let b = dither_floyd_steinberg(8, 8, &pixels, &BW_RGB, &[], false, true);
        assert_eq!(a, b);
    }

    #[test]
    fn first_pixel_takes_nearest_and_diffuses_error_right() {
        // 2×1 mid-grey: 128 is nearer white (127² < 128²); the error
        // −127 × 7/16 = −55.5625 lands on the neighbour, whose working
        // value 128 − 55.5625 = 72.4375 is then nearer black.
        let pixels = grey_rgba(2, 1, 128);
        let out = dither_floyd_steinberg(2, 1, &pixels, &BW_RGB, &[], false, false);
        assert_eq!(&out[0..3], &[255, 255, 255]);
        assert_eq!(&out[4..7], &[0, 0, 0]);
    }

    #[test]
    fn serpentine_reverses_odd_rows() {
        // On an asymmetric 8×4 gradient the odd rows scan
        // right-to-left under serpentine, so the two modes must
        // disagree somewhere.
        let mut pixels = Vec::new();
        for y in 0u64..4 {
            for x in 0u64..8 {
                let value = ((x * 31 + y * 57) % 256) as u8;
                pixels.extend_from_slice(&[value, value, value, 255]);
            }
        }
        let raster = dither_floyd_steinberg(8, 4, &pixels, &BW_RGB, &[], false, false);
        let serp = dither_floyd_steinberg(8, 4, &pixels, &BW_RGB, &[], false, true);
        assert_ne!(raster, serp);
    }

    #[test]
    fn lab_metric_matches_known_conversion_behaviour() {
        // Pure palette colours map to themselves under Lab: zero
        // error, so a solid buffer stays solid.
        let pal_lab: Vec<f32> = {
            let black = srgb_to_lab(0.0, 0.0, 0.0);
            let white = srgb_to_lab(255.0, 255.0, 255.0);
            [black, white].concat()
        };
        let pixels = grey_rgba(4, 4, 255);
        let out = dither_floyd_steinberg(4, 4, &pixels, &BW_RGB, &pal_lab, true, true);
        for p in 0..16 {
            assert_eq!(&out[p * 4..p * 4 + 3], &[255, 255, 255]);
        }
    }

    #[test]
    fn indices_name_the_entry_the_pixels_show_and_empty_cells_stay_empty() {
        // Two transparent cells then six 220-grey against a palette
        // with no near-black: the sidecar must mark the empty cells
        // 0xffff rather than palette entry 0, and every stitch's index
        // must agree with the RGB actually written.
        let pal: [u8; 6] = [200, 200, 200, 255, 255, 255];
        let mut padded = vec![0u8, 0, 0, 0, 0, 0, 0, 0];
        padded.extend_from_slice(&grey_rgba(6, 1, 220));
        let (out, indices) = dither_impl(8, 1, &padded, &pal, &[], false, false);

        assert_eq!(indices.len(), 8);
        assert_eq!(indices[0], EMPTY_INDEX);
        assert_eq!(indices[1], EMPTY_INDEX);
        for cell in 2..8 {
            let entry = indices[cell] as usize;
            assert!(entry < 2, "cell {cell} index {entry}");
            assert_eq!(out[cell * 4], pal[entry * 3]);
            assert_eq!(out[cell * 4 + 1], pal[entry * 3 + 1]);
            assert_eq!(out[cell * 4 + 2], pal[entry * 3 + 2]);
        }
    }

    #[test]
    fn srgb_to_lab_hits_published_reference_values() {
        // Same anchors the TS golden test uses: white → L=100, a=b=0;
        // black → all zeros (within f32 print precision).
        let white = srgb_to_lab(255.0, 255.0, 255.0);
        assert!((white[0] - 100.0).abs() < 0.01, "L {}", white[0]);
        assert!(white[1].abs() < 0.01 && white[2].abs() < 0.01);
        let black = srgb_to_lab(0.0, 0.0, 0.0);
        assert!(black[0].abs() < 1e-4 && black[1].abs() < 1e-4 && black[2].abs() < 1e-4);
    }
}
