/**
 * Assignment-model semantics (M9, D160 decisions 3 and 4): grants are
 * persisted state keyed on thread identity; the queue releases to the
 * back; wholesale replacement resets; overrides come from the unused
 * pool with no representable collision; exhaustion reports rather than
 * repeats. Small fake catalogues keep the cases legible — the real
 * 64-glyph list is pinned in symbols-glyphs.test.ts.
 */

import { describe, expect, it } from 'vitest';

import {
  clearOverride,
  effectiveSymbols,
  grantNeeded,
  initialSymbolState,
  reconcileSymbolState,
  setOverride,
  syncPalette,
  type SymbolAssignmentState,
} from '../src/core/symbols/assignment.ts';

const CANON = ['s1', 's2', 's3', 's4', 's5'];

function granted(state: SymbolAssignmentState, threadId: string): string | undefined {
  return effectiveSymbols(state).get(threadId);
}

describe('first need takes the next unused symbol in canonical order', () => {
  it('grants in need order from the queue front, and persists', () => {
    const { state, unassigned } = grantNeeded(initialSymbolState(CANON), ['dmc:310', 'dmc:817']);
    expect(unassigned).toEqual([]);
    expect(granted(state, 'dmc:310')).toBe('s1');
    expect(granted(state, 'dmc:817')).toBe('s2');
    expect(state.queue).toEqual(['s3', 's4', 's5']);
  });

  it('is deterministic: same needs, same state, same grants', () => {
    const a = grantNeeded(initialSymbolState(CANON), ['t1', 't2', 't3']).state;
    const b = grantNeeded(initialSymbolState(CANON), ['t1', 't2', 't3']).state;
    expect(a).toEqual(b);
  });

  it('re-granting an already-assigned thread changes nothing', () => {
    const first = grantNeeded(initialSymbolState(CANON), ['t1']).state;
    const again = grantNeeded(first, ['t1']).state;
    expect(again).toEqual(first);
  });

  it('two threads sharing a display colour still get distinct symbols', () => {
    // Identity is brandId:reference; RGB never reaches this layer
    // (D55/D56) — the duplicate-RGB catalogue case cannot collide here.
    const { state } = grantNeeded(initialSymbolState(CANON), ['dmc:310', 'anchor:403']);
    expect(granted(state, 'dmc:310')).not.toBe(granted(state, 'anchor:403'));
  });
});

describe('palette changes (D160 decision 4)', () => {
  it('a thread present before and after a change keeps its symbol', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1', 't2', 't3']).state;
    const after = syncPalette(start, ['t3', 't1'], CANON);
    expect(granted(after, 't1')).toBe('s1');
    expect(granted(after, 't3')).toBe('s3');
  });

  it('reorder and hide cannot move anything', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1', 't2']).state;
    const reordered = syncPalette(start, ['t2', 't1'], CANON);
    expect(reordered).toEqual(start);
  });

  it('adding an unused thread grants nothing until it needs a symbol', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1']).state;
    const wider = syncPalette(start, ['t1', 't2'], CANON);
    expect(wider).toEqual(start);
    expect(granted(wider, 't2')).toBeUndefined();
  });

  it('a departed thread releases its symbol to the back of the queue', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1', 't2']).state;
    const after = syncPalette(start, ['t2'], CANON);
    expect(after.queue).toEqual(['s3', 's4', 's5', 's1']);
    // The next newcomer gets s3, not the just-released s1.
    const { state: next } = grantNeeded(after, ['t9']);
    expect(granted(next, 't9')).toBe('s3');
  });

  it('a replacement with no survivor resets the queue to canonical', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['dmc:310', 'dmc:817']).state;
    const replaced = syncPalette(start, ['anchor:403', 'anchor:9046'], CANON);
    expect(replaced.assigned).toEqual([]);
    expect(replaced.queue).toEqual(CANON);
    const { state: fresh } = grantNeeded(replaced, ['anchor:403']);
    expect(granted(fresh, 'anchor:403')).toBe('s1');
  });

  it('an empty palette releases without resetting', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1']).state;
    const cleared = syncPalette(start, [], CANON);
    expect(cleared.assigned).toEqual([]);
    expect(cleared.queue).toEqual(['s2', 's3', 's4', 's5', 's1']);
  });
});

