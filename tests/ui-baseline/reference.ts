/**
 * The UI-baseline reference definitions — the single source of truth
 * for what the tripwire pins (TEST-01).
 *
 * Extracted from `baseline.test.ts` so the suite and the regenerator
 * (`scripts/gen-ui-baseline.mjs`) compute from the same definitions.
 * Two copies of a reference config is a tripwire that can disagree
 * with its own generator, which is a slower version of no tripwire at
 * all.
 *
 * Nothing here writes. The suite compares against the committed
 * artefacts and fails when they are missing; only the generator
 * writes, and only when a human runs it.
 */

import { createHash } from 'node:crypto';

import { defaultTone } from '../../src/core/color/tone.ts';
import { defaultAdjust } from '../../src/core/pipeline/adjust.ts';
import { DEFAULT_GRID_VALUES } from '../../src/core/grid-style.ts';
import { DEFAULT_DITHER, type PipelineConfig } from '../../src/core/pipeline/config.ts';
import { type PalettePolicy } from '../../src/core/palette-policy.ts';
import { resolveProjectPalette } from '../../src/core/palette-resolve.ts';
import { loadCatalogue } from '../../src/core/thread-catalogue.ts';
import {
  DEFAULT_FLOOR,
  SCHEMA_VERSION,
  serializeProject,
  type ProjectFile,
} from '../../src/core/project.ts';
import { SYMBOL_IDS } from '../../src/core/symbols/glyphs.ts';
import { executeRequest } from '../../src/worker/execute.ts';
import { encodePng, sourceBuffer, SOURCE_SIDE } from './source.ts';

/** The artefacts the tripwire pins, by name. */
export interface BaselineHashes {
  /** The committed PNG **file**'s bytes. Read, never re-derived — see below. */
  sourcePng: string;
  /** The seeded source's raw RGBA. What `sourcePng` used to try to prove. */
  sourcePixels: string;
  outputPixels: string;
  outputIndices: string;
  projectJson: string;
}

/**
 * The hashes that can be **computed** from the code, so a drift in any
 * of them is a real behaviour change on any machine.
 *
 * `sourcePng` is deliberately not among them. Re-encoding the fixture
 * and comparing the result is not a portable check: `encodePng` ends in
 * `deflateSync`, and a DEFLATE stream is not byte-identical across zlib
 * versions or platforms — the same pixels encode differently on macOS
 * and on the Linux runner. That assertion passed locally and reddened
 * CI on its first push. `sourcePixels` is the check it was reaching
 * for: it pins the seeded source's actual content with pure
 * arithmetic, so it holds anywhere, and the PNG is pinned as what it
 * is — a committed file whose bytes must not change.
 */
export const COMPUTED_KEYS = [
  'sourcePixels',
  'outputPixels',
  'outputIndices',
  'projectJson',
] as const;

