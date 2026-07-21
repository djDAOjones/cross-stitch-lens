/**
 * The Colour panel: brands, palette source, inventory restriction,
 * colour count, and per-thread lock / prefer / exclude (M7).
 *
 * The panel is deliberately split into a **pure model** (the label,
 * status, and row builders below, all tested in node) and a thin DOM
 * renderer. Every state this panel can reach — no brand enabled, an
 * empty inventory, a preset that resolved nothing — is a sentence in
 * the status region, never a disabled control with no explanation
 * (UI-STANDARDS → "Error prevention"; M7-MIX-01's rule that conflicts
 * are explained, never silent).
 */

import type { PaletteConflict, PalettePolicy } from '../core/palette-policy.ts';
import { PRESETS } from '../core/palette-presets.ts';
import type { Brand, ThreadCatalogue } from '../core/thread-catalogue.ts';
import type { Thread } from '../core/types.ts';
import type { LibraryPalette } from '../library/records.ts';
import { numberField, selectField, toggleField } from './controls.ts';

/** Longest thread list rendered at once; search narrows past this. */
export const THREAD_ROW_CAP = 60;

/** How one thread relates to the current policy. */
export type ThreadRole = 'locked' | 'preferred' | 'excluded' | 'none';

/** One row of the thread table. */
export interface ThreadRow {
  thread: Thread;
  /** "DMC 310 black". */
  label: string;
  owned: boolean;
  role: ThreadRole;
  /** True when this thread is in the resolved palette. */
  selected: boolean;
}

/** Everything the panel renders from. */
export interface PalettePanelState {
  policy: PalettePolicy;
  /** null = full-RGB mode; the colour controls collapse. */
  paletteMode: boolean;
  conflicts: PaletteConflict[];
  /** Threads permitted before the count limit. */
  eligibleCount: number;
  /** Threads in the resolved palette. */
  selectedCount: number;
  /** Distinct colours the last processed frame actually used. */
  usedCount: number | null;
  /**
   * True when a colour-count limit is set but no frame has been
   * processed yet, so the limit cannot have been applied.
   */
  awaitingSource: boolean;
  owned: ReadonlySet<string>;
  library: LibraryPalette[];
  /** Ids in the resolved palette, for the `selected` flag. */
  selectedIds: ReadonlySet<string>;
  /** False when the library is session-only (IndexedDB unavailable). */
  libraryPersistent: boolean;
}

/** Callbacks the panel raises. Every one is a policy or library edit. */
export interface PalettePanelActions {
  setPaletteMode(on: boolean): void;
  setPolicy(policy: PalettePolicy): void;
  setOwned(id: string, owned: boolean): void;
  savePaletteToLibrary(): void;
  exportInventory(): void;
  importInventory(): void;
  exportPalettes(): void;
}

/** "DMC 310 black" — brand and reference first, as on the shelf. */
export function threadLabel(thread: Thread, brands: readonly Brand[]): string {
  const brand = brands.find((b) => b.id === thread.brandId)?.name ?? thread.brandId;
  return `${brand} ${thread.reference} ${thread.name}`.trim();
}

/** Which of the three per-thread rules a thread is under. */
export function roleOf(policy: PalettePolicy, id: string): ThreadRole {
  if (policy.excluded.includes(id)) return 'excluded';
  if (policy.locked.includes(id)) return 'locked';
  if (policy.preferred.includes(id)) return 'preferred';
  return 'none';
}

/**
 * Apply a role to a thread, keeping the three sets **disjoint**.
 *
 * Setting one role clears the other two rather than layering them, so
 * "locked and excluded" cannot be created by clicking — the conflict
 * the resolver has to report is one a *file* can contain, not one the
 * UI produces (M7-MIX-01: resolve contradictions at the interaction
 * that creates them).
 */
export function withRole(policy: PalettePolicy, id: string, role: ThreadRole): PalettePolicy {
  const without = {
    locked: policy.locked.filter((t) => t !== id),
    preferred: policy.preferred.filter((t) => t !== id),
    excluded: policy.excluded.filter((t) => t !== id),
  };
  if (role === 'locked') without.locked.push(id);
  if (role === 'preferred') without.preferred.push(id);
  if (role === 'excluded') without.excluded.push(id);
  return { ...policy, ...without };
}

/** Case-insensitive match over brand, reference, and name. */
export function matchesSearch(row: ThreadRow, query: string): boolean {
  if (query.trim() === '') return true;
  return row.label.toLowerCase().includes(query.trim().toLowerCase());
}

