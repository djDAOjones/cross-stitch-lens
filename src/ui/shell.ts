/**
 * App-shell presentation state (M6-PANEL-01; recut M14-EXT-23/24;
 * reduced to the cold flag at M14-EXT-31/32).
 *
 * The collapse modes this model once carried are gone, each replaced
 * by a plainer idiom: preview focus retired whole at M14-EXT-24 (its
 * button was its only entry); the preview's bar toggle retired at
 * M14-EXT-31 in favour of a real section header (the accordion is the
 * collapse route, persisted like every other disclosure); and the
 * whole-panel settings collapse retired at M14-EXT-32 (sections
 * already collapse individually to bare headings, so hiding the whole
 * panel was a second, coarser answer to the same question). What
 * remains is the one state no section owns: cold.
 *
 * This is presentation only. Nothing here is pipeline configuration,
 * capture quality, project data, or an export setting; it must never
 * be confused with the M4 draft-quality state, which is about pixels.
 */

/** The shell's presentation state: only the cold flag remains. */
export interface ShellState {
  /**
   * Cold surface (M14-EXT-06): no source and no project yet, so the
   * entry state is the page's only product content. Session state,
   * never persisted; exiting is one-way — every source route (file,
   * capture, project open, drop, paste) leaves it for good.
   */
  cold: boolean;
}

/** Which shell regions are shown, derived from {@link ShellState}. */
export interface ShellVisibility {
  /** The settings aside (stats, design, colour, export, project). */
  controls: boolean;
  /** Source import + capture session controls. */
  source: boolean;
  /** Colours-by-usage panel under the preview. */
  info: boolean;
  /** Dev-only profiling and diagnostics surfaces. */
  debug: boolean;
  /** Prose status line (the app's one live region). */
  status: boolean;
}

/** Shell state at first run: cold. */
export function defaultShellState(): ShellState {
  return { cold: true };
}

/**
 * What to show. The single composition rule lives here so no caller
 * has to reason about the interaction: cold shows only the source
 * region (whose entry state is the page) and the status live region,
 * with dev-only diagnostics exempt as non-product chrome; populated
 * shows everything. The preview region is not listed — its visibility
 * is "a frame exists", composed by the caller, and its collapse is
 * its own section header's business (M14-EXT-31).
 */
export function visibility(state: ShellState): ShellVisibility {
  if (state.cold) {
    return {
      controls: false,
      source: true,
      info: false,
      debug: true,
      status: true,
    };
  }
  return {
    controls: true,
    source: true,
    info: true,
    debug: true,
    status: true,
  };
}
