/**
 * Symbol override picker (ICE-SYMBOL-UI-01), the pure half: the pool
 * the picker offers (unused only, catalogue order), what a row shows
 * before and after a grant, and the invariant the item closes on —
 * an override survives save → load and still wins at the next grant.
 * The modal and the table column are verified in the running app.
 */

import { describe, expect, it } from 'vitest';
import { defaultTone } from '../src/core/color/tone.ts';
import { defaultAdjust } from '../src/core/pipeline/adjust.ts';

import {
  effectiveSymbols,
  grantNeeded,
  initialSymbolState,
  reconcileSymbolState,
  setOverride,
  type SymbolAssignmentState,
} from '../src/core/symbols/assignment.ts';
import { SYMBOL_GLYPHS, SYMBOL_IDS, type SymbolGlyph } from '../src/core/symbols/glyphs.ts';
import {
  displayGlyph,
  standingSentence,
  symbolPickerModel,
} from '../src/ui/symbol-picker.ts';
import { parseProject, serializeProject, type ProjectFile } from '../src/core/project.ts';
import { DEFAULT_PREVIEW, SCHEMA_VERSION } from '../src/core/project.ts';
import { DEFAULT_GRID_VALUES } from '../src/core/grid-style.ts';
import { DEFAULT_ESTIMATES } from '../src/core/estimates.ts';

const GLYPHS: readonly SymbolGlyph[] = [
  { id: 's1', name: 'One', path: '' },
  { id: 's2', name: 'Two', path: '' },
  { id: 's3', name: 'Three', path: '' },
  { id: 's4', name: 'Four', path: '' },
];
const CANON = GLYPHS.map((g) => g.id);

describe('symbolPickerModel', () => {
  it('offers only unused glyphs, in catalogue order, whatever the queue order', () => {
    const state: SymbolAssignmentState = {
      assigned: [{ threadId: 't1', symbolId: 's2' }],
      // Released-to-the-back order: s4 before s1 and s3.
      queue: ['s4', 's1', 's3'],
      overrides: [],
    };
    const model = symbolPickerModel(state, 't1', GLYPHS);
    expect(model.unused.map((g) => g.id)).toEqual(['s1', 's3', 's4']);
    expect(model.current?.id).toBe('s2');
    expect(model.chosen).toBeNull();
  });

  it('reports a recorded override as chosen, and an unknown one as nothing to show', () => {
    const state: SymbolAssignmentState = {
      assigned: [],
      queue: CANON,
      overrides: [
        { threadId: 't1', symbolId: 's3' },
        { threadId: 't2', symbolId: 'future-glyph' },
      ],
    };
    expect(symbolPickerModel(state, 't1', GLYPHS).chosen?.id).toBe('s3');
    expect(symbolPickerModel(state, 't2', GLYPHS).chosen).toBeNull();
    expect(symbolPickerModel(state, 't9', GLYPHS).current).toBeNull();
  });
});

describe('displayGlyph — what the Colours-used row shows', () => {
  it('shows the grant when there is one', () => {
    const state = grantNeeded(initialSymbolState(CANON), ['t1']).state;
    expect(displayGlyph(state, 't1', GLYPHS)?.id).toBe('s1');
  });

  it('shows a free override before any grant, since it will win at grant time', () => {
    const state = setOverride(initialSymbolState(CANON), 't1', 's3').state;
    expect(displayGlyph(state, 't1', GLYPHS)?.id).toBe('s3');
  });

  it('shows nothing for an override whose symbol another thread took', () => {
    let state = setOverride(initialSymbolState(CANON), 't1', 's1').state;
    state = grantNeeded(state, ['t2']).state; // t2 takes s1 from the front
    expect(effectiveSymbols(state).get('t2')).toBe('s1');
    expect(displayGlyph(state, 't1', GLYPHS)).toBeNull();
  });
});

describe('standingSentence', () => {
  it('names the grant, the kept choice, and the rule', () => {
    const model = symbolPickerModel(
      { assigned: [{ threadId: 't1', symbolId: 's2' }], queue: ['s1'], overrides: [] },
      't1',
      GLYPHS,
    );
    expect(standingSentence(model)).toBe(
      'Now Two. Symbols other colours wear are not offered.',
    );
    const chosen = symbolPickerModel(
      { assigned: [], queue: CANON, overrides: [{ threadId: 't1', symbolId: 's4' }] },
      't1',
      GLYPHS,
    );
    expect(standingSentence(chosen)).toBe(
      'No symbol yet — one is assigned when a symbol chart is exported. Kept for this colour: Four. Symbols other colours wear are not offered.',
    );
  });
});

/** A minimal current-schema project carrying the given symbol state. */
function projectWith(symbols: SymbolAssignmentState): ProjectFile {
  const half = { ...DEFAULT_GRID_VALUES };
  return {
    schemaVersion: SCHEMA_VERSION,
    source: null,
    pipeline: {
      preset: 'resize-first',
      grid: { width: 10, height: 10 },
      resizeMode: 'contain',
      metric: 'lab',
      dither: { algorithm: 'none' },
      ditherProfileRef: null,
      tone: defaultTone(),
      adjust: defaultAdjust(),
      adjustProfileRef: null,
    },
    palette: null,
    symbols: {
      assigned: [...symbols.assigned],
      queue: [...symbols.queue],
      overrides: [...symbols.overrides],
    },
    gridStyle: { screen: { ...half }, print: { ...half }, preset: null },
    preview: { ...DEFAULT_PREVIEW },
    export: {
      scale: 1,
      background: 'solid',
      color: '#ffffff',
      chartCell: 10,
      chartMode: 'symbols',
      pdf: {
        pageSize: 'a4',
        orientation: 'portrait',
        marginMm: 15,
        title: '',
        pages: 'grid',
        stitchesPerPage: 60,
        overlapStitches: 2,
      },
    },
    estimates: { ...DEFAULT_ESTIMATES },
  };
}

describe('an override survives save → load (the item closes on this)', () => {
  it('a granted thread keeps its chosen glyph through the file and the reconcile', () => {
    let state = grantNeeded(initialSymbolState(SYMBOL_IDS), ['dmc:310', 'dmc:817']).state;
    const picked = setOverride(state, 'dmc:310', 'slash');
    expect(picked.ok).toBe(true);
    state = picked.state;
    expect(effectiveSymbols(state).get('dmc:310')).toBe('slash');

    const json = serializeProject(projectWith(state));
    const reloaded = reconcileSymbolState(parseProject(json).symbols, SYMBOL_IDS);
    expect(effectiveSymbols(reloaded).get('dmc:310')).toBe('slash');
    expect(reloaded.overrides).toEqual([{ threadId: 'dmc:310', symbolId: 'slash' }]);
    expect(displayGlyph(reloaded, 'dmc:310', SYMBOL_GLYPHS)?.name).toBe('Slash');
    // The file itself round-trips byte-identically with the override in it.
    expect(serializeProject(parseProject(json))).toBe(json);
  });

  it('a dormant override (no grant yet) still wins at the first grant after reload', () => {
    const state = setOverride(initialSymbolState(SYMBOL_IDS), 'dmc:310', 'chevron-up').state;
    const json = serializeProject(projectWith(state));
    const reloaded = reconcileSymbolState(parseProject(json).symbols, SYMBOL_IDS);
    const granted = grantNeeded(reloaded, ['dmc:817', 'dmc:310']).state;
    expect(effectiveSymbols(granted).get('dmc:310')).toBe('chevron-up');
    expect(effectiveSymbols(granted).get('dmc:817')).toBe(SYMBOL_IDS[0]);
  });
});
