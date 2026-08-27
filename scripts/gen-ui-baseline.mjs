/**
 * gen-ui-baseline.mjs — regenerate the M14 UI-baseline artefacts
 * (`tests/ui-baseline/source-gradient-256.png` and `hashes.json`).
 *
 * Separate from `check` on purpose, and separate from the suite that
 * reads them (TEST-01). The suite used to write any absent artefact
 * during its own run and pass, which meant it could not detect the
 * loss it exists to guard: the oracle was re-derived from the code
 * under test. It now fails closed, and this is the only thing that
 * writes.
 *
 * These are **protected files** under the golden-fixture rule
 * (AGENTS.md → "Correctness & data"): regenerating them takes explicit
 * owner approval with a stated reason — an intended algorithm or
 * schema change — never to make a failing test pass. A red baseline
 * inside a UI-only milestone is a defect; this script is not the fix
 * for it.
 *
 * Usage:
 *   npm run baseline:write -- --reason "schema v13: <what changed>"
 *   npm run baseline:write -- --check     # report drift, write nothing
 *
 * Refuses to run in CI.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'tests', 'ui-baseline');
const PNG = join(DIR, 'source-gradient-256.png');
const HASHES = join(DIR, 'hashes.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--check');
const reasonAt = args.indexOf('--reason');
const reason = reasonAt >= 0 ? args[reasonAt + 1] : undefined;

if (process.env.CI === 'true') {
  console.error(
    'gen-ui-baseline: refusing to run in CI. Regenerating a protected fixture is ' +
      'a deliberate local act with owner approval; CI only ever verifies.',
  );
  process.exit(1);
}

if (!dryRun && (reason === undefined || reason.trim() === '')) {
  console.error(
    'gen-ui-baseline: refusing to write without a stated reason.\n' +
      '  npm run baseline:write -- --reason "schema v13: tone gains a <field>"\n' +
      'Use --check to see the drift without writing. If the reason is "a test ' +
      'went red", stop: that is the tripwire working.',
  );
  process.exit(1);
}

// The reference definitions are TypeScript and are shared with the
// suite; run them through Vite's SSR loader rather than keeping a
// second copy here (the matrix:write precedent).
const { createServer } = await import('vite');
const server = await createServer({ configFile: false, server: { middlewareMode: true } });
let reference;
try {
  reference = await server.ssrLoadModule('/tests/ui-baseline/reference.ts');
} finally {
  await server.close();
}

const computed = reference.computeBaseline();
const previous = existsSync(HASHES) ? JSON.parse(readFileSync(HASHES, 'utf8')) : {};
const show = (path) => relative(ROOT, path);

// The PNG is rewritten ONLY when its content actually moved, never
// merely because this machine's zlib would emit different bytes for
// the same pixels. `encodePng` ends in `deflateSync`, whose output
// varies across zlib versions and platforms — an unconditional
// rewrite here would churn a committed protected fixture on every
// machine that ran the generator, and the diff would look like a real
// change. `sourcePixels` is the honest trigger.
const pngMissing = !existsSync(PNG);
// An ABSENT previous `sourcePixels` is not a moved one — it is a key
// this oracle predates. Rewriting on that would churn the fixture the
// first time anyone ran the generator after the key was added.
const contentMoved =
  typeof previous.sourcePixels === 'string' && previous.sourcePixels !== computed.sourcePixels;
const rewritePng = pngMissing || contentMoved;

const png = rewritePng ? reference.referencePng() : readFileSync(PNG);
const next = { sourcePng: reference.sha256(new Uint8Array(png)), ...computed };

const changed = reference.BASELINE_KEYS.filter((key) => previous[key] !== next[key]);

if (changed.length === 0) {
  console.log('gen-ui-baseline: already current — nothing to write.');
  process.exit(0);
}

for (const key of changed) {
  console.log(`  ${key}: ${String(previous[key] ?? '(absent)')} -> ${next[key]}`);
}
console.log(
  rewritePng
    ? `  ${show(PNG)}: ${pngMissing ? 'absent — will be written' : 'content moved — will be re-encoded'}`
    : `  ${show(PNG)}: left exactly as committed (content unchanged, or not previously pinned)`,
);

if (dryRun) {
  console.log(
    `gen-ui-baseline: ${String(changed.length)} hash(es) would change. Nothing written (--check).`,
  );
  process.exit(0);
}

if (rewritePng) writeFileSync(PNG, png);
writeFileSync(HASHES, `${JSON.stringify(next, null, 2)}\n`);
console.log(
  `gen-ui-baseline: wrote ${show(HASHES)}${rewritePng ? ` and ${show(PNG)}` : ''}\n` +
    `  reason: ${reason}\n` +
    '  Commit these with that reason in the message, and record the ' +
    'approval in the decision log.',
);
