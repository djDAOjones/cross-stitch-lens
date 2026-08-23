#!/usr/bin/env node
// @ts-check
/* global fetch, AbortSignal */

/**
 * verify-deploy.mjs — post-deploy verification as one command (PUB-05).
 *
 *   npm run verify:deploy                    # live site vs origin/main
 *   npm run verify:deploy -- --wait 600      # poll until it matches (≤ 10 min)
 *   npm run verify:deploy -- 72d9db7         # vs a SHA you name
 *   npm run verify:deploy -- --url http://localhost:4173/pattern-mapper/ HEAD
 *   npm run verify:deploy -- --fetch            # refresh origin/main first
 *
 * Answers "does the live site serve the commit I just pushed?" with one
 * line on stdout and an exit code: 0 PASS, 1 FAIL (a different build is
 * live), 2 ERROR (could not tell). The build id
 * (`v<version>+YYYYMMDD.<shortsha>`, vite.config.ts → buildId) is a Vite
 * `define`, so the static index.html does not carry it: the page is
 * fetched (cache-busted — GitHub Pages serves it with max-age=600 behind
 * a CDN), its `<script type="module">` entry is resolved and fetched,
 * and the id is read from that asset. The asset's name is content-
 * hashed, so it can never be a stale copy. SHAs compare by prefix
 * because `git rev-parse --short` auto-abbreviates and can grow.
 *
 * `origin/main` is resolved locally: after a push from this machine it
 * is already current, but in a worktree or on another machine it names
 * whatever was last fetched, so `--fetch` runs `git fetch origin` first
 * (INFRA-02) — the alternative being a manual fetch or an explicit SHA.
 *
 * Zero dependencies (Node ≥ 22: global fetch). The pure helpers are
 * exported and unit-tested with the network off
 * (tests/verify-deploy.test.ts); `main` runs only when this file is the
 * process entry, so importing it performs no I/O.
 */

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';

/** The public site (D172). `--url` overrides it, e.g. for a local `vite preview --base /pattern-mapper/`. */
export const DEFAULT_URL = 'https://djdaojones.github.io/pattern-mapper/';

/**
 * What "the commit just pushed" means by default. Resolved locally
 * without a fetch: after `git push` from this machine the ref is
 * already current; from elsewhere pass the SHA, fetch first, or pass
 * `--fetch`.
 */
export const DEFAULT_TARGET = 'origin/main';

/** Seconds between attempts under `--wait` — a Pages deploy takes ~4 min end to end. */
export const POLL_SECONDS = 15;

/** Process exit code per verdict. */
export const EXIT_CODES = { PASS: 0, FAIL: 1, ERROR: 2 };

const FETCH_TIMEOUT_MS = 20_000;

/** `v<semver>+YYYYMMDD.<sha>` as it sits inside a bundle — the shape vite.config.ts injects. */
const BUILD_ID_RE = /\bv\d+\.\d+\.\d+\+\d{8}\.[0-9a-f]{7,40}\b/g;

/** The same shape, anchored, with its parts captured. */
const BUILD_ID_PARTS_RE = /^v(\d+\.\d+\.\d+)\+(\d{8})\.([0-9a-f]{7,40})$/;

/** The "nogit" fallback: a build made outside a git checkout, which nothing can verify. */
const NOGIT_ID_RE = /\bv\d+\.\d+\.\d+\+\d{8}\.nogit\b/;

/**
 * The page's module entry — the first `<script type="module" src>` —
 * resolved against the page URL, or null when there is none (a dev
 * server's index names /src/main.ts; a Pages 404 page has no module
 * script at all).
 * @param {string} html the fetched page
 * @param {string} pageUrl the URL the page was served from (after redirects)
 * @returns {string|null} absolute URL of the entry asset
 */
