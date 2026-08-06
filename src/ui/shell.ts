/**
 * App-shell presentation state (M6-PANEL-01; recut M14-EXT-23/24).
 *
 * Collapsible regions hide things, so they get **one** state model and
 * one derived visibility answer rather than layers of competing
 * `hidden` flags. Preview focus retired whole at M14-EXT-24 (its
 * button was its only entry, so the mode went with it, not idled);
 * the preview instead collapses like any region (M14-EXT-23,
 * superseding UI-STANDARDS' "the canvas never does") — session-only,
 * default expanded, re-expanded when a capture session starts.
 *
 * This is presentation only. Nothing here is pipeline configuration,
 * capture quality, project data, or an export setting; it must never
 * be confused with the M4 draft-quality state, which is about pixels.
 */

/** The shell's presentation state: two collapses plus the cold flag. */
export interface ShellState {
  /** Settings panel collapsed out of layout and focus order. */
  panelCollapsed: boolean;
  /**
   * Preview region collapsed (M14-EXT-23). Session-only — a working
   * gesture, not a preference: reopening into a hidden canvas with no
   * memory of why is a bad first second. Capture start re-expands it.
   */
  previewCollapsed: boolean;
  /**
   * Cold surface (M14-EXT-06): no source and no project yet, so the
   * entry state is the page's only product content. Session state,
   * never persisted; exiting is one-way — every source route (file,
   * capture, project open, drop, paste) leaves it for good. Cold
   * overrides both collapses: they are meaningless before anything
   * exists to look at.
   */
  cold: boolean;
}

/** Which shell regions are shown, derived from {@link ShellState}. */
export interface ShellVisibility {
  /** The settings aside (stats, design, colour, export, project). */
  controls: boolean;
  /** The preview region (strip + canvas). Composed with "a frame
   *  exists" by the caller — visibility here is only the shell's say. */
  preview: boolean;
  /** Source import + capture session controls. */
  source: boolean;
  /** Colours-by-usage panel under the preview. */
  info: boolean;
  /** Dev-only profiling and diagnostics surfaces. */
  debug: boolean;
  /** Prose status line (the app's one live region). */
  status: boolean;
  /** The show/hide-settings button. */
  panelToggle: boolean;
  /** The show/hide-preview button (M14-EXT-23). */
  previewToggle: boolean;
}

/** Shell state at first run: cold, everything expanded. */
export function defaultShellState(): ShellState {
  return { panelCollapsed: false, previewCollapsed: false, cold: true };
}

/**
 * What to show. The single composition rule lives here so no caller
 * has to reason about the interaction: cold wins over everything —
 * only the source region (whose entry state is the page) and the
 * status live region survive, with dev-only diagnostics exempt as
 * non-product chrome; otherwise each region's own collapsed state
 * decides, and everything else shows.
 */
export function visibility(state: ShellState): ShellVisibility {
  if (state.cold) {
    return {
      controls: false,
      preview: false,
      source: true,
      info: false,
      debug: true,
      status: true,
      panelToggle: false,
      previewToggle: false,
    };
  }
  return {
    controls: !state.panelCollapsed,
    preview: !state.previewCollapsed,
    source: true,
    info: true,
    debug: true,
    status: true,
    panelToggle: true,
    previewToggle: true,
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

/** The preview-toggle label (M14-EXT-23) — same contract as above. */
export function previewToggleLabel(collapsed: boolean): string {
  return collapsed ? 'Show preview' : 'Hide preview';
}
