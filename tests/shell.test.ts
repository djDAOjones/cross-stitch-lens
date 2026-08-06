/**
 * Shell state (M6-PANEL-01; recut M14-EXT-23/24) and its persisted
 * half.
 *
 * The invariant is the composition rule: features that hide things
 * must not be able to leave a region in a state none of them intended.
 * Preview focus retired whole at M14-EXT-24; the preview instead
 * collapses like any region (M14-EXT-23), session-only.
 */

import { describe, expect, it } from 'vitest';

import {
  defaultPreferences,
  parsePreferences,
  PREFERENCES_KEY,
  PREFERENCES_VERSION,
  loadPreferences,
  savePreferences,
  serializePreferences,
  type PreferenceStore,
} from '../src/ui/preferences.ts';
import {
  defaultShellState,
  panelToggleLabel,
  previewToggleLabel,
  visibility,
  type ShellState,
} from '../src/ui/shell.ts';

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
      preview: false,
      source: true,
      info: false,
      // Dev-only chrome is exempt from "entry only" — it is not
      // product surface, and cold boot errors are exactly when the
      // diagnostics affordance earns its keep.
      debug: true,
      // The status live region stays in the DOM so the cold-exit
      // announcement fires from an existing region, never a new one.
      status: true,
      panelToggle: false,
      previewToggle: false,
    });
  });

  it('cold overrides both collapses — they are meaningless before a source', () => {
    for (const panelCollapsed of [false, true]) {
      for (const previewCollapsed of [false, true]) {
        expect(visibility({ panelCollapsed, previewCollapsed, cold: true })).toEqual(
          visibility(defaultShellState()),
        );
      }
    }
  });

  it('shows everything once populated', () => {
    const show = visibility({ ...defaultShellState(), cold: false });
    expect(show).toEqual({
      controls: true,
      preview: true,
      source: true,
      info: true,
      debug: true,
      status: true,
      panelToggle: true,
      previewToggle: true,
    });
  });

  it('exits cold onto exactly the preferred panel state', () => {
    // Leaving cold must land on the panel state the preference held —
    // a collapsed preference stays collapsed, never forced open.
    for (const panelCollapsed of [false, true]) {
      const populated = visibility({ panelCollapsed, previewCollapsed: false, cold: false });
      expect(populated.controls).toBe(!panelCollapsed);
      expect(populated.panelToggle).toBe(true);
    }
  });

  it('hides only the settings panel when collapsed', () => {
    const show = visibility({ panelCollapsed: true, previewCollapsed: false, cold: false });
    expect(show.controls).toBe(false);
    expect(show.preview).toBe(true);
    expect(show.source).toBe(true);
    expect(show.info).toBe(true);
    // The control that reveals it must survive its own collapse.
    expect(show.panelToggle).toBe(true);
  });

  it('hides only the preview when it collapses (M14-EXT-23)', () => {
    const show = visibility({ panelCollapsed: false, previewCollapsed: true, cold: false });
    expect(show.preview).toBe(false);
    expect(show.controls).toBe(true);
    expect(show.info).toBe(true);
    expect(show.status).toBe(true);
    // The control that reveals it lives outside it and must survive.
    expect(show.previewToggle).toBe(true);
  });

  it('the two collapses compose independently', () => {
    // The regression this guards: one collapse leaking into the other
    // through a shared branch — every combination must map exactly.
    for (const panelCollapsed of [false, true]) {
      for (const previewCollapsed of [false, true]) {
        const show = visibility({ panelCollapsed, previewCollapsed, cold: false });
        expect(show.controls).toBe(!panelCollapsed);
        expect(show.preview).toBe(!previewCollapsed);
        expect(show.status).toBe(true);
      }
    }
  });

  it('is a pure function of the state', () => {
    const state: ShellState = { panelCollapsed: true, previewCollapsed: false, cold: false };
    expect(visibility(state)).toEqual(visibility(state));
  });
});

describe('control labels', () => {
  it('names the action and flips with the state', () => {
    expect(panelToggleLabel(false)).toBe('Hide settings');
    expect(panelToggleLabel(true)).toBe('Show settings');
    expect(previewToggleLabel(false)).toBe('Hide preview');
    expect(previewToggleLabel(true)).toBe('Show preview');
  });
});

describe('shell preferences', () => {
  it('defaults to an open panel', () => {
    expect(defaultPreferences()).toEqual({
      version: PREFERENCES_VERSION,
      panelCollapsed: false,
      disclosures: {},
    });
  });

  it('round-trips through storage', () => {
    const store = fakeStore();
    savePreferences(store, {
      version: PREFERENCES_VERSION,
      panelCollapsed: true,
      disclosures: { 'section-export': true, 'grid-details': false },
    });
    expect(loadPreferences(store).panelCollapsed).toBe(true);
    // Disclosure state (M14-IMPL-03) rides the same record.
    expect(loadPreferences(store).disclosures).toEqual({
      'section-export': true,
      'grid-details': false,
    });
  });

  it('falls back to defaults for anything unreadable', () => {
    for (const raw of [
      null,
      '',
      'not json',
      '[]',
      'null',
      '{"version":999,"panelCollapsed":true}',
      '{"version":1,"panelCollapsed":"yes"}',
    ]) {
      expect(parsePreferences(raw)).toEqual(defaultPreferences());
    }
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
        panelCollapsed: true,
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

  it('stamps the current version on write', () => {
    const text = serializePreferences({ version: 0, panelCollapsed: true, disclosures: {} });
    expect(JSON.parse(text)).toEqual({
      version: PREFERENCES_VERSION,
      panelCollapsed: true,
      disclosures: {},
    });
  });

  it('does not persist the preview collapse', () => {
    // A working gesture, not a preference (M14-EXT-23): reopening into
    // a hidden canvas with no memory of why is a bad first second, and
    // cold (M14-EXT-06) is derived from what exists, never remembered.
    const text = serializePreferences(defaultPreferences());
    expect(text).not.toContain('previewCollapsed');
    expect(text).not.toContain('cold');
  });
});
