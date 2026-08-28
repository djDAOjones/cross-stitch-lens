/**
 * Latest-wins frame coalescing (architecture.md → "Worker &
 * scheduling"): if work arrives while the executor is busy, only the
 * newest waits — there is no queue, older pending work is dropped.
 * Pure state machine so the policy is testable without a Worker.
 */

/** Latest-wins scheduler for a single busy resource. */
export class Coalescer<T> {
  private busy = false;
  private pending: T | null = null;
  private dropped = 0;

  /**
   * Offer new work. Returns the item to start now, or null if the
   * resource is busy (the item waits as the single pending slot,
   * displacing — dropping — any earlier pending item).
   */
  submit(item: T): T | null {
    if (!this.busy) {
      this.busy = true;
      return item;
    }
    if (this.pending !== null) this.dropped++;
    this.pending = item;
    return null;
  }

  /**
   * Mark the running work finished. Returns the pending item to start
   * next (keeping the resource busy), or null when idle.
   */
  complete(): T | null {
    if (this.pending !== null) {
      const next = this.pending;
      this.pending = null;
      return next;
    }
    this.busy = false;
    return null;
  }

  /**
   * Abandon any pending work and go idle (STATE-04).
   *
   * For the case where the running work will never complete — a
   * worker that died mid-frame. Without this the gate stays shut for
   * ever, because `complete()` is only ever called from a response
   * that is no longer coming, and the preview simply stops with no
   * explanation. Mirrors `PumpGate.reset()`.
   */
  reset(): void {
    this.busy = false;
    this.pending = null;
  }

  /** Frames dropped by coalescing so far (diagnostics). */
  get droppedCount(): number {
    return this.dropped;
  }

  /** Whether work is currently running. */
  get isBusy(): boolean {
    return this.busy;
  }
}
