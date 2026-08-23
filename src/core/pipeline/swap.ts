/**
 * Swap stage — the colour swap, layer A of ICE-RECOLOUR-01 (D182).
 *
 * "Everywhere the mapper chose X, stitch Y." A swap is a design rule
 * (`palette.design.swaps`), never a membership edit: the colour stage
 * keeps matching — and diffusing error — against the *selected*
 * palette, and this stage afterwards rewrites the palette-index
 * sidecar through one map and repaints each cell's RGB. So a swap
 * changes what a chosen entry renders as, not what the mapper matches
 * to; the LUT fingerprint (D46), both backend adapters and the golden
 * suites see nothing new.
 *
 * The vocabulary after the stage is the **render palette**: the
 * selected entries, indices unchanged, plus every render-only target
 * appended in swap order. {@link renderPalette} is the one helper that
 * derives it — the worker calls it to build the stage, the main thread
 * calls it to read stats, the key, highlights and symbol grants from
 * the sidecar. A target that is itself a selected entry is a *merge*:
 * it maps to the existing index and nothing is appended.
 */

import { EMPTY_INDEX, type Palette, type PixelBuffer, type Stage, type Thread } from '../types.ts';

/**
 * One swap rule. `from` is the id of a selected entry; `to` is a full
 * thread record — snapshot semantics (D55), so the file renders the
 * same thread even if the catalogue moves under it. A `from` that is
 * not in the palette is a *dangling* swap: kept, explained in the UI,
 * inert here.
 */
export interface ThreadSwap {
  from: string;
  to: Thread;
}

/** The render palette and the index map that reaches it. */
export interface RenderPalette {
  /** Selected entries first (indices unchanged), then render-only targets. */
  palette: Palette;
  /**
   * Selected index → render index, length `selected.length`. Identity
   * where no swap applies. Applied exactly once per cell — swaps never
   * chain: if X → Y and Y → Z, X's cells stitch Y.
   */
  map: Uint16Array;
  /** Whether any swap changes at least one index — false means "omit the stage". */
  active: boolean;
}

/**
 * Derive the render palette for a selected palette and its swaps.
 *
 * Pure and cheap (O(selected + swaps)); called per stage build, never
 * per pixel. Targets append by id, so two swaps onto one thread share
 * one appended entry, and a target the mapper later selects becomes a
 * merge automatically. A later swap with the same `from` wins, which
 * is what "re-target" means; a self-swap (`to.id === from`) is inert.
 */
export function renderPalette(palette: Palette, swaps: readonly ThreadSwap[]): RenderPalette {
  const entries: Thread[] = [...palette.entries];
  const indexOf = new Map<string, number>();
  palette.entries.forEach((entry, i) => indexOf.set(entry.id, i));
  const map = new Uint16Array(palette.entries.length);
  for (let i = 0; i < map.length; i++) map[i] = i;
  let active = false;
  for (const swap of swaps) {
    const from = indexOf.get(swap.from);
    // Dangling: `from` left the palette. Look-ups go through the
    // selected entries only, so a previously appended target can never
    // be a `from` — that is the no-chain rule by construction.
    if (from === undefined || from >= palette.entries.length) continue;
    let to = indexOf.get(swap.to.id);
    if (to === undefined) {
      to = entries.length;
      entries.push(swap.to);
      indexOf.set(swap.to.id, to);
    }
    map[from] = to;
    if (to !== from) active = true;
  }
  return { palette: { name: palette.name, entries }, map, active };
}

/** Parameters for {@link swapStage}: the derived render palette. */
export type SwapParams = RenderPalette;

/**
 * Rewrite the sidecar through the map and repaint from the render
 * palette. Alpha is carried over untouched (an empty stitch stays
 * empty; `EMPTY_INDEX` cells are left alone). A buffer without a
 * sidecar — the retired reduce-first order after its resize, or a
 * full-RGB run — passes through as a copy: there is nothing to remap.
 */
function swapTs(input: PixelBuffer, params: SwapParams): PixelBuffer {
  const { width, height } = input;
  const src = input.data;
  const out = new Uint8ClampedArray(src);
  const indices = input.indices;
  if (indices === undefined) return { width, height, data: out };
  const mapped = new Uint16Array(indices.length);
  const { map } = params;
  const entries = params.palette.entries;
  for (let cell = 0, i = 0; cell < indices.length; cell++, i += 4) {
    const entry: number = indices[cell] ?? EMPTY_INDEX;
    if (entry === EMPTY_INDEX) {
      mapped[cell] = EMPTY_INDEX;
      continue;
    }
    const target: number = map[entry] ?? entry;
    mapped[cell] = target;
    if (target === entry) continue;
    const rgb = entries[target]?.rgb;
    if (rgb === undefined) continue;
    out[i] = rgb[0];
    out[i + 1] = rgb[1];
    out[i + 2] = rgb[2];
  }
  return { width, height, data: out, indices: mapped };
}

/** The swap stage (TS reference; O(cells), no backend needed). */
export const swapStage: Stage<SwapParams> = {
  name: 'swap',
  backends: { ts: swapTs },
};
