/**
 * The project package (DUR-01, D171): one shareable file holding the
 * settings document (`project.json`, see `project.ts`) beside the
 * design's picture, bytes verbatim.
 *
 * It is a **store-only zip** — local headers, a central directory, an
 * end record, CRC-32 and no compression — so it needs no codec and no
 * dependency, any archive tool opens it to read the JSON, and the
 * picture inside is the exact file the user imported (a JPEG stays a
 * JPEG; nothing is re-encoded). Two choices keep save → load → save
 * byte-identical, the AGENTS.md invariant:
 *
 * - **Fixed timestamps.** Zip entries carry a modification time, and
 *   writing "now" would make two saves of an unchanged project differ.
 *   Every entry is stamped 1980-01-01 00:00 — the DOS epoch — so the
 *   clock is not an input here at all.
 * - **Fixed layout.** `project.json` first, the picture second; no extra
 *   fields, no comments, no data descriptors.
 *
 * The reader is the outer gate for untrusted input — a package arrives
 * from a download folder, not from this app (AGENTS.md → "Correctness
 * & data"). Every count and size is read from the central directory
 * and checked against the caps below *before* a byte is copied, and
 * every entry's CRC is verified. Compressed, encrypted, zip64,
 * multi-disk and truncated packages are refused with a sentence naming
 * the cause — never misread.
 *
 * Pure bytes in, bytes out: nothing here touches I/O, the DOM, or the
 * clock. `TextEncoder`/`TextDecoder` are WHATWG globals every runtime
 * provides; this is their first use inside `src/core/`.
 */

import {
  parseProject,
  PROJECT_EXTENSION,
  serializeProject,
  type ProjectFile,
} from './project.ts';

/** The settings document's entry name inside a package. */
export const PROJECT_ENTRY = 'project.json';
/** Hostile-input cap: a package carries two entries; sixteen is generous. */
export const MAX_PACKAGE_ENTRIES = 16;
/** Hostile-input cap per entry: a 12k × 12k PNG is ~200 MB. */
export const MAX_ENTRY_BYTES = 256 * 1024 * 1024;

/** What a project file's first bytes say it is. */
export type ProjectFormat = 'package' | 'json' | 'unknown';

/** One package entry: a name and its bytes, stored verbatim. */
export interface PackageEntry {
  name: string;
  bytes: Uint8Array;
}

/** A read project: the validated document plus its picture, if any. */
export interface ProjectBytes {
  file: ProjectFile;
  /**
   * The picture's bytes when `file.source` names an entry the package
   * holds; null for a settings-only file — and for a package whose
   * document names an entry it lacks (an unzipped, hand-edited file),
   * which loads as settings rather than failing whole (user data).
   */
  source: Uint8Array<ArrayBuffer> | null;
  format: 'package' | 'json';
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_RECORD = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;
/** Longest zip comment a reader must scan past to find the end record. */
const MAX_COMMENT = 0xffff;
/** DOS time/date for 1980-01-01 00:00:00 — the fixed stamp. */
const DOS_TIME = 0x0000;
const DOS_DATE = 0x0021;
/** "Version needed to extract": 1.0 suffices for stored entries. */
const VERSION_NEEDED = 10;
/** "Version made by": MS-DOS host (attributes mean nothing), spec 2.0. */
const VERSION_MADE_BY = 20;
const METHOD_STORE = 0;
const FLAG_ENCRYPTED = 0x0001;
/** Zip64 sentinel in any 16/32-bit size or count field. */
const ZIP64_16 = 0xffff;
const ZIP64_32 = 0xffffffff;

let crcTable: Uint32Array | null = null;

/** The CRC-32 lookup table, built once on first use. */
function table(): Uint32Array {
  if (crcTable !== null) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}

/** CRC-32 (the zip polynomial) of `bytes`, as an unsigned 32-bit value. */
export function crc32(bytes: Uint8Array): number {
  const t = table();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (t[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Classify a project file by its first bytes: the zip local-header
 * signature (`PK\x03\x04`) is a package; a `{` after an optional UTF-8
 * byte-order mark and whitespace is a legacy JSON document. Anything
 * else is refused upstream with a sentence, never guessed at.
 */
export function detectProjectFormat(bytes: Uint8Array): ProjectFormat {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return 'package';
  }
  let i = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) {
      i += 1;
      continue;
    }
    return b === 0x7b ? 'json' : 'unknown';
  }
  return 'unknown';
}

/**
 * The entry name a picture takes inside a package, from its MIME type:
 * the extension says what the bytes are to a human who unzips the
 * file; the decoder sniffs the content and never trusts the name.
 */
export function sourceEntryName(type: string): string {
  const extensions: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
    'image/tiff': '.tif',
    'image/heic': '.heic',
  };
  return `source${extensions[type.toLowerCase()] ?? '.img'}`;
}

