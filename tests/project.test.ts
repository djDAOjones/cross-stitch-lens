/**
 * Project file (§20): the current schema round trips byte-identically
 * (AGENTS.md invariant), the parser rejects malformed documents with
 * path-named errors, tolerates unknown extra fields, refuses files
 * from a newer app version instead of misreading them, and migrates
 * older ones forward rather than failing on them.
 */

import { describe, expect, it } from 'vitest';
import { defaultTone } from '../src/core/color/tone.ts';
import { defaultAdjust, MAX_SATURATION } from '../src/core/pipeline/adjust.ts';
import { DEFAULT_GRID_VALUES } from '../src/core/grid-style.ts';
import {
  DEFAULT_FLOOR,
  DEFAULT_PREVIEW,
  MAX_GRID_SIDE,
  MAX_PALETTE_ENTRIES,
  parseProject,
  projectFilename,
  projectStamp,
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
    source: { entry: 'source.jpg', type: 'image/jpeg', name: 'Fox sketch.jpg' },
    pipeline: {
      preset: 'resize-first',
      grid: { width: 200, height: 150 },
      resizeMode: 'contain',
      metric: 'lab',
      dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
      ditherProfileRef: null,
      // Non-default tone (v12): an engaged weight, a bent curve and
      // explicit cuts, so the round trip proves every field survives.
      tone: {
        weight: 0.5,
        curve: [
          { in: 0, out: 5 },
          { in: 45, out: 60 },
          { in: 100, out: 95 },
        ],
        cuts: [30.5, 62],
      },
      // Non-default adjust (v13): a bent curve and a saturation push,
      // so the round trip proves both halves survive.
      adjust: {
        curve: [
          { in: 8, out: 0 },
          { in: 50, out: 48 },
          { in: 92, out: 100 },
        ],
        saturation: 1.2,
      },
      adjustProfileRef: { id: 'builtin:punch', revision: 0 },
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
        swaps: [],
        floor: { on: true, minStitches: 25 },
      },
      snapshot: loadDmcPalette().entries.slice(0, 3),
    },
    symbols: {
      assigned: [
        { threadId: 'dmc:310', symbolId: 'dot' },
        { threadId: 'dmc:817', symbolId: 'circle' },
      ],
      queue: ['square-fill', 'square'],
      overrides: [{ threadId: 'dmc:817', symbolId: 'circle' }],
    },
    gridStyle: {
      screen: {
        show: true,
        minorInterval: 1,
        majorInterval: 10,
        color: '#666666',
        majorColor: '#333333',
        minorThickness: 1,
        majorThickness: 2,
        opacity: 0.8,
        minorDash: true,
        borderThickness: 3,
        borderColor: '#000000',
        ticks: true,
        tickFontPx: 11,
      },
      print: {
        show: true,
        minorInterval: 1,
        majorInterval: 10,
        color: '#000000',
        majorColor: '#000000',
        minorThickness: 1,
        majorThickness: 3,
        opacity: 1,
        minorDash: false,
        borderThickness: 4,
        borderColor: '#000000',
        ticks: true,
        tickFontPx: 14,
      },
      preset: null,
    },
    preview: { mode: 'manual', cssPxPerStitch: 2.5 },
    export: {
      scale: 4,
      background: 'solid',
      color: '#ffffff',
      chartCell: 10,
      chartMode: 'symbols',
      pdf: {
        pageSize: 'a4',
        orientation: 'portrait',
        marginMm: 15,
        title: 'Test design',
        pages: 'grid',
        stitchesPerPage: 60,
        overlapStitches: 2,
      },
    },
    estimates: {
      fabricCount: 16,
      marginCm: 6,
      strands: 3,
      routingFactor: 1.3,
      wasteShare: 0.15,
      skeinMetres: 8,
    },
  };
}

/**
 * The flat pre-v7 gridStyle block exactly as v1–v6 files carried it.
 * Non-default values on purpose, so the migrated result can only be
 * labelled Custom (preset null), never accidentally a built-in.
 */
