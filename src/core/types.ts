/**
 * Core engine types (architecture.md → "Core contracts").
 *
 * Everything in src/core/ is pure: no DOM, no Workers, no I/O. Pixel
 * data always travels as typed arrays — never arrays of objects.
 */

/**
 * RGBA pixel data. `data.length` is always `width * height * 4`,
 * 0–255 sRGB.
 *
 * `indices` is the optional palette-index sidecar the architecture
 * allows ("or index buffers where noted"). A stage that maps to a
 * palette sets it; every other stage leaves it absent, because a
 * resize or an adjust invalidates it. It exists so stats, the chart
 * key, and exports can name the thread that was actually chosen rather
 * than reverse-guessing a reference from the rendered RGB — a guess
 * that is ambiguous the moment two brands share a colour
 * (M7-BRAND-01).
 */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Palette index per cell, length `width * height`. */
  indices?: Uint16Array;
}

/**
 * Sidecar value for a cell that was never matched to a thread — an
 * empty stitch the dither stage skipped. Distinct from index 0, which
 * is a real thread; a design whose first palette entry is black must
 * not report its fabric gaps as black stitches.
 *
 * It also caps a palette at 65,535 entries, which is three orders of
 * magnitude past any real thread range.
 */
export const EMPTY_INDEX = 0xffff;

/** How a thread's colour data was obtained. */
export type Provenance = 'measured' | 'mapped';

/** Whether a thread is still purchasable, or a survivor of a data change. */
export type ThreadStatus = 'current' | 'retired' | 'unresolved';

/**
 * One thread: a catalogue record, and the unit a palette is ordered
 * over. Hex is `#rrggbb` lowercase.
 *
 * `id` is the identity; `rgb` is only ever a rendering value. Two
 * threads may share an RGB and remain distinct records — that is the
 * normal case for a mapped cross-reference, not an anomaly to
 * de-duplicate (M7-BRAND-01).
 */
export interface Thread {
  /** `${brandId}:${reference}` — stable across catalogue releases. */
  id: string;
  brandId: string;
  /** Manufacturer catalogue reference, e.g. "310" or "White". */
  reference: string;
  name: string;
  hex: string;
  /** 0–255 sRGB, index-aligned [r, g, b]. */
  rgb: [number, number, number];
  provenance: Provenance;
  status: ThreadStatus;
  /** For mapped records, the thread id the colour was derived from. */
  mappedFrom: string | null;
}

/**
 * An ordered set of threads; index 0.. maps to output cells.
 *
 * Order is identity-significant, not presentation: it is the
 * nearest-match tie-break and it is what every LUT stores. Reordering
 * a palette is a real edit even when the rendered pixels do not change
 * (D46, M7-PAL-01).
 */
export interface Palette {
  name: string;
  entries: Thread[];
}

/** Execution backends for a stage. 'ts' is mandatory and is ground truth. */
export type Backend = 'ts' | 'wasm' | 'webgpu';

/**
 * A pure stage function: same input + params → same output, never
 * mutates its input buffer (AGENTS.md → "Engine purity").
 */
export type StageFn<P> = (input: PixelBuffer, params: P) => PixelBuffer;

/** A named pipeline stage with per-backend implementations. */
export interface Stage<P> {
  name: string;
  /** 'ts' is required: the reference implementation and universal fallback. */
  backends: Partial<Record<Backend, StageFn<P>>> & { ts: StageFn<P> };
}

/**
 * One configured stage in a pipeline. Order is data, not code: the
 * pipeline array is stored in the project file and reorderable in the
 * UI (requirements §7).
 */
export interface StageInstance<P = unknown> {
  stage: Stage<P>;
  params: P;
  /** Omitted → automatic selection (profiled); 'ts' until backends exist. */
  backend?: Backend;
}

/**
 * Pair a stage with its params for a heterogeneous pipeline list.
 *
 * `Stage<P>` is invariant in `P`, so mixed-param instances cannot flow
 * into `StageInstance<unknown>[]` directly; this helper erases `P`
 * after the compiler has verified stage and params agree — the one
 * place that erasure is allowed.
 */
export function stageInstance<P>(
  stage: Stage<P>,
  params: P,
  backend?: Backend,
): StageInstance {
  return { stage, params, ...(backend === undefined ? {} : { backend }) } as StageInstance;
}

// The versioned ProjectFile schema and its (de)serialisation live in
// project.ts, next to the migration logic that owns the version.
