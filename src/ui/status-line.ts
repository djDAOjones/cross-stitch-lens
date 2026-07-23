/**
 * The compact status line for preview focus (M6-FOCUS-01).
 *
 * Derived from one explicit snapshot of owned state — never by
 * scraping the prose status region or the stats table. A status line
 * assembled from several rendered DOM strings goes stale silently, and
 * a stale status is worse than none: in focus mode it is the *only*
 * thing telling the user whether live capture is still running.
 *
 * Every field is words, not colour (UI-STANDARDS → "Perceivable").
 */

import { patternSummary, type PatternResolution } from './scales.ts';

/** Where the capture session is. 'off' = no session was ever started. */
export type CaptureState = 'off' | 'live' | 'paused' | 'ended';

/**
 * What the dirty gate last decided. 'refresh-pending' is the honest
 * name for "looks unchanged, so a forced refresh is due" — the bounded
 * staleness the gate trades for a cheap idle path (D46).
 */
export type SourceFreshness = 'changing' | 'unchanged' | 'refresh-pending';

/** Everything the compact line needs, in one snapshot. */
export interface StatusSnapshot {
  pattern: PatternResolution;
  /** Palette name, or null for full-RGB mode. */
  paletteName: string | null;
  /** Colours in the current output; null before anything has processed. */
  colorCount: number | null;
  capture: CaptureState;
  freshness: SourceFreshness;
  /** M4 draft quality — a pixel state, named separately from the mode. */
  draft: boolean;
}

const CAPTURE_TEXT: Record<CaptureState, string> = {
  off: 'No capture',
  live: 'Capture live',
  paused: 'Capture paused',
  ended: 'Capture ended',
};

const FRESHNESS_TEXT: Record<SourceFreshness, string> = {
  changing: 'Source changing',
  unchanged: 'Source unchanged',
  'refresh-pending': 'Refresh pending',
};

/**
 * One line, middot-separated, in a fixed field order so the eye can
 * find a field by position rather than re-reading the whole line:
 * pattern · palette · colours · capture [· freshness] [· draft].
 *
 * Freshness is only meaningful while a session is live, so it is
 * omitted otherwise rather than reported as a stale leftover.
 */
export function statusLine(snapshot: StatusSnapshot): string {
  const parts: string[] = [
    patternSummary(snapshot.pattern),
    snapshot.paletteName ?? 'Unlimited colours',
  ];
  if (snapshot.colorCount !== null) {
    parts.push(
      snapshot.colorCount === 1 ? '1 colour' : `${String(snapshot.colorCount)} colours`,
    );
  }
  parts.push(CAPTURE_TEXT[snapshot.capture]);
  if (snapshot.capture === 'live') parts.push(FRESHNESS_TEXT[snapshot.freshness]);
  if (snapshot.draft) parts.push('Draft quality');
  return parts.join(' · ');
}
