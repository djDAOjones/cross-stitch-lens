/**
 * Resize candidates for the M5-PERF-11 audit — **prototypes, not
 * shipping code**. They exist to be timed and diffed against the
 * `src/core/pipeline/resize.ts` oracle; nothing here may be imported
 * from `src/`. M5-PERF-21 owns landing whichever one M5C approves.
 *
 * All three reproduce the reference contract: grid-sized output,
 * uncovered cells left transparent, exact area averaging in
 * premultiplied alpha, `Uint8ClampedArray` rounding on store.
 */

import type { PixelBuffer } from '../../../src/core/types.ts';
import type { ResizeMode, ResizeParams } from '../../../src/core/pipeline/resize.ts';

/** The source rect and destination rect a mode maps between. */
export interface Placement {
  destX: number;
  destY: number;
  destW: number;
  destH: number;
  srcX0: number;
  srcY0: number;
  srcX1: number;
  srcY1: number;
}

/**
 * Geometry, lifted verbatim from the reference so a candidate can only
 * differ in *resampling*, never in placement. Contain/fit centring and
 * the letterbox must stay exact (ticket: "Contain/fit centring and
 * transparent letterbox cells must remain exact").
 */
export function placementFor(
  sw: number,
  sh: number,
  gw: number,
  gh: number,
  mode: ResizeMode,
): Placement {
  let destX = 0;
  let destY = 0;
  let destW = gw;
  let destH = gh;
  let srcX0 = 0;
  let srcY0 = 0;
  let srcX1 = sw;
  let srcY1 = sh;

  if (mode === 'contain' || mode === 'fit') {
    let scale = Math.min(gw / sw, gh / sh);
    if (mode === 'fit') scale = Math.min(scale, 1);
    destW = Math.max(1, Math.round(sw * scale));
    destH = Math.max(1, Math.round(sh * scale));
    destX = Math.floor((gw - destW) / 2);
    destY = Math.floor((gh - destH) / 2);
  } else if (mode === 'cover') {
    const scale = Math.max(gw / sw, gh / sh);
    const visW = gw / scale;
    const visH = gh / scale;
    srcX0 = (sw - visW) / 2;
    srcY0 = (sh - visH) / 2;
    srcX1 = srcX0 + visW;
    srcY1 = srcY0 + visH;
  }
  return { destX, destY, destW, destH, srcX0, srcY0, srcX1, srcY1 };
}

/**
 * Candidate H — hoisted/specialised area average.
 *
 * Same algorithm, same summation order, same values as the reference:
 * the per-output-column horizontal coverage is computed once per row
 * instead of once per source pixel, and the fully-covered interior
 * skips the `× cov` multiply. Multiplying by exactly 1.0 is exact in
 * IEEE-754 and the accumulation order is unchanged, so this candidate
 * is expected to be **byte-identical** to the reference — the audit
 * asserts that rather than assuming it.
 */
export function resizeHoisted(input: PixelBuffer, params: ResizeParams): PixelBuffer {
  const gw = params.width;
  const gh = params.height;
  const sw = input.width;
  const src = input.data;
  const out = new Uint8ClampedArray(gw * gh * 4);
  const p = placementFor(sw, input.height, gw, gh, params.mode);
  const srcW = p.srcX1 - p.srcX0;
  const srcH = p.srcY1 - p.srcY0;

  // Horizontal spans are identical for every destination row.
  const xFirst = new Int32Array(p.destW);
  const xLast = new Int32Array(p.destW);
  const spans: Float64Array[] = [];
  for (let dx = 0; dx < p.destW; dx++) {
    const sx0 = p.srcX0 + (dx / p.destW) * srcW;
    const sx1 = p.srcX0 + ((dx + 1) / p.destW) * srcW;
    const first = Math.floor(sx0);
    const last = Math.ceil(sx1);
    xFirst[dx] = first;
    xLast[dx] = last;
    const cov = new Float64Array(Math.max(0, last - first));
    for (let x = first; x < last; x++) {
      cov[x - first] = Math.min(sx1, x + 1) - Math.max(sx0, x);
    }
    spans.push(cov);
  }

  for (let dy = 0; dy < p.destH; dy++) {
    const sy0 = p.srcY0 + (dy / p.destH) * srcH;
    const sy1 = p.srcY0 + ((dy + 1) / p.destH) * srcH;
    const yFirst = Math.floor(sy0);
    const yLast = Math.ceil(sy1);

    for (let dx = 0; dx < p.destW; dx++) {
      const first = xFirst[dx] ?? 0;
      const last = xLast[dx] ?? 0;
      const cov = spans[dx] ?? new Float64Array(0);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;

      for (let y = yFirst; y < yLast; y++) {
        const hCov = Math.min(sy1, y + 1) - Math.max(sy0, y);
        if (hCov <= 0) continue;
        const rowBase = y * sw * 4;
        for (let x = first; x < last; x++) {
          const wCov = cov[x - first] ?? 0;
          if (wCov <= 0) continue;
          const i = rowBase + x * 4;
          const alpha = src[i + 3] ?? 0;
          // Identical arithmetic to the reference: `wCov * hCov` in the
          // same order, so no rounding can differ.
          const c = wCov * hCov;
          const aw = alpha * c;
          r += (src[i] ?? 0) * aw;
          g += (src[i + 1] ?? 0) * aw;
          b += (src[i + 2] ?? 0) * aw;
          a += aw;
          area += c;
        }
      }
      if (area <= 0 || a <= 0) continue;
      const offset = ((p.destY + dy) * gw + (p.destX + dx)) * 4;
      out[offset] = r / a;
      out[offset + 1] = g / a;
      out[offset + 2] = b / a;
      out[offset + 3] = a / area;
    }
  }
  return { width: gw, height: gh, data: out };
}

