/**
 * Carbon inline notification, project-coded (CAPTURE-END-01): a
 * sentence the user cannot miss, placed in the region they are looking
 * at, with a text Dismiss button. The status line stays the
 * programmatic announcement of record; this is the visible one for the
 * moments a one-line status proved too quiet — the owner's sitting
 * (D134) missed "Screen capture ended" in the header.
 *
 * Anatomy: a left edge in the kind's colour (a supplement — the text
 * carries the meaning, never the colour alone), the sentence, and
 * Dismiss. `role="status"` makes the container a polite live region,
 * so showing it announces it once without stealing focus.
 */

/** The notification's kind; only the informational edge exists so far. */
export type NotificationKind = 'info';

/** Options for {@link createInlineNotification}. */
export interface InlineNotificationOptions {
  kind: NotificationKind;
  /**
   * Where focus goes when Dismiss removes itself from the page — never
   * left to fall to body (UI-STANDARDS → shell presentation state).
   */
  focusAfterDismiss(): HTMLElement | null;
}

/** A mounted notification: hidden until shown, hidden again on Dismiss. */
export interface InlineNotification {
  element: HTMLElement;
  show(text: string): void;
  hide(): void;
}

/** Build the notification (hidden). The host mounts `element`. */
export function createInlineNotification(
  doc: Document,
  options: InlineNotificationOptions,
): InlineNotification {
  const element = doc.createElement('div');
  element.className = `inline-notification inline-notification-${options.kind}`;
  element.setAttribute('role', 'status');
  element.hidden = true;
  const text = doc.createElement('p');
  const dismiss = doc.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss';
  element.append(text, dismiss);

  function hide(): void {
    if (element.hidden) return;
    const hadFocus = element.contains(doc.activeElement);
    element.hidden = true;
    if (hadFocus) options.focusAfterDismiss()?.focus();
  }

  dismiss.addEventListener('click', hide);

  return {
    element,
    show(message: string): void {
      text.textContent = message;
      element.hidden = false;
    },
    hide,
  };
}