/**
 * Write a store-only package: fixed stamps, entries in the given
 * order, no extras. Names must be unique and non-empty; sizes are
 * bounded by the same caps the reader enforces, so a package this
 * writes is always one it reads.
 */
export function buildPackage(entries: readonly PackageEntry[]): Uint8Array<ArrayBuffer> {
  if (entries.length > MAX_PACKAGE_ENTRIES) {
    throw new Error(`a package holds at most ${String(MAX_PACKAGE_ENTRIES)} entries`);
  }
  const encoder = new TextEncoder();
  const names = entries.map((entry) => encoder.encode(entry.name));
  const seen = new Set<string>();
  let localSize = 0;
  let centralSize = 0;
  entries.forEach((entry, i) => {
    const name = names[i] ?? new Uint8Array();
    if (name.length === 0 || name.length > ZIP64_16 - 1) {
      throw new Error('a package entry needs a name of 1–65534 bytes');
    }
    if (seen.has(entry.name)) throw new Error(`“${entry.name}” appears twice`);
    seen.add(entry.name);
    if (entry.bytes.length > MAX_ENTRY_BYTES) {
      throw new Error(`“${entry.name}” is larger than a package entry may be`);
    }
    localSize += LOCAL_HEADER_SIZE + name.length + entry.bytes.length;
    centralSize += CENTRAL_HEADER_SIZE + name.length;
  });
  const out = new Uint8Array(localSize + centralSize + END_RECORD_SIZE);
  const view = new DataView(out.buffer);
  const crcs = entries.map((entry) => crc32(entry.bytes));
  const offsets: number[] = [];
  let pos = 0;
  entries.forEach((entry, i) => {
    const name = names[i] ?? new Uint8Array();
    offsets.push(pos);
    view.setUint32(pos, LOCAL_HEADER, true);
    view.setUint16(pos + 4, VERSION_NEEDED, true);
    view.setUint16(pos + 6, 0, true);
    view.setUint16(pos + 8, METHOD_STORE, true);
    view.setUint16(pos + 10, DOS_TIME, true);
    view.setUint16(pos + 12, DOS_DATE, true);
    view.setUint32(pos + 14, crcs[i] ?? 0, true);
    view.setUint32(pos + 18, entry.bytes.length, true);
    view.setUint32(pos + 22, entry.bytes.length, true);
    view.setUint16(pos + 26, name.length, true);
    view.setUint16(pos + 28, 0, true);
    out.set(name, pos + LOCAL_HEADER_SIZE);
    out.set(entry.bytes, pos + LOCAL_HEADER_SIZE + name.length);
    pos += LOCAL_HEADER_SIZE + name.length + entry.bytes.length;
  });
  const centralStart = pos;
  entries.forEach((entry, i) => {
    const name = names[i] ?? new Uint8Array();
    view.setUint32(pos, CENTRAL_HEADER, true);
    view.setUint16(pos + 4, VERSION_MADE_BY, true);
    view.setUint16(pos + 6, VERSION_NEEDED, true);
    view.setUint16(pos + 8, 0, true);
    view.setUint16(pos + 10, METHOD_STORE, true);
    view.setUint16(pos + 12, DOS_TIME, true);
    view.setUint16(pos + 14, DOS_DATE, true);
    view.setUint32(pos + 16, crcs[i] ?? 0, true);
    view.setUint32(pos + 20, entry.bytes.length, true);
    view.setUint32(pos + 24, entry.bytes.length, true);
    view.setUint16(pos + 28, name.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, offsets[i] ?? 0, true);
    out.set(name, pos + CENTRAL_HEADER_SIZE);
    pos += CENTRAL_HEADER_SIZE + name.length;
  });
  view.setUint32(pos, END_RECORD, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, 0, true);
  return out;
}

/**
 * Locate the end-of-central-directory record: the last 22 bytes when
 * there is no archive comment, otherwise up to 65,535 bytes earlier.
 * The comment length must account for exactly the remaining bytes, so
 * a signature that happens to occur inside data is not mistaken for it.
 */
function findEndRecord(bytes: Uint8Array, view: DataView): number {
  const last = bytes.length - END_RECORD_SIZE;
  const first = Math.max(0, last - MAX_COMMENT);
  for (let pos = last; pos >= first; pos--) {
    if (
      view.getUint32(pos, true) === END_RECORD &&
      view.getUint16(pos + 20, true) === bytes.length - pos - END_RECORD_SIZE
    ) {
      return pos;
    }
  }
  return -1;
}

/**
 * Read a store-only package into its entries, each an independent copy
 * of the stored bytes. Every refusal names its cause; every size and
 * count is checked before anything is allocated.
 */