function legacyGridStyle(): Record<string, unknown> {
  return {
    show: true,
    minorInterval: 1,
    majorInterval: 10,
    color: '#444444',
    minorThickness: 1,
    majorThickness: 2,
    ticks: true,
    tickFontPx: 12,
  };
}

/**
 * What `legacyGridStyle` must migrate to: both halves seeded from the
 * one flat block (major and border inherit the line colour; opacity,
 * dash, and border take their appearance-preserving identities).
 */
function migratedLegacyGrid(): ProjectFile['gridStyle'] {
  const half = {
    show: true,
    minorInterval: 1,
    majorInterval: 10,
    color: '#444444',
    majorColor: '#444444',
    minorThickness: 1,
    majorThickness: 2,
    opacity: 1,
    minorDash: false,
    borderThickness: 0,
    borderColor: '#444444',
    ticks: true,
    tickFontPx: 12,
  };
  return { screen: { ...half }, print: { ...half }, preset: null };
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
      estimates: file.estimates,
      export: file.export,
      preview: file.preview,
      gridStyle: file.gridStyle,
      symbols: file.symbols,
      palette: file.palette,
      pipeline: file.pipeline,
      source: file.source,
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

  it('rejects a malformed grid-line colour, naming the half', () => {
    expect(() =>
      parseProject(
        mutated((doc) => {
          const block = doc['gridStyle'] as { screen: Record<string, unknown> };
          block.screen['color'] = 'red';
        }),
      ),
    ).toThrow('gridStyle.screen.color');
  });

  it('rejects an out-of-range line opacity, naming the half', () => {
    expect(() =>
      parseProject(
        mutated((doc) => {
          const block = doc['gridStyle'] as { print: Record<string, unknown> };
          block.print['opacity'] = 1.5;
        }),
      ),
    ).toThrow('gridStyle.print.opacity');
  });

  it('rejects a missing print half, naming the path', () => {
    expect(() =>
      parseProject(
        mutated((doc) => delete (doc['gridStyle'] as Record<string, unknown>)['print']),
      ),
    ).toThrow('gridStyle.print');
  });

  it('rejects preset-id shape abuse but keeps unknown ids', () => {
    expect(() =>
      parseProject(
        mutated(
          (doc) => ((doc['gridStyle'] as Record<string, unknown>)['preset'] = 'x'.repeat(65)),
        ),
      ),
    ).toThrow('gridStyle.preset');
    // Forward-friendly: a future build's preset id loads as-is.
    const future = parseProject(
      mutated((doc) => ((doc['gridStyle'] as Record<string, unknown>)['preset'] = 'squares')),
    );
    expect(future.gridStyle.preset).toBe('squares');
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
    doc['gridStyle'] = legacyGridStyle();
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
    // The flat v1 grid style arrives split into the v7 halves.
    expect(loaded.gridStyle).toEqual(migratedLegacyGrid());
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
    doc['gridStyle'] = legacyGridStyle();
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

/**
 * SAVE-01: a design's title names its file. The old name came from the
 * grid alone, so every 200 × 200 design saved identically; now the
 * title leads, the picture's name stands in, and a stamp is the last
 * resort — two untitled, pictureless designs still never collide.
 */
describe('projectFilename', () => {
  const parts = { width: 200, height: 150, sourceName: null, stamp: '20260823-0152' };

  it('names the file after the Design title, then the grid size', () => {
    expect(projectFilename({ ...parts, title: 'Fox sketch' })).toBe('Fox-sketch-200x150.pmproj');
  });

  it('makes the title filename-safe without losing its words', () => {
    expect(projectFilename({ ...parts, title: ' a/b:c*d?"<e>|f\tg.. ' })).toBe(
      'a-b-c-d-e-f-g-200x150.pmproj',
    );
    // Letters of any script survive; a long title is capped.
    expect(projectFilename({ ...parts, title: 'Renard rusé — été' })).toBe(
      'Renard-rusé-été-200x150.pmproj',
    );
    const long = projectFilename({ ...parts, title: 'x'.repeat(100) });
    expect(long).toBe(`${'x'.repeat(60)}-200x150.pmproj`);
  });

  it('falls back to the picture name, minus its extension, when untitled', () => {
    expect(projectFilename({ ...parts, title: '', sourceName: 'landscape-1.jpg' })).toBe(
      'landscape-1-200x150.pmproj',
    );
    expect(
      projectFilename({ ...parts, title: '***', sourceName: 'Screen capture (the shared screen)' }),
    ).toBe('Screen-capture-the-shared-screen-200x150.pmproj');
  });

  it('falls back to a stamp when there is no name at all — two defaults never collide', () => {
    const a = projectFilename({ ...parts, title: '' });
    const b = projectFilename({ ...parts, title: '', stamp: '20260823-0153' });
    expect(a).toBe('design-20260823-0152-200x150.pmproj');
    expect(a).not.toBe(b);
    // Deterministic for the same inputs: the stamp is the only clock.
    expect(projectFilename({ ...parts, title: '' })).toBe(a);
  });

  it('stamps local wall-clock minutes', () => {
    expect(projectStamp(new Date(2026, 7, 23, 1, 52))).toBe('20260823-0152');
    expect(projectStamp(new Date(2026, 11, 5, 23, 7))).toBe('20261205-2307');
  });
});

/**
 * v9 → v10 (DUR-01): the picture joins the saved file as a package
 * entry the document names. Older files never carried one; `source:
 * null` states exactly that, and they keep applying to the next import.
 */
describe('migration from schema v9 source', () => {
  function v9Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    delete doc['source'];
    doc['schemaVersion'] = 9;
    return JSON.stringify(doc);
  }

  it('loads as a settings-only project', () => {
    const loaded = parseProject(v9Document());
    expect(loaded.migratedFrom).toBe(9);
    expect(loaded.source).toBeNull();
  });

  it('re-saves the migrated file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v9Document()));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
    expect(migrated).toContain('"source": null');
  });
});

describe('colour swaps (schema v11, ICE-RECOLOUR-01)', () => {
  const DMC = loadDmcPalette();
  const swap = () => ({ from: 'dmc:310', to: DMC.entries[5] ?? DMC.entries[0] });

  function withSwaps(): ProjectFile {
    const file = sampleProject();
    if (file.palette === null) throw new Error('fixture');
    const target = swap();
    if (target.to === undefined) throw new Error('fixture');
    file.palette.design.swaps = [{ from: target.from, to: target.to }];
    return file;
  }

  function swapsDoc(mutate: (swaps: unknown[]) => unknown): string {
    const doc = JSON.parse(serializeProject(withSwaps())) as Record<string, unknown>;
    const palette = doc['palette'] as Record<string, unknown>;
    const design = palette['design'] as Record<string, unknown>;
    design['swaps'] = mutate(design['swaps'] as unknown[]);
    return JSON.stringify(doc);
  }

  it('round-trips a swap byte-identically, the target as a full record (persistence)', () => {
    const json = serializeProject(withSwaps());
    const loaded = parseProject(json);
    expect(serializeProject(loaded)).toBe(json);
    expect(loaded.palette?.design.swaps).toEqual(withSwaps().palette?.design.swaps);
    expect(json).toContain('"swaps": [');
    expect(json).toContain('"from": "dmc:310"');
  });

  it('a v10 file migrates with an empty swap list; full-RGB files stay null', () => {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    const palette = doc['palette'] as Record<string, unknown>;
    delete (palette['design'] as Record<string, unknown>)['swaps'];
    doc['schemaVersion'] = 10;
    const loaded = parseProject(JSON.stringify(doc));
    expect(loaded.migratedFrom).toBe(10);
    expect(loaded.palette?.design.swaps).toEqual([]);
    const migrated = serializeProject(loaded);
    expect(serializeProject(parseProject(migrated))).toBe(migrated);

    const rgb = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    rgb['palette'] = null;
    rgb['schemaVersion'] = 10;
    expect(parseProject(JSON.stringify(rgb)).palette).toBeNull();
  });

  it('refuses a duplicate from, a malformed target and a missing list, naming the path (error)', () => {
    expect(() => parseProject(swapsDoc((swaps) => [...swaps, ...swaps]))).toThrow(
      'palette.design.swaps[1].from',
    );
    expect(() => parseProject(swapsDoc(() => [{ from: 'dmc:310', to: 'dmc:311' }]))).toThrow(
      'palette.design.swaps[0].to',
    );
    expect(() => parseProject(swapsDoc(() => [{ to: swap().to }]))).toThrow(
      'palette.design.swaps[0].from',
    );
    expect(() => parseProject(swapsDoc(() => 'none' as unknown as unknown[]))).toThrow(
      'palette.design.swaps',
    );
  });

  it('caps the list at the palette ceiling (boundary)', () => {
    const target = swap().to;
    if (target === undefined) throw new Error('fixture');
    const many = Array.from({ length: MAX_PALETTE_ENTRIES + 1 }, (_, i) => ({
      from: `test:${String(i)}`,
      to: target,
    }));
    expect(() => parseProject(swapsDoc(() => many))).toThrow('at most');
    expect(parseProject(swapsDoc(() => many.slice(0, MAX_PALETTE_ENTRIES))).palette?.design.swaps)
      .toHaveLength(MAX_PALETTE_ENTRIES);
  });
});

describe('source block validation (schema v10)', () => {
  function withSource(source: unknown): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    doc['source'] = source;
    return JSON.stringify(doc);
  }

  it('round-trips a picture entry and accepts null and absent as settings-only', () => {
    expect(parseProject(serializeProject(sampleProject())).source).toEqual({
      entry: 'source.jpg',
      type: 'image/jpeg',
      name: 'Fox sketch.jpg',
    });
    expect(parseProject(withSource(null)).source).toBeNull();
    expect(parseProject(withSource(undefined)).source).toBeNull();
  });

  it('refuses an entry name that is a path, naming the field', () => {
    // The entry name reaches the package reader by value; a separator
    // in it is the one shape that must never get through.
    for (const entry of ['../source.png', 'pics/source.png', '', '.hidden', 'x'.repeat(65)]) {
      expect(() =>
        parseProject(withSource({ entry, type: 'image/png', name: 'a' })),
      ).toThrow('source.entry');
    }
  });

  it('refuses a malformed type and an overlong name, naming the field', () => {
    expect(() =>
      parseProject(withSource({ entry: 'source.png', type: 'png', name: 'a' })),
    ).toThrow('source.type');
    expect(() =>
      parseProject(withSource({ entry: 'source.png', type: 'image/png', name: 'n'.repeat(256) })),
    ).toThrow('source.name');
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
      tone: file.pipeline.tone,
      adjust: file.pipeline.adjust,
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
    design: {
      count: { mode: 'all', n: 20 },
      minDistance: 0,
      mustUse: [],
      swaps: [],
      floor: { ...DEFAULT_FLOOR },
    },
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        design: {
      count: { mode: 'all', n: 20 },
      minDistance: 0,
      mustUse: [],
      swaps: [],
      floor: { ...DEFAULT_FLOOR },
    },
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
        tone: defaultTone(),
        adjust: defaultAdjust(),
        adjustProfileRef: null,
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
    doc['gridStyle'] = legacyGridStyle();
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

  it('re-saves a migrated v4 file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v4Document(basePolicy, [])));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
    expect(migrated).toContain(`"schemaVersion": ${String(SCHEMA_VERSION)}`);
    // migratedFrom is transient metadata, never serialised.
    expect(migrated).not.toContain('migratedFrom');
  });
});

/**
 * v5 → v6 (M9): symbol assignment and the chart mode arrive. A v5
 * file never granted a symbol and always painted colour cells — the
 * migrated defaults state exactly that.
 */
describe('migration from schema v5 symbols', () => {
  function v5Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    delete doc['symbols'];
    delete (doc['export'] as Record<string, unknown>)['chartMode'];
    doc['gridStyle'] = legacyGridStyle();
    doc['schemaVersion'] = 5;
    return JSON.stringify(doc);
  }

  it('adds an empty symbols block and the colour chart mode', () => {
    const loaded = parseProject(v5Document());
    expect(loaded.migratedFrom).toBe(5);
    expect(loaded.symbols).toEqual({ assigned: [], queue: [], overrides: [] });
    expect(loaded.export.chartMode).toBe('color');
  });

  it('re-saves the migrated file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v5Document()));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });
});

/**
 * v6 → v7 (M11): the single grid style splits into screen + print
 * halves with preset provenance. Migration must preserve appearance
 * exactly (both halves seed from the one block that drove both
 * surfaces) and label the values honestly.
 */
describe('migration from schema v6 grid style', () => {
  function v6Document(grid: Record<string, unknown>): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    doc['gridStyle'] = grid;
    doc['schemaVersion'] = 6;
    return JSON.stringify(doc);
  }

  it('splits the flat style into identical screen and print halves', () => {
    const loaded = parseProject(v6Document(legacyGridStyle()));
    expect(loaded.migratedFrom).toBe(6);
    expect(loaded.gridStyle).toEqual(migratedLegacyGrid());
  });

  it('labels untouched default styling as the Every 10 preset', () => {
    const flatDefaults = {
      show: true,
      minorInterval: 1,
      majorInterval: 10,
      color: '#666666',
      minorThickness: 1,
      majorThickness: 2,
      ticks: true,
      tickFontPx: 11,
    };
    const loaded = parseProject(v6Document(flatDefaults));
    expect(loaded.gridStyle.preset).toBe('every-10');
    expect(loaded.gridStyle.screen).toEqual(DEFAULT_GRID_VALUES);
    expect(loaded.gridStyle.print).toEqual(DEFAULT_GRID_VALUES);
  });

  it('re-saves the migrated file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v6Document(legacyGridStyle())));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
    expect(migrated).not.toContain('migratedFrom');
  });
});

