/**
 * check-secrets.mjs — report-only, dependency-free scan of tracked
 * files for obvious credential shapes (DEV-INFRASTRUCTURE.md →
 * "Security baseline"). Non-mutating; always exits 0 — the report is
 * the product, rotation is the fix.
 *
 * Usage: node scripts/check-secrets.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'Private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

// This scanner matches its own patterns; skip it.
const SELF_EXCLUDE = new Set(['scripts/check-secrets.mjs']);

const NUL = String.fromCharCode(0);

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f !== '' && !SELF_EXCLUDE.has(f));

let findings = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted-but-listed or unreadable; not this script's problem
  }
  if (text.includes(NUL)) continue; // binary
  for (const { name, re } of PATTERNS) {
    const match = re.exec(text);
    if (match) {
      findings++;
      const line = text.slice(0, match.index).split('\n').length;
      console.warn(`check-secrets: ${file}:${String(line)} looks like a ${name}`);
    }
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
