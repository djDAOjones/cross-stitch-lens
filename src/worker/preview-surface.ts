/**
 * Worker-side preview surface: owns the transferred OffscreenCanvas,
 * the ImageBitmap of the last processed frame, and the current view
 * transform. Redraws whenever any of the three changes. Pixels stay
 * crisp (no smoothing) — stitches are squares, not blurs.
 */

interface View {
  scale: number;
  tx: number;
  ty: number;
}

let canvas: OffscreenCanvas | null = null;
let bitmap: ImageBitmap | null = null;
let view: View | null = null;

function draw(): void {
  if (canvas === null) return;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bitmap === null || view === null) return;
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(view.scale, 0, 0, view.scale, view.tx, view.ty);
  ctx.drawImage(bitmap, 0, 0);
}

/** Adopt the transferred surface. */
export function setSurface(surface: OffscreenCanvas): void {
  canvas = surface;
  draw();
}

/** Replace the frame bitmap (closes the previous one). */
export function setFrame(next: ImageBitmap): void {
  bitmap?.close();
  bitmap = next;
  draw();
}

/** Apply a view transform from the main thread. */
export function setView(next: View): void {
  view = next;
  draw();
}

/** Resize the surface backing store (device px). */
export function resizeSurface(width: number, height: number): void {
  if (canvas === null) return;
  canvas.width = width;
  canvas.height = height;
  draw();
}
