/**
 * Carbon-style modal dialogs, project-coded (M14-IMPL-02, audit A6):
 * replaces `window.prompt` / `window.confirm` with the Carbon modal
 * anatomy — labelled dialog, focus trapped while open, Escape
 * cancels, focus returned to the invoker on close (the one
 * sanctioned focus move, `ui-spec.md` §6).
 *
 * Two shapes cover the app's needs: a text prompt (palette naming)
 * and a danger confirmation (bulk inventory removal). Both are
 * promise-based and resolve on close — `null` / `false` for cancel —
 * so callers read like the natives they replace.
 */

/** Options for {@link textPromptModal}. */
export interface TextPromptOptions {
  /** Dialog heading (also the accessible name). */
  title: string;
  /** Visible label for the input. */
  label: string;
  /** Pre-filled value. */
  initial: string;
  /** Primary action label, e.g. "Save". */
  confirmLabel: string;
}

/** Options for {@link confirmDangerModal}. */
export interface ConfirmDangerOptions {
  title: string;
  /** One-sentence body naming the consequence. */
  body: string;
  /** Danger action label, e.g. "Remove threads". */
  confirmLabel: string;
}

/** Everything focusable inside the dialog, in DOM order. */
function focusable(dialog: HTMLElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea')].filter(
    (el) => !el.hasAttribute('disabled'),
  );
}

/**
 * The focus trap's decision, pure (tested in node per the house
 * convention — DOM halves are verified in the running app): given the
 * focusable count, the active index (-1 when focus is outside the
 * set), and the Tab direction, return the index to force focus to, or
 * null to let the browser move focus naturally inside the dialog.
 */
export function trapTarget(
  count: number,
  activeIndex: number,
  shiftKey: boolean,
): number | null {
  if (count === 0) return null;
  if (shiftKey && activeIndex <= 0) return count - 1;
  if (!shiftKey && (activeIndex === count - 1 || activeIndex === -1)) return 0;
  return null;
}

/**
 * Mount a modal scaffold and run its lifecycle. `build` fills the
 * body region and returns the element to focus first; `onClose`
 * resolves the caller's promise exactly once. Exported for dialogs
 * whose body is domain-shaped (the symbol picker's glyph grid,
 * ICE-SYMBOL-UI-01) so they share the one trap, Escape and
 * focus-return contract instead of re-implementing it.
 */
export function runModal<T>(
  doc: Document,
  title: string,
  build: (body: HTMLElement, close: (value: T) => void) => HTMLElement,
  cancelValue: T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    const previouslyFocused = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    const backdrop = doc.createElement('div');
    backdrop.className = 'modal-backdrop';
    const dialog = doc.createElement('div');
    dialog.className = 'modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const heading = doc.createElement('h2');
    heading.className = 'modal-title';
    heading.id = 'modal-title';
    heading.textContent = title;
    dialog.setAttribute('aria-labelledby', heading.id);
    const body = doc.createElement('div');
    body.className = 'modal-body';
    dialog.append(heading, body);
    backdrop.append(dialog);

    let settled = false;
    const close = (value: T): void => {
      if (settled) return;
      settled = true;
      backdrop.remove();
      doc.removeEventListener('keydown', onKeydown, true);
      previouslyFocused?.focus();
      resolve(value);
    };

    // Focus trap: Tab wraps at the edges; Escape cancels. Capture
    // phase so the app's own global key handlers never see keys meant
    // for the dialog.
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(cancelValue);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable(dialog);
      const active = doc.activeElement;
      const target = trapTarget(
        items.length,
        active instanceof HTMLElement ? items.indexOf(active) : -1,
        event.shiftKey,
      );
      if (target !== null) {
        event.preventDefault();
        items[target]?.focus();
      }
    };
    doc.addEventListener('keydown', onKeydown, true);

    // A backdrop click cancels — the same escape hatch as the key.
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) close(cancelValue);
    });

    const initialFocus = build(body, close);
    doc.body.append(backdrop);
    initialFocus.focus();
  });
}

