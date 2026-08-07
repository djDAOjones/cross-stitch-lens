/**
 * One-command automated owner-session legs (M13-MEAS-03 Tier 1):
 *
 *   npm run bench:auto                    # run now (desktop must stay quiet)
 *   npm run bench:auto -- --when-quiet    # arm: wait for real user idle, then run
 *
 * Builds the production bundle, serves it with `vite preview`, then
 * launches the installed Chrome twice — a dedicated throwaway profile,
 * flags only, no new dependencies — against `/bench.html`:
 *
 *   1. `?auto=capture,editclasses` — the flag-granted capture legs
 *      (canonical live windows, interaction run, six edit-class
 *      windows), granted by
 *      `--auto-select-window-capture-source-by-title` (probed on
 *      Chrome 151: resolves `getDisplayMedia` with no gesture and no
 *      picker; content-verified in-page before any row is measured).
 *   2. `?auto=mem` — the memory leg in a `--js-flags=--expose-gc`
 *      Chrome, so the plateau probe can answer the D71 lazy-GC vs
 *      retention question with a forced-GC re-read.
 *
 * Every attempt writes **timestamped** reports to `bench-reports/`
 * (evidence survives, valid or not); a leg that passes validation
 * (`bench-auto-validate.mjs`) is also copied to the canonical
 * unstamped name, so the canonical artefact can never hold a tainted
 * run. Any validation failure exits non-zero.
 *
 * The runs need an **awake desktop with the Chrome windows left at
 * least partially visible** (a hidden page is CPU-throttled 10–20×,
 * and the env row records it — the validity gate refuses such runs).
 * `--when-quiet` (or `BENCH_WHEN_QUIET=1`) automates exactly that
 * precondition instead of bending it: the launcher waits until the
 * desktop has been free of user input for `BENCH_IDLE_SECS` (default
 * 60), wakes the display and holds it awake (`caffeinate`, macOS
 * built-in) for the run, and — when a failure is wholly environmental
 * (hidden windows, throttled source) — re-arms for another quiet gap,
 * up to `BENCH_ATTEMPTS` tries (default 3 when quiet-armed, else 1).
 * Structural failures never retry. This is still "a few minutes of
 * hands-off on a real desktop", never headless CI. Procedure and
 * honesty rules: `docs/browser-measurement.md` → "Automated
 * owner-session legs".
 *
 * Owns only what it starts: the preview server, the flagged Chrome
 * instances, their temp profiles, and its own `caffeinate` holder. It
 * never touches a running dev server, the daily browser, or any other
 * port, and it never fakes user input.
 */

import { execFileSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer, get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import {
  formatStamp,
  isEnvironmentalFailure,
  parseIdleSeconds,
  reportPaths,
} from './bench-auto-lib.mjs';
import {
  validateCaptureReport,
  validateMemReport,
  validatePickerCaptureReport,
} from './bench-auto-validate.mjs';
import { compareReports, formatComparison } from './bench-cross-check.mjs';

const PORT = Number(process.env.BENCH_PORT ?? 4173);
const CHROME =
  process.env.BENCH_CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** Substring of the controlled source window's <title> — must match
 * bench-source.html and nothing else on the desktop. */
const SOURCE_TITLE = 'controlled capture source';
const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const WHEN_QUIET =
  process.argv.includes('--when-quiet') || process.env.BENCH_WHEN_QUIET === '1';
const CROSSCHECK = process.argv.includes('--crosscheck');
const IDLE_SECS = Number(process.env.BENCH_IDLE_SECS ?? 60);
const ATTEMPTS = Number(process.env.BENCH_ATTEMPTS ?? (WHEN_QUIET ? 3 : 1));

const cleanups = [];
function cleanup() {
  for (const fn of cleanups.splice(0)) {
    try {
      fn();
    } catch {
      /* best effort — never mask the real failure */
    }
  }
}
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

function run(command, args, name) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} exited with ${String(code)}`)),
    );
    child.on('error', reject);
  });
}

function httpStatus(url) {
  return new Promise((resolve) => {
    const request = get(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.on('error', () => resolve(0));
  });
}

async function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if ((await httpStatus(url)) === 200) return;
    await delay(300);
  }
  throw new Error(`${url} did not serve HTTP 200 within ${String(timeoutMs)} ms`);
}

// ------------------------------------------------- quiet-desktop gate

/** Seconds since the last user input, or null when unreadable. */
function idleSeconds() {
  try {
    return parseIdleSeconds(execFileSync('ioreg', ['-c', 'IOHIDSystem'], { encoding: 'utf8' }));
  } catch {
    return null;
  }
}

/**
 * Block until the desktop has been input-free for `minIdle` seconds.
 * Polls every 10 s with a low-noise heartbeat. If idleness cannot be
 * read at all, says so once and proceeds — the validity gate still
 * refuses a disturbed run, so the worst case is a wasted attempt,
 * never a quietly wrong report.
 */
async function waitForQuiet(minIdle) {
  const first = idleSeconds();
  if (first === null) {
    console.warn('cannot read HIDIdleTime on this system — running without the idle gate');
    return;
  }
  console.log(
    `Armed: waiting for ${String(minIdle)} s of user idle before measuring ` +
      '(step away and the run starts itself)…',
  );
  let polls = 0;
  for (;;) {
    const idle = idleSeconds();
    if (idle === null || idle >= minIdle) return;
    if (polls > 0 && polls % 30 === 0) {
      console.log(`still waiting for quiet (idle ${String(idle)} s / need ${String(minIdle)} s)`);
    }
    polls++;
    await delay(10_000);
  }
}

/** Wake a possibly-sleeping display so the measurement windows render
 * on glass. Declares one user-active moment — called only after the
 * idle gate has already passed, and the run launches immediately. */
function wakeDisplay() {
  try {
    execFileSync('caffeinate', ['-u', '-t', '1']);
  } catch {
    /* non-macOS or restricted — the validity gate remains the backstop */
  }
}

/** Hold display + system awake for the duration of a run. */
function holdAwake() {
  try {
    const holder = spawn('caffeinate', ['-di'], { stdio: 'ignore' });
    const release = () => {
      if (holder.exitCode === null) holder.kill('SIGTERM');
    };
    cleanups.push(release);
    return release;
  } catch {
    return () => {};
  }
}

// ----------------------------------------------------- run machinery

/** Start the collector; resolves each POSTed body via a rotating
 * waiter. The harness page posts cross-origin (localhost:PORT →
 * 127.0.0.1:collector) with a JSON content type, so Chrome preflights
 * — the collector must answer OPTIONS and carry CORS headers or the
 * report silently never arrives (the first end-to-end run's failure). */
function startCollector() {
  let waiter = null;
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
  const server = createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, cors).end();
      return;
    }
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      response.writeHead(204, cors).end();
      if (waiter !== null) {
        const resolve = waiter;
        waiter = null;
        resolve(body);
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      cleanups.push(() => server.close());
      resolve({
        port: server.address().port,
        nextReport: (timeoutMs) =>
          new Promise((resolveReport, rejectReport) => {
            const timer = setTimeout(() => {
              waiter = null;
              rejectReport(new Error('timed out waiting for the report POST'));
            }, timeoutMs);
            waiter = (body) => {
              clearTimeout(timer);
              resolveReport(body);
            };
          }),
      });
    });
  });
}

/**
 * Launch a dedicated Chrome at `url`; returns `{ kill, pid }`.
 * `flagged: false` (the picker-granted cross-check leg) omits the
 * auto-select flag — the real picker appears — and forces renderer
 * accessibility so the picker is scriptable via System Events.
 */
function launchChrome(url, { flagged = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'csl-bench-chrome-'));
  const child = spawn(
    CHROME,
    [
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      ...(flagged
        ? [`--auto-select-window-capture-source-by-title=${SOURCE_TITLE}`]
        : ['--force-renderer-accessibility']),
      '--js-flags=--expose-gc',
      // Prominent enough that ordinary desktop activity is unlikely to
      // fully occlude it — macOS Chrome marks a fully-covered window
      // hidden, which throttles and taints the run.
      '--window-position=20,40',
      '--window-size=1040,940',
      url,
    ],
    { stdio: 'ignore' },
  );
  const kill = () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    // Chrome keeps writing the profile while it shuts down; removal of
    // our own temp dir is best-effort and must never mask the run's
    // real outcome.
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch {
      console.warn(`could not remove temp profile ${profile} — the OS will`);
    }
  };
  cleanups.push(kill);
  return { kill, pid: child.pid };
}

// --------------------------------------- picker clicking (crosscheck)

/** One osascript invocation; returns true on success, false on any
 * error (no assistive access, element not found, dialog not up yet). */
function osascript(script) {
  try {
    execFileSync('osascript', ['-e', script], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort zero-click driver for Chrome's share picker on the
 * picker-granted leg: find the tile whose name carries the controlled
 * source's title, click it, click Share — scoped to our dedicated
 * instance by unix process id, so the daily browser can never be
 * touched. Requires the app hosting this process to be enabled under
 * System Settings → Privacy & Security → Accessibility; without that
 * (or if Chrome's picker exposes a different tree) every attempt
 * fails harmlessly and a human click finishes the dialog — the run
 * itself continues either way, so automation degrades to one manual
 * click, never to a broken run.
 */
async function clickPickerWhenUp(pid, timeoutMs = 30_000) {
  const inProcess = (body) =>
    [
      'tell application "System Events"',
      `  tell (first process whose unix id is ${String(pid)})`,
      ...body.map((line) => `    ${line}`),
      '  end tell',
      'end tell',
    ].join('\n');
  const inspectable = () => osascript(inProcess(['get name of window 1']));
  const attempt = () =>
    osascript(
      inProcess([
        'set frontmost to true',
        `click (first UI element of window 1 whose name contains "${SOURCE_TITLE}")`,
        'delay 0.4',
        'click (first button of window 1 whose name is "Share")',
      ]),
    );
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await delay(2000);
    if (!inspectable()) continue; // dialog not up yet, or no assistive access
    if (attempt()) {
      console.log('picker: clicked the controlled-source tile and Share.');
      return true;
    }
  }
  console.log(
    'picker: could not click it myself (no assistive access, or an unexpected dialog ' +
      'shape) — if a share picker is on screen, click the "controlled capture source" ' +
      'tile and Share; the run continues either way.',
  );
  return false;
}

/** One dedicated-Chrome page load → one parsed, stamped, validated
 * report; valid legs are additionally copied to the canonical name.
 * `options.flagged: false` runs the picker-granted variant and
 * `options.driver(pid)` runs concurrently with the report wait (the
 * picker clicker — its failure never blocks the run). */
async function runLeg(collector, name, autoTokens, validate, stamp, options = {}) {
  console.log(`\n=== ${name}: launching dedicated Chrome (leave the machine alone) ===`);
  const post = `http://127.0.0.1:${String(collector.port)}/report`;
  const url =
    `http://localhost:${String(PORT)}/bench.html` +
    `?auto=${autoTokens}&post=${encodeURIComponent(post)}`;
  const { kill, pid } = launchChrome(url, { flagged: options.flagged ?? true });
  try {
    const reportPromise = collector.nextReport(RUN_TIMEOUT_MS);
    if (options.driver !== undefined) void options.driver(pid);
    const body = await reportPromise;
    const report = JSON.parse(body);
    mkdirSync('bench-reports', { recursive: true });
    const paths = reportPaths(report.build?.buildId ?? 'unknown-build', name, stamp);
    const stamped = join('bench-reports', paths.stamped);
    writeFileSync(stamped, body);
    const failures = validate(report);
    if (failures.length === 0) {
      copyFileSync(stamped, join('bench-reports', paths.canonical));
      console.log(`${name}: VALID — ${stamped} (canonical copy updated)`);
    } else {
      console.log(`${name}: invalid — ${stamped} (canonical copy untouched)`);
    }
    return { report, failures, file: stamped };
  } finally {
    kill();
  }
}

