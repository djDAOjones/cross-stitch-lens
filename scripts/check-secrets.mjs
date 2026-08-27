/**
 * check-secrets.mjs — report-only, dependency-free scan of tracked
 * files for obvious credential shapes (DEV-INFRASTRUCTURE.md →
 * "Security baseline"). Non-mutating; always exits 0 — the report is
 * the product, rotation is the fix.
 *
 * Zero warnings on a clean tree is part of the contract (SCAN-01): a
 * scan that prints four known-benign hits on every green run trains
 * the reader to skim past the fifth, which is the one that matters.
 * Two mechanisms keep it silent without weakening it — test files
 * assemble their sample tokens at runtime so no literal is ever on
 * disk, and `PATH_EXCEPTIONS` below carries the narrow, named
 * remainder. Neither touches the patterns.
 *
 * Usage: node scripts/check-secrets.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const PATTERNS = [
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'Private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/**
 * Files exempt from the scan, each for a stated reason. Exact paths
 * only — no globs, no directories: an exception wide enough to hide a
 * real credential is worse than the noise it silences.
 */
export const PATH_EXCEPTIONS = new Map([
  ['scripts/check-secrets.mjs', 'the scanner carries its own patterns'],
]);

/**
 * Scan one file's text. Returns `{ name, line }` per pattern that
 * matches, in `PATTERNS` order. Pure — the CLI below is the only
 * thing that reads the disk or prints.
 */
export function scanText(text) {
  const hits = [];
  for (const { name, re } of PATTERNS) {
    const match = re.exec(text);
    if (match === null) continue;
    hits.push({ name, line: text.slice(0, match.index).split('\n').length });
  }
  return hits;
}

const NUL = String.fromCharCode(0);

function main() {
  const files = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f !== '' && !PATH_EXCEPTIONS.has(f));

  let findings = 0;
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // deleted-but-listed or unreadable; not this script's problem
    }
    if (text.includes(NUL)) continue; // binary
    for (const { name, line } of scanText(text)) {
      findings++;
      console.warn(`check-secrets: ${file}:${String(line)} looks like a ${name}`);
    }
  }

  if (findings === 0) {
    console.log(`check-secrets: ${String(files.length)} tracked files, no obvious key shapes`);
  } else {
    console.warn(
      `check-secrets: ${String(findings)} possible secret(s) — if real, ROTATE AT THE PROVIDER FIRST, then clean up`,
    );
  }
  // Report-only by design: never fails the gate on a suspicion.
}

if (process.argv[1]?.endsWith('check-secrets.mjs')) main();