/**
 * v7 → v8 (M10): PDF pagination arrives. Older files exported one
 * fitted page, which the migrated 'single' states exactly; the
 * grid-mode numbers arrive at the UI defaults, inert until chosen.
 */
describe('migration from schema v7 pdf pages', () => {
  function v7Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    const exportPrefs = doc['export'] as Record<string, unknown>;
    const pdf = exportPrefs['pdf'] as Record<string, unknown>;
    delete pdf['pages'];
    delete pdf['stitchesPerPage'];
    delete pdf['overlapStitches'];
    doc['schemaVersion'] = 7;
    return JSON.stringify(doc);
  }

  it('adds single-page mode with the default paging numbers', () => {
    const loaded = parseProject(v7Document());
    expect(loaded.migratedFrom).toBe(7);
    expect(loaded.export.pdf.pages).toBe('single');
    expect(loaded.export.pdf.stitchesPerPage).toBe(60);
    expect(loaded.export.pdf.overlapStitches).toBe(2);
  });

  it('re-saves the migrated file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v7Document()));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });

  it('rejects an unknown pages mode, naming the path', () => {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    ((doc['export'] as Record<string, unknown>)['pdf'] as Record<string, unknown>)['pages'] =
      'booklet';
    expect(() => parseProject(JSON.stringify(doc))).toThrow('export.pdf.pages');
  });
});

