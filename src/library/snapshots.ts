/**
 * The design history (DUR-01, D171): the design in progress, kept in
 * the browser as the user works so closing the tab loses nothing, plus
 * the few designs before it — a safety net, never the sharing unit.
 * A saved file survives a storage clear-out and opens anywhere; the
 * history is this browser's memory and says so.
 *
 * Three parts, kept apart so each is honest on its own:
 *
 * - **The store** — one IndexedDB *database of its own*
 *   (`pattern-mapper-designs`), never the library's: a design history
 *   must be evictable and clearable without the hand-curated inventory
 *   ever being in the same transaction. Metadata and payloads live in
 *   two object stores so a listing never loads a picture. Two
 *   implementations behind one interface, the library-store precedent:
 *   {@link MemorySnapshotStore} for tests and the announced fallback,
 *   {@link IdbSnapshotStore} for persistence.
 * - **The quota model** — pure and tested: a count and a byte budget
 *   per tier, eviction oldest-first that never drops the design being
 *   written, and a flag for the one case the owner wants warned about
 *   before it happens: dropping a design that was never saved as a
 *   file. Saved designs evict quietly — their contents are on disk.
 * - **The copy** — the Project section's standing line as a pure
 *   function of state, so "Nothing is kept unless you save your
 *   project." survives verbatim exactly where it is still true: when
 *   the browser refused storage.
 */

import { log } from '../diagnostics/log.ts';
import { request } from './store.ts';

/** The picture a design was made from, as stored: bytes plus how to decode them. */
export interface SnapshotSource {
  bytes: ArrayBuffer;
  /** MIME type the bytes decode as. */
  type: string;
  /** The name the picture arrived under. */
  name: string;
  /** The package entry name a save would give it. */
  entry: string;
}

/** One kept design: the settings document plus its picture. */
export interface DesignSnapshot {
  /** Stable per design; a new picture or a loaded file starts a new one. */
  id: string;
  /** What the picker shows: the Design title, else the picture's name. */
  title: string;
  createdAt: number;
  updatedAt: number;
  /** When the design was last saved as a file, or null if never. */
  savedAt: number | null;
  /** The canonical settings document (`serializeProject`). */
  projectJson: string;
  /** The picture, or null for a settings-only design. */
  source: SnapshotSource | null;
}

/** The listing shape — everything but the payloads. */
export interface SnapshotMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  savedAt: number | null;
  /** Bytes the record occupies: document plus picture. */
  bytes: number;
  hasPicture: boolean;
}

/** The storage surface the app needs. All async: IndexedDB is. */
export interface SnapshotStore {
  /** False when writes will not survive a reload (memory fallback). */
  readonly persistent: boolean;
  /** Newest first. */
  list(): Promise<SnapshotMeta[]>;
  get(id: string): Promise<DesignSnapshot | null>;
  put(snapshot: DesignSnapshot): Promise<void>;
  delete(id: string): Promise<void>;
  /** Stamp a design as saved to a file; its payloads are untouched. */
  markSaved(id: string, at: number): Promise<void>;
}

/** Bytes a design occupies: its document plus its picture. */
export function snapshotBytes(snapshot: DesignSnapshot): number {
  return snapshot.projectJson.length + (snapshot.source?.bytes.byteLength ?? 0);
}

/** The listing row for one design. */
export function metaOf(snapshot: DesignSnapshot): SnapshotMeta {
  return {
    id: snapshot.id,
    title: snapshot.title,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    savedAt: snapshot.savedAt,
    bytes: snapshotBytes(snapshot),
    hasPicture: snapshot.source !== null,
  };
}

/**
 * A fresh design id. `crypto.randomUUID` is absent on insecure
 * non-localhost origins, so a time-and-random fallback stands in — the
 * id only has to be unique within one browser's history.
 */
export function newDesignId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Newest first — the order every listing and the picker use. */
function newestFirst(a: SnapshotMeta, b: SnapshotMeta): number {
  return b.updatedAt - a.updatedAt || (a.id < b.id ? -1 : 1);
}

/** Copy the picture bytes so a later mutation cannot reach the store. */
function copySource(source: SnapshotSource | null): SnapshotSource | null {
  return source === null ? null : { ...source, bytes: source.bytes.slice(0) };
}

/** In-memory store: tests, and the fallback when IndexedDB is refused. */
export class MemorySnapshotStore implements SnapshotStore {
  readonly persistent = false;
  private readonly designs = new Map<string, DesignSnapshot>();

