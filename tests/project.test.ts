/**
 * Project file (§20): the current schema round trips byte-identically
 * (AGENTS.md invariant), the parser rejects malformed documents with
 * path-named errors, tolerates unknown extra fields, refuses files
 * from a newer app version instead of misreading them, and migrates
 * older ones forward rather than failing on them.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREVIEW,
  MAX_GRID_SIDE,
  parseProject,
  projectFilename,
  SCHEMA_VERSION,
  serializeProject,
  type ProjectFile,
} from '../src/core/project.ts';
import { buildStages, type PipelineConfig } from '../src/core/pipeline/config.ts';
import { runPipeline } from '../src/core/pipeline/index.ts';
import { loadDmcPalette } from '../src/core/palette.ts';
import type { PixelBuffer } from '../src/core/types.ts';

/** A representative, fully-populated current-schema project. */
function sampleProject(): ProjectFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    pipeline: {
      preset: 'resize-first',
      grid: { width: 200, height: 150 },
      resizeMode: 'contain',
      metric: 'lab',
      dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
      ditherProfileRef: null,
    },
    palette: {
      profileRef: { id: 'builtin:dmc', revision: 0 },
      recipe: {
        libraries: ['dmc', 'anchor'],
        ownedOnly: true,
        include: ['map:bw:black'],
        exclude: ['dmc:B5200'],
        ranges: [{ hue: [20, 50], saturation: [10, 55] }],
      },
      design: {
        count: { mode: 'max', n: 20 },
        minDistance: 12,
        mustUse: ['dmc:310'],
      },
      snapshot: loadDmcPalette().entries.slice(0, 3),
    },
    gridStyle: {
      show: true,
      minorInterval: 1,
      majorInterval: 10,
      color: '#666666',
      minorThickness: 1,
      majorThickness: 2,
      ticks: true,
      tickFontPx: 11,
    },
    preview: { mode: 'manual', cssPxPerStitch: 2.5 },
    export: {
      scale: 4,
      background: 'solid',
      color: '#ffffff',
      chartCell: 10,
      pdf: { pageSize: 'a4', orientation: 'portrait', marginMm: 15, title: 'Test design' },
    },
  };
}

describe('serializeProject / parseProject round trip', () => {
  it('save → load → save is byte-identical', () => {
    const saved = serializeProject(sampleProject());
    expect(serializeProject(parseProject(saved))).toBe(saved);
  });

  it('parse returns the exact saved values', () => {
    expect(parseProject(serializeProject(sampleProject()))).toEqual(sampleProject());
  });

  it('canonicalises caller key order, so shuffled input still round-trips', () => {
    const file = sampleProject();
    const shuffled = JSON.stringify({
      export: file.export,
      preview: file.preview,
      gridStyle: file.gridStyle,
      palette: file.palette,
      pipeline: file.pipeline,
      schemaVersion: file.schemaVersion,
    });
    expect(serializeProject(parseProject(shuffled))).toBe(serializeProject(file));
  });

  it('round-trips full-RGB mode (palette null)', () => {
    const file = sampleProject();
    file.palette = null;
    file.pipeline.dither = { algorithm: 'none' };
    expect(parseProject(serializeProject(file)).palette).toBeNull();
  });

  it('round-trips every dither algorithm byte-identically', () => {
    const variants: ProjectFile['pipeline']['dither'][] = [
      { algorithm: 'none' },
      { algorithm: 'floyd-steinberg', serpentine: false, strength: 0.5 },
      { algorithm: 'atkinson', serpentine: true, strength: 1 },
      { algorithm: 'jarvis', serpentine: true, strength: 0.75 },
      { algorithm: 'ordered', strength: 1.5 },
      { algorithm: 'blue-noise', strength: 1 },
    ];
    for (const dither of variants) {
      const file = sampleProject();
      file.pipeline.dither = dither;
      const saved = serializeProject(file);
      expect(serializeProject(parseProject(saved))).toBe(saved);
      expect(parseProject(saved).pipeline.dither).toEqual(dither);
    }
  });

  it('emits human-readable JSON with a trailing newline', () => {
    const text = serializeProject(sampleProject());
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "pipeline"');
  });
});

