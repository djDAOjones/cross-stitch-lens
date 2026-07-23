/**
 * Carbon accordion section, project-coded (M14-IMPL-03, D83).
 *
 * Anatomy per `ui-spec.md` §2: a real `<h2>` wrapping the toggle
 * button (the app's heading structure — audit A12 — *is* the section
 * list), `aria-expanded`/`aria-controls` on the button, and a panel
 * region that leaves layout and the tab order entirely when closed
 * (`hidden` — the shell's one visibility idiom). The button carries
 * the title plus a derived one-line state summary shown while closed
 * (recognition over recall; derived from owned state at refresh,
 * never scraped from the DOM — the status-line rule).
 *
 * Native `<details>` is deliberately not used here: the section
 * headers double as the page's h2 landmarks, and `summary` cannot be
 * a heading. Inline depth reveals (thread library, grid details…) do
 * use `<details>` — the debug panel's precedent.
 *
 * Focus stays on the header button across a toggle; the button lives
 * outside the region it reveals (UI-STANDARDS shell rule).
 */

/** One accordion section, built by {@link createSection}. */
export interface AccordionSection {
  /** The `<section>` to mount (header + panel). */
  element: HTMLElement;
  /** The panel to fill with the section's content. */
  panel: HTMLElement;
  /** Current open state. */
  isOpen(): boolean;
  /** Set the state programmatically (no onToggle callback fired). */
  setOpen(open: boolean): void;
  /** Recompute the closed-state summary line. */
  refreshSummary(): void;
}

/** Options for {@link createSection}. */
export interface SectionOptions {
  /** Stable id (also the preference key; `section-` prefixed ids). */
  id: string;
  /** Visible section title (also the accessible name). */
  title: string;
  /** Derived one-line state summary, shown while closed. */
  summary: () => string;
  /** Initial open state (spec default or the stored preference). */
  open: boolean;
  /** User toggles only (not programmatic setOpen). */
  onToggle: (open: boolean) => void;
}

/** Build one Carbon accordion section. */
export function createSection(doc: Document, options: SectionOptions): AccordionSection {
  const element = doc.createElement('section');
  element.className = 'accordion-section';

  const heading = doc.createElement('h2');
  heading.className = 'accordion-heading';
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = `${options.id}-toggle`;
  button.className = 'accordion-toggle';
  const title = doc.createElement('span');
  title.className = 'accordion-title';
  title.textContent = options.title;
  const summary = doc.createElement('span');
  summary.className = 'accordion-summary meta';
  const panel = doc.createElement('div');
  panel.className = 'accordion-panel';
  panel.id = `${options.id}-panel`;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', button.id);
  button.setAttribute('aria-controls', panel.id);
  button.append(title, summary);
  heading.append(button);
  element.append(heading, panel);

  let open = options.open;

  const apply = (): void => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    // The summary reads while closed; open sections show their real
    // controls instead of a précis of them.
    summary.textContent = open ? '' : options.summary();
    summary.hidden = open;
  };

  button.addEventListener('click', () => {
    open = !open;
    apply();
    options.onToggle(open);
  });

  apply();

  return {
    element,
    panel,
    isOpen: () => open,
    setOpen(next: boolean): void {
      if (open === next) return;
      open = next;
      apply();
    },
    refreshSummary(): void {
      if (!open) summary.textContent = options.summary();
    },
  };
}
