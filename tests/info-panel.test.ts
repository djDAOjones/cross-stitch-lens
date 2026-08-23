/**
 * Info-panel row model (the pure half of src/ui/info-panel.ts): the
 * row cap with its overflow aggregate, thread-vs-hex labelling, and
 * percent formatting. DOM rendering is verified in the running app.
 */

import { describe, expect, it } from 'vitest';

import type { ColorUsage } from '../src/core/stats.ts';
import { thread } from './helpers/threads.ts';
import { buildRows, formatPercent, ROW_CAP } from '../src/ui/info-panel.ts';

function usage(overrides: Partial<ColorUsage> = {}): ColorUsage {
  return {
    rgb: [0, 0, 0],
    hex: '#000000',
    count: 10,
    percent: 10,
    ...overrides,
  };
}

describe('formatPercent', () => {
  it('formats zero, tiny, fractional and whole shares', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.05)).toBe('<0.1%');
    expect(formatPercent(12.34)).toBe('12.3%');
    expect(formatPercent(25)).toBe('25%');
    expect(formatPercent(100)).toBe('100%');
  });
});

describe('buildRows', () => {
  const BRANDS = new Map([['dmc', 'DMC']]);

  it('labels referenced colours by brand, reference and name', () => {
    const { rows } = buildRows(
      [
        usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) }),
        usage({ hex: '#123456' }),
      ],
      { brandNames: BRANDS },
    );
    // Hex rides in the visible label from M14-IMPL-02 (audit A14):
    // tooltips are hover-only, so the value must be in row text.
    expect(rows[0]?.label).toBe('DMC 310 Black · #000000');
    expect(rows[1]?.label).toBe('#123456');
  });

  it('falls back to the raw brand id when no display names are given', () => {
    const { rows } = buildRows([
      usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) }),
    ]);
    expect(rows[0]?.label).toBe('dmc 310 Black · #000000');
  });

  it('flags a mapped colour in the tooltip', () => {
    const { rows } = buildRows(
      [
        usage({
          thread: thread('403', 'Black', [0, 0, 0], {
            brandId: 'anchor',
            provenance: 'mapped',
          }),
        }),
      ],
      { brandNames: new Map([['anchor', 'Anchor']]) },
    );
    expect(rows[0]?.title).toContain('colour mapped from its DMC equivalent');
    expect(rows[0]?.title).not.toContain('measured');
  });

  it('always carries the hex in the tooltip', () => {
    const { rows } = buildRows([usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) })]);
    expect(rows[0]?.title).toBe('#000000 · Black');
  });

  it('labels a swap target "swapped from X" as visible text and in the tooltip (ICE-RECOLOUR-01)', () => {
    const target = thread('817', 'Coral red', [255, 0, 0], { brandId: 'dmc' });
    const { rows } = buildRows(
      [
        usage({ thread: target, hex: target.hex, rgb: target.rgb }),
        usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) }),
      ],
      {
        brandNames: BRANDS,
        swappedFrom: (id) => (id === target.id ? ['DMC 310 Black', 'DMC 311 Navy'] : []),
      },
    );
    expect(rows[0]?.note).toBe('swapped from DMC 310 Black, DMC 311 Navy');
    expect(rows[0]?.title).toContain('swapped from DMC 310 Black, DMC 311 Navy');
    // The label itself is unchanged: the verbs' accessible names split on it.
    expect(rows[0]?.label).toBe('DMC 817 Coral red · #ff0000');
    expect(rows[1]?.note).toBeUndefined();
    expect(rows[1]?.title).toBe('#000000 · Black');
  });

  it('an unidentified row never carries a note, whatever the host answers', () => {
    const { rows } = buildRows([usage({ hex: '#123456' })], { swappedFrom: () => ['X'] });
    expect(rows[0]?.note).toBeUndefined();
  });

  it('returns no overflow when everything fits the cap', () => {
    const { rows, overflow } = buildRows([usage(), usage({ hex: '#111111' })]);
    expect(rows).toHaveLength(2);
    expect(overflow).toBeNull();
  });

  it('caps rows and aggregates the remainder', () => {
    const many = Array.from({ length: ROW_CAP + 4 }, (_, i) =>
      usage({ hex: `#${String(i).padStart(6, '0')}`, count: 5 }),
    );
    const { rows, overflow } = buildRows(many);
    expect(rows).toHaveLength(ROW_CAP);
    expect(overflow).toEqual({ colors: 4, count: 20 });
  });

  it('handles an empty design', () => {
    expect(buildRows([])).toEqual({ rows: [], overflow: null });
  });
});

// `summaryText` and `usageSummaryLabel` retired at M14-EXT-21/22: the
// headline numbers live in the Stats section, and a collapsed fold is
// its bare heading — no stat rides a fold line anywhere.