  list(): Promise<SnapshotMeta[]> {
    return Promise.resolve([...this.designs.values()].map(metaOf).sort(newestFirst));
  }

  get(id: string): Promise<DesignSnapshot | null> {
    const found = this.designs.get(id);
    return Promise.resolve(found === undefined ? null : { ...found, source: copySource(found.source) });
  }

  put(snapshot: DesignSnapshot): Promise<void> {
    this.designs.set(snapshot.id, { ...snapshot, source: copySource(snapshot.source) });
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.designs.delete(id);
    return Promise.resolve();
  }

  markSaved(id: string, at: number): Promise<void> {
    const found = this.designs.get(id);
    if (found !== undefined) this.designs.set(id, { ...found, savedAt: at });
    return Promise.resolve();
  }
}

/**
 * A database of its own (see the module note): the library's database
 * keeps its name and version untouched by this round.
 */
const DB_NAME = 'pattern-mapper-designs';
const DB_VERSION = 1;
/** Listing rows: small, read whole on every boot and every write. */
const META_STORE = 'designs';
/** Payloads by id: the document and the picture, read one at a time. */
const PAYLOAD_STORE = 'payloads';

/** What the payload store holds per design. */
interface StoredPayload {
  id: string;
  projectJson: string;
  source: SnapshotSource | null;
}

/** Shape guard for a listing row read back out of IndexedDB. */
function isMeta(value: unknown): value is SnapshotMeta {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw['id'] === 'string' &&
    typeof raw['title'] === 'string' &&
    typeof raw['updatedAt'] === 'number' &&
    typeof raw['createdAt'] === 'number' &&
    typeof raw['bytes'] === 'number' &&
    typeof raw['hasPicture'] === 'boolean' &&
    (raw['savedAt'] === null || typeof raw['savedAt'] === 'number')
  );
}

/** Shape guard for a payload read back out of IndexedDB. */
function isPayload(value: unknown): value is StoredPayload {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  if (typeof raw['id'] !== 'string' || typeof raw['projectJson'] !== 'string') return false;
  const source = raw['source'];
  if (source === null) return true;
  if (typeof source !== 'object' || source === null) return false;
  const src = source as Record<string, unknown>;
  return (
    src['bytes'] instanceof ArrayBuffer &&
    typeof src['type'] === 'string' &&
    typeof src['name'] === 'string' &&
    typeof src['entry'] === 'string'
  );
}

/** Resolve when a transaction commits; reject with its error otherwise. */
function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

/** IndexedDB-backed design history. */
export class IdbSnapshotStore implements SnapshotStore {
  readonly persistent = true;

  private constructor(private readonly db: IDBDatabase) {}

  /**
   * Open the database, creating its two stores. Rejects rather than
   * hanging when blocked by another tab's old connection, and closes
   * itself on `versionchange` so it never blocks anybody else — the
   * library store's rules, for the same reasons.
   */
  static open(factory: IDBFactory): Promise<IdbSnapshotStore> {
    return new Promise((resolve, reject) => {
      const req = factory.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PAYLOAD_STORE)) {
          db.createObjectStore(PAYLOAD_STORE, { keyPath: 'id' });
        }
      };
      req.onblocked = () => {
        reject(
          new Error(
            'Another tab of Pattern Mapper is holding the design history open. Close it and reload.',
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
          log.warn('history', 'database closed for an upgrade in another tab');
        };
        resolve(new IdbSnapshotStore(db));
      };
    });
  }

  async list(): Promise<SnapshotMeta[]> {
    const tx = this.db.transaction(META_STORE, 'readonly');
    const all = await request<unknown[]>(tx.objectStore(META_STORE).getAll());
    return all.filter((row): row is SnapshotMeta => isMeta(row)).sort(newestFirst);
  }

  async get(id: string): Promise<DesignSnapshot | null> {
    const tx = this.db.transaction([META_STORE, PAYLOAD_STORE], 'readonly');
    const meta = await request<unknown>(tx.objectStore(META_STORE).get(id));
    const payload = await request<unknown>(tx.objectStore(PAYLOAD_STORE).get(id));
    if (!isMeta(meta) || !isPayload(payload)) return null;
    return {
      id: meta.id,
      title: meta.title,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      savedAt: meta.savedAt,
      projectJson: payload.projectJson,
      source: payload.source,
    };
  }

  async put(snapshot: DesignSnapshot): Promise<void> {
    // One transaction over both stores: a listing row never outlives or
    // predates its payload.
    const tx = this.db.transaction([META_STORE, PAYLOAD_STORE], 'readwrite');
    tx.objectStore(META_STORE).put(metaOf(snapshot));
    const payload: StoredPayload = {
      id: snapshot.id,
      projectJson: snapshot.projectJson,
      source: snapshot.source,
    };
    tx.objectStore(PAYLOAD_STORE).put(payload);
    await committed(tx);
  }

  async delete(id: string): Promise<void> {
    const tx = this.db.transaction([META_STORE, PAYLOAD_STORE], 'readwrite');
    tx.objectStore(META_STORE).delete(id);
    tx.objectStore(PAYLOAD_STORE).delete(id);
    await committed(tx);
  }

  async markSaved(id: string, at: number): Promise<void> {
    const tx = this.db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    const meta = await request<unknown>(store.get(id));
    if (isMeta(meta)) store.put({ ...meta, savedAt: at });
    await committed(tx);
  }
}

