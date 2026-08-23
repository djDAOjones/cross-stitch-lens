/**
 * Cross-project library storage: the thread inventory and saved
 * palettes (M7-INV-01, M7-PAL-01).
 *
 * This is **library** data, not project data — it outlives any one
 * design, so it lives in IndexedDB rather than in the downloaded
 * project file. The storage adapter stays outside `src/core/`: core
 * consumes a plain immutable set of allowed thread identities and never
 * learns where it came from.
 *
 * Two implementations behind one interface. {@link MemoryStore} is the
 * hermetic one the tests use and the honest fallback when IndexedDB is
 * unavailable or blocked; {@link IdbStore} is the persistent one.
 * Falling back is announced through {@link LibraryStore.persistent},
 * never silently — a user who thinks their inventory is saved and finds
 * it gone next session has lost real work.
 */

import { log } from '../diagnostics/log.ts';
import type { LibraryPalette, ProfileRecord, UserColorRecord } from './records.ts';

/** The storage surface the app needs. All async: IndexedDB is. */
export interface LibraryStore {
  /** False when writes will not survive a reload (memory fallback). */
  readonly persistent: boolean;
  loadOwned(): Promise<Set<string>>;
  saveOwned(owned: ReadonlySet<string>): Promise<void>;
  listPalettes(): Promise<LibraryPalette[]>;
  putPalette(palette: LibraryPalette): Promise<void>;
  deletePalette(id: string): Promise<void>;
  /** Profiles of one kind, kind-opaque payloads (M15-PERSIST-01). */
  listProfiles(kind: string): Promise<ProfileRecord[]>;
  /** Rejects `builtin:` ids — immutability pinned at the store level. */
  putProfile(record: ProfileRecord): Promise<void>;
  deleteProfile(kind: string, id: string): Promise<void>;
  /** The global My-colours library (D115). */
  listUserColors(): Promise<UserColorRecord[]>;
  putUserColor(record: UserColorRecord): Promise<void>;
  deleteUserColor(id: string): Promise<void>;
}

/** The one gate every write path shares: built-ins never persist. */
function rejectBuiltin(id: string): Error | null {
  return id.startsWith('builtin:')
    ? new Error('Built-in profiles are read-only — duplicate one to edit it.')
    : null;
}

/** In-memory store: tests, and the fallback when IndexedDB is refused. */
export class MemoryStore implements LibraryStore {
  readonly persistent = false;
  private owned = new Set<string>();
  private readonly palettes = new Map<string, LibraryPalette>();

  loadOwned(): Promise<Set<string>> {
    return Promise.resolve(new Set(this.owned));
  }

  saveOwned(owned: ReadonlySet<string>): Promise<void> {
    this.owned = new Set(owned);
    return Promise.resolve();
  }

