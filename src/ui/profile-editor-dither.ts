/**
 * The dither profile kind (M15-DITH-01/02, D116): a profile is a
 * complete named `DitherConfig` — method, per-family strength,
 * serpentine where the method scans — mounted in the same
 * kind-agnostic takeover shell the colour kind proved. The seven
 * shipped presets seed the read-only built-ins, basis lines kept as
 * the editor's "Why:" display. No new engine parameters (D61 is the
 * whole surface); no inline tuning outside the editor (D116).
 */

import type { DitherConfig } from '../core/pipeline/config.ts';
import { DITHER_PRESETS } from '../core/pipeline/dither-presets.ts';
import type { ProfileRecord } from '../library/records.ts';
import type { LibraryStore } from '../library/store.ts';
import {
  ALGORITHM_OPTIONS,
  familyOf,
  percentToStrength,
  strengthBounds,
  strengthToPercent,
  type AlgorithmChoice,
} from './dither-model.ts';
import { toggleField } from './controls.ts';
import type {
  KindFormHandle,
  ProfileKindAdapter,
  ProfileView,
} from './profile-editor.ts';

/** What the dither kind needs from the host. */
export interface DitherKindDeps {
  store(): LibraryStore;
  /** One line naming what the preview renders with (D116). */
  paletteContextLine(): string;
}

/** Guard a stored payload into a complete config, safely. */
export function asDitherConfig(payload: unknown): DitherConfig {
  if (typeof payload !== 'object' || payload === null) return { algorithm: 'none' };
  const raw = payload as { algorithm?: unknown; strength?: unknown; serpentine?: unknown };
  const algorithm = raw.algorithm;
  if (algorithm === 'ordered' || algorithm === 'blue-noise') {
    const strength = typeof raw.strength === 'number' ? Math.max(0, Math.min(2, raw.strength)) : 1;
    return { algorithm, strength };
  }
  if (algorithm === 'floyd-steinberg' || algorithm === 'atkinson' || algorithm === 'jarvis') {
    const strength = typeof raw.strength === 'number' ? Math.max(0, Math.min(1, raw.strength)) : 1;
    return { algorithm, serpentine: raw.serpentine === true, strength };
  }
  return { algorithm: 'none' };
}

