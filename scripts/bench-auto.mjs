/**
 * One-command automated owner-session legs (M13-MEAS-03 Tier 1):
 *
 *   npm run bench:auto
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
 * Both reports are validated (`bench-auto-validate.mjs`) and written
 * to `bench-reports/` (gitignored, like every bench artefact). Any
 * validation failure exits non-zero — an invalid run is never quietly
 * left on disk as evidence.
 *
 * Run it on an **awake desktop and leave the machine alone**: the
 * Chrome windows must stay at least partially visible (a hidden page
 * is CPU-throttled 10–20×, and the env row records it). This is
 * "one command, a few minutes of hands-off", never headless CI.
 * Procedure and honesty rules: `docs/browser-measurement.md` →
 * "Automated owner-session legs".
 *
 * Owns only what it starts: the preview server, the flagged Chrome
 * instances, and their temp profiles. It never touches a running dev
 * server, the daily browser, or any other port.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { validateCaptureReport, validateMemReport } from './bench-auto-validate.mjs';

const PORT = Number(process.env.BENCH_PORT ?? 4173);
const CHROME =
  process.env.BENCH_CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** Substring of the controlled source window's <title> — must match
 * bench-source.html and nothing else on the desktop. */
const SOURCE_TITLE = 'controlled capture source';
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

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

/**
 * Start the collector; resolves each POSTed body via a rotating
 * waiter. The harness page posts cross-origin (localhost:PORT →
 * 127.0.0.1:collector) with a JSON content type, so Chrome preflights
 * — the collector must answer OPTIONS and carry CORS headers or the
 * report silently never arrives (the first end-to-end run's failure).
 */
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

/** Launch a dedicated, flagged Chrome at `url`; returns a kill fn. */
function launchChrome(url) {
  const profile = mkdtempSync(join(tmpdir(), 'csl-bench-chrome-'));
  const child = spawn(
    CHROME,
    [
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      `--auto-select-window-capture-source-by-title=${SOURCE_TITLE}`,
      '--js-flags=--expose-gc',
      // Prominent enough that ordinary desktop activity is unlikely to
      // fully occlude it — macOS Chrome marks a fully-covered window
      // hidden, which throttles and taints the run (run 3's failure).
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
    // real outcome (the first end-to-end run died on this ENOTEMPTY).
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch {
      console.warn(`could not remove temp profile ${profile} — the OS will`);
    }
  };
  cleanups.push(kill);
  return kill;
}

/** One flagged-Chrome page load → one parsed, written, validated report. */
async function runLeg(collector, name, autoTokens, validate) {
  console.log(`\n=== ${name}: launching flagged Chrome (leave the machine alone) ===`);
  const post = `http://127.0.0.1:${String(collector.port)}/report`;
  const url =
    `http://localhost:${String(PORT)}/bench.html` +
    `?auto=${autoTokens}&post=${encodeURIComponent(post)}`;
  const kill = launchChrome(url);
  try {
    const body = await collector.nextReport(RUN_TIMEOUT_MS);
    const report = JSON.parse(body);
    mkdirSync('bench-reports', { recursive: true });
    const buildId = String(report.build?.buildId ?? 'unknown-build').replaceAll('+', '_');
    const file = join('bench-reports', `browser-bench-${buildId}-${name}.json`);
    writeFileSync(file, body);
    const failures = validate(report);
    console.log(`${name}: report written to ${file}`);
    return { report, failures, file };
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
  const capture = await runLeg(collector, 'capture', 'capture,editclasses', validateCaptureReport);
  const mem = await runLeg(collector, 'mem', 'mem', validateMemReport);

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

  const failures = [
    ...capture.failures.map((f) => `capture: ${f}`),
    ...mem.failures.map((f) => `mem: ${f}`),
  ];
  if (failures.length > 0) {
    console.error('\nINVALID RUN — do not quote these reports:');
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('\nBoth reports valid (untainted, visible, all legs measured).');
  }
}

try {
  await main();
} finally {
  cleanup();
}
