/**
 * Info-panel row model (the pure half of src/ui/info-panel.ts): the
 * row cap with its overflow aggregate, thread-vs-hex labelling, and
 * percent formatting. DOM rendering is verified in the running app.
 */

import { describe, expect, it } from 'vitest';

import type { ColorUsage, DesignStats } from '../src/core/stats.ts';
import { thread } from './helpers/threads.ts';
import {
  buildRows,
  formatPercent,
  ROW_CAP,
  summaryText,
  usageSummaryLabel,
} from '../src/ui/info-panel.ts';

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
    expect(rows[0]?.title).toContain('colour mapped, not measured');
  });

  it('always carries the hex in the tooltip', () => {
    const { rows } = buildRows([usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) })]);
    expect(rows[0]?.title).toBe('#000000 · Black');
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

describe('summaryText', () => {
  it('reads dimensions, stitch/empty split and colour count', () => {
    const stats: DesignStats = {
      width: 200,
      height: 150,
      totalCells: 30000,
      stitchCount: 25500,
      emptyCount: 4500,
      colorCount: 42,
      perColor: [],
      identified: false,
    };
    expect(summaryText(stats)).toBe(
      '200 × 150 · 25,500 stitches (4,500 empty) · 42 colours',
    );
  });

  it('uses singular forms for one stitch or one colour', () => {
    const stats: DesignStats = {
      width: 1,
      height: 1,
      totalCells: 1,
      stitchCount: 1,
      emptyCount: 0,
      colorCount: 1,
      perColor: [],
      identified: false,
    };
    expect(summaryText(stats)).toBe('1 × 1 · 1 stitch (0 empty) · 1 colour');
  });
});

describe('usageSummaryLabel (M14-EXT-14)', () => {
  const BRANDS = new Map([['dmc', 'DMC']]);
  const base: DesignStats = {
    width: 10,
    height: 10,
    totalCells: 100,
    stitchCount: 100,
    emptyCount: 0,
    colorCount: 8,
    perColor: [],
    identified: true,
  };

  it('carries count and the leading thread while collapsed', () => {
    const stats: DesignStats = {
      ...base,
      perColor: [usage({ thread: thread('310', 'Black', [0, 0, 0], { brandId: 'dmc' }) })],
    };
    expect(usageSummaryLabel(stats, BRANDS)).toBe('Colours by usage — 8 · DMC 310 leads');
  });

  it('falls back to the hex when the leader is unidentified', () => {
    const stats: DesignStats = { ...base, perColor: [usage({ hex: '#123456' })] };
    expect(usageSummaryLabel(stats, BRANDS)).toBe('Colours by usage — 8 · #123456 leads');
  });

  it('stays the plain name with no usage at all', () => {
    expect(usageSummaryLabel(base, BRANDS)).toBe('Colours by usage');
  });
});
