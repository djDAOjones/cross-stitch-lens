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
import { confirmDangerModal } from './modal.ts';

/** Longest thread list rendered at once; search narrows past this. */
export const THREAD_ROW_CAP = 60;

/**
 * Longest saved-palette editor rendered at once.
 *
 * Same cap as the thread list, for the same reason: every reorder
 * rebuilds the whole list, so the cost scales with palette size. At the
 * cap a reorder is ~8 ms from click to repaint (measured); uncapped, a
 * palette spanning all eight brands would rebuild ~17,000 elements per
 * click. A palette anyone actually stitches from is a couple of dozen
 * threads — the colour-count control is how you get there, and the note
 * below the list says so rather than leaving the cap unexplained.
 */
export const PALETTE_EDIT_CAP = 60;

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
  /**
   * Threads permitted before the count limit. The panel's summary
   * carries only this figure (M14-EXT-42): selected/used/limit all
   * live in Stats (the EXT-21 no-third-copy duty), and the
   * asked-for-20-got-17 explanation is the conflicts list's job.
   */
  eligibleCount: number;
  owned: ReadonlySet<string>;
  library: LibraryPalette[];
  /** Ids in the resolved palette, for the `selected` flag. */
  selectedIds: ReadonlySet<string>;
  /** False when the library is session-only (IndexedDB unavailable). */
  libraryPersistent: boolean;
  /**
   * A palette deleted this session and still restorable. Session-only:
   * the undo route exists so deletion needs no modal (UI-STANDARDS →
   * "destructive actions require confirmation **or** reliable undo").
   */
  deletedPalette: LibraryPalette | null;
}