describe('parseProject validation', () => {
  function mutated(mutate: (doc: Record<string, unknown>) => void): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    mutate(doc);
    return JSON.stringify(doc);
  }

  it('rejects invalid JSON', () => {
    expect(() => parseProject('{nope')).toThrow('not valid JSON');
  });

  it('rejects a non-object root', () => {
    expect(() => parseProject('[1, 2]')).toThrow('project');
  });

  it('rejects a missing schemaVersion', () => {
    expect(() =>
      parseProject(mutated((doc) => delete doc['schemaVersion'])),
    ).toThrow('schemaVersion');
  });

  it('refuses a newer schemaVersion with a clear message', () => {
    expect(() =>
      parseProject(mutated((doc) => (doc['schemaVersion'] = SCHEMA_VERSION + 1))),
    ).toThrow('newer version');
  });

  it('rejects an unknown order preset, naming the path', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['pipeline'] as Record<string, unknown>)['preset'] = 'sideways')),
      ),
    ).toThrow('pipeline.preset');
  });

  it('rejects out-of-range grid sizes', () => {
    const gridOf = (doc: Record<string, unknown>): Record<string, unknown> =>
      (doc['pipeline'] as Record<string, unknown>)['grid'] as Record<string, unknown>;
    expect(() => parseProject(mutated((doc) => (gridOf(doc)['width'] = 0)))).toThrow(
      'pipeline.grid.width',
    );
    expect(() =>
      parseProject(mutated((doc) => (gridOf(doc)['height'] = MAX_GRID_SIDE + 1))),
    ).toThrow('pipeline.grid.height');
    expect(() => parseProject(mutated((doc) => (gridOf(doc)['width'] = 12.5)))).toThrow(
      'pipeline.grid.width',
    );
  });

  it('rejects a non-object dither block', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['pipeline'] as Record<string, unknown>)['dither'] = 'yes')),
      ),
    ).toThrow('pipeline.dither');
  });

  it('rejects an unknown dither algorithm, naming the path', () => {
    const ditherOf = (doc: Record<string, unknown>): Record<string, unknown> =>
      (doc['pipeline'] as Record<string, unknown>)['dither'] as Record<string, unknown>;
    expect(() =>
      parseProject(mutated((doc) => (ditherOf(doc)['algorithm'] = 'stucki'))),
    ).toThrow('pipeline.dither.algorithm');
  });

  it('rejects per-family out-of-range strengths', () => {
    const setDither = (value: unknown) =>
      mutated((doc) => ((doc['pipeline'] as Record<string, unknown>)['dither'] = value));
    // Diffusion strength is a 0–1 error fraction.
    expect(() =>
      parseProject(
        setDither({ algorithm: 'floyd-steinberg', serpentine: true, strength: 1.5 }),
      ),
    ).toThrow('pipeline.dither.strength');
    // Threshold strength scales the base amplitude, 0–2.
    expect(() => parseProject(setDither({ algorithm: 'ordered', strength: 2.5 }))).toThrow(
      'pipeline.dither.strength',
    );
    // Diffusion requires its scan direction.
    expect(() =>
      parseProject(setDither({ algorithm: 'atkinson', strength: 1 })),
    ).toThrow('pipeline.dither.serpentine');
  });

  it('rejects a malformed grid-line colour', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['gridStyle'] as Record<string, unknown>)['color'] = 'red')),
      ),
    ).toThrow('gridStyle.color');
  });

  it('rejects an unknown PDF page size', () => {
    expect(() =>
      parseProject(
        mutated((doc) => {
          const pdf = (doc['export'] as Record<string, unknown>)['pdf'] as Record<string, unknown>;
          pdf['pageSize'] = 'a3';
        }),
      ),
    ).toThrow('export.pdf.pageSize');
  });

  it('ignores unknown extra fields (forward-friendly)', () => {
    const withExtra = mutated((doc) => (doc['futureFeature'] = { anything: true }));
    expect(parseProject(withExtra)).toEqual(sampleProject());
  });

  it('rejects an unknown preview mode, naming the path', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['preview'] as Record<string, unknown>)['mode'] = 'cinema')),
      ),
    ).toThrow('preview.mode');
  });

  it('rejects a preview scale outside the zoom bounds', () => {
    const scaleTo = (value: unknown) =>
      mutated((doc) => ((doc['preview'] as Record<string, unknown>)['cssPxPerStitch'] = value));
    expect(() => parseProject(scaleTo(0))).toThrow('preview.cssPxPerStitch');
    expect(() => parseProject(scaleTo(1000))).toThrow('preview.cssPxPerStitch');
    expect(() => parseProject(scaleTo('big'))).toThrow('preview.cssPxPerStitch');
  });

  it('keeps a fractional preview scale fractional', () => {
    // asInt would quantise the zoom to 100 % steps; asNumber must not.
    expect(parseProject(serializeProject(sampleProject())).preview.cssPxPerStitch).toBe(2.5);
  });
});

