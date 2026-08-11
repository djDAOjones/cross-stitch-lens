/**
 * Preview controller: owns the preview host DOM (toolbar + canvas),
 * translates drag / keyboard input into viewport changes, and sends
 * the finished transform to the worker. The canvas host is
 * keyboard-operable per UI-STANDARDS: focusable with a visible ring,
 * `+`/`−` zoom, `0` reset view, arrow-key pan.
 *
 * The view is a two-state machine (M14-EXT-08): **auto** ('space') —
 * fit-to-space, centred, re-derived on every source change and host
 * resize — and **manual**, entered by any deliberate zoom or pan and
 * left by Reset view, `0`, or a source replacement. Fitting is not a
 * task the user owns. Only 'manual' carries a number, reported in CSS
 * px per stitch so it means the same thing at DPR 1 and DPR 2.
 *
 * Pan engagement *is* host focus (M14-EXT-10): unfocused, the canvas
 * is inert to wheel and drag so the page scrolls past it; a click
 * focuses (native), and only a focused host pans. While engaged the
 * trackpad drives the view too (M14-EXT-27): pinch zooms about the
 * pointer, two-finger scroll pans. Escape blurs — disengaging is one
 * deliberate step.
 *
 * Everything here is view-only: no message this class sends can run
 * the pipeline, change the pattern, or touch export settings.
 */

import type { PipelineClient } from '../worker/client.ts';
import {
  MAX_PREVIEW_CSS_PX,
  MIN_PREVIEW_CSS_PX,
  toCssPxPerStitch,
  toDevicePxPerStitch,
  type PreviewFitMode,
  type PreviewScale,
} from './scales.ts';
import {
  clampPan,
  fitView,
  hugHeight,
  panBy,
  pinchZoomFactor,
  scaledView,
  wheelIntent,
  zoomAt,
  type ViewState,
} from './viewport.ts';

/** Zoom step for buttons and keys; wheel uses a continuous curve. */
const ZOOM_STEP = 1.25;
/** Arrow-key pan step in device px (Shift multiplies by 4). */
const PAN_STEP = 40;
/** CSS px reserved around a fitted design for the tick numbering. */
const FIT_MARGIN = 24;
/** Smallest useful canvas height (CSS px) under the hug. */
const HUG_MIN_CSS = 160;
/** Posture caps for the hugged height, as viewport-height shares. */
const HUG_CAP_NARROW = 0.4;
const HUG_CAP_WIDE = 0.6;
/** The stacked-layout breakpoint (60rem at 16px), in CSS px. */
const NARROW_MAX_CSS = 960;

export class PreviewController {
  private readonly client: PipelineClient;
  private readonly host: HTMLElement;
  private readonly zoomLabel: HTMLElement;
  private readonly onChange: (scale: PreviewScale) => void;
  private view: ViewState | null = null;
  private imgW = 0;
  private imgH = 0;
  private mode: PreviewFitMode = 'space';
  /** Honoured while `mode` is 'manual'; the last fit value otherwise. */
  private manualCssPxPerStitch = 1;
  private dragging: { x: number; y: number } | null = null;

  constructor(
    client: PipelineClient,
    host: HTMLElement,
    zoomLabel: HTMLElement,
    onChange: (scale: PreviewScale) => void = () => {
      /* no reporting by default */
    },
  ) {
    this.client = client;
    this.host = host;
    this.zoomLabel = zoomLabel;
    this.onChange = onChange;
    this.bindInput();
    // A responsive resize is not a user action: a fit mode refits, but
    // a manual scale is left exactly where the user put it.
    new ResizeObserver(() => {
      this.syncSurfaceSize();
      if (this.imgW > 0) this.applyMode();
    }).observe(host);
  }

  /** Device-pixel size of the host. */
  private surfaceSize(): { w: number; h: number } {
    const dpr = window.devicePixelRatio;
    return {
      w: Math.max(1, Math.round(this.host.clientWidth * dpr)),
      h: Math.max(1, Math.round(this.host.clientHeight * dpr)),
    };
  }

  private syncSurfaceSize(): void {
    const { w, h } = this.surfaceSize();
    this.client.resizeSurface(w, h);
  }

  /** Call once after attachCanvas: sizes the backing store. */
  initSurface(): void {
    this.syncSurfaceSize();
  }

  /** The current view mode and scale, for persistence and readouts. */
  scale(): PreviewScale {
    return {
      mode: this.mode,
      cssPxPerStitch:
        this.view === null
          ? this.manualCssPxPerStitch
          : toCssPxPerStitch(this.view.scale, window.devicePixelRatio),
    };
  }

