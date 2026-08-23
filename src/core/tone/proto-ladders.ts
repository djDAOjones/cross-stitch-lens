/**
 * CREATIVE-01 prototype — programmatic ladder palettes.
 *
 * The shipped ladders are curated (Delft blue, Ukiyo-e; batch 2's
 * light-to-dark rule, D46). The prototype wants two more for the
 * before/afters without pretending to curate: filter the catalogue to
 * a hue window with enough saturation, sort by L*, sample `count`
 * rungs evenly across the lightness range. Deterministic; evidence
 * only — a shipped ladder goes through the signed-batch process
 * (M15-GALLERY-01), never this.
 *
 * PROTOTYPE on branch creative-01-proto (ticket CREATIVE-01): never
 * merged as production source; the signed build re-derives from the
 * ticket.
 */

import { srgbToLab } from '../color/convert.ts';
import { rgbToHsb } from '../color-profile.ts';
import type { Palette, Thread } from '../types.ts';

/** Hue window (degrees, may wrap past 360) → a `count`-rung ladder. */
export function makeLadder(
  threads: readonly Thread[],
  name: string,
  hueLo: number,
  hueHi: number,
  count: number,
): Palette {
  const scratch = new Float32Array(3);
  const inWindow = (hue: number): boolean => {
    const lo = ((hueLo % 360) + 360) % 360;
    const hi = ((hueHi % 360) + 360) % 360;
    return lo <= hi ? hue >= lo && hue <= hi : hue >= lo || hue <= hi;
  };

  const candidates = threads
    .filter((t) => t.status === 'current')
    .map((t) => {
      const [hue, sat, bri] = rgbToHsb(t.rgb);
      srgbToLab(t.rgb[0], t.rgb[1], t.rgb[2], scratch, 0);
      return { thread: t, hue, sat, bri, l: scratch[0] ?? 0 };
    })
    .filter((c) => c.sat >= 20 && c.sat <= 95 && c.bri >= 12 && inWindow(c.hue))
    .sort((a, b) => a.l - b.l || a.thread.id.localeCompare(b.thread.id));

  const rungs: Thread[] = [];
  const seen = new Set<string>();
  if (candidates.length > 0) {
    const last = candidates.length - 1;
    for (let k = 0; k < count; k++) {
      const at = count === 1 ? 0 : Math.round((k * last) / (count - 1));
      const pick = candidates[at];
      if (pick === undefined || seen.has(pick.thread.hex)) continue;
      seen.add(pick.thread.hex);
      rungs.push(pick.thread);
    }
  }
  return { name, entries: rungs };
}