/** Every key a complete `hashes.json` must carry. */
export const BASELINE_KEYS: (keyof BaselineHashes)[] = ['sourcePng', ...COMPUTED_KEYS];

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The audit-time reference policy, frozen inline. This tripwire pins
 * *engine* behaviour over a fixed configuration; it deliberately does
 * not read `defaultPolicy()`, whose fresh-session default is a UI
 * policy decision that changed at M14-EXT-13 (D98: at-most-8,
 * superseding D55's unlimited) — a default change is not engine
 * drift, and coupling the pin to it would make the tripwire fire on
 * intended taste decisions instead of defects. Engine identity stays
 * proven by these hashes exactly as at audit time.
 */
function auditTimePolicy(): PalettePolicy {
  return {
    brands: ['dmc'],
    source: { kind: 'brands' },
    ownedOnly: false,
    count: { mode: 'all', n: 20 },
    locked: [],
    preferred: [],
    excluded: [],
  };
}

/** The audit-time pipeline config over the reference resolved palette. */
function defaultConfig(): PipelineConfig {
  const catalogue = loadCatalogue();
  const resolved = resolveProjectPalette({
    policy: auditTimePolicy(),
    inputs: { catalogue, owned: new Set<string>() },
    name: 'DMC',
  });
  if (!resolved.ok) throw new Error('reference policy did not resolve');
  return {
    preset: 'resize-first',
    grid: { width: 200, height: 200 },
    resizeMode: 'contain',
    palette: resolved.palette,
    metric: 'lab',
    dither: { ...DEFAULT_DITHER },
  };
}

/** The stated default project file (preview pinned at 1 CSS px/stitch). */
function defaultProject(config: PipelineConfig): ProjectFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    // Schema v10 (DUR-01): no picture in the stated default — the
    // projectJson pin moved for the bump; the engine hashes never move.
    source: null,
    pipeline: {
      preset: config.preset,
      grid: { ...config.grid },
      resizeMode: config.resizeMode,
      metric: config.metric,
      dither: config.dither,
      // The default no-dither config structurally matches the "None"
      // built-in (D117's dissolved legacy state), so the stated
      // default carries its reference.
      ditherProfileRef: { id: 'builtin:none', revision: 0 },
      // Schema v12 (TONE-01): tone disengaged in the stated default —
      // the projectJson pin moved for the bump; the engine hashes never
      // move. Schema v14 (ADJUST-02) added the mixer and the
      // saturation range, both identity, and behaved the same way:
      // projectJson moved, outputPixels/outputIndices did not — which
      // is the evidence that the bump changed the document and not the
      // picture.
      tone: defaultTone(),
      adjust: defaultAdjust(),
      adjustProfileRef: null,
    },
    palette: {
      profileRef: { id: 'builtin:dmc', revision: 0 },
      recipe: { libraries: ['dmc'], ownedOnly: false, include: [], exclude: [], ranges: [] },
      // Schema v11 (ICE-RECOLOUR-01): no swaps in the stated default;
      // schema v12 (TONE-01): the colour-use floor off — the
      // projectJson pin moved for each bump; the engine hashes never
      // move.
      design: {
        count: { mode: 'max', n: 8 },
        minDistance: 0,
        mustUse: [],
        swaps: [],
        floor: { ...DEFAULT_FLOOR },
      },
      snapshot: config.palette?.entries ?? [],
    },
    // Schema v7 (M11): screen + print halves, both at the defaults a
    // fresh session holds — which byte-match the Every 10 preset, so
    // that is the honest provenance (the projectJson pin moved for
    // the bump; the engine hashes never move).
    gridStyle: {
      screen: { ...DEFAULT_GRID_VALUES },
      print: { ...DEFAULT_GRID_VALUES },
      preset: 'every-10',
    },
    // A fresh session has granted nothing: the full catalogue queued in
    // canonical order, exactly as `initialSymbolState` builds it
    // (schema v6, M9 — the projectJson pin was refreshed for the bump;
    // the engine hashes above never moved).
    symbols: { assigned: [], queue: [...SYMBOL_IDS], overrides: [] },
    preview: { mode: 'space', cssPxPerStitch: 1 },
    export: {
      scale: 1,
      background: 'transparent',
      color: '#ffffff',
      chartCell: 10,
      chartMode: 'color',
      pdf: {
        pageSize: 'a4',
        orientation: 'portrait',
        marginMm: 15,
        title: '',
        // Schema v8 (M10): one fitted page stays the default.
        pages: 'single',
        stitchesPerPage: 60,
        overlapStitches: 2,
      },
    },
    // Schema v9 (M12): the documented default estimation model.
    estimates: {
      fabricCount: 14,
      marginCm: 5,
      strands: 2,
      routingFactor: 1.2,
      wasteShare: 0.1,
      skeinMetres: 8,
    },
  };
}

/** The committed fixture PNG's bytes, encoded from the seeded source. */
export function referencePng(): Uint8Array {
  return encodePng(sourceBuffer());
}

/**
 * Run the reference pipeline and return its two hashes. The TS
 * backend is forced for every stage, so the pin is independent of
 * wasm/webgpu availability.
 */
export function referencePipeline(): { pixels: string; indices: string } {
  const config = defaultConfig();
  const source = sourceBuffer();
  const pixels = new Uint8ClampedArray(source.data); // keep the fixture pristine
  const response = executeRequest(
    {
      type: 'process',
      id: 1,
      width: SOURCE_SIDE,
      height: SOURCE_SIDE,
      pixels: pixels.buffer,
      config,
      force: { resize: 'ts', reduce: 'ts', dither: 'ts' },
    },
    () => 0,
  );
  if (response.type !== 'result') throw new Error(`pipeline failed: ${response.type}`);
  if (response.width !== 200 || response.height !== 200) {
    throw new Error(`unexpected reference size ${String(response.width)}x${String(response.height)}`);
  }
  for (const timing of response.timings) {
    if (timing.backend !== 'ts') throw new Error(`stage ran on ${timing.backend}, not ts`);
  }
  if (response.indices === null) throw new Error('reference produced no index sidecar');
  return {
    pixels: sha256(new Uint8Array(response.pixels)),
    indices: sha256(new Uint8Array(response.indices)),
  };
}

/** The serialized default project file. */
export function referenceProjectJson(): string {
  return serializeProject(defaultProject(defaultConfig()));
}

/** The seeded source's raw RGBA bytes — no encoder in the path. */
export function referenceSourcePixels(): string {
  return sha256(new Uint8Array(sourceBuffer().data.buffer.slice(0)));
}

/** Every hash the code can compute. Excludes `sourcePng` — see COMPUTED_KEYS. */
export function computeBaseline(): Pick<BaselineHashes, (typeof COMPUTED_KEYS)[number]> {
  const pipeline = referencePipeline();
  return {
    sourcePixels: referenceSourcePixels(),
    outputPixels: pipeline.pixels,
    outputIndices: pipeline.indices,
    projectJson: sha256(new TextEncoder().encode(referenceProjectJson())),
  };
}
