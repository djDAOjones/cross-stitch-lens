/**
 * M14 UI-baseline byte-identity tripwire (M14-AUDIT-01 → M14-VERIFY-02).
 *
 * M14 is a UI-only milestone: engine, worker and export outputs must
 * stay byte-identical throughout (D73). This test pins the reference
 * behaviour at audit time so every later task re-proves it by running
 * `check`:
 *
 * - the committed fixture PNG (the source the browser-side export
 *   captures import) is byte-stable;
 * - the reference pipeline output (pixels + palette-index sidecar) for
 *   the app-default configuration over that source is byte-stable;
 * - the serialized default project file is byte-stable (schema and
 *   field order — the browser-saved file differs only in the
 *   viewport-derived `preview.cssPxPerStitch`, compared field-wise in
 *   M14-VERIFY-02, not by hash).
 *
 * **Fails closed** (TEST-01). This suite used to write the fixture and
 * any absent hash on the fly and pass. Bootstrap-if-absent was
 * deliberate and documented, but it made the tripwire unable to detect
 * the one loss it exists to catch: delete `hashes.json` and the run
 * went green having re-derived the oracle from the very code it was
 * meant to be checking. A missing or incomplete oracle is now a hard
 * failure naming the regenerator. The regenerator is
 * `npm run baseline:write` — never run by CI, and the artefacts are
 * protected files under the golden-fixture rule (AGENTS.md): a hash
 * mismatch inside a UI-only milestone is a defect, never a fixture to
 * refresh.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  BASELINE_KEYS,
  computeBaseline,
  sha256,
  type BaselineHashes,
} from './reference.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pngPath = join(here, 'source-gradient-256.png');
const hashesPath = join(here, 'hashes.json');

const REGENERATE = 'npm run baseline:write';

/**
 * Load the committed oracle, or throw naming what is missing. Never
 * writes, never fills a gap: a tripwire that can author its own
 * expectations proves only that the code agrees with itself.
 */
function committedHashes(path: string = hashesPath): BaselineHashes {
  if (!existsSync(path)) {
    throw new Error(
      `UI baseline oracle missing: ${path} does not exist. ` +
        `This is a lost fixture, not a fresh start — restore it from git, ` +
        `or regenerate deliberately with \`${REGENERATE}\` (owner approval required).`,
    );
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<BaselineHashes>;
  const missing = BASELINE_KEYS.filter((key) => typeof parsed[key] !== 'string');
  if (missing.length > 0) {
    throw new Error(
      `UI baseline oracle incomplete: ${path} is missing ${missing.join(', ')}. ` +
        `Restore it from git, or regenerate with \`${REGENERATE}\`.`,
    );
  }
  return parsed as BaselineHashes;
}

describe('M14 UI baseline (byte-identity tripwire)', () => {
  let expected: BaselineHashes;
  let actual: BaselineHashes;

  beforeAll(() => {
    expected = committedHashes();
    actual = computeBaseline();
  });

  it('has a committed fixture PNG', () => {
    expect(existsSync(pngPath), `${pngPath} is missing — restore it from git`).toBe(true);
  });

  it('pins the committed fixture PNG', () => {
    const committed = new Uint8Array(readFileSync(pngPath));
    // Two claims, deliberately: the file on disk has not changed, and
    // it is still what the seeded source encodes to.
    expect(sha256(committed)).toBe(expected.sourcePng);
    expect(actual.sourcePng).toBe(expected.sourcePng);
  });

  it('pins the reference pipeline output for the default config', () => {
    expect(actual.outputPixels).toBe(expected.outputPixels);
    expect(actual.outputIndices).toBe(expected.outputIndices);
  });

  it('pins the serialized default project file', () => {
    expect(actual.projectJson).toBe(expected.projectJson);
  });
});

describe('the tripwire fails closed (TEST-01)', () => {
  it('names every artefact it pins', () => {
    expect(BASELINE_KEYS).toHaveLength(4);
    expect(Object.keys(computeBaseline()).sort()).toEqual([...BASELINE_KEYS].sort());
  });

  it('refuses an absent oracle instead of writing one', () => {
    const absent = join(here, 'hashes.does-not-exist.json');
    expect(() => committedHashes(absent)).toThrow(/oracle missing/);
    // The refusal must not have created it — that is the whole defect.
    expect(existsSync(absent)).toBe(false);
  });

  it('refuses a partial oracle, naming the keys that are gone', () => {
    const partial = join(tmpdir(), `pm-baseline-partial-${String(process.pid)}.json`);
    writeFileSync(partial, JSON.stringify({ sourcePng: 'abc' }));
    try {
      expect(() => committedHashes(partial)).toThrow(
        /incomplete.*outputPixels, outputIndices, projectJson/s,
      );
    } finally {
      rmSync(partial, { force: true });
    }
  });

  it('accepts only a complete oracle', () => {
    const complete = join(tmpdir(), `pm-baseline-complete-${String(process.pid)}.json`);
    writeFileSync(complete, JSON.stringify(computeBaseline()));
    try {
      expect(committedHashes(complete)).toEqual(computeBaseline());
    } finally {
      rmSync(complete, { force: true });
    }
  });

  it('reads the oracle without ever writing it', () => {
    const before = readFileSync(hashesPath, 'utf8');
    committedHashes();
    expect(readFileSync(hashesPath, 'utf8')).toBe(before);
  });
});
