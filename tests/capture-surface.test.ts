/**
 * Reusable grab surface (M13-IMPL-01, D135 candidate 1).
 *
 * The invariant is an allocation count, not a duration: N grabs at one
 * crop size must build exactly one canvas. Written against a counting
 * fake because the real surface is an `OffscreenCanvas` the Node suite
 * has no access to — the pre-fix structure (a fresh canvas per frame)
 * fails the first test here, which is the point of it.
 */

import { describe, expect, it } from 'vitest';
import { reusableSurface } from '../src/capture/surface.ts';

interface FakeCanvas {
  width: number;
  height: number;
  /** Bumped whenever the backing store is (re)allocated. */
  stores: number;
}

/** A canvas whose dimension setters reallocate, as the real one does. */
function fakeCanvas(width: number, height: number): FakeCanvas {
  let w = width;
  let h = height;
  const canvas = {
    stores: 1,
    get width(): number {
      return w;
    },
    set width(value: number) {
      w = value;
      canvas.stores += 1;
    },
    get height(): number {
      return h;
    },
    set height(value: number) {
      h = value;
      canvas.stores += 1;
    },
  };
  return canvas;
}

function counting(): {
  create: (width: number, height: number) => FakeCanvas;
  contexts: () => number;
  context: (canvas: FakeCanvas) => { owner: FakeCanvas } | null;
  canvases: FakeCanvas[];
} {
  const canvases: FakeCanvas[] = [];
  let contexts = 0;
  return {
    canvases,
    create(width, height) {
      const canvas = fakeCanvas(width, height);
      canvases.push(canvas);
      return canvas;
    },
    contexts: () => contexts,
    context(canvas) {
      contexts += 1;
      return { owner: canvas };
    },
  };
}

describe('reusableSurface', () => {
  it('allocates one canvas and one context across many same-size grabs', () => {
    const fake = counting();
    const surface = reusableSurface(fake.create, fake.context);

    const first = surface.acquire(1920, 1080);
    for (let i = 0; i < 99; i += 1) surface.acquire(1920, 1080);

    expect(fake.canvases).toHaveLength(1);
    expect(fake.contexts()).toBe(1);
    expect(surface.stats).toEqual({ created: 1, resized: 0 });
    // The same objects come back, so a caller may hold the context.
    expect(surface.acquire(1920, 1080)).toBe(first);
    // No dimension write at all on the hot path: the backing store was
    // allocated once, by construction.
    expect(fake.canvases[0]?.stores).toBe(1);
  });

  it('resizes in place when the crop changes, never rebuilding the canvas', () => {
    const fake = counting();
    const surface = reusableSurface(fake.create, fake.context);

    const first = surface.acquire(800, 600);
    const grown = surface.acquire(1024, 768);

    expect(grown).toBe(first);
    expect(grown.canvas.width).toBe(1024);
    expect(grown.canvas.height).toBe(768);
    expect(fake.canvases).toHaveLength(1);
    expect(fake.contexts()).toBe(1);
    expect(surface.stats).toEqual({ created: 1, resized: 1 });
  });

  it('counts one resize per size change, not one per axis', () => {
    const fake = counting();
    const surface = reusableSurface(fake.create, fake.context);
    surface.acquire(300, 300);
    surface.acquire(300, 400);
    surface.acquire(400, 400);
    surface.acquire(400, 400);
    expect(surface.stats).toEqual({ created: 1, resized: 2 });
  });

  it('has no current surface before the first acquire', () => {
    const fake = counting();
    const surface = reusableSurface(fake.create, fake.context);
    expect(surface.current()).toBeNull();
    expect(surface.stats).toEqual({ created: 0, resized: 0 });
    const held = surface.acquire(64, 64);
    expect(surface.current()).toBe(held);
  });

  it('reports an unavailable 2d context rather than handing back a null one', () => {
    const surface = reusableSurface(fakeCanvas, () => null);
    expect(() => surface.acquire(16, 16)).toThrow(/2d canvas context unavailable/);
  });

  it('does not cache a failed context: a later acquire retries the factory', () => {
    const fake = counting();
    let available = false;
    const surface = reusableSurface(fake.create, (canvas) =>
      available ? fake.context(canvas) : null,
    );
    expect(() => surface.acquire(16, 16)).toThrow();
    available = true;
    expect(() => surface.acquire(16, 16)).not.toThrow();
    expect(surface.stats.created).toBe(2);
  });

  it('accepts a zero-sized crop without special-casing it', () => {
    const fake = counting();
    const surface = reusableSurface(fake.create, fake.context);
    const held = surface.acquire(0, 0);
    expect(held.canvas.width).toBe(0);
    expect(surface.stats).toEqual({ created: 1, resized: 0 });
  });
});
