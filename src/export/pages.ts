/**
 * Pure multi-page chart planner (M10, requirements §18 subset).
 * Plans how a stitch grid tiles onto chart pages: half-open global
 * bounds per page, leading-edge overlap, row-major order. No canvas,
 * no PDF, no I/O — hand-solvable layouts are exhaustively tested
 * (the M10 ticket's architecture boundary).
 *
 * Overlap semantics: the first page of a row/column starts clean;
 * every later page repeats the previous page's trailing `overlap`
 * stitches on its leading (left/top) edge, and the join between
 * repeated and fresh content is what the assembly marks as the trim
 * line. The union of the *fresh* spans covers the grid exactly once —
 * duplicates exist only inside declared overlap.
 */

import type { PixelBuffer } from '../core/types.ts';

/** One planned chart page, all bounds in global stitches, half-open. */
export interface PageSlice {
  /** 0-based order, row-major (left→right, then top→bottom). */
  index: number;
  /** Page-grid position, 0-based. */
  row: number;
  col: number;
  /** Global stitch bounds including any leading overlap. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Where fresh (non-repeated) content starts; equals x0/y0 on the first page of an axis. */
  freshX0: number;
  freshY0: number;
}

/** A full page plan. */
export interface PagePlan {
  pages: PageSlice[];
  pagesAcross: number;
  pagesDown: number;
  /** The largest page span per axis, stitches — the shared-scale basis. */
  maxSpanX: number;
  maxSpanY: number;
}

/** Planner failure with a user-facing sentence (never thrown). */
export interface PagePlanError {
  error: string;
}

/** True when the result is the error branch. */
export function isPlanError(plan: PagePlan | PagePlanError): plan is PagePlanError {
  return 'error' in plan;
}

/**
 * Plan the page tiling for a `gridW`×`gridH` design at
 * `stitchesPerPage` fresh stitches per axis with `overlap` repeated
 * stitches on leading edges. Errors are returned, not thrown — they
 * are user-facing sentences for the status line.
 */
export function planPages(
  gridW: number,
  gridH: number,
  stitchesPerPage: number,
  overlap: number,
): PagePlan | PagePlanError {
  if (gridW <= 0 || gridH <= 0) {
    return { error: 'There is no design to paginate yet.' };
  }
  if (!Number.isInteger(stitchesPerPage) || stitchesPerPage < 1) {
    return { error: 'Stitches per page must be a whole number of at least 1.' };
  }
  if (!Number.isInteger(overlap) || overlap < 0) {
    return { error: 'Overlap must be a whole number of stitches, 0 or more.' };
  }
  if (overlap >= stitchesPerPage) {
    return {
      error:
        `An overlap of ${String(overlap)} stitches consumes the whole page — ` +
        `keep it below the ${String(stitchesPerPage)} stitches per page.`,
    };
  }
  const pagesAcross = Math.ceil(gridW / stitchesPerPage);
  const pagesDown = Math.ceil(gridH / stitchesPerPage);
  const pages: PageSlice[] = [];
  let maxSpanX = 0;
  let maxSpanY = 0;
  for (let row = 0; row < pagesDown; row++) {
    const freshY0 = row * stitchesPerPage;
    const y1 = Math.min(freshY0 + stitchesPerPage, gridH);
    const y0 = row === 0 ? 0 : freshY0 - overlap;
    for (let col = 0; col < pagesAcross; col++) {
      const freshX0 = col * stitchesPerPage;
      const x1 = Math.min(freshX0 + stitchesPerPage, gridW);
      const x0 = col === 0 ? 0 : freshX0 - overlap;
      maxSpanX = Math.max(maxSpanX, x1 - x0);
      maxSpanY = Math.max(maxSpanY, y1 - y0);
      pages.push({
        index: pages.length,
        row,
        col,
        x0,
        x1,
        y0,
        y1,
        freshX0,
        freshY0,
      });
    }
  }
  return { pages, pagesAcross, pagesDown, maxSpanX, maxSpanY };
}

/**
 * The human range line for one page's footer, 1-based inclusive the
 * way stitchers count: "columns 51–100 · rows 1–60". Overlap stitches
 * are part of the page, so the range includes them — the footer
 * describes what is printed, the trim line says what is repeated.
 */
export function pageRangeLabel(slice: PageSlice): string {
  return (
    `columns ${String(slice.x0 + 1)}–${String(slice.x1)} · ` +
    `rows ${String(slice.y0 + 1)}–${String(slice.y1)}`
  );
}

/**
 * Copy one half-open stitch window out of a processed frame, RGBA and
 * the palette-index sidecar together (a tile that lost its indices
 * could not refuse-or-render symbols correctly). Bounds are trusted
 * from the planner; they are clamped defensively so a caller bug
 * yields a short tile, never a crash.
 */
export function sliceBuffer(
  frame: PixelBuffer,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): PixelBuffer {
  const left = Math.max(0, Math.min(x0, frame.width));
  const right = Math.max(left, Math.min(x1, frame.width));
  const top = Math.max(0, Math.min(y0, frame.height));
  const bottom = Math.max(top, Math.min(y1, frame.height));
  const width = right - left;
  const height = bottom - top;
  const data = new Uint8ClampedArray(width * height * 4);
  const indices = frame.indices === undefined ? undefined : new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    const srcRow = (top + y) * frame.width + left;
    data.set(frame.data.subarray(srcRow * 4, (srcRow + width) * 4), y * width * 4);
    if (indices !== undefined && frame.indices !== undefined) {
      indices.set(frame.indices.subarray(srcRow, srcRow + width), y * width);
    }
  }
  const out: PixelBuffer = { width, height, data };
  if (indices !== undefined) out.indices = indices;
  return out;
}