/**
 * Forward migration (AGENTS.md: loaders migrate old schemaVersions,
 * never fail on them). v1 files predate the preview block entirely —
 * they must load, not throw, and must land on the documented default
 * rather than on whatever the parser happened to leave behind.
 */
describe('migration from schema v1', () => {
  /**
   * A v1 document: the current one minus `preview`, with the pre-v4
   * Boolean dither + top-level serpentine pair, version pinned.
   */
  function v1Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    delete doc['preview'];
    const pipeline = doc['pipeline'] as Record<string, unknown>;
    pipeline['dither'] = true;
    pipeline['serpentine'] = true;
    doc['schemaVersion'] = 1;
    return JSON.stringify(doc);
  }

  it('loads a v1 file instead of failing on it', () => {
    expect(() => parseProject(v1Document())).not.toThrow();
  });

  it('fills in the default preview block and stamps the new version', () => {
    const loaded = parseProject(v1Document());
    expect(loaded.preview).toEqual(DEFAULT_PREVIEW);
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('preserves every v1 field it did understand', () => {
    const loaded = parseProject(v1Document());
    const original = sampleProject();
    expect(loaded.pipeline).toEqual(original.pipeline);
    expect(loaded.gridStyle).toEqual(original.gridStyle);
    expect(loaded.export).toEqual(original.export);
  });

  it('re-saves the migrated file at the current schema, round-trip stable', () => {
    const migrated = serializeProject(parseProject(v1Document()));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });
});

/**
 * v3 → v4 (M8-ALG-01): the Boolean `dither` + top-level `serpentine`
 * pair becomes the discriminated union. `true` only ever meant
 * Floyd–Steinberg at full strength, so the migrated file must state
 * exactly that — old projects render unchanged.
 */
describe('migration from schema v3 dither', () => {
  function v3Document(dither: boolean, serpentine: boolean): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    const pipeline = doc['pipeline'] as Record<string, unknown>;
    pipeline['dither'] = dither;
    pipeline['serpentine'] = serpentine;
    // A real v3 palette block: the policy world, as v3 wrote it.
    doc['palette'] = {
      policy: {
        brands: ['dmc'],
        source: { kind: 'brands' },
        ownedOnly: false,
        count: { mode: 'max', n: 20 },
        locked: [],
        preferred: [],
        excluded: [],
      },
      snapshot: [],
    };
    doc['schemaVersion'] = 3;
    return JSON.stringify(doc);
  }

  it('lifts dither: true into Floyd–Steinberg, preserving the scan direction', () => {
    expect(parseProject(v3Document(true, true)).pipeline.dither).toEqual({
      algorithm: 'floyd-steinberg',
      serpentine: true,
      strength: 1,
    });
    expect(parseProject(v3Document(true, false)).pipeline.dither).toEqual({
      algorithm: 'floyd-steinberg',
      serpentine: false,
      strength: 1,
    });
  });

  it('lifts dither: false into none', () => {
    expect(parseProject(v3Document(false, true)).pipeline.dither).toEqual({
      algorithm: 'none',
    });
  });

  it('re-saves the migrated file at the current schema, round-trip stable', () => {
    const migrated = serializeProject(parseProject(v3Document(true, false)));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });
});

describe('projectFilename', () => {
  it('names the file after the grid size', () => {
    expect(projectFilename(200, 150)).toBe('project-200x150.json');
  });
});

/**
 * The brief's third success criterion — "a saved project reopens with
 * identical output (golden-test guarantee)" — and the only one that was
 * never asserted anywhere (M5-ACCEPT-01). Byte-identical JSON above
 * proves the *file* survives; it does not prove the file still means
 * the same picture. A field silently dropped from `toJSON`, or a
 * default applied on parse that differs from the value in the document,
 * would round-trip perfectly and still reopen as different artwork.
 *
 * This walks the whole way round: config → project file → text → parse
 * → config → rendered pixels, mirroring `loadProject`'s resolution of
 * the palette NAME back to palette data.
 */
