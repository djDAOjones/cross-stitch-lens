/**
 * Library file formats: the versioned, canonical JSON the user can
 * export and re-import for their thread inventory and saved palettes
 * (M7-INV-01, M7-PAL-01).
 *
 * This module is pure — parse, validate, serialise, merge — with no
 * storage in it at all, because import/export is the *safety* contract
 * for library data, not a convenience feature: browser storage can be
 * cleared or evicted without warning, and a file the user holds is the
 * only copy that survives that.
 *
 * Imported files are untrusted input. Everything is length-checked
 * before it is walked, unknown fields are ignored (forward-friendly),
 * and unknown thread references are **kept**, never dropped — a
 * catalogue change must not quietly delete somebody's record of what
 * they own.
 */

/** Bumped when a library file's meaning changes. */
export const LIBRARY_SCHEMA_VERSION = 1;

/** Ceiling on any one imported list, checked before iteration. */
export const MAX_LIBRARY_ENTRIES = 8192;

/** Longest accepted thread id / palette name. */
const MAX_STRING = 128;

/** A saved, named palette in the user's library. */
export interface LibraryPalette {
  /** Stable id; never the name, which is a label the user may reuse. */
  id: string;
  name: string;
  /**
   * Incremented on every committed edit. A project stores the revision
   * it rendered against, so reopening can say "the library palette has
   * changed since" instead of silently rendering something else.
   */
  revision: number;
  /** Provenance note, e.g. `"preset:pastel"` or `"copy:pal-3"`. */
  createdFrom: string;
  /** Ordered thread ids. Order is identity-significant (D46). */
  threadIds: string[];
}

