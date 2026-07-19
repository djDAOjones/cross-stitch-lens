/**
 * Project file (§20): schema v1 round trips byte-identically
 * (AGENTS.md invariant), the parser rejects malformed documents with
 * path-named errors, tolerates unknown extra fields, and refuses
 * files from a newer app version instead of misreading them.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_GRID_SIDE,
  parseProject,
  projectFilename,
  SCHEMA_VERSION,
  serializeProject,
  type ProjectFile,
} from '../src/core/project.ts';

/** A representative, fully-populated v1 project. */
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
});

describe('projectFilename', () => {
  it('names the file after the grid size', () => {
    expect(projectFilename(200, 150)).toBe('project-200x150.json');
  });
});