/**
 * Candidate S — separable two-pass area average.
 *
 * Horizontal pass reduces each source row to `destW` premultiplied
 * sums; vertical pass reduces those columns to `destH`. Total sample
 * visits fall from O(kernelW × kernelH) per cell to O(kernelW) +
 * O(kernelH), which only matters when a source pixel lands in more
 * than one output cell — i.e. as the scale ratio approaches 1 (the
 * bv1 CHALLENGED verdict). Summation order changes, so bytes may
 * differ; the audit measures by how much.
 */
export function resizeSeparable(input: PixelBuffer, params: ResizeParams): PixelBuffer {
  const gw = params.width;
  const gh = params.height;
  const sw = input.width;
  const sh = input.height;
  const src = input.data;
  const out = new Uint8ClampedArray(gw * gh * 4);
  const p = placementFor(sw, sh, gw, gh, params.mode);
  const srcW = p.srcX1 - p.srcX0;
  const srcH = p.srcY1 - p.srcY0;

  // Rows the vertical pass can reach; outside it the source is cropped.
  const yLo = Math.max(0, Math.floor(p.srcY0));
  const yHi = Math.min(sh, Math.ceil(p.srcY1));
  const rows = Math.max(0, yHi - yLo);

  // Horizontal pass: [destW × rows] premultiplied sums + covered area.
  const hr = new Float64Array(p.destW * rows);
  const hg = new Float64Array(p.destW * rows);
  const hb = new Float64Array(p.destW * rows);
  const ha = new Float64Array(p.destW * rows);
  const hArea = new Float64Array(p.destW * rows);

  for (let dx = 0; dx < p.destW; dx++) {
    const sx0 = p.srcX0 + (dx / p.destW) * srcW;
    const sx1 = p.srcX0 + ((dx + 1) / p.destW) * srcW;
    const first = Math.floor(sx0);
    const last = Math.ceil(sx1);
    for (let y = yLo; y < yHi; y++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;
      const rowBase = y * sw * 4;
      for (let x = first; x < last; x++) {
        const wCov = Math.min(sx1, x + 1) - Math.max(sx0, x);
        if (wCov <= 0) continue;
        const i = rowBase + x * 4;
        const alpha = src[i + 3] ?? 0;
        const aw = alpha * wCov;
        r += (src[i] ?? 0) * aw;
        g += (src[i + 1] ?? 0) * aw;
        b += (src[i + 2] ?? 0) * aw;
        a += aw;
        area += wCov;
      }
      const k = dx * rows + (y - yLo);
      hr[k] = r;
      hg[k] = g;
      hb[k] = b;
      ha[k] = a;
      hArea[k] = area;
    }
  }

  // Vertical pass over the reduced columns.
  for (let dy = 0; dy < p.destH; dy++) {
    const sy0 = p.srcY0 + (dy / p.destH) * srcH;
    const sy1 = p.srcY0 + ((dy + 1) / p.destH) * srcH;
    const yFirst = Math.floor(sy0);
    const yLast = Math.ceil(sy1);
    for (let dx = 0; dx < p.destW; dx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;
      for (let y = yFirst; y < yLast; y++) {
        if (y < yLo || y >= yHi) continue;
        const hCov = Math.min(sy1, y + 1) - Math.max(sy0, y);
        if (hCov <= 0) continue;
        const k = dx * rows + (y - yLo);
        r += (hr[k] ?? 0) * hCov;
        g += (hg[k] ?? 0) * hCov;
        b += (hb[k] ?? 0) * hCov;
        a += (ha[k] ?? 0) * hCov;
        area += (hArea[k] ?? 0) * hCov;
      }
      if (area <= 0 || a <= 0) continue;
      const offset = ((p.destY + dy) * gw + (p.destX + dx)) * 4;
      out[offset] = r / a;
      out[offset + 1] = g / a;
      out[offset + 2] = b / a;
      out[offset + 3] = a / area;
    }
  }
  return { width: gw, height: gh, data: out };
}

/**
 * Candidate I — summed-area (integral image) table.
 *
 * Builds five f64 prefix-sum planes over the whole source, then answers
 * the fully-covered integer interior of each output cell in O(1) and
 * adds the fractional edge strips directly. The build is O(source) and
 * allocates 5 × 8 bytes per source pixel, so the audit reports build
 * cost, steady-state cost and peak memory separately — a table that
 * pays for itself only after many queries per pixel is exactly the
 * candidate a warm benchmark can flatter.
 */
