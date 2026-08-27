/**
 * Sample credential shapes for the two suites that must handle them:
 * the transcript redactor (`save-transcript.test.ts`) and the scanner
 * itself (`check-secrets.test.ts`).
 *
 * Every token here is **assembled at runtime** (SCAN-01). Written as
 * literals they would be genuine hits for `scripts/check-secrets.mjs`,
 * and four known-benign warnings on every green run is exactly how a
 * fifth, real one gets skimmed past. Splitting each prefix across a
 * template boundary keeps the *shape* intact at runtime while leaving
 * nothing on disk for the scanner to match — the patterns stay
 * untouched, which is the point: the fix is to the fixtures, never to
 * the detector.
 *
 * None of these is, or ever was, a credential.
 */

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = LOWER.toUpperCase();
const DIGITS = '0123456789';
const RULE = '-'.repeat(5);

/** `sk-` + 24 chars — the OpenAI-style pattern. */
export const SAMPLE_OPENAI_KEY = `sk${'-'}${LOWER.slice(0, 24)}`;

/** `AKIA` + 16 uppercase — the AWS access-key pattern. */
export const SAMPLE_AWS_KEY = `AKI${'A'}${UPPER.slice(0, 16)}`;

/** `ghp_` + 32 chars — the GitHub token pattern. */
export const SAMPLE_GITHUB_TOKEN = `ghp${'_'}${LOWER}${DIGITS.slice(0, 6)}`;

/** A whole armoured block, so the block-spanning redaction is exercised. */
export const SAMPLE_PRIVATE_KEY_BLOCK = [
  `${RULE}BEGIN RSA PRIVATE${' '}KEY${RULE}`,
  'MIIE',
  `${RULE}END RSA PRIVATE${' '}KEY${RULE}`,
].join('\n');

/** All four, in `PATTERNS` order — one per shape the scanner knows. */
export const SAMPLE_CREDENTIALS = [
  { name: 'OpenAI-style key', token: SAMPLE_OPENAI_KEY },
  { name: 'AWS access key', token: SAMPLE_AWS_KEY },
  { name: 'GitHub token', token: SAMPLE_GITHUB_TOKEN },
  { name: 'Private key block', token: SAMPLE_PRIVATE_KEY_BLOCK },
] as const;
