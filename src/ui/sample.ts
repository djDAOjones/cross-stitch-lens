/**
 * The "Try a sample" source (M14-IMPL-04, D84): a deterministic
 * test-card drawn programmatically — no asset, no dependency, no
 * randomness — that feeds the normal import route as a `PixelBuffer`
 * and exercises the true pipeline. Content chosen to show what the
 * app does: a hue sweep over a lightness ramp (palette reduction),
 * smooth gradients (dithering), a greyscale band (neutral mapping),
 * and flat swatches (clean areas + stats).
 *
 * Lives in `src/ui/` deliberately: it is interface furniture, not
 * engine — `src/core/` must not know samples exist.
 */

import type { PixelBuffer } from '../core/types.ts';

/** Sample edge length, px. */
export const SAMPLE_SIDE = 256;

/** Display name used in status copy and the source row. */
export const SAMPLE_NAME = 'Sample image';

/** HSL → RGB (h 0–360, s/l 0–1) → 0–255 channels. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Flat swatch colours for the bottom band (named, stitchable hues). */
const SWATCHES: readonly [number, number, number][] = [
  [178, 34, 34], // brick red
  [255, 140, 0], // orange
  [240, 220, 90], // straw
  [34, 139, 34], // leaf green
  [70, 130, 180], // steel blue
  [75, 0, 130], // indigo
  [244, 194, 194], // rose
  [92, 64, 51], // walnut
];

/** Build the deterministic sample buffer (same bytes every call). */
export function sampleBuffer(): PixelBuffer {
  const side = SAMPLE_SIDE;
  const data = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const i = (y * side + x) * 4;
      let rgb: [number, number, number];
      if (y < 144) {
        // Hue sweep across, lightness ramp down: reduction + dither
        // both have something to chew on.
        rgb = hslToRgb((x / (side - 1)) * 360, 0.75, 0.28 + (y / 143) * 0.5);
      } else if (y < 192) {
        // Greyscale ramp: neutral mapping and banding behaviour.
        const g = Math.round((x / (side - 1)) * 255);
        rgb = [g, g, g];
      } else {
        // Flat swatches: clean areas, honest stats, palette identity.
        const swatch = SWATCHES[Math.min(Math.floor(x / (side / 8)), 7)] ?? [0, 0, 0];
        rgb = swatch;
      }
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return { width: side, height: side, data };
}