  listPalettes(): Promise<LibraryPalette[]> {
    return Promise.resolve(
      [...this.palettes.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
  }

  putPalette(palette: LibraryPalette): Promise<void> {
    this.palettes.set(palette.id, { ...palette, threadIds: [...palette.threadIds] });
    return Promise.resolve();
  }

  deletePalette(id: string): Promise<void> {
    this.palettes.delete(id);
    return Promise.resolve();
  }

  private readonly profiles = new Map<string, ProfileRecord>();
  private readonly userColors = new Map<string, UserColorRecord>();

  listProfiles(kind: string): Promise<ProfileRecord[]> {
    return Promise.resolve(
      [...this.profiles.values()]
        .filter((p) => p.kind === kind)
        .sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
  }

  putProfile(record: ProfileRecord): Promise<void> {
    const rejected = rejectBuiltin(record.id);
    if (rejected !== null) return Promise.reject(rejected);
    this.profiles.set(`${record.kind}:${record.id}`, { ...record });
    return Promise.resolve();
  }

  deleteProfile(kind: string, id: string): Promise<void> {
    this.profiles.delete(`${kind}:${id}`);
    return Promise.resolve();
  }

  listUserColors(): Promise<UserColorRecord[]> {
    return Promise.resolve(
      [...this.userColors.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
  }

  putUserColor(record: UserColorRecord): Promise<void> {
    this.userColors.set(record.id, { ...record, rgb: [...record.rgb] });
    return Promise.resolve();
  }

  deleteUserColor(id: string): Promise<void> {
    this.userColors.delete(id);
    return Promise.resolve();
  }
}

/** Database and store names. Bump `DB_VERSION` with an upgrade step. */
/**
 * **Deliberately NOT renamed at RENAME-01** (D150), and not an oversight.
 *
 * IndexedDB has no rename: changing this string does not move a
 * database, it points at a different, empty one. Migrating would mean
 * opening both, copying four object stores — including the owner's
 * hand-curated thread inventory and their saved profiles — and keeping
 * that copy path forever, all to change an identifier no user ever sees.
 * A data-copy migration over hand-curated data cannot be justified by
 * tidiness, so the storage identifier keeps the app's original name.
 *
 * This is the ordinary practice for storage keys: they outlive product
 * names. If it is ever renamed, the copy must be verified before the old
 * database is dropped — and it should be dropped in a later release, not
 * the same one.
 */
const DB_NAME = 'cross-stitch-lens';
/** v3 (M15-PERSIST-01): the kind-aware profiles store + My colours.
 *  (v2 existed only as a dev-session intermediate; the idempotent
 *  upgrade below heals any database that saw it.) */
const DB_VERSION = 3;
const OWNED_STORE = 'inventory';
const PALETTE_STORE = 'palettes';
const PROFILE_STORE = 'profiles';
const USER_COLOR_STORE = 'user-colors';
/** Single-row key in the inventory store; the set is written whole. */
const OWNED_KEY = 'owned';

/** Promisify one IDBRequest (shared with the design history, `snapshots.ts`). */
export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

/** IndexedDB-backed library store. */
export class IdbStore implements LibraryStore {
  readonly persistent = true;

  private constructor(private readonly db: IDBDatabase) {}

  /**
   * Open the database, creating or upgrading its stores.
   *
   * Rejects rather than hanging when the upgrade is `blocked` — another
   * tab holding an old connection is a real, reportable state, and a
   * silent hang here would look to the user like the app had frozen.
   * This connection also closes itself on `versionchange` so it is
   * never the tab blocking somebody else's upgrade.
   */
  static open(factory: IDBFactory): Promise<IdbStore> {
    return new Promise((resolve, reject) => {
      const req = factory.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OWNED_STORE)) db.createObjectStore(OWNED_STORE);
        if (!db.objectStoreNames.contains(PALETTE_STORE)) {
          db.createObjectStore(PALETTE_STORE, { keyPath: 'id' });
        }
        // v2 (M15-PERSIST-01): kind-aware profiles + the My-colours
        // library. Additive — existing stores and data untouched.
        if (!db.objectStoreNames.contains(PROFILE_STORE)) {
          db.createObjectStore(PROFILE_STORE, { keyPath: ['kind', 'id'] });
        }
        if (!db.objectStoreNames.contains(USER_COLOR_STORE)) {
          db.createObjectStore(USER_COLOR_STORE, { keyPath: 'id' });
        }
      };
      req.onblocked = () => {
        reject(
          new Error(
            'Another tab of Pattern Mapper is holding the library database open. Close it and reload.',
          ),
        );
      };
      req.onerror = () => {
        reject(req.error ?? new Error('IndexedDB could not be opened'));
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          log.warn('library', 'database closed for an upgrade in another tab');
        };
        resolve(new IdbStore(db));
      };
    });
  }

  async loadOwned(): Promise<Set<string>> {
    const tx = this.db.transaction(OWNED_STORE, 'readonly');
    const value = await request<unknown>(tx.objectStore(OWNED_STORE).get(OWNED_KEY));
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((id): id is string => typeof id === 'string'));
  }

