/**
 * Benchmark boundary contract (M5-PERF-02) — the canonical code copy of
 * `docs/measurement-contract.md`. A timing is meaningless without its
 * boundary: moving a start or end mark changes whether a budget passes
 * without changing the product, so every recorded sample names the
 * boundary it was taken under and every report stamps the contract
 * version it was taken against.
 *
 * Bump BOUNDARY_VERSION whenever a start/end mark moves. Reports from
 * different versions are not comparable and must not be diffed.
 */

/** Contract version stamped into every report. Bump on any mark move. */
export const BOUNDARY_VERSION = 'bv1';

/** The measurement boundaries defined by the contract. */
export type BoundaryId =
  | 'prepare'
  | 'stage'
  | 'pipeline-compute'
  | 'preview-update'
  | 'interaction'
  | 'export';

/** Where a boundary can physically be measured. */
export type MeasurementSurface = 'node' | 'browser';

/** One boundary's definition: what its marks include and exclude. */
export interface Boundary {
  id: BoundaryId;
  /** Start mark — what must already be true when the clock starts. */
  start: string;
  /** End mark — what must have happened when the clock stops. */
  end: string;
  /** Costs deliberately inside the timed region. */
  includes: readonly string[];
  /** Costs deliberately outside it (reported under another boundary). */
  excludes: readonly string[];
  /** Surfaces this boundary can be measured on. */
  surfaces: readonly MeasurementSurface[];
}

/**
 * The contract. Ordered outermost-last so a reader sees the narrow
 * boundaries (which budgets bind to) before the composite ones.
 */
export const BOUNDARIES: Readonly<Record<BoundaryId, Boundary>> = {
  prepare: {
    id: 'prepare',
    start: 'a config exists and nothing derived from it has been built',
    end: 'stage list, palette derivatives and LUT are ready to execute',
    includes: [
      'fixture/request construction and any input copy',
      'palette flattening and Lab conversion',
      'LUT build on a cache miss',
      'stage-list construction from the config',
    ],
    excludes: ['any per-pixel stage work'],
    surfaces: ['node', 'browser'],
  },
  stage: {
    id: 'stage',
    start: 'stage function entry with prepared, immutable inputs',
    end: 'stage function return',
    includes: ['output buffer allocation owned by the stage'],
    excludes: [
      'palette/LUT preparation (prepare)',
      'worker messaging and transfer',
      'bitmap creation and drawing',
    ],
    surfaces: ['node', 'browser'],
  },
  'pipeline-compute': {
    id: 'pipeline-compute',
    start: 'executable request in hand and input buffer adopted',
    end: 'final PixelBuffer returned',
    includes: [
      'every stage call in order',
      'in-executor stage construction (quantified by the prepare row)',
    ],
    excludes: [
      'request/fixture construction and the input copy',
      'benchmark assertions',
      'worker messaging, bitmap creation, drawing',
    ],
    surfaces: ['node', 'browser'],
  },
  'preview-update': {
    id: 'preview-update',
    start: 'a captured frame is accepted for processing (not dropped)',
    end: 'the preview surface draw for that frame returns',
    includes: [
      'queue wait, transport, prepare, pipeline-compute',
      'ImageData + ImageBitmap creation',
      'preview surface draw',
    ],
    excludes: ['frames dropped by latest-wins coalescing (counted, not timed)'],
    surfaces: ['browser'],
  },
  interaction: {
    id: 'interaction',
    start: 'the source changes (edit committed in the captured application)',
    end: 'the resulting preview frame is displayed',
    includes: ['capture cadence, dirty-frame skip, queueing, the full preview update'],
    excludes: [
      'nothing — this is the honest user-visible number',
      'it is never reconstructed as a sum of medians',
    ],
    surfaces: ['browser'],
  },
  export: {
    id: 'export',
    start: 'the user requests an export',
    end: 'the encoded artefact is ready to write',
    includes: ['pipeline re-run, scale/chart/PDF construction, encode'],
    excludes: ['file-system write and browser download UI'],
    surfaces: ['browser'],
  },
};

/**
 * Cache state a sample was taken under. Budgets bind to `warm`; `cold`
 * rows are reported alongside, never folded into a warm median.
 */
export type CacheState = 'cold' | 'warm' | 'n/a';

/** True when a boundary can be measured on the given surface. */
export function measurableOn(
  boundary: BoundaryId,
  surface: MeasurementSurface,
): boolean {
  return BOUNDARIES[boundary].surfaces.includes(surface);
}
