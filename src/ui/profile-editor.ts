/**
 * The takeover profile editor shell (M15-UI-02, D114/D116/D117).
 *
 * A **view swap, not a dialog**: the host hides the app layout and
 * mounts this view in its place; a capture session keeps running
 * underneath — the editor never tears the session down. The shell is
 * **profile-kind-agnostic** (the D116 contract): the draft is opaque
 * here, and each kind supplies its list/draft/form/save surface
 * through {@link ProfileKindAdapter}. The dither kind (M15-DITH-02)
 * must mount without shell change.
 *
 * Draft-then-Save is the recorded §5.4 exception (D114): edits land
 * on a draft the kind's own preview may render live, and only Save
 * commits — because a saved profile edit ripples into every design
 * that uses it. The editor-Save contract (D117): Save on the design's
 * **active** profile updates the design's copy in the same act;
 * saving any other profile never touches the design.
 *
 * The EXT-43 no-rebuild contract holds **by construction**: the shell
 * exposes no frame-facing API — nothing here can hear about processed
 * frames, so nothing here can rebuild under one. The only
 * frame-coupled editor object is the kind's preview rig
 * (M15-UI-04), which renders into its own strip.
 */

import { confirmDangerModal, textPromptModal } from './modal.ts';

/** One profile as the switcher lists it. */
export interface ProfileView {
  id: string;
  name: string;
  builtin: boolean;
  revision: number;
}

/** What a kind mounts into the shell's form region. */
export interface KindFormHandle {
  /** Re-render for a fresh draft (profile switch), never per frame. */
  setDraft(draft: unknown, readOnly: boolean): void;
}

/**
 * Everything one profile kind supplies. The shell never interprets a
 * draft — it snapshots it (JSON) for dirtiness and hands it back.
 */
export interface ProfileKindAdapter {
  /** Kind id, e.g. `"colour"`. */
  kind: string;
  /** Heading, sentence case, e.g. `"Colour profiles"`. */
  title: string;
  list(): Promise<ProfileView[]>;
  /** An editable deep copy of one profile's content. */
  draftOf(id: string): Promise<unknown>;
  /**
   * Build the kind's form once into `container`. `onEdit` is called
   * with the updated draft after every user edit.
   */
  mountForm(
    container: HTMLElement,
    onEdit: (draft: unknown) => void,
  ): KindFormHandle;
  /** Mount the kind's judgement preview (M15-UI-04), or omit it. */
  mountPreview?(container: HTMLElement): { draftChanged(draft: unknown): void };
  /** Persist a user profile's content. Never called for built-ins. */
  save(id: string, draft: unknown): Promise<ProfileView>;
  create(name: string): Promise<ProfileView>;
  duplicate(id: string, name: string, draft: unknown): Promise<ProfileView>;
  rename(id: string, name: string): Promise<ProfileView>;
  remove(id: string): Promise<void>;
}

/** The D117 editor-Save contract, as the host wires it. */
export interface EditorDesignLink {
  /** The design's active profile id of this kind, or null. */
  activeProfileId(): string | null;
  /** Save landed on the active profile: update the design's copy. */
  onActiveProfileSaved(id: string, draft: unknown): void;
}

export interface ProfileEditorOptions {
  adapter: ProfileKindAdapter;
  design?: EditorDesignLink | undefined;
  /** Announce through the app's one status region (M14-EXT-39). */
  announce(text: string): void;
  /** The host swaps the views back and restores focus. */
  onClose(): void;
}

/** The built editor view. */
export interface ProfileEditor {
  element: HTMLElement;
  /** (Re)open the editor, optionally on a given profile. */
  open(profileId?: string): Promise<void>;
}

