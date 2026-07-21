/**
 * Preview controller: owns the preview host DOM (toolbar + canvas),
 * translates wheel / drag / keyboard input into viewport changes, and
 * sends the finished transform to the worker. The canvas host is
 * keyboard-operable per UI-STANDARDS: focusable with a visible ring,
 * `+`/`−` zoom, `0` fit, arrow-key pan.
 *
 * The view is a *mode*, not just a number (M6-VIEW-01): fit-to-space,
 * fit-width, and fit-height are recomputed from the live host size, so
 * they survive a panel collapse or a window resize that a saved scale
 * would not. Only 'manual' carries a number, and it is reported in CSS
 * px per stitch so it means the same thing at DPR 1 and DPR 2.
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
  panBy,
  scaledView,
  zoomAt,
  type FitAxis,
  type ViewState,
} from './viewport.ts';

/** Zoom step for buttons and keys; wheel uses a continuous curve. */
const ZOOM_STEP = 1.25;
/** Arrow-key pan step in device px (Shift multiplies by 4). */
const PAN_STEP = 40;
/** CSS px reserved around a fitted design for the tick numbering. */
const FIT_MARGIN = 24;

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
   * Restore a saved view (project load). A fit mode recomputes from
   * the current host; 'manual' restores the saved CSS-px-per-stitch.
   * Pan is deliberately not restored — a stale offset can reopen a
   * design almost entirely off-screen.
   */
  setScale(scale: PreviewScale): void {
    this.mode = scale.mode;
    this.manualCssPxPerStitch = Math.min(
      MAX_PREVIEW_CSS_PX,
      Math.max(MIN_PREVIEW_CSS_PX, scale.cssPxPerStitch),
    );
    if (this.imgW > 0) this.applyMode();
  }

  /** A new processed frame arrived (stitch dimensions). */
  onFrame(width: number, height: number): void {
    this.imgW = width;
    this.imgH = height;
    this.applyMode();
  }

  /** Re-derive the view from the current mode and host size. */
  private applyMode(): void {
    if (this.imgW === 0) return;
    const { w, h } = this.surfaceSize();
    if (this.mode === 'manual') {
      const device = toDevicePxPerStitch(this.manualCssPxPerStitch, window.devicePixelRatio);
      this.setView(scaledView(this.imgW, this.imgH, w, h, device));
      return;
    }
    this.setView(
      fitView(this.imgW, this.imgH, w, h, FIT_MARGIN * window.devicePixelRatio, this.mode),
    );
  }

  /** Fit to the space available, to width, or to height. */
  fit(axis: FitAxis = 'space'): void {
    this.mode = axis;
    this.applyMode();
  }

  /**
   * Reset view: back to fit-to-space, centred, with automatic
   * refitting re-enabled. Deliberately not "actual size" — 1:1 is
   * ambiguous between CSS px, device px, and physical fabric size
   * until the owner defines which one it means.
   */
  resetView(): void {
    this.fit('space');
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

  private bindInput(): void {
    this.host.addEventListener(
      'wheel',
      (event) => {
        if (this.view === null) return;
        event.preventDefault();
        const dpr = window.devicePixelRatio;
        const rect = this.host.getBoundingClientRect();
        const ax = (event.clientX - rect.left) * dpr;
        const ay = (event.clientY - rect.top) * dpr;
        this.goManual();
        this.setView(zoomAt(this.view, Math.pow(1.0015, -event.deltaY), ax, ay));
      },
      { passive: false },
    );

    this.host.addEventListener('pointerdown', (event) => {
      if (this.view === null) return;
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