function headline(report, workloadId, boundary) {
  const row = report.rows.find(
    (r) => r.workloadId === workloadId && r.boundary === boundary,
  );
  if (row === undefined || row.summary === null) return '(not measured)';
  const rate = row.meta?.['updates/sec over window'];
  return (
    `median ${row.summary.median.toFixed(1)} ms (n=${String(row.summary.count)})` +
    (typeof rate === 'number' ? `, ${rate.toFixed(1)} updates/sec` : '')
  );
}

function printSummary(capture, mem) {
  console.log('\n=== Summary ===');
  const base = 'capture.g300.p64.lab.fs-s100-serp';
  console.log(`live 300²:  ${headline(capture.report, base, 'preview-update')}`);
  console.log(
    `live 200²:  ${headline(capture.report, 'capture.g200.p64.lab.fs-s100-serp', 'preview-update')}`,
  );
  console.log(`interaction: ${headline(capture.report, base, 'interaction')}`);
  const plateau = mem.report.rows.find(
    (r) => r.label === 'retained-heap plateau (fixed sequence)',
  );
  if (plateau !== undefined) {
    console.log(
      `mem plateau: idle ${String(plateau.meta?.['heap after 5 s idle MiB'])} MiB → ` +
        `forced GC ${String(plateau.meta?.['heap after forced GC MiB'])} MiB — ` +
        String(plateau.meta?.verdict),
    );
  }
}

