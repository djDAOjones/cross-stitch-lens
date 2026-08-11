/**
 * Shell state (M6-PANEL-01; recut M14-EXT-23/24; reduced to the cold
 * flag at M14-EXT-31/32) and its persisted half.
 *
 * The invariant is the composition rule: features that hide things
 * must not be able to leave a region in a state none of them intended.
 * The collapse modes retired — preview focus at EXT-24, the preview
 * bar toggle at EXT-31 (the section header owns the collapse), the
 * whole-panel settings collapse at EXT-32 — so what is left to prove
 * is the cold gate and the preference record's resilience.
 */

import { describe, expect, it } from 'vitest';

import {
  defaultPreferences,
  parsePreferences,
  LEGACY_PREFERENCES_KEY,
  PREFERENCES_KEY,
  PREFERENCES_VERSION,
  loadPreferences,
  savePreferences,
  serializePreferences,
  type PreferenceStore,
} from '../src/ui/preferences.ts';
import { defaultShellState, visibility } from '../src/ui/shell.ts';

/** In-memory store; `fail` makes every operation throw, as a blocked
 *  localStorage does in private mode or over quota. */
function fakeStore(initial: string | null = null, fail = false): PreferenceStore {
  let value = initial;
  return {
    getItem: (key) => {
      if (fail) throw new Error('storage blocked');
      return key === PREFERENCES_KEY ? value : null;
    },
    setItem: (key, next) => {
      if (fail) throw new Error('storage blocked');
      if (key === PREFERENCES_KEY) value = next;
    },
  };
}

describe('shell visibility', () => {
  it('starts cold: the entry is the only product surface (M14-EXT-06)', () => {
    const show = visibility(defaultShellState());
    expect(show).toEqual({
      controls: false,
      source: true,
      info: false,
      // Dev-only chrome is exempt from "entry only" — it is not
      // product surface, and cold boot errors are exactly when the
      // diagnostics affordance earns its keep.
      debug: true,
      // The status live region stays in the DOM so the cold-exit
      // announcement fires from an existing region, never a new one.
      status: true,
    });
  });

  it('shows everything once populated (M14-EXT-32: no panel collapse)', () => {
    // The whole-panel collapse retired with its toggle: populated
    // means every region shows, and any hiding is a section header's
    // own business, not the shell's.
    expect(visibility({ cold: false })).toEqual({
      controls: true,
      source: true,
      info: true,
      debug: true,
      status: true,
    });
  });

  it('is a pure function of the state', () => {
    expect(visibility({ cold: true })).toEqual(visibility({ cold: true }));
    expect(visibility({ cold: false })).toEqual(visibility({ cold: false }));
  });
});

describe('shell preferences', () => {
  it('defaults to the disclosure map alone (M14-EXT-32)', () => {
    expect(defaultPreferences()).toEqual({
      version: PREFERENCES_VERSION,
      disclosures: {},
    });
  });

  it('round-trips through storage', () => {
    const store = fakeStore();
    savePreferences(store, {
      version: PREFERENCES_VERSION,
      disclosures: { 'section-export': true, 'preview-section': false },
    });
    // Disclosure state (M14-IMPL-03; the preview joined at EXT-31).
    expect(loadPreferences(store).disclosures).toEqual({
      'section-export': true,
      'preview-section': false,
    });
  });

  it('falls back to defaults for anything unreadable', () => {
    for (const raw of [
      null,
      '',
      'not json',
      '[]',
      'null',
      '{"version":999,"disclosures":{}}',
      '{"version":1,"disclosures":[1,2]}',
    ]) {
      expect(parsePreferences(raw)).toEqual(defaultPreferences());
    }
  });

  it('ignores the retired panelCollapsed field from older records (M14-EXT-32)', () => {
    // A pre-EXT-32 record still parses — the user's disclosure
    // choices survive the field's retirement — and the next write
    // drops the field rather than bumping the version over it.
    const stored = '{"version":1,"panelCollapsed":true,"disclosures":{"section-export":true}}';
    const parsed = parsePreferences(stored);
    expect(parsed).toEqual({
      version: PREFERENCES_VERSION,
      disclosures: { 'section-export': true },
    });
    expect(serializePreferences(parsed)).not.toContain('panelCollapsed');
  });

  it('survives a storage that throws', () => {
    // A blocked localStorage must cost a remembered preference, never
    // the app's ability to start.
    const store = fakeStore(null, true);
    expect(() => loadPreferences(store)).not.toThrow();
    expect(loadPreferences(store)).toEqual(defaultPreferences());
    expect(() => {
      savePreferences(store, {
        version: PREFERENCES_VERSION,
        disclosures: {},
      });
    }).not.toThrow();
  });

  it('treats an absent store as an empty one', () => {
    expect(loadPreferences(null)).toEqual(defaultPreferences());
    expect(() => {
      savePreferences(null, defaultPreferences());
    }).not.toThrow();
  });

  // RENAME-01 (D150): the storage key moved from the old product name.
  // These pin the one thing the rename could destroy — an existing
  // install's disclosure choices.
  describe('the pre-rename storage key (RENAME-01)', () => {
    /** Multi-key store, so legacy and current keys are distinguishable. */
    function keyedStore(seed: Record<string, string> = {}): PreferenceStore {
      const map = new Map(Object.entries(seed));
      return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, next) => {
          map.set(key, next);
        },
      };
    }

    const legacyRecord = '{"version":1,"disclosures":{"section-export":true}}';

    it('reads the legacy key when the current one is absent', () => {
      const store = keyedStore({ [LEGACY_PREFERENCES_KEY]: legacyRecord });
      expect(loadPreferences(store).disclosures).toEqual({ 'section-export': true });
    });

    it('prefers the current key over a stale legacy record', () => {
      // A post-rename write must never be overridden by what the old
      // build left behind.
      const store = keyedStore({
        [LEGACY_PREFERENCES_KEY]: legacyRecord,
        [PREFERENCES_KEY]: '{"version":1,"disclosures":{"section-export":false}}',
      });
      expect(loadPreferences(store).disclosures).toEqual({ 'section-export': false });
    });

    it('migrates forward on the next write, leaving the legacy record intact', () => {
      const store = keyedStore({ [LEGACY_PREFERENCES_KEY]: legacyRecord });
      savePreferences(store, loadPreferences(store));
      // The value is now under the new key...
      expect(store.getItem(PREFERENCES_KEY)).toContain('section-export');
      // ...and the old one is deliberately not deleted, so a downgrade
      // to a pre-rename build still finds its preferences.
      expect(store.getItem(LEGACY_PREFERENCES_KEY)).toBe(legacyRecord);
    });

    it('still falls back to defaults when neither key holds anything', () => {
      expect(loadPreferences(keyedStore())).toEqual(defaultPreferences());
    });

    it('keeps the two keys distinct', () => {
      expect(PREFERENCES_KEY).not.toBe(LEGACY_PREFERENCES_KEY);
      expect(PREFERENCES_KEY).toBe('pattern-mapper.shell');
    });
  });

  it('stamps the current version on write', () => {
    const text = serializePreferences({ version: 0, disclosures: {} });
    expect(JSON.parse(text)).toEqual({
      version: PREFERENCES_VERSION,
      disclosures: {},
    });
  });

  it('does not persist the cold flag', () => {
    // Cold (M14-EXT-06) is derived from what exists, never remembered.
    const text = serializePreferences(defaultPreferences());
    expect(text).not.toContain('cold');
  });
});
