/**
 * Draft-quality governor — pure hysteresis over frame times. The
 * badge/status wiring is verified in the running app.
 */

import { describe, expect, it } from 'vitest';
import {
  DraftGovernor,
  DRAFT_ENTER_COUNT,
  DRAFT_ENTER_MS,
  DRAFT_EXIT_COUNT,
  DRAFT_EXIT_MS,
} from '../src/capture/draft.ts';

const SLOW = DRAFT_ENTER_MS + 50;
const FAST = DRAFT_EXIT_MS - 50;

function feed(governor: DraftGovernor, ms: number, times: number): boolean {
  let mode = governor.isDraft;
  for (let i = 0; i < times; i++) mode = governor.sample(ms);
  return mode;
}

describe('DraftGovernor', () => {
  it('stays full quality under light load', () => {
    const governor = new DraftGovernor();
    expect(feed(governor, FAST, 20)).toBe(false);
  });

  it('enters draft only after consecutive slow frames', () => {
    const governor = new DraftGovernor();
    expect(feed(governor, SLOW, DRAFT_ENTER_COUNT - 1)).toBe(false);
    expect(governor.sample(SLOW)).toBe(true);
  });

  it('one fast frame resets the slow run', () => {
    const governor = new DraftGovernor();
    feed(governor, SLOW, DRAFT_ENTER_COUNT - 1);
    governor.sample(FAST);
    expect(feed(governor, SLOW, DRAFT_ENTER_COUNT - 1)).toBe(false);
  });

  it('exits draft only after a sustained fast run', () => {
    const governor = new DraftGovernor();
    feed(governor, SLOW, DRAFT_ENTER_COUNT);
    expect(feed(governor, FAST, DRAFT_EXIT_COUNT - 1)).toBe(true);
    expect(governor.sample(FAST)).toBe(false);
  });

  it('middling frames keep the current mode (hysteresis gap)', () => {
    const between = (DRAFT_ENTER_MS + DRAFT_EXIT_MS) / 2;
    const full = new DraftGovernor();
    expect(feed(full, between, 20)).toBe(false);
    const draft = new DraftGovernor();
    feed(draft, SLOW, DRAFT_ENTER_COUNT);
    expect(feed(draft, between, 20)).toBe(true);
  });

  it('reset restores full quality and clears history', () => {
    const governor = new DraftGovernor();
    feed(governor, SLOW, DRAFT_ENTER_COUNT);
    governor.reset();
    expect(governor.isDraft).toBe(false);
    expect(feed(governor, SLOW, DRAFT_ENTER_COUNT - 1)).toBe(false);
  });

  it('honours custom thresholds', () => {
    const governor = new DraftGovernor(10, 5, 1, 1);
    expect(governor.sample(11)).toBe(true);
    expect(governor.sample(4)).toBe(false);
  });
});
