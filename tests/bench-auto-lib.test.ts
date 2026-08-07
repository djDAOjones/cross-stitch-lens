/**
 * Quiet-run launcher logic (M13-MEAS-03): the idle gate must read
 * macOS ioreg truthfully, artefact naming must keep canonical names
 * valid-only, and the retry decision must never re-run a structural
 * failure.
 */

import { describe, expect, it } from 'vitest';

import {
  formatStamp,
  isEnvironmentalFailure,
  parseIdleSeconds,
  reportPaths,
} from '../scripts/bench-auto-lib.mjs';

describe('parseIdleSeconds', () => {
  it('parses the ioreg HIDIdleTime line (nanoseconds → whole seconds)', () => {
    expect(parseIdleSeconds('    | | |   "HIDIdleTime" = 395449166')).toBe(0);
    expect(parseIdleSeconds('"HIDIdleTime" = 61000000000')).toBe(61);
  });

  it('returns null when the field is absent — callers must not read that as idle', () => {
    expect(parseIdleSeconds('no such field here')).toBeNull();
    expect(parseIdleSeconds('')).toBeNull();
  });
});

describe('formatStamp', () => {
  it('is a compact sortable local timestamp', () => {
    expect(formatStamp(new Date(2026, 7, 8, 1, 2, 3))).toBe('20260808-010203');
  });
});

describe('reportPaths', () => {
  it('stamps the evidence file and keeps the canonical name buildId-safe', () => {
    const paths = reportPaths('v0.5.0+20260807.f36fd9b', 'capture', '20260808-010203');
    expect(paths.stamped).toBe(
      'browser-bench-v0.5.0_20260807.f36fd9b-capture.20260808-010203.json',
    );
    expect(paths.canonical).toBe('browser-bench-v0.5.0_20260807.f36fd9b-capture.json');
  });
});

describe('isEnvironmentalFailure (retry gate)', () => {
  it('retries only wholly environmental failures (happy path)', () => {
    expect(
      isEnvironmentalFailure([
        'capture: the page was not visible (env visibility: hidden) — samples…',
        'capture: live window 200²: row … — the shared surface presented no frames…',
        'capture: edit class hands-off: row … — auto-capture precondition failed…',
      ]),
    ).toBe(true);
  });

  it('never retries a structural failure, alone or mixed in (error)', () => {
    const conservation =
      'capture: report is tainted: counter conservation: submitted (408) ≠ results (407)…';
    expect(isEnvironmentalFailure([conservation])).toBe(false);
    expect(
      isEnvironmentalFailure([
        'capture: the page was not visible (env visibility: hidden)',
        conservation,
      ]),
    ).toBe(false);
    expect(
      isEnvironmentalFailure([
        'mem: no forced-GC heap reading — Chrome was not launched with --js-flags=--expose-gc',
      ]),
    ).toBe(false);
  });

  it('an empty failure list is success, not a retry (boundary)', () => {
    expect(isEnvironmentalFailure([])).toBe(false);
  });
});