/**
 * v8 → v9 (M12): fabric and estimation settings arrive. Older files
 * never chose a fabric; the documented defaults are the model.
 */
describe('migration from schema v8 estimates', () => {
  function v8Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    delete doc['estimates'];
    doc['schemaVersion'] = 8;
    return JSON.stringify(doc);
  }

  it('seeds the documented default estimation model', () => {
    const loaded = parseProject(v8Document());
    expect(loaded.migratedFrom).toBe(8);
    expect(loaded.estimates).toEqual({
      fabricCount: 14,
      marginCm: 5,
      strands: 2,
      routingFactor: 1.2,
      wasteShare: 0.1,
      skeinMetres: 8,
    });
  });

  it('re-saves the migrated file byte-stable at the current schema', () => {
    const migrated = serializeProject(parseProject(v8Document()));
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });

  it('rejects an out-of-range waste share, naming the path', () => {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    (doc['estimates'] as Record<string, unknown>)['wasteShare'] = 2;
    expect(() => parseProject(JSON.stringify(doc))).toThrow('estimates.wasteShare');
  });
});

describe('symbols block validation (schema v6)', () => {
  function mutated(mutate: (doc: Record<string, unknown>) => void): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    mutate(doc);
    return JSON.stringify(doc);
  }

  it('rejects a missing block at the current version, naming the path', () => {
    expect(() => parseProject(mutated((doc) => delete doc['symbols']))).toThrow('symbols');
  });

  it('rejects a malformed pair, naming the path', () => {
    expect(() =>
      parseProject(
        mutated(
          (doc) =>
            ((doc['symbols'] as Record<string, unknown>)['assigned'] = [{ threadId: 'x' }]),
        ),
      ),
    ).toThrow('symbols.assigned[0].symbolId');
  });

  it('rejects an unknown chart mode, naming the path', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['export'] as Record<string, unknown>)['chartMode'] = 'neon')),
      ),
    ).toThrow('export.chartMode');
  });

  it('caps a hostile queue before walking it', () => {
    expect(() =>
      parseProject(
        mutated(
          (doc) =>
            ((doc['symbols'] as Record<string, unknown>)['queue'] = Array.from(
              { length: 5000 },
              (_, i) => `s${String(i)}`,
            )),
        ),
      ),
    ).toThrow('symbols.queue');
  });
});

