/**
 * Controlled interaction source (M13-MEAS-02) — the window the owner
 * shares in the capture picker for repeatable `interaction` rows.
 *
 * A source change in Photoshop has no programmatic timestamp, so the
 * `interaction` boundary cannot be measured against it repeatably;
 * real-Photoshop interaction stays a manual leg (M13-PROF-04 /
 * M13-ACCEPT-02). This window changes **on command**: the harness
 * posts `{type:'change', seq}` on a BroadcastChannel (same origin),
 * this page repaints — and replies `{type:'painted', seq, at}` after a
 * double `requestAnimationFrame`, i.e. once the change has actually
 * been presented, in absolute monotonic milliseconds.
 *
 * Two repaint modes (M13-MEAS-03):
 *
 * - **Legacy full-bleed** (`pattern` absent) — a new full-surface
 *   colour and a huge sequence number, guaranteed to defeat the
 *   dirty-frame downsample. The `interaction` rows and the canonical
 *   live windows use this.
 * - **Edit classes** (`pattern` set) — the six Part-B approximations
 *   drawn on a full-window canvas from pure seeded geometry
 *   (`src/bench/edit-classes.ts`). Controlled-source numbers only —
 *   never presented as Photoshop capture behaviour.
 *
 * Like the harness, this is its own Vite entry: nothing in the app
 * imports it.
 */

import { editOpsFor, type EditClass } from './bench/edit-classes.ts';
import { absNow } from './bench/clock.ts';

/** Channel name shared with the harness. */
export const BENCH_SOURCE_CHANNEL = 'csl-bench-source';

/** Harness → source commands, and source → harness replies. */
export type BenchSourceMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'change'; seq: number; pattern?: EditClass }
  | { type: 'painted'; seq: number; at: number };

/** Full-saturation hue rotation — consecutive changes never resemble
 * each other, so the 64×64 dirty downsample always sees them. */
function backgroundFor(seq: number): string {
  return `hsl(${String((seq * 137) % 360)} 90% 45%)`;
}

function main(): void {
  const stage = document.createElement('div');
  stage.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'font:700 20vw system-ui, sans-serif;color:#ffffff;background:#161616;';
  stage.textContent = '0';
  document.body.style.margin = '0';
  document.body.append(stage);

  // Edit-class surface: a CSS-px canvas over the legacy stage, shown
  // only while patterned commands arrive. Marks accumulate like edits
  // on a real document; a whole-surface class clears first.
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;display:none;';
  document.body.append(canvas);
  let canvasCleared = false;
  const sizeCanvas = (): void => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    canvasCleared = false;
  };
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  function drawPattern(pattern: EditClass, seq: number): void {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    canvas.style.display = 'block';
    const ops = editOpsFor(pattern, seq, canvas.width, canvas.height);
    if (ops.clear || !canvasCleared) {
      ctx.fillStyle = ops.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCleared = true;
    }
    for (const rect of ops.rects) {
      ctx.fillStyle = rect.fill;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    for (const segment of ops.segments) {
      ctx.strokeStyle = segment.stroke;
      ctx.lineWidth = segment.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }
  }

  const channel = new BroadcastChannel(BENCH_SOURCE_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const message = event.data as BenchSourceMessage;
    if (message.type === 'ping') {
      channel.postMessage({ type: 'pong' } satisfies BenchSourceMessage);
      return;
    }
    if (message.type !== 'change') return;
    if (message.pattern === undefined) {
      // Legacy full-bleed change; drop back out of any edit-class run.
      canvas.style.display = 'none';
      canvasCleared = false;
      stage.style.background = backgroundFor(message.seq);
      stage.textContent = String(message.seq);
    } else {
      drawPattern(message.pattern, message.seq);
    }
    // Double rAF: the first fires before paint of this frame, the
    // second after the changed frame has been presented — the closest
    // a page gets to "the change is on screen".
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        channel.postMessage({
          type: 'painted',
          seq: message.seq,
          at: absNow(),
        } satisfies BenchSourceMessage);
      });
    });
  };
}

main();
