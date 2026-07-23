/**
 * Shell preferences: how the app *looks*, remembered across reloads.
 *
 * Deliberately **not** in the project file. A project is creative data
 * that gets shared; a collaborator opening it should not have their
 * settings panel disappear because of how someone else likes to work.
 * Preview focus is not persisted at all — it is a transient working
 * mode, and reopening into a stripped-down shell with no memory of why
 * is a bad first second.
 *
 * Storage is injected, so the parse/merge policy is pure and testable
 * without a browser. Corrupt, absent, or newer-versioned data all fall
 * back to defaults rather than throwing: a bad preference must never
 * be able to stop the app from starting.
 */

/** Storage key. Bumped only if the shape changes incompatibly. */
export const PREFERENCES_KEY = 'cross-stitch-lens.shell';

/** Current preferences schema version. */
export const PREFERENCES_VERSION = 1;

/** The persisted shell preferences. */
export interface ShellPreferences {
  version: number;
  panelCollapsed: boolean;
  /**
   * Open/closed state per disclosure (accordion sections and inline
   * depth reveals), keyed by disclosure id (M14-IMPL-03). Ids absent
   * here take the spec's first-run default — so new disclosures added
   * later start at their intended state rather than "whatever an old
   * record says".
   */
  disclosures: Record<string, boolean>;
}

/** First-run preferences: settings panel open, spec-default sections
 *  (only Design open — the ids live with the sections in main.ts). */
export function defaultPreferences(): ShellPreferences {
  return { version: PREFERENCES_VERSION, panelCollapsed: false, disclosures: {} };
}

/**
 * Parse stored preferences, falling back field by field. Anything
 * unreadable — absent, not JSON, not an object, wrong types, a version
 * this build does not know — yields the defaults.
 */
export function parsePreferences(raw: string | null): ShellPreferences {
  if (raw === null) return defaultPreferences();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultPreferences();
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return defaultPreferences();
  }
  const record = parsed as Record<string, unknown>;
  if (record['version'] !== PREFERENCES_VERSION) return defaultPreferences();
  const disclosures: Record<string, boolean> = {};
  const rawDisclosures = record['disclosures'];
  if (typeof rawDisclosures === 'object' && rawDisclosures !== null && !Array.isArray(rawDisclosures)) {
    for (const [key, value] of Object.entries(rawDisclosures)) {
      if (typeof value === 'boolean') disclosures[key] = value;
    }
  }
  return {
    version: PREFERENCES_VERSION,
    panelCollapsed:
      typeof record['panelCollapsed'] === 'boolean' ? record['panelCollapsed'] : false,
    disclosures,
  };
}

/** Serialise preferences for storage. */
export function serializePreferences(preferences: ShellPreferences): string {
  return JSON.stringify({
    version: PREFERENCES_VERSION,
    panelCollapsed: preferences.panelCollapsed,
    disclosures: preferences.disclosures,
  });
}

/** The slice of `Storage` this module needs (so a fake is trivial). */
export interface PreferenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Read preferences; a storage that throws (private mode, quota) is
 *  treated exactly like an empty one. */
export function loadPreferences(store: PreferenceStore | null): ShellPreferences {
  if (store === null) return defaultPreferences();
  try {
    return parsePreferences(store.getItem(PREFERENCES_KEY));
  } catch {
    return defaultPreferences();
  }
}

/** Write preferences; failure is silent by design — losing a remembered
 *  panel state is not worth an error the user cannot act on. */
export function savePreferences(
  store: PreferenceStore | null,
  preferences: ShellPreferences,
): void {
  if (store === null) return;
  try {
    store.setItem(PREFERENCES_KEY, serializePreferences(preferences));
  } catch {
    /* storage unavailable — the preference is simply not remembered */
  }
}
