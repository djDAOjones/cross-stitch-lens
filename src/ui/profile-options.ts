/**
 * The shared profile-option renderer (MENU-01).
 *
 * Four selects list profiles — the Colour section's, the dither and
 * adjust ones in `main.ts`, and the editor's switcher — and each used
 * to hand-roll its option loop. They drifted: the `(built-in)` suffix
 * and the sentinel handling ended up inconsistent because nobody
 * decided they should be, four copies just did different things. This
 * module is the one place options are built, so grouping landed once
 * instead of twice and the next difference has to be deliberate.
 *
 * Only the two colour selects are wired to it today; converging the
 * dither and adjust ones is ICE-SELECTS-01, and neither needs grouping
 * (7 and 9 built-ins).
 *
 * Grouping is **data-driven**: an item carrying a `group` renders
 * inside an `<optgroup>` of that label, and a list where nothing
 * carries one renders flat. So the caller decides by supplying groups
 * or not, and no select needs a flag or a length threshold — a
 * threshold would make the menu restructure itself as a user saves
 * profiles, which is worse than either shape.
 */

/** One option as a select lists it. */
export interface ProfileOptionItem {
  /** The option's value, and the id the caller resolves it back to. */
  id: string;
  /** Full visible label, decorations included — this module adds none. */
  label: string;
  /** Group label, or omitted to render ungrouped. */
  group?: string | undefined;
  /** Refuse selection, with the reason already in `label`. */
  disabled?: boolean | undefined;
}

export interface RenderProfileOptionsInput {
  /** Ordered items. Group order follows first appearance. */
  items: readonly ProfileOptionItem[];
  /**
   * An ungrouped option pinned above every group — the Colour
   * section's "This design's colours" sentinel. A bare `<option>`
   * before the first `<optgroup>` is valid and reads correctly.
   */
  leading?: { value: string; label: string } | undefined;
  /** Value to select once the options exist. */
  value?: string | undefined;
}

/**
 * Replace `select`'s contents with `items`, grouped where they carry a
 * group. Presentational only: nothing here reads or writes app state,
 * and `select.value` is set last so it lands on real options.
 */
export function renderProfileOptions(
  doc: Document,
  select: HTMLSelectElement,
  input: RenderProfileOptionsInput,
): void {
  select.replaceChildren();
  if (input.leading !== undefined) {
    const option = doc.createElement('option');
    option.value = input.leading.value;
    option.textContent = input.leading.label;
    select.append(option);
  }
  // Group order is first appearance, so the caller's item order is the
  // menu's order and this module never sorts behind its back.
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const item of input.items) {
    const option = doc.createElement('option');
    option.value = item.id;
    option.textContent = item.label;
    if (item.disabled === true) option.disabled = true;
    if (item.group === undefined) {
      select.append(option);
      continue;
    }
    let group = groups.get(item.group);
    if (group === undefined) {
      group = doc.createElement('optgroup');
      group.label = item.group;
      groups.set(item.group, group);
      select.append(group);
    }
    group.append(option);
  }
  if (input.value !== undefined) select.value = input.value;
}
