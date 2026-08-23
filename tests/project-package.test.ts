/**
 * The project package (DUR-01, D171): a store-only zip holding
 * `project.json` beside the picture, bytes verbatim.
 *
 * The invariants that matter: save → load → save is byte-identical
 * (AGENTS.md), which needs fixed timestamps and a fixed layout; the
 * picture's bytes come back exactly as they went in; legacy `.json`
 * files still load; and a package from a download folder is untrusted
 * input, so every malformed shape is refused with a sentence naming
 * the cause, and every size is checked before anything is allocated.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildPackage,
  crc32,
  detectProjectFormat,
  MAX_PACKAGE_ENTRIES,
  parsePackage,
  PROJECT_ENTRY,
  readProjectBytes,
  sourceEntryName,
  writeProjectBytes,
} from '../src/core/project-package.ts';
import { parseProject, serializeProject } from '../src/core/project.ts';
import { sampleProject } from './helpers/project-fixture.ts';

const here = dirname(fileURLToPath(import.meta.url));

/** A real PNG: the committed UI-baseline fixture. */
function fixturePng(): Uint8Array {
  return new Uint8Array(readFileSync(join(here, 'ui-baseline', 'source-gradient-256.png')));
}

/** Deterministic bytes covering every value 0–255 (LCG, no Math.random). */
function noise(length: number, seed = 7): Uint8Array {
  const out = new Uint8Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[i] = state >>> 24;
  }
  return out;
}

const text = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('crc32', () => {
  it('matches the published check values', () => {
    expect(crc32(new Uint8Array())).toBe(0);
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(text('a'))).toBe(0xe8b7be43);
  });
});

describe('detectProjectFormat', () => {
  it('knows a package by the zip local-header signature', () => {
    expect(detectProjectFormat(buildPackage([{ name: 'a', bytes: text('x') }]))).toBe('package');
  });

  it('knows a JSON document, through a byte-order mark and whitespace', () => {
    expect(detectProjectFormat(text('{"schemaVersion":1}'))).toBe('json');
    expect(detectProjectFormat(text('  \n\t{'))).toBe('json');
    expect(detectProjectFormat(new Uint8Array([0xef, 0xbb, 0xbf, 0x20, 0x7b]))).toBe('json');
  });

  it('refuses to guess at anything else', () => {
    expect(detectProjectFormat(new Uint8Array())).toBe('unknown');
    expect(detectProjectFormat(text('hello'))).toBe('unknown');
    // An empty zip starts with the end record, not a local header.
    expect(detectProjectFormat(text('PK\x05\x06'))).toBe('unknown');
    expect(detectProjectFormat(text('[1]'))).toBe('unknown');
  });
});

