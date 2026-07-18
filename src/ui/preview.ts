/**
 * Preview controller: owns the preview host DOM (toolbar + canvas),
 * translates wheel / drag / keyboard input into viewport changes, and
 * sends the finished transform to the worker. The canvas host is
 * keyboard-operable per UI-STANDARDS: focusable with a visible ring,
 * `+`/`−` zoom, `0` fit, arrow-key pan.
 */

import type { PipelineClient } from '../worker/client.ts';
import {
  clampPan,
  fitView,
  panBy,
  zoomAt,
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
  private view: ViewState | null = null;
  private imgW = 0;
  private imgH = 0;
  private autoFit = true;
  private dragging: { x: number; y: number } | null = null;

  constructor(client: PipelineClient, host: HTMLElement, zoomLabel: HTMLElement) {
    this.client = client;
    this.host = host;
    this.zoomLabel = zoomLabel;
    this.bindInput();
    new ResizeObserver(() => {
      this.syncSurfaceSize();
      if (this.autoFit && this.imgW > 0) this.fit();
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

  /** A new processed frame arrived (stitch dimensions). */
  onFrame(width: number, height: number): void {
    const isNewImage = width !== this.imgW || height !== this.imgH;
    this.imgW = width;
    this.imgH = height;
    if (this.autoFit || isNewImage) {
      this.autoFit = true;
      this.fit();
    }
  }

  /** Fit-to-window (also the `0` key and the Fit button). */
  fit(): void {
    if (this.imgW === 0) return;
    const { w, h } = this.surfaceSize();
    this.autoFit = true;
    this.setView(fitView(this.imgW, this.imgH, w, h, FIT_MARGIN * window.devicePixelRatio));
  }

  /** Zoom by a factor anchored at the view centre (buttons / keys). */
  zoomCentred(factor: number): void {
    if (this.view === null) return;
    const { w, h } = this.surfaceSize();
    this.autoFit = false;
    this.setView(zoomAt(this.view, factor, w / 2, h / 2));
  }

  private setView(view: ViewState): void {
    const { w, h } = this.surfaceSize();
    this.view = clampPan(view, this.imgW, this.imgH, w, h);
    this.client.setView(this.view.scale, this.view.tx, this.view.ty);
    const percent = Math.round((this.view.scale / window.devicePixelRatio) * 100);
    this.zoomLabel.textContent = `${String(percent)}%`;
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
        this.autoFit = false;
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
      this.autoFit = false;
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
        '0': () => this.fit(),
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
    this.autoFit = false;
    this.setView(panBy(this.view, dx, dy));
  }
}