/** Callbacks the panel raises. Every one is a policy or library edit. */
export interface PalettePanelActions {
  setPaletteMode(on: boolean): void;
  setPolicy(policy: PalettePolicy): void;
  setOwned(id: string, owned: boolean): void;
  /** Mark many threads at once; `ids` is the whole filter, not a page. */
  setOwnedBulk(ids: readonly string[], owned: boolean): void;
  savePaletteToLibrary(): void;
  /** Move one entry of a saved palette; commits and bumps its revision. */
  movePaletteEntry(paletteId: string, index: number, delta: number): void;
  removePaletteEntry(paletteId: string, index: number): void;
  deletePalette(paletteId: string): void;
  undoDeletePalette(): void;
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

/**
 * Every thread matching the enabled brands and the search — **uncapped**.
 *
 * Bulk operations read this rather than {@link buildThreadRows}: acting
 * on only the 60 rows that happen to be rendered would silently do less
 * than the button says (M7-LIB-01).
 */
export function filteredThreads(
  catalogue: ThreadCatalogue,
  state: PalettePanelState,
  query: string,
): ThreadRow[] {
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
  return all;
}

/** Build the thread rows for the table, filtered and capped. */
export function buildThreadRows(
  catalogue: ThreadCatalogue,
  state: PalettePanelState,
  query: string,
  cap: number = THREAD_ROW_CAP,
): { rows: ThreadRow[]; total: number } {
  const all = filteredThreads(catalogue, state, query);
  return { rows: all.slice(0, cap), total: all.length };
}

/**
 * The threads a bulk ownership change would actually alter — those in
 * the current filter not already in the target state.
 *
 * Reporting the *changed* count rather than the filtered count is what
 * makes "Mark 12 as owned" true when 48 of the 60 shown are owned
 * already.
 */
export function bulkOwnershipTargets(
  catalogue: ThreadCatalogue,
  state: PalettePanelState,
  query: string,
  owned: boolean,
): string[] {
  return filteredThreads(catalogue, state, query)
    .filter((row) => row.owned !== owned)
    .map((row) => row.thread.id);
}

/**
 * Move the item at `index` by `delta`, returning a new array.
 *
 * Out-of-range moves return the input unchanged rather than throwing or
 * wrapping — the first row's "up" button is a no-op, not an error, and
 * wrapping would silently reorder a palette the user was only nudging.
 */
export function moveEntry<T>(items: readonly T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return [...items];
  next.splice(to, 0, moved);
  return next;
}

/** One row of the saved-palette editor. */
export interface PaletteEntryRow {
  id: string;
  /** "DMC 310 black", or the bare id when the catalogue lacks it. */
  label: string;
  hex: string;
  /** True when this build's catalogue has no such thread. */
  unresolved: boolean;
}

/**
 * The ordered contents of a saved palette.
 *
 * Order is the point: it is the nearest-match tie-break and what every
 * LUT stores (D46), so this list is the palette's identity, not a
 * presentation of it. Unresolved entries keep their slot — a thread the
 * catalogue dropped must stay visible and movable, not silently vanish.
 */
export function buildPaletteEntryRows(
  palette: LibraryPalette,
  catalogue: ThreadCatalogue,
): PaletteEntryRow[] {
  return palette.threadIds.map((id) => {
    const thread = catalogue.byId.get(id);
    if (thread === undefined) {
      return { id, label: `${id} — not in this catalogue`, hex: '#000000', unresolved: true };
    }
    return {
      id,
      label: threadLabel(thread, catalogue.brands),
      hex: thread.hex,
      unresolved: false,
    };
  });
}

/**
 * The one-line count summary.
 *
 * "Selected" and "used" are reported separately and always: asking for
 * 20 and getting 17 in the design is normal and not a fault, but it is
 * only *not* a fault if the app says so (M7-COUNT-01).
 */
export function countSummary(state: PalettePanelState): string {
  if (!state.paletteMode) return 'Unlimited colours — no thread palette.';
  // Availability only (M14-EXT-42): the selected/requested/used
  // figures this line once carried are Stats' numbers, and repeating
  // them here was the third copy EXT-21 exists to prevent. The
  // asked-for-N-got-fewer explanation is a conflict sentence.
  return `${String(state.eligibleCount)} thread${state.eligibleCount === 1 ? '' : 's'} available.`;
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

// --- rebuild fingerprints (M14-EXT-43) ------------------------------
// update() runs on every processed frame during live capture, and a
// native select popup collapses the moment the DOM under it is
// replaced — so each region rebuilds only when the *structure* it
// renders actually changed, and every value-only change lands in
// place on the existing elements. Selected values are deliberately
// not part of any fingerprint: a keyboard user arrowing through
// options changes the value on every step, and rebuilding then would
// drop focus mid-gesture. The fingerprint-over-content idiom is D46's
// cache key, applied to the DOM.

/** Structure of the source selects: option list + preset-mode presence. */
export function sourceFingerprint(state: PalettePanelState): string {
  return JSON.stringify([sourceOptions(state.library), state.policy.source.kind === 'preset']);
}

/** Structure of the saved-palette editor: the palette's full identity. */
export function editorFingerprint(state: PalettePanelState): string {
  if (state.policy.source.kind !== 'library') return 'none';
  const palette = state.library.find(
    (p) => state.policy.source.kind === 'library' && p.id === state.policy.source.paletteId,
  );
  if (palette === undefined) return 'none';
  return JSON.stringify([palette.id, palette.name, palette.revision, palette.threadIds]);
}

/** Structure of the thread list: the visible row set, in order. */
export function threadsFingerprint(rows: readonly ThreadRow[]): string {
  return rows.map((row) => row.thread.id).join('\n');
}

/** The conflict list: severity + sentence pairs, in order. */
export function conflictsFingerprint(conflicts: readonly PaletteConflict[]): string {
  return JSON.stringify(conflicts.map((c) => [c.severity, c.message]));
}

/** The built panel: the element to mount plus its update hook. */
export interface PalettePanel {
  element: HTMLElement;
  update(state: PalettePanelState): void;
}

/** Disclosure wiring for the thread-depth reveal (M14-IMPL-03). */
export interface PaletteDepthOptions {
  /** Initial open state (preference or spec default: closed). */
  open: boolean;
  /** User toggles, for preference persistence. */
  onToggle(open: boolean): void;
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
  wrapper.append(input, label);
  // Provenance is stated next to the brand where it is the warning
  // case: a mapped "colour" is a converted DMC value the user is
  // entitled to know about before buying thread against it
  // (M7-BRAND-01). Measured is the group's stated default
  // (M14-EXT-42 — eight identical spans compressed to the marked
  // exceptions plus one shared note).
  if (brand.provenance === 'mapped') {
    const note = doc.createElement('span');
    note.className = 'meta';
    note.textContent = 'mapped colours';
    note.title = brand.note;
    wrapper.append(note);
  }
  return wrapper;
}

/** Create the Colour panel. */
export function createPalettePanel(
  doc: Document,
  catalogue: ThreadCatalogue,
  initial: PalettePanelState,
  actions: PalettePanelActions,
  depth?: PaletteDepthOptions,
): PalettePanel {
  let state = initial;
  let query = '';

  // No legend: the group is its section's only content from
  // M14-EXT-28, so the Colour accordion header is the name (a legend
  // would say it twice — the D83 rule).
  const element = doc.createElement('fieldset');

  // "Threadify colours" leads (M14-EXT-29, reading A of the memo,
  // owner-coined name): the full-RGB↔threads boolean the old
  // `Colour mode` select carried, as a switch. Off is unlimited
  // colours; on converts to threads.
  const threadifyToggle = toggleField(
    doc,
    'threadify-colours',
    'Threadify colours',
    initial.paletteMode,
    (on) => {
      actions.setPaletteMode(on);
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
  // One shared provenance note for the group (M14-EXT-42): the
  // default is stated once, and only the mapped exceptions carry a
  // per-brand mark (see brandCheckbox).
  if (catalogue.brands.some((b) => b.provenance === 'mapped')) {
    const provenanceNote = doc.createElement('p');
    provenanceNote.className = 'meta';
    provenanceNote.textContent =
      'Colours are as measured by each brand; “mapped colours” marks values converted from DMC.';
    brandGroup.append(provenanceNote);
  }
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

  // --- colour count (M14-EXT-29 recut of the D92/D98 anatomy) ------
  // A "Constrain number of colours" switch owns the count limit
  // (today's meaning of off = the old 'all'); a slider end-stop for
  // "no limit" stays rejected — it conflates mode and count. The
  // `Use exactly this many` checkbox retired: the switch means "at
  // most n" (D98's default conduct). A project file saved in exact
  // mode still resolves exactly — core keeps the semantic — but the
  // surface no longer writes it; an edit here writes 'max'.
  const limitToggle = toggleField(
    doc,
    'limit-colours',
    'Constrain number of colours',
    initial.policy.count.mode !== 'all',
    (on) => {
      actions.setPolicy({
        ...state.policy,
        count: { mode: on ? 'max' : 'all', n: state.policy.count.n },
      });
    },
  );
  // Colours: slider + number input + steppers, in lockstep
  // (M14-EXT-29). Slider to 64 with the input to the 512 ceiling:
  // the slider covers the stitchable range, the field the rest.
  const countWrap = doc.createElement('div');
  countWrap.className = 'field';
  const rangeLabel = doc.createElement('label');
  rangeLabel.htmlFor = 'count-range';
  rangeLabel.textContent = 'Colours';
  const countRange = doc.createElement('input');
  countRange.type = 'range';
  countRange.id = 'count-range';
  countRange.min = '1';
  countRange.max = '64';
  countRange.step = '1';
  countRange.value = String(Math.min(64, initial.policy.count.n));
  countRange.addEventListener('input', () => {
    actions.setPolicy({
      ...state.policy,
      count: { mode: state.policy.count.mode, n: Number(countRange.value) },
    });
  });
  countWrap.append(rangeLabel, countRange);
  // The helper rides at cluster level (M14-EXT-42): inside the field
  // it forced the field wide enough to defeat the shared row.
  const countN = numberField(
    doc,
    'count-n',
    'Number of colours',
    {
      min: 1,
      max: 512,
      value: initial.policy.count.n,
    },
    (value) => {
      actions.setPolicy({ ...state.policy, count: { mode: state.policy.count.mode, n: value } });
    },
  );
  // Steppers: one deliberate step per press. Short visible symbols
  // with full accessible names — the sanctioned A2 anatomy the
  // palette editor's ↑/↓ established. Their outcome is announced in
  // a dedicated polite region: the slider and input announce their
  // own values natively, a button press otherwise says nothing.
  const countStatus = doc.createElement('p');
  countStatus.className = 'visually-hidden';
  countStatus.setAttribute('role', 'status');
  const stepCount = (delta: number): void => {
    const n = Math.min(512, Math.max(1, state.policy.count.n + delta));
    if (n === state.policy.count.n) return;
    countStatus.textContent = n === 1 ? '1 colour' : `${String(n)} colours`;
    actions.setPolicy({ ...state.policy, count: { mode: state.policy.count.mode, n } });
  };
  const stepRow = doc.createElement('div');
  stepRow.className = 'toolbar count-steppers';
  const fewerButton = doc.createElement('button');
  fewerButton.type = 'button';
  fewerButton.textContent = '−';
  fewerButton.setAttribute('aria-label', 'Fewer colours');
  fewerButton.addEventListener('click', () => {
    stepCount(-1);
  });
  const moreButton = doc.createElement('button');
  moreButton.type = 'button';
  moreButton.textContent = '+';
  moreButton.setAttribute('aria-label', 'More colours');
  moreButton.addEventListener('click', () => {
    stepCount(1);
  });
  stepRow.append(fewerButton, moreButton, countStatus);
  // One cluster for the whole integer (M14-EXT-42, the EXT-20
  // size-row precedent): slider, exact field and steppers pack side
  // by side and wrap only where the column forces it — visible
  // labels and 44 px targets unchanged, only the stacked height
  // goes. Seven stacked elements were the census's first item.
  const countCluster = doc.createElement('div');
  countCluster.className = 'count-cluster';
  const countHelper = doc.createElement('p');
  countHelper.className = 'helper';
  countHelper.id = 'count-n-helper';
  countHelper.textContent = 'The slider reaches 64; type here for more.';
  const countNInput = countN.querySelector('input');
  countNInput?.setAttribute('aria-describedby', countHelper.id);
  countCluster.append(countWrap, countN, stepRow, countHelper);

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
  const searchLabel = doc.createElement('label');
  searchLabel.htmlFor = search.id;
  searchLabel.textContent = 'Find a thread';
  const searchField = doc.createElement('div');
  searchField.className = 'field';
  searchField.append(searchLabel, search);
  search.addEventListener('input', () => {
    query = search.value;
    // The bulk labels are filter-dependent, so they refresh with it —
    // a button reading "Mark 489 as owned" over a narrowed list would
    // be a lie by staleness.
    update(state);
  });

  const threadList = doc.createElement('div');
  threadList.className = 'thread-list';
  const threadCount = doc.createElement('p');
  threadCount.className = 'meta';

  const button = (text: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };

  // --- bulk inventory -----------------------------------------------
  // The counts live in the button labels rather than behind a
  // confirmation: seeing "Mark 12 as owned" before clicking is error
  // *prevention*, which beats confirming after the fact. Only the
  // subtractive direction asks, because only it can lose a record the
  // user built by hand.
  const bulkRow = doc.createElement('div');
  bulkRow.className = 'toolbar';
  const bulkOwn = button('Mark matching as owned', () => {
    const ids = bulkOwnershipTargets(catalogue, state, query, true);
    if (ids.length > 0) actions.setOwnedBulk(ids, true);
  });
  bulkOwn.id = 'bulk-own';
  const bulkDisown = button('Mark matching as not owned', () => {
    const ids = bulkOwnershipTargets(catalogue, state, query, false);
    if (ids.length === 0) return;
    // Carbon danger modal instead of window.confirm (audit A6): same
    // guarded consequence, real anatomy, focus handled by the modal.
    void confirmDangerModal(doc, {
      title: 'Remove from inventory',
      body: `Remove ${String(ids.length)} thread(s) from your inventory? This is your own record of what you own, not a design change.`,
      confirmLabel: 'Remove threads',
    }).then((ok) => {
      if (ok) actions.setOwnedBulk(ids, false);
    });
  });
  bulkDisown.id = 'bulk-disown';
  bulkRow.append(bulkOwn, bulkDisown);

  // --- saved-palette editor ------------------------------------------
  // A disclosure, collapsed by default: the entry list is up to 60 rows
  // and the settings panel is already long, so opening it should be a
  // choice. `details`/`summary` is the same disclosure pattern the debug
  // panel uses and is keyboard-operable without any script.
  const editorWrap = doc.createElement('details');
  editorWrap.className = 'palette-editor';
  const editorSummary = doc.createElement('summary');
  editorSummary.textContent = 'Palette contents';

  // --- library actions ----------------------------------------------
  const actionRow = doc.createElement('div');
  actionRow.className = 'toolbar';
  const libraryNote = doc.createElement('p');
  libraryNote.className = 'meta';
  const deleteButton = button('Delete this palette', () => {
    const source = state.policy.source;
    if (source.kind !== 'library') return;
    actions.deletePalette(source.paletteId);
  });
  deleteButton.id = 'delete-palette';
  const undoButton = button('Undo delete', () => {
    actions.undoDeletePalette();
  });
  undoButton.id = 'undo-delete';
  actionRow.append(
    button('Save as palette', () => {
      actions.savePaletteToLibrary();
    }),
    deleteButton,
    undoButton,
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

  /** One text write, only when the text changed — a same-string
   *  rewrite still replaces the text node, and update() runs per
   *  processed frame (M14-EXT-43). */
  const setText = (node: Element, text: string): void => {
    if (node.textContent !== text) node.textContent = text;
  };

  /**
   * Rebuild a region without losing the user's place (M14-EXT-43): if
   * focus was inside, restore it to the same control by id, then by
   * accessible name (the ↑/↓ move buttons carry stable aria-labels
   * but no ids), else to the region's own disclosure summary — the
   * "move focus deliberately" rule in UI-STANDARDS.
   */
  function rebuildRestoringFocus(
    scopes: readonly HTMLElement[],
    fallback: HTMLElement | null,
    rebuild: () => void,
  ): void {
    const active = doc.activeElement;
    const inScope = active instanceof HTMLElement && scopes.some((s) => s.contains(active));
    const id = inScope && active.id !== '' ? active.id : null;
    const label = inScope ? active.getAttribute('aria-label') : null;
    rebuild();
    if (!inScope) return;
    if (id !== null) {
      const el = doc.getElementById(id);
      if (el instanceof HTMLElement) {
        el.focus();
        return;
      }
    }
    if (label !== null) {
      for (const scope of scopes) {
        for (const el of scope.querySelectorAll('[aria-label]')) {
          if (el.getAttribute('aria-label') === label && el instanceof HTMLElement) {
            el.focus();
            return;
          }
        }
      }
    }
    fallback?.focus();
  }

  /** The count line under the thread list (shared by both paths). */
  function renderThreadCount(shown: number, total: number): void {
    // Empty states distinguish "filtered out" from "nothing here"
    // (UI-STANDARDS; M14-IMPL-04): a search that matched nothing names
    // itself and the way back; an empty brand set is the brand
    // conflict's job and gets a pointer, not a duplicate explanation.
    if (total === 0) {
      setText(
        threadCount,
        query.trim() !== ''
          ? `No threads match "${query.trim()}" — clear the search to see every thread.`
          : 'No threads here — enable a thread brand above.',
      );
    } else {
      setText(
        threadCount,
        total > shown
          ? `Showing ${String(shown)} of ${String(total)} threads — search to narrow.`
          : `${String(total)} thread${total === 1 ? '' : 's'}.`,
      );
    }
  }

  /**
   * Value pass over an unchanged row set (M14-EXT-43): the fingerprint
   * proved the same threads in the same order, so ownership, role and
   * the in-palette marker land on the existing elements — an open rule
   * popup or a focused checkbox is never disturbed.
   */
  function updateThreadValues(rows: readonly ThreadRow[], total: number): void {
    rows.forEach((row, index) => {
      const item = threadList.children.item(index);
      if (!(item instanceof HTMLElement)) return;
      const name = item.querySelector('.thread-name');
      if (name !== null) setText(name, row.selected ? `${row.label} · in palette` : row.label);
      const ownedBox = doc.getElementById(`own-${row.thread.id}`);
      if (ownedBox instanceof HTMLInputElement) ownedBox.checked = row.owned;
      const roleSelect = doc.getElementById(`role-${row.thread.id}`);
      if (roleSelect instanceof HTMLSelectElement && roleSelect.value !== row.role) {
        roleSelect.value = row.role;
      }
    });
    renderThreadCount(rows.length, total);
  }

  /** Rebuild the thread rows for the current policy and search. */
  function renderThreads(rows: readonly ThreadRow[], total: number): void {
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
      // Sixty rows of checkboxes all named "Own" are indistinguishable
      // to assistive tech (audit A2) — the accessible name carries the
      // thread, the visible label stays terse (same pattern as the
      // rule select below).
      ownedBox.setAttribute('aria-label', `Own ${row.label}`);
      ownedBox.addEventListener('change', () => {
        actions.setOwned(row.thread.id, ownedBox.checked);
      });
      const ownedLabel = doc.createElement('label');
      ownedLabel.htmlFor = ownedBox.id;
      ownedLabel.textContent = 'Own';
      ownedLabel.setAttribute('aria-hidden', 'true');

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
    renderThreadCount(rows.length, total);
  }

  /** The saved palette the policy currently points at, if any. */
  function selectedLibraryPalette(): LibraryPalette | undefined {
    const source = state.policy.source;
    if (source.kind !== 'library') return undefined;
    return state.library.find((p) => p.id === source.paletteId);
  }

  /**
   * Render the ordered contents of the selected saved palette, with
   * move and remove controls.
   *
   * Buttons rather than drag: reordering has to be keyboard-operable
   * (UI-STANDARDS → "Operable"), and a button is keyboard-operable by
   * construction rather than by adding a parallel key handler to a
   * pointer gesture.
   */
  function renderEditor(): void {
    editorWrap.replaceChildren(editorSummary);
    const palette = selectedLibraryPalette();
    if (palette === undefined) return;

    // The fold line stays the bare 'Palette contents' (M14-EXT-22 —
    // no stat rides a closed fold); the open heading names the
    // palette and its size.
    const heading = doc.createElement('p');
    heading.className = 'group-label';
    heading.textContent = `Palette contents — ${palette.name} (revision ${String(palette.revision)})`;
    const note = doc.createElement('p');
    note.className = 'meta';
    // Order is not decoration, and the consequence of editing is not
    // obvious, so both are said outright.
    note.textContent =
      'Order decides which thread wins when two are equally close, so moving an entry changes the design. Projects already saved keep their own copy and are unaffected until you reopen and refresh them.';
    editorWrap.append(heading, note);

    const allRows = buildPaletteEntryRows(palette, catalogue);
    const rows = allRows.slice(0, PALETTE_EDIT_CAP);
    const list = doc.createElement('ol');
    list.className = 'palette-entries';
    rows.forEach((row, index) => {
      const item = doc.createElement('li');
      item.className = row.unresolved ? 'palette-entry unresolved' : 'palette-entry';

      const swatch = doc.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = row.hex;
      swatch.setAttribute('aria-hidden', 'true');

      const name = doc.createElement('span');
      name.className = 'thread-name';
      name.textContent = row.label;

      const up = button('↑', () => {
        actions.movePaletteEntry(palette.id, index, -1);
      });
      up.setAttribute('aria-label', `Move ${row.label} up`);
      up.disabled = index === 0;
      const down = button('↓', () => {
        actions.movePaletteEntry(palette.id, index, 1);
      });
      down.setAttribute('aria-label', `Move ${row.label} down`);
      down.disabled = index === allRows.length - 1;
      const remove = button('Remove', () => {
        actions.removePaletteEntry(palette.id, index);
      });
      remove.setAttribute('aria-label', `Remove ${row.label} from this palette`);

      item.append(swatch, name, up, down, remove);
      list.append(item);
    });
    editorWrap.append(list);

    if (allRows.length > rows.length) {
      const overflow = doc.createElement('p');
      overflow.className = 'meta';
      overflow.textContent = `Showing the first ${String(rows.length)} of ${String(allRows.length)} threads. Moving entries one step at a time is impractical at this size — set a colour count above to narrow the palette first.`;
      editorWrap.append(overflow);
    }
  }

  /** Rebuild the source select (its options depend on the library). */
  /**
   * Value pass over unchanged source structure (M14-EXT-43): the
   * selected value lands on the existing selects, so the open popup
   * the owner watched collapse mid-choice is never rebuilt away.
   */
  function syncSourceValues(): void {
    const sourceSelect = sourceWrap.querySelector('select');
    if (sourceSelect !== null) {
      const value = sourceValue(state.policy);
      if (sourceSelect.value !== value) sourceSelect.value = value;
    }
    const modeSelect = presetModeWrap.querySelector('select');
    if (modeSelect !== null && state.policy.source.kind === 'preset') {
      const mode = state.policy.source.mode;
      if (modeSelect.value !== mode) modeSelect.value = mode;
    }
  }

  function renderSource(): void {
    sourceWrap.replaceChildren(
      selectField(
        doc,
        'palette-source',
        'Threads to choose from',
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

  // Last-rendered structure per region (M14-EXT-43): '' forces the
  // initial render below.
  let lastSourceFp = '';
  let lastEditorFp = '';
  let lastThreadsFp = '';
  let lastConflictsFp = '';

  function renderConflicts(): void {
    conflictList.replaceChildren();
    for (const conflict of state.conflicts) {
      const item = doc.createElement('li');
      item.className = conflict.severity === 'error' ? 'conflict-error' : 'conflict-warning';
      // The severity word is text, so the distinction survives without
      // colour and without a screen reader having to infer it.
      item.textContent = `${conflict.severity === 'error' ? 'Problem' : 'Note'}: ${conflict.message}`;
      conflictList.append(item);
    }
  }

  function update(next: PalettePanelState): void {
    state = next;
    const paletteMode = next.paletteMode;
    // Full-RGB collapses the palette surface to the mode select; the
    // depth reveal hides wholesale (its internals need no per-element
    // toggling once they share one container — M14-IMPL-03).
    for (const el of [sourceWrap, presetModeWrap]) {
      el.hidden = !paletteMode;
    }
    threadDetails.hidden = !paletteMode;
    // The Threadify switch mirrors the mode whatever set it (a
    // loaded project flips it too, not only its own clicks).
    threadifyToggle.input.checked = paletteMode;
    const threadifyState = threadifyToggle.input.nextElementSibling;
    if (threadifyState !== null) threadifyState.textContent = paletteMode ? 'On' : 'Off';
    const limited = next.policy.count.mode !== 'all';
    limitToggle.element.hidden = !paletteMode;
    limitToggle.input.checked = limited;
    const toggleState = limitToggle.input.nextElementSibling;
    if (toggleState !== null) toggleState.textContent = limited ? 'On' : 'Off';
    countCluster.hidden = !paletteMode || !limited;
    // Lockstep (M14-EXT-29): slider, input and steppers mirror every
    // count change, whichever of them made it — except onto the
    // control the user is holding (M14-EXT-43): update() runs per
    // processed frame, and writing a value into a focused field
    // stomps a half-typed number or a mid-drag thumb. The skipped
    // sync lands on the next update after blur.
    if (doc.activeElement !== countRange) {
      countRange.value = String(Math.min(64, next.policy.count.n));
    }
    const countInput = doc.getElementById('count-n');
    if (countInput instanceof HTMLInputElement && doc.activeElement !== countInput) {
      countInput.value = String(next.policy.count.n);
    }
    fewerButton.disabled = next.policy.count.n <= 1;
    moreButton.disabled = next.policy.count.n >= 512;
    // The saved-palette editor exists only for a library source
    // (audit A5): for brands/preset sources the disclosure would open
    // onto nothing.
    editorWrap.hidden = next.policy.source.kind !== 'library';

    // Counts go in the labels so the size of a bulk change is visible
    // before it is made, and a no-op button disables itself rather than
    // silently doing nothing (UI-STANDARDS → "disable impossible
    // actions").
    const toOwn = bulkOwnershipTargets(catalogue, next, query, true).length;
    const toDisown = bulkOwnershipTargets(catalogue, next, query, false).length;
    setText(bulkOwn, toOwn === 0 ? 'All matching already owned' : `Mark ${String(toOwn)} matching as owned`);
    bulkOwn.disabled = toOwn === 0;
    setText(
      bulkDisown,
      toDisown === 0 ? 'None matching are owned' : `Mark ${String(toDisown)} matching as not owned`,
    );
    bulkDisown.disabled = toDisown === 0;

    deleteButton.hidden = next.policy.source.kind !== 'library';
    undoButton.hidden = next.deletedPalette === null;
    if (next.deletedPalette !== null) {
      setText(undoButton, `Undo delete of "${next.deletedPalette.name}"`);
    }

    setText(summary, countSummary(next));
    setText(
      libraryNote,
      next.libraryPersistent
        ? 'Your inventory and saved palettes are stored in this browser. Export them to keep a copy.'
        : 'Browser storage is unavailable, so your inventory and palettes last only until you reload. Export them to keep them.',
    );

    // Structure-gated rebuilds (M14-EXT-43): each region rebuilds only
    // when its fingerprint moved; otherwise values land in place and
    // an open popup or focused control is never disturbed.
    const conflictsFp = conflictsFingerprint(next.conflicts);
    if (conflictsFp !== lastConflictsFp) {
      lastConflictsFp = conflictsFp;
      renderConflicts();
    }
    const sourceFp = sourceFingerprint(next);
    if (sourceFp !== lastSourceFp) {
      lastSourceFp = sourceFp;
      rebuildRestoringFocus([sourceWrap, presetModeWrap], null, renderSource);
    } else {
      syncSourceValues();
    }
    const editorFp = editorFingerprint(next);
    if (editorFp !== lastEditorFp) {
      lastEditorFp = editorFp;
      rebuildRestoringFocus([editorWrap], editorSummary, renderEditor);
    }
    const { rows, total } = buildThreadRows(catalogue, next, query);
    const threadsFp = threadsFingerprint(rows);
    if (threadsFp !== lastThreadsFp) {
      lastThreadsFp = threadsFp;
      rebuildRestoringFocus([threadList], threadSummary, () => {
        renderThreads(rows, total);
      });
    } else {
      updateThreadValues(rows, total);
    }
  }

  // Depth split (M14-IMPL-03, ui-spec §5): the essentials stay on the
  // Design surface; the 60-row list and its machinery live behind one
  // reveal, out of layout and the tab order while closed — the
  // measured cause of the panel's 8k px inflation (D75).
  const threadDetails = doc.createElement('details');
  threadDetails.className = 'depth-reveal';
  const threadSummary = doc.createElement('summary');
  threadSummary.textContent = 'Thread library & rules';
  const threadBody = doc.createElement('div');
  threadBody.className = 'depth-reveal-body';
  threadBody.append(
    brandGroup,
    ownedToggle.element,
    searchField,
    threadCount,
    bulkRow,
    threadList,
    editorWrap,
    actionRow,
    libraryNote,
  );
  threadDetails.append(threadSummary, threadBody);
  threadDetails.open = depth?.open ?? false;
  threadDetails.addEventListener('toggle', () => {
    depth?.onToggle(threadDetails.open);
  });

  // Anatomy order (M14-EXT-29, reading A): Threadify leads, then the
  // constrain switch and the Colours controls; the source select
  // follows — the slot M15's "Colour profile" will take.
  element.append(
    threadifyToggle.element,
    limitToggle.element,
    countCluster,
    sourceWrap,
    presetModeWrap,
    summary,
    conflictList,
    threadDetails,
  );
  update(initial);

  return { element, update };
}