/** Carbon text-input modal; resolves the entered value or null. */
export function textPromptModal(
  doc: Document,
  options: TextPromptOptions,
): Promise<string | null> {
  return runModal<string | null>(
    doc,
    options.title,
    (body, close) => {
      const field = doc.createElement('div');
      field.className = 'field';
      const label = doc.createElement('label');
      label.htmlFor = 'modal-input';
      label.textContent = options.label;
      const input = doc.createElement('input');
      input.type = 'text';
      input.id = 'modal-input';
      input.value = options.initial;
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          close(input.value);
        }
      });
      field.append(label, input);
      const actions = doc.createElement('div');
      actions.className = 'modal-actions';
      const cancel = doc.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(null));
      const confirm = doc.createElement('button');
      confirm.type = 'button';
      confirm.className = 'modal-primary';
      confirm.textContent = options.confirmLabel;
      confirm.addEventListener('click', () => close(input.value));
      actions.append(cancel, confirm);
      body.append(field, actions);
      return input;
    },
    null,
  );
}

/** One choice offered by {@link choicesModal}. */
export interface ModalChoice {
  /** Stable id resolved to the caller. */
  id: string;
  /** Visible button label. */
  label: string;
  /** Primary-filled treatment (at most one per dialog). */
  primary?: boolean;
  /** One-line consequence/expectation, linked via aria-describedby. */
  helper?: string;
}

/**
 * Carbon choice modal (M14-EXT-02): a titled dialog offering a short
 * list of actions — the Source chooser's shape. Resolves the chosen
 * id, or null on cancel/Escape/backdrop.
 */
export function choicesModal(
  doc: Document,
  options: { title: string; note?: string; choices: readonly ModalChoice[] },
): Promise<string | null> {
  return runModal<string | null>(
    doc,
    options.title,
    (body, close) => {
      if (options.note !== undefined) {
        const note = doc.createElement('p');
        note.className = 'meta';
        note.textContent = options.note;
        body.append(note);
      }
      const list = doc.createElement('div');
      list.className = 'modal-choices';
      let first: HTMLButtonElement | null = null;
      for (const choice of options.choices) {
        const button = doc.createElement('button');
        button.type = 'button';
        if (choice.primary === true) button.className = 'button-primary';
        button.textContent = choice.label;
        button.addEventListener('click', () => close(choice.id));
        list.append(button);
        if (choice.helper !== undefined) {
          const helper = doc.createElement('p');
          helper.className = 'helper';
          helper.id = `modal-choice-${choice.id}-helper`;
          helper.textContent = choice.helper;
          button.setAttribute('aria-describedby', helper.id);
          list.append(helper);
        }
        first ??= button;
      }
      const actions = doc.createElement('div');
      actions.className = 'modal-actions';
      const cancel = doc.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(null));
      actions.append(cancel);
      body.append(list, actions);
      return first ?? cancel;
    },
    null,
  );
}

/** Options for {@link formModal}. */
export interface FormModalOptions {
  /** Dialog heading (also the accessible name). */
  title: string;
  /**
   * Fill the body with live-apply fields: every control applies on
   * change, so the dialog needs no Apply and Close is its only
   * action. Return the element to focus first, or null to focus the
   * Close button.
   */
  build: (body: HTMLElement) => HTMLElement | null;
}

/**
 * Carbon form modal (M14-EXT-35): a titled dialog of live-apply
 * fields — the Grid options shape. Close, Escape and the backdrop
 * all just close (there is nothing to cancel: changes applied as
 * they were made, per §5.4); focus returns to the invoker.
 */
export function formModal(doc: Document, options: FormModalOptions): Promise<void> {
  return runModal<undefined>(
    doc,
    options.title,
    (body, close) => {
      const first = options.build(body);
      const actions = doc.createElement('div');
      actions.className = 'modal-actions';
      const closeButton = doc.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'modal-primary';
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', () => {
        close(undefined);
      });
      actions.append(closeButton);
      body.append(actions);
      return first ?? closeButton;
    },
    undefined,
  );
}

/** Carbon danger modal; resolves true only on explicit confirmation. */
export function confirmDangerModal(
  doc: Document,
  options: ConfirmDangerOptions,
): Promise<boolean> {
  return runModal<boolean>(
    doc,
    options.title,
    (body, close) => {
      const text = doc.createElement('p');
      text.textContent = options.body;
      const actions = doc.createElement('div');
      actions.className = 'modal-actions';
      const cancel = doc.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => close(false));
      const confirm = doc.createElement('button');
      confirm.type = 'button';
      confirm.className = 'modal-danger';
      confirm.textContent = options.confirmLabel;
      confirm.addEventListener('click', () => close(true));
      actions.append(cancel, confirm);
      body.append(text, actions);
      // Danger default: focus lands on Cancel, never on the
      // destructive action.
      return cancel;
    },
    false,
  );
}