describe('exhaustion: more used colours than symbols', () => {
  it('reports the bare threads instead of repeating a symbol', () => {
    const canon = ['s1', 's2'];
    const { state, unassigned } = grantNeeded(initialSymbolState(canon), ['t1', 't2', 't3', 't4']);
    expect(unassigned).toEqual(['t3', 't4']);
    const symbols = [...effectiveSymbols(state).values()];
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe('overrides (D160 decision 3)', () => {
  it('records a preference for an unused symbol and honours it at need', () => {
    const withOverride = setOverride(initialSymbolState(CANON), 't1', 's4');
    expect(withOverride.ok).toBe(true);
    const { state } = grantNeeded(withOverride.state, ['t0', 't1']);
    expect(granted(state, 't0')).toBe('s1');
    expect(granted(state, 't1')).toBe('s4');
    expect(state.queue).toEqual(['s2', 's3', 's5']);
  });

  it('refuses a symbol another thread is wearing — swap is explicit', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1', 't2']).state;
    const result = setOverride(start, 't2', 's1');
    expect(result.ok).toBe(false);
    expect(result.state).toEqual(start);
    expect(result.reason).toContain('in use');
  });

  it('refuses an id this catalogue does not know', () => {
    const result = setOverride(initialSymbolState(CANON), 't1', 'nope');
    expect(result.ok).toBe(false);
  });

  it('re-symbols an assigned thread now, releasing the old to the back', () => {
    const start = grantNeeded(initialSymbolState(CANON), ['t1']).state;
    const result = setOverride(start, 't1', 's3');
    expect(result.ok).toBe(true);
    expect(granted(result.state, 't1')).toBe('s3');
    expect(result.state.queue).toEqual(['s2', 's4', 's5', 's1']);
  });

  it('a dormant override survives its thread departing and returning', () => {
    const prefer = setOverride(initialSymbolState(CANON), 't1', 's2');
    const active = grantNeeded(prefer.state, ['t1']).state;
    const departed = syncPalette(active, ['t9'], CANON);
    expect(departed.overrides).toEqual([{ threadId: 't1', symbolId: 's2' }]);
    // Reset (no survivor) cleared grants; the returning thread wears
    // its override again.
    const returned = grantNeeded(departed, ['t1']).state;
    expect(granted(returned, 't1')).toBe('s2');
  });

  it('falls back to the queue when the preferred symbol is taken', () => {
    const prefer = setOverride(initialSymbolState(CANON), 't2', 's1');
    const taken = grantNeeded(prefer.state, ['t1']).state; // t1 wears s1
    const { state } = grantNeeded(taken, ['t2']);
    expect(granted(state, 't2')).toBe('s2');
    // The preference stays recorded for a day the symbol frees up.
    expect(state.overrides).toEqual([{ threadId: 't2', symbolId: 's1' }]);
  });

  it('clearOverride removes the preference but keeps the grant', () => {
    const prefer = setOverride(initialSymbolState(CANON), 't1', 's2');
    const active = grantNeeded(prefer.state, ['t1']).state;
    const cleared = clearOverride(active, 't1');
    expect(cleared.overrides).toEqual([]);
    expect(granted(cleared, 't1')).toBe('s2');
  });
});

describe('reconcile (loading user data against this build)', () => {
  it('drops grants on unknown symbols so their threads re-grant', () => {
    const state: SymbolAssignmentState = {
      assigned: [
        { threadId: 't1', symbolId: 'future-glyph' },
        { threadId: 't2', symbolId: 's2' },
      ],
      queue: ['s1', 's3'],
      overrides: [],
    };
    const fixed = reconcileSymbolState(state, CANON);
    expect(fixed.assigned).toEqual([{ threadId: 't2', symbolId: 's2' }]);
    expect(fixed.queue).toEqual(['s1', 's3', 's4', 's5']);
  });

  it('appends a new catalogue batch at the back, moving nothing', () => {
    const saved = grantNeeded(initialSymbolState(['s1', 's2']), ['t1']).state;
    const grown = reconcileSymbolState(saved, ['s1', 's2', 's3']);
    expect(granted(grown, 't1')).toBe('s1');
    expect(grown.queue).toEqual(['s2', 's3']);
  });

  it('dedupes hand-edited duplicates, first wins', () => {
    const state: SymbolAssignmentState = {
      assigned: [
        { threadId: 't1', symbolId: 's1' },
        { threadId: 't1', symbolId: 's2' },
        { threadId: 't2', symbolId: 's1' },
      ],
      queue: ['s1', 's2', 's2', 's3'],
      overrides: [
        { threadId: 't3', symbolId: 's4' },
        { threadId: 't3', symbolId: 's5' },
      ],
    };
    const fixed = reconcileSymbolState(state, CANON);
    expect(fixed.assigned).toEqual([{ threadId: 't1', symbolId: 's1' }]);
    expect(fixed.queue).toEqual(['s2', 's3', 's4', 's5']);
    expect(fixed.overrides).toEqual([{ threadId: 't3', symbolId: 's4' }]);
  });

  it('keeps a dormant override for a glyph a newer build knew', () => {
    const state: SymbolAssignmentState = {
      assigned: [],
      queue: [],
      overrides: [{ threadId: 't1', symbolId: 'batch5-glyph' }],
    };
    const fixed = reconcileSymbolState(state, CANON);
    expect(fixed.overrides).toEqual([{ threadId: 't1', symbolId: 'batch5-glyph' }]);
    // Dormant means dormant: it is never in the queue, so a grant
    // pass serves canonical order instead.
    const { state: after } = grantNeeded(fixed, ['t1']);
    expect(granted(after, 't1')).toBe('s1');
  });
});