describe('buildPackage / parsePackage', () => {
  it('round-trips entries verbatim, in order, including a real PNG', () => {
    const png = fixturePng();
    const bytes = noise(10_000);
    const entries = parsePackage(
      buildPackage([
        { name: PROJECT_ENTRY, bytes: text('{}') },
        { name: 'source.png', bytes: png },
        { name: 'noise.bin', bytes },
      ]),
    );
    expect([...entries.keys()]).toEqual([PROJECT_ENTRY, 'source.png', 'noise.bin']);
    expect(entries.get('source.png')).toEqual(png);
    expect(entries.get('noise.bin')).toEqual(bytes);
    expect(new TextDecoder().decode(entries.get(PROJECT_ENTRY))).toBe('{}');
  });

  it('hands back independent copies, never views into the package', () => {
    const bytes = noise(64);
    const pkg = buildPackage([{ name: 'a', bytes }]);
    const copy = parsePackage(pkg).get('a');
    expect(copy?.buffer).not.toBe(pkg.buffer);
    expect(copy?.byteLength).toBe(64);
  });

  it('is deterministic: the clock is not an input', () => {
    const entries = [{ name: 'a', bytes: noise(100) }];
    const first = buildPackage(entries);
    const second = buildPackage(entries);
    expect(second).toEqual(first);
    // The fixed DOS stamp — 1980-01-01 00:00 — in the local header
    // (offsets 10–13) and the central directory's copy.
    expect([...first.subarray(10, 14)]).toEqual([0x00, 0x00, 0x21, 0x00]);
    const central = first.length - 22 - 46 - 1;
    expect([...first.subarray(central + 12, central + 16)]).toEqual([0x00, 0x00, 0x21, 0x00]);
  });

  it('stores, never compresses, and ends with an end record', () => {
    const pkg = buildPackage([{ name: 'a', bytes: text('aaaaaaaaaaaaaaaaaaaaaaaaaaaa') }]);
    const view = new DataView(pkg.buffer);
    expect(view.getUint16(8, true)).toBe(0); // method: store
    expect(view.getUint32(pkg.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(pkg.length - 22 + 10, true)).toBe(1); // one entry
  });

  it('refuses duplicate and empty names and too many entries before writing', () => {
    expect(() =>
      buildPackage([
        { name: 'a', bytes: text('1') },
        { name: 'a', bytes: text('2') },
      ]),
    ).toThrow('appears twice');
    expect(() => buildPackage([{ name: '', bytes: text('1') }])).toThrow('name');
    const many = Array.from({ length: MAX_PACKAGE_ENTRIES + 1 }, (_, i) => ({
      name: `e${String(i)}`,
      bytes: text('x'),
    }));
    expect(() => buildPackage(many)).toThrow('at most');
  });

  describe('refusals name their cause', () => {
    const good = (): Uint8Array =>
      buildPackage([
        { name: PROJECT_ENTRY, bytes: text('{"a":1}') },
        { name: 'source.png', bytes: noise(200) },
      ]);

    it('too short or no end record', () => {
      expect(() => parsePackage(new Uint8Array(10))).toThrow('too short');
      expect(() => parsePackage(good().subarray(0, good().length - 5))).toThrow(
        'end-of-directory',
      );
    });

    it('a compressed entry', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      // Flip the method in the local header and its directory copy.
      view.setUint16(8, 8, true);
      const central = view.getUint32(pkg.length - 22 + 16, true);
      view.setUint16(central + 10, 8, true);
      expect(() => parsePackage(pkg)).toThrow('compressed');
    });

    it('an encrypted entry', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      const central = view.getUint32(pkg.length - 22 + 16, true);
      view.setUint16(central + 8, 1, true);
      expect(() => parsePackage(pkg)).toThrow('encrypted');
    });

    it('a damaged entry (checksum mismatch)', () => {
      const pkg = good();
      // Inside the first entry's data, after its 30-byte header + name.
      const at = 30 + PROJECT_ENTRY.length + 2;
      pkg[at] = (pkg[at] ?? 0) ^ 0xff;
      expect(() => parsePackage(pkg)).toThrow('checksum');
    });

    it('zip64 markers', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      view.setUint16(pkg.length - 22 + 10, 0xffff, true);
      view.setUint16(pkg.length - 22 + 8, 0xffff, true);
      expect(() => parsePackage(pkg)).toThrow('zip64');
    });

    it('a directory that points outside the file', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      view.setUint32(pkg.length - 22 + 16, pkg.length, true);
      expect(() => parsePackage(pkg)).toThrow('truncated');
    });

    it('an entry count over the cap, before any entry is read', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      view.setUint16(pkg.length - 22 + 8, MAX_PACKAGE_ENTRIES + 1, true);
      view.setUint16(pkg.length - 22 + 10, MAX_PACKAGE_ENTRIES + 1, true);
      expect(() => parsePackage(pkg)).toThrow('at most');
    });

    it('an entry larger than the cap, before it is copied', () => {
      const pkg = good();
      const view = new DataView(pkg.buffer);
      const central = view.getUint32(pkg.length - 22 + 16, true);
      view.setUint32(central + 20, 0x7fffffff, true);
      view.setUint32(central + 24, 0x7fffffff, true);
      expect(() => parsePackage(pkg)).toThrow('larger than');
    });
  });
});