describe('a saved project reopens with identical output', () => {
  const DMC = loadDmcPalette();

  /** `loadProject`'s mapping, as a pure function of the parsed file. */
  function configFrom(file: ProjectFile): PipelineConfig {
    const saved = file.palette;
    return {
      preset: file.pipeline.preset,
      grid: { ...file.pipeline.grid },
      resizeMode: file.pipeline.resizeMode,
      // The snapshot is authoritative on reopen; an empty one (a
      // migrated v2 file) falls back to resolving the policy, which
      // for these cases is every DMC thread.
      palette:
        saved === null ? null : saved.snapshot.length > 0
          ? { name: 'saved', entries: saved.snapshot }
          : DMC,
      metric: file.pipeline.metric,
      dither: file.pipeline.dither,
    };
  }

  /** Deterministic source artwork (LCG — no Math.random). */
  function artwork(width: number, height: number): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    let state = 0x2f6e2b1 >>> 0;
    for (let i = 0; i < width * height; i++) {
      state = (state * 1664525 + 1013904223) >>> 0;
      data[i * 4] = state >>> 24;
      data[i * 4 + 1] = (state >>> 16) & 255;
      data[i * 4 + 2] = (state >>> 8) & 255;
      // Some fully transparent cells, so empty-stitch handling is part
      // of what has to survive the round trip.
      data[i * 4 + 3] = i % 17 === 0 ? 0 : 255;
    }
    return { width, height, data };
  }

  function render(config: PipelineConfig, source: PixelBuffer): Uint8ClampedArray {
    return runPipeline(source, buildStages(config)).data;
  }

  /** The whole DMC palette, as a saved snapshot. */
  const DMC_SNAPSHOT: ProjectFile['palette'] = {
    profileRef: { id: 'builtin:dmc', revision: 0 },
    recipe: { libraries: ['dmc'], ownedOnly: false, include: [], exclude: [], ranges: [] },
    design: { count: { mode: 'all', n: 20 }, minDistance: 0, mustUse: [] },
    snapshot: DMC.entries,
  };

  // One row per creative axis the project file carries.
  const CASES: {
    name: string;
    pipeline: ProjectFile['pipeline'];
    palette: ProjectFile['palette'];
  }[] = [
    {
      name: 'dithered Lab, contain, serpentine',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 24, height: 16 },
        resizeMode: 'contain',
        metric: 'lab',
        dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
        ditherProfileRef: null,
      },
      palette: DMC_SNAPSHOT,
    },
    {
      name: 'plain RGB reduce, cover, raster',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 16, height: 16 },
        resizeMode: 'cover',
        metric: 'rgb',
        dither: { algorithm: 'none' },
        ditherProfileRef: null,
      },
      palette: DMC_SNAPSHOT,
    },
    {
      name: 'reduce-first preset, fit',
      pipeline: {
        preset: 'reduce-first',
        grid: { width: 20, height: 20 },
        resizeMode: 'fit',
        metric: 'lab',
        dither: { algorithm: 'none' },
        ditherProfileRef: null,
      },
      palette: DMC_SNAPSHOT,
    },
    {
      name: 'full-RGB mode (no palette), stretch',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 18, height: 12 },
        resizeMode: 'stretch',
        metric: 'lab',
        dither: { algorithm: 'none' },
        ditherProfileRef: null,
      },
      palette: null,
    },
    {
      name: 'a three-thread saved snapshot, not the whole brand',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 16, height: 16 },
        resizeMode: 'contain',
        metric: 'lab',
        dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
        ditherProfileRef: null,
      },
      // The snapshot is what makes a reopen reproducible: this project
      // renders three threads whatever the catalogue or the library
      // later says (M7-PAL-01).
      palette: {
        profileRef: null,
        recipe: {
          libraries: [],
          ownedOnly: false,
          include: DMC.entries.slice(0, 3).map((t) => t.id),
          exclude: [],
          ranges: [],
        },
        design: { count: { mode: 'all', n: 20 }, minDistance: 0, mustUse: [] },
        snapshot: DMC.entries.slice(0, 3),
      },
    },
    {
      name: 'atkinson at half strength',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 24, height: 16 },
        resizeMode: 'contain',
        metric: 'lab',
        dither: { algorithm: 'atkinson', serpentine: false, strength: 0.5 },
        ditherProfileRef: null,
      },
      palette: DMC_SNAPSHOT,
    },
    {
      name: 'blue-noise threshold',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 24, height: 16 },
        resizeMode: 'contain',
        metric: 'lab',
        dither: { algorithm: 'blue-noise', strength: 1 },
        ditherProfileRef: null,
      },
      palette: DMC_SNAPSHOT,
    },
  ];

  const source = artwork(40, 30);

  for (const { name, pipeline, palette } of CASES) {
    it(`renders identically after save → load — ${name}`, () => {
      const saved: ProjectFile = { ...sampleProject(), pipeline, palette };
      const before = render(configFrom(saved), source);
      const after = render(configFrom(parseProject(serializeProject(saved))), source);
      expect(Array.from(after)).toEqual(Array.from(before));
    });
  }

  it('distinguishes the cases — a different project is a different picture', () => {
    // Without this, the assertions above would also pass if `render`
    // ignored the config entirely.
    const rendered = CASES.map(({ pipeline, palette }) =>
      render(configFrom({ ...sampleProject(), pipeline, palette }), source).join(','),
    );
    expect(new Set(rendered).size).toBe(CASES.length);
  });
});

