/**
 * The profile-world resolver (`resolveProfilePalette`, M15-UI-01) had
 * no direct tests until COUNT-01 / MUST-01: palette-selection.test.ts
 * covers the selector both worlds share through the retired
 * policy-world entry point, not the sentences and seat rules this one
 * owns. Three pins from the first live-app reports.
 */

import { describe, expect, it } from 'vitest';

import { emptyRecipe, type ColorProfileRecipe } from '../src/core/color-profile.ts';
import { resolveProfilePalette } from '../src/core/palette-resolve.ts';
import { loadCatalogue } from '../src/core/thread-catalogue.ts';
import type { PixelBuffer } from '../src/core/types.ts';

const catalogue = loadCatalogue();

/** A 16×16 gradient: enough distinct colours for any count to bite. */
function gradient(): PixelBuffer {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (x * 16) & 255;
      data[i + 1] = (y * 16) & 255;
      data[i + 2] = ((x + y) * 8) & 255;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

function resolve(
  recipe: Partial<ColorProfileRecipe>,
  mustUse: string[] = [],
  owned?: ReadonlySet<string>,
): ReturnType<typeof resolveProfilePalette> {
  return resolveProfilePalette({
    recipe: { ...emptyRecipe(), ...recipe },
    design: { count: { mode: 'max', n: 8 }, minDistance: 0, mustUse },
    inputs: { catalogue, owned },
    source: gradient(),
    name: 'test',
  });
}

describe('resolveProfilePalette (the profile world)', () => {
  it('keeps a Must-use seat outside the membership as a Note, never a substitute (MUST-01)', () => {
    const resolved = resolve({ libraries: ['dmc'] }, ['anchor:403']);
    expect(resolved.ok).toBe(true);
    expect(resolved.palette.entries).toHaveLength(8);
    expect(resolved.palette.entries.some((t) => t.id === 'anchor:403')).toBe(false);
    const note = resolved.conflicts.find((c) => c.kind === 'locked-not-permitted');
    expect(note?.severity).toBe('warning');
    expect(note?.ids).toEqual(['anchor:403']);
    expect(resolved.lockedCount).toBe(0);
  });

  it('reads grammatically when the profile resolves fewer colours than asked (COUNT-01)', () => {
    const one = resolve({ include: ['dmc:310'] });
    expect(one.conflicts.find((c) => c.kind === 'count-exceeds-eligible')?.message).toBe(
      'You asked for 8 colours but this profile resolves 1 colour, so it is being used.',
    );
    const six = resolve({
      include: ['dmc:310', 'dmc:321', 'dmc:666', 'dmc:699', 'dmc:796', 'dmc:973'],
    });
    expect(six.palette.entries).toHaveLength(6);
    expect(six.conflicts.find((c) => c.kind === 'count-exceeds-eligible')?.message).toBe(
      'You asked for 8 colours but this profile resolves 6 colours, so all 6 are being used.',
    );
  });

  it('carries a My-threads design with an empty inventory through as empty and not ok, naming the inventory', () => {
    // The owner's project-120x60.json, in miniature: six seats on a
    // profile whose membership is the inventory of another browser.
    const resolved = resolve({ libraries: ['mine'] }, ['anchor:403', 'ariadna:1781'], new Set());
    expect(resolved.ok).toBe(false);
    expect(resolved.palette.entries).toHaveLength(0);
    expect(resolved.selectedCount).toBe(0);
    const problem = resolved.conflicts.find((c) => c.kind === 'owned-none');
    expect(problem?.severity).toBe('error');
    expect(problem?.message).toContain('inventory has no threads in this browser');
  });
});