describe('writeProjectBytes / readProjectBytes', () => {
  it('save → load → save is byte-identical, picture verbatim', () => {
    const file = sampleProject();
    const picture = noise(5_000, 99);
    const saved = writeProjectBytes(file, picture);
    const loaded = readProjectBytes(saved);
    expect(loaded.format).toBe('package');
    expect(loaded.file).toEqual(file);
    expect(loaded.source).toEqual(picture);
    expect(writeProjectBytes(loaded.file, loaded.source)).toEqual(saved);
  });

  it('round-trips a real PNG and a settings-only package', () => {
    const png = fixturePng();
    const withPng = sampleProject();
    withPng.source = { entry: 'source.png', type: 'image/png', name: 'gradient.png' };
    const saved = writeProjectBytes(withPng, png);
    const back = readProjectBytes(saved);
    expect(back.source).toEqual(png);
    expect(writeProjectBytes(back.file, back.source)).toEqual(saved);

    const settingsOnly = sampleProject();
    settingsOnly.source = null;
    const bare = writeProjectBytes(settingsOnly, null);
    const loaded = readProjectBytes(bare);
    expect(loaded.source).toBeNull();
    expect(parsePackage(bare).size).toBe(1);
    expect(writeProjectBytes(loaded.file, null)).toEqual(bare);
  });

  it('reads a legacy JSON document as settings only', () => {
    const file = sampleProject();
    file.source = null;
    const json = serializeProject(file);
    for (const bytes of [text(json), text(`\uFEFF${json}`), text(`\n  ${json}`)]) {
      const loaded = readProjectBytes(bytes);
      expect(loaded.format).toBe('json');
      expect(loaded.source).toBeNull();
      expect(loaded.file).toEqual(file);
    }
    // A v9 document through the same door, migrated, settings only.
    const v9 = JSON.parse(json) as Record<string, unknown>;
    delete v9['source'];
    v9['schemaVersion'] = 9;
    const migrated = readProjectBytes(text(JSON.stringify(v9)));
    expect(migrated.file.migratedFrom).toBe(9);
    expect(migrated.file.source).toBeNull();
  });

  it('loads the settings when the named picture is missing (user data is never refused whole)', () => {
    const file = sampleProject();
    const pkg = buildPackage([{ name: PROJECT_ENTRY, bytes: text(serializeProject(file)) }]);
    const loaded = readProjectBytes(pkg);
    expect(loaded.file.source).toEqual(file.source);
    expect(loaded.source).toBeNull();
  });

  it('refuses a package without its document, and a file of neither format', () => {
    expect(() => readProjectBytes(buildPackage([{ name: 'x', bytes: text('1') }]))).toThrow(
      PROJECT_ENTRY,
    );
    expect(() => readProjectBytes(text('hello'))).toThrow('not a Pattern Mapper project');
  });

  it('still validates the document inside a package, naming the path', () => {
    const doc = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    (doc['pipeline'] as Record<string, unknown>)['preset'] = 'sideways';
    const pkg = buildPackage([{ name: PROJECT_ENTRY, bytes: text(JSON.stringify(doc)) }]);
    expect(() => readProjectBytes(pkg)).toThrow('pipeline.preset');
    // And the plain parser agrees on the same document.
    expect(() => parseProject(JSON.stringify(doc))).toThrow('pipeline.preset');
  });

  it('refuses to write a document that names a picture it was not given', () => {
    expect(() => writeProjectBytes(sampleProject(), null)).toThrow('names a picture');
  });
});

describe('sourceEntryName', () => {
  it('names the entry from the MIME type, with a neutral fallback', () => {
    expect(sourceEntryName('image/png')).toBe('source.png');
    expect(sourceEntryName('image/jpeg')).toBe('source.jpg');
    expect(sourceEntryName('IMAGE/WEBP')).toBe('source.webp');
    expect(sourceEntryName('application/octet-stream')).toBe('source.img');
  });
});
