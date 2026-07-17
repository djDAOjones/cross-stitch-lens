/**
 * Core engine types (architecture.md → "Core contracts").
 *
 * Everything in src/core/ is pure: no DOM, no Workers, no I/O. Pixel
 * data always travels as typed arrays — never arrays of objects.
 */

/** RGBA pixel data. `data.length` is always `width * height * 4`, 0–255 sRGB. */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** One thread colour in a palette. Hex is `#rrggbb` lowercase. */
export interface PaletteEntry {
  /** Manufacturer thread code, e.g. "310" or "White" (DMC). */
  code: string;
  name: string;
  hex: string;
  /** 0–255 sRGB, index-aligned [r, g, b]. */
  rgb: [number, number, number];
  manufacturer: string;
}

/** An ordered set of thread colours; index 0.. maps to output cells. */
export interface Palette {
  name: string;
  entries: PaletteEntry[];
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

/** Current project-file schema version. Bump with a forward migration. */
export const SCHEMA_VERSION = 1;

/**
 * Versioned JSON project file — v1 stub (architecture.md → "Project
 * file"). Fields grow with the milestones; loaders must migrate older
 * `schemaVersion`s forward and never drop unknown fields.
 */
export interface ProjectFile {
  schemaVersion: typeof SCHEMA_VERSION;
  grid: { width: number; height: number };
  /** Palette name reference; null = full-RGB mode (no reduction). */
  palette: string | null;
  /** Serialised stage order + params. Stage functions are looked up by name. */
  pipeline: { name: string; params: unknown }[];
}