  async saveOwned(owned: ReadonlySet<string>): Promise<void> {
    const tx = this.db.transaction(OWNED_STORE, 'readwrite');
    await request(tx.objectStore(OWNED_STORE).put([...owned], OWNED_KEY));
  }

  async listPalettes(): Promise<LibraryPalette[]> {
    const tx = this.db.transaction(PALETTE_STORE, 'readonly');
    const all = await request<unknown[]>(tx.objectStore(PALETTE_STORE).getAll());
    return all.filter((p): p is LibraryPalette => isPalette(p));
  }

  async putPalette(palette: LibraryPalette): Promise<void> {
    const tx = this.db.transaction(PALETTE_STORE, 'readwrite');
    await request(tx.objectStore(PALETTE_STORE).put(palette));
  }

  async deletePalette(id: string): Promise<void> {
    const tx = this.db.transaction(PALETTE_STORE, 'readwrite');
    await request(tx.objectStore(PALETTE_STORE).delete(id));
  }

  async listProfiles(kind: string): Promise<ProfileRecord[]> {
    const tx = this.db.transaction(PROFILE_STORE, 'readonly');
    const all = await request<unknown[]>(tx.objectStore(PROFILE_STORE).getAll());
    return all
      .filter((p): p is ProfileRecord => isProfileRecord(p))
      .filter((p) => p.kind === kind)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async putProfile(record: ProfileRecord): Promise<void> {
    const rejected = rejectBuiltin(record.id);
    if (rejected !== null) throw rejected;
    const tx = this.db.transaction(PROFILE_STORE, 'readwrite');
    await request(tx.objectStore(PROFILE_STORE).put(record));
  }

  async deleteProfile(kind: string, id: string): Promise<void> {
    const tx = this.db.transaction(PROFILE_STORE, 'readwrite');
    await request(tx.objectStore(PROFILE_STORE).delete([kind, id]));
  }

  async listUserColors(): Promise<UserColorRecord[]> {
    const tx = this.db.transaction(USER_COLOR_STORE, 'readonly');
    const all = await request<unknown[]>(tx.objectStore(USER_COLOR_STORE).getAll());
    return all
      .filter((c): c is UserColorRecord => isUserColor(c))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  async putUserColor(record: UserColorRecord): Promise<void> {
    const tx = this.db.transaction(USER_COLOR_STORE, 'readwrite');
    await request(tx.objectStore(USER_COLOR_STORE).put(record));
  }

  async deleteUserColor(id: string): Promise<void> {
    const tx = this.db.transaction(USER_COLOR_STORE, 'readwrite');
    await request(tx.objectStore(USER_COLOR_STORE).delete(id));
  }
}

/** Shape guard for a profile record read back out of IndexedDB. */
function isProfileRecord(value: unknown): value is ProfileRecord {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw['kind'] === 'string' &&
    typeof raw['id'] === 'string' &&
    typeof raw['name'] === 'string' &&
    typeof raw['revision'] === 'number'
  );
}

/** Shape guard for a user colour read back out of IndexedDB. */
function isUserColor(value: unknown): value is UserColorRecord {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return typeof raw['id'] === 'string' && Array.isArray(raw['rgb']) && raw['rgb'].length === 3;
}

/** Shape guard for a record read back out of IndexedDB. */
function isPalette(value: unknown): value is LibraryPalette {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw['id'] === 'string' &&
    typeof raw['name'] === 'string' &&
    Array.isArray(raw['threadIds'])
  );
}

/**
 * Open the persistent store, falling back to memory with a logged
 * reason. The caller reads `persistent` to tell the user whether their
 * library is actually being kept.
 */
export async function openLibrary(factory?: IDBFactory): Promise<LibraryStore> {
  if (factory === undefined) {
    log.warn('library', 'IndexedDB unavailable — library is session-only');
    return new MemoryStore();
  }
  try {
    return await IdbStore.open(factory);
  } catch (error) {
    log.error('library', 'IndexedDB failed — library is session-only', {
      message: error instanceof Error ? error.message : String(error),
    });
    return new MemoryStore();
  }
}
