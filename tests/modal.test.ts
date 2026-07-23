/**
 * Pure halves of the M14-IMPL-02 anatomy (house convention: logic in
 * node, DOM behaviour verified in the running app — the live checks
 * are recorded in docs/ui-evidence.md):
 *
 * - the modal focus trap's decision arithmetic;
 * - the `aria-describedby` list arithmetic the field builders use for
 *   helper/correction linkage.
 */

import { describe, expect, it } from 'vitest';

import { withDescribedBy, withoutDescribedBy } from '../src/ui/controls.ts';
import { trapTarget } from '../src/ui/modal.ts';

describe('trapTarget (modal focus trap)', () => {
  it('wraps forward from the last control to the first', () => {
    expect(trapTarget(3, 2, false)).toBe(0);
  });

  it('wraps backward from the first control to the last', () => {
    expect(trapTarget(3, 0, true)).toBe(2);
  });

  it('lets the browser handle interior moves', () => {
    expect(trapTarget(3, 1, false)).toBeNull();
    expect(trapTarget(3, 1, true)).toBeNull();
    expect(trapTarget(3, 2, true)).toBeNull();
  });

  it('recaptures focus that escaped the set (forward)', () => {
    // activeIndex -1 = focus is outside the dialog's focusables; a
    // forward Tab pulls it back to the first control.
    expect(trapTarget(3, -1, false)).toBe(0);
  });

  it('backward from outside lands on the last control', () => {
    expect(trapTarget(3, -1, true)).toBe(2);
  });

  it('does nothing with no focusables', () => {
    expect(trapTarget(0, -1, false)).toBeNull();
    expect(trapTarget(0, 0, true)).toBeNull();
  });
});

describe('describedby list arithmetic', () => {
  it('appends to an empty list', () => {
    expect(withDescribedBy(null, 'a')).toBe('a');
  });

  it('appends without duplicating', () => {
    expect(withDescribedBy('a b', 'b')).toBe('a b');
    expect(withDescribedBy('a', 'b')).toBe('a b');
  });

  it('removes an id and reports an empty list as null', () => {
    expect(withoutDescribedBy('a b', 'a')).toBe('b');
    expect(withoutDescribedBy('a', 'a')).toBeNull();
    expect(withoutDescribedBy(null, 'a')).toBeNull();
  });

  it('a helper+message round-trip leaves the helper linked', () => {
    const withHelper = withDescribedBy(null, 'f-helper');
    const withBoth = withDescribedBy(withHelper, 'f-message');
    expect(withBoth).toBe('f-helper f-message');
    expect(withoutDescribedBy(withBoth, 'f-message')).toBe('f-helper');
  });
});
