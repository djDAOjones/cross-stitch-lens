/**
 * The secret scanner's own suite (SCAN-01).
 *
 * SCAN-01 made the scan silent on a clean tree by taking the literal
 * sample tokens out of the fixtures. Silence is only worth having if
 * the detector still fires, so this pins the half that matters: every
 * shape in `PATTERNS` trips on planted text, ordinary prose does not,
 * and the exception list stays narrow enough to read.
 *
 * The planted tokens are assembled at runtime for the same reason the
 * fixtures are — see `helpers/sample-credentials.ts`.
 */

import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain .mjs module, typed by its JSDoc only.
import { PATH_EXCEPTIONS, PATTERNS, scanText } from '../scripts/check-secrets.mjs';

import { SAMPLE_CREDENTIALS } from './helpers/sample-credentials.ts';

interface Hit {
  name: string;
  line: number;
}
const scan = scanText as (text: string) => Hit[];
const patterns = PATTERNS as { name: string; re: RegExp }[];
const exceptions = PATH_EXCEPTIONS as Map<string, string>;

describe('check-secrets patterns', () => {
  it('knows exactly the four shapes the fixtures cover', () => {
    expect(patterns.map((p) => p.name)).toEqual(SAMPLE_CREDENTIALS.map((c) => c.name));
  });

  for (const { name, token } of SAMPLE_CREDENTIALS) {
    it(`trips on a planted ${name}`, () => {
      const hits = scan(`line one\nsome prose ${token} more prose\n`);
      expect(hits.map((h) => h.name)).toContain(name);
    });
  }

  it('reports the line the credential is on, not the first line', () => {
    const hits = scan(`alpha\nbravo\ncharlie ${SAMPLE_CREDENTIALS[0].token}\n`);
    expect(hits[0]?.line).toBe(3);
  });

  it('finds every shape when all four are planted at once', () => {
    const text = SAMPLE_CREDENTIALS.map((c) => c.token).join('\n');
    expect(scan(text)).toHaveLength(patterns.length);
  });

  it('stays quiet on ordinary prose', () => {
    expect(scan('The reduce stage maps to DMC 310 via the LUT.\n')).toEqual([]);
  });

  it('does not fire on the near-misses that would make it noisy', () => {
    // Each is one property short of a real match: too few chars after
    // the prefix, a lowercase AWS body, an unknown `gh?_` letter, and
    // a key header with no rule. A scanner that fired on these would
    // be back to warning on every green run.
    const nearMisses = [
      'sk-tooshort',
      'AKIAabcdefghijklmnop',
      'ghz_abcdefghijklmnopqrstuvwxyz012345',
      'BEGIN RSA PRIVATE KEY',
    ];
    for (const text of nearMisses) expect(scan(text)).toEqual([]);
  });
});

describe('check-secrets exceptions', () => {
  it('exempts only the scanner itself, and says why', () => {
    expect([...exceptions.keys()]).toEqual(['scripts/check-secrets.mjs']);
    for (const reason of exceptions.values()) expect(reason.length).toBeGreaterThan(0);
  });

  it('lists exact paths — never a directory or a glob', () => {
    for (const path of exceptions.keys()) {
      expect(path).not.toContain('*');
      expect(path.endsWith('/')).toBe(false);
    }
  });
});