/** Build the thread rows for the table, filtered and capped. */
export function buildThreadRows(
  catalogue: ThreadCatalogue,
  state: PalettePanelState,
  query: string,
  cap: number = THREAD_ROW_CAP,
): { rows: ThreadRow[]; total: number } {
  const all: ThreadRow[] = [];
  for (const thread of catalogue.threads) {
    if (!state.policy.brands.includes(thread.brandId)) continue;
    const row: ThreadRow = {
      thread,
      label: threadLabel(thread, catalogue.brands),
      owned: state.owned.has(thread.id),
      role: roleOf(state.policy, thread.id),
      selected: state.selectedIds.has(thread.id),
    };
    if (matchesSearch(row, query)) all.push(row);
  }
  return { rows: all.slice(0, cap), total: all.length };
}

/**
 * The one-line count summary.
 *
 * "Selected" and "used" are reported separately and always: asking for
 * 20 and getting 17 in the design is normal and not a fault, but it is
 * only *not* a fault if the app says so (M7-COUNT-01).
 */
export function countSummary(state: PalettePanelState): string {
  if (!state.paletteMode) return 'Full RGB — no thread palette.';
  const limited = state.policy.count.mode !== 'all';
  const parts = [`${String(state.eligibleCount)} permitted`];
  if (limited && state.awaitingSource) {
    // Selection needs the design's own colours, so before the first
    // frame there is nothing to choose against. Saying "N selected of
    // 20 requested" here would read as a violated limit rather than a
    // step that has not happened yet.
    parts.push(`${String(state.policy.count.n)} requested — chosen once an image is loaded`);
  } else if (limited) {
    parts.push(
      `${String(state.selectedCount)} selected of ${String(state.policy.count.n)} requested`,
    );
  } else {
    parts.push(`${String(state.selectedCount)} in palette`);
  }
  if (state.usedCount !== null) parts.push(`${String(state.usedCount)} used in the design`);
  return `${parts.join(' · ')}.`;
}

/** Options for the palette-source select, given the saved palettes. */
export function sourceOptions(library: readonly LibraryPalette[]): [string, string][] {
  const options: [string, string][] = [['brands', 'All threads from enabled brands']];
  for (const preset of PRESETS) options.push([`preset:${preset.id}`, `Preset — ${preset.name}`]);
  for (const palette of library) options.push([`library:${palette.id}`, `Saved — ${palette.name}`]);
  return options;
}

/** The select value for a policy's source. */
export function sourceValue(policy: PalettePolicy): string {
  if (policy.source.kind === 'library') return `library:${policy.source.paletteId}`;
  if (policy.source.kind === 'preset') return `preset:${policy.source.presetId}`;
  return 'brands';
}

/** Turn a select value back into a policy source, keeping preset mode. */
export function sourceFromValue(value: string, policy: PalettePolicy): PalettePolicy['source'] {
  if (value.startsWith('library:')) {
    return { kind: 'library', paletteId: value.slice('library:'.length) };
  }
  if (value.startsWith('preset:')) {
    const mode = policy.source.kind === 'preset' ? policy.source.mode : 'strict';
    return { kind: 'preset', presetId: value.slice('preset:'.length), mode };
  }
  return { kind: 'brands' };
}

/** The built panel: the element to mount plus its update hook. */
export interface PalettePanel {
  element: HTMLElement;
  update(state: PalettePanelState): void;
}

/** Build a labelled checkbox row (brands are a multi-select group). */
function brandCheckbox(
  doc: Document,
  brand: Brand,
  checked: boolean,
  onChange: (on: boolean) => void,
): HTMLElement {
  const wrapper = doc.createElement('div');
  wrapper.className = 'check-row';
  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.id = `brand-${brand.id}`;
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  const label = doc.createElement('label');
  label.htmlFor = input.id;
  label.textContent = brand.name;
  const note = doc.createElement('span');
  note.className = 'meta';
  // Provenance is stated next to the brand, not buried: an Anchor
  // "colour" here is a mapped DMC value and the user is entitled to
  // know before they buy thread against it (M7-BRAND-01).
  note.textContent = brand.provenance === 'mapped' ? 'mapped colours' : 'measured colours';
  note.title = brand.note;
  wrapper.append(input, label, note);
  return wrapper;
}