/** Describe a schema failure by path, as `project.ts` does. */
function fail(path: string, want: string): never {
  throw new Error(`${path}: expected ${want}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'an object');
  }
  return value as Record<string, unknown>;
}

function asBoundedString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_STRING) {
    fail(path, `a string of 1–${String(MAX_STRING)} characters`);
  }
  return value;
}

/** A bounded array of bounded strings — the shape every id list has. */
function asIdList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, 'an array of thread ids');
  if (value.length > MAX_LIBRARY_ENTRIES) {
    fail(path, `at most ${String(MAX_LIBRARY_ENTRIES)} entries`);
  }
  return value.map((entry, i) => asBoundedString(entry, `${path}[${String(i)}]`));
}

/** Sorted, de-duplicated ids — the canonical form of any owned set. */
function canonicalIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** An exported inventory file. */
export interface InventoryFile {
  schemaVersion: number;
  kind: 'inventory';
  /** Which catalogue the ids were recorded against, for provenance. */
  catalogue: string;
  owned: string[];
}

/**
 * Serialise an inventory to canonical JSON: fixed key order, sorted
 * ids, 2-space indent, trailing newline — so export → import → export
 * is byte-identical regardless of the order things were added in.
 */
export function serializeInventory(
  owned: ReadonlySet<string>,
  catalogue: string,
): string {
  const file: InventoryFile = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'inventory',
    catalogue,
    owned: canonicalIds(owned),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Parse and validate an inventory file. Throws with the failing path. */
export function parseInventory(json: string): InventoryFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = asRecord(raw, 'inventory');
  if (root['kind'] !== 'inventory') {
    fail('inventory.kind', '"inventory" — this looks like a different kind of file');
  }
  const version = root['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    fail('inventory.schemaVersion', 'a whole version number');
  }
  if (version > LIBRARY_SCHEMA_VERSION) {
    throw new Error(
      `inventory.schemaVersion ${String(version)} was written by a newer version of Cross Stitch Lens (this app reads up to ${String(LIBRARY_SCHEMA_VERSION)})`,
    );
  }
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'inventory',
    catalogue: typeof root['catalogue'] === 'string' ? root['catalogue'] : 'unknown',
    owned: canonicalIds(asIdList(root['owned'], 'inventory.owned')),
  };
}

/**
 * Merge an imported inventory into the current one — the additive,
 * non-destructive import. Replace is the caller's separate, confirmed
 * action; it is not offered as a default because it can silently lose
 * threads the user marked on another machine.
 */
export function mergeOwned(
  current: ReadonlySet<string>,
  incoming: Iterable<string>,
): Set<string> {
  return new Set([...current, ...incoming]);
}

/** An exported palette-library file. */
export interface PaletteLibraryFile {
  schemaVersion: number;
  kind: 'palettes';
  palettes: LibraryPalette[];
}

/** Canonical field order for one library palette. */
function canonicalPalette(palette: LibraryPalette): LibraryPalette {
  return {
    id: palette.id,
    name: palette.name,
    revision: palette.revision,
    createdFrom: palette.createdFrom,
    threadIds: [...palette.threadIds],
  };
}

/** Serialise saved palettes to canonical JSON, ordered by id. */
export function serializePalettes(palettes: readonly LibraryPalette[]): string {
  const file: PaletteLibraryFile = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'palettes',
    palettes: [...palettes]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map(canonicalPalette),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * Validate one palette record.
 *
 * Duplicate thread ids within a palette are **coalesced**, keeping the
 * first position, and the count is reported by
 * {@link parsePalettes} — one thread twice in one ordered set is
 * meaningless (index 5 and index 40 would both be DMC 310), whereas two
 * *different* threads that share an RGB is perfectly valid and is left
 * alone (M7-PAL-01).
 */
function asPalette(value: unknown, path: string): { palette: LibraryPalette; coalesced: number } {
  const raw = asRecord(value, path);
  const ids = asIdList(raw['threadIds'], `${path}.threadIds`);
  const unique = [...new Set(ids)];
  const revision = raw['revision'];
  return {
    palette: {
      id: asBoundedString(raw['id'], `${path}.id`),
      name: asBoundedString(raw['name'], `${path}.name`),
      revision:
        typeof revision === 'number' && Number.isInteger(revision) && revision >= 0
          ? revision
          : 1,
      createdFrom:
        typeof raw['createdFrom'] === 'string' ? raw['createdFrom'] : 'import',
      threadIds: unique,
    },
    coalesced: ids.length - unique.length,
  };
}

/** The outcome of importing a palette library. */
export interface PaletteImport {
  palettes: LibraryPalette[];
  /** Duplicate thread ids removed across all palettes, for the UI. */
  coalesced: number;
}

/** Parse and validate a palette-library file. */
export function parsePalettes(json: string): PaletteImport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = asRecord(raw, 'palettes');
  if (root['kind'] !== 'palettes') {
    fail('palettes.kind', '"palettes" — this looks like a different kind of file');
  }
  const list = root['palettes'];
  if (!Array.isArray(list)) fail('palettes.palettes', 'an array of palettes');
  if (list.length > MAX_LIBRARY_ENTRIES) {
    fail('palettes.palettes', `at most ${String(MAX_LIBRARY_ENTRIES)} palettes`);
  }
  let coalesced = 0;
  const palettes = list.map((entry, i) => {
    const parsed = asPalette(entry, `palettes.palettes[${String(i)}]`);
    coalesced += parsed.coalesced;
    return parsed.palette;
  });
  return { palettes, coalesced };
}

/**
 * Resolve an id collision on import by giving the incoming palette a
 * fresh id and a "(imported)" name, rather than overwriting the local
 * one. Losing a palette to a name clash is not recoverable; having two
 * is a five-second cleanup.
 */
export function withFreshId(palette: LibraryPalette, taken: ReadonlySet<string>): LibraryPalette {
  if (!taken.has(palette.id)) return palette;
  let n = 2;
  let id = `${palette.id}-${String(n)}`;
  while (taken.has(id)) {
    n += 1;
    id = `${palette.id}-${String(n)}`;
  }
  return { ...palette, id, name: `${palette.name} (imported)` };
}

// --- profiles (M15-PERSIST-01) --------------------------------------
// The palette pattern generalised, kind-aware from the start (D117):
// the store and the file format treat a profile's payload as opaque —
// the colour kind stores a recipe, the dither kind a complete config
// (M15-DITH-01) — so a second kind mounts with no format change. This
// is the generic import/export the D116 cut line demands: one shape
// for every kind, or none at all.

/** Ceiling on one serialised payload, checked before storing. */
export const MAX_PAYLOAD_JSON = 65536;

/** A stored profile of any kind. Payload meaning belongs to the kind. */
export interface ProfileRecord {
  /** Profile kind, e.g. `"colour"` or `"dither"`. */
  kind: string;
  /** Stable id; `builtin:` ids never reach a store. */
  id: string;
  name: string;
  /** Incremented on every committed edit (the palette revision rule). */
  revision: number;
  /** Provenance note, e.g. `"palette:pal-3"` or `"copy:p-2"`. */
  createdFrom: string;
  /** Kind-opaque content (a recipe, a config). Validated by size and
   *  JSON-serialisability here; by meaning in the kind's own layer. */
  payload: unknown;
}

/** An exported profile file — one kind per file, payloads opaque. */
export interface ProfilesFile {
  schemaVersion: number;
  kind: 'profiles';
  profileKind: string;
  profiles: ProfileRecord[];
}

/** Canonical field order for one profile record. */
function canonicalProfile(record: ProfileRecord): ProfileRecord {
  return {
    kind: record.kind,
    id: record.id,
    name: record.name,
    revision: record.revision,
    createdFrom: record.createdFrom,
    payload: record.payload,
  };
}

/** Validate one profile record (payload bounded, not interpreted). */
function asProfileRecord(value: unknown, path: string, profileKind: string): ProfileRecord {
  const raw = asRecord(value, path);
  const revision = raw['revision'];
  const payload: unknown = raw['payload'] ?? {};
  let payloadJson: string;
  try {
    payloadJson = JSON.stringify(payload);
  } catch {
    fail(`${path}.payload`, 'JSON-serialisable content');
  }
  if (payloadJson.length > MAX_PAYLOAD_JSON) {
    fail(`${path}.payload`, `at most ${String(MAX_PAYLOAD_JSON)} serialised characters`);
  }
  const id = asBoundedString(raw['id'], `${path}.id`);
  if (id.startsWith('builtin:')) {
    fail(`${path}.id`, 'a user profile id — built-ins are read-only and never imported');
  }
  return {
    kind: profileKind,
    id,
    name: asBoundedString(raw['name'], `${path}.name`),
    revision:
      typeof revision === 'number' && Number.isInteger(revision) && revision >= 0 ? revision : 1,
    createdFrom: typeof raw['createdFrom'] === 'string' ? raw['createdFrom'] : 'import',
    payload,
  };
}

/** Serialise profiles of one kind to canonical JSON, ordered by id. */
export function serializeProfiles(
  profileKind: string,
  profiles: readonly ProfileRecord[],
): string {
  const file: ProfilesFile = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'profiles',
    profileKind,
    profiles: [...profiles]
      .filter((p) => p.kind === profileKind && !p.id.startsWith('builtin:'))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map(canonicalProfile),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Parse and validate a profiles file. Throws with the failing path. */
export function parseProfiles(json: string): ProfilesFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = asRecord(raw, 'profiles');
  if (root['kind'] !== 'profiles') {
    fail('profiles.kind', '"profiles" — this looks like a different kind of file');
  }
  const profileKind = asBoundedString(root['profileKind'], 'profiles.profileKind');
  const list = root['profiles'];
  if (!Array.isArray(list)) fail('profiles.profiles', 'an array of profiles');
  if (list.length > MAX_LIBRARY_ENTRIES) {
    fail('profiles.profiles', `at most ${String(MAX_LIBRARY_ENTRIES)} profiles`);
  }
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'profiles',
    profileKind,
    profiles: list.map((entry, i) =>
      asProfileRecord(entry, `profiles.profiles[${String(i)}]`, profileKind),
    ),
  };
}

// --- My colours (M15-PERSIST-01, D115) ------------------------------
// Custom `user:` colours are a global library, available to every
// profile — never trapped in the one that pinned them.

/** One custom colour. Identity is the id; RGB is display data (D55). */
export interface UserColorRecord {
  /** Bare id — the profile pin references it as `user:<id>`. */
  id: string;
  /** 0–255 sRGB. */
  rgb: [number, number, number];
}

/** An exported My-colours file. */
export interface UserColorsFile {
  schemaVersion: number;
  kind: 'user-colors';
  colors: UserColorRecord[];
}

/** Validate one user colour. */
function asUserColor(value: unknown, path: string): UserColorRecord {
  const raw = asRecord(value, path);
  const rgb = raw['rgb'];
  if (
    !Array.isArray(rgb) ||
    rgb.length !== 3 ||
    rgb.some((v) => typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 255)
  ) {
    fail(`${path}.rgb`, 'three 0–255 integers');
  }
  const channels = rgb as number[];
  return {
    id: asBoundedString(raw['id'], `${path}.id`),
    rgb: [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0],
  };
}

/** Serialise the My-colours library to canonical JSON, ordered by id. */
export function serializeUserColors(colors: readonly UserColorRecord[]): string {
  const file: UserColorsFile = {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'user-colors',
    colors: [...colors]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((c) => ({ id: c.id, rgb: [c.rgb[0], c.rgb[1], c.rgb[2]] as [number, number, number] })),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Parse and validate a My-colours file. */
export function parseUserColors(json: string): UserColorsFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  const root = asRecord(raw, 'user-colors');
  if (root['kind'] !== 'user-colors') {
    fail('user-colors.kind', '"user-colors" — this looks like a different kind of file');
  }
  const list = root['colors'];
  if (!Array.isArray(list)) fail('user-colors.colors', 'an array of colours');
  if (list.length > MAX_LIBRARY_ENTRIES) {
    fail('user-colors.colors', `at most ${String(MAX_LIBRARY_ENTRIES)} colours`);
  }
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    kind: 'user-colors',
    colors: list.map((entry, i) => asUserColor(entry, `user-colors.colors[${String(i)}]`)),
  };
}
