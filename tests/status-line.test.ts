/**
 * The compact status line (M6-FOCUS-01). In preview focus this is the
 * only thing telling the user whether live capture is still running,
 * so the invariants are: every state has words (never colour alone),
 * the four capture states are distinguishable, and no field can go
 * missing when it is the one that matters.
 */

import { describe, expect, it } from 'vitest';

import {
  statusLine,
  type CaptureState,
  type SourceFreshness,
  type StatusSnapshot,
} from '../src/ui/status-line.ts';

function snapshot(overrides: Partial<StatusSnapshot> = {}): StatusSnapshot {
  return {
    pattern: { widthStitches: 200, heightStitches: 150 },
    paletteName: 'DMC',
    colorCount: 24,
    capture: 'live',
    freshness: 'changing',
    draft: false,
    ...overrides,
  };
}

const CAPTURE_STATES: CaptureState[] = ['off', 'live', 'paused', 'ended'];
const FRESHNESS: SourceFreshness[] = ['changing', 'unchanged', 'refresh-pending'];

describe('statusLine', () => {
  it('reports pattern, palette, colours, and capture state', () => {
    expect(statusLine(snapshot())).toBe(
      '200 × 150 stitches · DMC · 24 colours · Capture live · Source changing',
    );
  });

  it('names full-RGB mode rather than leaving a gap', () => {
    expect(statusLine(snapshot({ paletteName: null }))).toContain('Full RGB');
  });

  it('omits the colour count before anything has processed', () => {
    const text = statusLine(snapshot({ colorCount: null }));
    expect(text).not.toContain('colours');
    expect(text).toContain('200 × 150 stitches');
  });

  it('says "1 colour", not "1 colours"', () => {
    expect(statusLine(snapshot({ colorCount: 1 }))).toContain('1 colour ·');
  });

  it('distinguishes all four capture states in words', () => {
    const texts = CAPTURE_STATES.map((capture) => statusLine(snapshot({ capture })));
    expect(new Set(texts).size).toBe(CAPTURE_STATES.length);
    for (const text of texts) expect(text.length).toBeGreaterThan(0);
  });

  it('reports freshness only while a session is live', () => {
    // A freshness left over from a stopped session is worse than none.
    for (const freshness of FRESHNESS) {
      const live = statusLine(snapshot({ capture: 'live', freshness }));
      const paused = statusLine(snapshot({ capture: 'paused', freshness }));
      // The live line carries one field the paused line does not.
      expect(live.split(' · ')).toHaveLength(paused.split(' · ').length + 1);
      for (const capture of ['off', 'paused', 'ended'] as const) {
        const text = statusLine(snapshot({ capture, freshness }));
        expect(text).not.toContain('Source');
        expect(text).not.toContain('Refresh pending');
      }
    }
  });

  it('distinguishes all three freshness states in words', () => {
    const texts = FRESHNESS.map((freshness) => statusLine(snapshot({ freshness })));
    expect(new Set(texts).size).toBe(FRESHNESS.length);
  });

  it('labels draft quality, and only when it is on', () => {
    expect(statusLine(snapshot({ draft: true }))).toContain('Draft quality');
    expect(statusLine(snapshot({ draft: false }))).not.toContain('Draft');
  });

  it('keeps a fixed field order so a field is findable by position', () => {
    const text = statusLine(snapshot({ draft: true }));
    const fields = text.split(' · ');
    expect(fields[0]).toContain('stitches');
    expect(fields[1]).toBe('DMC');
    expect(fields[2]).toBe('24 colours');
    expect(fields[3]).toBe('Capture live');
    expect(fields.at(-1)).toBe('Draft quality');
  });

  it('never emits an empty line, whatever the state', () => {
    for (const capture of CAPTURE_STATES) {
      for (const freshness of FRESHNESS) {
        for (const draft of [false, true]) {
          for (const colorCount of [null, 0, 1, 64]) {
            const text = statusLine(snapshot({ capture, freshness, draft, colorCount }));
            expect(text.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
