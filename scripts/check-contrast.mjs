/**
 * check-contrast.mjs — dependency-free WCAG 2.2 contrast proof for the
 * token file (M14-SPEC-02; UI-STANDARDS → "Accessibility").
 *
 * Parses `src/ui/styles/tokens.css` — the single source of truth — and
 * verifies every declared `@pair <fg> on <bg> [large|nontext]`
 * annotation in BOTH colour schemes at AAA bars: 7:1 text, 4.5:1
 * large text, 3:1 non-text. `@exempt <token> <reason>` lines are
 * printed, not checked, so an exemption stays a recorded decision.
 *
 * Non-mutating; exits 1 on any failing pair (this is a gate step,
 * unlike the report-only secret scan).
 *
 * Usage: node scripts/check-contrast.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tokensPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'ui',
  'styles',
  'tokens.css',
);
const css = readFileSync(tokensPath, 'utf8');

/** All `--csl-*: value;` declarations inside a block of text. */
function declarations(block) {
  const out = new Map();
  for (const m of block.matchAll(/--csl-([a-z0-9-]+):\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

// Scheme split: the dark block is the media query's contents; light is
// everything outside it. (The reduced-motion block only touches
// durations, which are never paired — harmless either side.)
const darkMatch = css.match(
  /@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}/,
);
const darkBlock = darkMatch === null ? '' : darkMatch[1];
const lightBlock = css.replace(darkBlock, '');
const light = declarations(lightBlock);
const dark = new Map([...light, ...declarations(darkBlock)]);

/** #rrggbb → WCAG relative luminance. */
function luminance(hex) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (m === null) return null;
  const channel = (i) => {
    const v = parseInt(m[1].slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function ratio(fgHex, bgHex) {
  const a = luminance(fgHex);
  const b = luminance(bgHex);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const pairs = [...css.matchAll(/@pair\s+([a-z0-9-]+)\s+on\s+([a-z0-9-]+)(?:\s+(large|nontext))?/g)].map(
  (m) => ({ fg: m[1], bg: m[2], kind: m[3] ?? 'text' }),
);
const exemptions = [...css.matchAll(/@exempt\s+([a-z0-9-]+)\s+(.+)/g)].map((m) => ({
  token: m[1],
  reason: m[2].trim(),
}));

if (pairs.length === 0) {
  console.error('check-contrast: no @pair annotations found — the contract is empty');
  process.exit(1);
}

const BAR = { text: 7, large: 4.5, nontext: 3 };
let failures = 0;
const rows = [];

for (const [scheme, tokens] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const pair of pairs) {
    const fg = tokens.get(pair.fg);
    const bg = tokens.get(pair.bg);
    if (fg === undefined || bg === undefined) {
      console.error(`check-contrast: ${scheme}: unknown token in @pair ${pair.fg} on ${pair.bg}`);
      failures++;
      continue;
    }
    // `currentColor` resolves to the running text colour; its worst
    // case against any declared background is text-primary, so that is
    // what the contract checks.
    const fgHex = fg === 'currentColor' ? tokens.get('text-primary') : fg;
    const r = ratio(fgHex, bg);
    if (r === null) {
      console.error(
        `check-contrast: ${scheme}: unparseable colour in @pair ${pair.fg} on ${pair.bg} (${fg} / ${bg})`,
      );
      failures++;
      continue;
    }
    const bar = BAR[pair.kind];
    const pass = r >= bar;
    if (!pass) failures++;
    rows.push(
      `${pass ? 'PASS' : 'FAIL'}  ${scheme.padEnd(5)}  ${pair.fg} on ${pair.bg}`.padEnd(58) +
        `${r.toFixed(2)}:1 (needs ${String(bar)}:1${pair.kind === 'text' ? '' : `, ${pair.kind}`})`,
    );
  }
}

console.log(`check-contrast: ${String(pairs.length)} pair(s) × 2 schemes`);
for (const row of rows) console.log(`  ${row}`);
if (exemptions.length > 0) {
  console.log('exempt (declared, not checked):');
  for (const e of exemptions) console.log(`  ${e.token} — ${e.reason}`);
}
if (failures > 0) {
  console.error(`check-contrast: ${String(failures)} failure(s)`);
  process.exit(1);
}
console.log('check-contrast: all pairs meet AAA bars');
