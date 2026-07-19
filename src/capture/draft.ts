/**
 * Draft-quality governor (§22, M4): decides when live preview should
 * drop to draft quality (dithering off) because the pipeline is
 * falling behind, and when to restore full quality. Pure hysteresis
 * over per-frame processing times — no timers, no DOM — hermetically
 * tested. Exports never consult this: they always re-run the pipeline
 * at full quality (AGENTS.md invariant).
 */

/** Processing time that counts as "under load" (ms per frame). */
export const DRAFT_ENTER_MS = 200;
/** Processing time that counts as comfortably fast (ms per frame). */
export const DRAFT_EXIT_MS = 100;
/** Consecutive slow frames before entering draft. */
export const DRAFT_ENTER_COUNT = 2;
/** Consecutive fast frames before restoring full quality. */
export const DRAFT_EXIT_COUNT = 5;

/**
 * Hysteresis state machine: enters draft after `enterCount`
 * consecutive samples over `enterMs`, exits after `exitCount`
 * consecutive samples under `exitMs`. The gap between the two
 * thresholds stops flapping at the boundary.
 */
export class DraftGovernor {
  private draft = false;
  private slowRun = 0;
  private fastRun = 0;

  constructor(
    private readonly enterMs = DRAFT_ENTER_MS,
    private readonly exitMs = DRAFT_EXIT_MS,
    private readonly enterCount = DRAFT_ENTER_COUNT,
    private readonly exitCount = DRAFT_EXIT_COUNT,
  ) {}

  /** Feed one frame's processing time; returns the current mode. */
  sample(ms: number): boolean {
    if (this.draft) {
      this.fastRun = ms < this.exitMs ? this.fastRun + 1 : 0;
      if (this.fastRun >= this.exitCount) {
        this.draft = false;
        this.fastRun = 0;
      }
    } else {
      this.slowRun = ms > this.enterMs ? this.slowRun + 1 : 0;
      if (this.slowRun >= this.enterCount) {
        this.draft = true;
        this.slowRun = 0;
      }
    }
    return this.draft;
  }

  /** Whether the preview is currently in draft mode. */
  get isDraft(): boolean {
    return this.draft;
  }

  /** Back to full quality with no history (session end/pause). */
  reset(): void {
    this.draft = false;
    this.slowRun = 0;
    this.fastRun = 0;
  }
}