export function parsePackage(bytes: Uint8Array): Map<string, Uint8Array<ArrayBuffer>> {
  if (bytes.length < END_RECORD_SIZE) throw new Error('not a project package (too short)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEndRecord(bytes, view);
  if (end === -1) throw new Error('not a project package (no end-of-directory record)');
  const diskEntries = view.getUint16(end + 8, true);
  const totalEntries = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryStart = view.getUint32(end + 16, true);
  if (totalEntries === ZIP64_16 || directorySize === ZIP64_32 || directoryStart === ZIP64_32) {
    throw new Error('zip64 packages are not supported');
  }
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    diskEntries !== totalEntries
  ) {
    throw new Error('multi-disk archives are not supported');
  }
  if (totalEntries > MAX_PACKAGE_ENTRIES) {
    throw new Error(`a package holds at most ${String(MAX_PACKAGE_ENTRIES)} entries`);
  }
  if (directoryStart + directorySize > end) {
    throw new Error('the package is truncated (its directory is out of range)');
  }
  const decoder = new TextDecoder();
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  let pos = directoryStart;
  for (let i = 0; i < totalEntries; i++) {
    if (pos + CENTRAL_HEADER_SIZE > end || view.getUint32(pos, true) !== CENTRAL_HEADER) {
      throw new Error('the package directory is damaged');
    }
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const storedSize = view.getUint32(pos + 20, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    if (pos + CENTRAL_HEADER_SIZE + nameLength > end) {
      throw new Error('the package directory is damaged');
    }
    const nameStart = pos + CENTRAL_HEADER_SIZE;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if ((flags & FLAG_ENCRYPTED) !== 0) {
      throw new Error(`“${name}” is encrypted — Pattern Mapper packages are never encrypted`);
    }
    if (method !== METHOD_STORE) {
      throw new Error(
        `“${name}” is compressed — Pattern Mapper packages store their entries uncompressed; re-save the project from the app`,
      );
    }
    if (storedSize === ZIP64_32 || size === ZIP64_32 || local === ZIP64_32) {
      throw new Error('zip64 packages are not supported');
    }
    if (storedSize !== size) throw new Error(`“${name}” has mismatched sizes`);
    if (size > MAX_ENTRY_BYTES) {
      throw new Error(
        `“${name}” is larger than the ${String(MAX_ENTRY_BYTES / (1024 * 1024))} MB a package entry may hold`,
      );
    }
    if (entries.has(name)) throw new Error(`“${name}” appears twice`);
    if (local + LOCAL_HEADER_SIZE > directoryStart || view.getUint32(local, true) !== LOCAL_HEADER) {
      throw new Error(`“${name}” has a damaged header`);
    }
    const start =
      local +
      LOCAL_HEADER_SIZE +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    if (start + size > directoryStart) {
      throw new Error(`the package is truncated inside “${name}”`);
    }
    const data = bytes.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`“${name}” is damaged (checksum mismatch)`);
    entries.set(name, data);
    pos += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * Read a project file of either format. A legacy JSON document loads
 * as settings only; a package yields its document plus the picture its
 * `source` block names — or null for that half when the entry is
 * missing, which the caller reports rather than refusing the settings.
 */
export function readProjectBytes(bytes: Uint8Array): ProjectBytes {
  const format = detectProjectFormat(bytes);
  const decoder = new TextDecoder();
  if (format === 'json') {
    return { file: parseProject(decoder.decode(bytes)), source: null, format };
  }
  if (format === 'unknown') {
    throw new Error(
      `not a Pattern Mapper project — expected a ${PROJECT_EXTENSION} package or a .json settings file`,
    );
  }
  const entries = parsePackage(bytes);
  const document = entries.get(PROJECT_ENTRY);
  if (document === undefined) throw new Error(`the package has no ${PROJECT_ENTRY}`);
  const file = parseProject(decoder.decode(document));
  const source = file.source === null ? null : (entries.get(file.source.entry) ?? null);
  return { file, source, format };
}

/**
 * Write a project as a package: the canonical document first, then the
 * picture under the entry the document names. A document that names a
 * picture must be given one — the caller derives both from the same
 * state, so a mismatch is a programming error, not user input.
 */
export function writeProjectBytes(
  file: ProjectFile,
  source: Uint8Array | null,
): Uint8Array<ArrayBuffer> {
  const entries: PackageEntry[] = [
    { name: PROJECT_ENTRY, bytes: new TextEncoder().encode(serializeProject(file)) },
  ];
  if (file.source !== null) {
    if (source === null) {
      throw new Error(`the project names a picture (${file.source.entry}) but none was given`);
    }
    entries.push({ name: file.source.entry, bytes: source });
  }
  return buildPackage(entries);
}
