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
      palette: 'DMC',
      metric: 'lab',
      dither: true,
      serpentine: true,
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
      pipeline: file.pipeline,
      schemaVersion: file.schemaVersion,
    });
    expect(serializeProject(parseProject(shuffled))).toBe(serializeProject(file));
  });

  it('round-trips full-RGB mode (palette null)', () => {
    const file = sampleProject();
    file.pipeline.palette = null;
    file.pipeline.dither = false;
    expect(parseProject(serializeProject(file)).pipeline.palette).toBeNull();
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

  it('rejects a non-boolean dither flag', () => {
    expect(() =>
      parseProject(
        mutated((doc) => ((doc['pipeline'] as Record<string, unknown>)['dither'] = 'yes')),
      ),
    ).toThrow('pipeline.dither');
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
  /** A v1 document: the current one minus `preview`, version pinned. */
  function v1Document(): string {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    delete doc['preview'];
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
    const name = file.pipeline.palette;
    return {
      preset: file.pipeline.preset,
      grid: { ...file.pipeline.grid },
      resizeMode: file.pipeline.resizeMode,
      palette: name === null ? null : DMC,
      metric: file.pipeline.metric,
      dither: file.pipeline.dither,
      serpentine: file.pipeline.serpentine,
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

  // One row per creative axis the project file carries.
  const CASES: { name: string; pipeline: ProjectFile['pipeline'] }[] = [
    {
      name: 'dithered Lab, contain, serpentine',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 24, height: 16 },
        resizeMode: 'contain',
        palette: 'DMC',
        metric: 'lab',
        dither: true,
        serpentine: true,
      },
    },
    {
      name: 'plain RGB reduce, cover, raster',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 16, height: 16 },
        resizeMode: 'cover',
        palette: 'DMC',
        metric: 'rgb',
        dither: false,
        serpentine: false,
      },
    },
    {
      name: 'reduce-first preset, fit',
      pipeline: {
        preset: 'reduce-first',
        grid: { width: 20, height: 20 },
        resizeMode: 'fit',
        palette: 'DMC',
        metric: 'lab',
        dither: false,
        serpentine: true,
      },
    },
    {
      name: 'full-RGB mode (no palette), stretch',
      pipeline: {
        preset: 'resize-first',
        grid: { width: 18, height: 12 },
        resizeMode: 'stretch',
        palette: null,
        metric: 'lab',
        dither: false,
        serpentine: true,
      },
    },
  ];

  const source = artwork(40, 30);

  for (const { name, pipeline } of CASES) {
    it(`renders identically after save → load — ${name}`, () => {
      const saved: ProjectFile = { ...sampleProject(), pipeline };
      const before = render(configFrom(saved), source);
      const after = render(configFrom(parseProject(serializeProject(saved))), source);
      expect(Array.from(after)).toEqual(Array.from(before));
    });
  }

  it('distinguishes the cases — a different project is a different picture', () => {
    // Without this, the assertions above would also pass if `render`
    // ignored the config entirely.
    const rendered = CASES.map(({ pipeline }) =>
      render(configFrom({ ...sampleProject(), pipeline }), source).join(','),
    );
    expect(new Set(rendered).size).toBe(CASES.length);
  });
});