async function main() {
  if (!existsSync(CHROME)) {
    throw new Error(
      `Chrome not found at ${CHROME} — set BENCH_CHROME to the browser binary`,
    );
  }
  console.log('Building the production bundle…');
  await run('npm', ['run', 'build'], 'build');

  console.log(`Serving on port ${String(PORT)} (BENCH_PORT overrides)…`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
  });
  cleanups.push(() => {
    if (preview.exitCode === null) preview.kill('SIGTERM');
  });
  await waitForHttp(`http://localhost:${String(PORT)}/bench.html`, 20_000);

  const collector = await startCollector();

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (WHEN_QUIET) {
      await waitForQuiet(IDLE_SECS);
      wakeDisplay();
    }
    const release = holdAwake();
    const stamp = formatStamp(new Date());
    let capture;
    let second;
    try {
      capture = await runLeg(collector, 'capture', 'capture,editclasses', validateCaptureReport, stamp);
      // Crosscheck mode (Part A′): instead of the mem leg, rerun just
      // the canonical capture legs picker-granted — same build, same
      // serve — then print the comparison. The verdict stays human.
      second = CROSSCHECK
        ? await runLeg(collector, 'picker', 'capture', validatePickerCaptureReport, stamp, {
            flagged: false,
            driver: clickPickerWhenUp,
          })
        : await runLeg(collector, 'mem', 'mem', validateMemReport, stamp);
    } finally {
      release();
    }
    if (CROSSCHECK) {
      console.log('\n=== Part A′ cross-check (picker-granted vs flag-granted) ===');
      console.log(formatComparison(compareReports(second.report, capture.report), 'picker'));
    } else {
      printSummary(capture, second);
    }
    const secondName = CROSSCHECK ? 'picker' : 'mem';
    const failures = [
      ...capture.failures.map((f) => `capture: ${f}`),
      ...second.failures.map((f) => `${secondName}: ${f}`),
    ];
    if (failures.length === 0) {
      console.log(
        `\nBoth reports valid (untainted, visible, all legs measured) — attempt ${String(attempt)}.`,
      );
      return;
    }
    console.error(`\nAttempt ${String(attempt)} invalid:`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    if (attempt < ATTEMPTS && isEnvironmentalFailure(failures)) {
      console.log('Failure is environmental (disturbed desktop) — re-arming for a quiet gap.');
      continue;
    }
    break;
  }
  console.error('\nINVALID RUN — canonical reports untouched; do not quote the stamped ones.');
  process.exitCode = 1;
}

try {
  await main();
} finally {
  cleanup();
}
