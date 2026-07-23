/**
 * Stylesheet invariants (M14-IMPL-01).
 *
 * The dev-shell extraction moved rules that encode hard invariants
 * out of `index.html`; these greps pin the ones a stylesheet edit
 * could silently break. Layout behaviour itself is verified in the
 * browser matrix (`docs/ui-evidence.md`) — these are the structural
 * halves a unit test can hold.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

const stylesheets = [
  'src/ui/styles/tokens.css',
  'src/ui/styles/base.css',
  'src/ui/styles/shell.css',
];

describe('stylesheet invariants', () => {
  it('keeps the [hidden] display rule with !important (shell visibility contract)', () => {
    // The shell removes regions from layout AND focus order via
    // `hidden`; a display rule outranking it breaks collapse silently.
    expect(read('src/ui/styles/base.css')).toMatch(
      /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/,
    );
  });

  it('never uses CSS order (reading order = visual order = tab order)', () => {
    for (const sheet of stylesheets) {
      // `order:` as a property would let visual order diverge from DOM
      // order (M6-NARROW-01 / D52). Property-position match only, so
      // prose in comments cannot false-positive.
      expect(read(sheet)).not.toMatch(/^\s*order\s*:/m);
    }
  });

  it('index.html carries only the critical-path block, not the dev shell', () => {
    const html = read('index.html');
    // The dev-shell block styled controls and layout inline; its
    // signature selectors must not return.
    for (const legacy of ['.app-layout', '.preview-host', 'fieldset', 'input.toggle']) {
      expect(html).not.toContain(legacy);
    }
    // The critical block stays for the pre-bundle dark-scheme paint.
    expect(html).toContain('color-scheme: light dark');
  });

  it('main.ts imports the stylesheets in cascade order', () => {
    const main = read('src/main.ts');
    const positions = stylesheets.map((sheet) =>
      main.indexOf(`./${sheet.replace('src/', '')}`),
    );
    for (const at of positions) expect(at).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
