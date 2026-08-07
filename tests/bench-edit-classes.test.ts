/**
 * Edit-class geometry invariants (M13-MEAS-03). The controlled source
 * draws these ops in a browser; the geometry that decides what each
 * commanded change looks like is pure and always checked in the gate.
 */

import { describe, expect, it } from 'vitest';

import {
  driveIntervalMs,
  EDIT_CLASSES,
  editOpsFor,
  seededRandom,
} from '../src/bench/edit-classes.ts';

const W = 720;
const H = 560;

describe('determinism (explicit seeds)', () => {
  it('the same seq always yields identical ops for every class', () => {
    for (const editClass of EDIT_CLASSES) {
      for (const seq of [1, 7, 1_000_042]) {
        expect(editOpsFor(editClass, seq, W, H)).toEqual(editOpsFor(editClass, seq, W, H));
      }
    }
  });

  it('consecutive seqs differ — a commanded change is never a no-op paint', () => {
    for (const editClass of EDIT_CLASSES) {
      expect(editOpsFor(editClass, 3, W, H)).not.toEqual(editOpsFor(editClass, 4, W, H));
    }
  });

  it('seededRandom streams are reproducible and in [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('every class paints something at a real cadence', () => {
  it('each class yields at least one op and a positive drive interval', () => {
    for (const editClass of EDIT_CLASSES) {
      const ops = editOpsFor(editClass, 5, W, H);
      expect(ops.rects.length + ops.segments.length).toBeGreaterThan(0);
      expect(driveIntervalMs(editClass)).toBeGreaterThan(0);
    }
  });
});

describe('bounds (boundary category)', () => {
  it('accumulating marks stay on the surface', () => {
    for (const editClass of ['pixel-marks', 'rapid-scatter', 'hands-off'] as const) {
      for (let seq = 1; seq <= 50; seq++) {
        for (const rect of editOpsFor(editClass, seq, W, H).rects) {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.w).toBeLessThanOrEqual(W);
          expect(rect.y + rect.h).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('the slow stroke is continuous — segment n ends where n+1 starts', () => {
    for (let seq = 1; seq <= 30; seq++) {
      const current = editOpsFor('slow-stroke', seq, W, H).segments[0];
      const next = editOpsFor('slow-stroke', seq + 1, W, H).segments[0];
      if (current === undefined || next === undefined) throw new Error('stroke op missing');
      expect(next.x1).toBeCloseTo(current.x2, 6);
      expect(next.y1).toBeCloseTo(current.y2, 6);
    }
  });

  it('only whole-surface classes clear; accumulating classes never do', () => {
    expect(editOpsFor('transform', 2, W, H).clear).toBe(true);
    for (const editClass of ['pixel-marks', 'slow-stroke', 'rapid-scatter', 'hands-off'] as const) {
      expect(editOpsFor(editClass, 2, W, H).clear).toBe(false);
    }
  });
});