  /**
   * A saved view arrives (project load). The stored mode and scale
   * keep round-tripping in the schema, but they no longer drive the
   * opening view: every load enters auto-fit — predictability over
   * restoration (M14-EXT-08, D95). The saved scale seeds the manual
   * value so a later deliberate zoom starts somewhere sensible.
   */
  setScale(scale: PreviewScale): void {
    this.mode = 'space';
    this.manualCssPxPerStitch = Math.min(
      MAX_PREVIEW_CSS_PX,
      Math.max(MIN_PREVIEW_CSS_PX, scale.cssPxPerStitch),
    );
    if (this.imgW > 0) this.applyMode();
  }

  /**
   * A new processed frame arrived (stitch dimensions).
   *
   * Re-derives the view only when the dimensions actually changed
   * (ZOOM-01, D158). It used to re-derive on every frame, and the
   * manual branch of `applyMode` re-centres via `scaledView` — so
   * under live capture, every arriving frame threw away the wheel
   * zoom's pointer anchor (and any pan) within one frame interval:
   * the zoom landed anchored, then visibly snapped to centre. A
   * same-size frame now leaves the user's view exactly where they put
   * it; host resizes are the ResizeObserver's job, and a genuine
   * dimension change (a new pattern) still re-derives — there is no
   * meaningful anchor to preserve across a different stitch grid.
   */
  onFrame(width: number, height: number): void {
    const changed = width !== this.imgW || height !== this.imgH;
    this.imgW = width;
    this.imgH = height;
    if (changed || this.view === null) this.applyMode();
  }

  /**
   * The host hugs the fitted design under auto-fit (M14-FIX-03): fit
   * the width, follow the aspect, cap to the posture (40dvh stacked,
   * 60dvh wide). Height depends only on host width and design shape,
   * so the ResizeObserver settles in one pass — geometry never feeds
   * itself, and nothing is scroll-linked (the M14-FIX-06 cure: the
   * oscillation was the dock's height change moving its own scroll
   * trigger). Manual zoom freezes the height where the user left it.
   */
  private hugHost(): void {
    const capShare = window.innerWidth < NARROW_MAX_CSS ? HUG_CAP_NARROW : HUG_CAP_WIDE;
    const wanted = hugHeight(
      this.imgW,
      this.imgH,
      this.host.clientWidth,
      FIT_MARGIN,
      HUG_MIN_CSS,
      Math.round(window.innerHeight * capShare),
    );
    if (Math.abs(this.host.clientHeight - wanted) <= 1) return;
    this.host.style.height = `${String(wanted)}px`;
    this.syncSurfaceSize();
  }

  /** Re-derive the view from the current mode and host size. */
  private applyMode(): void {
    if (this.imgW === 0) return;
    if (this.mode !== 'manual') this.hugHost();
    const { w, h } = this.surfaceSize();
    if (this.mode === 'manual') {
      const device = toDevicePxPerStitch(this.manualCssPxPerStitch, window.devicePixelRatio);
      this.setView(scaledView(this.imgW, this.imgH, w, h, device));
      return;
    }
    // Legacy 'width'/'height' modes can only arrive from an old saved
    // file, and setScale coerces those to 'space' — but keep the axis
    // pass-through so a value that slips in still fits sanely.
    this.setView(
      fitView(this.imgW, this.imgH, w, h, FIT_MARGIN * window.devicePixelRatio, this.mode),
    );
  }

  /**
   * Reset view: back to auto-fit — fit-to-space, centred, automatic
   * refitting re-enabled (the one surviving fit control, M14-EXT-08;
   * Fit width/height retired with the D86 A16 waiver). Deliberately
   * not "actual size" — 1:1 is ambiguous between CSS px, device px,
   * and physical fabric size until the owner defines which one.
   */
  resetView(): void {
    this.mode = 'space';
    this.applyMode();
  }

  /** Zoom by a factor anchored at the view centre (buttons / keys). */
  zoomCentred(factor: number): void {
    if (this.view === null) return;
    const { w, h } = this.surfaceSize();
    this.goManual();
    this.setView(zoomAt(this.view, factor, w / 2, h / 2));
  }

  /** Any user zoom or pan leaves the fit modes behind. */
  private goManual(): void {
    this.mode = 'manual';
  }

  private setView(view: ViewState): void {
    const { w, h } = this.surfaceSize();
    this.view = clampPan(view, this.imgW, this.imgH, w, h);
    this.client.setView(this.view.scale, this.view.tx, this.view.ty);
    const css = toCssPxPerStitch(this.view.scale, window.devicePixelRatio);
    if (this.mode === 'manual') this.manualCssPxPerStitch = css;
    this.zoomLabel.textContent = `${String(Math.round(css * 100))}%`;
    this.onChange(this.scale());
  }

  /** Pan engagement is host focus (M14-EXT-10). */
  private engaged(): boolean {
    return document.activeElement === this.host;
  }