/**
 * Open the persistent history, falling back to memory with a logged
 * reason. The caller reads `persistent` to tell the user the truth —
 * the old sentence, "Nothing is kept unless you save your project.",
 * is exactly right in that case.
 */
export async function openSnapshots(factory?: IDBFactory): Promise<SnapshotStore> {
  if (factory === undefined) {
    log.warn('history', 'IndexedDB unavailable — no design history this session');
    return new MemorySnapshotStore();
  }
  try {
    return await IdbSnapshotStore.open(factory);
  } catch (error) {
    log.error('history', 'IndexedDB failed — no design history this session', {
      message: error instanceof Error ? error.message : String(error),
    });
    return new MemorySnapshotStore();
  }
}

// --- The quota model (pure) ------------------------------------------

/** How much history a browser keeps: designs and bytes. */
export interface HistoryBudget {
  maxDesigns: number;
  maxBytes: number;
}

const MB = 1024 * 1024;

/**
 * The two tiers (D171 decision 6, constants accepted at the plan gate):
 * `basic` until the user opts in; `persisted` once
 * `navigator.storage.persist()` has been granted — the browser has then
 * promised not to evict the origin's storage under pressure, so the
 * app can afford to keep more.
 */
export const HISTORY_BUDGETS: { readonly basic: HistoryBudget; readonly persisted: HistoryBudget } = {
  basic: { maxDesigns: 10, maxBytes: 150 * MB },
  persisted: { maxDesigns: 25, maxBytes: 600 * MB },
};

/**
 * The tier bounded by the browser's own ceiling: never plan to use
 * more than half of what `navigator.storage.estimate()` reports as
 * free (plus what the history already holds), so a small-quota browser
 * is never asked to hold a large tier. Unknown estimates change nothing.
 */
export function effectiveBudget(
  tier: HistoryBudget,
  estimate: { quota?: number; usage?: number } | null,
  alreadyHeld: number,
): HistoryBudget {
  if (estimate === null || estimate.quota === undefined || estimate.usage === undefined) {
    return tier;
  }
  const free = Math.max(0, estimate.quota - estimate.usage);
  const ceiling = Math.floor(free / 2) + alreadyHeld;
  return { maxDesigns: tier.maxDesigns, maxBytes: Math.max(0, Math.min(tier.maxBytes, ceiling)) };
}

/** What the history holds. */
export interface HistoryUsage {
  designs: number;
  bytes: number;
}

/** Count and bytes across a listing. */
export function historyUsage(existing: readonly SnapshotMeta[]): HistoryUsage {
  return {
    designs: existing.length,
    bytes: existing.reduce((sum, meta) => sum + meta.bytes, 0),
  };
}

/** What a write must do first. */
export interface WritePlan {
  /** Designs to delete before the write, oldest first. */
  evict: SnapshotMeta[];
  /** An evicted design was never saved as a file — the case to warn about. */
  dropsUnsaved: boolean;
  /** The incoming design alone exceeds the byte budget; it is kept anyway. */
  overBudget: boolean;
}

/**
 * Plan a write: evict oldest-first until the count and byte budgets
 * hold, never evicting the design being written — the current work is
 * the one thing the history exists to keep, so when it alone is over
 * budget it is kept and the plan says so.
 */
