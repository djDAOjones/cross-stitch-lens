/**
 * Retention-verdict invariants (M13-MEAS-03): the forced-GC reading
 * must change the published verdict exactly as the D71 question is
 * framed — a residue that drops was lazy GC, one that survives is
 * real, and no forced reading leaves the snapshot-pair advice intact.
 */

import { describe, expect, it } from 'vitest';

import { RETENTION_PLATEAU_MIB, retentionVerdict } from '../src/bench/memory.ts';

describe('retentionVerdict', () => {
  it('idle growth under the plateau threshold is a plateau, forced GC or not', () => {
    expect(retentionVerdict(100, 100 + RETENTION_PLATEAU_MIB - 1, null)).toBe(
      'plateau after natural GC',
    );
    expect(retentionVerdict(100, 110, 95)).toBe('plateau after natural GC');
  });

  it('idle residue with no forced reading still asks for the snapshot pair', () => {
    expect(retentionVerdict(100, 175, null)).toContain('snapshot pair');
    expect(retentionVerdict(100, 175, null)).toContain('RETAINED');
  });

  it('a residue the forced GC reclaims is lazy major GC, labelled diagnostic', () => {
    const verdict = retentionVerdict(100, 175, 105);
    expect(verdict).toContain('lazy major GC');
    expect(verdict).toContain('not production pause behaviour');
  });

  it('a residue that survives forced GC is real retention', () => {
    const verdict = retentionVerdict(100, 175, 170);
    expect(verdict).toContain('REAL retention');
    expect(verdict).toContain('snapshot pair');
  });

  it('boundary: exactly the threshold reads as retention, just under as plateau', () => {
    expect(retentionVerdict(0, RETENTION_PLATEAU_MIB, null)).toContain('RETAINED');
    expect(retentionVerdict(0, RETENTION_PLATEAU_MIB, RETENTION_PLATEAU_MIB - 0.1)).toContain(
      'lazy major GC',
    );
  });
});