describe('image adjustments (schema v13, ADJUST-01)', () => {
  function adjustDoc(mutate: (adjust: Record<string, unknown>) => unknown): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    const pipeline = doc['pipeline'] as Record<string, unknown>;
    pipeline['adjust'] = mutate(pipeline['adjust'] as Record<string, unknown>);
    return JSON.stringify(doc);
  }

  it('round-trips the curve, the saturation and the profile ref byte-identically', () => {
    const json = serializeProject(sampleProject());
    const loaded = parseProject(json);
    expect(serializeProject(loaded)).toBe(json);
    expect(loaded.pipeline.adjust).toEqual(sampleProject().pipeline.adjust);
    expect(loaded.pipeline.adjustProfileRef).toEqual({ id: 'builtin:punch', revision: 0 });
    expect(json).toContain('"saturation": 1.2');
  });

  it('a v12 file migrates to the identity with no profile attached', () => {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    const pipeline = doc['pipeline'] as Record<string, unknown>;
    delete pipeline['adjust'];
    delete pipeline['adjustProfileRef'];
    doc['schemaVersion'] = 12;
    const loaded = parseProject(JSON.stringify(doc));
    expect(loaded.migratedFrom).toBe(12);
    // The identity is what "this file never adjusted" states exactly:
    // the stage stays out of the built order, so it renders as it did.
    expect(loaded.pipeline.adjust).toEqual(defaultAdjust());
    expect(loaded.pipeline.adjustProfileRef).toBeNull();
    const migrated = serializeProject(loaded);
    expect(serializeProject(parseProject(migrated))).toBe(migrated);
  });

  it('refuses a malformed curve, a crossed one and an out-of-range saturation, naming the path (error)', () => {
    expect(() => parseProject(adjustDoc(() => ({ saturation: 1 })))).toThrow(
      'pipeline.adjust.curve',
    );
    expect(() =>
      parseProject(
        adjustDoc(() => ({
          curve: [
            { in: 60, out: 0 },
            { in: 20, out: 50 },
            { in: 100, out: 100 },
          ],
          saturation: 1,
        })),
      ),
    ).toThrow('non-decreasing');
    expect(() =>
      parseProject(adjustDoc((adjust) => ({ ...adjust, saturation: 9 }))),
    ).toThrow('pipeline.adjust.saturation');
    expect(() =>
      parseProject(adjustDoc((adjust) => ({ ...adjust, saturation: -1 }))),
    ).toThrow('pipeline.adjust.saturation');
  });

  it('accepts the boundary values (boundary)', () => {
    const loaded = parseProject(
      adjustDoc(() => ({
        curve: [
          { in: 0, out: 100 },
          { in: 0, out: 0 },
          { in: 100, out: 0 },
        ],
        saturation: MAX_SATURATION,
      })),
    );
    expect(loaded.pipeline.adjust.saturation).toBe(MAX_SATURATION);
    expect(loaded.pipeline.adjust.curve[1]).toEqual({ in: 0, out: 0 });
  });
});
