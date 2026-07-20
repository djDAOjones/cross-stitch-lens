/**
 * Regenerate the coverage table inside `docs/acceptance-matrix.md`
 * (M5-ACCEPT-01).
 *
 * Separate from `check` on purpose: the gate must never write
 * (AGENTS.md → "One-command quality gate"), so the suite only compares
 * the committed table against the rows and fails when they drift. This
 * is the fixer you run after changing `tests/matrix/rows.ts`.
 *
 * Usage: `npm run matrix:write`
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(ROOT, 'docs', 'acceptance-matrix.md');
const BEGIN = '<!-- matrix-coverage:begin -->';
const END = '<!-- matrix-coverage:end -->';

// The row definitions are TypeScript; run them through Vite's SSR
// loader rather than duplicating the table generator in JS.
const { createServer } = await import('vite');
const server = await createServer({ configFile: false, server: { middlewareMode: true } });
let rows;
try {
  rows = await server.ssrLoadModule('/tests/matrix/rows.ts');
} finally {
  await server.close();
}

const text = readFileSync(DOC, 'utf8');
const start = text.indexOf(BEGIN);
const end = text.indexOf(END);
if (start < 0 || end < start) {
  throw new Error(`${DOC} is missing the ${BEGIN} / ${END} markers`);
}

const table = rows.renderCoverageMarkdown(rows.MATRIX).trim();
const updated = `${text.slice(0, start + BEGIN.length)}\n\n${table}\n\n${text.slice(end)}`;

if (updated === text) {
  console.log(`acceptance matrix: already up to date (${String(rows.MATRIX.length)} rows)`);
} else {
  writeFileSync(DOC, updated, 'utf8');
  console.log(`acceptance matrix: wrote ${String(rows.MATRIX.length)} rows to docs/acceptance-matrix.md`);
}
