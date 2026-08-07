/**
 * The recut Colour section (M15-UI-01, D114/D115): profile select +
 * Edit profiles…, the (edited)-copy state with Update / Save as new /
 * Revert, count + minimum distance, Must-use chips with search-to-add,
 * the conflicts list, and the My-threads inventory reveal (ownership
 * is the inventory's own concern and survives the cutover here).
 *
 * The section fills the slot M14-EXT-42 protected. Controls build
 * once; update() lands values in place, with EXT-43 fingerprints
 * gating every rebuildable region — the palette-panel contract,
 * carried by its successor.
 */

import type { PaletteConflict } from '../core/palette-policy.ts';
import { createBrowseTable, type BrowseRow, type BrowseTable } from './browse-table.ts';
import { toggleField } from './controls.ts';

/** One profile as the select lists it. */
export interface SectionProfile {
  id: string;
  name: string;
  builtin: boolean;
}

/** The section's view of the design's colour state. */
export interface ColourSectionState {
  paletteMode: boolean;
  profiles: SectionProfile[];
  /** The linked profile id, or null when the design stands alone. */
  profileRef: string | null;
  /** True when the design's copy differs from the linked profile. */
  edited: boolean;
  count: { mode: 'all' | 'max' | 'exact'; n: number };
  minDistance: number;
  mustUse: string[];
  conflicts: PaletteConflict[];
  eligibleCount: number;
}

/** Everything the section calls back into the host for. */
export interface ColourSectionActions {
  setPaletteMode(on: boolean): void;
  /** Adopt a profile: the design takes a fresh copy of its recipe. */
  selectProfile(id: string): void;
  updateProfile(): void;
  saveAsNew(): void;
  revert(): void;
  setCount(mode: 'all' | 'max', n: number): void;
  setMinDistance(value: number): void;
  addMustUse(id: string): void;
  removeMustUse(id: string): void;
  openEditor(): void;
  /** Row model for the Must-use add search (the whole universe). */
  browseRows(query: string): { rows: BrowseRow[]; total: number };
  /** Label for a must-use id (falls back to the id). */
  labelFor(id: string): string;
  /**
   * Fill the My-threads inventory reveal. Ownership is the
   * inventory's own concern (UI-03 rule) and survives the cutover
   * here — the host owns the plumbing, this section owns the slot.
   */
  mountInventory(container: HTMLElement): void;
}

export interface ColourSection {
  element: HTMLElement;
  update(state: ColourSectionState): void;
}

/** Sentinel select value for a design linked to no profile — the
 *  never-lying state the dither select established (review of D124,
 *  punch item 2): a migrated old file must not wear a built-in's
 *  name. */
export const UNLINKED_DESIGN = 'custom:design';