/** Build the takeover editor shell for one kind. */
export function createProfileEditor(
  doc: Document,
  options: ProfileEditorOptions,
): ProfileEditor {
  const { adapter, announce } = options;

  const element = doc.createElement('section');
  element.className = 'profile-editor';
  element.setAttribute('aria-label', adapter.title);

  // --- header: title + Back ----------------------------------------
  const header = doc.createElement('div');
  header.className = 'profile-editor-header';
  const heading = doc.createElement('h2');
  heading.textContent = adapter.title;
  heading.tabIndex = -1;
  const backButton = doc.createElement('button');
  backButton.type = 'button';
  backButton.textContent = 'Back to the design';
  header.append(heading, backButton);

  // --- profile row: switcher + verbs -------------------------------
  const profileRow = doc.createElement('div');
  profileRow.className = 'toolbar profile-editor-row';
  const switcherField = doc.createElement('div');
  switcherField.className = 'field profile-switcher';
  const switcherLabel = doc.createElement('label');
  switcherLabel.htmlFor = 'profile-switcher';
  switcherLabel.textContent = 'Profile';
  const switcher = doc.createElement('select');
  switcher.id = 'profile-switcher';
  switcherField.append(switcherLabel, switcher);
  const verb = (text: string): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    return b;
  };
  const newButton = verb('New');
  const duplicateButton = verb('Duplicate');
  const renameButton = verb('Rename');
  const deleteButton = verb('Delete');
  profileRow.append(switcherField, newButton, duplicateButton, renameButton, deleteButton);

  // The read-only state is a sentence, not a mystery (A9 adjacency).
  const builtinNote = doc.createElement('p');
  builtinNote.className = 'meta';
  builtinNote.textContent = 'Built-in profiles are read-only — Duplicate makes an editable copy.';
  builtinNote.hidden = true;

  // --- kind regions -------------------------------------------------
  const formRegion = doc.createElement('div');
  formRegion.className = 'profile-editor-form';
  const previewRegion = doc.createElement('div');
  previewRegion.className = 'profile-editor-preview';

  // --- footer: Save / Cancel ---------------------------------------
  const footer = doc.createElement('div');
  footer.className = 'toolbar profile-editor-footer';
  const saveButton = verb('Save');
  saveButton.className = 'button-primary';
  const cancelButton = verb('Cancel');
  const dirtyNote = doc.createElement('p');
  dirtyNote.className = 'meta';
  dirtyNote.hidden = true;
  dirtyNote.textContent = 'Unsaved changes.';
  footer.append(saveButton, cancelButton, dirtyNote);

  element.append(header, profileRow, builtinNote, formRegion, previewRegion, footer);

  // --- state --------------------------------------------------------
  let profiles: ProfileView[] = [];
  let currentId: string | null = null;
  let draft: unknown = null;
  let savedSnapshot = '';
  const isBuiltin = (): boolean =>
    profiles.find((p) => p.id === currentId)?.builtin ?? false;
  const isDirty = (): boolean => JSON.stringify(draft) !== savedSnapshot;

  const preview = adapter.mountPreview?.(previewRegion);

  const form = adapter.mountForm(formRegion, (next) => {
    draft = next;
    syncFooter();
    preview?.draftChanged(draft);
  });

  function syncFooter(): void {
    const builtin = isBuiltin();
    const dirty = isDirty();
    saveButton.disabled = builtin || !dirty;
    cancelButton.disabled = builtin || !dirty;
    dirtyNote.hidden = !dirty || builtin;
    builtinNote.hidden = !builtin;
  }

  /** Rebuild the switcher options (list changes are user acts). */
  function renderSwitcher(): void {
    switcher.replaceChildren();
    for (const profile of profiles) {
      const option = doc.createElement('option');
      option.value = profile.id;
      option.textContent = profile.builtin ? `${profile.name} (built-in)` : profile.name;
      switcher.append(option);
    }
    if (currentId !== null) switcher.value = currentId;
    const builtin = isBuiltin();
    renameButton.disabled = builtin;
    deleteButton.disabled = builtin;
  }

  async function selectProfile(id: string): Promise<void> {
    currentId = id;
    draft = await adapter.draftOf(id);
    savedSnapshot = JSON.stringify(draft);
    switcher.value = id;
    const builtin = isBuiltin();
    renameButton.disabled = builtin;
    deleteButton.disabled = builtin;
    form.setDraft(draft, builtin);
    preview?.draftChanged(draft);
    syncFooter();
  }

  /** Guard a draft-losing act (UI-STANDARDS: confirmation or undo). */
  async function confirmDiscard(): Promise<boolean> {
    if (!isDirty() || isBuiltin()) return true;
    return confirmDangerModal(doc, {
      title: 'Discard changes',
      body: 'This profile has unsaved changes. Discard them?',
      confirmLabel: 'Discard changes',
    });
  }

  switcher.addEventListener('change', () => {
    const next = switcher.value;
    if (next === currentId) return;
    void (async () => {
      if (!(await confirmDiscard())) {
        if (currentId !== null) switcher.value = currentId;
        return;
      }
      await selectProfile(next);
    })();
  });

  saveButton.addEventListener('click', () => {
    if (currentId === null || isBuiltin()) return;
    const id = currentId;
    void (async () => {
      const saved = await adapter.save(id, draft);
      profiles = await adapter.list();
      savedSnapshot = JSON.stringify(draft);
      renderSwitcher();
      syncFooter();
      // The D117 contract: the design's active profile updates the
      // design's copy in the same act; any other save never touches
      // the design.
      if (options.design?.activeProfileId() === id) {
        options.design.onActiveProfileSaved(id, draft);
        announce(`Saved "${saved.name}" and updated the design.`);
      } else {
        announce(`Saved "${saved.name}".`);
      }
    })();
  });

  cancelButton.addEventListener('click', () => {
    if (currentId === null) return;
    void selectProfile(currentId).then(() => {
      announce('Changes discarded.');
    });
  });

  async function close(): Promise<void> {
    if (!(await confirmDiscard())) return;
    options.onClose();
  }

  backButton.addEventListener('click', () => {
    void close();
  });
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // Modals above the editor own their own Escape; this fires only
    // when the editor itself has focus context.
    event.stopPropagation();
    void close();
  });

  newButton.addEventListener('click', () => {
    void (async () => {
      if (!(await confirmDiscard())) return;
      const name = await textPromptModal(doc, {
        title: 'New profile',
        label: 'Profile name',
        initial: '',
        confirmLabel: 'Create',
      });
      if (name === null || name.trim() === '') return;
      const created = await adapter.create(name.trim());
      profiles = await adapter.list();
      renderSwitcher();
      await selectProfile(created.id);
      announce(`Created "${created.name}".`);
    })();
  });

  duplicateButton.addEventListener('click', () => {
    if (currentId === null) return;
    const source = profiles.find((p) => p.id === currentId);
    if (source === undefined) return;
    void (async () => {
      const name = await textPromptModal(doc, {
        title: 'Duplicate profile',
        label: 'Name for the copy',
        initial: `${source.name} (copy)`,
        confirmLabel: 'Duplicate',
      });
      if (name === null || name.trim() === '') return;
      // The copy starts from the current draft, so duplicating an
      // edited built-in keeps the edits — duplicate-to-edit (D114).
      const copy = await adapter.duplicate(currentId ?? '', name.trim(), draft);
      profiles = await adapter.list();
      renderSwitcher();
      await selectProfile(copy.id);
      announce(`Duplicated to "${copy.name}".`);
    })();
  });

  renameButton.addEventListener('click', () => {
    if (currentId === null || isBuiltin()) return;
    const current = profiles.find((p) => p.id === currentId);
    void (async () => {
      const name = await textPromptModal(doc, {
        title: 'Rename profile',
        label: 'Profile name',
        initial: current?.name ?? '',
        confirmLabel: 'Rename',
      });
      if (name === null || name.trim() === '' || currentId === null) return;
      const renamed = await adapter.rename(currentId, name.trim());
      profiles = await adapter.list();
      renderSwitcher();
      announce(`Renamed to "${renamed.name}".`);
    })();
  });

  deleteButton.addEventListener('click', () => {
    if (currentId === null || isBuiltin()) return;
    const current = profiles.find((p) => p.id === currentId);
    void (async () => {
      const ok = await confirmDangerModal(doc, {
        title: 'Delete profile',
        body: `Delete "${current?.name ?? 'this profile'}"? Designs that used it keep their own copy of its colours.`,
        confirmLabel: 'Delete profile',
      });
      if (!ok || currentId === null) return;
      await adapter.remove(currentId);
      profiles = await adapter.list();
      const fallback = profiles[0]?.id ?? null;
      renderSwitcher();
      if (fallback !== null) await selectProfile(fallback);
      announce('Profile deleted.');
    })();
  });

  return {
    element,
    async open(profileId?: string): Promise<void> {
      profiles = await adapter.list();
      const startId =
        profileId ??
        options.design?.activeProfileId() ??
        currentId ??
        profiles[0]?.id ??
        null;
      renderSwitcher();
      if (startId !== null) await selectProfile(startId);
      // Focus lands on the view's own heading — the takeover names
      // itself before anything else is read.
      heading.focus();
    },
  };
}
