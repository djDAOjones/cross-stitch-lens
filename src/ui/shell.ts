/**
 * App-shell presentation state (M6-PANEL-01 + M6-FOCUS-01).
 *
 * Both features hide things, so they get **one** state model and one
 * derived visibility answer rather than two layers of competing
 * `hidden` flags. Preview focus wins while it is on, but it never
 * *overwrites* the panel's own state — so leaving focus mode restores
 * the settings panel exactly as the user left it.
 *
 * This is presentation only. Nothing here is pipeline configuration,
 * capture quality, project data, or an export setting; it must never
 * be confused with the M4 draft-quality state, which is about pixels.
 */

/** The shell's presentation state: two preferences plus the cold flag. */
export interface ShellState {
  /** Settings panel collapsed out of layout and focus order. */
  panelCollapsed: boolean;
  /** Preview focus: everything but the preview and its status hidden. */
  previewFocus: boolean;
  /**
   * Cold surface (M14-EXT-06): no source and no project yet, so the
   * entry state is the page's only product content. Session state,
   * never persisted; exiting is one-way — every source route (file,
   * capture, project open, drop, paste) leaves it for good. Cold
   * overrides both preferences: collapse and preview focus are
   * meaningless before anything exists to look at.
   */
  cold: boolean;
}

/** Which shell regions are shown, derived from {@link ShellState}. */
export interface ShellVisibility {
  /** The settings aside (pattern, grid, colour, export, project). */
  controls: boolean;
  /** Source import + capture session controls. */
  source: boolean;
  /** Stats panel under the preview. */
  info: boolean;
  /** Dev-only profiling and diagnostics surfaces. */
  debug: boolean;
  /** Prose status line (the full-shell status region). */
  status: boolean;
  /** Compact one-line status (preview focus only). */
  compactStatus: boolean;
  /** The show/hide-settings button. */
  panelToggle: boolean;
  /** The persistent exit-focus control. */
  focusExit: boolean;
}

/** Shell state at first run: cold, panel open, no focus mode. */
export function defaultShellState(): ShellState {
  return { panelCollapsed: false, previewFocus: false, cold: true };
}

/**
 * What to show. The single composition rule lives here so no caller
 * has to reason about the interaction: cold wins over everything —
 * only the source region (whose entry state is the page) and the
 * status live region survive, with dev-only diagnostics exempt as
 * non-product chrome; then preview focus keeps only the preview, its
 * compact status, and the exit control; otherwise the panel's own
 * collapsed state decides, and everything else shows.
 */
export function visibility(state: ShellState): ShellVisibility {
  if (state.cold) {
    return {
      controls: false,
      source: true,
      info: false,
      debug: true,
      status: true,
      compactStatus: false,
      panelToggle: false,
      focusExit: false,
    };
  }
  if (state.previewFocus) {
    return {
      controls: false,
      source: false,
      info: false,
      debug: false,
      status: false,
      compactStatus: true,
      panelToggle: false,
      focusExit: true,
    };
  }
  return {
    controls: !state.panelCollapsed,
    source: true,
    info: true,
    debug: true,
    status: true,
    compactStatus: false,
    panelToggle: true,
    focusExit: false,
  };
}

/**
 * The settings-toggle label. Both the visible text and the accessible
 * name are this string — they must match for speech input
 * (UI-STANDARDS → "Understandable"), and the button also carries
 * `aria-expanded` so state is exposed, not only implied by the verb.
 */
export function panelToggleLabel(collapsed: boolean): string {
  return collapsed ? 'Show settings' : 'Hide settings';
}

/**
 * Preview-focus entry/exit labels. "Preview focus" is used verbatim
 * everywhere, including diagnostics, because a mode called just "focus"
 * is one keyboard-focus bug report away from total confusion.
 */
export const FOCUS_ENTER_LABEL = 'Preview focus';
export const FOCUS_EXIT_LABEL = 'Exit preview focus';