/** Build the dither kind for the takeover shell. */
export function createDitherKindAdapter(
  doc: Document,
  deps: DitherKindDeps,
): ProfileKindAdapter & { resolveDraftConfig(draft: unknown): DitherConfig } {
  const store = (): LibraryStore => deps.store();
  let records = new Map<string, ProfileRecord>();
  let names = new Map<string, string>();

  const adapter: ProfileKindAdapter & { resolveDraftConfig(draft: unknown): DitherConfig } = {
    kind: 'dither',
    title: 'Dithering profiles',

    async list(): Promise<ProfileView[]> {
      const stored = await store().listProfiles('dither');
      records = new Map(stored.map((r) => [r.id, r]));
      names = new Map([
        ...DITHER_PRESETS.map((p): [string, string] => [`builtin:${p.id}`, p.label]),
        ...stored.map((r): [string, string] => [r.id, r.name]),
      ]);
      return [
        ...DITHER_PRESETS.map((p) => ({
          id: `builtin:${p.id}`,
          name: p.label,
          builtin: true,
          revision: 0,
        })),
        ...stored.map((r) => ({ id: r.id, name: r.name, builtin: false, revision: r.revision })),
      ];
    },

    draftOf(id: string): Promise<unknown> {
      const preset = DITHER_PRESETS.find((p) => `builtin:${p.id}` === id);
      if (preset !== undefined) return Promise.resolve(structuredClone(preset.config));
      return Promise.resolve(asDitherConfig(records.get(id)?.payload));
    },

    async save(id: string, draft: unknown): Promise<ProfileView> {
      const current = records.get(id);
      const record: ProfileRecord = {
        kind: 'dither',
        id,
        name: current?.name ?? names.get(id) ?? 'Profile',
        revision: (current?.revision ?? 0) + 1,
        createdFrom: current?.createdFrom ?? 'new',
        payload: asDitherConfig(draft),
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name: record.name, builtin: false, revision: record.revision };
    },

    async create(name: string): Promise<ProfileView> {
      const id = `d-${Date.now().toString(36)}-${String(records.size)}`;
      const record: ProfileRecord = {
        kind: 'dither',
        id,
        name,
        revision: 1,
        createdFrom: 'new',
        payload: { algorithm: 'none' },
      };
      await store().putProfile(record);
      records.set(id, record);
      return { id, name, builtin: false, revision: 1 };
    },

    async duplicate(id: string, name: string, draft: unknown): Promise<ProfileView> {
      const newId = `d-${Date.now().toString(36)}-${String(records.size)}`;
      const record: ProfileRecord = {
        kind: 'dither',
        id: newId,
        name,
        revision: 1,
        createdFrom: `copy:${id}`,
        payload: asDitherConfig(draft),
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
      await store().deleteProfile('dither', id);
      records.delete(id);
    },

    resolveDraftConfig(draft: unknown): DitherConfig {
      return asDitherConfig(draft);
    },

    mountForm(container: HTMLElement, onEdit: (draft: unknown) => void): KindFormHandle {
      let draft: DitherConfig = { algorithm: 'none' };
      let readOnly = false;

      const edited = (): void => {
        syncValues();
        onEdit(structuredClone(draft));
      };

      // Algorithm select — the three-field form's discriminator.
      const algoField = doc.createElement('div');
      algoField.className = 'field';
      const algoLabel = doc.createElement('label');
      algoLabel.htmlFor = 'dither-algorithm';
      algoLabel.textContent = 'Dither method';
      const algoSelect = doc.createElement('select');
      algoSelect.id = 'dither-algorithm';
      for (const [value, label] of ALGORITHM_OPTIONS) {
        const option = doc.createElement('option');
        option.value = value;
        option.textContent = label;
        algoSelect.append(option);
      }
      algoSelect.addEventListener('change', () => {
        const choice = algoSelect.value as AlgorithmChoice;
        if (choice === 'none') draft = { algorithm: 'none' };
        else if (choice === 'ordered' || choice === 'blue-noise') {
          draft = { algorithm: choice, strength: 1 };
        } else {
          draft = { algorithm: choice, serpentine: true, strength: 1 };
        }
        edited();
      });
      algoField.append(algoLabel, algoSelect);

      // Strength — per-family semantics carried by the helper (D61).
      const strengthField = doc.createElement('div');
      strengthField.className = 'field';
      const strengthLabel = doc.createElement('label');
      strengthLabel.htmlFor = 'dither-strength';
      strengthLabel.textContent = 'Strength';
      const strengthRow = doc.createElement('div');
      strengthRow.className = 'stitch-size-row';
      const strengthRange = doc.createElement('input');
      strengthRange.type = 'range';
      strengthRange.id = 'dither-strength';
      strengthRange.min = '0';
      strengthRange.step = '5';
      const strengthValue = doc.createElement('span');
      strengthValue.className = 'meta';
      const strengthHelper = doc.createElement('p');
      strengthHelper.className = 'helper';
      strengthHelper.id = 'dither-strength-helper';
      strengthRange.setAttribute('aria-describedby', strengthHelper.id);
      strengthRange.addEventListener('input', () => {
        if (draft.algorithm === 'none') return;
        const strength = percentToStrength(Number(strengthRange.value));
        draft = { ...draft, strength };
        edited();
      });
      strengthRow.append(strengthRange, strengthValue);
      strengthField.append(strengthLabel, strengthRow, strengthHelper);

      // Serpentine — only where the method has a scan direction.
      const serpentine = toggleField(doc, 'dither-serpentine', 'Serpentine scan', true, (on) => {
        if (draft.algorithm === 'none' || !('serpentine' in draft)) return;
        draft = { ...draft, serpentine: on };
        edited();
      });

      // The basis line: why a built-in exists (D61 evidence).
      const basisLine = doc.createElement('p');
      basisLine.className = 'meta';
      basisLine.hidden = true;

      // What the preview renders with (D116): dithering needs a
      // resolved palette, so the line always names it.
      const paletteLine = doc.createElement('p');
      paletteLine.className = 'meta';

      container.append(algoField, strengthField, serpentine.element, basisLine, paletteLine);

      function syncValues(): void {
        algoSelect.value = draft.algorithm;
        algoSelect.disabled = readOnly;
        const family = familyOf(draft.algorithm);
        strengthField.hidden = family === 'none';
        serpentine.element.hidden = family !== 'diffusion';
        if (draft.algorithm !== 'none') {
          const bounds = strengthBounds(family as Exclude<typeof family, 'none'>);
          strengthRange.max = String(strengthToPercent(bounds.max));
          if (doc.activeElement !== strengthRange) {
            strengthRange.value = String(strengthToPercent(draft.strength));
          }
          strengthValue.textContent = `${String(strengthToPercent(draft.strength))}%`;
          strengthHelper.textContent =
            family === 'diffusion'
              ? 'How much of each colour error spreads to neighbouring stitches.'
              : 'Threshold amplitude — past 100% the pattern grows stronger than its base.';
          strengthRange.disabled = readOnly;
          if ('serpentine' in draft) {
            serpentine.input.checked = draft.serpentine;
            serpentine.input.disabled = readOnly;
            const state = serpentine.input.nextElementSibling;
            if (state !== null) state.textContent = draft.serpentine ? 'On' : 'Off';
          }
        }
        paletteLine.textContent = `Preview renders with: ${deps.paletteContextLine()}.`;
      }

      return {
        setDraft(next: unknown, nextReadOnly: boolean): void {
          draft = asDitherConfig(next);
          readOnly = nextReadOnly;
          // The basis line rides read-only built-ins: the D61 evidence
          // each preset stands on, shown as its "Why:".
          const preset = DITHER_PRESETS.find((p) => sameConfigAsPreset(p.id));
          basisLine.hidden = !nextReadOnly || preset === undefined;
          if (preset !== undefined) basisLine.textContent = `Why: ${preset.basis}.`;
          syncValues();
        },
      };

      function sameConfigAsPreset(presetId: string): boolean {
        const preset = DITHER_PRESETS.find((p) => p.id === presetId);
        return preset !== undefined && JSON.stringify(preset.config) === JSON.stringify(draft);
      }
    },
  };

  return adapter;
}