export function planWrite(
  existing: readonly SnapshotMeta[],
  incoming: { id: string; bytes: number },
  budget: HistoryBudget,
): WritePlan {
  const others = existing
    .filter((meta) => meta.id !== incoming.id)
    .sort((a, b) => a.updatedAt - b.updatedAt || (a.id < b.id ? -1 : 1));
  const evict: SnapshotMeta[] = [];
  let designs = others.length + 1;
  let bytes = others.reduce((sum, meta) => sum + meta.bytes, 0) + incoming.bytes;
  for (const meta of others) {
    if (designs <= budget.maxDesigns && bytes <= budget.maxBytes) break;
    evict.push(meta);
    designs -= 1;
    bytes -= meta.bytes;
  }
  return {
    evict,
    dropsUnsaved: evict.some((meta) => meta.savedAt === null),
    overBudget: bytes > budget.maxBytes,
  };
}

/** Near the quota: the last slot is taken, or ≥ 80 % of the bytes are. */
export function nearQuota(existing: readonly SnapshotMeta[], budget: HistoryBudget): boolean {
  const usage = historyUsage(existing);
  return usage.designs >= budget.maxDesigns || usage.bytes >= budget.maxBytes * 0.8;
}

/**
 * How often the app looks for a change worth keeping (ms). Two seconds
 * bounds the loss window on a crash; a normal close flushes at once.
 */
export const HISTORY_TICK_MS = 2000;

/** "just now", "4 min ago", "3 h ago", "yesterday", "5 days ago", "12 Aug 2026". */
export function ageLabel(now: number, then: number, locale?: string): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${String(days)} days ago`;
  return new Date(then).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "820 KB", "1.2 MB", "38 MB". */
export function sizeLabel(bytes: number): string {
  if (bytes < MB) return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

/**
 * The design the next arrival would drop, when the history is full:
 * the oldest. Null while there is room. Which one it is matters to
 * the warning — a never-saved design is named before it goes.
 */
export function nextToEvict(
  existing: readonly SnapshotMeta[],
  budget: HistoryBudget,
): SnapshotMeta | null {
  if (existing.length < budget.maxDesigns) return null;
  return [...existing].sort((a, b) => a.updatedAt - b.updatedAt)[0] ?? null;
}

// --- The standing line (pure) ------------------------------------------

/** What the Project section's line needs to know. */
export interface HistoryLineState {
  /** False when the browser refused storage: nothing is kept. */
  available: boolean;
  usage: HistoryUsage;
  budget: HistoryBudget;
  /** The current design's standing with the history. */
  current: 'none' | 'kept' | 'restored' | 'saved';
  /** The filename of the last save of this design, when `current` is 'saved'. */
  savedName: string | null;
  /** Edits since that save, when `current` is 'saved'. */
  changedSinceSave: boolean;
  /** A restored design's last file save as an age label, or null if never saved. */
  lastSaved: string | null;
  /** The design the next arrival would drop, when the history is full. */
  nextToDrop: SnapshotMeta | null;
}

/** "142 of 150 MB". */
function megabytes(bytes: number, maxBytes: number): string {
  return `${String(Math.round(bytes / MB))} of ${String(Math.round(maxBytes / MB))} MB`;
}

/**
 * The Project section's standing sentence(s). One writer for the copy
 * so every state is tested here, in node, including the one where the
 * pre-DUR-01 sentence is still the truth.
 */
export function historyLine(state: HistoryLineState): string {
  if (!state.available) {
    return 'Nothing is kept unless you save your project — this browser is not keeping a design history.';
  }
  const slots = `${String(state.usage.designs)} of ${String(state.budget.maxDesigns)}`;
  let line: string;
  switch (state.current) {
    case 'none':
      line = 'Your design is kept in this browser as you work. Save a file to keep it anywhere else.';
      break;
    case 'kept':
      line = `Kept in this browser's history (${slots}) — not saved as a file.`;
      break;
    case 'restored':
      line =
        state.lastSaved === null
          ? `Restored from this browser's history (${slots}) — not saved as a file.`
          : `Restored from this browser's history (${slots}) — last saved as a file ${state.lastSaved}.`;
      break;
    case 'saved':
      line = state.changedSinceSave
        ? `Saved as ${state.savedName ?? 'a file'} — changes since are kept in this browser only.`
        : `Saved as ${state.savedName ?? 'a file'}. History: ${slots}.`;
      break;
  }
  if (state.nextToDrop !== null) {
    line += state.nextToDrop.savedAt === null
      ? ` History is full — the next picture drops “${state.nextToDrop.title}”, which was never saved as a file.`
      : ` History is full — the next picture drops the oldest design (it was saved as a file).`;
  } else if (state.usage.bytes >= state.budget.maxBytes * 0.8) {
    line += ` History is nearly full (${megabytes(state.usage.bytes, state.budget.maxBytes)}).`;
  }
  return line;
}
