/**
 * Reusable grab surface (M13-IMPL-01, D135 candidate 1).
 *
 * Every accepted capture frame used to build a fresh `OffscreenCanvas`
 * and a fresh 2D context, so a 6.5 MP share allocated a ~26 MB backing
 * store plus a graphics resource 30 times a second (D71 census #1; the
 * allocator confirmed in the owner's Part-C trace, D134). Nothing about
 * that canvas is per-frame: the same surface can be drawn over as long
 * as the crop size is unchanged.
 *
 * This holds exactly one canvas and hands it back on every acquire,
 * resizing in place when the crop changes — assigning `width`/`height`
 * reallocates the backing store but keeps the canvas object and its
 * context alive, which is the cheaper of the two ways to change size.
 *
 * The canvas type is a parameter and the canvas is built by an injected
 * factory purely so the reuse rule is provable in Node: the invariant
 * worth protecting is "N grabs at one size allocate one surface", and a
 * test can only see that through a counting fake. Browser code passes
 * `new OffscreenCanvas(w, h)` and `canvas.getContext('2d', …)`.
 */

/** The minimum a surface must expose: a resizable pixel rectangle. */
export interface Resizable {
  width: number;
  height: number;
}

/** Allocation bookkeeping — diagnostics, and the reuse invariant's oracle. */
export interface SurfaceStats {
  /** Canvases built by the factory. One, for the life of a session. */
  readonly created: number;
  /** In-place resizes: one per crop-size change, never per frame. */
  readonly resized: number;
}

/** A canvas + its drawing context, reused across frames. */
export interface AcquiredSurface<C, X> {
  canvas: C;
  ctx: X;
}

/** One reusable canvas behind an `acquire(width, height)` call. */
export interface ReusableSurface<C, X> {
  /**
   * The surface sized `width` × `height`. Returns the same canvas and
   * context object every time; the pixels are whatever was last drawn,
   * except after a resize, which clears them (canvas semantics).
   *
   * @throws if the context factory returns null (2D unavailable).
   */
  acquire(width: number, height: number): AcquiredSurface<C, X>;
  /** The live surface without touching its size, or null before the first acquire. */
  current(): AcquiredSurface<C, X> | null;
  /**
   * Drop the surface and free its pixels **now** (STATE-02).
   *
   * A grab surface holds a full copy of the last frame the user
   * shared, and letting it wait for garbage collection means those
   * pixels live for as long as the page happens to keep the session
   * object reachable. Zeroing the dimensions releases the backing
   * store at the point the app decides it is done with the frame,
   * which is the only point it can honestly claim to have released
   * it. Idempotent; `current()` reads null afterwards and a later
   * `acquire` builds a fresh canvas.
   */
  release(): void;
  readonly stats: SurfaceStats;
}

/**
 * Build a one-canvas pool.
 *
 * @param create Builds a canvas at an initial size. Called at most once.
 * @param context Fetches the 2D context from that canvas; null means unavailable.
 */
export function reusableSurface<C extends Resizable, X>(
  create: (width: number, height: number) => C,
  context: (canvas: C) => X | null,
): ReusableSurface<C, X> {
  let held: AcquiredSurface<C, X> | null = null;
  let created = 0;
  let resized = 0;

  return {
    acquire(width: number, height: number): AcquiredSurface<C, X> {
      if (held === null) {
        const canvas = create(width, height);
        created += 1;
        const ctx = context(canvas);
        if (ctx === null) throw new Error('2d canvas context unavailable');
        held = { canvas, ctx };
        return held;
      }
      // Assigning either dimension resets the whole backing store, so
      // only touch them when the size actually moved — the hot path is
      // a same-size grab, which must cost nothing.
      if (held.canvas.width !== width || held.canvas.height !== height) {
        held.canvas.width = width;
        held.canvas.height = height;
        resized += 1;
      }
      return held;
    },
    current(): AcquiredSurface<C, X> | null {
      return held;
    },
    release(): void {
      if (held === null) return;
      // Zeroing either dimension reallocates — here, to nothing. Done
      // before dropping the reference, so the pixels are gone whether
      // or not anything else still holds the canvas.
      held.canvas.width = 0;
      held.canvas.height = 0;
      held = null;
    },
    get stats(): SurfaceStats {
      return { created, resized };
    },
  };
}