  private bindInput(): void {
    // The M14-EXT-10 rule split by M14-EXT-27 (owner authority,
    // D106): the UNFOCUSED surface keeps the no-wheel promise
    // verbatim — wheelIntent returns 'none' and the page scrolls
    // past. The ENGAGED state reopens it: ctrl-wheel (macOS trackpad
    // pinch in Chromium/Firefox) zooms about the pointer, a plain
    // wheel pans. Non-passive only because the engaged preventDefault
    // is the contract; it never fires unengaged, so page scroll and
    // browser zoom outside the engaged canvas are untouched.
    this.host.addEventListener(
      'wheel',
      (event) => {
        const intent = wheelIntent(this.engaged(), event.ctrlKey);
        if (intent === 'none' || this.view === null) return;
        event.preventDefault();
        const dpr = window.devicePixelRatio;
        this.goManual();
        if (intent === 'zoom') {
          const rect = this.host.getBoundingClientRect();
          this.setView(
            zoomAt(
              this.view,
              pinchZoomFactor(event.deltaY),
              (event.clientX - rect.left) * dpr,
              (event.clientY - rect.top) * dpr,
            ),
          );
        } else {
          this.setView(panBy(this.view, -event.deltaX * dpr, -event.deltaY * dpr));
        }
      },
      { passive: false },
    );

    // Safari fires proprietary gesture events for trackpad pinch, not
    // ctrl-wheel. Same contract: armed only while engaged — an
    // unengaged canvas leaves browser page zoom alone (AAA: never
    // break user agent zoom). The events carry an absolute `scale`
    // relative to the gesture start, so the start pins the base.
    let gestureBaseScale = 1;
    const gestureScaleOf = (event: Event): number | null => {
      const scale = (event as { scale?: unknown }).scale;
      return typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : null;
    };
    this.host.addEventListener('gesturestart', (event) => {
      if (!this.engaged() || this.view === null) return;
      event.preventDefault();
      gestureBaseScale = this.view.scale;
    });
    this.host.addEventListener('gesturechange', (event) => {
      if (!this.engaged() || this.view === null) return;
      event.preventDefault();
      const scale = gestureScaleOf(event);
      if (scale === null) return;
      const raw = event as { clientX?: unknown; clientY?: unknown };
      const rect = this.host.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      const cx = typeof raw.clientX === 'number' ? raw.clientX : rect.left + rect.width / 2;
      const cy = typeof raw.clientY === 'number' ? raw.clientY : rect.top + rect.height / 2;
      this.goManual();
      this.setView(
        zoomAt(
          this.view,
          (gestureBaseScale * scale) / this.view.scale,
          (cx - rect.left) * dpr,
          (cy - rect.top) * dpr,
        ),
      );
    });
    this.host.addEventListener('gestureend', (event) => {
      if (this.engaged()) event.preventDefault();
    });

    this.host.addEventListener('pointerdown', (event) => {
      // At pointerdown on an unfocused host the click is the engage
      // gesture: focus arrives natively right after this event, and
      // only the *next* drag pans. Not capturing here also keeps
      // touch scrolling over an unengaged canvas as page scroll.
      if (this.view === null || !this.engaged()) return;
      this.dragging = { x: event.clientX, y: event.clientY };
      this.host.setPointerCapture(event.pointerId);
      this.host.classList.add('grabbing');
    });
    this.host.addEventListener('pointermove', (event) => {
      if (this.dragging === null || this.view === null) return;
      const dpr = window.devicePixelRatio;
      const dx = (event.clientX - this.dragging.x) * dpr;
      const dy = (event.clientY - this.dragging.y) * dpr;
      this.dragging = { x: event.clientX, y: event.clientY };
      this.goManual();
      this.setView(panBy(this.view, dx, dy));
    });
    const endDrag = () => {
      this.dragging = null;
      this.host.classList.remove('grabbing');
    };
    this.host.addEventListener('pointerup', endDrag);
    this.host.addEventListener('pointercancel', endDrag);

    this.host.addEventListener('keydown', (event) => {
      if (this.view === null) return;
      // Escape disengages: blur, and consume the press so no outer
      // Escape handler treats the same press as its own (M14-EXT-10).
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.host.blur();
        return;
      }
      const pan = event.shiftKey ? PAN_STEP * 4 : PAN_STEP;
      const actions: Record<string, () => void> = {
        '+': () => this.zoomCentred(ZOOM_STEP),
        '=': () => this.zoomCentred(ZOOM_STEP),
        '-': () => this.zoomCentred(1 / ZOOM_STEP),
        '0': () => this.resetView(),
        ArrowLeft: () => this.nudge(pan, 0),
        ArrowRight: () => this.nudge(-pan, 0),
        ArrowUp: () => this.nudge(0, pan),
        ArrowDown: () => this.nudge(0, -pan),
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    });
  }

  private nudge(dx: number, dy: number): void {
    if (this.view === null) return;
    this.goManual();
    this.setView(panBy(this.view, dx, dy));
  }
}