describe('migration from schema v4 palette (M15-PERSIST-01, D114 waiver)', () => {
  function v4Document(policy: Record<string, unknown>, snapshot: unknown[]): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    doc['palette'] = { policy, snapshot };
    doc['schemaVersion'] = 4;
    return JSON.stringify(doc);
  }
  const basePolicy = {
    brands: ['dmc', 'anchor'],
    source: { kind: 'brands' },
    ownedOnly: true,
    count: { mode: 'max', n: 12 },
    locked: ['dmc:310'],
    preferred: ['anchor:403'],
    excluded: ['dmc:B5200'],
  };

  it('maps a brands policy straight onto the recipe', () => {
    const file = parseProject(v4Document(basePolicy, []));
    expect(file.migratedFrom).toBe(4);
    expect(file.palette?.profileRef).toBeNull();
    expect(file.palette?.recipe.libraries).toEqual(['dmc', 'anchor']);
    expect(file.palette?.recipe.ownedOnly).toBe(true);
    expect(file.palette?.recipe.exclude).toEqual(['dmc:B5200']);
    // Locks become Must-use seats; prefer retires with nothing kept.
    expect(file.palette?.design.mustUse).toEqual(['dmc:310']);
    expect(file.palette?.design.count).toEqual({ mode: 'max', n: 12 });
    expect(file.palette?.design.minDistance).toBe(0);
  });

  it('turns a library source into explicit membership from the snapshot', () => {
    const snapshot = loadDmcPalette().entries.slice(0, 2);
    const file = parseProject(
      v4Document(
        { ...basePolicy, source: { kind: 'library', paletteId: 'pal-1' } },
        JSON.parse(JSON.stringify(snapshot)) as unknown[],
      ),
    );
    expect(file.palette?.recipe.libraries).toEqual([]);
    expect(file.palette?.recipe.include).toEqual(snapshot.map((t) => t.id));
    // The snapshot itself still renders — authoritative on reopen.
    expect(file.palette?.snapshot).toHaveLength(2);
  });

  it('keeps a prefer-mode preset open — the steering half retired', () => {
    const file = parseProject(
      v4Document(
        { ...basePolicy, source: { kind: 'preset', presetId: 'pastel', mode: 'prefer' } },
        [],
      ),
    );
    expect(file.palette?.recipe.libraries).toEqual(['dmc', 'anchor']);
    expect(file.palette?.recipe.include).toEqual([]);
  });

  it('re-saves a migrated v4 file byte-stable at v5', () => {
    const migrated = serializeProject(parseProject(v4Document(basePolicy, [])));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
    expect(migrated).toContain('"schemaVersion": 5');
    // migratedFrom is transient metadata, never serialised.
    expect(migrated).not.toContain('migratedFrom');
  });
});
