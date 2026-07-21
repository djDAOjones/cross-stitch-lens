/**
 * Shell state (M6-PANEL-01 + M6-FOCUS-01) and its persisted half.
 *
 * The invariant is the composition rule: two features that both hide
 * things must not be able to leave a region in a state neither of them
 * intended, and leaving preview focus must restore the settings panel
 * exactly as the user left it — not merely "open".
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
  FOCUS_ENTER_LABEL,
  FOCUS_EXIT_LABEL,
  panelToggleLabel,
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
  it('shows everything by default', () => {
    const show = visibility(defaultShellState());
    expect(show).toEqual({
      controls: true,
      source: true,
      info: true,
      debug: true,
      status: true,
      compactStatus: false,
      panelToggle: true,
      focusExit: false,
    });
  });

  it('hides only the settings panel when collapsed', () => {
    const show = visibility({ panelCollapsed: true, previewFocus: false });
    expect(show.controls).toBe(false);
    expect(show.source).toBe(true);
    expect(show.info).toBe(true);
    // The control that reveals it must survive its own collapse.
    expect(show.panelToggle).toBe(true);
  });

  it('strips the shell to the preview in focus mode', () => {
    const show = visibility({ panelCollapsed: false, previewFocus: true });
    expect(show.controls).toBe(false);
    expect(show.source).toBe(false);
    expect(show.info).toBe(false);
    expect(show.debug).toBe(false);
    expect(show.compactStatus).toBe(true);
    // Never a mode with no way out (UI-STANDARDS → user control).
    expect(show.focusExit).toBe(true);
  });

  it('always offers exactly one status surface', () => {
    for (const panelCollapsed of [false, true]) {
      for (const previewFocus of [false, true]) {
        const show = visibility({ panelCollapsed, previewFocus });
        expect(show.status !== show.compactStatus).toBe(true);
      }
    }
  });

  it('restores the panel state exactly on leaving focus mode', () => {
    // The regression this guards: focus mode "closing" the panel and
    // exit then "opening" it, losing a deliberately collapsed panel.
    for (const panelCollapsed of [false, true]) {
      const before: ShellState = { panelCollapsed, previewFocus: false };
      const during: ShellState = { ...before, previewFocus: true };
      const after: ShellState = { ...during, previewFocus: false };
      expect(visibility(during).controls).toBe(false);
      expect(visibility(after)).toEqual(visibility(before));
    }
  });

  it('is a pure function of the state', () => {
    const state: ShellState = { panelCollapsed: true, previewFocus: false };
    expect(visibility(state)).toEqual(visibility(state));
  });
});

describe('control labels', () => {
  it('names the action and flips with the state', () => {
    expect(panelToggleLabel(false)).toBe('Hide settings');
    expect(panelToggleLabel(true)).toBe('Show settings');
  });

  it('says "preview focus" in full, never bare "focus"', () => {
    // "Focus mode" is one bug report away from meaning keyboard focus.
    for (const label of [FOCUS_ENTER_LABEL, FOCUS_EXIT_LABEL]) {
      expect(label.toLowerCase()).toContain('preview focus');
    }
  });
});

describe('shell preferences', () => {
  it('defaults to an open panel', () => {
    expect(defaultPreferences()).toEqual({ version: PREFERENCES_VERSION, panelCollapsed: false });
  });

  it('round-trips through storage', () => {
    const store = fakeStore();
    savePreferences(store, { version: PREFERENCES_VERSION, panelCollapsed: true });
    expect(loadPreferences(store).panelCollapsed).toBe(true);
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
      savePreferences(store, { version: PREFERENCES_VERSION, panelCollapsed: true });
    }).not.toThrow();
  });

  it('treats an absent store as an empty one', () => {
    expect(loadPreferences(null)).toEqual(defaultPreferences());
    expect(() => {
      savePreferences(null, defaultPreferences());
    }).not.toThrow();
  });

  it('stamps the current version on write', () => {
    const text = serializePreferences({ version: 0, panelCollapsed: true });
    expect(JSON.parse(text)).toEqual({ version: PREFERENCES_VERSION, panelCollapsed: true });
  });

  it('does not persist preview focus', () => {
    // Reopening into a stripped-down shell with no memory of why is a
    // bad first second; focus mode is deliberately session-only.
    const text = serializePreferences(defaultPreferences());
    expect(text).not.toContain('previewFocus');
  });
});