export function resizeSat(input: PixelBuffer, params: ResizeParams): PixelBuffer {
  const gw = params.width;
  const gh = params.height;
  const sw = input.width;
  const sh = input.height;
  const src = input.data;
  const out = new Uint8ClampedArray(gw * gh * 4);
  const p = placementFor(sw, sh, gw, gh, params.mode);
  const srcW = p.srcX1 - p.srcX0;
  const srcH = p.srcY1 - p.srcY0;

  // Prefix sums with a zero row/column, so a rect query never branches.
  const stride = sw + 1;
  const sr = new Float64Array(stride * (sh + 1));
  const sg = new Float64Array(stride * (sh + 1));
  const sb = new Float64Array(stride * (sh + 1));
  const sa = new Float64Array(stride * (sh + 1));
  for (let y = 0; y < sh; y++) {
    let rowR = 0;
    let rowG = 0;
    let rowB = 0;
    let rowA = 0;
    const above = y * stride;
    const here = (y + 1) * stride;
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const alpha = src[i + 3] ?? 0;
      rowR += (src[i] ?? 0) * alpha;
      rowG += (src[i + 1] ?? 0) * alpha;
      rowB += (src[i + 2] ?? 0) * alpha;
      rowA += alpha;
      sr[here + x + 1] = (sr[above + x + 1] ?? 0) + rowR;
      sg[here + x + 1] = (sg[above + x + 1] ?? 0) + rowG;
      sb[here + x + 1] = (sb[above + x + 1] ?? 0) + rowB;
      sa[here + x + 1] = (sa[above + x + 1] ?? 0) + rowA;
    }
  }
  const rect = (t: Float64Array, x0: number, y0: number, x1: number, y1: number): number =>
    (t[y1 * stride + x1] ?? 0) -
    (t[y0 * stride + x1] ?? 0) -
    (t[y1 * stride + x0] ?? 0) +
    (t[y0 * stride + x0] ?? 0);

  for (let dy = 0; dy < p.destH; dy++) {
    const sy0 = p.srcY0 + (dy / p.destH) * srcH;
    const sy1 = p.srcY0 + ((dy + 1) / p.destH) * srcH;
    for (let dx = 0; dx < p.destW; dx++) {
      const sx0 = p.srcX0 + (dx / p.destW) * srcW;
      const sx1 = p.srcX0 + ((dx + 1) / p.destW) * srcW;

      // Whole source pixels strictly inside the cell — one rect query.
      const ix0 = Math.min(Math.ceil(sx0), sw);
      const iy0 = Math.min(Math.ceil(sy0), sh);
      const ix1 = Math.max(Math.floor(sx1), ix0);
      const iy1 = Math.max(Math.floor(sy1), iy0);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;
      if (ix1 > ix0 && iy1 > iy0) {
        r = rect(sr, ix0, iy0, ix1, iy1);
        g = rect(sg, ix0, iy0, ix1, iy1);
        b = rect(sb, ix0, iy0, ix1, iy1);
        a = rect(sa, ix0, iy0, ix1, iy1);
        area = (ix1 - ix0) * (iy1 - iy0);
      }

      // Fractional edge strips and corners, pixel by pixel.
      const xFirst = Math.floor(sx0);
      const xLast = Math.ceil(sx1);
      const yFirst = Math.floor(sy0);
      const yLast = Math.ceil(sy1);
      for (let y = yFirst; y < yLast; y++) {
        const inRowInterior = y >= iy0 && y < iy1;
        const hCov = Math.min(sy1, y + 1) - Math.max(sy0, y);
        if (hCov <= 0) continue;
        const rowBase = y * sw * 4;
        for (let x = xFirst; x < xLast; x++) {
          if (inRowInterior && x >= ix0 && x < ix1) {
            x = ix1 - 1; // already counted by the rect query
            continue;
          }
          const wCov = Math.min(sx1, x + 1) - Math.max(sx0, x);
          if (wCov <= 0) continue;
          const i = rowBase + x * 4;
          const alpha = src[i + 3] ?? 0;
          const c = wCov * hCov;
          const aw = alpha * c;
          r += (src[i] ?? 0) * aw;
          g += (src[i + 1] ?? 0) * aw;
          b += (src[i + 2] ?? 0) * aw;
          a += aw;
          area += c;
        }
      }
      if (area <= 0 || a <= 0) continue;
      const offset = ((p.destY + dy) * gw + (p.destX + dx)) * 4;
      out[offset] = r / a;
      out[offset + 1] = g / a;
      out[offset + 2] = b / a;
      out[offset + 3] = a / area;
    }
  }
  return { width: gw, height: gh, data: out };
}

/** Peak extra bytes a candidate holds beyond its output buffer. */
export function scratchBytes(
  candidate: 'reference' | 'hoisted' | 'separable' | 'sat',
  sw: number,
  sh: number,
  destW: number,
): number {
  switch (candidate) {
    case 'reference':
      return 0;
    case 'hoisted':
      return destW * 8 * 4; // per-column coverage spans (small)
    case 'separable':
      return destW * sh * 5 * 8;
    case 'sat':
      return (sw + 1) * (sh + 1) * 4 * 8;
  }
}