/** Create the Colour panel. */
export function createPalettePanel(
  doc: Document,
  catalogue: ThreadCatalogue,
  initial: PalettePanelState,
  actions: PalettePanelActions,
): PalettePanel {
  let state = initial;
  let query = '';

  const element = doc.createElement('fieldset');
  const legend = doc.createElement('legend');
  legend.textContent = 'Colour';

  const modeField = selectField(
    doc,
    'colour-mode',
    'Colour mode',
    [
      ['threads', 'Thread palette'],
      ['rgb', 'Full RGB'],
    ],
    'threads',
    (value) => {
      actions.setPaletteMode(value === 'threads');
    },
  );

  // --- brands -------------------------------------------------------
  const brandGroup = doc.createElement('div');
  brandGroup.className = 'field';
  brandGroup.setAttribute('role', 'group');
  brandGroup.setAttribute('aria-labelledby', 'brand-group-label');
  const brandLabel = doc.createElement('span');
  brandLabel.id = 'brand-group-label';
  brandLabel.className = 'group-label';
  brandLabel.textContent = 'Thread brands';
  brandGroup.append(brandLabel);
  for (const brand of catalogue.brands) {
    brandGroup.append(
      brandCheckbox(doc, brand, initial.policy.brands.includes(brand.id), (on) => {
        const brands = on
          ? [...state.policy.brands, brand.id]
          : state.policy.brands.filter((b) => b !== brand.id);
        // Catalogue order, not click order: the enabled-brand order is
        // the palette's tie-break, so it must not depend on which
        // checkbox the user happened to tick first (M7-BRAND-02).
        const ordered = catalogue.brands.map((b) => b.id).filter((id) => brands.includes(id));
        actions.setPolicy({ ...state.policy, brands: ordered });
      }),
    );
  }

  // --- source -------------------------------------------------------
  const sourceWrap = doc.createElement('div');
  const presetModeWrap = doc.createElement('div');

  // --- inventory ----------------------------------------------------
  const ownedToggle = toggleField(
    doc,
    'owned-only',
    'Only threads I own',
    initial.policy.ownedOnly,
    (on) => {
      actions.setPolicy({ ...state.policy, ownedOnly: on });
    },
  );

  // --- colour count -------------------------------------------------
  const countMode = selectField(
    doc,
    'count-mode',
    'Colour count',
    [
      ['all', 'Every permitted thread'],
      ['max', 'At most…'],
      ['exact', 'Exactly…'],
    ],
    initial.policy.count.mode,
    (value) => {
      actions.setPolicy({
        ...state.policy,
        count: { mode: value as PalettePolicy['count']['mode'], n: state.policy.count.n },
      });
    },
  );
  const countN = numberField(
    doc,
    'count-n',
    'Number of colours',
    { min: 1, max: 512, value: initial.policy.count.n },
    (value) => {
      actions.setPolicy({ ...state.policy, count: { mode: state.policy.count.mode, n: value } });
    },
  );

  // --- status -------------------------------------------------------
  const summary = doc.createElement('p');
  summary.className = 'meta';
  summary.id = 'palette-summary';
  const conflictList = doc.createElement('ul');
  conflictList.className = 'conflicts';
  // Assertive would interrupt a screen-reader mid-word on every
  // keystroke in the count field; these are explanations, not alarms.
  conflictList.setAttribute('aria-live', 'polite');

  // --- thread table -------------------------------------------------
  const search = doc.createElement('input');
  search.type = 'search';
  search.id = 'thread-search';
  search.placeholder = 'Search threads';
  const searchLabel = doc.createElement('label');
  searchLabel.htmlFor = search.id;
  searchLabel.textContent = 'Find a thread';
  const searchField = doc.createElement('div');
  searchField.className = 'field';
  searchField.append(searchLabel, search);
  search.addEventListener('input', () => {
    query = search.value;
    renderThreads();
  });

  const threadList = doc.createElement('div');
  threadList.className = 'thread-list';
  const threadCount = doc.createElement('p');
  threadCount.className = 'meta';

  // --- library actions ----------------------------------------------
  const actionRow = doc.createElement('div');
  actionRow.className = 'toolbar';
  const libraryNote = doc.createElement('p');
  libraryNote.className = 'meta';
  const button = (text: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };
  actionRow.append(
    button('Save as palette', () => {
      actions.savePaletteToLibrary();
    }),
    button('Export inventory', () => {
      actions.exportInventory();
    }),
    button('Import inventory', () => {
      actions.importInventory();
    }),
    button('Export palettes', () => {
      actions.exportPalettes();
    }),
  );

  /** Rebuild the thread rows for the current policy and search. */
  function renderThreads(): void {
    const { rows, total } = buildThreadRows(catalogue, state, query);
    threadList.replaceChildren();
    for (const row of rows) {
      const item = doc.createElement('div');
      item.className = 'thread-row';

      const swatch = doc.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = row.thread.hex;
      // The swatch is content, not meaning: the row is fully readable
      // without it (UI-STANDARDS → no colour-only meaning).
      swatch.setAttribute('aria-hidden', 'true');

      const name = doc.createElement('span');
      name.className = 'thread-name';
      name.textContent = row.label;
      if (row.selected) name.append(' · in palette');

      const ownedBox = doc.createElement('input');
      ownedBox.type = 'checkbox';
      ownedBox.checked = row.owned;
      ownedBox.id = `own-${row.thread.id}`;
      ownedBox.addEventListener('change', () => {
        actions.setOwned(row.thread.id, ownedBox.checked);
      });
      const ownedLabel = doc.createElement('label');
      ownedLabel.htmlFor = ownedBox.id;
      ownedLabel.textContent = 'Own';

      const roleSelect = doc.createElement('select');
      roleSelect.id = `role-${row.thread.id}`;
      for (const [value, label] of [
        ['none', 'No rule'],
        ['locked', 'Lock'],
        ['preferred', 'Prefer'],
        ['excluded', 'Exclude'],
      ] as const) {
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = label;
        roleSelect.append(option);
      }
      roleSelect.value = row.role;
      roleSelect.setAttribute('aria-label', `Rule for ${row.label}`);
      roleSelect.addEventListener('change', () => {
        actions.setPolicy(withRole(state.policy, row.thread.id, roleSelect.value as ThreadRole));
      });

      item.append(swatch, name, ownedBox, ownedLabel, roleSelect);
      threadList.append(item);
    }
    threadCount.textContent =
      total > rows.length
        ? `Showing ${String(rows.length)} of ${String(total)} threads — search to narrow.`
        : `${String(total)} thread${total === 1 ? '' : 's'}.`;
  }

  /** Rebuild the source select (its options depend on the library). */
  function renderSource(): void {
    sourceWrap.replaceChildren(
      selectField(
        doc,
        'palette-source',
        'Palette source',
        sourceOptions(state.library),
        sourceValue(state.policy),
        (value) => {
          actions.setPolicy({
            ...state.policy,
            source: sourceFromValue(value, state.policy),
          });
        },
      ),
    );
    if (state.policy.source.kind === 'preset') {
      const mode = state.policy.source.mode;
      presetModeWrap.replaceChildren(
        selectField(
          doc,
          'preset-mode',
          'How the preset applies',
          [
            ['strict', 'Strict — use only these threads'],
            ['prefer', 'Prefer — favour these, allow others'],
          ],
          mode,
          (value) => {
            const source = state.policy.source;
            if (source.kind !== 'preset') return;
            actions.setPolicy({
              ...state.policy,
              source: { ...source, mode: value === 'prefer' ? 'prefer' : 'strict' },
            });
          },
        ),
      );
    } else {
      presetModeWrap.replaceChildren();
    }
  }

  function update(next: PalettePanelState): void {
    state = next;
    const paletteMode = next.paletteMode;
    for (const el of [brandGroup, sourceWrap, presetModeWrap, searchField, threadList]) {
      el.hidden = !paletteMode;
    }
    ownedToggle.element.hidden = !paletteMode;
    countMode.hidden = !paletteMode;
    countN.hidden = !paletteMode || next.policy.count.mode === 'all';
    actionRow.hidden = !paletteMode;

    summary.textContent = countSummary(next);
    conflictList.replaceChildren();
    for (const conflict of next.conflicts) {
      const item = doc.createElement('li');
      item.className = conflict.severity === 'error' ? 'conflict-error' : 'conflict-warning';
      // The severity word is text, so the distinction survives without
      // colour and without a screen reader having to infer it.
      item.textContent = `${conflict.severity === 'error' ? 'Problem' : 'Note'}: ${conflict.message}`;
      conflictList.append(item);
    }
    libraryNote.textContent = next.libraryPersistent
      ? 'Your inventory and saved palettes are stored in this browser. Export them to keep a copy.'
      : 'Browser storage is unavailable, so your inventory and palettes last only until you reload. Export them to keep them.';

    renderSource();
    renderThreads();
  }

  element.append(
    legend,
    modeField,
    brandGroup,
    sourceWrap,
    presetModeWrap,
    ownedToggle.element,
    countMode,
    countN,
    summary,
    conflictList,
    searchField,
    threadCount,
    threadList,
    actionRow,
    libraryNote,
  );
  update(initial);

  return { element, update };
}