export function findEntryScript(html, pageUrl) {
  for (const tag of String(html).matchAll(/<script\b[^>]*>/gi)) {
    if (!/\btype\s*=\s*["']module["']/i.test(tag[0])) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag[0]);
    if (src === null) continue;
    return new URL(src[1], pageUrl).href;
  }
  return null;
}

/**
 * Every distinct build id in a bundle, in order of appearance. The
 * minifier inlines the `define` wherever it is used (four copies in
 * main-*.js today), so duplicates collapse; two *different* ids would
 * mean a mixed bundle and are returned as such for the caller to refuse.
 * @param {string} text the asset's source
 * @returns {string[]}
 */
export function findBuildIds(text) {
  /** @type {string[]} */
  const ids = [];
  for (const match of String(text).matchAll(BUILD_ID_RE)) {
    if (!ids.includes(match[0])) ids.push(match[0]);
  }
  return ids;
}

/**
 * The three parts of a build id, or null when the text is not one
 * (including the `nogit` fallback, which has no SHA to compare).
 * @param {string} id
 * @returns {{ version: string, date: string, sha: string } | null}
 */
export function splitBuildId(id) {
  const match = BUILD_ID_PARTS_RE.exec(String(id).trim());
  if (match === null) return null;
  return { version: match[1], date: match[2], sha: match[3] };
}

/**
 * A git object name as people type them: 7–40 hex digits. Anything
 * shorter is too ambiguous to name a commit.
 * @param {string} text
 * @returns {boolean}
 */
export function isSha(text) {
  return /^[0-9a-f]{7,40}$/i.test(String(text).trim());
}

/**
 * True when two SHAs name the same commit: the shorter is a prefix of
 * the longer. Equality would start failing for no reason the day
 * `git rev-parse --short` grows past seven digits.
 * @param {string} expected
 * @param {string} live
 * @returns {boolean}
 */
export function shaMatches(expected, live) {
  const a = String(expected).trim().toLowerCase();
  const b = String(live).trim().toLowerCase();
  if (!isSha(a) || !isSha(b)) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * @typedef {{ status: 'PASS' | 'FAIL', liveId: string, expected: string }
 *   | { status: 'ERROR', reason: string }} Outcome
 */

/**
 * The verdict for one live id against the expected commit. Both ids
 * travel in the outcome so a FAIL line needs no second look.
 * @param {string} liveId the build id read from the live bundle
 * @param {string} expectedSha the commit the site should serve
 * @param {string} expectedLabel how the user named it (`origin/main@72d9db7`, or the SHA they passed)
 * @returns {Outcome}
 */
export function compareBuild(liveId, expectedSha, expectedLabel) {
  const parts = splitBuildId(liveId);
  if (parts === null) return { status: 'ERROR', reason: `malformed live build id "${liveId}"` };
  return {
    status: shaMatches(expectedSha, parts.sha) ? 'PASS' : 'FAIL',
    liveId,
    expected: expectedLabel,
  };
}

/**
 * The one stdout line.
 * @param {Outcome} outcome
 * @returns {string}
 */
export function verdictLine(outcome) {
  if (outcome.status === 'ERROR') return `verify-deploy: ERROR — ${outcome.reason}`;
  return `verify-deploy: ${outcome.status} — live ${outcome.liveId} · expected ${outcome.expected}`;
}

/**
 * `[--url <site>] [--wait <seconds>] [--fetch] [<sha>|<git-ref>]`, with
 * `--option=value` accepted too. A mistake throws (a usage error, exit
 * 2) rather than falling back to a default that would verify the
 * wrong thing.
 * @param {readonly string[]} argv arguments after the script name
 * @returns {{ url: string, wait: number, target: string, fetch: boolean, help: boolean }}
 */
export function parseArgs(argv) {
  const opts = { url: DEFAULT_URL, wait: 0, target: DEFAULT_TARGET, fetch: false, help: false };
  const rest = [...argv];
  let targetSeen = false;
  while (rest.length > 0) {
    const arg = /** @type {string} */ (rest.shift());
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => {
      const v = eq === -1 ? rest.shift() : arg.slice(eq + 1);
      if (v === undefined || v === '') throw new Error(`${name} needs a value`);
      return v;
    };
    if (name === '--url') {
      opts.url = value();
    } else if (name === '--wait') {
      const seconds = Number(value());
      if (!Number.isFinite(seconds) || seconds < 0) {
        throw new Error('--wait needs a number of seconds');
      }
      opts.wait = seconds;
    } else if (name === '--fetch') {
      if (eq !== -1) throw new Error('--fetch takes no value');
      opts.fetch = true;
    } else if (name === '--help' || name === '-h') {
      opts.help = true;
    } else if (name.startsWith('-')) {
      throw new Error(`unknown option ${name}`);
    } else if (targetSeen) {
      throw new Error('only one target (a SHA or a git ref) may be given');
    } else {
      opts.target = arg;
      targetSeen = true;
    }
  }
  if (!opts.url.endsWith('/')) opts.url += '/';
  return opts;
}

// ---------------------------------------------------------------------------
// I/O below: untested glue, kept thin.

/**
 * GET a text resource with a hard timeout; an HTTP error carries its
 * status so a 404 during a deploy switch reads as what it is.
 * @param {string} url
 * @returns {Promise<{ text: string, url: string }>}
 */
async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'cache-control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
  return { text: await response.text(), url: response.url };
}

/**
 * The build id the site serves right now: index → entry asset → id.
 * The index is cache-busted with a query string; the asset's content-
 * hashed name needs none.
 * @param {string} siteUrl a site root, trailing slash included
 * @returns {Promise<string>}
 */
async function readLiveBuildId(siteUrl) {
  const page = await fetchText(`${siteUrl}?verify=${String(Date.now())}`);
  const entry = findEntryScript(page.text, page.url);
  if (entry === null) throw new Error(`no <script type="module" src> in ${siteUrl}`);
  const asset = await fetchText(entry);
  const ids = findBuildIds(asset.text);
  if (ids.length === 1) return ids[0];
  if (ids.length > 1) throw new Error(`ambiguous build ids in ${entry}: ${ids.join(', ')}`);
  if (NOGIT_ID_RE.test(asset.text)) {
    throw new Error(`${entry} was built without git metadata (nogit) — nothing to compare`);
  }
  throw new Error(`no build id in ${entry}`);
}

/**
 * `git fetch origin`, so a remote-tracking target names what the remote
 * holds now rather than what this checkout last saw. Output is quiet:
 * the verdict line stays the only stdout line.
 */
function fetchOrigin() {
  try {
    execFileSync('git', ['fetch', '--quiet', 'origin'], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';
    throw new Error(`git fetch origin failed${stderr ? ` — ${stderr}` : ''}`, { cause: error });
  }
}

/**
 * The expected commit: a raw SHA is taken as given; anything else is a
 * git ref resolved in the current repository.
 * @param {string} target
 * @returns {{ sha: string, label: string }}
 */
function resolveTarget(target) {
  if (isSha(target)) return { sha: target.toLowerCase(), label: target.toLowerCase() };
  let sha;
  try {
    sha = execFileSync('git', ['rev-parse', '--verify', '--quiet', `${target}^{commit}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error(`cannot resolve git ref "${target}" — pass a SHA, or fetch first`);
  }
  return { sha, label: `${target}@${sha.slice(0, 7)}` };
}

/**
 * One verification attempt; every failure becomes an ERROR outcome so
 * the `--wait` loop can decide whether to try again.
 * @param {string} siteUrl
 * @param {{ sha: string, label: string }} expected
 * @returns {Promise<Outcome>}
 */
async function attempt(siteUrl, expected) {
  try {
    return compareBuild(await readLiveBuildId(siteUrl), expected.sha, expected.label);
  } catch (error) {
    return { status: 'ERROR', reason: error instanceof Error ? error.message : String(error) };
  }
}

const USAGE =
  'usage: node scripts/verify-deploy.mjs [--url <site>] [--wait <seconds>] [--fetch] [<sha>|<git-ref>]\n' +
  `  site defaults to ${DEFAULT_URL}, target to ${DEFAULT_TARGET}; --fetch runs git fetch origin first;\n` +
  '  exit 0 PASS, 1 FAIL, 2 ERROR';

/**
 * Verdict on stdout (exactly one line), progress under `--wait` on
 * stderr, exit code per EXIT_CODES.
 * @param {readonly string[]} argv
 * @returns {Promise<number>}
 */
async function main(argv) {
  /** @type {ReturnType<typeof parseArgs>} */
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`${verdictLine({ status: 'ERROR', reason })}\n${USAGE}`);
    return EXIT_CODES.ERROR;
  }
  if (opts.help) {
    console.log(USAGE);
    return EXIT_CODES.PASS;
  }
  /** @type {{ sha: string, label: string }} */
  let expected;
  try {
    if (opts.fetch) fetchOrigin();
    expected = resolveTarget(opts.target);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(verdictLine({ status: 'ERROR', reason }));
    return EXIT_CODES.ERROR;
  }

  const deadline = Date.now() + opts.wait * 1000;
  for (let n = 1; ; n++) {
    const outcome = await attempt(opts.url, expected);
    const left = Math.ceil((deadline - Date.now()) / 1000);
    if (outcome.status === 'PASS' || left <= 0) {
      console.log(verdictLine(outcome));
      return EXIT_CODES[outcome.status];
    }
    const why = outcome.status === 'ERROR' ? outcome.reason : `live ${outcome.liveId}`;
    const pause = Math.min(POLL_SECONDS, left);
    console.error(
      `verify-deploy: attempt ${String(n)} ${outcome.status} (${why}) — ` +
        `retrying in ${String(pause)} s, ${String(left)} s left`,
    );
    await delay(pause * 1000);
  }
}

/** True only when this file is the process entry — never under an import (Vitest). */
function isProcessEntry() {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isProcessEntry()) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      const reason = error instanceof Error ? error.message : String(error);
      console.log(verdictLine({ status: 'ERROR', reason }));
      process.exitCode = EXIT_CODES.ERROR;
    },
  );
}
