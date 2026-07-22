/**
 * Controlled interaction source (M13-MEAS-02) — the window the owner
 * shares in the capture picker for repeatable `interaction` rows.
 *
 * A source change in Photoshop has no programmatic timestamp, so the
 * `interaction` boundary cannot be measured against it repeatably;
 * real-Photoshop interaction stays a manual leg (M13-PROF-04 /
 * M13-ACCEPT-02). This window changes **on command**: the harness
 * posts `{type:'change', seq}` on a BroadcastChannel (same origin),
 * this page repaints its whole surface — a new full-bleed colour and a
 * huge sequence number, guaranteed to defeat the dirty-frame
 * downsample — and replies `{type:'painted', seq, at}` after a double
 * `requestAnimationFrame`, i.e. once the change has actually been
 * presented, in absolute monotonic milliseconds.
 *
 * Like the harness, this is its own Vite entry: nothing in the app
 * imports it.
 */

import { absNow } from './bench/clock.ts';

/** Channel name shared with the harness. */
export const BENCH_SOURCE_CHANNEL = 'csl-bench-source';

/** Harness → source commands, and source → harness replies. */
export type BenchSourceMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'change'; seq: number }
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

  const channel = new BroadcastChannel(BENCH_SOURCE_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const message = event.data as BenchSourceMessage;
    if (message.type === 'ping') {
      channel.postMessage({ type: 'pong' } satisfies BenchSourceMessage);
      return;
    }
    if (message.type !== 'change') return;
    stage.style.background = backgroundFor(message.seq);
    stage.textContent = String(message.seq);
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
