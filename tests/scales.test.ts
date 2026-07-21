/**
 * The four-resolution independence contract (M6-SCALE-01).
 *
 * The invariant worth protecting is not that the updaters work — it is
 * that changing one of pattern / capture / preview / export cannot
 * disturb the other three. That is asserted by *reference identity*,
 * not deep equality: a helper that rebuilt an equal-but-new slice
 * would pass a `toEqual` check and still be the beginning of exactly
 * the coupling this model exists to prevent.
 *
 * The rendered labels are checked here too, because "impossible to
 * confuse" is a claim about the visible words as much as the state.
 */

import { describe, expect, it } from 'vitest';

import {
  captureSummary,
  defaultScales,
  MAX_PATTERN_SIDE,
  MIN_PATTERN_SIDE,
  patternAspect,
  patternSummary,
  previewPercent,
  previewSummary,
  SCALE_LABELS,
  toCssPxPerStitch,
  toDevicePxPerStitch,
  withCapture,
  withExport,
  withPattern,
  withPreview,
  type ScaleModel,
} from '../src/ui/scales.ts';

/** A model where all four slices hold distinctive, non-default values. */
function populated(): ScaleModel {
  return {
    pattern: { widthStitches: 200, heightStitches: 150 },
    capture: { widthPx: 800, heightPx: 600 },
    preview: { mode: 'manual', cssPxPerStitch: 2.5 },
    export: { cleanPxPerStitch: 4, chartCellPx: 12 },
  };
}

type Slice = keyof ScaleModel;
const SLICES: Slice[] = ['pattern', 'capture', 'preview', 'export'];

/** Each mutation, paired with the one slice it is allowed to touch. */
const MUTATIONS: { name: string; slice: Slice; apply: (m: ScaleModel) => ScaleModel }[] = [
  {
    name: 'set pattern resolution',
    slice: 'pattern',
    apply: (m) => withPattern(m, { widthStitches: 64, heightStitches: 64 }),
  },
  {
    name: 'set capture region',
    slice: 'capture',
    apply: (m) => withCapture(m, { widthPx: 1920, heightPx: 1080 }),
  },
  {
    name: 'set preview scale',
    slice: 'preview',
    apply: (m) => withPreview(m, { mode: 'width', cssPxPerStitch: 8 }),
  },
  {
    name: 'set export scale',
    slice: 'export',
    apply: (m) => withExport(m, { cleanPxPerStitch: 16, chartCellPx: 20 }),
  },
];

describe('the four resolutions are independent', () => {
  for (const mutation of MUTATIONS) {
    for (const slice of SLICES) {
      if (slice === mutation.slice) {
        it(`${mutation.name} changes ${slice}`, () => {
          const before = populated();
          const after = mutation.apply(before);
          expect(after[slice]).not.toEqual(before[slice]);
        });
      } else {
        it(`${mutation.name} leaves ${slice} untouched`, () => {
          const before = populated();
          const after = mutation.apply(before);
          // Identity, not equality: the slice must be the same object.
          expect(after[slice]).toBe(before[slice]);
        });
      }
    }
  }

  it('never mutates the model it was given', () => {
    const before = populated();
    const snapshot = structuredClone(before);
    for (const mutation of MUTATIONS) mutation.apply(before);
    expect(before).toEqual(snapshot);
  });

  it('changing the pattern changes the stitch count and nothing else', () => {
    // The one legitimate coupling: a new pattern *is* a new stitch
    // count. It must still choose no capture, preview, or export size.
    const before = populated();
    const after = withPattern(before, { widthStitches: 400, heightStitches: 300 });
    expect(patternSummary(after.pattern)).toBe('400 × 300 stitches');
    expect(after.capture).toBe(before.capture);
    expect(after.preview).toBe(before.preview);
    expect(after.export).toBe(before.export);
  });
});

describe('defaultScales', () => {
  it('starts at a 200 × 200 pattern fitted to the space', () => {
    const model = defaultScales();
    expect(model.pattern).toEqual({ widthStitches: 200, heightStitches: 200 });
    expect(model.preview.mode).toBe('space');
  });

  it('sits inside the pattern bounds', () => {
    const model = defaultScales();
    expect(model.pattern.widthStitches).toBeGreaterThanOrEqual(MIN_PATTERN_SIDE);
    expect(model.pattern.heightStitches).toBeLessThanOrEqual(MAX_PATTERN_SIDE);
  });
});

describe('patternAspect', () => {
  it('is width over height', () => {
    expect(patternAspect({ widthStitches: 200, heightStitches: 100 })).toBe(2);
    expect(patternAspect({ widthStitches: 60, heightStitches: 240 })).toBe(0.25);
  });
});

describe('DPR conversion', () => {
  it('round-trips CSS ↔ device pixels per stitch', () => {
    for (const dpr of [1, 2, 3, 1.5]) {
      expect(toCssPxPerStitch(toDevicePxPerStitch(2.5, dpr), dpr)).toBeCloseTo(2.5, 10);
    }
  });

  it('reports the same percentage at DPR 1 and DPR 2', () => {
    // The user-facing number must mean "twice actual size" on both, or
    // a Retina maintainer and a 1× one cannot compare notes at all.
    const scale = { mode: 'manual' as const, cssPxPerStitch: 2 };
    expect(previewPercent(scale)).toBe(200);
    expect(toDevicePxPerStitch(scale.cssPxPerStitch, 1)).toBe(2);
    expect(toDevicePxPerStitch(scale.cssPxPerStitch, 2)).toBe(4);
  });
});

describe('visible labels keep the four apart', () => {
  it('gives each quantity its own words', () => {
    const labels = [
      SCALE_LABELS.patternWidth,
      SCALE_LABELS.captureRegion,
      SCALE_LABELS.previewScale,
      SCALE_LABELS.exportScale,
      SCALE_LABELS.chartCell,
    ];
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('never labels anything with a bare "scale" or "resolution"', () => {
    for (const label of Object.values(SCALE_LABELS)) {
      expect(label.toLowerCase()).not.toBe('scale');
      expect(label.toLowerCase()).not.toBe('resolution');
      expect(label.endsWith(':')).toBe(false);
    }
  });

  it('names both units in the capture readout', () => {
    const text = captureSummary(populated());
    expect(text).toBe('Capture region 800 × 600 px → 200 × 150 stitches');
  });

  it('reports preview scale as a percentage of 1:1', () => {
    expect(previewSummary({ mode: 'manual', cssPxPerStitch: 2.5 })).toBe('Preview scale 250%');
  });
});
