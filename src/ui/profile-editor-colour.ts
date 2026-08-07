/**
 * The colour profile kind (M15-UI-03, D114/D115): the libraries
 * column, pins, two-pole H/S/B ranges, custom colours and the
 * resulting-colours readout — mounted in the kind-agnostic takeover
 * shell (M15-UI-02).
 *
 * Pure halves (row models, fingerprints, hex parsing) are exported
 * and tested in node; the DOM half builds controls **once** and
 * refreshes values in place — the readout swatch grid re-renders
 * only when its fingerprint moves (the EXT-43 idiom). Nothing here
 * subscribes to frame results.
 */

import {
  builtInProfiles,
  emptyRecipe,
  resolveProfileMembership,
  type ColorProfileRecipe,
  type HsbRangeRule,
} from '../core/color-profile.ts';
import {
  allColorMaps,
  colorName,
  nonThreadLabel,
  userColor,
} from '../core/color-sources.ts';
import type { PaletteConflict } from '../core/palette-policy.ts';
import type { ThreadCatalogue } from '../core/thread-catalogue.ts';
import type { Thread } from '../core/types.ts';
import type { ProfileRecord } from '../library/records.ts';
import type { LibraryStore } from '../library/store.ts';
import { createBrowseTable, BROWSE_ROW_CAP, type BrowseRow } from './browse-table.ts';
import { toggleField } from './controls.ts';
import type {
  KindFormHandle,
  ProfileKindAdapter,
  ProfileView,
} from './profile-editor.ts';