/** Build the recut Colour section. */
export function createColourSection(
  doc: Document,
  initial: ColourSectionState,
  actions: ColourSectionActions,
): ColourSection {
  let state = initial;
  const element = doc.createElement('fieldset');

  // --- mode ---------------------------------------------------------
  const threadify = toggleField(doc, 'threadify-colours', 'Threadify colours', initial.paletteMode, (on) => {
    actions.setPaletteMode(on);
  });

  // --- profile select + editor entry -------------------------------
  const profileField = doc.createElement('div');
  profileField.className = 'field';
  const profileLabel = doc.createElement('label');
  profileLabel.htmlFor = 'colour-profile';
  profileLabel.textContent = 'Colour profile';
  const profileSelect = doc.createElement('select');
  profileSelect.id = 'colour-profile';
  profileSelect.addEventListener('change', () => {
    // Picking the sentinel is a no-op: it names the current state,
    // it is not an adoptable profile.
    if (profileSelect.value === UNLINKED_DESIGN) return;
    actions.selectProfile(profileSelect.value);
  });
  profileField.append(profileLabel, profileSelect);
  const editButton = doc.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edit profiles…';
  editButton.addEventListener('click', () => {
    actions.openEditor();
  });
  const profileRow = doc.createElement('div');
  profileRow.className = 'toolbar profile-row';
  profileRow.append(profileField, editButton);

  // --- the (edited) actions ----------------------------------------
  const editedRow = doc.createElement('div');
  editedRow.className = 'toolbar edited-row';
  editedRow.hidden = true;
  const editedNote = doc.createElement('p');
  editedNote.className = 'meta';
  editedNote.textContent = 'This design has its own edits to the profile.';
  const builtinReason = doc.createElement('p');
  builtinReason.className = 'helper';
  builtinReason.id = 'update-profile-reason';
  builtinReason.textContent =
    'The linked profile is built-in and read-only — Save as new keeps these edits.';
  builtinReason.hidden = true;
  const verb = (text: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };
  const updateButton = verb('Update profile', () => {
    actions.updateProfile();
  });
  updateButton.setAttribute('aria-describedby', builtinReason.id);
  const saveAsNewButton = verb('Save as new', () => {
    actions.saveAsNew();
  });
  const revertButton = verb('Revert', () => {
    actions.revert();
  });
  editedRow.append(editedNote, updateButton, saveAsNewButton, revertButton, builtinReason);

  // --- count + minimum distance ------------------------------------
  const limitToggle = toggleField(
    doc,
    'limit-colours',
    'Constrain number of colours',
    initial.count.mode !== 'all',
    (on) => {
      actions.setCount(on ? 'max' : 'all', state.count.n);
    },
  );
  const countCluster = doc.createElement('div');
  countCluster.className = 'count-cluster';
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
  countRange.addEventListener('input', () => {
    actions.setCount('max', Number(countRange.value));
  });
  countWrap.append(rangeLabel, countRange);
  const countNumWrap = doc.createElement('div');
  countNumWrap.className = 'field';
  const countNumLabel = doc.createElement('label');
  countNumLabel.htmlFor = 'count-n';
  countNumLabel.textContent = 'Number of colours';
  const countInput = doc.createElement('input');
  countInput.type = 'number';
  countInput.id = 'count-n';
  countInput.min = '1';
  countInput.max = '512';
  countInput.step = '1';
  countInput.addEventListener('change', () => {
    const n = Math.max(1, Math.min(512, Math.round(Number(countInput.value) || 1)));
    countInput.value = String(n);
    actions.setCount('max', n);
  });
  countNumWrap.append(countNumLabel, countInput);
  const countHelper = doc.createElement('p');
  countHelper.className = 'helper';
  countHelper.id = 'count-n-helper';
  countHelper.textContent = 'The slider reaches 64; type here for more.';
  countInput.setAttribute('aria-describedby', countHelper.id);
  countCluster.append(countWrap, countNumWrap, countHelper);

  const distanceField = doc.createElement('div');
  distanceField.className = 'field';
  const distanceLabel = doc.createElement('label');
  distanceLabel.htmlFor = 'min-distance';
  distanceLabel.textContent = 'Minimum distance';
  const distanceRow = doc.createElement('div');
  distanceRow.className = 'stitch-size-row';
  const distanceRange = doc.createElement('input');
  distanceRange.type = 'range';
  distanceRange.id = 'min-distance';
  distanceRange.min = '0';
  distanceRange.max = '40';
  distanceRange.step = '1';
  const distanceValue = doc.createElement('span');
  distanceValue.className = 'meta';
  const distanceHelper = doc.createElement('p');
  distanceHelper.className = 'helper';
  distanceHelper.id = 'min-distance-helper';
  distanceHelper.textContent =
    'Keeps chosen colours at least this far apart (ΔE) — 0 is off; Must-use colours are always kept.';
  distanceRange.setAttribute('aria-describedby', distanceHelper.id);
  distanceRange.addEventListener('input', () => {
    actions.setMinDistance(Number(distanceRange.value));
  });
  distanceRow.append(distanceRange, distanceValue);
  distanceField.append(distanceLabel, distanceRow, distanceHelper);

  // --- Must-use chips + search-to-add ------------------------------
  const mustUseLabel = doc.createElement('p');
  mustUseLabel.className = 'group-label';
  mustUseLabel.textContent = 'Must-use colours';
  const chipList = doc.createElement('div');
  chipList.className = 'pin-chips';
  chipList.setAttribute('role', 'list');
  const addDetails = doc.createElement('details');
  addDetails.className = 'depth-reveal';
  const addSummary = doc.createElement('summary');
  addSummary.textContent = 'Add a must-use colour';
  const addBody = doc.createElement('div');
  addBody.className = 'depth-reveal-body';
  addDetails.append(addSummary, addBody);

  // --- conflicts (the never-silent surface) ------------------------
  const summary = doc.createElement('p');
  summary.className = 'meta';
  summary.id = 'palette-summary';
  const conflictList = doc.createElement('ul');
  conflictList.className = 'conflicts';
  conflictList.setAttribute('aria-live', 'polite');

  // --- My threads (inventory) reveal -------------------------------
  const inventoryDetails = doc.createElement('details');
  inventoryDetails.className = 'depth-reveal';
  const inventorySummary = doc.createElement('summary');
  inventorySummary.textContent = 'My threads (inventory)';
  const inventoryBody = doc.createElement('div');
  inventoryBody.className = 'depth-reveal-body';
  inventoryDetails.append(inventorySummary, inventoryBody);
  actions.mountInventory(inventoryBody);

  element.append(
    threadify.element,
    profileRow,
    editedRow,
    limitToggle.element,
    countCluster,
    distanceField,
    mustUseLabel,
    chipList,
    addDetails,
    summary,
    conflictList,
    inventoryDetails,
  );

  // Build the add-search once (it queries live through the action).
  const mustUseTable: BrowseTable = createBrowseTable(doc, {
    searchId: 'must-use-search',
    searchLabel: 'Find a colour to guarantee',
    rowsFor: (query) => actions.browseRows(query),
    rowActions: (row) => {
      const add = doc.createElement('button');
      add.type = 'button';
      add.textContent = 'Must use';
      add.setAttribute('aria-label', `Must use ${row.label}`);
      add.setAttribute('aria-pressed', String(state.mustUse.includes(row.id)));
      add.addEventListener('click', () => {
        if (state.mustUse.includes(row.id)) actions.removeMustUse(row.id);
        else actions.addMustUse(row.id);
        mustUseTable.refresh();
      });
      return [add];
    },
    emptyText: 'Nothing here yet.',
  });
  addBody.append(mustUseTable.element);

  let lastOptionsFp = '';
  let lastChipsFp = '';
  let lastConflictsFp = '';

  function update(next: ColourSectionState): void {
    state = next;
    const on = next.paletteMode;
    threadify.input.checked = on;
    const threadifyState = threadify.input.nextElementSibling;
    if (threadifyState !== null) threadifyState.textContent = on ? 'On' : 'Off';
    for (const el of [
      profileRow,
      editedRow,
      limitToggle.element,
      countCluster,
      distanceField,
      mustUseLabel,
      chipList,
      addDetails,
      summary,
      conflictList,
    ]) {
      el.hidden = !on;
    }
    if (!on) return;

    // Profile select: options rebuild only when the list moved; the
    // (edited) suffix rides the linked option's label (EXT-43).
    const optionsFp = JSON.stringify([
      next.profiles.map((p) => [p.id, p.name, p.builtin]),
      next.profileRef,
      next.edited,
    ]);
    if (optionsFp !== lastOptionsFp) {
      lastOptionsFp = optionsFp;
      profileSelect.replaceChildren();
      if (next.profileRef === null) {
        // An unlinked design (a migrated old file, or a deleted
        // profile's orphan) names itself honestly rather than
        // wearing the first option's name.
        const option = doc.createElement('option');
        option.value = UNLINKED_DESIGN;
        option.textContent = 'This design’s colours';
        profileSelect.append(option);
      }
      for (const profile of next.profiles) {
        const option = doc.createElement('option');
        option.value = profile.id;
        const suffix =
          profile.id === next.profileRef && next.edited
            ? ' (edited)'
            : profile.builtin
              ? ' (built-in)'
              : '';
        option.textContent = `${profile.name}${suffix}`;
        profileSelect.append(option);
      }
      profileSelect.value = next.profileRef ?? UNLINKED_DESIGN;
    }
    editedRow.hidden = !next.edited;
    // Updating a built-in in place is impossible — the store refuses;
    // Save as new is the route (Update disabled, reason in its title).
    const builtinLinked =
      next.profiles.find((p) => p.id === next.profileRef)?.builtin ?? false;
    updateButton.disabled = builtinLinked;
    // The reason is a visible sentence, not a hover-only title
    // (review of D124, punch item 5): disabled controls still owe
    // their explanation to keyboard and AT users.
    builtinReason.hidden = !(builtinLinked && next.edited);

    const limited = next.count.mode !== 'all';
    limitToggle.input.checked = limited;
    const limitState = limitToggle.input.nextElementSibling;
    if (limitState !== null) limitState.textContent = limited ? 'On' : 'Off';
    countCluster.hidden = !limited;
    if (doc.activeElement !== countRange) {
      countRange.value = String(Math.min(64, next.count.n));
    }
    if (doc.activeElement !== countInput) countInput.value = String(next.count.n);
    if (doc.activeElement !== distanceRange) {
      distanceRange.value = String(next.minDistance);
    }
    distanceValue.textContent = next.minDistance === 0 ? 'off' : `ΔE ${String(next.minDistance)}`;

    const chipsFp = next.mustUse.join('\n');
    if (chipsFp !== lastChipsFp) {
      lastChipsFp = chipsFp;
      chipList.replaceChildren();
      for (const id of next.mustUse) {
        const chip = doc.createElement('span');
        chip.className = 'pin-chip';
        chip.setAttribute('role', 'listitem');
        const text = doc.createElement('span');
        text.textContent = actions.labelFor(id);
        const remove = doc.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove must-use ${actions.labelFor(id)}`);
        remove.addEventListener('click', () => {
          actions.removeMustUse(id);
        });
        chip.append(text, remove);
        chipList.append(chip);
      }
      chipList.hidden = next.mustUse.length === 0;
    }

    summary.textContent = `${String(next.eligibleCount)} colour${next.eligibleCount === 1 ? '' : 's'} available.`;

    const conflictsFp = JSON.stringify(next.conflicts.map((c) => [c.severity, c.message]));
    if (conflictsFp !== lastConflictsFp) {
      lastConflictsFp = conflictsFp;
      conflictList.replaceChildren();
      for (const conflict of next.conflicts) {
        const item = doc.createElement('li');
        item.className = conflict.severity === 'error' ? 'conflict-error' : 'conflict-warning';
        item.textContent = `${conflict.severity === 'error' ? 'Problem' : 'Note'}: ${conflict.message}`;
        conflictList.append(item);
      }
    }
  }

  update(initial);
  return { element, update };
}
