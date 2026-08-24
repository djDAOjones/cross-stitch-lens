/**
 * The shared profile-option renderer (MENU-01).
 *
 * **Why a stub document, not a DOM.** The test environment is node
 * with no DOM implementation installed, and A11Y-01 forbids adding
 * one (`a11y-names.test.ts` records the same constraint). The
 * renderer only ever calls `createElement`, `append`,
 * `replaceChildren` and four properties, so a stub of exactly that
 * surface is faithful without a dependency — and it keeps the
 * assertions about *structure*, which is what MENU-01 changed.
 *
 * What this cannot hold is real `<select>`/`<optgroup>` behaviour in a
 * browser; that is the browser matrix's half, as it is for the rest of
 * the UI.
 */

import { describe, expect, it } from 'vitest';

import { renderProfileOptions, type ProfileOptionItem } from '../src/ui/profile-options.ts';

interface StubEl {
  tag: string;
  children: StubEl[];
  value?: string;
  label?: string;
  textContent?: string;
  disabled?: boolean;
  append(...kids: StubEl[]): void;
  replaceChildren(): void;
}

function element(tag: string): StubEl {
  return {
    tag,
    children: [],
    append(...kids: StubEl[]): void {
      this.children.push(...kids);
    },
    replaceChildren(): void {
      this.children = [];
    },
  };
}

const stubDoc = { createElement: (tag: string) => element(tag) } as unknown as Document;

function render(
  items: readonly ProfileOptionItem[],
  extra: { leading?: { value: string; label: string }; value?: string } = {},
): StubEl {
  const select = element('select');
  renderProfileOptions(stubDoc, select as unknown as HTMLSelectElement, {
    items,
    ...extra,
  });
  return select;
}

/** Flatten to `"group/label"` (or `"label"` ungrouped), in render order. */
function shape(select: StubEl): string[] {
  const out: string[] = [];
  for (const child of select.children) {
    if (child.tag === 'optgroup') {
      for (const option of child.children) out.push(`${String(child.label)}/${String(option.textContent)}`);
    } else out.push(String(child.textContent));
  }
  return out;
}

const THREE: ProfileOptionItem[] = [
  { id: 'a', label: 'DMC', group: 'Your threads' },
  { id: 'b', label: 'Sepia', group: 'Basics' },
  { id: 'c', label: 'All threads', group: 'Your threads' },
];

describe('renderProfileOptions (MENU-01)', () => {
  it('renders flat when nothing carries a group', () => {
    const select = render([
      { id: 'a', label: 'Balanced' },
      { id: 'b', label: 'Subtle' },
    ]);
    expect(select.children.every((c) => c.tag === 'option')).toBe(true);
    expect(shape(select)).toEqual(['Balanced', 'Subtle']);
  });

  it('groups by label, and every item appears exactly once', () => {
    const select = render(THREE);
    expect(shape(select)).toHaveLength(THREE.length);
    expect(new Set(shape(select)).size).toBe(THREE.length);
  });

  it('orders groups by first appearance and keeps items in caller order', () => {
    // "Your threads" is met first, so it leads — and its two members
    // stay adjacent even though "Basics" was declared between them.
    expect(shape(render(THREE))).toEqual([
      'Your threads/DMC',
      'Your threads/All threads',
      'Basics/Sepia',
    ]);
  });

  it('reuses one optgroup per label rather than repeating it', () => {
    const select = render(THREE);
    const labels = select.children.filter((c) => c.tag === 'optgroup').map((c) => c.label);
    expect(labels).toEqual(['Your threads', 'Basics']);
  });

  it('pins the leading option above every group, ungrouped', () => {
    const select = render(THREE, { leading: { value: 'custom:design', label: 'This design’s colours' } });
    expect(select.children[0]?.tag).toBe('option');
    expect(select.children[0]?.textContent).toBe('This design’s colours');
    expect(select.children[0]?.value).toBe('custom:design');
  });

  it('omits the leading option when it is not asked for', () => {
    expect(render(THREE).children[0]?.tag).toBe('optgroup');
  });

  it('carries disabled through, and leaves the rest enabled', () => {
    const select = render([
      { id: 'a', label: 'My inventory — empty', group: 'Your threads', disabled: true },
      { id: 'b', label: 'DMC', group: 'Your threads' },
    ]);
    const options = select.children[0]?.children ?? [];
    expect(options[0]?.disabled).toBe(true);
    expect(options[1]?.disabled).toBeUndefined();
  });

  it('sets the value last, so it lands on options that exist', () => {
    expect(render(THREE, { value: 'c' }).value).toBe('c');
  });

  it('replaces previous contents rather than appending to them', () => {
    const select = element('select');
    const call = (items: ProfileOptionItem[]): void => {
      renderProfileOptions(stubDoc, select as unknown as HTMLSelectElement, { items });
    };
    call(THREE);
    call([{ id: 'z', label: 'Only', group: 'Basics' }]);
    expect(shape(select)).toEqual(['Basics/Only']);
  });

  it('renders a group with no members not at all', () => {
    // "Your profiles" is omitted when the store is empty rather than
    // rendered as an empty heading — a property of passing no items,
    // which is how the Colour section gets it for free.
    const select = render([{ id: 'a', label: 'DMC', group: 'Your threads' }]);
    expect(select.children.map((c) => c.label)).toEqual(['Your threads']);
  });
});
