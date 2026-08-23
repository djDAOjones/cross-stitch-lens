/**
 * The profile-world resolver (`resolveProfilePalette`, M15-UI-01) had
 * no direct tests until COUNT-01 / MUST-01: palette-selection.test.ts
 * covers the selector both worlds share through the retired
 * policy-world entry point, not the sentences and seat rules this one
 * owns. The first live-app reports' pins, then MUST-01's seat rule: a
 * seat fills wherever the design's recipe copy holds the colour — the
 * pick pins it there (option b); a seat that drifts out of the
 * profile is kept and explained, as before.
 */

import { describe, expect, it } from 'vitest';

import {
  builtInProfiles,
  emptyRecipe,
  type ColorProfileRecipe,
} from '../src/core/color-profile.ts';
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

  it('fills a Must-use seat from another brand once the design pins it, and drops it again without the pin (MUST-01)', () => {
    const pinned = resolve({ libraries: ['dmc'], include: ['anchor:403'] }, ['anchor:403']);
    expect(pinned.ok).toBe(true);
    expect(pinned.eligibleCount).toBe(490);
    expect(pinned.palette.entries).toHaveLength(8);
    expect(pinned.palette.entries.some((t) => t.id === 'anchor:403')).toBe(true);
    expect(pinned.lockedCount).toBe(1);
    expect(pinned.conflicts.some((c) => c.kind === 'locked-not-permitted')).toBe(false);
    // The Revert shape: the same seat without its pin is a Note again —
    // the pick widened the copy; a drifted seat is still kept and explained.
    const reverted = resolve({ libraries: ['dmc'] }, ['anchor:403']);
    expect(reverted.lockedCount).toBe(0);
    expect(reverted.conflicts.find((c) => c.kind === 'locked-not-permitted')?.ids).toEqual([
      'anchor:403',
    ]);
  });

  it('fills a pinned seat on a range profile the colour fails — Pastels and DMC 666 (MUST-01)', () => {
    const pastels =
      builtInProfiles(catalogue).find((p) => p.id === 'builtin:pastels')?.recipe ?? emptyRecipe();
    const drifted = resolve(pastels, ['dmc:666']);
    expect(drifted.conflicts.find((c) => c.kind === 'locked-not-permitted')?.ids).toEqual(['dmc:666']);
    const pinned = resolve({ ...pastels, include: ['dmc:666'] }, ['dmc:666']);
    expect(pinned.palette.entries).toHaveLength(8);
    expect(pinned.palette.entries.some((t) => t.id === 'dmc:666')).toBe(true);
    expect(pinned.lockedCount).toBe(1);
    expect(pinned.conflicts.some((c) => c.kind === 'locked-not-permitted')).toBe(false);
  });

  it('renders a My-inventory design from its pinned seats on an empty inventory, still naming the inventory (MUST-01)', () => {
    // The owner's file once its seats are pinned: the design shows its
    // colours on a machine that owns none of them, and the warning is
    // what says the profile's inventory half is empty here.
    const seats = ['anchor:403', 'ariadna:1781'];
    const resolved = resolve({ libraries: ['mine'], include: seats }, seats, new Set());
    expect(resolved.ok).toBe(true);
    expect(resolved.palette.entries.map((t) => t.id)).toEqual(seats);
    expect(resolved.lockedCount).toBe(2);
    const note = resolved.conflicts.find((c) => c.kind === 'owned-none');
    expect(note?.severity).toBe('warning');
    expect(note?.message).toContain('contributes nothing');
  });

  it('honours a pinned seat the user does not own under "only colours I own" (MUST-01)', () => {
    // Must use means "I intend to buy it": by the order contract pins
    // resolve after the owned narrowing, so the seat fills unowned.
    const resolved = resolve(
      { libraries: ['dmc'], ownedOnly: true, include: ['anchor:403'] },
      ['anchor:403'],
      new Set(['dmc:310']),
    );
    expect(resolved.palette.entries.map((t) => t.id)).toEqual(['dmc:310', 'anchor:403']);
    expect(resolved.lockedCount).toBe(1);
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

describe('the colour-use floor sentence (TONE-01)', () => {
  it('names the dropped count, the survivors, and both ways out', () => {
    const resolved = resolveProfilePalette({
      recipe: { ...emptyRecipe(), libraries: ['dmc'] },
      design: {
        count: { mode: 'max', n: 12 },
        minDistance: 0,
        mustUse: [],
        floor: { on: true, minStitches: 60 },
      },
      inputs: { catalogue },
      source: gradient(),
      name: 'test',
    });
    expect(resolved.ok).toBe(true);
    const note = resolved.conflicts.find((c) => c.kind === 'floor-dropped');
    expect(note?.severity).toBe('warning');
    expect(note?.message).toContain('fewer than 60 stitches');
    expect(note?.message).toContain(`leaving ${String(resolved.selectedCount)}`);
    expect(note?.message).toContain('turn it off');
  });

  it('applies without a count limit: use everything that earns its stitches', () => {
    const all = resolveProfilePalette({
      recipe: { ...emptyRecipe(), libraries: ['dmc'] },
      design: {
        count: { mode: 'all', n: 20 },
        minDistance: 0,
        mustUse: [],
        floor: { on: true, minStitches: 10 },
      },
      inputs: { catalogue },
      source: gradient(),
      name: 'test',
    });
    expect(all.ok).toBe(true);
    // 240 stitches at a 10-stitch floor cannot keep 489 DMC threads.
    expect(all.selectedCount).toBeLessThanOrEqual(24);
    expect(all.selectedCount).toBeGreaterThanOrEqual(1);
    expect(all.conflicts.some((c) => c.kind === 'floor-dropped')).toBe(true);
  });

  it('an off floor changes nothing, even in mode all', () => {
    const off = resolveProfilePalette({
      recipe: { ...emptyRecipe(), libraries: ['dmc'] },
      design: {
        count: { mode: 'all', n: 20 },
        minDistance: 0,
        mustUse: [],
        floor: { on: false, minStitches: 10 },
      },
      inputs: { catalogue },
      source: gradient(),
      name: 'test',
    });
    expect(off.selectedCount).toBe(off.eligibleCount);
    expect(off.conflicts.some((c) => c.kind === 'floor-dropped')).toBe(false);
  });
});