/** `#rrggbb` / `rrggbb` → channels, else null. Six digits only. */
export function parseHexQuery(query: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(query.trim());
  if (match === null) return null;
  const hex = match[1] ?? '';
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** Display label for any entry: manufacturer identity for threads,
 *  provenance-honest labels for everything else (CORE-01). */
export function entryLabel(entry: Thread, catalogue: ThreadCatalogue): string {
  const synthetic = nonThreadLabel(entry);
  if (synthetic !== null) return synthetic;
  const brand = catalogue.brands.find((b) => b.id === entry.brandId)?.name ?? entry.brandId;
  return `${brand} ${entry.reference} ${entry.name}`.trim();
}

/** The browse universe: every thread, map entry and custom colour. */
export function browseUniverse(
  catalogue: ThreadCatalogue,
  userColors: readonly Thread[],
  scope: string | null,
): Thread[] {
  const maps = allColorMaps();
  if (scope === null) {
    return [...catalogue.threads, ...maps.flatMap((m) => m.entries), ...userColors];
  }
  if (scope === 'mine' || scope === 'user') return [...userColors];
  if (scope.startsWith('map:')) {
    return maps.find((m) => `map:${m.id}` === scope)?.entries ?? [];
  }
  return catalogue.threads.filter((t) => t.brandId === scope);
}

/** The capped, searched browse rows for a scope. */
export function browseRowsFor(
  catalogue: ThreadCatalogue,
  userColors: readonly Thread[],
  scope: string | null,
  query: string,
  cap = BROWSE_ROW_CAP,
): { rows: BrowseRow[]; total: number } {
  const q = query.trim().toLowerCase();
  const hexQuery = parseHexQuery(query);
  const universe = browseUniverse(catalogue, userColors, scope);
  const matches = universe.filter((entry) => {
    if (q === '') return true;
    if (hexQuery !== null) return entry.hex.toLowerCase() === `#${q.replace('#', '')}`;
    return entryLabel(entry, catalogue).toLowerCase().includes(q);
  });
  return {
    rows: matches.slice(0, cap).map((entry) => ({
      id: entry.id,
      label: entryLabel(entry, catalogue),
      hex: entry.hex,
    })),
    total: matches.length,
  };
}

/** Readout fingerprint: entry ids in resolved order (EXT-43 idiom). */
export function readoutFingerprint(entries: readonly Thread[]): string {
  return entries.map((e) => e.id).join('\n');
}

/** Conflicts fingerprint, mirrored from the panel's (EXT-43). */
export function readoutConflictsFingerprint(conflicts: readonly PaletteConflict[]): string {
  return JSON.stringify(conflicts.map((c) => [c.severity, c.message]));
}

/** The full-span rule a fresh range toggle starts from (a no-op). */
export function fullSpanRule(): HsbRangeRule {
  return { hue: [0, 360], saturation: [0, 100], brightness: [0, 100] };
}

/** What the colour kind needs from the host. */
export interface ColourKindDeps {
  catalogue: ThreadCatalogue;
  /** The live store — the host swaps memory for IndexedDB on open. */
  store(): LibraryStore;
  /** Live owned set (the inventory). */
  owned(): ReadonlySet<string>;
}

/** Guard a stored payload into a recipe, falling back safely. */
function asRecipe(payload: unknown): ColorProfileRecipe {
  if (typeof payload !== 'object' || payload === null) return emptyRecipe();
  const raw = payload as Partial<ColorProfileRecipe>;
  return {
    libraries: Array.isArray(raw.libraries) ? [...raw.libraries] : [],
    ownedOnly: raw.ownedOnly === true,
    include: Array.isArray(raw.include) ? [...raw.include] : [],
    exclude: Array.isArray(raw.exclude) ? [...raw.exclude] : [],
    ranges: Array.isArray(raw.ranges) ? (structuredClone(raw.ranges) as HsbRangeRule[]) : [],
  };
}

/** Build the colour kind for the takeover shell. */
export function createColourKindAdapter(
  doc: Document,
  deps: ColourKindDeps,
): ProfileKindAdapter & {
  /** Resolve a draft to entries — the preview rig's palette source. */
  resolveDraft(draft: unknown): Thread[];
} {
  const { catalogue } = deps;
  const store = (): LibraryStore => deps.store();
  let userColorCache: Thread[] = [];
  let records = new Map<string, ProfileRecord>();
  let names = new Map<string, string>();

  const builtins = builtInProfiles(catalogue);

  async function refreshUserColors(): Promise<void> {
    const stored = await store().listUserColors();
    userColorCache = stored.map((c) => userColor(c.id, c.rgb));
  }

  function inputs(): {
    catalogue: ThreadCatalogue;
    owned: ReadonlySet<string>;
    userColors: ReadonlyMap<string, Thread>;
  } {
    return {
      catalogue,
      owned: deps.owned(),
      userColors: new Map(userColorCache.map((c) => [c.id, c])),
    };
  }

  function resolveDraftRecipe(draft: unknown): ReturnType<typeof resolveProfileMembership> {
    return resolveProfileMembership(asRecipe(draft), inputs());
  }

  const adapter: ProfileKindAdapter & { resolveDraft(draft: unknown): Thread[] } = {
    kind: 'colour',
    title: 'Colour profiles',

    async list(): Promise<ProfileView[]> {
      await refreshUserColors();
      const stored = await store().listProfiles('colour');
      records = new Map(stored.map((r) => [r.id, r]));
      names = new Map([
        ...builtins.map((b): [string, string] => [b.id, b.name]),
        ...stored.map((r): [string, string] => [r.id, r.name]),
      ]);
      return [
        ...builtins.map((b) => ({
          id: b.id,
          name: b.name,
          builtin: true,
          revision: b.revision,
        })),
        ...stored.map((r) => ({
          id: r.id,
          name: r.name,
          builtin: false,
          revision: r.revision,
        })),
      ];
    },

    draftOf(id: string): Promise<unknown> {
      const builtin = builtins.find((b) => b.id === id);
      if (builtin !== undefined) return Promise.resolve(structuredClone(builtin.recipe));
      return Promise.resolve(asRecipe(records.get(id)?.payload));
    },

    async save(id: string, draft: unknown): Promise<ProfileView> {
      const current = records.get(id);
      const record: ProfileRecord = {
        kind: 'colour',
        id,
        name: current?.name ?? names.get(id) ?? 'Profile',
        revision: (current?.revision ?? 0) + 1,
        createdFrom: current?.createdFrom ?? 'new',
        payload: asRecipe(draft),
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name: record.name, builtin: false, revision: record.revision };
    },

    async create(name: string): Promise<ProfileView> {
      const id = `p-${Date.now().toString(36)}-${String(records.size)}`;
      const record: ProfileRecord = {
        kind: 'colour',
        id,
        name,
        revision: 1,
        createdFrom: 'new',
        payload: { ...emptyRecipe(), libraries: ['dmc'] },
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name, builtin: false, revision: 1 };
    },

    async duplicate(id: string, name: string, draft: unknown): Promise<ProfileView> {
      const newId = `p-${Date.now().toString(36)}-${String(records.size)}`;
      const record: ProfileRecord = {
        kind: 'colour',
        id: newId,
        name,
        revision: 1,
        createdFrom: `copy:${id}`,
        payload: asRecipe(draft),
      };
      await store().putProfile(record);
      records.set(newId, record);
      return { id: newId, name, builtin: false, revision: 1 };
    },

    async rename(id: string, name: string): Promise<ProfileView> {
      const current = records.get(id);
      if (current === undefined) throw new Error('Only saved profiles can be renamed.');
      const record = { ...current, name, revision: current.revision + 1 };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name, builtin: false, revision: record.revision };
    },

    async remove(id: string): Promise<void> {
      await store().deleteProfile('colour', id);
      records.delete(id);
    },

    resolveDraft(draft: unknown): Thread[] {
      return resolveDraftRecipe(draft).entries;
    },

    mountForm(container: HTMLElement, onEdit: (draft: unknown) => void): KindFormHandle {
      let draft: ColorProfileRecipe = emptyRecipe();
      let readOnly = false;
      let browseScope: string | null = null;

      const edited = (): void => {
        syncValues();
        onEdit(structuredClone(draft));
      };

      const columns = doc.createElement('div');
      columns.className = 'editor-columns';
      const left = doc.createElement('div');
      left.className = 'editor-libraries';
      const right = doc.createElement('div');
      right.className = 'editor-readout';
      columns.append(left, right);
      container.append(columns);

      // --- libraries ------------------------------------------------
      const libLabel = doc.createElement('p');
      libLabel.className = 'group-label';
      libLabel.textContent = 'Libraries';
      left.append(libLabel);

      interface LibraryRowDef {
        id: string;
        label: string;
        note: string;
      }
      const maps = allColorMaps();
      const libraryDefs: LibraryRowDef[] = [
        ...catalogue.brands.map((b) => ({
          id: b.id,
          label: b.name,
          note: b.provenance === 'mapped' ? 'mapped colours' : '',
        })),
        ...maps.map((m) => ({
          id: `map:${m.id}`,
          label: m.name,
          note: `${String(m.entries.length)} colours`,
        })),
        { id: 'mine', label: 'My threads', note: 'your inventory' },
      ];
      const libraryBoxes = new Map<string, HTMLInputElement>();
      for (const def of libraryDefs) {
        const row = doc.createElement('div');
        row.className = 'check-row';
        const box = doc.createElement('input');
        box.type = 'checkbox';
        box.id = `lib-${def.id.replace(/[^a-z0-9]/gi, '-')}`;
        box.addEventListener('change', () => {
          draft.libraries = box.checked
            ? [...draft.libraries, def.id]
            : draft.libraries.filter((l) => l !== def.id);
          edited();
        });
        const label = doc.createElement('label');
        label.htmlFor = box.id;
        label.textContent = def.label;
        row.append(box, label);
        if (def.note !== '') {
          const note = doc.createElement('span');
          note.className = 'meta';
          note.textContent = def.note;
          row.append(note);
        }
        const browse = doc.createElement('button');
        browse.type = 'button';
        browse.textContent = 'Browse';
        browse.setAttribute('aria-label', `Browse ${def.label}`);
        browse.addEventListener('click', () => {
          browseScope = def.id;
          scopeLine.textContent = `Browsing ${def.label}.`;
          scopeReset.hidden = false;
          browseTable.refresh();
          doc.getElementById('profile-colour-search')?.focus();
        });
        row.append(browse);
        libraryBoxes.set(def.id, box);
        left.append(row);
      }

      const ownedToggle = toggleField(doc, 'profile-owned-only', 'Only colours I own', false, (on) => {
        draft.ownedOnly = on;
        edited();
      });
      left.append(ownedToggle.element);

      // --- ranges ---------------------------------------------------
      const rangeToggle = toggleField(
        doc,
        'profile-range-toggle',
        'Limit by colour range',
        false,
        (on) => {
          draft.ranges = on ? [fullSpanRule()] : [];
          rangeBlock.hidden = !on;
          edited();
        },
      );
      left.append(rangeToggle.element);
      const rangeBlock = doc.createElement('div');
      rangeBlock.className = 'range-block';
      rangeBlock.hidden = true;
      interface PoleDef {
        axis: 'hue' | 'saturation' | 'brightness';
        pole: 0 | 1;
        label: string;
        max: number;
      }
      const poles: PoleDef[] = [
        { axis: 'hue', pole: 0, label: 'Hue from', max: 360 },
        { axis: 'hue', pole: 1, label: 'Hue to', max: 360 },
        { axis: 'saturation', pole: 0, label: 'Saturation from', max: 100 },
        { axis: 'saturation', pole: 1, label: 'Saturation to', max: 100 },
        { axis: 'brightness', pole: 0, label: 'Brightness from', max: 100 },
        { axis: 'brightness', pole: 1, label: 'Brightness to', max: 100 },
      ];
      const poleInputs: { def: PoleDef; range: HTMLInputElement; num: HTMLInputElement }[] = [];
      for (const def of poles) {
        const field = doc.createElement('div');
        field.className = 'field';
        const id = `pole-${def.axis}-${String(def.pole)}`;
        const label = doc.createElement('label');
        label.htmlFor = id;
        label.textContent = def.label;
        const row = doc.createElement('div');
        row.className = 'stitch-size-row';
        const range = doc.createElement('input');
        range.type = 'range';
        range.id = id;
        range.min = '0';
        range.max = String(def.max);
        range.step = '1';
        const num = doc.createElement('input');
        num.type = 'number';
        num.min = '0';
        num.max = String(def.max);
        num.step = '1';
        num.className = 'pole-number';
        num.setAttribute('aria-label', `${def.label}, exact value`);
        const write = (value: number): void => {
          const rule = draft.ranges[0] ?? fullSpanRule();
          const pair: [number, number] = [...(rule[def.axis] ?? [0, def.max])] as [
            number,
            number,
          ];
          pair[def.pole] = Math.max(0, Math.min(def.max, value));
          draft.ranges = [{ ...rule, [def.axis]: pair }];
          edited();
        };
        range.addEventListener('input', () => {
          write(Number(range.value));
        });
        num.addEventListener('change', () => {
          write(Number(num.value));
        });
        row.append(range, num);
        field.append(label, row);
        rangeBlock.append(field);
        poleInputs.push({ def, range, num });
      }
      const rangeNote = doc.createElement('p');
      rangeNote.className = 'helper';
      rangeNote.textContent =
        'Hue wraps: from 330 to 30 spans red across zero. Ranges narrow library colours; pinned colours stay.';
      rangeBlock.append(rangeNote);
      left.append(rangeBlock);

      // --- browse + custom add -------------------------------------
      const browseLabel = doc.createElement('p');
      browseLabel.className = 'group-label';
      browseLabel.textContent = 'Find or add a colour';
      const scopeLine = doc.createElement('span');
      scopeLine.className = 'meta';
      scopeLine.textContent = 'Browsing everything.';
      const scopeReset = doc.createElement('button');
      scopeReset.type = 'button';
      scopeReset.textContent = 'Browse everything';
      scopeReset.hidden = true;
      scopeReset.addEventListener('click', () => {
        browseScope = null;
        scopeLine.textContent = 'Browsing everything.';
        scopeReset.hidden = true;
        browseTable.refresh();
      });
      const scopeRow = doc.createElement('div');
      scopeRow.className = 'toolbar';
      scopeRow.append(scopeLine, scopeReset);

      const pinButton = (
        row: BrowseRow,
        list: 'include' | 'exclude',
        label: string,
      ): HTMLButtonElement => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('aria-label', `${label} ${row.label}`);
        const active = (): boolean => draft[list].includes(row.id);
        button.setAttribute('aria-pressed', String(active()));
        button.addEventListener('click', () => {
          if (readOnly) return;
          const other: 'include' | 'exclude' = list === 'include' ? 'exclude' : 'include';
          if (active()) {
            draft[list] = draft[list].filter((id) => id !== row.id);
          } else {
            draft[list] = [...draft[list], row.id];
            // Disjoint by construction (M7-MIX-01): pinning one way
            // clears the other.
            draft[other] = draft[other].filter((id) => id !== row.id);
          }
          browseTable.refresh();
          edited();
        });
        return button;
      };

      const browseTable = createBrowseTable(doc, {
        searchId: 'profile-colour-search',
        searchLabel: 'Find a colour',
        rowsFor: (query) => browseRowsFor(catalogue, userColorCache, browseScope, query),
        rowActions: (row) => [
          pinButton(row, 'include', 'Pin in'),
          pinButton(row, 'exclude', 'Pin out'),
        ],
        emptyText: 'Nothing here yet — this library is empty.',
      });

      // Custom add: a hex the universe cannot answer becomes an offer,
      // stored in the global My-colours library (D115), pinned here.
      const customOffer = doc.createElement('button');
      customOffer.type = 'button';
      customOffer.hidden = true;
      customOffer.addEventListener('click', () => {
        const rgb = parseHexQuery(browseTable.query());
        if (rgb === null || readOnly) return;
        void (async () => {
          const id = `u-${Date.now().toString(36)}-${String(userColorCache.length)}`;
          await store().putUserColor({ id, rgb });
          await refreshUserColors();
          draft.include = [...draft.include, `user:${id}`];
          customOffer.hidden = true;
          browseTable.refresh();
          edited();
        })();
      });
      const syncCustomOffer = (): void => {
        const rgb = parseHexQuery(browseTable.query());
        if (rgb === null) {
          customOffer.hidden = true;
          return;
        }
        const custom = userColor('probe', rgb);
        const universe = browseUniverse(catalogue, userColorCache, null);
        const exact = universe.some((e) => e.hex === custom.hex);
        customOffer.hidden = exact;
        const name = colorName(custom.hex);
        customOffer.textContent =
          name === null
            ? `Add ${custom.hex} as a custom colour`
            : `Add ${custom.hex} (${name}) as a custom colour`;
      };
      browseTable.element.addEventListener('input', syncCustomOffer);

      left.append(browseLabel, scopeRow, browseTable.element, customOffer);

      // --- readout --------------------------------------------------
      const readoutLabel = doc.createElement('p');
      readoutLabel.className = 'group-label';
      readoutLabel.textContent = 'Resulting colours';
      const readoutCount = doc.createElement('p');
      readoutCount.className = 'meta';
      const conflictList = doc.createElement('ul');
      conflictList.className = 'conflicts';
      conflictList.setAttribute('aria-live', 'polite');
      const pinsLabel = doc.createElement('p');
      pinsLabel.className = 'group-label';
      pinsLabel.textContent = 'Pinned colours';
      pinsLabel.hidden = true;
      const pinsList = doc.createElement('div');
      pinsList.className = 'pin-chips';
      const swatchGrid = doc.createElement('div');
      swatchGrid.className = 'readout-swatches';
      right.append(readoutLabel, readoutCount, conflictList, pinsLabel, pinsList, swatchGrid);

      let lastReadoutFp = '';
      let lastConflictsFp = '';
      let lastPinsFp = '';

      /** Value pass: re-derive the readout, rebuilding only what moved. */
      function syncReadout(): void {
        const resolved = resolveProfileMembership(draft, inputs());
        readoutCount.textContent = `${String(resolved.entries.length)} colour${resolved.entries.length === 1 ? '' : 's'} resolve.`;
        const conflictsFp = readoutConflictsFingerprint(resolved.conflicts);
        if (conflictsFp !== lastConflictsFp) {
          lastConflictsFp = conflictsFp;
          conflictList.replaceChildren();
          for (const conflict of resolved.conflicts) {
            const item = doc.createElement('li');
            item.className =
              conflict.severity === 'error' ? 'conflict-error' : 'conflict-warning';
            item.textContent = `${conflict.severity === 'error' ? 'Problem' : 'Note'}: ${conflict.message}`;
            conflictList.append(item);
          }
        }
        const pinsFp = JSON.stringify([draft.include, draft.exclude]);
        if (pinsFp !== lastPinsFp) {
          lastPinsFp = pinsFp;
          pinsList.replaceChildren();
          const chip = (id: string, out: boolean): HTMLElement => {
            const wrap = doc.createElement('span');
            wrap.className = 'pin-chip';
            const text = doc.createElement('span');
            const entry =
              catalogue.byId.get(id) ??
              browseUniverse(catalogue, userColorCache, null).find((e) => e.id === id);
            text.textContent = `${out ? 'Out: ' : 'In: '}${entry === undefined ? id : entryLabel(entry, catalogue)}`;
            const remove = doc.createElement('button');
            remove.type = 'button';
            remove.textContent = 'Remove';
            remove.setAttribute('aria-label', `Remove pin for ${text.textContent}`);
            remove.addEventListener('click', () => {
              if (readOnly) return;
              draft.include = draft.include.filter((i) => i !== id);
              draft.exclude = draft.exclude.filter((i) => i !== id);
              browseTable.refresh();
              edited();
            });
            wrap.append(text, remove);
            return wrap;
          };
          for (const id of draft.include) pinsList.append(chip(id, false));
          for (const id of draft.exclude) pinsList.append(chip(id, true));
          pinsLabel.hidden = draft.include.length === 0 && draft.exclude.length === 0;
        }
        const readoutFp = readoutFingerprint(resolved.entries);
        if (readoutFp !== lastReadoutFp) {
          lastReadoutFp = readoutFp;
          swatchGrid.replaceChildren();
          const cap = 120;
          for (const entry of resolved.entries.slice(0, cap)) {
            const swatch = doc.createElement('span');
            swatch.className = 'swatch readout-swatch';
            swatch.style.backgroundColor = entry.hex;
            const label = entryLabel(entry, catalogue);
            swatch.title = `${label} · ${entry.hex}`;
            swatch.setAttribute('role', 'img');
            swatch.setAttribute('aria-label', label);
            swatchGrid.append(swatch);
          }
          if (resolved.entries.length > cap) {
            const more = doc.createElement('span');
            more.className = 'meta';
            more.textContent = `and ${String(resolved.entries.length - cap)} more`;
            swatchGrid.append(more);
          }
        }
      }

      /** Push draft values onto the standing controls, in place. */
      function syncValues(): void {
        for (const [id, box] of libraryBoxes) {
          box.checked = draft.libraries.includes(id);
          box.disabled = readOnly;
        }
        ownedToggle.input.checked = draft.ownedOnly;
        ownedToggle.input.disabled = readOnly;
        const ownedState = ownedToggle.input.nextElementSibling;
        if (ownedState !== null) ownedState.textContent = draft.ownedOnly ? 'On' : 'Off';
        const hasRule = draft.ranges.length > 0;
        rangeToggle.input.checked = hasRule;
        rangeToggle.input.disabled = readOnly;
        const rangeState = rangeToggle.input.nextElementSibling;
        if (rangeState !== null) rangeState.textContent = hasRule ? 'On' : 'Off';
        rangeBlock.hidden = !hasRule;
        const rule = draft.ranges[0] ?? fullSpanRule();
        for (const { def, range, num } of poleInputs) {
          const pair = rule[def.axis] ?? [0, def.max];
          const value = String(pair[def.pole]);
          if (doc.activeElement !== range) range.value = value;
          if (doc.activeElement !== num) num.value = value;
          range.disabled = readOnly;
          num.disabled = readOnly;
        }
        syncReadout();
      }

      return {
        setDraft(next: unknown, nextReadOnly: boolean): void {
          draft = asRecipe(next);
          readOnly = nextReadOnly;
          browseTable.refresh();
          syncValues();
        },
      };
    },
  };

  return adapter;
}
