/**
 * Post-deploy verification (PUB-05): the script's judgement must be
 * right with the network off. The static index carries no build id
 * (the id is a Vite `define`), so the verifier reads it out of the
 * page's entry asset — the entry lookup, the id parse and the prefix
 * SHA comparison are the invariants: a wrong one would green a stale
 * deploy or redden a good one.
 */

import { describe, expect, it } from 'vitest';

import {
  compareBuild,
  DEFAULT_TARGET,
  DEFAULT_URL,
  findBuildIds,
  findEntryScript,
  isSha,
  parseArgs,
  shaMatches,
  splitBuildId,
  verdictLine,
} from '../scripts/verify-deploy.mjs';

const PAGE = 'https://djdaojones.github.io/pattern-mapper/?verify=1';
const LIVE_ID = 'v0.5.0+20260823.72d9db7';
const FULL_SHA = '72d9db7b2d50fd451a388a057f232576a57cef87';

/** The live index as Pages serves it: one module entry, preloads as links. */
const LIVE_INDEX = [
  '<!doctype html><html lang="en"><head><title>Pattern Mapper</title>',
  '<script type="module" crossorigin src="/pattern-mapper/assets/main-BbE3b8AQ.js"></script>',
  '<link rel="modulepreload" crossorigin href="/pattern-mapper/assets/clock-BqrfpCQD.js">',
  '</head><body><main id="app"></main></body></html>',
].join('\n');

describe('findEntryScript', () => {
  it('resolves the module entry against the page URL (happy path)', () => {
    expect(findEntryScript(LIVE_INDEX, PAGE)).toBe(
      'https://djdaojones.github.io/pattern-mapper/assets/main-BbE3b8AQ.js',
    );
  });

  it('accepts either attribute order and a relative src (boundary)', () => {
    expect(
      findEntryScript(
        '<script src="./assets/main-x.js" type="module"></script>',
        'http://localhost:4173/pattern-mapper/',
      ),
    ).toBe('http://localhost:4173/pattern-mapper/assets/main-x.js');
  });

  it('ignores classic and inline scripts; no entry is null, never a guess (empty)', () => {
    const page =
      '<script src="/legacy.js"></script><script type="module">boot()</script>';
    expect(findEntryScript(page, PAGE)).toBeNull();
    expect(findEntryScript('', PAGE)).toBeNull();
  });
});

describe('findBuildIds / splitBuildId', () => {
  it('finds one id however many times the minifier inlined it (happy path)', () => {
    const bundle =
      'log.info("boot","Pattern Mapper "+"v0.5.0"+" ("+"v0.5.0+20260823.72d9db7"+")");' +
      'a.download="browser-bench-"+"v0.5.0+20260823.72d9db7".replaceAll("+","_")+".json";';
    expect(findBuildIds(bundle)).toEqual([LIVE_ID]);
    expect(splitBuildId(LIVE_ID)).toEqual({ version: '0.5.0', date: '20260823', sha: '72d9db7' });
  });

  it('returns two different ids as two — the caller must refuse, not pick (boundary)', () => {
    expect(findBuildIds('"v0.5.0+20260823.72d9db7" … "v0.5.1+20260824.597154e"')).toEqual([
      'v0.5.0+20260823.72d9db7',
      'v0.5.1+20260824.597154e',
    ]);
  });

  it('matches nothing in a bundle without an id; nogit and a bare version are not ids (empty/error)', () => {
    expect(findBuildIds('const appVersion = "v0.5.0";')).toEqual([]);
    expect(findBuildIds('"v0.5.0+20260823.nogit"')).toEqual([]);
    expect(splitBuildId('v0.5.0')).toBeNull();
    expect(splitBuildId('v0.5.0+20260823.nogit')).toBeNull();
  });
});

describe('shaMatches', () => {
  it('matches a short SHA against the full one in either direction, any case (happy path)', () => {
    expect(shaMatches(FULL_SHA, '72d9db7')).toBe(true);
    expect(shaMatches('72d9db7', FULL_SHA)).toBe(true);
    expect(shaMatches('72D9DB7', '72d9db7b')).toBe(true);
  });

  it('rejects a different commit even when it shares a prefix (error)', () => {
    expect(shaMatches('72d9db7', '72d9db8')).toBe(false);
    expect(shaMatches('597154e', '72d9db7')).toBe(false);
  });

  it('refuses anything under 7 hex digits or not hex at all — too ambiguous to name a commit (boundary)', () => {
    expect(isSha('72d9db')).toBe(false);
    expect(isSha('72d9db7')).toBe(true);
    expect(shaMatches('72d9db', '72d9db7')).toBe(false);
    expect(shaMatches('origin/main', '72d9db7')).toBe(false);
  });
});

describe('compareBuild + verdictLine', () => {
  it('PASS and FAIL lines carry both ids (happy path)', () => {
    const pass = compareBuild(LIVE_ID, FULL_SHA, 'origin/main@72d9db7');
    expect(pass.status).toBe('PASS');
    expect(verdictLine(pass)).toBe(
      'verify-deploy: PASS — live v0.5.0+20260823.72d9db7 · expected origin/main@72d9db7',
    );
    const fail = compareBuild(LIVE_ID, '597154e', '597154e');
    expect(fail.status).toBe('FAIL');
    expect(verdictLine(fail)).toBe(
      'verify-deploy: FAIL — live v0.5.0+20260823.72d9db7 · expected 597154e',
    );
  });

  it('a malformed live id is an ERROR, never a FAIL (error)', () => {
    const out = compareBuild('v0.5.0+20260823.nogit', '72d9db7', '72d9db7');
    expect(out.status).toBe('ERROR');
    expect(verdictLine(out)).toMatch(/^verify-deploy: ERROR — malformed live build id/);
  });
});

describe('parseArgs', () => {
  it('defaults to the Pages site and origin/main with no wait (happy path)', () => {
    expect(parseArgs([])).toEqual({
      url: DEFAULT_URL,
      wait: 0,
      target: DEFAULT_TARGET,
      help: false,
    });
    expect(DEFAULT_URL.endsWith('/')).toBe(true);
  });

  it('takes a target, --url and --wait in either spelling, and adds the site slash (boundary)', () => {
    expect(parseArgs(['--wait', '600', '72d9db7'])).toMatchObject({ wait: 600, target: '72d9db7' });
    expect(
      parseArgs(['--url=http://localhost:4173/pattern-mapper', '--wait=30', 'HEAD']),
    ).toMatchObject({ url: 'http://localhost:4173/pattern-mapper/', wait: 30, target: 'HEAD' });
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects an unknown option, a missing value, a non-numeric wait and a second target (error)', () => {
    expect(() => parseArgs(['--sha', 'x'])).toThrow(/unknown option --sha/);
    expect(() => parseArgs(['--wait'])).toThrow(/--wait needs a value/);
    expect(() => parseArgs(['--wait', 'soon'])).toThrow(/number of seconds/);
    expect(() => parseArgs(['--wait', '-5'])).toThrow(/number of seconds/);
    expect(() => parseArgs(['abc1234', 'def5678'])).toThrow(/only one target/);
  });
});
