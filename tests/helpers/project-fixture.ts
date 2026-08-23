/**
 * A compact, fully-populated current-schema project for the tests that
 * exercise the file *container* and the design history (DUR-01) —
 * suites that need a valid document but are not about the document's
 * own fields. `tests/project.test.ts` keeps its own richer fixture: it
 * is the schema's suite and pins every field deliberately.
 */

import { DEFAULT_ESTIMATES } from '../../src/core/estimates.ts';
import { DEFAULT_GRID_VALUES } from '../../src/core/grid-style.ts';
import { loadDmcPalette } from '../../src/core/palette.ts';
import { SCHEMA_VERSION, type ProjectFile } from '../../src/core/project.ts';

/** A valid v10 project with a picture entry and a two-thread snapshot. */
export function sampleProject(): ProjectFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    source: { entry: 'source.jpg', type: 'image/jpeg', name: 'Fox sketch.jpg' },
    pipeline: {
      preset: 'resize-first',
      grid: { width: 120, height: 60 },
      resizeMode: 'contain',
      metric: 'lab',
      dither: { algorithm: 'floyd-steinberg', serpentine: true, strength: 1 },
      ditherProfileRef: null,
    },
    palette: {
      profileRef: { id: 'builtin:dmc', revision: 0 },
      recipe: { libraries: ['dmc'], ownedOnly: false, include: [], exclude: [], ranges: [] },
      design: { count: { mode: 'max', n: 8 }, minDistance: 0, mustUse: [], swaps: [] },
      snapshot: loadDmcPalette().entries.slice(0, 2),
    },
    symbols: { assigned: [], queue: [], overrides: [] },
    gridStyle: {
      screen: { ...DEFAULT_GRID_VALUES },
      print: { ...DEFAULT_GRID_VALUES },
      preset: 'every-10',
    },
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
        title: 'Fox',
        pages: 'single',
        stitchesPerPage: 60,
        overlapStitches: 2,
      },
    },
    estimates: { ...DEFAULT_ESTIMATES },
  };
}
